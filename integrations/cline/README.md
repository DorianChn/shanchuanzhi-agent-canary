# Agent Canary Cline Plugin

This package uses Cline's public Plugin API (`setup`, registered tools, `beforeTool`, and `afterTool`). The loadable entry point is `src/plugin.js`, the extension format discovered by the pinned Cline Core SDK. It is intended for a Cline Core SDK host or a CLI host that passes this entry point through its `pluginPaths` configuration. It has not been verified in the Cline CLI executable, VS Code, JetBrains, or Desktop applications.

The plugin registers four `agent_canary_*` tools. They call the protected Filesystem MCP adapter over a private stdio connection. The adapter starts the official Filesystem MCP process itself, pins its allowed directory, and enables its `--read-only` mode. Do not add a direct `@modelcontextprotocol/server-filesystem` entry to Cline's MCP configuration.

## Coverage and limits

- The plugin lets only its four registered protected tools execute. Every other Cline tool call, including native file tools, shell/process tools, and any direct MCP tool, returns `skip: true` from `beforeTool` before the callback runs.
- The plugin hook's deny decision is logged as `CLINE_HOOK`. This hook does not itself acquire a Gateway file handle.
- Allowed content reads are performed by the separate Agent Canary Filesystem MCP adapter through the existing Gateway-held file descriptor capability.
- Directory listing and metadata access go through a Gateway `READ_ONLY` MCP capability and the actual upstream Filesystem MCP process.
- File writes are checked by the existing Gateway and denied because there is no safe Gateway write primitive. No write is forwarded; the upstream process is also read-only.
- Startup errors leave the protected tools registered but unusable. Their callbacks throw `AGENT_CANARY_ADAPTER_UNAVAILABLE_FAIL_CLOSED`; native calls remain blocked by the hook.
- The plugin does not provide OS-level isolation. Any Cline surface that does not dispatch the official plugin `beforeTool` hook is outside the verified boundary.

## Install in this checkout

Use the Agent Canary repository as the workspace root:

```powershell
.\integrations\cline\install.ps1 -WorkspaceRoot .
```

The script copies the two local packages under `.cline/plugins/` and installs their pinned dependencies. It refuses to overwrite existing paths. Add the printed absolute `src/plugin.js` entry path to `AgentConfig.pluginPaths` in the Cline Core host configuration. Then configure the files and directories the host may access in its launch environment:

```powershell
$env:AGENT_CANARY_ALLOWED_FILES = "README.md`nGETTING_STARTED.md"
$env:AGENT_CANARY_ALLOWED_DIRECTORIES = "."
```

Paths are workspace-relative, newline-separated, and use `/`. Only files listed in `AGENT_CANARY_ALLOWED_FILES` are eligible for reads. The product Gateway still denies credential paths such as `.env` even if listed.

If Cline currently has a direct filesystem MCP entry, remove or disable it before using this plugin. The hook blocks native/direct MCP calls as long as the plugin is actually loaded; removing the direct entry also avoids leaving an unprotected server available to other hosts.

Uninstall the project-scoped copies with:

```powershell
.\integrations\cline\uninstall.ps1 -WorkspaceRoot .
```

The uninstaller removes only the two exact package names created by this integration and supports `-WhatIf`.

For a host built on Cline Core SDK, keep the sibling `filesystem-mcp` package available so the relative `file:` dependency resolves. The exact load, registration, and tool execution path is exercised by the integration runtime test using Cline's official plugin loader, contribution registry, and Agent Runtime. This package has not been verified with the Cline CLI executable or an IDE extension.

During installation, `postinstall` applies a guarded one-import compatibility patch to the installed `@cline/core@0.2.0` bundle. It adapts Core's default import to the named export in the security-fixed `simple-git@4.0.2`. The script checks the Core version and import count and fails if either changes. It does not vendor or commit Cline's bundle.

## Fixed upstream versions

See [`UPSTREAM-PINS.md`](../UPSTREAM-PINS.md) for commit hashes, package versions, and license notes.
