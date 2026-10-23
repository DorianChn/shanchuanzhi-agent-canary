import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [modulePath,workspaceRoot,stateDirectory,logFile]=process.argv.slice(2);
const deny={hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'LAB_HOOK_ERROR_FAIL_CLOSED'}};
const HOOK_TIMEOUT_MS=2000;
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
  if(timedOut){output=deny;}else if(!isHookDecision(result)){throw Error('HOOK_DECISION_INVALID');}else{output=result;}
 } finally {if(timeoutHandle)clearTimeout(timeoutHandle);}
 if(timedOut){fs.writeSync(1,JSON.stringify(deny)+String.fromCharCode(10));process.exit(0);}
 fs.appendFileSync(logFile,JSON.stringify({timestamp:new Date().toISOString(),tool:input.tool_name,input:input.tool_input,decision:output})+String.fromCharCode(10));
} catch { /* Any load, timeout, decision-shape, or evidence-write failure denies. */ output=deny; }
console.log(JSON.stringify(output));
