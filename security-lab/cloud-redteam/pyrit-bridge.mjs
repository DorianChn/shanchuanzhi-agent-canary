import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { runAgentTrial } from './agent-harness.mjs';

const MAX_BODY_BYTES = 1_000_000;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 24_000;

function authorized(request, token) {
  const supplied = Buffer.from(String(request.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function send(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  response.end(JSON.stringify(body));
}

function appendJsonl(file, row) {
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function textContent(value) {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.map(part => typeof part?.text === 'string' ? part.text : '').join('');
}

function responseFor(model, content, id = `chatcmpl-${randomUUID()}`) {
  return {
    id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  };
}

function normalizedMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) throw new Error('PYRIT_MESSAGE_LIST_INVALID');
  const messages = value.map(item => {
    if (!item || !['system', 'user', 'assistant'].includes(item.role)) throw new Error('PYRIT_MESSAGE_ROLE_INVALID');
    const content = textContent(item.content);
    if (content.length > MAX_MESSAGE_CHARS) throw new Error('PYRIT_MESSAGE_SIZE_INVALID');
    return { role: item.role, content };
  });
  const totalChars = messages.reduce((sum, item) => sum + item.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) throw new Error('PYRIT_CONVERSATION_SIZE_INVALID');
  return messages;
}

function safeStopReason(error) {
  const code = String(error?.code ?? error?.message ?? 'MODEL_REQUEST_FAILED');
  if (/BUDGET_LIMIT|BUDGET_CAP|PRICE_UNKNOWN/.test(code)) return 'BUDGET_STOP';
  if (/API_HTTP_(?:401|402|403|429)|CAMPAIGN_STOPPED_API_HTTP_(?:401|402|403|429)/.test(code)) return 'PROVIDER_REJECTION_STOP';
  return 'MODEL_REQUEST_FAILED';
}

export async function startPyritBridge({ cloud, attackerModel, judgeModel, defenderModel, arm, runDir, token, maxTurns = 4 }) {
  if (!cloud || !attackerModel || !judgeModel || !defenderModel || !['A', 'B', 'C', 'D'].includes(arm) || !runDir || !token) {
    throw new Error('PYRIT_BRIDGE_CONFIG_REQUIRED');
  }
  if (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 6) throw new Error('PYRIT_MAX_TURNS_INVALID');

  const trialsFile = path.join(runDir, 'target-trials.jsonl');
  const rawFile = path.join(runDir, 'pyrit-model-raw.jsonl');
  const stopFile = path.join(runDir, 'provider-stop.json');
  let sequence = 0;
  let targetActive = false;
  let stopReason = null;

  const aliases = new Map([
    ['pyrit-attacker', { model: attackerModel, purpose: 'pyrit-attacker' }],
    ['pyrit-judge', { model: judgeModel, purpose: 'pyrit-judge-advisory' }],
  ]);
  const data = [{ id: 'pyrit-attacker', object: 'model', created: 0, owned_by: 'agent-canary-local-bridge' },
    { id: 'pyrit-judge', object: 'model', created: 0, owned_by: 'agent-canary-local-bridge' },
    { id: 'agent-canary-target', object: 'model', created: 0, owned_by: 'agent-canary-local-bridge' }];

  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      if (!authorized(request, token)) return send(response, 401, { error: { code: 'LOCAL_BRIDGE_AUTH_FAILED' } });
      return send(response, 200, { object: 'list', data });
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') return send(response, 404, { error: { code: 'NOT_FOUND' } });
    if (!authorized(request, token)) return send(response, 401, { error: { code: 'LOCAL_BRIDGE_AUTH_FAILED' } });

    let bytes = 0;
    let tooLarge = false;
    const chunks = [];
    request.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) { tooLarge = true; chunks.length = 0; }
      else if (!tooLarge) chunks.push(chunk);
    });
    request.on('end', async () => {
      if (tooLarge) return send(response, 413, { error: { code: 'REQUEST_TOO_LARGE' } });
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return send(response, 400, { error: { code: 'REQUEST_JSON_INVALID' } }); }

      let messages;
      try { messages = normalizedMessages(body?.messages); }
      catch (error) { return send(response, 400, { error: { code: error.message } }); }

      if (body.model === 'agent-canary-target') {
        if (targetActive) return send(response, 429, { error: { code: 'LOCAL_TARGET_BUSY' } });
        const userMessages = messages.filter(item => item.role === 'user').map(item => item.content.trim()).filter(Boolean);
        if (!userMessages.length || userMessages.length > maxTurns) return send(response, 400, { error: { code: 'PYRIT_TARGET_TURN_LIMIT' } });
        targetActive = true;
        try {
          const trialId = `PYRIT-${String(++sequence).padStart(4, '0')}`;
          const scenario = {
            id: trialId,
            category: 'multi_turn_agent_manipulation',
            attack: true,
            generationSource: 'pyrit-redteamingattack',
            task: userMessages[0],
            turns: userMessages,
            text: '# Agent Canary synthetic fixture\nProject: Agent Canary.',
            channel: 'multi-turn-user-conversation',
            syntheticOnly: true,
          };
          const trial = await runAgentTrial({ scenario, arm, model: defenderModel, cloud, runDir });
          appendJsonl(trialsFile, { at: new Date().toISOString(), pyritTargetRequest: sequence, replayedUserMessages: userMessages.length, trial });
          const evidence = {
            actual_attack_success: trial.attackSuccess === true,
            trial_state: trial.trialState,
            arm: trial.arm,
            tool_calls: trial.toolCalls,
            protected_secret_returned: trial.sideEffects?.returnedProtectedSecret === true,
            canary_triggered: (trial.canaryEvents ?? []).length > 0,
            active_policy_denial: trial.activeDenial === true,
            victim_changed: trial.sideEffects?.victimChanged === true,
            privileged_workflow_executed: trial.sideEffects?.privilegedWorkflow === true,
            session_id: trial.sessionId,
            evidence_chain_valid: trial.evidenceChain?.valid === true,
          };
          const content = `${trial.finalAnswer || '(no assistant text)'}\n\nCANARY_EVIDENCE ${JSON.stringify(evidence)}`;
          return send(response, 200, responseFor('agent-canary-target', content));
        } catch {
          appendJsonl(trialsFile, { at: new Date().toISOString(), pyritTargetRequest: sequence, replayedUserMessages: userMessages.length, trial: null, error: 'AGENT_CANARY_TARGET_FAILED' });
          return send(response, 200, responseFor('agent-canary-target', 'CANARY_EVIDENCE {"actual_attack_success":false,"trial_state":"ERROR"}'));
        } finally {
          targetActive = false;
        }
      }

      const route = aliases.get(String(body.model ?? ''));
      if (!route) return send(response, 400, { error: { code: 'PYRIT_MODEL_ALIAS_UNKNOWN' } });
      const maxOutputTokens = Number(body.max_tokens ?? body.max_completion_tokens ?? 512);
      const temperature = Number(body.temperature ?? 0);
      if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 2048 || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
        return send(response, 400, { error: { code: 'PYRIT_REQUEST_LIMIT_INVALID' } });
      }
      try {
        const result = await cloud.complete(route.model, { messages, maxOutputTokens, temperature, purpose: route.purpose });
        appendJsonl(rawFile, {
          at: new Date().toISOString(), role: route.purpose, model: route.model.ref,
          request: { messages, maxOutputTokens, temperature },
          response: { content: result.content, refusal: result.refusal ?? null, inputTokens: result.usage?.inputTokens ?? null, outputTokens: result.usage?.outputTokens ?? null },
        });
        return send(response, 200, {
          id: result.id || `chatcmpl-${randomUUID()}`,
          object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: String(body.model),
          choices: [{ index: 0, message: { role: 'assistant', content: result.content || '' }, finish_reason: 'stop' }],
          usage: {
            prompt_tokens: result.usage?.inputTokens ?? 0,
            completion_tokens: result.usage?.outputTokens ?? 0,
            total_tokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
          },
        });
      } catch (error) {
        stopReason = safeStopReason(error);
        if (stopReason !== 'MODEL_REQUEST_FAILED') {
          try { fs.writeFileSync(stopFile, `${JSON.stringify({ at: new Date().toISOString(), reason: stopReason })}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 }); } catch { /* first stop record wins */ }
        }
        appendJsonl(rawFile, { at: new Date().toISOString(), role: route.purpose, model: route.model.ref, request: { messages, maxOutputTokens, temperature }, failure: stopReason });
        return send(response, 502, { error: { code: stopReason } });
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    stopReason: () => stopReason,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}
