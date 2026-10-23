import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [modulePath,workspaceRoot,stateDirectory,logFile]=process.argv.slice(2);
const deny={hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'LAB_HOOK_ERROR_FAIL_CLOSED'}};
const HOOK_TIMEOUT_MS=2000;
const SAFE_REASON_SUFFIXES=new Set([
 'read_only','unregistered_tool','sensitive_data_read','outside_workspace','sensitive_path','workspace_write','destructive_write',
 'invalid_command','reviewed_read_command','sensitive_or_destructive_shell','unreviewed_shell','unapproved_network_target',
 'possible_sensitive_egress','approved_read_origin','network_write_or_unreviewed_origin','approval_capacity','host_approval_rejected',
 'execution_boundary_changed','callback_timeout','guard_quarantined','host_pre_execution_review_denied','canary_quarantine',
 'native_file_execution_not_pinned','path_execution_not_pinned',
 ...['unregistered_tool','sensitive_data_read','outside_workspace','sensitive_path','workspace_write','destructive_write','invalid_command','sensitive_or_destructive_shell','unreviewed_shell','unapproved_network_target','possible_sensitive_egress','network_write_or_unreviewed_origin'].map(reason=>'observe_only:'+reason),
]);
const FALLBACK_REASON_BY_DECISION=Object.freeze({allow:'Agent Canary: permission_allowed',deny:'Agent Canary: permission_denied',ask:'Agent Canary: approval_required'});
const safePermissionReason=(decision,reason)=>reason==='LAB_HOOK_ERROR_FAIL_CLOSED'||typeof reason==='string'&&reason.startsWith('Agent Canary: ')&&SAFE_REASON_SUFFIXES.has(reason.slice('Agent Canary: '.length))?reason:FALLBACK_REASON_BY_DECISION[decision];
let output=deny,timedOut=false;
const isHookDecision=value=>value&&typeof value==='object'&&value.hookSpecificOutput&&value.hookSpecificOutput.hookEventName==='PreToolUse'&&['allow','deny','ask'].includes(value.hookSpecificOutput.permissionDecision)&&typeof value.hookSpecificOutput.permissionDecisionReason==='string';
try {
 if(![modulePath,workspaceRoot,stateDirectory,logFile].every(x=>typeof x==='string'&&path.isAbsolute(x)))throw Error('TRUSTED_ARGUMENTS_REQUIRED');
 let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>32000)throw Error('INPUT_LIMIT');}
 const input=JSON.parse(raw);
 const {decideAgentHook}=await import(pathToFileURL(modulePath).href);
 let timeoutHandle;
 try {
  const timeout=new Promise(resolve=>{timeoutHandle=setTimeout(()=>{timedOut=true;resolve(deny);},HOOK_TIMEOUT_MS);});
  const result=await Promise.race([decideAgentHook('claude',workspaceRoot,stateDirectory,input),timeout]);
  if(timedOut){output=deny;}else if(!isHookDecision(result)){throw Error('HOOK_DECISION_INVALID');}else{
   const decision=result.hookSpecificOutput.permissionDecision;
   output={hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:decision,permissionDecisionReason:safePermissionReason(decision,result.hookSpecificOutput.permissionDecisionReason)}};
  }
 } finally {if(timeoutHandle)clearTimeout(timeoutHandle);}
 if(timedOut){fs.writeSync(1,JSON.stringify(deny)+String.fromCharCode(10));process.exit(0);}
 // Hook arguments and returned reasons can contain user data; persist only the fixed protocol decision.
 fs.appendFileSync(logFile,JSON.stringify({timestamp:new Date().toISOString(),hookEventName:'PreToolUse',permissionDecision:output.hookSpecificOutput.permissionDecision})+String.fromCharCode(10));
} catch { /* Any load, timeout, decision-shape, or evidence-write failure denies. */ output=deny; }
console.log(JSON.stringify(output));
