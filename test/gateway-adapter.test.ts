import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSecurityGatewayHostAdapter} from '../src/runtime/gateway-adapter.js';

test('fixed M2 adapter forwards only the registered read binding and cancellation signal',async()=>{
  const calls:Array<{call:unknown;signal?:AbortSignal}>=[];
  const gateway={agent:{dispatch:async(call:unknown,signal?:AbortSignal)=>{calls.push({call,signal});return{content:'PUBLIC_FIXTURE'};}}};
  const adapter=createSecurityGatewayHostAdapter({gateway,fixedFileReads:[{toolName:'read_file',path:'docs/guide.md'}]});
  const controller=new AbortController();
  assert.deepEqual(await adapter.dispatch({name:'read_file',args:{path:'docs/guide.md'}},controller.signal),{content:'PUBLIC_FIXTURE'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].signal,controller.signal);
  assert.deepEqual(calls[0].call,{name:'read_file',args:{path:'docs/guide.md'}});
  for(const call of [
    {name:'read_file',args:{path:'docs/private.md'}},
    {name:'write_file',args:{path:'docs/guide.md'}},
    {name:'read_file',args:{path:'docs/guide.md',content:'injected'}},
  ])assert.throws(()=>adapter.dispatch(call as never),/M2_GATEWAY_ADAPTER_CALL_DENIED/);
  assert.equal(calls.length,1);
  assert.equal(adapter.callbackCount(),1);
});
