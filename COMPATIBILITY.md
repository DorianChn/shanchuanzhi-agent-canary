# Compatibility and feature status

This matrix separates repository CI coverage, host configuration fixtures, and observed runtime behavior. A configuration fixture is not proof that a desktop host loaded a tool or protects its native tools.

## Release and feature maturity

| Area | Status | Notes |
|---|---|---|
| Agent Canary CLI, MCP stdio server, SDK Gateway, decoys/canary checks, offline self-test, doctor, project MCP integration helper, and local risk-policy console | **Released: v3.0.0** | Current stable GitHub release. Published source and package behavior are tied to the [v3.0.0 tag](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0); protection remains limited to registered Agent Canary callbacks. |
| V1.2.7 | **Earlier stable release** | Still a published version, but not the current latest release. Follow its tag-specific package metadata and documentation when reproducing old results. |
| v3.0.0-competition-candidate.4 | **Pre-release candidate** | Candidate-specific installer and evidence; do not treat its artifacts or test results as interchangeable with the v3.0.0 tag. |
| `feature/agent-canary-3.0` and other moving branches | **Development** | Pin a full commit SHA. Branch contents and package metadata can change and are not release artifacts. |
| Independent security benefit from AI/risk-policy analysis or adaptive decoys | **Experimental / not verified** | The local console is present in v3.0.0, but independent AI benefit and adaptive-versus-static gain are not established. |
| Candidate desktop installer, native-host hooks, and Auto E4 | **Candidate-specific / partial** | These are not general guarantees of the stable CLI/SDK package. The earlier installer is unsigned and clean-VM validation remains blocked. See [security limitations](docs/3.0/SECURITY_LIMITATIONS.md) and the [E4 evidence index](E4_EVIDENCE_INDEX.md). |
| Native protection of Codex/Claude/Cursor/Cline built-in tools | **Not verified as general coverage** | An MCP server or hook configuration does not imply global interception. |

## Runtime and operating systems

| Surface | Declared/configured coverage | What that means |
|---|---|---|
| Node.js | >=20 in the v3.0.0 package manifest | Declared runtime minimum; the release verification receipt specifically records Windows Node.js 22.23.1. This does not imply every Node release has been tested. |
| Windows source build | **Verified for a bounded v3.0.0 release run** | The immutable mainline receipt records `npm run verify` on a Windows host with Node.js 22.23.1. It is not a clean-VM or all-editions result. |
| Ubuntu/WSL2 and cross-platform CI | **Candidate-specific evidence** | Earlier candidate-source records include WSL2 checks and a Windows/Linux/macOS Node 20/22 CI matrix. Those records are not a rerun of the v3.0.0 tag. |
| Docker | v3.0.0 release notes list a GHCR image | Container startup or a help command does not demonstrate protection of host processes or other MCP servers. |
| Windows desktop installer | **Not listed for stable v3.0.0** | A previous candidate installer was unsigned and clean-VM validation was blocked. Do not present it as the current stable installation path. |

## Agent hosts and integration paths

| Host/path | Evidence status | Coverage boundary |
|---|---|---|
| Custom SDK host | **Verified for bounded release fixtures and recorded acceptance runs** | Only tools and callbacks explicitly registered by the trusted host and routed through the SDK/Gateway are covered. |
| Generic MCP stdio clients | **Protocol/fixture evidence; host-specific UI varies** | The server exposes its own tools. A successful handshake does not wrap tools from other servers. |
| Codex CLI / IDE / desktop | **v3.0.0 project-config helper; native end-to-end protection not verified** | The [Codex guide](GETTING_STARTED.md#codex-mcp-setup-v300-stable-release) registers this MCP server in a project config. Codex loads project config only for trusted projects; its shell, file, browser, and unrelated MCP tools remain outside Agent Canary's route. |
| Claude Code | **Candidate-specific, limited tool evidence; current-release native coverage not verified** | See the dated [host coverage record](docs/3.0/AGENT_COVERAGE_MATRIX.md) and the v3.0.0 release limitations. No all-tools or fail-closed claim is made. |
| Cursor | **Configuration/hook fixtures; native end-to-end coverage not verified** | Hook startup and failure behavior depend on the host and its configuration. |
| Cline | **MCP configuration fixture; native built-in tool coverage not verified** | MCP registration does not intercept unrelated built-in tools. |

## Read this before deployment

- Treat MCP_DECOY_INSTALLED, a host configuration entry, or a passing doctor result as setup evidence only.
- VERIFIED_PROTECTED must be tied to an exact host version, artifact/commit, callback, and observed effect.
- Agent Canary cannot undo an operation that already started. Some callback failures or host hook failures may be outside its control.
- Evidence and trial plans do not establish third-party certification, a security rating, or a user count.
