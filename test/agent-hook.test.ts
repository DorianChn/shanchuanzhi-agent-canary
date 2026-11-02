import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {decideAgentHook} from '../src/agent-hook.js';

type HookDecision={permission:'allow'|'deny'|'ask';reason:string};
function normalize(value:Awaited<ReturnType<typeof decideAgentHook>>):HookDecision{
  if('hookSpecificOutput'in value)return{permission:value.hookSpecificOutput.permissionDecision,reason:value.hookSpecificOutput.permissionDecisionReason};
  return{permission:value.permission,reason:value.user_message};
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-native-hook-'));
  const workspace=path.join(root,'workspace');fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace,'normal.txt'),'SYNTHETIC_NATIVE_FILE');
  return{root,workspace,state:(name:string)=>path.join(root,name)};
}

test('Claude and Cursor native hooks deny an in-workspace read without a held Gateway identity',async()=>{
  const f=fixture();
  try{
    const claude=normalize(await decideAgentHook('claude',f.workspace,f.state('claude-state'),{session_id:'native-read-claude',tool_name:'Read',tool_input:{file_path:'normal.txt'}}));
    const cursor=normalize(await decideAgentHook('cursor',f.workspace,f.state('cursor-state'),{conversation_id:'native-read-cursor',tool_name:'Read',tool_input:{file_path:'normal.txt'}}));
    assert.deepEqual(claude,{permission:'deny',reason:'Agent Canary: native_file_execution_not_pinned'});
    assert.deepEqual(cursor,{permission:'deny',reason:'Agent Canary: native_file_execution_not_pinned'});
    assert.equal(fs.readFileSync(path.join(f.workspace,'normal.txt'),'utf8'),'SYNTHETIC_NATIVE_FILE');
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('the packaged native Hook entry emits the held-identity denial for a safe file path',()=>{
  const f=fixture();
  try{
    const hook=path.resolve('competition-submission/lab/agent-hook.mjs');
    const result=spawnSync(process.execPath,[hook,'claude',f.workspace,f.state('packaged-state')],{input:JSON.stringify({session_id:'packaged-native-read',tool_name:'Read',tool_input:{file_path:'normal.txt'}}),encoding:'utf8',windowsHide:true});
    assert.equal(result.error,undefined);
    assert.equal(result.status,0,result.stderr);
    const output=JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.permissionDecision,'deny');
    assert.equal(output.hookSpecificOutput.permissionDecisionReason,'Agent Canary: native_file_execution_not_pinned');
    assert.equal(fs.readFileSync(path.join(f.workspace,'normal.txt'),'utf8'),'SYNTHETIC_NATIVE_FILE');
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('native write, edit, and delete decisions fail closed without a Gateway executor',async()=>{
  const f=fixture();
  try{
    for(const [client,tool] of [['claude','Write'],['claude','Edit'],['cursor','Delete']] as const){
      const input={session_id:`${client}-${tool}`,conversation_id:`${client}-${tool}`,tool_name:tool,tool_input:{file_path:'normal.txt',content:'MUST_NOT_BE_WRITTEN'}};
      const result=normalize(await decideAgentHook(client,f.workspace,f.state(`${client}-${tool}-state`),input));
      assert.equal(result.permission,'deny',`${client} ${tool} must not authorize native file I/O`);
    }
    assert.equal(fs.readFileSync(path.join(f.workspace,'normal.txt'),'utf8'),'SYNTHETIC_NATIVE_FILE');
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('the native file fail-closed rule does not change a non-file command decision',async()=>{
  const f=fixture();
  try{
    const result=normalize(await decideAgentHook('claude',f.workspace,f.state('shell-state'),{session_id:'safe-shell',tool_name:'Bash',tool_input:{command:'git status --short'}}));
    assert.deepEqual(result,{permission:'allow',reason:'Agent Canary: reviewed_read_command'});
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
