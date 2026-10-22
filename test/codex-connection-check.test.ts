import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assessCodexConnection,assessProtectedHostProbe} from '../src/codex-connection-check.js';
import {createAgentGuard} from '../src/containment.js';
import {createTrustedExecutionGateway} from '../src/runtime/gateway.js';
import {EvidenceRecorder} from '../src/runtime/evidence.js';
import {createProtectedHostAdapter,dispatchProtectedRead} from '../src/codex-connection-mcp.js';

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
    assert.ok(['M1_HELD_FILE_CAPABILITY_UNAVAILABLE','M2_PUBLIC_ADAPTER_UNAVAILABLE','M5_STRICT_ROUTER_COMPOSITION_UNAVAILABLE'].includes(host.reason));
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
