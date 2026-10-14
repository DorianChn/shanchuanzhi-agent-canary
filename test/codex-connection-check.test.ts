import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCodexConnection} from '../src/codex-connection-check.js';

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
