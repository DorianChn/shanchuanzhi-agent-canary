import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAgentGuard} from '../src/containment.js';
import {createTrustedExecutionGateway,type GatewayReadHost} from '../src/runtime/gateway.js';
import {EvidenceRecorder} from '../src/runtime/evidence.js';
import {createSecurityGatewayHostAdapter} from '../src/runtime/gateway-adapter.js';

test('fixed M2 adapter accepts a real M1 Gateway and forwards only the registered read binding',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-gateway-adapter-'));
  fs.mkdirSync(path.join(root,'docs'));
  fs.writeFileSync(path.join(root,'docs','guide.md'),'PUBLIC_FIXTURE');
  const gateway=createTrustedExecutionGateway({agentId:'adapter-fixture',guard:createAgentGuard({alert:false}),workspaceRoot:root,files:[{path:'docs/guide.md'}],evidence:new EvidenceRecorder()});
  try{
    const adapter=createSecurityGatewayHostAdapter({gateway,fixedFileReads:[{toolName:'read_file',path:'docs/guide.md'}]});
    const controller=new AbortController();
    assert.equal(adapter.supports({name:'read_file',args:{path:'docs/guide.md'}}),true);
    assert.equal(adapter.supports({name:'read_file',args:{path:'docs/private.md'}}),false);
    assert.deepEqual(await adapter.dispatch({name:'read_file',args:{path:'docs/guide.md'}},controller.signal),{content:'PUBLIC_FIXTURE'});
    for(const call of [
      {name:'read_file',args:{path:'docs/private.md'}},
      {name:'write_file',args:{path:'docs/guide.md'}},
      {name:'read_file',args:{path:'docs/guide.md',content:'injected'}},
    ])assert.throws(()=>adapter.dispatch(call as never),/M2_GATEWAY_ADAPTER_CALL_DENIED/);
    assert.equal(adapter.callbackCount(),1);
  }finally{await gateway.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('adapter rejects a lookalike host callback that is not an M1 Gateway',()=>{
  const fake={agent:{dispatch:async()=>({content:'NOT_GATEWAY_BOUND'})}} as unknown as GatewayReadHost;
  assert.throws(()=>createSecurityGatewayHostAdapter({gateway:fake,fixedFileReads:[{toolName:'read_file',path:'docs/guide.md'}]}),/M2_GATEWAY_ADAPTER_CONFIG_INVALID/);
});
