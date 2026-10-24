import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateExactSourceManifest, exactModuleNames } from '../scripts/validate-m9-exact-source-manifest.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/3.0/M9_EXACT_SOURCE_REFS.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/m9-cross-module-composition.yml'), 'utf8').replace(/\r\n/g, '\n');

test('the manifest pins exactly eight immutable module commits and a separate historical M8 checkout', () => {
  const validated = validateExactSourceManifest(manifest);
  assert.deepEqual(Object.keys(validated.modules).sort(), exactModuleNames);
  assert.equal(validated.modules.M2.pullRequest, 110);
  assert.equal(validated.modules.M2.sha, '941fd22d5e43e1de91a76b8c73006e57a4c15496');
  assert.equal(validated.modules.M6.pullRequest, 111);
  assert.equal(validated.modules.M6.sha, '2a88d8b7e099ce865c9900bb9313d4b8bdef8299');
  assert.equal(validated.modules.M8.pullRequest, 40);
  assert.equal(validated.modules.M8.sha, 'e3d89ba12f210a10f1f4942e60019517d25cfb60');
  assert.notEqual(validated.historical.sha, validated.modules.M8.sha);
  assert.equal(validated.review.status, 'ACCEPT');
  assert.equal(validated.review.targetSha, validated.modules.M8.sha);
  assert.equal(validated.review.reviewedSha, validated.modules.M8.sha);
  assert.equal(validated.review.commentId, '6386655050');
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

test('M6 follow-up PR #111 uses its exact source and rejects historical PR #100', () => {
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
  assert.match(workflow, /\$PR_HEAD_REF" == 'feature\/ac3-m9-integration'/);
  assert.match(workflow, /m9_source_sha="\$PR_HEAD_SHA"/);
  assert.match(workflow, /m9_source_sha="\$PR_BASE_SHA"/);
  assert.match(workflow, /m9_source_sha="\$MANUAL_SHA"/);
  assert.doesNotMatch(workflow, /refs\/pull\/[0-9]+\/head/);
  assert.match(workflow, /ref: \$\{\{ steps\.m9-ref\.outputs\.sha \}\}/);
  for (const moduleName of exactModuleNames) {
    assert.ok(workflow.includes(`ref: \${{ steps.source-manifest.outputs.${moduleName.toLowerCase()} }}`), `${moduleName} checkout must use the validated immutable manifest output`);
  }
  assert.match(workflow, /path: module-sources\/m8\n\s+fetch-depth: 0/);
  assert.match(workflow, /path: module-sources\/m8-candidate\n\s+fetch-depth: 0/);
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
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
