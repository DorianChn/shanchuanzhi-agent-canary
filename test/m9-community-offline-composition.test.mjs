import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const m7Root = process.env.M7_ROOT;
const m7Sha = process.env.M7_SHA;
const m8Root = process.env.M8_CANDIDATE_ROOT;
const m8Sha = process.env.M8_CANDIDATE_SHA;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/3.0/M9_EXACT_SOURCE_REFS.json'), 'utf8'));
const offlineDemoPath = 'competition-submission/roadshow-3.0/reproduction-kit/run-offline-demo.mjs';
const expectedM7Sha = manifest.modules.M7.sha;
const expectedM8Sha = manifest.modules.M8.sha;
const expectedM8PullRequest = manifest.modules.M8.pullRequest;
// This is M7's immutable reviewed source dependency, not the current M8 PR head.
const expectedM8PinSha = '24b8651730d57d860ba136e77db1526031abb1fc';
const expectedM7Blob = '71ba0f00f31583c4227cd937972e6f9a677898ca';
const expectedM8Blob = '3428f297c28845ae054c0ca63aa6c5c4d7ef785f';

function git(root, args, label) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${label}: git command must start`);
  assert.equal(result.status, 0, `${label}: git command must succeed; ${result.stderr}`);
  return result.stdout.trim();
}

function sourceBlob(root, sha) {
  return git(root, ['rev-parse', '--verify', `${sha}:${offlineDemoPath}`], 'offline demo blob lookup');
}

function assertExactManifestCandidate(moduleName, candidateSha, checkoutSha) {
  const expectedSha = manifest.modules[moduleName]?.sha;
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, `${moduleName} exact-source manifest SHA must be immutable`);
  assert.equal(candidateSha, expectedSha, `${moduleName}_SHA must match the exact M9 manifest ref`);
  assert.equal(checkoutSha, expectedSha, `${moduleName} checkout HEAD must match the exact M9 manifest ref`);
  return expectedSha;
}

test('M8 exact offline demo retains the Guard rejection and post-quarantine safety assertions', () => {
  assert.ok(m8Root, 'M8_CANDIDATE_ROOT must point to the independent exact offline-fix checkout');
  const checkoutSha = git(m8Root, ['rev-parse', '--verify', 'HEAD'], 'M8 checkout SHA');
  assert.equal(assertExactManifestCandidate('M8', m8Sha, checkoutSha), expectedM8Sha);
  git(m8Root, ['rev-parse', '--verify', `${expectedM8Sha}^{tree}`], 'M8 checkout tree');
  assert.equal(git(m8Root, ['merge-base', '--is-ancestor', expectedM8PinSha, expectedM8Sha], 'immutable M8 pin ancestry'), '');
  assert.equal(sourceBlob(m8Root, expectedM8Sha), expectedM8Blob, 'M8 offline demo must use the exact Issue #102 fixed blob');

  const source = fs.readFileSync(path.join(m8Root, offlineDemoPath), 'utf8');
  assert.match(source, /assert\.rejects\(runtime\.agent\.dispatch\(\{name:'read_file',args:\{path:'\.env'\}\}\),\/GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK\//, 'failed protected read must assert Guard rejection');
  assert.match(source, /assert\.equal\(g\.state,'QUARANTINED'\)/, 'failed protected read must assert quarantine');
  assert.match(source, /assert\.rejects\(runtime\.agent\.dispatch\(\{name:'write_file',args:\{path:'result\.txt',content:'FORBIDDEN_AFTER_TRIP'\}\}\),\/guard_quarantined\//, 'post-trip write must be rejected');
  assert.match(source, /assert\.equal\(fs\.readFileSync\(path\.join\(fixture,'result\.txt'\),'utf8'\),'NORMAL_OK'\)/, 'post-trip target must retain the pre-trip content');
});

test('stale environment or checkout SHAs cannot substitute for the manifest candidate', () => {
  assert.throws(
    () => assertExactManifestCandidate('M8', '60cfe8d976a42d0f635d4be93ca24c00e81246d5', expectedM8Sha),
    /M8_SHA must match the exact M9 manifest ref/,
  );
  assert.throws(
    () => assertExactManifestCandidate('M8', expectedM8Sha, '60cfe8d976a42d0f635d4be93ca24c00e81246d5'),
    /M8 checkout HEAD must match the exact M9 manifest ref/,
  );
  assert.throws(
    () => assertExactManifestCandidate('M7', '0000000000000000000000000000000000000000', expectedM7Sha),
    /M7_SHA must match the exact M9 manifest ref/,
  );
  assert.throws(
    () => assertExactManifestCandidate('M7', expectedM7Sha, 'c03176fbce3741bd756bfdad4576ff807572134b'),
    /M7 checkout HEAD must match the exact M9 manifest ref/,
  );
});

test('M7 Community builder pins and stages the M8-fixed offline demo blob', () => {
  assert.ok(m7Root, 'M7_ROOT must point to the independent exact Community candidate checkout');
  const checkoutSha = git(m7Root, ['rev-parse', '--verify', 'HEAD'], 'M7 checkout SHA');
  assert.equal(assertExactManifestCandidate('M7', m7Sha, checkoutSha), expectedM7Sha);
  git(m7Root, ['rev-parse', '--verify', `${expectedM7Sha}^{tree}`], 'M7 checkout tree');
  const builder = fs.readFileSync(path.join(m7Root, 'security-lab/build-community.py'), 'utf8');
  const workflow = fs.readFileSync(path.join(m7Root, '.github/workflows/windows-community.yml'), 'utf8');
  assert.match(builder, /expected_m8_source_sha='24b8651730d57d860ba136e77db1526031abb1fc'/, 'M7 builder must retain the immutable reviewed M8 source pin');
  assert.match(builder, /expected_m8_demo_blob='3428f297c28845ae054c0ca63aa6c5c4d7ef785f'/, 'M7 builder must pin the exact M8 offline-demo Git blob');
  assert.match(builder, /p\.add_argument\('--m8-pr-head-sha',required=True\)/, 'M7 builder must receive the separately observed current M8 PR head');
  assert.match(builder, /merge-base','--is-ancestor',a\.m8_source_sha,a\.m8_pr_head_sha/, 'M7 builder must require the immutable source pin to be an ancestor of the current PR head');
  assert.match(builder, /community_demo_path\.write_bytes\(m8_demo_bytes\)/, 'M7 candidate must stage the bytes fetched from the pinned M8 source');
  assert.match(builder, /candidate_m8_demo!=m8_demo_bytes[\s\S]*?expected_m8_demo_blob/, 'M7 builder must verify staged bytes and their exact Git blob');
  assert.match(builder, /m8SourceSHA':a\.m8_source_sha[\s\S]*?'m8PRHeadSHA':a\.m8_pr_head_sha[\s\S]*?'m8SourceBlob':expected_m8_demo_blob[\s\S]*?'m8PRHeadBlob':m8_pr_demo_blob_id/, 'M7 build provenance must record the immutable source and current PR-head SHAs and blobs');
  assert.match(workflow, /M8_SOURCE_SHA: 24b8651730d57d860ba136e77db1526031abb1fc/, 'M7 Community workflow must carry the immutable M8 source SHA');
  assert.ok(workflow.includes(`refs/pull/${expectedM8PullRequest}/head`), 'M7 Community workflow must fetch the manifest-pinned M8 PR candidate');
  assert.match(workflow, /git merge-base --is-ancestor \$m8SourceSha \$m8PrHeadSha/, 'M7 Community workflow must validate the immutable source against the fetched PR head');
  assert.match(workflow, /--m8-source-sha \$env:M8_SOURCE_SHA/, 'M7 Community workflow must pass the pinned M8 source to the builder');
  assert.match(workflow, /--m8-pr-head-sha \$env:M8_PR_HEAD_SHA/, 'M7 Community workflow must pass the observed M8 PR head to the builder');

  const m7Blob = sourceBlob(m7Root, expectedM7Sha);
  const m8Blob = sourceBlob(m8Root, expectedM8Sha);
  assert.equal(m7Blob, expectedM7Blob, 'the older checked-in M7 demo source blob remains visible');
  assert.equal(m8Blob, expectedM8Blob, 'the exact M8 Issue #102 fix blob must remain visible');
  assert.notEqual(m7Blob, m8Blob, 'the checked-in M7 copy is stale; the builder must source the separately pinned M8 blob');
});
