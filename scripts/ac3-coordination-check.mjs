import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeAc3Candidate } from './ac3-baseline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(readFileSync(path.join(root, 'scripts/ac3-ownership.json'), 'utf8'));
const eventPath = process.env.GITHUB_EVENT_PATH;
const baseSha = process.env.AC3_BASE_SHA;
const headSha = process.env.AC3_HEAD_SHA;
const headRef = process.env.AC3_HEAD_REF;
const event = eventPath ? JSON.parse(readFileSync(eventPath, 'utf8')) : {};
const pull = event.pull_request;
const errors = [];

if (!pull || !baseSha || !headSha || !headRef) {
  console.error('AC3 coordination check requires pull_request event and base/head metadata.');
  process.exit(2);
}
if (pull.base?.ref !== policy.targetBase) errors.push(`PR base must be ${policy.targetBase}.`);
if (pull.base?.sha !== baseSha) errors.push('AC3_BASE_SHA must match the pull_request event base SHA.');
if (pull.head?.sha !== headSha) errors.push('AC3_HEAD_SHA must match the pull_request event head SHA.');

const moduleId = policy.moduleBranches[headRef];
if (!moduleId) errors.push(`Branch ${headRef} is not registered in scripts/ac3-ownership.json.`);

const composition = composeAc3Candidate({
  baselineSha: policy.approvedCommonSourceBaseline,
  baseSha,
  headSha,
  cwd: root
});
errors.push(...composition.errors);

let changed = [];
try {
  changed = execFileSync('git', ['diff', '--name-only', '--no-renames', '--diff-filter=ACMRTD', `${baseSha}...${headSha}`], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean).map((name) => name.replaceAll('\\', '/'));
} catch {
  errors.push('Unable to compare PR base and head; verify both commits are available.');
}

const body = pull.body ?? '';
const marker = (name) => body.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'))?.[1]?.trim();
const evidence = marker('Test-Evidence');
if (!evidence || /^(todo|tbd|<.*>)$/i.test(evidence)) errors.push('PR body must provide a non-placeholder Test-Evidence command and report link/path (or reasoned N/A).');

const apiChange = marker('API-Contract-Change');
if (!apiChange || !/^(yes|no)$/i.test(apiChange)) errors.push('PR body must explicitly set API-Contract-Change: yes or no.');
const candidateChanged = changed.filter((name) => policy.publicApiCandidates.includes(name));
if (candidateChanged.length > 0 && !apiChange) errors.push(`Candidate public API files changed without an API-Contract-Change declaration: ${candidateChanged.join(', ')}`);
if (/^yes$/i.test(apiChange ?? '') && !changed.includes(policy.contractDocument)) {
  errors.push(`API-Contract-Change: yes requires ${policy.contractDocument} in this PR.`);
}

const coordinatedWith = marker('Coordinated-with') ?? '';
for (const name of changed) {
  const owners = policy.sharedPaths[name];
  if (!owners) continue;
  const missing = owners.filter((owner) => owner !== moduleId && !new RegExp(`\\b${owner}\\b`).test(coordinatedWith));
  if (missing.length > 0) errors.push(`${name} is shared by ${owners.join('/')} and requires Coordinated-with: ${missing.join(', ')}.`);
}

if (errors.length) {
  for (const error of errors) console.error(`::error::${error}`);
  process.exit(1);
}

console.log(`AC3 coordination checks passed for ${moduleId} (${headRef}); ${changed.length} changed paths checked.`);
console.log(`AC3 source composition: approved baseline ${policy.approvedCommonSourceBaseline}; current feature base ${baseSha}; PR head ${headSha}; merge-tree ${composition.tree}.`);
