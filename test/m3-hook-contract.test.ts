import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-m3-hook-contract-'));
const {decideAgentHook,createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder}=await import('../src/sdk.js');

test('M3 matching contract denies Claude native Read without an M1 held-file capability',async()=>{
 const workspace=path.join(root,'workspace');
 fs.mkdirSync(workspace);
 const file=path.join(workspace,'normal.txt');
 fs.writeFileSync(file,'M3_SYNTHETIC_UNPINNED_READ_FIXTURE');

 const result:any=await decideAgentHook('claude',workspace,path.join(root,'hook-state'),{
  session_id:'m3-contract-unpinned-read',
  tool_name:'Read',
  tool_input:{file_path:'normal.txt'}
 });

 assert.equal(result.hookSpecificOutput.permissionDecision,'deny');
 assert.equal(result.hookSpecificOutput.permissionDecisionReason,'Agent Canary: native_file_execution_not_pinned');
 assert.equal(fs.readFileSync(file,'utf8'),'M3_SYNTHETIC_UNPINNED_READ_FIXTURE');
});

test('M1 held-file Gateway capability remains a separate supported ALLOW path',async()=>{
 const workspace=path.join(root,'held-file-workspace');
 fs.mkdirSync(workspace);
 const file=path.join(workspace,'held.txt');
 fs.writeFileSync(file,'M3_SYNTHETIC_HELD_FILE_FIXTURE');
 const evidence=new EvidenceRecorder();
 const runtime=createTrustedExecutionGateway({
  agentId:'m3-hook-contract-positive',
  guard:createAgentGuard({alert:false}),
  workspaceRoot:workspace,
  files:[{path:'held.txt'}],
  evidence
 });

 try{
  assert.deepEqual(await runtime.agent.dispatch({name:'read_file',args:{path:'held.txt'}}),{
   content:'M3_SYNTHETIC_HELD_FILE_FIXTURE'
  });
  assert.equal(evidence.snapshot().at(-1)?.decision,'ALLOW');
 }finally{
  await runtime.close();
 }
});
