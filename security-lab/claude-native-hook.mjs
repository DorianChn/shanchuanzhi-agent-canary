import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [modulePath,workspaceRoot,stateDirectory,logFile]=process.argv.slice(2);
const deny={hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'LAB_HOOK_ERROR_FAIL_CLOSED'}};
let output=deny;
try {
 if(![modulePath,workspaceRoot,stateDirectory,logFile].every(x=>typeof x==='string'&&path.isAbsolute(x)))throw Error('TRUSTED_ARGUMENTS_REQUIRED');
 let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>32000)throw Error('INPUT_LIMIT');}
 const input=JSON.parse(raw);
 const {decideAgentHook}=await import(pathToFileURL(modulePath).href);
 output=await decideAgentHook('claude',workspaceRoot,stateDirectory,input);
 fs.appendFileSync(logFile,JSON.stringify({timestamp:new Date().toISOString(),tool:input.tool_name,input:input.tool_input,decision:output})+String.fromCharCode(10));
} catch { /* Do not emit raw inputs or error contents to the model. */ }
console.log(JSON.stringify(output));
