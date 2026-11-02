export const E4_MODEL_PROFILES = Object.freeze({
  'gpt-6.1-sol': Object.freeze({
    provider: 'openai',
    displayName: 'GPT-6.1 Sol',
    modelId: 'gpt-6.1-sol',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    protocol: 'responses',
  }),
  'deepseek-flash-1017': Object.freeze({
    provider: 'deepseek',
    displayName: 'DeepSeek V4.1 Flash 1017',
    modelId: 'deepseek-flash',
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    protocol: 'responses',
  }),
});

export function resolveE4ModelProfile(target) {
  return typeof target === 'string' ? E4_MODEL_PROFILES[target] : undefined;
}

export function chatToolsToResponsesTools(tools) {
  if (!Array.isArray(tools)) throw new Error('MODEL_TOOLS_INVALID');
  return tools.map((tool) => {
    const fn = tool?.function;
    if (tool?.type !== 'function' || typeof fn?.name !== 'string' || !fn.name ||
        typeof fn.description !== 'string' || !fn.parameters || typeof fn.parameters !== 'object') {
      throw new Error('MODEL_TOOL_DEFINITION_INVALID');
    }
    return {
      type: 'function',
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    };
  });
}

export function buildResponsesRequest({ model, input, tools, maxOutputTokens = 512 }) {
  if (typeof model !== 'string' || !model || !Array.isArray(input) || !Array.isArray(tools) ||
      !Number.isInteger(maxOutputTokens) || maxOutputTokens < 16) {
    throw new Error('MODEL_RESPONSES_REQUEST_INVALID');
  }
  return {
    model,
    input,
    tools,
    tool_choice: 'auto',
    parallel_tool_calls: false,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort: 'low' },
    store: false,
    stream: false,
  };
}

export function responseFunctionCalls(response) {
  if (!Array.isArray(response?.output)) throw new Error('MODEL_RESPONSES_OUTPUT_INVALID');
  return response.output.filter((item) => item?.type === 'function_call').map((item) => {
    if (typeof item.call_id !== 'string' || !item.call_id || typeof item.name !== 'string' ||
        typeof item.arguments !== 'string') {
      throw new Error('MODEL_RESPONSES_FUNCTION_CALL_INVALID');
    }
    return { id: item.call_id, name: item.name, arguments: item.arguments };
  });
}

export function appendResponsesTurn(input, response, outputs) {
  if (!Array.isArray(input) || !Array.isArray(response?.output) || !Array.isArray(outputs) ||
      outputs.some((item) => item?.type !== 'function_call_output' || typeof item.call_id !== 'string' || typeof item.output !== 'string')) {
    throw new Error('MODEL_RESPONSES_TURN_INVALID');
  }
  return [...input, ...response.output, ...outputs];
}
