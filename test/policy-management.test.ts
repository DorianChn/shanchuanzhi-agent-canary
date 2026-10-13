import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createManagedRiskPolicyRouter,
  createProjectPolicyManager,
  verifyPolicyEvidenceExport,
} from '../src/policy-management.js';

function workspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'canary-policy-project-'));
}
function storage() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'canary-policy-store-'));
}
function denyRule(id = 'deny_docs_network') {
  return { id, tool: 'fetch_docs', risk: 'NETWORK' as const, effect: 'DENY' as const, reasonCode: 'project_network_restricted' };
}

test('project policies only tighten, report conflicts, and require acknowledgement to remove restrictions', () => {
  const manager = createProjectPolicyManager({ workspaceRoot: workspace(), storageDirectory: storage() });
  const first = manager.apply([denyRule()], 'human-operator');
  assert.equal(first.applied, true);
  assert.equal(first.version, 1);

  const overlap = manager.preview([
    { id: 'all_network', tool: 'fetch_docs', effect: 'DENY', reasonCode: 'network_restricted' },
    denyRule('docs_only'),
  ]);
  assert.deepEqual(overlap.conflicts, [{ code: 'OVERLAPPING_SELECTOR', ruleIds: ['all_network', 'docs_only'] }]);
  assert.equal(manager.apply(overlap.rules, 'human-operator').applied, false);
  assert.equal(manager.currentVersion(), 1);

  const weakening = manager.preview([]);
  assert.equal(weakening.weakensProjectPolicy, true);
  assert.equal(weakening.requiresWeakeningAcknowledgement, true);
  assert.equal(manager.apply([], 'human-operator').applied, false);
  const accepted = manager.apply([], 'human-operator', true);
  assert.equal(accepted.applied, true);
  assert.equal(accepted.version, 2);

  const restored = manager.rollback(1, 'human-operator', true);
  assert.equal(restored.applied, true);
  assert.equal(restored.version, 3, 'rollback creates a new version rather than rewriting history');
  assert.deepEqual(manager.currentRules(), [denyRule()]);
  assert.deepEqual(manager.history().map(x => x.version), [1, 2, 3]);
  assert.throws(() => manager.apply([{ ...denyRule(), effect: 'ALLOW' }], 'human-operator'), /BASELINE_WEAKENING/);
});

test('changing a deny rule selector to a narrower scope requires explicit weakening acknowledgement', () => {
  const manager = createProjectPolicyManager({ workspaceRoot: workspace(), storageDirectory: storage() });
  assert.equal(manager.apply([denyRule()], 'operator').applied, true);
  const narrowed = [{ ...denyRule(), risk: 'WRITE' as const }];
  const preview = manager.preview(narrowed);
  assert.deepEqual(preview.changed, ['deny_docs_network']);
  assert.equal(preview.weakensProjectPolicy, true);
  assert.equal(manager.apply(narrowed, 'operator').applied, false);

  const broadened = [{ id: 'deny_docs_network', tool: 'fetch_docs', effect: 'DENY' as const, reasonCode: 'project_network_restricted' }];
  assert.equal(manager.preview(broadened).requiresWeakeningAcknowledgement, false);
  assert.equal(manager.apply(broadened, 'operator').applied, true);
});

test('managed router enforces project denial before the callback and records version, source and reason', async () => {
  const root = workspace(), store = storage();
  let callbacks = 0;
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  const guard = createAgentGuard({ sessionId: 'managed-policy', alert: false });
  const router = createManagedRiskPolicyRouter({
    guard,
    workspaceRoot: root,
    policyStorageDirectory: store,
    invocationSource: 'SDK',
    mode: 'BALANCED',
    tools: { fetch_docs: { operation: 'http' } },
    allowedReadOrigins: ['https://docs.example.test'],
    executeRealTool: () => { callbacks++; return 'ok'; },
  });
  assert.equal(router.policyManager.apply([denyRule()], 'operator').applied, true);
  await assert.rejects(router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/guide', method: 'GET', marker: 'DO_NOT_LOG_ME' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.action, 'DENY');
    return true;
  });
  assert.equal(callbacks, 0);
  const event = router.policyManager.evidence().find(e => e.decision_source === 'PROJECT_POLICY');
  assert.equal(event?.policy_version, 1);
  assert.equal(event?.invocation_source, 'SDK');
  assert.equal(event?.decision, 'DENY');
  assert.equal(event?.reason_code, 'project_network_restricted');
  assert.ok(!router.policyManager.exportEvidence().includes('DO_NOT_LOG_ME'));
});

test('known risky development work waits for a human even when a reviewer returns unchanged', async () => {
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  let callbacks = 0;
  const router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-approval', alert: false }),
    workspaceRoot: workspace(), policyStorageDirectory: storage(), mode: 'BALANCED',
    tools: { write_file: { operation: 'file-write' } },
    reviewDecision: async () => 'UNCHANGED', reviewDecisionSource: 'MODEL_REVIEW',
    executeRealTool: () => { callbacks++; return 'written'; },
  });
  await assert.rejects(router.dispatch({ name: 'write_file', args: { path: 'src/app.ts', content: 'normal source' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.action, 'APPROVAL_REQUIRED');
    return true;
  });
  assert.equal(callbacks, 0);
  await router.approve(router.pendingApprovals()[0].requestId, 'host-operator');
  assert.equal(callbacks, 1);
  assert.ok(router.policyManager.evidence().some(e => e.decision === 'REQUIRE_CONFIRMATION'));
  assert.ok(router.policyManager.evidence().some(e => e.event_type === 'EXECUTION_RESULT' && e.execution_status === 'SUCCEEDED' && e.side_effect_verification === 'NOT_VERIFIED'));
});

test('a project rule added after initial review is rechecked before the callback starts', async () => {
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  let callbacks = 0;
  let router!: ReturnType<typeof createManagedRiskPolicyRouter<string>>;
  router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-policy-recheck', alert: false }),
    workspaceRoot: workspace(), policyStorageDirectory: storage(), mode: 'BALANCED',
    tools: { fetch_docs: { operation: 'http' } }, allowedReadOrigins: ['https://docs.example.test'],
    reviewDecision: async () => {
      assert.equal(router.policyManager.apply([denyRule('deny_before_execute')], 'operator').applied, true);
      return 'UNCHANGED';
    },
    executeRealTool: () => { callbacks++; return 'should not run'; },
  });

  await assert.rejects(router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/guide', method: 'GET' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.reason, 'project_network_restricted');
    return true;
  });
  assert.equal(callbacks, 0);
  assert.ok(router.policyManager.evidence().some(e => e.policy_version === 1 && e.decision_source === 'PROJECT_POLICY' && e.execution_status === 'NOT_STARTED'));
});

test('a newly added project denial invalidates a previously pending human approval', async () => {
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  let callbacks = 0;
  const router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-pending-policy-update', alert: false }),
    workspaceRoot: workspace(), policyStorageDirectory: storage(), mode: 'BALANCED',
    tools: { write_file: { operation: 'file-write' } },
    executeRealTool: () => { callbacks++; return 'should not write'; },
  });
  await assert.rejects(router.dispatch({ name: 'write_file', args: { path: 'src/app.ts', content: 'safe source' } }), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.action, 'APPROVAL_REQUIRED');
    return true;
  });
  const requestId = router.pendingApprovals()[0].requestId;
  assert.equal(router.policyManager.apply([
    { id: 'deny_writes', tool: 'write_file', risk: 'WRITE', effect: 'DENY', reasonCode: 'project_write_restricted' },
  ], 'operator').applied, true);

  await assert.rejects(router.approve(requestId, 'host-operator'), (error: unknown) => {
    assert.ok(error instanceof PolicyBlockedError);
    assert.equal(error.decision.reason, 'project_write_restricted');
    return true;
  });
  assert.equal(callbacks, 0);
});

test('model denial, hook denial, gateway denial, and tool failure have separate audit sources', () => {
  const manager = createProjectPolicyManager({ workspaceRoot: workspace(), storageDirectory: storage(), invocationSource: 'HOST' });
  manager.recordDecision({ invocationSource: 'SDK', decisionSource: 'MODEL_REVIEW', decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'model_suggested_deny', toolId: 'fetch_docs' });
  manager.recordDecision({ invocationSource: 'NATIVE_HOOK', decisionSource: 'NATIVE_HOOK', decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'hook_pretool_denied', toolId: 'run_shell' });
  manager.recordDecision({ invocationSource: 'GATEWAY', decisionSource: 'GATEWAY', decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'gateway_policy_denied', toolId: 'write_file' });
  manager.recordDecision({ invocationSource: 'SDK', decisionSource: 'TOOL', decision: 'NOT_APPLICABLE', executionStatus: 'UNKNOWN', sideEffectVerification: 'UNKNOWN', reasonCode: 'tool_execution_failed_effects_unknown', toolId: 'run_shell' });
  const events = manager.evidence();
  assert.deepEqual(events.map(e => e.decision_source), ['MODEL_REVIEW', 'NATIVE_HOOK', 'GATEWAY', 'TOOL']);
  assert.deepEqual(events.map(e => e.invocation_source), ['SDK', 'NATIVE_HOOK', 'GATEWAY', 'SDK']);
  assert.equal(events.at(-1)?.execution_status, 'UNKNOWN');
});

test('audit rejects a denial recorded as a successful execution result', () => {
  const manager = createProjectPolicyManager({ workspaceRoot: workspace(), storageDirectory: storage() });
  assert.throws(() => manager.recordDecision({
    decisionSource: 'GATEWAY', decision: 'DENY', executionStatus: 'SUCCEEDED',
    sideEffectVerification: 'NOT_VERIFIED', reasonCode: 'gateway_denied', toolId: 'fetch_docs',
  }), /POLICY_AUDIT_EVENT_INVALID/);
  assert.deepEqual(manager.evidence(), [], 'invalid outcome combinations must not enter the evidence chain');
  assert.equal(manager.evidenceHead(), null);
});

test('a final host Gateway denial remains authoritative after an M5 ALLOW', async () => {
  const { createAgentGuard } = await import('../src/sdk.js');
  let finalGatewayAllows = true;
  let gatewayChecks = 0;
  let sideEffects = 0;
  const router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-gateway-final-check', alert: false }),
    workspaceRoot: workspace(), policyStorageDirectory: storage(), mode: 'BALANCED',
    tools: { fetch_docs: { operation: 'http' } },
    allowedReadOrigins: ['https://docs.example.test'],
    // Model a trusted host/Gateway authorization changing after M5's initial review.
    reviewDecision: async () => { finalGatewayAllows = false; return 'UNCHANGED'; },
    executeRealTool: call => {
      gatewayChecks++;
      // This is the final authorization boundary supplied by the host adapter.
      if (!finalGatewayAllows) throw Error('GATEWAY_FINAL_POLICY_DENIED');
      sideEffects++;
      return call.name;
    },
  });

  await assert.rejects(
    router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/guide', method: 'GET' } }),
    /GATEWAY_FINAL_POLICY_DENIED/,
  );
  assert.equal(gatewayChecks, 1, 'the final host authorization check must run');
  assert.equal(sideEffects, 0, 'M5 ALLOW must not skip a later Gateway denial');
  const events = router.policyManager.evidence();
  assert.ok(events.some(event => event.decision_source === 'DETERMINISTIC_POLICY' && event.decision === 'ALLOW'));
  assert.equal(events.at(-1)?.decision_source, 'TOOL');
  assert.equal(events.at(-1)?.execution_status, 'UNKNOWN', 'an executor boundary failure is not proof that effects were absent');
  assert.equal(events.at(-1)?.side_effect_verification, 'UNKNOWN');
  assert.equal(router.policyManager.verifyEvidence().valid, true);
});

test('managed router records Canary quarantine, blocks callbacks, and resumes only after host reset', async () => {
  const { createAgentGuard, CanaryBlockedError } = await import('../src/sdk.js');
  const guard = createAgentGuard({ sessionId: 'managed-canary-life', alert: false });
  let callbacks = 0;
  const router = createManagedRiskPolicyRouter({
    guard, workspaceRoot: workspace(), policyStorageDirectory: storage(), mode: 'BALANCED',
    tools: { read_file: { operation: 'file-read' } },
    executeRealTool: () => { callbacks++; return 'README'; },
  });

  const decoyReply = await router.dispatch({ name: 'canary_read_secrets', args: {} });
  assert.equal(guard.state, 'QUARANTINED');
  assert.equal(callbacks, 0, 'the decoy reply must never come from the real callback');
  assert.match(JSON.stringify(decoyReply), /cnry_/);
  assert.ok(router.policyManager.evidence().some(e => e.decision_source === 'CANARY_GUARD' && e.reason_code === 'canary_decoy_quarantined' && e.execution_status === 'NOT_STARTED'));

  await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'README.md' } }), CanaryBlockedError);
  assert.equal(callbacks, 0, 'quarantine blocks subsequent ordinary tool calls');

  guard.reset({ acknowledgedBy: 'incident-responder', note: 'reviewed canary incident' });
  assert.equal(guard.state, 'SAFE');
  assert.equal(await router.dispatch({ name: 'read_file', args: { path: 'README.md' } }), 'README');
  assert.equal(callbacks, 1);
  assert.ok(router.policyManager.evidence().some(e => e.decision_source === 'DETERMINISTIC_POLICY' && e.decision === 'ALLOW'));
});

test('evidence export verifies its chain and expected head, and rejects mutation or truncation', () => {
  const manager = createProjectPolicyManager({ workspaceRoot: workspace(), storageDirectory: storage() });
  manager.apply([denyRule()], 'operator');
  manager.recordDecision({ decisionSource: 'PROJECT_POLICY', decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'project_network_restricted', toolId: 'fetch_docs' });
  const head = manager.evidenceHead();
  assert.ok(head);
  const bundle = manager.exportEvidence();
  assert.equal(manager.verifyEvidence(head).valid, true);
  assert.equal(verifyPolicyEvidenceExport(bundle, head).valid, true);
  assert.equal(verifyPolicyEvidenceExport(bundle, '0'.repeat(64)).reason, 'HEAD_MISMATCH');
  const changed = bundle.replace('project_network_restricted', 'policy_network_restricted');
  assert.equal(verifyPolicyEvidenceExport(changed).valid, false);
  const data = JSON.parse(bundle);
  data.events.pop();
  assert.equal(verifyPolicyEvidenceExport(JSON.stringify(data)).valid, false);
});

test('corrupt policy audit fails closed before a real callback starts', async () => {
  const root = workspace(), store = storage();
  const { createAgentGuard } = await import('../src/sdk.js');
  let callbacks = 0;
  const router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'policy-corrupt', alert: false }),
    workspaceRoot: root, policyStorageDirectory: store, mode: 'BALANCED',
    tools: { read_file: { operation: 'file-read' } },
    executeRealTool: () => { callbacks++; return 'read'; },
  });
  router.policyManager.recordDecision({ decisionSource: 'HOST', decision: 'ALLOW', executionStatus: 'NOT_STARTED', reasonCode: 'host_initialized', toolId: 'read_file' });
  const file = path.join(store, 'project-policies', `${router.policyManager.projectId}.jsonl`);
  fs.appendFileSync(file, '{}\n');
  await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'README.md' } }));
  assert.equal(callbacks, 0);
});

test('missing policy log with a retained checkpoint fails closed in warm and fresh managers', () => {
  const root = workspace(), store = storage();
  const manager = createProjectPolicyManager({ workspaceRoot: root, storageDirectory: store });
  manager.apply([denyRule()], 'operator');
  const file = path.join(store, 'project-policies', `${manager.projectId}.jsonl`);
  fs.unlinkSync(file);
  assert.throws(() => manager.currentRules(), /POLICY_AUDIT_HEAD_MISMATCH/);

  const fresh = createProjectPolicyManager({ workspaceRoot: root, storageDirectory: store });
  assert.throws(() => fresh.currentRules(), /POLICY_AUDIT_HEAD_MISMATCH/);
});
