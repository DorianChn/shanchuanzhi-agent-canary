import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAutoE4Run,AUTO_E4_STAGES,writeAutoE4Artifacts} from '../packaging/windows/auto-e4.mjs';
import {runHookFaultChecks} from '../packaging/windows/e4-hook-faults.mjs';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Claude native hook wrapper logs only the allowlisted decision fields',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-m6-hook-log-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const state=path.join(root,'state');fs.mkdirSync(state);
  const modulePath=path.join(root,'fixture-hook.mjs');
  const logFile=path.join(root,'hook-events.jsonl');
  const wrapper=path.join(repo,'security-lab','claude-native-hook.mjs');
  const sensitive={
    session:'M6_HOOK_LOG_CANARY_SESSION',
    tool:'M6_HOOK_LOG_CANARY_TOOL',
    input:'M6_HOOK_LOG_CANARY_RAW_INPUT',
    reason:'M6_HOOK_LOG_CANARY_REASON',
    file:'M6_HOOK_LOG_CANARY_PATH',
    filePath:path.join(root,'M6_HOOK_LOG_CANARY_PATH.txt')
  };
  fs.writeFileSync(modulePath,`export async function decideAgentHook(_provider,_workspace,_state,input){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:input.tool_input.reason}}}\n`);
  const input={session_id:sensitive.session,tool_name:sensitive.tool,tool_input:{command:sensitive.input,file_path:sensitive.filePath,reason:sensitive.reason}};
  const result=spawnSync(process.execPath,[wrapper,modulePath,root,state,logFile],{input:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(result.error,undefined,result.error?.message);
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecisionReason,sensitive.reason);
  const log=fs.readFileSync(logFile,'utf8');
  const lines=log.trim().split(/\r?\n/);
  assert.equal(lines.length,1);
  const event=JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(event).sort(),['hookEventName','permissionDecision','timestamp']);
  assert.equal(Number.isNaN(Date.parse(event.timestamp)),false);
  assert.equal(event.hookEventName,'PreToolUse');
  assert.equal(event.permissionDecision,'allow');
  for(const value of Object.values(sensitive))assert.equal(log.includes(value),false,`sensitive value persisted: ${value}`);
  assert.equal(log.includes('permissionDecisionReason'),false);
  assert.equal(log.includes('tool_input'),false);
});

test('Auto E4 locks a run and does not silently remove a previous lock',()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-lock-'));
  const first=createAutoE4Run({dataDir:data});
  assert.deepEqual(first.report.commands,[]);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING/);
  first.release();
  const next=createAutoE4Run({dataDir:data});next.release();
});

test('Auto E4 stages preserve PASS, BLOCKED and SKIPPED; report never claims external E4',async()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-status-'));
  const run=createAutoE4Run({dataDir:data});
  await run.stage('environment',async()=>({status:'PASS',detail:{summary:'real fixture'}}));
  await run.stage('clean-vm',async()=>({status:'BLOCKED',detail:{reason:'snapshot unavailable'}}));
  const report=run.finish();
  assert.equal(report.coverage.verified,1);assert.equal(report.coverage.blocked,1);assert.equal(report.stages.length,AUTO_E4_STAGES.length);
  assert.ok(report.stages.filter(x=>!['environment','clean-vm'].includes(x.id)).every(x=>x.status==='SKIPPED'));
  assert.equal(report.overallE4,'E4 EXTERNAL INDEPENDENCE NOT VERIFIED');
  const files=writeAutoE4Artifacts(report,run.runDir);
  assert.ok(fs.existsSync(files.jsonFile));assert.ok(fs.existsSync(files.mdFile));assert.ok(fs.existsSync(files.indexFile));
  assert.equal(report.eventsFile,'events.jsonl');
  assert.equal(JSON.parse(fs.readFileSync(files.jsonFile,'utf8')).eventsFile,'events.jsonl');
  assert.equal(fs.readFileSync(files.jsonFile,'utf8').includes(data),false);
  assert.match(fs.readFileSync(files.mdFile,'utf8'),/外部独立性：NOT_VERIFIED/);
  run.release();
});

test('packaged hook wrapper fails closed and target-side fixture evidence is checked',()=>{
  const result=runHookFaultChecks({appRoot:path.join(repo,'dist')});
  assert.equal(result.status,'PASS');
  assert.equal(result.positiveControl.decision,'allow');
  assert.equal(result.positiveControl.sideEffectObserved,true);
  assert.equal(result.faultCases.length,7);
  assert.ok(result.faultCases.every(x=>x.denied||x.errorCode==='ETIMEDOUT'));
  assert.equal(result.sideEffects.protectedVictimUnchanged,true);
  assert.equal(result.sideEffects.unsafeCallbackStarts,0);
  assert.match(result.scope,/NOT A THIRD.PARTY HOST OR VM TEST/);
});

test('Auto E4 rejects invalid stage status rather than treating it as PASS',async()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-invalid-'));
  const run=createAutoE4Run({dataDir:data});
  const stage=await run.stage('environment',async()=>({status:'VERIFIED',detail:{}}));
  assert.equal(stage.status,'FAIL');assert.equal(stage.detail.error,'INVALID_STAGE_STATUS');run.release();
});

test('Auto E4 artifact writer refuses to overwrite a prior report',t=>{
  const runDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-artifacts-'));
  t.after(()=>fs.rmSync(runDir,{recursive:true,force:true}));
  const report={runId:'synthetic',technicalResult:'PARTIAL',overallE4:'E4 EXTERNAL INDEPENDENCE NOT VERIFIED',coverage:{verified:0,total:AUTO_E4_STAGES.length},stages:[],completedAt:'2026-01-01T00:00:00.000Z'};
  const files=writeAutoE4Artifacts(report,runDir);
  const originalJson=fs.readFileSync(files.jsonFile,'utf8');
  const originalMarkdown=fs.readFileSync(files.mdFile,'utf8');
  const originalIndex=fs.readFileSync(files.indexFile,'utf8');

  report.technicalResult='FAIL';
  assert.throws(()=>writeAutoE4Artifacts(report,runDir),/AUTO_E4_ARTIFACT_ALREADY_EXISTS/);
  assert.equal(fs.readFileSync(files.jsonFile,'utf8'),originalJson);
  assert.equal(fs.readFileSync(files.mdFile,'utf8'),originalMarkdown);
  assert.equal(fs.readFileSync(files.indexFile,'utf8'),originalIndex);
});

test('Auto E4 rejects concurrent duplicate stages and keeps active-stage state internal',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-duplicate-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir:data});
  let completeFirst;
  const firstGate=new Promise(resolve=>{completeFirst=resolve;});
  try{
    const first=run.stage('environment',()=>firstGate);
    try{
      await assert.rejects(run.stage('environment',async()=>({status:'PASS',detail:{summary:'duplicate'}})),/DUPLICATE_AUTO_E4_STAGE/);
      run.report.stages.push({id:'environment',status:'PASS',durationMs:0,detail:{summary:'synthetic projection only'}});
      try{
        assert.throws(()=>run.finish(),/AUTO_E4_STAGE_IN_PROGRESS/);
      }finally{
        run.report.stages.pop();
      }
    }finally{
      completeFirst({status:'PASS',detail:{summary:'first attempt'}});
    }
    await first;
    const report=run.finish();
    assert.equal(report.stages.filter(stage=>stage.id==='environment').length,1);
    assert.equal(report.coverage.verified,1);
    assert.equal(report.coverage.total,AUTO_E4_STAGES.length);
  }finally{
    run.release();
  }
});

test('Auto E4 finalization prevents later stages or event mutation',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-finished-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir:data});
  try{
    const report=run.finish();
    const completedAt=report.completedAt;
    await assert.rejects(run.stage('environment',async()=>({status:'PASS'})),/AUTO_E4_RUN_FINISHED/);
    assert.throws(()=>run.record({type:'late-event'}),/AUTO_E4_RUN_FINISHED/);
    assert.equal(run.finish(),report);
    assert.equal(report.completedAt,completedAt);
    assert.equal(report.stages.length,AUTO_E4_STAGES.length);
    assert.equal(new Set(report.stages.map(stage=>stage.id)).size,AUTO_E4_STAGES.length);
  }finally{
    run.release();
  }
});
