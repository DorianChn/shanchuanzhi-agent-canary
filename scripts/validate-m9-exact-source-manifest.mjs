import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const exactModuleNames = Object.freeze(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']);

const isSha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const fail = (message) => { throw new Error(message); };

export function validateExactSourceManifest(manifest, event = {}) {
  if (manifest?.schemaVersion !== 1) fail('Unsupported M9 exact-source manifest schema.');
  if (manifest.repository !== 'DorianChn/shanchuanzhi-agent-canary') fail('Manifest repository mismatch.');
  if (manifest.targetBaseRef !== 'feature/agent-canary-3.0') fail('Manifest target base ref mismatch.');
  if (event.m9Sha !== undefined && !isSha(event.m9Sha)) fail('M9 source must be an immutable 40-character SHA.');
  if (event.m9Sha !== undefined && event.expectedM9Sha !== event.m9Sha) {
    fail(`M9 checkout SHA mismatch: expected ${event.expectedM9Sha}, got ${event.m9Sha}`);
  }

  const modules = manifest.modules;
  if (!modules || Object.keys(modules).sort().join(',') !== exactModuleNames.join(',')) {
    fail('Manifest must pin exactly M1 through M8.');
  }
  for (const moduleName of exactModuleNames) {
    const source = modules[moduleName];
    if (!Number.isInteger(source?.pullRequest) || source.pullRequest < 1 ||
        !/^feature\/ac3-[a-z0-9-]+$/.test(source?.branchRef ?? '') || !isSha(source?.sha)) {
      fail(`${moduleName} must name a PR, stable feature/ac3 branch, and immutable 40-character SHA.`);
    }
  }
  if (new Set(exactModuleNames.map((name) => modules[name].branchRef)).size !== exactModuleNames.length) {
    fail('Each module must use a unique stable branchRef.');
  }

  if (event.eventName === 'pull_request') {
    if (event.pullRequestBaseRef !== manifest.targetBaseRef) fail('Pull request base differs from the manifest target base.');
    const prNumber = Number(event.pullRequestNumber || 0);
    const moduleName = exactModuleNames.find((name) =>
      modules[name].pullRequest === prNumber || modules[name].branchRef === event.pullRequestHeadRef);
    if (moduleName) {
      const source = modules[moduleName];
      if (prNumber !== source.pullRequest || event.pullRequestHeadRef !== source.branchRef || event.pullRequestHeadSha !== source.sha) {
        fail(`Module PR #${prNumber} (${event.pullRequestHeadRef}) head ${event.pullRequestHeadSha} differs from the exact M9 manifest ref for ${moduleName} (PR #${source.pullRequest}, ${source.branchRef}, ${source.sha}). Update the manifest and required owner review before composition can pass.`);
      }
    }
  }

  const historical = manifest.historicalSources?.M8_M6_SCOPED_REGRESSION;
  if (!isSha(historical?.sha) || historical.sha === modules.M8.sha || typeof historical.reason !== 'string' || !historical.reason.trim()) {
    fail('Historical M8 scoped regression must use a distinct exact source SHA and state its purpose.');
  }

  const review = manifest.reviewDispositions?.M6_M8_CURRENT_LIFECYCLE;
  if (!review || review.targetSha !== modules.M8.sha || review.issue !== 80 ||
      !isSha(review.candidateLifecycleBlobSha) ||
      !isSha(review.m6VerifierTestBlobSha) ||
      !['NOT_VERIFIED', 'ACCEPT', 'ACCEPT_WITH_CONDITIONS', 'REJECT'].includes(review.status)) {
    fail('M6 current M8 lifecycle disposition must identify the exact candidate, Issue #80, both reviewed test fingerprints, and a recognized status.');
  }
  if (review.status === 'NOT_VERIFIED' && (review.reviewedSha !== null || review.commentId !== null)) {
    fail('NOT_VERIFIED cannot carry an implied exact-head review or comment.');
  }
  if (['ACCEPT', 'ACCEPT_WITH_CONDITIONS', 'REJECT'].includes(review.status) &&
      (review.reviewedSha !== review.targetSha || !/^[0-9]+$/.test(String(review.commentId ?? '')))) {
    fail('A recorded M6 disposition must cite the exact current M8 SHA and a numeric comment ID.');
  }

  return { modules, historical, review };
}

function main() {
  const manifestPath = process.argv[2] ?? path.resolve('docs/3.0/M9_EXACT_SOURCE_REFS.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const m9Sha = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim();
  const validated = validateExactSourceManifest(manifest, {
    eventName: process.env.EVENT_NAME,
    pullRequestHeadRef: process.env.PR_HEAD_REF,
    pullRequestHeadSha: process.env.PR_HEAD_SHA,
    pullRequestNumber: process.env.PR_NUMBER,
    pullRequestBaseRef: process.env.PR_BASE_REF,
    m9Sha,
    expectedM9Sha: process.env.EXPECTED_M9_SHA,
  });
  const output = [
    ...exactModuleNames.map((name) => `${name.toLowerCase()}=${validated.modules[name].sha}`),
    `m8_history=${validated.historical.sha}`,
    `m6_review_status=${validated.review.status}`,
    `m6_review_target_sha=${validated.review.targetSha}`,
    `m6_reviewed_sha=${validated.review.reviewedSha ?? ''}`,
    `m6_review_comment_id=${validated.review.commentId ?? ''}`,
    `m6_review_issue=${validated.review.issue}`,
    `m6_review_test_blob=${validated.review.candidateLifecycleBlobSha}`,
    `m6_review_verifier_test_blob=${validated.review.m6VerifierTestBlobSha}`,
  ].join('\n') + '\n';
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log(`M9=${m9Sha}; M1-M8 exact source manifest validated from ${manifestPath}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
