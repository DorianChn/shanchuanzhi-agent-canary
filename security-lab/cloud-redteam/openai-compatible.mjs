const safeContent = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(part => typeof part?.text === 'string' ? part.text : '').join('') : '';

export class ApiRequestError extends Error {
  constructor(code, { status = null, protocol = null, unsupported = false } = {}) {
    super(code);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.protocol = protocol;
    this.unsupported = unsupported;
  }
}

function endpointUrl(baseUrl, suffix) {
  return `${baseUrl.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
}

function unsupportedResponse(status, parsed) {
  if ([404, 405, 501].includes(status)) return true;
  const err = parsed?.error;
  const text = `${err?.code ?? ''} ${err?.type ?? ''} ${err?.message ?? ''}`.toLowerCase();
  return status === 400 && /unsupported|not supported|unknown endpoint|unknown route|not found|responses api|chat completions api/.test(text);
}

async function postJson({ endpoint, path, body, signal, fetchImpl, protocol }) {
  let response;
  try {
    response = await fetchImpl(endpointUrl(endpoint.baseUrl, path), {
      method: 'POST',
      headers: { authorization: `Bearer ${endpoint.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
      redirect: 'error',
    });
  } catch {
    throw new ApiRequestError('API_NETWORK_ERROR', { protocol });
  }
  let parsed = null;
  try { parsed = await response.json(); } catch { /* response body is deliberately not logged */ }
  if (!response.ok) throw new ApiRequestError(`API_HTTP_${response.status}`, { status: response.status, protocol, unsupported: unsupportedResponse(response.status, parsed) });
  if (!parsed || typeof parsed !== 'object') throw new ApiRequestError('API_RESPONSE_INVALID', { status: response.status, protocol });
  return parsed;
}

function normalizeChat(data) {
  const message = data?.choices?.[0]?.message;
  if (!message) throw new ApiRequestError('CHAT_COMPLETION_SHAPE_INVALID', { protocol: 'chat-completions' });
  return {
    id: data.id ?? null,
    model: data.model ?? null,
    protocol: 'chat-completions',
    content: safeContent(message.content),
    refusal: typeof message.refusal === 'string' ? message.refusal : null,
    toolCalls: (message.tool_calls ?? []).map(call => ({
      id: String(call.id ?? ''),
      name: String(call.function?.name ?? ''),
      arguments: call.function?.arguments ?? '{}',
    })),
    usage: { inputTokens: data.usage?.prompt_tokens ?? null, outputTokens: data.usage?.completion_tokens ?? null },
    raw: data,
  };
}

function normalizeResponses(data) {
  if (!Array.isArray(data?.output)) throw new ApiRequestError('RESPONSES_SHAPE_INVALID', { protocol: 'responses' });
  const calls = data.output.filter(item => item.type === 'function_call').map(call => ({
    id: String(call.call_id ?? call.id ?? ''),
    name: String(call.name ?? ''),
    arguments: call.arguments ?? '{}',
  }));
  const text = data.output.flatMap(item => item.type === 'message' ? (item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text ?? '') : []).join('');
  const refusal = data.output.flatMap(item => item.type === 'message' ? (item.content ?? []).filter(part => part.type === 'refusal').map(part => part.refusal ?? part.text ?? '') : []).join('') || null;
  return {
    id: data.id ?? null,
    model: data.model ?? null,
    protocol: 'responses',
    content: text,
    refusal,
    toolCalls: calls,
    usage: { inputTokens: data.usage?.input_tokens ?? null, outputTokens: data.usage?.output_tokens ?? null },
    raw: data,
  };
}

function responsesInput(messages) {
  return messages.map(message => {
    if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
      return message.tool_calls.map(call => ({ type: 'function_call', call_id: call.id, name: call.function.name, arguments: call.function.arguments }));
    }
    if (message.role === 'tool') return { type: 'function_call_output', call_id: message.tool_call_id, output: message.content };
    return { role: message.role, content: message.content };
  }).flat();
}

function responsesTools(tools = []) {
  return tools.map(tool => ({
    type: 'function',
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
    strict: false,
  }));
}

export async function completeWithProtocol({ modelRef, endpoint, protocol, messages, tools = [], maxOutputTokens = 512, temperature = 0, signal, fetchImpl = fetch }) {
  if (protocol === 'chat-completions') {
    const body = { model: modelRef.model, messages, max_tokens: maxOutputTokens, temperature, stream: false };
    if (tools.length) { body.tools = tools; body.tool_choice = 'auto'; }
    const data = await postJson({ endpoint, path: 'chat/completions', body, signal, fetchImpl, protocol });
    return normalizeChat(data);
  }
  if (protocol === 'responses') {
    const body = { model: modelRef.model, input: responsesInput(messages), max_output_tokens: maxOutputTokens, store: false };
    if (tools.length) { body.tools = responsesTools(tools); body.tool_choice = 'auto'; }
    const data = await postJson({ endpoint, path: 'responses', body, signal, fetchImpl, protocol });
    return normalizeResponses(data);
  }
  throw new ApiRequestError('API_PROTOCOL_INVALID');
}

export async function detectProtocol({ modelRef, endpoint, protocolHint = 'auto', fetchImpl = fetch, signal = AbortSignal.timeout(20_000), maxOutputTokens = 1 }) {
  const protocols = protocolHint === 'auto' ? ['chat-completions', 'responses'] : [protocolHint];
  const messages = [
    { role: 'system', content: 'Protocol connectivity probe. Reply with one character.' },
    { role: 'user', content: 'OK' },
  ];
  const attempts = [];
  for (const protocol of protocols) {
    try {
      const result = await completeWithProtocol({ modelRef, endpoint, protocol, messages, maxOutputTokens, signal, fetchImpl });
      if (!result.model || !result.id) throw new ApiRequestError('API_PROBE_ID_MISSING', { protocol });
      return { protocol, modelId: result.model, responseId: result.id, usage: result.usage, attempts: [...attempts, { protocol, result: 'supported' }] };
    } catch (error) {
      const unsupported = error instanceof ApiRequestError && error.unsupported;
      attempts.push({ protocol, result: unsupported ? 'unsupported' : 'failed', code: error?.code ?? 'API_PROBE_FAILED' });
      if (!unsupported) throw error;
    }
  }
  return { protocol: null, modelId: null, responseId: null, usage: { inputTokens: null, outputTokens: null }, attempts };
}

export async function listModels({ endpoint, fetchImpl = fetch, signal = AbortSignal.timeout(15_000) }) {
  let response;
  try {
    response = await fetchImpl(endpointUrl(endpoint.baseUrl, 'models'), {
      method: 'GET', headers: { authorization: `Bearer ${endpoint.apiKey}` }, signal, redirect: 'error',
    });
  } catch { throw new ApiRequestError('API_MODELS_NETWORK_ERROR'); }
  let data = null;
  try { data = await response.json(); } catch { /* body intentionally suppressed */ }
  if (!response.ok) throw new ApiRequestError(`API_MODELS_HTTP_${response.status}`, { status: response.status });
  if (!Array.isArray(data?.data)) throw new ApiRequestError('API_MODELS_SHAPE_INVALID');
  return data.data.map(item => String(item.id ?? '')).filter(Boolean);
}
