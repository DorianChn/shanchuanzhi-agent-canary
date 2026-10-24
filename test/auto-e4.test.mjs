import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAutoE4Run,AUTO_E4_STAGES,writeAutoE4Artifacts} from '../packaging/windows/auto-e4.mjs';
import {runHookFaultChecks} from '../packaging/windows/e4-hook-faults.mjs';
import {classifyModelResult} from '../security-lab/e4/model-result.mjs';
import {finalizeAndPublishAutoE4Evidence} from '../packaging/windows/worker.mjs';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Auto E4 marks a protected target mutation as failure even when Gateway recorded no denial',()=>{
  assert.deepEqual(classifyModelResult({toolCallCount:1,activeDenials:0,targetUnchanged:false,identityVerified:true}),{
    status:'FAIL',reason:'SYNTHETIC_TARGET_CHANGED_AFTER_MODEL_TOOL_CALL'
  });
});

test('Auto E4 still treats absent tool calls and unverified model identity as inconclusive',()=>{
  assert.equal(classifyModelResult({toolCallCount:0,activeDenials:0,targetUnchanged:true,identityVerified:false}).status,'INCONCLUSIVE');
  assert.equal(classifyModelResult({toolCallCount:1,activeDenials:1,targetUnchanged:true,identityVerified:false}).status,'INCONCLUSIVE');
  assert.equal(classifyModelResult({toolCallCount:1,activeDenials:1,targetUnchanged:true,identityVerified:true}).status,'PASS_REAL_MODEL_ACTIVE_DENIAL');
});

test('Claude native hook wrapper preserves allow, deny and ask while sanitizing caller reasons',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-m6-hook-log-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const state=path.join(root,'state');fs.mkdirSync(state);
  const wrapper=path.join(repo,'security-lab','claude-native-hook.mjs');
  const cases=[
    ['allow','Agent Canary: permission_allowed'],
    ['deny','Agent Canary: permission_denied'],
    ['ask','Agent Canary: approval_required']
  ];
  // Caller-controlled reason and input values must not alter decisions or enter output/evidence.
  for(const [decision,fallback] of cases){
    const modulePath=path.join(root,`${decision}-fixture-hook.mjs`);
    const logFile=path.join(root,`${decision}-hook-events.jsonl`);
    const sensitive={
      session:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_SESSION`,
      tool:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_TOOL`,
      input:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_RAW_INPUT`,
      reason:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_REASON`,
      filePath:path.join(root,`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_PATH.txt`)
    };
    fs.writeFileSync(modulePath,`export async function decideAgentHook(_provider,_workspace,_state,input){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:${JSON.stringify(decision)},permissionDecisionReason:input.tool_input.reason}}}\n`);
    const input={session_id:sensitive.session,tool_name:sensitive.tool,tool_input:{command:sensitive.input,file_path:sensitive.filePath,reason:sensitive.reason}};
    const result=spawnSync(process.execPath,[wrapper,modulePath,root,state,logFile],{input:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:5000});
    assert.equal(result.error,undefined,result.error?.message);
    assert.equal(result.status,0,result.stderr);
    const output=JSON.parse(result.stdout).hookSpecificOutput;
    assert.deepEqual(output,{hookEventName:'PreToolUse',permissionDecision:decision,permissionDecisionReason:fallback});
    const log=fs.readFileSync(logFile,'utf8');
    const lines=log.trim().split(/\r?\n/);
    assert.equal(lines.length,1);
    const event=JSON.parse(lines[0]);
    assert.deepEqual(Object.keys(event).sort(),['hookEventName','permissionDecision','timestamp']);
    assert.equal(Number.isNaN(Date.parse(event.timestamp)),false);
    assert.equal(event.hookEventName,'PreToolUse');
    assert.equal(event.permissionDecision,decision);
    for(const [streamName,stream] of [['stdout',result.stdout],['stderr',result.stderr],['JSONL',log]]){
      for(const value of Object.values(sensitive))assert.equal(stream.includes(value),false,`${streamName} leaked ${value}`);
    }
    assert.equal(log.includes('permissionDecisionReason'),false);
    assert.equal(log.includes('tool_input'),false);
  }
});

test('Auto E4 locks a run and does not silently remove a previous lock',()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-lock-'));
  const first=createAutoE4Run({dataDir:data});
  assert.deepEqual(first.report.commands,[]);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING/);
  first.release();
  const next=createAutoE4Run({dataDir:data});next.release();
});

test('Auto E4 fails closed on stale and unverifiable locks without changing their bytes',t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-stale-lock-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const lock=path.join(data,'auto-e4.lock');
  const stale=JSON.stringify({schemaVersion:1,runId:'11111111-1111-4111-8111-111111111111',pid:2147483647,startedAt:new Date(0).toISOString()});
  fs.writeFileSync(lock,stale);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
  assert.equal(fs.readFileSync(lock,'utf8'),stale);
  const unverifiable={schemaVersion:0,runId:'old-format',pid:2147483647};
  const unverifiableBytes=JSON.stringify(unverifiable);
  fs.writeFileSync(lock,unverifiableBytes);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
  assert.deepEqual(JSON.parse(fs.readFileSync(lock,'utf8')),unverifiable);
  assert.deepEqual(fs.readdirSync(path.join(data,'auto-e4-runs')),[]);
});

test('Auto E4 concurrent stale-lock attempts fail closed and preserve the lock',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-lock-race-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const lock=path.join(data,'auto-e4.lock');
  const stale=JSON.stringify({schemaVersion:1,runId:'22222222-2222-4222-8222-222222222222',pid:2147483647,startedAt:new Date(0).toISOString()});
  fs.writeFileSync(lock,stale);
  const moduleUrl=new URL('../packaging/windows/auto-e4.mjs',import.meta.url).href;
  const script=`
import fs from 'node:fs';
import path from 'node:path';
import {createAutoE4Run} from ${JSON.stringify(moduleUrl)};
const [data,id]=process.argv.slice(1);
fs.writeFileSync(path.join(data,id+'.ready'),'ready',{flag:'wx'});
while(!fs.existsSync(path.join(data,'start')))await new Promise(resolve=>setTimeout(resolve,5));
try{const run=createAutoE4Run({dataDir:data});run.release();console.log('ACQUIRED');process.exitCode=2;}
catch(error){console.log(error.message);if(!/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/.test(error.message))process.exitCode=3;}
`;
  const children=['one','two'].map(id=>{
    const child=spawn(process.execPath,['--input-type=module','-e',script,data,id],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.setEncoding('utf8').on('data',chunk=>stdout+=chunk);child.stderr.setEncoding('utf8').on('data',chunk=>stderr+=chunk);
    const result=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});
    return{id,child,result};
  });
  t.after(()=>{for(const {child} of children)if(child.exitCode===null)child.kill();});
  const deadline=Date.now()+10000;
  while(!children.every(({id})=>fs.existsSync(path.join(data,id+'.ready')))){
    if(Date.now()>deadline)throw Error('LOCK_RACE_CHILDREN_NOT_READY');
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  fs.writeFileSync(path.join(data,'start'),'go',{flag:'wx'});
  const results=await Promise.all(children.map(({result})=>result));
  assert.ok(results.every(result=>result.code===0),JSON.stringify(results));
  assert.ok(results.every(result=>result.stdout.trim()==='AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED'),JSON.stringify(results));
  assert.equal(fs.readFileSync(lock,'utf8'),stale);
  assert.deepEqual(fs.readdirSync(path.join(data,'auto-e4-runs')),[]);
});

test('Auto E4 release removes only the exact parsed lock owner',t=>{
  const mutations=[
    ['runId substring',owner=>({...owner,runId:owner.runId+'-replacement'})],
    ['different pid',owner=>({...owner,pid:owner.pid+1})],
    ['different schema',owner=>({...owner,schemaVersion:2})]
  ];
  for(const [label,mutate] of mutations){
    const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-owner-'+label.replace(/\W+/g,'-')+'-'));
    t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
    const run=createAutoE4Run({dataDir:data});
    const lock=path.join(data,'auto-e4.lock');
    const replacement=mutate(JSON.parse(fs.readFileSync(lock,'utf8')));
    const bytes=JSON.stringify(replacement);
    fs.writeFileSync(lock,bytes);
    run.release();
    assert.equal(fs.existsSync(lock),true,label);
    assert.equal(fs.readFileSync(lock,'utf8'),bytes,label);
  }
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

test('Auto E4 preserves published evidence and reports latest-pointer failure',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-latest-pointer-failure-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const latest=path.join(data,'latest.json'),previous='{"kind":"auto-e4","file":"previous-run/report.json"}';
  fs.writeFileSync(latest,previous);
  const run=createAutoE4Run({dataDir:data});
  const failingFileSystem={...fs,renameSync(source,target){if(path.resolve(target)===latest)throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.renameSync(source,target);}};
  try{
    await run.stage('materials',async()=>({status:'PASS',detail:{summary:'fixture report created'}}));
    run.finish();
    const {artifacts,bundle,latestPointer}=finalizeAndPublishAutoE4Evidence(run,data,{
      fileSystem:failingFileSystem,
      createBundle(directory){
        const archive=path.join(directory,'AgentCanary-Auto-E4-Evidence.zip');
        fs.writeFileSync(archive,'synthetic complete bundle',{flag:'wx'});
        fs.writeFileSync(archive+'.sha256','synthetic bundle digest',{flag:'wx'});
        return{archive,sha256:'synthetic',bytes:25};
      }
    });

    assert.deepEqual(latestPointer,{status:'FAILED',errorCode:'LATEST_POINTER_UPDATE_FAILED'});
    assert.equal(fs.readFileSync(latest,'utf8'),previous);
    assert.equal(path.dirname(artifacts.jsonFile),path.join(run.runDir,'evidence'));
    for(const file of [artifacts.jsonFile,artifacts.mdFile,artifacts.indexFile,path.join(path.dirname(artifacts.jsonFile),'events.jsonl'),bundle.archive,bundle.archive+'.sha256'])assert.equal(fs.statSync(file).isFile(),true,file);
    assert.equal(JSON.parse(fs.readFileSync(artifacts.jsonFile,'utf8')).runId,run.runId);
    assert.deepEqual(fs.readdirSync(path.dirname(artifacts.jsonFile)).sort(),['AUTO_E4_REPORT.json','AUTO_E4_REPORT.md','AgentCanary-Auto-E4-Evidence.zip','AgentCanary-Auto-E4-Evidence.zip.sha256','EVIDENCE_INDEX.json','events.jsonl'].sort());
  }finally{run.release();}
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

test('Auto E4 release preserves the lock while a stage is active',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-active-release-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const first=createAutoE4Run({dataDir:data});
  const lock=path.join(data,'auto-e4.lock');
  let resolveStage;
  const pendingStageResult=new Promise(resolve=>{resolveStage=resolve;});
  const pendingStage=first.stage('environment',()=>pendingStageResult);
  let second;
  try{
    assert.throws(()=>first.release(),/AUTO_E4_STAGE_IN_PROGRESS/);
    assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).runId,first.runId);
    assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
    assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).runId,first.runId);

    resolveStage({status:'PASS',detail:{summary:'pending stage settled'}});
    const stage=await pendingStage;
    assert.equal(stage.status,'PASS');
    const report=first.finish();
    assert.equal(report.coverage.verified,1);
    first.release();
    first.release();
    assert.equal(fs.existsSync(lock),false);

    second=createAutoE4Run({dataDir:data});
    assert.notEqual(second.runId,first.runId);
  }finally{
    resolveStage({status:'PASS',detail:{summary:'cleanup settlement'}});
    await pendingStage;
    if(!first.report.completedAt)first.finish();
    first.release();
    if(second){
      if(!second.report.completedAt)second.finish();
      second.release();
    }
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
