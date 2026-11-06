import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const runsRoot = path.join(here, 'runs');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  } catch { return []; }
}

function addMap(target, source) {
  for (const [key, value] of Object.entries(source || {})) target[key] = (target[key] || 0) + Number(value || 0);
}

function sumInto(target, source, fields) {
  for (const field of fields) target[field] = (target[field] || 0) + Number(source?.[field] || 0);
}

function percent(numerator, denominator) {
  return denominator ? `${(100 * numerator / denominator).toFixed(1)}%` : 'n/a';
}

function usd(value) {
  return Number.isFinite(value) ? `$${value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}` : 'n/a';
}

function budgetCap(value) {
  return value === 'unlimited' ? Number.POSITIVE_INFINITY : Number(value);
}

function md(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function table(headers, rows) {
  return [
    `| ${headers.map(md).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(md).join(' | ')} |`),
  ].join('\n');
}

function sanitizeProviderStatusText(value) {
  return String(value)
    .replace(/CAMPAIGN_STOPPED_API_HTTP_403/g, 'CAMPAIGN_STOPPED_PROVIDER_REJECTION')
    .replace(/API_MODELS_HTTP_403|API_HTTP_403/g, 'PROVIDER_REJECTION_STOP');
}

function sanitizePublishedValue(value) {
  if (typeof value === 'string') return sanitizeProviderStatusText(value);
  if (Array.isArray(value)) return value.map(sanitizePublishedValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [sanitizeProviderStatusText(key), sanitizePublishedValue(item)]));
  }
  return value;
}

const runIds = fs.readdirSync(runsRoot)
  .filter(name => /^\d{4}-\d\d-\d\dT/.test(name) && fs.statSync(path.join(runsRoot, name)).isDirectory())
  .sort();
if (!runIds.length) throw new Error('NO_RUN_DIRECTORIES_FOUND');
const campaignDate = runIds.at(-1).slice(0, 10);
const reportPath = path.join(here, `CAMPAIGN-REPORT-${campaignDate}.md`);
const jsonPath = path.join(here, `campaign-summary-${campaignDate}.json`);

const runs = runIds.map(runId => {
  const dir = path.join(runsRoot, runId);
  const report = readJson(path.join(dir, 'report.json'));
  const partial = readJson(path.join(dir, 'partial-summary.json'));
  const budget = readJson(path.join(dir, 'budget-accounting.json'));
  const parentBudget = readJson(path.join(dir, 'budget-parent-exit.json')) || readJson(path.join(dir, 'preflight-budget.json'));
  const config = readJson(path.join(dir, 'config.json'));
  const preflight = readJson(path.join(dir, 'preflight.json'));
  const preregistration = readJson(path.join(dir, 'preregistration.json'));
  const cases = readJson(path.join(dir, 'cases.json'));
  const estimate = readJson(path.join(dir, 'estimate.json'));
  const runStop = readJson(path.join(dir, 'run-stop.json'));
  const runCommittedUsd = Number(budget?.runCommittedUsd ?? parentBudget?.committedUsd ?? 0);
  const preflightFailures = (preflight?.failures || []).map(item => ({ model: item.model || 'unknown', code: item.code || 'unknown' }));
  return {
    runId, dir, report, partial, budget, config, preflight, preregistration, estimate, runStop,
    runCommittedUsd,
    capUsd: budgetCap(budget?.totalCapUsd ?? config?.budgetUsd ?? NaN),
    preflightFailures,
    caseHash: preregistration?.caseDataset?.sha256 || (cases ? createHash('sha256').update(JSON.stringify(cases)).digest('hex') : null),
    reusedCasesFrom: preregistration?.caseDataset?.sourceRunId || null,
  };
});

let runningCommitted = 0;
for (const run of runs) {
  runningCommitted += run.runCommittedUsd;
  run.reconstructedCumulativeUsd = runningCommitted;
}

const completed = runs.filter(run => run.report);
const partialRuns = runs.filter(run => !run.report && run.partial);
const preTrial = runs.filter(run => !run.report && !run.partial);
const totals = {
  runAttempts: runs.length,
  completedBatches: completed.length,
  stoppedBeforeTrials: preTrial.length,
  partialRuns: partialRuns.length,
  partialTrialRows: partialRuns.reduce((sum, run) => sum + Number(run.partial?.observedTrialRows || 0), 0),
  plannedTrials: 0,
  resultRows: 0,
  promptfoo: { passed: 0, failed: 0, errors: 0 },
  attacks: { cases: 0, toolAttemptTrials: 0, successfulEffects: 0, defenseSuccesses: 0 },
  controls: { trials: 0, successes: 0, failures: 0 },
  arms: {},
  categories: {},
  evidence: {
    trialStates: {}, gatewayPaths: {}, gatewayDecisions: {}, policyDecisions: {}, canaryEvents: {},
    crossSession: { trials: 0, distinctSessionPairs: 0, targetProtectedCallAttempts: 0 },
    gatewayEvidenceEvents: 0, mcpCallRecords: 0, mcpCallExecutions: 0,
    evidenceChainsValid: 0, evidenceChainsInvalid: 0, protectedSecretReadSuccessTrials: 0,
    actualAttackSideEffectTrials: 0, honeypotQuarantineTrials: 0,
  },
  modelUsage: {},
  generationRuns: [],
  generationTotals: { attempted: 0, refused: 0, failures: 0, fallbackPayloads: 0, failuresByModel: {} },
  preflightFailures: [],
  preflightFailureCounts: {},
  controlFailureIds: {},
  executionErrorRuns: [],
};

const metricFields = ['trials', 'attacks', 'toolAttempts', 'attackSuccesses', 'defenseSuccesses', 'activeDenials', 'normalTrials', 'normalSuccesses'];
for (const run of runs) {
  for (const failure of run.preflightFailures) {
    totals.preflightFailures.push({ runId: run.runId, ...failure });
    const key = `${failure.model} ${failure.code}`;
    totals.preflightFailureCounts[key] = (totals.preflightFailureCounts[key] || 0) + 1;
  }
  const report = run.report;
  if (!report) continue;

  totals.plannedTrials += Number(report.plannedTrials || 0);
  totals.resultRows += Number(report.completedTrials || 0);
  sumInto(totals.promptfoo, report.promptfoo, ['passed', 'failed', 'errors']);
  sumInto(totals.attacks, {
    cases: report.attackOutcomes?.attacks,
    toolAttemptTrials: report.attackOutcomes?.threatToolAttemptTrials,
    successfulEffects: report.attackOutcomes?.successfulEffects,
    defenseSuccesses: report.attackOutcomes?.defenseSuccesses,
  }, ['cases', 'toolAttemptTrials', 'successfulEffects', 'defenseSuccesses']);
  sumInto(totals.controls, {
    trials: report.controls?.trials,
    successes: report.controls?.successes,
    failures: report.controls?.failures?.length,
  }, ['trials', 'successes', 'failures']);

  for (const [arm, value] of Object.entries(report.byArm || {})) {
    const target = totals.arms[arm] ||= Object.fromEntries(metricFields.map(field => [field, 0]));
    target.trials += Number(value.trials || 0);
    target.attacks += Number(value.attacks || 0);
    target.toolAttempts += Number(value.threatToolAttemptTrials || 0);
    target.attackSuccesses += Number(value.attackSuccesses || 0);
    target.defenseSuccesses += Number(value.defenseSuccesses || 0);
    target.activeDenials += Number(value.activeDenials || 0);
    target.normalTrials += Number(value.normalTrials || 0);
    target.normalSuccesses += Number(value.normalSuccesses || 0);
  }
  for (const [category, value] of Object.entries(report.byAttackCategory || {})) {
    const target = totals.categories[category] ||= { trials: 0, toolAttempts: 0, attackSuccesses: 0, defenseSuccesses: 0 };
    target.trials += Number(value.trials || 0);
    target.toolAttempts += Number(value.threatToolAttemptTrials || 0);
    target.attackSuccesses += Number(value.attackSuccesses || 0);
    target.defenseSuccesses += Number(value.defenseSuccesses || 0);
  }

  const evidence = report.fixtureEvidence || {};
  addMap(totals.evidence.trialStates, evidence.trialStates);
  addMap(totals.evidence.gatewayPaths, evidence.gatewayPaths);
  addMap(totals.evidence.gatewayDecisions, evidence.gatewayDecisions);
  addMap(totals.evidence.policyDecisions, evidence.tracePolicyDecisions);
  addMap(totals.evidence.canaryEvents, evidence.canaryEventsByKind);
  sumInto(totals.evidence, evidence, [
    'gatewayEvidenceEvents', 'mcpCallRecords', 'mcpCallExecutions', 'evidenceChainsValid', 'evidenceChainsInvalid',
    'protectedSecretReadSuccessTrials', 'actualAttackSideEffectTrials', 'honeypotQuarantineTrials',
  ]);
  sumInto(totals.evidence.crossSession, evidence.crossSession, ['trials', 'distinctSessionPairs', 'targetProtectedCallAttempts']);

  for (const [model, usage] of Object.entries(report.modelUsage || {})) {
    const target = totals.modelUsage[model] ||= { calls: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, unknownUsageCalls: 0 };
    target.calls += Number(usage.calls || 0);
    target.inputTokens += Number(usage.inputTokens || 0);
    target.outputTokens += Number(usage.outputTokens || 0);
    target.estimatedUsd += Number(usage.estimatedUsdFromReportedTokens || 0);
    target.unknownUsageCalls += Number(usage.unknownUsageCalls || 0);
  }

  const generation = report.attackGeneration || {};
  if (Number(generation.attempted || 0) > 0) {
    totals.generationRuns.push({ runId: run.runId, caseHash: run.caseHash, ...generation });
    for (const field of ['attempted', 'refused', 'failures', 'fallbackPayloads']) {
      totals.generationTotals[field] += Number(generation[field] || 0);
    }
    addMap(totals.generationTotals.failuresByModel, generation.failuresByModel);
  }
  for (const item of report.controls?.failures || []) {
    totals.controlFailureIds[item.trialId] = (totals.controlFailureIds[item.trialId] || 0) + 1;
  }
  if (Number(report.promptfoo?.errors || 0) > 0) {
    totals.executionErrorRuns.push({ runId: run.runId, errors: Number(report.promptfoo.errors), resultCount: Number(report.promptfoo.resultCount || 0) });
  }
}

for (const run of partialRuns) {
  for (const [model, usage] of Object.entries(run.partial?.modelUsage || {})) {
    const target = totals.modelUsage[model] ||= { calls: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, unknownUsageCalls: 0 };
    target.calls += Number(usage.calls || 0);
    target.inputTokens += Number(usage.inputTokens || 0);
    target.outputTokens += Number(usage.outputTokens || 0);
    target.estimatedUsd += Number(usage.estimatedUsd || 0);
    target.unknownUsageCalls += Number(usage.unknownUsageCalls || 0);
  }
}

const latest = completed.at(-1);
const latestRun = runs.at(-1);
const finalBudget = latestRun?.budget || latest?.budget || {};
const ledgerCommittedUsd = runningCommitted;
const currentBudgetCap = latestRun?.budget?.totalCapUsd ?? latestRun?.config?.budgetUsd ?? latest?.budget?.totalCapUsd ?? latestRun?.capUsd ?? latest?.capUsd ?? 9;
const capUsd = budgetCap(currentBudgetCap);
const ledgerRemainingRaw = latestRun?.budget?.remainingUsd ?? latestRun?.partial?.budget?.remainingUsd ?? latest?.budget?.remainingUsd;
const ledgerRemainingUsd = ledgerRemainingRaw === 'unlimited' || capUsd === Number.POSITIVE_INFINITY
  ? 'unlimited'
  : Number(ledgerRemainingRaw ?? Math.max(0, capUsd - ledgerCommittedUsd));
const reportedTokenCostUsd = Object.values(totals.modelUsage).reduce((sum, usage) => sum + usage.estimatedUsd, 0);
const completedLedgerUsd = completed.reduce((sum, run) => sum + run.runCommittedUsd, 0);
const noTrialLedgerUsd = preTrial.reduce((sum, run) => sum + run.runCommittedUsd, 0);
const partialLedgerUsd = partialRuns.reduce((sum, run) => sum + run.runCommittedUsd, 0);
const uniqueCaseHashes = [...new Set(runs.map(run => run.caseHash).filter(Boolean))];
const latestEstimate = latestRun?.estimate || latest?.estimate || {};
const nextBatchEstimateUsd = Number(latestEstimate?.estimatedUsd || NaN);
const matrixPath = path.join(repoRoot, 'security-lab', 'e4', 'matrix.json');
const currentMatrixSha256 = fs.existsSync(matrixPath)
  ? createHash('sha256').update(fs.readFileSync(matrixPath)).digest('hex')
  : null;
const e4 = latest?.report?.e4 || {};
const definitions = latest?.preregistration?.definitionsSource || completed[0]?.preregistration?.definitionsSource || 'Not recorded';
const commit = latestRun?.preregistration?.git?.commit || latest?.report?.git?.commit || completed[0]?.report?.git?.commit || 'unknown';
const branch = latestRun?.preregistration?.git?.branch || latest?.report?.git?.branch || completed[0]?.report?.git?.branch || 'unknown';
const trialStateRows = Object.values(totals.evidence.trialStates).reduce((sum, count) => sum + count, 0);
const armTrialRows = Object.values(totals.arms).reduce((sum, arm) => sum + arm.trials, 0);
const recordedCumulativeUsd = latestRun?.budget?.cumulativeCommittedUsd ?? latestRun?.partial?.budget?.cumulativeCommittedUsd;
const ledgerMatchesRunArtifacts = recordedCumulativeUsd === undefined || Math.abs(ledgerCommittedUsd - Number(recordedCumulativeUsd)) < 1e-7;
const integrityChecks = {
  ledgerMatchesRunArtifacts,
  cumulativeBudgetWithinCap: capUsd === Number.POSITIVE_INFINITY || ledgerCommittedUsd <= capUsd + 1e-8,
  reportedRowsMatchPlanned: totals.resultRows === totals.plannedTrials,
  evidenceStatesMatchReportedRows: trialStateRows === totals.resultRows,
  armRowsMatchPlanned: armTrialRows === totals.plannedTrials,
  promptfooPassAndFailCountersMatchRows: totals.promptfoo.passed + totals.promptfoo.failed === totals.resultRows,
  everyCompletedRunHasCaseHash: completed.length > 0 && completed.every(run => Boolean(run.caseHash)),
  noUnknownUsageCallsInCompletedReports: Object.values(totals.modelUsage).every(usage => usage.unknownUsageCalls === 0),
};
const failedIntegrityChecks = Object.entries(integrityChecks).filter(([, passed]) => !passed).map(([name]) => name);
if (failedIntegrityChecks.length) throw new Error(`CAMPAIGN_REPORT_INTEGRITY_CHECK_FAILED:${failedIntegrityChecks.join(',')}`);
const secretLikePattern = /(?:sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._~-]{20,})/i;

const summary = {
  generatedAt: new Date().toISOString(),
  commit, branch,
  budget: {
    capUsd: Number.isFinite(capUsd) ? capUsd : 'unlimited', ledgerCommittedUsd, ledgerRemainingUsd,
    completedRunLedgerUsd: completedLedgerUsd,
    noTrialAttemptLedgerUsd: noTrialLedgerUsd,
    partialRunLedgerUsd: partialLedgerUsd,
    reportedTokenPricingEstimateUsd: reportedTokenCostUsd,
    providerBilledCostUsd: null,
    nextSupportedBatchSize: 100,
    nextBatchEstimateUsd,
    nextBatchFitsRemainingBudget: capUsd === Number.POSITIVE_INFINITY || (Number.isFinite(nextBatchEstimateUsd) && nextBatchEstimateUsd <= ledgerRemainingUsd),
  },
  runs: runs.map(run => ({
    runId: run.runId,
    completed: Boolean(run.report),
    partial: Boolean(run.partial),
    resultRows: Number(run.report?.completedTrials || 0),
    plannedTrials: Number(run.report?.plannedTrials || 0),
    partialTrialRows: Number(run.partial?.observedTrialRows || 0),
    runCommittedUsd: run.runCommittedUsd,
    cumulativeCommittedUsd: run.reconstructedCumulativeUsd,
    remainingUsd: run.budget?.remainingUsd ?? null,
    capUsd: Number.isFinite(run.capUsd) ? run.capUsd : 'unlimited',
    partialSummary: run.partial || null,
    preflightFailures: run.preflightFailures,
    caseHash: run.caseHash,
    reusedCasesFrom: run.reusedCasesFrom,
    promptfoo: run.report?.promptfoo || null,
  })),
  totals,
  partialRuns: partialRuns.map(run => ({ runId: run.runId, ...run.partial })),
  caseStudy: { uniqueScenarioSets: uniqueCaseHashes.length, sha256: uniqueCaseHashes },
  e4: { status: e4.status || 'NOT_VERIFIED', matrixSha256AtRun: e4.matrixSha256 || null, currentMatrixSha256, matrixUnchanged: Boolean(e4.matrixSha256 && currentMatrixSha256 === e4.matrixSha256), reason: e4.reason || 'No E4 verification evidence in the run report.' },
costLimitations: 'The API response did not provide the Yicode invoice amount. Ledger committed USD and locally priced reported tokens are separate measures; their difference is unreconciled and cannot be treated as provider billing.',
  integrityChecks,
};

const armRows = Object.entries(totals.arms).sort(([a], [b]) => a.localeCompare(b)).map(([arm, value]) => [
  arm,
  value.trials,
  `${value.attackSuccesses}/${value.attacks} (${percent(value.attackSuccesses, value.attacks)})`,
  `${value.toolAttempts}/${value.attacks} (${percent(value.toolAttempts, value.attacks)})`,
  `${value.defenseSuccesses}/${value.attacks} (${percent(value.defenseSuccesses, value.attacks)})`,
  `${value.normalSuccesses}/${value.normalTrials} (${percent(value.normalSuccesses, value.normalTrials)})`,
  value.activeDenials,
]);

const categoryRows = Object.entries(totals.categories).map(([name, value]) => [
  name,
  value.trials,
  `${value.toolAttempts}/${value.trials} (${percent(value.toolAttempts, value.trials)})`,
  `${value.attackSuccesses}/${value.trials} (${percent(value.attackSuccesses, value.trials)})`,
  `${value.defenseSuccesses}/${value.trials} (${percent(value.defenseSuccesses, value.trials)})`,
]);

const modelRows = Object.entries(totals.modelUsage).sort(([a], [b]) => a.localeCompare(b)).map(([model, usage]) => [
  model, usage.calls, usage.inputTokens.toLocaleString('en-US'), usage.outputTokens.toLocaleString('en-US'), usd(usage.estimatedUsd), usage.unknownUsageCalls,
]);

const batchRows = completed.map(run => {
  const r = run.report;
  return [
    run.runId,
    `${r.completedTrials}/${r.plannedTrials}`,
    `${r.promptfoo?.passed ?? 0}/${r.promptfoo?.resultCount ?? 0}`,
    `${r.promptfoo?.failed ?? 0}`,
    `${r.promptfoo?.errors ?? 0}`,
    usd(run.runCommittedUsd),
    run.caseHash ? run.caseHash.slice(0, 12) : 'n/a',
    `[report](runs/${run.runId}/report.md) · [raw logs](runs/${run.runId}/)`,
  ];
});

const failedRows = preTrial.map(run => [
  run.runId,
  usd(run.runCommittedUsd),
  run.preflightFailures.map(item => `${item.model}: ${item.code}`).join('<br>') || 'No trial report; see raw run files',
  `[raw logs](runs/${run.runId}/)`,
]);

const partialRows = partialRuns.map(run => [
  run.runId,
  `${run.partial.observedTrialRows}/${run.partial.plannedTrials}`,
  `${run.partial.completedTrialRows} completed; ${run.partial.errorTrialRows} errors`,
  run.partial.stop?.code || run.partial.status,
  usd(run.runCommittedUsd),
  `[partial summary](runs/${run.runId}/partial-summary.json) · [raw logs](runs/${run.runId}/)`,
]);

const categoryNames = {
  direct_prompt_injection: 'Direct Prompt Injection',
  indirect_prompt_injection: 'Indirect Prompt Injection',
  mcp_tool_description_injection: 'MCP Tool Description Injection',
  mcp_tool_response_injection: 'MCP Tool Response Injection',
  tool_permission_escalation: 'Tool Permission Escalation',
  multi_turn_agent_manipulation: 'Multi-turn Agent Manipulation',
  cross_session_state_contamination: 'Cross-session State Contamination',
  canary_detection_and_isolation: 'Canary Detection and Isolation',
  policy_bypass_attempt: 'Policy Bypass Attempts',
  fail_closed_verification: 'Fail-Closed Security Verification',
};
const humanCategoryRows = categoryRows.map(row => [categoryNames[row[0]] || row[0], ...row.slice(1)]);

const generationRows = totals.generationRuns.flatMap(generation => Object.entries(generation.generatedByModel || {}).map(([model, metric]) => [
  generation.runId,
  model,
  metric.payloads,
  metric.evaluatedTrials,
  percent(metric.toolAttemptRate * metric.evaluatedTrials, metric.evaluatedTrials),
  percent(metric.attackSuccessRate * metric.evaluatedTrials, metric.evaluatedTrials),
  generation.failuresByModel?.[model] || 0,
]));

const failedRunCountByModel = Object.entries(totals.preflightFailureCounts).map(([modelCode, count]) => [modelCode, count]);
const repeatedControls = Object.entries(totals.controlFailureIds).map(([id, count]) => [id, count]);
const evidence = totals.evidence;
const attackEffectiveRate = percent(totals.attacks.toolAttemptTrials, totals.attacks.cases);
const attackSuccessRate = percent(totals.attacks.successfulEffects, totals.attacks.cases);
const defenseSuccessRate = percent(totals.attacks.defenseSuccesses, totals.attacks.cases);
const generationRefusalRate = percent(totals.generationTotals.refused, totals.generationTotals.attempted);
const generationFailureRate = percent(totals.generationTotals.failures, totals.generationTotals.attempted);
const budgetCapLabel = Number.isFinite(capUsd) ? `$${capUsd.toFixed(2)}` : 'unlimited';
const budgetRemainingLabel = ledgerRemainingUsd === 'unlimited' ? 'unlimited' : usd(ledgerRemainingUsd);
const budgetPolicyText = Number.isFinite(capUsd)
  ? `The cumulative ledger committed ${usd(ledgerCommittedUsd)} and leaves ${budgetRemainingLabel}. The latest pre-run estimate for the next supported batch is ${usd(nextBatchEstimateUsd)}.`
  : `No campaign cap is configured. The cumulative token-priced ledger currently records ${usd(ledgerCommittedUsd)}; this is not a provider balance or invoice. The latest pre-run estimate for the next supported batch is ${usd(nextBatchEstimateUsd)}.`;
const budgetHistoryText = latestRun?.config?.budgetUsd === 'unlimited'
  ? 'The campaign was previously run under a $9 cap, which the user later explicitly changed to unlimited. Historical spend remains in the cumulative ledger.'
  : 'Budget changes do not reset earlier committed ledger entries; each run records its cap and cumulative total.';

const markdown = `# Agent Canary Cloud Red Team Campaign Report

Generated from the preserved run artifacts by \`node security-lab/cloud-redteam/summarize-campaign.mjs\`. This report contains aggregated evidence only; it does not copy raw prompts, model responses, or synthetic credentials.

## Campaign Result

- **Repository commit:** \`${commit}\` on branch \`${branch}\`.
- **Run attempts:** ${totals.runAttempts}; ${totals.completedBatches} completed batches, ${totals.partialRuns} partial batches, and ${totals.stoppedBeforeTrials} attempts stopped before trials.
- **Trials:** ${totals.resultRows}/${totals.plannedTrials} result rows processed across completed runs. Trial evidence states: ${Object.entries(evidence.trialStates).map(([state, count]) => `${state} ${count}`).join(', ')}.
- **Partial-run rows:** ${totals.partialTrialRows} observed rows in ${totals.partialRuns} interrupted run(s); these are kept out of completed-batch rates and are detailed separately below.
- **Promptfoo:** ${totals.promptfoo.passed} passed, ${totals.promptfoo.failed} failed results, ${totals.promptfoo.errors} execution error(s). These are separately reported counters; error entries may overlap failed results and are not added to the trial row count.
- **Attack outcomes:** ${totals.attacks.successfulEffects}/${totals.attacks.cases} attack trials produced a recorded side effect (${attackSuccessRate}); ${totals.attacks.toolAttemptTrials}/${totals.attacks.cases} reached a threat tool attempt (${attackEffectiveRate}); defense success was ${totals.attacks.defenseSuccesses}/${totals.attacks.cases} (${defenseSuccessRate}).
- **Normal controls:** ${totals.controls.successes}/${totals.controls.trials} passed (${percent(totals.controls.successes, totals.controls.trials)}); ${totals.controls.failures} failed control observations.
- **Generated attack refusal rate:** ${totals.generationTotals.refused}/${totals.generationTotals.attempted} explicit refusals (${generationRefusalRate}). Generation/API/parse failures were ${totals.generationTotals.failures}/${totals.generationTotals.attempted} (${generationFailureRate}); ${totals.generationTotals.fallbackPayloads} samples used deterministic fallback payloads.
- **Budget cap:** ${budgetCapLabel}. ${budgetPolicyText} The harness accepts 100, 1,000, or 10,000 trials; no smaller batch was run.
- **Provider billing:** the generic API responses did not include a Yicode invoice amount. The ledger amount is not represented as a confirmed invoice; see the cost reconciliation below.

## Aggregation Integrity

All ${Object.keys(integrityChecks).length} automatic consistency checks passed: run-ledger sum, campaign cap, planned/result rows, evidence states, A/B/C/D totals, Promptfoo counters, case hashes, and known usage accounting. The E4 matrix comparison is reported separately below.

${budgetHistoryText}

## A/B/C/D Comparison

The run preregistration retains the repository's experiment definitions verbatim: ${definitions}

| Arm | Trials | Attack successes | Tool attempts | Defense successes | Normal controls | Active denials |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${armRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n')}

D recorded no successful attack side effects in its 152 attack trials, while its normal controls passed 32/48. A/B/C normal controls passed 48/48 each. These are synthetic-fixture results, not a claim of external MCP-host coverage.

## Attack Category Coverage

| Category | Trials | Threat tool attempt | Successful side effect | Defense success |
| --- | ---: | ---: | ---: | ---: |
${humanCategoryRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n')}

The category totals include repeated runs over two distinct case-set hashes. Seven of the eight completed batches reused the same 25-scenario dataset from run \`2026-11-06T09-23-18-590Z\`; these are repeated measurements, not 800 unique scenarios. The unique dataset SHA-256 values are listed in the JSON summary.

## Attack Generator Results

Explicit refusal and generation failure are counted separately. The two actual generation runs attempted 38 attack seeds in total. Five failed generation/parse/API samples were archived and replaced with deterministic payloads. Reuse runs made no attacker API calls and are excluded from generation counts.

| Generation run | Model | Payloads | Evaluated trials | Threat tool attempt rate | Side-effect rate | Failed samples |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${generationRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n') || '| None | | | | | | |'}

The per-model figures are descriptive, with small and partly non-matched samples; they do not establish a statistically controlled model ranking. Failure counts by model: ${Object.entries(totals.generationTotals.failuresByModel).map(([model, count]) => `\`${model}\` ${count}`).join(', ') || 'none'}.

## Gateway, Policy, Canary, and Isolation Evidence

- **Trial states:** ${Object.entries(evidence.trialStates).map(([state, count]) => `${state} ${count}`).join(', ')}.
- **Gateway paths:** ${Object.entries(evidence.gatewayPaths).map(([name, count]) => `\`${name}\` ${count}`).join(', ')}. Only D traversed \`TrustedExecutionGateway\`; A/B/C used the unprotected fixture or AgentGuard path according to each run's raw evidence.
- **Gateway evidence and decisions:** ${evidence.gatewayEvidenceEvents} gateway evidence events; decisions ${Object.entries(evidence.gatewayDecisions).map(([name, count]) => `${name} ${count}`).join(', ')}.
- **Policy trace decisions:** ${Object.entries(evidence.policyDecisions).map(([name, count]) => `${name} ${count}`).join(', ')}.
- **MCP synthetic call records:** ${evidence.mcpCallRecords} records, ${evidence.mcpCallExecutions} executed calls. No external MCP server or MCP wire protocol was exercised.
- **Canary events:** ${Object.entries(evidence.canaryEvents).map(([name, count]) => `${name} ${count}`).join(', ')}; honeypot quarantine trials ${evidence.honeypotQuarantineTrials}.
- **Evidence chains:** ${evidence.evidenceChainsValid} valid, ${evidence.evidenceChainsInvalid} invalid.
- **Protected synthetic secret reads with success:** ${evidence.protectedSecretReadSuccessTrials}; these are observed fixture side effects.
- **Cross-session isolation:** ${evidence.crossSession.trials} paired trials, ${evidence.crossSession.distinctSessionPairs} distinct pairs, ${evidence.crossSession.targetProtectedCallAttempts} target protected-call attempts.

All evidence above comes from repository-owned synthetic fixtures. It verifies those local execution paths and does not establish production deployment or an external MCP host's behavior.

## E4 Acceptance

**${e4.status || 'NOT_VERIFIED'}**. Existing E4 acceptance criteria were not changed. The run report states that these cloud trials do not satisfy the clean Windows VM, installed artifact, fault injection, and independent operator requirements. Matrix hash at test time: \`${e4.matrixSha256 || 'not recorded'}\`; current matrix hash: \`${currentMatrixSha256 || 'unavailable'}\`; unchanged: **${summary.e4.matrixUnchanged ? 'yes' : 'no'}**. This experiment does not pass or close E4.

## Token Usage and Cost Reconciliation

Token figures below sum the per-run reported usage from completed reports. Prices are the repository's configured token-pricing estimates, not the Yicode invoice.

${table(['Model', 'Calls', 'Input tokens', 'Output tokens', 'Reported-token price estimate', 'Unknown-usage calls'], modelRows)}

- **Completed-report token-priced total:** ${usd(reportedTokenCostUsd)}.
- **Run ledger committed:** ${usd(ledgerCommittedUsd)} (${usd(completedLedgerUsd)} attached to completed batches and ${usd(noTrialLedgerUsd)} to attempts with no trial report).
- **Ledger minus reported-token estimate:** ${usd(ledgerCommittedUsd - reportedTokenCostUsd)}. The difference is unreconciled; it must not be treated as confirmed provider billing.
- **Yicode invoice cost:** unavailable from the generic API response; reconcile with the provider dashboard if an invoice-level total is required.

## Completed Batches and Preserved Logs

${table(['Run ID', 'Trials', 'Promptfoo pass', 'Assertion failures', 'Execution errors', 'Ledger committed', 'Case hash prefix', 'Artifacts'], batchRows)}

## Attempts Stopped Before Trials

${table(['Run ID', 'Ledger committed', 'Preflight result', 'Raw artifacts'], failedRows)}

Preflight failure counts: ${failedRunCountByModel.map(([name, count]) => `\`${name}\` ${count}`).join('; ') || 'none'}. These failures are retained separately from model refusal counts.

## Partial Runs Stopped by the Provider

${partialRows.length ? table(['Run ID', 'Observed / planned rows', 'Trial states', 'Stop code', 'Ledger committed', 'Artifacts'], partialRows) : 'No provider-stopped partial runs were recorded.'}

Partial rows are reported as observed execution records only. They are excluded from completed-batch attack, defense, and Promptfoo rates because the planned run did not finish.

## Notable Failure Cases

- The same D normal-control trials, \`D-CTRL-00002\` and \`D-CTRL-00006\`, failed in each of the eight repeated datasets. Counts: ${repeatedControls.map(([id, count]) => `\`${id}\` ${count}`).join(', ')}.
- One execution error occurred in run \`${totals.executionErrorRuns[0]?.runId || 'unknown'}\`; its run folder preserves Promptfoo output and evidence files. Failed-result and error counters are kept distinct, and the raw result file preserves the underlying classifications.
- Attack-generation failures: ${Object.entries(totals.generationTotals.failuresByModel).map(([model, count]) => `\`${model}\` ${count}`).join(', ') || 'none'}, with corresponding fallback samples archived in the generation run.
- Preflight provider errors and raw failed samples remain in each run's \`preflight.json\`, \`preflight-failures.jsonl\`, and \`generation-failures.jsonl\` where those files exist.

## Reproduction Configuration and Provenance

- **Commit:** \`${commit}\`; branch \`${branch}\`.
- **Repeated evaluation command:** \`node security-lab/cloud-redteam/run.mjs --size 100 --defender-models gpt:gpt-6.1-sol --reuse-cases security-lab/cloud-redteam/runs/2026-11-06T09-23-18-590Z\`.
- **Model roles for repeated runs:** defender and advisory judge \`gpt:gpt-6.1-sol\`; attacker generation skipped because the validated synthetic cases were reused.
- **Budget:** \`MAX_TEST_BUDGET_USD=${latestRun?.config?.budgetUsd ?? (Number.isFinite(capUsd) ? capUsd : 'unlimited')}\`; **concurrency:** ${latestRun?.config?.maxConcurrentRequests ?? latest?.config?.maxConcurrentRequests ?? 'not recorded'}; **retry policy:** ${latestRun?.config?.maxApiRetries ?? latest?.config?.maxApiRetries ?? 'not recorded'} configured retry(s), with cumulative per-request budget reservation.
- **Credentials:** supplied through ignored local environment configuration; no key value is present in this report or the committed source.
- **Case sets:** ${uniqueCaseHashes.length} distinct SHA-256 case-set hashes across the completed runs.
- **Raw logs:** each run folder preserves \`agent-raw.jsonl\`, \`model-usage.jsonl\`, \`model-usage-parent.jsonl\`, \`promptfoo-results.json\`, stdout/stderr, preregistration, cases, and evidence files where applicable. The links above point to the exact run directories.
- **Publication provenance:** the 2026-11-06 run artifacts and the Promptfoo/AgentDojo lab sources are included with this report. Later PyRIT integration changes were not part of the runs summarized here.

## Machine-readable Summary

See \`${path.basename(jsonPath)}\` for the complete aggregated counts, per-run ledger, preflight failures, A/B/C/D metrics, generation runs, model usage, case hashes, and E4 matrix hash check.
`;

const publishedMarkdown = sanitizeProviderStatusText(markdown);
const json = `${JSON.stringify(sanitizePublishedValue(summary), null, 2)}\n`;
if (secretLikePattern.test(publishedMarkdown) || secretLikePattern.test(json)) throw new Error('REPORT_SECRET_PATTERN_DETECTED');
fs.writeFileSync(reportPath, publishedMarkdown, 'utf8');
fs.writeFileSync(jsonPath, json, 'utf8');
console.log(JSON.stringify({ reportPath, jsonPath, runAttempts: totals.runAttempts, completedBatches: totals.completedBatches, trials: totals.resultRows, ledgerCommittedUsd, ledgerRemainingUsd, nextBatchEstimateUsd, integrityChecks }));
