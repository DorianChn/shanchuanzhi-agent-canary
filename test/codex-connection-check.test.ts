import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assessCodexConnection,assessProtectedHostProbe} from '../src/codex-connection-check.js';
import {createAgentGuard} from '../src/containment.js';
import {createTrustedExecutionGateway} from '../src/runtime/gateway.js';
import {EvidenceRecorder} from '../src/runtime/evidence.js';
import {createConnectionCheckRuntime,createProtectedHostAdapter,dispatchProtectedRead} from '../src/codex-connection-mcp.js';

test('confirmed synthetic Hook result has no false non-blocking limit',()=>{
  const result=assessCodexConnection(true,true);
  assert.equal(result.status,'GATEWAY_AND_HOOK_CONFIRMED');
  assert.equal(result.limits.some(limit=>/probe did not block/i.test(limit)),false);
  assert.ok(result.limits.some(limit=>/synthetic PreToolUse probe covers only this test MCP call path/.test(limit)));
});

test('unconfirmed synthetic Hook result stays explicit and narrowly scoped',()=>{
  const result=assessCodexConnection(true,false);
  assert.equal(result.status,'GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE');
  assert.ok(result.limits.some(limit=>/synthetic PreToolUse probe covers only this test MCP call path/.test(limit)));
  assert.ok(result.limits.some(limit=>/does not verify the installed project config/.test(limit)));
});

test('protected-host status stays UNKNOWN until the fixed M1/M2/M5 read is observed',()=>{
  const result=assessCodexConnection(true,true);
  assert.deepEqual(result.protectedHost,{status:'UNKNOWN',reason:'FIRST_PARTY_PROTECTED_READ_NOT_CHECKED'});
  assert.deepEqual(assessProtectedHostProbe([]),{status:'UNKNOWN',reason:'PROTECTED_HOST_PROBE_NOT_OBSERVED'});
  assert.deepEqual(assessProtectedHostProbe([{kind:'protected-host',status:'UNKNOWN',reason:'M1_HELD_FILE_CAPABILITY_UNAVAILABLE',m5Callbacks:0}]),{
    status:'UNKNOWN',reason:'M1_HELD_FILE_CAPABILITY_UNAVAILABLE',
  });
  assert.deepEqual(assessProtectedHostProbe([{kind:'protected-host',status:'ALLOW',reason:'HELD_FILE_POSITIVE_CONTROL',m5Callbacks:1,markerMatched:true}]),{
    status:'FIXED_TEMP_FILE_READ_CONFIRMED',reason:'HELD_FILE_POSITIVE_CONTROL',
  });
  assert.equal(assessProtectedHostProbe([{kind:'protected-host',status:'ALLOW',m5Callbacks:0,markerMatched:true}]).status,'UNKNOWN');
});

test('fixed protected-read probe returns only a sanitized status and fails closed on deny or unknown',async()=>{
  const privateContents='M3_SYNTHETIC_PRIVATE_FILE_CONTENT';
  let allowedCalls=0,deniedCalls=0,unknownCalls=0;
  const allowed=await dispatchProtectedRead({
    status:'UNKNOWN',reason:'POSITIVE_CONTROL_PENDING',m5Callbacks:()=>allowedCalls,
    dispatch:async()=>{allowedCalls++;return{content:'AGENT_CANARY_PROTECTED_FILE_READ_OK\n'+privateContents};},
  },{path:'agent-canary-public.txt'});
  assert.deepEqual(allowed,{status:'ALLOW',reason:'HELD_FILE_POSITIVE_CONTROL',markerMatched:true});
  assert.equal(JSON.stringify(allowed).includes(privateContents),false,'the probe result must not expose file contents');
  assert.equal(allowedCalls,1);

  const denied=await dispatchProtectedRead({
    status:'UNKNOWN',reason:'POSITIVE_CONTROL_PENDING',m5Callbacks:()=>deniedCalls,
    dispatch:async()=>{deniedCalls++;throw new Error('synthetic M5 hard deny');},
  },{path:'agent-canary-public.txt'});
  assert.deepEqual(denied,{status:'DENY',reason:'PROTECTED_HOST_DISPATCH_DENIED',markerMatched:false});
  assert.equal(deniedCalls,1);

  const unknown=await dispatchProtectedRead({
    status:'UNKNOWN',reason:'M1_HELD_FILE_CAPABILITY_UNAVAILABLE',m5Callbacks:()=>unknownCalls,
  },{path:'agent-canary-public.txt'});
  assert.deepEqual(unknown,{status:'UNKNOWN',reason:'M1_HELD_FILE_CAPABILITY_UNAVAILABLE',markerMatched:false});
  assert.equal(unknownCalls,0,'an unavailable host must not dispatch or fall back to a path read');

  const alias=await dispatchProtectedRead({
    status:'UNKNOWN',reason:'POSITIVE_CONTROL_PENDING',m5Callbacks:()=>unknownCalls,
    dispatch:async()=>{unknownCalls++;return{content:'AGENT_CANARY_PROTECTED_FILE_READ_OK'};},
  },{path:'./agent-canary-public.txt'});
  assert.deepEqual(alias,{status:'DENY',reason:'FIXED_PROBE_PATH_REQUIRED',markerMatched:false});
  assert.equal(unknownCalls,0,'an alias must not reach the host callback');
});

test('M3 protected-file host is fail-closed until composed and rejects aliases or replaced paths before M5 callback',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-m3-protected-host-'));
  const file=path.join(root,'agent-canary-public.txt');
  const marker='AGENT_CANARY_PROTECTED_FILE_READ_OK';
  fs.writeFileSync(file,marker,{flag:'wx',mode:0o600});
  let closeGateway:(()=>Promise<void>)|undefined;
  t.after(async()=>{
    try{await closeGateway?.();}
    finally{
      const realRoot=fs.realpathSync(root),realTemp=fs.realpathSync(os.tmpdir()),relative=path.relative(realTemp,realRoot);
      assert.notEqual(relative,'..');assert.ok(!relative.startsWith('..'+path.sep));
      fs.rmSync(realRoot,{recursive:true,force:true});
    }
  });
  const guard=createAgentGuard({sessionId:'m3-protected-host-test',alert:false});
  const evidence=new EvidenceRecorder();
  const gateway=createTrustedExecutionGateway({agentId:'m3-protected-host-test',guard,workspaceRoot:root,files:[{path:'agent-canary-public.txt'}],evidence});
  closeGateway=()=>gateway.close();
  const host=await createProtectedHostAdapter(gateway,guard,root);
  let rejectedAliasCallbacks=0;
  const alias=await dispatchProtectedRead({status:'UNKNOWN',reason:'TEST_ROUTE',m5Callbacks:()=>rejectedAliasCallbacks,dispatch:async()=>{rejectedAliasCallbacks++;return{content:marker};}},{path:'./agent-canary-public.txt'});
  assert.equal(alias.status,'DENY');
  assert.equal(rejectedAliasCallbacks,0,'M3 must reject aliases before entering M5');

  if(!host.dispatch){
    assert.equal(host.status,'UNKNOWN');
    assert.equal(host.securityCenterStatusProvider,undefined,'M3 must not expose a status provider without the M1/M2 capability composition');
    const missingM1Methods=['bindFileReadCapability','verifyFileReadCapability','readFileWithCapability'].filter(name=>{
      const descriptor=Object.getOwnPropertyDescriptor(gateway,name);
      return !descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='function';
    });
    if(missingM1Methods.length>0){
      assert.deepEqual(missingM1Methods,['bindFileReadCapability','verifyFileReadCapability','readFileWithCapability']);
      assert.equal(host.reason,'M1_HELD_FILE_CAPABILITY_UNAVAILABLE');
    }else{
      assert.ok([
        'M2_PUBLIC_ADAPTER_UNAVAILABLE',
        'M5_STRICT_ROUTER_COMPOSITION_UNAVAILABLE',
        'M5_PUBLIC_POLICY_ROUTER_UNAVAILABLE',
      ].includes(host.reason));
    }
    assert.equal(host.m5Callbacks(),0);
    assert.equal(gateway.evidence().length,0);
    assert.equal(fs.readFileSync(file,'utf8'),marker);
    return;
  }

  const statusProvider=host.securityCenterStatusProvider;
  assert.equal(typeof statusProvider,'function','the first-party M3 host must expose M2 live status to the Security Center route');
  if(typeof statusProvider!=='function')throw new Error('M3_SECURITY_CENTER_STATUS_PROVIDER_UNAVAILABLE');
  const statusEvidenceBefore=gateway.evidence().length;
  const liveStatus=await statusProvider() as any;
  assert.equal(liveStatus.gateway?.protectionStatus,'PROTECTED');
  assert.equal(liveStatus.gateway?.connectionStatus,'CONNECTED');
  assert.equal(liveStatus.policy?.protectionStatus,'PROTECTED');
  assert.equal(liveStatus.coverage,'M2_FIXED_FILE_READS_ONLY');
  assert.equal(gateway.evidence().length,statusEvidenceBefore,'status inspection must not dispatch a read or write evidence');
  assert.equal(host.m5Callbacks(),0,'status inspection must not enter M5 execution');

  const beforeProbeEvidence=gateway.evidence().length;
  const safeRead=await dispatchProtectedRead(host,{path:'agent-canary-public.txt'});
  if(safeRead.status!=='ALLOW'){
    // An incomplete M5 candidate may still block every strict file read. That is UNKNOWN, not success.
    assert.equal(gateway.evidence().length,beforeProbeEvidence);
    assert.equal(fs.readFileSync(file,'utf8'),marker);
    return;
  }
  assert.equal(safeRead.reason,'HELD_FILE_POSITIVE_CONTROL');
  assert.equal(host.m5Callbacks(),1);
  const afterPositive=evidence.snapshot().length;
  assert.ok(afterPositive>0);

  const aliasOutcome=await dispatchProtectedRead(host,{path:'./agent-canary-public.txt'});
  assert.equal(aliasOutcome.status,'DENY');
  assert.equal(host.m5Callbacks(),1,'an alias must be rejected before the M5 execution callback');
  assert.equal(gateway.evidence().length,afterPositive,'an alias must not dispatch to M1');
  assert.equal(fs.readFileSync(file,'utf8'),marker,'an alias attempt must not change the fixture');

  const held=path.join(root,'agent-canary-public.txt.held');
  const replacement=path.join(root,'agent-canary-public.txt.replacement');
  fs.renameSync(file,held);
  fs.writeFileSync(replacement,'replacement bytes',{flag:'wx',mode:0o600});
  fs.renameSync(replacement,file);
  const replacementOutcome=await dispatchProtectedRead(host,{path:'agent-canary-public.txt'});
  assert.equal(replacementOutcome.status,'DENY');
  assert.equal(host.m5Callbacks(),1,'a path replacement must be rejected before the M5 execution callback');
  assert.equal(gateway.evidence().length,afterPositive,'a replacement must not dispatch to M1');
  assert.equal(fs.readFileSync(file,'utf8'),'replacement bytes');
  assert.equal(fs.readFileSync(held,'utf8'),marker);
});

test('M3 host dependency seam stays UNKNOWN and side-effect free when the trusted M2 adapter is unavailable',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-m3-host-seam-'));
  const file=path.join(root,'agent-canary-public.txt');
  const original='M3_SEAM_FIXTURE_UNCHANGED';
  fs.writeFileSync(file,original,{flag:'wx',mode:0o600});
  const guard=createAgentGuard({sessionId:'m3-host-seam-test',alert:false});
  let adapterLoads=0,routerFactoryCalls=0,reads=0;
  // Structural unit double only: this test proves fail-closed injection behavior,
  // not that the product Gateway or a real M2/M5 composition can read a file.
  const structuralGateway=Object.freeze({
    bindFileReadCapability(){return Object.freeze(Object.create(null));},
    verifyFileReadCapability(){return true;},
    readFileWithCapability(){reads++;return Promise.resolve({content:original});},
  });
  try{
    const host=await createProtectedHostAdapter(structuralGateway,guard,root,{
      loadM2Facade:async()=>{adapterLoads++;throw new Error('M2 adapter intentionally unavailable in structural seam test');},
      createSecurityToolRouter:(()=>{routerFactoryCalls++;throw new Error('M5 must not be entered without M2');}) as never,
    });
    assert.equal(host.status,'UNKNOWN');
    assert.equal(host.reason,'M2_PUBLIC_ADAPTER_UNAVAILABLE');
    assert.equal(host.dispatch,undefined);
    assert.equal(host.securityCenterStatusProvider,undefined);
    assert.equal(adapterLoads,1);
    assert.equal(routerFactoryCalls,0);
    assert.equal(host.m5Callbacks(),0);
    assert.equal(reads,0);
    assert.equal(fs.readFileSync(file,'utf8'),original);
    assert.deepEqual(await dispatchProtectedRead(host,{path:'agent-canary-public.txt'}),{
      status:'UNKNOWN',reason:'M2_PUBLIC_ADAPTER_UNAVAILABLE',markerMatched:false,
    });
    assert.deepEqual(await dispatchProtectedRead(host,{path:'./agent-canary-public.txt'}),{
      status:'DENY',reason:'FIXED_PROBE_PATH_REQUIRED',markerMatched:false,
    });
    assert.equal(host.m5Callbacks(),0);
    assert.equal(reads,0);
    assert.equal(fs.readFileSync(file,'utf8'),original);
  }finally{
    const realRoot=fs.realpathSync(root),realTemp=fs.realpathSync(os.tmpdir()),relative=path.relative(realTemp,realRoot);
    assert.notEqual(relative,'..');assert.ok(!relative.startsWith('..'+path.sep));
    fs.rmSync(realRoot,{recursive:true,force:true});
  }
});

test('M3 host does not substitute its local router when the composed M5 public export is absent',async()=>{
  let bindings=0,adapterLoads=0,policyLoads=0,reads=0;
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-m3-m5-missing-'));
  const file=path.join(root,'agent-canary-public.txt');
  const original='M3_M5_MISSING_FIXTURE_UNCHANGED';
  fs.writeFileSync(file,original,{flag:'wx',mode:0o600});
  const gateway=Object.freeze({
    bindFileReadCapability(){bindings++;return Object.freeze(Object.create(null));},
    verifyFileReadCapability(){return true;},
    readFileWithCapability(){reads++;throw new Error('unavailable M5 must never reach a file read');},
  });
  try{
    const host=await createProtectedHostAdapter(gateway,createAgentGuard({alert:false}),root,{
      loadM5PolicyRouter:async()=>{policyLoads++;return{};},
      loadM2Facade:async()=>{adapterLoads++;throw new Error('M2 must not load without the public M5 router');},
    });
    assert.equal(host.status,'UNKNOWN');
    assert.equal(host.reason,'M5_PUBLIC_POLICY_ROUTER_UNAVAILABLE');
    assert.equal(host.dispatch,undefined);
    assert.equal(host.m5Callbacks(),0);
    assert.equal(policyLoads,1);
    assert.equal(bindings,0);
    assert.equal(adapterLoads,0);
    assert.equal(reads,0);
    assert.equal(fs.readFileSync(file,'utf8'),original);
  }finally{
    const realRoot=fs.realpathSync(root),realTemp=fs.realpathSync(os.tmpdir()),relative=path.relative(realTemp,realRoot);
    assert.notEqual(relative,'..');assert.ok(!relative.startsWith('..'+path.sep));
    fs.rmSync(realRoot,{recursive:true,force:true});
  }
});

test('first-party connection-check runtime passes only its fixed trusted inputs into the M1/M2/M5 seam',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-m3-runtime-seam-'));
  const file=path.join(root,'agent-canary-public.txt');
  fs.writeFileSync(file,'M3_RUNTIME_FIXTURE',{flag:'wx',mode:0o600});
  const structuralGateway=Object.freeze({
    bindFileReadCapability(){return Object.freeze(Object.create(null));},
    verifyFileReadCapability(){return true;},
    readFileWithCapability(){throw new Error('structural gateway must not read');},
  });
  let gatewayOptions:Record<string,unknown>|undefined;
  let adapterOptions:Record<string,unknown>|undefined;
  let defaultGateway:ReturnType<typeof createTrustedExecutionGateway>|undefined;
  try{
    // Model an M3 package composed before M5's public package entry was added.
    // The current repository does export it, so inject the missing-export case.
    const defaultRuntime=await createConnectionCheckRuntime({workspaceRoot:root,loadM5PolicyRouter:async()=>({})});
    defaultGateway=defaultRuntime.gateway;
    assert.equal(defaultRuntime.protectedHost.status,'UNKNOWN');
    assert.equal(defaultRuntime.protectedHost.reason,'M5_PUBLIC_POLICY_ROUTER_UNAVAILABLE');
    assert.equal(defaultRuntime.protectedHost.m5Callbacks(),0);
    assert.equal(defaultRuntime.evidence.snapshot().length,0);
    assert.equal(fs.readFileSync(file,'utf8'),'M3_RUNTIME_FIXTURE');
    await defaultGateway.close();
    defaultGateway=undefined;

    const runtime=await createConnectionCheckRuntime({
      workspaceRoot:root,
      createGateway:((options:Record<string,unknown>)=>{gatewayOptions=options;return structuralGateway as never;}) as never,
      loadM2Facade:async()=>({createSecurityGatewayHostAdapter:(options:unknown)=>{
        adapterOptions=options as Record<string,unknown>;
        return{dispatch:async()=>{throw new Error('structural adapter must not dispatch');}};
      }}),
      createSecurityToolRouter:(()=>{throw new Error('M5 must remain behind the trusted M2 adapter');}) as never,
    });
    assert.equal(gatewayOptions?.workspaceRoot,root);
    assert.deepEqual(gatewayOptions?.files,[{path:'agent-canary-public.txt'}]);
    assert.equal(adapterOptions?.gateway,structuralGateway);
    assert.deepEqual(adapterOptions?.fixedFileReads,{protected_read:['agent-canary-public.txt']});
    const routerOptions=adapterOptions?.routerOptions as Record<string,unknown>;
    assert.equal(routerOptions.guard,runtime.guard);
    assert.equal(routerOptions.workspaceRoot,root);
    assert.equal(routerOptions.mode,'OBSERVE');
    assert.equal(routerOptions.verifyRealPaths,true);
    assert.equal(typeof adapterOptions?.createSecurityToolRouter,'function');
    assert.equal(runtime.protectedHost.status,'UNKNOWN');
    assert.equal(runtime.protectedHost.reason,'POSITIVE_CONTROL_PENDING');
    assert.equal(fs.readFileSync(file,'utf8'),'M3_RUNTIME_FIXTURE');
  }finally{
    await defaultGateway?.close();
    const realRoot=fs.realpathSync(root),realTemp=fs.realpathSync(os.tmpdir()),relative=path.relative(realTemp,realRoot);
    assert.notEqual(relative,'..');assert.ok(!relative.startsWith('..'+path.sep));
    fs.rmSync(realRoot,{recursive:true,force:true});
  }
});
