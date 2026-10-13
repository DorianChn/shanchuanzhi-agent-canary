# Agent Canary 3.0

Agent Canary 3.0 is an open-source MCP and SDK security toolkit for AI agents. It provides decoy tools, canary tokens, a guarded execution gateway, local self-tests, and an optional risk-policy console.

**Current mainline:** 3.0.0 · MIT · Node.js 20+

- [GitHub release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0)
- [Project website and test results](https://dorianchn.github.io/shanchuanzhi-agent-canary/)
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

The Docker image is published to GitHub Container Registry:

```sh
docker pull ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0
docker run --rm ghcr.io/dorianchn/shanchuanzhi-agent-canary:3.0.0 --help
```

To run the MCP server over stdio, use agent-canary serve --stdio or run the container with -i and the same arguments.

## Use the SDK

```ts
import { createTrustedExecutionGateway } from "@dorianchn/agent-canary/sdk";
```

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
