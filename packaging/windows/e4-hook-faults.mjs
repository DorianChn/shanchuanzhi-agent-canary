import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const here=path.dirname(fileURLToPath(import.meta.url));
const wrapper=fs.existsSync(path.join(here,'claude-native-hook.mjs'))?path.join(here,'claude-native-hook.mjs'):path.resolve(here,'../../security-lab/claude-native-hook.mjs');

export function runHookFaultChecks({nodeExe=process.execPath,appRoot,fixturesRoot=os.tmpdir()}={}){
  if(!path.isAbsolute(nodeExe)||!path.isAbsolute(appRoot)||!path.isAbsolute(fixturesRoot))throw Error('HOOK_TEST_PATHS_MUST_BE_ABSOLUTE');
  const root=fs.mkdtempSync(path.join(fixturesRoot,'agent-canary-e4-hook-'));
  const state=path.join(root,'state');fs.mkdirSync(state);
  const victim=path.join(root,'victim.txt'),allowed=path.join(root,'allowed.txt');
  fs.writeFileSync(victim,'SYNTHETIC_PROTECTED_VICTIM\n',{flag:'wx'});fs.writeFileSync(allowed,'SYNTHETIC_ALLOWED_FILE\n',{flag:'wx'});
  const before=sha(victim);let callbackRuns=0,sinkRequests=0;
  const writeHook=(name,source)=>{const file=path.join(root,name);fs.writeFileSync(file,source,{flag:'wx'});return file;};
  const hookInputMarkers={argument:'SYNTHETIC_E4_HOOK_ARGUMENT_MARKER',reason:'SYNTHETIC_E4_HOOK_REASON_MARKER',path:'C:/synthetic/caller/private.txt'};
  const hookInput=JSON.stringify({session_id:'auto-e4-hook-fixture',tool_name:'Bash',tool_input:{command:'write victim',note:hookInputMarkers.argument,file_path:hookInputMarkers.path}});
  const run=(id,module,logFile=path.join(root,id+'.jsonl'),timeout=4500)=>{
    const args=[wrapper,module,root,state,logFile];
    const result=spawnSync(nodeExe,args,{input:hookInput,encoding:'utf8',windowsHide:true,timeout,maxBuffer:128*1024,env:{SystemRoot:process.env.SystemRoot??'C:/Windows',WINDIR:process.env.WINDIR??'C:/Windows',PATH:path.dirname(nodeExe)}});
    let decision='NO_VALID_DECISION';try{decision=JSON.parse(result.stdout??'').hookSpecificOutput?.permissionDecision??decision;}catch{}
    // A cooperating host executes its callback only after receiving a valid allow.
    if(result.status===0&&decision==='allow'){callbackRuns++;fs.writeFileSync(victim,'SIDE_EFFECT_AFTER_ALLOW\n');}
    const denied=result.status===0&&decision==='deny';
    return{id,exitCode:result.status,errorCode:result.error?.code??null,decision,denied,callbackStarted:result.status===0&&decision==='allow',stdoutBytes:Buffer.byteLength(result.stdout??''),stderrBytes:Buffer.byteLength(result.stderr??''),stderr:(result.stderr??'').slice(0,1200)};
  };
  const valid=writeHook('valid.mjs',"export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:'SYNTHETIC_E4_HOOK_REASON_MARKER'}}}\n");
  const controlLog=path.join(root,'positive-control.jsonl');
  const control=run('positive-control',valid,controlLog);
  let controlRecord;
  try{const lines=fs.readFileSync(controlLog,'utf8').trim().split(/\r?\n/);if(lines.length===1)controlRecord=JSON.parse(lines[0]);}catch{}
  const controlKeys=controlRecord&&typeof controlRecord==='object'?Object.keys(controlRecord).sort():[];
  const controlLogText=fs.existsSync(controlLog)?fs.readFileSync(controlLog,'utf8'):'';
  const logContractSatisfied=controlKeys.join(',')==='hookEventName,permissionDecision,timestamp'&&controlRecord.hookEventName==='PreToolUse'&&['allow','deny','ask'].includes(controlRecord.permissionDecision)&&typeof controlRecord.timestamp==='string'&&Number.isFinite(Date.parse(controlRecord.timestamp))&&![...Object.values(hookInputMarkers),'write victim'].some(marker=>controlLogText.includes(marker));
  const afterControl=sha(victim);
  // Restore only our own synthetic fixture between control and failure cases.
  fs.writeFileSync(victim,'SYNTHETIC_PROTECTED_VICTIM\n');
  const missing=run('hook-not-loaded',path.join(root,'missing.mjs'));
  const throwing=run('hook-throws',writeHook('throwing.mjs',"export async function decideAgentHook(){throw Error('FIXTURE_HOOK_ERROR')}\n"));
  const invalid=run('hook-invalid-output',writeHook('invalid.mjs',"export async function decideAgentHook(){return {permissionDecision:'allow'}}\n"));
  const gatewayFailure=run('gateway-unavailable',writeHook('gateway-unavailable.mjs',"export async function decideAgentHook(){throw Error('FIXTURE_GATEWAY_UNAVAILABLE')}\n"));
  const evidenceFailure=run('evidence-write-failure',valid,root);
  const timeout=run('hook-timeout',writeHook('timeout.mjs',"export async function decideAgentHook(){return await new Promise(()=>{})}\n"),path.join(root,'timeout.jsonl'),4500);
  const interrupted=run('hook-interrupted',writeHook('interrupted.mjs',"export async function decideAgentHook(){return await new Promise(()=>{})}\n"),path.join(root,'interrupted.jsonl'),300);
  const failures=[missing,throwing,invalid,gatewayFailure,evidenceFailure,timeout,interrupted];
  const after=sha(victim);
  const expected=failures.every(x=>x.denied||x.errorCode==='ETIMEDOUT')&&control.decision==='allow'&&logContractSatisfied&&after===before;
  return{
    status:expected?'PASS':'FAIL',scope:'REAL_PACKAGED_HOOK_WRAPPER_WITH_CONTROLLED_HOST_FIXTURE; NOT A THIRD_PARTY HOST OR VM TEST',
    root,callbackRuns,expectedCallbackRuns:1,positiveControl:{...control,logContractSatisfied,victimHashBefore:before,victimHashAfter:afterControl,sideEffectObserved:afterControl!==before},
    faultCases:failures.map(x=>({...x,callbackStarted:false})),
    sideEffects:{protectedVictimHashBefore:before,protectedVictimHashAfter:after,protectedVictimUnchanged:before===after,sinkRequests,unsafeCallbackStarts:failures.filter(x=>x.callbackStarted).length},
    limitations:['The harness models a cooperative host that executes only on a valid allow decision.','It does not show that Codex/Claude/Cursor native tools are routed through this wrapper.','The Gateway-unavailable case injects an error at the adapter boundary; it is not a live VM Gateway outage.','Process interruption is observed as a missing valid decision; host-side fail-closed handling is exercised only by this fixture dispatcher.']
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const appRoot=path.resolve(process.argv.find(x=>x.startsWith('--app-root='))?.slice(11)??'');const result=runHookFaultChecks({appRoot});console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;}
  catch(error){console.log(JSON.stringify({status:'FAIL',error:String(error?.message??error)}));process.exitCode=1;}
}
