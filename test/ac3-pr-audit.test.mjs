import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizePrAudit } from '../scripts/ac3-pr-audit.mjs';

const base = 'feature/agent-canary-3.0';
const rules = {
  targetBase: base,
  moduleBranches: {
    'feature/ac3-security-core': 'M1',
    'feature/ac3-reliability-ac3': 'M7',
    'feature/ac3-policy-audit': 'M5',
    'feature/ac3-m9-integration': 'M9',
    'feature/ac3-m0-coordination': 'M0'
  },
  sharedPaths: {
    'src/runtime/gateway.ts': ['M1', 'M7'],
    'test/security-router.test.ts': ['M1', 'M5']
  },
  pathOwners: {
    'src/runtime/gateway.ts': {
      owner: 'M1'
    },
    'test/security-router.test.ts': {
      owner: 'M1'
    },
    'test/agent-hook.test.ts': {
      owner: 'M1',
      branchLocalModules: ['M7'],
      branchLocalException: 'M7 synthetic-canary-only'
    }
  },
  publicApiCandidates: ['src/runtime/gateway.ts'],
  integrationModules: ['M9']
};

function pr(number, branch, sha, body) {
  return {
    number,
    state: 'open',
    draft: true,
    body,
    head: { ref: branch, sha },
    base: { ref: base }
  };
}

test('reports exact-head checks, evidence declarations, and known cross-PR overlaps', () => {
  const pulls = [
    pr(43, 'feature/ac3-security-core', 'aaa111', 'Test-Evidence: npm test\nAPI-Contract-Change: no'),
    pr(39, 'feature/ac3-reliability-ac3', 'bbb222', 'Test-Evidence: CI run link\nAPI-Contract-Change: no'),
    pr(47, 'feature/ac3-policy-audit', 'ddd444', 'Test-Evidence: focused test\nAPI-Contract-Change: no'),
    pr(36, 'feature/ac3-m9-integration', 'eee555', 'Test-Evidence: composition run\nAPI-Contract-Change: no'),
    pr(30, 'feature/ac3-m0-coordination', 'fff666', 'Test-Evidence: audit run\nAPI-Contract-Change: no')
  ];
  const files = new Map([
    [43, [
      { filename: 'test/agent-hook.test.ts', sha: 'hook-m1' },
      { filename: 'src/runtime/gateway.ts', sha: 'gateway-same' },
      'docs/shared.md',
      { filename: 'test/security-router.test.ts', sha: 'router-m1' },
      { filename: 'src/overlay.ts', sha: 'overlay-same' }
    ]],
    [39, [
      { filename: 'test/agent-hook.test.ts', sha: 'hook-m7' },
      { filename: 'src/runtime/gateway.ts', sha: 'gateway-same' },
      'docs/shared.md'
    ]],
    [47, [
      { filename: 'test/security-router.test.ts', sha: 'router-m5' },
      { filename: 'docs/multi-owner.md', sha: 'multi-m5' }
    ]],
    [36, [
      { filename: 'src/overlay.ts', sha: 'overlay-same' },
      { filename: 'docs/multi-owner.md', sha: 'multi-m9' }
    ]],
    [30, [
      { filename: 'test/agent-hook.test.ts', sha: 'hook-m0' },
      { filename: 'docs/multi-owner.md', sha: 'multi-m0' }
    ]]
  ]);
  const checks = new Map([
    [43, [{ id: 1, name: 'CI', app: { id: 1 }, status: 'completed', conclusion: 'failure' }, { id: 2, name: 'CI', app: { id: 1 }, status: 'completed', conclusion: 'success' }, { id: 3, name: 'package-smoke', app: { id: 1 }, status: 'in_progress' }]],
    [39, [{ id: 4, name: 'CI', app: { id: 1 }, status: 'completed', conclusion: 'failure' }]]
  ]);
  const report = summarizePrAudit(pulls, files, checks, new Map([['aaa111', 1]]), rules);
  assert.match(report, /#43/);
  assert.match(report, /1\/1\/0\/0/);
  assert.match(report, /package-smoke \(in_progress\)/);
  assert.match(report, /CI \(failure\)/);
  assert.match(report, /0\/0\/0\/1/);
  assert.match(report, /declared/);
  assert.match(report, /\| declared \| no \|/);
  assert.match(report, /test\/agent-hook\.test\.ts/);
  assert.match(report, /owner M1; scoped exception: M7 synthetic-canary-only/);
  assert.match(report, /non-owner edits require M1 review: M0/);
  assert.match(report, /public API candidate; owner M1; registered shared path M1\/M7; exact-head blobs identical/);
  const identicalOwnedPath = report.split('\n').find((line) => line.includes('src/runtime/gateway.ts'));
  assert.match(identicalOwnedPath, /exact-head blobs identical/);
  assert.doesNotMatch(identicalOwnedPath, /non-owner edits require M1 review/);
  assert.match(report, /registered shared path M1\/M5/);
  assert.match(report, /non-owner edits require M1 review: M5/);
  assert.match(report, /exact-head blob divergence \(2 distinct blobs\)/);
  assert.match(report, /M9 composition overlay; source ownership stays with module owner; verify exact source pin/);
  assert.match(report, /UNCLASSIFIED overlap/);
  const overlayOnly = report.split('\n').find((line) => line.includes('src/overlay.ts'));
  assert.match(overlayOnly, /M9 composition overlay/);
  assert.doesNotMatch(overlayOnly, /UNCLASSIFIED/);
  const mixedOverlay = report.split('\n').find((line) => line.includes('docs/multi-owner.md'));
  assert.match(mixedOverlay, /M9 composition overlay/);
  assert.match(mixedOverlay, /UNCLASSIFIED overlap; owner review required/);
});

test('marks missing test evidence and non-success completed checks without changing the PR', () => {
  const pulls = [pr(99, 'feature/unknown', 'ccc333', 'API-Contract-Change: no')];
  const report = summarizePrAudit(
    pulls,
    new Map([[99, ['docs/only.md']]]),
    new Map([[99, [{ id: 5, name: 'CI', app: { id: 1 }, status: 'completed', conclusion: 'cancelled' }]]]),
    new Map(),
    rules
  );
  assert.match(report, /UNREGISTERED/);
  assert.match(report, /0\/0\/0\/1/);
  assert.match(report, /MISSING/);
  assert.match(report, /Unregistered PR branches/);
});

test('lists skipped exact-head checks as non-success evidence without counting them as failures', () => {
  const pulls = [pr(109, 'feature/ac3-m0-coordination', 'ddd999', 'Test-Evidence: CI\nAPI-Contract-Change: no')];
  const report = summarizePrAudit(
    pulls,
    new Map([[109, []]]),
    new Map([[109, [{ id: 9, name: 'compose-current-module-refs', app: { id: 1 }, status: 'completed', conclusion: 'skipped' }]]]),
    new Map(),
    rules
  );
  assert.match(report, /0\/0\/1\/0/);
  assert.match(report, /compose-current-module-refs \(skipped\)/);
  assert.match(report, /Pending\/non-success checks/);
});

test('reports every overlapping file even when the PR set exceeds 100 paths', () => {
  const pulls = [
    pr(43, 'feature/ac3-security-core', 'aaa111', ''),
    pr(36, 'feature/ac3-m9-integration', 'eee555', '')
  ];
  const sharedFiles = Array.from({ length: 101 }, (_, i) => 'overlap/file-' + String(i).padStart(3, '0') + '.md');
  const report = summarizePrAudit(
    pulls,
    new Map([[43, sharedFiles], [36, sharedFiles]]),
    new Map(),
    new Map(),
    rules
  );
  assert.match(report, /overlap\/file-100\.md/);
  assert.doesNotMatch(report, /Overlap table truncated/);
});
