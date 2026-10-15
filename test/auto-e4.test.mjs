import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createAutoE4Run,AUTO_E4_STAGES,writeAutoE4Artifacts} from '../packaging/windows/auto-e4.mjs';
import {runHookFaultChecks} from '../packaging/windows/e4-hook-faults.mjs';
import {recordAutoE4BundleFailure,finalizeAutoE4Run,buildAutoE4Export} from '../packaging/windows/worker.mjs';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Auto E4 locks a run and does not silently remove a previous lock',()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-lock-'));
  const first=createAutoE4Run({dataDir:data});
  assert.deepEqual(first.report.commands,[]);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING/);
  first.release();
  const next=createAutoE4Run({dataDir:data});next.release();
});

test('Auto E4 reclaims a verifiably dead owner and fails closed on an unverifiable lock',()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-stale-lock-'));
  const lock=path.join(data,'auto-e4.lock');
  fs.writeFileSync(lock,JSON.stringify({schemaVersion:1,runId:'11111111-1111-4111-8111-111111111111',pid:2147483647,startedAt:new Date(0).toISOString()}));
  const recovered=createAutoE4Run({dataDir:data});
  assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).runId,recovered.runId);
  assert.deepEqual(fs.readdirSync(data).filter(name=>name.includes('.stale.')),[]);
  recovered.release();
  const unverifiable={schemaVersion:0,runId:'old-format',pid:2147483647};
  fs.writeFileSync(lock,JSON.stringify(unverifiable));
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_LOCK_OWNER_UNVERIFIABLE/);
  assert.deepEqual(JSON.parse(fs.readFileSync(lock,'utf8')),unverifiable);
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

test('Auto E4 refuses repeat artifact writes without changing the prior report',t=>{
  const runDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-repeat-'));
  t.after(()=>fs.rmSync(runDir,{recursive:true,force:true}));
  const report={runId:'repeat',technicalResult:'PARTIAL',overallE4:'E4 EXTERNAL INDEPENDENCE NOT VERIFIED',startedAt:'start',completedAt:'end',coverage:{verified:0,total:0},stages:[]};
  const files=writeAutoE4Artifacts(report,runDir);
  const before=[files.jsonFile,files.mdFile,files.indexFile].map(file=>fs.readFileSync(file));

  report.technicalResult='FAIL';
  assert.throws(()=>writeAutoE4Artifacts(report,runDir),error=>error.message==='AUTO_E4_ARTIFACT_ALREADY_EXISTS');
  for(const [index,file] of [files.jsonFile,files.mdFile,files.indexFile].entries())assert.deepEqual(fs.readFileSync(file),before[index]);
});

test('Auto E4 preflights all artifact paths before writing when one partial artifact exists',t=>{
  const names=['AUTO_E4_REPORT.json','AUTO_E4_REPORT.md','EVIDENCE_INDEX.json'];
  for(const existingName of names){
    const runDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-partial-'));
    try{
      const existingFile=path.join(runDir,existingName);
      const original=Buffer.from('preserve prior artifact');
      fs.writeFileSync(existingFile,original);
      const report={runId:'partial',technicalResult:'PARTIAL',overallE4:'E4 EXTERNAL INDEPENDENCE NOT VERIFIED',startedAt:'start',completedAt:'end',coverage:{verified:0,total:0},stages:[]};

      assert.throws(()=>writeAutoE4Artifacts(report,runDir),error=>error.message==='AUTO_E4_ARTIFACT_ALREADY_EXISTS');
      assert.deepEqual(fs.readFileSync(existingFile),original);
      for(const name of names){
        if(name!==existingName)assert.equal(fs.existsSync(path.join(runDir,name)),false,`${existingName} must be detected before ${name} is written`);
      }
    }finally{fs.rmSync(runDir,{recursive:true,force:true});}
  }
});

test('Auto E4 normalizes an EEXIST race after artifact preflight without replacing the competing file',t=>{
  const runDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-race-'));
  t.after(()=>fs.rmSync(runDir,{recursive:true,force:true}));
  const jsonFile=path.join(runDir,'AUTO_E4_REPORT.json');
  const competitor=Buffer.from('created after preflight');
  const originalLinkSync=fs.linkSync;
  const linkSync=originalLinkSync.bind(fs);
  fs.linkSync=(source,target)=>{
    if(path.resolve(target)===path.resolve(jsonFile)&&!fs.existsSync(jsonFile))fs.writeFileSync(jsonFile,competitor);
    return linkSync(source,target);
  };
  try{
    assert.throws(()=>writeAutoE4Artifacts({runId:'race',technicalResult:'PARTIAL',coverage:{verified:0,total:0},stages:[]},runDir),error=>error.message==='AUTO_E4_ARTIFACT_ALREADY_EXISTS');
  }finally{fs.linkSync=originalLinkSync;}
  assert.deepEqual(fs.readFileSync(jsonFile),competitor);
  assert.equal(fs.existsSync(path.join(runDir,'AUTO_E4_REPORT.md')),false);
  assert.equal(fs.existsSync(path.join(runDir,'EVIDENCE_INDEX.json')),false);
  assert.deepEqual(fs.readdirSync(runDir),['AUTO_E4_REPORT.json']);
});

test('Auto E4 bundle failure records BLOCKED status without overwriting the report',t=>{
  const runDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-bundle-failure-'));
  t.after(()=>fs.rmSync(runDir,{recursive:true,force:true}));
  const stage={id:'materials',status:'PASS',durationMs:1,detail:{summary:'reports created'}};
  const report={runId:'blocked-run',technicalResult:'READY_FOR_EXTERNAL_REVIEW',coverage:{verified:1,blocked:0},stages:[stage]};
  const files=writeAutoE4Artifacts({...report,coverage:{verified:1,blocked:0},stages:[{...stage}]},runDir);
  const original=fs.readFileSync(files.jsonFile);
  const originalMarkdown=fs.readFileSync(files.mdFile);
  const originalIndex=fs.readFileSync(files.indexFile);
  const failureFile=recordAutoE4BundleFailure(report,runDir,files,Error('EVIDENCE_BUNDLE_CREATE_FAILED'));
  const failure=JSON.parse(fs.readFileSync(failureFile,'utf8'));

  assert.equal(report.technicalResult,'BLOCKED');
  assert.equal(stage.status,'BLOCKED');
  assert.equal(report.coverage.verified,0);
  assert.equal(report.coverage.blocked,1);
  assert.equal(report.bundleVerification.status,'BLOCKED');
  assert.equal(failure.status,'BLOCKED');
  assert.equal(failure.reportPreserved,true);
  assert.equal(failure.originalReport.sha256,createHash('sha256').update(original).digest('hex'));
  assert.deepEqual(fs.readFileSync(files.jsonFile),original);
  assert.deepEqual(fs.readFileSync(files.mdFile),originalMarkdown);
  assert.deepEqual(fs.readFileSync(files.indexFile),originalIndex);
});

test('worker bundle failure flows through latest pointer into a BLOCKED export while preserving the pre-failure snapshot',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-export-blocked-'));
  t.after(()=>fs.rmSync(dataDir,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir});
  await run.stage('environment',async()=>({status:'PASS',detail:{summary:'local fixture'}}));
  await run.stage('materials',async()=>({status:'PASS',detail:{summary:'report artifacts prepared'}}));
  const report=run.finish();
  const originalTechnicalResult=report.technicalResult;
  const artifacts=writeAutoE4Artifacts(report,run.runDir);
  const preserved=[artifacts.jsonFile,artifacts.mdFile,artifacts.indexFile,path.join(run.runDir,report.eventsFile)].map(file=>fs.readFileSync(file));
  const result=finalizeAutoE4Run(report,run.runDir,dataDir,artifacts,{bundleFactory:()=>{throw Error('EVIDENCE_BUNDLE_CREATE_FAILED');}});
  run.release();

  assert.equal(result.bundle,null);
  assert.equal(path.basename(result.bundleFailureFile),'AUTO_E4_BUNDLE_FAILURE.json');
  const latest=JSON.parse(fs.readFileSync(path.join(dataDir,'latest.json'),'utf8'));
  assert.equal(latest.status,'BLOCKED');
  assert.equal(latest.bundleFailureFile,result.bundleFailureFile);
  assert.equal(latest.indexFile,artifacts.indexFile);
  assert.equal(latest.eventsFile,path.join(run.runDir,report.eventsFile));

  const exported=buildAutoE4Export(latest,dataDir,'external');
  const exportedReport=JSON.parse(exported.json);
  assert.equal(exported.status,'VERIFIED_EXPORT_REDACTED');
  assert.equal(exported.technicalResult,'BLOCKED');
  assert.equal(exportedReport.technicalResult,'BLOCKED');
  assert.equal(exportedReport.operator.declaredRole,'external');
  assert.equal(exportedReport.bundleVerification.status,'BLOCKED');
  assert.equal(exportedReport.bundleVerification.originalTechnicalResult,originalTechnicalResult);
  assert.equal(exportedReport.bundleVerification.evidenceSnapshot.classification,'PRE_BUNDLE_FAILURE_SNAPSHOT');
  assert.equal(exportedReport.bundleVerification.evidenceSnapshot.bundleFailureIncluded,false);
  assert.equal(exportedReport.bundleVerification.evidenceSnapshot.index.includesBundleFailure,false);
  assert.equal(exportedReport.bundleVerification.evidenceSnapshot.events.includesBundleFailure,false);
  assert.equal(exportedReport.stages.find(stage=>stage.id==='materials').status,'BLOCKED');
  assert.equal(exportedReport.coverage.blocked,1);
  assert.equal(exportedReport.coverage.verified,1);
  assert.match(exported.markdown,/Technical result: BLOCKED/);
  assert.match(exported.markdown,/pre-bundle-failure snapshot/);
  const failure=JSON.parse(fs.readFileSync(result.bundleFailureFile,'utf8'));
  assert.equal(failure.reason,'EVIDENCE_BUNDLE_CREATE_FAILED');
  assert.deepEqual(exportedReport.bundleVerification.failureSidecar,failure);
  assert.ok(!JSON.parse(fs.readFileSync(artifacts.indexFile,'utf8')).artifacts.some(file=>file.name==='AUTO_E4_BUNDLE_FAILURE.json'));
  for(const [index,file] of [artifacts.jsonFile,artifacts.mdFile,artifacts.indexFile,path.join(run.runDir,report.eventsFile)].entries())assert.deepEqual(fs.readFileSync(file),preserved[index]);
});
