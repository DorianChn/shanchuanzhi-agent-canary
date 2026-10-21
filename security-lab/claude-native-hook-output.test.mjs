import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const wrapperPath=fileURLToPath(new URL('./claude-native-hook.mjs',import.meta.url));
const safeReasonByDecision={allow:'Agent Canary: permission_allowed',deny:'Agent Canary: permission_denied',ask:'Agent Canary: approval_required'};

for(const decision of ['allow','deny','ask']){
 test(`native Hook output is fixed-shape and excludes caller data for ${decision}`,t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-m8-hook-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const modulePath=path.join(root,'fixture.mjs');
  const stateDirectory=path.join(root,'state');
  const logFile=path.join(root,'events.jsonl');
  const sentinel=`M8_HOOK_OUTPUT_${randomUUID()}`;
  const input={
   session_id:'m8-fixture-session',
   tool_name:'Bash',
   command:`caller command ${sentinel}`,
   path:`/caller/path/${sentinel}`,
   tool_input:{
    command:`echo ${sentinel}`,
    path:`/workspace/${sentinel}`,
    file_path:`C:\\workspace\\${sentinel}.txt`,
   },
  };
  assert.ok(input.tool_input.command.includes(sentinel));
  assert.ok(input.tool_input.path.includes(sentinel));
  assert.ok(input.tool_input.file_path.includes(sentinel));
  fs.writeFileSync(modulePath,`export async function decideAgentHook(_client,_workspaceRoot,_stateDirectory,input){
 const caller=input.tool_input.command;
 return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:${JSON.stringify(decision)},permissionDecisionReason:'Agent Canary: '+caller,callerData:input.tool_input.path},debug:input.path};
}\n`);

  const run=spawnSync(process.execPath,[wrapperPath,modulePath,root,stateDirectory,logFile],{
   input:JSON.stringify(input),encoding:'utf8',timeout:5000,windowsHide:true,
  });
  assert.equal(run.error,undefined);
  assert.equal(run.status,0,run.stderr);
  assert.equal(run.signal,null);
  assert.equal(run.stdout.trim().split(/\r?\n/).length,1);
  assert.ok(!run.stdout.includes(sentinel));
  assert.ok(!run.stderr.includes(sentinel));

  const hookOutput=JSON.parse(run.stdout.trim());
  assert.deepEqual(Object.keys(hookOutput).sort(),['hookSpecificOutput']);
  assert.deepEqual(Object.keys(hookOutput.hookSpecificOutput).sort(),[
   'hookEventName','permissionDecision','permissionDecisionReason',
  ]);
  assert.equal(hookOutput.hookSpecificOutput.hookEventName,'PreToolUse');
  assert.equal(hookOutput.hookSpecificOutput.permissionDecision,decision);
  assert.equal(hookOutput.hookSpecificOutput.permissionDecisionReason,safeReasonByDecision[decision]);

  const lines=fs.readFileSync(logFile,'utf8').trim().split(/\r?\n/);
  assert.equal(lines.length,1);
  const event=JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(event).sort(),['hookEventName','permissionDecision','timestamp']);
  assert.equal(event.hookEventName,'PreToolUse');
  assert.equal(event.permissionDecision,decision);
  assert.equal(new Date(event.timestamp).toISOString(),event.timestamp);
  assert.ok(!lines[0].includes(sentinel));
 });
}
