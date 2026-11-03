import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-false-positive-'));
process.env.AGENT_CANARY_HOME = testHome;
const { createAgentGuard, createRiskPolicyRouter, createTrustedExecutionGateway, EvidenceRecorder, PolicyBlockedError } = await import('../src/sdk.js');
const { createGatewayFileReadCapabilityProvider } = await import('../src/risk-policy.js');

function setup() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-normal-project-'));
  fs.writeFileSync(path.join(workspaceRoot, 'README.md'), '# Normal project\n');
  const eventsFile = path.join(testHome, `${Math.random()}.jsonl`);
  const guard = createAgentGuard({ sessionId: 'false-positive-test', eventsFile, alert: false });
  const gateway = createTrustedExecutionGateway({ agentId: 'false-positive-test', guard, workspaceRoot, files: [{ path: 'README.md' }], evidence: new EvidenceRecorder() });
  const fileReadCapability = createGatewayFileReadCapabilityProvider(gateway, [{ toolName: 'read_file', path: 'README.md' }]);
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
    fileReadCapability,
    eventsFile,
    executeRealTool: (call: { name: string; args: Record<string, unknown> }) => {
      calls.push(call);
      return { ok: true };
    },
  });
  return { guard, workspaceRoot, router, gateway, calls };
}

test('ordinary repository reads use the held handle and reviewed status commands remain usable', async (t) => {
  const { router, gateway, calls } = setup();t.after(()=>gateway.close());
  await router.dispatch({ name: 'read_file', args: { path: 'README.md' } });
  assert.ok(gateway.evidence().some(event=>event.tool_id==='read_file'&&event.execution_status==='SUCCEEDED'));
  for (const command of ['pwd', 'git status', 'git status --short', 'git diff', 'git diff --stat', 'ls', 'ls -la']) {
    await router.dispatch({ name: 'run_shell', args: { command } });
  }
  await router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/guide', method: 'GET' } });
  assert.equal(calls.length, 8);
});

test('path-based file writes fail closed while a reviewed build requires human confirmation', async (t) => {
  const { router, gateway, calls } = setup();t.after(()=>gateway.close());
  await assert.rejects(router.dispatch({ name: 'write_file', args: { path: 'src/feature.ts', content: 'export {};' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);assert.equal(error.decision.action, 'DENY');assert.equal(error.decision.reason,'path_execution_not_pinned');return true;
  });
  assert.equal(router.pendingApprovals().length,0);assert.equal(calls.length,0);
  let requestId = '';
  await assert.rejects(router.dispatch({ name: 'run_shell', args: { command: 'npm run build' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);assert.equal(error.decision.action, 'APPROVAL_REQUIRED');requestId = error.decision.requestId ?? '';return Boolean(requestId);
  });
  assert.equal(calls.length,0,'confirmation request must not execute its callback');
  await router.approve(requestId, 'reviewed-host-operator');
  assert.equal(calls.length,1,'one-shot host approval executes the reviewed non-file request once');
});

test('outside-workspace paths and unreviewed network writes remain blocked or pending', async (t) => {
  const { router, gateway, calls } = setup();t.after(()=>gateway.close());
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

test('canary quarantine remains authoritative while ordinary tasks otherwise pass', async (t) => {
  const { guard, router, gateway, calls } = setup();t.after(()=>gateway.close());
  guard.trip({ reason: 'test_canary_quarantine' });
  await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'README.md' } }));
  assert.equal(calls.length, 0);
});
