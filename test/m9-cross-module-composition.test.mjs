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
const sourceRoots = Object.fromEntries(['M9', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M8_CANDIDATE'].map((moduleName) => {
  const root = process.env[`${moduleName}_ROOT`];
  const sha = process.env[`${moduleName}_SHA`];
  assert.ok(root, `${moduleName}_ROOT must point to its independent checkout`);
  assert.match(sha ?? '', /^[a-f0-9]{40}$/, `${moduleName}_SHA must be the checked-out commit`);
  return [moduleName, { root, sha }];
}));

const pinnedSourceShas = {
  M1: '47501fc090ee67f7f96d84d231c7ce7cc70379cd',
  M2: '26cdb8781e57a05f57362e3078d77ce18614481c',
  M3: '0ebc49a3e688e10ffa643dd9275bd12cc31c13a9',
  M4: '892d3290338fe811da127f8f51ab91de0b9fc18b',
  M5: 'cca42cd1762f995e92454d55ffa5e63951e39144',
  M6: '2975f3fc88929cacf268e80a503667b440ea519a',
  M7: '37034a971d00477a8aa3d57f34773c125939ec92',
  M8: '84ee6a7a8d65706f694b7949e82fd8c83cc11523',
  M8_CANDIDATE: '60cfe8d976a42d0f635d4be93ca24c00e81246d5',
};

const mergedSourceProvenance = {
  M1: { ownerHead: 'afd049246e027f414c6a53ee3e4355444718efd7', ownerTree: '9d99965f0a7bf57d4a0714d241c6270e5c3148e9', mergeSha: '7cd34454c4bd6aa7176e0e076f5333639e3ccd5d', mergeTree: '9d99965f0a7bf57d4a0714d241c6270e5c3148e9' },
  M2: { ownerHead: 'db98c7d5d409aa390ef539c96a209d6daba8d793', ownerTree: 'e2c81e61a72ecc472a7988f26e0b2614d4995f0d', mergeSha: '49af6d3dd57d9f091c95f489ead27f4f03c941a9', mergeTree: 'add5837de7426566e124756b052ad1686d6ed308' },
  M3: { ownerHead: '96d688d725292092dfc4e7ba940e9edfa8354e1e', ownerTree: '66a2baf3568aa65e5d5a423a8c215545a4293c39', mergeSha: '611f9fca14706a1110a1f0a39e8488f4ff28d2a9', mergeTree: '66a2baf3568aa65e5d5a423a8c215545a4293c39' },
  M4: { ownerHead: '721c25b9d0decd2e86ce3411ac8feb3e4cfbffc2', ownerTree: '490c8629beb1c93f8c133c4adf5948fd58f71802', mergeSha: 'd0f61987c2a06acb47a7187142bc303101af0ad4', mergeTree: '991354de1703fd0d72dac36f5c07c8369d12134f' },
  M5: { ownerHead: '688f4bf4acd9a46a5bbaed622c71a64ef788e551', ownerTree: 'aa102e622a14abb5fc484f0a1ed777da289bc141', mergeSha: 'f0e90c99033a6304748ac79fe106439ca4bd2e06', mergeTree: '6c83bcb4ffe226bc3a52f5fcfac485c6b8324fdd' },
  M6: { ownerHead: '98a4833250434de905611ace71bfe8094554d417', ownerTree: 'cfcb8e59252860d975e97459a3e0d7ab7ddca258', mergeSha: 'a6f4a889ec16b4f2c78f91d630e657eea7319dbd', mergeTree: 'bbb5eea8678ebfaaa1826bd529079cf16e6bdeda' },
  M7: { ownerHead: 'a0b2968ca18bf4264ff93789abb65c1dc1c2e4cf', ownerTree: 'ed48c9630a2c083f8fed3781a8dd550ce84f119c', mergeSha: '8689d8fbbcdded4735d0e5aa328805f398a2862a', mergeTree: 'e1916366719310e1f912a6802bc3040df8fe512f' },
};

const currentCandidateProvenance = {
  M1: { ownerHead: '47501fc090ee67f7f96d84d231c7ce7cc70379cd', ownerTree: '779ecf4c6020dd3ccb551b59e638f7066d724c2b', sourceBase: 'c750b9dac48286e8ab24b2ec74e6423c52fd6b25', prHead: '47501fc090ee67f7f96d84d231c7ce7cc70379cd', prTree: '779ecf4c6020dd3ccb551b59e638f7066d724c2b' },
  M6: { ownerHead: 'ed335ef7cacfa626f9a5b6bc4c69e6af6366123e', ownerTree: '2dd0c9991794b5983d488fbacadb7a9fbe4f0d89', sourceBase: 'eb78dcef6eb1bd501606244771880bb41d6f0b43', prHead: '2975f3fc88929cacf268e80a503667b440ea519a', prTree: 'c1cae38a069255f346b85c8e9ec708c56e91e16c' },
  M2: { ownerHead: '69a98fb33edebe0d4576f9ce658e49d666b83bc0', ownerTree: '5293e9c55dd135b31b4edbf169b2a292aeb734e8', prHead: '26cdb8781e57a05f57362e3078d77ce18614481c', prTree: 'd47d82af42266d9cb0c3a3895b180c1c23aeb980' },
  M3: { ownerHead: '98a034fa2066cec18f833440cc51275c389681c6', ownerTree: '4da9bd1d3168aaa8dc1df97ad8b8e4bb18187430', prHead: '0ebc49a3e688e10ffa643dd9275bd12cc31c13a9', prTree: '2396a5915c2bb24fa828b02118ea5f69f9e3eea1' },
  M4: { ownerHead: '892d3290338fe811da127f8f51ab91de0b9fc18b', ownerTree: 'd61bfb606f00ce3b43b7ea3f64b8b670a286929c', prHead: '892d3290338fe811da127f8f51ab91de0b9fc18b', prTree: 'd61bfb606f00ce3b43b7ea3f64b8b670a286929c' },
  M5: { ownerHead: '2e547e8c730b8facf745f33826ec807b1401f6e8', ownerTree: '7ebca98c93ca9ceb48735a8d83508b6f0824f206', prHead: 'cca42cd1762f995e92454d55ffa5e63951e39144', prTree: 'f090b8a59b56abc33ccbd705eee9cb707ba15703' },
  M7: { ownerHead: '37034a971d00477a8aa3d57f34773c125939ec92', ownerTree: 'e0d234e71372109a7e9f7076844d8ebf83e8ef50', sourceBase: 'c750b9dac48286e8ab24b2ec74e6423c52fd6b25', prHead: '37034a971d00477a8aa3d57f34773c125939ec92', prTree: 'e0d234e71372109a7e9f7076844d8ebf83e8ef50' },
};

const m2PriorM1DispositionSha = 'be66cf8f4c1a60f093740577796ec5cd633e1d93';
const m1HistoricalReviewSha = 'a5eff766ebe041bc2c6cc13758827d5a96205de9';
const m1M2ReviewedSourceSha = '099ad64e4a09330920cbd40847adec3fe631e91e';
const m1M3ReviewedSourceSha = 'e771c06f72d8a03fb7945037a3facbc2d0ed8a6e';
const m1M3ReviewedBlobs = {
  'src/agent-hook.ts': '76f7bf6314046777ee1615873e5de4621671ea15',
  'test/agent-hook.test.ts': '0e8a2250ee500d455b0c96430b33714925db3862',
  'security-lab/claude-native-hook.mjs': 'b7ed4aba70a597f4f63a05decc6de1b32f67372e',
};
const m6PriorAcceptanceSha = '98803607b89f11e24430c461bd91e9c1a0ece9d4';
const m6M8ReviewedContractSha = '2cebabc81d7908c04ddfa10378fa1d3427b92cf4';
const m6M8ReviewedSourceSha = '72b4aab0fb5cb2dd4cd3b75ee8a73ad22dd001db';
const m6ReviewedLifecycleTestBlob = '18fcc4b91e229d029f0f55c420ca3d0580d2c68d';
const m8ReviewedE4TestBlob = 'd8909264ea2d924d611ca01a4daa73829ab67d1d';
const m7AcceptedE4HelperBlob = '89e8a04ed026af146a712517144f560aefe92a0d';
assert.equal(
  readTreeIdAt('M8_CANDIDATE', pinnedSourceShas.M8_CANDIDATE),
  '25a78c1e0bff8551cc8f41bde312c59224f45abf',
  'the current M8 PR #40 source tree must remain tied to the exact candidate pin',
);

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

function readTreeIdAt(moduleName, commitSha) {
  const result = spawnSync('git', ['-C', sourceRoots[moduleName].root, 'rev-parse', '--verify', `${commitSha}^{tree}`], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${moduleName} tree lookup must start`);
  assert.equal(result.status, 0, `${moduleName} tree must exist at ${commitSha}`);
  return result.stdout.trim();
}

for (const [moduleName, provenance] of Object.entries(mergedSourceProvenance)) {
  assert.equal(readTreeIdAt(moduleName, provenance.mergeSha), provenance.mergeTree, `${moduleName} historical actual merge tree must retain its recorded provenance`);
  assert.equal(readTreeIdAt(moduleName, provenance.ownerHead), provenance.ownerTree, `${moduleName} owner PR head tree must retain its recorded provenance`);
  assert.equal(
    provenance.ownerTree === provenance.mergeTree,
    ['M1', 'M3'].includes(moduleName),
    `${moduleName} owner-head versus merge-tree relation must remain explicitly recorded`,
  );
  const currentCandidate = currentCandidateProvenance[moduleName];
  if (currentCandidate) {
    assert.equal(pinnedSourceShas[moduleName], currentCandidate.prHead, `${moduleName} current source must pin the exact follow-up PR head`);
    assertAncestor(moduleName, currentCandidate.sourceBase ?? provenance.mergeSha, currentCandidate.prHead, `${moduleName} current candidate source base`);
    assertAncestor(moduleName, currentCandidate.ownerHead, currentCandidate.prHead, `${moduleName} owner fix commit`);
    assert.equal(readTreeIdAt(moduleName, currentCandidate.ownerHead), currentCandidate.ownerTree, `${moduleName} owner fix tree must retain its recorded provenance`);
    assert.equal(readTreeIdAt(moduleName, currentCandidate.prHead), currentCandidate.prTree, `${moduleName} follow-up PR head tree must retain its exact provenance`);
  } else {
    assert.equal(readTreeIdAt(moduleName, pinnedSourceShas[moduleName]), provenance.mergeTree, `${moduleName} current source root must use the recorded actual merge tree`);
  }
}

test('exact M3 package retains the coordinated M1 SDK, M2 facade, and M5 policy exports', () => {
  const readPackage = (moduleName) => JSON.parse(fs.readFileSync(path.join(sourceRoots[moduleName].root, 'package.json'), 'utf8'));
  const m1Package = readPackage('M1');
  const m2Package = readPackage('M2');
  const m3Package = readPackage('M3');
  const m5Package = readPackage('M5');
  assert.deepEqual(Object.keys(m3Package.exports ?? {}).sort(), ['./gateway-adapter', './policy', './policy-router', './sdk'], 'the exact M3 package retains the coordinated M1, M2, and M5 public export set');
  assert.deepEqual(m3Package.exports['./sdk'], m1Package.exports?.['./sdk'], 'M3 SDK self-reference must retain the M1 public SDK entry');
  assert.deepEqual(m3Package.exports['./sdk'], m2Package.exports?.['./sdk'], 'M3 SDK self-reference must retain the M2 public SDK entry');
  assert.deepEqual(m3Package.exports['./sdk'], m5Package.exports?.['./sdk'], 'M3 SDK self-reference must retain the M5 public SDK entry');
  assert.equal(m3Package.exports['./gateway-adapter'], m2Package.exports?.['./gateway-adapter'], 'the M3 merge tree retains the exact M2 public facade path');
  assert.deepEqual(m3Package.exports['./policy'], m5Package.exports?.['./policy'], 'M3 retains the coordinated M5 public policy entry');
  assert.deepEqual(m3Package.exports['./policy-router'], m5Package.exports?.['./policy-router'], 'M3 retains the exact M5 public policy-router entry');
  assert.equal(typeof m2Package.exports?.['./gateway-adapter'], 'string', 'M2 owns the public gateway-adapter export');
  assert.ok(m5Package.exports?.['./policy-router'], 'M5 owns the public policy-router export');
  assert.deepEqual(m5Package.exports['./policy-router'], {
    types: './dist/policy-router.d.ts',
    import: './dist/policy-router.js',
    default: './dist/policy-router.js',
  }, 'M5 owns an exact JS and declaration entry for policy-router');
  assert.ok(m5Package.files?.includes('dist'), 'M5 package allowlist must include its public dist targets');
  for (const target of ['dist/policy-router.js', 'dist/policy-router.d.ts']) {
    assert.ok(fs.statSync(path.join(sourceRoots.M5.root, target)).isFile(), `M5 owner target must exist: ${target}`);
  }

  const ownerConsumer = fs.readFileSync(path.join(sourceRoots.M3.root, 'test', 'packaged-owner-consumer.test.mjs'), 'utf8');
  assert.match(ownerConsumer, /const composedExports\s*=\s*\{[\s\S]*?\.\.\.m1\.exports,[\s\S]*?\.\.\.m2\.exports,[\s\S]*?\.\.\.m5\.exports/);
  assert.match(ownerConsumer, /npm pack/, 'the M3 owner-consumer contract builds its own temporary tarball');
  assert.match(ownerConsumer, /synthetic composition fixture/i, 'M3 labels its merged package consumer as a synthetic fixture');
});

test('exact M3 package keeps coordinated M1/M2/M5 exports without claiming a separate integration gate', () => {
  const m3Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M3.root, 'package.json'), 'utf8'));
  const m2Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M2.root, 'package.json'), 'utf8'));
  const m5Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M5.root, 'package.json'), 'utf8'));
  assert.ok(m2Package.exports?.['./gateway-adapter'], 'M2 defines its public gateway facade');
  assert.equal(m3Package.exports?.['./gateway-adapter'], m2Package.exports['./gateway-adapter'], 'M3 source includes the exact merged M2 facade');
  assert.ok(m5Package.exports?.['./policy-router'], 'M5 defines its public policy router');
  assert.deepEqual(m3Package.exports?.['./policy'], m5Package.exports?.['./policy'], 'the M3 package retains the coordinated M5 policy export');
  assert.deepEqual(m3Package.exports?.['./policy-router'], m5Package.exports?.['./policy-router'], 'the M3 package retains the exact M5 policy-router export');
  assert.equal(typeof m3Package.scripts?.['check:integrated-package'], 'undefined', 'the M3 merge tree does not claim a separate integrated-package acceptance gate');
});

test('exact M6 E4 receipt verifier is checkout tooling and is excluded from the npm package', () => {
  const m6PackagePath = path.join(sourceRoots.M6.root, 'package.json');
  const m6Package = JSON.parse(fs.readFileSync(m6PackagePath, 'utf8'));
  const m1Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M1.root, 'package.json'), 'utf8'));
  const m2Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M2.root, 'package.json'), 'utf8'));
  const m5Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M5.root, 'package.json'), 'utf8'));
  const verifierRelativePath = 'security-lab/e4/verify-bundle.mjs';
  const receiptSchemaRelativePath = 'security-lab/e4/independent-review-receipt.schema.json';
  assert.ok(fs.statSync(path.join(sourceRoots.M6.root, verifierRelativePath)).isFile(), 'the exact M6 checkout must contain its verifier');
  assert.ok(fs.statSync(path.join(sourceRoots.M6.root, receiptSchemaRelativePath)).isFile(), 'the exact M6 checkout must contain its receipt schema');
  assert.match(m6Package.scripts?.['e4:verify'] ?? '', /security-lab\/e4\/verify-bundle\.mjs/);
  assert.deepEqual(
    Object.keys(m6Package.exports ?? {}).sort(),
    ['./gateway-adapter', './policy', './policy-router', './sdk'],
    'the exact M6 tree retains required M1/M2 entries and the additive M5-owned policy entries from the coordinated baseline',
  );
  assert.deepEqual(m6Package.exports['./sdk'], m1Package.exports?.['./sdk'], 'the M6 tree preserves the exact M1 SDK package mapping');
  assert.deepEqual(m6Package.exports['./gateway-adapter'], m2Package.exports?.['./gateway-adapter'], 'the M6 merge tree preserves the exact M2 facade package mapping');
  for (const subpath of ['./policy', './policy-router']) {
    assert.ok(m5Package.exports?.[subpath], `M5 defines its public ${subpath} subpath`);
    assert.deepEqual(m6Package.exports[subpath], m5Package.exports[subpath], `the M6 tree preserves the exact M5-owned ${subpath} package mapping`);
  }
  assert.equal(JSON.stringify(m6Package.exports).includes('verify-bundle'), false, 'the receipt verifier is not a public package export');
  assert.ok(m6Package.files?.includes('dist'), 'the published package allowlist includes dist');
  assert.equal(m6Package.files?.some((entry) => entry.replace(/\\/g, '/').startsWith('security-lab/')), false, 'the npm allowlist excludes checkout-only security-lab tooling');

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const packed = spawnSync(npmCommand, ['pack', '--dry-run', '--json'], {
    cwd: sourceRoots.M6.root,
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  assert.equal(packed.error, undefined, `M6 package preview must start: ${packed.error?.message ?? ''}`);
  assert.equal(packed.status, 0, `M6 package preview must succeed: ${packed.stderr}`);
  const packagePreview = JSON.parse(packed.stdout)[0];
  const packagedPaths = packagePreview.files.map((file) => file.path.replace(/\\/g, '/'));
  assert.equal(packagedPaths.includes(verifierRelativePath), false, 'npm pack must omit the E4 verifier');
  assert.equal(packagedPaths.includes(receiptSchemaRelativePath), false, 'npm pack must omit the independent receipt schema');
  assert.equal(packagedPaths.some((file) => file.startsWith('security-lab/e4/')), false, 'npm pack must omit the E4 repository tooling directory');
});

assert.equal(process.env.M1_M3_REVIEW_SHA, m1HistoricalReviewSha, 'M1-to-M3 Hook disposition must preserve its historical M1 review SHA');
assertAncestor('M1', m1HistoricalReviewSha, pinnedSourceShas.M1, 'historical M1-to-M3 review source');
assert.equal(process.env.M1_M3_REVIEW_TARGET_SHA, m1M3ReviewedSourceSha, 'M1 review must name the M3 source commit it actually reviewed');
assert.equal(process.env.M1_M3_REVIEW_COMMENT, '6374247604', 'M1 review must cite the exact Issue #72 owner comment');
assert.equal(process.env.M1_M3_REVIEW_ISSUE, '72', 'M1-to-M3 Hook review is tracked on Issue #72');
assertAncestor('M3', m1M3ReviewedSourceSha, pinnedSourceShas.M3, 'M1-reviewed M3 Hook source');
const currentM1M3ReviewMismatches = Object.entries(m1M3ReviewedBlobs)
  .filter(([filePath, expectedBlob]) => readBlobIdAt('M3', pinnedSourceShas.M3, filePath) !== expectedBlob)
  .map(([filePath]) => filePath);
assert.equal(
  process.env.M1_M3_REVIEW_STATUS,
  currentM1M3ReviewMismatches.length === 0 ? 'ACCEPT' : 'NOT_VERIFIED',
  'the current M3 Hook disposition must reflect exact reviewed-blob equality',
);
for (const [filePath, expectedBlob] of Object.entries(m1M3ReviewedBlobs)) {
  assert.equal(readBlobIdAt('M3', m1M3ReviewedSourceSha, filePath), expectedBlob, `the historical M3 source reviewed by M1 must retain its exact ${filePath} blob`);
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
assertHistoricalAutoE4ScenariosPreserved('M6', m6M8ReviewedContractSha, pinnedSourceShas.M6, 'test/auto-e4.test.mjs');
assertAncestor('M8', m6M8ReviewedSourceSha, pinnedSourceShas.M8, 'historical M6-reviewed M8 test source');
assert.equal(readBlobIdAt('M8', m6M8ReviewedSourceSha, 'test/auto-e4.test.mjs'), m8ReviewedE4TestBlob, 'M6-reviewed M8 test hunk must remain exact at the reviewed source');
assert.equal(readBlobIdAt('M8', pinnedSourceShas.M8, 'test/auto-e4.test.mjs'), m8ReviewedE4TestBlob, 'M8 current head must preserve the exact M6-reviewed test hunk');
assert.equal(readTrackedBlobId('M7', 'packaging/windows/e4-hook-faults.mjs'), m7AcceptedE4HelperBlob, 'M7 helper accepted as a condition of the M6 review must remain exact');
assert.equal(process.env.M5_CODE_SHA, 'f0e90c99033a6304748ac79fe106439ca4bd2e06');

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

function assertHistoricalAutoE4ScenariosPreserved(moduleName, historicalRevision, candidateRevision, filePath) {
  const historicalText = readTrackedTextAt(moduleName, historicalRevision, filePath).join('\n');
  const candidateText = readTrackedTextAt(moduleName, candidateRevision, filePath).join('\n');
  const scenarios = [
    {
      reviewedTitle: 'Claude native hook wrapper logs only the allowlisted decision fields',
      candidateTitle: 'Claude native hook wrapper preserves allow, deny and ask while sanitizing caller reasons',
      requirements: [
        [/for\(const \[decision,fallback\] of cases\)/, 'each decision must use the sanitized fallback reason'],
        [/assert\.deepEqual\(output,\{hookEventName:'PreToolUse',permissionDecision:decision,permissionDecisionReason:fallback\}\)/, 'the Hook decision stays intact while caller reason text is replaced'],
        [/assert\.deepEqual\(Object\.keys\(event\)\.sort\(\),\['hookEventName','permissionDecision','timestamp'\]\)/, 'the persisted JSONL schema stays on the reviewed allowlist'],
        [/stdout',result\.stdout/, 'stdout is checked for canary leaks'],
        [/stderr',result\.stderr/, 'stderr is checked for canary leaks'],
        [/JSONL',log/, 'JSONL is checked for canary leaks'],
        [/stream\.includes\(value\),false/, 'caller-controlled values remain absent from output channels'],
        [/log\.includes\('permissionDecisionReason'\),false/, 'the JSONL log omits caller reasons'],
        [/log\.includes\('tool_input'\),false/, 'the JSONL log omits raw tool input'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 locks a run and does not silently remove a previous lock',
      candidateTitle: 'Auto E4 locks a run and does not silently remove a previous lock',
      requirements: [
        [/assert\.throws\(\(\)=>createAutoE4Run\(\{dataDir:data\}\),\/AUTO_E4_ALREADY_RUNNING\//, 'a second run cannot take over the active lock'],
        [/first\.release\(\)/, 'the first run explicitly releases its lock before a later run starts'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 stages preserve PASS, BLOCKED and SKIPPED; report never claims external E4',
      candidateTitle: 'Auto E4 stages preserve PASS, BLOCKED and SKIPPED; report never claims external E4',
      requirements: [
        [/status:'PASS'/, 'a completed stage retains PASS'],
        [/status:'BLOCKED'/, 'an unavailable acceptance stage retains BLOCKED'],
        [/status==='SKIPPED'/, 'unrun stages remain SKIPPED'],
        [/E4 EXTERNAL INDEPENDENCE NOT VERIFIED/, 'the report does not claim external E4 verification'],
        [/\.includes\(data\),false/, 'the exported report omits its local data path'],
      ],
    },
    {
      reviewedTitle: 'packaged hook wrapper fails closed and target-side fixture evidence is checked',
      candidateTitle: 'packaged hook wrapper fails closed and target-side fixture evidence is checked',
      requirements: [
        [/faultCases\.length,7/, 'all seven fault cases remain covered'],
        [/faultCases\.every\(x=>x\.denied\|\|x\.errorCode==='ETIMEDOUT'\)/, 'fault cases fail closed'],
        [/protectedVictimUnchanged,true/, 'the protected target remains unchanged'],
        [/unsafeCallbackStarts,0/, 'unsafe callbacks never start'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 rejects invalid stage status rather than treating it as PASS',
      candidateTitle: 'Auto E4 rejects invalid stage status rather than treating it as PASS',
      requirements: [
        [/status:'VERIFIED'/, 'an unrecognized status is exercised'],
        [/stage\.status,'FAIL'/, 'an unrecognized status becomes FAIL'],
        [/INVALID_STAGE_STATUS/, 'the invalid status is reported with a fixed error code'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 artifact writer refuses to overwrite a prior report',
      candidateTitle: 'Auto E4 artifact writer refuses to overwrite a prior report',
      requirements: [
        [/AUTO_E4_ARTIFACT_ALREADY_EXISTS/, 'an existing report prevents overwrite'],
        [/files\.jsonFile,'utf8'\),originalJson/, 'the original JSON report remains byte-for-byte intact'],
        [/files\.mdFile,'utf8'\),originalMarkdown/, 'the original Markdown report remains byte-for-byte intact'],
        [/files\.indexFile,'utf8'\),originalIndex/, 'the original evidence index remains byte-for-byte intact'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 rejects concurrent duplicate stages and keeps active-stage state internal',
      candidateTitle: 'Auto E4 rejects concurrent duplicate stages and keeps active-stage state internal',
      requirements: [
        [/DUPLICATE_AUTO_E4_STAGE/, 'a duplicate stage is rejected'],
        [/AUTO_E4_STAGE_IN_PROGRESS/, 'finalization cannot occur while a stage is active'],
        [/report\.stages\.filter\(stage=>stage\.id==='environment'\)\.length,1/, 'only one stage result is recorded'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 release preserves the lock while a stage is active',
      candidateTitle: 'Auto E4 release preserves the lock while a stage is active',
      requirements: [
        [/assert\.throws\(\(\)=>first\.release\(\),\/AUTO_E4_STAGE_IN_PROGRESS\//, 'release is rejected while a stage is active'],
        [/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/, 'another run cannot acquire the active run lock'],
        [/assert\.equal\(fs\.existsSync\(lock\),false\)/, 'the lock is removed only after the stage and run settle'],
      ],
    },
    {
      reviewedTitle: 'Auto E4 finalization prevents later stages or event mutation',
      candidateTitle: 'Auto E4 finalization prevents later stages or event mutation',
      requirements: [
        [/AUTO_E4_RUN_FINISHED/, 'finished runs reject later stages and events'],
        [/run\.record\(\{type:'late-event'\}\)/, 'late event mutation is explicitly exercised'],
        [/assert\.equal\(run\.finish\(\),report\)/, 'repeated finish returns the immutable completed report'],
      ],
    },
  ];

  const candidateTests = [...candidateText.matchAll(/^test\('([^']+)'/gm)];
  for (const scenario of scenarios) {
    assert.ok(historicalText.includes(`test('${scenario.reviewedTitle}'`), `reviewed Auto E4 fixture must contain: ${scenario.reviewedTitle}`);
    const testIndex = candidateTests.findIndex((match) => match[1] === scenario.candidateTitle);
    assert.notEqual(testIndex, -1, `current M6 Auto E4 suite must retain scenario: ${scenario.candidateTitle}`);
    const testStart = candidateTests[testIndex].index;
    const testEnd = candidateTests[testIndex + 1]?.index ?? candidateText.length;
    const testSource = candidateText.slice(testStart, testEnd);
    for (const [pattern, description] of scenario.requirements) {
      assert.match(testSource, pattern, `${scenario.candidateTitle}: ${description}`);
    }
  }
}

test('pinned M2/M5/M7/M9 Hook copies match the current M1 canonical blob', () => {
  const canonicalHookBlob = readTrackedBlobId('M1', 'security-lab/claude-native-hook.mjs');
  assert.equal(
    canonicalHookBlob,
    'b7ed4aba70a597f4f63a05decc6de1b32f67372e',
    'the exact M1 source candidate must retain its reviewed canonical Hook blob',
  );
  const mismatches = [];
  for (const moduleName of ['M2', 'M5', 'M7', 'M9']) {
    const actualHookBlob = readTrackedBlobId(moduleName, 'security-lab/claude-native-hook.mjs');
    if (actualHookBlob !== canonicalHookBlob) mismatches.push(`${moduleName}: ${actualHookBlob}`);
  }
  assert.deepEqual(mismatches, [], `every shipped Hook copy must match the M1 canonical sanitized wrapper ${canonicalHookBlob}`);
  assert.equal(
    readBlobIdAt('M7', pinnedSourceShas.M7, 'security-lab/claude-native-hook.mjs'),
    canonicalHookBlob,
    'the exact M7 Community candidate must pin the reviewed M1 Hook Git blob',
  );
});

test('Issue #88 P0: M1 sanitization control and exact M2 source Hook keep reason canaries out of output channels', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-issue-88-m2-hook-reason-'));
  try {
    const workspaceRoot = path.join(fixture, 'workspace');
    const stateDirectory = path.join(fixture, 'state');
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.mkdirSync(stateDirectory, { recursive: true });
    const decisions = ['allow', 'deny', 'ask'];
    const leakedCanaries = [];
    const hookSources = [
      {
        moduleName: 'M1',
        expectedBlob: 'b7ed4aba70a597f4f63a05decc6de1b32f67372e',
      },
      {
        moduleName: 'M2',
        expectedBlob: 'b7ed4aba70a597f4f63a05decc6de1b32f67372e',
      },
    ];

    for (const { moduleName, expectedBlob } of hookSources) {
      const sourceHook = path.join(sourceRoots[moduleName].root, 'security-lab', 'claude-native-hook.mjs');
      const isolatedHookCopy = path.join(fixture, `${moduleName.toLowerCase()}-claude-native-hook.mjs`);
      assert.equal(
        readBlobIdAt(moduleName, pinnedSourceShas[moduleName], 'security-lab/claude-native-hook.mjs'),
        expectedBlob,
        `Issue #88 must execute the exact ${moduleName} merge-source Hook blob under review`,
      );
      fs.copyFileSync(sourceHook, isolatedHookCopy);
      assert.deepEqual(fs.readFileSync(isolatedHookCopy), fs.readFileSync(sourceHook), `the isolated fixture must execute the byte-identical ${moduleName} Hook copy`);

      const observedDecisions = [];
      for (const decision of decisions) {
        const canary = `M9_ISSUE_88_P0_${moduleName}_SYNTHETIC_REASON_${decision.toUpperCase()}`;
        const decisionModule = path.join(fixture, `${moduleName.toLowerCase()}-decision-${decision}.mjs`);
        const logFile = path.join(fixture, `${moduleName.toLowerCase()}-decision-${decision}.jsonl`);
        fs.writeFileSync(decisionModule,
          `export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:${JSON.stringify(decision)},permissionDecisionReason:${JSON.stringify(canary)}}}}\n`,
        );

        const result = spawnSync(process.execPath, [isolatedHookCopy, decisionModule, workspaceRoot, stateDirectory, logFile], {
          input: JSON.stringify({
            session_id: `m9-issue-88-${moduleName.toLowerCase()}-${decision}`,
            tool_name: 'Bash',
            tool_input: { command: 'synthetic fixture command' },
          }),
          encoding: 'utf8',
          windowsHide: true,
          timeout: 5000,
          maxBuffer: 128 * 1024,
        });
        assert.equal(result.error, undefined, result.error?.message);
        assert.equal(result.status, 0, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);

        const response = JSON.parse(result.stdout.trim());
        const observedDecision = response.hookSpecificOutput.permissionDecision;
        observedDecisions.push(observedDecision);
        assert.equal(observedDecision, decision, `${moduleName} ${decision} must remain the Hook decision`);

        const logText = fs.readFileSync(logFile, 'utf8');
        const logLines = logText.trim().split(/\r?\n/);
        assert.equal(logLines.length, 1, `${moduleName} ${decision} must emit exactly one decision record`);
        const record = JSON.parse(logLines[0]);
        assert.equal(record.permissionDecision, decision, `${moduleName} ${decision} must remain unchanged in JSONL`);

        for (const [channel, text] of [
          ['stdout', result.stdout ?? ''],
          ['stderr', result.stderr ?? ''],
          ['JSONL', logText],
        ]) {
          if (text.includes(canary)) leakedCanaries.push(`${moduleName}/${decision}/${channel}/${canary}`);
        }
      }

      assert.deepEqual(observedDecisions, decisions, `${moduleName} must preserve allow/deny/ask decisions in order`);
    }

    assert.deepEqual(
      leakedCanaries,
      [],
      `Issue #88 P0: synthetic reason markers must be absent from stdout, stderr, and JSONL; observed ${leakedCanaries.join(', ')}`,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('M3 exact-source Hook still matches the current M1 canonical sanitized wrapper', () => {
  assert.equal(
    readTrackedBlobId('M3', 'security-lab/claude-native-hook.mjs'),
    readTrackedBlobId('M1', 'security-lab/claude-native-hook.mjs'),
    'M3 Hook must match the current M1 canonical source after the M1 redaction update',
  );
});

test('Issue #89 P0: exact M3 Hook source keeps reason canaries out of output channels', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'm9-issue-89-m3-hook-reason-'));
  try {
    const workspaceRoot = path.join(fixture, 'workspace');
    const stateDirectory = path.join(fixture, 'state');
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.mkdirSync(stateDirectory, { recursive: true });
    const decisions = ['allow', 'deny', 'ask'];
    const leakedCanaries = [];
    const hookSources = [
      { moduleName: 'M1', expectedBlob: 'b7ed4aba70a597f4f63a05decc6de1b32f67372e' },
      { moduleName: 'M3', expectedBlob: 'b7ed4aba70a597f4f63a05decc6de1b32f67372e' },
    ];

    for (const { moduleName, expectedBlob } of hookSources) {
      const sourceHook = path.join(sourceRoots[moduleName].root, 'security-lab', 'claude-native-hook.mjs');
      const isolatedHookCopy = path.join(fixture, moduleName.toLowerCase() + '-claude-native-hook.mjs');
      assert.equal(
        readBlobIdAt(moduleName, pinnedSourceShas[moduleName], 'security-lab/claude-native-hook.mjs'),
        expectedBlob,
        'Issue #89 must execute the exact ' + moduleName + ' merge-source Hook blob',
      );
      fs.copyFileSync(sourceHook, isolatedHookCopy);
      assert.deepEqual(fs.readFileSync(isolatedHookCopy), fs.readFileSync(sourceHook));

      for (const decision of decisions) {
        const canary = 'M9_ISSUE_89_P0_' + moduleName + '_SYNTHETIC_REASON_' + decision.toUpperCase();
        const decisionModule = path.join(fixture, moduleName.toLowerCase() + '-decision-' + decision + '.mjs');
        const logFile = path.join(fixture, moduleName.toLowerCase() + '-decision-' + decision + '.jsonl');
        const decisionSource = {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: decision,
            permissionDecisionReason: canary,
          },
        };
        fs.writeFileSync(
          decisionModule,
          'export async function decideAgentHook(){return ' + JSON.stringify(decisionSource) + '}\n',
        );
        const result = spawnSync(process.execPath, [isolatedHookCopy, decisionModule, workspaceRoot, stateDirectory, logFile], {
          input: JSON.stringify({
            session_id: 'm9-issue-89-' + moduleName.toLowerCase() + '-' + decision,
            tool_name: 'Bash',
            tool_input: { command: 'synthetic fixture command' },
          }),
          encoding: 'utf8',
          windowsHide: true,
          timeout: 5000,
          maxBuffer: 128 * 1024,
        });
        assert.equal(result.error, undefined, result.error?.message);
        assert.equal(result.status, 0, (result.stdout ?? '') + '\n' + (result.stderr ?? ''));
        const response = JSON.parse(result.stdout.trim());
        assert.equal(response.hookSpecificOutput.permissionDecision, decision, moduleName + ' decision must remain unchanged');

        const logText = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
        for (const [channel, text] of [
          ['stdout', result.stdout ?? ''],
          ['stderr', result.stderr ?? ''],
          ['JSONL', logText],
        ]) {
          if (text.includes(canary)) leakedCanaries.push(moduleName + '/' + decision + '/' + channel + '/' + canary);
        }
      }
    }

    assert.deepEqual(
      leakedCanaries,
      [],
      'Issue #89 P0: synthetic reason markers must be absent from stdout, stderr, and JSONL; observed ' + leakedCanaries.join(', '),
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('exact M2 merge tree pins M7 package policy while current M7 merge adds reliability checks', () => {
  const workflow = fs.readFileSync(path.join(sourceRoots.M2.root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const workflowRef = workflow.match(/uses:\s*DorianChn\/shanchuanzhi-agent-canary\/\.github\/workflows\/m7-package-smoke\.yml@([a-f0-9]{40})/);
  const policyRef = workflow.match(/policy-ref:\s*([a-f0-9]{40})/);
  assert.ok(workflowRef, 'M2 CI must call the reusable M7 package-smoke workflow at a full commit SHA');
  assert.ok(policyRef, 'M2 CI must pass a full M7 policy commit SHA');
  assert.equal(workflowRef[1], policyRef[1], 'M2 CI must use the same exact M7 workflow and policy revision');
  assertAncestor('M7', workflowRef[1], mergedSourceProvenance.M7.ownerHead, 'M2 package-policy revision in the exact M7 owner PR history');
  const pinnedWorkflow = readTrackedTextAt('M7', workflowRef[1], '.github/workflows/m7-package-smoke.yml').join('\n');
  const currentWorkflow = readTrackedTextAt('M7', pinnedSourceShas.M7, '.github/workflows/m7-package-smoke.yml').join('\n');
  const pinnedPackageCheck = readTrackedTextAt('M7', workflowRef[1], 'scripts/check-package.mjs').join('\n');
  const currentPackageCheck = readTrackedTextAt('M7', pinnedSourceShas.M7, 'scripts/check-package.mjs').join('\n');
  assert.match(pinnedWorkflow, /npm run build/, 'the exact M2-pinned M7 workflow still builds the candidate package');
  assert.match(currentWorkflow, /Run M7-owned reliability regressions/, 'current M7 workflow includes its added owner reliability checks');
  assert.match(pinnedPackageCheck, /runNpm\(\["install", "--ignore-scripts", "--no-audit", "--no-fund", packageFile\], installDir\)/, 'the M2-pinned M7 package smoke installs without lifecycle scripts or audit side effects in its isolated prefix');
  assert.match(currentPackageCheck, /runNpm\(\["install", "--prefix", installDir, "--ignore-scripts", "--no-audit", "--no-fund", packageFile\], installDir\)/, 'current M7 retains the same package-smoke policy and makes the already-selected install prefix explicit');
  assert.equal(
    currentPackageCheck.replace('runNpm(["install", "--prefix", installDir, ', 'runNpm(["install", '),
    pinnedPackageCheck,
    'the current M7 package checker differs from M2’s exact pinned checker only by the explicit prefix matching its existing installDir cwd',
  );
  for (const filePath of [
    'scripts/package-file-policy.mjs',
  ]) {
    assert.equal(
      readBlobIdAt('M7', workflowRef[1], filePath),
      readBlobIdAt('M7', pinnedSourceShas.M7, filePath),
      `M7 package-policy file ${filePath} must remain byte-identical between the M2 CI pin and M9 source pin`,
    );
  }
});

test('exact current M7 Community runtime contract requires all 37 paths and rejects missing or extra JavaScript and missing sdk.d.ts', async () => {
  const runtimeContractPath = path.join(sourceRoots.M7.root, 'packaging/windows/runtime-contract.mjs');
  const { communityRuntimeFiles, validateCommunityRuntime } = await import(pathToFileURL(runtimeContractPath).href);
  const expectedRuntimeFiles = [
    'agent-hook.js',
    'agent-host-detection.js',
    'agent-integrations.js',
    'ai/cli.js',
    'ai/console-page.js',
    'ai/console.js',
    'ai/demo.js',
    'ai/policy-demo.js',
    'ai/privacy.js',
    'ai/provider.js',
    'ai/report.js',
    'ai/security-center-adapter.js',
    'ai/transport.js',
    'ai/types.js',
    'alerts.js',
    'codex-connection-check.js',
    'codex-connection-mcp.js',
    'competition.js',
    'config.js',
    'containment.js',
    'dataflow.js',
    'decoys.js',
    'file-state-store.js',
    'network-tool.js',
    'protected-mcp.js',
    'risk-policy.js',
    'runtime/dataflow.js',
    'runtime/demo.js',
    'runtime/evidence.js',
    'runtime/gateway.js',
    'runtime/honeypot.js',
    'sdk.js',
    'security-router.js',
    'self-test.js',
    'server.js',
    'tokens.js',
    'webhook.js',
  ];
  assert.equal(readTrackedBlobId('M7', 'packaging/windows/runtime-contract.mjs'), 'd8e03e4d697930ed87eb979a8ae3b611cd888a24', 'the runtime guard must remain tied to the exact M7 candidate source blob');
  assert.equal(communityRuntimeFiles.length, 37, 'the exact M7 runtime manifest has 37 entries');
  assert.deepEqual(communityRuntimeFiles, expectedRuntimeFiles, 'all 37 exact runtime paths remain fixed');
  assert.equal(new Set(communityRuntimeFiles).size, 37, 'the runtime manifest has no duplicate paths');
  assert.deepEqual(validateCommunityRuntime([...expectedRuntimeFiles].reverse(), true), expectedRuntimeFiles, 'the complete path set with sdk.d.ts is accepted');
  assert.throws(() => validateCommunityRuntime(expectedRuntimeFiles.slice(1), true), /COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/, 'a missing runtime JavaScript path is rejected');
  assert.throws(() => validateCommunityRuntime([...expectedRuntimeFiles, 'unexpected.js'], true), /COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/, 'an extra runtime JavaScript file is rejected');
  assert.throws(() => validateCommunityRuntime(expectedRuntimeFiles, false), /COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/, 'a missing sdk.d.ts declaration is rejected');

  const build = readTrackedTextAt('M7', pinnedSourceShas.M7, 'packaging/windows/build.mjs').join('\n');
  const ownerTests = readTrackedTextAt('M7', pinnedSourceShas.M7, 'test/windows-packaging.test.mjs').join('\n');
  assert.match(build, /validateCommunityRuntime\(walk\(path\.join\(root,'app\/dist'\)\)\.filter\(p=>p\.endsWith\('\.js'\)\),fs\.existsSync\(path\.join\(root,'app\/dist\/sdk\.d\.ts'\)\)\)/, 'the builder validates the emitted JavaScript inventory and sdk.d.ts');
  assert.match(ownerTests, /Windows Community packaging requires the exact 37 runtime files and SDK declaration/);
  assert.match(ownerTests, /communityRuntimeFiles\.slice\(1\)/, 'the exact M7 owner suite retains its missing-file negative control');
  assert.match(ownerTests, /unexpected\.js/, 'the exact M7 owner suite retains its extra-JavaScript negative control');
  assert.match(ownerTests, /validateCommunityRuntime\(communityRuntimeFiles,false\)/, 'the exact M7 owner suite retains its missing-sdk.d.ts negative control');
});

test('historical M8 source matches its exact M1-approved Hook blob', () => {
  assert.equal(
    readBlobIdAt('M8', pinnedSourceShas.M8, 'security-lab/claude-native-hook.mjs'),
    '544b5eb76633469b7185c4ea77d85d7f1754393e',
    'the historical M8 source must retain the exact Hook adapter blob accepted by M1',
  );
});

test('current M8 PR #40 candidate records its M6-owned lifecycle-file delta and sanitizes Hook output', () => {
  const candidateSha = pinnedSourceShas.M8_CANDIDATE;
  assertAncestor('M8_CANDIDATE', m6M8ReviewedSourceSha, candidateSha, 'M6-reviewed M8 source in the current PR #40 candidate');
  assert.equal(
    readBlobIdAt('M8_CANDIDATE', m6M8ReviewedSourceSha, 'test/auto-e4.test.mjs'),
    m8ReviewedE4TestBlob,
    'the original M6-reviewed M8 lifecycle test blob must remain identifiable',
  );
  const candidateLifecycleBlob = readTrackedBlobId('M8_CANDIDATE', 'test/auto-e4.test.mjs');
  assert.equal(
    candidateLifecycleBlob,
    'd1705c204ef3f511ee4828e90b35731b36f92238',
    'the current M8 candidate lifecycle-file change must stay tied to the exact PR #40 head',
  );
  assert.notEqual(
    candidateLifecycleBlob,
    m8ReviewedE4TestBlob,
    'the changed M6-owned lifecycle file is not covered by the historical exact-blob review',
  );
  const candidateLifecycleText = fs.readFileSync(path.join(sourceRoots.M8_CANDIDATE.root, 'test/auto-e4.test.mjs'), 'utf8');
  assert.doesNotMatch(
    candidateLifecycleText,
    /test\('co-located E4 payload wrapper logs only allowlisted metadata'/,
    'the removed M6-reviewed test must remain visible as a pending owner disposition',
  );

  const m1HookBlob = readTrackedBlobId('M1', 'security-lab/claude-native-hook.mjs');
  assert.equal(m1HookBlob, 'b7ed4aba70a597f4f63a05decc6de1b32f67372e', 'M1 canonical Hook blob must remain exact');
  assert.equal(
    readTrackedBlobId('M8_CANDIDATE', 'security-lab/claude-native-hook.mjs'),
    m1HookBlob,
    'the current M8 Hook must match the current M1 canonical source',
  );
  assert.equal(
    readTrackedBlobId('M8_CANDIDATE', 'security-lab/claude-native-hook-output.test.mjs'),
    '186fa2d163f7118d10f01abdac91a0b5e657359b',
    'M9 must execute the exact current M8 output-redaction test blob',
  );
  assert.equal(
    readTrackedBlobId('M8_CANDIDATE', 'packaging/windows/build-contract.mjs'),
    readTrackedBlobId('M7', 'packaging/windows/build-contract.mjs'),
    'the current M8 candidate must preserve the exact M7-owned Windows build contract',
  );
});

const m8CheckoutPolicy = spawnSync('git', ['-C', sourceRoots.M8.root, 'check-attr', `--source=${pinnedSourceShas.M8}`, 'eol', '--', 'security-lab/claude-native-hook.mjs'], { encoding: 'utf8', windowsHide: true });
assert.equal(m8CheckoutPolicy.status, 0);
assert.equal(m8CheckoutPolicy.stdout.trim(), 'security-lab/claude-native-hook.mjs: eol: lf', 'the historical M8 Hook pin records the LF attribute needed by its byte-for-byte provenance gate');
const m8BuildContract = readTrackedTextAt('M8', pinnedSourceShas.M8, 'packaging/windows/build-contract.mjs').join('\n');
assert.match(m8BuildContract, /tracked\.equals\(fs\.readFileSync\(path\.join\(repoRoot,WRAPPER_PATH\)\)\)/, 'M8 must preserve the strict raw-byte provenance comparison');

console.log('[M9 cross-module source SHAs]', Object.entries(sourceRoots)
  .map(([moduleName, source]) => `${moduleName}=${source.sha}`).join(' '));
console.log('[M9 merge provenance]', Object.entries(mergedSourceProvenance)
  .map(([moduleName, provenance]) => `${moduleName}: owner=${provenance.ownerHead} tree=${provenance.ownerTree === provenance.mergeTree ? 'MATCH' : 'DIFFERENT'} merge=${pinnedSourceShas[moduleName]}`).join(' '));
console.log('[M1-to-M2 scoped review]', `${process.env.M1_M2_REVIEW_STATUS} on Issue #52: historical M1 ${process.env.M1_M2_REVIEW_SHA} reviewed exact M2 ${process.env.M1_M2_REVIEW_TARGET_SHA}; current M2 ${pinnedSourceShas.M2} descends from that source but is not covered by the exact-source approval (comment ${process.env.M1_M2_REVIEW_COMMENT}; condition: ${process.env.M1_M2_REVIEW_CONDITION})`);
console.log('[M1-to-M3 Hook file review]', `${process.env.M1_M3_REVIEW_STATUS} on Issue #72: historical M1 ${process.env.M1_M3_REVIEW_SHA} reviewed M3 source ${process.env.M1_M3_REVIEW_TARGET_SHA}; current M3 ${pinnedSourceShas.M3} changed reviewed blobs ${currentM1M3ReviewMismatches.join(', ') || 'none'} (comment ${process.env.M1_M3_REVIEW_COMMENT})`);
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

test('M3 ordinary CLI passes only after its fixed protected-read and replacement controls', async (t) => {
  const m3Root = sourceRoots.M3.root;
  const m3Package = JSON.parse(fs.readFileSync(path.join(m3Root, 'package.json'), 'utf8'));
  const m5Package = JSON.parse(fs.readFileSync(path.join(sourceRoots.M5.root, 'package.json'), 'utf8'));
  assert.ok(m3Package.exports?.['./sdk'], 'the M3 package must expose its reviewed SDK self-reference');
  assert.equal(m3Package.exports?.['./gateway-adapter'], JSON.parse(fs.readFileSync(path.join(sourceRoots.M2.root, 'package.json'), 'utf8')).exports?.['./gateway-adapter'], 'the exact merged M3 tree retains the M2 public facade path');
  assert.deepEqual(m3Package.exports?.['./policy-router'], m5Package.exports?.['./policy-router'], 'the exact M3 package retains the current public M5 policy-router export');

  const requireFromM3 = createRequire(path.join(m3Root, 'package.json'));
  assert.equal(
    requireFromM3.resolve('@dorianchn/agent-canary/gateway-adapter'),
    path.resolve(m3Root, m3Package.exports['./gateway-adapter']),
    'the exact M3 merged package resolves its retained M2 facade export',
  );
  assert.equal(
    requireFromM3.resolve('@dorianchn/agent-canary/policy-router'),
    path.resolve(m3Root, m5Package.exports['./policy-router'].import),
    'the exact M3 package resolves the public M5 policy-router subpath',
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
    status: 'PASS',
    reason: 'FIXED_PROBE_CONTROLS_PASSED',
    markerMatched: true,
  });
  assert.deepEqual(
    fs.readdirSync(isolatedTemp).filter((name) => name.startsWith('agent-canary-console-probe-')),
    [],
    'M3 ordinary CLI must remove its fixed protected-read probe directory after the request',
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

// PR #47 carries the coordinated M3 adapter patch; exercise that exact source
// with the merged M1/M2 feature baseline and packed public M2 facade.
test('M3 adapter from exact M5 PR #47 merge source composes M1 held Gateway and packed M2 facade', async (t) => {
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

  const m3Host = await import(pathToFileURL(path.join(sourceRoots.M5.root, 'src', 'codex-connection-mcp.ts')).href);
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
  const positiveDecision = await m5Router.decide(positiveCall);
  assert.equal(positiveDecision.action, 'OBSERVE_ONLY', `the exact M5 router must accept its M1-registered positive read in OBSERVE mode: ${JSON.stringify(positiveDecision)}`);
  const positive = await host.dispatch(positiveCall);
  assert.ok(JSON.stringify(positive).includes(publicMarker), 'the registered held-file read reaches M1 through packed M2');
  // Strict held-file reads are served by the M1 capability provider and must
  // not fall through M5's generic real-tool callback.
  const callbacksAfterPositiveRead = m5ToM2Callbacks;
  assert.equal(callbacksAfterPositiveRead, 0, 'the positive held-file read must use the M1 capability path, not the generic M5 callback');
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
    assert.equal(m5ToM2Callbacks, callbacksAfterPositiveRead, `${label} must not enter the M5-to-M2 callback`);
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

  assert.equal(m5ToM2Callbacks, callbacksAfterPositiveRead, 'the positive held-file read and denied aliases never enter the generic M5-to-M2 callback');
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
