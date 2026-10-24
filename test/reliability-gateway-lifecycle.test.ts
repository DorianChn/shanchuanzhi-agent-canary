// M7-owned regression fixture. Gateway behavior is implemented and owned by M1.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-tests-'));process.env.AGENT_CANARY_HOME=home;
const {HoneypotRuntime,createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder,verifyEvidenceChain,canonicalJSON}=await import('../src/sdk.js');
function setup(extra:any={}){
  const root=fs.mkdtempSync(path.join(home,'fixture-'));
  for(const [name,text]of Object.entries({'public.txt':'hello','result.txt':'before','.env':'NOT_A_REAL_CREDENTIAL'}))fs.writeFileSync(path.join(root,name),text);
  const evidence=new EvidenceRecorder(extra.maxEvents??128),guard=createAgentGuard({alert:false,eventsFile:path.join(root,'guard.jsonl')});
  const runtime=createTrustedExecutionGateway({agentId:'sdk-fixture',guard,workspaceRoot:root,files:[{path:'public.txt'},{path:'result.txt',writable:true},{path:'.env',sensitive:true}],evidence,...extra});
  return{root,runtime,guard,evidence};
}

test('nested MCP canary quarantines immediately and aborts an active controlled call',async()=>{
 let release!:()=>void,started!:()=>void,activeSignal:AbortSignal|undefined,activeEffects=0,decoyCalls=0;
 const begin=new Promise<void>(r=>started=r),hold=new Promise<void>(r=>release=r);
 const s=setup({timeoutMs:5_000,mcpTools:{
  slow:{risk:'READ_ONLY',approvalRequired:false,execute:async(_args:any,signal:AbortSignal)=>{activeSignal=signal;started();await hold;if(!signal.aborted)activeEffects++;return 'done';}},
  canary_read_secrets:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{decoyCalls++;return 'synthetic-decoy';}},
 }});
 let activeOutcome:Promise<boolean>|undefined,canaryOutcome:Promise<boolean>|undefined;
 try{
  const active=s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}});
  activeOutcome=active.then(()=>true,()=>false);
  await begin;
  const canary=s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'canary_read_secrets',arguments:{}}});
  canaryOutcome=canary.then(()=>true,()=>false);
  assert.equal(s.guard.state,'QUARANTINED');
  assert.equal(activeSignal!.aborted,true);
  release();
  assert.equal(await activeOutcome,false);
  assert.equal(await canaryOutcome,false);
  await assert.rejects(s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}}),/guard_quarantined/);
  assert.equal(activeEffects,0);
  assert.equal(decoyCalls,0);
 }finally{release();await s.runtime.close();await Promise.all([activeOutcome,canaryOutcome].filter(Boolean));}
});
test('external Guard quarantine synchronously aborts an active callback before its synthetic effect',async()=>{
 let release!:()=>void,started!:()=>void,completed!:()=>void,activeSignal:AbortSignal|undefined;
 const hold=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>started=r),callbackDone=new Promise<void>(r=>completed=r);
 const s=setup({timeoutMs:5_000,mcpTools:{slow:{risk:'READ_ONLY',approvalRequired:false,execute:async(_args:any,signal:AbortSignal)=>{activeSignal=signal;started();try{await hold;if(!signal.aborted)fs.writeFileSync(path.join(s.root,'post-quarantine-marker.txt'),'synthetic');return 'done';}finally{completed();}}}}});
 const active=s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}});
 try{
  await begun;
  const trip=s.guard.trip({reason:'external_synthetic_quarantine'});
  assert.equal(trip.state,'QUARANTINED');
  assert.equal(activeSignal!.aborted,true);
  release();
  await callbackDone;
  await assert.rejects(active,/GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK/);
  assert.equal(fs.existsSync(path.join(s.root,'post-quarantine-marker.txt')),false);
  assert.equal(fs.readFileSync(path.join(s.root,'result.txt'),'utf8'),'before');
 }finally{release();await s.runtime.close();await active.catch(()=>{});}
});
test('external Guard quarantine aborts active work and rejects queued sibling Gateway work before effects',async()=>{
 const guard=createAgentGuard({alert:false});
 const activeRoot=fs.mkdtempSync(path.join(home,'quarantine-active-gateway-'));
 const queuedRoot=fs.mkdtempSync(path.join(home,'quarantine-queued-gateway-'));
 let release!:()=>void,started!:()=>void,activeSignal:AbortSignal|undefined,activeEffects=0,queuedCalls=0;
 const hold=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>started=r);
 const activeMarker=path.join(activeRoot,'post-quarantine-marker.txt'),queuedMarker=path.join(queuedRoot,'queued-marker.txt');
 const activeGateway=createTrustedExecutionGateway({agentId:'quarantine-active',guard,workspaceRoot:activeRoot,files:[],evidence:new EvidenceRecorder(),timeoutMs:5_000,mcpTools:{slow:{risk:'READ_ONLY',approvalRequired:false,execute:async(_args:any,signal:AbortSignal)=>{activeSignal=signal;started();await hold;if(!signal.aborted){activeEffects++;fs.writeFileSync(activeMarker,'synthetic');}return 'done';}}}});
 const queuedGateway=createTrustedExecutionGateway({agentId:'quarantine-queued',guard,workspaceRoot:queuedRoot,files:[],evidence:new EvidenceRecorder(),timeoutMs:5_000,mcpTools:{write_marker:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{queuedCalls++;fs.writeFileSync(queuedMarker,'synthetic');return 'done';}}}});
 let active:Promise<unknown>|undefined,queued:Promise<unknown>|undefined;
 try{
  active=activeGateway.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}});
  await begun;
  queued=queuedGateway.agent.dispatch({name:'mcp_tool',args:{tool:'write_marker',arguments:{}}});
  const trip=guard.trip({reason:'external_synthetic_quarantine'});
  assert.equal(trip.state,'QUARANTINED');
  assert.equal(activeSignal!.aborted,true);
  release();
  await assert.rejects(active,/GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK/);
  await assert.rejects(queued,/guard_quarantined/);
  assert.equal(activeEffects,0);
  assert.equal(queuedCalls,0);
  assert.equal(fs.existsSync(activeMarker),false);
  assert.equal(fs.existsSync(queuedMarker),false);
 }finally{
  release();
  await Promise.all([active,queued].filter((promise):promise is Promise<unknown>=>Boolean(promise)).map(promise=>promise.catch(()=>undefined)));
  await Promise.all([activeGateway.close(),queuedGateway.close()]);
 }
});
test('Guard quarantine consumes pending approval before a later acknowledged reset',async()=>{
 const guard=createAgentGuard({alert:false});
 const root=fs.mkdtempSync(path.join(home,'quarantine-pending-approval-'));
 const marker=path.join(root,'stale-approval-marker.txt');
 let callbackCalls=0;
 const runtime=createTrustedExecutionGateway({agentId:'quarantine-pending-approval',guard,workspaceRoot:root,files:[],evidence:new EvidenceRecorder(),mcpTools:{write_marker:{risk:'WRITE',approvalRequired:true,execute:async()=>{callbackCalls++;fs.writeFileSync(marker,'synthetic');return 'written';}}}});
 try{
  await assert.rejects(runtime.agent.dispatch({name:'mcp_tool',args:{tool:'write_marker',arguments:{}}}),/REQUIRE_APPROVAL/);
  const requestId=runtime.operator.pending()[0]!.requestId;
  const trip=guard.trip({reason:'external_synthetic_quarantine'});
  assert.equal(trip.state,'QUARANTINED');
  guard.reset({acknowledgedBy:'synthetic incident review'});
  let approvalError:unknown;
  try{await runtime.operator.approve(requestId);}catch(error){approvalError=error;}
  assert.equal((approvalError as Error|undefined)?.message,'GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED',`callbackCalls=${callbackCalls}; markerExists=${fs.existsSync(marker)}`);
  assert.equal(callbackCalls,0);
  assert.equal(fs.existsSync(marker),false);
 }finally{await runtime.close();}
});
test('Guard quarantine cannot revive an interrupted approval review after reset',async()=>{
 let release!:()=>void,started!:()=>void,reviewSignal:AbortSignal|undefined,callbackCalls=0;
 const hold=new Promise<void>(r=>release=r),reviewStarted=new Promise<void>(r=>started=r);
 const s=setup({reviewTimeoutMs:5_000,provider:{analyze:async({signal}:any)=>{reviewSignal=signal;started();await hold;return{status:'ok',advisoryOnly:true,verdict:'benign',severity:'low',confidence:null,summary:'synthetic review',reasoningSummary:'synthetic review',recommendedActions:[],evidence:[]};}},mcpTools:{write_marker:{risk:'WRITE',approvalRequired:true,execute:async()=>{callbackCalls++;fs.writeFileSync(path.join(s.root,'interrupted-review-marker.txt'),'synthetic');return 'written';}}}});
 const dispatch=s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'write_marker',arguments:{}}});
 try{
  await reviewStarted;
  const trip=s.guard.trip({reason:'external_synthetic_quarantine'});
  assert.equal(trip.state,'QUARANTINED');
  assert.equal(reviewSignal!.aborted,true);
  s.guard.reset({acknowledgedBy:'synthetic incident review'});
  release();
  const dispatchError=await dispatch.then(()=>undefined,error=>error as Error&{reason?:string});
  const pending=s.runtime.operator.pending();
  let approvalResult='no_pending_request';
  if(pending.length){try{await s.runtime.operator.approve(pending[0].requestId);approvalResult='callback_ran';}catch(error){approvalResult=(error as Error).message;}}
  assert.equal(dispatchError?.reason,'guard_quarantined',`dispatchReason=${dispatchError?.reason}; pending=${pending.length}; approval=${approvalResult}; callbackCalls=${callbackCalls}; markerExists=${fs.existsSync(path.join(s.root,'interrupted-review-marker.txt'))}`);
  assert.equal(pending.length,0);
  assert.equal(callbackCalls,0);
  assert.equal(fs.existsSync(path.join(s.root,'interrupted-review-marker.txt')),false);
 }finally{release();await dispatch.catch(()=>{});await s.runtime.close();}
});
test('gateway fails closed when its Guard cannot provide a quarantine subscription',()=>{
 const root=fs.mkdtempSync(path.join(home,'subscription-failure-'));
 fs.writeFileSync(path.join(root,'result.txt'),'before');
 const guard={sessionId:'missing-subscription-guard',state:'SAFE'} as any;
 assert.throws(()=>createTrustedExecutionGateway({agentId:'subscription-failure',guard,workspaceRoot:root,files:[{path:'result.txt',writable:true}],evidence:new EvidenceRecorder()}),/GATEWAY_QUARANTINE_SUBSCRIPTION_FAILED/);
 assert.equal(fs.readFileSync(path.join(root,'result.txt'),'utf8'),'before');
});
test('gateway close unsubscribes its Guard observer exactly once',async()=>{
 const root=fs.mkdtempSync(path.join(home,'subscription-close-'));
 const guard=createAgentGuard({alert:false});
 const subscribe=guard.subscribeQuarantine.bind(guard);
 let unsubscribeCalls=0;
 guard.subscribeQuarantine=(listener)=>{const dispose=subscribe(listener);return()=>{unsubscribeCalls++;dispose();};};
 const runtime=createTrustedExecutionGateway({agentId:'subscription-close',guard,workspaceRoot:root,files:[],evidence:new EvidenceRecorder()});
 await Promise.all([runtime.close(),runtime.close()]);
 assert.equal(unsubscribeCalls,1);
});
test('gateway close publishes one Promise before synchronous abort and disposer reentry',async()=>{
 const root=fs.mkdtempSync(path.join(home,'close-reentry-'));
 const guard=createAgentGuard({alert:false,eventsFile:path.join(root,'guard.jsonl')});
 const evidence=new EvidenceRecorder();
 let closeGateway!:()=>Promise<void>,abortReentry:Promise<void>|undefined,disposerReentry:Promise<void>|undefined;
 let release!:()=>void,started!:()=>void,callbackDone!:()=>void;
 const hold=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>started=r),done=new Promise<void>(r=>callbackDone=r);
 const subscribe=guard.subscribeQuarantine.bind(guard);
 guard.subscribeQuarantine=(listener)=>{const dispose=subscribe(listener);return()=>{disposerReentry=closeGateway();dispose();};};
 const runtime=createTrustedExecutionGateway({agentId:'close-reentry',guard,workspaceRoot:root,files:[],evidence,timeoutMs:5_000,mcpTools:{slow:{risk:'READ_ONLY',approvalRequired:false,execute:async(_args:any,signal:AbortSignal)=>{signal.addEventListener('abort',()=>{abortReentry=closeGateway();},{once:true});started();try{await hold;return 'done';}finally{callbackDone();}}}}});
 closeGateway=runtime.close;
 const active=runtime.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}});
 const activeOutcome=active.then(()=>false,()=>true);
 try{
  await begun;
  const closing=runtime.close();
  assert.strictEqual(abortReentry,closing);
  assert.strictEqual(disposerReentry,closing);
  assert.strictEqual(runtime.close(),closing);
  release();
  assert.equal(await activeOutcome,true);
  await done;
  await closing;
 }finally{release();await runtime.close().catch(()=>{});await active.catch(()=>{});}
});
test('gateway close aborts active work, drains queued work, and blocks pending approval',async()=>{
 let release!:()=>void,started!:()=>void,activeSettled=false,queuedSettled=false,queuedCalls=0,approvalCalls=0;
 let signal:AbortSignal|undefined;
 const hold=new Promise<void>(r=>release=r),begun=new Promise<void>(r=>started=r);
 const s=setup({timeoutMs:5_000,mcpTools:{
  approval:{approvalRequired:true,execute:async()=>++approvalCalls},
  slow:{risk:'READ_ONLY',approvalRequired:false,execute:async(_args:any,current:AbortSignal)=>{signal=current;started();await hold;return 'done';}},
  queued:{risk:'WRITE',approvalRequired:false,execute:async()=>++queuedCalls},
 }});
 const originalClose=fs.closeSync;
 const closeAfterDrain:boolean[]=[];
 (fs as any).closeSync=(fd:number)=>{closeAfterDrain.push(activeSettled&&queuedSettled);return originalClose(fd);};
 let activeOutcome:Promise<boolean>|undefined,queuedOutcome:Promise<boolean>|undefined,approvalOutcome:Promise<boolean>|undefined;
 try{
  await assert.rejects(s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'approval',arguments:{}}}),/REQUIRE_APPROVAL/);
  const pendingId=s.runtime.operator.pending()[0].requestId;
  activeOutcome=s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{}}}).then(()=>{activeSettled=true;return false;},()=>{activeSettled=true;return true;});
  await begun;
  queuedOutcome=s.runtime.agent.dispatch({name:'write_file',args:{path:'result.txt',content:'must-not-write'}}).then(()=>{queuedSettled=true;return false;},()=>{queuedSettled=true;return true;});
  approvalOutcome=s.runtime.operator.approve(pendingId).then(()=>false,()=>true);
  const closing=s.runtime.close();
  assert.equal(signal!.aborted,true);
  assert.equal(s.runtime.operator.pending().length,0);
  release();
  assert.equal(await activeOutcome,true);
  assert.equal(await queuedOutcome,true);
  assert.equal(await approvalOutcome,true);
  await closing;
  assert.equal(queuedCalls,0);
  assert.equal(approvalCalls,0);
  assert.equal(fs.readFileSync(path.join(s.root,'result.txt'),'utf8'),'before');
  assert.ok(closeAfterDrain.length>0);
  assert.ok(closeAfterDrain.every(Boolean));
 }finally{(fs as any).closeSync=originalClose;release();await s.runtime.close().catch(()=>{});await Promise.all([activeOutcome,queuedOutcome,approvalOutcome].filter(Boolean));}
});
test('gateway close tries every resource after a close error and exposes only a stable failure',async()=>{
 const s=setup(),originalClose=fs.closeSync,attempted:number[]=[];
 (fs as any).closeSync=(fd:number)=>{attempted.push(fd);if(attempted.length===1){originalClose(fd);throw new Error(`SYNTHETIC_PRIVATE_CLOSE_DETAIL ${path.join(s.root,'.env')}`);}return originalClose(fd);};
 try{
  const closing=s.runtime.close();
  assert.strictEqual(s.runtime.close(),closing);
  await assert.rejects(closing,(error:any)=>{
   assert.equal(error.message,'GATEWAY_RESOURCE_CLOSE_FAILED');
   assert.equal(Object.hasOwn(error,'cause'),false);
   assert.doesNotMatch(`${error.message}\n${error.stack??''}\n${error.cause??''}`,/SYNTHETIC_PRIVATE_CLOSE_DETAIL/);
   assert.ok(!`${error.message}\n${error.stack??''}`.includes(path.join(s.root,'.env')));
   return true;
  });
  assert.equal(attempted.length,3);
  await assert.rejects(s.runtime.close(),/GATEWAY_RESOURCE_CLOSE_FAILED/);
  assert.equal(attempted.length,3);
 }finally{(fs as any).closeSync=originalClose;await s.runtime.close().catch(()=>{});}
});
test('approval expires with no actual callback',async()=>{let called=0,id:string|undefined;const s=setup({approvalTtlMs:5,mcpTools:{ambiguous:{approvalRequired:true,execute:async()=>++called}}});try{await assert.rejects(s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'ambiguous',arguments:{}}}),error=>{const denial=error as {decision?:unknown;requestId?:unknown};assert.equal(denial.decision,'REQUIRE_APPROVAL');assert.equal(typeof denial.requestId,'string');id=denial.requestId as string;return true;});await new Promise(r=>setTimeout(r,15));await assert.rejects(s.runtime.operator.approve(id!),/EXPIRED/);assert.equal(called,0);}finally{await s.runtime.close();}});
test('restarting the gateway with the same Guard cannot erase prior sensitive tool history',async()=>{let sent=0;const s=setup({mcpTools:{source:{risk:'READ_ONLY',approvalRequired:false,execute:async()=> 'NOT_A_REAL_CREDENTIAL_PERSIST'}}});let replacement:any;try{await s.runtime.agent.dispatch({name:'mcp_tool',args:{tool:'source',arguments:{}}});await s.runtime.close();replacement=createTrustedExecutionGateway({agentId:'replacement-host',guard:s.guard,workspaceRoot:s.root,files:[],evidence:new EvidenceRecorder(),mcpTools:{sink:{risk:'NETWORK',approvalRequired:false,execute:async()=>++sent}}});await assert.rejects(replacement.agent.dispatch({name:'mcp_tool',args:{tool:'sink',arguments:{data:'unrelated'}}}),/sensitive_session_egress_denied/);assert.equal(sent,0);}finally{await replacement?.close();await s.runtime.close();}});
test('M7 reliability evidence: a real honeypot read quarantines before the next write',async()=>{const guard=createAgentGuard({alert:false}),pot=new HoneypotRuntime(guard.sessionId,['ENV']);fs.writeFileSync(path.join(pot.root,'result.txt'),'unchanged');const runtime=createTrustedExecutionGateway({agentId:'fixture',guard,workspaceRoot:pot.root,files:[...pot.gatewayFiles(),{path:'result.txt',writable:true}],evidence:new EvidenceRecorder(),onDecoyRead:id=>{pot.record(id,'READ');if(guard.state==='QUARANTINED')pot.record(id,'QUARANTINED');}});try{await assert.rejects(runtime.agent.dispatch({name:'read_file',args:{path:'.env'}}),/GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK/);assert.equal(guard.state,'QUARANTINED');await assert.rejects(runtime.agent.dispatch({name:'write_file',args:{path:'result.txt',content:'bad'}}),/guard_quarantined/);assert.equal(fs.readFileSync(path.join(pot.root,'result.txt'),'utf8'),'unchanged');assert.equal(pot.snapshot().filter(e=>e.kind==='READ').length,1);assert.equal(pot.snapshot().filter(e=>e.kind==='QUARANTINED').length,1);}finally{await runtime.close();}});