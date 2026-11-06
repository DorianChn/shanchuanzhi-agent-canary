import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { estimateAgentDojoPlan, parseAgentDojoArgs, readAgentDojoResults } from '../agentdojo-run.mjs';

test('AgentDojo CLI parser keeps a small deterministic default case and accepts model selection', () => {
  assert.deepEqual(parseAgentDojoArgs([]), {
    suite: 'workspace', userTask: 'user_task_0', injectionTask: 'injection_task_0', attack: 'tool_knowledge', defense: 'tool_filter',
  });
  assert.deepEqual(parseAgentDojoArgs([
    '--suite=travel', '--user-task', 'user_task_2', '--injection-task=injection_task_3',
    '--attack', 'tool_knowledge', '--defense=repeat_user_prompt', '--model', 'gpt:sample-model',
  ]), {
    suite: 'travel', userTask: 'user_task_2', injectionTask: 'injection_task_3',
    attack: 'tool_knowledge', defense: 'repeat_user_prompt', model: 'gpt:sample-model',
  });
});

test('AgentDojo estimate prints a cost forecast and honors an explicitly unlimited budget', () => {
  const modelRef = { ref: 'llm:sample-model', model: 'sample-model', endpoint: { protocol: 'chat-completions' } };
  const plan = estimateAgentDojoPlan({
    maxTestBudgetUsd: Number.POSITIVE_INFINITY,
    modelPrices: { 'llm:sample-model': { inputUsdPer1M: 0.1, outputUsdPer1M: 0.2 } },
  }, modelRef, parseAgentDojoArgs([]), 12.5);
  assert.equal(plan.package, 'agentdojo==0.1.35');
  assert.equal(plan.withinBudget, true);
  assert.equal(plan.remainingBudgetUsd, 'unlimited');
  assert.equal(plan.priorCommittedUsd, 12.5);
  assert.ok(plan.estimatedInputTokens > 0 && plan.estimatedOutputTokens > 0 && plan.estimatedUsd > 0);
});

test('AgentDojo trace reader recognizes only upstream result rows with measured utility and security', () => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-agentdojo-results-'));
  try {
    const tracePath = path.join(runDir, 'model', 'workspace', 'user_task_0', 'tool_knowledge', 'injection_task_0.json');
    fs.mkdirSync(path.dirname(tracePath), { recursive: true });
    fs.writeFileSync(tracePath, JSON.stringify({ utility: true, security: false, user_task_id: 'user_task_0', attack_type: 'tool_knowledge' }));
    fs.writeFileSync(path.join(runDir, 'invalid.json'), '{not-json');
    const results = readAgentDojoResults(runDir);
    assert.equal(results.length, 1);
    assert.equal(results[0].security, false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});
