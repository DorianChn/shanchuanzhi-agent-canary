import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {test} from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('README SDK quick-start links to and executes the checked-in example against current source', () => {
  const englishReadme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
  const chineseReadme = fs.readFileSync(path.join(projectRoot, 'README.zh-CN.md'), 'utf8');
  const chineseGuide = fs.readFileSync(path.join(projectRoot, 'GETTING_STARTED.zh-CN.md'), 'utf8');
  for (const [label, text] of [
    ['English README', englishReadme],
    ['Chinese README', chineseReadme],
    ['Chinese getting-started guide', chineseGuide],
  ]) {
    assert.match(text, /node examples\/sdk\/quick-start\.mjs/, `${label} must document the runnable SDK example`);
  }

  const examplePath = path.join(projectRoot, 'examples', 'sdk', 'quick-start.mjs');
  const source = fs.readFileSync(examplePath, 'utf8');
  const packageImport = "from '@dorianchn/agent-canary/sdk';";
  assert.ok(source.includes(packageImport), 'the published example must use the package SDK export');
  const sourceImport = `from '${pathToFileURL(path.join(projectRoot, 'src', 'sdk.ts')).href}';`;
  const localSource = source.replace(packageImport, sourceImport);
  assert.notEqual(localSource, source, 'the test must redirect the package import to the current source');

  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', localSource], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const result = JSON.parse(child.stdout);
  assert.equal(result.registeredRead, 'allowed-and-verified');
  assert.deepEqual(result.unregisteredRead, {status: 'denied', reason: 'resource_not_bound'});
  assert.equal(result.writes, 'disabled-by-contract');
  assert.ok(result.evidence.eventCount >= 2, 'allow and deny outcomes must both be represented in the local evidence chain');
  assert.equal(result.evidence.validLocalChain, true);
});
