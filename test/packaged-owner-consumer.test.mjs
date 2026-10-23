import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, test } from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const roots = {
  M1: process.env.M1_ROOT,
  M2: process.env.M2_PACKED_ROOT || process.env.M2_ROOT,
  M3: process.env.M3_ROOT || path.resolve(here, '..'),
  M5: process.env.M5_ROOT,
};
const missingRoots = ['M1', 'M2', 'M5'].filter((name) => !roots[name]);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'm3-packaged-owner-consumer-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

function readPackage(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function publicTarget(manifest, name) {
  const entry = manifest.exports?.[name];
  if (typeof entry === 'string') return entry;
  return entry?.import ?? entry?.default;
}

function copyOwnerFile(ownerRoot, target, destinationRoot) {
  assert.equal(typeof target, 'string', `owner export target is required: ${target}`);
  const source = path.resolve(ownerRoot, target);
  const destination = path.resolve(destinationRoot, target);
  assert.ok(source.startsWith(path.resolve(ownerRoot) + path.sep), `owner export must stay within its package: ${target}`);
  assert.ok(fs.statSync(source).isFile(), `owner export file must exist: ${source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  assert.equal(hashFile(source), hashFile(destination), `composed artifact must preserve exact owner bytes: ${target}`);
}

function hashFile(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function prepareSyntheticComposedPackage(label, exports) {
  const m1 = readPackage(roots.M1);
  const m2 = readPackage(roots.M2);
  const m3 = readPackage(roots.M3);
  const m5 = readPackage(roots.M5);
  const packageRoot = path.join(scratch, label, 'package');
  fs.mkdirSync(packageRoot, { recursive: true });

  for (const [name, owner] of [['M1', m1], ['M2', m2], ['M5', m5]]) {
    assert.deepEqual(m3.exports?.['./sdk'], owner.exports?.['./sdk'], `M3 must retain the exact ${name} public SDK entry`);
  }
  fs.cpSync(path.join(roots.M3, 'dist'), path.join(packageRoot, 'dist'), { recursive: true });

  // This is deliberately a synthetic composition fixture, not the M3 branch's
  // package or a release candidate. Each copied runtime file comes byte-for-byte
  // from that module's exact checkout so the test can exercise cross-owner code.
  const m1Files = ['dist/sdk.js', 'dist/sdk.d.ts', 'dist/containment.js', 'dist/containment.d.ts', 'dist/file-state-store.js', 'dist/file-state-store.d.ts', 'dist/runtime/gateway.js', 'dist/runtime/gateway.d.ts'];
  for (const file of m1Files) copyOwnerFile(roots.M1, `./${file}`, packageRoot);

  const m5Files = ['dist/policy-management.js', 'dist/policy-management.d.ts', 'dist/policy-router.js', 'dist/policy-router.d.ts', 'dist/security-router.js', 'dist/security-router.d.ts', 'dist/risk-policy.js', 'dist/risk-policy.d.ts'];
  for (const file of m5Files) copyOwnerFile(roots.M5, `./${file}`, packageRoot);

  const m2Target = publicTarget(m2, './gateway-adapter');
  copyOwnerFile(roots.M2, m2Target, packageRoot);

  const composedExports = {
    ...m3.exports,
    ...m1.exports,
    ...m2.exports,
    ...m5.exports,
  };
  if (!exports.m2) delete composedExports['./gateway-adapter'];
  if (!exports.m5) delete composedExports['./policy-router'];
  const manifest = {
    ...m3,
    exports: composedExports,
    files: [...new Set([...(m3.files ?? []), ...(m1.files ?? []), ...(m2.files ?? []), ...(m5.files ?? [])].map((file) => file.replace(/^\.\//, '')))],
  };
  fs.writeFileSync(path.join(packageRoot, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const file of ['README.md', 'README.zh-CN.md', 'LICENSE']) {
    const source = path.join(roots.M3, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(packageRoot, file));
  }
  return { packageRoot, manifest, m2Target };
}

function packAndExtract(packageRoot, label) {
  const packDirectory = path.join(scratch, label, 'pack');
  const consumerRoot = path.join(scratch, label, 'consumer');
  const installedRoot = path.join(consumerRoot, 'node_modules', '@dorianchn', 'agent-canary');
  fs.mkdirSync(packDirectory, { recursive: true });
  fs.mkdirSync(installedRoot, { recursive: true });
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const packed = spawnSync(npmCommand, ['pack', '--json', '--pack-destination', packDirectory], {
    cwd: packageRoot,
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  assert.equal(packed.error, undefined, `npm pack must start: ${packed.error?.message ?? ''}`);
  assert.equal(packed.status, 0, `npm pack must succeed: ${packed.stderr}`);
  const filename = JSON.parse(packed.stdout)[0]?.filename;
  assert.ok(filename, 'npm pack must report its tarball filename');
  const archive = path.join(packDirectory, filename);
  const extracted = spawnSync('tar', ['-xzf', archive, '-C', installedRoot, '--strip-components=1'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(extracted.error, undefined, `tar extraction must start: ${extracted.error?.message ?? ''}`);
  assert.equal(extracted.status, 0, `npm tarball must extract: ${extracted.stderr}`);
  fs.symlinkSync(path.join(roots.M3, 'node_modules'), path.join(installedRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  return { consumerRoot, installedRoot };
}

async function startCli(installedRoot, tempRoot, operatorCode, t) {
  const child = spawn(process.execPath, [path.join(installedRoot, 'dist', 'index.js'), 'ai', 'console', '--port', '0'], {
    cwd: installedRoot,
    env: {
      ...process.env,
      AGENT_CANARY_OPERATOR_CODE: operatorCode,
      TEMP: tempRoot,
      TMP: tempRoot,
      TMPDIR: tempRoot,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    if (child.exitCode === null && child.signalCode === null) await new Promise((resolve) => child.once('exit', resolve));
  });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const match = output.match(/Agent Canary 中文控制台: (http:\/\/127\.0\.0\.1:\d+)/);
    if (match) return { child, url: match[1], get output() { return output; } };
    if (child.exitCode !== null || child.signalCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(`packaged M3 CLI did not start; output: ${output}`);
}

async function protectedRead(url, operatorCode) {
  const page = await fetch(url);
  assert.equal(page.status, 200);
  const csrf = (await page.text()).match(/const csrf='([a-f0-9]+)'/)?.[1];
  assert.ok(csrf, 'the packaged console must provide its CSRF token');
  return fetch(`${url}/api/security-center/protected-read`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-canary-csrf': csrf,
      'x-canary-operator-code': operatorCode,
    },
    body: '{}',
  });
}

test('synthetic composition fixture: packed M3 CLI consumes exact M1, M2, and M5 owner exports', {
  skip: missingRoots.length ? `requires exact owner checkouts: ${missingRoots.join(', ')}` : false,
}, async (t) => {
  const exact = prepareSyntheticComposedPackage('exact', { m1: true, m2: true, m5: true });
  const packed = packAndExtract(exact.packageRoot, 'exact');
  const packageRequire = createRequire(path.join(packed.installedRoot, 'package.json'));
  const publicEntries = {
    './sdk': packageRequire.resolve('@dorianchn/agent-canary/sdk'),
    './gateway-adapter': packageRequire.resolve('@dorianchn/agent-canary/gateway-adapter'),
    './policy-router': packageRequire.resolve('@dorianchn/agent-canary/policy-router'),
  };
  const m1Target = publicTarget(readPackage(roots.M1), './sdk');
  const m5Target = publicTarget(readPackage(roots.M5), './policy-router');
  assert.equal(path.resolve(publicEntries['./sdk']), path.resolve(packed.installedRoot, 'dist/sdk.js'));
  assert.equal(path.resolve(publicEntries['./gateway-adapter']), path.resolve(packed.installedRoot, exact.m2Target));
  assert.equal(path.resolve(publicEntries['./policy-router']), path.resolve(packed.installedRoot, 'dist/policy-router.js'));
  assert.equal(hashFile(publicEntries['./sdk']), hashFile(path.resolve(roots.M1, m1Target)), 'the tarball SDK export must retain exact M1 owner bytes');
  assert.equal(hashFile(publicEntries['./gateway-adapter']), hashFile(path.resolve(roots.M2, exact.m2Target)), 'the tarball adapter export must retain exact M2 owner bytes');
  assert.equal(hashFile(publicEntries['./policy-router']), hashFile(path.resolve(roots.M5, m5Target)), 'the tarball policy export must retain exact M5 owner bytes');
  assert.ok(exact.manifest.files.includes(exact.m2Target.replace(/^\.\//, '')), 'the composed M2 public export target must survive npm pack allowlisting');
  const [m1Sdk, m2Adapter, m5Router] = await Promise.all([
    import(pathToFileURL(publicEntries['./sdk']).href),
    import(pathToFileURL(publicEntries['./gateway-adapter']).href),
    import(pathToFileURL(publicEntries['./policy-router']).href),
  ]);
  assert.equal(typeof m1Sdk.createTrustedExecutionGateway, 'function');
  assert.equal(typeof m2Adapter.createSecurityGatewayHostAdapter, 'function');
  assert.equal(typeof m5Router.createSecurityToolRouter, 'function');

  const tempRoot = path.join(scratch, 'exact', 'runtime-temp');
  fs.mkdirSync(tempRoot, { recursive: true });
  const operatorCode = 'M3_PACKAGED_OWNER_FIXTURE';
  const running = await startCli(packed.installedRoot, tempRoot, operatorCode, t);
  const response = await protectedRead(running.url, operatorCode);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    scope: 'M3_FIXED_TEMP_PROBE_ONLY',
    status: 'ALLOW',
    reason: 'HELD_FILE_POSITIVE_CONTROL',
    markerMatched: true,
  });
  assert.equal(JSON.stringify(body).includes('AGENT_CANARY_CONSOLE_PROTECTED_READ_OK'), false, 'the packed CLI must return only its sanitized marker verdict');
  assert.deepEqual(fs.readdirSync(tempRoot).filter((name) => name.startsWith('agent-canary-console-probe-')), [], 'the fixed probe must be cleaned after the packaged owner chain completes');
});

test('synthetic composition fixture: M5 policy denial precedes the held-file read callback', {
  skip: missingRoots.length ? `requires exact owner checkouts: ${missingRoots.join(', ')}` : false,
}, async () => {
  const exact = prepareSyntheticComposedPackage('policy-denial', { m1: true, m2: true, m5: true });
  const packed = packAndExtract(exact.packageRoot, 'policy-denial');
  const packageRequire = createRequire(path.join(packed.installedRoot, 'package.json'));
  const [m1Sdk, m2Adapter, m5Router, consoleModule] = await Promise.all([
    import(pathToFileURL(packageRequire.resolve('@dorianchn/agent-canary/sdk')).href),
    import(pathToFileURL(packageRequire.resolve('@dorianchn/agent-canary/gateway-adapter')).href),
    import(pathToFileURL(packageRequire.resolve('@dorianchn/agent-canary/policy-router')).href),
    import(pathToFileURL(path.join(packed.installedRoot, 'dist', 'ai', 'console.js')).href),
  ]);
  assert.equal(typeof m1Sdk.createTrustedExecutionGateway, 'function');
  assert.equal(typeof m2Adapter.createSecurityGatewayHostAdapter, 'function');
  assert.equal(typeof m5Router.createSecurityToolRouter, 'function');
  assert.equal(typeof consoleModule.startAIConsole, 'function');

  let capabilityVerifications = 0;
  let m5Callbacks = 0;
  let heldFileReads = 0;
  let gatewayHandle;
  const operatorCode = 'M3_PACKAGED_POLICY_DENIAL_FIXTURE';
  const console = await consoleModule.startAIConsole({
    port: 0,
    operatorApprovalCode: operatorCode,
    securityCenterProtectedReadDependencies: async () => ({
      createGateway(options) {
        const gateway = m1Sdk.createTrustedExecutionGateway(options);
        gatewayHandle = {
          bindFileReadCapability: (...args) => gateway.bindFileReadCapability(...args),
          verifyFileReadCapability: (...args) => {
            capabilityVerifications += 1;
            const valid = gateway.verifyFileReadCapability(...args);
            // M2's preflight succeeds. The exact M5 router then sees a stale
            // M1 capability and must deny before the callback can read the file.
            return capabilityVerifications === 1 && valid;
          },
          readFileWithCapability: (...args) => {
            heldFileReads += 1;
            return gateway.readFileWithCapability(...args);
          },
          close: () => gateway.close(),
        };
        return gatewayHandle;
      },
      loadM2Facade: async () => m2Adapter,
      createSecurityToolRouter(options) {
        const executeRealTool = options.executeRealTool;
        return m5Router.createSecurityToolRouter({
          ...options,
          executeRealTool: (...args) => {
            m5Callbacks += 1;
            return Reflect.apply(executeRealTool, undefined, args);
          },
        });
      },
    }),
  });

  try {
    const page = await fetch(console.url);
    assert.equal(page.status, 200);
    const csrf = (await page.text()).match(/const csrf='([a-f0-9]+)'/)?.[1];
    assert.ok(csrf, 'the packed console must provide its CSRF token');
    const response = await fetch(`${console.url}/api/security-center/protected-read`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-canary-csrf': csrf,
        'x-canary-operator-code': operatorCode,
      },
      body: '{}',
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      scope: 'M3_FIXED_TEMP_PROBE_ONLY',
      status: 'DENY',
      reason: 'OWNER_POLICY_DENIED',
      markerMatched: false,
    });
    assert.equal(capabilityVerifications, 2, 'M2 preflight and the exact M5 policy router must each verify the M1 capability');
    assert.equal(m5Callbacks, 0, 'M5 policy denial must happen before its registered execution callback');
    assert.equal(heldFileReads, 0, 'the M1 held-file read must not run after M5 denies the stale capability');
    assert.ok(gatewayHandle, 'the denial fixture must construct the exact M1 Gateway');
    assert.deepEqual(fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('agent-canary-console-probe-')), [], 'the denied packaged probe must be cleaned without reading the held file');
  } finally {
    await console.close();
  }
});

for (const absentOwner of ['m2', 'm5']) {
  test(`synthetic composition fixture: M3 remains UNKNOWN without the M${absentOwner === 'm2' ? '2' : '5'} public export`, {
    skip: missingRoots.length ? `requires exact owner checkouts: ${missingRoots.join(', ')}` : false,
  }, async (t) => {
    const exports = { m1: true, m2: true, m5: true, [absentOwner]: false };
    const composed = prepareSyntheticComposedPackage(`without-${absentOwner}`, exports);
    const packed = packAndExtract(composed.packageRoot, `without-${absentOwner}`);
    const tempRoot = path.join(scratch, `without-${absentOwner}`, 'runtime-temp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const operatorCode = 'M3_PACKAGED_OWNER_FIXTURE';
    const running = await startCli(packed.installedRoot, tempRoot, operatorCode, t);
    const response = await protectedRead(running.url, operatorCode);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      scope: 'M3_FIXED_TEMP_PROBE_ONLY',
      status: 'UNKNOWN',
      reason: 'OWNER_ADAPTER_UNAVAILABLE',
      markerMatched: false,
    });
    assert.deepEqual(fs.readdirSync(tempRoot).filter((name) => name.startsWith('agent-canary-console-probe-')), [], 'missing owner exports must fail before the temporary probe is created');
  });
}

test('synthetic composition fixture: onboarding host denies a replaced path before policy dispatch', {
  skip: missingRoots.length ? `requires exact owner checkouts: ${missingRoots.join(', ')}` : false,
}, async () => {
  const exact = prepareSyntheticComposedPackage('onboarding-host', { m1: true, m2: true, m5: true });
  const packed = packAndExtract(exact.packageRoot, 'onboarding-host');
  const hostModule = await import(pathToFileURL(path.join(packed.installedRoot, 'dist', 'codex-connection-mcp.js')).href);
  const workspaceRoot = path.join(scratch, 'onboarding-host-workspace');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  const file = path.join(workspaceRoot, 'agent-canary-public.txt');
  const heldFile = path.join(workspaceRoot, 'agent-canary-public.held.txt');
  fs.writeFileSync(file, 'AGENT_CANARY_PROTECTED_FILE_READ_OK', { flag: 'wx', mode: 0o600 });
  const runtime = await hostModule.createConnectionCheckRuntime({ workspaceRoot });

  try {
    assert.equal(typeof runtime.gateway.bindFileReadCapability, 'function', 'the composed M1 public SDK must provide held-file capabilities');
    assert.equal(typeof runtime.gateway.verifyFileReadCapability, 'function');
    assert.equal(typeof runtime.gateway.readFileWithCapability, 'function');
    const positive = await hostModule.dispatchProtectedRead(runtime.protectedHost, { path: 'agent-canary-public.txt' });
    assert.deepEqual(positive, { status: 'ALLOW', reason: 'HELD_FILE_POSITIVE_CONTROL', markerMatched: true });
    assert.equal(runtime.protectedHost.m5Callbacks(), 1, 'the valid fixed read must pass through M5 exactly once');

    const callbacksBeforeAlias = runtime.protectedHost.m5Callbacks();
    await assert.rejects(
      runtime.protectedHost.dispatch({ name: 'protected_read', args: { path: './agent-canary-public.txt' } }),
      /M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED/,
      'M2 must reject a lexical alias before entering M5',
    );
    assert.equal(runtime.protectedHost.m5Callbacks(), callbacksBeforeAlias);

    fs.renameSync(file, heldFile);
    fs.writeFileSync(file, 'NOT_A_REAL_CREDENTIAL_REPLACEMENT', { flag: 'wx', mode: 0o600 });
    const replacementBytes = fs.readFileSync(file);
    const heldBytes = fs.readFileSync(heldFile);
    const callbacksBeforeReplacement = runtime.protectedHost.m5Callbacks();
    await assert.rejects(
      runtime.protectedHost.dispatch({ name: 'protected_read', args: { path: 'agent-canary-public.txt' } }),
      /M2_SECURITY_GATEWAY_CAPABILITY_INVALID/,
      'M2 must fail preflight after M1 detects a replaced held-file identity',
    );
    assert.equal(runtime.protectedHost.m5Callbacks(), callbacksBeforeReplacement, 'a replaced path must be denied before M5 callback dispatch');
    assert.equal(runtime.gateway.operator.pending().length, 0, 'neither denial creates an approval');
    assert.equal(fs.readFileSync(file).toString('hex'), replacementBytes.toString('hex'));
    assert.equal(fs.readFileSync(heldFile).toString('hex'), heldBytes.toString('hex'));
  } finally {
    await runtime.gateway.close();
  }
});

test('synthetic composition fixture: M2 refuses a sensitive symlink alias before M5 router creation', {
  skip: missingRoots.length ? `requires exact owner checkouts: ${missingRoots.join(', ')}` : false,
}, async () => {
  const exact = prepareSyntheticComposedPackage('sensitive-alias', { m1: true, m2: true, m5: true });
  const packed = packAndExtract(exact.packageRoot, 'sensitive-alias');
  const packageRequire = createRequire(path.join(packed.installedRoot, 'package.json'));
  const [m1Sdk, m2Adapter, m5Router] = await Promise.all([
    import(pathToFileURL(packageRequire.resolve('@dorianchn/agent-canary/sdk')).href),
    import(pathToFileURL(packageRequire.resolve('@dorianchn/agent-canary/gateway-adapter')).href),
    import(pathToFileURL(packageRequire.resolve('@dorianchn/agent-canary/policy-router')).href),
  ]);
  const root = path.join(scratch, 'sensitive-alias-workspace');
  const privateDirectory = path.join(root, 'private');
  const aliasDirectory = path.join(root, 'public');
  fs.mkdirSync(privateDirectory, { recursive: true });
  const secret = path.join(privateDirectory, 'credentials-private.json');
  const original = Buffer.from('SYNTHETIC_SENSITIVE_ALIAS_SENTINEL');
  fs.writeFileSync(secret, original, { flag: 'wx', mode: 0o600 });
  fs.symlinkSync(privateDirectory, aliasDirectory, process.platform === 'win32' ? 'junction' : 'dir');
  const guard = m1Sdk.createAgentGuard({ alert: false });
  const gateway = m1Sdk.createTrustedExecutionGateway({
    agentId: 'm3-packed-sensitive-alias',
    guard,
    workspaceRoot: root,
    files: [{ path: 'private/credentials-private.json', sensitive: true }],
    evidence: new m1Sdk.EvidenceRecorder(),
  });
  let routerCreations = 0;
  let callbacks = 0;

  try {
    assert.throws(() => m2Adapter.createSecurityGatewayHostAdapter({
      gateway,
      fixedFileReads: { read_private: ['public/credentials-private.json'] },
      createSecurityToolRouter: (options) => {
        routerCreations += 1;
        const executeRealTool = options.executeRealTool;
        return m5Router.createSecurityToolRouter({
          ...options,
          executeRealTool: (...args) => {
            callbacks += 1;
            return Reflect.apply(executeRealTool, undefined, args);
          },
        });
      },
      routerOptions: { guard, workspaceRoot: root, mode: 'OBSERVE', verifyRealPaths: true },
    }), /M2_SECURITY_GATEWAY_CAPABILITY_UNAVAILABLE/);
    assert.equal(routerCreations, 0, 'M1 must reject the alias at capability binding before M5 is constructed');
    assert.equal(callbacks, 0);
    assert.equal(gateway.operator.pending().length, 0);
    assert.equal(fs.readFileSync(secret).toString('hex'), original.toString('hex'));
  } finally {
    await gateway.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
