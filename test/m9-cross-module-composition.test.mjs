import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';

// Synthetic fixture-level API composition only; this does not prove a production host hookup.
const sourceRoots = Object.fromEntries(['M9', 'M1', 'M2', 'M5', 'M7', 'M8'].map((moduleName) => {
  const root = process.env[`${moduleName}_ROOT`];
  const sha = process.env[`${moduleName}_SHA`];
  assert.ok(root, `${moduleName}_ROOT must point to its independent checkout`);
  assert.match(sha ?? '', /^[a-f0-9]{40}$/, `${moduleName}_SHA must be the checked-out commit`);
  return [moduleName, { root, sha }];
}));

const pinnedSourceShas = {
  M1: 'f14aab781c62db60ac241d2114f543f6cac223ae',
  M2: '76066cbb750ec714ce8691bc0f30c8171186f079',
  M5: 'b6a40b49f132decba97d269ff942d868fcef928f',
  M7: '52cc149e958f8139ea93cf8bab7e14bedfe45d62',
  M8: 'd12dd2cdb7e4fdeddadcdc45bf5ff0420cca5e04',
};
for (const [moduleName, expectedSha] of Object.entries(pinnedSourceShas)) {
  assert.equal(sourceRoots[moduleName].sha, expectedSha, `${moduleName} must use the reviewed source commit`);
}

console.log('[M9 cross-module source SHAs]', Object.entries(sourceRoots)
  .map(([moduleName, source]) => `${moduleName}=${source.sha}`).join(' '));

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

test('exact M1/M2/M5 sources enforce OBSERVE hard-deny before adapter dispatch', async (t) => {
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
    assert.equal((await router.decide(publicCall)).action, 'OBSERVE_ONLY');
    assert.deepEqual(await router.dispatch(publicCall), {
      content: 'M9_SYNTHETIC_HELD_HANDLE_PUBLIC_READ',
    });
    assert.equal(adapterCallbackCalls, 1, 'the allowed read reaches the M2 adapter once');
    assert.deepEqual(gateway.evidence().map((record) => record.tool_id), ['read_file', 'read_file']);
    const acceptedGatewayEvidenceCount = gateway.evidence().length;
    assert.equal(router.pendingApprovals().length, 0);

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
      assert.equal(adapterCallbackCalls, 1, `${pathArg} is rejected before the M2/Gateway callback`);
      assert.equal(gateway.evidence().length, acceptedGatewayEvidenceCount, `${pathArg} never enters M1 Gateway`);
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
