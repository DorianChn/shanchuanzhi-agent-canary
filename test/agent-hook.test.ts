import {spawnSync} from 'node:child_process';
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-hook-'));process.env.AGENT_CANARY_HOME=root;
const {decideAgentHook}=await import('../src/agent-hook.js');
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
test('native lab wrapper allows fixture read and rejects destructive command',()=>{
 const log=path.join(root,'wrapper.jsonl'),file=path.resolve('security-lab/claude-native-hook.mjs');
 fs.writeFileSync(path.join(root,'normal.txt'),'NORMAL_FIXTURE');
 for(const [tool,input,expected]of [['Read',{file_path:'normal.txt'},'allow'],['Bash',{command:'rm -- victim.txt'},'deny']] as const){
 const r=spawnSync(process.execPath,[file,path.resolve('dist/agent-hook.js'),root,path.join(root,'wrapper-state'),log],{input:JSON.stringify({session_id:'wrapper-test',tool_name:tool,tool_input:input}),encoding:'utf8',env:{...process.env,AGENT_CANARY_HOME:path.join(root,'wrapper-home')}});
 assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision,expected);
 }
 assert.equal(fs.readFileSync(log,'utf8').trim().split('\n').length,2);
});
