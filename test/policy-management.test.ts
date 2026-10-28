import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createManagedRiskPolicyRouter,
  createProjectPolicyManager,
  verifyPolicyEvidenceExport,
} from '../src/policy-management.js';
import { evidenceDigest } from '../src/runtime/evidence.js';

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

test('a taint denial during pending approval is recorded in structured policy evidence', async () => {
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  let callbacks = 0;
  const router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-stale-egress-approval', alert: false }),
    workspaceRoot: workspace(), policyStorageDirectory: storage(), mode: 'BALANCED',
    tools: { fetch_docs: { operation: 'http' }, read_secret: { operation: 'sensitive-read' } },
    allowedReadOrigins: ['https://docs.example.test'],
    executeRealTool: call => { callbacks++; return call.name; },
  });

  await assert.rejects(router.dispatch({
    name: 'fetch_docs', args: { url: 'https://docs.example.test/submit', method: 'POST', body: 'public fixture' },
  }), (error: unknown) => error instanceof PolicyBlockedError && error.decision.action === 'APPROVAL_REQUIRED');
  const networkRequestId = router.pendingApprovals().find(item => item.tool === 'fetch_docs')!.requestId;

  await assert.rejects(router.dispatch({ name: 'read_secret' }), (error: unknown) =>
    error instanceof PolicyBlockedError && error.decision.action === 'APPROVAL_REQUIRED');
  const secretRequestId = router.pendingApprovals().find(item => item.tool === 'read_secret')!.requestId;
  await router.approve(secretRequestId, 'host-operator');
  const evidenceCountBeforeStaleApproval = router.policyManager.evidence().length;

  await assert.rejects(router.approve(networkRequestId, 'host-operator'), (error: unknown) =>
    error instanceof PolicyBlockedError && error.decision.reason === 'possible_sensitive_egress');

  const staleApprovalEvidence = router.policyManager.evidence().slice(evidenceCountBeforeStaleApproval);
  assert.ok(staleApprovalEvidence.some(event =>
    event.event_type === 'DECISION' && event.decision_source === 'DETERMINISTIC_POLICY' &&
    event.decision === 'DENY' && event.execution_status === 'NOT_STARTED' &&
    event.reason_code === 'possible_sensitive_egress' && event.tool_id === 'fetch_docs'));
  assert.equal(callbacks, 1, 'only the approved sensitive read may reach the executor');
  assert.equal(router.policyManager.verifyEvidence().valid, true);
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

test('managed held reads recheck a new project denial before the provider starts', async () => {
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  for (const mode of ['OBSERVE', 'STRICT'] as const) {
    const root = fs.realpathSync(workspace()), target = path.join(root, 'public.txt');
    const sentinel = 'M5_MANAGED_HELD_READ_FIXTURE';
    fs.writeFileSync(target, sentinel);
    const before = createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    const capability = Object.freeze(Object.create(null));
    let providerReads = 0, pathCallbacks = 0;
    let router!: ReturnType<typeof createManagedRiskPolicyRouter<string>>;
    router = createManagedRiskPolicyRouter({
      guard: createAgentGuard({ sessionId: `managed-held-project-denial-${mode}`, alert: false }),
      workspaceRoot: root, policyStorageDirectory: storage(), mode, verifyRealPaths: true,
      tools: { read_file: { operation: 'file-read' } },
      fileReadCapability: {
        resolve: () => capability,
        verify: (candidate, call, operation) => candidate === capability && call.name === 'read_file' && call.args.path === 'public.txt' && operation === 'file-read',
        readFileWithCapability: async () => { providerReads++; return fs.readFileSync(target, 'utf8'); },
      },
      reviewDecision: async () => {
        assert.equal(router.policyManager.apply([
          { id: 'deny_held_read', tool: 'read_file', effect: 'DENY', reasonCode: 'project_read_restricted' },
        ], 'operator').applied, true);
        return 'UNCHANGED';
      },
      executeRealTool: () => { pathCallbacks++; return 'path callback must not run'; },
    });

    await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'public.txt' } }), (error: unknown) =>
      error instanceof PolicyBlockedError && error.decision.action === 'DENY' && error.decision.reason === 'project_read_restricted');
    assert.equal(providerReads, 0);
    assert.equal(pathCallbacks, 0);
    assert.equal(router.pendingApprovals().length, 0);
    assert.equal(fs.readFileSync(target, 'utf8'), sentinel);
    assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'), before);
    const final = router.policyManager.evidence().at(-1);
    assert.equal(final?.decision_source, 'PROJECT_POLICY');
    assert.equal(final?.decision, 'DENY');
    assert.equal(final?.reason_code, 'project_read_restricted');
    assert.equal(final?.policy_version, 1);
    assert.equal(final?.execution_status, 'NOT_STARTED');
    assert.equal(router.policyManager.verifyEvidence().valid, true);
  }
});

test('managed held reads fail closed when audit corrupts after initial review', async () => {
  const { createAgentGuard } = await import('../src/sdk.js');
  const root = fs.realpathSync(workspace()), store = storage(), capability = Object.freeze(Object.create(null));
  fs.writeFileSync(path.join(root, 'public.txt'), 'M5_MANAGED_AUDIT_FIXTURE');
  let providerReads = 0, pathCallbacks = 0;
  let router!: ReturnType<typeof createManagedRiskPolicyRouter<string>>;
  router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-held-audit-corruption', alert: false }),
    workspaceRoot: root, policyStorageDirectory: store, mode: 'OBSERVE', verifyRealPaths: true,
    tools: { read_file: { operation: 'file-read' } },
    fileReadCapability: {
      resolve: () => capability, verify: candidate => candidate === capability,
      readFileWithCapability: async () => { providerReads++; return 'must not read'; },
    },
    reviewDecision: async () => {
      fs.appendFileSync(path.join(store, 'project-policies', `${router.policyManager.projectId}.jsonl`), '{}\n');
      return 'UNCHANGED';
    },
    executeRealTool: () => { pathCallbacks++; return 'path callback must not run'; },
  });

  await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'public.txt' } }), /POLICY_AUDIT/);
  assert.equal(providerReads, 0);
  assert.equal(pathCallbacks, 0);
  assert.equal(router.pendingApprovals().length, 0);
  assert.equal(fs.readFileSync(path.join(root, 'public.txt'), 'utf8'), 'M5_MANAGED_AUDIT_FIXTURE');
});

test('managed held reads record successful and uncertain provider outcomes', async () => {
  const { createAgentGuard } = await import('../src/sdk.js');
  for (const failed of [false, true]) {
    const root = fs.realpathSync(workspace()), capability = Object.freeze(Object.create(null));
    const sentinel = 'M5_HELD_OUTCOME_DO_NOT_LOG';
    fs.writeFileSync(path.join(root, 'public.txt'), sentinel);
    let providerReads = 0, pathCallbacks = 0;
    const failure = Error('M5_HELD_FAILURE_DO_NOT_LOG');
    const router = createManagedRiskPolicyRouter({
      guard: createAgentGuard({ sessionId: `managed-held-outcome-${failed}`, alert: false }),
      workspaceRoot: root, policyStorageDirectory: storage(), mode: 'STRICT',
      tools: { read_file: { operation: 'file-read' } },
      fileReadCapability: {
        resolve: () => capability, verify: candidate => candidate === capability,
        readFileWithCapability: async candidate => {
          assert.equal(candidate, capability);
          providerReads++;
          if (failed) throw failure;
          return fs.readFileSync(path.join(root, 'public.txt'), 'utf8');
        },
      },
      executeRealTool: () => { pathCallbacks++; return 'path callback must not run'; },
    });

    const read = router.dispatch({ name: 'read_file', args: { path: 'public.txt' } });
    if (failed) await assert.rejects(read, error => error === failure);
    else assert.equal(await read, sentinel);
    assert.equal(providerReads, 1);
    assert.equal(pathCallbacks, 0);
    assert.equal(router.pendingApprovals().length, 0);
    const events = router.policyManager.evidence(), outcome = events.at(-1);
    assert.ok(events.some(event => event.reason_code === 'final_pre_execution_check'));
    assert.equal(outcome?.event_type, 'EXECUTION_RESULT');
    assert.equal(outcome?.decision_source, 'TOOL');
    assert.equal(outcome?.decision, 'NOT_APPLICABLE');
    assert.equal(outcome?.execution_status, failed ? 'UNKNOWN' : 'SUCCEEDED');
    assert.equal(outcome?.side_effect_verification, failed ? 'UNKNOWN' : 'NOT_VERIFIED');
    assert.equal(router.policyManager.exportEvidence().includes(sentinel), false);
    assert.equal(router.policyManager.exportEvidence().includes(failure.message), false);
    assert.equal(router.policyManager.verifyEvidence().valid, true);
  }
});

test('managed held reads hold the policy lock through provider completion', { timeout: 5000 }, async () => {
  const { createAgentGuard } = await import('../src/sdk.js');
  const root = fs.realpathSync(workspace()), capability = Object.freeze(Object.create(null));
  fs.writeFileSync(path.join(root, 'public.txt'), 'M5_HELD_LOCK_FIXTURE');
  let release!: () => void, entered!: () => void, pathCallbacks = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const rule = { id: 'deny_held_read', tool: 'read_file', effect: 'DENY', reasonCode: 'project_read_restricted' };
  const router = createManagedRiskPolicyRouter({
    guard: createAgentGuard({ sessionId: 'managed-held-policy-lock', alert: false }),
    workspaceRoot: root, policyStorageDirectory: storage(), mode: 'STRICT',
    tools: { read_file: { operation: 'file-read' } },
    fileReadCapability: {
      resolve: () => capability, verify: candidate => candidate === capability,
      readFileWithCapability: async () => { entered(); await gate; return 'M5_HELD_LOCK_FIXTURE'; },
    },
    executeRealTool: () => { pathCallbacks++; return 'path callback must not run'; },
  });

  const read = router.dispatch({ name: 'read_file', args: { path: 'public.txt' } });
  try {
    await started;
    assert.throws(() => router.policyManager.apply([rule], 'operator'), /POLICY_STORE_LOCKED_OR_UNAVAILABLE/);
  } finally {
    release();
    await read;
  }
  assert.equal(await read, 'M5_HELD_LOCK_FIXTURE');
  assert.equal(pathCallbacks, 0);
  assert.equal(router.policyManager.currentVersion(), 0, 'the concurrent policy mutation must not be reported as applied');
  assert.equal(router.policyManager.evidence().at(-1)?.policy_version, 0);
  assert.equal(router.policyManager.apply([rule], 'operator').applied, true, 'the completed read must release the policy lock');
  assert.equal(router.policyManager.verifyEvidence().valid, true);
});

test('managed held reads keep missing and invalid providers fail closed', async () => {
  const { createAgentGuard, PolicyBlockedError } = await import('../src/sdk.js');
  for (const scenario of ['missing', 'missing_reader', 'invalid'] as const) {
    const root = fs.realpathSync(workspace()), capability = Object.freeze(Object.create(null));
    fs.writeFileSync(path.join(root, 'public.txt'), 'M5_MANAGED_INVALID_PROVIDER_FIXTURE');
    let providerReads = 0, pathCallbacks = 0;
    const provider = {
      resolve: () => capability, verify: () => scenario !== 'invalid',
      ...(scenario === 'missing_reader' ? {} : { readFileWithCapability: async () => { providerReads++; return 'must not read'; } }),
    };
    const router = createManagedRiskPolicyRouter({
      guard: createAgentGuard({ sessionId: `managed-held-${scenario}`, alert: false }),
      workspaceRoot: root, policyStorageDirectory: storage(), mode: 'STRICT',
      tools: { read_file: { operation: 'file-read' } },
      // Deliberately incomplete host-provider shape must retain its hard denial.
      fileReadCapability: scenario === 'missing' ? undefined : provider as any,
      executeRealTool: () => { pathCallbacks++; return 'path callback must not run'; },
    });

    await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'public.txt' } }), (error: unknown) =>
      error instanceof PolicyBlockedError && error.decision.action === 'DENY' && error.decision.reason === 'path_execution_not_pinned');
    assert.equal(providerReads, 0);
    assert.equal(pathCallbacks, 0);
    assert.equal(router.pendingApprovals().length, 0);
  }
});

test('managed held reads quarantine after result audit failure and retain the original outcome', async () => {
  const { createAgentGuard, CanaryBlockedError } = await import('../src/sdk.js');
  for (const failed of [false, true]) {
    const root = fs.realpathSync(workspace()), store = storage(), capability = Object.freeze(Object.create(null));
    fs.writeFileSync(path.join(root, 'public.txt'), 'M5_HELD_COMPLETED_FIXTURE');
    const guard = createAgentGuard({ sessionId: `managed-held-outcome-audit-failure-${failed}`, alert: false });
    const failure = Error('M5_HELD_UNCERTAIN_FIXTURE');
    let providerReads = 0, pathCallbacks = 0;
    let router!: ReturnType<typeof createManagedRiskPolicyRouter<string>>;
    router = createManagedRiskPolicyRouter({
      guard, workspaceRoot: root, policyStorageDirectory: store, mode: 'STRICT',
      tools: { read_file: { operation: 'file-read' } },
      fileReadCapability: {
        resolve: () => capability, verify: candidate => candidate === capability,
        readFileWithCapability: async () => {
          providerReads++;
          fs.appendFileSync(path.join(store, 'project-policies', `${router.policyManager.projectId}.jsonl`), '{}\n');
          if (failed) throw failure;
          return 'M5_HELD_COMPLETED_FIXTURE';
        },
      },
      executeRealTool: () => { pathCallbacks++; return 'path callback must not run'; },
    });

    const outcome = router.dispatch({ name: 'read_file', args: { path: 'public.txt' } });
    if (failed) await assert.rejects(outcome, error => error === failure);
    else assert.equal(await outcome, 'M5_HELD_COMPLETED_FIXTURE');
    assert.equal(guard.state, 'QUARANTINED');
    await assert.rejects(router.dispatch({ name: 'read_file', args: { path: 'public.txt' } }), CanaryBlockedError);
    assert.equal(providerReads, 1, 'the completed read must not be retried or described as blocked');
    assert.equal(pathCallbacks, 0);
    assert.equal(router.policyManager.verifyEvidence().valid, false);
  }
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
  assert.equal(verifyPolicyEvidenceExport(bundle).reason, 'VALID_LOCAL_CHAIN_UNANCHORED');
  assert.equal(verifyPolicyEvidenceExport(bundle, head).valid, true);
  assert.equal(verifyPolicyEvidenceExport(bundle, '0'.repeat(64)).reason, 'HEAD_MISMATCH');
  const changed = bundle.replace('project_network_restricted', 'policy_network_restricted');
  assert.equal(verifyPolicyEvidenceExport(changed).valid, false);
  const data = JSON.parse(bundle);
  data.events.pop();
  assert.equal(verifyPolicyEvidenceExport(JSON.stringify(data)).valid, false);

  const rewritten = JSON.parse(bundle);
  rewritten.events.at(-1).decision = 'ALLOW';
  rewritten.events.at(-1).reason_code = 'policy_allowed';
  let previous: string | null = null;
  for (const event of rewritten.events) {
    delete event.event_digest;
    event.previous_event_digest = previous;
    event.event_digest = evidenceDigest(event);
    previous = event.event_digest;
  }
  rewritten.anchored_head = previous;
  const rewrittenBundle = JSON.stringify(rewritten);
  assert.equal(verifyPolicyEvidenceExport(rewrittenBundle).reason, 'VALID_LOCAL_CHAIN_UNANCHORED', 'a self-recomputed bundle must never claim an independent anchor');
  assert.equal(verifyPolicyEvidenceExport(rewrittenBundle, head).reason, 'HEAD_MISMATCH', 'the separately retained trusted head must detect a rewritten chain');
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
test('failed audit validation never caches a corrupted log as trusted', () => {
  const root = workspace(), store = storage();
  const manager = createProjectPolicyManager({ workspaceRoot: root, storageDirectory: store });
  manager.apply([denyRule()], 'operator');
  fs.appendFileSync(path.join(store, 'project-policies', `${manager.projectId}.jsonl`), '{}\n');

  assert.throws(() => manager.currentRules(), /POLICY_AUDIT_CHAIN_INVALID/);
  assert.throws(() => manager.currentRules(), /POLICY_AUDIT_CHAIN_INVALID/, 'repeating a failed read must not return the previous cache');
  assert.throws(() => manager.apply([], 'operator', true), /POLICY_AUDIT_CHAIN_INVALID/);
  assert.throws(() => manager.exportEvidence(), /POLICY_AUDIT_CHAIN_INVALID/);
  assert.equal(manager.verifyEvidence().valid, false);
  assert.equal(manager.verifyEvidence().valid, false);
  const fresh = createProjectPolicyManager({ workspaceRoot: root, storageDirectory: store });
  assert.throws(() => fresh.currentRules(), /POLICY_AUDIT_CHAIN_INVALID/);
});

test('native lab hook logs only the fixed allowlist and drops synthetic sensitive canaries', t => {
  const tempParent = path.resolve(os.tmpdir());
  const root = fs.mkdtempSync(path.join(tempParent, 'canary-policy-native-hook-'));
  t.after(() => {
    const resolvedRoot = path.resolve(root);
    assert.equal(path.dirname(resolvedRoot), tempParent, 'synthetic fixture must remain directly under the temp directory');
    const stat = fs.lstatSync(resolvedRoot);
    assert.equal(stat.isDirectory(), true);
    assert.equal(stat.isSymbolicLink(), false);
    fs.rmSync(resolvedRoot, { recursive: true });
  });

  const canaries = {
    session: 'M5_SESSION_SHOULD_NOT_PERSIST',
    toolName: 'M5_TOOL_NAME_SHOULD_NOT_PERSIST',
    command: 'M5_TOOL_ARGUMENT_SHOULD_NOT_PERSIST',
    filePath: 'M5_FILE_PATH_SHOULD_NOT_PERSIST',
    callerData: 'M5_CALLER_CONTROLLED_SHOULD_NOT_PERSIST',
    reason: 'M5_REASON_SHOULD_NOT_PERSIST',
    decisionMetadata: 'M5_DECISION_METADATA_SHOULD_NOT_PERSIST',
  };
  const logFile = path.join(root, 'hook.jsonl');
  const wrapper = path.resolve('security-lab/claude-native-hook.mjs');
  const input = {
    session_id: canaries.session,
    tool_name: canaries.toolName,
    tool_input: {
      command: canaries.command,
      file_path: path.join(root, canaries.filePath),
      caller_value: canaries.callerData,
    },
  };
  const decisionCases = [
    { decision: 'allow', fallback: 'Agent Canary: permission_allowed' },
    { decision: 'deny', fallback: 'Agent Canary: permission_denied' },
    { decision: 'ask', fallback: 'Agent Canary: approval_required' },
  ] as const;
  for (const { decision, fallback } of decisionCases) {
    const modulePath = path.join(root, `synthetic-hook-${decision}.mjs`);
    const moduleSource = `export async function decideAgentHook() {
    return { hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: ${JSON.stringify(decision)},
      permissionDecisionReason: ${JSON.stringify(canaries.reason)},
      callerControlledMetadata: ${JSON.stringify(canaries.decisionMetadata)}
    } };
}\n`;
    fs.writeFileSync(modulePath, moduleSource, { flag: 'wx' });

    const result = spawnSync(process.execPath, [wrapper, modulePath, root, path.join(root, 'state'), logFile], {
      input: JSON.stringify(input), encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.error, undefined, `${decision} hook execution failed`);
    assert.equal(result.status, 0, `${decision} hook exited unsuccessfully`);
    const response = JSON.parse(result.stdout);
    assert.equal(response.hookSpecificOutput.permissionDecision, decision, `${decision} decision changed`);
    assert.equal(response.hookSpecificOutput.permissionDecisionReason, fallback, `${decision} reason was not sanitized`);
    for (const canary of Object.values(canaries)) {
      assert.equal(result.stdout.includes(canary), false, `hook output contains synthetic canary ${canary}`);
      assert.equal(result.stderr.includes(canary), false, `hook stderr contains synthetic canary ${canary}`);
    }
  }

  const log = fs.readFileSync(logFile, 'utf8');
  const lines = log.trim().split(/\r?\n/);
  assert.equal(lines.length, decisionCases.length);
  const records = lines.map(line => JSON.parse(line));
  for (const [index, record] of records.entries()) {
    assert.deepEqual(Object.keys(record), ['timestamp', 'hookEventName', 'permissionDecision']);
    assert.equal(new Date(record.timestamp).toISOString(), record.timestamp);
    assert.equal(record.hookEventName, 'PreToolUse');
    assert.equal(record.permissionDecision, decisionCases[index].decision);
  }
  for (const canary of Object.values(canaries)) {
    assert.equal(log.includes(canary), false, `persisted hook log contains synthetic canary ${canary}`);
  }
});
