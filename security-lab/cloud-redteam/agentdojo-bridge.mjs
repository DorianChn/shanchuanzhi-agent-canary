import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 1_000_000;

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

function mapResponse(result, modelRef) {
  const toolCalls = Array.isArray(result.toolCalls) ? result.toolCalls : [];
  const calls = toolCalls.map((call, index) => ({
    id: call.id || `call_${index}_${randomUUID().slice(0, 8)}`,
    type: 'function',
    function: { name: call.name, arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments ?? {}) },
  }));
  return {
    id: result.id || `chatcmpl-${randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: result.model || modelRef.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: calls.length ? (result.content || null) : (result.content || '') , ...(calls.length ? { tool_calls: calls } : {}) },
      finish_reason: calls.length ? 'tool_calls' : 'stop',
    }],
    usage: {
      prompt_tokens: Number.isSafeInteger(result.usage?.inputTokens) ? result.usage.inputTokens : 0,
      completion_tokens: Number.isSafeInteger(result.usage?.outputTokens) ? result.usage.outputTokens : 0,
      total_tokens: (Number.isSafeInteger(result.usage?.inputTokens) ? result.usage.inputTokens : 0) + (Number.isSafeInteger(result.usage?.outputTokens) ? result.usage.outputTokens : 0),
    },
  };
}

function isProviderRejection(code) {
  return /(?:API_HTTP_(?:401|402|403|429)|CAMPAIGN_STOPPED_API_HTTP_(?:401|402|403|429))/.test(String(code));
}

export async function startAgentDojoBridge({ cloud, modelRef, runDir, token, onProviderStop = () => {} }) {
  if (!cloud || !modelRef || !runDir || !token) throw new Error('AGENTDOJO_BRIDGE_CONFIG_REQUIRED');
  fs.mkdirSync(runDir, { recursive: true });
  const stopFile = path.join(runDir, 'provider-stop.json');
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/v1/models') {
      if (!authorized(request, token)) return send(response, 401, { error: { code: 'LOCAL_BRIDGE_AUTH_FAILED' } });
      return send(response, 200, { object: 'list', data: [{ id: modelRef.model, object: 'model', created: 0, owned_by: 'agent-canary-local-bridge' }] });
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') return send(response, 404, { error: { code: 'NOT_FOUND' } });
    if (!authorized(request, token)) return send(response, 401, { error: { code: 'LOCAL_BRIDGE_AUTH_FAILED' } });
    let bytes = 0; let tooLarge = false; const chunks = [];
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
      if (!Array.isArray(body?.messages) || body.messages.length < 1 || body.messages.length > 200 || (body.tools !== undefined && !Array.isArray(body.tools))) {
        return send(response, 400, { error: { code: 'CHAT_REQUEST_SHAPE_INVALID' } });
      }
      const outputLimit = Number(body.max_tokens ?? body.max_completion_tokens ?? 512);
      const temperature = Number(body.temperature ?? 0);
      if (!Number.isInteger(outputLimit) || outputLimit < 1 || outputLimit > 8192 || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
        return send(response, 400, { error: { code: 'CHAT_REQUEST_LIMIT_INVALID' } });
      }
      try {
        const result = await cloud.complete(modelRef, {
          messages: body.messages,
          tools: body.tools ?? [],
          maxOutputTokens: outputLimit,
          temperature,
          purpose: 'agentdojo-benchmark',
        });
        return send(response, 200, mapResponse(result, modelRef));
      } catch (error) {
        const code = String(error?.code ?? error?.message ?? 'AGENTDOJO_MODEL_REQUEST_FAILED');
        if (isProviderRejection(code)) {
          try { fs.writeFileSync(stopFile, JSON.stringify({ at: new Date().toISOString(), code }, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 }); } catch { /* first stop record wins */ }
          onProviderStop(code);
          return send(response, 400, { error: { code: 'PROVIDER_REJECTED_REQUEST', message: 'Campaign stopped after a provider rejection.' } });
        }
        return send(response, 502, { error: { code: 'AGENTDOJO_MODEL_REQUEST_FAILED', message: 'The model request failed.' } });
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}/v1`, close: () => new Promise(resolve => server.close(resolve)) };
}

export { mapResponse as mapAgentDojoChatResponse };
