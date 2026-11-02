import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Chinese README SDK example executes against the local Gateway and proves read/deny outcomes', async () => {
  const readme = fs.readFileSync(path.join(projectRoot, 'README.zh-CN.md'), 'utf8');
  const match = readme.match(/<!-- sdk-minimal-example:start -->\s*```ts\s*([\s\S]*?)\s*```\s*<!-- sdk-minimal-example:end -->/);
  assert.ok(match, 'README SDK example markers and TypeScript block exist');

  const localSource = match[1].replace("from '@dorianchn/agent-canary/sdk'", "from '../src/sdk.js'");
  assert.notEqual(localSource, match[1], 'example import is redirected to the checked-out source for this test');
  const examplePath = path.join(path.dirname(fileURLToPath(import.meta.url)), `.readme-sdk-example-${process.pid}-${Date.now()}.ts`);
  try {
    fs.writeFileSync(examplePath, localSource, {flag: 'wx'});
    const {exampleResult} = await import(`${pathToFileURL(examplePath).href}?test=${Date.now()}`);
    assert.deepEqual(exampleResult.read, {content: '仅授权读取的公开文本。\n'});
    assert.equal(exampleResult.writeDenied, true);
    assert.ok(exampleResult.evidence.some((event) => event.decision === 'ALLOW' && event.execution_status === 'SUCCEEDED'));
    assert.ok(exampleResult.evidence.some((event) => event.decision === 'DENY' && event.execution_status === 'NOT_STARTED'));
  } finally {
    fs.rmSync(examplePath, {force: true});
  }
});
