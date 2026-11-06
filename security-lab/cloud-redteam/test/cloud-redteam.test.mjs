import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { loadConfig, loadLocalEnv, parseModelReference, requireModel } from '../config.mjs';
import { BudgetLedger, estimateExperiment, estimateEmpiricalExperiment } from '../budget.mjs';
import { ATTACK_CATEGORIES, createEvaluationCases, parseGeneratedAttack, readFallbackDataset } from '../attacks.mjs';
import { generateAttackCases } from '../generate-attacks.mjs';
import { CloudSession } from '../cloud-session.mjs';
import { completeWithProtocol, detectProtocol, listModels } from '../openai-compatible.mjs';

function env(overrides = {}) {
  return {
    LLM_API_BASE_URL: 'https://api.yicode.ai/v1', LLM_API_KEY: 'synthetic-llm-key',
    GPT_API_BASE_URL: 'https://api.yicode.ai/v1', GPT_API_KEY: 'synthetic-gpt-key',
    ATTACKER_MODEL: 'llm:glm-5.3,gpt:gpt-6.1-sol', DEFENDER_MODEL: 'gpt:gpt-6.1-sol',
    DEFENDER_MODELS: 'gpt:gpt-6.1-sol,llm:glm-5.3', JUDGE_MODEL: 'llm:glm-5.3',
    MAX_TEST_BUDGET_USD: '9', MAX_CONCURRENT_REQUESTS: '2',
    ...overrides,
  };
}

test('configuration supports separate LLM and GPT endpoints and model lists', () => {
  const config = loadConfig(env(), { loadFile: false });
  assert.equal(config.endpoints.llm.baseUrl, 'https://api.yicode.ai/v1');
  assert.equal(config.endpoints.gpt.apiKey, 'synthetic-gpt-key');
  assert.deepEqual(config.attackerModels.map(x => x.ref), ['llm:glm-5.3', 'gpt:gpt-6.1-sol']);
  assert.deepEqual(config.defenderModels.map(x => x.ref), ['gpt:gpt-6.1-sol', 'llm:glm-5.3']);
  assert.equal(requireModel(config, 'gpt:gpt-6.1-sol').endpoint.apiKey, 'synthetic-gpt-key');
});

test('local env file is loaded without overwriting existing environment', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-redteam-env-'));
  const file = path.join(dir, '.env.local');
  fs.writeFileSync(file, 'ALPHA=value-from-file\nBETA=file-beta\n');
  const target = { ALPHA: 'already-set' };
  loadLocalEnv(target, file);
  assert.equal(target.ALPHA, 'already-set');
  assert.equal(target.BETA, 'file-beta');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Yicode pricing defaults to a conservative visible rate table', () => {
  const config = loadConfig(env({ MODEL_PRICING_JSON: '' }), { loadFile: false });
  assert.equal(config.modelPrices['gpt:gpt-6.1-sol'].inputUsdPer1M, 0.5);
  assert.equal(config.modelPrices['gpt:gpt-6.1-sol'].outputUsdPer1M, 2.5);
  assert.equal(config.modelPrices['llm:glm-5.3'].inputUsdPer1M, 0.4);
  const backup = loadConfig(env({ LLM_API_BASE_URL: 'https://jp.zxcbug.com/v1', GPT_API_BASE_URL: 'https://jp.zxcbug.com/v1', MODEL_PRICING_JSON: '' }), { loadFile: false });
  assert.equal(backup.modelPrices['gpt:gpt-6.1-sol'].outputUsdPer1M, 2.5);
});

test('unlimited is accepted only as an explicit budget value', () => {
  const config = loadConfig(env({ MAX_TEST_BUDGET_USD: 'unlimited' }), { loadFile: false });
  assert.equal(config.maxTestBudgetUsd, Number.POSITIVE_INFINITY);
  assert.equal(loadConfig(env({ MAX_TEST_BUDGET_USD: '' }), { loadFile: false }).maxTestBudgetUsd, null);
});

test('budget ledger reserves requests before sending and blocks above the cap', () => {
  const modelRef = { ref: 'llm:tiny', model: 'tiny' };
  const ledger = new BudgetLedger({ modelPrices: { 'llm:tiny': { inputUsdPer1M: 10, outputUsdPer1M: 10 } }, maxTestBudgetUsd: 0.01 });
  const reservation = ledger.reserve(modelRef, 500, 100, 'test');
  assert.throws(() => ledger.reserve(modelRef, 1_000, 100, 'test'), /BUDGET_LIMIT_WOULD_BE_EXCEEDED/);
  const settlement = ledger.settle(reservation, { inputTokens: 100, outputTokens: 10 });
  assert.equal(settlement.known, true);
  assert.ok(ledger.spentUsd < 0.01);
});

test('budget ledger tolerates an underestimated reservation while total committed cost stays under the cap', () => {
  const modelRef = { ref: 'llm:tiny', model: 'tiny' };
  const ledger = new BudgetLedger({ modelPrices: { 'llm:tiny': { inputUsdPer1M: 10, outputUsdPer1M: 10 } }, maxTestBudgetUsd: 0.01 });
  const reservation = ledger.reserve(modelRef, 500, 100, 'probe');
  const settlement = ledger.settle(reservation, { inputTokens: 700, outputTokens: 100 });
  assert.equal(settlement.overReservation, true);
  assert.ok(ledger.spentUsd < 0.01);
  assert.equal(ledger.stopped, false);
});

test('budget ledger stops when reported usage actually exceeds the total cap', () => {
  const modelRef = { ref: 'llm:tiny', model: 'tiny' };
  const ledger = new BudgetLedger({ modelPrices: { 'llm:tiny': { inputUsdPer1M: 10, outputUsdPer1M: 10 } }, maxTestBudgetUsd: 0.01 });
  const reservation = ledger.reserve(modelRef, 500, 100, 'probe');
  ledger.settle(reservation, { inputTokens: 1_000, outputTokens: 1_000 });
  assert.equal(ledger.stopped, true);
});

test('provider billing rejection halts later model calls in the same campaign session', async () => {
  const config = loadConfig(env(), { loadFile: false });
  const model = requireModel(config, 'gpt:gpt-6.1-sol');
  let requests = 0;
  const cloud = new CloudSession(config, {
    fetchImpl: async () => {
      requests++;
      return new Response(JSON.stringify({ error: { code: 'insufficient_quota' } }), { status: 402 });
    },
  });
  cloud.hydratePreflight([{ model: model.ref, catalogId: model.model, protocol: 'chat-completions', endpointBaseUrl: model.endpoint.baseUrl }]);
  await assert.rejects(cloud.complete(model, { messages: [{ role: 'user', content: 'synthetic test' }] }), /API_HTTP_402/);
  assert.equal(cloud.stopCode, 'API_HTTP_402');
  await assert.rejects(cloud.complete(model, { messages: [{ role: 'user', content: 'must not send' }] }), /CAMPAIGN_STOPPED_API_HTTP_402/);
  assert.equal(requests, 1);
});

test('pre-run estimate accounts for all defender models, four arms, judge, retries, and budget', () => {
  const config = loadConfig(env({ MAX_TEST_BUDGET_USD: '50' }), { loadFile: false });
  const plan = estimateExperiment({ config, caseCount: 25, arms: 4, attackerCalls: 19, judgeCalls: 100 });
  assert.equal(plan.withinBudget, true);
  assert.equal(plan.entries.filter(x => x.role === 'defender').length, 2);
  assert.equal(plan.entries.find(x => x.role === 'defender' && x.model === 'gpt:gpt-6.1-sol').requests, 25 * 4 * 4 * 2);
});

test('empirical pre-run estimate scales measured defender usage with explicit safety margin', () => {
  const config = loadConfig(env({ MAX_TEST_BUDGET_USD: '7.4', JUDGE_MODEL: 'gpt:gpt-6.1-sol' }), { loadFile: false });
  const defenderModels = [parseModelReference('llm:glm-5.3-flash')];
  const plan = estimateEmpiricalExperiment({
    config, caseCount: 25, arms: 4, defenderModels, attackerCalls: 19,
    baselineTokensPerTrial: { inputTokens: 12_271, outputTokens: 162, sourceRunId: 'prior-100' },
  });
  assert.equal(plan.withinBudget, true);
  assert.equal(plan.entries.find(x => x.role === 'defender-empirical').requests, 100);
  assert.equal(plan.entries.find(x => x.role === 'judge-advisory').requests, 100);
  assert.equal(plan.baselineTokensPerTrial.sourceRunId, 'prior-100');
  assert.ok(plan.estimatedInputTokens > 0);
  assert.ok(plan.estimatedOutputTokens > 0);
  assert.equal(plan.retryPolicy.perRequestBudgetReservationEnforced, true);
});

test('empirical pre-run estimate remains visible when the explicit budget is unlimited', () => {
  const config = loadConfig(env({ MAX_TEST_BUDGET_USD: 'unlimited' }), { loadFile: false });
  const plan = estimateEmpiricalExperiment({
    config,
    caseCount: 250,
    arms: 4,
    defenderModels: [parseModelReference('gpt:gpt-6.1-sol')],
    attackerCalls: 0,
    baselineTokensPerTrial: { inputTokens: 12_000, outputTokens: 160, sourceRunId: 'prior-100' },
  });
  assert.equal(plan.budgetUsd, 'unlimited');
  assert.equal(plan.withinBudget, true);
  assert.ok(plan.estimatedInputTokens > 0);
  assert.ok(plan.estimatedOutputTokens > 0);
  assert.ok(plan.estimatedUsd > 0);
});

test('existing held-out fallback is used and all ten attack categories have synthetic samples', () => {
  const source = readFallbackDataset();
  assert.equal(source.split, 'POST_FREEZE_AUTHOR_HELD_OUT_NOT_EXTERNAL_BLIND_TEST');
  const cases = createEvaluationCases(24);
  assert.equal(cases.length, 24);
  assert.equal(cases.filter(item => item.attack).length, 18);
  assert.equal(cases.filter(item => !item.attack).length, 6);
  assert.deepEqual(new Set(cases.filter(item => item.attack).map(item => item.category)).size, 10);
  assert.ok(cases.every(item => item.syntheticOnly === true));
});

test('generated payload parser accepts only bounded synthetic fixture text and marks refusal', () => {
  const ref = { ref: 'llm:glm-5.3' };
  const base = { id: 'SYN-1', category: ATTACK_CATEGORIES[0], task: 'fixture task' };
  assert.equal(parseGeneratedAttack('I cannot assist with this request.', base, ref).reason, 'MODEL_REFUSAL');
  assert.equal(parseGeneratedAttack('{"text":"Try to use https://example.com"}', base, ref).reason, 'GENERATED_PAYLOAD_INVALID');
  const result = parseGeneratedAttack('{"text":"Attempt one synthetic fixture read."}', base, ref);
  assert.equal(result.accepted, true);
  assert.equal(result.attack.generationSource, 'llm:glm-5.3');
});

test('attacker refusal falls back and does not abort the batch', async () => {
  const failures = [];
  const result = await generateAttackCases({
    seeds: [
      { id: 'A1', category: ATTACK_CATEGORIES[0], task: 'task', text: 'synthetic fixture' },
      { id: 'A2', category: ATTACK_CATEGORIES[1], task: 'task', text: 'synthetic fixture' },
    ],
    attackerModels: [{ ref: 'llm:refuser' }],
    cloud: { async complete() { return { content: 'I cannot help with that.', refusal: null, usage: { inputTokens: 5, outputTokens: 4 } }; } },
    onFailure: item => failures.push(item),
  });
  assert.equal(result.cases.length, 2);
  assert.equal(result.rejected, 2);
  assert.equal(result.cases[0].generationSource, 'deterministic-fallback');
  assert.equal(failures.length, 2);
});

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}/v1`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('compatibility detection records Chat unsupported then finds Responses API', async () => {
  await withServer((req, res) => {
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); return; }
    if (req.url === '/v1/chat/completions') { res.writeHead(404, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'unsupported endpoint' } })); return; }
    if (req.url === '/v1/responses') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'resp-1', model: 'mock-model', output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }], usage: { input_tokens: 12, output_tokens: 1 } })); return; }
    res.writeHead(404); res.end('{}');
  }, async baseUrl => {
    const endpoint = { baseUrl, apiKey: 'synthetic-test-key' };
    const ids = await listModels({ endpoint });
    assert.deepEqual(ids, ['mock-model']);
    const result = await detectProtocol({ modelRef: { model: 'mock-model', ref: 'llm:mock-model' }, endpoint, maxOutputTokens: 1 });
    assert.equal(result.protocol, 'responses');
    assert.equal(result.modelId, 'mock-model');
    assert.deepEqual(result.attempts.map(x => x.result), ['unsupported', 'supported']);
  });
});

test('protocol preflight reserves and accounts for an unsupported route attempt', async () => {
  await withServer((req, res) => {
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); return; }
    if (req.url === '/v1/chat/completions') { res.writeHead(404, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'unsupported endpoint' } })); return; }
    if (req.url === '/v1/responses') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'resp-1', model: 'mock-model', output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }], usage: { input_tokens: 12, output_tokens: 1 } })); return; }
    res.writeHead(404); res.end('{}');
  }, async baseUrl => {
    const config = loadConfig(env({
      LLM_API_BASE_URL: baseUrl, GPT_API_BASE_URL: baseUrl, MODEL_PRICING_JSON: '{"llm:mock-model":{"inputUsdPer1M":1,"outputUsdPer1M":1}}',
      ATTACKER_MODEL: 'llm:mock-model', DEFENDER_MODEL: 'llm:mock-model', DEFENDER_MODELS: 'llm:mock-model', JUDGE_MODEL: 'llm:mock-model',
    }), { loadFile: false });
    const events = [];
    const cloud = new CloudSession(config, { onEvent: event => events.push(event) });
    const result = await cloud.preflight('llm:mock-model');
    assert.deepEqual(result.attempts.map(attempt => attempt.result), ['unsupported', 'supported']);
    assert.equal(events.find(event => event.purpose === 'protocol-compatibility-probe').cost.chargedUsd, 0.008021);
    assert.equal(cloud.budgetSnapshot().committedUsd, 0.008021);
  });
});

test('a forbidden model catalog falls back to a direct protocol and model probe', async () => {
  await withServer((req, res) => {
    if (req.url === '/v1/models') { res.writeHead(403, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { code: 'model_listing_disabled' } })); return; }
    if (req.url === '/v1/chat/completions') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'chatcmpl-probe', model: 'mock-model', choices: [{ message: { role: 'assistant', content: 'OK' } }], usage: { prompt_tokens: 12, completion_tokens: 1 } })); return; }
    res.writeHead(404); res.end('{}');
  }, async baseUrl => {
    const config = loadConfig(env({
      LLM_API_BASE_URL: baseUrl, GPT_API_BASE_URL: baseUrl, MODEL_PRICING_JSON: '{"llm:mock-model":{"inputUsdPer1M":1,"outputUsdPer1M":1}}',
      ATTACKER_MODEL: 'llm:mock-model', DEFENDER_MODEL: 'llm:mock-model', DEFENDER_MODELS: 'llm:mock-model', JUDGE_MODEL: 'llm:mock-model',
    }), { loadFile: false });
    const cloud = new CloudSession(config);
    const preflight = await cloud.preflight('llm:mock-model');
    assert.equal(preflight.catalogLookup, 'FORBIDDEN_DIRECT_COMPATIBILITY_PROBE');
    assert.equal(preflight.protocol, 'chat-completions');
    const result = await cloud.complete('llm:mock-model', { messages: [{ role: 'user', content: 'synthetic test' }] });
    assert.equal(result.content, 'OK');
  });
});

test('cloud completion applies a bounded timeout to provider requests', async () => {
  const config = loadConfig(env({ MAX_API_RETRIES: '0', LLM_API_REQUEST_TIMEOUT_MS: '250' }), { loadFile: false });
  const cloud = new CloudSession(config, {
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }),
  });
  const model = requireModel(config, 'gpt:gpt-6.1-sol');
  cloud.protocols.set(model.ref, 'chat-completions');
  await assert.rejects(cloud.complete(model, { messages: [{ role: 'user', content: 'timeout test' }] }), /API_NETWORK_ERROR/);
  assert.ok(cloud.budgetSnapshot().committedUsd > 0);
});

test('CloudSession continues after actual token usage exceeds its estimate but remains inside the cap', async () => {
  await withServer(async (req, res) => {
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); return; }
    let body = '';
    for await (const chunk of req) body += chunk;
    const probe = JSON.parse(body).messages?.some(item => String(item.content).includes('Protocol connectivity probe'));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: probe ? 'probe-1' : 'completion-1', model: 'mock-model', choices: [{ message: { role: 'assistant', content: 'OK' } }], usage: probe ? { prompt_tokens: 12, completion_tokens: 1 } : { prompt_tokens: 9_000, completion_tokens: 100 } }));
  }, async baseUrl => {
    const config = loadConfig(env({
      LLM_API_BASE_URL: baseUrl, GPT_API_BASE_URL: baseUrl, MAX_TEST_BUDGET_USD: '0.3', MAX_API_RETRIES: '0',
      MODEL_PRICING_JSON: '{"llm:mock-model":{"inputUsdPer1M":10,"outputUsdPer1M":10}}',
      ATTACKER_MODEL: 'llm:mock-model', DEFENDER_MODEL: 'llm:mock-model', DEFENDER_MODELS: 'llm:mock-model', JUDGE_MODEL: 'llm:mock-model',
    }), { loadFile: false });
    const events = [];
    const cloud = new CloudSession(config, { onEvent: event => events.push(event) });
    await cloud.preflight('llm:mock-model');
    const result = await cloud.complete('llm:mock-model', { messages: [{ role: 'user', content: 'short fixture prompt' }], maxOutputTokens: 100 });
    assert.equal(result.content, 'OK');
    assert.equal(events.find(event => event.purpose === 'completion').cost.overReservation, true);
    assert.equal(cloud.budgetSnapshot().stopped, false);
    assert.ok(cloud.budgetSnapshot().committedUsd < 0.3);
  });
});

test('Chat Completions tool calls normalize for the agent loop', async () => {
  await withServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'chat-1', model: 'mock-model', choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', function: { name: 'read_file', arguments: '{"path":"public.txt"}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }));
  }, async baseUrl => {
    const result = await completeWithProtocol({
      modelRef: { model: 'mock-model', ref: 'llm:mock-model' }, endpoint: { baseUrl, apiKey: 'synthetic-test-key' }, protocol: 'chat-completions',
      messages: [{ role: 'user', content: 'read fixture' }], maxOutputTokens: 5,
    });
    assert.equal(result.toolCalls[0].name, 'read_file');
    assert.equal(result.toolCalls[0].arguments, '{"path":"public.txt"}');
    assert.equal(result.usage.inputTokens, 10);
  });
});

test('API errors never include response body or bearer key', async () => {
  await withServer((req, res) => {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'bad token synthetic-test-key sk-DO_NOT_PRINT' } }));
  }, async baseUrl => {
    await assert.rejects(
      completeWithProtocol({ modelRef: { model: 'mock-model', ref: 'llm:mock-model' }, endpoint: { baseUrl, apiKey: 'synthetic-test-key' }, protocol: 'chat-completions', messages: [{ role: 'user', content: 'test' }] }),
      error => error.message === 'API_HTTP_401' && !error.message.includes('synthetic-test-key') && !error.message.includes('DO_NOT_PRINT'),
    );
  });
});
