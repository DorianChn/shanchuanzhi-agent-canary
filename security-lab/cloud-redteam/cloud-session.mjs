import { BudgetLedger, estimateUpperBoundTokens } from './budget.mjs';
import { requireModel } from './config.mjs';
import { ApiRequestError, completeWithProtocol, detectProtocol, listModels } from './openai-compatible.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const isRetryable = error => error instanceof ApiRequestError && ([429, 500, 502, 503, 504].includes(error.status) || ['API_NETWORK_ERROR', 'API_MODELS_NETWORK_ERROR'].includes(error.code));
const isProviderRejection = error => error instanceof ApiRequestError && [401, 402, 403].includes(error.status);
const retryDelay = attempt => Math.min(500 * (2 ** attempt), 4000);
const PROBE_INPUT_TOKENS_BOUND = 8_000;
const PROBE_OUTPUT_TOKENS_BOUND = 8;
const PROVIDER_SYSTEM_OVERHEAD_TOKENS = 8_000;

class Semaphore {
  #active = 0;
  #waiters = [];
  constructor(limit) { this.limit = limit; }
  async run(fn) {
    if (this.#active >= this.limit) await new Promise(resolve => this.#waiters.push(resolve));
    this.#active++;
    try { return await fn(); }
    finally { this.#active--; this.#waiters.shift()?.(); }
  }
}

export class CloudSession {
  constructor(config, { fetchImpl = fetch, onEvent = () => {} } = {}) {
    if (!config.maxTestBudgetUsd || !config.modelPrices) throw new Error('LIVE_CALLS_REQUIRE_BUDGET_AND_PRICE_CATALOG');
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.onEvent = onEvent;
    this.ledger = new BudgetLedger({ modelPrices: config.modelPrices, maxTestBudgetUsd: config.maxTestBudgetUsd });
    this.semaphore = new Semaphore(config.maxConcurrentRequests);
    this.protocols = new Map();
    this.catalogIds = new Map();
    this.stopCode = null;
  }

  hydratePreflight(records = []) {
    for (const record of records) {
      if (!record || typeof record.model !== 'string' || !['chat-completions', 'responses'].includes(record.protocol) || typeof record.catalogId !== 'string' || typeof record.endpointBaseUrl !== 'string') continue;
      const modelRef = requireModel(this.config, record.model);
      if (modelRef.endpoint.baseUrl !== record.endpointBaseUrl || modelRef.model !== record.catalogId) continue;
      this.protocols.set(modelRef.ref, record.protocol);
      this.catalogIds.set(modelRef.ref, record.catalogId);
    }
  }

  async preflight(modelRef) {
    if (this.stopCode) throw new ApiRequestError(`CAMPAIGN_STOPPED_${this.stopCode}`);
    return this.semaphore.run(async () => {
      const resolved = requireModel(this.config, modelRef);
      let ids; let catalogLookup = 'VERIFIED';
      for (let attempt = 0; ; attempt++) {
        try { ids = await listModels({ endpoint: resolved.endpoint, fetchImpl: this.fetchImpl }); break; }
        catch (error) {
          if (error instanceof ApiRequestError && error.status === 403 && error.code.startsWith('API_MODELS_HTTP_')) {
            catalogLookup = 'FORBIDDEN_DIRECT_COMPATIBILITY_PROBE';
            break;
          }
          if (isProviderRejection(error)) {
            this.stopCode = error.code;
            this.onEvent({ type: 'campaign_stopped_provider_rejection', model: resolved.ref, code: this.stopCode, purpose: 'model-catalog-preflight' });
            throw error;
          }
          if (!isRetryable(error) || attempt >= this.config.maxApiRetries) throw error;
          await sleep(retryDelay(attempt));
        }
      }
      if (ids && !ids.includes(resolved.model)) {
        this.onEvent({ type: 'model_catalog_miss', model: resolved.ref, catalogCount: ids.length });
        throw new Error(`MODEL_NOT_IN_PROVIDER_CATALOG_${resolved.ref}`);
      }
      const probeAttemptsBound = resolved.endpoint.protocol === 'auto' ? 2 : 1;
      let probe; let probeCost;
      for (let attempt = 0; ; attempt++) {
        const protocolReserve = this.ledger.reserve(resolved, PROBE_INPUT_TOKENS_BOUND * probeAttemptsBound, PROBE_OUTPUT_TOKENS_BOUND * probeAttemptsBound, 'protocol-compatibility-probe');
        try {
          probe = await detectProtocol({ modelRef: resolved, endpoint: resolved.endpoint, protocolHint: resolved.endpoint.protocol, fetchImpl: this.fetchImpl, maxOutputTokens: 1 });
          if (!probe.protocol || !probe.modelId) throw new Error(`MODEL_PROTOCOL_UNSUPPORTED_${resolved.ref}`);
          const rejectedAttempts = probe.attempts.filter(item => item.result === 'unsupported').length;
          const settlementUsage = {
            inputTokens: Number.isSafeInteger(probe.usage?.inputTokens) ? probe.usage.inputTokens + rejectedAttempts * PROBE_INPUT_TOKENS_BOUND : null,
            outputTokens: Number.isSafeInteger(probe.usage?.outputTokens) ? probe.usage.outputTokens + rejectedAttempts * PROBE_OUTPUT_TOKENS_BOUND : null,
          };
          probeCost = this.ledger.settle(protocolReserve, settlementUsage);
          break;
        } catch (error) {
          this.ledger.abandon(protocolReserve);
          if (isProviderRejection(error)) {
            this.stopCode = error.code;
            this.onEvent({ type: 'campaign_stopped_provider_rejection', model: resolved.ref, code: this.stopCode, purpose: 'protocol-compatibility-probe' });
            throw error;
          }
          if (!isRetryable(error) || attempt >= this.config.maxApiRetries) throw error;
          await sleep(retryDelay(attempt));
        }
      }
      this.protocols.set(resolved.ref, probe.protocol);
      this.catalogIds.set(resolved.ref, resolved.model);
      const record = { model: resolved.ref, catalogId: resolved.model, catalogLookup, completionId: probe.responseId, protocol: probe.protocol, endpointBaseUrl: resolved.endpoint.baseUrl, usage: probe.usage, attempts: probe.attempts };
      this.onEvent({ type: 'model_call', model: resolved.ref, protocol: probe.protocol, purpose: 'protocol-compatibility-probe', responseModel: probe.modelId, responseId: probe.responseId, usage: probe.usage, cost: probeCost });
      this.onEvent({ type: 'model_preflight_ok', ...record });
      return record;
    });
  }

  async complete(modelRef, { messages, tools = [], maxOutputTokens = this.config.maxOutputTokens, temperature = 0, purpose = 'completion', signal } = {}) {
    if (this.stopCode) throw new ApiRequestError(`CAMPAIGN_STOPPED_${this.stopCode}`);
    const resolved = requireModel(this.config, modelRef);
    const protocol = this.protocols.get(resolved.ref);
    if (!protocol) throw new Error(`MODEL_PREFLIGHT_REQUIRED_${resolved.ref}`);
    const visibleInputTokensBound = estimateUpperBoundTokens({ messages, tools }, 2);
    if (visibleInputTokensBound > 24_000) throw new Error('REQUEST_INPUT_BOUND_EXCEEDED');
    const inputTokensBound = visibleInputTokensBound + PROVIDER_SYSTEM_OVERHEAD_TOKENS;
    let lastError;
    for (let attempt = 0; attempt <= this.config.maxApiRetries; attempt++) {
      const reservation = this.ledger.reserve(resolved, inputTokensBound, maxOutputTokens, purpose);
      try {
        const requestSignal = signal ?? AbortSignal.timeout(this.config.apiRequestTimeoutMs ?? 60_000);
        const result = await this.semaphore.run(() => completeWithProtocol({ modelRef: resolved, endpoint: resolved.endpoint, protocol, messages, tools, maxOutputTokens, temperature, signal: requestSignal, fetchImpl: this.fetchImpl }));
        const charge = this.ledger.settle(reservation, result.usage);
        this.onEvent({ type: 'model_call', model: resolved.ref, protocol, purpose, responseModel: result.model, responseId: result.id, usage: result.usage, cost: charge });
        if (this.ledger.stopped) this.onEvent({ type: 'budget_cap_reached_after_call', committedUsd: this.ledger.spentUsd });
        return result;
      } catch (error) {
        if (this.ledger.snapshot().committedUsd < this.config.maxTestBudgetUsd) this.ledger.abandon(reservation);
        lastError = error;
        if (isProviderRejection(error)) {
          this.stopCode = error.code;
          this.onEvent({ type: 'campaign_stopped_provider_rejection', model: resolved.ref, code: this.stopCode, purpose });
          break;
        }
        if (!isRetryable(error) || attempt >= this.config.maxApiRetries) break;
        await sleep(retryDelay(attempt));
      }
    }
    if (lastError instanceof ApiRequestError && lastError.status === 429) {
      this.stopCode = lastError.code;
      this.onEvent({ type: 'campaign_stopped_provider_rejection', model: resolved.ref, code: this.stopCode, purpose });
    }
    throw lastError ?? new Error('API_CALL_FAILED');
  }

  budgetSnapshot() { return this.ledger.snapshot(); }
}

export function dedupeModels(models) {
  const seen = new Set();
  return models.filter(model => model && !seen.has(model.ref) && seen.add(model.ref));
}

let sharedSession;
export function getSharedCloudSession(config, options = {}) {
  if (!sharedSession) sharedSession = new CloudSession(config, options);
  return sharedSession;
}
