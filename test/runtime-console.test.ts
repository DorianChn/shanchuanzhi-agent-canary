import {test} from 'node:test';import assert from 'node:assert/strict';import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
import http from 'node:http';
import {adaptSecuritySnapshot,buildSecurityDiagnostic,classifyDataSourceFailure,explainSecurityEvent,normalizeProtectionStatus,preparePolicyResultForDisplay} from '../src/ai/security-center-adapter.js';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-console-test-'));
const {startAIConsole}=await import('../src/ai/console.js');
test('3.0 console API preserves CSRF, operator identity, replay control and real quarantine',async()=>{
 const console=await startAIConsole({port:0,operatorApprovalCode:'FIXTURE_OPERATOR_ONLY'});
 try{
  assert.equal((await fetch(console.url+'/api/runtime3')).status,403);
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  for(const route of ['security-center','e4/status'])assert.equal((await fetch(console.url+'/api/'+route,{headers:{'x-canary-csrf':csrf!}})).status,404);
  assert.match(html,/Agent Canary 安全控制中心/);assert.match(html,/自动 E4 测试入口/);assert.match(html,/PARTIALLY_PROTECTED/);assert.match(html,/security-center/);assert.match(html,/currentPolicyScopeDetail/);assert.match(html,/canaryIsolationScopeDetail/);assert.match(html,/Console 虚拟执行器策略/);assert.match(html,/受控 Runtime 示例 Guard/);assert.match(html,/显式 DENY 和 SENSITIVE_DATA 仍会拒绝/);assert.match(html,/preparePolicyResultForDisplay/);assert.match(html,/POLICY_CONFLICT/);assert.match(html,/catch\(e\)\{status\('policyStatus',warning\|\|e\.message,true\);\}/);assert.match(html,/policyResult/);
  assert.match(html,/const readable=\['state','agents','policyState','runtime3'\]\.filter\(k=>securitySources\[k\]==='AVAILABLE'\)\.length/);
  assert.match(html,/readable\+'\/4 个已有只读接口可读/);
  const get=async()=>{const r=await fetch(console.url+'/api/runtime3',{headers:{'x-canary-csrf':csrf!}});return r.json();};
  const policyResponse=await fetch(console.url+'/api/policy/state',{headers:{'x-canary-csrf':csrf!}});assert.equal(policyResponse.status,200);const policyState=await policyResponse.json() as any;assert.equal(policyState.mode,'BALANCED');assert.match(policyState.scope,/VIRTUAL_EXECUTORS/);
  const runtimeState=await get() as any;assert.equal(runtimeState.mode,'DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL');assert.equal(runtimeState.agent,'controlled-sdk-demo');assert.equal(runtimeState.guard,'SAFE');
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

test('missing live security and E4 providers stay unavailable behind the existing Host/Origin/CSRF boundary',async()=>{
 const console=await startAIConsole({port:0});
 try{
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  for(const route of ['security-center','e4/status']){
   assert.equal((await fetch(console.url+'/api/'+route)).status,403,route+' must still require CSRF');
   assert.equal((await fetch(console.url+'/api/'+route,{headers:{'x-canary-csrf':csrf!}})).status,404,route+' has no authoritative provider');
   assert.equal((await fetch(console.url+'/api/'+route,{headers:{'x-canary-csrf':csrf!,origin:'https://attacker.example'}})).status,403,route+' must reject cross-origin reads');
   const mismatchedHostStatus=await new Promise<number>((resolve,reject)=>{const request=http.request(new URL('/api/'+route,console.url),{method:'GET',headers:{'x-canary-csrf':csrf!,host:'attacker.example'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode??0));});request.on('error',reject);request.end();});
   assert.equal(mismatchedHostStatus,403,route+' must reject a mismatched Host');
  }
  const unknown=adaptSecuritySnapshot({});
  assert.equal(unknown.protectionStatus,'UNKNOWN');assert.equal(unknown.gateway.protectionStatus,'UNKNOWN');
  assert.equal(unknown.hook.protectionStatus,'UNKNOWN');assert.equal(unknown.canaryIsolation.protectionStatus,'UNKNOWN');
  const diagnostic=buildSecurityDiagnostic(unknown,{securityCenter:'UNSUPPORTED',e4:'UNSUPPORTED'});
  assert.equal(diagnostic.protection.overall,'UNKNOWN');assert.equal(diagnostic.dataSources.securityCenter,'UNSUPPORTED');assert.equal(diagnostic.dataSources.e4,'UNSUPPORTED');
 }finally{await console.close();}
});


test('security-center adapter keeps absent backend data UNKNOWN and ignores demo install claims',()=>{
 const view=adaptSecuritySnapshot({
  state:{events:[{ts:'2026-10-13T00:00:00.000Z',kind:'action_blocked',reason:'token=cnry_secret',toolName:'read_file',args:{token:'cnry_secret'},path:'C:\\private'}]},
  agents:{agents:[{agent:'cursor',detected:true,status:'PARTIAL',protectionStatus:'PROTECTED'},{agent:'codex',detected:false,status:'PARTIAL'},{agent:'custom',detected:true}]},
  securityCenter:null,
 });
 assert.equal(view.protectionStatus,'UNKNOWN');assert.equal(view.gateway.protectionStatus,'UNKNOWN');assert.equal(view.gateway.connectionStatus,'UNKNOWN');
 assert.equal(view.hook.protectionStatus,'UNKNOWN');assert.equal(view.canaryIsolation.protectionStatus,'UNKNOWN');assert.equal(view.policy.protectionStatus,'UNKNOWN');
 assert.deepEqual(view.consoleSandboxPolicy,{mode:null,scope:null});assert.deepEqual(view.runtimeDemo,{guard:null,scope:null});
 assert.equal(view.protectedToolCount,null);assert.equal(view.unprotectedExecutionPaths,null);
 assert.deepEqual(view.agents.map(agent=>[agent.agent,agent.detected,agent.protectionStatus]),[['cursor',true,'UNKNOWN'],['codex',false,'UNKNOWN']]);
 assert.equal(view.events.length,1);assert.equal(view.events[0].reason,'[REDACTED]');
 assert.equal(JSON.stringify(view).includes('args'),false);assert.equal(JSON.stringify(view).includes('C:\\private'),false);
 assert.equal(normalizeProtectionStatus('PARTIAL'),'UNKNOWN');assert.equal(normalizeProtectionStatus('protected'),'UNKNOWN');
});

test('existing policy and Runtime APIs are shown only within their backend-declared demo scope',()=>{
 const view=adaptSecuritySnapshot({
  policyState:{mode:'BALANCED',guardState:'SAFE',scope:'VIRTUAL_EXECUTORS; optional actual local AI review; not global host mode'},
  runtime3:{mode:'DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL',agent:'controlled-sdk-demo',coverage:'REGISTERED_CAPABILITIES_ONLY',guard:'QUARANTINED'},
 });
 assert.equal(view.consoleSandboxPolicy.mode,'BALANCED');assert.equal(view.consoleSandboxPolicy.scope,'VIRTUAL_EXECUTORS');
 assert.equal(view.runtimeDemo.guard,'QUARANTINED');assert.equal(view.runtimeDemo.scope,'REGISTERED_CAPABILITIES_ONLY');
 assert.equal(view.protectionStatus,'UNKNOWN');assert.equal(view.policy.protectionStatus,'UNKNOWN');assert.equal(view.canaryIsolation.protectionStatus,'UNKNOWN');
 const malformed=adaptSecuritySnapshot({policyState:{mode:'STRICT',scope:'GLOBAL_AGENT_POLICY'},runtime3:{mode:'DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL',agent:'other-agent',coverage:'REGISTERED_CAPABILITIES_ONLY',guard:'QUARANTINED'}});
 assert.equal(malformed.consoleSandboxPolicy.mode,null);assert.equal(malformed.runtimeDemo.guard,null);
 const report=buildSecurityDiagnostic(view,{state:'AVAILABLE',agents:'AVAILABLE',policyState:'AVAILABLE',runtime3:'AVAILABLE',securityCenter:'UNSUPPORTED',e4:'UNSUPPORTED'},'2026-10-13T00:00:00.000Z');
 assert.deepEqual(report.localConsole,{sandboxPolicyMode:'BALANCED',sandboxPolicyScope:'VIRTUAL_EXECUTORS',runtimeDemoGuard:'QUARANTINED',runtimeDemoScope:'REGISTERED_CAPABILITIES_ONLY'});
 assert.equal(report.protection.overall,'UNKNOWN');assert.equal(report.dataSources.policyState,'AVAILABLE');assert.equal(report.dataSources.runtime3,'AVAILABLE');
});

test('security-center adapter accepts only exact live statuses and exports a redacted diagnostic',()=>{
 const view=adaptSecuritySnapshot({
  state:{events:[{ts:'2026-10-13T00:00:00.000Z',kind:'action_blocked',reason:'token=cnry_secret',args:{token:'cnry_secret'},path:'C:\\private'}]},
  agents:{agents:[]},
  securityCenter:{
   protectionStatus:'PARTIALLY_PROTECTED',
   gateway:{protectionStatus:'PROTECTED',connectionStatus:'CONNECTED'},
   hook:{protectionStatus:'NOT_PROTECTED'},
   canaryIsolation:{protectionStatus:'UNKNOWN'},
   policy:{name:'strict-runtime',protectionStatus:'PARTIALLY_PROTECTED'},
   protectedToolCount:3,unprotectedExecutionPaths:['C:\\unsafe\\tool.exe'],
   agents:[{agent:'cursor',detected:true,connectionStatus:'CONNECTED',protectionStatus:'PROTECTED'}],
  },
 });
 assert.equal(view.protectionStatus,'PARTIALLY_PROTECTED');assert.equal(view.gateway.protectionStatus,'PROTECTED');
 assert.equal(view.hook.protectionStatus,'NOT_PROTECTED');assert.equal(view.policy.name,'strict-runtime');
 assert.equal(view.protectedToolCount,3);assert.equal(view.unprotectedExecutionPaths.length,1);
 assert.equal(view.agents[0].protectionStatus,'PROTECTED');
 assert.match(explainSecurityEvent(view.events[0]),/后端原因：\[REDACTED\]/);
 const report=buildSecurityDiagnostic(view,{state:'AVAILABLE',agents:'AVAILABLE',policyState:'AVAILABLE',runtime3:'AVAILABLE',securityCenter:'AVAILABLE',e4:'UNSUPPORTED'},'2026-10-13T00:00:00.000Z');
 const json=JSON.stringify(report);
 assert.equal(report.protection.unprotectedExecutionPathCount,1);
 assert.equal(json.includes('cnry_secret'),false);assert.equal(json.includes('C:\\private'),false);assert.equal(json.includes('C:\\unsafe'),false);assert.equal(json.includes('token='),false);
 assert.equal(report.dataSources.e4,'UNSUPPORTED');
});

test('security-center data-source failures preserve timeout, permission, missing route, and malformed response',()=>{
 assert.equal(classifyDataSourceFailure(undefined,'AbortError'),'TIMEOUT');
 assert.equal(classifyDataSourceFailure(403,'Error'),'PERMISSION_DENIED');
 assert.equal(classifyDataSourceFailure(404,'Error'),'UNSUPPORTED');
 assert.equal(classifyDataSourceFailure(undefined,'InvalidResponseError'),'INVALID_RESPONSE');
 assert.equal(classifyDataSourceFailure(503,'Error'),'UNAVAILABLE');
});

test('diagnostic distinguishes an empty audit feed from an unavailable source',()=>{
 const available=buildSecurityDiagnostic(adaptSecuritySnapshot({state:{events:[]}}),{state:'AVAILABLE'});
 assert.equal(available.eventCount,0);assert.deepEqual(available.events,[]);

 const unavailable=buildSecurityDiagnostic(adaptSecuritySnapshot({}),{state:'UNSUPPORTED'});
 assert.equal(unavailable.eventCount,null);assert.equal(unavailable.events,null);
 assert.equal(unavailable.dataSources.state,'UNSUPPORTED');
});

test('OBSERVE denial, sensitive-data allow, and Guard quarantine are not rendered as successful policy results',()=>{
 const denied=preparePolicyResultForDisplay({mode:'OBSERVE',status:'DENY',guardState:'SAFE',decision:{action:'DENY',mode:'OBSERVE',risks:['SENSITIVE_DATA']}});
 assert.equal(denied.status,'DENY');assert.equal(denied.displayWarning,undefined);

 const staleObserveResult=preparePolicyResultForDisplay({mode:'OBSERVE',status:'EXECUTED',guardState:'SAFE',callbacks:1,events:[{kind:'policy_allowed',metadata:{mode:'OBSERVE',action:'ALLOW',risks:'SENSITIVE_DATA'}}]});
 assert.equal(staleObserveResult.status,'POLICY_CONFLICT');assert.equal(staleObserveResult.backendReportedStatus,'EXECUTED');
 assert.match(staleObserveResult.displayWarning,/不能视为允许或安全/);assert.equal(staleObserveResult.callbacks,1);

 const contradictoryDenial=preparePolicyResultForDisplay({mode:'OBSERVE',status:'ALLOW',decision:{action:'DENY',mode:'OBSERVE',risks:['SENSITIVE_DATA']}});
 assert.equal(contradictoryDenial.status,'POLICY_CONFLICT');assert.equal(contradictoryDenial.backendReportedStatus,'ALLOW');

 const quarantined=preparePolicyResultForDisplay({mode:'OBSERVE',status:'BLOCKED_BY_GUARD',guardState:'QUARANTINED',decision:{action:'DENY',mode:'OBSERVE',risks:['READ_ONLY']}});
 assert.equal(quarantined.status,'BLOCKED_BY_GUARD');assert.equal(quarantined.guardState,'QUARANTINED');assert.equal(quarantined.displayWarning,undefined);

 const contradictoryQuarantine=preparePolicyResultForDisplay({mode:'OBSERVE',status:'ALLOW',guardState:'QUARANTINED'});
 assert.equal(contradictoryQuarantine.status,'POLICY_CONFLICT');assert.equal(contradictoryQuarantine.backendReportedStatus,'ALLOW');
});
