# Agent Canary 3.0

Agent Canary 3.0 is an open-source MCP and SDK security toolkit for AI agents. It provides decoy tools, canary tokens, a guarded execution gateway, local self-tests, and an optional risk-policy console.

**Current mainline:** 3.0.0 · MIT · Node.js 20+

- [GitHub release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0)
- [Project website and test results](https://dorianchn.github.io/shanchuanzhi-agent-canary/)
- [Getting started from a pinned source snapshot](GETTING_STARTED.md)
- [Chinese documentation](README.zh-CN.md)
- [Architecture and acceptance report](docs/3.0/FINAL_3_0_ACCEPTANCE.md)
- [Source and issues](https://github.com/DorianChn/shanchuanzhi-agent-canary)

## Install

The npm package is published to GitHub Packages. Configure the @dorianchn scope, then authenticate with a GitHub personal access token (classic) that has read:packages:

```sh
npm config set @dorianchn:registry https://npm.pkg.github.com
npm login --scope=@dorianchn --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @dorianchn/agent-canary@3.0.0
agent-canary --help
```

If authentication fails, check the status before changing credentials:

- `401`: confirm the token is a personal access token (classic) with `read:packages`; enter your GitHub username and token when `npm login` prompts. npm 9 and newer require `--auth-type=legacy` for this prompt-based login.
- `403`: confirm your account can access the package and authorize the token for SSO if the organization requires it.
- `404` or a missing version: check the package name and version, then run `npm config get @dorianchn:registry` and confirm it prints `https://npm.pkg.github.com`.

GitHub Packages requires authentication for public packages too. Never commit a token to the repository or paste it into logs or chat; see [GitHub's npm registry authentication guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry). To build from a pinned source snapshot without logging in to the package registry, follow [Getting started](GETTING_STARTED.md).

The Docker image is published to GitHub Container Registry:

```sh
docker pull ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0
docker run --rm ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0 --help
```

To run the MCP server over stdio, use `agent-canary serve --stdio` or run the container with `-i` and the same arguments. A minimal MCP client entry after global installation is:

```json
{
  "mcpServers": {
    "agent-canary": {
      "command": "agent-canary",
      "args": ["serve", "--stdio"]
    }
  }
}
```

The client-specific config file location varies. Agent Canary protects only callbacks routed through this server; it does not intercept the client's native tools.

## Use the SDK

```ts
import { createTrustedExecutionGateway } from "@dorianchn/agent-canary/sdk";
```

For a runnable example that exercises an allowed read and a denied write, see the [SDK example in the Chinese README](README.zh-CN.md#sdk). The repository's automated test executes that example against the local Gateway.

The host must register the callbacks it wants the gateway to protect. Agent Canary does not automatically control unrelated tools, processes, or native host capabilities.

## Cline + Filesystem MCP integration (R45)

The R45 integration adds a Cline SDK Plugin and a fail-closed adapter for the upstream Filesystem MCP server. In the tested Cline Agent Runtime path, Cline registers only the protected Agent Canary tools; its `beforeTool` hook skips other native or direct MCP tools before their executors run. File content reads use the existing Gateway-held file capability. Directory listing and metadata requests are checked by the Gateway before the adapter calls the upstream server in read-only mode. Writes are denied.

The recorded end-to-end run passed one real stdio Filesystem MCP proxy test and one Cline Agent Runtime test. The run used synthetic files and a deterministic in-process tool-calling model; it did not call an external model API. Raw events, Gateway decisions, pinned upstream revisions, coverage limits, and setup instructions are in the [R45 integration report](R45-Integration-Report.md) and [`integrations/`](integrations/).

This verification covers the pinned Cline SDK Plugin and Agent Runtime route only. The Cline CLI executable and IDE applications were not run. The integration is application-level routing, not OS confinement; do not expose direct Filesystem MCP or native tools outside the plugin boundary and assume they are protected. E4 and the broader model matrix were not run.

## Validation results

The published acceptance record for the frozen 3.0 source reports:

- Community automated suite: **100/100 passed**.
- Windows 11 same-user installation flow: **9 steps passed**; the installer is unsigned. Clean Windows VM validation remains **BLOCKED**.
- Ubuntu portable-package checks: SDK types, doctor, effects, uninstall, and repeat uninstall **passed** in the recorded WSL2 environment.
- Core and wrapper CI: **9/9 and 2/2 jobs passed** for the recorded commits.
- Real local Qwen tool-selection run: **48 trials**. Direct forbidden effects were 12/12 in the unprotected group and 0/12 in the guarded group; guarded calls actively refused 12/12. README-indirect tasks produced 0/4 effects in both groups, so they do not show an active prevention gain. Normal tasks completed 8/8 in both groups.
- Independent reproduction **E4: BLOCKED**. No independent operator and environment have reproduced the frozen build. Same-host tests and log review do not count as E4.

These results apply to the listed source, tests, and environment. They do not establish global protection, zero false positives, or complete TOCTOU elimination. A non-cooperative callback may still cause a late side effect. See [security limitations](docs/3.0/SECURITY_LIMITATIONS.md) and the [full acceptance report](docs/3.0/FINAL_3_0_ACCEPTANCE.md).

## Cloud red-team campaign (2026-11-06)

The synthetic cloud campaign preserved 17 run attempts: 8 completed batches and 9 stopped before trials. The completed batches contain 800 result rows, including 608 attack trials. Recorded side effects occurred in 225/608 attacks (37.0%); defense succeeded in 383/608 (63.0%). Attack generation recorded no explicit refusals in 38 seeds; 5 generation/API/parse failures (13.2%) used deterministic synthetic fallbacks. Each A/B/C/D arm has 200 rows. Most batches reused the same 25-case set, so these are repeated measurements rather than 800 unique scenarios.

The cumulative token-priced ledger is **$8.10611718**; reported-token pricing totals **$6.99682264**. The difference is unreconciled, and the provider invoice amount is unavailable. These author-run synthetic results **do not satisfy E4**. The original run commit was `04b5961b79ae7eeaf6ac9cea5b4f494d771f702f`; the PyRIT work described below was added afterward and was not part of these measurements.

- [Full campaign report, including A/B/C/D, model usage, E4 comparison, and preserved raw logs](security-lab/cloud-redteam/CAMPAIGN-REPORT-2026-11-06.md)
- [Machine-readable campaign summary](security-lab/cloud-redteam/campaign-summary-2026-11-06.json)

## Local development

The repository also includes an optional cloud red-team lab (`security-lab/cloud-redteam`, v0.1.0) with Promptfoo batch evaluation and a separately reported AgentDojo baseline. The next integration adds publicly released red-team techniques from major technology-company security teams, including Microsoft AI Red Team's open-source PyRIT, to give personal agents reproducible, enterprise-grade security evaluation. These are public open-source tools, not proprietary enterprise-only systems. See the [lab setup and scope](security-lab/cloud-redteam/README.md).

```sh
npm ci
npm run verify
```

The verification command builds the TypeScript sources, runs the automated suite, performs offline acceptance and SDK type checks, verifies the source manifest, and smoke-tests the packed npm package.

The demonstration video will be added after it is uploaded.
