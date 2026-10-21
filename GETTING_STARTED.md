# Getting started

The v3.0.0 GitHub Release is published, but it has no attached Release assets. This guide uses the v3.0.0 CLI package from GitHub Packages or builds from the `v3.0.0` source tag; GitHub Packages distribution is separate from GitHub Releases. The moving `feature/agent-canary-3.0` branch is a separate development build and may differ from that source tag. The five-minute target assumes Node.js is installed and a GitHub token with `read:packages` is available; first-time account/token setup or dependency downloads may take longer.

## Five-minute quick start: v3.0.0 package

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

## Optional development build

The moving `feature/agent-canary-3.0` branch is not a published Release artifact. If you need to inspect it, pin and record the full commit SHA, label results as development-source results, and do not treat its package metadata or behavior as v3.0.0 behavior.

~~~sh
git clone --depth 1 --branch feature/agent-canary-3.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git agent-canary-dev
cd agent-canary-dev
git rev-parse HEAD
npm ci
npm run build
node dist/competition.js self-test --json
~~~

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
