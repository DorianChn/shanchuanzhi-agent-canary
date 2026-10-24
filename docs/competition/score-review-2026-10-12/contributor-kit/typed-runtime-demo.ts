import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import type {GatewayOptions} from '../typed-sdk.mjs';
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'canary-typed-consumer-'));
process.env.AGENT_CANARY_HOME=path.join(fixture,'home');
// Typed dynamic import avoids initializing SDK before the isolated home is set.
const sdk=await import('../typed-sdk.mjs');
const guard=sdk.createAgentGuard({alert:false,eventsFile:path.join(fixture,'guard.jsonl')});
const recorder=new sdk.EvidenceRecorder(32,path.join(fixture,'evidence.jsonl'));let calls=0;
fs.writeFileSync(path.join(fixture,'note.txt'),'BEFORE');
const options:GatewayOptions={agentId:'typed-consumer-fixture',guard,evidence:recorder,workspaceRoot:fixture,files:[{path:'note.txt',writable:true}],mcpTools:{typed_status:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{calls++;return{ok:true};}}}};
const runtime=sdk.createTrustedExecutionGateway(options);
try{
assert.deepEqual(await runtime.agent.dispatch({name:'mcp_tool',args:{tool:'typed_status',arguments:{}}}),{ok:true});
await runtime.agent.dispatch({name:'write_file',args:{path:'note.txt',content:'TYPED_NORMAL'}});assert.equal(fs.readFileSync(path.join(fixture,'note.txt'),'utf8'),'TYPED_NORMAL');
guard.trip({reason:'typed-fixture-operator-signal'});
await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'typed_status',arguments:{}}}),/guard_quarantined/);assert.equal(calls,1);
if(false){
 // @ts-expect-error No approval authority on the Agent facet; types must not become any.
 runtime.agent.approve('forged');
}
console.log(JSON.stringify({status:'VERIFIED_TYPED_RUNTIME_CONSUMER',checks:3,node:process.version,mode:'TYPE_SAFE_SDK_FIXTURE_NOT_MODEL_OR_NATIVE_HOST_EVAL',normalFileObserved:true,postTripCallbackCount:calls,E4:'NOT_VERIFIED_SAME_OPERATOR',fixtureRetained:true}));
}finally{await runtime.close();recorder.close();}
