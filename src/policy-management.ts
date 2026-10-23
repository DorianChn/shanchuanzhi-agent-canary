import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { AgentGuard, ToolCall } from './containment.js';
import { CanaryBlockedError } from './containment.js';
import { isDecoy } from './sdk.js';
import { createRiskPolicyRouter, PolicyBlockedError, type PolicyDecision, type RiskPolicyOptions } from './risk-policy.js';
import { canonicalJSON, evidenceDigest } from './runtime/evidence.js';

export type PolicyInvocationSource = 'SDK' | 'NATIVE_HOOK' | 'GATEWAY' | 'HOST';
export type PolicyDecisionSource = 'PROJECT_POLICY' | 'DETERMINISTIC_POLICY' | 'MODEL_REVIEW' | 'CANARY_GUARD' | 'NATIVE_HOOK' | 'GATEWAY' | 'TOOL' | 'HOST';
export type PolicyOutcome = 'ALLOW' | 'DENY' | 'UNKNOWN' | 'REQUIRE_CONFIRMATION' | 'NOT_APPLICABLE';
export type PolicyExecutionStatus = 'NOT_STARTED' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
export type PolicySideEffectStatus = 'NOT_STARTED' | 'VERIFIED' | 'NOT_VERIFIED' | 'UNKNOWN';

/** Project rules can only add a deny. They cannot grant or weaken a baseline capability. */
export interface ProjectPolicyRule {
  id: string;
  tool: string;
  risk?: 'READ_ONLY' | 'WRITE' | 'EXECUTE' | 'NETWORK' | 'SENSITIVE_DATA' | 'DESTRUCTIVE';
  effect: 'DENY';
  reasonCode: string;
}

export interface PolicyConflict { code: 'DUPLICATE_ID' | 'OVERLAPPING_SELECTOR'; ruleIds: string[] }
export interface PolicyPreview {
  projectPolicyVersion: number;
  added: string[];
  removed: string[];
  changed: string[];
  conflicts: PolicyConflict[];
  weakensProjectPolicy: boolean;
  requiresWeakeningAcknowledgement: boolean;
  rules: ProjectPolicyRule[];
}

export interface PolicyAuditEvent {
  schema_version: 'agent-canary.policy-audit/1';
  event_id: string;
  timestamp: string;
  project_id: string;
  event_type: 'POLICY_APPLIED' | 'POLICY_ROLLED_BACK' | 'POLICY_CHANGE_REJECTED' | 'DECISION' | 'EXECUTION_RESULT';
  policy_version: number;
  invocation_source: PolicyInvocationSource;
  decision_source: PolicyDecisionSource;
  decision: PolicyOutcome;
  execution_status: PolicyExecutionStatus;
  side_effect_verification: PolicySideEffectStatus;
  reason_code: string;
  tool_id: string | null;
  actor_digest: string | null;
  rule_ids: string[];
  rules_snapshot: ProjectPolicyRule[] | null;
  previous_event_digest: string | null;
  event_digest: string;
}

export interface ManagedRiskPolicyOptions<T> extends RiskPolicyOptions {
  guard: AgentGuard;
  executeRealTool: (call: ToolCall) => T | Promise<T>;
  /** Host-owned directory outside the project; defaults to the user's Agent Canary data directory. */
  policyStorageDirectory?: string;
  /** Host-authored source label, never read from tool arguments. */
  invocationSource?: PolicyInvocationSource;
  /** Identify a trusted review callback's origin; defaults to HOST. */
  reviewDecisionSource?: 'MODEL_REVIEW' | 'HOST';
}

export interface ProjectPolicyManager {
  readonly projectId: string;
  currentVersion(): number;
  currentRules(): ProjectPolicyRule[];
  history(): Array<{ version: number; action: 'APPLY' | 'ROLLBACK'; rules: ProjectPolicyRule[]; eventDigest: string }>;
  preview(rules: unknown): PolicyPreview;
  apply(rules: unknown, acknowledgedBy: string, acknowledgeWeakening?: boolean): { applied: boolean; version: number; preview: PolicyPreview };
  rollback(version: number, acknowledgedBy: string, acknowledgeWeakening?: boolean): { applied: boolean; version: number; preview: PolicyPreview };
  /** Use only as a host-owned pre-execution review callback. */
  reviewDecision(call: ToolCall, decision: Readonly<PolicyDecision>): Promise<'DENY' | 'UNCHANGED'>;
  /** Host adapters use this to add hook, gateway, model, or execution outcomes without raw arguments. */
  recordDecision(input: {
    invocationSource?: PolicyInvocationSource;
    decisionSource: PolicyDecisionSource;
    decision: PolicyOutcome;
    executionStatus: PolicyExecutionStatus;
    sideEffectVerification?: PolicySideEffectStatus;
    reasonCode: string;
    toolId?: string;
    actor?: string;
    ruleIds?: string[];
  }): PolicyAuditEvent;
  evidence(): PolicyAuditEvent[];
  evidenceHead(): string | null;
  exportEvidence(): string;
  writeEvidenceExport(destination: string): void;
  verifyEvidence(expectedHead?: string): { valid: boolean; reason: string; head: string | null };
}

const MAX_RULES = 128;
const MAX_EVENTS = 100_000;
const MAX_LOG_BYTES = 32 * 1024 * 1024;
const RULE_ID = /^[A-Za-z0-9_.:-]{1,100}$/;
const TOOL_ID = /^[A-Za-z0-9_.-]{1,100}$/;
const RISKS = new Set(['READ_ONLY', 'WRITE', 'EXECUTE', 'NETWORK', 'SENSITIVE_DATA', 'DESTRUCTIVE']);
type PolicyExecutionLease = <T>(call: ToolCall, decision: Readonly<PolicyDecision>, operation: () => T | Promise<T>, onAuditOutcomeFailure: () => void) => Promise<T>;
const policyExecutionLeases = new WeakMap<object, PolicyExecutionLease>();
const EVENT_KEYS = Object.keys({
  schema_version: 1, event_id: 1, timestamp: 1, project_id: 1, event_type: 1, policy_version: 1,
  invocation_source: 1, decision_source: 1, decision: 1, execution_status: 1,
  side_effect_verification: 1, reason_code: 1, tool_id: 1, actor_digest: 1, rule_ids: 1,
  rules_snapshot: 1, previous_event_digest: 1, event_digest: 1,
}).sort();

function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function safeReason(value: unknown): string { return typeof value === 'string' && RULE_ID.test(value) ? value : 'invalid_reason_code'; }

function normalizeRules(input: unknown): ProjectPolicyRule[] {
  const parsed = JSON.parse(canonicalJSON(input));
  if (!Array.isArray(parsed) || parsed.length > MAX_RULES) throw Error('POLICY_RULE_LIST_INVALID');
  const rules: ProjectPolicyRule[] = parsed.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('POLICY_RULE_INVALID');
    if (Object.keys(item).some(key => !['id', 'tool', 'risk', 'effect', 'reasonCode'].includes(key))) throw Error('POLICY_RULE_FIELD_INVALID');
    const id = item.id;
    const tool = item.tool;
    const reasonCode = item.reasonCode;
    if (typeof id !== 'string' || !RULE_ID.test(id) || typeof tool !== 'string' || !TOOL_ID.test(tool)) throw Error('POLICY_RULE_SELECTOR_INVALID');
    if (item.effect !== 'DENY') throw Error('POLICY_BASELINE_WEAKENING_FORBIDDEN');
    if (item.risk !== undefined && !RISKS.has(item.risk)) throw Error('POLICY_RULE_RISK_INVALID');
    if (typeof reasonCode !== 'string' || !RULE_ID.test(reasonCode)) throw Error('POLICY_RULE_REASON_INVALID');
    return Object.freeze({ id, tool: tool.toLowerCase(), ...(item.risk ? { risk: item.risk } : {}), effect: 'DENY', reasonCode });
  });
  return rules.sort((a, b) => a.id.localeCompare(b.id));
}

function selectorsOverlap(a: ProjectPolicyRule, b: ProjectPolicyRule): boolean {
  return a.tool === b.tool && (a.risk === undefined || b.risk === undefined || a.risk === b.risk);
}
function weakensSelector(previous: ProjectPolicyRule, next: ProjectPolicyRule): boolean {
  if (previous.tool !== next.tool) return true;
  if (previous.risk === next.risk || next.risk === undefined) return false;
  return true;
}
function conflictsFor(rules: readonly ProjectPolicyRule[]): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];
  for (let i = 0; i < rules.length; i++) for (let j = i + 1; j < rules.length; j++) {
    const a = rules[i], b = rules[j];
    if (a.id === b.id) conflicts.push({ code: 'DUPLICATE_ID', ruleIds: [a.id, b.id] });
    else if (selectorsOverlap(a, b)) conflicts.push({ code: 'OVERLAPPING_SELECTOR', ruleIds: [a.id, b.id] });
  }
  return conflicts;
}

function validateEvent(event: unknown): event is PolicyAuditEvent {
  try {
    const e = JSON.parse(canonicalJSON(event));
    if (Object.keys(e).sort().join() !== EVENT_KEYS.join() || e.schema_version !== 'agent-canary.policy-audit/1') return false;
    if (typeof e.event_id !== 'string' || !/^[0-9a-f-]{36}$/.test(e.event_id)) return false;
    if (typeof e.timestamp !== 'string' || !Number.isFinite(Date.parse(e.timestamp)) || new Date(e.timestamp).toISOString() !== e.timestamp) return false;
    if (typeof e.project_id !== 'string' || !/^[a-f0-9]{64}$/.test(e.project_id)) return false;
    if (!Number.isSafeInteger(e.policy_version) || e.policy_version < 0) return false;
    if (!['SDK', 'NATIVE_HOOK', 'GATEWAY', 'HOST'].includes(e.invocation_source)) return false;
    if (!['POLICY_APPLIED', 'POLICY_ROLLED_BACK', 'POLICY_CHANGE_REJECTED', 'DECISION', 'EXECUTION_RESULT'].includes(e.event_type)) return false;
    if (!['PROJECT_POLICY', 'DETERMINISTIC_POLICY', 'MODEL_REVIEW', 'CANARY_GUARD', 'NATIVE_HOOK', 'GATEWAY', 'TOOL', 'HOST'].includes(e.decision_source)) return false;
    if (!['ALLOW', 'DENY', 'UNKNOWN', 'REQUIRE_CONFIRMATION', 'NOT_APPLICABLE'].includes(e.decision)) return false;
    if (!['NOT_STARTED', 'SUCCEEDED', 'FAILED', 'UNKNOWN'].includes(e.execution_status)) return false;
    if (!['NOT_STARTED', 'VERIFIED', 'NOT_VERIFIED', 'UNKNOWN'].includes(e.side_effect_verification)) return false;
    if (e.event_type === 'DECISION' && (
      e.decision === 'NOT_APPLICABLE' || e.execution_status !== 'NOT_STARTED' || e.side_effect_verification !== 'NOT_STARTED'
    )) return false;
    if (e.event_type === 'EXECUTION_RESULT' && (
      e.decision !== 'NOT_APPLICABLE' || e.execution_status === 'NOT_STARTED' || e.side_effect_verification === 'NOT_STARTED'
    )) return false;
    if (['POLICY_APPLIED', 'POLICY_ROLLED_BACK', 'POLICY_CHANGE_REJECTED'].includes(e.event_type) && (
      e.decision !== 'NOT_APPLICABLE' || e.execution_status !== 'NOT_STARTED' || e.side_effect_verification !== 'NOT_STARTED'
    )) return false;
    if (!RULE_ID.test(e.reason_code)) return false;
    if (e.tool_id !== null && !TOOL_ID.test(e.tool_id)) return false;
    if (e.actor_digest !== null && !/^[a-f0-9]{64}$/.test(e.actor_digest)) return false;
    if (!Array.isArray(e.rule_ids) || e.rule_ids.length > MAX_RULES || !e.rule_ids.every((x: unknown) => typeof x === 'string' && RULE_ID.test(x))) return false;
    if (e.rules_snapshot !== null && canonicalJSON(normalizeRules(e.rules_snapshot)) !== canonicalJSON(e.rules_snapshot)) return false;
    if (e.previous_event_digest !== null && !/^[a-f0-9]{64}$/.test(e.previous_event_digest)) return false;
    return /^[a-f0-9]{64}$/.test(e.event_digest);
  } catch { return false; }
}

export function verifyPolicyEvidence(events: unknown[], expectedHead?: string): { valid: boolean; reason: string; head: string | null } {
  let previous: string | null = null;
  let policyVersion = 0;
  for (const item of events) {
    if (!validateEvent(item)) return { valid: false, reason: 'INVALID_SCHEMA', head: previous };
    const { event_digest, ...unsigned } = item;
    if (item.previous_event_digest !== previous || evidenceDigest(unsigned) !== event_digest) return { valid: false, reason: 'CHAIN_MISMATCH', head: previous };
    if (item.event_type === 'POLICY_APPLIED' || item.event_type === 'POLICY_ROLLED_BACK') {
      if (item.policy_version !== policyVersion + 1 || !item.rules_snapshot) return { valid: false, reason: 'POLICY_VERSION_SEQUENCE', head: previous };
      policyVersion = item.policy_version;
    } else if (item.policy_version !== policyVersion) return { valid: false, reason: 'POLICY_VERSION_SEQUENCE', head: previous };
    previous = event_digest;
  }
  if (expectedHead !== undefined && expectedHead !== previous) return { valid: false, reason: 'HEAD_MISMATCH', head: previous };
  return { valid: true, reason: expectedHead === undefined ? 'VALID_LOCAL_CHAIN_UNANCHORED' : 'VALID_ANCHORED_CHAIN', head: previous };
}

export function verifyPolicyEvidenceExport(serialized: string, expectedHead?: string) {
  try {
    const bundle = JSON.parse(serialized);
    if (bundle?.schema_version !== 'agent-canary.policy-evidence-export/1' || !/^[a-f0-9]{64}$/.test(bundle.project_id) || !Array.isArray(bundle.events) || bundle.events.some((e: any) => e.project_id !== bundle.project_id) || (bundle.anchored_head !== null && (typeof bundle.anchored_head !== 'string' || !/^[a-f0-9]{64}$/.test(bundle.anchored_head)))) return { valid: false, reason: 'INVALID_EXPORT', head: null };
    // The head embedded in an export is self-asserted data, not an independent
    // trust anchor. Check that it matches the event chain, but only report an
    // anchored chain when the caller supplies a separately trusted head.
    const verified = verifyPolicyEvidence(bundle.events, expectedHead);
    if (!verified.valid) return verified;
    if (bundle.anchored_head !== verified.head) return { valid: false, reason: 'HEAD_MISMATCH', head: verified.head };
    return verified;
  } catch { return { valid: false, reason: 'INVALID_EXPORT', head: null }; }
}

function eventFrom(unsigned: Omit<PolicyAuditEvent, 'event_id' | 'timestamp' | 'previous_event_digest' | 'event_digest'>, previous: string | null): PolicyAuditEvent {
  const core = { ...unsigned, event_id: randomUUID(), timestamp: new Date().toISOString(), previous_event_digest: previous };
  return Object.freeze({ ...core, event_digest: evidenceDigest(core) });
}

export function createProjectPolicyManager(options: {
  workspaceRoot: string;
  storageDirectory?: string;
  invocationSource?: PolicyInvocationSource;
}): ProjectPolicyManager {
  if (!path.isAbsolute(options.workspaceRoot)) throw Error('POLICY_PROJECT_ROOT_INVALID');
  const workspace = fs.realpathSync(options.workspaceRoot);
  if (!fs.statSync(workspace).isDirectory()) throw Error('POLICY_PROJECT_ROOT_INVALID');
  const base = path.resolve(options.storageDirectory ?? process.env.AGENT_CANARY_HOME ?? path.join(os.homedir(), '.agent-canary'));
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(base).isSymbolicLink() || !fs.statSync(base).isDirectory()) throw Error('POLICY_STORAGE_UNSAFE');
  const store = fs.realpathSync(base);
  const relStore = path.relative(workspace, store);
  if (relStore === '' || (!relStore.startsWith('..' + path.sep) && relStore !== '..' && !path.isAbsolute(relStore))) throw Error('POLICY_STORAGE_MUST_BE_OUTSIDE_PROJECT');
  const projectId = sha256(process.platform === 'win32' ? workspace.toLowerCase() : workspace);
  const directory = path.join(store, 'project-policies');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(directory).isSymbolicLink() || !fs.statSync(directory).isDirectory()) throw Error('POLICY_STORAGE_UNSAFE');
  const logFile = path.join(directory, `${projectId}.jsonl`);
  const headFile = logFile + '.head';
  const lockFile = logFile + '.lock';
  const actorKeyFile = path.join(store, 'policy-audit.key');
  let actorKey: Buffer;
  function readActorKey(): Buffer {
    const stat = fs.lstatSync(actorKeyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== 32 || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw Error('POLICY_ACTOR_KEY_UNSAFE');
    const key = fs.readFileSync(actorKeyFile);
    if (key.length !== 32) throw Error('POLICY_ACTOR_KEY_UNSAFE');
    return key;
  }
  try {
    actorKey = readActorKey();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const fresh = randomBytes(32);
    let fd: number | undefined;
    try {
      fd = fs.openSync(actorKeyFile, 'wx', 0o600);
      fs.writeFileSync(fd, fresh);
      fs.fsyncSync(fd);
      actorKey = fresh;
    } catch (createError) {
      if ((createError as NodeJS.ErrnoException).code !== 'EEXIST') throw createError;
      actorKey = readActorKey();
    } finally { if (fd !== undefined) fs.closeSync(fd); }
  }
  const invocationSource = options.invocationSource ?? 'SDK';
  if (!['SDK', 'NATIVE_HOOK', 'GATEWAY', 'HOST'].includes(invocationSource)) throw Error('POLICY_SOURCE_INVALID');

  let cachedEvents: PolicyAuditEvent[] | undefined;
  let cachedSignature = '';
  function readHead(): { exists: boolean; head: string | null; signature: string } {
    try {
      const stat = fs.lstatSync(headFile);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 80 || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw Error('POLICY_AUDIT_HEAD_UNSAFE');
      const contents = fs.readFileSync(headFile, 'utf8');
      if (contents === 'EMPTY\n') return { exists: true, head: null, signature: `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:EMPTY` };
      const match = /^([a-f0-9]{64})\n?$/.exec(contents);
      if (!match) throw Error('POLICY_AUDIT_HEAD_INVALID');
      return { exists: true, head: match[1], signature: `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${match[1]}` };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { exists: false, head: null, signature: 'MISSING' };
      throw error;
    }
  }
  // A separate checkpoint makes accidental deletion or tail truncation of the
  // event log detectable by a fresh manager instance, not just a warm cache.
  if (!readHead().exists) {
    try {
      fs.lstatSync(logFile);
      throw Error('POLICY_AUDIT_HEAD_UNAVAILABLE');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    try {
      const fd = fs.openSync(headFile, 'wx', 0o600);
      try { fs.writeFileSync(fd, 'EMPTY\n'); fs.fsyncSync(fd); }
      finally { fs.closeSync(fd); }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  if (!readHead().exists) throw Error('POLICY_AUDIT_HEAD_UNAVAILABLE');

  function readEvents(): PolicyAuditEvent[] {
    let text: string;
    const head = readHead();
    if (!head.exists) throw Error('POLICY_AUDIT_HEAD_UNAVAILABLE');
    try {
      const stat = fs.lstatSync(logFile);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_LOG_BYTES) throw Error('POLICY_AUDIT_UNAVAILABLE');
      const signature = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${head.signature}`;
      if (cachedEvents && signature === cachedSignature) {
        const cachedHead = cachedEvents.at(-1)?.event_digest ?? null;
        if (cachedHead !== head.head) throw Error('POLICY_AUDIT_HEAD_MISMATCH');
        return cachedEvents;
      }
      text = fs.readFileSync(logFile, 'utf8');
      cachedSignature = signature;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (head.head !== null || (cachedEvents?.length ?? 0) > 0) throw Error('POLICY_AUDIT_HEAD_MISMATCH');
        cachedEvents = []; cachedSignature = `0:0:0:${head.signature}`; return cachedEvents;
      }
      throw error;
    }
    if (!text || !text.endsWith('\n')) throw Error('POLICY_AUDIT_CHAIN_INVALID');
    const lines = text.slice(0, -1).split('\n');
    if (lines.some(line => !line)) throw Error('POLICY_AUDIT_CHAIN_INVALID');
    if (lines.length > MAX_EVENTS) throw Error('POLICY_AUDIT_CAPACITY');
    let events: unknown[];
    try { events = lines.map(line => JSON.parse(line) as unknown); }
    catch { throw Error('POLICY_AUDIT_JSON_INVALID'); }
    if (events.length === 0 || head.head === null) throw Error('POLICY_AUDIT_HEAD_MISMATCH');
    const verified = verifyPolicyEvidence(events, head.head ?? undefined);
    if (!verified.valid) throw Error('POLICY_AUDIT_CHAIN_INVALID');
    if (events.some(event => (event as PolicyAuditEvent).project_id !== projectId)) throw Error('POLICY_AUDIT_PROJECT_MISMATCH');
    let version = 0;
    for (const event of events as PolicyAuditEvent[]) {
      if (event.event_type === 'POLICY_APPLIED' || event.event_type === 'POLICY_ROLLED_BACK') version++;
      if (event.policy_version !== version) throw Error('POLICY_AUDIT_VERSION_SEQUENCE');
    }
    cachedEvents = events as PolicyAuditEvent[];
    return cachedEvents;
  }

  function withLock<T>(operation: () => T): T {
    let fd: number;
    try { fd = fs.openSync(lockFile, 'wx', 0o600); }
    catch { throw Error('POLICY_STORE_LOCKED_OR_UNAVAILABLE'); }
    try { return operation(); }
    finally {
      fs.closeSync(fd);
      try { fs.unlinkSync(lockFile); } catch { /* A stale lock is fail-closed on the next operation. */ }
    }
  }

  async function withLockAsync<T>(operation: () => T | Promise<T>): Promise<T> {
    let fd: number;
    try { fd = fs.openSync(lockFile, 'wx', 0o600); }
    catch { throw Error('POLICY_STORE_LOCKED_OR_UNAVAILABLE'); }
    try { return await operation(); }
    finally {
      fs.closeSync(fd);
      try { fs.unlinkSync(lockFile); } catch { /* A stale lock is fail-closed on the next operation. */ }
    }
  }

  function append(events: PolicyAuditEvent[], input: Omit<PolicyAuditEvent, 'event_id' | 'timestamp' | 'previous_event_digest' | 'event_digest'>): PolicyAuditEvent {
    if (events.length >= MAX_EVENTS) throw Error('POLICY_AUDIT_CAPACITY');
    const event = eventFrom(input, events.at(-1)?.event_digest ?? null);
    if (!validateEvent(event)) throw Error('POLICY_AUDIT_EVENT_INVALID');
    const line = Buffer.from(canonicalJSON(event) + '\n', 'utf8');
    let priorSize = 0;
    try { priorSize = fs.statSync(logFile).size; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (priorSize + line.length > MAX_LOG_BYTES) throw Error('POLICY_AUDIT_CAPACITY');
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(logFile, fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
      let offset = 0;
      while (offset < line.length) { const written = fs.writeSync(descriptor, line, offset, line.length - offset); if (written <= 0) throw Error('POLICY_AUDIT_SHORT_WRITE'); offset += written; }
      fs.fsyncSync(descriptor);
    } catch { throw Error('POLICY_AUDIT_WRITE_FAILED'); }
    finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
    let headDescriptor: number | undefined;
    try {
      headDescriptor = fs.openSync(headFile, fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
      const checkpoint = Buffer.from(event.event_digest + '\n', 'utf8');
      let offset = 0;
      while (offset < checkpoint.length) { const written = fs.writeSync(headDescriptor, checkpoint, offset, checkpoint.length - offset); if (written <= 0) throw Error('POLICY_AUDIT_HEAD_SHORT_WRITE'); offset += written; }
      fs.fsyncSync(headDescriptor);
    } catch { throw Error('POLICY_AUDIT_HEAD_WRITE_FAILED'); }
    finally { if (headDescriptor !== undefined) fs.closeSync(headDescriptor); }
    events.push(event);
    try {
      const stat = fs.statSync(logFile), nextHead = readHead();
      cachedEvents = events; cachedSignature = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${nextHead.signature}`;
    }
    catch { cachedEvents = undefined; cachedSignature = ''; }
    return event;
  }

  function current(events: readonly PolicyAuditEvent[]) {
    const mutations = events.filter(e => e.event_type === 'POLICY_APPLIED' || e.event_type === 'POLICY_ROLLED_BACK');
    const latest = mutations.at(-1);
    return { version: latest?.policy_version ?? 0, rules: latest?.rules_snapshot ? normalizeRules(latest.rules_snapshot) : [] as ProjectPolicyRule[], mutations };
  }

  function previewAgainst(oldRules: readonly ProjectPolicyRule[], version: number, newRules: ProjectPolicyRule[]): PolicyPreview {
    const oldById = new Map(oldRules.map(r => [r.id, r]));
    const nextById = new Map(newRules.map(r => [r.id, r]));
    const added = newRules.filter(r => !oldById.has(r.id)).map(r => r.id);
    const removed = oldRules.filter(r => !nextById.has(r.id)).map(r => r.id);
    const changed = newRules.filter(r => oldById.has(r.id) && JSON.stringify(r) !== JSON.stringify(oldById.get(r.id))).map(r => r.id);
    const weakensChangedScope = newRules.some(r => {
      const old = oldById.get(r.id);
      return old !== undefined && weakensSelector(old, r);
    });
    const weakensProjectPolicy = removed.length > 0 || weakensChangedScope;
    return {
      projectPolicyVersion: version,
      added, removed, changed,
      conflicts: conflictsFor(newRules),
      weakensProjectPolicy,
      requiresWeakeningAcknowledgement: weakensProjectPolicy,
      rules: newRules.map(r => ({ ...r })),
    };
  }

  function appendBase(events: PolicyAuditEvent[], eventType: PolicyAuditEvent['event_type'], version: number, fields: Partial<Pick<PolicyAuditEvent, 'decision_source' | 'decision' | 'execution_status' | 'side_effect_verification' | 'reason_code' | 'tool_id' | 'actor_digest' | 'rule_ids' | 'rules_snapshot' | 'invocation_source'>>): PolicyAuditEvent {
    return append(events, {
      schema_version: 'agent-canary.policy-audit/1', project_id: projectId, event_type: eventType,
      policy_version: version, invocation_source: fields.invocation_source ?? invocationSource,
      decision_source: fields.decision_source ?? 'HOST', decision: fields.decision ?? 'NOT_APPLICABLE',
      execution_status: fields.execution_status ?? 'NOT_STARTED', side_effect_verification: fields.side_effect_verification ?? 'NOT_STARTED',
      reason_code: safeReason(fields.reason_code ?? eventType.toLowerCase()), tool_id: fields.tool_id ?? null,
      actor_digest: fields.actor_digest ?? null, rule_ids: fields.rule_ids ?? [], rules_snapshot: fields.rules_snapshot ?? null,
    });
  }

  const executeWithPolicyLease: PolicyExecutionLease = async <T>(
    call: ToolCall,
    decision: Readonly<PolicyDecision>,
    operation: () => T | Promise<T>,
    onAuditOutcomeFailure: () => void,
  ) => withLockAsync(async () => {
    const events = readEvents(), state = current(events);
    const tool = typeof call?.name === 'string' && TOOL_ID.test(call.name) ? call.name.toLowerCase() : '';
    const matching = state.rules.find(rule => rule.tool === tool && (rule.risk === undefined || decision.risks.includes(rule.risk)));
    if (matching) {
      appendBase(events, 'DECISION', state.version, {
        invocation_source: invocationSource, decision_source: 'PROJECT_POLICY', decision: 'DENY',
        execution_status: 'NOT_STARTED', side_effect_verification: 'NOT_STARTED', reason_code: matching.reasonCode,
        tool_id: tool || null, rule_ids: [matching.id],
      });
      throw new PolicyBlockedError({ action: 'DENY', risks: [...decision.risks], reason: matching.reasonCode, mode: decision.mode });
    }
    if (decision.action === 'DENY') {
      appendBase(events, 'DECISION', state.version, {
        invocation_source: invocationSource, decision_source: 'DETERMINISTIC_POLICY', decision: 'DENY',
        execution_status: 'NOT_STARTED', side_effect_verification: 'NOT_STARTED', reason_code: safeReason(decision.reason), tool_id: tool || null,
      });
      throw new PolicyBlockedError({ ...decision, requestId: undefined });
    }

    const approved = decision.action === 'APPROVAL_REQUIRED';
    appendBase(events, 'DECISION', state.version, {
      invocation_source: invocationSource, decision_source: approved ? 'HOST' : 'DETERMINISTIC_POLICY', decision: 'ALLOW',
      execution_status: 'NOT_STARTED', side_effect_verification: 'NOT_STARTED',
      reason_code: approved ? 'human_approval_granted' : 'final_pre_execution_check', tool_id: tool || null,
    });

    let result: unknown;
    try { result = await operation(); }
    catch (error) {
      try {
        appendBase(events, 'EXECUTION_RESULT', state.version, {
          invocation_source: invocationSource, decision_source: 'TOOL', decision: 'NOT_APPLICABLE',
          execution_status: 'UNKNOWN', side_effect_verification: 'UNKNOWN',
          reason_code: 'tool_execution_failed_effects_unknown', tool_id: tool || null,
        });
      } catch { try { onAuditOutcomeFailure(); } catch { /* Containment callback is best-effort after an attempted operation. */ } }
      throw error;
    }
    try {
      appendBase(events, 'EXECUTION_RESULT', state.version, {
        invocation_source: invocationSource, decision_source: 'TOOL', decision: 'NOT_APPLICABLE',
        execution_status: 'SUCCEEDED', side_effect_verification: 'NOT_VERIFIED',
        reason_code: 'tool_callback_returned', tool_id: tool || null,
      });
    } catch {
      // The callback may already have completed. Contain later calls without
      // claiming this operation was blocked or inviting a duplicate retry.
      try { onAuditOutcomeFailure(); } catch { /* The existing result remains authoritative for this callback. */ }
    }
    return result as Awaited<T>;
  });

  function recordDecision(input: Parameters<ProjectPolicyManager['recordDecision']>[0]): PolicyAuditEvent {
    if (input.actor !== undefined && (typeof input.actor !== 'string' || input.actor.trim().length < 2 || input.actor.length > 128)) throw Error('POLICY_OPERATOR_REQUIRED');
    return withLock(() => {
      const events = readEvents(), state = current(events);
      const actorDigest = input.actor === undefined ? null : createHmac('sha256', actorKey).update(projectId + ':' + input.actor.trim()).digest('hex');
      return appendBase(events, input.executionStatus === 'NOT_STARTED' ? 'DECISION' : 'EXECUTION_RESULT', state.version, {
        invocation_source: input.invocationSource ?? invocationSource,
        decision_source: input.decisionSource, decision: input.decision, execution_status: input.executionStatus,
        side_effect_verification: input.sideEffectVerification ?? (input.executionStatus === 'NOT_STARTED' ? 'NOT_STARTED' : 'NOT_VERIFIED'),
        reason_code: input.reasonCode, tool_id: input.toolId ? input.toolId.toLowerCase() : null,
        actor_digest: actorDigest, rule_ids: input.ruleIds ?? [],
      });
    });
  }

  function applyLocked(rules: ProjectPolicyRule[], actor: string, acknowledgeWeakening: boolean, action: 'APPLY' | 'ROLLBACK') {
    const events = readEvents(), state = current(events), preview = previewAgainst(state.rules, state.version, rules);
    const actorDigest = createHmac('sha256', actorKey).update(projectId + ':' + actor.trim()).digest('hex');
    if (preview.conflicts.length) {
      appendBase(events, 'POLICY_CHANGE_REJECTED', state.version, { reason_code: 'policy_conflict', actor_digest: actorDigest, rule_ids: preview.conflicts.flatMap(x => x.ruleIds) });
      return { applied: false, version: state.version, preview };
    }
    if (preview.requiresWeakeningAcknowledgement && !acknowledgeWeakening) {
      appendBase(events, 'POLICY_CHANGE_REJECTED', state.version, { reason_code: 'weakening_ack_required', actor_digest: actorDigest, rule_ids: preview.removed });
      return { applied: false, version: state.version, preview };
    }
    const version = state.version + 1;
    appendBase(events, action === 'APPLY' ? 'POLICY_APPLIED' : 'POLICY_ROLLED_BACK', version, {
      reason_code: action === 'APPLY' ? 'policy_applied' : 'policy_rollback', actor_digest: actorDigest,
      rule_ids: rules.map(r => r.id), rules_snapshot: rules,
    });
    return { applied: true, version, preview };
  }

  function preview(rules: unknown): PolicyPreview {
    const safe = normalizeRules(rules);
    return withLock(() => { const state = current(readEvents()); return previewAgainst(state.rules, state.version, safe); });
  }

  function apply(rules: unknown, acknowledgedBy: string, acknowledgeWeakening = false) {
    const safe = normalizeRules(rules);
    if (typeof acknowledgedBy !== 'string' || acknowledgedBy.trim().length < 2 || acknowledgedBy.length > 128) throw Error('POLICY_OPERATOR_REQUIRED');
    return withLock(() => applyLocked(safe, acknowledgedBy, acknowledgeWeakening, 'APPLY'));
  }

  function rollback(version: number, acknowledgedBy: string, acknowledgeWeakening = false) {
    if (!Number.isSafeInteger(version) || version < 1) throw Error('POLICY_VERSION_INVALID');
    if (typeof acknowledgedBy !== 'string' || acknowledgedBy.trim().length < 2 || acknowledgedBy.length > 128) throw Error('POLICY_OPERATOR_REQUIRED');
    return withLock(() => {
      const events = readEvents(), state = current(events);
      if (version >= state.version) throw Error('POLICY_ROLLBACK_TARGET_INVALID');
      const target = state.mutations.find(e => e.policy_version === version);
      if (!target?.rules_snapshot) throw Error('POLICY_ROLLBACK_TARGET_MISSING');
      return applyLocked(normalizeRules(target.rules_snapshot), acknowledgedBy, acknowledgeWeakening, 'ROLLBACK');
    });
  }

  function history() {
    return withLock(() => current(readEvents()).mutations.map(e => ({
      version: e.policy_version, action: e.event_type === 'POLICY_ROLLED_BACK' ? 'ROLLBACK' as const : 'APPLY' as const,
      rules: e.rules_snapshot ? normalizeRules(e.rules_snapshot) : [], eventDigest: e.event_digest,
    })));
  }

  async function reviewDecision(call: ToolCall, decision: Readonly<PolicyDecision>): Promise<'DENY' | 'UNCHANGED'> {
    const tool = typeof call?.name === 'string' && TOOL_ID.test(call.name) ? call.name.toLowerCase() : '';
    try {
      return withLock(() => {
        const events = readEvents(), state = current(events);
        const matching = state.rules.filter(rule => rule.tool === tool && (rule.risk === undefined || decision.risks.includes(rule.risk)));
        const rule = matching[0];
        let outcome: PolicyOutcome;
        let source: PolicyDecisionSource;
        let reasonCode: string;
        if (rule) { outcome = 'DENY'; source = 'PROJECT_POLICY'; reasonCode = rule.reasonCode; }
        else if (decision.reason === 'unregistered_tool') { outcome = 'UNKNOWN'; source = 'DETERMINISTIC_POLICY'; reasonCode = 'unregistered_tool'; }
        else if (decision.action === 'APPROVAL_REQUIRED') { outcome = 'REQUIRE_CONFIRMATION'; source = 'DETERMINISTIC_POLICY'; reasonCode = safeReason(decision.reason); }
        else if (decision.action === 'DENY') { outcome = 'DENY'; source = 'DETERMINISTIC_POLICY'; reasonCode = safeReason(decision.reason); }
        else { outcome = 'ALLOW'; source = 'DETERMINISTIC_POLICY'; reasonCode = safeReason(decision.reason); }
        appendBase(events, 'DECISION', state.version, {
          invocation_source: invocationSource, decision_source: source, decision: outcome,
          execution_status: 'NOT_STARTED', side_effect_verification: 'NOT_STARTED', reason_code: reasonCode,
          tool_id: tool || null, rule_ids: rule ? [rule.id] : [],
        });
        return rule ? 'DENY' : 'UNCHANGED';
      });
    } catch {
      // If the policy store or audit chain cannot be trusted, reject this call.
      return 'DENY';
    }
  }

  function events(): PolicyAuditEvent[] { return withLock(() => readEvents().map(e => ({ ...e }))); }
  function evidenceHead(): string | null { return withLock(() => readEvents().at(-1)?.event_digest ?? null); }
  function exportEvidence(): string {
    const items = events();
    const bundle = { schema_version: 'agent-canary.policy-evidence-export/1', project_id: projectId, anchored_head: items.at(-1)?.event_digest ?? null, events: items };
    return JSON.stringify(bundle, null, 2) + '\n';
  }
  function writeEvidenceExport(destination: string): void {
    if (!path.isAbsolute(destination)) throw Error('POLICY_EXPORT_PATH_INVALID');
    const target = path.resolve(destination);
    const realParent = fs.realpathSync(path.dirname(target));
    const realTarget = path.join(realParent, path.basename(target));
    const relative = path.relative(workspace, realTarget);
    if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw Error('POLICY_EXPORT_MUST_BE_OUTSIDE_PROJECT');
    const data = Buffer.from(exportEvidence(), 'utf8');
    const fd = fs.openSync(target, 'wx', 0o600);
    try { let offset = 0; while (offset < data.length) { const n = fs.writeSync(fd, data, offset, data.length - offset); if (n <= 0) throw Error('POLICY_EXPORT_SHORT_WRITE'); offset += n; } fs.fsyncSync(fd); }
    catch (error) { try { fs.unlinkSync(target); } catch {} throw error; }
    finally { fs.closeSync(fd); }
  }
  function verifyEvidence(expectedHead?: string) { try { return verifyPolicyEvidence(events(), expectedHead); } catch { return { valid: false, reason: 'POLICY_AUDIT_UNAVAILABLE', head: null }; } }

  const manager: ProjectPolicyManager = Object.freeze({
    projectId,
    currentVersion: () => withLock(() => current(readEvents()).version),
    currentRules: () => withLock(() => current(readEvents()).rules.map(r => ({ ...r }))),
    history, preview, apply, rollback, reviewDecision, recordDecision, evidence: events, evidenceHead, exportEvidence, writeEvidenceExport, verifyEvidence,
  });
  policyExecutionLeases.set(manager, executeWithPolicyLease);
  return manager;
}

/** Convenience router: deterministic M5 checks always run before optional host/model review. */
export function createManagedRiskPolicyRouter<T>(options: ManagedRiskPolicyOptions<T>) {
  const { policyStorageDirectory, invocationSource, ...riskOptions } = options;
  const manager = createProjectPolicyManager({ workspaceRoot: riskOptions.workspaceRoot, storageDirectory: policyStorageDirectory, invocationSource });
  const executeWithPolicyLease = policyExecutionLeases.get(manager);
  if (!executeWithPolicyLease) throw Error('POLICY_EXECUTION_LEASE_UNAVAILABLE');
  const hostReview = riskOptions.reviewDecision;
  const reviewDecisionSource = options.reviewDecisionSource ?? 'HOST';
  const executeRealTool = riskOptions.executeRealTool;
  const reviewedCalls = new WeakMap<ToolCall, Readonly<PolicyDecision>>();
  const router = createRiskPolicyRouter({
    ...riskOptions,
    reviewDecision: async (call, decision) => {
      reviewedCalls.set(call, decision);
      if (await manager.reviewDecision(call, decision) === 'DENY' || decision.action === 'DENY') return 'DENY';
      if (hostReview) {
        try {
          if (await hostReview(call, decision) === 'DENY') {
            try { manager.recordDecision({ decisionSource: reviewDecisionSource, decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'host_review_denied', toolId: call.name }); } catch { return 'DENY'; }
            return 'DENY';
          }
        } catch {
          try { manager.recordDecision({ decisionSource: reviewDecisionSource, decision: 'UNKNOWN', executionStatus: 'NOT_STARTED', reasonCode: 'host_review_failed', toolId: call.name }); } catch {}
          return 'DENY';
        }
      }
      return 'UNCHANGED';
    },
    executeRealTool: async call => {
      const decision = reviewedCalls.get(call);
      if (!decision) throw new PolicyBlockedError({ action: 'DENY', risks: [], reason: 'policy_review_missing', mode: riskOptions.mode ?? 'BALANCED' });
      return executeWithPolicyLease(call, decision, () => executeRealTool(call), () => {
        riskOptions.guard.trip({ reason: 'policy_audit_outcome_unavailable' });
      });
    },
  });
  return Object.freeze({
    ...router,
    async dispatch(call: ToolCall) {
      const wasQuarantined = riskOptions.guard.state === 'QUARANTINED';
      const decoyCall = typeof call?.name === 'string' && isDecoy(call.name.trim().toLowerCase());
      try { return await router.dispatch(call); }
      catch (error) {
        if (error instanceof CanaryBlockedError) {
          try { manager.recordDecision({ decisionSource: 'CANARY_GUARD', decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'canary_guard_quarantined', toolId: call.name }); } catch {}
        }
        throw error;
      }
      finally {
        // Decoys return an inert reply rather than throwing. Record the new
        // quarantine state without treating that reply as a real tool result.
        if (decoyCall && !wasQuarantined && riskOptions.guard.state === 'QUARANTINED') {
          try { manager.recordDecision({ decisionSource: 'CANARY_GUARD', decision: 'DENY', executionStatus: 'NOT_STARTED', reasonCode: 'canary_decoy_quarantined', toolId: call.name }); } catch {}
        }
      }
    },
    async approve(requestId: string, acknowledgedBy: string) {
      manager.recordDecision({ decisionSource: 'HOST', decision: 'REQUIRE_CONFIRMATION', executionStatus: 'NOT_STARTED', reasonCode: 'human_approval_attempted', actor: acknowledgedBy });
      return router.approve(requestId, acknowledgedBy);
    },
    policyManager: manager,
  });
}
