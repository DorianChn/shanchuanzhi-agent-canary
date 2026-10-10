/**
 * Model providers for eval mode. These adapters support:
 *  - openai-compatible (covers OpenAI + DeepSeek + Moonshot + most CN relays via --base-url)
 *  - Anthropic
 *  - local Ollama through its loopback OpenAI-compatible endpoint
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** tool role: id of the assistant tool_call this result answers */
  toolCallId?: string;
  /** assistant role: tool calls the model made in this turn */
  toolCalls?: ToolCallRequest[];
}

export interface ToolCallRequest {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderTurn {
  content: string;
  toolCalls: ToolCallRequest[];
}

export interface EvalProvider {
  readonly label: string;
  chat(model: string, messages: ChatMessage[], tools: ToolDef[]): Promise<ProviderTurn>;
}

export interface ProviderOptions {
  timeoutMs?: number;
  allowInsecureHttp?: boolean;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function validatedBaseUrl(baseUrl: string, allowInsecureHttp = false): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("provider base URL must be a valid absolute URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("provider base URL must use HTTPS (HTTP is allowed for loopback only).");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("provider base URL must not contain credentials, a query, or a fragment.");
  }
  if (
    url.protocol === "http:" &&
    !LOOPBACK_HOSTS.has(normalizeHost(url.hostname)) &&
    !allowInsecureHttp
  ) {
    throw new Error("plain HTTP is allowed only for localhost; use HTTPS or explicitly pass --allow-insecure-http.");
  }
  return url;
}

function timeoutValue(timeoutMs: number | undefined): number {
  const value = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(value) || value < 1_000 || value > 600_000) {
    throw new RangeError("provider timeout must be an integer from 1000 to 600000 milliseconds.");
  }
  return value;
}

function safeParseArgs(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error("provider returned missing tool arguments.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("provider returned invalid JSON tool arguments.");
  }
  if (!isRecord(parsed)) throw new Error("provider tool arguments must be a JSON object.");
  return parsed;
}

function errorResponse(res: Response): Error {
  return new Error("provider returned HTTP " + res.status + ".");
}

function parseOpenAiTurn(value: unknown): ProviderTurn {
  if (!isRecord(value) || !Array.isArray(value.choices) || value.choices.length === 0) {
    throw new Error("provider returned no chat completion choices.");
  }
  const choice = value.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    throw new Error("provider returned an invalid chat completion message.");
  }
  if (choice.finish_reason === "length") throw new Error("provider response was truncated by its token limit.");

  const msg = choice.message;
  if (msg.content !== undefined && msg.content !== null && typeof msg.content !== "string") {
    throw new Error("provider returned unsupported message content.");
  }
  const calls = msg.tool_calls ?? [];
  if (!Array.isArray(calls)) throw new Error("provider returned an invalid tool-call list.");
  const toolCalls = calls.map((rawCall) => {
    if (!isRecord(rawCall) || !isRecord(rawCall.function)) {
      throw new Error("provider returned an invalid tool call.");
    }
    if (rawCall.type !== undefined && rawCall.type !== "function") {
      throw new Error("provider returned an unsupported tool-call type.");
    }
    const id = typeof rawCall.id === "string" ? rawCall.id : "";
    const name = typeof rawCall.function.name === "string" ? rawCall.function.name : "";
    if (!id.trim() || !name.trim()) throw new Error("provider returned a tool call without an id or name.");
    return { id, name, args: safeParseArgs(rawCall.function.arguments) };
  });
  return { content: typeof msg.content === "string" ? msg.content : "", toolCalls };
}

export function openaiCompatibleProvider(
  baseUrl: string,
  apiKey: string,
  options: ProviderOptions = {}
): EvalProvider {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new Error("an API key is required for this OpenAI-compatible endpoint.");
  }
  const base = validatedBaseUrl(baseUrl, options.allowInsecureHttp);
  const timeoutMs = timeoutValue(options.timeoutMs);
  const endpoint = base.origin + base.pathname.replace(/\/+$/, "") + "/chat/completions";
  return {
    label: "openai-compatible (" + baseUrl + ")",
    async chat(model, messages, tools) {
      const wire = messages.map((m) => {
        if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
            })),
          };
        }
        return { role: m.role, content: m.content };
      });
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: wire,
          tools: tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
          temperature: 0,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw errorResponse(res);
      let response: unknown;
      try {
        response = await res.json();
      } catch {
        throw new Error("provider returned invalid JSON.");
      }
      return parseOpenAiTurn(response);
    },
  };
}

/** Local Ollama through its OpenAI-compatible loopback endpoint; its documented placeholder key is not a secret. */
export function ollamaProvider(
  baseUrl = "http://localhost:11434/v1",
  options: Pick<ProviderOptions, "timeoutMs"> = {}
): EvalProvider {
  const base = validatedBaseUrl(baseUrl);
  if (base.protocol !== "http:" || !LOOPBACK_HOSTS.has(normalizeHost(base.hostname))) {
    throw new Error("the ollama provider is restricted to a local HTTP loopback server.");
  }
  const provider = openaiCompatibleProvider(baseUrl, "ollama", options);
  return { ...provider, label: "ollama (" + baseUrl + ")" };
}

export function anthropicProvider(
  apiKey: string,
  options: Pick<ProviderOptions, "timeoutMs"> = {}
): EvalProvider {
  const timeoutMs = timeoutValue(options.timeoutMs);
  return {
    label: "anthropic",
    async chat(model, messages, tools) {
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const convo: Array<Record<string, unknown>> = [];
      for (const m of messages) {
        if (m.role === "system") continue;
        if (m.role === "user") {
          convo.push({ role: "user", content: [{ type: "text", text: m.content }] });
        } else if (m.role === "assistant") {
          const content: Array<Record<string, unknown>> = [];
          if (m.content) content.push({ type: "text", text: m.content });
          for (const tc of m.toolCalls ?? []) {
            content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.args ?? {} });
          }
          if (content.length) convo.push({ role: "assistant", content });
        } else if (m.role === "tool") {
          convo.push({
            role: "user",
            content: [{ type: "tool_result", tool_use_id: m.toolCallId, content: m.content }],
          });
        }
      }
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          temperature: 0,
          system: system || undefined,
          messages: convo,
          tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw errorResponse(res);
      let response: unknown;
      try {
        response = await res.json();
      } catch {
        throw new Error("provider returned invalid JSON.");
      }
      if (!isRecord(response) || !Array.isArray(response.content)) {
        throw new Error("provider returned an invalid message response.");
      }
      if (response.stop_reason === "max_tokens") throw new Error("provider response was truncated by its token limit.");
      let content = "";
      const toolCalls: ToolCallRequest[] = [];
      for (const rawBlock of response.content) {
        if (!isRecord(rawBlock)) throw new Error("provider returned an invalid content block.");
        if (rawBlock.type === "text") {
          if (typeof rawBlock.text !== "string") throw new Error("provider returned invalid text content.");
          content += rawBlock.text;
        }
        if (rawBlock.type === "tool_use") {
          const id = typeof rawBlock.id === "string" ? rawBlock.id : "";
          const name = typeof rawBlock.name === "string" ? rawBlock.name : "";
          if (!id.trim() || !name.trim()) throw new Error("provider returned a tool use without an id or name.");
          toolCalls.push({ id, name, args: safeParseArgs(rawBlock.input) });
        }
      }
      return { content, toolCalls };
    },
  };
}
