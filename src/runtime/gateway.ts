import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import type {AgentGuard,ToolCall} from '../containment.js';
import {DECOY_TOOLS} from '../decoys.js';
import type {AIProvider} from '../ai/types.js';
import {previewAnalysis,validateAnalysisOutput} from '../ai/provider.js';
import {SessionDataFlow} from '../dataflow.js';
import {DataFlowTracker} from './dataflow.js';
import {executePinnedJSONTool} from '../network-tool.js';
import {canonicalJSON,EvidenceRecorder,type EvidenceDecision,type ExecutionStatus,type SideEffectVerification} from './evidence.js';
import {getSyntheticDecoyGatewayFileProof} from './synthetic-decoy-capability.js';
import {openSecureWorkspace,type SecureDirectoryHandle,type SecureFileHandle} from './secure-file.js';

/** Exact host-captured file version for binding a pre-authorized target to M1. */
export type GatewayFileIdentity=Readonly<{
  dev:string;
  ino:string;
  birthtimeNs:string;
  ctimeNs:string;
  mtimeNs:string;
  size:string;
}>;
/** Canonical workspace directory captured by a trusted host before asynchronous setup. */
export type GatewayWorkspaceIdentity=Readonly<{
  path:string;
  dev:string;
  ino:string;
  birthtimeNs:string;
}>;
export interface GatewayFile {
  path:string;
  /** When supplied, registration must match this host-captured identity before any content is read. */
  expectedIdentity?:GatewayFileIdentity;
  /** @deprecated Retained for source compatibility; M1 writes fail closed until a path-safe replacement primitive exists. */
  writable?:boolean;
  approvalRequired?:boolean;
  sensitive?:boolean;
  decoyId?:string;
}
export interface GatewayFileReadBinding {toolName:string; operation:'file-read'; path:string; pathArg?:string}
declare const gatewayFileReadCapabilityBrand:unique symbol;
/** Opaque host-only handle. It contains no path or OS descriptor and is not model call data. */
export type GatewayFileReadCapability={readonly [gatewayFileReadCapabilityBrand]:never};
export interface GatewayCommand {executable:string; args:readonly string[]; approvalRequired?:boolean}
export interface GatewayOptions {
  agentId:string; guard:AgentGuard; workspaceRoot:string; files:readonly GatewayFile[];
  /** When supplied, registration must stay on the host-captured canonical workspace directory. */
  expectedWorkspaceIdentity?:GatewayWorkspaceIdentity;
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
type FileSnapshot={dev:bigint;ino:bigint;birthtimeNs:bigint;ctimeNs:bigint;mtimeNs:bigint;size:bigint};
type ResourceMetadata={descriptor:Readonly<GatewayFile>;protectedPath:boolean;syntheticDecoy:boolean;syntheticDecoyContent:string|null};
type Resource=ResourceMetadata&({fd:null;absolute:null;secureHandle:null;relative:null;contentTag:null}|(FileSnapshot&{fd:number;absolute:string;secureHandle:SecureFileHandle;relative:string;contentTag:string|null}));
type FileReadCapabilityRecord={owner:symbol;toolName:string;pathArg:string;relativePath:string;resource:Resource};
const fileReadCapabilityRecords=new WeakMap<object,FileReadCapabilityRecord>();
type Request={name:string;args:Record<string,unknown>;id:string;digest:string};
const idPattern=/^[A-Za-z0-9_.:-]{1,100}$/;
const filePath=(v:string)=>v.replaceAll('\\','/');
// Conservatively deny common private-key and credential-container extensions.
// Public certificates in PEM encoding are blocked too; a host can expose a
// separately reviewed public certificate under a non-secret extension.
const dangerousPath=/(^|\/)(?:\.env(?:\.[^/]*)?|\.ssh|\.gnupg|\.aws|\.azure|\.kube|\.docker|\.netrc|\.npmrc|\.pypirc|\.git-credentials|id_(?:rsa|ed25519|ecdsa|dsa)(?:_sk)?|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?|private-keys-v1\.d|application_default_credentials\.json|service[-_]account[-_]credentials(?:\.[^/]*)?|[^/]*\.(?:key|pem|p12|pfx|ppk|jks|jceks|keystore|kdbx|kdb|keytab|ovpn))(\/|$)/i;
const secretPattern=/NOT_A_REAL_CREDENTIAL|cnry_[\w-]+|(?:api[_-]?key|password|authorization|secret)\s*[:=]\s*\S+/i;
const sameFile=(a:{dev:bigint;ino:bigint},b:{dev:bigint;ino:bigint})=>a.dev===b.dev&&a.ino===b.ino;
const sameFileAtOpen=(a:FileSnapshot,b:FileSnapshot)=>sameFile(a,b)&&a.birthtimeNs===b.birthtimeNs&&a.ctimeNs===b.ctimeNs&&a.mtimeNs===b.mtimeNs&&a.size===b.size;
function normalizeExpectedIdentity(value:unknown):FileSnapshot{
  try{
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error();
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null)throw Error();
    const keys=Reflect.ownKeys(value);
    if(keys.some(key=>typeof key!=='string')||keys.slice().sort().join(',')!=='birthtimeNs,ctimeNs,dev,ino,mtimeNs,size')throw Error();
    const descriptors=Object.getOwnPropertyDescriptors(value);
    const decimal=(key:string,allowNegative=false)=>{
      const descriptor=descriptors[key];
      if(!descriptor||descriptor.get||descriptor.set||!('value'in descriptor)||typeof descriptor.value!=='string'||
        !(allowNegative?/^-?(0|[1-9][0-9]*)$/:/^(0|[1-9][0-9]*)$/).test(descriptor.value))throw Error();
      return BigInt(descriptor.value);
    };
    return{dev:decimal('dev'),ino:decimal('ino'),birthtimeNs:decimal('birthtimeNs',true),ctimeNs:decimal('ctimeNs',true),mtimeNs:decimal('mtimeNs',true),size:decimal('size')};
  }catch{throw Error('GATEWAY_EXPECTED_IDENTITY_INVALID');}
}
type WorkspaceSnapshot={dev:bigint;ino:bigint;birthtimeNs:bigint};
type NormalizedWorkspaceIdentity=WorkspaceSnapshot&{path:string};
function normalizeExpectedWorkspaceIdentity(value:unknown):NormalizedWorkspaceIdentity{
  try{
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error();
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null)throw Error();
    const keys=Reflect.ownKeys(value);
    if(keys.some(key=>typeof key!=='string')||keys.slice().sort().join(',')!=='birthtimeNs,dev,ino,path')throw Error();
    const descriptors=Object.getOwnPropertyDescriptors(value);
    const pathDescriptor=descriptors.path;
    if(!pathDescriptor||pathDescriptor.get||pathDescriptor.set||!('value'in pathDescriptor)||typeof pathDescriptor.value!=='string'||!path.isAbsolute(pathDescriptor.value)||pathDescriptor.value.includes('\0'))throw Error();
    const decimal=(key:string,allowNegative=false)=>{
      const descriptor=descriptors[key];
      if(!descriptor||descriptor.get||descriptor.set||!('value'in descriptor)||typeof descriptor.value!=='string'||
        !(allowNegative?/^-?(0|[1-9][0-9]*)$/:/^(0|[1-9][0-9]*)$/).test(descriptor.value))throw Error();
      return BigInt(descriptor.value);
    };
    return{path:pathDescriptor.value,dev:decimal('dev'),ino:decimal('ino'),birthtimeNs:decimal('birthtimeNs',true)};
  }catch{throw Error('GATEWAY_EXPECTED_WORKSPACE_IDENTITY_INVALID');}
}
const sameWorkspaceIdentity=(a:WorkspaceSnapshot,b:WorkspaceSnapshot)=>a.dev===b.dev&&a.ino===b.ino&&a.birthtimeNs===b.birthtimeNs;
// Host reconfiguration cannot reset provenance while retaining the same Guard identity.
const sessionFlows=new WeakMap<AgentGuard,{flow:SessionDataFlow;provenance:DataFlowTracker;sensitiveObserved:boolean;queued:number;tail:Promise<unknown>;controllers:Set<AbortController>;quarantineEpoch:number}>();

/** Capability-bound host runtime. No model-facing reset, approval or resource registration. */
export function createTrustedExecutionGateway(options:GatewayOptions){
  if(!idPattern.test(options.agentId)||!idPattern.test(options.guard.sessionId)||!path.isAbsolute(options.workspaceRoot))throw Error('GATEWAY_ID_OR_ROOT_INVALID');
  // Native Windows resolution expands NTFS short-name aliases before the
  // protected-path and held-resource identity checks below.
  const workspaceIdentityDescriptor=Object.getOwnPropertyDescriptor(options,'expectedWorkspaceIdentity');
  if(workspaceIdentityDescriptor&&!('value'in workspaceIdentityDescriptor))throw Error('GATEWAY_EXPECTED_WORKSPACE_IDENTITY_INVALID');
  const expectedWorkspaceIdentity=workspaceIdentityDescriptor?normalizeExpectedWorkspaceIdentity(workspaceIdentityDescriptor.value):undefined;
  const root=fs.realpathSync.native(options.workspaceRoot);
  let rootStat:fs.BigIntStats;
  try{rootStat=fs.lstatSync(root,{bigint:true});}catch{throw Error('GATEWAY_WORKSPACE_CHANGED');}
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw Error('GATEWAY_WORKSPACE_CHANGED');
  const registeredWorkspaceIdentity:WorkspaceSnapshot={dev:rootStat.dev,ino:rootStat.ino,birthtimeNs:rootStat.birthtimeNs};
  if(expectedWorkspaceIdentity&&(root!==expectedWorkspaceIdentity.path||!sameWorkspaceIdentity(expectedWorkspaceIdentity,rootStat)))throw Error('GATEWAY_WORKSPACE_CHANGED');
  const resources=new Map<string,Resource>();
  const key=randomBytes(32),history=sessionFlows.get(options.guard)??{flow:new SessionDataFlow(),provenance:new DataFlowTracker(),sensitiveObserved:false,queued:0,tail:Promise.resolve(),controllers:new Set<AbortController>(),quarantineEpoch:0};
  sessionFlows.set(options.guard,history);const {flow,provenance}=history;
  const contentTag=(content:Buffer)=>createHmac('sha256',key).update('gateway-file-content\0').update(content).digest('hex');
  const commands=new Map<string,Readonly<GatewayCommand>>();
  const mcp=new Map(Object.entries(options.mcpTools??{}).map(([name,t])=>[name,Object.freeze({...t})]));
  const origins=new Set((options.readOrigins??[]).map(o=>{const u=new URL(o);if(u.protocol!=='https:'||o!==u.origin||u.username||u.password)throw Error('GATEWAY_ORIGIN_INVALID');return o;}));
  const deadline=options.timeoutMs??10_000,reviewMs=options.reviewTimeoutMs??10_000,ttl=options.approvalTtlMs??60_000;
  for(const n of [deadline,reviewMs,ttl])if(!Number.isInteger(n)||n<1||n>180_000)throw Error('GATEWAY_TIMEOUT_INVALID');
  const secureWorkspace=openSecureWorkspace(root);
  try{
    const openedRoot=secureWorkspace.stat();
    if(openedRoot.kind!=='directory'||!sameWorkspaceIdentity(registeredWorkspaceIdentity,openedRoot)||expectedWorkspaceIdentity&&!sameWorkspaceIdentity(expectedWorkspaceIdentity,openedRoot))throw Error('GATEWAY_WORKSPACE_CHANGED');
  }catch(error){try{secureWorkspace.close();}catch{}throw error;}
  function workspaceStillBound():boolean{try{const named=fs.lstatSync(root,{bigint:true}),held=secureWorkspace.stat();return named.isDirectory()&&!named.isSymbolicLink()&&held.kind==='directory'&&sameWorkspaceIdentity(registeredWorkspaceIdentity,named)&&sameWorkspaceIdentity(registeredWorkspaceIdentity,held)&&fs.realpathSync.native(root)===root;}catch{return false;}}
  try{
    for(const f of options.files){
      if(!workspaceStillBound())throw Error('GATEWAY_WORKSPACE_CHANGED');
      const expectedIdentityDescriptor=Object.getOwnPropertyDescriptor(f,'expectedIdentity');
      if(expectedIdentityDescriptor&&!('value'in expectedIdentityDescriptor))throw Error('GATEWAY_EXPECTED_IDENTITY_INVALID');
      const expectedIdentity=expectedIdentityDescriptor?normalizeExpectedIdentity(expectedIdentityDescriptor.value):undefined;
      const decoyIdDescriptor=Object.getOwnPropertyDescriptor(f,'decoyId'),syntheticDecoyProof=getSyntheticDecoyGatewayFileProof(f,root);
      const relative=filePath(f.path);
      if(decoyIdDescriptor!==undefined&&!('value'in decoyIdDescriptor))throw Error('GATEWAY_DECOY_CAPABILITY_INVALID');
      const configuredDecoyId=decoyIdDescriptor&&'value'in decoyIdDescriptor?decoyIdDescriptor.value:undefined;
      if(configuredDecoyId!==undefined&&typeof configuredDecoyId!=='string')throw Error('GATEWAY_DECOY_CAPABILITY_INVALID');
      const hasDecoyId=typeof configuredDecoyId==='string'&&configuredDecoyId.length>0,protectedPath=f.sensitive===true||dangerousPath.test(relative);
      if(hasDecoyId&&protectedPath&&!syntheticDecoyProof||syntheticDecoyProof&&(configuredDecoyId!==syntheticDecoyProof.decoyId||f.path!==syntheticDecoyProof.path||f.sensitive!==true))throw Error('GATEWAY_DECOY_CAPABILITY_INVALID');
      if(!relative||relative.includes('\0')||relative.includes(':')||path.isAbsolute(relative)||relative!==path.posix.normalize(relative)||relative.split('/').includes('..')||resources.has(relative))throw Error('GATEWAY_RESOURCE_INVALID');
      // The proof already carries synthetic content in memory. Never resolve,
      // stat, open, or retain the protected-looking decoy pathname.
      if(syntheticDecoyProof){
        resources.set(relative,{descriptor:Object.freeze({...f}),fd:null,absolute:null,secureHandle:null,relative:null,contentTag:null,protectedPath:true,syntheticDecoy:true,syntheticDecoyContent:syntheticDecoyProof.content});
        continue;
      }
      // Keep real protected targets as deny-only entries. Do not resolve, stat,
      // open, or retain their files.
      if(protectedPath){
        resources.set(relative,{descriptor:Object.freeze({...f}),fd:null,absolute:null,secureHandle:null,relative:null,contentTag:null,protectedPath:true,syntheticDecoy:false,syntheticDecoyContent:null});
        continue;
      }
      const absolute=path.join(root,relative),real=fs.realpathSync.native(absolute),rel=path.relative(root,real);
      if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||real!==absolute)throw Error('GATEWAY_RESOURCE_LINK_REJECTED');
      // Number cannot distinguish adjacent 64-bit file IDs above MAX_SAFE_INTEGER.
      const before=fs.lstatSync(absolute,{bigint:true});
      if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>65_536n)throw Error('GATEWAY_RESOURCE_TYPE_OR_SIZE');
      // A caller such as M3 may have bound this path to a file identity before
      // Gateway construction. Reject a replacement at this boundary before
      // opening or hashing the replacement bytes.
      if(expectedIdentity&&!sameFileAtOpen(expectedIdentity,before))throw Error('GATEWAY_RESOURCE_CHANGED');
      // This OS-relative open is authoritative for workspace containment. The
      // ordinary Node fd below is accepted only if fstat proves it is the same
      // file object as this no-follow handle; no bytes are read before that check.
      const secureHandle=secureWorkspace.openFile(relative);let secureRetained=false,fd:number|undefined;
      try{
        const securelyOpened=secureHandle.stat();
        if(securelyOpened.kind!=='file'||securelyOpened.nlink!==1n||securelyOpened.size>65_536n||!sameFileAtOpen(before,securelyOpened)||expectedIdentity&&!sameFileAtOpen(expectedIdentity,securelyOpened))throw Error('GATEWAY_RESOURCE_CHANGED');
        // O_NONBLOCK prevents a regular-file-to-FIFO swap between identity
        // verification and the Node fd open from hanging the constructor.
        const nonBlocking=process.platform==='win32'?0:fs.constants.O_NONBLOCK;
        if(!Number.isInteger(nonBlocking))throw Error('GATEWAY_NONBLOCK_OPEN_UNAVAILABLE');
        const openedFd=fs.openSync(absolute,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0)|nonBlocking);fd=openedFd;
        const after=fs.fstatSync(openedFd,{bigint:true});
        if(!after.isFile()||after.nlink!==1n||after.size>65_536n||!sameFileAtOpen(securelyOpened,after)||expectedIdentity&&!sameFileAtOpen(expectedIdentity,after))throw Error('GATEWAY_RESOURCE_CHANGED');
        // Re-resolve the pathname after open as well: its parent may have become
        // a symlink/junction after the initial canonicalization but before lstat.
        const bound=fs.lstatSync(absolute,{bigint:true});
        if(!bound.isFile()||bound.isSymbolicLink()||bound.nlink!==1n||!sameFileAtOpen(after,bound)||fs.realpathSync.native(absolute)!==absolute)throw Error('GATEWAY_RESOURCE_CHANGED');
        if(!workspaceStillBound())throw Error('GATEWAY_WORKSPACE_CHANGED');
        // Pin readable content without retaining plaintext. Explicitly sensitive paths
        // stay unread at registration; synthetic decoys are fingerprinted without firing their trap.
        const pinContent=!syntheticDecoyProof&&!protectedPath;
        let integrityTag:string|null=null;
        if(pinContent){
          const content=Buffer.alloc(Number(after.size));
          try{
            let offset=0;
            while(offset<content.length){const n=fs.readSync(openedFd,content,offset,content.length-offset,offset);if(!n)throw Error('GATEWAY_RESOURCE_CHANGED');offset+=n;}
            integrityTag=contentTag(content);
          }finally{content.fill(0);}
          const afterFingerprint=fs.fstatSync(openedFd,{bigint:true}),secureAfterFingerprint=secureHandle.stat(),boundAfterFingerprint=fs.lstatSync(absolute,{bigint:true});
          if(!sameFileAtOpen(after,afterFingerprint)||!sameFileAtOpen(after,secureAfterFingerprint)||!boundAfterFingerprint.isFile()||boundAfterFingerprint.isSymbolicLink()||boundAfterFingerprint.nlink!==1n||!sameFileAtOpen(afterFingerprint,boundAfterFingerprint)||fs.realpathSync.native(absolute)!==absolute)throw Error('GATEWAY_RESOURCE_CHANGED');
        }
        if(!workspaceStillBound())throw Error('GATEWAY_WORKSPACE_CHANGED');
        resources.set(relative,{descriptor:Object.freeze({...f}),fd:openedFd,secureHandle,relative,dev:after.dev,ino:after.ino,birthtimeNs:after.birthtimeNs,ctimeNs:after.ctimeNs,mtimeNs:after.mtimeNs,size:after.size,absolute,contentTag:integrityTag,protectedPath:false,syntheticDecoy:false,syntheticDecoyContent:null});
        secureRetained=true;fd=undefined;
      }finally{
        // Until registration succeeds, this scope owns both handles and closes them on failure.
        if(!secureRetained){if(fd!==undefined)try{fs.closeSync(fd);}catch{}secureHandle.close();}
      }
    }
    for(const [name,c]of Object.entries(options.commands??{})){
      if(!idPattern.test(name)||!path.isAbsolute(c.executable)||!Array.isArray(c.args)||c.args.length>32||c.args.some(a=>typeof a!=='string'||a.length>4096||a.includes('\0')))throw Error('GATEWAY_COMMAND_INVALID');
      commands.set(name,Object.freeze({...c,args:Object.freeze([...c.args])}));
    }
    for(const [name,t]of mcp)if(!idPattern.test(name)||typeof t.execute!=='function'||typeof t.approvalRequired!=='boolean'||t.risk!==undefined&&!['READ_ONLY','WRITE','EXECUTE','NETWORK','SENSITIVE_DATA','DESTRUCTIVE'].includes(t.risk))throw Error('GATEWAY_MCP_INVALID');
  }catch(error){for(const r of resources.values())if(r.fd!==null){try{fs.closeSync(r.fd);}catch{}try{r.secureHandle.close();}catch{}}try{secureWorkspace.close();}catch{}throw error;}
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
  function stillBound(r:Resource):boolean{
    try{
      if(!workspaceStillBound())return false;
      if(r.syntheticDecoy)return r.fd===null&&r.absolute===null&&r.secureHandle===null&&r.relative===null&&r.syntheticDecoyContent!==null;
      if(r.fd===null||r.absolute===null||r.secureHandle===null||r.relative===null)return false;
      const named=secureWorkspace.openFile(r.relative);
      try{
        const securelyNamed=named.stat(),heldSecure=r.secureHandle.stat(),heldNode=fs.fstatSync(r.fd,{bigint:true});
        return securelyNamed.kind==='file'&&securelyNamed.nlink===1n&&heldNode.isFile()&&heldNode.nlink===1n&&sameFileAtOpen(r,securelyNamed)&&sameFileAtOpen(r,heldSecure)&&sameFileAtOpen(r,heldNode);
      }finally{named.close();}
    }catch{return false;}
  }
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
    if(closed||!binding||!target||target.protectedPath||target.syntheticDecoy||target.descriptor.decoyId||!stillBound(target))throw Error('GATEWAY_FILE_CAPABILITY_UNAVAILABLE');
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
      if(target.protectedPath||target.syntheticDecoy||target.descriptor.decoyId||!stillBound(target))return undefined;
      return record;
    }catch{return undefined;}
  }
  function policy(r:Request):{decision:EvidenceDecision;reason:string}{
    const schemas:Record<string,string[]>={read_file:['path'],write_file:['path','content'],run_command:['command'],http_request:['url'],mcp_tool:['tool','arguments']};
    if(!schemas[r.name]||Object.keys(r.args).some(k=>!schemas[r.name].includes(k)))return{decision:'DENY',reason:'unregistered_tool_or_parameter'};
    if(r.name==='read_file'||r.name==='write_file'){
      const target=resource(r);
      if(!target)return{decision:'DENY',reason:'resource_not_bound'};
      if(target.protectedPath&&!target.syntheticDecoy)return{decision:'DENY',reason:'credential_resource_denied'};
      if(!stillBound(target))return{decision:'DENY',reason:'resource_not_bound'};
      if(r.name==='write_file'&&(!target.descriptor.writable||typeof r.args.content!=='string'||Buffer.byteLength(r.args.content)>65_536))return{decision:'DENY',reason:'write_capability_or_size_denied'};
      if(r.name==='write_file')return{decision:'DENY',reason:'write_capability_disabled_pending_path_safe_primitive'};
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
    let timer:ReturnType<typeof setTimeout>|undefined,abortListener:(()=>void)|undefined,decoyReadId:string|undefined;
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
        if(r.name==='read_file'){
          const f=resource(r);if(!f||!stillBound(f))throw Error('GATEWAY_RESOURCE_CHANGED_BEFORE_EFFECT');
        }
        if(r.name==='read_file'){
          const f=resource(r)!;let text='';
          if(f.syntheticDecoy){
            if(f.syntheticDecoyContent===null||Buffer.byteLength(f.syntheticDecoyContent)>65_536||!stillBound(f))throw Error('GATEWAY_RESOURCE_CHANGED_DURING_READ');
            // Synthetic decoys come from HoneypotRuntime's opaque in-memory capability;
            // the corresponding sensitive-looking pathname is never read for content.
            text=f.syntheticDecoyContent;
          }else{
            if(f.fd===null)throw Error('GATEWAY_RESOURCE_CHANGED_BEFORE_READ');
            const stat=fs.fstatSync(f.fd,{bigint:true});if(!stat.isFile()||stat.nlink!==1n||!sameFileAtOpen(f,stat))throw Error('GATEWAY_RESOURCE_CHANGED_BEFORE_READ');if(stat.size>65_536n)throw Error('GATEWAY_READ_LIMIT');
            const buffer=Buffer.alloc(Number(stat.size));let offset=0;
            try{
              while(offset<buffer.length){const n=fs.readSync(f.fd,buffer,offset,buffer.length-offset,offset);if(!n)break;offset+=n;}
              // Reads use only the already-held descriptor, so a path swap cannot redirect I/O.
              // Recheck the frozen file version as well; changed bytes are never returned.
              const afterRead=fs.fstatSync(f.fd,{bigint:true});
              if(!sameFileAtOpen(f,afterRead)||!stillBound(f))throw Error('GATEWAY_RESOURCE_CHANGED_DURING_READ');
              if(f.contentTag!==null&&!timingSafeEqual(Buffer.from(contentTag(buffer.subarray(0,offset)),'hex'),Buffer.from(f.contentTag,'hex')))throw Error('GATEWAY_RESOURCE_CONTENT_CHANGED');
              text=buffer.subarray(0,offset).toString('utf8');
            }finally{buffer.fill(0);}
          }
          if(secretPattern.test(text)||f.descriptor.decoyId){history.sensitiveObserved=true;flow.record('sensitive-source',text);if(text.length<=4096)provenance.register(f.descriptor.decoyId??'sensitive-file',text);}
          if(f.descriptor.decoyId)decoyReadId=f.descriptor.decoyId;
          return {content:text};
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
      // Trip after the synchronous read has settled so quarantine aborts sibling/queued
      // work without racing away the decoy read result itself.
      if(decoyReadId){options.guard.trip({reason:'honeypot_read',toolName:r.name});options.onDecoyRead?.(decoyReadId);}
      const output=typeof result==='string'?result:JSON.stringify(result)??'';
      if(secretPattern.test(output)){history.sensitiveObserved=true;flow.record('sensitive-source',output);if(output.length<=4096)provenance.register('tool-output',output);}
      audit(r,'ALLOW',decision.reason,'SUCCEEDED',r.name==='read_file'?'VERIFIED':'NOT_VERIFIED',approval);
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
          // Approval review can await an external provider. Revalidate file identity
          // after that wait so a replaced path cannot leave a stale approval pending.
          if(request.name==='read_file'||request.name==='write_file'){
            const target=resource(request);if(!target||!stillBound(target))return blocked(request,'resource_not_bound');
          }
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
      for(const f of resources.values())if(f.fd!==null&&f.fd>=0){
        const fd=f.fd;f.fd=-1;
        try{fs.closeSync(fd);}catch{failed=true;}
        try{f.secureHandle.close();}catch{failed=true;}
      }
      try{secureWorkspace.close();}catch{failed=true;}
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
    for(const f of resources.values())if(f.fd!==null&&f.fd>=0){try{fs.closeSync(f.fd);}catch{}try{f.secureHandle.close();}catch{}f.fd=-1;}
    try{secureWorkspace.close();}catch{}
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
