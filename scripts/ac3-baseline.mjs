import { spawnSync } from 'node:child_process';

const SHA1 = /^[0-9a-f]{40}$/i;

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) return { status: null, stdout: '', stderr: result.error.message };
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function isCommit(cwd, sha) {
  return runGit(cwd, ['cat-file', '-e', `${sha}^{commit}`]).status === 0;
}

export function composeAc3Candidate({ baselineSha, baseSha, headSha, cwd }) {
  const errors = [];
  const refs = [
    ['approved common-source baseline', baselineSha],
    ['current feature base', baseSha],
    ['PR head', headSha]
  ];

  for (const [label, sha] of refs) {
    if (typeof sha !== 'string' || !SHA1.test(sha)) {
      errors.push(`AC3 ${label} is missing or invalid; an explicit 40-character commit SHA is required.`);
    }
  }
  if (errors.length) return { ok: false, tree: null, errors };

  for (const [label, sha] of refs) {
    if (!isCommit(cwd, sha)) errors.push(`AC3 ${label} ${sha} is unavailable as a Git commit.`);
  }
  if (errors.length) return { ok: false, tree: null, errors };

  for (const [label, sha] of [['current feature base', baseSha], ['PR head', headSha]]) {
    const ancestry = runGit(cwd, ['merge-base', '--is-ancestor', baselineSha, sha]);
    if (ancestry.status !== 0) {
      errors.push(`AC3 ${label} ${sha} does not contain approved common-source baseline ${baselineSha}.`);
    }
  }
  if (errors.length) return { ok: false, tree: null, errors };

  const merge = runGit(cwd, ['merge-tree', '--write-tree', baseSha, headSha]);
  if (merge.status !== 0) {
    const conflicts = merge.stdout.split(/\r?\n/).filter((line) => /^CONFLICT\b/.test(line));
    const detail = conflicts.length ? ` Conflicts: ${conflicts.join('; ')}` : '';
    errors.push(`AC3 current feature base and PR head do not compose cleanly with git merge-tree (exit ${merge.status}).${detail}`);
    return { ok: false, tree: null, errors };
  }

  const tree = merge.stdout.split(/\r?\n/)[0]?.trim();
  if (!tree || !SHA1.test(tree) || runGit(cwd, ['cat-file', '-e', `${tree}^{tree}`]).status !== 0) {
    errors.push('AC3 git merge-tree did not return a valid composition tree SHA.');
    return { ok: false, tree: null, errors };
  }

  return { ok: true, tree, errors };
}
