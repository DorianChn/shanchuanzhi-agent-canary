import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifier = path.join(projectRoot, 'reproduction-kit/verify-community-manifest.mjs');

test('community source manifest accepts CRLF worktrees for LF-canonical text hashes', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-manifest-eol-'));
  try {
    const canonical = Buffer.from('first line\nsecond line\n', 'utf8');
    const crlf = Buffer.from('first line\r\nsecond line\r\n', 'utf8');
    fs.writeFileSync(path.join(fixtureRoot, 'fixture.txt'), crlf);
    fs.writeFileSync(path.join(fixtureRoot, 'SOURCE_MANIFEST.json'), JSON.stringify({
      'fixture.txt': createHash('sha256').update(canonical).digest('hex'),
    }));

    const child = spawnSync(process.execPath, [verifier, fixtureRoot], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 15_000,
      windowsHide: true,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const report = JSON.parse(child.stdout);
    assert.deepEqual(report.mismatches, []);
    assert.equal(report.files, 1);
  } finally {
    fs.rmSync(fixtureRoot, {recursive: true, force: true});
  }
});
