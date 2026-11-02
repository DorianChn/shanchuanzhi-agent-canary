import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
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

test('Chinese README SDK callback example executes allow, decoy, and deny without the blocked callback', () => {
  const readme = fs.readFileSync(path.join(projectRoot, 'README.zh-CN.md'), 'utf8');
  const start = readme.indexOf('<!-- sdk-guarded-router-example:start -->');
  const end = readme.indexOf('<!-- sdk-guarded-router-example:end -->', start + 1);
  assert.ok(start >= 0 && end > start, 'README callback example markers must be present');
  const section = readme.slice(start, end);
  const match = section.match(/\x60\x60\x60js\r?\n([\s\S]*?)\r?\n\x60\x60\x60/);
  assert.ok(match, 'README must contain a runnable JavaScript callback example');

  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-readme-sdk-test-'));
  try {
    const child = spawnSync(process.execPath, ['--input-type=module', '--eval', match[1]], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {...process.env, AGENT_CANARY_HOME: testHome},
      timeout: 15_000,
      windowsHide: true,
    });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const result = JSON.parse(child.stdout);
    assert.deepEqual(result.allowedResult, {id: 'intro', text: '这是一条本地示例笔记。'});
    assert.equal(result.decoyReplyReceived, true);
    assert.equal(result.guardState, 'QUARANTINED');
    assert.deepEqual(result.denied, {allowed: false, reason: 'session_quarantined'});
    assert.deepEqual(result.callbackInvocations, ['read_note']);
    assert.ok(result.toolDefinitionCount > 2);
  } finally {
    fs.rmSync(testHome, {recursive: true, force: true});
  }
});
