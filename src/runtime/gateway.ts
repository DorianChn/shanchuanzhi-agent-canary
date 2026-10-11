import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import type {AgentGuard,ToolCall} from '../containment.js';
import type {AIProvider} from '../ai/types.js';
import {previewAnalysis} from '../ai/provider.js';
import {SessionDataFlow} from '../dataflow.js';
import {DataFlowTracker} from './dataflow.js';
import {executePinnedJSONTool} from '../network-tool.js';
import {canonicalJSON,EvidenceRecorder,type EvidenceDecision,type ExecutionStatus,type SideEffectVerification} from './evidence.js';

export interface GatewayFile {path:string; writable?:boolean; approvalRequired?:boolean; sensitive?:boolean; decoyId?:string}
export interface GatewayCommand {executable:string; args:readonly string[]; approvalRequired?:boolean}
export interface GatewayOptions {
  agentId:string; guard:AgentGuard; workspaceRoot:string; files:readonly GatewayFile[];
  commands?:Record<string,GatewayCommand>; readOrigins?:readonly string[];
  evidence:EvidenceRecorder; provider?:AIProvider; cloudConsent?:boolean;
  timeoutMs?:number; reviewTimeoutMs?:number; approvalTtlMs?:number;
  onDecoyRead?:(decoyId:string)=>void;
  /** Host-owned MCP callback only. Capabilities are keyed by exact trusted tool ID. */
  mcpTools?:Record<string,{execute:(args:Record<string,unknown>,signal:AbortSignal)=>Promise<unknown>;approvalRequired:boolean}>;
}
export class GatewayDeniedError extends Error {
  constructor(readonly reason:string,readonly requestId:string,readonly decision:EvidenceDecision='DENY'){super('GATEWAY_'+decision+':'+reason);}
}
type Resource={descriptor:Readonly<GatewayFile>;fd:number;dev:number;ino:number;absolute:string};
type Request={name:string;args:Record<string,unknown>;id:string;digest:string};
const idPattern=/^[A-Za-z0-9_.:-]{1,100}$/;
const filePath=(v:string)=>v.replaceAll('\\','/');
const dangerousPath=/(^|\/)(\.env(?:\.[^/]*)?|id_rsa|id_ed25519|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?)(\/|$)/i;
const secretPattern=/NOT_A_REAL_CREDENTIAL|cnry_[\w-]+|(?:api[_-]?key|password|authorization|secret)\s*[:=]\s*\S+/i;
const sameFile=(a:{dev:number;ino:number},b:{dev:number;ino:number})=>a.dev===b.dev&&a.ino===b.ino;

/** Capability-bound host runtime. No model-facing reset, approval or resource registration. */
export function createTrustedExecutionGateway(options:GatewayOptions){
  if(!idPattern.test(options.agentId)||!idPattern.test(options.guard.sessionId)||!path.isAbsolute(options.workspaceRoot))throw Error('GATEWAY_ID_OR_ROOT_INVALID');
  const root=fs.realpathSync(options.workspaceRoot),resources=new Map<string,Resource>();
  const key=randomBytes(32),flow=new SessionDataFlow(),provenance=new DataFlowTracker();
  const commands=new Map<string,Readonly<GatewayCommand>>();
  const mcp=new Map(Object.entries(options.mcpTools??{}).map(([name,t])=>[name,Object.freeze({...t})]));
  const origins=new Set((options.readOrigins??[]).map(o=>{const u=new URL(o);if(u.protocol!=='https:'||o!==u.origin||u.username||u.password)throw Error('GATEWAY_ORIGIN_INVALID');return o;}));
  const deadline=options.timeoutMs??10_000,reviewMs=options.reviewTimeoutMs??10_000,ttl=options.approvalTtlMs??60_000;
  for(const n of [deadline,reviewMs,ttl])if(!Number.isInteger(n)||n<1||n>180_000)throw Error('GATEWAY_TIMEOUT_INVALID');
  try{
    for(const f of options.files){
      const relative=filePath(f.path);
      if(!relative||relative.includes('\0')||relative.includes(':')||path.isAbsolute(relative)||relative!==path.posix.normalize(relative)||relative.split('/').includes('..')||resources.has(relative))throw Error('GATEWAY_RESOURCE_INVALID');
      const absolute=path.join(root,relative),real=fs.realpathSync(absolute),rel=path.relative(root,real);
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
    for(const [name,t]of mcp)if(!idPattern.test(name)||typeof t.execute!=='function'||typeof t.approvalRequired!=='boolean')throw Error('GATEWAY_MCP_INVALID');
  }catch(error){for(const r of resources.values())fs.closeSync(r.fd);throw error;}
  let closed=false,queued=0,tail:Promise<unknown>=Promise.resolve();
  const pending=new Map<string,{request:Request;expires:number}>();
  function serialize<T>(fn:()=>Promise<T>):Promise<T>{if(closed||queued>=64)return Promise.reject(Error('GATEWAY_CLOSED_OR_QUEUE_FULL'));queued++;const task=tail.then(fn).finally(()=>{queued--;});tail=task.catch(()=>{});return task;}
  function normalize(call:ToolCall):Request{
    const data=JSON.parse(canonicalJSON(call));
    if(Object.keys(data).some(k=>k!=='name'&&k!=='args')||typeof data.name!=='string'||!idPattern.test(data.name)||!data.args||Array.isArray(data.args)||typeof data.args!=='object')throw Error('GATEWAY_REQUEST_INVALID');
    if(Buffer.byteLength(canonicalJSON(data))>24_000)throw Error('GATEWAY_REQUEST_LIMIT');
    return {name:data.name,args:data.args,id:randomUUID(),digest:createHmac('sha256',key).update(canonicalJSON(data)).digest('hex')};
  }
  function audit(r:Request,decision:EvidenceDecision,reason:string,status:ExecutionStatus,verified:SideEffectVerification,approval:string|null=null){
    return options.evidence.record({session_id:options.guard.sessionId,agent_id:options.agentId,tool_id:r.name,request_id:r.id,request_digest:r.digest,policy_version:'gateway-3.0-alpha.1',decision,decision_reason:reason,approval_reference:approval,execution_status:status,side_effect_verification:verified});
  }
  function blocked(r:Request,reason:string,decision:EvidenceDecision='DENY'):never {audit(r,decision,reason,'NOT_STARTED','NOT_STARTED');throw new GatewayDeniedError(reason,r.id,decision);}
  function resource(r:Request):Resource|undefined{return typeof r.args.path==='string'?resources.get(filePath(r.args.path)):undefined;}
  function stillBound(r:Resource):boolean{try{const named=fs.lstatSync(r.absolute),held=fs.fstatSync(r.fd);return named.isFile()&&!named.isSymbolicLink()&&named.nlink===1&&sameFile(r,named)&&sameFile(r,held)&&fs.realpathSync(r.absolute)===r.absolute;}catch{return false;}}
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
        if(flow.hasSensitiveSource())return{decision:'DENY',reason:'sensitive_session_egress_denied'};
        return{decision:'ALLOW',reason:'host_read_origin_capability'};
      }catch{return{decision:'DENY',reason:'network_target_invalid'};}
    }
    const t=typeof r.args.tool==='string'?mcp.get(r.args.tool):undefined;
    if(!t||!r.args.arguments||typeof r.args.arguments!=='object'||Array.isArray(r.args.arguments))return{decision:'DENY',reason:'mcp_capability_denied'};
    return{decision:t.approvalRequired?'REQUIRE_APPROVAL':'ALLOW',reason:'host_mcp_capability'};
  }
  async function aiDenies(r:Request,signal?:AbortSignal):Promise<boolean>{
    if(!options.provider)return false;
    const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    const cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)abort.abort();
    try{
      const result=await Promise.race([options.provider.analyze({events:previewAnalysis([{id:'proposed-call',text:canonicalJSON({tool:r.name,arguments:r.args,trust:'UNTRUSTED_DATA_NOT_AUTHORITY'})}]),cloudConsent:options.cloudConsent,signal:abort.signal}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('GATEWAY_AI_TIMEOUT'));},reviewMs);})]);
      return result.status==='ok'&&result.advisoryOnly===true&&result.verdict==='suspicious'&&result.evidence.every(e=>e.eventId==='proposed-call')&&canonicalJSON(result).length<=16_000;
    }catch{return false;}finally{if(timer)clearTimeout(timer);abort.abort();signal?.removeEventListener('abort',cancel);}
  }
  async function execute(r:Request,approval:string|null,signal?:AbortSignal):Promise<unknown>{
    if(signal?.aborted)return blocked(r,'cancelled_before_execution');
    const decision=policy(r);
    if(decision.decision==='DENY')return blocked(r,decision.reason);
    // Recheck after review/approval/queue, directly before a trusted executor starts.
    const gd=options.guard.beforeToolCall({name:r.name,args:r.args});if(!gd.allowed)return blocked(r,'guard_quarantined');
    if(!options.evidence.canRecord(2))throw Error('GATEWAY_EVIDENCE_CAPACITY');
    audit(r,'ALLOW',decision.reason,'RUNNING','NOT_STARTED',approval);
    const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      // File effects are synchronous fd operations: quarantine cannot interleave in this JS turn.
      const perform=()=>{
        if(r.name==='read_file'){
          const f=resource(r)!;const stat=fs.fstatSync(f.fd);if(stat.size>65_536)throw Error('GATEWAY_READ_LIMIT');
          const buffer=Buffer.alloc(stat.size);let offset=0;while(offset<buffer.length){const n=fs.readSync(f.fd,buffer,offset,buffer.length-offset,offset);if(!n)break;offset+=n;}
          const text=buffer.subarray(0,offset).toString('utf8');
          if(secretPattern.test(text)||f.descriptor.decoyId){flow.record('sensitive-source',text);if(text.length<=4096)provenance.register(f.descriptor.decoyId??'sensitive-file',text);}
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
      const result=await Promise.race([Promise.resolve(perform()),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();options.guard.trip({reason:'gateway_timeout'});reject(Error('GATEWAY_EXECUTION_TIMEOUT'));},deadline);})]);
      const output=typeof result==='string'?result:JSON.stringify(result)??'';
      if(secretPattern.test(output)){flow.record('sensitive-source',output);if(output.length<=4096)provenance.register('tool-output',output);}
      audit(r,'ALLOW',decision.reason,'SUCCEEDED',r.name==='read_file'||r.name==='write_file'?'VERIFIED':'NOT_VERIFIED',approval);
      return result;
    }catch(error){
      options.guard.trip({reason:'gateway_execution_failed'});
      audit(r,'ALLOW','execution_failed','FAILED','NOT_VERIFIED',approval);
      throw Error('GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK');
    }finally{if(timer)clearTimeout(timer);abort.abort();signal?.removeEventListener('abort',cancel);}
  }
  function sweep(){for(const [id,p]of pending)if(p.expires<=Date.now())pending.delete(id);}
  const agent=Object.freeze({
    dispatch(call:ToolCall,signal?:AbortSignal){
      const request=normalize(call);
      return serialize(async()=>{
        if(signal?.aborted)return blocked(request,'cancelled_before_execution');
        options.guard.inspect(canonicalJSON(request.args),'gateway-arguments');
        if(!options.guard.beforeToolCall({name:request.name,args:request.args}).allowed)return blocked(request,'guard_quarantined');
        const d=policy(request);if(d.decision==='DENY')return blocked(request,d.reason);
        if(d.decision==='REQUIRE_APPROVAL'){
          if(await aiDenies(request,signal))return blocked(request,'ai_tightened_denial');
          if(signal?.aborted)return blocked(request,'cancelled_before_execution');
          if(!options.guard.beforeToolCall({name:request.name,args:request.args}).allowed)return blocked(request,'guard_quarantined');
          sweep();if(pending.size>=64)return blocked(request,'approval_capacity');
          audit(request,'REQUIRE_APPROVAL',d.reason,'NOT_STARTED','NOT_STARTED');
          pending.set(request.id,{request,expires:Date.now()+ttl});throw new GatewayDeniedError(d.reason,request.id,'REQUIRE_APPROVAL');
        }
        return execute(request,null,signal);
      });
    }
  });
  /** This object is a host capability; identity comes from possession, not model parameters. */
  const operator=Object.freeze({
    pending(){sweep();return [...pending].map(([requestId,p])=>({requestId,tool:p.request.name,expiresAt:p.expires}));},
    approve(requestId:string){return serialize(async()=>{sweep();const p=pending.get(requestId);if(!p)throw Error('GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED');pending.delete(requestId);return execute(p.request,createHmac('sha256',key).update(requestId).digest('hex'));});},
    reject(requestId:string){sweep();const p=pending.get(requestId);if(!p)throw Error('GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED');pending.delete(requestId);return blocked(p.request,'operator_rejected');},
  });
  return Object.freeze({agent,operator,evidence:()=>options.evidence.snapshot(),dataflow:()=>flow.snapshot(),provenance:()=>provenance.snapshot(),
    async close(){closed=true;await tail;pending.clear();for(const f of resources.values())fs.closeSync(f.fd);}
  });
}
