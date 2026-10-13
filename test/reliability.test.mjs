import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {writeFileAtomically} from '../packaging/windows/durable-files.mjs';
import {loadState,saveReport} from '../packaging/windows/worker.mjs';

// macOS can expose the temp tree through /var -> /private/var; keep fixtures canonical
// so worker.mjs continues to exercise its production symlink rejection unchanged.
function makeCanonicalTempRoot(prefix){
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),prefix)));
}

const home=makeCanonicalTempRoot('agent-canary-reliability-home-');
process.env.AGENT_CANARY_HOME=path.join(home,'guard-home');
const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder,verifyEvidenceChain}=await import('../src/sdk.js');

test('atomic replacement preserves the old file when a disk-full write fails',()=>{
  const root=makeCanonicalTempRoot('agent-canary-atomic-write-');
  const target=path.join(root,'latest.json');
  fs.writeFileSync(target,'previous-complete-value');
  const diskFull=Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});
  const failingFileSystem={...fs,writeFileSync(){throw diskFull;}};
  try{
    assert.throws(()=>writeFileAtomically(target,'new-value',{replace:true,fileSystem:failingFileSystem}),error=>error.code==='ENOSPC');
    assert.equal(fs.readFileSync(target,'utf8'),'previous-complete-value');
    assert.deepEqual(fs.readdirSync(root),['latest.json']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('corrupt session state is preserved and a fresh session is atomically created',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-recovery-');
  const sessionFile=path.join(root,'session.json'),corrupt='{not-json';
  fs.writeFileSync(sessionFile,corrupt);
  try{
    const state=loadState(root);
    assert.match(state.sessionId,/^[a-f0-9-]{36}$/);
    assert.equal(JSON.parse(fs.readFileSync(sessionFile,'utf8')).sessionId,state.sessionId);
    const backups=fs.readdirSync(root).filter(name=>name.startsWith('session.json.corrupt.'));
    assert.equal(backups.length,1);
    assert.equal(fs.readFileSync(path.join(root,backups[0]),'utf8'),corrupt);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('session backup failure fails closed without replacing corrupt state',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-backup-fault-');
  const sessionFile=path.join(root,'session.json'),corrupt='{bad-session';
  fs.writeFileSync(sessionFile,corrupt);
  const fileSystem={...fs,renameSync(source,target){if(source===sessionFile)throw Object.assign(new Error('synthetic rename failure'),{code:'EACCES'});return fs.renameSync(source,target);}};
  try{
    assert.throws(()=>loadState(root,{fileSystem}),/SESSION_STATE_BACKUP_FAILED/);
    assert.equal(fs.readFileSync(sessionFile,'utf8'),corrupt);
    assert.deepEqual(fs.readdirSync(root),['session.json']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('failed fresh-session creation leaves the corrupt backup intact and no partial state',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-recovery-fault-');
  const sessionFile=path.join(root,'session.json'),corrupt='{bad-session';
  fs.writeFileSync(sessionFile,corrupt);
  const fileSystem={...fs,openSync(file,...args){if(path.basename(file).startsWith('.session.json.')&&file.endsWith('.tmp'))throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.openSync(file,...args);}};
  try{
    assert.throws(()=>loadState(root,{fileSystem}),/SESSION_STATE_RECOVERY_FAILED/);
    assert.equal(fs.existsSync(sessionFile),false);
    const backups=fs.readdirSync(root).filter(name=>name.startsWith('session.json.corrupt.'));
    assert.equal(backups.length,1);
    assert.equal(fs.readFileSync(path.join(root,backups[0]),'utf8'),corrupt);
    assert.deepEqual(fs.readdirSync(root),backups);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('oversized session state is backed up byte-for-byte before recovery',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-oversized-');
  const sessionFile=path.join(root,'session.json'),corrupt='x'.repeat(4097);
  fs.writeFileSync(sessionFile,corrupt);
  try{
    const state=loadState(root);
    assert.match(state.sessionId,/^[a-f0-9-]{36}$/);
    const backups=fs.readdirSync(root).filter(name=>name.startsWith('session.json.corrupt.'));
    assert.equal(backups.length,1);
    assert.equal(fs.readFileSync(path.join(root,backups[0]),'utf8'),corrupt);
    assert.equal(JSON.parse(fs.readFileSync(sessionFile,'utf8')).sessionId,state.sessionId);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('session-state symlink is rejected without modifying its target',t=>{
  const root=makeCanonicalTempRoot('agent-canary-session-symlink-');
  const target=path.join(root,'target.json'),sessionFile=path.join(root,'session.json'),content='{"sessionId":"synthetic"}';
  fs.writeFileSync(target,content);
  try{fs.symlinkSync(target,sessionFile,'file');}catch{fs.rmSync(root,{recursive:true,force:true});t.skip('File symlink creation is unavailable in this environment');return;}
  try{
    assert.throws(()=>loadState(root),/SESSION_STATE_UNSAFE/);
    assert.equal(fs.readFileSync(target,'utf8'),content);
    assert.equal(fs.lstatSync(sessionFile).isSymbolicLink(),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('report publication atomically advances latest while rejecting unsafe report ids',()=>{
  const root=makeCanonicalTempRoot('agent-canary-report-write-');
  const latest=path.join(root,'latest.json');fs.writeFileSync(latest,'previous-pointer');
  const report={runId:randomUUID(),status:'VERIFIED_BOUNDED_CHECKS'};
  try{
    const file=saveReport(report,root);
    assert.deepEqual(JSON.parse(fs.readFileSync(latest,'utf8')),{file});
    assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).runId,report.runId);
    assert.throws(()=>saveReport({runId:'../outside'},root),/REPORT_ID_INVALID/);
    assert.equal(fs.existsSync(path.join(root,'outside.json')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('failed latest-pointer replacement preserves the previous report pointer',()=>{
  const root=makeCanonicalTempRoot('agent-canary-report-pointer-fault-');
  const latest=path.join(root,'latest.json'),previous='{"file":"previous-report.json"}';
  fs.writeFileSync(latest,previous);
  const fileSystem={...fs,renameSync(source,target){if(target===latest)throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.renameSync(source,target);}};
  const report={runId:randomUUID(),status:'VERIFIED_BOUNDED_CHECKS'};
  try{
    assert.throws(()=>saveReport(report,root,{fileSystem}),error=>error.code==='ENOSPC');
    assert.equal(fs.readFileSync(latest,'utf8'),previous);
    const reports=fs.readdirSync(path.join(root,'reports'));
    assert.deepEqual(reports,[report.runId+'.json']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root,'reports',reports[0]),'utf8')).runId,report.runId);
    assert.deepEqual(fs.readdirSync(root).sort(),['latest.json','reports']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('gateway evidence persists and the chain rejects tampering after accepted local work',async()=>{
  const root=makeCanonicalTempRoot('agent-canary-evidence-persist-');
  const evidenceFile=path.join(root,'evidence.jsonl');
  const guard=createAgentGuard({alert:false,eventsFile:path.join(root,'guard.jsonl')});
  const evidence=new EvidenceRecorder(128,evidenceFile);
  const gateway=createTrustedExecutionGateway({
    agentId:'reliability-evidence',guard,workspaceRoot:root,files:[],evidence,
    mcpTools:{inspect:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>({ok:true})}}
  });
  let gatewayClosed=false,evidenceClosed=false;
  try{
    assert.deepEqual(await gateway.agent.dispatch({name:'mcp_tool',args:{tool:'inspect',arguments:{}}}),{ok:true});
    assert.equal(verifyEvidenceChain(gateway.evidence()).valid,true);
    await gateway.close();gatewayClosed=true;
    evidence.close();evidenceClosed=true;
    const persisted=fs.readFileSync(evidenceFile,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
    assert.equal(verifyEvidenceChain(persisted).valid,true);
    const corrupted=persisted.map(event=>({...event}));corrupted[0].decision_reason='tampered-after-write';
    assert.equal(verifyEvidenceChain(corrupted).valid,false);
  }finally{
    if(!gatewayClosed)await gateway.close().catch(()=>{});
    if(!evidenceClosed)evidence.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('gateway bounds concurrent pending dispatches and drains the accepted queue',async()=>{
  const root=makeCanonicalTempRoot('agent-canary-queue-bound-');
  const guard=createAgentGuard({alert:false}),evidence=new EvidenceRecorder(4096);
  let release,executed=0;
  const hold=new Promise(resolve=>{release=resolve;});
  const gateway=createTrustedExecutionGateway({agentId:'reliability-queue',guard,workspaceRoot:root,files:[],evidence,mcpTools:{slow:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{executed++;await hold;return{ok:true};}}}});
  try{
    const tasks=Array.from({length:65},(_,sequence)=>gateway.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{sequence}}}));
    release();
    const outcomes=await Promise.allSettled(tasks);
    assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,64);
    assert.equal(outcomes.filter(outcome=>outcome.status==='rejected').length,1);
    assert.equal(executed,64);
    assert.equal(verifyEvidenceChain(gateway.evidence()).valid,true);
  }finally{release();await gateway.close();fs.rmSync(root,{recursive:true,force:true});}
});
