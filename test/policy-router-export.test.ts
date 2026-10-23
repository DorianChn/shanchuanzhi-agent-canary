import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('M5 policy-router subpath resolves the canonical router without replacing sdk', async () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.deepEqual(pkg.exports['./policy-router'], {
    types: './dist/policy-router.d.ts',
    import: './dist/policy-router.js',
    default: './dist/policy-router.js',
  });
  assert.deepEqual(pkg.exports['./sdk'], {
    types: './dist/sdk.d.ts',
    import: './dist/sdk.js',
    default: './dist/sdk.js',
  });

  const publicEntry = await import('@dorianchn/agent-canary/policy-router');
  const canonicalModule = await import('../dist/security-router.js');
  assert.equal(publicEntry.createSecurityToolRouter, canonicalModule.createSecurityToolRouter);
  assert.equal(typeof publicEntry.createSecurityToolRouter, 'function');

  const declaration = fs.readFileSync('dist/policy-router.d.ts', 'utf8');
  assert.match(declaration, /SecurityRouterOptions/);
  assert.match(declaration, /RiskPolicyExecutionContext/);
});
