import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createTool } from '@cline/core';

const require = createRequire(import.meta.url);
const SAFE_TOOLS = new Set([
  'agent_canary_read_file',
  'agent_canary_list_directory',
  'agent_canary_get_file_info',
  'agent_canary_write_file',
]);
const digest = (value) => {
  try { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  catch { return 'invalid-json'; }
};
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value);
const splitAllowlist = (value) => (value ?? '').split(/\r?\n/).map((part) => part.trim()).filter(Boolean);

function minimalChildEnv() {
  const env = {};
  for (const name of ['PATH', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return env;
}

function parseMcpOutput(result) {
  if (result?.isError) {
    const message = (result.content ?? []).filter((block) => block.type === 'text').map((block) => block.text).join('\n');
    throw new Error(`AGENT_CANARY_MCP_DENIED:${message.slice(0, 1000)}`);
  }
  return result?.structuredContent ?? result?.content ?? result;
}

async function createSessionBridge(root, sessionId, context, adapterEntryOverride) {
  if (!root || !path.isAbsolute(root)) throw new Error('CLINE_WORKSPACE_ROOT_UNAVAILABLE');
  const adapterEntry = adapterEntryOverride ?? require.resolve('@dorianchn/agent-canary-filesystem-mcp/bin/agent-canary-filesystem-mcp.mjs');
  const auditBase = process.env.AGENT_CANARY_AUDIT_DIR || path.join(os.tmpdir(), 'agent-canary-cline');
  fs.mkdirSync(auditBase, { recursive: true, mode: 0o700 });
  const sessionAuditDir = fs.mkdtempSync(path.join(auditBase, `session-${sessionId}-`));
  const args = [
    adapterEntry,
    '--workspace-root', root,
    '--session-id', sessionId,
    '--audit-file', path.join(sessionAuditDir, 'mcp-events.jsonl'),
    '--gateway-evidence-file', path.join(sessionAuditDir, 'gateway-evidence.jsonl'),
  ];
  for (const file of splitAllowlist(process.env.AGENT_CANARY_ALLOWED_FILES)) args.push('--allow-file', file);
  for (const directory of splitAllowlist(process.env.AGENT_CANARY_ALLOWED_DIRECTORIES)) args.push('--allow-directory', directory);

  const client = new Client({ name: 'agent-canary-cline-plugin', version: '0.1.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args,
    cwd: root,
    env: minimalChildEnv(),
    stderr: 'pipe',
  });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = new Set(tools.map((tool) => tool.name));
  for (const name of SAFE_TOOLS) {
    if (!names.has(name)) {
      await client.close().catch(() => undefined);
      throw new Error(`PROTECTED_ADAPTER_TOOL_MISSING:${name}`);
    }
  }
  if (tools.some((tool) => !SAFE_TOOLS.has(tool.name) && tool.name !== 'agent_canary_deny_unsupported')) {
    await client.close().catch(() => undefined);
    throw new Error('PROTECTED_ADAPTER_EXPOSED_UNEXPECTED_TOOL');
  }
  context?.onDispose?.(() => client.close());
  return { client, sessionAuditDir, sessionId };
}

async function executeProtected(state, toolName, input, context = {}) {
  if (!state.bridge) throw new Error('AGENT_CANARY_ADAPTER_UNAVAILABLE_FAIL_CLOSED');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('AGENT_CANARY_TOOL_INPUT_INVALID');
  const callId = validId(context.toolCallId) ? context.toolCallId : `cline-${randomUUID()}`;
  const payload = { ...input, call_id: callId };
  const result = await state.bridge.client.callTool({ name: toolName, arguments: payload }, undefined, context.signal ? { signal: context.signal } : undefined);
  const output = parseMcpOutput(result);
  state.correlationIds.set(callId, result?.structuredContent?.call_id ?? callId);
  return output;
}

function registerTool(api, state, name, description, properties, required) {
  const tool = createTool({
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
    async execute(input, context) {
      return executeProtected(state, name, input, context);
    },
  });
  state.protectedTools.add(tool);
  api.registerTool(tool);
}

export function createAgentCanaryClinePlugin({ adapterEntry } = {}) {
  const state = { bridge: null, sessionId: null, setupError: null, protectedTools: new WeakSet(), correlationIds: new Map() };
  return {
    name: 'agent-canary',
    manifest: { capabilities: ['tools', 'hooks'] },
    async setup(api, context) {
      const hostSessionId = context?.session?.sessionId;
      state.sessionId = validId(hostSessionId) ? hostSessionId : `cline-${randomUUID()}`;
      const root = context?.workspaceInfo?.rootPath;
      try {
        state.bridge = await createSessionBridge(root, state.sessionId, context, adapterEntry);
      } catch (error) {
        state.setupError = error instanceof Error ? error.message : 'CLINE_PLUGIN_SETUP_FAILED';
        console.error(JSON.stringify({ integration: 'agent-canary-cline', phase: 'setup', session_id: state.sessionId, status: 'FAIL_CLOSED', error_code: state.setupError }));
      }

      registerTool(api, state, 'agent_canary_read_file', 'Read one explicitly allowlisted workspace file through the Agent Canary Gateway. Use workspace-relative forward-slash paths.', { path: { type: 'string' } }, ['path']);
      registerTool(api, state, 'agent_canary_list_directory', 'List one explicitly allowlisted directory through the Agent Canary Gateway and the upstream read-only Filesystem MCP server.', { path: { type: 'string' } }, ['path']);
      registerTool(api, state, 'agent_canary_get_file_info', 'Get metadata for one explicitly allowlisted file through the Agent Canary Gateway and the upstream read-only Filesystem MCP server.', { path: { type: 'string' } }, ['path']);
      registerTool(api, state, 'agent_canary_write_file', 'Request a file write through Agent Canary. Writes are denied until the Gateway has a safe write primitive; this tool never forwards writes to the upstream server.', { path: { type: 'string' }, content: { type: 'string' } }, ['path', 'content']);
    },
    hooks: {
      beforeTool({ snapshot, tool, toolCall }) {
        const name = toolCall?.toolName;
        if (SAFE_TOOLS.has(name) && tool && state.protectedTools.has(tool)) return undefined;
        const callId = toolCall?.toolCallId ?? `cline-${randomUUID()}`;
        try {
          console.error(JSON.stringify({
            integration: 'agent-canary-cline',
            phase: 'beforeTool',
            layer: 'CLINE_HOOK',
            decision: 'DENY',
            execution_status: 'NOT_STARTED',
            session_id: snapshot?.conversationId ?? snapshot?.agentId ?? 'unknown',
            cline_tool_call_id: callId,
            tool_name: typeof name === 'string' ? name : 'unknown',
            argument_preview: digest(toolCall?.input),
            reason: 'native tools and direct MCP calls are not connected to the protected executor',
          }));
        } catch {
          // Logging is observational; the block decision must still be returned.
        }
        return { skip: true, reason: 'Agent Canary blocked this native Cline tool before execution. Use an agent_canary_* tool or configure an explicit protected capability.' };
      },
      afterTool({ snapshot, tool, toolCall, result }) {
        if (!SAFE_TOOLS.has(toolCall?.toolName) || !tool || !state.protectedTools.has(tool)) return undefined;
        try {
          const callId = toolCall?.toolCallId ?? 'unknown';
          console.error(JSON.stringify({
            integration: 'agent-canary-cline',
            phase: 'afterTool',
            layer: 'CLINE_HOOK_OBSERVATION',
            session_id: snapshot?.conversationId ?? snapshot?.agentId ?? 'unknown',
            cline_tool_call_id: callId,
            adapter_call_id: state.correlationIds.get(callId) ?? callId,
            tool_name: toolCall?.toolName,
            is_error: result?.isError === true,
          }));
          state.correlationIds.delete(callId);
        } catch {
          // A post-execution telemetry failure cannot change the actual outcome.
        }
        return undefined;
      },
    },
  };
}

const plugin = createAgentCanaryClinePlugin();
export { plugin };
export default plugin;
