import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateExactSourceManifest, exactModuleNames } from '../scripts/validate-m9-exact-source-manifest.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/3.0/M9_EXACT_SOURCE_REFS.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/m9-cross-module-composition.yml'), 'utf8').replace(/\r\n/g, '\n');
const selectionStart = workflow.indexOf('name: Select immutable M9 source SHA');
const selectionEnd = workflow.indexOf('name: Checkout exact M9 source SHA', selectionStart);
const selectionStep = workflow.slice(selectionStart, selectionEnd);
const mergeParentSelectorCode = selectionStep.match(/node -e '\s*([\s\S]*?)\s*'\)/)?.[1];
const ghApiInvocation = selectionStep.match(/gh api --jq '\{sha: \.sha, parents: \[\.parents\[\]\.sha\]\}' "repos\/\$GITHUB_REPOSITORY\/git\/commits\/\$MANUAL_SHA"/)?.[0];

function runMergeParentSelector(parents, overrides = {}) {
  assert.ok(mergeParentSelectorCode, 'workflow must expose a testable immutable test-merge parent selector');
  const result = spawnSync(process.execPath, ['-e', mergeParentSelectorCode], {
    encoding: 'utf8',
    input: JSON.stringify(parents),
    env: {
      ...process.env,
      PR_BASE_REF: 'feature/agent-canary-3.0',
      PR_BASE_SHA: 'a'.repeat(40),
      PR_HEAD_SHA: 'b'.repeat(40),
      MANUAL_SHA: 'c'.repeat(40),
      ...overrides,
    },
  });
  return { ...result, lines: result.stdout.trim().split('\n') };
}

test('the manifest pins exactly eight immutable module commits and a separate historical M8 checkout', () => {
  const validated = validateExactSourceManifest(manifest);
  assert.deepEqual(Object.keys(validated.modules).sort(), exactModuleNames);
  assert.equal(validated.modules.M2.pullRequest, 110);
  assert.equal(validated.modules.M6.pullRequest, 123);
  assert.equal(validated.modules.M8.pullRequest, 40);
  assert.notEqual(validated.historical.sha, validated.modules.M8.sha);
  assert.equal(validated.review.status, 'ACCEPT');
  assert.equal(validated.review.targetSha, manifest.modules.M8.sha);
  assert.equal(validated.review.reviewedSha, manifest.modules.M8.sha);
  assert.equal(validated.review.commentId, '6387136527');
  assert.equal(validated.review.candidateLifecycleBlobSha, 'd1705c204ef3f511ee4828e90b35731b36f92238');
  assert.equal(validated.review.m6VerifierTestBlobSha, '2e9b0c00c853193ea50eaecf1209747e8f64affe');
});

test('a module PR only composes when PR number, stable branch, and exact head SHA match the manifest', () => {
  for (const moduleName of ['M2', 'M6', 'M8']) {
    const source = manifest.modules[moduleName];
    assert.doesNotThrow(() => validateExactSourceManifest(manifest, {
      eventName: 'pull_request',
      pullRequestBaseRef: manifest.targetBaseRef,
      pullRequestNumber: source.pullRequest,
      pullRequestHeadRef: source.branchRef,
      pullRequestHeadSha: source.sha,
    }));
    assert.throws(() => validateExactSourceManifest(manifest, {
      eventName: 'pull_request',
      pullRequestBaseRef: manifest.targetBaseRef,
      pullRequestNumber: source.pullRequest,
      pullRequestHeadRef: source.branchRef,
      pullRequestHeadSha: '0000000000000000000000000000000000000000',
    }), /differs from the exact M9 manifest ref/);
    assert.throws(() => validateExactSourceManifest(manifest, {
      eventName: 'pull_request',
      pullRequestBaseRef: manifest.targetBaseRef,
      pullRequestNumber: source.pullRequest + 1,
      pullRequestHeadRef: source.branchRef,
      pullRequestHeadSha: source.sha,
    }), /differs from the exact M9 manifest ref/);
  }
});

test('M6 follow-up PR #123 uses its exact source and rejects historical PR #100', () => {
  const source = manifest.modules.M6;
  assert.throws(() => validateExactSourceManifest(manifest, {
    eventName: 'pull_request',
    pullRequestBaseRef: manifest.targetBaseRef,
    pullRequestNumber: 100,
    pullRequestHeadRef: source.branchRef,
    pullRequestHeadSha: '2975f3fc88929cacf268e80a503667b440ea519a',
  }), /differs from the exact M9 manifest ref/);
  assert.doesNotThrow(() => validateExactSourceManifest(manifest, {
    eventName: 'pull_request',
    pullRequestBaseRef: manifest.targetBaseRef,
    pullRequestNumber: source.pullRequest,
    pullRequestHeadRef: source.branchRef,
    pullRequestHeadSha: source.sha,
  }));
});

test('a non-module documentation PR explicitly uses the target branch manifest', () => {
  assert.doesNotThrow(() => validateExactSourceManifest(manifest, {
    eventName: 'pull_request',
    pullRequestBaseRef: manifest.targetBaseRef,
    pullRequestNumber: 999,
    pullRequestHeadRef: 'feature/ac3-coordinator-docs',
    pullRequestHeadSha: '0000000000000000000000000000000000000000',
  }));
  assert.throws(() => validateExactSourceManifest(manifest, {
    eventName: 'pull_request',
    pullRequestBaseRef: 'main',
    pullRequestNumber: 999,
    pullRequestHeadRef: 'feature/ac3-coordinator-docs',
    pullRequestHeadSha: '0000000000000000000000000000000000000000',
  }), /base differs from the manifest target base/);
});

test('the workflow targets feature PRs and dispatches from exact M9 commits without mutable PR refs', () => {
  assert.match(workflow, /pull_request:\n\s+branches:\n\s+- feature\/agent-canary-3\.0/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.ok(workflow.indexOf('actions/setup-node@') < selectionStart, 'pinned Node runtime must be ready before validating GitHub API parent JSON');
  assert.match(workflow, /\$PR_HEAD_REF" == 'feature\/ac3-m9-integration'/);
  assert.match(workflow, /m9_source_sha="\$PR_HEAD_SHA"/);
  assert.doesNotMatch(workflow, /m9_source_sha="\$PR_BASE_SHA"/);
  assert.match(selectionStep, /m9_source_sha="\$\{selected\[0\]\}"/);
  assert.match(workflow, /m9_source_sha="\$MANUAL_SHA"/);
  assert.match(selectionStep, /selection_mode='exact-m9-pr-head'/);
  assert.match(selectionStep, /selection_mode='exact-manual-github-sha'/);
  assert.match(selectionStep, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /M9-test-merge-first-parent.*M9_TEST_MERGE_BASE_SHA/);
  assert.match(workflow, /M9-test-merge-second-parent.*M9_TEST_MERGE_HEAD_SHA/);
  assert.match(workflow, /git merge-base --is-ancestor "\$PR_BASE_SHA" "\$EXPECTED_M9_SHA"/);
  assert.doesNotMatch(workflow, /refs\/pull\/[0-9]+\/head/);
  assert.match(workflow, /ref: \$\{\{ steps\.m9-ref\.outputs\.sha \}\}/);
  for (const moduleName of exactModuleNames) {
    assert.ok(workflow.includes(`ref: \${{ steps.source-manifest.outputs.${moduleName.toLowerCase()} }}`), `${moduleName} checkout must use the validated immutable manifest output`);
  }
  assert.match(workflow, /path: module-sources\/m8\n\s+fetch-depth: 0/);
  assert.match(workflow, /path: module-sources\/m8-candidate\n\s+fetch-depth: 0/);
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
});

test('mock GitHub commit lookup uses the supported gh api full repository endpoint', () => {
  assert.equal(
    ghApiInvocation,
    `gh api --jq '{sha: .sha, parents: [.parents[].sha]}' "repos/$GITHUB_REPOSITORY/git/commits/$MANUAL_SHA"`
  );
  assert.doesNotMatch(selectionStep, /gh api --repo/);
});

test('module PR M9 source deterministically selects first parent from the exact authenticated test-merge SHA', () => {
  const baseSha = 'a'.repeat(40);
  const headSha = 'b'.repeat(40);
  const mergeSha = 'c'.repeat(40);
  const result = runMergeParentSelector({ sha: mergeSha, parents: [baseSha, headSha] });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.lines, [baseSha, mergeSha, baseSha, headSha]);
});

test('module PR selection rejects test-merge commits with anything other than two parents', () => {
  const mergeSha = 'c'.repeat(40);
  const oneParent = runMergeParentSelector({ sha: mergeSha, parents: ['a'.repeat(40)] });
  const extraParent = runMergeParentSelector({ sha: mergeSha, parents: ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)] });

  assert.notEqual(oneParent.status, 0);
  assert.match(oneParent.stderr, /exactly two parents/);
  assert.notEqual(extraParent.status, 0);
  assert.match(extraParent.stderr, /exactly two parents/);
});

test('module PR selection rejects a test-merge whose second parent is not the event head', () => {
  const result = runMergeParentSelector({ sha: 'c'.repeat(40), parents: ['a'.repeat(40), 'd'.repeat(40)] });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /second parent does not match/);
});

test('module PR selection rejects invalid SHAs and a non-feature base ref', () => {
  const mergeSha = 'c'.repeat(40);
  const invalidSha = runMergeParentSelector({ sha: mergeSha, parents: ['not-a-commit', 'b'.repeat(40)] });
  const wrongBase = runMergeParentSelector({ sha: mergeSha, parents: ['a'.repeat(40), 'b'.repeat(40)] }, {
    PR_BASE_REF: 'main',
  });

  assert.notEqual(invalidSha.status, 0);
  assert.match(invalidSha.stderr, /invalid parent SHA/);
  assert.notEqual(wrongBase.status, 0);
  assert.match(wrongBase.stderr, /not the registered feature integration base/);
});

test('module PR selection rejects an API commit response for a different test-merge SHA', () => {
  const result = runMergeParentSelector({ sha: 'd'.repeat(40), parents: ['a'.repeat(40), 'b'.repeat(40)] });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match the immutable test-merge SHA/);
});

test('M6 exact-current-head acceptance is a final fail-closed gate after all composition assertions', () => {
  const compositionIndex = workflow.indexOf('name: Run exact-source M1/M2/M3/M4/M5/M6/M7/M8 M9 composition regressions');
  const m6GateIndex = workflow.indexOf('name: Enforce exact M6 disposition for the current M8 lifecycle candidate');
  assert.ok(compositionIndex >= 0 && m6GateIndex > compositionIndex, 'the exact M6 review gate runs after source composition assertions');
  const m6Gate = workflow.slice(m6GateIndex, workflow.indexOf('name: Record evidence limits', m6GateIndex));
  assert.match(m6Gate, /if: always\(\)/);
  assert.match(m6Gate, /M6_M8_CURRENT_LIFECYCLE_REVIEW_STATUS" != 'ACCEPT'/);
  assert.match(m6Gate, /M6_M8_CURRENT_LIFECYCLE_REVIEWED_SHA" != "\$M8_CANDIDATE_SHA"/);
  assert.match(m6Gate, /M6_M8_CURRENT_LIFECYCLE_REVIEW_COMMENT/);
  assert.match(m6Gate, /security-lab\/e4\/verify-bundle\.test\.mjs/);
  assert.match(m6Gate, /M6_M8_CURRENT_LIFECYCLE_REVIEW_VERIFIER_BLOB/);
});
