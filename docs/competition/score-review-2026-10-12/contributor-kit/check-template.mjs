import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';import{createFixturePlugin}from'./fixture-plugin.mjs';
const arg=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const root=path.resolve(arg('root')||process.cwd());
if(!fs.existsSync(path.join(root,'dist/sdk.js')))throw Error('BUILD_REQUIRED_USE_COMMUNITY_ROOT');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'canary-contributor-fixture-'));process.env.AGENT_CANARY_HOME=path.join(fixture,'home');
const sdk=await import(pathToFileURL(path.join(root,'dist/sdk.js')).href);
const guard=sdk.createAgentGuard({alert:false,eventsFile:path.join(fixture,'guard.jsonl')});
const recorder=new sdk.EvidenceRecorder(128,path.join(fixture,'gateway.jsonl'));
fs.writeFileSync(path.join(fixture,'note.txt'),'BEFORE');fs.writeFileSync(path.join(fixture,'victim.txt'),'ORIGINAL');
const plugin=createFixturePlugin({victimPath:path.join(fixture,'victim.txt'),approvedPath:path.join(fixture,'approved.txt')});
const runtime=sdk.createTrustedExecutionGateway({agentId:'contributor-fixture',guard,workspaceRoot:fixture,files:[{path:'note.txt',writable:true}],evidence:recorder,mcpTools:plugin.tools});
const report={mode:'SDK_CONTRIBUTOR_TEMPLATE_REAL_TEMP_IO_NOT_MODEL_OR_NATIVE_HOST_EVAL',runtimeSHA:'99660b36db9d5b1121eea6fe06b026c5f1e36bcf',sdkBuildDigest:createHash('sha256').update(fs.readFileSync(path.join(root,'dist/sdk.js'))).digest('hex'),node:process.version,startedAt:new Date().toISOString(),checks:[],fixtureRetained:true,E4:'NOT_VERIFIED_SAME_OPERATOR',scope:'trusted plugin descriptors and cooperative callbacks; no OS sandbox or arbitrary callback containment'};
const pass=name=>report.checks.push({name,status:'VERIFIED'});
try{
assert.deepEqual(await runtime.agent.dispatch({name:'mcp_tool',args:{tool:'fixture_status',arguments:{}}}),{status:'fixture-ok'});assert.equal(plugin.counters.status,1);pass('registered extension actual callback');
await runtime.agent.dispatch({name:'write_file',args:{path:'note.txt',content:'SAFE_NORMAL'}});assert.equal(fs.readFileSync(path.join(fixture,'note.txt'),'utf8'),'SAFE_NORMAL');pass('normal held-file write observed');
await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'not_registered',arguments:{}}}),/mcp_capability_denied/);assert.equal(plugin.counters.status,1);pass('unknown capability did not call plugin');
await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'fixture_danger',arguments:{}}}),/mcp_high_risk_denied/);assert.equal(plugin.counters.danger,0);assert.equal(fs.readFileSync(path.join(fixture,'victim.txt'),'utf8'),'ORIGINAL');pass('declared destructive callback zero and victim unchanged');
await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'fixture_approval',arguments:{approved:true}}}),/REQUIRE_APPROVAL/);assert.equal(plugin.counters.approved,0);assert.equal(fs.existsSync(path.join(fixture,'approved.txt')),false);const forged=runtime.operator.pending()[0].requestId;assert.throws(()=>runtime.operator.reject(forged),/operator_rejected/);pass('agent approval parameter does not authorize');
await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'fixture_approval',arguments:{}}}),/REQUIRE_APPROVAL/);const request=runtime.operator.pending()[0].requestId;await runtime.operator.approve(request);await assert.rejects(runtime.operator.approve(request),/EXPIRED_OR_CONSUMED/);assert.equal(plugin.counters.approved,1);assert.equal(fs.readFileSync(path.join(fixture,'approved.txt'),'utf8'),'APPROVED_FIXTURE_ONLY');pass('host-only one-time approval actual effect');
assert.deepEqual(Object.keys(runtime.agent),['dispatch']);pass('model-facing object has no operator registration or reset');
guard.trip({reason:'contributor_fixture_signal'});await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'fixture_status',arguments:{}}}),/guard_quarantined/);await assert.rejects(runtime.agent.dispatch({name:'write_file',args:{path:'note.txt',content:'BAD_AFTER_TRIP'}}),/guard_quarantined/);assert.equal(plugin.counters.status,1);assert.equal(fs.readFileSync(path.join(fixture,'note.txt'),'utf8'),'SAFE_NORMAL');pass('post-quarantine callback and file effects absent');
report.evidence=recorder.snapshot();report.chain=sdk.verifyEvidenceChain(report.evidence);assert.equal(report.chain.valid,true);pass('local evidence chain consistency only');
report.counters={...plugin.counters};report.status='VERIFIED_BOUNDED_TEMPLATE';
}catch(error){report.status='FAILED';report.error=String(error);process.exitCode=1;}finally{await runtime.close();recorder.close();}
report.completedAt=new Date().toISOString();const output=arg('output')?path.resolve(arg('output')):path.join(fixture,'contributor-result.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:report.checks.length,node:report.node,resultFile:output,fixture,E4:report.E4}));
