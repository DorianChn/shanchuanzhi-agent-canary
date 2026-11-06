import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  createAgentGuard,
  createTrustedExecutionGateway,
  EvidenceRecorder,
  GatewayDeniedError,
} from '@dorianchn/agent-canary/sdk';

const require = createRequire(import.meta.url);
const PROTECTED_TOOLS = Object.freeze([
  'agent_canary_read_file',
  'agent_canary_list_directory',
  'agent_canary_get_file_info',
  'agent_canary_write_file',
  'agent_canary_deny_unsupported',
]);
const REQUIRED_UPSTREAM_TOOLS = ['read_text_file', 'list_directory', 'get_file_info'];
const MUTATING_UPSTREAM_TOOLS = new Set([
  'write_file', 'append_file', 'edit_file', 'create_directory', 'move_file', 'copy_file',
  'delete_file', 'delete_directory', 'create_symlink',
]);

function fail(code) {
  throw new Error(code);
}

function normalizeRelativePath(value, { allowDot = false } = {}) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.includes('\0') || value.includes(':')) return undefined;
  if (value === '.' && allowDot) return '.';
  if (value.startsWith('/') || value.endsWith('/') || value.split('/').some((part) => part === '' || part === '.' || part === '..')) return undefined;
  if (path.posix.normalize(value) !== value) return undefined;
  return value;
}

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function keysAre(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return required.every((key) => actual.includes(key)) && actual.every((key) => required.includes(key) || optional.includes(key));
}

function safeDigest(value) {
  try { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  catch { return 'invalid-json'; }
}

function makeLineWriter(file) {
  if (!path.isAbsolute(file)) fail('R45_AUDIT_PATH_MUST_BE_ABSOLUTE');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(file, 'wx', 0o600);
  return {
    file,
    write(event) {
      const line = Buffer.from(`${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`);
      let offset = 0;
      while (offset < line.length) {
        const written = fs.writeSync(fd, line, offset, line.length - offset);
        if (written <= 0) fail('R45_AUDIT_WRITE_FAILED');
        offset += written;
      }
      fs.fsyncSync(fd);
    },
    close() { fs.closeSync(fd); },
  };
}

function parseOptions(input) {
  const root = fs.realpathSync.native(input.workspaceRoot);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('R45_WORKSPACE_ROOT_INVALID');
  if (typeof input.sessionId !== 'string' || !/^[A-Za-z0-9_.:-]{1,100}$/.test(input.sessionId)) fail('R45_SESSION_ID_INVALID');
  if (!Array.isArray(input.allowedFiles) || !Array.isArray(input.allowedDirectories)) fail('R45_ALLOWLIST_INVALID');
  const allowedFiles = [...new Set(input.allowedFiles.map((p) => normalizeRelativePath(p)))];
  const allowedDirectories = [...new Set(input.allowedDirectories.map((p) => normalizeRelativePath(p, { allowDot: true })))];
  if (allowedFiles.includes(undefined) || allowedDirectories.includes(undefined)) fail('R45_ALLOWLIST_PATH_INVALID');
  for (const relative of allowedFiles) {
    const absolute = path.join(root, ...relative.split('/'));
    const st = fs.lstatSync(absolute);
    if (!st.isFile() || st.isSymbolicLink()) fail('R45_ALLOWED_FILE_NOT_REGULAR');
  }
  for (const relative of allowedDirectories) {
    const absolute = relative === '.' ? root : path.join(root, ...relative.split('/'));
    const st = fs.lstatSync(absolute);
    if (!st.isDirectory() || st.isSymbolicLink()) fail('R45_ALLOWED_DIRECTORY_NOT_DIRECTORY');
  }
  for (const file of [input.auditFile, input.gatewayEvidenceFile]) {
    if (typeof file !== 'string' || !path.isAbsolute(file)) fail('R45_AUDIT_PATH_MUST_BE_ABSOLUTE');
  }
  return { ...input, workspaceRoot: root, allowedFiles, allowedDirectories };
}

function mcpError(error) {
  const reason = error instanceof GatewayDeniedError ? error.reason : (error?.message || 'R45_OPERATION_FAILED');
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: reason, request_id: error?.requestId ?? null, execution_status: error instanceof GatewayDeniedError ? 'NOT_STARTED' : 'UNKNOWN' }) }] };
}

function minimalEvidence(events) {
  return events.map((event) => ({
    request_id: event.request_id,
    tool_id: event.tool_id,
    decision: event.decision,
    decision_reason: event.decision_reason,
    execution_status: event.execution_status,
    side_effect_verification: event.side_effect_verification,
  }));
}

export async function createProtectedFilesystemMcp(input) {
  const options = parseOptions(input);
  const audit = makeLineWriter(options.auditFile);
  let evidence;
  let gateway;
  let upstreamClient;
  let upstreamTransport;
  let server;
  let serverTransport;
  let closed = false;

  try {
    evidence = new EvidenceRecorder(4096, options.gatewayEvidenceFile);
    const guard = createAgentGuard({ sessionId: options.sessionId, canaryEnabled: false, alert: false });
    const files = options.allowedFiles.map((relativePath) => ({ path: relativePath }));
    gateway = createTrustedExecutionGateway({
      agentId: `cline-${options.sessionId}`.slice(0, 100),
      guard,
      workspaceRoot: options.workspaceRoot,
      files,
      evidence,
      mcpTools: {
        list_directory: {
          approvalRequired: false,
          risk: 'READ_ONLY',
          execute: async (args, signal) => {
            if (!exactKeys(args, ['path']) || !options.allowedDirectories.includes(normalizeRelativePath(args.path, { allowDot: true }))) fail('R45_DIRECTORY_CAPABILITY_ARGUMENT_INVALID');
            const absolutePath = args.path === '.' ? options.workspaceRoot : path.join(options.workspaceRoot, ...args.path.split('/'));
            const result = await upstreamClient.callTool({ name: 'list_directory', arguments: { path: absolutePath } }, undefined, { signal });
            if (result.isError) throw new Error('R45_UPSTREAM_LIST_DIRECTORY_FAILED');
            return result.content;
          },
        },
        get_file_info: {
          approvalRequired: false,
          risk: 'READ_ONLY',
          execute: async (args, signal) => {
            if (!exactKeys(args, ['path']) || !options.allowedFiles.includes(normalizeRelativePath(args.path))) fail('R45_FILE_INFO_CAPABILITY_ARGUMENT_INVALID');
            const absolutePath = path.join(options.workspaceRoot, ...args.path.split('/'));
            const result = await upstreamClient.callTool({ name: 'get_file_info', arguments: { path: absolutePath } }, undefined, { signal });
            if (result.isError) throw new Error('R45_UPSTREAM_GET_FILE_INFO_FAILED');
            return result.content;
          },
        },
      },
    });

    upstreamClient = new Client({ name: 'agent-canary-filesystem-upstream-client', version: '0.1.0' }, { capabilities: {} });
    const upstreamEntry = require.resolve('@modelcontextprotocol/server-filesystem/dist/index.js');
    const env = {};
    for (const name of ['PATH', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']) {
      if (process.env[name] !== undefined) env[name] = process.env[name];
    }
    upstreamTransport = new StdioClientTransport({
      command: process.execPath,
      args: [upstreamEntry, '--read-only', '--', options.workspaceRoot],
      cwd: options.workspaceRoot,
      env,
      stderr: 'pipe',
    });
    await upstreamClient.connect(upstreamTransport);
    const upstream = await upstreamClient.listTools();
    const upstreamNames = new Set(upstream.tools.map((tool) => tool.name));
    const missing = REQUIRED_UPSTREAM_TOOLS.filter((name) => !upstreamNames.has(name));
    const unsafeAdvertised = upstream.tools.filter((tool) => MUTATING_UPSTREAM_TOOLS.has(tool.name) || tool.annotations?.readOnlyHint !== true).map((tool) => tool.name);
    if (missing.length) fail(`R45_UPSTREAM_TOOLS_MISSING:${missing.join(',')}`);
    if (unsafeAdvertised.length) fail(`R45_UPSTREAM_READ_ONLY_CONTRACT_FAILED:${unsafeAdvertised.join(',')}`);
    audit.write({ phase: 'upstream-ready', session_id: options.sessionId, upstream_package: '@modelcontextprotocol/server-filesystem@2.2.0', upstream_tools: upstream.tools.map((tool) => tool.name), upstream_read_only: true });

    const serverTools = [
      {
        name: 'agent_canary_read_file',
        description: 'Read one explicitly registered workspace file through the Agent Canary Gateway. Paths are workspace-relative.',
        inputSchema: { type: 'object', properties: { path: { type: 'string' }, call_id: { type: 'string' } }, required: ['path'], additionalProperties: false },
      },
      {
        name: 'agent_canary_list_directory',
        description: 'List one host-allowlisted directory by calling the upstream read-only Filesystem MCP server through the Agent Canary Gateway.',
        inputSchema: { type: 'object', properties: { path: { type: 'string' }, call_id: { type: 'string' } }, required: ['path'], additionalProperties: false },
      },
      {
        name: 'agent_canary_get_file_info',
        description: 'Get metadata for one explicitly registered file through the Agent Canary Gateway and upstream read-only Filesystem MCP server.',
        inputSchema: { type: 'object', properties: { path: { type: 'string' }, call_id: { type: 'string' } }, required: ['path'], additionalProperties: false },
      },
      {
        name: 'agent_canary_write_file',
        description: 'Request a file write through Agent Canary. The current Gateway has no safe write primitive and denies this operation before the upstream server is called.',
        inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, call_id: { type: 'string' } }, required: ['path', 'content'], additionalProperties: false },
      },
      {
        name: 'agent_canary_deny_unsupported',
        description: 'Record and reject an unsupported Cline native or MCP tool call through Agent Canary.',
        inputSchema: { type: 'object', properties: { tool_name: { type: 'string' }, argument_digest: { type: 'string' }, call_id: { type: 'string' } }, required: ['tool_name'], additionalProperties: false },
      },
    ];
    const readCapabilities = new Map();
    for (const relativePath of options.allowedFiles) {
      try {
        readCapabilities.set(relativePath, gateway.bindFileReadCapability({ toolName: 'agent_canary_read_file', operation: 'file-read', path: relativePath }));
      } catch {
        // Sensitive or unsafe files remain registered with M1 and are denied there; no read capability is issued.
      }
    }
    server = new Server(
      { name: 'agent-canary-filesystem-proxy', version: '0.1.0' },
      { capabilities: { tools: {} }, instructions: 'All exposed operations are enforced by Agent Canary. Unknown and write-capable operations are denied. The upstream Filesystem MCP process runs with --read-only and a fixed allowed root.' },
    );
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: serverTools }));
    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const name = request.params.name;
      const args = request.params.arguments ?? {};
      const callId = typeof args.call_id === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(args.call_id) ? args.call_id : `mcp-${randomUUID()}`;
      const before = gateway.evidence().length;
      const entry = {
        session_id: options.sessionId,
        call_id: callId,
        mcp_request_id: extra.requestId,
        tool: name,
        argument_digest: safeDigest(args),
        execution_result: 'NOT_STARTED',
      };
      try {
        audit.write({ ...entry, phase: 'request' });
      } catch {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'R45_AUDIT_UNAVAILABLE', execution_status: 'NOT_STARTED' }) }] };
      }
      try {
        const validShape = name === 'agent_canary_read_file' || name === 'agent_canary_list_directory' || name === 'agent_canary_get_file_info'
          ? keysAre(args, ['path'], ['call_id'])
          : name === 'agent_canary_write_file'
            ? keysAre(args, ['path', 'content'], ['call_id'])
            : name === 'agent_canary_deny_unsupported'
              ? keysAre(args, ['tool_name'], ['argument_digest', 'call_id'])
              : false;
        if (!validShape) {
          await gateway.agent.dispatch({ name: 'mcp_tool', args: { tool: 'agent_canary.invalid_arguments', arguments: { tool: name, argument_digest: safeDigest(args) } } }, extra.signal);
          fail('R45_ARGUMENTS_INVALID');
        }
        let result;
        let outputText;
        if (name === 'agent_canary_read_file') {
          const relativePath = normalizeRelativePath(args.path);
          if (!relativePath) {
            await gateway.agent.dispatch({ name: 'mcp_tool', args: { tool: 'agent_canary.invalid_path', arguments: { path_digest: safeDigest(args.path) } } }, extra.signal);
            fail('R45_PATH_INVALID');
          }
          const call = { name: 'agent_canary_read_file', args: { path: relativePath } };
          const capability = options.allowedFiles.includes(relativePath) ? readCapabilities.get(relativePath) : undefined;
          if (capability) result = await gateway.readFileWithCapability(capability, call, 'file-read', extra.signal);
          else result = await gateway.agent.dispatch({ name: 'read_file', args: { path: relativePath } }, extra.signal);
          outputText = typeof result?.content === 'string' ? result.content : JSON.stringify(result);
        } else if (name === 'agent_canary_list_directory' || name === 'agent_canary_get_file_info') {
          const upstreamName = name === 'agent_canary_list_directory' ? 'list_directory' : 'get_file_info';
          const relativePath = args.path;
          const argsForGateway = { path: relativePath };
          result = await gateway.agent.dispatch({ name: 'mcp_tool', args: { tool: upstreamName, arguments: argsForGateway } }, extra.signal);
          outputText = typeof result === 'string' ? result : JSON.stringify(result);
        } else if (name === 'agent_canary_write_file') {
          result = await gateway.agent.dispatch({ name: 'write_file', args: { path: args.path, content: args.content } }, extra.signal);
          outputText = JSON.stringify(result);
        } else if (name === 'agent_canary_deny_unsupported') {
          const unsupportedName = typeof args.tool_name === 'string' ? args.tool_name.slice(0, 80) : 'invalid_tool_name';
          result = await gateway.agent.dispatch({ name: 'mcp_tool', args: { tool: `cline.native.${unsupportedName}`, arguments: { argument_digest: typeof args.argument_digest === 'string' ? args.argument_digest : safeDigest(args) } } }, extra.signal);
          outputText = JSON.stringify(result);
        } else {
          result = await gateway.agent.dispatch({ name: 'mcp_tool', args: { tool: name, arguments: args } }, extra.signal);
          outputText = JSON.stringify(result);
        }
        const events = gateway.evidence().slice(before);
        audit.write({ ...entry, phase: 'result', execution_result: 'SUCCEEDED', gateway_events: minimalEvidence(events), result_sha256: safeDigest(outputText) });
        return {
          content: [{ type: 'text', text: outputText }],
          structuredContent: {
            call_id: callId,
            mcp_request_id: extra.requestId,
            gateway_request_ids: [...new Set(events.map((event) => event.request_id))],
            result: outputText,
          },
        };
      } catch (error) {
        const events = gateway.evidence().slice(before);
        try {
          audit.write({ ...entry, phase: 'result', execution_result: error instanceof GatewayDeniedError ? 'DENIED_BEFORE_EXECUTION' : 'ERROR', gateway_events: minimalEvidence(events), error_code: error instanceof GatewayDeniedError ? error.reason : (error?.message || 'R45_OPERATION_FAILED'), request_id: error?.requestId ?? null });
        } catch {
          // The request-intent line remains durable. Never convert an audit failure into an allow.
        }
        return mcpError(error);
      }
    });
    serverTransport = new StdioServerTransport();
    await server.connect(serverTransport);
    audit.write({ phase: 'protected-server-ready', session_id: options.sessionId, server_tools: PROTECTED_TOOLS, file_capabilities: [...readCapabilities.keys()], gateway_session_isolated: true });
    return {
      gateway,
      evidence,
      upstreamClient,
      audit,
      async close() {
        if (closed) return;
        closed = true;
        try { await server.close(); } finally {
          try { await upstreamClient.close(); } catch {}
          try { await gateway.close(); } finally {
            evidence.close();
            audit.close();
          }
        }
      },
    };
  } catch (error) {
    try { if (server) await server.close(); } catch {}
    try { if (upstreamClient) await upstreamClient.close(); } catch {}
    try { if (gateway) await gateway.close(); } catch {}
    try { if (evidence) evidence.close(); } catch {}
    try { audit.close(); } catch {}
    throw error;
  }
}

export function optionsFromArgs(argv) {
  const values = { allowedFiles: [], allowedDirectories: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--allow-file') values.allowedFiles.push(argv[++index]);
    else if (key === '--allow-directory') values.allowedDirectories.push(argv[++index]);
    else if (key === '--workspace-root') values.workspaceRoot = argv[++index];
    else if (key === '--session-id') values.sessionId = argv[++index];
    else if (key === '--audit-file') values.auditFile = argv[++index];
    else if (key === '--gateway-evidence-file') values.gatewayEvidenceFile = argv[++index];
    else fail(`R45_UNKNOWN_ARGUMENT:${key}`);
  }
  return values;
}

export const createDefaultAuditPaths = (sessionId) => {
  const directory = path.join(os.tmpdir(), 'agent-canary-r45', sessionId);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return {
    auditFile: path.join(directory, `mcp-events-${randomUUID()}.jsonl`),
    gatewayEvidenceFile: path.join(directory, `gateway-evidence-${randomUUID()}.jsonl`),
  };
};
