import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('author E4 runner uses read-only controls, records active quarantine, and never certifies E4', () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-auto-e4-test-'));
  try {
    const env = {...process.env};
    for (const key of ['E4_MODEL_BASE_URL', 'E4_MODEL_PROVIDER', 'E4_MODEL_ID', 'E4_MODEL_DISPLAY_NAME', 'E4_MODEL_API_KEY']) delete env[key];
    const child = spawnSync(process.execPath, [path.join(projectRoot, 'security-lab/e4/run.mjs'), `--out-dir=${outputRoot}`], {
      cwd: projectRoot,
      encoding: 'utf8',
      env,
      timeout: 60_000,
      windowsHide: true,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const summary = JSON.parse(child.stdout.trim().split(/\r?\n/).at(-1));
    assert.equal(summary.e4Status, 'NOT_VERIFIED');
    assert.equal(summary.bundleVerified, true);

    const runDirectories = fs.readdirSync(outputRoot, {withFileTypes: true}).filter(item => item.isDirectory());
    assert.equal(runDirectories.length, 1);
    const runDirectory = path.join(outputRoot, runDirectories[0].name);
    const report = JSON.parse(fs.readFileSync(path.join(runDirectory, 'report.json'), 'utf8'));
    const getCase = id => report.cases.find(item => item.id === id);

    assert.equal(report.overall, 'AUTHOR_AUTOMATION_COMPLETE_E4_STILL_NOT_VERIFIED');
    assert.equal(getCase('GW-ALLOW-CONTROL')?.status, 'PASS_CONTROL');
    assert.equal(getCase('GW-ALLOW-CONTROL')?.fileState?.unchanged, true);
    assert.equal(getCase('GW-CANARY-BLOCK')?.status, 'PASS_FIXTURE');
    assert.equal(getCase('GW-CANARY-BLOCK')?.details?.activeGatewayDeny, true);
    assert.equal(getCase('CANARY-SESSION-ISOLATION')?.status, 'PASS_FIXTURE');
    assert.equal(getCase('CANARY-SESSION-ISOLATION')?.details?.sessionAActiveGatewayDeny, true);
    assert.equal(getCase('CANARY-SESSION-ISOLATION')?.details?.sessionBReadAllowed, true);
    assert.equal(getCase('ARTIFACT-VM-BINDING')?.status, 'BLOCKED');
    assert.equal(getCase('APP-01')?.status, 'BLOCKED');
    assert.equal(getCase('MODEL-REAL-TOOLCALL')?.status, 'BLOCKED');
    assert.equal(report.model.chatCompletions, 0);
    assert.equal(report.model.toolCalls, 0);
    assert.equal(report.model.result, 'NOT_REQUESTED');

    const verifier = spawnSync(process.execPath, [path.join(projectRoot, 'security-lab/e4/verify-bundle.mjs'), runDirectory], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 15_000,
      windowsHide: true,
    });
    assert.equal(verifier.error, undefined, verifier.error?.message);
    assert.equal(verifier.status, 0, verifier.stderr || verifier.stdout);
    assert.equal(JSON.parse(verifier.stdout).e4Status, 'NOT_VERIFIED');
  } finally {
    fs.rmSync(outputRoot, {recursive: true, force: true});
  }
});
