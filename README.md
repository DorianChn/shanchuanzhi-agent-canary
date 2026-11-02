# Agent Canary

**Signals, containment and evidence for AI agent tool calls.**

Agent Canary is an open-source project for developers building with AI agents and MCP. It combines decoy tools, canary tokens, a session guard, configurable policies and evidence records. Protection depends on the host routing its tool calls through the relevant integration.

[Website](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [3.1 source release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.1.0) · [Documentation](docs/3.0/DEVELOPER_GUIDE.md) · [Evidence](docs/3.0/E4_EVIDENCE_INDEX.md) · [中文](README.zh-CN.md)

## What is available

- **Signals:** inert decoy tools and registered canary tokens provide observable events for investigation.
- **Containment:** the Guard and policy components restrict later calls that are routed through integrated, guarded execution paths.
- **Evidence:** records and reproducible tests help inspect decisions, execution status and failures.
- **Integration:** an MCP stdio server and SDK support hosts that explicitly connect them. See [compatibility](COMPATIBILITY.md) and [integration guidance](docs/AGENT_INTEGRATIONS_2.md).

A trigger can be accidental and needs context. Quarantine does not undo an external operation that has already started.

## Scope and current status

| Area | Status |
| --- | --- |
| GitHub 3.1 | [v3.1.0](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.1.0) is a **source release**, pointing to `34fbe6d35d4dea30795525bf538f97194758c6c4`. It has no attached installer or prebuilt binaries. |
| npm version | The source's package metadata remains **1.2.7**. The GitHub 3.1 tag does not mean an npm 3.1 package was published. |
| Native Codex Shell | Built-in Shell is outside the Agent Canary route; global protection is **not established**. |
| Protected reads | Real-host held-identity use and path-replacement controls remain **NOT VERIFIED**; see [issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52). |
| E4 | Independent product-level E4 acceptance is **NOT VERIFIED**. Synthetic fixtures, source tests and baseline CI are separate evidence. |
| Follow-up development | M1–M8 follow-up changes are in separate draft PRs and are not all included in the 3.1 source tag. |

Only integrated tool paths receive the relevant policy. A missing or unavailable backend is not evidence of protection. Read [COMPATIBILITY.md](COMPATIBILITY.md), [API contracts](docs/3.0/API_CONTRACTS.md) and the [E4 evidence index](docs/3.0/E4_EVIDENCE_INDEX.md) before relying on a specific capability.

## Build the 3.1 source

Requires Git and Node.js 20 or newer. Use a controlled environment and review the exact source and dependencies.

```bash
git clone --branch v3.1.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
npm ci
npm run build
```

Run `npm test` to execute the source test suite. A passing source test does not establish protection for native host tools, installed-product behavior or independent E4. Additional commands and integration examples are documented in [Getting Started](GETTING_STARTED.md); that guide describes the historical v3.0.0 tag where indicated.

## Architecture

```text
Host integration → registered tool call → policy / Guard → execution
                                      ↘ signal / evidence → review
```

This is a conceptual flow: coverage and exact interfaces depend on the host and configured path. See [developer guide](docs/3.0/DEVELOPER_GUIDE.md) and [security router](docs/SECURITY_ROUTER_2.md).

## Evidence and historical releases

- [Current security boundary and acceptance issue](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52)
- [E4 evidence index](docs/3.0/E4_EVIDENCE_INDEX.md) and [independent reproduction guide](docs/3.0/E4_REPRODUCTION_GUIDE.md)
- [Historical 2.0 model experiment data](competition-submission/evidence/v2-summary.json) and [audit](docs/competition/AGENT_CANARY_2_FINAL_REPORT.md): controlled scenarios and a limited sample, not a general effectiveness guarantee.
- [Historical Windows Community candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4): a separate older artifact, not the 3.1 source release.
- [Previous detailed README at the 3.1 source commit](https://github.com/DorianChn/shanchuanzhi-agent-canary/blob/34fbe6d35d4dea30795525bf538f97194758c6c4/README.md).

## Contributing and security

Open an [issue](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues) for reproducible defects or a [discussion](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions) for integration questions. Preserve failing results and distinguish observed behavior from assumptions. Follow [SECURITY.md](SECURITY.md) when reporting sensitive vulnerabilities.

MIT licensed; third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).