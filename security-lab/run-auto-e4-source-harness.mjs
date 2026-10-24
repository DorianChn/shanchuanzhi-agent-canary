import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Exercises the packaged Auto E4 worker with a temporary payload built from this
// checkout. It is deliberately not represented as installer, VM, or E4 evidence.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
const runRoot = path.join(repo, 'security-lab', `auto-e4-source-harness-${id}`);
const payload = path.join(runRoot, 'payload');
const app = path.join(payload, 'app');
const data = path.join(runRoot, 'app-data');
fs.mkdirSync(app, { recursive: true });
fs.mkdirSync(data, { recursive: false });
const copy = (source, destination) => fs.copyFileSync(path.join(repo, source), path.join(payload, destination));
function copyTree(source, destination) {
  const info = fs.lstatSync(source);
  if (info.isSymbolicLink()) throw Error('SOURCE_HARNESS_SYMLINK_REJECTED');
  if (info.isDirectory()) {
    fs.mkdirSync(destination, { recursive: false });
    for (const name of fs.readdirSync(source)) copyTree(path.join(source, name), path.join(destination, name));
    return;
  }
  if (!info.isFile()) throw Error('SOURCE_HARNESS_SPECIAL_FILE_REJECTED');
  fs.copyFileSync(source, destination);
}
for (const name of ['worker.mjs', 'verification.mjs', 'auto-e4.mjs', 'e4-hook-faults.mjs']) {
  copy(`packaging/windows/${name}`, name);
}
copy('security-lab/claude-native-hook.mjs', 'claude-native-hook.mjs');
copyTree(path.join(repo, 'dist'), path.join(app, 'dist'));
fs.copyFileSync(path.join(repo, 'package.json'), path.join(app, 'package.json'));
fs.writeFileSync(path.join(payload, 'VERSION.json'), JSON.stringify({
  desktopVersion: 'LOCAL_SOURCE_HARNESS',
  communityVersion: '1.2.7-source-worktree',
  candidateId: 'local-source-harness',
  runtimeBaselineSHA: '99660b36db9d5b1121eea6fe06b026c5f1e36bcf',
  signature: 'NOT_APPLICABLE_SOURCE_HARNESS'
}, null, 2) + '\n', { flag: 'wx' });

const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const entries = [];
function walk(dir, prefix = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, item.name);
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw Error(`SOURCE_HARNESS_SYMLINK_REJECTED:${relative}`);
    if (item.isDirectory()) walk(absolute, relative);
    else if (item.isFile()) entries.push({ path: relative, size: fs.statSync(absolute).size, sha256: hash(absolute) });
    else throw Error(`SOURCE_HARNESS_SPECIAL_FILE_REJECTED:${relative}`);
  }
}
walk(payload);
const manifestFile = path.join(payload, 'PAYLOAD_MANIFEST.json');
fs.writeFileSync(manifestFile, JSON.stringify({ schemaVersion: 1, files: entries }, null, 2) + '\n', { flag: 'wx' });
const anchor = hash(manifestFile);
const wslRepo = repo
  .replace(/^([A-Za-z]):[\\/]/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
  .replaceAll('\\', '/');
const git = process.platform === 'win32'
  ? spawnSync('wsl.exe', ['--exec', 'git', '-C', wslRepo, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true })
  : spawnSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
const child = spawnSync(process.execPath, [path.join(payload, 'worker.mjs'), 'auto-e4', data, 'author', anchor], {
  cwd: payload,
  encoding: 'utf8',
  windowsHide: true,
  timeout: 600_000,
  maxBuffer: 12 * 1024 * 1024,
  env: {
    SystemRoot: process.env.SystemRoot ?? 'C:/Windows',
    WINDIR: process.env.WINDIR ?? 'C:/Windows',
    ProgramFiles: process.env.ProgramFiles ?? 'C:/Program Files',
    'ProgramFiles(x86)': process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)',
    LOCALAPPDATA: process.env.LOCALAPPDATA ?? '',
    PATH: `${path.dirname(process.execPath)};${process.env.SystemRoot ?? 'C:/Windows'}/System32`
  }
});
const lines = (child.stdout ?? '').trim().split(/\r?\n/).filter(Boolean);
let result;
for (const line of lines) {
  try { const item = JSON.parse(line); if (item.type === 'result') result = item; } catch {}
}
const scrub = value => {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)]));
  if (typeof value !== 'string') return value;
  return [runRoot, repo, runRoot.replaceAll('\\', '/'), repo.replaceAll('\\', '/'), os.homedir()].filter(Boolean).sort((a, b) => b.length - a.length).reduce((text, from) => text.split(from).join(from === os.homedir() ? '<USER_HOME>' : from === repo || from === repo.replaceAll('\\', '/') ? '<REPO>' : '<RUN_ROOT>'), value);
};
const invocation = {
  kind: 'LOCAL_SOURCE_HARNESS_NOT_INSTALLER_OR_E4',
  runId: id,
  gitSHA: git.status === 0 ? git.stdout.trim() : 'NOT_VERIFIED',
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  manifestSHA256: anchor,
  childExitCode: child.status,
  childError: child.error?.message ?? null,
  stdout: scrub(child.stdout ?? ''),
  stderr: scrub(child.stderr ?? ''),
  workerResult: result ? scrub(result) : null
};
const invocationFile = path.join(runRoot, 'invocation.json');
fs.writeFileSync(invocationFile, JSON.stringify(invocation, null, 2) + '\n', { flag: 'wx' });
const summary = {
  status: result?.status ?? 'FAIL',
  externalIndependence: result?.overallE4 ?? 'E4 EXTERNAL INDEPENDENCE NOT VERIFIED',
  reportFile: result?.reportFile ?? null,
  markdownFile: result?.markdownFile ?? null,
  evidenceBundle: result?.bundleFile ?? null,
  evidenceBundleSHA256: result?.bundleSHA256 ?? null,
  invocationFile,
  gitSHA: invocation.gitSHA,
  childExitCode: child.status,
  limitations: ['This invokes the packaged worker in a source-built payload.', 'No installer was installed.', 'No VM was started or modified.', 'No GPT-6/model API call was made.', 'No GitHub write or external submission occurred.', 'This is not an independent operator run and cannot establish E4.']
};
console.log(JSON.stringify(summary, null, 2));
if (!result || child.status !== 0 || result.status === 'FAIL') process.exitCode = 1;
