import http from 'node:http';
import https from 'node:https';
import type dns from 'node:dns';
import { resolveWebhookTargets } from '../webhook.js';
import type { ProviderConfig } from './types.js';

export class AITransportError extends Error {
  constructor(readonly code: string, readonly retryable = false) { super(code); }
}
export function validateAIEndpoint(config: Pick<ProviderConfig, 'baseUrl' | 'kind'>): URL {
  let url: URL;
  try { url = new URL(config.baseUrl); } catch { throw new Error('AI_ENDPOINT_INVALID'); }
  if (url.username || url.password || url.search || url.hash) throw new Error('AI_ENDPOINT_INVALID');
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (config.kind === 'local') {
    if (!loopback || url.protocol !== 'http:') throw new Error('AI_LOCAL_REQUIRES_LOOPBACK_HTTP');
  } else if (config.kind !== 'cloud' || url.protocol !== 'https:' || loopback) {
    throw new Error('AI_CLOUD_REQUIRES_PUBLIC_HTTPS');
  }
  return url;
}
/** DNS checked once and pinned to the socket; no redirects, bounded response. */
export async function requestAIJson(config: ProviderConfig, suffix: string, body: unknown, signal: AbortSignal): Promise<any> {
  const base = validateAIEndpoint(config);
  const target = new URL(base.toString().replace(/\/$/, '') + suffix);
  signal.throwIfAborted();
  let addresses;
  let abortDNS: (()=>void) | undefined;
  try {
    addresses = await Promise.race([resolveWebhookTargets(target.toString()), new Promise<never>((_resolve,reject)=>{
      abortDNS=()=>reject(new AITransportError('AI_CANCELLED_OR_TIMEOUT'));
      signal.addEventListener('abort',abortDNS,{once:true});
    })]);
  }
  catch { throw new AITransportError(signal.aborted ? 'AI_CANCELLED_OR_TIMEOUT' : 'AI_DNS_OR_DESTINATION_REJECTED'); }
  finally { if(abortDNS)signal.removeEventListener('abort',abortDNS); }
  signal.throwIfAborted();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.apiKey) {
    if (config.protocol === 'anthropic') headers['x-api-key'] = config.apiKey;
    else if (config.protocol === 'gemini') headers['x-goog-api-key'] = config.apiKey;
    else headers.authorization = `Bearer ${config.apiKey}`;
  }
  if (config.protocol === 'anthropic') headers['anthropic-version'] = '2023-06-01';
  const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
  if (payload) headers['content-length'] = String(payload.length);
  return new Promise((resolve, reject) => {
    const lookup = ((_host: string, options: any, callback: any) => {
      if (options?.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    }) as typeof dns.lookup;
    const transport = target.protocol === 'http:' ? http : https;
    const req = transport.request(target, { method: payload ? 'POST' : 'GET', headers, lookup, signal }, res => {
      const status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        res.destroy();
        reject(new AITransportError(`AI_HTTP_${status}`, status === 429 || status === 503));
        return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 256_000) { res.destroy(); reject(new AITransportError('AI_RESPONSE_TOO_LARGE')); }
        else chunks.push(chunk);
      });
      res.on('error', () => reject(new AITransportError('AI_RESPONSE_INTERRUPTED')));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new AITransportError('AI_RESPONSE_JSON_INVALID')); }
      });
    });
    req.on('error', () => reject(new AITransportError(signal.aborted ? 'AI_CANCELLED_OR_TIMEOUT' : 'AI_NETWORK_ERROR')));
    req.end(payload);
  });
}
