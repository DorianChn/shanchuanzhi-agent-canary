import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';

// Synthetic fixture-level API composition only; this does not prove a production host hookup.
const sourceRoots = Object.fromEntries(['M9', 'M1', 'M2', 'M3', 'M5', 'M6', 'M7', 'M8'].map((moduleName) => {
  const root = process.env[`${moduleName}_ROOT`];
  const sha = process.env[`${moduleName}_SHA`];
  assert.ok(root, `${moduleName}_ROOT must point to its independent checkout`);
  assert.match(sha ?? '', /^[a-f0-9]{40}$/, `${moduleName}_SHA must be the checked-out commit`);
  return [moduleName, { root, sha }];
}));

const pinnedSourceShas = {
  M1: 'a5eff766ebe041bc2c6cc13758827d5a96205de9',
  M2: '868b12a4688282c28091b731f6548d5535c0c37c',
  M3: '27d4a20a20894c7b779edf68d8bf79685bc0e69b',
  M5: '6c16a08c6db26e548dcf63cb845f00ceb5a576ad',
  M6: '2cebabc81d7908c04ddfa10378fa1d3427b92cf4',
  M7: '868842b1b7d76cf94a8d84a5f76c6acd4ca67f50',
  M8: '72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db',
};

const m2PriorM1DispositionSha = 'be66cf8f4c1a60f093740577796ec5cd633e1d93';
const m1M3ReviewedBlobs = {
  'src/agent-hook.ts': '0dc597783386e9273d7167172aa933b17f663e72',
  'test/agent-hook.test.ts': 'cc4e03b939ea6b18f427bb2f9ac026cca5314c63',
  'security-lab/claude-native-hook.mjs': 'ae23875d91c246c0fa833137e71c949bad9bd3cc',
};
const m6PriorAcceptanceSha = '98803607b89f11e24430c461bd91e9c1a0ece9d4';

function assertAncestor(moduleName, ancestorSha, candidateSha, description) {
  const result = spawnSync('git', [
    '-C', sourceRoots[moduleName].root,
    'merge-base',
    '--is-ancestor',
    ancestorSha,
    candidateSha,
  ], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${description} ancestry check must start`);
  assert.equal(result.status, 0, `${description} must remain an ancestor of the exact candidate`);
}

for (const [moduleName, expectedSha] of Object.entries(pinnedSourceShas)) {
  assert.equal(sourceRoots[moduleName].sha, expectedSha, `${moduleName} must use the pinned exact source commit`);
}
assert.equal(process.env.M1_M3_REVIEW_STATUS, 'ACCEPT', 'M1 owner review must accept the current exact M3 Hook candidate');
assert.equal(process.env.M1_M3_REVIEW_SHA, pinnedSourceShas.M1, 'M1 review must name the exact current M1 source head');
assert.equal(process.env.M1_M3_REVIEW_TARGET_SHA, pinnedSourceShas.M3, 'M1 review must name the exact current M3 candidate');
assert.equal(process.env.M1_M3_REVIEW_COMMENT, '6347268881', 'M1 review must cite the exact Issue #72 owner comment');
assert.equal(process.env.M1_M3_REVIEW_ISSUE, '72', 'M1-to-M3 Hook review is tracked on Issue #72');
for (const [filePath, expectedBlob] of Object.entries(m1M3ReviewedBlobs)) {
  assert.equal(readBlobIdAt('M3', pinnedSourceShas.M3, filePath), expectedBlob, `M3 reviewed blob ${filePath} must remain exact`);
}
assert.equal(process.env.M6_PRIOR_ACCEPTANCE_STATUS, 'ACCEPT', 'historical M6 acceptance must retain its original scoped disposition');
assert.equal(process.env.M6_PRIOR_ACCEPTANCE_SHA, m6PriorAcceptanceSha, 'historical M6 acceptance must retain its original source SHA');
assert.equal(process.env.M6_PRIOR_ACCEPTANCE_COMMENT, '6320039569', 'historical M6 acceptance must cite its original Issue #59 comment');
assert.equal(process.env.M6_M8_REVIEW_STATUS, 'ACCEPT_WITH_CONDITIONS', 'current M6 owner comment accepts only the exact M8 test hunk and M6 lifecycle contract');
assert.equal(process.env.M6_M8_REVIEW_M6_CONTRACT_SHA, pinnedSourceShas.M6, 'M6 contract check must identify the exact current M6 source head');
assert.equal(process.env.M6_M8_REVIEW_TARGET_SHA, pinnedSourceShas.M8, 'M6 review must identify the exact M8 test target');
assert.equal(process.env.M6_M8_REVIEW_COMMENT, '6346660246', 'current M6 disposition must cite its exact Issue #59 comment');
assert.equal(process.env.M6_M8_REVIEW_ISSUE, '59', 'current M6 disposition is recorded on Issue #59');
assert.equal(process.env.M6_M8_REVIEW_SCOPE, 'M8 exact test hunk and M6 lifecycle contract checks only', 'M6 disposition remains narrowly scoped');
assert.equal(process.env.M1_M2_REVIEW_STATUS, 'CONDITIONAL_ACCEPT', 'current M1 review conditionally accepts the exact M2 candidate on Issue #52');
assert.equal(process.env.M1_M2_REVIEW_SHA, pinnedSourceShas.M1, 'M1 disposition must identify the exact current M1 review head');
assert.equal(process.env.M1_M2_REVIEW_TARGET_SHA, pinnedSourceShas.M2, 'M1 disposition must identify the exact current M2 candidate');
assert.equal(process.env.M1_M2_REVIEW_COMMENT, '6346736001', 'current M1 disposition must cite its exact Issue #52 comment');
assert.equal(process.env.M1_M2_REVIEW_ISSUE, '52', 'current M1-to-M2 disposition is tracked on Issue #52');
assert.equal(process.env.M1_M2_REVIEW_SCOPE, 'adapter-to-Gateway contract only', 'M1 disposition is limited to the adapter-to-Gateway contract');
assert.equal(process.env.M1_M2_REVIEW_CONDITION, 'M1 API must actually be injected in the composition', 'M1 conditional acceptance requires the reviewed M1 API to be injected');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION, 'ACCEPT_WITH_CONDITIONS', 'historical M1 disposition remains scoped to its reviewed M2 candidate');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION_SHA, m2PriorM1DispositionSha, 'historical disposition must retain its original exact M2 SHA');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION_COMMENT, '6321070391', 'historical disposition must retain its exact Issue #52 comment');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION_ISSUE, '52', 'historical disposition comment 6321070391 is on Issue #52');
assert.equal(process.env.M2_PACKAGE_ALIGNMENT_GATE_ISSUE, '69', 'Issue #69 tracks the M2/M7 package alignment gate');
assert.equal(process.env.M2_PACKAGE_COMPOSITION_HISTORY_ISSUE, '68', 'Issue #68 is retained only as the closed historical composition gate');
assertAncestor('M2', m2PriorM1DispositionSha, pinnedSourceShas.M2, 'historical M1-reviewed M2 disposition');
assertAncestor('M6', m6PriorAcceptanceSha, pinnedSourceShas.M6, 'historical M6 owner acceptance');
assert.equal(process.env.M1_M2_REVIEW_SHA, pinnedSourceShas.M1);
assert.equal(process.env.M5_CODE_SHA, '06fdbb060574e96e5d1eba5c77721014e0a81a3b');

function readTrackedHookBlob(moduleName) {
  const result = spawnSync('git', [
    '-C', sourceRoots[moduleName].root,
    'show',
    'HEAD:security-lab/claude-native-hook.mjs',
  ], { encoding: null, windowsHide: true });
  assert.equal(result.error, undefined, `${moduleName} Hook blob read must start`);
  assert.equal(result.status, 0, `${moduleName} checkout must contain the Hook source`);
  return result.stdout;
}

function readTrackedBlobId(moduleName, filePath) {
  const result = spawnSync('git', [
    '-C', sourceRoots[moduleName].root,
    'rev-parse',
    `HEAD:${filePath}`,
  ], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${moduleName} blob ID lookup must start`);
  assert.equal(result.status, 0, `${moduleName} checkout must contain ${filePath}`);
  return result.stdout.trim();
}

function readBlobIdAt(moduleName, revision, filePath) {
  const result = spawnSync('git', [
    '-C', sourceRoots[moduleName].root,
    'rev-parse',
    `${revision}:${filePath}`,
  ], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${moduleName} blob ID lookup must start`);
  assert.equal(result.status, 0, `${moduleName} revision ${revision} must contain ${filePath}`);
  return result.stdout.trim();
}

test('pinned M2/M5/M7/M9 Hook copies match the current M1 canonical blob', () => {
  const canonicalHook = readTrackedHookBlob('M1');
  for (const moduleName of ['M2', 'M5', 'M7', 'M9']) {
    assert.deepEqual(
      readTrackedHookBlob(moduleName),
      canonicalHook,
      `${moduleName} tracked Hook must match the M1 canonical sanitized wrapper`,
    );
  }
});

test('exact M2 candidate delegates package smoke to the exact pinned M7 workflow and policy', () => {
  const workflow = fs.readFileSync(path.join(sourceRoots.M2.root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const workflowRef = workflow.match(/uses:\s*DorianChn\/shanchuanzhi-agent-canary\/\.github\/workflows\/m7-package-smoke\.yml@([a-f0-9]{40})/);
  const policyRef = workflow.match(/policy-ref:\s*([a-f0-9]{40})/);
  assert.ok(workflowRef, 'M2 CI must call the reusable M7 package-smoke workflow at a full commit SHA');
  assert.ok(policyRef, 'M2 CI must pass a full M7 policy commit SHA');
  assert.equal(workflowRef[1], policyRef[1], 'M2 CI must use the same exact M7 workflow and policy revision');
  assertAncestor('M7', workflowRef[1], pinnedSourceShas.M7, 'M2 package-policy revision');
  for (const filePath of [
    '.github/workflows/m7-package-smoke.yml',
    'scripts/check-package.mjs',
    'scripts/package-file-policy.mjs',
  ]) {
    assert.equal(
      readBlobIdAt('M7', workflowRef[1], filePath),
      readBlobIdAt('M7', pinnedSourceShas.M7, filePath),
      `M7 package-policy file ${filePath} must remain byte-identical between the M2 CI pin and M9 source pin`,
    );
  }
});

test('M8 Hook adapter matches its exact M1-approved source blob', () => {
  assert.equal(
    readTrackedBlobId('M8', 'security-lab/claude-native-hook.mjs'),
    '544b5eb76633469b7185c4ea77d85d7f1754393e',
    'M8 must use the exact Hook adapter blob accepted by M1',
  );
});

const m8CheckoutPolicy = spawnSync('git', ['-C', sourceRoots.M8.root, 'check-attr', 'eol', '--', 'security-lab/claude-native-hook.mjs'], { encoding: 'utf8', windowsHide: true });
assert.equal(m8CheckoutPolicy.status, 0);
assert.equal(m8CheckoutPolicy.stdout.trim(), 'security-lab/claude-native-hook.mjs: eol: lf');
const m8BuildContract = fs.readFileSync(path.join(sourceRoots.M8.root, 'packaging/windows/build-contract.mjs'), 'utf8');
assert.match(m8BuildContract, /tracked\.equals\(fs\.readFileSync\(path\.join\(repoRoot,WRAPPER_PATH\)\)\)/, 'M8 must preserve the strict raw-byte provenance comparison');

console.log('[M9 cross-module source SHAs]', Object.entries(sourceRoots)
  .map(([moduleName, source]) => `${moduleName}=${source.sha}`).join(' '));
console.log('[M1-to-M2 current review]', `${process.env.M1_M2_REVIEW_STATUS} on Issue #52: M1 ${process.env.M1_M2_REVIEW_SHA} reviewed exact M2 ${process.env.M1_M2_REVIEW_TARGET_SHA} (comment ${process.env.M1_M2_REVIEW_COMMENT}; condition: ${process.env.M1_M2_REVIEW_CONDITION})`);
console.log('[M1-to-M3 exact Hook review]', `${process.env.M1_M3_REVIEW_STATUS} on Issue #72: M1 ${process.env.M1_M3_REVIEW_SHA} reviewed M3 ${process.env.M1_M3_REVIEW_TARGET_SHA} blobs ${Object.keys(m1M3ReviewedBlobs).join(', ')} (comment ${process.env.M1_M3_REVIEW_COMMENT})`);
console.log('[M2 prior owner disposition]', `${process.env.M2_PRIOR_M1_DISPOSITION} for older M2 ${process.env.M2_PRIOR_M1_DISPOSITION_SHA} (Issue #52 comment ${process.env.M2_PRIOR_M1_DISPOSITION_COMMENT}); current candidate ${pinnedSourceShas.M2} is not covered by that historical disposition`);
console.log('[M6 current scoped disposition]', `${process.env.M6_M8_REVIEW_STATUS} for M6 contract ${process.env.M6_M8_REVIEW_M6_CONTRACT_SHA} and M8 target ${process.env.M6_M8_REVIEW_TARGET_SHA} (Issue #59 comment ${process.env.M6_M8_REVIEW_COMMENT}; ${process.env.M6_M8_REVIEW_SCOPE})`);
console.log('[M6 prior owner acceptance]', `${process.env.M6_PRIOR_ACCEPTANCE_STATUS} for older M6 ${process.env.M6_PRIOR_ACCEPTANCE_SHA} (Issue #59 comment ${process.env.M6_PRIOR_ACCEPTANCE_COMMENT}; Auto E4 lifecycle only); current candidate ${pinnedSourceShas.M6} is not generally covered by that historical acceptance`);
console.log('[M9 separate evidence SHAs]', `M1_M2_REVIEW_SHA=${process.env.M1_M2_REVIEW_SHA}`, `M5_CODE_SHA=${process.env.M5_CODE_SHA}`);

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-cross-module-home-'));
process.env.AGENT_CANARY_HOME = testHome;
after(() => fs.rmSync(testHome, { recursive: true, force: true }));

const [m1, m2, m5] = await Promise.all([
  import(pathToFileURL(path.join(sourceRoots.M1.root, 'src', 'sdk.ts')).href),
  import(pathToFileURL(path.join(
    sourceRoots.M2.root,
    'execution-isolation',
    'gateway-adapter',
    'security-gateway-adapter.mjs',
  )).href),
  import(pathToFileURL(path.join(sourceRoots.M5.root, 'src', 'sdk.ts')).href),
]);

test('M3 native Hook denies an unpinned normal Read like the current M1 Hook', async () => {
  const [m1Hook, m3Hook] = await Promise.all([
    import(pathToFileURL(path.join(sourceRoots.M1.root, 'src', 'agent-hook.ts')).href),
    import(pathToFileURL(path.join(sourceRoots.M3.root, 'src', 'agent-hook.ts')).href),
  ]);
  const workspace = path.join(testHome, 'm1-m3-native-hook-contract');
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(workspace, 'normal.txt'), 'M9_SYNTHETIC_UNPINNED_READ_FIXTURE');
  const input = {
    session_id: 'm9-m1-m3-unpinned-read',
    tool_name: 'Read',
    tool_input: { file_path: 'normal.txt' },
  };
  const [m1Result, m3Result] = await Promise.all([
    m1Hook.decideAgentHook('claude', workspace, path.join(testHome, 'm1-hook-state'), input),
    m3Hook.decideAgentHook('claude', workspace, path.join(testHome, 'm3-hook-state'), input),
  ]);
  const m1Decision = m1Result.hookSpecificOutput.permissionDecision;
  const m3Decision = m3Result.hookSpecificOutput.permissionDecision;
  assert.equal(m1Decision, 'deny', 'M1 current PR head denies native file I/O without a held-file capability');
  assert.equal(m3Decision, m1Decision, 'M3 must preserve M1 fail-closed behavior for unpinned native file reads');
});

test('M5 real-path mode blocks generic file callbacks before execution and keeps approved HTTPS GET available', async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-m5-real-path-boundary-'));
  fs.mkdirSync(path.join(workspace, 'public'));
  fs.mkdirSync(path.join(workspace, 'private'));
  fs.writeFileSync(path.join(workspace, 'public', 'readable.txt'), 'M9_SYNTHETIC_PUBLIC_FIXTURE');
  fs.writeFileSync(path.join(workspace, 'private', '.env'), 'M9_SYNTHETIC_SECRET_FIXTURE');
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const guard = m1.createAgentGuard({ sessionId: 'm9-m5-real-path-boundary', alert: false });
  const callbackCalls = [];
  const router = m5.createSecurityToolRouter({
    guard,
    workspaceRoot: workspace,
    mode: 'OBSERVE',
    verifyRealPaths: true,
    allowedReadOrigins: ['https://docs.example.test'],
    tools: {
      read: { operation: 'file-read' },
      write: { operation: 'file-write' },
      remove: { operation: 'delete' },
      fetch_docs: { operation: 'http' },
    },
    executeRealTool: (call) => {
      callbackCalls.push(call.name);
      return 'M9_SYNTHETIC_HTTPS_GET';
    },
  });

  for (const call of [
    { name: 'read', args: { path: 'public/readable.txt' } },
    { name: 'write', args: { path: 'public/readable.txt', content: 'M9_SYNTHETIC_MUST_NOT_WRITE' } },
    { name: 'remove', args: { path: 'public/readable.txt' } },
  ]) {
    assert.equal((await router.decide(call)).reason, 'path_execution_not_pinned');
    await assert.rejects(
      router.dispatch(call),
      (error) => error instanceof m5.PolicyBlockedError && error.decision.reason === 'path_execution_not_pinned',
    );
    assert.equal(callbackCalls.length, 0, `${call.name} must fail before the generic path callback`);
    assert.equal(router.pendingApprovals().length, 0, 'fail-closed paths do not create approvals');
  }

  const sensitiveRead = { name: 'read', args: { path: 'private/.env' } };
  assert.equal((await router.decide(sensitiveRead)).reason, 'observe_sensitive_data_blocked');
  await assert.rejects(
    router.dispatch(sensitiveRead),
    (error) => error instanceof m5.PolicyBlockedError && error.decision.action === 'DENY',
  );
  assert.equal(callbackCalls.length, 0, 'OBSERVE cannot waive the deterministic sensitive-path denial');
  assert.equal(router.pendingApprovals().length, 0);

  assert.equal(
    await router.dispatch({ name: 'fetch_docs', args: { url: 'https://docs.example.test/guide', method: 'GET' } }),
    'M9_SYNTHETIC_HTTPS_GET',
  );
  assert.deepEqual(callbackCalls, ['fetch_docs']);
  assert.equal(guard.state, 'SAFE');
});

test('M3 fixed protected_read composes M1 held Gateway, packed M2 public facade, and exact M5 router', async (t) => {
  const packedRoot = process.env.M2_PACKED_ROOT;
  const consumerRoot = process.env.M2_CONSUMER_ROOT;
  assert.ok(packedRoot, 'M2_PACKED_ROOT must point to the installed candidate tarball');
  assert.ok(consumerRoot, 'M2_CONSUMER_ROOT must point to the disposable package consumer');

  const packageRequire = createRequire(path.join(consumerRoot, 'package.json'));
  const packedFacadePath = packageRequire.resolve('@dorianchn/agent-canary/gateway-adapter');
  const expectedFacadePath = path.join(packedRoot, 'execution-isolation', 'gateway-adapter', 'gateway-adapter.mjs');
  assert.equal(path.resolve(packedFacadePath), path.resolve(expectedFacadePath), 'the public export must resolve into the packed M2 candidate');
  const packedFacade = await import(pathToFileURL(packedFacadePath).href);
  assert.deepEqual(Object.keys(packedFacade), ['createSecurityGatewayHostAdapter'], 'only the reviewed public M2 host facade is exposed');

  const m3Host = await import(pathToFileURL(path.join(sourceRoots.M3.root, 'src', 'codex-connection-mcp.ts')).href);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-m3-protected-read-host-'));
  const workspace = path.join(base, 'workspace');
  const relativePath = 'agent-canary-public.txt';
  const publicFile = path.join(workspace, relativePath);
  const marker = 'AGENT_CANARY_PROTECTED_FILE_READ_OK';
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(publicFile, marker);

  let gateway;
  t.after(async () => {
    if (gateway) await gateway.close();
    fs.rmSync(base, { recursive: true, force: true });
  });

  const guard = m1.createAgentGuard({ sessionId: 'm9-m1-m2-m3-m5-protected-read', alert: false });
  gateway = m1.createTrustedExecutionGateway({
    agentId: 'm9-m1-m2-m3-m5-protected-read',
    guard,
    workspaceRoot: workspace,
    files: [{ path: relativePath }],
    evidence: new m1.EvidenceRecorder(),
  });
  let m5Router;
  const host = await m3Host.createProtectedHostAdapter(gateway, guard, workspace, {
    loadM2Facade: async () => packedFacade,
    createSecurityToolRouter: (options) => {
      m5Router = m5.createSecurityToolRouter(options);
      return m5Router;
    },
  });

  assert.equal(host.status, 'UNKNOWN', 'M3 keeps host status UNKNOWN until its fixed protected read is observed');
  assert.equal(host.reason, 'POSITIVE_CONTROL_PENDING');
  assert.equal(typeof host.dispatch, 'function', 'the exact M2 facade and M5 router must compose');
  assert.ok(m5Router, 'M3 must construct the injected pinned M5 router');
  assert.equal(host.m5Callbacks(), 0);

  const positive = await m3Host.dispatchProtectedRead(host, { path: relativePath });
  assert.deepEqual(positive, { status: 'ALLOW', reason: 'HELD_FILE_POSITIVE_CONTROL', markerMatched: true });
  assert.equal(host.m5Callbacks(), 1);
  const evidenceAfterPositive = gateway.evidence().length;
  assert.ok(evidenceAfterPositive > 0, 'the packed facade path reaches the M1 held-file Gateway');
  assert.equal(m5Router.pendingApprovals().length, 0);
  assert.deepEqual(gateway.operator.pending(), []);
  assert.equal(guard.state, 'SAFE');

  const alias = await m3Host.dispatchProtectedRead(host, { path: `./${relativePath}` });
  assert.deepEqual(alias, { status: 'DENY', reason: 'FIXED_PROBE_PATH_REQUIRED', markerMatched: false });
  assert.equal(host.m5Callbacks(), 1, 'M3 rejects aliases before the trusted M5 callback');
  assert.equal(gateway.evidence().length, evidenceAfterPositive, 'the rejected alias does not dispatch to M1');
  assert.equal(fs.readFileSync(publicFile, 'utf8'), marker);
  assert.equal(m5Router.pendingApprovals().length, 0);
  assert.deepEqual(gateway.operator.pending(), []);

  const heldFile = `${publicFile}.held`;
  fs.renameSync(publicFile, heldFile);
  fs.writeFileSync(publicFile, 'M9_SYNTHETIC_REPLACEMENT_BYTES');
  const replaced = await m3Host.dispatchProtectedRead(host, { path: relativePath });
  assert.equal(replaced.status, 'DENY', 'the synthetic path-replacement control remains fail-closed');
  assert.equal(host.m5Callbacks(), 1, 'M1 capability verification rejects the replacement before M5 execution');
  assert.equal(gateway.evidence().length, evidenceAfterPositive, 'the rejected replacement creates no M1 read event');
  assert.equal(fs.readFileSync(publicFile, 'utf8'), 'M9_SYNTHETIC_REPLACEMENT_BYTES');
  assert.equal(fs.readFileSync(heldFile, 'utf8'), marker);
  assert.equal(m5Router.pendingApprovals().length, 0);
  assert.deepEqual(gateway.operator.pending(), []);
  assert.equal(guard.state, 'SAFE');
});

test('packed M2 facade with active M1 capability and exact M5 router rejects sensitive and filesystem aliases', async (t) => {
  const packedRoot = process.env.M2_PACKED_ROOT;
  const consumerRoot = process.env.M2_CONSUMER_ROOT;
  assert.ok(packedRoot, 'M2_PACKED_ROOT must point to the installed candidate tarball');
  assert.ok(consumerRoot, 'M2_CONSUMER_ROOT must point to the disposable package consumer');

  const packageRequire = createRequire(path.join(consumerRoot, 'package.json'));
  const packedFacadePath = packageRequire.resolve('@dorianchn/agent-canary/gateway-adapter');
  const expectedFacadePath = path.join(packedRoot, 'execution-isolation', 'gateway-adapter', 'gateway-adapter.mjs');
  assert.equal(path.resolve(packedFacadePath), path.resolve(expectedFacadePath), 'the M2 public facade must come from the packed candidate');
  const packedFacade = await import(pathToFileURL(packedFacadePath).href);

  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-active-capability-aliases-'));
  const workspace = path.join(base, 'workspace');
  const publicDir = path.join(workspace, 'public');
  const privateDir = path.join(workspace, 'private');
  const outside = path.join(base, 'outside');
  const publicPath = 'public/readable.txt';
  const publicFile = path.join(workspace, publicPath);
  const envFile = path.join(privateDir, '.env');
  const outsideFile = path.join(outside, 'outside.txt');
  const workspaceAlias = path.join(workspace, 'public-alias');
  const outsideAlias = path.join(workspace, 'outside-alias');
  const hardlinkDir = path.join(workspace, 'hardlink-alias');
  const hardlinkAlias = path.join(hardlinkDir, '.env');
  const publicMarker = 'M9_PACKED_M2_ACTIVE_CAPABILITY_OK';
  const envMarker = 'M9_SYNTHETIC_ENV_FIXTURE_BYTES';
  const outsideMarker = 'M9_SYNTHETIC_OUTSIDE_FIXTURE_BYTES';
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(privateDir, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(hardlinkDir, { recursive: true });
  fs.writeFileSync(publicFile, publicMarker);
  fs.writeFileSync(envFile, envMarker);
  fs.writeFileSync(outsideFile, outsideMarker);
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(publicDir, workspaceAlias, linkType);
  fs.symlinkSync(outside, outsideAlias, linkType);
  fs.linkSync(envFile, hardlinkAlias);
  const envStat = fs.statSync(envFile);
  const hardlinkStat = fs.statSync(hardlinkAlias);
  assert.equal(hardlinkStat.dev, envStat.dev, 'the alias and .env fixture must be on the same device');
  assert.equal(hardlinkStat.ino, envStat.ino, 'the .env alias must be an actual hard link');

  const fixturePaths = [publicFile, envFile, hardlinkAlias, outsideFile];
  const originalSnapshot = new Map(fixturePaths.map((fixturePath) => {
    const bytes = fs.readFileSync(fixturePath);
    return [fixturePath, { bytes, sha256: createHash('sha256').update(bytes).digest('hex') }];
  }));
  const assertFixturesUnchanged = () => {
    for (const [fixturePath, snapshot] of originalSnapshot) {
      const bytes = fs.readFileSync(fixturePath);
      assert.deepEqual(bytes, snapshot.bytes, `${fixturePath} bytes must remain unchanged`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), snapshot.sha256, `${fixturePath} hash must remain unchanged`);
    }
  };

  let gateway;
  t.after(async () => {
    if (gateway) await gateway.close();
    for (const alias of [workspaceAlias, outsideAlias]) {
      try {
        fs.unlinkSync(alias);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    fs.rmSync(base, { recursive: true, force: true });
  });

  const guard = m1.createAgentGuard({ sessionId: 'm9-packed-m2-active-capability-aliases', alert: false });
  gateway = m1.createTrustedExecutionGateway({
    agentId: 'm9-packed-m2-active-capability-aliases',
    guard,
    workspaceRoot: workspace,
    files: [{ path: publicPath }],
    evidence: new m1.EvidenceRecorder(),
  });

  let m5Router;
  let m2Executor;
  let m5ToM2Callbacks = 0;
  const host = packedFacade.createSecurityGatewayHostAdapter({
    gateway,
    fixedFileReads: { read: [publicPath] },
    createSecurityToolRouter: (options) => {
      m2Executor = options.executeRealTool;
      m5Router = m5.createSecurityToolRouter({
        ...options,
        executeRealTool: (call, context) => {
          m5ToM2Callbacks += 1;
          return options.executeRealTool(call, context);
        },
      });
      return m5Router;
    },
    routerOptions: { guard, workspaceRoot: workspace, mode: 'OBSERVE', verifyRealPaths: true },
  });

  assert.equal(typeof m2Executor, 'function', 'the injected exact M5 factory receives M2 capability wiring');
  assert.ok(m5Router, 'the M2 facade fixture must inject the pinned M5 router');
  assert.equal(typeof host.dispatch, 'function');
  assert.equal(typeof host.pendingApprovals, 'function');

  const positiveCall = { name: 'read', args: { path: publicPath } };
  assert.equal((await m5Router.decide(positiveCall)).action, 'OBSERVE_ONLY');
  const positive = await host.dispatch(positiveCall);
  assert.ok(JSON.stringify(positive).includes(publicMarker), 'the registered held-file read reaches M1 through packed M2');
  assert.equal(m5ToM2Callbacks, 1);
  const evidenceAfterPositive = gateway.evidence().length;
  assert.ok(evidenceAfterPositive > 0, 'the positive control records the M1 held-file Gateway read');
  assert.deepEqual(host.pendingApprovals(), []);
  assert.deepEqual(gateway.operator.pending(), []);

  const deniedAliases = [
    { label: 'sensitive .env path', path: 'private/.env' },
    { label: 'workspace symlink/junction alias', path: 'public-alias/readable.txt' },
    { label: 'outside symlink/junction alias', path: 'outside-alias/outside.txt' },
    { label: 'hard link alias named .env', path: 'hardlink-alias/.env' },
  ];
  for (const { label, path: pathArg } of deniedAliases) {
    const call = { name: 'read', args: { path: pathArg } };
    assert.equal((await m5Router.decide(call)).action, 'DENY', `${label} is denied by the exact M5 fixture`);
    await assert.rejects(
      host.dispatch(call),
      (error) => error instanceof m5.PolicyBlockedError && error.decision.action === 'DENY',
      `${label} must fail before the M5-to-M2 execution callback`,
    );
    assert.equal(m5ToM2Callbacks, 1, `${label} must not enter the M5-to-M2 callback`);
    assert.equal(gateway.evidence().length, evidenceAfterPositive, `${label} must not create new M1 Gateway evidence`);
    assert.deepEqual(host.pendingApprovals(), [], `${label} must not create an M5 approval`);
    assert.deepEqual(gateway.operator.pending(), [], `${label} must not create an M1 approval`);
    assertFixturesUnchanged();
  }

  for (const { label, path: pathArg } of deniedAliases) {
    await assert.rejects(
      m2Executor({ name: 'read', args: { path: pathArg } }, { signal: new AbortController().signal }),
      (error) => error?.message === 'M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED',
      `the direct M2 executor must reject ${label} outside its exact registration`,
    );
    assert.equal(gateway.evidence().length, evidenceAfterPositive, `direct M2 rejection for ${label} must not reach M1`);
    assert.deepEqual(gateway.operator.pending(), [], `direct M2 rejection for ${label} must not create an M1 approval`);
    assertFixturesUnchanged();
  }

  assert.equal(m5ToM2Callbacks, 1, 'only the positive control enters the M5-to-M2 execution callback');
  assert.deepEqual(host.pendingApprovals(), []);
  assert.deepEqual(gateway.operator.pending(), []);
  assert.equal(guard.state, 'SAFE');
  assertFixturesUnchanged();
});

test('exact M1/M2/M5 sources deny strict path-only reads when no M1 capability provider is wired', async (t) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-cross-module-fixtures-'));
  const workspace = path.join(base, 'workspace');
  const outside = path.join(base, 'outside');
  const publicDir = path.join(workspace, 'public');
  const privateDir = path.join(workspace, 'private');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(privateDir, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });

  const fixtures = [
    [path.join(publicDir, 'readable.txt'), 'M9_SYNTHETIC_HELD_HANDLE_PUBLIC_READ'],
    [path.join(privateDir, '.env'), 'M9_SYNTHETIC_SENSITIVE_ALIAS_TARGET'],
    [path.join(outside, 'outside.txt'), 'M9_SYNTHETIC_OUTSIDE_ALIAS_TARGET'],
  ];
  for (const [filePath, contents] of fixtures) fs.writeFileSync(filePath, contents);

  const aliases = [
    path.join(workspace, 'public-alias'),
    path.join(workspace, 'sensitive-alias'),
    path.join(workspace, 'outside-alias'),
  ];
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  const originalSnapshot = new Map(fixtures.map(([filePath]) => [
    filePath,
    {
      contents: fs.readFileSync(filePath, 'utf8'),
      sha256: createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
    },
  ]));
  const assertFixturesUnchanged = () => {
    for (const [filePath] of fixtures) {
      assert.equal(fs.readFileSync(filePath, 'utf8'), originalSnapshot.get(filePath).contents);
      assert.equal(
        createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
        originalSnapshot.get(filePath).sha256,
      );
    }
  };

  let gateway;
  t.after(async () => {
    if (gateway) await gateway.close();
    for (const alias of aliases) {
      try {
        fs.unlinkSync(alias);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    fs.rmSync(base, { recursive: true, force: true });
  });

  fs.symlinkSync(publicDir, aliases[0], linkType);
  fs.symlinkSync(privateDir, aliases[1], linkType);
  fs.symlinkSync(outside, aliases[2], linkType);

  const guard = m1.createAgentGuard({ sessionId: 'm9-cross-module-composition', alert: false });
  gateway = m1.createTrustedExecutionGateway({
    agentId: 'm9-cross-module-composition',
    guard,
    workspaceRoot: workspace,
    files: [{ path: 'public/readable.txt' }],
    evidence: new m1.EvidenceRecorder(),
  });
  const adapter = m2.createSecurityGatewayAdapter(gateway, {
    read: ['public/readable.txt'],
  });

  let adapterCallbackCalls = 0;
  const router = m5.createSecurityToolRouter({
    guard,
    workspaceRoot: workspace,
    mode: 'OBSERVE',
    verifyRealPaths: true,
    tools: adapter.tools,
    executeRealTool: (call, context) => {
      adapterCallbackCalls += 1;
      return adapter.executeRealTool(call, context);
    },
  });

  try {
    const publicCall = { name: 'read', args: { path: 'public/readable.txt' } };
    const publicDecision = await router.decide(publicCall);
    assert.equal(publicDecision.action, 'DENY');
    assert.equal(publicDecision.reason, 'path_execution_not_pinned');
    await assert.rejects(
      router.dispatch(publicCall),
      (error) => error instanceof m5.PolicyBlockedError && error.decision.action === 'DENY',
    );
    assert.equal(adapterCallbackCalls, 0, 'an ordinary path-bearing host callback is not a held-file capability');
    const initialGatewayEvidenceCount = gateway.evidence().length;
    assert.equal(initialGatewayEvidenceCount, 0);
    assert.equal(router.pendingApprovals().length, 0);
    assertFixturesUnchanged();

    const deniedPaths = [
      'private/.env',
      'public-alias/readable.txt',
      'sensitive-alias/.env',
      'outside-alias/outside.txt',
    ];
    for (const pathArg of deniedPaths) {
      const aliasedRead = { name: 'read', args: { path: pathArg } };
      assert.equal((await router.decide(aliasedRead)).action, 'DENY', pathArg);
      await assert.rejects(
        router.dispatch(aliasedRead),
        (error) => error instanceof m5.PolicyBlockedError && error.decision.action === 'DENY',
        pathArg,
      );
      assert.equal(adapterCallbackCalls, 0, `${pathArg} is rejected before the M2/Gateway callback`);
      assert.equal(gateway.evidence().length, initialGatewayEvidenceCount, `${pathArg} never enters M1 Gateway`);
      assert.equal(router.pendingApprovals().length, 0, `${pathArg} creates no approval`);
      assertFixturesUnchanged();
    }

    assert.equal(guard.state, 'SAFE');
    assertFixturesUnchanged();
  } finally {
    await gateway.close();
    gateway = undefined;
  }
});

test('pinned M3 Hook writes only allowlisted JSONL with canonical time and no caller canaries', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-m3-hook-jsonl-'));
  try {
    const wrapper = path.join(sourceRoots.M3.root, 'security-lab', 'claude-native-hook.mjs');
    const decisionModule = path.join(fixture, 'caller-decision.mjs');
    const logFile = path.join(fixture, 'caller-positive-control.jsonl');
    const canaries = {
      argument: 'M9_M3_SYNTHETIC_ARGUMENT_CANARY',
      reason: 'M9_M3_SYNTHETIC_REASON_CANARY',
      path: 'C:/synthetic/m3/private.txt',
      command: 'M9_M3_SYNTHETIC_COMMAND_CANARY',
    };
    fs.writeFileSync(decisionModule,
      `export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:${JSON.stringify(canaries.reason)}}}}\n`,
    );
    const result = spawnSync(process.execPath, [
      wrapper,
      decisionModule,
      fixture,
      path.join(fixture, 'caller-state'),
      logFile,
    ], {
      input: JSON.stringify({
        session_id: 'm9-m3-caller',
        tool_name: 'Bash',
        tool_input: {
          command: canaries.command,
          file_path: canaries.path,
          note: canaries.argument,
        },
      }),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 128 * 1024,
      env: { ...process.env, AGENT_CANARY_HOME: path.join(fixture, 'hook-home') },
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'allow');

    const lines = fs.readFileSync(logFile, 'utf8').trim().split(/\r?\n/);
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.deepEqual(Object.keys(record).sort(), ['hookEventName', 'permissionDecision', 'timestamp']);
    assert.equal(record.hookEventName, 'PreToolUse');
    assert.ok(['allow', 'deny', 'ask'].includes(record.permissionDecision));
    assert.equal(record.permissionDecision, 'allow');
    assert.equal(new Date(record.timestamp).toISOString(), record.timestamp);
    for (const canary of Object.values(canaries)) {
      assert.equal(lines[0].includes(canary), false, `M3 Hook JSONL must not contain ${canary}`);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('pinned M7/M8 positive-control JSONL contract stays sanitized in a co-located fixture', async () => {
  const payload = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-hook-jsonl-composition-'));
  try {
    const packagedHook = path.join(payload, 'claude-native-hook.mjs');
    const packagedHarness = path.join(payload, 'e4-hook-faults.mjs');
    fs.copyFileSync(path.join(sourceRoots.M8.root, 'security-lab', 'claude-native-hook.mjs'), packagedHook);
    fs.copyFileSync(path.join(sourceRoots.M8.root, 'packaging', 'windows', 'e4-hook-faults.mjs'), packagedHarness);
    assert.deepEqual(
      fs.readFileSync(packagedHook),
      fs.readFileSync(path.join(sourceRoots.M8.root, 'security-lab', 'claude-native-hook.mjs')),
    );

    const { runHookFaultChecks } = await import(`${pathToFileURL(packagedHarness).href}?m9=${sourceRoots.M8.sha}`);
    const result = runHookFaultChecks({ appRoot: path.join(sourceRoots.M8.root, 'dist'), fixturesRoot: payload });
    assert.equal(result.status, 'PASS');
    assert.match(result.scope, /NOT A THIRD.PARTY HOST OR VM TEST/);
    assert.equal(result.positiveControl.decision, 'allow');
    assert.equal(result.positiveControl.logAudit.status, 'PASS');
    assert.equal(result.positiveControl.logAudit.records, 1);
    assert.equal(result.positiveControl.logContractSatisfied, true);
    assert.equal(result.logAudit.status, 'PASS');
    assert.equal(result.logAudit.callerInputCanaryAbsent, true);

    const log = fs.readFileSync(path.join(result.root, 'positive-control.jsonl'), 'utf8').trim().split(/\r?\n/);
    assert.equal(log.length, 1, 'the synthetic positive control emits one decision record');
    const record = JSON.parse(log[0]);
    assert.deepEqual(Object.keys(record).sort(), ['hookEventName', 'permissionDecision', 'timestamp']);
    assert.equal(record.hookEventName, 'PreToolUse');
    assert.ok(['allow', 'deny', 'ask'].includes(record.permissionDecision));
    assert.equal(record.permissionDecision, 'allow');
    assert.equal(new Date(record.timestamp).toISOString(), record.timestamp);
    for (const canary of [
      'SYNTHETIC_E4_HOOK_ARGUMENT_MARKER',
      'SYNTHETIC_E4_HOOK_REASON_MARKER',
      'M8_SYNTHETIC_INPUT_CANARY_NOT_SECRET',
      'M8_SYNTHETIC_REASON_CANARY_NOT_SECRET',
      'C:/synthetic/caller/private.txt',
      'write victim',
    ]) {
      assert.equal(log[0].includes(canary), false, `the decision log must not contain ${canary}`);
    }

    const state = path.join(payload, 'caller-state');
    fs.mkdirSync(state);
    const decisionModule = path.join(payload, 'caller-decision.mjs');
    const callerLog = path.join(payload, 'caller-positive-control.jsonl');
    const callerCanaries = {
      argument: 'M9_SYNTHETIC_CALLER_ARGUMENT_CANARY',
      reason: 'M9_SYNTHETIC_DECISION_REASON_CANARY',
      path: 'C:/synthetic/caller/private.txt',
      command: 'M9_SYNTHETIC_COMMAND_CANARY',
    };
    fs.writeFileSync(decisionModule,
      `export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:${JSON.stringify(callerCanaries.reason)}}}}\n`,
    );
    const direct = spawnSync(process.execPath, [
      packagedHook,
      decisionModule,
      payload,
      state,
      callerLog,
    ], {
      input: JSON.stringify({
        session_id: 'm9-synthetic-caller',
        tool_name: 'Bash',
        tool_input: {
          command: callerCanaries.command,
          file_path: callerCanaries.path,
          note: callerCanaries.argument,
        },
      }),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 128 * 1024,
      env: {
        SystemRoot: process.env.SystemRoot ?? 'C:/Windows',
        WINDIR: process.env.WINDIR ?? 'C:/Windows',
        PATH: path.dirname(process.execPath),
      },
    });
    assert.equal(direct.error, undefined, direct.error?.message);
    assert.equal(direct.status, 0, `${direct.stdout ?? ''}\n${direct.stderr ?? ''}`);
    assert.equal(JSON.parse(direct.stdout).hookSpecificOutput.permissionDecision, 'allow');
    const callerLogLines = fs.readFileSync(callerLog, 'utf8').trim().split(/\r?\n/);
    assert.equal(callerLogLines.length, 1);
    const callerRecord = JSON.parse(callerLogLines[0]);
    assert.deepEqual(Object.keys(callerRecord).sort(), ['hookEventName', 'permissionDecision', 'timestamp']);
    assert.equal(callerRecord.hookEventName, 'PreToolUse');
    assert.ok(['allow', 'deny', 'ask'].includes(callerRecord.permissionDecision));
    assert.equal(callerRecord.permissionDecision, 'allow');
    assert.equal(new Date(callerRecord.timestamp).toISOString(), callerRecord.timestamp);
    for (const canary of Object.values(callerCanaries)) {
      assert.equal(callerLogLines[0].includes(canary), false, `caller JSONL must not contain ${canary}`);
    }
  } finally {
    fs.rmSync(payload, { recursive: true, force: true });
  }
});
