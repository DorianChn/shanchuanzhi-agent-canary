/** Optional host-owned policy boundary. No model output grants execution rights. */
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { logEvent } from './alerts.js';
import { createGuardedToolRouter, isDecoy } from './sdk.js';
import { CanaryBlockedError, type AgentGuard, type ToolCall } from './containment.js';

export type ProtectionMode = 'OBSERVE' | 'BALANCED' | 'STRICT';
export type ToolRisk = 'READ_ONLY' | 'WRITE' | 'EXECUTE' | 'NETWORK' | 'SENSITIVE_DATA' | 'DESTRUCTIVE';
export type ToolOperation = 'file-read' | 'file-write' | 'shell' | 'http' | 'delete' | 'sensitive-read' | 'static-read';
export interface RiskToolDescriptor { operation: ToolOperation; pathArg?: string; commandArg?: string; urlArg?: string; bodyArg?: string }
/** Host-only resolver for an M1-issued capability bound to one registered read. */
export interface TrustedFileReadCapabilityProvider {
  resolve(call: Readonly<ToolCall>): unknown;
  verify(capability: unknown, call: Readonly<ToolCall>, operation: 'file-read'): boolean;
  /** Strict reads use this provider directly; never delegate the held-file read to a path callback. */
  readFileWithCapability(capability: unknown, call: Readonly<ToolCall>, signal?: AbortSignal): Promise<unknown>;
}
/** The host-only portion of M1's Gateway used to issue and revalidate held-file capabilities. */
export interface GatewayFileReadCapabilityAPI<TCapability extends object = object> {
  bindFileReadCapability(binding: Readonly<GatewayFileReadCapabilityBinding & { operation: 'file-read' }>): TCapability;
  verifyFileReadCapability(capability: TCapability, call: Readonly<ToolCall>, operation: 'file-read'): boolean;
  readFileWithCapability(capability: TCapability, call: Readonly<ToolCall>, operation: 'file-read', signal?: AbortSignal): Promise<unknown>;
}
/** One constructor-fixed M5 tool to M1 registered-file binding. */
export interface GatewayFileReadCapabilityBinding {
  readonly toolName: string;
  readonly path: string;
  readonly pathArg?: string;
}
/** M5 policy provider plus the matching M1 held-handle read operation. */
export interface GatewayFileReadCapabilityProvider extends TrustedFileReadCapabilityProvider {
  readFileWithCapability(capability: unknown, call: Readonly<ToolCall>, signal?: AbortSignal): Promise<unknown>;
}
/** Internal strict-read context; it is never forwarded to the generic executor. */
export interface RiskPolicyExecutionContext { readonly fileReadCapability?: unknown }
export type PolicyRealToolExecutor<T> = (call: ToolCall, context?: Readonly<RiskPolicyExecutionContext>) => T | Promise<T>;

/**
 * Adapt M1's opaque held-file API to M5's policy provider. Bindings are trusted
 * host configuration: model calls can select neither a capability nor a path
 * beyond the exact registered tool/path pair.
 */
export function createGatewayFileReadCapabilityProvider<TCapability extends object>(
  gateway: GatewayFileReadCapabilityAPI<TCapability>,
  fixedBindings: readonly GatewayFileReadCapabilityBinding[],
): GatewayFileReadCapabilityProvider {
  if (!gateway || typeof gateway.bindFileReadCapability !== 'function' || typeof gateway.verifyFileReadCapability !== 'function' ||
      typeof gateway.readFileWithCapability !== 'function') {
    throw new Error('POLICY_GATEWAY_FILE_READ_API_INVALID');
  }
  if (!Array.isArray(fixedBindings) || fixedBindings.length < 1 || fixedBindings.length > 256) {
    throw new Error('POLICY_FILE_READ_BINDINGS_INVALID');
  }

  const prepared = fixedBindings.map((binding) => {
    if (!binding || typeof binding !== 'object' || Array.isArray(binding)) throw new Error('POLICY_FILE_READ_BINDING_INVALID');
    const { toolName, path: relativePath, pathArg = 'path' } = binding;
    if (typeof toolName !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(toolName) ||
        typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\') || relativePath.includes('\0') ||
        relativePath.includes(':') || relativePath.startsWith('/') || relativePath.split('/').some((part) => part === '' || part === '.' || part === '..') ||
        typeof pathArg !== 'string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(pathArg)) {
      throw new Error('POLICY_FILE_READ_BINDING_INVALID');
    }
    return { toolName: toolName.toLowerCase(), path: relativePath, pathArg };
  });
  const names = new Set<string>();
  for (const binding of prepared) {
    if (names.has(binding.toolName)) throw new Error('POLICY_DUPLICATE_FILE_READ_BINDING');
    names.add(binding.toolName);
  }

  const bindings = new Map<string, { path: string; pathArg: string; capability: TCapability }>();
  for (const binding of prepared) {
    const capability = gateway.bindFileReadCapability(Object.freeze({ ...binding, operation: 'file-read' as const }));
    if (!capability || typeof capability !== 'object') throw new Error('POLICY_GATEWAY_FILE_CAPABILITY_INVALID');
    bindings.set(binding.toolName, { path: binding.path, pathArg: binding.pathArg, capability });
  }

  function exactBinding(call: Readonly<ToolCall>) {
    try {
      if (!call || typeof call !== 'object') return undefined;
      const callDescriptors = Object.getOwnPropertyDescriptors(call);
      const name = callDescriptors.name;
      const argsDescriptor = callDescriptors.args;
      if (!name || name.get || name.set || !('value' in name) || typeof name.value !== 'string' ||
          !argsDescriptor || argsDescriptor.get || argsDescriptor.set || !('value' in argsDescriptor)) return undefined;
      const binding = bindings.get(name.value.toLowerCase());
      const args = argsDescriptor.value;
      if (!binding || !args || typeof args !== 'object' || Array.isArray(args)) return undefined;
      const argDescriptors = Object.getOwnPropertyDescriptors(args);
      const argKeys = Object.keys(argDescriptors);
      if (argKeys.length !== 1 || argKeys[0] !== binding.pathArg) return undefined;
      const arg = argDescriptors[binding.pathArg];
      if (!arg || arg.get || arg.set || !('value' in arg) || arg.value !== binding.path) return undefined;
      return binding;
    } catch {
      return undefined;
    }
  }

  return Object.freeze({
    resolve(call: Readonly<ToolCall>): unknown {
      return exactBinding(call)?.capability;
    },
    verify(capability: unknown, call: Readonly<ToolCall>, operation: 'file-read'): boolean {
      const binding = exactBinding(call);
      if (!binding || operation !== 'file-read' || capability !== binding.capability) return false;
      try { return gateway.verifyFileReadCapability(binding.capability, call, operation) === true; }
      catch { return false; }
    },
    async readFileWithCapability(capability: unknown, call: Readonly<ToolCall>, signal?: AbortSignal): Promise<unknown> {
      const binding = exactBinding(call);
      if (!binding || capability !== binding.capability) throw new Error('POLICY_FILE_READ_CAPABILITY_INVALID');
      let verified = false;
      try { verified = gateway.verifyFileReadCapability(binding.capability, call, 'file-read') === true; } catch {}
      if (!verified) throw new Error('POLICY_FILE_READ_CAPABILITY_INVALID');
      return gateway.readFileWithCapability(binding.capability, call, 'file-read', signal);
    },
  });
}

export interface RiskPolicyOptions {
  mode?: ProtectionMode;
  workspaceRoot: string;
  /** Opt in to M1-pinned reads and fail-closed writes/deletes. OBSERVE always rejects canonical aliases/escapes, even when omitted or false. */
  verifyRealPaths?: boolean;
  /** Trusted host lookup, M1 verification, and held-file read for a constructor-registered safe file. Path strings alone never satisfy verifyRealPaths. */
  fileReadCapability?: TrustedFileReadCapabilityProvider;
  /** Trusted host registration; never accept these descriptors from model arguments. */
  tools: Record<string, RiskToolDescriptor>;
  /** Exact host-reviewed HTTPS origins for read-only GET requests. No wildcard. */
  allowedReadOrigins?: string[];
  eventsFile?: string;
  approvalTtlMs?: number;
  maxPending?: number;
  /** Trusted host extension; may only tighten decisions, never grant privileges. */
  reviewDecision?: (call: ToolCall, decision: Readonly<PolicyDecision>) => Promise<'DENY' | 'UNCHANGED'>;
}
export interface PolicyDecision { action: 'ALLOW' | 'DENY' | 'APPROVAL_REQUIRED'; risks: ToolRisk[]; reason: string; mode: ProtectionMode; requestId?: string }
export class PolicyBlockedError extends Error {
  readonly decision: PolicyDecision;
  constructor(decision: PolicyDecision) { super('POLICY_' + decision.action + ': ' + decision.reason); this.name='PolicyBlockedError'; this.decision=Object.freeze({...decision,risks:Object.freeze([...decision.risks]) as unknown as ToolRisk[]}); }
}

const READ_COMMANDS = new Set(['pwd', 'git status', 'git status --short', 'git diff', 'git diff --stat', 'ls', 'ls -la']);
const SENSITIVE_PATH = /(^|\/)(\.env(?:\.[^/]*)?|id_rsa|id_ed25519|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?)(\/|$)/i;
const SECRET_CONTENT = /cnry_[A-Za-z0-9_-]+|NOT_A_REAL_CREDENTIAL|sk-[A-Za-z0-9_-]{16,}|-----BEGIN .*PRIVATE KEY|(?:api[_-]?key|password|secret|authorization)\s*[:=]\s*\S+/i;
// Mode/router replacement must not erase sensitive history for the same Guard.
const riskStates=new WeakMap<AgentGuard,{sensitiveRead:boolean;tail:Promise<unknown>;queued:number}>();

function canonicalPath(candidate:string):string {
  let cursor=path.resolve(candidate);const missing:string[]=[];
  while(true){
    try{
      const resolved=fs.realpathSync(cursor);
      return missing.reverse().reduce((base,part)=>path.join(base,part),resolved);
    }catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      if(code!=='ENOENT'&&code!=='ENOTDIR')throw error;
      const parent=path.dirname(cursor);if(parent===cursor)return path.resolve(candidate);
      missing.push(path.basename(cursor));cursor=parent;
    }
  }
}

function hasPathAlias(root:string,target:string,rawPath?:string):boolean {
  try {
    let component=path.resolve(root);
    if(fs.lstatSync(component).isSymbolicLink())return true;
    const relative=path.relative(root,target);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return true;
    // Do not derive the walk only from `target`: path.resolve has already
    // collapsed `alias/..`, hiding a symlink/junction that the caller supplied.
    // Preserve those components so OBSERVE and verifyRealPaths reject the alias
    // before a host callback can interpret the original path differently.
    let walkPath=relative;
    if(typeof rawPath==='string'){
      const supplied=rawPath.replaceAll('\\','/');
      if(!path.isAbsolute(supplied)&&!/^[a-z]:|^\/\//i.test(supplied))walkPath=supplied;
      else {
        const rootPrefix=path.resolve(root).replaceAll('\\','/').replace(/\/+$/,'')+'/';
        const foldedRoot=process.platform==='win32'?rootPrefix.toLowerCase():rootPrefix;
        const foldedSupplied=process.platform==='win32'?supplied.toLowerCase():supplied;
        if(foldedSupplied.startsWith(foldedRoot))walkPath=supplied.slice(rootPrefix.length);
      }
    }
    for(const part of walkPath.split(/[\\/]+/).filter(Boolean)){
      if(part==='.')continue;
      if(part==='..'){component=path.dirname(component);continue;}
      component=path.join(component,part);
      try{
        const stat=fs.lstatSync(component);
        if(stat.isSymbolicLink()||stat.isFile()&&stat.nlink>1)return true;
      }catch(error){const code=(error as NodeJS.ErrnoException).code;if(code!=='ENOENT'&&code!=='ENOTDIR')return true;}
    }
    return false;
  }catch{return true;}
}

function snapshot(call: ToolCall): ToolCall {
  // Accept JSON data only. Reject getters, custom toJSON, cycles, excessive depth/size.
  let nodes=0;
  function copy(v: unknown, depth=0): unknown {
    if (++nodes>4096 || depth>12) throw new Error('POLICY_INPUT_LIMIT');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'&&Number.isFinite(v))return v;
    if(typeof v!=='object'||v===null)throw new Error('POLICY_JSON_REQUIRED');
    if(Object.getPrototypeOf(v)!==Object.prototype&&!Array.isArray(v))throw new Error('POLICY_PLAIN_DATA_REQUIRED');
    const result: any=Array.isArray(v)?[]:Object.create(null);
    for(const [key,d] of Object.entries(Object.getOwnPropertyDescriptors(v))){
      if(Array.isArray(v)&&key==='length')continue;
      if(d.get||d.set||!('value'in d))throw new Error('POLICY_ACCESSOR_REJECTED');
      result[key]=copy(d.value,depth+1);
    }
    return Object.freeze(result);
  }
  if(!call||typeof call.name!=='string'||!/^[a-zA-Z0-9_.-]{1,100}$/.test(call.name))throw new Error('POLICY_TOOL_NAME_INVALID');
  const args=copy(call.args??{}) as Record<string,unknown>;
  if(Array.isArray(args)||Buffer.byteLength(JSON.stringify(args))>24_000)throw new Error('POLICY_INPUT_LIMIT');
  return Object.freeze({name:call.name.toLowerCase(),args});
}

export function createRiskPolicyRouter<T>(options: RiskPolicyOptions & { guard: AgentGuard; executeRealTool: PolicyRealToolExecutor<T> }) {
  const guard=options.guard;
  const mode=options.mode??'BALANCED';
  if(!['OBSERVE','BALANCED','STRICT'].includes(mode))throw new Error('POLICY_MODE_INVALID');
  // OBSERVE must not turn a lexically in-workspace symlink/junction into a read.
  // Keep the legacy lexical option for other modes, but never let it downgrade
  // OBSERVE's sensitive-path and workspace-boundary checks.
  const checkRealPaths=options.verifyRealPaths===true||mode==='OBSERVE';
  if(!options.workspaceRoot||!path.isAbsolute(options.workspaceRoot))throw new Error('POLICY_ROOT_INVALID');
  const root=path.resolve(options.workspaceRoot);
  const tools=new Map<string,RiskToolDescriptor>();
  for(const [name,descriptor] of Object.entries(options.tools)) {
    if(!/^[a-zA-Z0-9_.-]{1,100}$/.test(name)||!['file-read','file-write','shell','http','delete','sensitive-read','static-read'].includes(descriptor.operation))throw new Error('POLICY_DESCRIPTOR_INVALID');
    const normalized=name.toLowerCase();if(tools.has(normalized))throw new Error('POLICY_DUPLICATE_TOOL');
    tools.set(normalized,Object.freeze({...descriptor}));
  }
  const origins=new Set((options.allowedReadOrigins??[]).map(s=>{const u=new URL(s);if(u.protocol!=='https:'||u.origin!==s)throw new Error('POLICY_ORIGIN_INVALID');return s;}));
  const ttl=options.approvalTtlMs??60_000,limit=options.maxPending??100;
  if(!Number.isInteger(ttl)||ttl<1||ttl>300_000||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('POLICY_APPROVAL_LIMIT_INVALID');
  if(options.fileReadCapability&&(
    typeof options.fileReadCapability.resolve!=='function'||
    typeof options.fileReadCapability.verify!=='function'
  ))throw new Error('POLICY_FILE_READ_CAPABILITY_PROVIDER_INVALID');
  const riskState=riskStates.get(guard)??{sensitiveRead:false,tail:Promise.resolve(),queued:0};riskStates.set(guard,riskState);
  const pending=new Map<string,{call:ToolCall;decision:PolicyDecision;expires:number;executionContext?:RiskPolicyExecutionContext}>();
  const serialize=<R>(operation:()=>Promise<R>):Promise<R>=>{if(riskState.queued>=100)return Promise.reject(new Error('POLICY_QUEUE_LIMIT'));riskState.queued++;const result=riskState.tail.then(operation).finally(()=>{riskState.queued--;});riskState.tail=result.catch(()=>{});return result;};
  const callbackContexts=new WeakMap<object,RiskPolicyExecutionContext>();
  const router=createGuardedToolRouter({guard,executeRealTool:async(call)=>{
    const executionContext=callbackContexts.get(call);
    if(isStrictFileRead(call)&&!hasValidFileReadCapability(call,executionContext)){
      const decision:PolicyDecision={action:'DENY',risks:['READ_ONLY'],reason:'path_execution_not_pinned',mode};
      await recordRecheckedDenial(call,decision);audit('policy_blocked',call,decision);throw new PolicyBlockedError(decision);
    }
    if(isStrictFileRead(call)){
      const provider=options.fileReadCapability;
      const capability=executionContext?.fileReadCapability;
      // The held-file provider is the executor for strict reads. A generic
      // callback can reinterpret the path and ignore a capability, so it must
      // never receive a strict read after the policy checks pass.
      if(!provider||typeof provider.readFileWithCapability!=='function'||capability===undefined||capability===null){
        const decision:PolicyDecision={action:'DENY',risks:['READ_ONLY'],reason:'path_execution_not_pinned',mode};
        await recordRecheckedDenial(call,decision);audit('policy_blocked',call,decision);throw new PolicyBlockedError(decision);
      }
      return await provider.readFileWithCapability(capability,call);
    }
    return executionContext?options.executeRealTool(call,executionContext):options.executeRealTool(call);
  }});
  function audit(kind:'policy_allowed'|'policy_blocked'|'policy_approval_required'|'policy_approval_granted',call:ToolCall,d:PolicyDecision){
    // No raw args, secret values, paths or approval authority in logs.
    logEvent({ts:new Date().toISOString(),kind,sessionId:guard.sessionId,toolName:call.name,reason:d.reason,metadata:{mode,action:d.action,risks:d.risks.join(',')}},options.eventsFile);
  }
  async function recordRecheckedDenial(call:ToolCall,decision:PolicyDecision){
    // Managed routers use this callback to add the final recheck result to the
    // structured evidence chain. Its return value cannot override this DENY.
    if(options.reviewDecision)await options.reviewDecision(call,Object.freeze({...decision,risks:Object.freeze([...decision.risks]) as unknown as ToolRisk[]}));
  }
  function sweep(){for(const [id,p]of pending)if(p.expires<Date.now())pending.delete(id);}
  function isStrictFileRead(call:ToolCall):boolean{return options.verifyRealPaths===true&&tools.get(call.name)?.operation==='file-read';}
  function resolveExecutionContext(call:ToolCall):RiskPolicyExecutionContext|undefined {
    if(!isStrictFileRead(call)||!options.fileReadCapability)return undefined;
    try{
      const capability=options.fileReadCapability.resolve(call);
      return capability===undefined||capability===null?undefined:Object.freeze({fileReadCapability:capability});
    }catch{return undefined;}
  }
  function hasValidFileReadCapability(call:ToolCall,context:RiskPolicyExecutionContext|undefined):boolean {
    const capability=context?.fileReadCapability;
    if(!isStrictFileRead(call)||capability===undefined||capability===null||!options.fileReadCapability||typeof options.fileReadCapability.readFileWithCapability!=='function')return false;
    try{return options.fileReadCapability.verify(capability,call,'file-read')===true;}catch{return false;}
  }
  function classify(call:ToolCall,executionContext?:RiskPolicyExecutionContext):PolicyDecision {
    const a=call.args??{},d=tools.get(call.name),risks:ToolRisk[]=[];
    const unknownTool=!d;
    let reason='read_only',action:PolicyDecision['action']='ALLOW';
    let nonOverridableDeny=false;
    const requireApproval=(r:string)=>{reason=r;action=mode==='STRICT'?'DENY':'APPROVAL_REQUIRED';};
    const deny=(r:string)=>{reason=r;action='DENY';nonOverridableDeny=true;};
    // An unregistered callback has no trusted capability description. It is
    // UNKNOWN and stays blocked even in OBSERVE; only a registered, understood
    // operation can use the mode's explicit observation override.
    if(!d){risks.push('EXECUTE');deny('unregistered_tool');}
    else if(d.operation==='static-read')risks.push('READ_ONLY');
    else if(d.operation==='sensitive-read'){risks.push('SENSITIVE_DATA');requireApproval('sensitive_data_read');}
    else if(['file-read','file-write','delete'].includes(d.operation)){
      const raw=a[d.pathArg??'path'];
      const normalized=typeof raw==='string'?raw.replaceAll('\\','/'):'\0';
      const filesystemOperation=['file-read','file-write','delete'].includes(d.operation);
      const target=path.resolve(root,normalized);let policyTarget=target,policyRoot=root,pathAlias=false;
      if(filesystemOperation&&checkRealPaths)try{policyTarget=canonicalPath(target);policyRoot=fs.realpathSync(root);pathAlias=hasPathAlias(root,target,normalized);}catch{deny('path_resolution_failed');}
      const relative=path.relative(root,target),policyRelative=path.relative(policyRoot,policyTarget);
      const outside=relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||policyRelative==='..'||policyRelative.startsWith('..'+path.sep)||path.isAbsolute(policyRelative)||normalized.includes('\0')||/^[a-z]:|^\/\//i.test(normalized);
      risks.push(d.operation==='file-read'?'READ_ONLY':d.operation==='delete'?'DESTRUCTIVE':'WRITE');
      const sensitivePath=SENSITIVE_PATH.test(policyTarget.replaceAll('\\','/'));
      if(sensitivePath)risks.push('SENSITIVE_DATA');
      if(!nonOverridableDeny){
        if(outside)deny('outside_workspace');
        else if(mode==='OBSERVE'&&sensitivePath)deny('observe_sensitive_data_blocked');
        else if(pathAlias)deny('path_alias_rejected');
        else if(filesystemOperation&&options.verifyRealPaths&&(
          d.operation!=='file-read'||!hasValidFileReadCapability(call,executionContext)
        ))deny('path_execution_not_pinned');
        else if(sensitivePath)requireApproval('sensitive_path');
        else if(d.operation!=='file-read')requireApproval(d.operation==='delete'?'destructive_write':'workspace_write');
      }
    }else if(d.operation==='shell'){
      risks.push('EXECUTE');const command=a[d.commandArg??'command'];
      if(typeof command!=='string'||command.length>4096)deny('invalid_command');
      else if(READ_COMMANDS.has(command.trim())){risks.push('READ_ONLY');reason='reviewed_read_command';}
      else if(/(?:\.env\b|credentials|id_rsa|\bcurl\b|\bwget\b|\brm\b|remove-item|invoke-expression|\biex\b)/i.test(command))deny('sensitive_or_destructive_shell');
      else requireApproval('unreviewed_shell');
    }else if(d.operation==='http'){
      risks.push('NETWORK');const body=a[d.bodyArg??'body'];
      let u:URL|undefined;try{u=new URL(String(a[d.urlArg??'url']??''));}catch{}
      if(!u||u.protocol!=='https:'||u.username||u.password||u.hash||u.search)deny('unapproved_network_target');
      else if(SECRET_CONTENT.test(JSON.stringify(body??''))||riskState.sensitiveRead){risks.push('SENSITIVE_DATA');deny('possible_sensitive_egress');}
      else if(String(a.method??'POST').toUpperCase()==='GET'&&body===undefined&&origins.has(u.origin)){reason='approved_read_origin';risks.push('READ_ONLY');}
      else requireApproval('network_write_or_unreviewed_origin');
    }
    // OBSERVE may waive approval policy for understood, non-sensitive work;
    // it must not expose sensitive data or override an explicit safety denial.
    if(mode==='OBSERVE'&&risks.includes('SENSITIVE_DATA')&&!nonOverridableDeny){
      return {action:'DENY',risks,reason:'observe_sensitive_data_blocked',mode};
    }
    if(mode==='OBSERVE'&&action!=='ALLOW'&&!nonOverridableDeny&&!unknownTool)return {action:'ALLOW',risks,reason:'observe_only:'+reason,mode};
    return {action,risks,reason,mode};
  }
  async function execute(call:ToolCall,decision:PolicyDecision,executionContext?:RiskPolicyExecutionContext){
    if(checkRealPaths){
      const current=classify(call,executionContext);
      if(current.action!==decision.action||current.reason!==decision.reason||current.risks.length!==decision.risks.length||current.risks.some((risk,index)=>risk!==decision.risks[index])){
        const changed={...current,action:'DENY' as const,reason:current.action==='DENY'&&current.reason==='path_execution_not_pinned'?'path_execution_not_pinned':'execution_boundary_changed'};await recordRecheckedDenial(call,changed);audit('policy_blocked',call,changed);throw new PolicyBlockedError(changed);
      }
    }
    // A failed sensitive callback may have read data before throwing. Retain taint.
    if(decision.risks.includes('SENSITIVE_DATA'))riskState.sensitiveRead=true;
    if(executionContext)callbackContexts.set(call,executionContext);
    let result:T|Awaited<ReturnType<typeof router.dispatch>>;
    try{result=await router.dispatch(call);}finally{callbackContexts.delete(call);} // final capability and Guard checks directly before callback
    if(decision.risks.includes('SENSITIVE_DATA')||SECRET_CONTENT.test(typeof result==='string'?result:JSON.stringify(result)??''))riskState.sensitiveRead=true;
    guard.inspect(typeof result==='string'?result:JSON.stringify(result)??'', 'policy-tool-output');
    return result;
  }
  return {
    mode,guard,
    dispatch(call:ToolCall){
      const safe=snapshot(call);
      // A slow existing callback must never delay a newly received canary signal.
      if(isDecoy(safe.name))return router.dispatch(safe);
      return serialize(async()=>{
      guard.inspect(JSON.stringify(safe.args),'policy-tool-arguments');
      const gd=guard.beforeToolCall(safe);if(!gd.allowed)throw new CanaryBlockedError(gd);
      const executionContext=resolveExecutionContext(safe);
      const decision=classify(safe,executionContext);sweep();
      if(decision.action!=='DENY'&&options.reviewDecision && await options.reviewDecision(safe,Object.freeze({...decision,risks:Object.freeze([...decision.risks]) as unknown as ToolRisk[]}))==='DENY'){
        decision.action='DENY';decision.reason='host_pre_execution_review_denied';
      }
      // Recheck before creating any approval request or starting an execution.
      if(decision.action!=='DENY'&&isStrictFileRead(safe)&&!hasValidFileReadCapability(safe,executionContext)){
        decision.action='DENY';decision.reason='path_execution_not_pinned';
      }
      if(decision.action==='APPROVAL_REQUIRED'){
        if(pending.size>=limit)throw new PolicyBlockedError({...decision,action:'DENY',reason:'approval_capacity'});
        const requestId=randomUUID();decision.requestId=requestId;
        pending.set(requestId,{call:safe,decision:Object.freeze({...decision,risks:Object.freeze([...decision.risks]) as unknown as ToolRisk[]}),expires:Date.now()+ttl,executionContext});
        audit('policy_approval_required',safe,decision);throw new PolicyBlockedError(decision);
      }
      audit(decision.action==='DENY'?'policy_blocked':'policy_allowed',safe,decision);
      if(decision.action==='DENY')throw new PolicyBlockedError(decision);
      return execute(safe,decision,executionContext);
    });},
    /** HOST ONLY. Never expose this method as an Agent/MCP tool. No args token can call it. */
    approve(requestId:string,acknowledgedBy:string){return serialize(async()=>{
      if(!acknowledgedBy?.trim()||acknowledgedBy.length>100)throw new Error('POLICY_OPERATOR_REQUIRED');
      sweep();const p=pending.get(requestId);if(!p)throw new Error('POLICY_APPROVAL_MISSING_OR_EXPIRED');
      pending.delete(requestId); // consumed before any asynchronous callback
      const gd=guard.beforeToolCall(p.call);if(!gd.allowed)throw new CanaryBlockedError(gd);
      // Reassess cross-tool taint after waiting; a previously safe network request may now be denied.
      const fresh=classify(p.call,p.executionContext);if(fresh.action==='DENY'){await recordRecheckedDenial(p.call,fresh);audit('policy_blocked',p.call,fresh);throw new PolicyBlockedError(fresh);}
      audit('policy_approval_granted',p.call,p.decision);
      return execute(p.call,p.decision,p.executionContext);
    });},
    pendingApprovals(){sweep();return [...pending].map(([requestId,p])=>({requestId,tool:p.call.name,risks:[...p.decision.risks],reason:p.decision.reason,expiresAt:p.expires}));},
    inspectPolicy(call:ToolCall){const safe=snapshot(call);return classify(safe,resolveExecutionContext(safe));},
    denyApproval(requestId:string){const p=pending.get(requestId);if(!p)throw new Error('POLICY_APPROVAL_MISSING_OR_EXPIRED');pending.delete(requestId);audit('policy_blocked',p.call,{...p.decision,action:'DENY',reason:'host_approval_rejected'});},
  };
}
