import {spawn,spawnSync} from 'node:child_process';
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-hook-'));process.env.AGENT_CANARY_HOME=root;
const {decideAgentHook}=await import('../src/agent-hook.js');
const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder}=await import('../src/sdk.js');
test('Claude and Cursor official hook shapes allow reviewed command and ask unreviewed build',async()=>{const state=path.join(root,'state');const c:any=await decideAgentHook('claude',root,state,{session_id:'fixture1',tool_name:'Bash',tool_input:{command:'git status --short'}});assert.equal(c.hookSpecificOutput.permissionDecision,'allow');const x:any=await decideAgentHook('cursor',root,state,{conversation_id:'fixture1',command:'npm run build'});assert.equal(x.permission,'ask');});
test('hook canary quarantine persists across process-style Guard instances',async()=>{const state=path.join(root,'state2');const input={session_id:'fixture2',tool_name:'mcp__canary__canary_read_secrets',tool_input:{}};const c:any=await decideAgentHook('claude',root,state,input);assert.equal(c.hookSpecificOutput.permissionDecision,'deny');const x:any=await decideAgentHook('claude',root,state,{...input,tool_name:'Bash',tool_input:{command:'git status'}});assert.equal(x.hookSpecificOutput.permissionDecision,'deny');});
test('hook path boundary and model approvals cannot authorize dangerous calls',async()=>{const state=path.join(root,'state3');const c:any=await decideAgentHook('cursor',root,state,{conversation_id:'fixture3',tool_name:'Read',tool_input:{file_path:path.join(root,'..','outside.txt'),approved:true}});assert.equal(c.permission,'deny');await assert.rejects(decideAgentHook('claude',root,state,{tool_name:'Bash',tool_input:{command:'git status'}}),/SESSION_REQUIRED/);});
test('full persistent hook state fails closed for new identities without growing files',async()=>{const state=path.join(root,'full-state');fs.mkdirSync(state);for(let i=0;i<1024;i++)fs.writeFileSync(path.join(state,i+'.quarantine'),'QUARANTINED\n');const c:any=await decideAgentHook('claude',root,state,{session_id:'quota-fixture',tool_name:'Bash',tool_input:{command:'git status'}});assert.equal(c.hookSpecificOutput.permissionDecision,'deny');assert.equal(fs.readdirSync(state).length,1024);});
test('quarantine writer contention leaves persistent fail-closed marker rather than losing signal',async()=>{const state=path.join(root,'busy-state');fs.mkdirSync(state);fs.writeFileSync(path.join(state,'.write-lock'),'fixture lock');const input={session_id:'busy-fixture',tool_name:'canary_read_secrets',tool_input:{}};await decideAgentHook('claude',root,state,input);assert.equal(fs.existsSync(path.join(state,'.fail-closed')),true);fs.unlinkSync(path.join(state,'.write-lock'));const c:any=await decideAgentHook('claude',root,state,{...input,tool_name:'Bash',tool_input:{command:'git status'}});assert.equal(c.hookSpecificOutput.permissionDecision,'deny');});
test('new native session cannot bypass workspace-bound quarantine',async()=>{const state=path.join(root,'cross-session-state');await decideAgentHook('claude',root,state,{session_id:'old-chat',tool_name:'canary_read_secrets',tool_input:{}});const c:any=await decideAgentHook('claude',root,state,{session_id:'new-chat',tool_name:'Bash',tool_input:{command:'git status'}});assert.equal(c.hookSpecificOutput.permissionDecision,'deny');});

// Actual hook wrapper subprocess, with fixture-only inputs and isolated storage.
test('native lab wrapper syntax and malformed input fail closed',()=>{
 const file=path.resolve('security-lab/claude-native-hook.mjs');
 assert.equal(spawnSync(process.execPath,['--check',file]).status,0);
 const r=spawnSync(process.execPath,[file],{input:'{invalid',encoding:'utf8'});
 assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision,'deny');
});
test('native unpinned file reads deny with the M1 reason for both supported hook protocols',async()=>{
 fs.writeFileSync(path.join(root,'normal.txt'),'NORMAL_FIXTURE');
 const claude:any=await decideAgentHook('claude',root,path.join(root,'unpinned-claude-state'),{session_id:'unpinned-claude',tool_name:'Read',tool_input:{file_path:'normal.txt'}});
 assert.equal(claude.hookSpecificOutput.permissionDecision,'deny');
 assert.equal(claude.hookSpecificOutput.permissionDecisionReason,'Agent Canary: native_file_execution_not_pinned');
 const cursor:any=await decideAgentHook('cursor',root,path.join(root,'unpinned-cursor-state'),{conversation_id:'unpinned-cursor',tool_name:'Read',tool_input:{file_path:'normal.txt'}});
 assert.equal(cursor.permission,'deny');
 assert.equal(cursor.user_message,'Agent Canary: native_file_execution_not_pinned');
});
test('supported held-file Gateway capability still allows a registered read',async()=>{
 const workspace=fs.mkdtempSync(path.join(root,'held-file-positive-')),file=path.join(workspace,'normal.txt');
 fs.writeFileSync(file,'SUPPORTED_HELD_FILE_FIXTURE');
 const evidence=new EvidenceRecorder(),runtime=createTrustedExecutionGateway({agentId:'m3-hook-positive',guard:createAgentGuard({alert:false}),workspaceRoot:workspace,files:[{path:'normal.txt'}],evidence});
 try{
  assert.deepEqual(await runtime.agent.dispatch({name:'read_file',args:{path:'normal.txt'}}),{content:'SUPPORTED_HELD_FILE_FIXTURE'});
  assert.equal(evidence.snapshot().at(-1)?.decision,'ALLOW');
 }finally{await runtime.close();}
});
test('native lab wrapper writes only normalized allowlisted log fields',()=>{
 const log=path.join(root,'normalized-wrapper.jsonl'),file=path.resolve('security-lab/claude-native-hook.mjs');
 const modulePath=path.join(root,'normalized-hook-module.mjs');
 const callerCanaries=['SYNTHETIC_NATIVE_HOOK_ARGUMENT_CANARY','C:/synthetic/caller/private.txt'];
 const reasonCanary='SYNTHETIC_NATIVE_HOOK_REASON_CANARY';
 fs.writeFileSync(modulePath,`export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:${JSON.stringify(reasonCanary)}}}}\n`);
 const r=spawnSync(process.execPath,[file,modulePath,root,path.join(root,'normalized-state'),log],{input:JSON.stringify({session_id:'normalized-log-fixture',tool_name:'Bash',tool_input:{note:callerCanaries[0],file_path:callerCanaries[1]}}),encoding:'utf8'});
 assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision,'allow');
 const lines=fs.readFileSync(log,'utf8').trim().split(/\r?\n/);
 assert.equal(lines.length,1);
 const record=JSON.parse(lines[0]);
 assert.deepEqual(Object.keys(record).sort(),['hookEventName','permissionDecision','timestamp']);
 assert.equal(record.hookEventName,'PreToolUse');assert.equal(record.permissionDecision,'allow');
 assert.equal(new Date(record.timestamp).toISOString(),record.timestamp,'timestamp must use canonical ISO format');
 for(const marker of [...callerCanaries,reasonCanary])assert.equal(lines[0].includes(marker),false,`native decision log leaked ${marker}`);
});
test('native lab wrapper denies unpinned fixture file operations and rejects destructive command',()=>{
 const log=path.join(root,'wrapper.jsonl'),file=path.resolve('security-lab/claude-native-hook.mjs');
 fs.writeFileSync(path.join(root,'normal.txt'),'NORMAL_FIXTURE');
 for(const [tool,input]of [['Read',{file_path:'normal.txt',note:'NOT_A_REAL_CREDENTIAL_HOOK_LOG_FIXTURE'}],['Write',{file_path:'normal.txt',content:'WRITE_BODY_LOG_SENTINEL'}],['Delete',{file_path:'normal.txt'}],['Bash',{command:'rm -- victim.txt'}]] as const){
 const r=spawnSync(process.execPath,[file,path.resolve('dist/agent-hook.js'),root,path.join(root,'wrapper-state'),log],{input:JSON.stringify({session_id:'wrapper-test',tool_name:tool,tool_input:input}),encoding:'utf8',env:{...process.env,AGENT_CANARY_HOME:path.join(root,'wrapper-home')}});
  assert.equal(r.status,0);const decision=JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(decision.permissionDecision,'deny');
  if(tool!=='Bash')assert.equal(decision.permissionDecisionReason,'Agent Canary: native_file_execution_not_pinned');
 }
 const records=fs.readFileSync(log,'utf8');assert.equal(records.trim().split('\n').length,4);assert.ok(!records.includes('NOT_A_REAL_CREDENTIAL_HOOK_LOG_FIXTURE'));assert.ok(!records.includes('WRITE_BODY_LOG_SENTINEL'));
 assert.equal(fs.readFileSync(path.join(root,'normal.txt'),'utf8'),'NORMAL_FIXTURE');
});

test('native lab wrapper persists only allowlisted metadata',()=>{
 const wrapper=path.resolve('security-lab/claude-native-hook.mjs');
 const modulePath=path.join(root,'canary-hook-module.mjs'),log=path.join(root,'canary.jsonl');
 const callerCanary='M2_CALLER_CANARY',toolCanary='M2_TOOL_CANARY',argumentCanary='M2_ARGUMENT_CANARY',pathCanary='M2_PATH_CANARY',reasonCanary='M2_REASON_CANARY';
 const decision={hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:reasonCanary}};
 fs.writeFileSync(modulePath,'export async function decideAgentHook(){return '+JSON.stringify(decision)+'}\n');
 const input={session_id:callerCanary,tool_name:toolCanary,tool_input:{command:argumentCanary,file_path:path.join(root,pathCanary)}};
 const result=spawnSync(process.execPath,[wrapper,modulePath,root,path.join(root,'canary-state'),log],{input:JSON.stringify(input),encoding:'utf8'});
 assert.equal(result.status,0);
 assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision,'allow');
 const logText=fs.readFileSync(log,'utf8').trim();
 for(const canary of [callerCanary,toolCanary,argumentCanary,pathCanary,reasonCanary])assert.equal(logText.includes(canary),false,canary+' was persisted');
 const records=logText.split('\n');
 assert.equal(records.length,1);
 const record=JSON.parse(records[0]) as Record<string,unknown>;
 assert.deepEqual(Object.keys(record).sort(),['hookEventName','permissionDecision','timestamp']);
 assert.equal(record.hookEventName,'PreToolUse');
 assert.ok(['allow','deny','ask'].includes(String(record.permissionDecision)));
 assert.equal(typeof record.timestamp,'string');
 const timestamp=new Date(record.timestamp as string);
 assert.equal(Number.isNaN(timestamp.valueOf()),false);
 assert.equal(timestamp.toISOString(),record.timestamp);
});
test('native lab wrapper fails closed on hook load, callback, evidence-write, and timeout failures',()=>{
 const wrapper=path.resolve('security-lab/claude-native-hook.mjs');
 const input=JSON.stringify({session_id:'failure-fixture',tool_name:'Bash',tool_input:{command:'git status'}});
 const run=(modulePath:string,logFile:string)=>spawnSync(process.execPath,[wrapper,modulePath,root,path.join(root,'failure-state'),logFile],{input,encoding:'utf8',timeout:5000});
 const missing=run(path.join(root,'missing-hook-module.mjs'),path.join(root,'missing.jsonl'));
 assert.equal(missing.status,0);assert.equal(JSON.parse(missing.stdout).hookSpecificOutput.permissionDecision,'deny');
 const throwing=path.join(root,'throwing-hook-module.mjs');fs.writeFileSync(throwing,"export async function decideAgentHook(){throw new Error('fixture failure')}\n");
 const failed=run(throwing,path.join(root,'throwing.jsonl'));
 assert.equal(failed.status,0);assert.equal(JSON.parse(failed.stdout).hookSpecificOutput.permissionDecision,'deny');
 const invalid=path.join(root,'invalid-hook-module.mjs');fs.writeFileSync(invalid,"export async function decideAgentHook(){return {permissionDecision:'allow'}}\n");
 const invalidResult=run(invalid,path.join(root,'invalid.jsonl'));
 assert.equal(invalidResult.status,0);assert.equal(JSON.parse(invalidResult.stdout).hookSpecificOutput.permissionDecision,'deny');
 const valid=path.join(root,'valid-hook-module.mjs');fs.writeFileSync(valid,"export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:'fixture'}}}\n");
 const logFailure=run(valid,root);
 assert.equal(logFailure.status,0);assert.equal(JSON.parse(logFailure.stdout).hookSpecificOutput.permissionDecision,'deny');
 const timeoutModule=path.join(root,'timeout-hook-module.mjs');fs.writeFileSync(timeoutModule,"export async function decideAgentHook(){return await new Promise(()=>{})}\n");
 const started=Date.now(),timed=run(timeoutModule,path.join(root,'timeout.jsonl'));
 assert.equal(timed.status,0);assert.equal(JSON.parse(timed.stdout).hookSpecificOutput.permissionDecision,'deny');
 assert.ok(Date.now()-started>=1900&&Date.now()-started<5000,'timeout returns a denial within the bounded hook budget');
});

test('native lab wrapper interruption emits no decision or output',async(t)=>{
 // The native host dispatches tool callbacks outside this subprocess; this fixture cannot count that callback.
 const marker=path.join(root,'interrupted-hook-entered'),wrapper=path.resolve('security-lab/claude-native-hook.mjs'),modulePath=path.join(root,'interrupted-hook-module.mjs'),log=path.join(root,'interrupted.jsonl');
 // Hold this synthetic child after entry so the wrapper's own 2s timeout cannot win if the parent is briefly descheduled.
 const moduleSource="import fs from 'node:fs';export async function decideAgentHook(){fs.writeFileSync("+JSON.stringify(marker)+",'entered');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000);return await new Promise(()=>{})}\n";
 fs.writeFileSync(modulePath,moduleSource);
 const child=spawn(process.execPath,[wrapper,modulePath,root,path.join(root,'interrupted-state'),log],{stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='',spawnError:Error|undefined,closed:{code:number|null;signal:NodeJS.Signals|null}|undefined;
 child.stdout.setEncoding('utf8').on('data',(chunk:string)=>stdout+=chunk);
 child.stderr.setEncoding('utf8').on('data',(chunk:string)=>stderr+=chunk);
 child.stdin.on('error',()=>{});
 const exited=new Promise<{code:number|null;signal:NodeJS.Signals|null}>(resolve=>child.once('close',(code,signal)=>{closed={code,signal};resolve(closed);}));
 child.once('error',error=>{spawnError=error;});
 child.stdin.end(JSON.stringify({session_id:'interrupt-fixture',tool_name:'Bash',tool_input:{command:'touch never-run'}}));
 const diagnostic=()=>JSON.stringify({pid:child.pid??null,spawnError:spawnError?.message??null,exit:closed??null,stdout,stderr,marker:fs.existsSync(marker)});
 const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
 try{
  const deadline=Date.now()+10_000;
  while(!fs.existsSync(marker)&&!spawnError&&!closed&&Date.now()<deadline)await pause(10);
  assert.equal(fs.existsSync(marker),true,'hook child did not reach the synthetic entry marker: '+diagnostic());
  await pause(2_500); // Reproduce parent scheduling delay beyond the wrapper's 2s internal timeout.
  assert.equal(closed,undefined,'hook child completed before external interruption: '+diagnostic());
  assert.equal(child.kill(),true,'hook child could not be interrupted: '+diagnostic());
  const result=await Promise.race([exited,pause(5_000).then(()=>null)]);
  assert.ok(result,'interrupted hook child did not close: '+diagnostic());
  assert.equal(spawnError,undefined,'hook child failed to spawn: '+diagnostic());
  assert.ok(result.signal!==null||(result.code!==null&&result.code!==0),'hook child did not terminate from interruption: '+diagnostic());
  assert.equal(stdout,'','interrupted hook emitted a permission decision or output: '+diagnostic());
  assert.equal(stderr,'','interrupted hook wrote unexpected stderr: '+diagnostic());
  assert.ok(!fs.existsSync(log),'interrupted hook wrote a decision record: '+diagnostic());
  t.diagnostic('interruption diagnostics: '+diagnostic());
 }finally{
  if(!closed)child.kill();
  await Promise.race([exited,pause(1_000)]);
 }
});
