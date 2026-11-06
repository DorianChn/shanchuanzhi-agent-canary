import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const cloudRedteamDir = path.dirname(fileURLToPath(import.meta.url));
export const localEnvPath = path.join(cloudRedteamDir, '.env.local');

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export function loadLocalEnv(env = process.env, file = localEnvPath) {
  if (!fs.existsSync(file)) return env;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || own(env, match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

function parseModelRef(value, defaultProfile = 'llm') {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/^(llm|gpt):(.+)$/i);
  const profile = match ? match[1].toLowerCase() : defaultProfile;
  const model = (match ? match[2] : raw).trim();
  if (!model || /[\r\n]/.test(model)) throw new Error('MODEL_REFERENCE_INVALID');
  return { profile, model, ref: `${profile}:${model}` };
}

function modelList(value) {
  return String(value ?? '').split(',').map(x => x.trim()).filter(Boolean).map(x => parseModelRef(x));
}

function numberEnv(env, name, { min = 0, max = Number.MAX_SAFE_INTEGER, optional = true } = {}) {
  const raw = String(env[name] ?? '').trim();
  if (!raw) {
    if (optional) return null;
    throw new Error(`CONFIG_REQUIRED_${name}`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`CONFIG_INVALID_${name}`);
  return value;
}

function validateBaseUrl(raw, label) {
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch { throw new Error(`CONFIG_INVALID_${label}_URL`); }
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error(`CONFIG_HTTPS_REQUIRED_${label}`);
  if (url.username || url.password || url.search || url.hash) throw new Error(`CONFIG_INVALID_${label}_URL`);
  if (/\/(chat\/completions|responses|models)\/?$/i.test(url.pathname)) throw new Error(`CONFIG_BASE_URL_MUST_NOT_INCLUDE_API_PATH_${label}`);
  return url.toString().replace(/\/+$/, '');
}

function parsePrices(raw) {
  if (!String(raw ?? '').trim()) return null;
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('CONFIG_INVALID_MODEL_PRICING_JSON'); }
  if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('CONFIG_INVALID_MODEL_PRICING_JSON');
  const prices = {};
  for (const [ref, value] of Object.entries(data)) {
    if (!value || !Number.isFinite(value.inputUsdPer1M) || !Number.isFinite(value.outputUsdPer1M) || value.inputUsdPer1M < 0 || value.outputUsdPer1M < 0) throw new Error('CONFIG_INVALID_MODEL_PRICE_ENTRY');
    prices[ref.toLowerCase()] = { inputUsdPer1M: value.inputUsdPer1M, outputUsdPer1M: value.outputUsdPer1M };
  }
  return prices;
}

export function loadConfig(env = process.env, { loadFile = env === process.env } = {}) {
  if (loadFile) loadLocalEnv(env);
  const defaultBase = validateBaseUrl(env.LLM_API_BASE_URL || '', 'LLM');
  const llmBase = defaultBase || 'https://api.yicode.ai/v1';
  const gptBase = validateBaseUrl(env.GPT_API_BASE_URL || llmBase, 'GPT');
  const attackerModels = modelList(env.ATTACKER_MODEL);
  const defenderModel = parseModelRef(env.DEFENDER_MODEL);
  const defenderModels = modelList(env.DEFENDER_MODELS || env.DEFENDER_MODEL);
  const judgeModel = parseModelRef(env.JUDGE_MODEL);
  const protocol = (profile, envName) => {
    const value = String(env[envName] || 'auto').toLowerCase();
    if (!['auto', 'chat-completions', 'responses'].includes(value)) throw new Error(`CONFIG_INVALID_${envName}`);
    return value;
  };
  const maxConcurrentRequests = numberEnv(env, 'MAX_CONCURRENT_REQUESTS', { min: 1, max: 64 }) ?? 2;
  const budgetRaw = String(env.MAX_TEST_BUDGET_USD ?? '').trim().toLowerCase();
  const maxTestBudgetUsd = budgetRaw === 'unlimited' ? Number.POSITIVE_INFINITY : numberEnv(env, 'MAX_TEST_BUDGET_USD', { min: 0.000001, optional: true });
  let modelPrices = parsePrices(env.MODEL_PRICING_JSON);
  const isYicodeHost = host => /(^|\.)yicode\.ai$/i.test(host) || /(^|\.)zxcbug\.com$/i.test(host);
  if (!modelPrices && isYicodeHost(new URL(llmBase).hostname) && isYicodeHost(new URL(gptBase).hostname)) {
    modelPrices = {
      'llm:deepseek-v4.1-flash': { inputUsdPer1M: 0.2, outputUsdPer1M: 0.8 },
      'llm:glm-5.3': { inputUsdPer1M: 0.4, outputUsdPer1M: 1.4 },
      'llm:glm-5.3-flash': { inputUsdPer1M: 0.08, outputUsdPer1M: 0.28 },
      'llm:mimo-v2.6-pro': { inputUsdPer1M: 0.3, outputUsdPer1M: 0.6 },
      'llm:kimi-k3.1-pro': { inputUsdPer1M: 1.3, outputUsdPer1M: 6.8 },
      'llm:minimax-m3.1-flash': { inputUsdPer1M: 0.1, outputUsdPer1M: 0.4 },
      'gpt:gpt-6.1-sol': { inputUsdPer1M: 0.5, outputUsdPer1M: 2.5 },
    };
  }
  return {
    endpoints: {
      llm: { baseUrl: llmBase, apiKey: env.LLM_API_KEY || '', protocol: protocol('llm', 'LLM_API_PROTOCOL') },
      gpt: { baseUrl: gptBase, apiKey: env.GPT_API_KEY || env.LLM_API_KEY || '', protocol: protocol('gpt', 'GPT_API_PROTOCOL') },
    },
    attackerModels,
    defenderModel,
    defenderModels,
    judgeModel,
    maxTestBudgetUsd,
    maxConcurrentRequests,
    maxApiRetries: numberEnv(env, 'MAX_API_RETRIES', { min: 0, max: 3 }) ?? 1,
    apiRequestTimeoutMs: numberEnv(env, 'LLM_API_REQUEST_TIMEOUT_MS', { min: 250, max: 300_000 }) ?? 60_000,
    maxOutputTokens: numberEnv(env, 'MAX_OUTPUT_TOKENS', { min: 1, max: 8192 }) ?? 512,
    modelPrices,
  };
}

export function requireModel(config, modelRef, { credentials = true } = {}) {
  const parsed = typeof modelRef === 'string' ? parseModelRef(modelRef) : modelRef;
  if (!parsed) throw new Error('MODEL_REFERENCE_REQUIRED');
  const endpoint = config.endpoints[parsed.profile];
  if (!endpoint) throw new Error('MODEL_PROFILE_UNKNOWN');
  if (!endpoint.baseUrl) throw new Error(`CONFIG_REQUIRED_${parsed.profile.toUpperCase()}_API_BASE_URL`);
  if (credentials && !endpoint.apiKey) throw new Error(`CONFIG_REQUIRED_${parsed.profile.toUpperCase()}_API_KEY`);
  return { ...parsed, endpoint };
}

export function parseModelReference(value) { return parseModelRef(value); }
