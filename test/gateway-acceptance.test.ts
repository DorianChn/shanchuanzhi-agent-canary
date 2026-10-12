import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-acceptance-home-'));
const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder}=await import('../src/sdk.js');
const fake='NOT_A_REAL_CREDENTIAL_ACCEPTANCE_ONLY';
test('detected replacement after audit must not modify the previously held inode',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ac-held-inode-')),file=path.join(root,'result.txt');fs.writeFileSync(file,'UNCHANGED');
 const guard=createAgentGuard({alert:false,eventsFile:path.join(root,'events.jsonl')}),recorder=new EvidenceRecorder(),record=recorder.record.bind(recorder);
 const gateway=createTrustedExecutionGateway({agentId:'fixture',guard,workspaceRoot:root,files:[{path:'result.txt',writable:true}],evidence:recorder});
 recorder.record=(event:any)=>{if(event.execution_status==='RUNNING'){fs.renameSync(file,file+'.held');fs.writeFileSync(file,'REPLACEMENT');}return record(event);};
 try{await assert.rejects(gateway.agent.dispatch({name:'write_file',args:{path:'result.txt',content:'MUST_NOT_WRITE'}}));assert.equal(fs.readFileSync(file+'.held','utf8'),'UNCHANGED');assert.equal(fs.readFileSync(file,'utf8'),'REPLACEMENT');}finally{await gateway.close();}
});
async function sinkFixture(){
 let received=0;const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-acceptance-'));
 fs.writeFileSync(path.join(root,'result.txt'),'before');
 const server=http.createServer((req,res)=>{req.resume();req.on('end',()=>{received++;res.end('{}');});});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as any).port;
 const guard=createAgentGuard({alert:false,eventsFile:path.join(root,'guard.jsonl')});
 return{root,guard,url,received:()=>received,close:()=>new Promise<void>(r=>server.close(()=>{console.log('FIXTURE_SINK_REQUESTS',received);r();})),send:async(args:any)=>{await fetch(url,{method:'POST',body:args.data,signal:AbortSignal.timeout(3000)});return{sent:true};}};
}
test('sensitive provenance expiry must not silently re-authorize egress',async()=>{
 const s=await sinkFixture(),evidence=new EvidenceRecorder();
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence,readOrigins:['https://127.0.0.1'],mcpTools:{source:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>fake},sink:{risk:'NETWORK',approvalRequired:false,execute:s.send}}});
 const now=Date.now;
 try{await runtime.agent.dispatch({name:'mcp_tool',args:{tool:'source',arguments:{}}});const future=now()+300001;Date.now=()=>future;
  await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'sink',arguments:{data:Buffer.from(fake).toString('base64')}}}),/sensitive_session_egress_denied/);
  await assert.rejects(runtime.agent.dispatch({name:'http_request',args:{url:'https://127.0.0.1/path'}}),/sensitive_session_egress_denied/);
  assert.equal(s.received(),0);
 }finally{Date.now=now;await runtime.close();await s.close();}
});
test('two gateways sharing one Guard must not race source collection and egress',async()=>{
 const s=await sinkFixture();let release!:()=>void,started!:()=>void;
 const start=new Promise<void>(r=>started=r),hold=new Promise<void>(r=>release=r);
 const a=createTrustedExecutionGateway({agentId:'a',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),mcpTools:{source:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{started();await hold;return fake;}}}});
 const b=createTrustedExecutionGateway({agentId:'b',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),mcpTools:{sink:{risk:'NETWORK',approvalRequired:false,execute:s.send}}});
 try{const source=a.agent.dispatch({name:'mcp_tool',args:{tool:'source',arguments:{}}});await start;
  const sent=b.agent.dispatch({name:'mcp_tool',args:{tool:'sink',arguments:{data:Buffer.from(fake).toString('base64')}}});const checked=assert.rejects(sent,/sensitive_session_egress_denied/);
  await new Promise<void>(r=>setImmediate(r));release();await source;await checked;assert.equal(s.received(),0);
 }finally{release();await a.close();await b.close();await s.close();}
});
test('concurrent duplicate approval executes a real callback exactly once',async()=>{
 const s=await sinkFixture();let calls=0;const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),mcpTools:{write:{approvalRequired:true,execute:async()=>{calls++;fs.writeFileSync(path.join(s.root,'result.txt'),'approved');return 'ok';}}}});
 try{await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'write',arguments:{}}}),/REQUIRE_APPROVAL/);const id=runtime.operator.pending()[0].requestId;
  const outcomes=await Promise.allSettled([runtime.operator.approve(id),runtime.operator.approve(id)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(calls,1);assert.equal(fs.readFileSync(path.join(s.root,'result.txt'),'utf8'),'approved');
 }finally{await runtime.close();await s.close();}
});
test('approval at the exact expiry boundary cannot execute',async()=>{
 const s=await sinkFixture();let calls=0;const now=Date.now,t=now();Date.now=()=>t;
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),approvalTtlMs:100,mcpTools:{write:{approvalRequired:true,execute:async()=>++calls}}});
 try{await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'write',arguments:{}}}));const id=runtime.operator.pending()[0].requestId;Date.now=()=>t+100;
  await assert.rejects(runtime.operator.approve(id),/EXPIRED/);assert.equal(calls,0);
 }finally{Date.now=now;await runtime.close();await s.close();}
});
test('resource replacement in the check/use window cannot write the replacement inode',async()=>{
 const s=await sinkFixture(),file=path.join(s.root,'result.txt'),recorder=new EvidenceRecorder(),record=recorder.record.bind(recorder);
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[{path:'result.txt',writable:true}],evidence:recorder});
 recorder.record=(event:any)=>{if(event.execution_status==='RUNNING'){fs.renameSync(file,file+'.held');fs.writeFileSync(file,'replacement');}return record(event);};
 try{await assert.rejects(runtime.agent.dispatch({name:'write_file',args:{path:'result.txt',content:'authorized-held-inode'}}),/EFFECTS_NOT_ROLLED_BACK/);
  assert.equal(fs.readFileSync(file,'utf8'),'replacement');assert.equal(fs.readFileSync(file+'.held','utf8'),'before');assert.equal(s.guard.state,'QUARANTINED');
 }finally{await runtime.close();await s.close();}
});
test('an executor ignoring cancellation may cause a late side effect, which is not verified safe',async()=>{
 const s=await sinkFixture();let finished!:()=>void;const done=new Promise<void>(r=>finished=r);
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],timeoutMs:5,evidence:new EvidenceRecorder(),mcpTools:{badHost:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{await new Promise(r=>setTimeout(r,30));fs.writeFileSync(path.join(s.root,'late'),'late');finished();return 'ok';}}}});
 try{await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'badHost',arguments:{}}}));await done;
  assert.equal(fs.existsSync(path.join(s.root,'late')),true);assert.equal(runtime.evidence().at(-1)!.side_effect_verification,'NOT_VERIFIED');assert.equal(s.guard.state,'QUARANTINED');
 }finally{await runtime.close();await s.close();}
});
test('AI review timeout preserves pending approval and performs no callback',async()=>{
 const s=await sinkFixture();let calls=0,signal:AbortSignal|undefined;
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),reviewTimeoutMs:5,provider:{analyze:async(request:any)=>{signal=request.signal;return new Promise(()=>{});}} as any,mcpTools:{action:{approvalRequired:true,execute:async()=>++calls}}});
 try{await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'action',arguments:{}}}),/REQUIRE_APPROVAL/);assert.equal(signal!.aborted,true);assert.equal(calls,0);assert.equal(runtime.operator.pending().length,1);
 }finally{await runtime.close();await s.close();}
});
test('benign AI cannot self-approve or execute after quarantine during review',async()=>{
 const s=await sinkFixture();let calls=0;
 const provider={analyze:async()=>{s.guard.trip({reason:'during_review'});return{status:'ok',advisoryOnly:true,verdict:'benign',severity:'low',confidence:null,summary:'review',reasoningSummary:'input evidence',recommendedActions:['inspect'],evidence:[{eventId:'proposed-call',quote:'tool'}]};}};
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),provider:provider as any,mcpTools:{action:{approvalRequired:true,execute:async()=>++calls}}});
 try{await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'action',arguments:{}}}));for(const pending of runtime.operator.pending())await assert.rejects(runtime.operator.approve(pending.requestId),/guard_quarantined/);assert.equal(calls,0);assert.equal(s.guard.state,'QUARANTINED');
 }finally{await runtime.close();await s.close();}
});
test('MCP unknown and explicitly destructive capabilities cannot be approved by arguments',async()=>{
 const s=await sinkFixture();let calls=0;
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),mcpTools:{danger:{risk:'DESTRUCTIVE',approvalRequired:false,execute:async()=>++calls}}});
 try{for(const tool of ['missing','danger'])await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool,arguments:{approved:true,operator:'trusted'}}}));assert.equal(calls,0);assert.equal(runtime.operator.pending().length,0);
 }finally{await runtime.close();await s.close();}
});
test('HTTPS origin permission does not bypass transport loopback rejection',async()=>{
 const s=await sinkFixture(),origin=s.url.replace('http:','https:');
 const runtime=createTrustedExecutionGateway({agentId:'fixture',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),readOrigins:[origin]});
 try{for(const url of [origin+'/path?secret=fixture',origin+'/path#fragment',origin.replace('https://','https://user:pass@')+'/path'])await assert.rejects(runtime.agent.dispatch({name:'http_request',args:{url}}),/network_capability_denied/);
  await assert.rejects(runtime.agent.dispatch({name:'http_request',args:{url:origin+'/path'}}));assert.equal(s.received(),0);assert.equal(runtime.evidence().at(-1)!.execution_status,'FAILED');
 }finally{await runtime.close();await s.close();}
});
