import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const adapterEntry = require.resolve('../bin/agent-canary-filesystem-mcp.mjs');

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function textOf(result) {
  return (result.content ?? []).filter((block) => block.type === 'text').map((block) => block.text).join('\n');
}

function adapterEnv() {
  const env = {};
  for (const key of ['PATH', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']) if (process.env[key] !== undefined) env[key] = process.env[key];
  return env;
}

test('real stdio proxy enforces Gateway reads, upstream listing, write denial and audit correlation', async (t) => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Filesystem MCP requires Node.js 24+');
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-r45-fs-e2e-'));
  const workspaceRoot = path.join(sandbox, 'workspace');
  fs.mkdirSync(workspaceRoot);
  fs.writeFileSync(path.join(workspaceRoot, 'public.txt'), 'R45_PUBLIC_FILE_OK\n');
  fs.writeFileSync(path.join(workspaceRoot, 'business.txt'), 'R45_BUSINESS_DOCUMENT_OK\n');
  fs.writeFileSync(path.join(workspaceRoot, '.env'), 'R45_SYNTHETIC_SECRET=NOT_A_REAL_CREDENTIAL\n');
  const auditFile = path.join(sandbox, 'adapter-events.jsonl');
  const gatewayEvidenceFile = path.join(sandbox, 'gateway-evidence.jsonl');
  const client = new Client({ name: 'r45-real-mcp-e2e-client', version: '0.1.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      adapterEntry,
      '--workspace-root', workspaceRoot,
      '--session-id', 'r45-fs-session-a',
      '--allow-file', 'public.txt',
      '--allow-file', 'business.txt',
      '--allow-file', '.env',
      '--allow-directory', '.',
      '--audit-file', auditFile,
      '--gateway-evidence-file', gatewayEvidenceFile,
    ],
    cwd: workspaceRoot,
    env: adapterEnv(),
    stderr: 'pipe',
  });
  t.after(async () => {
    try { await client.close(); } catch {}
    const evidenceDir = process.env.R45_EVIDENCE_DIR;
    if (evidenceDir) {
      fs.mkdirSync(evidenceDir, { recursive: true });
      for (const [source, name] of [[auditFile, 'filesystem-mcp-events.jsonl'], [gatewayEvidenceFile, 'filesystem-gateway-evidence.jsonl']]) {
        if (fs.existsSync(source)) fs.copyFileSync(source, path.join(evidenceDir, name));
      }
      fs.writeFileSync(path.join(evidenceDir, 'filesystem-e2e-fixture.json'), JSON.stringify({
        test: 'real stdio proxy enforces Gateway reads, upstream listing, write denial and audit correlation',
        node: process.version,
        upstream: '@modelcontextprotocol/server-filesystem@2.2.0',
        synthetic_files: ['public.txt', 'business.txt', '.env'],
        performed_operations: ['initialize', 'tools/list', 'read public', 'read business', 'deny synthetic .env read', 'list directory', 'get file info', 'deny write', 'deny direct upstream tool', 'deny traversal'],
      }, null, 2));
    }
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  await client.connect(transport); // Real MCP initialize handshake over stdio.
  const listed = await client.listTools();
  const toolNames = listed.tools.map((tool) => tool.name);
  assert.deepEqual(toolNames, [
    'agent_canary_read_file',
    'agent_canary_list_directory',
    'agent_canary_get_file_info',
    'agent_canary_write_file',
    'agent_canary_deny_unsupported',
  ]);

  const publicRead = await client.callTool({ name: 'agent_canary_read_file', arguments: { path: 'public.txt', call_id: 'r45-public-read-1' } });
  assert.equal(publicRead.isError, undefined);
  assert.match(textOf(publicRead), /R45_PUBLIC_FILE_OK/);
  assert.equal(publicRead.structuredContent.call_id, 'r45-public-read-1');
  assert.equal(publicRead.structuredContent.gateway_request_ids.length, 1);

  const businessRead = await client.callTool({ name: 'agent_canary_read_file', arguments: { path: 'business.txt', call_id: 'r45-business-read-1' } });
  assert.equal(businessRead.isError, undefined);
  assert.match(textOf(businessRead), /R45_BUSINESS_DOCUMENT_OK/);

  const sensitiveRead = await client.callTool({ name: 'agent_canary_read_file', arguments: { path: '.env', call_id: 'r45-sensitive-read-1' } });
  assert.equal(sensitiveRead.isError, true);
  assert.match(textOf(sensitiveRead), /credential_resource_denied/);
  assert.equal(fs.readFileSync(path.join(workspaceRoot, '.env'), 'utf8'), 'R45_SYNTHETIC_SECRET=NOT_A_REAL_CREDENTIAL\n');

  const listing = await client.callTool({ name: 'agent_canary_list_directory', arguments: { path: '.', call_id: 'r45-list-root-1' } });
  assert.equal(listing.isError, undefined, textOf(listing));
  assert.match(textOf(listing), /public\.txt/);
  assert.match(textOf(listing), /business\.txt/);

  const fileInfo = await client.callTool({ name: 'agent_canary_get_file_info', arguments: { path: 'business.txt', call_id: 'r45-file-info-1' } });
  assert.equal(fileInfo.isError, undefined);
  assert.match(textOf(fileInfo), /business\.txt|size|file/i);

  const write = await client.callTool({ name: 'agent_canary_write_file', arguments: { path: 'public.txt', content: 'R45_MUST_NOT_WRITE', call_id: 'r45-write-1' } });
  assert.equal(write.isError, true);
  assert.match(textOf(write), /write_capability_disabled_pending_path_safe_primitive/);
  assert.equal(fs.readFileSync(path.join(workspaceRoot, 'public.txt'), 'utf8'), 'R45_PUBLIC_FILE_OK\n');

  const directUpstreamAttempt = await client.callTool({ name: 'read_text_file', arguments: { path: path.join(workspaceRoot, 'public.txt') } });
  assert.equal(directUpstreamAttempt.isError, true);
  assert.match(textOf(directUpstreamAttempt), /mcp_capability_denied|mcp_tool_arguments_invalid/);
  assert.equal(fs.readFileSync(path.join(workspaceRoot, 'public.txt'), 'utf8'), 'R45_PUBLIC_FILE_OK\n');

  const traversal = await client.callTool({ name: 'agent_canary_read_file', arguments: { path: '../workspace/.env', call_id: 'r45-traversal-1' } });
  assert.equal(traversal.isError, true);
  assert.match(textOf(traversal), /mcp_capability_denied/);

  const events = readJsonl(auditFile);
  const publicResult = events.find((event) => event.phase === 'result' && event.call_id === 'r45-public-read-1');
  assert.equal(publicResult.execution_result, 'SUCCEEDED');
  assert.ok(publicResult.gateway_events.some((event) => event.decision === 'ALLOW'));
  assert.ok(publicResult.gateway_events.some((event) => event.execution_status === 'SUCCEEDED'));
  assert.ok(publicResult.gateway_events.some((event) => event.execution_status === 'RUNNING'));
  assert.equal(typeof publicResult.mcp_request_id, 'number');
  assert.match(publicResult.gateway_events[0].request_id, /^[0-9a-f-]{36}$/);
  const sensitiveResult = events.find((event) => event.phase === 'result' && event.call_id === 'r45-sensitive-read-1');
  assert.equal(sensitiveResult.execution_result, 'DENIED_BEFORE_EXECUTION');
  assert.equal(sensitiveResult.gateway_events[0].decision, 'DENY');
  assert.equal(sensitiveResult.gateway_events[0].execution_status, 'NOT_STARTED');
  const listResult = events.find((event) => event.phase === 'result' && event.call_id === 'r45-list-root-1');
  assert.equal(listResult.gateway_events[0].decision, 'ALLOW');
  assert.ok(listResult.gateway_events.some((event) => event.execution_status === 'SUCCEEDED'));
  assert.ok(listResult.gateway_events.some((event) => event.execution_status === 'RUNNING'));
  const writeResult = events.find((event) => event.phase === 'result' && event.call_id === 'r45-write-1');
  assert.equal(writeResult.execution_result, 'DENIED_BEFORE_EXECUTION');
  assert.equal(writeResult.gateway_events[0].decision, 'DENY');
  assert.equal(writeResult.gateway_events[0].execution_status, 'NOT_STARTED');
  const startup = events.find((event) => event.phase === 'upstream-ready');
  assert.equal(startup.upstream_package, '@modelcontextprotocol/server-filesystem@2.2.0');
  assert.ok(startup.upstream_tools.includes('read_text_file'));
  assert.ok(startup.upstream_tools.includes('list_directory'));
  assert.equal(startup.upstream_read_only, true);
  assert.ok(!startup.upstream_tools.some((name) => ['write_file', 'append_file', 'edit_file', 'create_directory', 'move_file'].includes(name)));
  const gatewayEvents = readJsonl(gatewayEvidenceFile);
  assert.ok(gatewayEvents.some((event) => event.decision === 'ALLOW' && event.tool_id === 'read_file'));
  assert.ok(gatewayEvents.some((event) => event.decision === 'DENY' && event.decision_reason === 'credential_resource_denied'));
  assert.ok(gatewayEvents.some((event) => event.decision === 'DENY' && event.tool_id === 'write_file'));
});
