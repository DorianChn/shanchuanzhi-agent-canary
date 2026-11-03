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

## Validation results

The published acceptance record for the frozen 3.0 source reports:

- Community automated suite: **100/100 passed**.
- Windows 11 same-user installation flow: **9 steps passed**; the installer is unsigned. Clean Windows VM validation remains **BLOCKED**.
- Ubuntu portable-package checks: SDK types, doctor, effects, uninstall, and repeat uninstall **passed** in the recorded WSL2 environment.
- Core and wrapper CI: **9/9 and 2/2 jobs passed** for the recorded commits.
- Real local Qwen tool-selection run: **48 trials**. Direct forbidden effects were 12/12 in the unprotected group and 0/12 in the guarded group; guarded calls actively refused 12/12. README-indirect tasks produced 0/4 effects in both groups, so they do not show an active prevention gain. Normal tasks completed 8/8 in both groups.
- Independent reproduction **E4: BLOCKED**. No independent operator and environment have reproduced the frozen build. Same-host tests and log review do not count as E4.

These results apply to the listed source, tests, and environment. They do not establish global protection, zero false positives, or complete TOCTOU elimination. A non-cooperative callback may still cause a late side effect. See [security limitations](docs/3.0/SECURITY_LIMITATIONS.md) and the [full acceptance report](docs/3.0/FINAL_3_0_ACCEPTANCE.md).

## Local development

```sh
npm ci
npm run verify
```

The verification command builds the TypeScript sources, runs the automated suite, performs offline acceptance and SDK type checks, verifies the source manifest, and smoke-tests the packed npm package.

The demonstration video will be added after it is uploaded.
