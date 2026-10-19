import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizePrAudit } from '../scripts/ac3-pr-audit.mjs';

const base = 'feature/agent-canary-3.0';
const rules = {
  targetBase: base,
  moduleBranches: {
    'feature/ac3-security-core': 'M1',
    'feature/ac3-reliability-ac3': 'M7'
  },
  sharedPaths: {
    'src/runtime/gateway.ts': ['M1', 'M7']
  },
  pathOwners: {
    'test/agent-hook.test.ts': {
      owner: 'M1',
      branchLocalException: 'synthetic-canary-only'
    }
  },
  publicApiCandidates: ['src/runtime/gateway.ts']
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
    pr(39, 'feature/ac3-reliability-ac3', 'bbb222', 'Test-Evidence: CI run link\nAPI-Contract-Change: no')
  ];
  const files = new Map([
    [43, ['test/agent-hook.test.ts', 'src/runtime/gateway.ts', 'docs/shared.md']],
    [39, ['test/agent-hook.test.ts', 'src/runtime/gateway.ts', 'docs/shared.md']]
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
  assert.match(report, /owner M1; scoped exception: synthetic-canary-only/);
  assert.match(report, /public API candidate; registered shared path M1\/M7/);
  assert.match(report, /UNCLASSIFIED overlap/);
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
