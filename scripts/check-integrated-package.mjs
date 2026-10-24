import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.resolve(process.env.AC3_PACKAGE_ROOT || scriptRoot);
const owners = [
  { module: 'M1', root: process.env.M1_ROOT, subpath: './sdk', symbol: 'createTrustedExecutionGateway' },
  { module: 'M2', root: process.env.M2_ROOT, subpath: './gateway-adapter', symbol: 'createSecurityGatewayHostAdapter' },
  { module: 'M5', root: process.env.M5_ROOT, subpath: './policy-router', symbol: 'createSecurityToolRouter' },
];
const issues = [];
const checkedOwners = [];
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ac3-integrated-package-'));
let packageManifest;
let packedFileList = [];
let packedFilename;

function issue(message) {
  issues.push(message);
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    issue(`${label}: ${error.message}`);
    return undefined;
  }
}

function gitHead(root, label) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    issue(`${label}: exact Git HEAD unavailable`);
    return 'unavailable';
  }
}

function exportTargets(entry, label) {
  const targets = typeof entry === 'string'
    ? [entry]
    : entry && typeof entry === 'object'
      ? Object.values(entry).filter((value) => typeof value === 'string')
      : [];
  if (!targets.length) issue(`${label}: export has no string target`);
  for (const target of targets) {
    if (!target.startsWith('./') || target.split(/[\\/]/).includes('..')) {
      issue(`${label}: export target must stay inside the package (${target})`);
    }
  }
  return [...new Set(targets)].sort();
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function containedFile(root, target, label) {
  const rootPath = path.resolve(root);
  const file = path.resolve(rootPath, target.slice(2));
  if (file === rootPath || !file.startsWith(rootPath + path.sep)) {
    issue(`${label}: resolved target escapes the package (${target})`);
    return undefined;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    issue(`${label}: target file is missing (${target})`);
    return undefined;
  }
  return file;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    ...options,
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status}): ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout;
}

try {
  packageManifest = readJson(path.join(packageRoot, 'package.json'), 'integrated package manifest');
  if (!packageManifest) throw new Error('integrated package manifest is unreadable');

  const packageHead = gitHead(packageRoot, 'integrated package');
  const requiredTargets = [];
  for (const owner of owners) {
    if (!owner.root) {
      issue(`${owner.module}: set ${owner.module}_ROOT to its exact owner checkout`);
      continue;
    }
    const ownerRoot = path.resolve(owner.root);
    const ownerManifest = readJson(path.join(ownerRoot, 'package.json'), `${owner.module} owner manifest`);
    const ownerHead = gitHead(ownerRoot, `${owner.module} owner`);
    if (!ownerManifest) continue;
    const checkedOwner = { module: owner.module, head: ownerHead, subpath: owner.subpath, targets: [] };
    checkedOwners.push(checkedOwner);
    if (ownerManifest.name !== packageManifest.name) issue(`${owner.module}: package name differs from the integrated package`);
    if (ownerManifest.version !== packageManifest.version) issue(`${owner.module}: package version differs from the integrated package`);

    const ownerEntry = ownerManifest.exports?.[owner.subpath];
    const integratedEntry = packageManifest.exports?.[owner.subpath];
    if (ownerEntry === undefined) {
      issue(`${owner.module}: owner manifest does not declare ${owner.subpath}`);
      continue;
    }
    if (integratedEntry === undefined) {
      issue(`${owner.module}: integrated package does not export ${owner.subpath}`);
      continue;
    }
    try {
      assert.deepStrictEqual(integratedEntry, ownerEntry);
    } catch {
      issue(`${owner.module}: integrated ${owner.subpath} entry differs from the exact owner manifest`);
    }

    const ownerTargets = exportTargets(ownerEntry, `${owner.module} ${owner.subpath}`);
    checkedOwner.targets = ownerTargets;
    const integratedTargets = exportTargets(integratedEntry, `integrated ${owner.subpath}`);
    if (JSON.stringify(integratedTargets) !== JSON.stringify(ownerTargets)) {
      issue(`${owner.module}: integrated ${owner.subpath} target list differs from owner targets`);
    }
    for (const target of ownerTargets) {
      const ownerFile = containedFile(ownerRoot, target, `${owner.module} ${owner.subpath}`);
      const integratedFile = containedFile(packageRoot, target, `integrated ${owner.subpath}`);
      if (ownerFile && integratedFile && sha256(ownerFile) !== sha256(integratedFile)) {
        issue(`${owner.module}: integrated target bytes differ from the exact owner (${target})`);
      }
      requiredTargets.push({ module: owner.module, subpath: owner.subpath, target, symbol: owner.symbol });
    }
  }

  // Pack the actual integrated checkout unchanged. This gate never edits its
  // manifest, copies owner files, or creates a temporary merged package.
  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const packOutput = run(npm, ['pack', '--json', '--pack-destination', scratch], { cwd: packageRoot });
    const pack = JSON.parse(packOutput)[0];
    if (!pack?.filename || !Array.isArray(pack.files)) throw new Error('npm pack returned no archive or file manifest');
    packedFilename = pack.filename;
    packedFileList = pack.files.map((file) => file.path).sort();
    for (const { module, target } of requiredTargets) {
      if (!packedFileList.includes(target.slice(2))) issue(`${module}: actual npm pack omits exported target ${target}`);
    }
  } catch (error) {
    issue(`actual npm pack failed: ${error.message}`);
  }

  if (!issues.length && packedFilename) {
    const archive = path.join(scratch, packedFilename);
    const installDir = path.join(scratch, 'consumer');
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(path.join(installDir, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    try {
      run(npm, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', archive], { cwd: installDir });
      const consumerRequire = createRequire(path.join(installDir, 'package.json'));
      const installedRoot = path.join(installDir, 'node_modules', ...packageManifest.name.split('/'));
      if (!fs.existsSync(path.join(installedRoot, 'package.json'))) throw new Error('installed package directory was not found');
      const installedManifest = readJson(path.join(installedRoot, 'package.json'), 'installed package manifest');
      if (!installedManifest) throw new Error('installed package manifest is unreadable');
      assert.deepStrictEqual(installedManifest.exports, packageManifest.exports, 'tarball must preserve the actual integrated package export map');
      assert.equal(installedManifest.name, packageManifest.name, 'tarball must preserve the package identity');
      assert.equal(installedManifest.version, packageManifest.version, 'tarball must preserve the package version');

      for (const owner of owners) {
        const specifier = `${packageManifest.name}/${owner.subpath.slice(2)}`;
        const resolved = consumerRequire.resolve(specifier);
        const moduleValue = await import(pathToFileURL(resolved).href);
        if (typeof moduleValue[owner.symbol] !== 'function') issue(`${owner.module}: ${specifier} does not expose ${owner.symbol}`);
      }
      for (const { module, target } of requiredTargets) {
        const owner = owners.find((candidate) => candidate.module === module);
        const ownerPath = owner ? containedFile(path.resolve(owner.root), target, `${module} owner ${target}`) : undefined;
        const installedPath = containedFile(installedRoot, target, `installed ${module} ${target}`);
        if (ownerPath && installedPath && sha256(ownerPath) !== sha256(installedPath)) {
          issue(`${module}: packed target bytes differ from the exact owner (${target})`);
        }
      }
    } catch (error) {
      issue(`actual tarball consumer check failed: ${error.message}`);
    }
  }

  const report = {
    status: issues.length ? 'NOT_READY' : 'VERIFIED',
    package: packageManifest.name,
    version: packageManifest.version,
    packageRoot,
    packageHead,
    actualPackageExports: packageManifest.exports,
    ownerHeads: checkedOwners,
    packedFilename,
    packedFileCount: packedFileList.length,
    checkedSubpaths: owners.map(({ subpath }) => subpath),
    issues,
    scope: 'actual integrated checkout npm pack and installed public-export resolution; not host or operating-system security proof',
  };
  console.log(JSON.stringify(report, null, 2));
  if (issues.length) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({
    status: 'NOT_READY',
    packageRoot,
    packedFilename,
    issues: [...issues, error.message],
  }, null, 2));
  process.exitCode = 1;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
