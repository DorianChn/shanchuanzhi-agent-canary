import {test} from 'node:test';import assert from 'node:assert/strict';import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-console-test-'));
const {startAIConsole}=await import('../src/ai/console.js');
test('3.0 console API preserves CSRF, operator identity, replay control and real quarantine',async()=>{
 const console=await startAIConsole({port:0,operatorApprovalCode:'FIXTURE_OPERATOR_ONLY'});
 try{
  assert.equal((await fetch(console.url+'/api/runtime3')).status,403);
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  const get=async()=>{const r=await fetch(console.url+'/api/runtime3',{headers:{'x-canary-csrf':csrf!}});return r.json();};
  const post=async(route:string,body:unknown)=>fetch(console.url+'/api/'+route,{method:'POST',headers:{'x-canary-csrf':csrf!,'content-type':'application/json'},body:JSON.stringify(body)});
  let response=await post('runtime3/action',{action:'write'});assert.equal(response.status,200);assert.equal((await response.json() as any).evidence.at(-1).side_effect_verification,'VERIFIED');
  response=await post('runtime3/action',{action:'approval'});const request=(await response.json() as any).pending[0].requestId;
  assert.equal((await post('runtime3/approve',{requestId:request,confirm:true,operatorCode:'MODEL_FORGED'})).status,403);
  assert.equal((await post('runtime3/approve',{requestId:request,confirm:true,operatorCode:'FIXTURE_OPERATOR_ONLY'})).status,200);
  assert.equal((await post('runtime3/approve',{requestId:request,confirm:true,operatorCode:'FIXTURE_OPERATOR_ONLY'})).status,400);
  await post('runtime3/action',{action:'honeypot'});response=await post('runtime3/action',{action:'write'});const state=await response.json() as any;
  assert.equal(state.guard,'QUARANTINED');assert.equal(state.evidence.at(-1).decision,'DENY');assert.equal(state.evidence.at(-1).execution_status,'NOT_STARTED');assert.equal(state.chain.valid,true);assert.ok(!(JSON.stringify(await get()) as string).includes('FIXTURE_OPERATOR_ONLY'));
 }finally{await console.close();}
});
