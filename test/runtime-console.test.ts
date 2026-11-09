import {test} from 'node:test';import assert from 'node:assert/strict';import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-console-test-'));
const {startAIConsole}=await import('../src/ai/console.js');
test('3.0 console API preserves CSRF, operator identity, replay control, fail-closed writes and quarantine',async()=>{
 const console=await startAIConsole({port:0,operatorApprovalCode:'FIXTURE_OPERATOR_ONLY'});
 try{
  assert.equal((await fetch(console.url+'/api/runtime3')).status,403);
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  const workbenchResponse=await fetch(console.url+'/workbench/',{headers:{'sec-fetch-mode':'navigate','sec-fetch-dest':'document'}});
  assert.equal(workbenchResponse.status,200);
  assert.match(workbenchResponse.headers.get('content-security-policy')??'',/script-src 'self'/);
  const workbenchHtml=await workbenchResponse.text();
  assert.match(workbenchHtml,new RegExp('<meta name="agent-canary-csrf" content="'+csrf+'">'));
  for(const [name,type] of [
   ['workbench.css','text/css'],['verification.css','text/css'],['evidence-snapshot.js','text/javascript'],
   ['evidence-verifier.js','text/javascript'],['workbench.js','text/javascript'],['verification.js','text/javascript'],
  ]){
   const response=await fetch(console.url+'/workbench/'+name);
   assert.equal(response.status,200,name);
   assert.match(response.headers.get('content-type')??'',new RegExp(type),name);
   const assetRoot=fs.existsSync(path.join(process.cwd(),'dist/ai/workbench/index.html'))?path.join(process.cwd(),'dist/ai/workbench'):path.join(process.cwd(),'docs');
   assert.equal(await response.text(),fs.readFileSync(path.join(assetRoot,name),'utf8'),name);
  }
  assert.equal((await fetch(console.url+'/workbench/verification.js?cache=1',{headers:{'x-canary-csrf':csrf!}})).status,404);
  const get=async()=>{const r=await fetch(console.url+'/api/runtime3',{headers:{'x-canary-csrf':csrf!}});return r.json();};
  const post=async(route:string,body:unknown)=>fetch(console.url+'/api/'+route,{method:'POST',headers:{'x-canary-csrf':csrf!,'content-type':'application/json'},body:JSON.stringify(body)});
  let response=await post('runtime3/action',{action:'write'});assert.equal(response.status,200);let state=await response.json() as any;assert.equal(state.evidence.at(-1).decision,'DENY');assert.equal(state.evidence.at(-1).decision_reason,'write_capability_disabled_pending_path_safe_primitive');assert.equal(state.evidence.at(-1).execution_status,'NOT_STARTED');assert.equal(state.lastResult.error,'GATEWAY_DENY:write_capability_disabled_pending_path_safe_primitive');
  response=await post('runtime3/action',{action:'approval'});const request=(await response.json() as any).pending[0].requestId;
  assert.equal((await post('runtime3/approve',{requestId:request,confirm:true,operatorCode:'MODEL_FORGED'})).status,403);
  assert.equal((await post('runtime3/approve',{requestId:request,confirm:true,operatorCode:'FIXTURE_OPERATOR_ONLY'})).status,200);
  assert.equal((await post('runtime3/approve',{requestId:request,confirm:true,operatorCode:'FIXTURE_OPERATOR_ONLY'})).status,400);
  await post('runtime3/action',{action:'honeypot'});response=await post('runtime3/action',{action:'write'});state=await response.json() as any;
  assert.equal(state.guard,'QUARANTINED');assert.equal(state.evidence.at(-1).decision,'DENY');assert.equal(state.evidence.at(-1).execution_status,'NOT_STARTED');assert.equal(state.chain.valid,true);assert.ok(!(JSON.stringify(await get()) as string).includes('FIXTURE_OPERATOR_ONLY'));
 }finally{await console.close();}
});
