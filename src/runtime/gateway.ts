import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import type {AgentGuard,ToolCall} from '../containment.js';
import {DECOY_TOOLS} from '../decoys.js';
import type {AIProvider} from '../ai/types.js';
import {previewAnalysis,validateAnalysisOutput} from '../ai/provider.js';
import {SessionDataFlow} from '../dataflow.js';
import {DataFlowTracker} from './dataflow.js';
import {executePinnedJSONTool} from '../network-tool.js';
import {canonicalJSON,EvidenceRecorder,type EvidenceDecision,type ExecutionStatus,type SideEffectVerification} from './evidence.js';

export interface GatewayFile {path:string; writable?:boolean; approvalRequired?:boolean; sensitive?:boolean; decoyId?:string}
export interface GatewayFileReadBinding {toolName:string; operation:'file-read'; path:string; pathArg?:string}
declare const gatewayFileReadCapabilityBrand:unique symbol;
/** Opaque host-only handle. It contains no path or OS descriptor and is not model call data. */
export type GatewayFileReadCapability={readonly [gatewayFileReadCapabilityBrand]:never};
export interface GatewayCommand {executable:string; args:readonly string[]; approvalRequired?:boolean}
export interface GatewayOptions {
  agentId:string; guard:AgentGuard; workspaceRoot:string; files:readonly GatewayFile[];
  commands?:Record<string,GatewayCommand>; readOrigins?:readonly string[];
  evidence:EvidenceRecorder; provider?:AIProvider; cloudConsent?:boolean;
  timeoutMs?:number; reviewTimeoutMs?:number; approvalTtlMs?:number;
  onDecoyRead?:(decoyId:string)=>void;
  /** Host-owned MCP callback only. Capabilities are keyed by exact trusted tool ID. */
  mcpTools?:Record<string,{execute:(args:Record<string,unknown>,signal:AbortSignal)=>Promise<unknown>;approvalRequired:boolean;risk?:'READ_ONLY'|'WRITE'|'EXECUTE'|'NETWORK'|'SENSITIVE_DATA'|'DESTRUCTIVE'}>;
}
export class GatewayDeniedError extends Error {
  constructor(readonly reason:string,readonly requestId:string,readonly decision:EvidenceDecision='DENY'){super('GATEWAY_'+decision+':'+reason);}
}
type Resource={descriptor:Readonly<GatewayFile>;fd:number;dev:number;ino:number;absolute:string};
type FileReadCapabilityRecord={owner:symbol;toolName:string;pathArg:string;relativePath:string;resource:Resource};
const fileReadCapabilityRecords=new WeakMap<object,FileReadCapabilityRecord>();
type Request={name:string;args:Record<string,unknown>;id:string;digest:string};
const idPattern=/^[A-Za-z0-9_.:-]{1,100}$/;
const filePath=(v:string)=>v.replaceAll('\\','/');
const dangerousPath=/(^|\/)(\.env(?:\.[^/]*)?|id_rsa|id_ed25519|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?)(\/|$)/i;
const secretPattern=/NOT_A_REAL_CREDENTIAL|cnry_[\w-]+|(?:api[_-]?key|password|authorization|secret)\s*[:=]\s*\S+/i;
const sameFile=(a:{dev:number;ino:number},b:{dev:number;ino:number})=>a.dev===b.dev&&a.ino===b.ino;
// Host reconfiguration cannot reset provenance while retaining the same Guard identity.
const sessionFlows=new WeakMap<AgentGuard,{flow:SessionDataFlow;provenance:DataFlowTracker;sensitiveObserved:boolean;queued:number;tail:Promise<unknown>;controllers:Set<AbortController>;quarantineEpoch:number}>();

/** Capability-bound host runtime. No model-facing reset, approval or resource registration. */
export function createTrustedExecutionGateway(options:GatewayOptions){
  if(!idPattern.test(options.agentId)||!idPattern.test(options.guard.sessionId)||!path.isAbsolute(options.workspaceRoot))throw Error('GATEWAY_ID_OR_ROOT_INVALID');
  // Native Windows resolution expands NTFS short-name aliases before the
  // protected-path and held-resource identity checks below.
  const root=fs.realpathSync.native(options.workspaceRoot),resources=new Map<string,Resource>();
  const key=randomBytes(32),history=sessionFlows.get(options.guard)??{flow:new SessionDataFlow(),provenance:new DataFlowTracker(),sensitiveObserved:false,queued:0,tail:Promise.resolve(),controllers:new Set<AbortController>(),quarantineEpoch:0};
  sessionFlows.set(options.guard,history);const {flow,provenance}=history;
  const commands=new Map<string,Readonly<GatewayCommand>>();
  const mcp=new Map(Object.entries(options.mcpTools??{}).map(([name,t])=>[name,Object.freeze({...t})]));
  const origins=new Set((options.readOrigins??[]).map(o=>{const u=new URL(o);if(u.protocol!=='https:'||o!==u.origin||u.username||u.password)throw Error('GATEWAY_ORIGIN_INVALID');return o;}));
  const deadline=options.timeoutMs??10_000,reviewMs=options.reviewTimeoutMs??10_000,ttl=options.approvalTtlMs??60_000;
  for(const n of [deadline,reviewMs,ttl])if(!Number.isInteger(n)||n<1||n>180_000)throw Error('GATEWAY_TIMEOUT_INVALID');
  try{
    for(const f of options.files){
      const relative=filePath(f.path);
      if(!relative||relative.includes('\0')||relative.includes(':')||path.isAbsolute(relative)||relative!==path.posix.normalize(relative)||relative.split('/').includes('..')||resources.has(relative))throw Error('GATEWAY_RESOURCE_INVALID');
      const absolute=path.join(root,relative),real=fs.realpathSync.native(absolute),rel=path.relative(root,real);
      if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||real!==absolute)throw Error('GATEWAY_RESOURCE_LINK_REJECTED');
      const before=fs.lstatSync(absolute);
      if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>65_536)throw Error('GATEWAY_RESOURCE_TYPE_OR_SIZE');
      // Identity compared before any content access. Operations use the held fd afterwards.
      const fd=fs.openSync(absolute,(f.writable?fs.constants.O_RDWR:fs.constants.O_RDONLY)|(fs.constants.O_NOFOLLOW??0));
      const after=fs.fstatSync(fd);
      if(!sameFile(before,after)){fs.closeSync(fd);throw Error('GATEWAY_RESOURCE_CHANGED');}
      resources.set(relative,{descriptor:Object.freeze({...f}),fd,dev:after.dev,ino:after.ino,absolute});
    }
    for(const [name,c]of Object.entries(options.commands??{})){
      if(!idPattern.test(name)||!path.isAbsolute(c.executable)||!Array.isArray(c.args)||c.args.length>32||c.args.some(a=>typeof a!=='string'||a.length>4096||a.includes('\0')))throw Error('GATEWAY_COMMAND_INVALID');
      commands.set(name,Object.freeze({...c,args:Object.freeze([...c.args])}));
    }
    for(const [name,t]of mcp)if(!idPattern.test(name)||typeof t.execute!=='function'||typeof t.approvalRequired!=='boolean'||t.risk!==undefined&&!['READ_ONLY','WRITE','EXECUTE','NETWORK','SENSITIVE_DATA','DESTRUCTIVE'].includes(t.risk))throw Error('GATEWAY_MCP_INVALID');
  }catch(error){for(const r of resources.values())fs.closeSync(r.fd);throw error;}
  let closed=false,closePromise:Promise<void>|undefined,unsubscribeQuarantine=()=>{};
  const capabilityOwner=Symbol('gateway-file-read-owner'),issuedCapabilities=new Set<object>();
  const activeControllers=new Set<AbortController>();
  const pending=new Map<string,{request:Request;expires:number}>();
  function serialize<T>(fn:()=>Promise<T>):Promise<T>{if(closed||history.queued>=64)return Promise.reject(Error('GATEWAY_CLOSED_OR_QUEUE_FULL'));history.queued++;const task=history.tail.then(fn).finally(()=>{history.queued--;});history.tail=task.catch(()=>{});return task;}
  function gatewayCall(r:Request):ToolCall{
    if(r.name!=='mcp_tool'||typeof r.args.tool!=='string')return{name:r.name,args:r.args};
    const target=r.args.tool,suffix=target.split('__').at(-1)??target;
    const name=DECOY_TOOLS.some(tool=>tool.name===suffix.toLowerCase())?suffix.toLowerCase():target;
    const args=r.args.arguments;
    return{name,args:args&&typeof args==='object'&&!Array.isArray(args)?args as Record<string,unknown>:{}};
  }
  function track(controller:AbortController){history.controllers.add(controller);activeControllers.add(controller);}
  function untrack(controller:AbortController){history.controllers.delete(controller);activeControllers.delete(controller);}
  function abortSession(){for(const controller of history.controllers)controller.abort();}
  function quarantineSession(){history.quarantineEpoch++;pending.clear();abortSession();}
  function guardReason(reason?:string){return reason==='decoy_called'?'canary_quarantine':'guard_quarantined';}
  function normalize(call:ToolCall):Request{
    const data=JSON.parse(canonicalJSON(call));
    if(Object.keys(data).some(k=>k!=='name'&&k!=='args')||typeof data.name!=='string'||!idPattern.test(data.name)||!data.args||Array.isArray(data.args)||typeof data.args!=='object')throw Error('GATEWAY_REQUEST_INVALID');
    if(Buffer.byteLength(canonicalJSON(data))>24_000)throw Error('GATEWAY_REQUEST_LIMIT');
    return {name:data.name,args:data.args,id:randomUUID(),digest:createHmac('sha256',key).update(canonicalJSON(data)).digest('hex')};
  }
  function audit(r:Request,decision:EvidenceDecision,reason:string,status:ExecutionStatus,verified:SideEffectVerification,approval:string|null=null){
    return options.evidence.record({session_id:options.guard.sessionId,agent_id:options.agentId,tool_id:r.name,request_id:r.id,request_digest:r.digest,policy_version:'gateway-3.0-alpha.2',decision,decision_reason:reason,approval_reference:approval,execution_status:status,side_effect_verification:verified});
  }
  function blocked(r:Request,reason:string,decision:EvidenceDecision='DENY'):never {audit(r,decision,reason,'NOT_STARTED','NOT_STARTED');throw new GatewayDeniedError(reason,r.id,decision);}
  function resource(r:Request):Resource|undefined{return typeof r.args.path==='string'?resources.get(filePath(r.args.path)):undefined;}
  function stillBound(r:Resource):boolean{try{const named=fs.lstatSync(r.absolute),held=fs.fstatSync(r.fd);return named.isFile()&&!named.isSymbolicLink()&&named.nlink===1&&sameFile(r,named)&&sameFile(r,held)&&fs.realpathSync.native(r.absolute)===r.absolute;}catch{return false;}}
  function normalizeFileReadBinding(value:unknown):{toolName:string;operation:'file-read';path:string;pathArg:string}|undefined{
    try{
      if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
      const prototype=Object.getPrototypeOf(value);
      if(prototype!==Object.prototype&&prototype!==null)return undefined;
      const descriptors=Object.getOwnPropertyDescriptors(value);
      const keys=Object.keys(descriptors).sort();
      if(!['operation','path','toolName'].every(key=>keys.includes(key))||keys.some(key=>!['operation','path','pathArg','toolName'].includes(key))||keys.length<3||keys.length>4||keys.some(key=>descriptors[key].get||descriptors[key].set||!('value'in descriptors[key])))return undefined;
      const binding=value as GatewayFileReadBinding;
      if(binding.operation!=='file-read'||typeof binding.toolName!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(binding.toolName)||typeof binding.path!=='string')return undefined;
      const pathArg=binding.pathArg??'path';
      if(typeof pathArg!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(pathArg))return undefined;
      const relativePath=binding.path;
      if(!relativePath||relativePath!==filePath(relativePath)||relativePath.includes('\0')||relativePath.includes(':')||path.isAbsolute(relativePath)||path.posix.normalize(relativePath)!==relativePath||relativePath.split('/').some(part=>part===''||part==='..'))return undefined;
      return{toolName:binding.toolName.toLowerCase(),operation:'file-read',path:relativePath,pathArg};
    }catch{return undefined;}
  }
  function registeredFileReadCapability(bindingValue:GatewayFileReadBinding):GatewayFileReadCapability{
    const binding=normalizeFileReadBinding(bindingValue),target=binding&&resources.get(binding.path);
    if(closed||!binding||!target||target.descriptor.sensitive||target.descriptor.decoyId||dangerousPath.test(target.descriptor.path)||!stillBound(target))throw Error('GATEWAY_FILE_CAPABILITY_UNAVAILABLE');
    const capability=Object.freeze(Object.create(null)) as GatewayFileReadCapability;
    fileReadCapabilityRecords.set(capability,{owner:capabilityOwner,toolName:binding.toolName,pathArg:binding.pathArg,relativePath:binding.path,resource:target});
    issuedCapabilities.add(capability);
    return capability;
  }
  function matchingFileReadCapability(value:unknown,call:unknown,operation:unknown):FileReadCapabilityRecord|undefined{
    try{
      if(!value||typeof value!=='object'||operation!=='file-read')return undefined;
      const record=fileReadCapabilityRecords.get(value);
      if(!record||record.owner!==capabilityOwner||closed||resources.get(record.relativePath)!==record.resource)return undefined;
      if(!call||typeof call!=='object')return undefined;
      const callDescriptors=Object.getOwnPropertyDescriptors(call);
      if(callDescriptors.name?.get||callDescriptors.name?.set||!callDescriptors.name||callDescriptors.args?.get||callDescriptors.args?.set||!callDescriptors.args)return undefined;
      const toolName=callDescriptors.name.value;
      const args=callDescriptors.args.value;
      if(typeof toolName!=='string'||toolName.toLowerCase()!==record.toolName||!args||typeof args!=='object'||Array.isArray(args))return undefined;
      const argDescriptors=Object.getOwnPropertyDescriptors(args);
      const argKeys=Object.keys(argDescriptors);
      if(argKeys.length!==1||argKeys[0]!==record.pathArg||argDescriptors[record.pathArg].get||argDescriptors[record.pathArg].set||!('value'in argDescriptors[record.pathArg]))return undefined;
      if(argDescriptors[record.pathArg].value!==record.relativePath)return undefined;
      const target=record.resource;
      if(target.descriptor.sensitive||target.descriptor.decoyId||dangerousPath.test(target.descriptor.path)||!stillBound(target))return undefined;
      return record;
    }catch{return undefined;}
  }
  function policy(r:Request):{decision:EvidenceDecision;reason:string}{
    const schemas:Record<string,string[]>={read_file:['path'],write_file:['path','content'],run_command:['command'],http_request:['url'],mcp_tool:['tool','arguments']};
    if(!schemas[r.name]||Object.keys(r.args).some(k=>!schemas[r.name].includes(k)))return{decision:'DENY',reason:'unregistered_tool_or_parameter'};
    if(r.name==='read_file'||r.name==='write_file'){
      const target=resource(r);
      if(!target||!stillBound(target))return{decision:'DENY',reason:'resource_not_bound'};
      if((target.descriptor.sensitive||dangerousPath.test(target.descriptor.path))&&!target.descriptor.decoyId)return{decision:'DENY',reason:'credential_resource_denied'};
      if(r.name==='write_file'&&(!target.descriptor.writable||typeof r.args.content!=='string'||Buffer.byteLength(r.args.content)>65_536))return{decision:'DENY',reason:'write_capability_or_size_denied'};
      return{decision:target.descriptor.approvalRequired?'REQUIRE_APPROVAL':'ALLOW',reason:'host_scoped_file_capability'};
    }
    if(r.name==='run_command'){
      const c=typeof r.args.command==='string'?commands.get(r.args.command):undefined;
      return c?{decision:c.approvalRequired?'REQUIRE_APPROVAL':'ALLOW',reason:'host_fixed_argv_capability'}:{decision:'DENY',reason:'unregistered_command'};
    }
    if(r.name==='http_request'){
      try{const u=new URL(String(r.args.url));if(u.protocol!=='https:'||!origins.has(u.origin)||u.username||u.password||u.search||u.hash)return{decision:'DENY',reason:'network_capability_denied'};
        if(history.sensitiveObserved)return{decision:'DENY',reason:'sensitive_session_egress_denied'};
        return{decision:'ALLOW',reason:'host_read_origin_capability'};
      }catch{return{decision:'DENY',reason:'network_target_invalid'};}
    }
    const t=typeof r.args.tool==='string'?mcp.get(r.args.tool):undefined;
    if(!t||!r.args.arguments||typeof r.args.arguments!=='object'||Array.isArray(r.args.arguments))return{decision:'DENY',reason:'mcp_capability_denied'};
    if(t.risk==='NETWORK'&&(history.sensitiveObserved||secretPattern.test(canonicalJSON(r.args.arguments))||provenance.inspect(canonicalJSON(r.args.arguments)).length>0))return{decision:'DENY',reason:'sensitive_session_egress_denied'};
    if(t.risk==='SENSITIVE_DATA'||t.risk==='DESTRUCTIVE')return{decision:'DENY',reason:'mcp_high_risk_denied'};
    return{decision:t.approvalRequired||t.risk===undefined?'REQUIRE_APPROVAL':'ALLOW',reason:'host_mcp_capability'};
  }
  async function aiDenies(r:Request,signal?:AbortSignal):Promise<boolean>{
    if(!options.provider)return false;
    const events=previewAnalysis([{id:'proposed-call',text:canonicalJSON({tool:r.name,arguments:r.args,trust:'UNTRUSTED_DATA_NOT_AUTHORITY'})}]);
    const abort=new AbortController();track(abort);let timer:ReturnType<typeof setTimeout>|undefined,abortListener:(()=>void)|undefined;
    const cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)abort.abort();
    try{
      const cancelled=new Promise<never>((_,reject)=>{abortListener=()=>reject(Error('GATEWAY_REVIEW_ABORTED'));abort.signal.addEventListener('abort',abortListener,{once:true});if(abort.signal.aborted)abortListener();});
      const result=await Promise.race([options.provider.analyze({events,cloudConsent:options.cloudConsent,signal:abort.signal}),cancelled,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('GATEWAY_AI_TIMEOUT'));},reviewMs);})]);
      if(result.status!=='ok'||result.advisoryOnly!==true||canonicalJSON(result).length>16_000)return false;
      const checked=validateAnalysisOutput(canonicalJSON({verdict:result.verdict,severity:result.severity,confidence:result.confidence,summary:result.summary,evidence:result.evidence,reasoningSummary:result.reasoningSummary,recommendedActions:result.recommendedActions}),events);
      return checked.verdict==='suspicious';
    }catch{return false;}finally{if(timer)clearTimeout(timer);abort.abort();if(abortListener)abort.signal.removeEventListener('abort',abortListener);signal?.removeEventListener('abort',cancel);untrack(abort);}
  }
  async function execute(r:Request,approval:string|null,signal?:AbortSignal):Promise<unknown>{
    if(closed)throw Error('GATEWAY_CLOSED_OR_QUEUE_FULL');
    if(signal?.aborted)return blocked(r,'cancelled_before_execution');
    const decision=policy(r);
    if(decision.decision==='DENY')return blocked(r,decision.reason);
    // Recheck after review/approval/queue, directly before a trusted executor starts.
    const gd=options.guard.beforeToolCall(gatewayCall(r));if(!gd.allowed){abortSession();return blocked(r,guardReason(gd.reason));}
    if(!options.evidence.canRecord(2))throw Error('GATEWAY_EVIDENCE_CAPACITY');
    audit(r,'ALLOW',decision.reason,'RUNNING','NOT_STARTED',approval);
    const abort=new AbortController(),cancel=()=>abort.abort();track(abort);signal?.addEventListener('abort',cancel,{once:true});
    let timer:ReturnType<typeof setTimeout>|undefined,abortListener:(()=>void)|undefined;
    try{
      const cancelled=new Promise<never>((_,reject)=>{abortListener=()=>reject(Error('GATEWAY_REQUEST_ABORTED'));abort.signal.addEventListener('abort',abortListener,{once:true});if(abort.signal.aborted)abortListener();});
      // File effects are synchronous fd operations: quarantine cannot interleave in this JS turn.
      const perform=()=>{
        if(closed)throw Error('GATEWAY_CLOSED_OR_QUEUE_FULL');
        if(abort.signal.aborted)throw Error('GATEWAY_REQUEST_ABORTED');
        const finalGuard=options.guard.beforeToolCall(gatewayCall(r));
        if(!finalGuard.allowed){abortSession();throw Error('GATEWAY_GUARD_CHANGED_BEFORE_EFFECT');}
        // Audit callbacks may yield a changed path. Reject the observed change before fd I/O.
        // This narrows the window; it is not an atomic OS-wide path/operation transaction.
        if(r.name==='read_file'||r.name==='write_file'){
          const f=resource(r);if(!f||!stillBound(f))throw Error('GATEWAY_RESOURCE_CHANGED_BEFORE_EFFECT');
        }
        if(r.name==='read_file'){
          const f=resource(r)!;const stat=fs.fstatSync(f.fd);if(stat.size>65_536)throw Error('GATEWAY_READ_LIMIT');
          const buffer=Buffer.alloc(stat.size);let offset=0;while(offset<buffer.length){const n=fs.readSync(f.fd,buffer,offset,buffer.length-offset,offset);if(!n)break;offset+=n;}
          // Reads use only the already-held descriptor, so a path swap cannot redirect I/O.
          // Recheck after the descriptor read as well; this is detection, not an OS-wide atomic transaction.
          if(!stillBound(f))throw Error('GATEWAY_RESOURCE_CHANGED_DURING_READ');
          const text=buffer.subarray(0,offset).toString('utf8');
          if(secretPattern.test(text)||f.descriptor.decoyId){history.sensitiveObserved=true;flow.record('sensitive-source',text);if(text.length<=4096)provenance.register(f.descriptor.decoyId??'sensitive-file',text);}
          if(f.descriptor.decoyId){options.guard.trip({reason:'honeypot_read',toolName:r.name});options.onDecoyRead?.(f.descriptor.decoyId);}
          return {content:text};
        }
        if(r.name==='write_file'){
          const f=resource(r)!,buffer=Buffer.from(String(r.args.content));let offset=0;
          while(offset<buffer.length){const n=fs.writeSync(f.fd,buffer,offset,buffer.length-offset,offset);if(n<=0)throw Error('GATEWAY_WRITE_SHORT');offset+=n;}
          fs.ftruncateSync(f.fd,buffer.length);fs.fsyncSync(f.fd);
          const check=Buffer.alloc(buffer.length);let pos=0;while(pos<check.length){const n=fs.readSync(f.fd,check,pos,check.length-pos,pos);if(!n)break;pos+=n;}
          if(pos!==buffer.length||!check.equals(buffer)||!stillBound(f))throw Error('GATEWAY_WRITE_VERIFICATION_FAILED');
          return {writtenBytes:buffer.length};
        }
        if(r.name==='http_request')return executePinnedJSONTool({name:r.name,args:{url:r.args.url,method:'GET'}},{signal:abort.signal});
        if(r.name==='mcp_tool')return mcp.get(String(r.args.tool))!.execute(r.args.arguments as Record<string,unknown>,abort.signal);
        const command=commands.get(String(r.args.command))!;
        return new Promise<{exitCode:number;stdout:string}>((resolve,reject)=>{
          const env:NodeJS.ProcessEnv={};for(const name of ['SystemRoot','WINDIR','TEMP','TMP'])if(process.env[name])env[name]=process.env[name];
          const child=spawn(command.executable,[...command.args],{cwd:root,env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],signal:abort.signal});
          const chunks:Buffer[]=[];let bytes=0;
          child.stdout.on('data',(c:Buffer)=>{bytes+=c.length;if(bytes>65_536){child.kill();reject(Error('GATEWAY_PROCESS_OUTPUT_LIMIT'));}else chunks.push(c);});
          child.stderr.on('data',(c:Buffer)=>{bytes+=c.length;if(bytes>65_536){child.kill();reject(Error('GATEWAY_PROCESS_OUTPUT_LIMIT'));}});
          child.on('error',()=>reject(Error('GATEWAY_PROCESS_FAILED')));
          child.on('close',code=>code===0?resolve({exitCode:0,stdout:Buffer.concat(chunks).toString('utf8')}):reject(Error('GATEWAY_PROCESS_EXIT_FAILED')));
        });
      };
      const result=await Promise.race([Promise.resolve().then(perform),cancelled,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();options.guard.trip({reason:'gateway_timeout'});reject(Error('GATEWAY_EXECUTION_TIMEOUT'));},deadline);})]);
      const output=typeof result==='string'?result:JSON.stringify(result)??'';
      if(secretPattern.test(output)){history.sensitiveObserved=true;flow.record('sensitive-source',output);if(output.length<=4096)provenance.register('tool-output',output);}
      audit(r,'ALLOW',decision.reason,'SUCCEEDED',r.name==='read_file'||r.name==='write_file'?'VERIFIED':'NOT_VERIFIED',approval);
      return result;
    }catch(error){
      options.guard.trip({reason:'gateway_execution_failed'});
      abortSession();
      audit(r,'ALLOW','execution_failed','FAILED','NOT_VERIFIED',approval);
      throw Error('GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK');
    }finally{if(timer)clearTimeout(timer);abort.abort();if(abortListener)abort.signal.removeEventListener('abort',abortListener);signal?.removeEventListener('abort',cancel);untrack(abort);}
  }
  function sweep(){for(const [id,p]of pending)if(p.expires<=Date.now())pending.delete(id);}
  const agent=Object.freeze({
    dispatch(call:ToolCall,signal?:AbortSignal){
      const request=normalize(call);
      const admittedAtEpoch=history.quarantineEpoch;
      if(closed||history.queued>=64)return Promise.reject(Error('GATEWAY_CLOSED_OR_QUEUE_FULL'));
      try{
        if(signal?.aborted)return blocked(request,'cancelled_before_execution');
        options.guard.inspect(canonicalJSON(request.args),'gateway-arguments');
        const initial=options.guard.beforeToolCall(gatewayCall(request));
        if(!initial.allowed){abortSession();return blocked(request,guardReason(initial.reason));}
      }catch(error){if(options.guard.state!=='SAFE')abortSession();return Promise.reject(error);}
      return serialize(async()=>{
        if(closed)throw Error('GATEWAY_CLOSED_OR_QUEUE_FULL');
        if(admittedAtEpoch!==history.quarantineEpoch)return blocked(request,'guard_quarantined');
        if(signal?.aborted)return blocked(request,'cancelled_before_execution');
        const gd=options.guard.beforeToolCall(gatewayCall(request));if(!gd.allowed){abortSession();return blocked(request,guardReason(gd.reason));}
        const d=policy(request);if(d.decision==='DENY')return blocked(request,d.reason);
        if(d.decision==='REQUIRE_APPROVAL'){
          if(await aiDenies(request,signal))return blocked(request,'ai_tightened_denial');
          if(admittedAtEpoch!==history.quarantineEpoch)return blocked(request,'guard_quarantined');
          if(closed)throw Error('GATEWAY_CLOSED_OR_QUEUE_FULL');
          if(signal?.aborted)return blocked(request,'cancelled_before_execution');
          const afterReview=options.guard.beforeToolCall(gatewayCall(request));if(!afterReview.allowed){abortSession();return blocked(request,guardReason(afterReview.reason));}
          sweep();if(pending.size>=64)return blocked(request,'approval_capacity');
          audit(request,'REQUIRE_APPROVAL',d.reason,'NOT_STARTED','NOT_STARTED');
          pending.set(request.id,{request,expires:Date.now()+ttl});throw new GatewayDeniedError(d.reason,request.id,'REQUIRE_APPROVAL');
        }
        return execute(request,null,signal);
      });
    }
  });
  function verifyFileReadCapability(capability:GatewayFileReadCapability,call:ToolCall,operation:string):boolean{
    return matchingFileReadCapability(capability,call,operation)!==undefined;
  }
  function readFileWithCapability(capability:GatewayFileReadCapability,call:ToolCall,operation:string,signal?:AbortSignal):Promise<unknown>{
    const record=matchingFileReadCapability(capability,call,operation);
    if(!record)return Promise.reject(Error('GATEWAY_FILE_CAPABILITY_INVALID'));
    // Dispatch through the ordinary M1 boundary using the path bound at registration;
    // policy, Guard, queue, and held-fd identity checks still run before the read.
    return agent.dispatch({name:'read_file',args:{path:record.relativePath}},signal);
  }
  /** This object is a host capability; identity comes from possession, not model parameters. */
  const operator=Object.freeze({
    pending(){sweep();return [...pending].map(([requestId,p])=>({requestId,tool:p.request.name,expiresAt:p.expires}));},
    approve(requestId:string){return serialize(async()=>{if(closed)throw Error('GATEWAY_CLOSED_OR_QUEUE_FULL');sweep();const p=pending.get(requestId);if(!p)throw Error('GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED');pending.delete(requestId);return execute(p.request,createHmac('sha256',key).update(requestId).digest('hex'));});},
    reject(requestId:string){sweep();const p=pending.get(requestId);if(!p)throw Error('GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED');pending.delete(requestId);return blocked(p.request,'operator_rejected');},
  });
  function close():Promise<void>{
    if(closePromise)return closePromise;
    closed=true;pending.clear();
    for(const capability of issuedCapabilities)fileReadCapabilityRecords.delete(capability);
    issuedCapabilities.clear();
    let resolveClose!:()=>void,rejectClose!:(error:Error)=>void;
    const result=new Promise<void>((resolve,reject)=>{resolveClose=resolve;rejectClose=reject;});
    // Publish before abort listeners or the Guard disposer can re-enter close().
    closePromise=result;
    for(const controller of activeControllers)controller.abort();
    const unsubscribe=unsubscribeQuarantine;unsubscribeQuarantine=()=>{};try{unsubscribe();}catch{}
    void history.tail.then(()=>{
      let failed=false;
      for(const f of resources.values())if(f.fd>=0){
        const fd=f.fd;f.fd=-1;
        try{fs.closeSync(fd);}catch{failed=true;}
      }
      if(failed)rejectClose(new Error('GATEWAY_RESOURCE_CLOSE_FAILED'));
      else resolveClose();
    });
    return result;
  }
  try{
    const unsubscribe=options.guard.subscribeQuarantine(quarantineSession);
    if(typeof unsubscribe!=='function')throw Error('GUARD_QUARANTINE_DISPOSER_INVALID');
    unsubscribeQuarantine=unsubscribe;
  }catch{
    for(const f of resources.values())if(f.fd>=0){try{fs.closeSync(f.fd);}catch{}f.fd=-1;}
    throw Error('GATEWAY_QUARANTINE_SUBSCRIPTION_FAILED');
  }
  return Object.freeze({agent,operator,
    /** Host-only issuance for one safe, constructor-registered file read and exact M5 tool binding. */
    bindFileReadCapability:registeredFileReadCapability,
    /** M5 calls this immediately before its callback; it rechecks the registered path and held identity. */
    verifyFileReadCapability,
    /** Executes through M1's normal Gateway using the capability-bound path, never a model-supplied path. */
    readFileWithCapability,
    evidence:()=>options.evidence.snapshot(),dataflow:()=>flow.snapshot(),provenance:()=>provenance.snapshot(),close});
}
