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
  M1: '7279336307fc7aacd46119405858d4fd91499757',
  M2: 'be66cf8f4c1a60f093740577796ec5cd633e1d93',
  M3: '429cd73c03273bc77f3781b489f541e396cd9361',
  M5: 'bbce79aa086b39b51422cc72471c23c963778650',
  M6: '98803607b89f11e24430c461bd91e9c1a0ece9d4',
  M7: 'cdae8baf13a4ee2f06cc7655a684b7eab0b6ed3a',
  M8: '2d5a0ffe1e93dcc93673a3fd2de5a6bf71ac09d3',
};
for (const [moduleName, expectedSha] of Object.entries(pinnedSourceShas)) {
  assert.equal(sourceRoots[moduleName].sha, expectedSha, `${moduleName} must use the pinned exact source commit`);
}
assert.equal(process.env.M6_OWNER_ACCEPTANCE_STATUS, 'ACCEPT', 'M6 owner acceptance must match the published exact-scope disposition');
assert.equal(process.env.M6_OWNER_ACCEPTANCE_SHA, pinnedSourceShas.M6, 'M6 owner acceptance must name the exact pinned source SHA');
assert.equal(process.env.M6_OWNER_ACCEPTANCE_COMMENT, '6320039569', 'M6 acceptance must cite the exact public Issue #59 comment');
assert.equal(process.env.M2_OWNER_DISPOSITION, 'ACCEPT_WITH_CONDITIONS', 'M2 package acceptance retains the real-M5-router condition');
assert.equal(process.env.M2_OWNER_DISPOSITION_SHA, pinnedSourceShas.M2, 'M2 disposition must name the exact packed candidate SHA');
assert.equal(process.env.M2_OWNER_DISPOSITION_COMMENT, '6321070391', 'M1 actual-tarball review must match the public disposition');
assert.equal(process.env.M2_OWNER_DISPOSITION_ISSUE, '68', 'M2/M7 package composition is tracked in Issue #68');
assert.equal(process.env.M1_OWNER_REVIEW_SHA, '7279336307fc7aacd46119405858d4fd91499757');
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
console.log('[M6 owner acceptance]', `${process.env.M6_OWNER_ACCEPTANCE_STATUS} for ${process.env.M6_OWNER_ACCEPTANCE_SHA} (Issue #59 comment ${process.env.M6_OWNER_ACCEPTANCE_COMMENT}; Auto E4 paths/tests only)`);
console.log('[M9 separate evidence SHAs]', `M1_OWNER_REVIEW_SHA=${process.env.M1_OWNER_REVIEW_SHA}`, `M5_CODE_SHA=${process.env.M5_CODE_SHA}`);

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
