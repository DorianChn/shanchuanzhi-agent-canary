import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(readFileSync(path.join(root, 'scripts/ac3-ownership.json'), 'utf8'));

function marker(body, name) {
  for (const line of String(body ?? '').split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index < 0) continue;
    if (line.slice(0, index).trim().toLowerCase() === name.toLowerCase()) {
      return line.slice(index + 1).trim();
    }
  }
  return '';
}

function clean(value) {
  return String(value ?? '').replace(/[\r\n|]/g, ' ').replaceAll(String.fromCharCode(96), '').trim();
}

function hasEvidence(body) {
  const value = marker(body, 'Test-Evidence');
  return Boolean(value) && !/^(todo|tbd|<.*>)$/i.test(value);
}

function latestChecks(checks = []) {
  const latest = new Map();
  for (const check of checks) {
    const app = check.app?.id ?? check.app?.slug ?? 'unknown';
    const key = String(app) + ':' + String(check.name ?? 'unnamed');
    const previous = latest.get(key);
    if (!previous || Number(check.id ?? 0) >= Number(previous.id ?? 0)) latest.set(key, check);
  }
  return [...latest.values()];
}

function checkStats(checks = []) {
  const stats = { success: 0, pending: 0, skipped: 0, failed: 0 };
  for (const check of latestChecks(checks)) {
    if (check.status !== 'completed') stats.pending++;
    else if (check.conclusion === 'success') stats.success++;
    else if (check.conclusion === 'skipped' || check.conclusion === 'neutral') stats.skipped++;
    else stats.failed++;
  }
  return stats;
}

function checkProblems(checks = []) {
  const items = latestChecks(checks).filter((check) =>
    check.status !== 'completed' || !['success', 'skipped', 'neutral'].includes(check.conclusion)
  );
  return items.map((check) => clean(check.name ?? 'unnamed') + ' (' + clean(check.status === 'completed' ? check.conclusion : check.status) + ')').join(', ') || 'none';
}

export function summarizePrAudit(pulls, filesByPr, checksByPr, artifactsBySha, rules) {
  const registered = pulls.map((pr) => ({
    pr,
    module: rules.moduleBranches[pr.head?.ref] ?? null
  }));
  const lines = [
    '# AC3 open-PR coordination audit',
    '',
    'Read-only snapshot of open PRs targeting ' + clean(rules.targetBase) + '. Warnings are evidence for M0 triage; they do not claim a runtime vulnerability or automatically close/block another PR.',
    '',
    '| PR | Module | Head | State | Draft | Checks S/P/K/F | Pending/failing checks | Test evidence | API change | Artifacts |',
    '|---:|:---|:---|:---|:---:|:---:|:---|:---:|:---:|---:|'
  ];

  for (const { pr, module } of registered) {
    const stats = checkStats(checksByPr.get(pr.number) ?? []);
    const state = pr.state ?? 'open';
    const apiChange = marker(pr.body, 'API-Contract-Change');
    lines.push(
      '| #' + pr.number +
      ' | ' + clean(module ?? 'UNREGISTERED') +
      ' | ' + clean(pr.head?.sha ?? '').slice(0, 12) +
      ' | ' + clean(state) +
      ' | ' + (pr.draft ? 'yes' : 'no') +
      ' | ' + stats.success + '/' + stats.pending + '/' + stats.skipped + '/' + stats.failed +
      ' | ' + clean(checkProblems(checksByPr.get(pr.number) ?? [])) +
      ' | ' + (hasEvidence(pr.body) ? 'declared' : 'MISSING') +
      ' | ' + (apiChange ? clean(apiChange) : 'MISSING') +
      ' | ' + (artifactsBySha.get(pr.head?.sha) ?? 0) + ' |'
    );
  }

  const paths = new Map();
  for (const { pr, module } of registered) {
    for (const file of new Set(filesByPr.get(pr.number) ?? [])) {
      const entries = paths.get(file) ?? [];
      entries.push({ number: pr.number, module: module ?? 'UNREGISTERED' });
      paths.set(file, entries);
    }
  }

  const overlaps = [...paths.entries()]
    .filter(([, entries]) => entries.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));
  lines.push('', '## Cross-PR path and API overlaps', '');
  if (!overlaps.length) {
    lines.push('No same-path overlap was found among the listed open PRs.');
  } else {
    lines.push('| Path | PRs/modules | Classification |', '|:---|:---|:---|');
    for (const [file, entries] of overlaps.slice(0, 100)) {
      const ownerRule = rules.pathOwners?.[file];
      const owner = typeof ownerRule === 'string' ? ownerRule : ownerRule?.owner;
      const exception = typeof ownerRule === 'object' ? ownerRule.branchLocalException : '';
      const shared = rules.sharedPaths?.[file];
      const isPublicApi = (rules.publicApiCandidates ?? []).includes(file);
      const classification = [
        isPublicApi ? 'public API candidate' : '',
        owner ? 'owner ' + owner + (exception ? '; scoped exception: ' + exception : '') : '',
        shared ? 'registered shared path ' + shared.join('/') : ''
      ].filter(Boolean).join('; ') || 'UNCLASSIFIED overlap; owner review required';
      const refs = entries.map((entry) => '#' + entry.number + ' ' + entry.module).join(', ');
      lines.push('| ' + clean(file) + ' | ' + clean(refs) + ' | ' + clean(classification) + ' |');
    }
    if (overlaps.length > 100) lines.push('', 'Overlap table truncated at 100 paths; total overlaps: ' + overlaps.length + '.');
  }

  const unregistered = registered.filter((entry) => !entry.module);
  lines.push('', '## Unregistered PR branches', '');
  lines.push(unregistered.length
    ? unregistered.map(({ pr }) => '- PR #' + pr.number + ' uses branch ' + clean(pr.head?.ref)).join('\n')
    : 'No unregistered branch was found among open PRs targeting the AC3 base.');

  lines.push('', 'Check counts are GitHub check-runs for each exact PR head; S/P/K/F means success/pending/skipped-or-neutral/other completed conclusions. Artifacts count Actions artifacts whose workflow-run head SHA exactly matches that PR head. Test evidence is the PR-body declaration; it is not treated as a substitute for a passing check or product/installer/E4 evidence.');
  return lines.join('\n') + '\n';
}

function withPage(url, page) {
  const parsed = new URL(url);
  parsed.searchParams.set('per_page', '100');
  parsed.searchParams.set('page', String(page));
  return parsed.toString();
}

async function getPages(url, key, headers, fetchImpl) {
  const items = [];
  for (let page = 1; page <= 30; page++) {
    const response = await fetchImpl(withPage(url, page), { headers });
    if (!response.ok) throw new Error('GitHub API returned HTTP ' + response.status + ' for ' + new URL(url).pathname);
    const payload = await response.json();
    const batch = Array.isArray(payload) ? payload : payload[key];
    if (!Array.isArray(batch)) throw new Error('GitHub API response did not contain the expected list for ' + new URL(url).pathname);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
  throw new Error('GitHub API pagination exceeded 30 pages for ' + new URL(url).pathname);
}

export async function auditOpenPullRequests({ repository, baseRef, token, rules = policy, fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('GITHUB_REPOSITORY must be owner/name.');
  if (!baseRef || !token) throw new Error('AC3_BASE_REF and GITHUB_TOKEN are required.');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const api = 'https://api.github.com/repos/' + repository;
  const pulls = await getPages(api + '/pulls?state=open&base=' + encodeURIComponent(baseRef), null, headers, fetchImpl);
  const branchPulls = pulls.filter((pr) => pr.base?.ref === baseRef);
  const filesByPr = new Map();
  const checksByPr = new Map();
  for (const pr of branchPulls) {
    filesByPr.set(pr.number, (await getPages(api + '/pulls/' + pr.number + '/files', null, headers, fetchImpl)).map((file) => file.filename));
    const checks = await getPages(api + '/commits/' + pr.head.sha + '/check-runs', 'check_runs', headers, fetchImpl);
    checksByPr.set(pr.number, checks);
  }
  const artifacts = await getPages(api + '/actions/artifacts', 'artifacts', headers, fetchImpl);
  const artifactsBySha = new Map();
  for (const artifact of artifacts) {
    const sha = artifact.workflow_run?.head_sha;
    if (!sha) continue;
    artifactsBySha.set(sha, (artifactsBySha.get(sha) ?? 0) + 1);
  }
  return summarizePrAudit(branchPulls, filesByPr, checksByPr, artifactsBySha, rules);
}

async function main() {
  const report = await auditOpenPullRequests({
    repository: process.env.GITHUB_REPOSITORY,
    baseRef: process.env.AC3_BASE_REF,
    token: process.env.GITHUB_TOKEN
  });
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('AC3 open-PR audit failed: ' + error.message);
    process.exitCode = 1;
  });
}
