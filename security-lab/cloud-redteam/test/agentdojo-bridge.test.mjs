import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startAgentDojoBridge } from '../agentdojo-bridge.mjs';

function temporaryRunDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-agentdojo-'));
}

test('AgentDojo local bridge authenticates, advertises the selected model, and maps tool calls', async () => {
  const runDir = temporaryRunDir();
  const token = 'synthetic-loopback-token';
  const calls = [];
  const cloud = {
    async complete(modelRef, request) {
      calls.push({ modelRef, request });
      return {
        id: 'cmpl-test', model: modelRef.model, content: null,
        toolCalls: [{ id: 'call-test', name: 'lookup_record', arguments: { record_id: 'synthetic-1' } }],
        usage: { inputTokens: 11, outputTokens: 4 },
      };
    },
  };
  const modelRef = { ref: 'llm:synthetic-model', model: 'synthetic-model' };
  const bridge = await startAgentDojoBridge({ cloud, modelRef, runDir, token });
  try {
    const denied = await fetch(`${bridge.baseUrl}/chat/completions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    });
    assert.equal(denied.status, 401);
    assert.equal(calls.length, 0);

    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const catalog = await fetch(`${bridge.baseUrl}/models`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(catalog.status, 200);
    assert.equal((await catalog.json()).data[0].id, modelRef.model);

    const response = await fetch(`${bridge.baseUrl}/chat/completions`, {
      method: 'POST', headers,
      body: JSON.stringify({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }], tools: [{ type: 'function', function: { name: 'lookup_record' } }] }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.choices[0].message.tool_calls[0].function.name, 'lookup_record');
    assert.deepEqual(JSON.parse(result.choices[0].message.tool_calls[0].function.arguments), { record_id: 'synthetic-1' });
    assert.equal(result.usage.prompt_tokens, 11);
    assert.equal(result.usage.completion_tokens, 4);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].request.maxOutputTokens, 512);
    assert.equal(calls[0].request.purpose, 'agentdojo-benchmark');
  } finally {
    await bridge.close();
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('AgentDojo local bridge records provider rejection and invokes the stop hook', async () => {
  const runDir = temporaryRunDir();
  const token = 'synthetic-loopback-token';
  const rejected = Object.assign(new Error('provider access denied'), { code: 'API_HTTP_403' });
  const stopCodes = [];
  const bridge = await startAgentDojoBridge({
    cloud: { async complete() { throw rejected; } },
    modelRef: { ref: 'llm:synthetic-model', model: 'synthetic-model' },
    runDir, token, onProviderStop: code => stopCodes.push(code),
  });
  try {
    const response = await fetch(`${bridge.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'probe' }] }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(stopCodes, ['API_HTTP_403']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(runDir, 'provider-stop.json'), 'utf8')).code, 'API_HTTP_403');
  } finally {
    await bridge.close();
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});
