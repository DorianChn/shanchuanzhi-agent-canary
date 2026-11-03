import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-pot-tests-'));
const {HoneypotRuntime,planAdaptiveDecoys,DataFlowTracker,createTrustedExecutionGateway,createAgentGuard,EvidenceRecorder}=await import('../src/sdk.js');
test('five isolated decoy kinds have unique IDs and deployed is not touched',()=>{const pot=new HoneypotRuntime('fixture');assert.equal(pot.descriptions().length,5);assert.equal(new Set(pot.descriptions().map(d=>d.id)).size,5);assert.ok(pot.snapshot().every(e=>e.kind==='DEPLOYED'));for(const d of pot.descriptions())assert.match(fs.readFileSync(path.join(pot.root,d.path),'utf8'),/NOT_A_REAL_CREDENTIAL/);});
test('database, internal API and MCP interaction is virtual and records only actual calls',()=>{const pot=new HoneypotRuntime('fixture');for(const [kind,op]of [['DATABASE','query'],['INTERNAL_API','health'],['MCP','tool']] as const){const d=pot.descriptions().find(d=>d.kind===kind)!;assert.equal(pot.invoke(d.id,op).decoyId,d.id);}assert.equal(pot.snapshot().filter(e=>e.kind==='TOOL_INVOKED').length,3);assert.throws(()=>pot.invoke('nonexistent','query'));assert.equal(pot.snapshot().filter(e=>e.kind==='BLOCKED').length,0);});
test('adaptive metadata produces bounded selection without invented efficacy',()=>{assert.deepEqual(planAdaptiveDecoys({category:'database',needsCredentials:true}),['DATABASE','ENV']);assert.deepEqual(planAdaptiveDecoys({category:'general',needsCredentials:false}),['MCP']);assert.throws(()=>planAdaptiveDecoys({category:'attacker-controlled' as any,needsCredentials:false}));});
test('real honeypot file read returns only synthetic content and quarantine blocks the next actual write',async()=>{
 const guard=createAgentGuard({alert:false});
 const pot=new HoneypotRuntime(guard.sessionId,['ENV']);
 const target=path.join(pot.root,'result.txt');
 fs.writeFileSync(target,'unchanged');
 const before=fs.readFileSync(target),beforeHash=createHash('sha256').update(before).digest('hex');
 const evidence=new EvidenceRecorder();
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard,workspaceRoot:pot.root,files:[...pot.gatewayFiles(),{path:'result.txt',writable:true}],evidence,onDecoyRead:id=>{pot.record(id,'READ');if(guard.state==='QUARANTINED')pot.record(id,'QUARANTINED');}});
 try{
  const decoy=fs.readFileSync(path.join(pot.root,'.env'),'utf8');
  assert.match(decoy,/^API_KEY=NOT_A_REAL_CREDENTIAL_[A-Za-z0-9-]+\n$/);
  assert.deepEqual(await runtime.agent.dispatch({name:'read_file',args:{path:'.env'}}),{content:decoy});
  assert.equal(guard.state,'QUARANTINED');
  const read=evidence.snapshot().find(event=>event.tool_id==='read_file'&&event.execution_status==='SUCCEEDED');
  assert.equal(read?.decision,'ALLOW');
  assert.equal(read?.execution_status,'SUCCEEDED');
  assert.equal(fs.readFileSync(target).toString('hex'),before.toString('hex'));
  await assert.rejects(runtime.agent.dispatch({name:'write_file',args:{path:'result.txt',content:'bad'}}),/guard_quarantined/);
  const denied=evidence.snapshot().at(-1)!;
  assert.equal(denied.decision,'DENY');
  assert.equal(denied.decision_reason,'guard_quarantined');
  assert.equal(denied.execution_status,'NOT_STARTED');
  const after=fs.readFileSync(target);
  assert.equal(after.toString('hex'),before.toString('hex'));
  assert.equal(createHash('sha256').update(after).digest('hex'),beforeHash);
  assert.equal(pot.snapshot().filter(event=>event.kind==='READ').length,1);
  assert.equal(pot.snapshot().filter(event=>event.kind==='QUARANTINED').length,1);
 }finally{await runtime.close();}
});
test('bounded fingerprint tracking detects full, common encoding and long split fragments without raw storage',()=>{const tracker=new DataFlowTracker();const value='NOT_A_REAL_CREDENTIAL_LONG_FIXTURE';tracker.register('source-A',value);assert.deepEqual(tracker.inspect('body:'+value),['source-A']);assert.deepEqual(tracker.inspect(Buffer.from(value).toString('base64')),['source-A']);assert.deepEqual(tracker.inspect(value.slice(0,16)),['source-A']);assert.deepEqual(tracker.inspect('unrelated normal task'),[]);assert.ok(!JSON.stringify(tracker.snapshot()).includes(value));});
test('dataflow bounded eviction, TTL and session separation',async()=>{const a=new DataFlowTracker(5,2),b=new DataFlowTracker();a.register('A','abcdefghijklmnopABCDEFGHIJKLMNOP');assert.ok(a.snapshot().length<=2);assert.deepEqual(b.inspect('abcdefghijklmnopABCDEFGHIJKLMNOP'),[]);await new Promise(r=>setTimeout(r,12));assert.equal(a.snapshot().length,0);});
