# Getting started

Start with a source snapshot so setup does not require changing the global CLI or registry configuration. The five-minute target assumes Node.js 20+, npm and Git are available and dependencies can be downloaded; it is not a measured setup-time claim. Keep development source, the historical v3.0.0 tag and candidate installers separate. See [the dated readiness audit](docs/3.0/M8_OPEN_SOURCE_READINESS_2026-10-25.md).

## Five-minute source quick start: reviewed development snapshot

This example pins reviewed M8 source 1c94ed4b8beb8ab3f9e04004c0bc3b0f372b2841. It is not the latest moving feature branch or a published package. Use a new directory:

~~~sh
git clone https://github.com/DorianChn/shanchuanzhi-agent-canary.git agent-canary-source
cd agent-canary-source
git checkout --detach 1c94ed4b8beb8ab3f9e04004c0bc3b0f372b2841
git rev-parse HEAD
npm ci
npm run build
node dist/index.js --help
node dist/index.js self-test --json
~~~

At that source, the last command returns passed=true and four passing checks: safe_call, decoy_quarantine, blocked_callback and audit_order. This is an offline circuit-breaker test, not a host-connection, model, installer or E4 test. Failed checks remain failures.

### Two source CLI entrypoints

The source manifest is version 1.2.7 and its binary points to dist/index.js. Community/product commands live in dist/competition.js. Do not assume a globally installed agent-canary exposes the product integration helper:

~~~sh
npm run build
node dist/competition.js --help
node dist/competition.js integrate --help
~~~

For a current-source Codex preview, create a disposable project and invoke that built entrypoint explicitly:

~~~sh
node /absolute/path/to/agent-canary-source/dist/competition.js integrate --agent codex --project /absolute/path/to/scratch
~~~

The default is PREVIEW_ONLY; inspect the config path, command and coverage before any apply. This audit verified a preview in an empty scratch directory and confirmed no .codex/config.toml was written. It did not run Codex or establish host-native protection. Native Codex Shell remains UNPROTECTED. The historical tag's apply/receipt rollback is documented below; it is not migration between these entrypoints.

## Historical v3.0.0 package path: retrieval not verified

The [v3.0.0 GitHub Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0) has no attached binary assets as checked on 2026-10-25. Its source manifest declares GitHub Packages distribution. This separate channel's package availability/download was not tested. Prefer the source path above if access is unavailable.

Requirements: Node.js 20+, npm, network access, and a GitHub Classic Personal Access Token with `read:packages` for the published npm package. Do not paste the token into this repository or commit an `.npmrc` containing credentials.

~~~sh
npm config set @dorianchn:registry https://npm.pkg.github.com
npm login --scope=@dorianchn --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @dorianchn/agent-canary@3.0.0
agent-canary --help
agent-canary self-test --json
~~~

The CLI self-test reports its result as JSON. The v3.0.0 source verification receipt records four passing self-test checks. A self-test verifies only its local code path; it does not connect Codex or establish protection of Codex's built-in tools.

The npm token is managed by npm in the user's configuration. Use a personal account, keep the token out of project files, and remove credentials you no longer need. The v3.0.0 source tag is available and corresponds to the published GitHub Release; that Release has no attached assets.

### Build from the v3.0.0 source tag

Use the exact source tag, not a moving branch:

~~~sh
git clone --depth 1 --branch v3.0.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git agent-canary-3.0.0
cd agent-canary-3.0.0
git rev-parse HEAD
npm ci
npm run build
node dist/competition.js self-test --json
~~~

The source tag is the reproducible code snapshot for v3.0.0. `npm run verify` runs the broader project verification suite; a passing run still does not establish global host-tool coverage or independent E4.

## Moving development branches

For another feature snapshot, record the full commit SHA and follow its CLI help/package metadata. A moving branch is not a Release artifact. The source example above pins the reviewed M8 head, not current feature or v3.0.0.

## Codex MCP setup (v3.0.0 tag)

The v3.0.0 CLI includes an integration helper that previews and registers Agent Canary's MCP server in a project-scoped `.codex/config.toml`. Use a disposable scratch project. This is MCP registration, not a guard for Codex's built-in tools.

1. Create an empty scratch project and keep the shell in that directory. In Git Bash, macOS, or Linux:

   ~~~sh
   mkdir -p "$HOME/agent-canary-codex-sandbox"
   cd "$HOME/agent-canary-codex-sandbox"
   ~~~

   In PowerShell:

   ~~~powershell
   $scratch = Join-Path $HOME 'agent-canary-codex-sandbox'
   New-Item -ItemType Directory -Force $scratch
   Set-Location $scratch
   ~~~

2. Preview the exact change. This command does not write the configuration:

   ~~~sh
   agent-canary integrate --agent codex --project .
   ~~~

   Review the printed config path, server command and arguments, coverage note, and baseline hash. The preview does not modify the file.

3. If the preview targets the scratch project and shows the expected entry, apply it:

   ~~~sh
   agent-canary integrate --agent codex --project . --apply
   ~~~

   The helper refuses to replace an existing `agent-canary` table. It writes a backup and receipt under `~/.agent-canary-integration-backups`; verify that your user account protects this directory, keep it out of Git, and do not share it because the original Codex config may contain sensitive values.

4. Open the scratch project as a trusted project in Codex. Codex reads project-scoped MCP config only for trusted projects. From the scratch project, check the registered server with:

   ~~~sh
   codex mcp list
   ~~~

   In the Codex TUI, `/mcp` shows active MCP servers. The [official Codex MCP guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) documents STDIO servers, the `codex mcp list` command, and trusted-project requirements.

5. To roll back an unchanged configuration, run the installed v3.0.0 CLI with the receipt path printed by the apply command:

   ~~~sh
   agent-canary integrate --restore "/absolute/path/to/receipt.json"
   ~~~

   If Codex or another program has edited the configuration since installation, restore stops and preserves those edits. Review the file manually rather than forcing a restore.

### What this Codex setup does and does not do

It registers Agent Canary's MCP server. It does not route Codex's built-in shell, file, browser, or other MCP servers through Agent Canary. A decoy call can signal and quarantine only the Agent Canary route; an unguarded host action is outside this control path. Do not treat `MCP_DECOY_INSTALLED`, installation success, or `codex mcp list` as evidence of native-tool protection.

For host coverage and current gaps, see [COMPATIBILITY.md](COMPATIBILITY.md). The project-scoped config mechanism is documented by OpenAI; Agent Canary's security effect remains limited to its own registered callback path.
