import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonl, summarize, reportMarkdown, writeJson } from './run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const runsRoot = path.resolve(here, 'runs');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--run-dir') options.runDir = argv[++i];
    else if (arg.startsWith('--run-dir=')) options.runDir = arg.slice('--run-dir='.length);
    else if (arg === '--promptfoo-exit') options.promptfooExitCode = Number(argv[++i]);
    else if (arg.startsWith('--promptfoo-exit=')) options.promptfooExitCode = Number(arg.slice('--promptfoo-exit='.length));
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`ARGUMENT_UNKNOWN_${arg.split('=')[0]}`);
  }
  return options;
}

function safeFailureSummary(failures) {
  return failures.map(failure => ({
    caseId: failure.caseId ?? null,
    category: failure.category ?? null,
    model: failure.model ?? null,
    refusal: Boolean(failure.refusal),
    reason: /^API_(?:HTTP_\d{3}|NETWORK_ERROR|TIMEOUT)$/.test(String(failure.reason ?? failure.code ?? ''))
      ? String(failure.reason ?? failure.code)
      : 'GENERATION_OR_PARSE_FAILURE',
  }));
}

function finalize(runDir, promptfooExitCode) {
  const config = readJson(path.join(runDir, 'config.json'));
  const estimate = readJson(path.join(runDir, 'estimate.json'));
  const preregistration = readJson(path.join(runDir, 'preregistration.json'));
  const generationSummary = readJson(path.join(runDir, 'generation-summary.json'));
  const cases = readJson(path.join(runDir, 'cases.json'));
  const preflightDocument = readJson(path.join(runDir, 'preflight.json'));
  const judgeStatus = readJson(path.join(runDir, 'judge-status.json'));
  const promptfooDocument = readJson(path.join(runDir, 'promptfoo-results.json'));
  const trials = jsonl(path.join(runDir, 'agent-raw.jsonl'));
  const generationFailures = jsonl(path.join(runDir, 'generation-failures.jsonl'));
  const usageEvents = [
    ...jsonl(path.join(runDir, 'model-usage-parent.jsonl')),
    ...jsonl(path.join(runDir, 'model-usage.jsonl')),
  ];
  const promptfooRows = Array.isArray(promptfooDocument?.results?.results)
    ? promptfooDocument.results.results
    : Object.values(promptfooDocument?.results?.results ?? {});
  const promptfooStats = promptfooDocument?.results?.stats ?? {};
  const expectedTrials = preregistration.totalPlannedTrials;
  if (!Number.isInteger(expectedTrials) || trials.length !== expectedTrials || promptfooRows.length !== expectedTrials) {
    throw new Error(`INCOMPLETE_EVIDENCE_RAW_${trials.length}_PROMPTFOO_${promptfooRows.length}_EXPECTED_${expectedTrials}`);
  }

  const failures = generationFailures.length ? generationFailures : [];
  const gen = {
    cases: cases.filter(item => item.attack),
    attempted: generationSummary.attempted,
    rejected: generationSummary.refused,
    failures,
  };
  const configuredBudget = config.budgetUsd === 'unlimited' ? Number.POSITIVE_INFINITY : Number(config.budgetUsd);
  const meta = {
    defenderModels: (config.defenderModels ?? []).map(ref => ({ ref })),
    budgetUsd: configuredBudget,
    budgetRemainingBeforeRunUsd: config.budgetRemainingBeforeRunUsd,
    priorCommittedUsd: Number(config.priorCommittedUsd ?? 0),
    judgeStatus,
    git: preregistration.git,
    promptfooExitCode,
  };
  const plan = { ...estimate, caseCount: cases.length, arms: preregistration.arms.length };
  const summary = summarize(
    trials, gen, usageEvents, plan, meta,
    preflightDocument.records ?? [], preflightDocument.failures ?? [], runDir,
  );
  summary.attackGeneration.failureCases = safeFailureSummary(failures);
  summary.reproducibility = {
    sourceCommit: preregistration.git.commit,
    sourceBranch: preregistration.git.branch,
    trackedWorktreeDirtyAtRun: preregistration.git.trackedDirty,
    configurationFile: 'config.json',
    preregistrationFile: 'preregistration.json',
    rawTrialLog: 'agent-raw.jsonl',
    modelUsageLogs: ['model-usage-parent.jsonl', 'model-usage.jsonl'],
    promptfooResults: 'promptfoo-results.json',
  };

  const parentBudget = readJson(path.join(runDir, 'budget-parent-final.json'))
    ?? readJson(path.join(runDir, 'budget-parent-exit.json'));
  const childBudget = readJson(path.join(runDir, 'budget-final.json'));
  if (!parentBudget || !childBudget) throw new Error('BUDGET_SNAPSHOTS_MISSING');
  const parentCommittedUsd = Number(parentBudget.committedUsd ?? 0);
  const childCommittedUsd = Number(childBudget.committedUsd ?? 0);
  const runCommittedUsd = parentCommittedUsd + childCommittedUsd;
  const totalCapUsd = Number.isFinite(configuredBudget) ? configuredBudget : 'unlimited';
  const remainingUsd = Number.isFinite(configuredBudget)
    ? Math.max(0, configuredBudget - meta.priorCommittedUsd - runCommittedUsd)
    : 'unlimited';
  const accounting = {
    finalized: true,
    basis: 'Provider-reported usage priced using the run configuration plus conservative reservations for failed requests; this is not the provider invoice.',
    totalCapUsd,
    priorCommittedUsd: meta.priorCommittedUsd,
    budgetRemainingBeforeRunUsd: config.budgetRemainingBeforeRunUsd,
    parentCommittedUsd,
    childCommittedUsd,
    runCommittedUsd,
    cumulativeCommittedUsd: meta.priorCommittedUsd + runCommittedUsd,
    remainingUsd,
  };
  summary.budget = { ...summary.budget, ...accounting };
  writeJson(path.join(runDir, 'promptfoo-exit.json'), {
    exitCode: promptfooExitCode,
    classification: promptfooExitCode === 100 ? 'COMPLETED_WITH_ASSERTION_FAILURES' : promptfooExitCode === 0 ? 'COMPLETED' : 'OTHER_NONZERO_EXIT',
    expectedTrials,
    promptfooResultCount: promptfooRows.length,
    rawTrialCount: trials.length,
    passed: Number.isSafeInteger(promptfooStats.successes) ? promptfooStats.successes : promptfooRows.filter(row => row.success === true).length,
    failed: Number.isSafeInteger(promptfooStats.failures) ? promptfooStats.failures : promptfooRows.filter(row => row.success === false && !row.error).length,
    errors: Number.isSafeInteger(promptfooStats.errors) ? promptfooStats.errors : promptfooRows.filter(row => row.failureReason === 2).length,
  });
  writeJson(path.join(runDir, 'budget-accounting.json'), accounting);
  writeJson(path.join(runDir, 'report.json'), summary);
  fs.writeFileSync(path.join(runDir, 'report.md'), reportMarkdown(summary, config), { encoding: 'utf8', mode: 0o600 });
  console.log(`FINALIZED ${path.basename(runDir)} ${trials.length}/${expectedTrials} promptfoo=${promptfooExitCode}`);
  console.log(`REPORT ${path.join(runDir, 'report.md')}`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log('Usage: node finalize-run.mjs --run-dir runs/<run-id> [--promptfoo-exit 0|100]');
} else {
  if (!options.runDir) throw new Error('RUN_DIR_REQUIRED');
  const runDir = path.resolve(options.runDir);
  if (!runDir.startsWith(runsRoot + path.sep) || !fs.statSync(runDir).isDirectory()) throw new Error('RUN_DIR_MUST_BE_INSIDE_CLOUD_REDTEAM_RUNS');
  const recordedExit = fs.existsSync(path.join(runDir, 'promptfoo-exit.json'))
    ? readJson(path.join(runDir, 'promptfoo-exit.json')).exitCode
    : undefined;
  const promptfooExitCode = options.promptfooExitCode ?? recordedExit;
  if (![0, 100].includes(promptfooExitCode)) throw new Error('PROMPTFOO_EXIT_CODE_REQUIRED_AS_0_OR_100');
  finalize(runDir, promptfooExitCode);
}
