import {test} from 'node:test';import assert from 'node:assert/strict';import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
import {spawnSync} from 'node:child_process';
import http from 'node:http';
import {Script} from 'node:vm';
import {adaptSecuritySnapshot,buildSecurityDiagnostic,classifyDataSourceFailure,explainSecurityEvent,isValidSecurityCenterStatusPayload,normalizeProtectionStatus,preparePolicyResultForDisplay} from '../src/ai/security-center-adapter.js';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-console-test-'));
const {startAIConsole}=await import('../src/ai/console.js');
test('desktop branch native hook audit log omits synthetic sensitive canaries',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'canary-m4-hook-log-'));
 try{
  const wrapper=path.resolve('security-lab/claude-native-hook.mjs'),modulePath=path.join(temp,'hook-module.mjs'),log=path.join(temp,'hook.jsonl');
  const canaries=['M4_SENSITIVE_SESSION_CANARY','M4_SENSITIVE_TOOL_CANARY','M4_SENSITIVE_ARGUMENT_CANARY','M4_SENSITIVE_PATH_CANARY','M4_SENSITIVE_REASON_CANARY'];
  const decision={hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'ask',permissionDecisionReason:canaries[4]}};
  fs.writeFileSync(modulePath,`export async function decideAgentHook(){return ${JSON.stringify(decision)}}\n`);
  const input={session_id:canaries[0],tool_name:canaries[1],tool_input:{command:canaries[2],file_path:canaries[3]}};
  const result=spawnSync(process.execPath,[wrapper,modulePath,temp,path.join(temp,'state'),log],{input:JSON.stringify(input),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision,'ask');
  const contents=fs.readFileSync(log,'utf8').trim();
  for(const canary of canaries)assert.equal(contents.includes(canary),false,'sensitive canary persisted: '+canary);
  const record=JSON.parse(contents);
  assert.deepEqual(Object.keys(record).sort(),['hookEventName','permissionDecision','timestamp']);
  assert.equal(record.hookEventName,'PreToolUse');assert.equal(record.permissionDecision,'ask');
  assert.ok(Number.isFinite(Date.parse(record.timestamp)));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('3.0 console API preserves CSRF, operator identity, replay control and real quarantine',async()=>{
 const console=await startAIConsole({port:0,operatorApprovalCode:'FIXTURE_OPERATOR_ONLY'});
 try{
  assert.equal((await fetch(console.url+'/api/runtime3')).status,403);
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  const securityCenterResponse=await fetch(console.url+'/api/security-center',{headers:{'x-canary-csrf':csrf!}});assert.ok([200,404].includes(securityCenterResponse.status));if(securityCenterResponse.status===200){const snapshot=await securityCenterResponse.json() as any;assert.equal(snapshot.protectionStatus,'UNKNOWN');assert.equal(snapshot.gateway.protectionStatus,'UNKNOWN');}
  assert.equal((await fetch(console.url+'/api/e4/status',{headers:{'x-canary-csrf':csrf!}})).status,404);
  assert.match(html,/Agent Canary 安全控制中心/);assert.match(html,/自动 E4 测试入口/);assert.match(html,/PARTIALLY_PROTECTED/);assert.match(html,/security-center/);assert.match(html,/currentPolicyScopeDetail/);assert.match(html,/canaryIsolationScopeDetail/);assert.match(html,/Console 虚拟执行器策略/);assert.match(html,/受控 Runtime 示例 Guard/);assert.match(html,/显式 DENY 和 SENSITIVE_DATA 仍会拒绝/);assert.match(html,/preparePolicyResultForDisplay/);assert.match(html,/POLICY_CONFLICT/);assert.match(html,/catch\(e\)\{status\('policyStatus',warning\|\|e\.message,true\);\}/);assert.match(html,/policyResult/);
  assert.match(html,/id="nativeCodexShellBoundary"[^>]*role="note"/);assert.match(html,/id="nativeCodexShellStatus" class="security-status" data-status="NOT_PROTECTED">UNPROTECTED \/ BLOCKED_NOT_VERIFIED<\/span>/);assert.match(html,/尚未完成 Codex 原生 Shell 路径的端到端验证，也未控制该路径/);assert.match(html,/MCP 或 Gateway 中受保护的回调不代表原生 Shell 已受保护/);
  assert.match(html,/id="firstPartyObserveReadStatus" class="security-status" data-status="UNKNOWN">NOT_VERIFIED · 未验证<\/strong>/);assert.match(html,/GET \/api\/security-center 仅返回状态，不执行文件读取/);assert.match(html,/M3 的 POST \/api\/security-center\/protected-read 是独立的固定临时标记探针；本页面不调用或读取其结果/);assert.match(html,/该探针不证明用户文件或原生宿主路径已受保护/);assert.match(html,/MCP 探针、Gateway 绑定状态、Runtime 临时文件演示和虚拟策略读取也不能替代此验证/);
  assert.match(html,/securityCenterAdapter\.isValidSecurityCenterStatusPayload\(data\)/);assert.match(html,/id="securityCoverage"/);assert.match(html,/UNKNOWN 不代表已保护或未保护/);
  const clientScripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);assert.ok(clientScripts.length);assert.doesNotMatch(clientScripts.join('\n'),/security-center\/protected-read/i,'the Security Center must not invoke the fixed temporary-marker probe');
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

test('security and E4 status stay unknown or unavailable behind the existing Host/Origin/CSRF boundary',async()=>{
 const console=await startAIConsole({port:0});
 try{
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  for(const route of ['security-center','e4/status']){
   assert.equal((await fetch(console.url+'/api/'+route)).status,403,route+' must still require CSRF');
   const response=await fetch(console.url+'/api/'+route,{headers:{'x-canary-csrf':csrf!}});
   if(route==='security-center'){
    assert.ok([200,404].includes(response.status),'route may be absent or exposed by M3');
    if(response.status===200){const snapshot=await response.json() as any;assert.equal(snapshot.protectionStatus,'UNKNOWN');assert.equal(snapshot.gateway.protectionStatus,'UNKNOWN');}
   }else assert.equal(response.status,404,route+' has no authoritative provider');
   assert.equal((await fetch(console.url+'/api/'+route,{headers:{'x-canary-csrf':csrf!,origin:'https://attacker.example'}})).status,403,route+' must reject cross-origin reads');
   const mismatchedHostStatus=await new Promise<number>((resolve,reject)=>{const request=http.request(new URL('/api/'+route,console.url),{method:'GET',headers:{'x-canary-csrf':csrf!,host:'attacker.example'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode??0));});request.on('error',reject);request.end();});
   assert.equal(mismatchedHostStatus,403,route+' must reject a mismatched Host');
  }
  const unknown=adaptSecuritySnapshot({});
  assert.equal(unknown.protectionStatus,'UNKNOWN');assert.equal(unknown.gateway.protectionStatus,'UNKNOWN');
  assert.equal(unknown.firstPartyObserveReadStatus,'NOT_VERIFIED');
  assert.equal(unknown.hook.protectionStatus,'UNKNOWN');assert.equal(unknown.canaryIsolation.protectionStatus,'UNKNOWN');
  const diagnostic=buildSecurityDiagnostic(unknown,{securityCenter:'UNSUPPORTED',e4:'UNSUPPORTED'});
  assert.equal(diagnostic.protection.overall,'UNKNOWN');assert.equal(diagnostic.dataSources.securityCenter,'UNSUPPORTED');assert.equal(diagnostic.dataSources.e4,'UNSUPPORTED');
  assert.equal(diagnostic.protection.firstPartyObserveRead,'NOT_VERIFIED');
 }finally{await console.close();}
});

test('protected-read rejects caller-supplied lexical, junction, and replacement paths before host dependencies',async()=>{
 const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'canary-m4-protected-read-boundary-'));
 const workspace=path.join(fixtureRoot,'workspace'),outside=path.join(fixtureRoot,'outside');
 fs.mkdirSync(workspace);fs.mkdirSync(outside);
 const target=path.join(outside,'private.txt'),replacement=path.join(outside,'private.txt.replacement');
 const alias=path.join(workspace,'outside-alias');
 fs.writeFileSync(target,'UNCHANGED_PRIVATE_FIXTURE');fs.writeFileSync(replacement,'UNCHANGED_REPLACEMENT_FIXTURE');
 fs.symlinkSync(outside,alias,process.platform==='win32'?'junction':'dir');
 const targetIdentity=fs.statSync(target),replacementIdentity=fs.statSync(replacement);
 let protectedReadDependencyLoads=0;
 const app=await startAIConsole({
  port:0,operatorApprovalCode:'FIXTURE_OPERATOR_ONLY',
  securityCenterProtectedReadDependencies:async()=>{protectedReadDependencyLoads++;throw new Error('invalid request must stop before Host dependencies');},
 });
 try{
  const html=await (await fetch(app.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  const requests=[
   {path:'./agent-canary-public.txt'},
   {path:path.join(alias,'private.txt')},
   {path:'agent-canary-public.txt.replacement'},
  ];
  for(const body of requests){
   const response=await fetch(app.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf!,'x-canary-operator-code':'FIXTURE_OPERATOR_ONLY'},body:JSON.stringify(body)});
   assert.equal(response.status,400);
   assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'REQUEST_INVALID',markerMatched:false});
   assert.equal(protectedReadDependencyLoads,0,'caller-controlled paths must be rejected before the Host/M1/M2/M5 composition loads');
  }
  assert.equal(fs.readFileSync(target,'utf8'),'UNCHANGED_PRIVATE_FIXTURE');
  assert.equal(fs.readFileSync(replacement,'utf8'),'UNCHANGED_REPLACEMENT_FIXTURE');
  assert.deepEqual([fs.statSync(target).dev,fs.statSync(target).ino],[targetIdentity.dev,targetIdentity.ino]);
  assert.deepEqual([fs.statSync(replacement).dev,fs.statSync(replacement).ino],[replacementIdentity.dev,replacementIdentity.ino]);
  assert.equal(fs.realpathSync(alias),fs.realpathSync(outside),'the junction/symlink fixture itself must remain unchanged');
 }finally{await app.close();fs.rmSync(fixtureRoot,{recursive:true,force:true});}
});

test('missing security-center provider leaves UI protection UNKNOWN whether the status route is absent or present',async()=>{
 const console=await startAIConsole({port:0});
 try{
  const html=await (await fetch(console.url)).text(),csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  const response=await fetch(console.url+'/api/security-center',{headers:{'x-canary-csrf':csrf!}});
  let source:'AVAILABLE'|'UNSUPPORTED'='UNSUPPORTED',securityCenter:null|unknown=null;
  if(response.status===200){source='AVAILABLE';securityCenter=await response.json();const snapshot=securityCenter as any;assert.equal(snapshot.protectionStatus,'UNKNOWN');assert.equal(snapshot.gateway.protectionStatus,'UNKNOWN');}
  else assert.equal(response.status,404,'the route may be absent on M4 or return UNKNOWN without a provider on M3');
  if(response.status===404)assert.equal(classifyDataSourceFailure(response.status,'Error'),'UNSUPPORTED');
  const view=adaptSecuritySnapshot({securityCenter});
  assert.deepEqual([
   view.protectionStatus,view.gateway.protectionStatus,view.hook.protectionStatus,
   view.canaryIsolation.protectionStatus,view.policy.protectionStatus,
  ],['UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN','UNKNOWN']);
  assert.equal(view.protectedToolCount,null);assert.equal(view.unprotectedExecutionPaths,null);
  const diagnostic=buildSecurityDiagnostic(view,{securityCenter:source});
  assert.equal(diagnostic.protection.overall,'UNKNOWN');
  assert.equal(diagnostic.dataSources.securityCenter,source);

  assert.match(html,/id="overallProtectionStatus"[^>]*data-status="UNKNOWN"[^>]*>UNKNOWN/);
  assert.match(html,/id="gatewayProtectionStatus"[^>]*data-status="UNKNOWN"[^>]*>UNKNOWN/);
  assert.match(html,/id="hookProtectionStatus"[^>]*data-status="UNKNOWN"[^>]*>UNKNOWN/);
  assert.match(html,/id="canaryIsolationStatus"[^>]*data-status="UNKNOWN"[^>]*>UNKNOWN/);
  assert.match(html,/id="currentPolicyStatus"[^>]*data-status="UNKNOWN"[^>]*>UNKNOWN/);
  assert.match(html,/function renderSecurityCenter\(\)\{[\s\S]*?setProtectionNode\('overallProtectionStatus',securitySnapshot\.protectionStatus\)/);
  assert.match(html,/securitySnapshot=securityCenterAdapter\.adaptSecuritySnapshot\(values\)/);
 }finally{await console.close();}
});

test('security endpoint availability is visible without claiming protection or E4 completion',async()=>{
 const app=await startAIConsole({port:0});
 try{
  const html=await (await fetch(app.url)).text();
  assert.match(html,/后端状态接口可用性/);
  assert.match(html,/id="securityCenterSourceStatus" class="security-status" data-status="UNKNOWN">UNKNOWN · 未知<\/strong>/);
  assert.match(html,/id="e4SourceStatus" class="security-status" data-status="UNKNOWN">UNKNOWN · 未知<\/strong>/);
  const start=html.indexOf('function renderSecurityEndpointAvailability(){');
  const end=html.indexOf('async function securityGet',start);
  assert.ok(start>=0&&end>start,'the served UI should include its endpoint availability renderer');
  const elements=new Map<string,{dataset:Record<string,string>,textContent:string}>();
  for(const id of ['securityCenterSourceStatus','securityCenterSourceDetail','e4SourceStatus','e4SourceDetail'])elements.set(id,{dataset:{},textContent:''});
  const sourceText:Record<string,string>={UNSUPPORTED:'未实现',AVAILABLE:'可读取',UNKNOWN:'未知'};
  const script=html.slice(start,end)+'renderSecurityEndpointAvailability();';
  const run=(states:Record<string,string>)=>new Script(script).runInNewContext({
   securitySources:states,
   sourceStateLabel:(state:string)=>sourceText[state]||'未知',
   getEl:(id:string)=>elements.get(id),
  });
  run({securityCenter:'UNSUPPORTED',e4:'UNSUPPORTED'});
  assert.equal(elements.get('securityCenterSourceStatus')?.dataset.status,'UNSUPPORTED');
  assert.equal(elements.get('securityCenterSourceStatus')?.textContent,'UNSUPPORTED · 未实现');
  assert.match(elements.get('securityCenterSourceDetail')?.textContent||'',/防护字段保持 UNKNOWN/);
  assert.equal(elements.get('e4SourceStatus')?.dataset.status,'UNSUPPORTED');
  assert.equal(elements.get('e4SourceStatus')?.textContent,'UNSUPPORTED · 未实现');
  assert.match(elements.get('e4SourceDetail')?.textContent||'',/E4 运行结果仍为 UNKNOWN/);
  run({securityCenter:'AVAILABLE',e4:'AVAILABLE'});
  assert.match(elements.get('securityCenterSourceDetail')?.textContent||'',/未返回的防护字段保持 UNKNOWN/);
  assert.match(elements.get('e4SourceDetail')?.textContent||'',/不代表 E4 已运行或通过/);
  assert.equal(adaptSecuritySnapshot({}).protectionStatus,'UNKNOWN');
 }finally{await app.close();}
});


test('configured-target read stays disabled without a trusted host target ID and never treats ALLOW as product acceptance',async()=>{
 const app=await startAIConsole({port:0});
 try{
  const html=await (await fetch(app.url)).text();
  const panel=html.match(/<section id="configuredTargetReadPanel"[\s\S]*?<\/section>/)?.[0];
  assert.ok(panel,'the configured-target operation must have a visible, separate boundary');
  assert.match(panel,/<button id="configuredTargetReadButton"[^>]*\sdisabled\s[^>]*aria-describedby="configuredTargetReadBlocker"/);
  assert.match(panel,/未获得宿主确认的固定目标 ID/);
  assert.match(panel,/POST \/api\/security-center\/target-read/);
  assert.match(panel,/契约范围：<code>M3_CONFIGURED_TARGET_READ<\/code>/);
  assert.match(panel,/data-status="UNKNOWN"[^>]*>UNKNOWN · 未执行；实测范围 UNKNOWN/);
  assert.match(panel,/完整产品、原生工具和 OS 原子保护仍为 NOT_VERIFIED/);
  assert.doesNotMatch(panel,/<(?:input|select|textarea|pre)\b/i,'no caller path, content, target ID or credential is collected while configuration is unavailable');
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).join('\n');
  assert.doesNotMatch(scripts,/configuredTargetReadButton|security-center\/target-read|security-center\/protected-read/,'loading or refreshing the UI must not guess a target or invoke either read action');

  // A route result is not a status snapshot or evidence of native/product coverage.
  const routeResult={scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW',targetId:'M4_TARGET_ID_CANARY',content:'M4_FILE_CONTENT_CANARY'};
  const snapshot=adaptSecuritySnapshot({securityCenter:routeResult});
  assert.equal(snapshot.protectionStatus,'UNKNOWN');
  assert.equal(snapshot.firstPartyObserveReadStatus,'NOT_VERIFIED');
  const diagnostic=JSON.stringify(buildSecurityDiagnostic(snapshot,{}));
  assert.doesNotMatch(diagnostic,/M4_TARGET_ID_CANARY|M4_FILE_CONTENT_CANARY/);
 }finally{await app.close();}
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
 assert.equal(view.coverage,'UNKNOWN');
 assert.deepEqual(view.agents.map(agent=>[agent.agent,agent.detected,agent.protectionStatus]),[['cursor',true,'UNKNOWN'],['codex',false,'UNKNOWN']]);
 assert.equal(view.events.length,1);assert.equal(view.events[0].reason,'[REDACTED]');
 assert.equal(JSON.stringify(view).includes('args'),false);assert.equal(JSON.stringify(view).includes('C:\\private'),false);
 assert.equal(normalizeProtectionStatus('PARTIAL'),'UNKNOWN');assert.equal(normalizeProtectionStatus('protected'),'UNKNOWN');
});

test('Gateway status and an exact M3 fixed-probe PASS do not verify a first-party OBSERVE consumer',()=>{
 const view=adaptSecuritySnapshot({
  securityCenter:{protectionStatus:'PARTIALLY_PROTECTED',gateway:{protectionStatus:'PROTECTED',connectionStatus:'CONNECTED'},hook:{protectionStatus:'UNKNOWN'},canaryIsolation:{protectionStatus:'UNKNOWN'},policy:{name:'M2_FIXED_FILE_READS',protectionStatus:'PROTECTED'},protectedToolCount:1,unprotectedExecutionPaths:null,coverage:'M2_FIXED_FILE_READS_ONLY',firstPartyObserveReadStatus:'PROTECTED',observeRead:{status:'PROTECTED',successfulReads:1,negativeCases:4},protectedReadProbe:{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'PASS',reason:'FIXED_PROBE_CONTROLS_PASSED',markerMatched:true}},
  runtime3:{mode:'DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL',agent:'controlled-sdk-demo',coverage:'REGISTERED_CAPABILITIES_ONLY',guard:'SAFE'},
  policyState:{mode:'OBSERVE',scope:'VIRTUAL_EXECUTORS'},
 });
 assert.equal(view.protectionStatus,'PARTIALLY_PROTECTED','retain M3 scoped overall status');
 assert.equal(view.gateway.protectionStatus,'PROTECTED','show the backend-reported Gateway binding status faithfully');
 assert.equal(view.runtimeDemo.scope,'REGISTERED_CAPABILITIES_ONLY');
 assert.equal(view.consoleSandboxPolicy.scope,'VIRTUAL_EXECUTORS');
 assert.equal(view.firstPartyObserveReadStatus,'NOT_VERIFIED','binding health and demos do not establish a Console consumer callsite');
 const diagnostic=buildSecurityDiagnostic(view,{securityCenter:'AVAILABLE'});
 assert.equal(diagnostic.protection.firstPartyObserveRead,'NOT_VERIFIED','status-provider claims cannot promote the first-party read indicator');
 assert.equal(JSON.stringify(diagnostic).includes('successfulReads'),false,'provider-supplied read claims are not copied into diagnostic evidence');
 assert.equal(JSON.stringify(diagnostic).includes('M3_FIXED_TEMP_PROBE_ONLY'),false,'the actual fixed-temp probe envelope is not product-file evidence and is not exported as such');
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
   coverage:'M2_FIXED_FILE_READS_ONLY',
   gateway:{protectionStatus:'PROTECTED',connectionStatus:'CONNECTED'},
   hook:{protectionStatus:'NOT_PROTECTED'},
   canaryIsolation:{protectionStatus:'UNKNOWN'},
   policy:{name:'strict-runtime',protectionStatus:'PARTIALLY_PROTECTED'},
   protectedToolCount:3,unprotectedExecutionPaths:['C:\\unsafe\\tool.exe','D:\\private\\secret.txt?token=cnry_supersecret','--argument=PRIVATE_ARGUMENT'],
   agents:[{agent:'cursor',detected:true,connectionStatus:'CONNECTED',protectionStatus:'PROTECTED'}],
  },
 });
 assert.equal(view.protectionStatus,'PARTIALLY_PROTECTED');assert.equal(view.gateway.protectionStatus,'PROTECTED');
 assert.equal(view.coverage,'M2_FIXED_FILE_READS_ONLY');
 assert.equal(view.hook.protectionStatus,'NOT_PROTECTED');assert.equal(view.policy.name,'strict-runtime');
 assert.equal(view.protectedToolCount,3);assert.deepEqual(view.unprotectedExecutionPaths,['UNPROTECTED_EXECUTION_PATH','UNPROTECTED_EXECUTION_PATH','UNPROTECTED_EXECUTION_PATH']);
 const snapshotJson=JSON.stringify(view);
 for(const sensitive of ['C:\\unsafe','D:\\private','cnry_supersecret','PRIVATE_ARGUMENT','--argument='])assert.equal(snapshotJson.includes(sensitive),false,'sensitive execution-path detail leaked: '+sensitive);
 assert.equal(view.agents[0].protectionStatus,'PROTECTED');
 assert.match(explainSecurityEvent(view.events[0]),/后端原因：\[REDACTED\]/);
 const report=buildSecurityDiagnostic(view,{state:'AVAILABLE',agents:'AVAILABLE',policyState:'AVAILABLE',runtime3:'AVAILABLE',securityCenter:'AVAILABLE',e4:'UNSUPPORTED'},'2026-10-13T00:00:00.000Z');
 const json=JSON.stringify(report);
 assert.equal(report.protection.unprotectedExecutionPathCount,3);
 assert.equal(report.protection.coverage,'M2_FIXED_FILE_READS_ONLY');
 assert.equal(json.includes('cnry_secret'),false);assert.equal(json.includes('C:\\private'),false);assert.equal(json.includes('C:\\unsafe'),false);assert.equal(json.includes('D:\\private'),false);assert.equal(json.includes('cnry_supersecret'),false);assert.equal(json.includes('PRIVATE_ARGUMENT'),false);assert.equal(json.includes('token='),false);
 assert.equal(report.dataSources.e4,'UNSUPPORTED');
});

test('security-center consumer validates status-only payloads and never promotes unknown or partial coverage to PROTECTED',()=>{
 assert.equal(isValidSecurityCenterStatusPayload({}),false);
 assert.equal(isValidSecurityCenterStatusPayload([]),false);
 assert.equal(isValidSecurityCenterStatusPayload({protectionStatus:'PARTIAL'}),false);
 assert.equal(isValidSecurityCenterStatusPayload({protectedToolCount:-1}),false);
 assert.equal(isValidSecurityCenterStatusPayload({unprotectedExecutionPaths:['safe-id',7]}),false);

 const partial={
  protectionStatus:'PROTECTED',coverage:'M2_FIXED_FILE_READS_ONLY',
  gateway:{protectionStatus:'PROTECTED',connectionStatus:'CONNECTED'},
  hook:{protectionStatus:'UNKNOWN'},canaryIsolation:{protectionStatus:'UNKNOWN'},
  policy:{protectionStatus:'UNKNOWN',name:'C:\\Users\\private\\secret.txt --key=PRIVATE_ARGUMENT'},protectedToolCount:1,
  unprotectedExecutionPaths:['C:\\Users\\private\\secret.txt?token=cnry_private','--argument=PRIVATE_ARGUMENT'],
  agents:[{agent:'codex',detected:true,connectionStatus:'CONNECTED',protectionStatus:'UNKNOWN'}],
 };
 assert.equal(isValidSecurityCenterStatusPayload(partial),true);
 const view=adaptSecuritySnapshot({securityCenter:partial});
 assert.equal(view.protectionStatus,'UNKNOWN','a partial read-only coverage report cannot claim overall protection');
 assert.equal(view.coverage,'M2_FIXED_FILE_READS_ONLY');
 assert.equal(view.gateway.protectionStatus,'PROTECTED','a scoped component result remains attributed only to Gateway');
 assert.equal(view.policy.name,'CUSTOM_POLICY','free-form policy names are not rendered as paths or arguments');
 assert.deepEqual(view.unprotectedExecutionPaths,['UNPROTECTED_EXECUTION_PATH','UNPROTECTED_EXECUTION_PATH']);
 const serialized=JSON.stringify(view);
 for(const sensitive of ['C:\\Users','secret.txt','cnry_private','PRIVATE_ARGUMENT','--argument=','--key='])assert.equal(serialized.includes(sensitive),false);

 const scopeFree=adaptSecuritySnapshot({securityCenter:{protectionStatus:'PROTECTED'}});
 assert.equal(isValidSecurityCenterStatusPayload({protectionStatus:'PROTECTED'}),true);
 assert.equal(scopeFree.protectionStatus,'UNKNOWN','scope-free aggregate protection is not verifiable');
 assert.equal(scopeFree.coverage,'UNKNOWN');
});

test('security-center data-source failures preserve timeout, permission, missing route, and malformed response',()=>{
 assert.equal(classifyDataSourceFailure(undefined,'AbortError'),'TIMEOUT');
 assert.equal(classifyDataSourceFailure(401,'Error'),'PERMISSION_DENIED');
 assert.equal(classifyDataSourceFailure(403,'Error'),'PERMISSION_DENIED');
 assert.equal(classifyDataSourceFailure(404,'Error'),'UNSUPPORTED');
 assert.equal(classifyDataSourceFailure(undefined,'InvalidResponseError'),'INVALID_RESPONSE');
 assert.equal(classifyDataSourceFailure(503,'Error'),'UNAVAILABLE');
});

test('unexpected security refresh errors release controls and keep protection UNKNOWN',async()=>{
 const app=await startAIConsole({port:0});
 try{
  const html=await (await fetch(app.url)).text();
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length,'Console should include its local UI script');
  for(const [,source] of scripts)assert.doesNotThrow(()=>new Script(source),'Console client script should parse');
  const start=html.indexOf("async function refreshSecurityCenter(reason='manual')");
  const end=html.indexOf('function showSecurityRefreshFailure',start);
  assert.ok(start>=0&&end>start,'refresh implementation and its failure handler should be present');
  const refresh=html.slice(start,end);
  assert.match(refresh,/finally\s*\{\s*securityRefreshBusy=false;getEl\('securityHealthButton'\)\.disabled=false;getEl\('securityExportButton'\)\.disabled=false;/);
  assert.ok(html.includes("function showSecurityRefreshFailure(error){"));
  assert.ok(html.includes("securitySources={state:'UNKNOWN',agents:'UNKNOWN',policyState:'UNKNOWN',runtime3:'UNKNOWN',securityCenter:securityCenterFailure,e4:'UNKNOWN'};"),'unexpected refresh errors must not preserve stale source availability');
  assert.ok(html.includes("securitySnapshot=securityCenterAdapter.adaptSecuritySnapshot({});"),'unexpected refresh errors must discard stale protection values');
  assert.ok(html.includes("status('securityHealthStatus','健康检查异常：'+sourceStateLabel(securityCenterFailure)+'。防护状态保持 UNKNOWN。',true);"),'unexpected backend error text must not be copied into the status banner');
  assert.ok(html.includes("getEl('securityHealthButton').onclick=()=>refreshSecurityCenter('manual').catch(showSecurityRefreshFailure);"));
  assert.ok(html.includes("refreshSecurityCenter('initial').catch(showSecurityRefreshFailure);"));
  assert.ok(html.includes("refreshSecurityCenter('automatic').catch(showSecurityRefreshFailure)"));
  assert.ok(html.includes("status('securityHealthStatus','诊断报告导出失败；防护状态仍按最近一次后端读取结果显示。',true);"),'download errors must not be mislabeled as failed protection reads');
 }finally{await app.close();}
});

test('diagnostic distinguishes an empty audit feed from an unavailable source',()=>{
 const available=buildSecurityDiagnostic(adaptSecuritySnapshot({state:{events:[]}}),{state:'AVAILABLE'});
 assert.equal(available.eventCount,0);assert.deepEqual(available.events,[]);

 const unavailable=buildSecurityDiagnostic(adaptSecuritySnapshot({}),{state:'UNSUPPORTED'});
 assert.equal(unavailable.eventCount,null);assert.equal(unavailable.events,null);
 assert.equal(unavailable.dataSources.state,'UNSUPPORTED');
});

test('security event refresh retains keyboard focus and selected explanation for a still-visible record',async()=>{
 const app=await startAIConsole({port:0});
 try{
  const html=await (await fetch(app.url)).text();
  assert.match(html,/id="securityEvents" class="security-event-list" tabindex="-1" aria-live="polite"/);
  assert.ok(html.includes('function securityEventIdentity(event){return JSON.stringify([event.ts,event.sessionId,event.kind,event.toolName,event.riskLevel]);}'));
  assert.ok(html.includes("setAttribute('aria-pressed',String(eventKey===selectedKey))"),'selection state should be reapplied when event rows are refreshed');
  assert.ok(html.includes("if(hadFocus)(buttons.find(button=>button.dataset.eventKey===focusedKey)||target).focus();"),'focus should return to the same visible event after its row is rebuilt');
  assert.ok(html.includes('if(selected)getEl(\'securityEventExplanation\').textContent=securityCenterAdapter.explainSecurityEvent(securitySnapshot.events.find(event=>securityEventIdentity(event)===selectedKey));'),'the selected row explanation should remain in sync after refresh');
 }finally{await app.close();}
});

test('OBSERVE denial, sensitive-data allow, and Guard quarantine are not rendered as successful policy results',()=>{
 const denied=preparePolicyResultForDisplay({mode:'OBSERVE',status:'DENY',guardState:'SAFE',decision:{action:'DENY',mode:'OBSERVE',risks:['SENSITIVE_DATA']}});
 assert.equal(denied.status,'DENY');assert.equal(denied.decision.action,'DENY');assert.deepEqual(denied.decision.risks,['SENSITIVE_DATA']);assert.equal(denied.displayWarning,undefined);

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
