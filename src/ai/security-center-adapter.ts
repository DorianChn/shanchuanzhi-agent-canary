export const PROTECTION_STATUSES = [
  'PROTECTED',
  'PARTIALLY_PROTECTED',
  'NOT_PROTECTED',
  'UNKNOWN',
] as const;

export type ProtectionStatus = typeof PROTECTION_STATUSES[number];
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';
export type DataSourceStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

const DATA_SOURCE_STATUSES: readonly string[] = [
  'AVAILABLE',
  'UNAVAILABLE',
  'TIMEOUT',
  'PERMISSION_DENIED',
  'UNSUPPORTED',
  'INVALID_RESPONSE',
  'UNKNOWN',
];
const AGENT_IDS = ['claude', 'cursor', 'cline', 'codex'] as const;
const RISK_LEVELS = ['SAFE', 'READ', 'WRITE', 'NETWORK', 'EXECUTE', 'SECRET', 'DESTRUCTIVE'] as const;
const EVENT_EXPLANATIONS: Record<string, string> = {
  decoy_called: '调用触发了 Canary 诱饵信号；事件本身不能证明当前会话仍处于隔离状态。',
  token_found: '审计记录发现 Canary 标记；当前处置状态需要实时隔离接口确认。',
  session_tripped: '后端记录了会话触发事件；该记录不能代替当前隔离状态。',
  session_quarantined: '后端记录了会话隔离事件；该记录不能代替当前隔离状态。',
  action_blocked: '后端记录了一次被阻止的动作；请核对事件原因和关联策略。',
  policy_blocked: '后端策略记录了一次拒绝；该记录不代表其他执行路径都受到保护。',
  policy_approval_required: '该动作需要人工审批；事件不代表动作已获批或已执行。',
  policy_approval_granted: '后端记录了一次人工审批；请结合对应执行证据确认结果。',
  credential_revocation_requested: '后端记录了凭据撤销请求；需要撤销结果事件确认是否完成。',
  credential_revocation_failed: '后端记录了凭据撤销失败；请按组织凭据轮换流程处理。',
  session_reset: '后端记录了会话重置事件；当前保护状态仍需实时状态接口确认。',
  policy_allowed: '后端策略允许了该动作；允许记录不代表 Gateway 已登记或执行已完成。',
};

function asRecord(value: unknown): Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function sanitizeText(value: unknown, limit = 240): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .replace(/\bcnry_[a-zA-Z0-9_-]+\b/g, '[CANARY_REDACTED]')
    .replace(/\b((?:pass(?:word)?|secret|token|api[_-]?key|credential|authorization|cookie|bearer|private[_-]?key)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '[REDACTED]')
    .trim()
    .slice(0, limit);
}

export function normalizeProtectionStatus(value: unknown): ProtectionStatus {
  return typeof value === 'string' && (PROTECTION_STATUSES as readonly string[]).includes(value)
    ? value as ProtectionStatus
    : 'UNKNOWN';
}

export function normalizeConnectionStatus(value: unknown): ConnectionStatus {
  return value === 'CONNECTED' || value === 'DISCONNECTED' ? value : 'UNKNOWN';
}

function mapEvent(value: unknown, index: number) {
  const event = asRecord(value);
  const kind = sanitizeText(event.kind, 80);
  if (!kind) return null;
  const ts = sanitizeText(event.ts, 64);
  const riskLevel = (RISK_LEVELS as readonly unknown[]).includes(event.riskLevel)
    ? event.riskLevel as typeof RISK_LEVELS[number]
    : undefined;
  return {
    id: [ts, sanitizeText(event.sessionId, 64), kind, String(index)].join(':'),
    ts,
    kind,
    sessionId: sanitizeText(event.sessionId, 128),
    toolName: sanitizeText(event.toolName, 128),
    riskLevel,
    reason: sanitizeText(event.reason, 240),
  };
}

export function adaptSecuritySnapshot(input: {
  state?: unknown;
  agents?: unknown;
  policyState?: unknown;
  runtime3?: unknown;
  securityCenter?: unknown;
} = {}) {
  const state = asRecord(input.state);
  const agentResponse = asRecord(input.agents);
  const policyState = asRecord(input.policyState);
  const runtime3 = asRecord(input.runtime3);
  const securityCenter = asRecord(input.securityCenter);
  const gateway = asRecord(securityCenter.gateway);
  const hook = asRecord(securityCenter.hook);
  const isolation = asRecord(securityCenter.canaryIsolation);
  const policy = asRecord(securityCenter.policy);
  const liveAgents = Array.isArray(securityCenter.agents);
  const rawAgents = liveAgents ? securityCenter.agents : agentResponse.agents;

  const agents = (Array.isArray(rawAgents) ? rawAgents : [])
    .map((item: unknown) => asRecord(item))
    .filter((item: Record<string, any>) =>
      typeof item.agent === 'string' &&
      (AGENT_IDS as readonly string[]).includes(item.agent))
    .map((item: Record<string, any>) => ({
      agent: item.agent as typeof AGENT_IDS[number],
      detected: typeof item.detected === 'boolean' ? item.detected : null,
      connectionStatus: liveAgents ? normalizeConnectionStatus(item.connectionStatus) : 'UNKNOWN' as const,
      protectionStatus: liveAgents ? normalizeProtectionStatus(item.protectionStatus) : 'UNKNOWN' as const,
    }));

  const sandboxMode =
    ['OBSERVE', 'BALANCED', 'STRICT'].includes(policyState.mode) &&
    typeof policyState.scope === 'string' &&
    policyState.scope.startsWith('VIRTUAL_EXECUTORS')
      ? policyState.mode as 'OBSERVE' | 'BALANCED' | 'STRICT'
      : null;
  const isRuntimeDemo = runtime3.mode === 'DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL' &&
    runtime3.agent === 'controlled-sdk-demo' &&
    runtime3.coverage === 'REGISTERED_CAPABILITIES_ONLY';
  const runtimeDemoGuard = isRuntimeDemo &&
    (['SAFE', 'TRIPPED', 'QUARANTINED'] as readonly unknown[]).includes(runtime3.guard)
      ? runtime3.guard as 'SAFE' | 'TRIPPED' | 'QUARANTINED'
      : null;

  const events = (Array.isArray(state.events) ? state.events : [])
    .slice(0, 100)
    .map(mapEvent)
    .filter((event: ReturnType<typeof mapEvent>): event is NonNullable<typeof event> => event !== null);

  return {
    protectionStatus: normalizeProtectionStatus(securityCenter.protectionStatus),
    // Binding health does not prove that the first-party Console invokes a
    // capability-backed OBSERVE file-read path. Keep this pending that proof.
    firstPartyObserveReadStatus: 'NOT_VERIFIED' as const,
    gateway: {
      protectionStatus: normalizeProtectionStatus(gateway.protectionStatus),
      connectionStatus: normalizeConnectionStatus(gateway.connectionStatus),
    },
    hook: {
      protectionStatus: normalizeProtectionStatus(hook.protectionStatus),
    },
    canaryIsolation: {
      protectionStatus: normalizeProtectionStatus(isolation.protectionStatus),
    },
    policy: {
      protectionStatus: normalizeProtectionStatus(policy.protectionStatus),
      name: typeof policy.name === 'string' && policy.name.trim()
        ? sanitizeText(policy.name, 100)
        : null,
    },
    protectedToolCount: Number.isSafeInteger(securityCenter.protectedToolCount) &&
      securityCenter.protectedToolCount >= 0
      ? securityCenter.protectedToolCount as number
      : null,
    consoleSandboxPolicy: {
      mode: sandboxMode,
      scope: sandboxMode ? 'VIRTUAL_EXECUTORS' as const : null,
    },
    runtimeDemo: {
      guard: runtimeDemoGuard,
      scope: isRuntimeDemo ? 'REGISTERED_CAPABILITIES_ONLY' as const : null,
    },
    unprotectedExecutionPaths: Array.isArray(securityCenter.unprotectedExecutionPaths)
      ? securityCenter.unprotectedExecutionPaths
        .filter((item: unknown) => typeof item === 'string')
        .slice(0, 100)
        .map(() => 'UNPROTECTED_EXECUTION_PATH')
      : null,
    agents,
    events,
  };
}

export function classifyDataSourceFailure(statusCode?: number, errorName?: string): DataSourceStatus {
  if (errorName === 'AbortError') return 'TIMEOUT';
  if (errorName === 'InvalidResponseError') return 'INVALID_RESPONSE';
  if (statusCode === 401 || statusCode === 403) return 'PERMISSION_DENIED';
  if (statusCode === 404) return 'UNSUPPORTED';
  if (statusCode === 0 || statusCode === undefined || statusCode >= 500) return 'UNAVAILABLE';
  return 'UNKNOWN';
}

/** Keep contradictory policy responses visible as conflicts, never as a successful decision. */
export function preparePolicyResultForDisplay(input: unknown) {
  const result = asRecord(input);
  const decision = asRecord(result.decision);
  const events = Array.isArray(result.events) ? result.events.map(asRecord) : [];
  const latestPolicyEvent = [...events].reverse().find(event =>
    ['policy_allowed', 'policy_blocked', 'policy_approval_required', 'policy_approval_granted'].includes(event.kind),
  );
  const metadata = asRecord(latestPolicyEvent?.metadata);
  const mode = decision.mode ?? result.mode ?? metadata.mode;
  const actions = [decision.action, metadata.action];
  const risks = Array.isArray(decision.risks)
    ? decision.risks
    : typeof metadata.risks === 'string'
      ? metadata.risks.split(',').map((risk: string) => risk.trim())
      : [];
  const status = result.status;
  const reportsAllow = status === 'ALLOW' || actions.includes('ALLOW');
  const reportsExecuted = status === 'EXECUTED';
  const reportsDenial = status === 'DENY' || actions.includes('DENY') || latestPolicyEvent?.kind === 'policy_blocked';
  const guardQuarantined = result.guardState === 'QUARANTINED' || status === 'BLOCKED_BY_GUARD';
  const sensitiveObserve = mode === 'OBSERVE' && risks.includes('SENSITIVE_DATA');
  const conflict =
    reportsDenial && (reportsAllow || reportsExecuted) ||
    sensitiveObserve && (reportsAllow || reportsExecuted) ||
    guardQuarantined && reportsAllow;

  if (!conflict) return result;
  return {
    ...result,
    status: 'POLICY_CONFLICT',
    backendReportedStatus: typeof status === 'string' ? status : null,
    displayWarning: '后端策略结果字段冲突；不能视为允许或安全。执行状态需核实，callback 可能已经运行，请核查审计记录。',
  };
}

export function explainSecurityEvent(event: {kind?: string; reason?: string}): string {
  const base = EVENT_EXPLANATIONS[event.kind ?? ''] ?? '本地后端记录了一条安全事件；请结合原始事件和对应策略核对。';
  const reason = sanitizeText(event.reason, 240);
  return reason ? base + ' 后端原因：' + reason : base;
}

export function buildSecurityDiagnostic(
  view: ReturnType<typeof adaptSecuritySnapshot>,
  sources: Record<string, unknown>,
  generatedAt = new Date().toISOString(),
) {
  const sourceStates: Record<string, string> = {};
  for (const name of ['state', 'agents', 'policyState', 'runtime3', 'securityCenter', 'e4']) {
    const source = sources[name];
    sourceStates[name] = typeof source === 'string' && DATA_SOURCE_STATUSES.includes(source)
      ? source
      : 'UNKNOWN';
  }
  const auditEventsAvailable = sourceStates.state === 'AVAILABLE';

  return {
    schemaVersion: 'agent-canary.security-diagnostic.v1',
    generatedAt: sanitizeText(generatedAt, 64),
    scope: 'Local Console read-only snapshot. UNKNOWN means the backend did not provide a verifiable value.',
    protection: {
      overall: view.protectionStatus,
      firstPartyObserveRead: view.firstPartyObserveReadStatus,
      gateway: view.gateway.protectionStatus,
      hook: view.hook.protectionStatus,
      canaryIsolation: view.canaryIsolation.protectionStatus,
      policy: view.policy.protectionStatus,
      currentPolicy: view.policy.name,
      protectedToolCount: view.protectedToolCount,
      unprotectedExecutionPathCount: view.unprotectedExecutionPaths === null
        ? null
        : view.unprotectedExecutionPaths.length,
    },
    localConsole: {
      sandboxPolicyMode: view.consoleSandboxPolicy.mode,
      sandboxPolicyScope: view.consoleSandboxPolicy.scope,
      runtimeDemoGuard: view.runtimeDemo.guard,
      runtimeDemoScope: view.runtimeDemo.scope,
    },
    dataSources: sourceStates,
    agents: view.agents.map(agent => ({
      agent: agent.agent,
      detectedConfiguration: agent.detected,
      connectionStatus: agent.connectionStatus,
      protectionStatus: agent.protectionStatus,
    })),
    eventCount: auditEventsAvailable ? view.events.length : null,
    events: auditEventsAvailable ? view.events.map(event => ({
      ts: event.ts,
      kind: event.kind,
      explanation: explainSecurityEvent({kind: event.kind}),
    })) : null,
    limitations: [
      'A detected configuration does not prove an Agent is connected or its native tools are protected.',
      'Historical events do not prove current Canary isolation state.',
      'Diagnostic export omits event arguments, reasons, configuration paths, and raw secrets.',
      'The Auto E4 command shown in the Console is a local test entry, not an external E4 result.',
    ],
  };
}

/* The same pure adapter used by the UI is serialized into the existing inline Console page.
   Keeping the browser implementation derived from these functions prevents a second, divergent status model. */
export const SECURITY_CENTER_ADAPTER_SCRIPT = [
  'const securityCenterAdapter = (() => {',
  'const PROTECTION_STATUSES = ' + JSON.stringify(PROTECTION_STATUSES) + ';',
  'const DATA_SOURCE_STATUSES = ' + JSON.stringify(DATA_SOURCE_STATUSES) + ';',
  'const AGENT_IDS = ' + JSON.stringify(AGENT_IDS) + ';',
  'const RISK_LEVELS = ' + JSON.stringify(RISK_LEVELS) + ';',
  'const EVENT_EXPLANATIONS = ' + JSON.stringify(EVENT_EXPLANATIONS) + ';',
  'const asRecord = ' + asRecord.toString() + ';',
  'const sanitizeText = ' + sanitizeText.toString() + ';',
  'const normalizeProtectionStatus = ' + normalizeProtectionStatus.toString() + ';',
  'const normalizeConnectionStatus = ' + normalizeConnectionStatus.toString() + ';',
  'const mapEvent = ' + mapEvent.toString() + ';',
  'const adaptSecuritySnapshot = ' + adaptSecuritySnapshot.toString() + ';',
  'const classifyDataSourceFailure = ' + classifyDataSourceFailure.toString() + ';',
  'const preparePolicyResultForDisplay = ' + preparePolicyResultForDisplay.toString() + ';',
  'const explainSecurityEvent = ' + explainSecurityEvent.toString() + ';',
  'const buildSecurityDiagnostic = ' + buildSecurityDiagnostic.toString() + ';',
  'return {normalizeProtectionStatus, normalizeConnectionStatus, adaptSecuritySnapshot, classifyDataSourceFailure, preparePolicyResultForDisplay, explainSecurityEvent, buildSecurityDiagnostic};',
  '})();',
].join('\n');
