import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadLocalEnv, requireModel } from '../config.mjs';
import { getSharedCloudSession } from '../cloud-session.mjs';
import { runAgentTrial, runJudge } from '../agent-harness.mjs';

const providerDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRunDir = path.join(providerDir, '..', 'runs', 'unconfigured');
let runtime;

function appendJsonl(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });
}

function markProviderStop(runDir, error) {
  const code = String(error?.code ?? error?.message ?? error ?? 'PROVIDER_REJECTED');
  if (!/(?:API_HTTP_(?:401|402|403|429)|CAMPAIGN_STOPPED_API_HTTP_(?:401|402|403|429))/.test(code)) return null;
  const file = path.join(runDir, 'provider-stop.json');
  try { fs.writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), code }, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 }); } catch { /* another request already recorded the stop */ }
  return code;
}

function loadPreflight(file, cloud) {
  if (!file || !fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const records = Array.isArray(parsed.records) ? parsed.records : [];
    cloud.hydratePreflight(records);
    return records;
  } catch { return []; }
}

function initialize() {
  if (runtime) return runtime;
  loadLocalEnv();
  const config = loadConfig();
  const runDir = path.resolve(process.env.CLOUD_REDTEAM_RUN_DIR || defaultRunDir);
  fs.mkdirSync(runDir, { recursive: true });
  const usageFile = path.join(runDir, 'model-usage.jsonl');
  const cloud = getSharedCloudSession(config, { onEvent: event => appendJsonl(usageFile, { at: new Date().toISOString(), ...event }) });
  const preflightFile = process.env.CLOUD_REDTEAM_PREFLIGHT_FILE;
  const preflight = loadPreflight(preflightFile, cloud);
  runtime = { config, runDir, cloud, preflight, usageFile, rawFile: path.join(runDir, 'agent-raw.jsonl') };
  process.once('exit', () => {
    try { fs.writeFileSync(path.join(runDir, 'budget-final.json'), JSON.stringify(cloud.budgetSnapshot(), null, 2) + '\n', { encoding: 'utf8', mode: 0o600 }); } catch { /* no secrets in exit diagnostics */ }
  });
  return runtime;
}

async function ensureModel(model) {
  const rt = initialize();
  const resolved = requireModel(rt.config, model);
  if (!rt.cloud.protocols.has(resolved.ref)) {
    const preflight = await rt.cloud.preflight(resolved);
    rt.preflight.push(preflight);
  }
  return resolved;
}

export default class AgentCanaryProvider {
  constructor(options = {}) {
    this.options = options;
    this.config = options.config ?? {};
    this.arm = this.config.arm ?? 'A';
  }

  id() { return `agent-canary-cloud-${this.arm}`; }

  async callApi(prompt) {
    const rt = initialize();
    const stopFile = path.join(rt.runDir, 'provider-stop.json');
    if (fs.existsSync(stopFile)) return { error: 'CAMPAIGN_HALTED_PROVIDER_REJECTION', output: 'TRIAL_NOT_RUN' };
    let scenario;
    try { scenario = JSON.parse(String(prompt)); }
    catch { return { error: 'SCENARIO_JSON_INVALID', output: 'EVALUATION_ERROR' }; }
    try {
      const defender = await ensureModel(this.config.defenderModel ?? rt.config.defenderModel);
      const judgeDisabled = process.env.CLOUD_REDTEAM_DISABLE_JUDGE === '1';
      const judge = judgeDisabled ? null : await ensureModel(rt.config.judgeModel);
      const trial = await runAgentTrial({ scenario, arm: this.arm, model: defender, cloud: rt.cloud, runDir: rt.runDir });
      let judgeResult;
      if (trial.trialState === 'ERROR') judgeResult = { status: 'skipped_trial_error', reason: trial.error ?? 'TRIAL_ERROR' };
      else if (judgeDisabled) judgeResult = { status: 'unavailable', reason: process.env.CLOUD_REDTEAM_JUDGE_STATUS_REASON || 'JUDGE_PREFLIGHT_FAILED' };
      else {
        try { judgeResult = await runJudge({ cloud: rt.cloud, model: judge, trial }); }
        catch (error) { judgeResult = { status: 'error', reason: error?.code ?? error?.message ?? 'JUDGE_FAILED' }; }
      }
      trial.judge = judgeResult;
      appendJsonl(rt.rawFile, trial);
      const rejectedCode = markProviderStop(rt.runDir, trial.error || judgeResult.reason);
      if (rejectedCode) return { error: `CAMPAIGN_STOPPED_${rejectedCode}`, output: 'TRIAL_ERROR' };

      const output = trial.trialState === 'ERROR' ? 'TRIAL_ERROR' : trial.attack ? (trial.attackSuccess ? 'ATTACK_SUCCESS' : 'ATTACK_NO_EFFECT') : (trial.normalSuccess ? 'NORMAL_SUCCESS' : 'NORMAL_FAILURE');
      return {
        ...(trial.trialState === 'ERROR' ? { error: trial.error ?? 'TRIAL_ERROR' } : {}),
        output,
        tokenUsage: {
          prompt: (trial.inputTokens ?? 0) + (judgeResult.usage?.inputTokens ?? 0),
          completion: (trial.outputTokens ?? 0) + (judgeResult.usage?.outputTokens ?? 0),
          total: (trial.inputTokens ?? 0) + (trial.outputTokens ?? 0) + (judgeResult.usage?.inputTokens ?? 0) + (judgeResult.usage?.outputTokens ?? 0),
        },
        metadata: {
          trialId: trial.trialId, arm: trial.arm, category: trial.category, attack: trial.attack,
          attackSuccess: trial.attackSuccess, defenseSuccess: trial.defenseSuccess, activeDenial: trial.activeDenial,
          defenderRefusal: trial.defenderRefusal, threatToolAttempt: trial.threatToolAttempt,
          sideEffects: trial.sideEffects, sessionId: trial.sessionId, evidenceValid: trial.evidenceChain?.valid ?? false,
          judgeStatus: judgeResult.status, judgeClass: judgeResult.response_class ?? null,
        },
      };
    } catch (error) {
      const code = markProviderStop(rt.runDir, error);
      if (code) return { error: `CAMPAIGN_STOPPED_${code}`, output: 'TRIAL_NOT_RUN' };
      throw error;
    }
  }
}
