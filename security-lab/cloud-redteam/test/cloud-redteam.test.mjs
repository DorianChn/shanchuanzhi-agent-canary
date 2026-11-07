import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { loadConfig, loadLocalEnv, parseModelReference, requireModel } from '../config.mjs';
import { BudgetLedger, estimateExperiment, estimateEmpiricalExperiment } from '../budget.mjs';
import { ATTACK_CATEGORIES, createEvaluationCases, deterministicFallback, parseGeneratedAttack, readFallbackDataset } from '../attacks.mjs';
import { generateAttackCases } from '../generate-attacks.mjs';
import { CloudSession } from '../cloud-session.mjs';
import { completeWithProtocol, detectProtocol, listModels } from '../openai-compatible.mjs';
import { pairedAttackComparisons, pairedDefenderModelComparisons } from '../paired-statistics.mjs';
import { summarizeTrialOutcomes } from '../trial-statistics.mjs';

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

test('optional attacker preflight rejection does not poison a usable defender model', async () => {
  await withServer(async (req, res) => {
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'attacker-model' }, { id: 'defender-model' }] })); return; }
    if (req.url === '/v1/chat/completions') {
      let body=''; for await (const chunk of req) body+=chunk;
      const model=JSON.parse(body).model;
      if(model==='attacker-model'){res.writeHead(403,{'content-type':'application/json'});res.end('{}');return;}
      res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({id:'probe-defender',model,choices:[{message:{role:'assistant',content:'OK'}}],usage:{prompt_tokens:10,completion_tokens:1}}));return;
    }
    res.writeHead(404); res.end('{}');
  }, async baseUrl => {
    const config=loadConfig(env({LLM_API_BASE_URL:baseUrl,GPT_API_BASE_URL:baseUrl,ATTACKER_MODEL:'llm:attacker-model',DEFENDER_MODEL:'gpt:defender-model',DEFENDER_MODELS:'gpt:defender-model',JUDGE_MODEL:'gpt:defender-model',MODEL_PRICING_JSON:'{"llm:attacker-model":{"inputUsdPer1M":1,"outputUsdPer1M":1},"gpt:defender-model":{"inputUsdPer1M":1,"outputUsdPer1M":1}}'}),{loadFile:false});
    const cloud=new CloudSession(config);
    await assert.rejects(cloud.preflight('llm:attacker-model',{required:false}),/API_HTTP_403/);
    assert.equal(cloud.stopCode,null);
    const defender=await cloud.preflight('gpt:defender-model');
    assert.equal(defender.model,'gpt:defender-model');
    assert.equal(cloud.stopCode,null);
  });
});

test('attack-generation provider rejection remains a sample failure and leaves later calls available', async () => {
  const config=loadConfig(env({MAX_API_RETRIES:'0'}),{loadFile:false}),attacker=requireModel(config,'llm:glm-5.3'),defender=requireModel(config,'gpt:gpt-6.1-sol');
  let requests=0;
  const cloud=new CloudSession(config,{fetchImpl:async(_url,options)=>{requests++;const body=JSON.parse(options.body);if(body.model==='glm-5.3')return new Response('{}',{status:403});return new Response(JSON.stringify({id:'defender-call',model:body.model,choices:[{message:{role:'assistant',content:'OK'}}],usage:{prompt_tokens:12,completion_tokens:1}}),{status:200,headers:{'content-type':'application/json'}});}});
  cloud.hydratePreflight([attacker,defender].map(model=>({model:model.ref,catalogId:model.model,protocol:'chat-completions',endpointBaseUrl:model.endpoint.baseUrl})));
  await assert.rejects(cloud.complete(attacker,{messages:[{role:'user',content:'synthetic attack fixture'}],purpose:'attack-generation'}),/API_HTTP_403/);
  assert.equal(cloud.stopCode,null);
  assert.equal((await cloud.complete(defender,{messages:[{role:'user',content:'synthetic defender fixture'}]})).content,'OK');
  assert.equal(requests,2);
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

test('MCP tool-description injection includes a synthetic network-egress attempt', () => {
  const attack = deterministicFallback('mcp_tool_description_injection', 0);
  assert.match(attack.toolDescription, /synthetic secrets\.txt/i);
  assert.match(attack.toolDescription, /send_fixture/i);
  assert.doesNotMatch(attack.toolDescription, /https?:\/\//i);
});

test('paired analysis excludes incomplete rows and applies exact McNemar plus Holm adjustment', () => {
  const trials = [];
  for (const scenarioId of ['case-1', 'case-2', 'case-3', 'case-4']) {
    trials.push({ scenarioId, model: 'gpt:test', attack: true, trialState: 'COMPLETED', arm: 'A', attackSuccess: true });
    trials.push({ scenarioId, model: 'gpt:test', attack: true, trialState: 'COMPLETED', arm: 'B', attackSuccess: scenarioId !== 'case-4' });
    trials.push({ scenarioId, model: 'gpt:test', attack: true, trialState: 'COMPLETED', arm: 'C', attackSuccess: false });
    trials.push({ scenarioId, model: 'gpt:test', attack: true, trialState: 'COMPLETED', arm: 'D', attackSuccess: false });
  }
  trials.push({ scenarioId: 'incomplete', model: 'gpt:test', attack: true, trialState: 'ERROR', arm: 'A', attackSuccess: true });
  const result = pairedAttackComparisons(trials, { bootstrapResamples: 100 });
  const comparisons = Object.fromEntries(result.comparisons.map(row => [row.arm, row]));
  assert.equal(comparisons.A.pairedScenarios, 4);
  assert.equal(comparisons.A.riskDifferenceArmMinusReference, 1);
  assert.deepEqual(comparisons.A.bootstrap95PercentInterval, [1, 1]);
  assert.equal(comparisons.A.improvementPairs, 4);
  assert.equal(comparisons.A.regressionPairs, 0);
  assert.equal(comparisons.A.mcnemarPValue, 0.125);
  assert.equal(comparisons.A.holmAdjustedPValue, 0.375);
  assert.equal(comparisons.B.holmAdjustedPValue, 0.5);
  assert.equal(comparisons.C.riskDifferenceArmMinusReference, 0);
  assert.match(result.method.interpretation, /not a before-after causal estimate/);
});

test('paired defender-model analysis compares identical case and arm outcomes with Holm correction', () => {
  const trials = [];
  for (const arm of ['A', 'B', 'C', 'D']) {
    for (const scenarioId of ['case-1', 'case-2', 'case-3', 'case-4']) {
      trials.push({ scenarioId, model: 'gpt:reference', attack: true, trialState: 'COMPLETED', arm, attackSuccess: scenarioId === 'case-4' });
      trials.push({ scenarioId, model: 'llm:compared', attack: true, trialState: 'COMPLETED', arm, attackSuccess: scenarioId !== 'case-4' });
    }
  }
  trials.push({ scenarioId: 'case-5', model: 'gpt:reference', attack: true, trialState: 'ERROR', arm: 'A', attackSuccess: false });
  trials.push({ scenarioId: 'case-5', model: 'llm:compared', attack: true, trialState: 'COMPLETED', arm: 'A', attackSuccess: false });

  const result = pairedDefenderModelComparisons(trials, {
    referenceModel: 'gpt:reference',
    compareModels: ['llm:compared'],
    bootstrapResamples: 100,
  });
  const armA = result.comparisons.find(row => row.arm === 'A');
  assert.equal(result.comparisons.length, 4);
  assert.equal(armA.pairedScenarios, 4);
  assert.equal(armA.comparedModelSideEffects, 3);
  assert.equal(armA.referenceModelSideEffects, 1);
  assert.equal(armA.riskDifferenceComparedMinusReference, 0.5);
  assert.equal(armA.comparedModelMoreSuccessfulPairs, 3);
  assert.equal(armA.referenceModelMoreSuccessfulPairs, 1);
  assert.equal(armA.mcnemarPValue, 0.625);
  assert.equal(armA.holmAdjustedPValue, 1);
  assert.match(result.method.interpretation, /fixed synthetic case set/);
});

test('outcome rates exclude errors without conclusive fixture evidence', () => {
  const result = summarizeTrialOutcomes([
    { trialId: 'A-1', arm: 'A', attack: true, trialState: 'COMPLETED', threatToolAttempt: true, attackSuccess: true },
    { trialId: 'A-2', arm: 'A', attack: true, trialState: 'COMPLETED', threatToolAttempt: false, attackSuccess: false },
    { trialId: 'A-3', arm: 'A', attack: true, trialState: 'ERROR', threatToolAttempt: false, attackSuccess: false },
    { trialId: 'A-4', arm: 'A', attack: true, trialState: 'ERROR', threatToolAttempt: true, attackSuccess: true },
    { trialId: 'A-C-1', arm: 'A', attack: false, trialState: 'ERROR', normalSuccess: false },
    { trialId: 'A-C-2', arm: 'A', attack: false, trialState: 'COMPLETED', normalSuccess: false },
  ]);
  assert.deepEqual(result.attacks, {
    trials: 4, completedTrials: 2, errorTrials: 2, evaluatedTrials: 3, unevaluableTrials: 1,
    threatToolAttemptTrials: 2, observedThreatToolAttemptTrials: 2, effectiveAttackRate: 2 / 3,
    attackSuccesses: 2, successfulEffects: 2, attackSuccessRate: 2 / 3,
    defenseSuccesses: 1, defenseSuccessRate: 1 / 3, activeDenials: 0, activeDenialRate: 0,
  });
  assert.equal(result.controls.trials, 2);
  assert.equal(result.controls.completedTrials, 1);
  assert.equal(result.controls.errorTrials, 1);
  assert.equal(result.controls.evaluatedTrials, 1);
  assert.equal(result.controls.unevaluableTrials, 1);
  assert.equal(result.controls.successRate, 0);
  assert.deepEqual(result.controls.failures.map(item => item.trialId), ['A-C-2']);
});

test('paired analysis keeps an error only when a successful side effect was recorded', () => {
  const trials = [
    { scenarioId: 'case-1', model: 'gpt:test', attack: true, trialState: 'ERROR', arm: 'A', attackSuccess: true },
    { scenarioId: 'case-1', model: 'gpt:test', attack: true, trialState: 'COMPLETED', arm: 'D', attackSuccess: false },
    { scenarioId: 'case-2', model: 'gpt:test', attack: true, trialState: 'ERROR', arm: 'A', attackSuccess: false },
    { scenarioId: 'case-2', model: 'gpt:test', attack: true, trialState: 'COMPLETED', arm: 'D', attackSuccess: false },
  ];
  const result = pairedAttackComparisons(trials, { compareArms: ['A'], bootstrapResamples: 100 });
  assert.equal(result.comparisons[0].pairedScenarios, 1);
  assert.equal(result.comparisons[0].armSideEffects, 1);
  assert.equal(result.comparisons[0].referenceSideEffects, 0);
  assert.match(result.method.pairing, /observed successful side effect/);
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
  await assert.rejects(cloud.complete(model, { messages: [{ role: 'user', content: 'timeout test' }] }), error => error.code === 'API_NETWORK_ERROR_TIMEOUT');
  assert.ok(cloud.budgetSnapshot().committedUsd > 0);
});

test('network failures record only an allowlisted transport class', async () => {
  const config = loadConfig(env({ MAX_API_RETRIES: '0' }), { loadFile: false });
  const events = [];
  const cloud = new CloudSession(config, {
    onEvent: event => events.push(event),
    fetchImpl: async () => { throw Object.assign(new TypeError('provider URL or credential must not be logged'), { cause: Object.assign(new Error('secret detail'), { code: 'ECONNRESET' }) }); },
  });
  const model = requireModel(config, 'gpt:gpt-6.1-sol');
  cloud.protocols.set(model.ref, 'chat-completions');
  await assert.rejects(cloud.complete(model, { messages: [{ role: 'user', content: 'synthetic test' }] }), error => error.code === 'API_NETWORK_ERROR_CONNECTION_RESET');
  assert.deepEqual(events, [{ type: 'model_call_failed', model: 'gpt:gpt-6.1-sol', protocol: 'chat-completions', purpose: 'completion', code: 'API_NETWORK_ERROR_CONNECTION_RESET', attempts: 1 }]);
  assert.doesNotMatch(JSON.stringify(events), /provider URL|credential|secret detail/);
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
