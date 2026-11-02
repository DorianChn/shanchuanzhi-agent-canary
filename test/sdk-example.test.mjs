import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = path.join(repoRoot, 'examples', 'sdk', 'quick-start.mjs');

test('SDK quick-start runs the built package and verifies allow/deny evidence', () => {
  const result = spawnSync(process.execPath, [examplePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 15_000,
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.registeredRead, 'allowed-and-verified');
  assert.deepEqual(output.unregisteredRead, {status: 'denied', reason: 'resource_not_bound'});
  assert.equal(output.writes, 'disabled-by-contract');
  assert.equal(output.evidence.validLocalChain, true);
  assert.ok(output.evidence.eventCount >= 3);
});
