const finiteTokens = value => Number.isSafeInteger(value) && value >= 0;

export function estimateUpperBoundTokens(value, multiplier = 2) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const utf8Bytes = Buffer.byteLength(serialized ?? '', 'utf8');
  return Math.ceil(utf8Bytes * multiplier) + 128;
}

export function priceFor(modelPrices, modelRef) {
  const price = modelPrices?.[modelRef.ref.toLowerCase()] ?? modelPrices?.[modelRef.model.toLowerCase()];
  if (!price) throw new Error(`PRICE_UNKNOWN_${modelRef.ref}`);
  return price;
}

export function estimateRequestUsd({ modelPrices, modelRef, inputTokens, outputTokens }) {
  if (!finiteTokens(inputTokens) || !finiteTokens(outputTokens)) throw new Error('TOKEN_ESTIMATE_INVALID');
  const price = priceFor(modelPrices, modelRef);
  return (inputTokens * price.inputUsdPer1M + outputTokens * price.outputUsdPer1M) / 1_000_000;
}

export function estimateExperiment({ config, caseCount, arms = 4, turns = 4, attackerCalls = 0, judgeCalls = 0, inputTokensPerTurn = 12_000, judgeInputTokens = 2_000, protocolProbeInputTokens = 8_000, protocolProbeOutputTokens = 8, providerOverheadTokens = 8_000 }) {
  if (!Number.isInteger(caseCount) || caseCount < 1 || !Number.isInteger(arms) || arms < 1 || !Number.isInteger(turns) || turns < 1) throw new Error('EXPERIMENT_SIZE_INVALID');
  if (!config.maxTestBudgetUsd) throw new Error('CONFIG_REQUIRED_MAX_TEST_BUDGET_USD');
  if (!config.modelPrices) throw new Error('CONFIG_REQUIRED_MODEL_PRICING_JSON');
  const entries = [];
  const add = (role, model, requests, inputTokens, outputTokens) => {
    if (!model || requests < 1) return;
    const each = estimateRequestUsd({ modelPrices: config.modelPrices, modelRef: model, inputTokens, outputTokens });
    entries.push({ role, model: model.ref, requests, inputTokensEach: inputTokens, outputTokensEach: outputTokens, estimatedUsd: each * requests });
  };
  const defenderRequests = caseCount * arms * turns;
  const defenderInput = inputTokensPerTurn + providerOverheadTokens;
  const defenderModels = config.defenderModels?.length ? config.defenderModels : config.defenderModel ? [config.defenderModel] : [];
  for (const model of defenderModels) add('defender', model, defenderRequests * (1 + config.maxApiRetries), defenderInput, config.maxOutputTokens);
  for (const model of config.attackerModels) add('attacker', model, attackerCalls ? Math.ceil(attackerCalls / config.attackerModels.length) * (1 + config.maxApiRetries) : 0, 8_000 + providerOverheadTokens, config.maxOutputTokens);
  add('judge', config.judgeModel, judgeCalls * defenderModels.length * (1 + config.maxApiRetries), Math.max(judgeInputTokens, 8_000) + providerOverheadTokens, 256);
  const protocolProbes = new Map();
  for (const model of [...config.attackerModels, ...defenderModels, ...(judgeCalls ? [config.judgeModel] : [])].filter(Boolean)) protocolProbes.set(model.ref, model);
  for (const model of protocolProbes.values()) add('protocol-probe', model, (model ? 2 * (1 + config.maxApiRetries) : 0), protocolProbeInputTokens, protocolProbeOutputTokens);
  const totalUsd = entries.reduce((sum, item) => sum + item.estimatedUsd, 0);
  return { caseCount, arms, turns, maxConcurrentRequests: config.maxConcurrentRequests, retryMultiplier: 1 + config.maxApiRetries, entries, estimatedUsd: Number(totalUsd.toFixed(8)), budgetUsd: Number.isFinite(config.maxTestBudgetUsd) ? config.maxTestBudgetUsd : 'unlimited', withinBudget: totalUsd <= config.maxTestBudgetUsd };
}

export function estimateEmpiricalExperiment({ config, caseCount, arms = 4, defenderModels, attackerCalls = 0, judgeModel = config.judgeModel, baselineTokensPerTrial, safetyFactor = 1.5, judgeInputTokens = 8_000, judgeOutputTokens = 256, probeInputTokens = 8_000, probeOutputTokens = 8 }) {
  if (!Number.isInteger(caseCount) || caseCount < 1 || !Number.isInteger(arms) || arms < 1) throw new Error('EXPERIMENT_SIZE_INVALID');
  if (!Array.isArray(defenderModels) || !defenderModels.length) throw new Error('DEFENDER_MODELS_REQUIRED');
  if (!baselineTokensPerTrial || !finiteTokens(baselineTokensPerTrial.inputTokens) || !finiteTokens(baselineTokensPerTrial.outputTokens)) throw new Error('EMPIRICAL_TOKEN_BASELINE_REQUIRED');
  if (!Number.isFinite(safetyFactor) || safetyFactor < 1) throw new Error('EMPIRICAL_SAFETY_FACTOR_INVALID');
  if (!config.modelPrices || (!Number.isFinite(config.maxTestBudgetUsd) && config.maxTestBudgetUsd !== Number.POSITIVE_INFINITY)) throw new Error('BUDGET_AND_MODEL_PRICES_REQUIRED');

  const entries = [];
  const add = (role, model, requests, inputEach, outputEach) => {
    if (!model || requests < 1) return;
    const inputTokens = Math.ceil(requests * inputEach * safetyFactor);
    const outputTokens = Math.ceil(requests * outputEach * safetyFactor);
    const estimatedUsd = estimateRequestUsd({ modelPrices: config.modelPrices, modelRef: model, inputTokens, outputTokens });
    entries.push({ role, model: model.ref, requests, inputTokensEach: inputEach, outputTokensEach: outputEach, estimatedInputTokens: inputTokens, estimatedOutputTokens: outputTokens, estimatedUsd: Number(estimatedUsd.toFixed(8)) });
  };

  const defenderTrials = caseCount * arms;
  for (const model of defenderModels) add('defender-empirical', model, defenderTrials, baselineTokensPerTrial.inputTokens, baselineTokensPerTrial.outputTokens);
  add('judge-advisory', judgeModel, defenderTrials * defenderModels.length, judgeInputTokens, judgeOutputTokens);
  const attackerModels = config.attackerModels ?? [];
  for (let i = 0; i < attackerModels.length; i++) {
    const requests = Math.floor(attackerCalls / attackerModels.length) + Number(i < attackerCalls % attackerModels.length);
    add('attack-generation', attackerModels[i], requests, 8_000, config.maxOutputTokens);
  }
  const models = new Map();
  for (const model of [...attackerModels, ...defenderModels, ...(judgeModel ? [judgeModel] : [])]) models.set(model.ref, model);
  for (const model of models.values()) add('protocol-probe', model, 1, probeInputTokens, probeOutputTokens);

  const estimatedUsd = entries.reduce((sum, entry) => sum + entry.estimatedUsd, 0);
  const estimatedInputTokens = entries.reduce((sum, entry) => sum + entry.estimatedInputTokens, 0);
  const estimatedOutputTokens = entries.reduce((sum, entry) => sum + entry.estimatedOutputTokens, 0);
  return {
    caseCount, arms, defenderModels: defenderModels.map(model => model.ref),
    maxConcurrentRequests: config.maxConcurrentRequests,
    retryPolicy: { configuredRetries: config.maxApiRetries, perRequestBudgetReservationEnforced: true },
    baselineTokensPerTrial,
    safetyFactor,
    entries,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedUsd: Number(estimatedUsd.toFixed(8)),
    budgetUsd: Number.isFinite(config.maxTestBudgetUsd) ? config.maxTestBudgetUsd : 'unlimited',
    withinBudget: config.maxTestBudgetUsd === Number.POSITIVE_INFINITY || estimatedUsd <= config.maxTestBudgetUsd,
    estimateBasis: 'Empirical completed-run token usage per defender trial, scaled by the safety factor; judge, generator, and compatibility probes use explicit token allowances. The per-request ledger is the hard cumulative cap.',
  };
}

export class BudgetLedger {
  #nextId = 0;
  #reservations = new Map();
  #settledUsd = 0;
  #overBudget = false;

  constructor({ modelPrices, maxTestBudgetUsd }) {
    if ((!Number.isFinite(maxTestBudgetUsd) && maxTestBudgetUsd !== Number.POSITIVE_INFINITY) || maxTestBudgetUsd <= 0) throw new Error('CONFIG_REQUIRED_MAX_TEST_BUDGET_USD');
    if (!modelPrices) throw new Error('CONFIG_REQUIRED_MODEL_PRICING_JSON');
    this.modelPrices = modelPrices;
    this.maxTestBudgetUsd = maxTestBudgetUsd;
  }

  get spentUsd() { return Number((this.#settledUsd + [...this.#reservations.values()].reduce((sum, item) => sum + item.reservedUsd, 0)).toFixed(8)); }
  get settledUsd() { return Number(this.#settledUsd.toFixed(8)); }
  get stopped() { return this.#overBudget || (Number.isFinite(this.maxTestBudgetUsd) && this.spentUsd >= this.maxTestBudgetUsd); }

  reserve(modelRef, inputTokens, outputTokens, purpose) {
    if (this.stopped) throw new Error('BUDGET_LIMIT_REACHED');
    const reservedUsd = estimateRequestUsd({ modelPrices: this.modelPrices, modelRef, inputTokens, outputTokens });
    if (this.spentUsd + reservedUsd > this.maxTestBudgetUsd) throw new Error('BUDGET_LIMIT_WOULD_BE_EXCEEDED');
    const id = ++this.#nextId;
    this.#reservations.set(id, { model: modelRef.ref, inputTokens, outputTokens, purpose, reservedUsd });
    return id;
  }

  settle(id, usage) {
    const reservation = this.#reservations.get(id);
    if (!reservation) throw new Error('BUDGET_RESERVATION_UNKNOWN');
    this.#reservations.delete(id);
    const input = usage?.inputTokens;
    const output = usage?.outputTokens;
    if (!finiteTokens(input) || !finiteTokens(output)) {
      this.#settledUsd += reservation.reservedUsd;
      return { known: false, chargedUsd: reservation.reservedUsd, reservedUsd: reservation.reservedUsd };
    }
    const modelRef = { ref: reservation.model, model: reservation.model.split(':').slice(1).join(':') };
    const chargedUsd = estimateRequestUsd({ modelPrices: this.modelPrices, modelRef, inputTokens: input, outputTokens: output });
    this.#settledUsd += chargedUsd;
    if (chargedUsd > reservation.reservedUsd && this.spentUsd > this.maxTestBudgetUsd) this.#overBudget = true;
    return { known: true, chargedUsd, reservedUsd: reservation.reservedUsd, overReservation: chargedUsd > reservation.reservedUsd };
  }

  abandon(id) {
    // Failed requests may still have been billed; retain the full reservation.
    const reservation = this.#reservations.get(id);
    if (!reservation) return;
    this.#reservations.delete(id);
    this.#settledUsd += reservation.reservedUsd;
  }

  snapshot() { return { budgetUsd: Number.isFinite(this.maxTestBudgetUsd) ? this.maxTestBudgetUsd : 'unlimited', settledUsd: this.settledUsd, committedUsd: this.spentUsd, stopped: this.stopped }; }
}
