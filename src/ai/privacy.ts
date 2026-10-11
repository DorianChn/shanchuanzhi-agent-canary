import type { SecurityEvidence } from './types.js';
/** Best-effort minimization, not DLP certification. Preview before cloud consent. */
export function redactAnalysisText(input: string, secrets: string[] = []): string {
  let text = input;
  for (const secret of secrets) if (secret) text = text.split(secret).join('[REDACTED]');
  return text
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{8,}|cnry_[A-Za-z0-9_-]+|AKIA[A-Z0-9]{16})\b/g, '[REDACTED]')
    .replace(/\b(?:bearer\s+)[^\s"'<>]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api[_-]?key|password|passwd|secret|access[_-]?token|authorization|cookie)\s*["']?\s*[:=]\s*)[^\r\n]+/gi, '[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED EMAIL]')
    .replace(/\b1[3-9]\d{9}\b/g, '[REDACTED PHONE]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}
export function previewAnalysis(events: SecurityEvidence[], secrets: string[] = []): SecurityEvidence[] {
  if (!Array.isArray(events) || events.length < 1 || events.length > 32) throw new Error('AI_INPUT_INVALID');
  const seen = new Set<string>();
  let bytes = 0;
  return events.map(event => {
    if (!event || typeof event.id !== 'string' || !/^[\w.-]{1,80}$/.test(event.id) || seen.has(event.id) || typeof event.text !== 'string' || !event.text || event.text.length > 6000) throw new Error('AI_INPUT_INVALID');
    seen.add(event.id);
    if (redactAnalysisText(event.id, secrets) !== event.id) throw new Error('AI_INPUT_ID_SENSITIVE');
    const text = redactAnalysisText(event.text, secrets);
    bytes += Buffer.byteLength(text);
    if (bytes > 24_000) throw new Error('AI_INPUT_TOO_LARGE');
    return { id: event.id, text };
  });
}

/** Preserve field values and explicit IDs while avoiding JSON-escape-heavy model quotes. */
export function formatAnalysisEvent(event: Record<string, unknown>): string {
  return Object.entries(event).map(([key,value]) => key + ': ' + (typeof value === 'string' ? value : JSON.stringify(value))).join('\n');
}
