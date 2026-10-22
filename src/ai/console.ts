import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import {promisify} from 'node:util';
import { readEvents } from '../alerts.js';
import { createAIProvider, PROVIDER_PRESETS, previewAnalysis, redactAnalysisText, formatAnalysisEvent } from './provider.js';
import type { ProviderConfig, SecurityAnalysisResult } from './types.js';
import { CONSOLE_PAGE } from './console-page.js';
import { runAdvisoryDemo } from './demo.js';
import { renderAIReport } from './report.js';
import {createPolicySandbox} from './policy-demo.js';
import os from 'node:os';
import {detectAgents,previewAgentIntegration,installAgentIntegration,restoreAgentIntegration,type AgentClient} from '../agent-integrations.js';
import {createRuntimeDemo} from '../runtime/demo.js';

export type SecurityCenterStatusProvider = () => unknown | Promise<unknown>;

const UNKNOWN_SECURITY_CENTER_STATUS = Object.freeze({
  protectionStatus: 'UNKNOWN',
  gateway: Object.freeze({ protectionStatus: 'UNKNOWN', connectionStatus: 'UNKNOWN' }),
  hook: Object.freeze({ protectionStatus: 'UNKNOWN' }),
  canaryIsolation: Object.freeze({ protectionStatus: 'UNKNOWN' }),
  policy: Object.freeze({ protectionStatus: 'UNKNOWN' }),
});

const SECURITY_CENTER_PROTECTION_STATUSES = new Set(['PROTECTED', 'PARTIALLY_PROTECTED', 'NOT_PROTECTED', 'UNKNOWN']);
const SECURITY_CENTER_CONNECTION_STATUSES = new Set(['CONNECTED', 'DISCONNECTED', 'UNKNOWN']);
const SECURITY_CENTER_AGENT_IDS = new Set(['claude', 'cursor', 'cline', 'codex']);

function ownDataValue(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

function securityCenterProtectionStatus(value: unknown): string {
  return typeof value === 'string' && SECURITY_CENTER_PROTECTION_STATUSES.has(value) ? value : 'UNKNOWN';
}

function securityCenterConnectionStatus(value: unknown): string {
  return typeof value === 'string' && SECURITY_CENTER_CONNECTION_STATUSES.has(value) ? value : 'UNKNOWN';
}

function securityCenterArrayValues(value: unknown, limit = 100): unknown[] {
  if (!Array.isArray(value)) return [];
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < 0) return [];
  const values: unknown[] = [];
  for (let index = 0; index < Math.min(length, limit); index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor && Object.hasOwn(descriptor, 'value')) values.push(descriptor.value);
  }
  return values;
}

function normalizeSecurityCenterSnapshot(value: unknown) {
  const gateway = ownDataValue(value, 'gateway');
  const policy = ownDataValue(value, 'policy');
  const normalized: Record<string, unknown> = {
    // The only current provider scope is fixed M2 reads, so it cannot claim full-product protection.
    protectionStatus: ownDataValue(value, 'protectionStatus') === 'PARTIALLY_PROTECTED'
      || ownDataValue(value, 'protectionStatus') === 'NOT_PROTECTED'
      ? ownDataValue(value, 'protectionStatus')
      : 'UNKNOWN',
    gateway: {
      protectionStatus: securityCenterProtectionStatus(ownDataValue(gateway, 'protectionStatus')),
      connectionStatus: securityCenterConnectionStatus(ownDataValue(gateway, 'connectionStatus')),
    },
    // The M2 status provider has no evidence for native Hook or Canary isolation.
    hook: { protectionStatus: 'UNKNOWN' },
    canaryIsolation: { protectionStatus: 'UNKNOWN' },
    policy: {
      protectionStatus: securityCenterProtectionStatus(ownDataValue(policy, 'protectionStatus')),
    },
  };

  const policyName = ownDataValue(policy, 'name');
  if (policyName === 'M2 fixed file reads / M5 OBSERVE') {
    (normalized.policy as Record<string, unknown>).name = 'M2_FIXED_FILE_READS';
  } else if (policyName === 'OBSERVE' || policyName === 'M2_FIXED_FILE_READS') {
    (normalized.policy as Record<string, unknown>).name = policyName;
  }

  const protectedToolCount = ownDataValue(value, 'protectedToolCount');
  if (Number.isSafeInteger(protectedToolCount) && (protectedToolCount as number) >= 0) {
    normalized.protectedToolCount = protectedToolCount;
  }

  const paths = securityCenterArrayValues(ownDataValue(value, 'unprotectedExecutionPaths'))
    .filter((item): item is string => item === 'NATIVE_SHELL');
  if (paths.length > 0) normalized.unprotectedExecutionPaths = [...new Set(paths)];

  const agents = securityCenterArrayValues(ownDataValue(value, 'agents'))
    .map(item => ({ agent: ownDataValue(item, 'agent'), detected: ownDataValue(item, 'detected') }))
    .filter(item => typeof item.agent === 'string' && SECURITY_CENTER_AGENT_IDS.has(item.agent))
    .map(item => ({
      agent: item.agent,
      detected: typeof item.detected === 'boolean' ? item.detected : null,
      // Configuration detection is not evidence of a live connection or protected native tools.
      connectionStatus: 'UNKNOWN',
      protectionStatus: 'UNKNOWN',
    }));
  if (agents.length > 0) normalized.agents = agents;

  return normalized;
}

export async function startAIConsole(options: { port?: number; apiKey?: string; keyOrigin?: string; eventsFile?: string; operatorApprovalCode?: string; preReviewTimeoutMs?:number; securityCenterStatusProvider?: SecurityCenterStatusProvider } = {}) {
  const port = options.port ?? 4318;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('AI_CONSOLE_PORT_INVALID');
  const csrf = randomBytes(32).toString('hex');
  let config: ProviderConfig = { id: 'ollama', ...PROVIDER_PRESETS.ollama, model: 'qwen3.5-9b-local:latest' };
  let provider = createAIProvider(config);
  let busy = false, url = '';
  const analyses: SecurityAnalysisResult[] = [];
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  let job: { status: string; progress: string[] } = { status: 'idle', progress: [] };
  let child: ChildProcess | undefined;
  const operatorCode=options.operatorApprovalCode;
  const secrets = [...(options.apiKey?[options.apiKey]:[]),...(operatorCode?[operatorCode]:[])];
  const sandbox=createPolicySandbox({reviewTimeoutMs:options.preReviewTimeoutMs});
  const runtime3=createRuntimeDemo();
  const integrationProject=fs.mkdtempSync(path.join(os.tmpdir(),'canary-console-integration-'));
  const integrationRecords=new Map<string,ReturnType<typeof installAgentIntegration>>();
  const integrationEntry={command:process.execPath,args:[path.join(root,'dist/competition.js'),'serve']};
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const reply = (value: unknown, status = 200) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(url).host || req.headers.origin && req.headers.origin !== url || req.headers['sec-fetch-site'] === 'cross-site') { reply({ error: 'AI_CONSOLE_ORIGIN_REJECTED' }, 403); return; }
      if (req.method === 'GET' && req.url === '/') {
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'nonce-" + csrf + "'; style-src 'nonce-" + csrf + "'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(CONSOLE_PAGE.replace('<style>', '<style nonce="' + csrf + '">').replace('<script>', '<script nonce="' + csrf + '">').replace('__CSRF__', csrf)); return;
      }
      if (req.headers['x-canary-csrf'] !== csrf) { reply({ error: 'AI_CONSOLE_CSRF_REJECTED' }, 403); return; }
      if (req.method === 'GET' && req.url === '/api/state') {
        const events = readEvents(options.eventsFile, 100).map(e => JSON.parse(JSON.stringify(e), (_k, v) => typeof v === 'string' ? redactAnalysisText(v, secrets) : v));
        let experiments: unknown = '尚无保存的模型实验结果。';
        const evidenceFile = path.join(root, 'competition-submission/evidence/analysis-summary.json');
        if (fs.existsSync(evidenceFile) && fs.statSync(evidenceFile).size < 256_000) {
          const data = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
          experiments = { generatedAt: data.analysisGeneratedAt, caveat: '按运行文件 UTC 时间排序的完整组，真实模型选择工具，执行器为虚拟工具；非 AI 分析准确率。', cohorts: data.cohorts?.filter((c: any) => c.promptSha256).sort((a: any,b: any)=>String(a.runStamp||'').localeCompare(String(b.runStamp||''))).map((c: any) => ({ sourceFile:c.sourceFile,runStamp:c.runStamp,profile: c.profile, model: c.model, trials: c.totalTrials, arms: c.arms })) };
        }
        reply({ presets: PROVIDER_PRESETS, events, counts: { signals: events.filter(e => e.kind === 'decoy_called' || e.kind === 'token_found').length, sessions: new Set(events.filter(e => e.kind === 'session_quarantined').map(e => e.sessionId)).size, blocked: events.filter(e => e.kind === 'action_blocked').length }, countScope: 'latest 100 recorded events only', experiments }); return;
      }
      if (req.method === 'GET' && req.url === '/api/security-center') {
        if (!options.securityCenterStatusProvider) { reply(UNKNOWN_SECURITY_CENTER_STATUS); return; }
        try {
          const snapshot = await options.securityCenterStatusProvider();
          reply(normalizeSecurityCenterSnapshot(snapshot));
        } catch {
          reply(UNKNOWN_SECURITY_CENTER_STATUS);
        }
        return;
      }
      if (req.method === 'GET' && req.url === '/api/job') { reply(job); return; }
      if (req.method === 'GET' && req.url === '/api/policy/state') { reply(sandbox.state()); return; }
      if(req.method==='GET'&&req.url==='/api/runtime3'){reply(runtime3.state());return;}
      if(req.method==='GET'&&req.url==='/api/runtime3/evaluation'){const p=path.join(root,'security-lab/evidence/console-summary.json');reply(fs.existsSync(p)&&fs.statSync(p).size<512_000?JSON.parse(fs.readFileSync(p,'utf8')):{status:'NOT MEASURED',reason:'尚无保存的 3.0 实验'});return;}
      if(req.method==='GET'&&req.url==='/api/agents'){reply({agents:detectAgents(),scope:'Configuration demonstration in an isolated temporary project. Does not change your live client config.',installed:[...integrationRecords.values()].map(r=>({agent:r.agent,status:r.status,coverage:r.coverage})),project:integrationProject});return;}
      if(req.method==='GET'&&req.url==='/api/v2'){const p=path.join(root,'competition-submission/evidence/v2-summary.json');reply(fs.existsSync(p)&&fs.statSync(p).size<512_000?JSON.parse(fs.readFileSync(p,'utf8')):{complete:false,status:'NOT COMPLETED'});return;}
      if (req.method === 'GET' && req.url === '/api/round4') {
        const p=path.join(root,'competition-submission/evidence/round4-summary.json');
        reply(fs.existsSync(p)&&fs.statSync(p).size<512_000?JSON.parse(fs.readFileSync(p,'utf8')):{complete:false,status:'NOT COMPLETED'});return;
      }
      if (req.method === 'GET' && req.url === '/api/report') { reply({ generatedAt: new Date().toISOString(), advisoryOnly: true, scope: 'up to 100 analyses in this console process', analyses }); return; }
      if (req.method === 'GET' && req.url?.startsWith('/api/export?')) {
        const format=new URL(req.url,url).searchParams.get('format');
        if (format!=='json'&&format!=='markdown'&&format!=='csv') throw new Error('AI_REPORT_FORMAT_INVALID');
        reply({ format, content:renderAIReport(analyses,format) }); return;
      }
      if (req.method !== 'POST' || !req.url?.startsWith('/api/')) { reply({ error: 'NOT_FOUND' }, 404); return; }
      if (!req.headers['content-type']?.startsWith('application/json')) { reply({ error: 'AI_JSON_REQUIRED' }, 415); return; }
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) { size += chunk.length; if (size > 32_000) { reply({ error: 'AI_INPUT_TOO_LARGE' }, 413); return; } chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(req.url==='/api/runtime3/action'){reply(await runtime3.action(body.action));return;}
      if(req.url==='/api/runtime3/approve'){
        const supplied=Buffer.from(typeof body.operatorCode==='string'?body.operatorCode:''),expected=Buffer.from(operatorCode??'');
        if(body.confirm!==true||!operatorCode||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){reply({error:'POLICY_OPERATOR_AUTH_REQUIRED'},403);return;}
        reply(await runtime3.approve(body.requestId));return;
      }
      if(req.url==='/api/agents/preview'){const p=previewAgentIntegration(body.agent as AgentClient,integrationProject,integrationEntry);reply({agent:p.agent,configPath:p.configPath,entry:p.entry,baseHash:p.baseHash,status:p.status,coverage:p.coverage});return;}
      if(req.url==='/api/agents/install'){const r=installAgentIntegration(body.agent,integrationProject,integrationEntry,body.baseHash);integrationRecords.set(body.agent,r);reply({agent:r.agent,status:r.status,coverage:r.coverage});return;}
      if(req.url==='/api/agents/restore'){const r=integrationRecords.get(body.agent);if(!r)throw new Error('INTEGRATION_NOT_INSTALLED');reply(restoreAgentIntegration(r));integrationRecords.delete(body.agent);return;}
      if(req.url==='/api/agents/probe'){const script=path.join(root,'competition-submission/lab/verify-v2-mcp.mjs');if(!fs.existsSync(script))throw new Error('PROTECTED_MCP_PROBE_NOT_INCLUDED');const result=await promisify(execFile)(process.execPath,[script],{cwd:root,windowsHide:true,timeout:20_000,maxBuffer:8000});reply({...JSON.parse(result.stdout.trim()),coverage:'Actual SDK stdio probe of three virtual host callbacks; desktop client activation NOT VERIFIED'});return;}
      if(req.url==='/api/policy/review'){if(typeof body.enabled!=='boolean')throw new Error('PRE_REVIEW_BOOLEAN_REQUIRED');reply(sandbox.setReview(body.enabled,provider));return;}
      if (req.url === '/api/policy/mode') { reply(sandbox.setMode(body.mode)); return; }
      if (req.url === '/api/policy/action') { reply(await sandbox.action(body.action)); return; }
      if (req.url === '/api/policy/approve'||req.url==='/api/policy/deny') {
        if(body.confirm!==true)throw new Error('POLICY_HUMAN_CONFIRMATION_REQUIRED');
        const supplied=Buffer.from(typeof body.operatorCode==='string'?body.operatorCode:'');
        const expected=Buffer.from(operatorCode??'');
        if(!operatorCode||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){reply({error:'POLICY_OPERATOR_AUTH_REQUIRED'},403);return;}
        reply(req.url==='/api/policy/deny'?sandbox.deny(body.requestId):await sandbox.approve(body.requestId));return;
      }
      if (req.url === '/api/preview') { reply(previewAnalysis(body.events, secrets)); return; }
      if (req.url === '/api/demo') { const demo = await runAdvisoryDemo(); reply({ ...demo, analysisEvents: demo.events.map((e,i)=>({id:'sandbox-'+i,text:formatAnalysisEvent(e as unknown as Record<string,unknown>)})) }); return; }
      if (busy || child) { reply({ error: 'AI_CONSOLE_BUSY' }, 409); return; }
      if (req.url === '/api/configure') {
        if (!body || Object.keys(body).some(k => !['id','protocol','kind','baseUrl','model','timeoutMs'].includes(k))) throw new Error('AI_CONFIG_INVALID');
        if(secrets.some(secret=>JSON.stringify(body).includes(secret)))throw new Error('AI_CONFIG_SECRET_REJECTED');
        const origin = new URL(body.baseUrl).origin;
        const allowedOrigin = options.keyOrigin ?? process.env.AGENT_CANARY_AI_KEY_ORIGIN;
        if (options.apiKey && body.kind === 'cloud' && origin !== allowedOrigin) throw new Error('AI_KEY_ORIGIN_NOT_AUTHORIZED');
        const next: ProviderConfig = { ...body, ...(body.kind === 'cloud' && options.apiKey ? { apiKey: options.apiKey } : {}) };
        provider = createAIProvider(next); config = next;
        reply({ ok: true }); return;
      }
      if (req.url === '/api/eval') {
        if (config.protocol !== 'ollama' || config.kind !== 'local') throw new Error('AI_EVAL_OLLAMA_ONLY');
        const script = path.join(root, 'competition-submission/lab/run-agent-eval.mjs');
        if (!fs.existsSync(script)) throw new Error('AI_EVAL_REQUIRES_REPOSITORY_CHECKOUT');
        const env: NodeJS.ProcessEnv = { ...process.env, OLLAMA_BASE_URL: config.baseUrl, OLLAMA_MODEL: config.model };
        delete env.AGENT_CANARY_AI_KEY;
        job = { status: 'running', progress: [] };
        child = spawn(process.execPath, [script, '--profile=neutral_agent',...(body.v2===true?['--v2']:body.round4===true?['--round4']:[])], { cwd: root, env, stdio: ['ignore','pipe','pipe'], windowsHide: true });
        const capture = (chunk: Buffer) => { job.progress.push(redactAnalysisText(chunk.toString('utf8'), secrets).slice(0, 1000)); if (job.progress.length > 12) job.progress.shift(); };
        child.stdout?.on('data', capture); child.stderr?.on('data', capture);
        child.once('error', () => { job.status = 'failed'; child = undefined; });
        child.once('exit', code => { job.status = code === 0 ? 'completed' : 'failed'; child = undefined; });
        reply({ status: 'running', model: config.model, profile: 'neutral_agent', virtualToolsOnly: true }); return;
      }
      const abort = new AbortController();
      const onClose = () => { if (!res.writableEnded) abort.abort(); };
      res.on('close', onClose);
      busy = true;
      try {
        if (req.url === '/api/connect') reply(await provider.testConnection(abort.signal));
        else if (req.url === '/api/ollama') reply(await createAIProvider({ id: 'ollama', ...PROVIDER_PRESETS.ollama, model: 'probe' }).testConnection(abort.signal));
        else if (req.url === '/api/analyze') {
          const rawResult = await provider.analyze({ events: previewAnalysis(body.events,secrets), cloudConsent: body.cloudConsent, signal: abort.signal });
          const result:SecurityAnalysisResult=JSON.parse(JSON.stringify(rawResult),(_key,value)=>typeof value==='string'?redactAnalysisText(value,secrets):value);
          analyses.push(result); if (analyses.length > 100) analyses.shift(); reply(result);
        } else reply({ error: 'NOT_FOUND' }, 404);
      } finally { busy = false; res.off('close', onClose); }
    } catch (error) {
      if (!res.headersSent) reply({ error: error instanceof Error && /^(AI|POLICY)_[A-Z_]+$/.test(error.message) ? error.message : 'AI_CONSOLE_REQUEST_INVALID' }, 400);
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.maxConnections = 16;
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('AI_CONSOLE_LISTEN_FAILED');
  url = 'http://127.0.0.1:' + address.port;
  return { url, server, close: async () => { child?.kill(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); sandbox.close(); await runtime3.close(); } };
}
