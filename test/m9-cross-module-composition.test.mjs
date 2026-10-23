import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';

// Synthetic fixture-level API composition only; this does not prove a production host hookup.
const sourceRoots = Object.fromEntries(['M9', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'].map((moduleName) => {
  const root = process.env[`${moduleName}_ROOT`];
  const sha = process.env[`${moduleName}_SHA`];
  assert.ok(root, `${moduleName}_ROOT must point to its independent checkout`);
  assert.match(sha ?? '', /^[a-f0-9]{40}$/, `${moduleName}_SHA must be the checked-out commit`);
  return [moduleName, { root, sha }];
}));

const pinnedSourceShas = {
  M1: 'fa369069241bf81d32c7f39d31a61806efa55fe4',
  M2: 'c43e7ba33e29d9097ac68b444137b65aeaa92acc',
  M3: 'e3e7584cd186728b1756df3542af9aff13937a36',
  M4: 'd62557a03883c459cce6bec60b36686128ccf73d',
  M5: 'f05edaeeabff2e261bf563fb0782d7b9bc500645',
  M6: '82d4e25a210a4c6d1f2c7f8e6d94ce56af1cd56b',
  M7: '1ab085abc6a242be563912a423ff1ee7f11e7127',
  M8: 'f321df3041e2a101661da686a6ccbe6a222b4d24',
};

const m2PriorM1DispositionSha = 'be66cf8f4c1a60f093740577796ec5cd633e1d93';
const m1HistoricalReviewSha = 'a5eff766ebe041bc2c6cc13758827d5a96205de9';
const m1M2ReviewedSourceSha = '099ad64e4a09330920cbd40847adec3fe631e91e';
const m1M3ReviewedSourceSha = '27d4a20a20894c7b779edf68d8bf79685bc0e69b';
const m1M3ReviewedBlobs = {
  'src/agent-hook.ts': '0dc597783386e9273d7167172aa933b17f663e72',
  'test/agent-hook.test.ts': 'cc4e03b939ea6b18f427bb2f9ac026cca5314c63',
  'security-lab/claude-native-hook.mjs': 'ae23875d91c246c0fa833137e71c949bad9bd3cc',
};
const m6PriorAcceptanceSha = '98803607b89f11e24430c461bd91e9c1a0ece9d4';
const m6M8ReviewedContractSha = '2cebabc81d7908c04ddfa10378fa1d3427b92cf4';
const m6M8ReviewedSourceSha = '72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db';
const m6ReviewedLifecycleTestBlob = '18fcc4b91e229d029f0f55c420ca3d0580d2c68d';
const m8ReviewedE4TestBlob = 'd8909264ea2d924d611ca01a4daa73829ab67d1d';
const m7AcceptedE4HelperBlob = '89e8a04ed026af146a712517144f560aefe92a0d';

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
assert.equal(process.env.M1_M3_REVIEW_STATUS, 'ACCEPT', 'M1 owner review must retain its exact Hook-file disposition');
assert.equal(process.env.M1_M3_REVIEW_SHA, m1HistoricalReviewSha, 'M1-to-M3 Hook disposition must preserve its historical M1 review SHA');
assertAncestor('M1', m1HistoricalReviewSha, pinnedSourceShas.M1, 'historical M1-to-M3 review source');
assert.equal(process.env.M1_M3_REVIEW_TARGET_SHA, m1M3ReviewedSourceSha, 'M1 review must name the M3 source commit it actually reviewed');
assert.equal(process.env.M1_M3_REVIEW_COMMENT, '6347268881', 'M1 review must cite the exact Issue #72 owner comment');
assert.equal(process.env.M1_M3_REVIEW_ISSUE, '72', 'M1-to-M3 Hook review is tracked on Issue #72');
assertAncestor('M3', m1M3ReviewedSourceSha, pinnedSourceShas.M3, 'M1-reviewed M3 Hook source');
for (const [filePath, expectedBlob] of Object.entries(m1M3ReviewedBlobs)) {
  assert.equal(readBlobIdAt('M3', pinnedSourceShas.M3, filePath), expectedBlob, `M3 reviewed Hook blob ${filePath} must remain exact at the current source`);
}
assert.equal(process.env.M6_PRIOR_ACCEPTANCE_STATUS, 'ACCEPT', 'historical M6 acceptance must retain its original scoped disposition');
assert.equal(process.env.M6_PRIOR_ACCEPTANCE_SHA, m6PriorAcceptanceSha, 'historical M6 acceptance must retain its original source SHA');
assert.equal(process.env.M6_PRIOR_ACCEPTANCE_COMMENT, '6320039569', 'historical M6 acceptance must cite its original Issue #59 comment');
assert.equal(process.env.M6_M8_REVIEW_STATUS, 'ACCEPT_WITH_CONDITIONS', 'current M6 owner comment accepts only the exact M8 test hunk and M6 lifecycle contract');
assert.equal(process.env.M6_M8_REVIEW_M6_CONTRACT_SHA, m6M8ReviewedContractSha, 'M6 contract check must identify the source revision actually reviewed');
assert.equal(process.env.M6_M8_REVIEW_TARGET_SHA, m6M8ReviewedSourceSha, 'M6 review must identify the exact M8 source it reviewed');
assert.equal(process.env.M6_M8_REVIEW_COMMENT, '6346660246', 'current M6 disposition must cite its exact Issue #59 comment');
assert.equal(process.env.M6_M8_REVIEW_ISSUE, '59', 'current M6 disposition is recorded on Issue #59');
assert.equal(process.env.M6_M8_REVIEW_SCOPE, 'M8 exact test hunk and M6 lifecycle contract checks only', 'M6 disposition remains narrowly scoped');
assert.equal(process.env.M1_M2_REVIEW_STATUS, 'APPROVE', 'M1 approves the exact M2 adapter contract on Issue #52');
assert.equal(process.env.M1_M2_REVIEW_SHA, m1HistoricalReviewSha, 'M1 disposition must identify its historical review source');
assertAncestor('M1', m1HistoricalReviewSha, pinnedSourceShas.M1, 'historical M1-to-M2 review source');
assert.equal(process.env.M1_M2_REVIEW_TARGET_SHA, m1M2ReviewedSourceSha, 'M1 disposition must identify the exact M2 candidate it reviewed');
assert.equal(process.env.M1_M2_REVIEW_COMMENT, '6349691761', 'current M1 disposition must cite its exact Issue #52 comment');
assert.equal(process.env.M1_M2_REVIEW_ISSUE, '52', 'current M1-to-M2 disposition is tracked on Issue #52');
assert.equal(process.env.M1_M2_REVIEW_SCOPE, 'adapter-to-Gateway contract only', 'M1 disposition is limited to the adapter-to-Gateway contract');
assert.equal(process.env.M1_M2_REVIEW_CONDITION, 'API contract only; no first-party product-host or TOCTOU acceptance', 'M1 approval must remain within its stated interface scope');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION, 'ACCEPT_WITH_CONDITIONS', 'historical M1 disposition remains scoped to its reviewed M2 candidate');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION_SHA, m2PriorM1DispositionSha, 'historical disposition must retain its original exact M2 SHA');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION_COMMENT, '6321070391', 'historical disposition must retain its exact Issue #52 comment');
assert.equal(process.env.M2_PRIOR_M1_DISPOSITION_ISSUE, '52', 'historical disposition comment 6321070391 is on Issue #52');
assert.equal(process.env.M2_PACKAGE_ALIGNMENT_GATE_ISSUE, '69', 'Issue #69 tracks the M2/M7 package alignment gate');
assert.equal(process.env.M2_PACKAGE_COMPOSITION_HISTORY_ISSUE, '68', 'Issue #68 is retained only as the closed historical composition gate');
assertAncestor('M2', m2PriorM1DispositionSha, pinnedSourceShas.M2, 'historical M1-reviewed M2 disposition');
assertAncestor('M2', m1M2ReviewedSourceSha, pinnedSourceShas.M2, 'historical M1-reviewed M2 adapter source');
assertAncestor('M6', m6PriorAcceptanceSha, pinnedSourceShas.M6, 'historical M6 owner acceptance');
assertAncestor('M6', m6M8ReviewedContractSha, pinnedSourceShas.M6, 'historically reviewed M6/M8 lifecycle contract');
assert.equal(readBlobIdAt('M6', m6M8ReviewedContractSha, 'test/auto-e4.test.mjs'), m6ReviewedLifecycleTestBlob, 'M6-reviewed lifecycle assertions must remain exact at the reviewed source');
assertHistoricalTextPreserved('M6', m6M8ReviewedContractSha, pinnedSourceShas.M6, 'test/auto-e4.test.mjs', 'current M6 candidate must retain every line of the reviewed lifecycle tests in order');
assertAncestor('M8', m6M8ReviewedSourceSha, pinnedSourceShas.M8, 'historical M6-reviewed M8 test source');
assert.equal(readBlobIdAt('M8', m6M8ReviewedSourceSha, 'test/auto-e4.test.mjs'), m8ReviewedE4TestBlob, 'M6-reviewed M8 test hunk must remain exact at the reviewed source');
assert.equal(readBlobIdAt('M8', pinnedSourceShas.M8, 'test/auto-e4.test.mjs'), m8ReviewedE4TestBlob, 'M8 current head must preserve the exact M6-reviewed test hunk');
assert.equal(readTrackedBlobId('M7', 'packaging/windows/e4-hook-faults.mjs'), m7AcceptedE4HelperBlob, 'M7 helper accepted as a condition of the M6 review must remain exact');
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

function readTrackedTextAt(moduleName, revision, filePath) {
  const result = spawnSync('git', [
    '-C', sourceRoots[moduleName].root,
    'show',
    `${revision}:${filePath}`,
  ], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${moduleName} tracked source read must start`);
  assert.equal(result.status, 0, `${moduleName} revision ${revision} must contain ${filePath}`);
  return result.stdout.replace(/\r\n/g, '\n').split('\n');
}

function assertHistoricalTextPreserved(moduleName, historicalRevision, candidateRevision, filePath, message) {
  const historicalLines = readTrackedTextAt(moduleName, historicalRevision, filePath);
  const candidateLines = readTrackedTextAt(moduleName, candidateRevision, filePath);
  let candidateIndex = 0;
  for (const line of candidateLines) {
    if (line === historicalLines[candidateIndex]) candidateIndex += 1;
    if (candidateIndex === historicalLines.length) break;
  }
  assert.equal(candidateIndex, historicalLines.length, message);
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
console.log('[M1-to-M2 scoped review]', `${process.env.M1_M2_REVIEW_STATUS} on Issue #52: historical M1 ${process.env.M1_M2_REVIEW_SHA} reviewed exact M2 ${process.env.M1_M2_REVIEW_TARGET_SHA}; current M2 ${pinnedSourceShas.M2} descends from that source but is not covered by the exact-source approval (comment ${process.env.M1_M2_REVIEW_COMMENT}; condition: ${process.env.M1_M2_REVIEW_CONDITION})`);
console.log('[M1-to-M3 Hook file review]', `${process.env.M1_M3_REVIEW_STATUS} on Issue #72: historical M1 ${process.env.M1_M3_REVIEW_SHA} reviewed M3 source ${process.env.M1_M3_REVIEW_TARGET_SHA} blobs ${Object.keys(m1M3ReviewedBlobs).join(', ')}; current M1 ${pinnedSourceShas.M1} descends from the reviewed source and current M3 ${pinnedSourceShas.M3} is checked for unchanged reviewed blobs (comment ${process.env.M1_M3_REVIEW_COMMENT})`);
console.log('[M2 prior owner disposition]', `${process.env.M2_PRIOR_M1_DISPOSITION} for older M2 ${process.env.M2_PRIOR_M1_DISPOSITION_SHA} (Issue #52 comment ${process.env.M2_PRIOR_M1_DISPOSITION_COMMENT}); current candidate ${pinnedSourceShas.M2} is not covered by that historical disposition`);
console.log('[M6 current scoped disposition]', `${process.env.M6_M8_REVIEW_STATUS} for M6 contract ${process.env.M6_M8_REVIEW_M6_CONTRACT_SHA} and exact M8 test source ${process.env.M6_M8_REVIEW_TARGET_SHA}; current M8 ${pinnedSourceShas.M8} preserves the reviewed test blob (Issue #59 comment ${process.env.M6_M8_REVIEW_COMMENT}; ${process.env.M6_M8_REVIEW_SCOPE})`);
console.log('[M6 prior owner acceptance]', `${process.env.M6_PRIOR_ACCEPTANCE_STATUS} for older M6 ${process.env.M6_PRIOR_ACCEPTANCE_SHA} (Issue #59 comment ${process.env.M6_PRIOR_ACCEPTANCE_COMMENT}; Auto E4 lifecycle only); current candidate ${pinnedSourceShas.M6} is not generally covered by that historical acceptance`);
console.log('[M9 separate evidence SHAs]', `M1_M2_REVIEW_SHA=${process.env.M1_M2_REVIEW_SHA}`, `M5_CODE_SHA=${process.env.M5_CODE_SHA}`);

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-cross-module-home-'));
process.env.AGENT_CANARY_HOME = testHome;
after(() => fs.rmSync(testHome, { recursive: true, force: true }));

const m5PackageRequire = createRequire(path.join(sourceRoots.M5.root, 'package.json'));
const m5PublicRouterPath = m5PackageRequire.resolve('@dorianchn/agent-canary/policy-router');
assert.equal(
  path.resolve(m5PublicRouterPath),
  path.resolve(path.join(sourceRoots.M5.root, 'dist', 'policy-router.js')),
  'M5 router composition must resolve through the exact public package subpath',
);
const m1PackageRequire = createRequire(path.join(sourceRoots.M1.root, 'package.json'));
const m1PublicSdkPath = m1PackageRequire.resolve('@dorianchn/agent-canary/sdk');
assert.equal(
  path.resolve(m1PublicSdkPath),
  path.resolve(path.join(sourceRoots.M1.root, 'dist', 'sdk.js')),
  'M1 Gateway composition must resolve through the exact public package subpath',
);

const [m1, m2, m4, m4Page, m5] = await Promise.all([
  import(pathToFileURL(m1PublicSdkPath).href),
  import(pathToFileURL(path.join(
    sourceRoots.M2.root,
    'execution-isolation',
    'gateway-adapter',
    'security-gateway-adapter.mjs',
  )).href),
  import(pathToFileURL(path.join(sourceRoots.M4.root, 'src', 'ai', 'security-center-adapter.ts')).href),
  import(pathToFileURL(path.join(sourceRoots.M4.root, 'src', 'ai', 'console-page.ts')).href),
  import(pathToFileURL(m5PublicRouterPath).href),
]);

function isPolicyBlocked(error, predicate) {
  return error instanceof Error
    && error.name === 'PolicyBlockedError'
    && error.decision !== null
    && typeof error.decision === 'object'
    && predicate(error.decision);
}

test('M3 ordinary ai console CLI fails closed when public M5 and M2 subpaths are absent', async (t) => {
  const m3Root = sourceRoots.M3.root;
  const m3Package = JSON.parse(fs.readFileSync(path.join(m3Root, 'package.json'), 'utf8'));
  assert.ok(m3Package.exports?.['./sdk'], 'the M3 package must expose its reviewed SDK self-reference');
  assert.equal(m3Package.exports?.['./gateway-adapter'], undefined, 'the M3-only package must not invent the M2 public export');
  assert.equal(m3Package.exports?.['./policy-router'], undefined, 'the M3-only package must not invent the M5 public export');

  const requireFromM3 = createRequire(path.join(m3Root, 'package.json'));
  assert.throws(
    () => requireFromM3.resolve('@dorianchn/agent-canary/gateway-adapter'),
    (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    'the exact M3-only package must fail to resolve the M2 public subpath',
  );
  assert.throws(
    () => requireFromM3.resolve('@dorianchn/agent-canary/policy-router'),
    (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    'the exact M3-only package must fail to resolve the M5 public subpath',
  );
  const consoleSource = fs.readFileSync(path.join(m3Root, 'src', 'ai', 'console.ts'), 'utf8');
  assert.match(consoleSource, /const sdkSpecifier:string='@dorianchn\/agent-canary\/sdk'/);
  assert.match(consoleSource, /const policyRouterSpecifier:string='@dorianchn\/agent-canary\/policy-router'/);
  assert.match(consoleSource, /const adapterSpecifier:string='@dorianchn\/agent-canary\/gateway-adapter'/);
  assert.match(consoleSource, /await Promise\.all\(\[import\(sdkSpecifier\),import\(policyRouterSpecifier\),import\(adapterSpecifier\)\]\)/);

  const isolatedTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-m3-cli-no-injection-'));
  const operatorCode = 'M9_CLI_OPERATOR_FIXTURE';
  let child;
  let output = '';
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) child.kill();
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => child.once('exit', resolve));
    }
    fs.rmSync(isolatedTemp, { recursive: true, force: true });
  });

  child = spawn(process.execPath, [path.join(m3Root, 'dist', 'index.js'), 'ai', 'console', '--port', '0'], {
    cwd: m3Root,
    env: {
      ...process.env,
      AGENT_CANARY_OPERATOR_CODE: operatorCode,
      TEMP: isolatedTemp,
      TMP: isolatedTemp,
      TMPDIR: isolatedTemp,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  const url = await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error ? reject(error) : resolve(value);
    };
    const timeout = setTimeout(() => finish(new Error(`M3 CLI did not start; output: ${output}`)), 15_000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/Agent Canary 中文控制台: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) finish(undefined, match[1]);
    });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', (error) => finish(error));
    child.once('exit', (code, signal) => finish(new Error(`M3 CLI exited before listening (${code ?? signal}); output: ${output}`)));
  });

  const page = await fetch(url);
  assert.equal(page.status, 200);
  const html = await page.text();
  const csrf = html.match(/const csrf='([a-f0-9]{64})'/)?.[1];
  assert.ok(csrf, 'ordinary CLI page must provide its session CSRF token');
  const response = await fetch(`${url}/api/security-center/protected-read`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-canary-csrf': csrf,
      'x-canary-operator-code': operatorCode,
    },
    body: '{}',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    scope: 'M3_FIXED_TEMP_PROBE_ONLY',
    status: 'UNKNOWN',
    reason: 'OWNER_ADAPTER_UNAVAILABLE',
    markerMatched: false,
  });
  assert.deepEqual(
    fs.readdirSync(isolatedTemp).filter((name) => name.startsWith('agent-canary-console-probe-')),
    [],
    'M3 ordinary CLI must not create a protected-read probe directory when the M2 public export is absent',
  );
});

test('M3 snapshot-only status route feeds the exact M4 read-only consumer without protected-read work', async () => {
  const isolatedTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-m3-m4-status-route-'));
  const priorEnv = Object.fromEntries(['AGENT_CANARY_HOME', 'TEMP', 'TMP', 'TMPDIR'].map((key) => [key, process.env[key]]));
  const isolatedHome = path.join(isolatedTemp, 'home');
  fs.mkdirSync(isolatedHome, { recursive: true });
  process.env.AGENT_CANARY_HOME = isolatedHome;
  process.env.TEMP = isolatedTemp;
  process.env.TMP = isolatedTemp;
  process.env.TMPDIR = isolatedTemp;

  let providerCalls = 0;
  let protectedReadDependencyLoads = 0;
  const privatePath = 'C:\\Users\\alice\\workspace\\private.txt';
  const privateToken = 'cnry_m9_status_private_token';
  let console;
  try {
    const m3Console = await import(pathToFileURL(path.join(sourceRoots.M3.root, 'src', 'ai', 'console.ts')).href);
    console = await m3Console.startAIConsole({
      port: 0,
      securityCenterStatusProvider: async (...args) => {
        providerCalls += 1;
        assert.deepEqual(args, [], 'the snapshot route passes no request-controlled values to its provider');
        return {
          protectionStatus: 'PROTECTED',
          gateway: { protectionStatus: 'PROTECTED', connectionStatus: 'CONNECTED', path: privatePath },
          hook: { protectionStatus: 'PROTECTED' },
          canaryIsolation: { protectionStatus: 'PROTECTED' },
          policy: { protectionStatus: 'PROTECTED', name: 'M2 fixed file reads / M5 OBSERVE', token: privateToken },
          protectedToolCount: 1,
          unprotectedExecutionPaths: ['NATIVE_SHELL', privatePath],
          agents: [{ agent: 'codex', detected: true, connectionStatus: 'CONNECTED', protectionStatus: 'PROTECTED' }],
          privatePath,
          privateToken,
        };
      },
      securityCenterProtectedReadDependencies: async () => {
        protectedReadDependencyLoads += 1;
        throw new Error('the status route must not load protected-read dependencies');
      },
    });

    let response = await fetch(`${console.url}/api/security-center`);
    assert.equal(response.status, 403, 'missing CSRF must stop before reading the status provider');
    assert.equal(providerCalls, 0);
    const page = await fetch(console.url);
    const html = await page.text();
    const csrf = html.match(/const csrf='([a-f0-9]{64})'/)?.[1];
    assert.ok(csrf);
    response = await fetch(`${console.url}/api/security-center`, {
      headers: { 'x-canary-csrf': 'invalid-csrf' },
    });
    assert.equal(response.status, 403);
    assert.equal(providerCalls, 0, 'invalid CSRF must stop before reading the status provider');

    response = await fetch(`${console.url}/api/security-center`, {
      headers: { 'x-canary-csrf': csrf },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const statusSnapshot = await response.json();
    assert.deepEqual(statusSnapshot, {
      protectionStatus: 'UNKNOWN',
      gateway: { protectionStatus: 'PROTECTED', connectionStatus: 'CONNECTED' },
      hook: { protectionStatus: 'UNKNOWN' },
      canaryIsolation: { protectionStatus: 'UNKNOWN' },
      policy: { protectionStatus: 'PROTECTED', name: 'M2_FIXED_FILE_READS' },
      protectedToolCount: 1,
      unprotectedExecutionPaths: ['NATIVE_SHELL'],
      agents: [{ agent: 'codex', detected: true, connectionStatus: 'UNKNOWN', protectionStatus: 'UNKNOWN' }],
    });
    assert.equal(JSON.stringify(statusSnapshot).includes(privatePath), false);
    assert.equal(JSON.stringify(statusSnapshot).includes(privateToken), false);
    assert.equal(providerCalls, 1);
    assert.equal(protectedReadDependencyLoads, 0, 'a status GET must not construct a Gateway or load protected-read dependencies');
    assert.deepEqual(
      fs.readdirSync(isolatedTemp).filter((name) => name.startsWith('agent-canary-console-probe-')),
      [],
      'a status GET must not create the independent fixed-marker probe directory',
    );

    const browserAdapter = new Function(`${m4.SECURITY_CENTER_ADAPTER_SCRIPT}\nreturn securityCenterAdapter;`)();
    assert.equal(browserAdapter.isValidSecurityCenterStatusPayload(statusSnapshot), true);
    const displaySnapshot = browserAdapter.adaptSecuritySnapshot({ securityCenter: statusSnapshot });
    assert.equal(displaySnapshot.protectionStatus, 'UNKNOWN', 'the M4 consumer must not promote the status to full product protection');
    assert.equal(displaySnapshot.coverage, 'UNKNOWN', 'M3 did not report an explicit coverage label');
    assert.equal(displaySnapshot.gateway.protectionStatus, 'PROTECTED', 'component status remains scoped to the Gateway');
    assert.equal(displaySnapshot.firstPartyObserveReadStatus, 'NOT_VERIFIED');
    const displayJson = JSON.stringify(displaySnapshot);
    assert.equal(displayJson.includes(privatePath), false);
    assert.equal(displayJson.includes(privateToken), false);

    const clientScripts = [...m4Page.CONSOLE_PAGE.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1]).join('\n');
    assert.match(clientScripts, /securityCenterAdapter\.isValidSecurityCenterStatusPayload\(data\)/);
    assert.match(clientScripts, /\['securityCenter','security-center'\]/);
    assert.doesNotMatch(clientScripts, /security-center\/protected-read/i, 'the M4 page must not call the separate fixed-marker POST');
    assert.match(m4Page.CONSOLE_PAGE, /id="securityCoverage"/);
    assert.match(m4Page.CONSOLE_PAGE, /NOT_VERIFIED · 未验证/);

    response = await fetch(`${console.url}/api/security-center`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-canary-csrf': csrf },
      body: JSON.stringify({ protectionStatus: 'PROTECTED' }),
    });
    assert.equal(response.status, 404, 'the status-only route must not accept a write request');
    assert.equal(providerCalls, 1);
    assert.equal(protectedReadDependencyLoads, 0);
  } finally {
    if (console) await console.close();
    for (const [key, value] of Object.entries(priorEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(isolatedTemp, { recursive: true, force: true });
  }
});

test('M4 exact security-center adapter redacts path details and preserves UNKNOWN protection status', () => {
  const privateValues = [
    'C:\\private\\unsafe-tool.exe',
    'D:\\secrets\\report.txt?token=cnry_m4_private',
    '--argument=M9_M4_PRIVATE_ARGUMENT',
  ];
  const view = m4.adaptSecuritySnapshot({
    securityCenter: { unprotectedExecutionPaths: privateValues },
  });

  assert.equal(view.protectionStatus, 'UNKNOWN');
  assert.equal(view.gateway.protectionStatus, 'UNKNOWN');
  assert.equal(view.hook.protectionStatus, 'UNKNOWN');
  assert.deepEqual(
    view.unprotectedExecutionPaths,
    privateValues.map(() => 'UNPROTECTED_EXECUTION_PATH'),
  );

  const diagnostic = m4.buildSecurityDiagnostic(
    view,
    { securityCenter: 'AVAILABLE', e4: 'UNSUPPORTED' },
    '2026-10-23T00:00:00.000Z',
  );
  assert.equal(diagnostic.protection.overall, 'UNKNOWN');
  assert.equal(diagnostic.protection.unprotectedExecutionPathCount, privateValues.length);
  assert.equal(diagnostic.dataSources.e4, 'UNSUPPORTED');
  const serialized = JSON.stringify(diagnostic);
  for (const privateValue of privateValues) assert.equal(serialized.includes(privateValue), false);
  assert.equal(serialized.includes('cnry_m4_private'), false);
  assert.equal(serialized.includes('M9_M4_PRIVATE_ARGUMENT'), false);
});

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
      (error) => isPolicyBlocked(error, (decision) => decision.action === 'DENY' && decision.reason === 'path_execution_not_pinned'),
    );
    assert.equal(callbackCalls.length, 0, `${call.name} must fail before the generic path callback`);
    assert.equal(router.pendingApprovals().length, 0, 'fail-closed paths do not create approvals');
  }

  const sensitiveRead = { name: 'read', args: { path: 'private/.env' } };
  assert.equal((await router.decide(sensitiveRead)).reason, 'observe_sensitive_data_blocked');
  await assert.rejects(
    router.dispatch(sensitiveRead),
    (error) => isPolicyBlocked(error, (decision) => decision.action === 'DENY'),
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

// Exercise the exact M3 runtime and M1 quarantine subscription contract without an M9 shim.
test('M3 connection-check runtime composes M1 held Gateway, packed M2 public facade, and exact M5 router', async (t) => {
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
  const markerBytes = Buffer.from(marker, 'utf8');
  const markerSha256 = createHash('sha256').update(markerBytes).digest('hex');
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(publicFile, markerBytes);

  let gateway;
  t.after(async () => {
    if (gateway) await gateway.close();
    fs.rmSync(base, { recursive: true, force: true });
  });

  let m5Router;
  const runtime = await m3Host.createConnectionCheckRuntime({
    workspaceRoot: workspace,
    createGateway: (options) => {
      gateway = m1.createTrustedExecutionGateway(options);
      return gateway;
    },
    loadM2Facade: async () => packedFacade,
    createSecurityToolRouter: (options) => {
      m5Router = m5.createSecurityToolRouter(options);
      return m5Router;
    },
  });
  gateway = runtime.gateway;
  const guard = runtime.guard;
  const host = runtime.protectedHost;

  assert.equal(host.status, 'UNKNOWN', 'M3 keeps host status UNKNOWN until its fixed protected read is observed');
  assert.equal(host.reason, 'POSITIVE_CONTROL_PENDING');
  assert.equal(typeof host.dispatch, 'function', 'the exact M2 facade and M5 router must compose');
  assert.equal(runtime.root, workspace, 'M3 runtime builder retains the trusted workspace root');
  assert.deepEqual(runtime.files, [{ path: relativePath }], 'M3 runtime builder registers only its fixed protected-read file');
  assert.equal(runtime.guard, guard);
  assert.equal(runtime.gateway, gateway, 'M3 runtime builder must return the exact injected M1 Gateway');
  assert.ok(m5Router, 'M3 must construct the injected pinned M5 router');
  assert.equal(host.m5Callbacks(), 0);

  const positive = await m3Host.dispatchProtectedRead(host, { path: relativePath });
  assert.deepEqual(positive, { status: 'ALLOW', reason: 'HELD_FILE_POSITIVE_CONTROL', markerMatched: true });
  assert.equal(host.m5Callbacks(), 1);
  const evidenceAfterPositive = gateway.evidence().length;
  assert.ok(evidenceAfterPositive > 0, 'the packed facade path reaches the M1 held-file Gateway');
  assert.equal(createHash('sha256').update(fs.readFileSync(publicFile)).digest('hex'), markerSha256, 'the positive control leaves fixture bytes unchanged');
  assert.equal(m5Router.pendingApprovals().length, 0);
  assert.deepEqual(gateway.operator.pending(), []);
  assert.equal(guard.state, 'SAFE');

  const alias = await m3Host.dispatchProtectedRead(host, { path: `./${relativePath}` });
  assert.deepEqual(alias, { status: 'DENY', reason: 'FIXED_PROBE_PATH_REQUIRED', markerMatched: false });
  assert.equal(host.m5Callbacks(), 1, 'M3 rejects aliases before the trusted M5 callback');
  assert.equal(gateway.evidence().length, evidenceAfterPositive, 'the rejected alias does not dispatch to M1');
  assert.equal(createHash('sha256').update(fs.readFileSync(publicFile)).digest('hex'), markerSha256, 'the rejected alias leaves fixture hash unchanged');
  assert.equal(m5Router.pendingApprovals().length, 0);
  assert.deepEqual(gateway.operator.pending(), []);

  const heldFile = `${publicFile}.held`;
  fs.renameSync(publicFile, heldFile);
  const replacementBytes = Buffer.from('M9_SYNTHETIC_REPLACEMENT_BYTES', 'utf8');
  const replacementSha256 = createHash('sha256').update(replacementBytes).digest('hex');
  fs.writeFileSync(publicFile, replacementBytes);
  const replaced = await m3Host.dispatchProtectedRead(host, { path: relativePath });
  assert.equal(replaced.status, 'DENY', 'the synthetic path-replacement control remains fail-closed');
  assert.equal(host.m5Callbacks(), 1, 'M1 capability verification rejects the replacement before M5 execution');
  assert.equal(gateway.evidence().length, evidenceAfterPositive, 'the rejected replacement creates no M1 read event');
  assert.equal(createHash('sha256').update(fs.readFileSync(publicFile)).digest('hex'), replacementSha256, 'the path-replacement fixture remains unchanged');
  assert.equal(createHash('sha256').update(fs.readFileSync(heldFile)).digest('hex'), markerSha256, 'the held original fixture remains unchanged');
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
      (error) => error instanceof TypeError && error.message === 'M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED',
      `${label} must fail the exact M2 path preflight before the M5-to-M2 execution callback`,
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
      (error) => isPolicyBlocked(error, (decision) => decision.action === 'DENY'),
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
        (error) => isPolicyBlocked(error, (decision) => decision.action === 'DENY'),
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
