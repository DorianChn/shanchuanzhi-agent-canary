import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { composeAc3Candidate } from '../scripts/ac3-baseline.mjs';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(cwd, file, contents) {
  const destination = path.join(cwd, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function commit(cwd, message) {
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

function repo(t) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'ac3-baseline-dag-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.name', 'AC3 synthetic test');
  git(cwd, 'config', 'user.email', 'ac3-test@example.invalid');
  write(cwd, 'shared.txt', 'approved source\n');
  const baselineSha = commit(cwd, 'approved common source baseline');
  return { cwd, baselineSha };
}

test('accepts manifest-only base advancement and returns a real clean merge tree', (t) => {
  const { cwd, baselineSha } = repo(t);
  git(cwd, 'checkout', '-b', 'current-feature');
  write(cwd, 'docs/ac3-manifest.md', 'coordination-only advancement\n');
  const baseSha = commit(cwd, 'advance coordination manifest');

  git(cwd, 'checkout', '-b', 'module-candidate', baselineSha);
  write(cwd, 'src/module.txt', 'module source\n');
  const headSha = commit(cwd, 'module change');
  const before = git(cwd, 'status', '--porcelain');

  const result = composeAc3Candidate({ baselineSha, baseSha, headSha, cwd });

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.match(result.tree, /^[0-9a-f]{40}$/);
  assert.equal(git(cwd, 'show', `${result.tree}:docs/ac3-manifest.md`), 'coordination-only advancement');
  assert.equal(git(cwd, 'show', `${result.tree}:src/module.txt`), 'module source');
  assert.equal(git(cwd, 'status', '--porcelain'), before, 'merge-tree must not modify the worktree or index');
});

test('rejects a PR head that does not descend from the approved baseline', (t) => {
  const { cwd, baselineSha } = repo(t);
  const baseSha = baselineSha;
  const unrelatedTree = git(cwd, 'rev-parse', `${baselineSha}^{tree}`);
  const unrelatedHead = git(cwd, 'commit-tree', unrelatedTree, '-m', 'unrelated root');

  const result = composeAc3Candidate({ baselineSha, baseSha, headSha: unrelatedHead, cwd });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /PR head .* does not contain approved common-source baseline/);
});

test('rejects a current feature base from the wrong lineage', (t) => {
  const { cwd, baselineSha } = repo(t);
  const unrelatedTree = git(cwd, 'rev-parse', `${baselineSha}^{tree}`);
  const wrongBase = git(cwd, 'commit-tree', unrelatedTree, '-m', 'unrelated feature base');
  write(cwd, 'src/module.txt', 'module source\n');
  const headSha = commit(cwd, 'module change');

  const result = composeAc3Candidate({ baselineSha, baseSha: wrongBase, headSha, cwd });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /current feature base .* does not contain approved common-source baseline/);
});

test('rejects real merge-tree conflicts while both sides contain the approved baseline', (t) => {
  const { cwd, baselineSha } = repo(t);
  write(cwd, 'shared.txt', 'feature side\n');
  const baseSha = commit(cwd, 'feature edits shared file');
  git(cwd, 'checkout', '-b', 'module-candidate', baselineSha);
  write(cwd, 'shared.txt', 'module side\n');
  const headSha = commit(cwd, 'module edits same file');

  const result = composeAc3Candidate({ baselineSha, baseSha, headSha, cwd });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /do not compose cleanly with git merge-tree/);
  assert.match(result.errors.join('\n'), /shared\.txt/);
});

test('rejects absent or malformed baseline policy instead of silently skipping the gate', (t) => {
  const { cwd, baselineSha } = repo(t);
  const headSha = baselineSha;

  for (const invalid of [undefined, '', 'e4732d9']) {
    const result = composeAc3Candidate({ baselineSha: invalid, baseSha: baselineSha, headSha, cwd });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /approved common-source baseline is missing or invalid/);
  }
});
