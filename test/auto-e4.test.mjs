import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAutoE4Run,AUTO_E4_STAGES,writeAutoE4Artifacts} from '../packaging/windows/auto-e4.mjs';
import {runHookFaultChecks} from '../packaging/windows/e4-hook-faults.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

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

test('co-located E4 payload wrapper logs only allowlisted metadata',async()=>{
  const payload=fs.mkdtempSync(path.join(os.tmpdir(),'canary-e4-packaged-hook-'));
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

test('Auto E4 rejects invalid stage status rather than treating it as PASS',async()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-invalid-'));
  const run=createAutoE4Run({dataDir:data});
  const stage=await run.stage('environment',async()=>({status:'VERIFIED',detail:{}}));
  assert.equal(stage.status,'FAIL');assert.equal(stage.detail.error,'INVALID_STAGE_STATUS');run.release();
});
