import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createZip } from './zip.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const verifier = path.join(scriptDir, 'verify-bundle.mjs');
const sha256 = data => createHash('sha256').update(data).digest('hex');

function createValidRun(runDir, {classification = 'AUTHOR_AUTOMATION_RUN_NOT_E4'} = {}) {
  fs.mkdirSync(runDir, { recursive: true });
  const cases = [
    'GW-ALLOW-CONTROL', 'GW-CANARY-BLOCK', 'CANARY-SESSION-ISOLATION',
    'GW-FAULT-EXECUTOR', 'GW-FAULT-CLOSED', 'HOOK-FAULT-STATESTORE',
    'SHELL-BOUNDARY-BYPASS', 'ARTIFACT-VM-BINDING', 'APP-01', 'MODEL-REAL-TOOLCALL'
  ].map(id => id === 'SHELL-BOUNDARY-BYPASS'
    ? { id, status: 'OBSERVED_BYPASS', details: { countsAsGatewayPass: false, countsAsGatewayFail: false } }
    : id === 'MODEL-REAL-TOOLCALL'
      ? { id, status: 'BLOCKED', reason: 'REAL_MODEL_FLAG_NOT_SET' }
      : { id, status: 'PASS_FIXTURE', reason: 'SYNTHETIC_FIXTURE' });
  const report = {
    e4Status: 'NOT_VERIFIED',
    overall: 'AUTHOR_AUTOMATION_COMPLETE_E4_STILL_NOT_VERIFIED',
    classification,
    operatorRole: 'author',
    source: { commit: '1'.repeat(40) },
    cases
  };
  const payload = [
    ['report.json', Buffer.from(`${JSON.stringify(report, null, 2)}\n`)],
    ['report.md', Buffer.from('# Synthetic verification fixture\n')],
    ['raw.log', Buffer.from('{"event":"synthetic"}\n')],
    ['evidence/synthetic.jsonl', Buffer.from('{"event":"synthetic-evidence"}\n')]
  ];
  const manifest = Buffer.from(`${payload.map(([name, data]) => `${sha256(data)}  ${name}`).join('\n')}\n`);
  const entries = [...payload, ['SHA256SUMS.txt', manifest]].map(([name, data]) => ({ name, data }));
  const archivePath = path.join(runDir, 'evidence.zip');
  createZip(entries, archivePath);
  for (const [name, data] of [...payload, ['SHA256SUMS.txt', manifest]]) {
    const file = path.join(runDir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  }
  const archiveHash = sha256(fs.readFileSync(archivePath));
  fs.writeFileSync(path.join(runDir, 'bundle.sha256'), `${archiveHash}  evidence.zip\n`);
  fs.writeFileSync(path.join(runDir, 'bundle.json'), JSON.stringify({
    schema: 'agent-canary.e4-bundle.v1',
    archive: 'evidence.zip',
    sha256: archiveHash,
    size: fs.statSync(archivePath).size,
    entries: entries.length,
    manifest: { entries: payload.length, valid: true },
    verification: 'LOCAL_ZIP_CRC_AND_SHA256_MANIFEST_VERIFIED',
    e4Status: 'NOT_VERIFIED',
    classification: report.classification
  }));
}

function runVerifier(runDir) {
  return spawnSync(process.execPath, [verifier, runDir], { encoding: 'utf8', windowsHide: true });
}

for (const name of ['SHA256SUMS.txt', 'report.json', 'report.md', 'raw.log']) {
  test(`E4 verifier rejects an external ${name} copy that differs from the ZIP`, t => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
    t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
    createValidRun(runDir);

    const valid = runVerifier(runDir);
    assert.equal(valid.status, 0, valid.stderr);

    fs.appendFileSync(path.join(runDir, name), 'tampered external copy\n');
    const invalid = runVerifier(runDir);
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.match(invalid.stderr, new RegExp(`E4_EXTERNAL_COPY_MISMATCH:${name.replaceAll('.', '\\.')}`));
  });
}

test('E4 verifier rejects an external evidence JSONL copy that differs from the ZIP', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir);

  const valid = runVerifier(runDir);
  assert.equal(valid.status, 0, valid.stderr);

  fs.appendFileSync(path.join(runDir, 'evidence', 'synthetic.jsonl'), 'tampered external copy\n');
  const invalid = runVerifier(runDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_EXTERNAL_COPY_MISMATCH:evidence\/synthetic\.jsonl/);
});

for (const [label, mutate] of [
  ['schema', metadata => { metadata.schema = 'agent-canary.invalid'; }],
  ['archive name', metadata => { metadata.archive = 'other.zip'; }],
  ['archive size', metadata => { metadata.size += 1; }],
  ['archive entry count', metadata => { metadata.entries += 1; }],
  ['inner manifest summary', metadata => { metadata.manifest.entries += 1; }],
  ['classification', metadata => { metadata.classification = 'E4_VERIFIED'; }],
  ['verification claim', metadata => { metadata.verification = 'UNVERIFIED'; }]
]) {
  test(`E4 verifier rejects contradictory bundle.json ${label}`, t => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
    t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
    createValidRun(runDir);

    const metadataPath = path.join(runDir, 'bundle.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    mutate(metadata);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    const invalid = runVerifier(runDir);
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.match(invalid.stderr, /E4_BUNDLE_METADATA_MISMATCH_OR_PROMOTED/);
  });
}

test('E4 verifier rejects a promoted classification when report and bundle metadata agree', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir, {classification: 'E4_VERIFIED'});

  const invalid = runVerifier(runDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_AUTOMATION_MUST_NOT_PROMOTE_VERDICT/);
});
