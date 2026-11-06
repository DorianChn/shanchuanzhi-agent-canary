import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { estimateRequestUsd } from './budget.mjs';
import { loadConfig, loadLocalEnv, parseModelReference, requireModel } from './config.mjs';
import { CloudSession } from './cloud-session.mjs';
import { startAgentDojoBridge } from './agentdojo-bridge.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const runsRoot = path.join(here, 'runs');
const agentDojoRunsRoot = path.join(here, 'agentdojo-runs');
const pyritRunsRoot = path.join(here, 'pyrit-runs');
const pinnedAgentDojoVersion = '0.1.35';
const agentDojoBenchmarkVersion = 'v1.2.2';

function parseArgs(argv) {
  const values = { suite: 'workspace', userTask: 'user_task_0', injectionTask: 'injection_task_0', attack: 'tool_knowledge', defense: 'tool_filter' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const take = (name, key) => {
      if (arg.startsWith(`${name}=`)) { values[key] = arg.slice(name.length + 1); return true; }
      if (arg === name) {
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) throw new Error(`ARGUMENT_VALUE_REQUIRED_${name}`);
        values[key] = argv[++i];
        return true;
      }
      return false;
    };
    if (arg === '--help' || arg === '-h') values.help = true;
    else if (arg === '--dry-run') values.dryRun = true;
    else if (take('--suite', 'suite')) { /* parsed */ }
    else if (take('--user-task', 'userTask')) { /* parsed */ }
    else if (take('--injection-task', 'injectionTask')) { /* parsed */ }
    else if (take('--attack', 'attack')) { /* parsed */ }
    else if (take('--defense', 'defense')) { /* parsed */ }
    else if (take('--model', 'model')) { /* parsed */ }
    else throw new Error(`ARGUMENT_UNKNOWN_${arg.split('=')[0]}`);
  }
  return values;
}

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function readJsonl(file) { try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); } catch { return []; } }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 }); }
function appendJsonl(file, row) { fs.appendFileSync(file, JSON.stringify(row) + '\n', { encoding: 'utf8', mode: 0o600 }); }
function timestamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function usd(value) { return `$${Number(value).toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`; }
function safeError(error) { return String(error?.code ?? error?.message ?? 'AGENTDOJO_RUN_FAILED').replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED]'); }

function priorRunSpendUsd() {
  let total = 0;
  for (const base of [runsRoot, agentDojoRunsRoot, pyritRunsRoot]) {
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      const dir = path.join(base, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const accounting = readJson(path.join(dir, 'budget-accounting.json'));
      if (Number.isFinite(accounting?.runCommittedUsd)) total += accounting.runCommittedUsd;
      else {
        const parent = readJson(path.join(dir, 'budget-parent-exit.json')) || readJson(path.join(dir, 'preflight-budget.json'));
        const child = readJson(path.join(dir, 'budget-final.json'));
        total += Number(parent?.committedUsd || 0) + Number(child?.committedUsd || 0);
      }
    }
  }
  return Number(total.toFixed(8));
}

function resolveAgentDojoPython() {
  const localVenvPython = process.platform === 'win32'
    ? path.join(here, '.venv-agentdojo', 'Scripts', 'python.exe')
    : path.join(here, '.venv-agentdojo', 'bin', 'python');
  let executable = process.env.AGENTDOJO_PYTHON || (fs.existsSync(localVenvPython) ? localVenvPython : null);
  if (!executable && process.platform === 'win32') {
    const found = spawnSync('where.exe', ['python.exe'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    executable = String(found.stdout || '').split(/\r?\n/).map(x => x.trim()).find(x => x && !/\\Microsoft\\WindowsApps\\/i.test(x)) || null;
  }
  if (!executable && process.platform !== 'win32') executable = 'python3';
  if (!executable) throw new Error('AGENTDOJO_PYTHON_RUNTIME_NOT_FOUND_SET_AGENTDOJO_PYTHON');
  if (/\\Microsoft\\WindowsApps\\/i.test(executable)) throw new Error('AGENTDOJO_PYTHON_RUNTIME_NOT_FOUND_SET_AGENTDOJO_PYTHON');
  const version = spawnSync(executable, ['-c', 'import importlib.metadata as m; print(m.version("agentdojo"))'], { encoding: 'utf8', windowsHide: true, timeout: 20_000 });
  if (version.error || version.status !== 0) throw new Error('AGENTDOJO_PACKAGE_NOT_INSTALLED_USE_PINNED_REQUIREMENTS');
  if (version.stdout.trim() !== pinnedAgentDojoVersion) throw new Error(`AGENTDOJO_VERSION_MISMATCH_EXPECTED_${pinnedAgentDojoVersion}`);
  return executable;
}

function walkJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkJsonFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(target);
  }
  return files;
}

function benchmarkResults(resultDir) {
  const results = [];
  for (const file of walkJsonFiles(resultDir)) {
    const value = readJson(file);
    if (value && typeof value.utility === 'boolean' && typeof value.security === 'boolean' && typeof value.user_task_id === 'string') results.push(value);
  }
  return results;
}

function gitMetadata() {
  try {
    return {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(),
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(),
    };
  } catch { return { commit: 'unknown', branch: 'unknown' }; }
}

function estimatePlan(config, modelRef, options, priorCommittedUsd) {
  const scenarios = 1;
  const conservativeRequestsPerScenario = 40;
  const inputTokensPerRequest = 20_000;
  const outputTokensPerRequest = 1_024;
  const safetyFactor = 1.5;
  const requests = scenarios * conservativeRequestsPerScenario;
  const protocolProbeAttemptsBound = modelRef.endpoint.protocol === 'auto' ? 2 : 1;
  const protocolProbeInputTokensPerAttempt = 8_000;
  const protocolProbeOutputTokensPerAttempt = 8;
  const inputTokens = Math.ceil(requests * inputTokensPerRequest * safetyFactor) + protocolProbeAttemptsBound * protocolProbeInputTokensPerAttempt;
  const outputTokens = Math.ceil(requests * outputTokensPerRequest * safetyFactor) + protocolProbeAttemptsBound * protocolProbeOutputTokensPerAttempt;
  const estimatedUsd = estimateRequestUsd({ modelPrices: config.modelPrices, modelRef, inputTokens, outputTokens });
  const remainingUsd = Number.isFinite(config.maxTestBudgetUsd) ? Math.max(0, config.maxTestBudgetUsd - priorCommittedUsd) : Number.POSITIVE_INFINITY;
  return {
    integration: 'AgentDojo standard benchmark; separate model baseline, not Agent Canary Gateway evidence',
    package: `agentdojo==${pinnedAgentDojoVersion}`,
    suite: options.suite, userTask: options.userTask, injectionTask: options.injectionTask,
    attack: options.attack, defense: options.defense, model: modelRef.ref,
    plannedPairs: scenarios, conservativeRequestsPerPair: conservativeRequestsPerScenario,
    estimateAssumptions: { inputTokensPerRequest, outputTokensPerRequest, safetyFactor, protocolProbeAttemptsBound, protocolProbeInputTokensPerAttempt, protocolProbeOutputTokensPerAttempt },
    estimatedInputTokens: inputTokens, estimatedOutputTokens: outputTokens, estimatedUsd,
    priorCommittedUsd,
    remainingBudgetUsd: Number.isFinite(remainingUsd) ? remainingUsd : 'unlimited',
    totalBudgetUsd: Number.isFinite(config.maxTestBudgetUsd) ? config.maxTestBudgetUsd : 'unlimited',
    withinBudget: !Number.isFinite(remainingUsd) || estimatedUsd <= remainingUsd,
    estimateLimit: 'Planning estimate only; actual AgentDojo call count is data-dependent and each proxy call is separately token-accounted.',
  };
}

function reportMarkdown(summary) {
  const rows = Object.entries(summary.modelUsage).map(([model, usage]) => `| ${model} | ${usage.calls} | ${usage.inputTokens} | ${usage.outputTokens} | ${usd(usage.estimatedUsd)} |`).join('\n') || '| none | 0 | 0 | 0 | $0 |';
  return `# AgentDojo Standard Benchmark Run\n\n` +
    `- Status: **${summary.status}**\n` +
    `- Upstream: [ethz-spylab/agentdojo](https://github.com/ethz-spylab/agentdojo), pinned package ${pinnedAgentDojoVersion}.\n` +
    `- Git commit: \`${summary.git.commit}\`; branch: \`${summary.git.branch}\`.\n` +
    `- Trace rows observed: ${summary.resultRows}; clean utility ${summary.utilitySuccesses}/${summary.utilityCases}; utility under attack ${summary.utilityUnderAttackSuccesses}/${summary.utilityUnderAttackCases}; security ${summary.securitySuccesses}/${summary.securityCases}.\n` +
    `- Model API cost from returned token usage: ${usd(summary.reportedTokenCostUsd)}; conservative request ledger: ${usd(summary.runCommittedUsd)}. Provider invoice cost is unavailable.\n` +
    `- Stop code: ${summary.stopCode || 'none'}; subprocess exit code: ${summary.exitCode ?? 'not run'}.\n\n` +
    `This is AgentDojo's simulated-suite model baseline. It does not traverse Agent Canary's MCP Gateway, Policy, HoneypotRuntime, or the existing A/B/C/D experiment. Raw task traces and logs are preserved under this run directory.\n\n` +
    `| Model | API calls | Input tokens | Output tokens | Token-price estimate |\n| --- | ---: | ---: | ---: | ---: |\n${rows}\n`;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node agentdojo-run.mjs [--suite workspace] [--user-task user_task_0] [--injection-task injection_task_0] [--attack tool_knowledge] [--defense tool_filter] [--model llm:model|gpt:model] [--dry-run]');
    return;
  }
  loadLocalEnv();
  const config = loadConfig();
  const modelRef = requireModel(config, parseModelReference(options.model || config.defenderModel?.ref));
  const priorCommittedUsd = priorRunSpendUsd();
  const plan = estimatePlan(config, modelRef, options, priorCommittedUsd);
  console.log(`AGENTDOJO PRE-RUN ESTIMATE\n${JSON.stringify(plan, null, 2)}`);
  if (!plan.withinBudget) throw new Error('COST_ESTIMATE_EXCEEDS_CONFIGURED_BUDGET');
  if (options.dryRun) return;

  const python = resolveAgentDojoPython();
  const runId = timestamp();
  const runDir = path.join(agentDojoRunsRoot, runId);
  const resultDir = path.join(runDir, 'agentdojo-results');
  fs.mkdirSync(resultDir, { recursive: true });
  const budgetRemaining = Number.isFinite(config.maxTestBudgetUsd) ? Math.max(0, config.maxTestBudgetUsd - priorCommittedUsd) : Number.POSITIVE_INFINITY;
  const runConfig = { ...config, maxTestBudgetUsd: budgetRemaining };
  const usageFile = path.join(runDir, 'model-usage.jsonl');
  const cloud = new CloudSession(runConfig, { onEvent: event => appendJsonl(usageFile, { at: new Date().toISOString(), ...event }) });
  const safeConfig = {
    package: `agentdojo==${pinnedAgentDojoVersion}`, model: modelRef.ref, protocolHint: modelRef.endpoint.protocol,
    suite: options.suite, userTask: options.userTask, injectionTask: options.injectionTask,
    attack: options.attack, defense: options.defense,
    budgetUsd: Number.isFinite(config.maxTestBudgetUsd) ? config.maxTestBudgetUsd : 'unlimited',
    priorCommittedUsd, estimatedInputTokens: plan.estimatedInputTokens, estimatedOutputTokens: plan.estimatedOutputTokens,
    estimatedUsd: plan.estimatedUsd, maxConcurrentRequests: config.maxConcurrentRequests,
  };
  writeJson(path.join(runDir, 'config.json'), safeConfig);
  writeJson(path.join(runDir, 'preregistration.json'), {
    startedAt: new Date().toISOString(), git: gitMetadata(),
    benchmark: `AgentDojo ${agentDojoBenchmarkVersion}`, package: `agentdojo==${pinnedAgentDojoVersion}`,
    suite: options.suite, userTask: options.userTask, injectionTask: options.injectionTask,
    attack: options.attack, defense: options.defense, model: modelRef.ref,
    scope: 'Upstream simulated suite; independent model baseline; no Agent Canary Gateway path.',
  });
  try {
    const preflight = await cloud.preflight(modelRef);
    writeJson(path.join(runDir, 'preflight.json'), { checkedAt: new Date().toISOString(), records: [preflight], failures: [] });
  } catch (error) {
    const code = safeError(error);
    writeJson(path.join(runDir, 'preflight.json'), { checkedAt: new Date().toISOString(), records: [], failures: [{ model: modelRef.ref, code }] });
    writeJson(path.join(runDir, 'budget-parent-exit.json'), cloud.budgetSnapshot());
    const summary = {
      status: 'STOPPED_MODEL_PREFLIGHT', runId, model: modelRef.ref, benchmarkVersion: agentDojoBenchmarkVersion,
      stopCode: code, resultRows: 0, modelUsage: {}, runCommittedUsd: cloud.budgetSnapshot().committedUsd,
      reportedTokenCostUsd: 0, utilityCases: 0, utilitySuccesses: 0,
      utilityUnderAttackCases: 0, utilityUnderAttackSuccesses: 0,
      securityCases: 0, securitySuccesses: 0, errors: 0, git: gitMetadata(), exitCode: null,
    };
    writeJson(path.join(runDir, 'budget-accounting.json'), { finalized: false, totalCapUsd: safeConfig.budgetUsd, priorCommittedUsd, runCommittedUsd: summary.runCommittedUsd, cumulativeCommittedUsd: priorCommittedUsd + summary.runCommittedUsd, remainingUsd: Number.isFinite(config.maxTestBudgetUsd) ? Math.max(0, config.maxTestBudgetUsd - priorCommittedUsd - summary.runCommittedUsd) : 'unlimited' });
    writeJson(path.join(runDir, 'agentdojo-summary.json'), summary);
    fs.writeFileSync(path.join(runDir, 'report.md'), reportMarkdown(summary), { encoding: 'utf8', mode: 0o600 });
    console.error(`AGENTDOJO_STOPPED_MODEL_PREFLIGHT ${code}`);
    process.exitCode = 2;
    return;
  }

  const bridgeToken = randomBytes(32).toString('hex');
  const bridge = await startAgentDojoBridge({ cloud, modelRef, runDir, token: bridgeToken });
  const metricsFile = path.join(runDir, 'agentdojo-metrics.json');
  const args = [
    path.join(here, 'agentdojo-driver.py'),
    '--suite', options.suite, '--user-task', options.userTask, '--injection-task', options.injectionTask,
    '--attack', options.attack, '--defense', options.defense,
    '--benchmark-version', agentDojoBenchmarkVersion,
    '--logdir', resultDir, '--metrics', metricsFile,
  ];
  const childEnv = { ...process.env };
  for (const name of Object.keys(childEnv)) if (/^(?:LLM_API_KEY|GPT_API_KEY|OPENAI_API_KEY|OPENAI_BASE_URL|OPENAI_COMPATIBLE_API_KEY|OPENAI_COMPATIBLE_BASE_URL)$/i.test(name)) delete childEnv[name];
  childEnv.AGENTDOJO_BRIDGE_URL = bridge.baseUrl;
  childEnv.AGENTDOJO_BRIDGE_TOKEN = bridgeToken;
  childEnv.AGENTDOJO_MODEL_ID = modelRef.model;
  childEnv.NO_PROXY = '127.0.0.1,localhost';
  const stdoutFile = path.join(runDir, 'agentdojo.stdout.log');
  const stderrFile = path.join(runDir, 'agentdojo.stderr.log');
  const stopFile = path.join(runDir, 'provider-stop.json');
  let exitCode = null;
  let spawnError = null;
  try {
    exitCode = await new Promise((resolve, reject) => {
      const child = spawn(python, args, { cwd: runDir, env: childEnv, windowsHide: true });
      const stdout = fs.createWriteStream(stdoutFile, { flags: 'wx', mode: 0o600 });
      const stderr = fs.createWriteStream(stderrFile, { flags: 'wx', mode: 0o600 });
      const watcher = setInterval(() => { if (fs.existsSync(stopFile) && !child.killed) child.kill(); }, 100);
      watcher.unref();
      child.stdout.pipe(stdout); child.stderr.pipe(stderr);
      let finished = false;
      const finish = code => {
        if (finished) return;
        finished = true;
        clearInterval(watcher);
        stdout.end(() => stderr.end(() => resolve(code)));
      };
      child.once('error', error => { spawnError = safeError(error); finish(127); });
      child.once('exit', code => finish(code ?? 1));
    });
  } finally {
    await bridge.close();
  }

  const resultRows = benchmarkResults(resultDir);
  const metrics = readJson(metricsFile);
  const usageEvents = readJsonl(usageFile).filter(event => event.type === 'model_call');
  const modelUsage = { [modelRef.ref]: { calls: usageEvents.length, inputTokens: 0, outputTokens: 0, estimatedUsd: 0, unknownUsageCalls: 0 } };
  for (const event of usageEvents) {
    const usage = modelUsage[modelRef.ref];
    if (Number.isSafeInteger(event.usage?.inputTokens) && Number.isSafeInteger(event.usage?.outputTokens)) {
      usage.inputTokens += event.usage.inputTokens; usage.outputTokens += event.usage.outputTokens;
    } else usage.unknownUsageCalls++;
    usage.estimatedUsd += Number(event.cost?.chargedUsd || 0);
  }
  const trialUsage = resultRows.filter(item => item.attack_type && item.attack_type !== 'none');
  const cleanUtility = resultRows.filter(item => !item.attack_type || item.attack_type === 'none');
  const stop = readJson(stopFile);
  const budget = cloud.budgetSnapshot();
  writeJson(path.join(runDir, 'budget-parent-final.json'), budget);
  const completeMetrics = metrics
    && Array.isArray(metrics.cleanUtility) && metrics.cleanUtility.length > 0
    && Array.isArray(metrics.utilityUnderAttack) && metrics.utilityUnderAttack.length > 0
    && Array.isArray(metrics.security) && metrics.security.length > 0;
  const status = stop ? 'PARTIAL_STOPPED_PROVIDER_REJECTION' : exitCode === 0 && completeMetrics && resultRows.length > 0 ? 'COMPLETED' : 'PARTIAL_AGENTDOJO_RUNNER_FAILURE';
  const summary = {
    status, runId, git: gitMetadata(), package: `agentdojo==${pinnedAgentDojoVersion}`, benchmarkVersion: agentDojoBenchmarkVersion,
    suite: options.suite, userTask: options.userTask, injectionTask: options.injectionTask,
    attack: options.attack, defense: options.defense, model: modelRef.ref,
    resultRows: resultRows.length, utilityCases: cleanUtility.length,
    utilitySuccesses: cleanUtility.filter(item => item.utility).length,
    utilityUnderAttackCases: metrics?.utilityUnderAttack?.length || 0,
    utilityUnderAttackSuccesses: (metrics?.utilityUnderAttack || []).filter(item => item.success).length,
    securityCases: trialUsage.length, securitySuccesses: trialUsage.filter(item => item.security).length,
    errors: resultRows.filter(item => Boolean(item.error)).length,
    stopCode: stop?.code || null, spawnError, exitCode, modelUsage,
    runCommittedUsd: budget.committedUsd, reportedTokenCostUsd: modelUsage[modelRef.ref].estimatedUsd,
    invoiceCostUsd: null, rawResultDir: path.relative(runDir, resultDir),
  };
  writeJson(path.join(runDir, 'budget-accounting.json'), {
    finalized: !stop && exitCode === 0,
    totalCapUsd: Number.isFinite(config.maxTestBudgetUsd) ? config.maxTestBudgetUsd : 'unlimited',
    priorCommittedUsd, runCommittedUsd: budget.committedUsd,
    cumulativeCommittedUsd: priorCommittedUsd + budget.committedUsd,
    remainingUsd: Number.isFinite(config.maxTestBudgetUsd) ? Math.max(0, config.maxTestBudgetUsd - priorCommittedUsd - budget.committedUsd) : 'unlimited',
  });
  writeJson(path.join(runDir, 'agentdojo-summary.json'), summary);
  fs.writeFileSync(path.join(runDir, 'report.md'), reportMarkdown(summary), { encoding: 'utf8', mode: 0o600 });
  console.log(`AGENTDOJO_${status} ${runDir}\nRESULT_ROWS ${summary.resultRows}\nREPORT ${path.join(runDir, 'report.md')}`);
  if (status !== 'COMPLETED') process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    console.error(`AGENTDOJO_RUN_STOPPED ${safeError(error)}`);
    process.exitCode = 1;
  });
}

export { estimatePlan as estimateAgentDojoPlan, parseArgs as parseAgentDojoArgs, benchmarkResults as readAgentDojoResults };
