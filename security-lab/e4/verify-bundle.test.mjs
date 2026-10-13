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

function createValidRun(runDir) {
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
    classification: 'AUTHOR_AUTOMATION_RUN_NOT_E4',
    operatorRole: 'author',
    source: { commit: '1'.repeat(40) },
    cases
  };
  const payload = [
    ['report.json', Buffer.from(`${JSON.stringify(report, null, 2)}\n`)],
    ['report.md', Buffer.from('# Synthetic verification fixture\n')],
    ['raw.log', Buffer.from('{"event":"synthetic"}\n')]
  ];
  const manifest = Buffer.from(`${payload.map(([name, data]) => `${sha256(data)}  ${name}`).join('\n')}\n`);
  const entries = [...payload, ['SHA256SUMS.txt', manifest]].map(([name, data]) => ({ name, data }));
  const archivePath = path.join(runDir, 'evidence.zip');
  createZip(entries, archivePath);
  for (const [name, data] of [...payload, ['SHA256SUMS.txt', manifest]]) fs.writeFileSync(path.join(runDir, name), data);
  const archiveHash = sha256(fs.readFileSync(archivePath));
  fs.writeFileSync(path.join(runDir, 'bundle.sha256'), `${archiveHash}  evidence.zip\n`);
  fs.writeFileSync(path.join(runDir, 'bundle.json'), JSON.stringify({ sha256: archiveHash, e4Status: 'NOT_VERIFIED' }));
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
