/** Advisory-only API. No guard or policy mutation capability is exposed. */
export type ProviderProtocol = 'openai-compatible' | 'openai' | 'anthropic' | 'gemini' | 'ollama';
export interface ProviderConfig {
  id: string;
  kind: 'cloud' | 'local';
  protocol: ProviderProtocol;
  baseUrl: string;
  model: string;
  /** Keep in a host process/credential broker. Never serialize this config. */
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
  /** Explicitly opt into JSON mode on compatible endpoints that support it. */
  jsonMode?: boolean;
  /** Ollama only; conservative bounded context, never a hardware guarantee. */
  contextLength?: number;
}
export interface ModelInfo { id: string; sizeBytes?: number; capabilities?: string[] }
export interface ConnectionResult { ok: boolean; durationMs: number; models: ModelInfo[]; error?: string }
export interface SecurityEvidence { id: string; text: string }
export interface SecurityAnalysisRequest {
  events: SecurityEvidence[];
  /** Required for every cloud inference, after inspecting previewAnalysis(). */
  cloudConsent?: boolean;
  signal?: AbortSignal;
}
export interface SecurityAnalysisResult {
  verdict: 'suspicious' | 'benign' | 'uncertain';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  /** Model self-report, not a calibrated probability. */
  confidence: number | null;
  summary: string;
  evidence: Array<{ eventId: string; quote: string }>;
  reasoningSummary: string;
  recommendedActions: string[];
  provider: string;
  model: string;
  durationMs: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
  status: 'ok' | 'error';
  error?: string;
  advisoryOnly: true;
}
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly kind: 'cloud' | 'local';
  listModels(signal?: AbortSignal): Promise<ModelInfo[]>;
  testConnection(signal?: AbortSignal): Promise<ConnectionResult>;
  analyze(request: SecurityAnalysisRequest): Promise<SecurityAnalysisResult>;
}
export const PROVIDER_PRESETS = {
  ollama: { kind: 'local', protocol: 'ollama', baseUrl: 'http://127.0.0.1:11434' },
  lmstudio: { kind: 'local', protocol: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234/v1' },
  vllm: { kind: 'local', protocol: 'openai-compatible', baseUrl: 'http://127.0.0.1:8000/v1' },
  openai: { kind: 'cloud', protocol: 'openai', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { kind: 'cloud', protocol: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  gemini: { kind: 'cloud', protocol: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  deepseek: { kind: 'cloud', protocol: 'openai-compatible', baseUrl: 'https://api.deepseek.com' },
  qwen: { kind: 'cloud', protocol: 'openai-compatible', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
} as const;
