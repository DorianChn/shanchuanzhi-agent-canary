import { createHash } from 'node:crypto';
import { isAttackOutcomeEvaluable } from './trial-statistics.mjs';

function seededRandom(seedText) {
  const digest = createHash('sha256').update(seedText).digest();
  let state = digest.readUInt32BE(0) || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function percentile(sorted, probability) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function bootstrapInterval(differences, seedText, resamples) {
  if (!differences.length) return null;
  const random = seededRandom(seedText);
  const means = new Array(resamples);
  for (let sample = 0; sample < resamples; sample++) {
    let total = 0;
    for (let i = 0; i < differences.length; i++) total += differences[Math.floor(random() * differences.length)];
    means[sample] = total / differences.length;
  }
  means.sort((a, b) => a - b);
  return [percentile(means, 0.025), percentile(means, 0.975)];
}

function exactMcNemarP(improvementPairs, regressionPairs) {
  const discordant = improvementPairs + regressionPairs;
  if (!discordant) return 1;
  const tailCount = Math.min(improvementPairs, regressionPairs);
  let probability = 2 ** -discordant;
  let tail = probability;
  for (let k = 1; k <= tailCount; k++) {
    probability *= (discordant - k + 1) / k;
    tail += probability;
  }
  return Math.min(1, 2 * tail);
}

function holmAdjust(rows) {
  const ordered = [...rows].sort((a, b) => a.mcnemarPValue - b.mcnemarPValue);
  let prior = 0;
  ordered.forEach((row, index) => {
    prior = Math.max(prior, Math.min(1, (ordered.length - index) * row.mcnemarPValue));
    row.holmAdjustedPValue = prior;
  });
}

/** Paired comparison by identical synthetic scenario and defender model. Positive deltas favor referenceArm. */
export function pairedAttackComparisons(trials, {
  referenceArm = 'D',
  compareArms = ['A', 'B', 'C'],
  bootstrapResamples = 20_000,
} = {}) {
  if (!Array.isArray(trials) || !Number.isInteger(bootstrapResamples) || bootstrapResamples < 1) throw new Error('PAIRED_ANALYSIS_INPUT_INVALID');
  const groups = new Map();
  for (const trial of trials) {
    if (!isAttackOutcomeEvaluable(trial) || typeof trial.attackSuccess !== 'boolean' || typeof trial.scenarioId !== 'string' || typeof trial.model !== 'string' || typeof trial.arm !== 'string') continue;
    const key = `${trial.model}\0${trial.scenarioId}`;
    const group = groups.get(key) ?? { model: trial.model, scenarioId: trial.scenarioId, arms: new Map() };
    const entries = group.arms.get(trial.arm) ?? [];
    entries.push(trial);
    group.arms.set(trial.arm, entries);
    groups.set(key, group);
  }

  const results = [];
  for (const group of groups.values()) {
    if (group.arms.get(referenceArm)?.length !== 1) continue;
    const reference = group.arms.get(referenceArm)[0];
    for (const arm of compareArms) {
      const entries = group.arms.get(arm);
      if (entries?.length !== 1) continue;
      const baseline = entries[0];
      results.push({ model: group.model, arm, scenarioId: group.scenarioId, baselineSuccess: baseline.attackSuccess, referenceSuccess: reference.attackSuccess, difference: Number(baseline.attackSuccess) - Number(reference.attackSuccess) });
    }
  }

  const comparisons = [];
  const models = [...new Set(results.map(row => row.model))].sort();
  for (const model of models) {
    const rows = [];
    for (const arm of compareArms) {
      const pairs = results.filter(row => row.model === model && row.arm === arm).sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
      if (!pairs.length) continue;
      const differences = pairs.map(row => row.difference);
      const improvementPairs = differences.filter(value => value === 1).length;
      const regressionPairs = differences.filter(value => value === -1).length;
      const meanDifference = differences.reduce((sum, value) => sum + value, 0) / differences.length;
      const seedText = `${model}|${arm}|${referenceArm}|${pairs.map(row => `${row.scenarioId}:${Number(row.baselineSuccess)}:${Number(row.referenceSuccess)}`).join('|')}`;
      rows.push({
        model,
        arm,
        referenceArm,
        pairedScenarios: pairs.length,
        armSideEffects: pairs.filter(row => row.baselineSuccess).length,
        referenceSideEffects: pairs.filter(row => row.referenceSuccess).length,
        riskDifferenceArmMinusReference: meanDifference,
        bootstrap95PercentInterval: bootstrapInterval(differences, seedText, bootstrapResamples),
        improvementPairs,
        regressionPairs,
        ties: pairs.length - improvementPairs - regressionPairs,
        mcnemarPValue: exactMcNemarP(improvementPairs, regressionPairs),
      });
    }
    holmAdjust(rows);
    comparisons.push(...rows);
  }

  return {
    method: {
      pairing: 'same defender model and exact scenarioId across experiment arms; completed trials and errors with an observed successful side effect are evaluable',
      outcome: 'recorded synthetic fixture side effect (attackSuccess)',
      difference: 'comparison arm side-effect rate minus reference arm side-effect rate; positive favors reference arm',
      interval: `paired percentile bootstrap, 95%, ${bootstrapResamples} resamples, deterministic seed derived from paired rows`,
      significance: 'two-sided exact McNemar test with Holm adjustment across comparison arms within each defender model',
      interpretation: 'Complete-case matched arm differences; errors without an observed side effect are excluded. A/B/C/D are distinct preregistered configurations, not a before-after causal estimate.',
    },
    comparisons,
  };
}

/** Paired defender-model comparison on identical synthetic cases and experiment arms. */
export function pairedDefenderModelComparisons(trials, {
  referenceModel = null,
  compareModels = null,
  compareArms = ['A', 'B', 'C', 'D'],
  bootstrapResamples = 20_000,
} = {}) {
  if (!Array.isArray(trials) || !Number.isInteger(bootstrapResamples) || bootstrapResamples < 1) throw new Error('PAIRED_MODEL_ANALYSIS_INPUT_INVALID');
  const observedModels = [...new Set(trials.map(trial => trial?.model).filter(model => typeof model === 'string'))].sort();
  const baseline = referenceModel ?? observedModels[0] ?? null;
  if (!baseline || !observedModels.includes(baseline)) throw new Error('PAIRED_MODEL_REFERENCE_INVALID');
  const comparedModels = compareModels ?? observedModels.filter(model => model !== baseline);
  if (!Array.isArray(comparedModels) || comparedModels.some(model => !observedModels.includes(model) || model === baseline)) throw new Error('PAIRED_MODEL_COMPARISON_INVALID');

  const groups = new Map();
  for (const trial of trials) {
    if (!isAttackOutcomeEvaluable(trial) || trial.attack !== true || typeof trial.attackSuccess !== 'boolean'
      || typeof trial.scenarioId !== 'string' || typeof trial.model !== 'string' || typeof trial.arm !== 'string') continue;
    const key = `${trial.arm}\0${trial.scenarioId}`;
    const group = groups.get(key) ?? { arm: trial.arm, scenarioId: trial.scenarioId, models: new Map() };
    const entries = group.models.get(trial.model) ?? [];
    entries.push(trial);
    group.models.set(trial.model, entries);
    groups.set(key, group);
  }

  const pairedRows = new Map(comparedModels.map(model => [model, new Map(compareArms.map(arm => [arm, []]))]));
  for (const group of groups.values()) {
    const referenceEntries = group.models.get(baseline);
    if (referenceEntries?.length !== 1 || !compareArms.includes(group.arm)) continue;
    for (const model of comparedModels) {
      const entries = group.models.get(model);
      if (entries?.length !== 1) continue;
      pairedRows.get(model).get(group.arm).push({
        scenarioId: group.scenarioId,
        comparedSuccess: entries[0].attackSuccess,
        referenceSuccess: referenceEntries[0].attackSuccess,
      });
    }
  }

  const comparisons = [];
  for (const model of comparedModels) {
    const rows = [];
    for (const arm of compareArms) {
      const pairs = pairedRows.get(model).get(arm).sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
      if (!pairs.length) continue;
      const differences = pairs.map(pair => Number(pair.comparedSuccess) - Number(pair.referenceSuccess));
      const comparedModelMoreSuccessfulPairs = differences.filter(value => value === 1).length;
      const referenceModelMoreSuccessfulPairs = differences.filter(value => value === -1).length;
      const riskDifferenceComparedMinusReference = differences.reduce((sum, value) => sum + value, 0) / differences.length;
      const seedText = `${baseline}|${model}|${arm}|${pairs.map(pair => `${pair.scenarioId}:${Number(pair.comparedSuccess)}:${Number(pair.referenceSuccess)}`).join('|')}`;
      rows.push({
        model,
        referenceModel: baseline,
        arm,
        pairedScenarios: pairs.length,
        comparedModelSideEffects: pairs.filter(pair => pair.comparedSuccess).length,
        referenceModelSideEffects: pairs.filter(pair => pair.referenceSuccess).length,
        riskDifferenceComparedMinusReference,
        bootstrap95PercentInterval: bootstrapInterval(differences, seedText, bootstrapResamples),
        comparedModelMoreSuccessfulPairs,
        referenceModelMoreSuccessfulPairs,
        ties: pairs.length - comparedModelMoreSuccessfulPairs - referenceModelMoreSuccessfulPairs,
        mcnemarPValue: exactMcNemarP(comparedModelMoreSuccessfulPairs, referenceModelMoreSuccessfulPairs),
      });
    }
    holmAdjust(rows);
    comparisons.push(...rows);
  }

  return {
    method: {
      pairing: 'same synthetic scenarioId and experiment arm across defender models; only evaluable recorded side-effect outcomes are included',
      outcome: 'recorded synthetic fixture side effect (attackSuccess)',
      difference: 'compared-model side-effect rate minus reference-model side-effect rate; positive means more attack effects for the compared model',
      interval: `paired percentile bootstrap, 95%, ${bootstrapResamples} resamples, deterministic seed derived from matched rows`,
      significance: 'two-sided exact McNemar test with Holm adjustment across arms within each model comparison',
      interpretation: 'Exploratory matched comparison on the fixed synthetic case set; it describes these runs and does not establish a general model ranking.',
    },
    comparisons,
  };
}
