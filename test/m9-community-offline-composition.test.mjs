import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const m7Root = process.env.M7_ROOT;
const m7Sha = process.env.M7_SHA;
const m8Root = process.env.M8_CANDIDATE_ROOT;
const m8Sha = process.env.M8_CANDIDATE_SHA;
const offlineDemoPath = 'competition-submission/roadshow-3.0/reproduction-kit/run-offline-demo.mjs';
const expectedM7Sha = 'cf478f5fce4dde3229dcd11e86db14be85e65cce';
const expectedM8Sha = '90fcde07775d4109f6e1b1b4b52d1975723dd979';
const expectedM7Blob = '71ba0f00f31583c4227cd937972e6f9a677898ca';
const expectedM8Blob = '3428f297c28845ae054c0ca63aa6c5c4d7ef785f';

assert.ok(m7Root, 'M7_ROOT must point to the independent exact Community candidate checkout');
assert.ok(m8Root, 'M8_CANDIDATE_ROOT must point to the independent exact offline-fix checkout');
assert.equal(m7Sha, expectedM7Sha, 'M7 must use the exact current Community candidate');
assert.equal(m8Sha, expectedM8Sha, 'M8 must use the exact current PR #40 candidate');

function git(root, args, label) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.error, undefined, `${label}: git command must start`);
  assert.equal(result.status, 0, `${label}: git command must succeed; ${result.stderr}`);
  return result.stdout.trim();
}

function sourceBlob(root, sha) {
  return git(root, ['rev-parse', '--verify', `${sha}:${offlineDemoPath}`], 'offline demo blob lookup');
}

test('M8 exact offline demo retains the Guard rejection and post-quarantine safety assertions', () => {
  assert.equal(git(m8Root, ['rev-parse', '--verify', 'HEAD'], 'M8 checkout SHA'), expectedM8Sha);
  assert.equal(git(m8Root, ['rev-parse', '--verify', `${expectedM8Sha}^{tree}`], 'M8 checkout tree'), '6c2c96e46bf19cac2ac7154cbfd4efc9ee27e82f');
  assert.equal(sourceBlob(m8Root, expectedM8Sha), expectedM8Blob, 'M8 offline demo must use the exact Issue #102 fixed blob');

  const source = fs.readFileSync(path.join(m8Root, offlineDemoPath), 'utf8');
  assert.match(source, /assert\.rejects\(runtime\.agent\.dispatch\(\{name:'read_file',args:\{path:'\.env'\}\}\),\/GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK\//, 'failed protected read must assert Guard rejection');
  assert.match(source, /assert\.equal\(g\.state,'QUARANTINED'\)/, 'failed protected read must assert quarantine');
  assert.match(source, /assert\.rejects\(runtime\.agent\.dispatch\(\{name:'write_file',args:\{path:'result\.txt',content:'FORBIDDEN_AFTER_TRIP'\}\}\),\/guard_quarantined\//, 'post-trip write must be rejected');
  assert.match(source, /assert\.equal\(fs\.readFileSync\(path\.join\(fixture,'result\.txt'\),'utf8'\),'NORMAL_OK'\)/, 'post-trip target must retain the pre-trip content');
});

test('M7 Community build consumes the M8-fixed offline demo blob', () => {
  assert.equal(git(m7Root, ['rev-parse', '--verify', 'HEAD'], 'M7 checkout SHA'), expectedM7Sha);
  const builder = fs.readFileSync(path.join(m7Root, 'security-lab/build-community.py'), 'utf8');
  assert.match(builder, /for name in \['run-offline-demo\.mjs'/, 'M7 Community packager must include the offline demo');
  assert.match(builder, /\(root\/'competition-submission\/roadshow-3\.0\/reproduction-kit'\/name\)\.read_bytes\(\)/, 'M7 Community packager must copy the file from its own exact checkout');
  const m7Blob = sourceBlob(m7Root, expectedM7Sha);
  const m8Blob = sourceBlob(m8Root, expectedM8Sha);
  assert.equal(m7Blob, expectedM7Blob, 'the exact M7 Community builder source blob must remain visible');
  assert.equal(m8Blob, expectedM8Blob, 'the exact M8 Issue #102 fix blob must remain visible');
  assert.equal(
    m7Blob,
    m8Blob,
    `BLOCKED Issue #102: M7 Community builder still copies offline demo blob ${m7Blob}; current M8 fix is ${m8Blob}`,
  );
});
