import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { summarizeAttackTrials, summarizeTrialOutcomes } from './trial-statistics.mjs';
import { pairedDefenderModelComparisons } from './paired-statistics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
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

function readModelUsageByPurpose(dir) {
  const result = {};
  for (const file of ['model-usage.jsonl', 'model-usage-parent.jsonl']) {
    for (const event of readJsonl(path.join(dir, file))) {
      if (event.type !== 'model_call') continue;
      const model = event.model || 'unknown';
      const purpose = event.purpose || 'unknown';
      const key = `${model}|${purpose}`;
      const usage = result[key] ||= { model, purpose, calls: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, unknownUsageCalls: 0 };
      usage.calls++;
      if (Number.isSafeInteger(event.usage?.inputTokens) && Number.isSafeInteger(event.usage?.outputTokens)) {
        usage.inputTokens += event.usage.inputTokens;
        usage.outputTokens += event.usage.outputTokens;
      } else usage.unknownUsageCalls++;
      usage.estimatedUsd += Number(event.cost?.chargedUsd || 0);
    }
  }
  return result;
}

function readModelRequestDiagnostics(dir) {
  const result = { retryEvents: 0, failedCalls: 0, failedAttempts: 0, byModelPurposeCode: {} };
  for (const file of ['model-usage.jsonl', 'model-usage-parent.jsonl']) {
    for (const event of readJsonl(path.join(dir, file))) {
      if (event.type !== 'model_call_retry' && event.type !== 'model_call_failed') continue;
      const model = event.model || 'unknown';
      const purpose = event.purpose || 'unknown';
      const code = event.code || 'unknown';
      const key = `${model}|${purpose}|${code}`;
      const item = result.byModelPurposeCode[key] ||= { model, purpose, code, retryEvents: 0, failedCalls: 0, failedAttempts: 0 };
      if (event.type === 'model_call_retry') {
        item.retryEvents++;
        result.retryEvents++;
      } else {
        item.failedCalls++;
        item.failedAttempts += Number.isSafeInteger(event.attempts) ? event.attempts : 1;
        result.failedCalls++;
        result.failedAttempts += Number.isSafeInteger(event.attempts) ? event.attempts : 1;
      }
    }
  }
  return result;
}

function readGenerationFailures(dir) {
  return readJsonl(path.join(dir, 'generation-failures.jsonl'));
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
  const promptfooDocument = readJson(path.join(dir, 'promptfoo-results.json'));
  const promptfooStats = promptfooDocument?.results?.stats || {};
  const promptfooCounts = {
    passed: Number.isSafeInteger(promptfooStats.successes) ? promptfooStats.successes : Number(report?.promptfoo?.passed || 0),
    failed: Number.isSafeInteger(promptfooStats.failures) ? promptfooStats.failures : Number(report?.promptfoo?.failed || 0),
    errors: Number.isSafeInteger(promptfooStats.errors) ? promptfooStats.errors : Number(report?.promptfoo?.errors || 0),
    resultCount: Array.isArray(promptfooDocument?.results?.results) ? promptfooDocument.results.results.length : Number(report?.promptfoo?.resultCount || 0),
  };
  const rawTrials = readJsonl(path.join(dir, 'agent-raw.jsonl'));
  const trialMetrics = rawTrials.length ? summarizeTrialOutcomes(rawTrials) : null;
  const generationBySource = {};
  if (Array.isArray(cases) && rawTrials.length) {
    for (const source of [...new Set(cases.filter(item => item.attack).map(item => item.generationSource ?? 'unknown'))]) {
      const sourceCases = cases.filter(item => item.attack && (item.generationSource ?? 'unknown') === source);
      const sourceTrials = rawTrials.filter(item => item.attack && (item.generationSource ?? 'unknown') === source);
      const metric = summarizeAttackTrials(sourceTrials);
      generationBySource[source] = {
        payloads: sourceCases.length, plannedTrials: metric.trials, evaluatedTrials: metric.evaluatedTrials,
        errorTrials: metric.errorTrials, toolAttemptRate: metric.effectiveAttackRate, attackSuccessRate: metric.attackSuccessRate,
      };
    }
  }
  const estimate = readJson(path.join(dir, 'estimate.json'));
  const runStop = readJson(path.join(dir, 'run-stop.json'));
  const modelUsageByPurpose = readModelUsageByPurpose(dir);
  const modelRequestDiagnostics = readModelRequestDiagnostics(dir);
  const generationFailures = readGenerationFailures(dir);
  const runCommittedUsd = Number(budget?.runCommittedUsd ?? parentBudget?.committedUsd ?? 0);
  const preflightFailures = (preflight?.failures || []).map(item => ({ model: item.model || 'unknown', code: item.code || 'unknown' }));
  return {
    runId, dir, report, partial, budget, config, preflight, preregistration, estimate, runStop, modelUsageByPurpose, modelRequestDiagnostics, generationFailures, rawTrials, trialMetrics, generationBySource, cases, promptfooCounts,
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
const partialGenerationDiagnostics = partialRuns.map(run => {
  const failuresByModel = {};
  for (const failure of run.generationFailures) {
    const model = failure.model || 'unknown';
    failuresByModel[model] = (failuresByModel[model] || 0) + 1;
  }
  return {
    runId: run.runId,
    archivedFailureRecords: Math.max(run.generationFailures.length, Number(run.partial?.generation?.archivedFailureRecords || 0)),
    explicitRefusals: run.generationFailures.filter(failure => failure.refusal === true).length,
    failuresByModel,
    generatedPayloadsPersistedBeforeInterruption: run.partial?.generation?.generatedPayloadsPersistedBeforeInterruption ?? null,
  };
});
const modelComparisonCohorts = new Map();
for (const run of completed) {
  if (!run.caseHash) continue;
  const models = [...new Set(run.rawTrials.map(trial => trial.model).filter(model => typeof model === 'string'))];
  if (models.length !== 1) continue;
  const model = models[0];
  const cohort = modelComparisonCohorts.get(run.caseHash) || new Map();
  const previous = cohort.get(model);
  if (!previous || previous.runId.localeCompare(run.runId) < 0) cohort.set(model, run);
  modelComparisonCohorts.set(run.caseHash, cohort);
}
const comparableCohort = [...modelComparisonCohorts.entries()]
  .filter(([, cohort]) => cohort.size >= 2)
  .sort((a, b) => {
    const latestA = [...a[1].values()].map(run => run.runId).sort().at(-1);
    const latestB = [...b[1].values()].map(run => run.runId).sort().at(-1);
    return latestA.localeCompare(latestB);
  })
  .at(-1);
const pairedModelRuns = comparableCohort ? [...comparableCohort[1].values()].sort((a, b) => a.rawTrials[0].model.localeCompare(b.rawTrials[0].model)) : [];
const pairedModelComparison = pairedModelRuns.length >= 2 ? {
  caseHash: comparableCohort[0],
  selectionRule: 'latest completed run per defender model in the newest case-hash cohort with at least two models; each selected run must contain exactly one defender model',
  selectedRuns: pairedModelRuns.map(run => ({ runId: run.runId, model: run.rawTrials[0].model, plannedTrials: run.report.plannedTrials, observedTrialRows: run.trialMetrics?.observedTrialRows ?? run.report.observedTrialRows ?? run.report.completedTrials })),
  ...pairedDefenderModelComparisons(pairedModelRuns.flatMap(run => run.rawTrials)),
} : null;
const pairedDefenderRuns = (pairedModelComparison?.selectedRuns || []).flatMap(selected => {
  const run = completed.find(item => item.runId === selected.runId);
  if (!run?.report) return [];
  const report = run.report;
  const tokenEstimateUsd = Object.values(run.modelUsageByPurpose).reduce((sum, usage) => sum + usage.estimatedUsd, 0);
  return [{
    runId: run.runId,
    model: selected.model,
    plannedTrials: report.plannedTrials,
    observedTrialRows: run.trialMetrics?.observedTrialRows ?? report.observedTrialRows ?? report.completedTrials,
    completedTrials: run.trialMetrics?.completedTrialRows ?? report.completedTrials,
    errorTrials: run.trialMetrics?.errorTrialRows ?? report.errorTrials ?? 0,
    attackOutcomes: report.attackOutcomes,
    controls: report.controls,
    byArm: report.byArm,
    byAttackCategory: report.byAttackCategory,
    promptfoo: run.promptfooCounts,
    modelRequestDiagnostics: run.modelRequestDiagnostics,
    fixtureEvidence: report.fixtureEvidence,
    modelUsageByPurpose: Object.values(run.modelUsageByPurpose),
    reportedTokenPricingEstimateUsd: tokenEstimateUsd,
    runCommittedUsd: run.runCommittedUsd,
    caseHash: run.caseHash,
  }];
});
const totals = {
  runAttempts: runs.length,
  completedBatches: completed.length,
  stoppedBeforeTrials: preTrial.length,
  partialRuns: partialRuns.length,
  partialTrialRows: partialRuns.reduce((sum, run) => sum + Number(run.partial?.observedTrialRows || 0), 0),
  plannedTrials: 0,
  resultRows: 0,
  completedRows: 0,
  errorRows: 0,
  promptfoo: { passed: 0, failed: 0, errors: 0 },
  attacks: { cases: 0, completedCases: 0, errorCases: 0, evaluatedCases: 0, unevaluableCases: 0, toolAttemptTrials: 0, observedToolAttemptTrials: 0, successfulEffects: 0, defenseSuccesses: 0 },
  controls: { trials: 0, completedTrials: 0, errorTrials: 0, evaluatedTrials: 0, unevaluableTrials: 0, successes: 0, failures: 0 },
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
  modelUsageByPurpose: {},
  modelRequestDiagnostics: { retryEvents: 0, failedCalls: 0, failedAttempts: 0, byModelPurposeCode: {} },
  generationRuns: [],
  generationTotals: { attempted: 0, refused: 0, failures: 0, fallbackPayloads: 0, failuresByModel: {} },
  preflightFailures: [],
  preflightFailureCounts: {},
  controlFailureIds: {},
  executionErrorRuns: [],
};

const metricFields = ['trials', 'completedTrials', 'errorTrials', 'attacks', 'completedAttacks', 'attackErrors', 'evaluatedAttacks', 'unevaluableAttacks', 'toolAttempts', 'attackSuccesses', 'defenseSuccesses', 'activeDenials', 'normalTrials', 'completedNormalTrials', 'normalErrors', 'evaluatedNormalTrials', 'unevaluableNormalTrials', 'normalSuccesses', 'normalFailures'];
for (const run of runs) {
  totals.modelRequestDiagnostics.retryEvents += run.modelRequestDiagnostics.retryEvents;
  totals.modelRequestDiagnostics.failedCalls += run.modelRequestDiagnostics.failedCalls;
  totals.modelRequestDiagnostics.failedAttempts += run.modelRequestDiagnostics.failedAttempts;
  for (const failure of Object.values(run.modelRequestDiagnostics.byModelPurposeCode)) {
    const target = totals.modelRequestDiagnostics.byModelPurposeCode[`${failure.model}|${failure.purpose}|${failure.code}`] ||= { ...failure, retryEvents: 0, failedCalls: 0, failedAttempts: 0 };
    target.retryEvents += failure.retryEvents;
    target.failedCalls += failure.failedCalls;
    target.failedAttempts += failure.failedAttempts;
  }
  for (const usage of Object.values(run.modelUsageByPurpose)) {
    const modelTotal = totals.modelUsage[usage.model] ||= { calls: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, unknownUsageCalls: 0 };
    const purposeTotal = totals.modelUsageByPurpose[`${usage.model}|${usage.purpose}`] ||= { ...usage, calls: 0, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, unknownUsageCalls: 0 };
    for (const target of [modelTotal, purposeTotal]) {
      target.calls += usage.calls;
      target.inputTokens += usage.inputTokens;
      target.outputTokens += usage.outputTokens;
      target.estimatedUsd += usage.estimatedUsd;
      target.unknownUsageCalls += usage.unknownUsageCalls;
    }
  }
  for (const failure of run.preflightFailures) {
    totals.preflightFailures.push({ runId: run.runId, ...failure });
    const key = `${failure.model} ${failure.code}`;
    totals.preflightFailureCounts[key] = (totals.preflightFailureCounts[key] || 0) + 1;
  }
  const report = run.report;
  if (!report) continue;

  totals.plannedTrials += Number(report.plannedTrials || 0);
  const observedRows = run.trialMetrics?.observedTrialRows ?? report.observedTrialRows ?? report.completedTrials ?? 0;
  const completedRows = run.trialMetrics?.completedTrialRows ?? report.completedTrials ?? observedRows;
  const errorRows = run.trialMetrics?.errorTrialRows ?? report.errorTrials ?? 0;
  totals.resultRows += Number(observedRows);
  totals.completedRows += Number(completedRows);
  totals.errorRows += Number(errorRows);
  sumInto(totals.promptfoo, run.promptfooCounts, ['passed', 'failed', 'errors']);
  const attackSummary = run.trialMetrics?.attacks;
  sumInto(totals.attacks, {
    cases: attackSummary?.trials ?? report.attackOutcomes?.attacks,
    completedCases: attackSummary?.completedTrials ?? report.attackOutcomes?.completedTrials ?? report.attackOutcomes?.attacks,
    errorCases: attackSummary?.errorTrials ?? report.attackOutcomes?.errorTrials ?? 0,
    evaluatedCases: attackSummary?.evaluatedTrials ?? report.attackOutcomes?.evaluatedTrials ?? report.attackOutcomes?.attacks,
    unevaluableCases: attackSummary?.unevaluableTrials ?? report.attackOutcomes?.unevaluableTrials ?? 0,
    toolAttemptTrials: attackSummary?.threatToolAttemptTrials ?? report.attackOutcomes?.threatToolAttemptTrials,
    observedToolAttemptTrials: attackSummary?.observedThreatToolAttemptTrials ?? report.attackOutcomes?.observedThreatToolAttemptTrials ?? report.attackOutcomes?.threatToolAttemptTrials,
    successfulEffects: attackSummary?.successfulEffects ?? report.attackOutcomes?.successfulEffects,
    defenseSuccesses: attackSummary?.defenseSuccesses ?? report.attackOutcomes?.defenseSuccesses,
  }, ['cases', 'completedCases', 'errorCases', 'evaluatedCases', 'unevaluableCases', 'toolAttemptTrials', 'observedToolAttemptTrials', 'successfulEffects', 'defenseSuccesses']);
  const controlSummary = run.trialMetrics?.controls;
  sumInto(totals.controls, {
    trials: controlSummary?.trials ?? report.controls?.trials,
    completedTrials: controlSummary?.completedTrials ?? report.controls?.completedTrials ?? report.controls?.trials,
    errorTrials: controlSummary?.errorTrials ?? report.controls?.errorTrials ?? 0,
    evaluatedTrials: controlSummary?.evaluatedTrials ?? report.controls?.evaluatedTrials ?? report.controls?.trials,
    unevaluableTrials: controlSummary?.unevaluableTrials ?? report.controls?.unevaluableTrials ?? 0,
    successes: controlSummary?.successes ?? report.controls?.successes,
    failures: controlSummary?.failures?.length ?? report.controls?.failures?.length,
  }, ['trials', 'completedTrials', 'errorTrials', 'evaluatedTrials', 'unevaluableTrials', 'successes', 'failures']);

  for (const [arm, value] of Object.entries(report.byArm || {})) {
    const target = totals.arms[arm] ||= Object.fromEntries(metricFields.map(field => [field, 0]));
    const raw = run.trialMetrics?.byArm?.[arm];
    const attack = raw?.attacks;
    const normal = raw?.normal;
    const values = {
      trials: raw?.trialRows ?? value.trials,
      completedTrials: raw?.completedTrialRows ?? value.completedTrials ?? value.trials,
      errorTrials: raw?.errorTrialRows ?? value.errorTrials ?? 0,
      attacks: attack?.trials ?? value.attacks,
      completedAttacks: attack?.completedTrials ?? value.completedAttacks ?? value.attacks,
      attackErrors: attack?.errorTrials ?? value.attackErrors ?? 0,
      evaluatedAttacks: attack?.evaluatedTrials ?? value.evaluatedAttacks ?? value.attacks,
      unevaluableAttacks: attack?.unevaluableTrials ?? value.unevaluableAttacks ?? 0,
      toolAttempts: attack?.threatToolAttemptTrials ?? value.threatToolAttemptTrials,
      attackSuccesses: attack?.attackSuccesses ?? value.attackSuccesses,
      defenseSuccesses: attack?.defenseSuccesses ?? value.defenseSuccesses,
      activeDenials: attack?.activeDenials ?? value.activeDenials,
      normalTrials: normal?.trials ?? value.normalTrials,
      completedNormalTrials: normal?.completedTrials ?? value.completedNormalTrials ?? value.normalTrials,
      normalErrors: normal?.errorTrials ?? value.normalErrors ?? 0,
      evaluatedNormalTrials: normal?.evaluatedTrials ?? value.evaluatedNormalTrials ?? value.normalTrials,
      unevaluableNormalTrials: normal?.unevaluableTrials ?? value.unevaluableNormalTrials ?? 0,
      normalSuccesses: normal?.successes ?? value.normalSuccesses,
      normalFailures: normal?.failures?.length ?? value.failedNormalTrialIds?.length ?? 0,
    };
    for (const field of metricFields) target[field] += Number(values[field] || 0);
  }
  for (const [category, value] of Object.entries(report.byAttackCategory || {})) {
    const target = totals.categories[category] ||= { trials: 0, completedTrials: 0, errorTrials: 0, evaluatedTrials: 0, unevaluableTrials: 0, toolAttempts: 0, attackSuccesses: 0, defenseSuccesses: 0 };
    const raw = run.trialMetrics?.byCategory?.[category] ?? value;
    target.trials += Number(raw.trials || 0);
    target.completedTrials += Number(raw.completedTrials ?? raw.trials ?? 0);
    target.errorTrials += Number(raw.errorTrials || 0);
    target.evaluatedTrials += Number(raw.evaluatedTrials ?? raw.trials ?? 0);
    target.unevaluableTrials += Number(raw.unevaluableTrials || 0);
    target.toolAttempts += Number(raw.threatToolAttemptTrials || 0);
    target.attackSuccesses += Number(raw.attackSuccesses || 0);
    target.defenseSuccesses += Number(raw.defenseSuccesses || 0);
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

  const generation = { ...(report.attackGeneration || {}), generatedByModel: Object.keys(run.generationBySource).length ? run.generationBySource : report.attackGeneration?.generatedByModel };
  if (Number(generation.attempted || 0) > 0) {
    totals.generationRuns.push({ runId: run.runId, caseHash: run.caseHash, ...generation });
    for (const field of ['attempted', 'refused', 'failures', 'fallbackPayloads']) {
      totals.generationTotals[field] += Number(generation[field] || 0);
    }
    addMap(totals.generationTotals.failuresByModel, generation.failuresByModel);
  }
  for (const item of controlSummary?.failures ?? report.controls?.failures ?? []) {
    totals.controlFailureIds[item.trialId] = (totals.controlFailureIds[item.trialId] || 0) + 1;
  }
  if (Number(report.promptfoo?.errors || 0) > 0) {
    totals.executionErrorRuns.push({ runId: run.runId, errors: run.promptfooCounts.errors, resultCount: run.promptfooCounts.resultCount });
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
const definitions = latest?.preregistration?.definitionsSource || completed[0]?.preregistration?.definitionsSource || 'Not recorded';
const commit = latestRun?.preregistration?.git?.commit || latest?.report?.git?.commit || completed[0]?.report?.git?.commit || 'unknown';
const branch = latestRun?.preregistration?.git?.branch || latest?.report?.git?.branch || completed[0]?.report?.git?.branch || 'unknown';
const trialStateRows = Object.values(totals.evidence.trialStates).reduce((sum, count) => sum + count, 0);
const armTrialRows = Object.values(totals.arms).reduce((sum, arm) => sum + arm.trials, 0);
const modelUsagePurposeReconciles = Object.entries(totals.modelUsage).every(([model, usage]) => {
  const purposes = Object.values(totals.modelUsageByPurpose).filter(item => item.model === model);
  const sum = field => purposes.reduce((total, item) => total + Number(item[field] || 0), 0);
  return ['calls', 'inputTokens', 'outputTokens', 'unknownUsageCalls'].every(field => sum(field) === usage[field])
    && Math.abs(sum('estimatedUsd') - usage.estimatedUsd) < 1e-9;
});
const ledgerMatchesRunArtifacts = runs.every(run => {
  const runBudget = run.budget || run.partial?.budget || {};
  const recordedCumulativeUsd = runBudget.cumulativeCommittedUsd;
  const priorCommittedUsd = Number(runBudget.priorCommittedUsd);
  if (recordedCumulativeUsd === undefined || !Number.isFinite(priorCommittedUsd)) return true;
  return Math.abs(priorCommittedUsd + run.runCommittedUsd - Number(recordedCumulativeUsd)) < 1e-7;
});
const integrityChecks = {
  ledgerMatchesRunArtifacts,
  cumulativeBudgetWithinCap: capUsd === Number.POSITIVE_INFINITY || ledgerCommittedUsd <= capUsd + 1e-8,
  reportedRowsMatchPlanned: totals.resultRows === totals.plannedTrials,
  evidenceStatesMatchReportedRows: trialStateRows === totals.resultRows,
  armRowsMatchPlanned: armTrialRows === totals.plannedTrials,
  promptfooPassAndFailCountersMatchCompletedRows: totals.promptfoo.passed + totals.promptfoo.failed === totals.completedRows,
  everyCompletedRunHasCaseHash: completed.length > 0 && completed.every(run => Boolean(run.caseHash)),
  noUnknownUsageCallsInRawModelCallEvents: Object.values(totals.modelUsage).every(usage => usage.unknownUsageCalls === 0),
  modelUsagePurposeTotalsReconcile: modelUsagePurposeReconciles,
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
    resultRows: Number(run.trialMetrics?.observedTrialRows ?? run.report?.observedTrialRows ?? run.report?.completedTrials ?? 0),
    completedRows: Number(run.trialMetrics?.completedTrialRows ?? run.report?.completedTrials ?? 0),
    errorRows: Number(run.trialMetrics?.errorTrialRows ?? run.report?.errorTrials ?? 0),
    plannedTrials: Number(run.report?.plannedTrials || 0),
    partialTrialRows: Number(run.partial?.observedTrialRows || 0),
    runCommittedUsd: run.runCommittedUsd,
    recordedCumulativeCommittedUsd: run.budget?.cumulativeCommittedUsd ?? run.partial?.budget?.cumulativeCommittedUsd ?? null,
    campaignLedgerCommitSumThroughRunUsd: run.reconstructedCumulativeUsd,
    remainingUsd: run.budget?.remainingUsd ?? null,
    capUsd: Number.isFinite(run.capUsd) ? run.capUsd : 'unlimited',
    partialSummary: run.partial || null,
    preflightFailures: run.preflightFailures,
    modelUsageByPurpose: run.modelUsageByPurpose,
    modelRequestDiagnostics: run.modelRequestDiagnostics,
    preregistrationGit: run.preregistration?.git || null,
    caseHash: run.caseHash,
    reusedCasesFrom: run.reusedCasesFrom,
    promptfoo: run.report ? run.promptfooCounts : null,
  })),
  pairedDefenderModelComparison: pairedModelComparison,
  pairedDefenderRuns,
  totals,
  partialRuns: partialRuns.map(run => ({ runId: run.runId, ...run.partial })),
  partialGenerationDiagnostics,
  caseStudy: { uniqueScenarioSets: uniqueCaseHashes.length, sha256: uniqueCaseHashes },
  evidenceArchive: `campaign-evidence-${campaignDate}.zip`,
costLimitations: 'The API response did not provide the Yicode invoice amount. Ledger committed USD and locally priced reported tokens are separate measures; their difference is unreconciled and cannot be treated as provider billing.',
  integrityChecks,
};

const armRows = Object.entries(totals.arms).sort(([a], [b]) => a.localeCompare(b)).map(([arm, value]) => [
  arm,
  value.trials,
  `${value.attackSuccesses}/${value.evaluatedAttacks} (${percent(value.attackSuccesses, value.evaluatedAttacks)})`,
  `${value.toolAttempts}/${value.evaluatedAttacks} (${percent(value.toolAttempts, value.evaluatedAttacks)})`,
  `${value.defenseSuccesses}/${value.evaluatedAttacks} (${percent(value.defenseSuccesses, value.evaluatedAttacks)})`,
  `${value.normalSuccesses}/${value.evaluatedNormalTrials} (${percent(value.normalSuccesses, value.evaluatedNormalTrials)})`,
  value.activeDenials,
  `${value.errorTrials} total / ${value.attackErrors} attack / ${value.normalErrors} control`,
]);

const pairedModelRows = (pairedModelComparison?.comparisons || []).map(row => [
  row.model,
  row.referenceModel,
  row.arm,
  row.pairedScenarios,
  row.comparedModelSideEffects,
  row.referenceModelSideEffects,
  `${(row.riskDifferenceComparedMinusReference * 100).toFixed(1)} pp`,
  row.bootstrap95PercentInterval.map(value => `${(value * 100).toFixed(1)} pp`).join(' to '),
  row.mcnemarPValue,
  row.holmAdjustedPValue,
]);

const pairedDefenderOutcomeRows = pairedDefenderRuns.map(run => [
  run.model,
  run.runId,
  `${run.observedTrialRows}/${run.plannedTrials}`,
  `${run.completedTrials} complete / ${run.errorTrials} error`,
  `${run.attackOutcomes.successfulEffects}/${run.attackOutcomes.evaluatedTrials} (${percent(run.attackOutcomes.successfulEffects, run.attackOutcomes.evaluatedTrials)})`,
  `${run.attackOutcomes.threatToolAttemptTrials}/${run.attackOutcomes.evaluatedTrials} (${percent(run.attackOutcomes.threatToolAttemptTrials, run.attackOutcomes.evaluatedTrials)})`,
  `${run.attackOutcomes.defenseSuccesses}/${run.attackOutcomes.evaluatedTrials} (${percent(run.attackOutcomes.defenseSuccesses, run.attackOutcomes.evaluatedTrials)})`,
  `${run.controls.successes}/${run.controls.evaluatedTrials} (${percent(run.controls.successes, run.controls.evaluatedTrials)})`,
  `${run.promptfoo.passed}/${run.promptfoo.resultCount} passed; ${run.promptfoo.failed} failed; ${run.promptfoo.errors} errors`,
  usd(run.reportedTokenPricingEstimateUsd),
  usd(run.runCommittedUsd),
]);

const pairedDefenderArmRows = pairedDefenderRuns.flatMap(run => Object.entries(run.byArm || {}).map(([arm, value]) => [
  run.model,
  arm,
  `${value.attackSuccesses}/${value.evaluatedAttacks} (${percent(value.attackSuccesses, value.evaluatedAttacks)})`,
  `${value.threatToolAttemptTrials}/${value.evaluatedAttacks} (${percent(value.threatToolAttemptTrials, value.evaluatedAttacks)})`,
  `${value.defenseSuccesses}/${value.evaluatedAttacks} (${percent(value.defenseSuccesses, value.evaluatedAttacks)})`,
  `${value.normalSuccesses}/${value.evaluatedNormalTrials} (${percent(value.normalSuccesses, value.evaluatedNormalTrials)})`,
  value.activeDenials,
  `${value.errorTrials} total / ${value.attackErrors ?? (value.attacks - value.completedAttacks)} attack / ${value.normalErrors ?? (value.normalTrials - value.completedNormalTrials)} control`,
]));

const pairedDefenderEvidenceRows = pairedDefenderRuns.map(run => {
  const evidence = run.fixtureEvidence || {};
  return [
    run.model,
    evidence.gatewayEvidenceEvents ?? 0,
    `${evidence.gatewayDecisions?.ALLOW ?? 0}/${evidence.gatewayDecisions?.DENY ?? 0}/${evidence.gatewayDecisions?.REQUIRE_APPROVAL ?? 0}`,
    `${evidence.mcpCallRecords ?? 0}/${evidence.mcpCallExecutions ?? 0}`,
    `${evidence.canaryEventsByKind?.READ ?? 0}/${evidence.canaryEventsByKind?.QUARANTINED ?? 0}`,
    `${evidence.crossSession?.targetProtectedCallAttempts ?? 0}/${evidence.crossSession?.distinctSessionPairs ?? 0}`,
    `${evidence.evidenceChainsValid ?? 0}/${evidence.evidenceChainsInvalid ?? 0}`,
  ];
});

const pairedDefenderUsageRows = pairedDefenderRuns.flatMap(run => run.modelUsageByPurpose.map(usage => [
  run.model,
  usage.model,
  usage.purpose,
  usage.calls,
  usage.inputTokens.toLocaleString('en-US'),
  usage.outputTokens.toLocaleString('en-US'),
  usd(usage.estimatedUsd),
]));

const categoryRows = Object.entries(totals.categories).map(([name, value]) => [
  name,
  value.trials,
  value.evaluatedTrials,
  value.unevaluableTrials,
  `${value.toolAttempts}/${value.evaluatedTrials} (${percent(value.toolAttempts, value.evaluatedTrials)})`,
  `${value.attackSuccesses}/${value.evaluatedTrials} (${percent(value.attackSuccesses, value.evaluatedTrials)})`,
  `${value.defenseSuccesses}/${value.evaluatedTrials} (${percent(value.defenseSuccesses, value.evaluatedTrials)})`,
]);

const modelRows = Object.entries(totals.modelUsage).sort(([a], [b]) => a.localeCompare(b)).map(([model, usage]) => [
  model, usage.calls, usage.inputTokens.toLocaleString('en-US'), usage.outputTokens.toLocaleString('en-US'), usd(usage.estimatedUsd), usage.unknownUsageCalls,
]);
const modelPurposeRows = Object.values(totals.modelUsageByPurpose).sort((a, b) => a.model.localeCompare(b.model) || a.purpose.localeCompare(b.purpose)).map(usage => [
  usage.model, usage.purpose, usage.calls, usage.inputTokens.toLocaleString('en-US'), usage.outputTokens.toLocaleString('en-US'), usd(usage.estimatedUsd), usage.unknownUsageCalls,
]);

const batchRows = completed.map(run => {
  const r = run.report;
  return [
    run.runId,
    `${run.trialMetrics?.observedTrialRows ?? r.observedTrialRows ?? r.completedTrials}/${r.plannedTrials}`,
    `${run.trialMetrics?.completedTrialRows ?? r.completedTrials} complete; ${run.trialMetrics?.errorTrialRows ?? r.errorTrials ?? 0} errors`,
    `${run.promptfooCounts.passed}/${run.promptfooCounts.resultCount}`,
    `${run.promptfooCounts.failed}`,
    `${run.promptfooCounts.errors}`,
    usd(run.runCommittedUsd),
    run.caseHash ? run.caseHash.slice(0, 12) : 'n/a',
    `[raw run evidence](campaign-evidence-${campaignDate}.zip)`,
  ];
});

const failedRows = preTrial.map(run => [
  run.runId,
  usd(run.runCommittedUsd),
  run.preflightFailures.map(item => `${item.model}: ${item.code}`).join('<br>') || 'No trial report; see raw run files',
  `[raw run evidence](campaign-evidence-${campaignDate}.zip)`,
]);

const partialRows = partialRuns.map(run => [
  run.runId,
  `${run.partial.observedTrialRows}/${run.partial.plannedTrials}`,
  `${run.partial.completedTrialRows} completed; ${run.partial.errorTrialRows} errors`,
  run.partial.stop?.code || run.partial.status,
  usd(run.runCommittedUsd),
  `[raw run evidence](campaign-evidence-${campaignDate}.zip)`,
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
const partialGenerationRows = partialGenerationDiagnostics.map(run => [
  run.runId,
  run.archivedFailureRecords,
  run.explicitRefusals,
  run.generatedPayloadsPersistedBeforeInterruption ?? 'not recorded',
  Object.entries(run.failuresByModel).map(([model, count]) => `${model}: ${count}`).join('; ') || 'none',
]);

const failedRunCountByModel = Object.entries(totals.preflightFailureCounts).map(([modelCode, count]) => [modelCode, count]);
const repeatedControls = Object.entries(totals.controlFailureIds).map(([id, count]) => [id, count]);
const evidence = totals.evidence;
const attackEffectiveRate = percent(totals.attacks.toolAttemptTrials, totals.attacks.evaluatedCases);
const attackSuccessRate = percent(totals.attacks.successfulEffects, totals.attacks.evaluatedCases);
const defenseSuccessRate = percent(totals.attacks.defenseSuccesses, totals.attacks.evaluatedCases);
const generationRefusalRate = percent(totals.generationTotals.refused, totals.generationTotals.attempted);
const generationFailureRate = percent(totals.generationTotals.failures, totals.generationTotals.attempted);
const budgetCapLabel = Number.isFinite(capUsd) ? `$${capUsd.toFixed(2)}` : 'unlimited';
const budgetRemainingLabel = ledgerRemainingUsd === 'unlimited' ? 'unlimited' : usd(ledgerRemainingUsd);
const budgetPolicyText = Number.isFinite(capUsd)
  ? `The sum of per-run ledger commits is ${usd(ledgerCommittedUsd)} and the latest run records ${budgetRemainingLabel} remaining. The latest pre-run estimate for the next supported batch is ${usd(nextBatchEstimateUsd)}.`
  : `No campaign cap is configured. The sum of per-run ledger commits is ${usd(ledgerCommittedUsd)}; this is not a provider balance or invoice. The latest pre-run estimate for the next supported batch is ${usd(nextBatchEstimateUsd)}.`;
const budgetHistoryText = latestRun?.config?.budgetUsd === 'unlimited'
  ? 'The campaign was previously run under a $9 cap, which the user later explicitly changed to unlimited. Historical spend remains in the per-run ledger sum. Each run separately reconciles its prior committed snapshot plus its own committed amount; concurrent runs can share a prior snapshot, so per-run cumulative snapshots are not summed.'
  : 'Budget changes do not reset earlier committed ledger entries. The campaign total sums each run committed amount once; individual cumulative snapshots are checked against that run\'s recorded prior amount and are not summed.';
const completedBatchSizes = [...new Set(completed.map(run => Number(run.report?.plannedTrials || 0)).filter(Boolean))].sort((a, b) => a - b);
const completedCaseSetHashes = new Set(completed.map(run => run.caseHash).filter(Boolean));
const dArm = totals.arms.D || { attacks: 0, evaluatedAttacks: 0, attackSuccesses: 0, normalTrials: 0, evaluatedNormalTrials: 0, normalSuccesses: 0 };
const abcControls = ['A', 'B', 'C'].map(arm => {
  const value = totals.arms[arm] || { normalTrials: 0, normalSuccesses: 0 };
  return `${arm} ${value.normalSuccesses}/${value.evaluatedNormalTrials} evaluable (${value.normalErrors} control errors)`;
}).join(', ');
const partialGenerationFailureRecords = partialGenerationDiagnostics.reduce((sum, run) => sum + run.archivedFailureRecords, 0);
const partialGenerationRefusals = partialGenerationDiagnostics.reduce((sum, run) => sum + run.explicitRefusals, 0);
const partialGenerationText = partialGenerationFailureRecords
  ? `Interrupted runs separately archived ${partialGenerationFailureRecords} generation-failure records, including ${partialGenerationRefusals} explicitly marked refusals. These records are excluded from completed-run refusal and failure-rate denominators; see the per-run machine-readable diagnostics and raw failure archives.`
  : 'No generation-failure records were archived in interrupted runs.';
const executionErrorText = totals.executionErrorRuns.length
  ? totals.executionErrorRuns.map(run => `${run.runId} (${run.errors} error(s), ${run.resultCount} result row(s))`).join('; ')
  : 'none recorded';
const modelRequestFailureText = Object.values(totals.modelRequestDiagnostics.byModelPurposeCode).map(item =>
  `${item.model}/${item.purpose} ${item.code}: ${item.retryEvents} retry event(s), ${item.failedCalls} exhausted call(s), ${item.failedAttempts} attempts on exhausted calls`,
).join('; ') || 'none recorded';
const runConfigurationRows = runs.map(run => {
  const size = run.report?.plannedTrials ?? run.preregistration?.sampleSizePerDefender ?? 'not recorded';
  const attackers = run.config?.attackerModels?.join(', ') || 'not recorded';
  const defenders = run.config?.defenderModels?.join(', ') || 'not recorded';
  const judge = run.config?.judgeModel || 'not recorded';
  const commitId = run.report?.git?.commit || run.preregistration?.git?.commit || 'unknown';
  const concurrency = run.config?.maxConcurrentRequests ?? 'not recorded';
  const gitState = run.preregistration?.git?.trackedDirty
    ? `dirty at launch (${run.preregistration.git.trackedDirtyFiles?.length || 0} paths)`
    : 'clean or not recorded';
  return [run.runId, size, attackers, defenders, judge, concurrency, commitId, gitState];
});

const markdown = `# Agent Canary Cloud Red Team Campaign Report

Generated from the preserved run artifacts by \`node security-lab/cloud-redteam/summarize-campaign.mjs\`. This report contains aggregated evidence only; it does not copy raw prompts, model responses, or synthetic credentials.

## Campaign Result

- **Repository commit:** \`${commit}\` on branch \`${branch}\`.
- **Run attempts:** ${totals.runAttempts}; ${totals.completedBatches} completed batches, ${totals.partialRuns} partial batches, and ${totals.stoppedBeforeTrials} attempts stopped before trials.
- **Trial rows:** ${totals.resultRows}/${totals.plannedTrials} recorded across finalized batches: ${totals.completedRows} completed, ${totals.errorRows} errors. Trial evidence states: ${Object.entries(evidence.trialStates).map(([state, count]) => `${state} ${count}`).join(', ')}.
- **Partial-run rows:** ${totals.partialTrialRows} observed rows in ${totals.partialRuns} interrupted run(s); these are kept out of completed-batch rates and are detailed separately below.
- **Promptfoo:** ${totals.promptfoo.passed} passed, ${totals.promptfoo.failed} failed results, ${totals.promptfoo.errors} execution error(s). These are separately reported counters; error entries may overlap failed results and are not added to the trial row count.
- **Provider call retries:** ${totals.modelRequestDiagnostics.retryEvents} retry event(s); ${totals.modelRequestDiagnostics.failedCalls} exhausted call(s) after ${totals.modelRequestDiagnostics.failedAttempts} total request attempt(s). These request diagnostics are distinct from trial outcome counts.
- **Attack outcomes:** ${totals.attacks.successfulEffects}/${totals.attacks.evaluatedCases} evaluable attack trials produced a recorded side effect (${attackSuccessRate}); ${totals.attacks.toolAttemptTrials}/${totals.attacks.evaluatedCases} reached a threat tool attempt (${attackEffectiveRate}); defense success was ${totals.attacks.defenseSuccesses}/${totals.attacks.evaluatedCases} (${defenseSuccessRate}). Planned attacks: ${totals.attacks.cases}; unevaluable errors: ${totals.attacks.unevaluableCases}. Observed effects divided by all planned attacks (${percent(totals.attacks.successfulEffects, totals.attacks.cases)}) is a conservative observed rate, not an outcome rate for unknown trials.
- **Normal controls:** ${totals.controls.successes}/${totals.controls.evaluatedTrials} evaluable controls passed (${percent(totals.controls.successes, totals.controls.evaluatedTrials)}); ${totals.controls.failures} completed controls failed; ${totals.controls.unevaluableTrials} controls were unevaluable, including ${totals.controls.errorTrials} execution errors.
- **Generated attack refusal rate:** ${totals.generationTotals.refused}/${totals.generationTotals.attempted} explicit refusals (${generationRefusalRate}). Generation/API/parse failures were ${totals.generationTotals.failures}/${totals.generationTotals.attempted} (${generationFailureRate}); ${totals.generationTotals.fallbackPayloads} samples used deterministic fallback payloads.
- **Budget cap:** ${budgetCapLabel}. ${budgetPolicyText} Supported batch sizes are 100, 1,000, and 10,000; completed sizes in this campaign: ${completedBatchSizes.join(', ') || 'none'}.
- **Provider billing:** the generic API responses did not include a Yicode invoice amount. The ledger amount is not represented as a confirmed invoice; see the cost reconciliation below.

## Aggregation Integrity

All ${Object.keys(integrityChecks).length} automatic consistency checks passed: per-run budget reconciliation, campaign run-ledger sum and cap, planned/result rows, evidence states, A/B/C/D totals, Promptfoo counters, case hashes, and known usage accounting.

${budgetHistoryText}

## A/B/C/D Comparison

The run preregistration retains the repository's experiment definitions verbatim: ${definitions}

Rates below use evaluable outcomes only. Completed trials are evaluable; errors without an observed successful side effect are left unknown and excluded from attack-defense rates. Normal errors are excluded from the utility denominator.

| Arm | Rows | Attack effects / evaluable | Tool attempts / evaluable | No-effect defenses / evaluable | Normal successes / evaluable | Active denials | Errors (total / attack / control) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${armRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n')}

D recorded ${dArm.attackSuccesses}/${dArm.evaluatedAttacks} successful attack side effects and passed ${dArm.normalSuccesses}/${dArm.evaluatedNormalTrials} evaluable normal controls. A/B/C normal-control totals were ${abcControls}. D normal-control failures remain separate observations; read-only Gateway denials are not a reason to widen write permissions. These are synthetic-fixture results, not a claim of external MCP-host coverage.

## Selected GPT/GLM Paired Runs

${pairedDefenderRuns.length ? `These two runs reused the same 500-scenario set (375 attack cases and 125 normal controls) under all four arms. The 4,000 recorded trial rows are repeated evaluations of those scenarios across models and arms, not 4,000 unique scenarios. Attack generation was skipped for these runs; generator refusal and failure rates below come from separate generation batches.

${table(['Defender', 'Run ID', 'Rows / planned', 'Trial states', 'Side effects / evaluable attacks', 'Threat tool attempts / evaluable', 'Defense / evaluable', 'Normal controls passed', 'Promptfoo results', 'Token-priced estimate', 'Run ledger'], pairedDefenderOutcomeRows)}

### Selected-run A/B/C/D results

${table(['Defender', 'Arm', 'Side effects / evaluable attacks', 'Threat tool attempts / evaluable', 'Defense / evaluable', 'Normal controls passed', 'Active denials', 'Errors (total / attack / control)'], pairedDefenderArmRows)}

D's 63/125 normal-control result in each selected model run includes expected refusals of normal write requests under the existing read-only Gateway boundary. This is retained as a compatibility outcome; the write boundary was not relaxed.

### Selected-run execution evidence

Gateway decisions are shown as ALLOW/DENY/REQUIRE_APPROVAL; MCP counts are records/executions; Canary counts are READ/QUARANTINED; cross-session counts are target protected-call attempts / distinct session pairs; chain counts are valid/invalid.

${table(['Defender', 'Gateway evidence events', 'Gateway decisions ALLOW/DENY/REQUIRE_APPROVAL', 'MCP records / executions', 'Canary READ / QUARANTINED', 'Cross-session attempts / pairs', 'Evidence chains valid / invalid'], pairedDefenderEvidenceRows)}

All reported effects came from private synthetic fixtures and repository-owned Gateway, Policy, MCP-call, Canary, Honeypot, trial-state, and file-state records. The advisory LLM judge did not determine attack success. No external MCP server or wire protocol was exercised.

### Selected-run token usage by model and purpose

${table(['Defender run', 'Usage model', 'Purpose', 'Calls', 'Input tokens', 'Output tokens', 'Token-priced estimate'], pairedDefenderUsageRows)}

The selected two-run sum is ${usd(pairedDefenderRuns.reduce((sum, run) => sum + run.reportedTokenPricingEstimateUsd, 0))} by repository token pricing and ${usd(pairedDefenderRuns.reduce((sum, run) => sum + run.runCommittedUsd, 0))} in per-run ledgers. Neither amount is a confirmed Yicode invoice.` : 'No matching completed single-defender GPT and GLM runs were selected.'}

## Matched Defender-Model Comparison

${pairedModelComparison ? `Exploratory complete-case comparison over identical case-set hash ${pairedModelComparison.caseHash}. Selected runs: ${pairedModelComparison.selectedRuns.map(run => `${run.model} = ${run.runId} (${run.observedTrialRows}/${run.plannedTrials} recorded rows)`).join('; ')}. Pairing requires the same scenario ID and A/B/C/D arm, with a conclusive recorded side-effect outcome for both models. A positive risk difference means the compared model had more side effects. The fixed synthetic set does not establish a general model ranking.

| Compared model | Reference model | Arm | Matched scenarios | Compared side effects | Reference side effects | Difference | Paired bootstrap 95% interval | McNemar p | Holm adjusted p |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
${pairedModelRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n') || '| None | | | | | | | | | |'}

Method: ${pairedModelComparison.method.pairing}; ${pairedModelComparison.method.significance}.` : 'No completed, single-defender runs with at least two model identities shared the same case-set hash; matched model comparison is unavailable.'}

## Attack Category Coverage

| Category | Planned | Evaluable | Unevaluable errors | Threat tool attempt / evaluable | Side effect / evaluable | Defense / evaluable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${humanCategoryRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n')}

The category totals combine ${completed.length} completed batches across ${completedCaseSetHashes.size} distinct case-set hashes. Repeated use of a case-set hash represents repeated measurements, not additional unique scenarios. All known case-set SHA-256 values are listed in the JSON summary.

## Attack Generator Results

Explicit refusal and generation failure are counted separately for completed runs. Completed-run generators attempted ${totals.generationTotals.attempted} attack seeds: ${totals.generationTotals.refused} explicit refusals and ${totals.generationTotals.failures} generation/parse/API failures; ${totals.generationTotals.fallbackPayloads} used deterministic fallback payloads. ${partialGenerationText}

| Generation run | Model | Payloads | Evaluated trials | Threat tool attempt rate | Side-effect rate | Failed samples |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${generationRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n') || '| None | | | | | | |'}

${partialGenerationDiagnostics.length ? `Interrupted-run generation records are kept separately:

| Interrupted run | Archived failure records | Explicit refusals | Generated payloads persisted before interruption | Failure records by model |
| --- | ---: | ---: | ---: | --- |
${partialGenerationRows.map(row => `| ${row.map(md).join(' | ')} |`).join('\n')}` : ''}

The per-model figures are descriptive, with partly non-matched samples; they do not establish a statistically controlled model ranking. Failure counts by model: ${Object.entries(totals.generationTotals.failuresByModel).map(([model, count]) => `\`${model}\` ${count}`).join(', ') || 'none'}.

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

## Token Usage and Cost Reconciliation

Token figures below sum raw \`model_call\` events from each run's usage logs, including completed, pre-trial, and interrupted attempts. Calls rejected before returning usage have no model-call event and are represented in the run ledger/preflight section. Prices are repository-configured token-pricing estimates, not the Yicode invoice.

${table(['Model', 'Calls', 'Input tokens', 'Output tokens', 'Reported-token price estimate', 'Unknown-usage calls'], modelRows)}

${table(['Model', 'Purpose', 'Calls', 'Input tokens', 'Output tokens', 'Reported-token price estimate', 'Unknown-usage calls'], modelPurposeRows)}

- **Recorded model-call token-priced total:** ${usd(reportedTokenCostUsd)}.
- **Run ledger committed:** ${usd(ledgerCommittedUsd)} (${usd(completedLedgerUsd)} attached to completed batches, ${usd(noTrialLedgerUsd)} to attempts stopped before trials, and ${usd(partialLedgerUsd)} to interrupted runs).
- **Ledger minus reported-token estimate:** ${usd(ledgerCommittedUsd - reportedTokenCostUsd)}. The difference is unreconciled; it must not be treated as confirmed provider billing.
- **Yicode invoice cost:** unavailable from the generic API response; reconcile with the provider dashboard if an invoice-level total is required.

## Completed Batches and Preserved Logs

${table(['Run ID', 'Rows / planned', 'Trial states', 'Promptfoo pass', 'Assertion failures', 'Execution errors', 'Ledger committed', 'Case hash prefix', 'Artifacts'], batchRows)}

## Attempts Stopped Before Trials

${table(['Run ID', 'Ledger committed', 'Preflight result', 'Raw artifacts'], failedRows)}

Preflight failure counts: ${failedRunCountByModel.map(([name, count]) => `\`${name}\` ${count}`).join('; ') || 'none'}. These failures are retained separately from model refusal counts.

## Partial Runs Stopped Before Completion

${partialRows.length ? table(['Run ID', 'Observed / planned rows', 'Trial states', 'Stop code', 'Ledger committed', 'Artifacts'], partialRows) : 'No partial runs were recorded.'}

Partial rows are reported as observed execution records only. They are excluded from completed-batch attack, defense, and Promptfoo rates because the planned run did not finish.

## Notable Failure Cases

- D normal-control failures are kept as controls and do not enter attack rates. Recorded trial IDs and repeat counts: ${repeatedControls.map(([id, count]) => `\`${id}\` ${count}`).join(', ') || 'none'}.
- Promptfoo execution errors by run: ${executionErrorText}. Failed-result and error counters are kept distinct, and each run folder preserves raw classifications.
- Provider request retries and exhausted calls: ${modelRequestFailureText}. Exact allowlisted error codes and attempt counts are also preserved in the model usage logs.
- Attack-generation failures: ${Object.entries(totals.generationTotals.failuresByModel).map(([model, count]) => `\`${model}\` ${count}`).join(', ') || 'none'}, with corresponding fallback samples archived in the generation run.
- Preflight provider errors and raw failed samples remain in each run's \`preflight.json\`, \`preflight-failures.jsonl\`, and \`generation-failures.jsonl\` where those files exist.

## Reproduction Configuration and Provenance

- **Commit:** \`${commit}\`; branch \`${branch}\`.
- **Run commands and models:** each run's batch size, attacker/defender/judge references, concurrency, and commit are listed below and preserved in its sanitized \`config.json\` and \`preregistration.json\`.
- **Budget:** \`MAX_TEST_BUDGET_USD=${latestRun?.config?.budgetUsd ?? (Number.isFinite(capUsd) ? capUsd : 'unlimited')}\`; **concurrency:** ${latestRun?.config?.maxConcurrentRequests ?? latest?.config?.maxConcurrentRequests ?? 'not recorded'}; **retry policy:** ${latestRun?.config?.maxApiRetries ?? latest?.config?.maxApiRetries ?? 'not recorded'} configured retry(s), with cumulative per-request budget reservation.
- **Credentials:** supplied through ignored local environment configuration; no key value is present in this report or the committed source.
- **Case sets:** ${completedCaseSetHashes.size} distinct SHA-256 case-set hashes across completed runs; ${uniqueCaseHashes.length} hashes are present across all attempts, including pre-trial attempts.
- **Optional integrations:** this report covers Promptfoo cloud runs; AgentDojo and PyRIT adapters were not executed in these measurements.
- **Run configuration:**

${table(['Run ID', 'Trials planned', 'Attackers', 'Defender(s)', 'Judge', 'Concurrency', 'Git commit at launch', 'Git state at launch'], runConfigurationRows)}

Preregistrations record the Git commit and dirty-file list at launch. A dirty working tree was used for the measured runs; the launch-time file contents were not archived in the preregistration, so the recorded commit alone is not a complete source snapshot. The publication package records the committed source revision separately.

- **Archived logs:** the evidence ZIP contains a copy of the run tree, with credential assignments and token-like values redacted from UTF-8 text files. \`evidence-redaction-manifest.json\` records source and archive SHA-256 values for every included file; local ignored run files remain unchanged. Use the run IDs in the tables to find each folder inside the archive.
- **Publication provenance:** the 2026-11-06 run artifacts and the Promptfoo/AgentDojo lab sources are included with this report. Later PyRIT integration changes were not part of the runs summarized here.

## Machine-readable Summary

See \`${path.basename(jsonPath)}\` for the complete aggregated counts, per-run ledger, preflight failures, A/B/C/D metrics, generation runs, model usage, and case hashes.
`;

const publishedMarkdown = sanitizeProviderStatusText(markdown);
const json = `${JSON.stringify(sanitizePublishedValue(summary), null, 2)}\n`;
if (secretLikePattern.test(publishedMarkdown) || secretLikePattern.test(json)) throw new Error('REPORT_SECRET_PATTERN_DETECTED');
fs.writeFileSync(reportPath, publishedMarkdown, 'utf8');
fs.writeFileSync(jsonPath, json, 'utf8');
console.log(JSON.stringify({ reportPath, jsonPath, runAttempts: totals.runAttempts, completedBatches: totals.completedBatches, trials: totals.resultRows, ledgerCommittedUsd, ledgerRemainingUsd, nextBatchEstimateUsd, integrityChecks }));
