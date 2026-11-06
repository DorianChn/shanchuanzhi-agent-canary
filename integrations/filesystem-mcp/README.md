# Agent Canary Filesystem MCP adapter

This package is a fail-closed stdio MCP server. Cline connects to the adapter; the adapter starts the pinned upstream `@modelcontextprotocol/server-filesystem` process itself with `--read-only` and the fixed workspace root. Do not register the upstream server directly in Cline.

## Security behavior

- `agent_canary_read_file` is restricted to a startup allowlist. For a safe registered file, content is read using Agent Canary's Gateway-held file descriptor and `readFileWithCapability`; upstream content-read tools are never used for that operation.
- A sensitive path such as `.env` has no Gateway read capability and is denied by Gateway policy before content I/O.
- `agent_canary_list_directory` and `agent_canary_get_file_info` call the actual upstream Filesystem MCP process only after the Gateway validates the exact registered tool and path.
- `agent_canary_write_file` goes through the Gateway's existing `write_file` policy. The current product Gateway has no safe write primitive, so it denies before forwarding. The upstream process also runs read-only.
- Unknown adapter or upstream tool names are dispatched to the Gateway as unregistered MCP capabilities and denied. Inputs are exact-key checked; path aliases containing `..`, backslashes, absolute paths, colons, or redundant segments are rejected.
- Each adapter process owns a fresh AgentGuard, Gateway, held file capabilities, MCP client, and evidence chain. The provided Cline plugin starts one adapter per Cline session.
- Gateway evidence and adapter correlation events are separate JSONL files. Adapter events link `call_id`, MCP request ID, Gateway request IDs, decision, and execution state without storing file contents.

This is application-level control over calls routed through this adapter. It is not an OS sandbox. The Cline hook is a separate pre-tool guard for native Cline tools; it is not a Gateway-held file handle.

## Requirements

Node.js 24 or later. The upstream component is pinned to `@modelcontextprotocol/server-filesystem@2.2.0`. The adapter's stdio client uses `@modelcontextprotocol/sdk@1.32.1` and the 2025 `initialize` handshake supported by the upstream process.

## Run directly

From this package after `npm install`:

```powershell
node .\bin\agent-canary-filesystem-mcp.mjs `
  --workspace-root C:\path\to\synthetic-workspace `
  --session-id r45-manual-session `
  --allow-file public.txt `
  --allow-directory . `
  --audit-file C:\path\to\adapter-events.jsonl `
  --gateway-evidence-file C:\path\to\gateway-evidence.jsonl
```

It speaks MCP JSON-RPC over stdio and performs the initialize handshake. `listTools` exposes only the Agent Canary proxy surface; the upstream tools are not directly forwarded.

## Local end-to-end check

```powershell
npm install
npm run test:e2e
```

The test starts the real upstream filesystem MCP process and the real Agent Canary adapter in separate stdio processes, using only generated temporary files.
