import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-false-positive-'));
process.env.AGENT_CANARY_HOME = testHome;
const { createAgentGuard, createRiskPolicyRouter, PolicyBlockedError } = await import('../src/sdk.js');

function setup() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-normal-project-'));
  fs.writeFileSync(path.join(workspaceRoot, 'README.md'), '# Normal project\n');
  const eventsFile = path.join(testHome, `${Math.random()}.jsonl`);
  const guard = createAgentGuard({ sessionId: 'false-positive-test', eventsFile, alert: false });
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const router = createRiskPolicyRouter({
    guard,
    workspaceRoot,
    mode: 'BALANCED',
    tools: {
      read_file: { operation: 'file-read' },
      write_file: { operation: 'file-write' },
      run_shell: { operation: 'shell' },
      fetch_docs: { operation: 'http' },
    },
    allowedReadOrigins: ['https://docs.example.test'],
    eventsFile,
    executeRealTool: (call: { name: string; args: Record<string, unknown> }) => {
      calls.push(call);
      return { ok: true };
    },
  });
  return { guard, workspaceRoot, router, calls };
}

test('ordinary repository reads and reviewed status commands are not denied', async () => {
  const { router, calls } = setup();
  await router.dispatch({ name: 'read_file', args: { path: 'README.md' } });
  for (const command of ['pwd', 'git status', 'git status --short', 'git diff', 'git diff --stat', 'ls', 'ls -la']) {
    await router.dispatch({ name: 'run_shell', args: { command } });
  }
  await router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/guide', method: 'GET' } });
  assert.equal(calls.length, 9);
});

test('routine development writes and builds require one explicit human confirmation', async () => {
  const { router, calls } = setup();
  for (const call of [
    { name: 'write_file', args: { path: 'src/feature.ts', content: 'export {};' } },
    { name: 'run_shell', args: { command: 'npm run build' } },
  ]) {
    const callsBefore = calls.length;
    let requestId = '';
    await assert.rejects(router.dispatch(call), (error: unknown) => {
      assert.ok(error instanceof PolicyBlockedError);
      assert.equal(error.decision.action, 'APPROVAL_REQUIRED');
      requestId = error.decision.requestId ?? '';
      return Boolean(requestId);
    });
    assert.equal(calls.length, callsBefore, 'confirmation request must not execute its callback');
    await router.approve(requestId, 'reviewed-host-operator');
    assert.equal(calls.length, callsBefore + 1, 'one-shot host approval executes the request once');
  }
  assert.equal(calls.length, 2);
});

test('outside-workspace paths and unreviewed network writes remain blocked or pending', async () => {
  const { router, calls } = setup();
  await assert.rejects(router.dispatch({ name: 'read_file', args: { path: '../outside.txt' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.action, 'DENY');
    return true;
  });
  await assert.rejects(router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/upload', method: 'POST', body: 'normal source text' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.action, 'APPROVAL_REQUIRED');
    return true;
  });
  assert.equal(calls.length, 0);
});

test('canary quarantine remains authoritative while ordinary tasks otherwise pass', async () => {
  const { guard, router, calls } = setup();
  guard.trip({ reason: 'test_canary_quarantine' });
  await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'README.md' } }));
  assert.equal(calls.length, 0);
});
