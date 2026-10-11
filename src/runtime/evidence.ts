import fs from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';

export const EVIDENCE_VERSION = '0.1' as const;
export type EvidenceDecision = 'ALLOW'|'DENY'|'REQUIRE_APPROVAL'|'SANDBOX'|'OBSERVE_ONLY';
export type ExecutionStatus = 'NOT_STARTED'|'RUNNING'|'SUCCEEDED'|'FAILED'|'CANCELLED';
export type SideEffectVerification = 'NOT_STARTED'|'VERIFIED'|'NOT_VERIFIED'|'FAILED';
export interface SecurityEvidenceEvent {
  schema_version: '0.1'; evidence_id: string; session_id: string; agent_id: string;
  tool_id: string; request_id: string; request_digest: string; policy_version: string;
  decision: EvidenceDecision; decision_reason: string; approval_reference: string|null;
  execution_status: ExecutionStatus; side_effect_verification: SideEffectVerification;
  timestamp: string; previous_event_digest: string|null; event_digest: string;
}
/** Sorted UTF-16 keys, UTF-8 JSON, finite numbers, plain JSON only. Not RFC 8785. */
export function canonicalJSON(value: unknown): string {
  let nodes = 0;
  function visit(v: unknown, depth: number): unknown {
    if (++nodes > 8192 || depth > 16) throw Error('EVIDENCE_JSON_LIMIT');
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v !== 'object' || !v || (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)) throw Error('EVIDENCE_JSON_REQUIRED');
    const out: any = Array.isArray(v) ? [] : Object.create(null);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    for (const key of Object.keys(descriptors).sort()) {
      if (Array.isArray(v) && key === 'length') continue;
      const d = descriptors[key];
      if (!('value' in d) || d.get || d.set) throw Error('EVIDENCE_ACCESSOR_REJECTED');
      out[key] = visit(d.value, depth + 1);
    }
    return out;
  }
  const result = JSON.stringify(visit(value, 0));
  if (Buffer.byteLength(result) > 65_536) throw Error('EVIDENCE_JSON_LIMIT');
  return result;
}
export function evidenceDigest(value: unknown): string {return createHash('sha256').update(canonicalJSON(value)).digest('hex');}
const fields = ['schema_version','evidence_id','session_id','agent_id','tool_id','request_id','request_digest','policy_version','decision','decision_reason','approval_reference','execution_status','side_effect_verification','timestamp','previous_event_digest','event_digest'].sort();
export function validateEvidence(event: unknown): event is SecurityEvidenceEvent {
  try {
    const e = JSON.parse(canonicalJSON(event));
    if (Object.keys(e).sort().join() !== fields.join() || e.schema_version !== EVIDENCE_VERSION) return false;
    if (typeof e.evidence_id !== 'string' || !/^[0-9a-f-]{36}$/.test(e.evidence_id)) return false;
    for (const key of ['session_id','agent_id','tool_id','request_id','policy_version','decision_reason']) if (typeof e[key] !== 'string' || !/^[A-Za-z0-9_.:-]{1,100}$/.test(e[key])) return false;
    if (!['ALLOW','DENY','REQUIRE_APPROVAL','SANDBOX','OBSERVE_ONLY'].includes(e.decision) || !['NOT_STARTED','RUNNING','SUCCEEDED','FAILED','CANCELLED'].includes(e.execution_status) || !['NOT_STARTED','VERIFIED','NOT_VERIFIED','FAILED'].includes(e.side_effect_verification)) return false;
    for (const key of ['request_digest','event_digest']) if (typeof e[key] !== 'string' || !/^[a-f0-9]{64}$/.test(e[key])) return false;
    if (e.previous_event_digest !== null && (typeof e.previous_event_digest !== 'string' || !/^[a-f0-9]{64}$/.test(e.previous_event_digest))) return false;
    if (e.approval_reference !== null && (typeof e.approval_reference !== 'string' || !/^[a-f0-9]{64}$/.test(e.approval_reference))) return false;
    return typeof e.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e.timestamp) && Number.isFinite(Date.parse(e.timestamp));
  } catch {return false;}
}
export function verifyEvidenceChain(events: unknown[], expectedHead?: string): {valid: boolean; reason: string; head: string|null} {
  let previous: string|null = null;
  for (const event of events) {
    if (!validateEvidence(event)) return {valid:false,reason:'INVALID_SCHEMA',head:previous};
    const {event_digest, ...unsigned} = event;
    if (event.previous_event_digest !== previous || evidenceDigest(unsigned) !== event_digest) return {valid:false,reason:'CHAIN_MISMATCH',head:previous};
    previous = event_digest;
  }
  return {valid:expectedHead === undefined || expectedHead === previous,reason:expectedHead !== undefined && expectedHead !== previous?'HEAD_MISMATCH':'VALID_LOCAL_CHAIN',head:previous};
}
/** Single trusted writer. New file only; bounded, no silent eviction or overwrite. */
export class EvidenceRecorder {
  private readonly events: SecurityEvidenceEvent[] = [];
  private fd: number|undefined;
  private bytes = 0;
  private closed = false;
  private failed = false;
  constructor(readonly maxEvents = 4096, file?: string) {
    if (!Number.isInteger(maxEvents) || maxEvents < 2 || maxEvents > 4096) throw Error('EVIDENCE_LIMIT_INVALID');
    if (file) this.fd = fs.openSync(file, 'wx', 0o600);
  }
  record(input: Omit<SecurityEvidenceEvent,'schema_version'|'evidence_id'|'timestamp'|'previous_event_digest'|'event_digest'>): SecurityEvidenceEvent {
    if (this.closed || this.failed || this.events.length >= this.maxEvents) throw Error('EVIDENCE_UNAVAILABLE_OR_FULL');
    const unsigned = {...input, schema_version:EVIDENCE_VERSION, evidence_id:randomUUID(), timestamp:new Date().toISOString(), previous_event_digest:this.events.at(-1)?.event_digest??null};
    const event = {...unsigned, event_digest:evidenceDigest(unsigned)};
    if (!validateEvidence(event)) throw Error('EVIDENCE_INVALID_EVENT');
    const line = Buffer.from(canonicalJSON(event)+'\n');
    if (this.bytes + line.length > 8_388_608) throw Error('EVIDENCE_BYTE_LIMIT');
    try {
      if (this.fd !== undefined) {
        let offset = 0;
        while (offset < line.length) {const n = fs.writeSync(this.fd,line,offset,line.length-offset); if (n <= 0) throw Error('EVIDENCE_SHORT_WRITE'); offset += n;}
        fs.fsyncSync(this.fd);
      }
    } catch {this.failed = true; throw Error('EVIDENCE_WRITE_FAILED');}
    this.bytes += line.length;
    this.events.push(Object.freeze(event));
    return event;
  }
  snapshot(): SecurityEvidenceEvent[] {return this.events.map(e=>({...e}));}
  /** Reserve intent + outcome capacity before admitting an effect. */
  canRecord(count = 2): boolean {return !this.closed && !this.failed && this.events.length + count <= this.maxEvents && this.bytes + count * 2048 <= 8_388_608;}
  close(): void {if (this.fd !== undefined) {fs.closeSync(this.fd); this.fd = undefined;} this.closed = true;}
}
