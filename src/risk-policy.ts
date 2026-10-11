/** Optional host-owned policy boundary. No model output grants execution rights. */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { logEvent } from './alerts.js';
import { createGuardedToolRouter, isDecoy, type RealToolExecutor } from './sdk.js';
import { CanaryBlockedError, type AgentGuard, type ToolCall } from './containment.js';

export type ProtectionMode = 'OBSERVE' | 'BALANCED' | 'STRICT';
export type ToolRisk = 'READ_ONLY' | 'WRITE' | 'EXECUTE' | 'NETWORK' | 'SENSITIVE_DATA' | 'DESTRUCTIVE';
export type ToolOperation = 'file-read' | 'file-write' | 'shell' | 'http' | 'delete' | 'sensitive-read' | 'static-read';
export interface RiskToolDescriptor { operation: ToolOperation; pathArg?: string; commandArg?: string; urlArg?: string; bodyArg?: string }
export interface RiskPolicyOptions {
  mode?: ProtectionMode;
  workspaceRoot: string;
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

export function createRiskPolicyRouter<T>(options: RiskPolicyOptions & { guard: AgentGuard; executeRealTool: RealToolExecutor<T> }) {
  const guard=options.guard;
  const mode=options.mode??'BALANCED';
  if(!['OBSERVE','BALANCED','STRICT'].includes(mode))throw new Error('POLICY_MODE_INVALID');
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
  const riskState=riskStates.get(guard)??{sensitiveRead:false,tail:Promise.resolve(),queued:0};riskStates.set(guard,riskState);
  const pending=new Map<string,{call:ToolCall;decision:PolicyDecision;expires:number}>();
  const serialize=<R>(operation:()=>Promise<R>):Promise<R>=>{if(riskState.queued>=100)return Promise.reject(new Error('POLICY_QUEUE_LIMIT'));riskState.queued++;const result=riskState.tail.then(operation).finally(()=>{riskState.queued--;});riskState.tail=result.catch(()=>{});return result;};
  const router=createGuardedToolRouter({guard,executeRealTool:options.executeRealTool});
  function audit(kind:'policy_allowed'|'policy_blocked'|'policy_approval_required'|'policy_approval_granted',call:ToolCall,d:PolicyDecision){
    // No raw args, secret values, paths or approval authority in logs.
    logEvent({ts:new Date().toISOString(),kind,sessionId:guard.sessionId,toolName:call.name,reason:d.reason,metadata:{mode,action:d.action,risks:d.risks.join(',')}},options.eventsFile);
  }
  function sweep(){for(const [id,p]of pending)if(p.expires<Date.now())pending.delete(id);}
  function classify(call:ToolCall):PolicyDecision {
    const a=call.args??{},d=tools.get(call.name),risks:ToolRisk[]=[];
    let reason='read_only',action:PolicyDecision['action']='ALLOW';
    const requireApproval=(r:string)=>{reason=r;action=mode==='STRICT'?'DENY':'APPROVAL_REQUIRED';};
    const deny=(r:string)=>{reason=r;action='DENY';};
    if(!d){risks.push('EXECUTE');requireApproval('unregistered_tool');}
    else if(d.operation==='static-read')risks.push('READ_ONLY');
    else if(d.operation==='sensitive-read'){risks.push('SENSITIVE_DATA');requireApproval('sensitive_data_read');}
    else if(['file-read','file-write','delete'].includes(d.operation)){
      const raw=a[d.pathArg??'path'];
      const normalized=typeof raw==='string'?raw.replaceAll('\\','/'):'\0';
      const target=path.resolve(root,normalized),relative=path.relative(root,target);
      const outside=relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||normalized.includes('\0')||/^[a-z]:|^\/\//i.test(normalized);
      risks.push(d.operation==='file-read'?'READ_ONLY':d.operation==='delete'?'DESTRUCTIVE':'WRITE');
      if(outside)deny('outside_workspace');
      else if(SENSITIVE_PATH.test(target.replaceAll('\\','/'))){risks.push('SENSITIVE_DATA');requireApproval('sensitive_path');}
      else if(d.operation!=='file-read')requireApproval(d.operation==='delete'?'destructive_write':'workspace_write');
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
    // OBSERVE overrides only the optional policy. Guard containment is ALWAYS enforced.
    if(mode==='OBSERVE'&&action!=='ALLOW')return {action:'ALLOW',risks,reason:'observe_only:'+reason,mode};
    return {action,risks,reason,mode};
  }
  async function execute(call:ToolCall,decision:PolicyDecision){
    // A failed sensitive callback may have read data before throwing. Retain taint.
    if(decision.risks.includes('SENSITIVE_DATA'))riskState.sensitiveRead=true;
    const result=await router.dispatch(call); // final Guard check directly before callback
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
      const decision=classify(safe);sweep();
      if(options.reviewDecision && await options.reviewDecision(safe,Object.freeze({...decision,risks:Object.freeze([...decision.risks]) as unknown as ToolRisk[]}))==='DENY'){
        decision.action='DENY';decision.reason='host_pre_execution_review_denied';
      }
      if(decision.action==='APPROVAL_REQUIRED'){
        if(pending.size>=limit)throw new PolicyBlockedError({...decision,action:'DENY',reason:'approval_capacity'});
        const requestId=randomUUID();decision.requestId=requestId;
        pending.set(requestId,{call:safe,decision:Object.freeze({...decision,risks:Object.freeze([...decision.risks]) as unknown as ToolRisk[]}),expires:Date.now()+ttl});
        audit('policy_approval_required',safe,decision);throw new PolicyBlockedError(decision);
      }
      audit(decision.action==='DENY'?'policy_blocked':'policy_allowed',safe,decision);
      if(decision.action==='DENY')throw new PolicyBlockedError(decision);
      return execute(safe,decision);
    });},
    /** HOST ONLY. Never expose this method as an Agent/MCP tool. No args token can call it. */
    approve(requestId:string,acknowledgedBy:string){return serialize(async()=>{
      if(!acknowledgedBy?.trim()||acknowledgedBy.length>100)throw new Error('POLICY_OPERATOR_REQUIRED');
      sweep();const p=pending.get(requestId);if(!p)throw new Error('POLICY_APPROVAL_MISSING_OR_EXPIRED');
      pending.delete(requestId); // consumed before any asynchronous callback
      const gd=guard.beforeToolCall(p.call);if(!gd.allowed)throw new CanaryBlockedError(gd);
      // Reassess cross-tool taint after waiting; a previously safe network request may now be denied.
      const fresh=classify(p.call);if(fresh.action==='DENY'){audit('policy_blocked',p.call,fresh);throw new PolicyBlockedError(fresh);}
      audit('policy_approval_granted',p.call,p.decision);
      return execute(p.call,p.decision);
    });},
    pendingApprovals(){sweep();return [...pending].map(([requestId,p])=>({requestId,tool:p.call.name,risks:[...p.decision.risks],reason:p.decision.reason,expiresAt:p.expires}));},
    inspectPolicy(call:ToolCall){return classify(snapshot(call));},
    denyApproval(requestId:string){const p=pending.get(requestId);if(!p)throw new Error('POLICY_APPROVAL_MISSING_OR_EXPIRED');pending.delete(requestId);audit('policy_blocked',p.call,{...p.decision,action:'DENY',reason:'host_approval_rejected'});},
  };
}
