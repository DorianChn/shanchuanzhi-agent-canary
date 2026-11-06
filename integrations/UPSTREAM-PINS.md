# R45 upstream pins

The integration was authored against these fixed upstream revisions, checked on 2026-11-06:

| Project | Repository commit | Package version used | License evidence |
| --- | --- | --- | --- |
| Cline SDK Plugin / Core | `ea16751d6ae3ae1e443681994906bf29cbc45039` | `@cline/core@0.2.0`; `@cline/agents@0.2.0` for runtime checks | Cline repository `LICENSE` is Apache-2.0. The pinned `@cline/agents` README marks the runtime experimental. |
| Filesystem MCP Server | `36380287ed3b15d115b55f546617d723072b1296` | `@modelcontextprotocol/server-filesystem@2.2.0` | Package declares `SEE LICENSE IN LICENSE`; upstream license file states a mixed MIT / Apache-2.0 transition, so the file's applicable contribution license must be checked there. |

The Filesystem MCP package manifest at the selected revision requires Node.js `>=24`, provides `mcp-server-filesystem`, supports legacy MCP `initialize` over stdio, and documents `--read-only` and command-line allowed directories. The Cline SDK plugin contract exposes `beforeTool` / `afterTool`; its example guard returns `{ skip: true }` to stop execution. Only public extension points are used; no upstream source was copied or changed.

Primary source files at the selected revisions:

- Cline plugin API example: https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/examples/plugins/README.md
- Cline core package manifest: https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/package.json
- Cline plugin hook example: https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/examples/plugins/env-blocker.ts
- Cline Agent Runtime hook types: https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/shared/src/agent.ts
- Filesystem MCP package manifest: https://github.com/modelcontextprotocol/servers/blob/36380287ed3b15d115b55f546617d723072b1296/src/filesystem/package.json
- Filesystem MCP tools, root restrictions, and read-only mode: https://github.com/modelcontextprotocol/servers/blob/36380287ed3b15d115b55f546617d723072b1296/src/filesystem/README.md
- Filesystem MCP license: https://github.com/modelcontextprotocol/servers/blob/36380287ed3b15d115b55f546617d723072b1296/LICENSE
