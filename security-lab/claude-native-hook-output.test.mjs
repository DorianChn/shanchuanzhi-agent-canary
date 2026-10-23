import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import test from 'node:test';

const wrapperPath=fileURLToPath(new URL('./claude-native-hook.mjs',import.meta.url));
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
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
    content:`file contents ${sentinel}`,
   },
  };
  assert.ok(input.tool_input.command.includes(sentinel));
  assert.ok(input.tool_input.path.includes(sentinel));
  assert.ok(input.tool_input.file_path.includes(sentinel));
  assert.ok(input.tool_input.content.includes(sentinel));
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

test('co-located E4 payload wrapper logs only allowlisted metadata',async t=>{
 const payload=fs.mkdtempSync(path.join(os.tmpdir(),'canary-e4-packaged-hook-'));
 t.after(()=>fs.rmSync(payload,{recursive:true,force:true}));
 const sourceHook=path.join(repo,'security-lab/claude-native-hook.mjs');
 const sourceFaults=path.join(repo,'packaging/windows/e4-hook-faults.mjs');
 const packagedHook=path.join(payload,'claude-native-hook.mjs');
 const packagedFaults=path.join(payload,'e4-hook-faults.mjs');
 fs.copyFileSync(sourceHook,packagedHook);
 fs.copyFileSync(sourceFaults,packagedFaults);
 assert.deepEqual(fs.readFileSync(packagedHook),fs.readFileSync(sourceHook));
 assert.equal(fs.existsSync(path.resolve(payload,'../../security-lab/claude-native-hook.mjs')),false,'fixture must not have the repository-source fallback');
 const {runHookFaultChecks:runPackagedHookFaultChecks}=await import(pathToFileURL(packagedFaults).href);
 const result=runPackagedHookFaultChecks({appRoot:path.join(repo,'dist'),fixturesRoot:payload});
 assert.equal(result.status,'PASS');
 assert.equal(result.positiveControl.logContractSatisfied,true);
 assert.equal(result.positiveControl.logAudit.status,'PASS');
 assert.equal(result.positiveControl.logAudit.records,1);
 assert.equal(result.logAudit.status,'PASS');
 assert.equal(result.logAudit.records,1);
 assert.equal(result.logAudit.callerInputCanaryAbsent,true);
 assert.ok(result.faultCases.every(x=>x.logAudit.status==='PASS'));
 const controlLines=fs.readFileSync(path.join(result.root,'positive-control.jsonl'),'utf8').trim().split(/\r?\n/);
 assert.equal(controlLines.length,1);
 const controlRecord=JSON.parse(controlLines[0]);
 assert.deepEqual(Object.keys(controlRecord).sort(),['hookEventName','permissionDecision','timestamp']);
 assert.equal(controlRecord.hookEventName,'PreToolUse');
 assert.equal(controlRecord.permissionDecision,'allow');
 assert.equal(new Date(controlRecord.timestamp).toISOString(),controlRecord.timestamp);
 for(const marker of ['SYNTHETIC_E4_HOOK_ARGUMENT_MARKER','SYNTHETIC_E4_HOOK_REASON_MARKER','C:/synthetic/caller/private.txt','M8_SYNTHETIC_INPUT_CANARY_NOT_SECRET','M8_SYNTHETIC_REASON_CANARY_NOT_SECRET','write victim']){
  assert.equal(controlLines[0].includes(marker),false,`packaged decision log leaked ${marker}`);
 }
});
