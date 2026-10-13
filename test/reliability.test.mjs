import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {writeFileAtomically} from '../packaging/windows/durable-files.mjs';
import {loadState,saveReport} from '../packaging/windows/worker.mjs';

const home=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-reliability-home-'));
process.env.AGENT_CANARY_HOME=path.join(home,'guard-home');
const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder,verifyEvidenceChain}=await import('../src/sdk.js');

test('atomic replacement preserves the old file when a disk-full write fails',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-atomic-write-'));
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
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-session-recovery-'));
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

test('report publication atomically advances latest while rejecting unsafe report ids',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-report-write-'));
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

test('gateway drains queued work and concurrent close calls release held file handles once',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-close-race-'));
  const target=path.join(root,'state.txt'),evidenceFile=path.join(root,'evidence.jsonl');fs.writeFileSync(target,'before');
  const guard=createAgentGuard({alert:false,eventsFile:path.join(root,'guard.jsonl')});
  const evidence=new EvidenceRecorder(128,evidenceFile);
  const gateway=createTrustedExecutionGateway({
    agentId:'reliability-close',guard,workspaceRoot:root,files:[{path:'state.txt',writable:true}],evidence,
    mcpTools:{slow:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{await new Promise(resolve=>setTimeout(resolve,15));return{ok:true};}}}
  });
  try{
    const queued=gateway.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}});
    const closeA=gateway.close(),closeB=gateway.close();
    assert.deepEqual(await queued,{ok:true});
    await Promise.all([closeA,closeB]);
    assert.equal(verifyEvidenceChain(gateway.evidence()).valid,true);
    evidence.close();
    const persisted=fs.readFileSync(evidenceFile,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
    assert.equal(verifyEvidenceChain(persisted).valid,true);
    const corrupted=persisted.map(event=>({...event}));corrupted[0].decision_reason='tampered-after-write';
    assert.equal(verifyEvidenceChain(corrupted).valid,false);
    await assert.rejects(gateway.agent.dispatch({name:'read_file',args:{path:'state.txt'}}),/GATEWAY_CLOSED_OR_QUEUE_FULL/);
    const released=path.join(root,'released.txt');fs.renameSync(target,released);
    assert.equal(fs.readFileSync(released,'utf8'),'before');
  }finally{
    await gateway.close();
    evidence.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('gateway bounds concurrent pending dispatches and drains the accepted queue',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-queue-bound-'));
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
