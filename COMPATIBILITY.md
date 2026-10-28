# Compatibility and feature status

This matrix separates repository CI coverage, host configuration fixtures, and observed runtime behavior. A configuration fixture is not proof that a desktop host loaded a tool or protects its native tools.

## Release status and feature maturity

| Area | Status | Notes |
|---|---|---|
| Agent Canary CLI, MCP stdio server, SDK Gateway, decoys/canary checks, offline self-test, doctor, project MCP integration helper, and local risk-policy console | **v3.0.0 GitHub Release published** | The release is tied to the `v3.0.0` source snapshot. Recorded source checks are tied to that exact source; protection remains limited to registered Agent Canary callbacks. |
| V1.2.7 | **Historical version/tag** | This matrix does not claim a currently published GitHub Release for this version. Follow its tag-specific package metadata and documentation when reproducing old results. |
| v3.0.0-competition | **Published competition Release with community/candidate assets** | This is a separate source and artifact set; publication does not establish equivalence to the v3.0.0 package or independent E4. |
| v3.0.0-competition-candidate.4 | **Published prerelease with candidate assets** | Candidate-specific installer and evidence do not establish a stable v3.0.0 install path or independent E4. |
| `feature/agent-canary-3.0` and other moving branches | **Development** | Pin a full commit SHA. Branch contents and package metadata can change and are not release artifacts. |
| Independent security benefit from AI/risk-policy analysis or adaptive decoys | **Experimental / not verified** | The local console is present in v3.0.0, but independent AI benefit and adaptive-versus-static gain are not established. |
| Candidate desktop installer, native-host hooks, and Auto E4 | **Candidate-specific / partial** | These are not general guarantees of the v3.0.0 source snapshot. The earlier installer is unsigned and clean-VM validation remains blocked. See [security limitations](docs/3.0/SECURITY_LIMITATIONS.md) and the [E4 evidence index](E4_EVIDENCE_INDEX.md). |
| First-party Security Center routes | **PARTIAL / product acceptance NOT_VERIFIED** | Current Console GET status and separately authorized fixed-probe/configured-target reads are present; M4 remains a status consumer. Missing/invalid backend status, including 404, is UNKNOWN. These routes do not establish general native-host or OS-atomic protection; see [API contracts](docs/3.0/API_CONTRACTS.md) and [issue #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52). |
| Codex built-in Shell | **UNPROTECTED** | Agent Canary does not intercept Codex's native Shell. MCP registration does not change that. |
| Claude/Cursor/Cline built-in tools | **Not verified as general coverage** | An MCP server or hook configuration does not imply global interception. |

## Runtime and operating systems

| Surface | Declared/configured coverage | What that means |
|---|---|---|
| Node.js | >=20 in the v3.0.0 package manifest | Declared runtime minimum; the source verification receipt records Windows Node.js 22.23.1. This does not imply every Node release has been tested. |
| Windows source build | **Verified for a bounded v3.0.0 source run** | The immutable mainline receipt records `npm run verify` on a Windows host with Node.js 22.23.1. It is not a clean-VM or all-editions result. |
| Ubuntu/WSL2 and cross-platform CI | **Candidate-specific evidence** | Earlier candidate-source records include WSL2 checks and a Windows/Linux/macOS Node 20/22 CI matrix. Those records are not a rerun of the v3.0.0 tag. |
| Docker | **Current GHCR package/tag availability, local pull, and runtime NOT_VERIFIED** | Do not assume `3.0.0` or `latest` is currently pullable. This matrix does not establish container startup or protection of host processes or other MCP servers. |
| Windows desktop installer | **Candidate/community installer assets published; no stable v3.0.0 install path claimed** | Setup assets are attached to the competition/candidate releases. Their presence does not establish a supported stable install or clean-VM acceptance; see the [E4 evidence index](E4_EVIDENCE_INDEX.md). |

## Agent hosts and integration paths

| Host/path | Evidence status | Coverage boundary |
|---|---|---|
| Custom SDK host | **Verified for bounded fixtures and recorded acceptance runs** | Only tools and callbacks explicitly registered by the trusted host and routed through the SDK/Gateway are covered. |
| Generic MCP stdio clients | **Protocol/fixture evidence; host-specific UI varies** | The server exposes its own tools. A successful handshake does not wrap tools from other servers. |
| Codex CLI / IDE / desktop | **v3.0.0 project-config helper; native end-to-end protection not verified** | The [Codex guide](GETTING_STARTED.md#codex-mcp-setup-v300-tag) registers this MCP server in a project config. Codex loads project config only for trusted projects; its shell, file, browser, and unrelated MCP tools remain outside Agent Canary's route. |
| Claude Code | **Candidate-specific, limited tool evidence; native coverage not verified** | See the dated [host coverage record](docs/3.0/AGENT_COVERAGE_MATRIX.md) and the v3.0.0 source-snapshot limitations. No all-tools or fail-closed claim is made. |
| Cursor | **Configuration/hook fixtures; native end-to-end coverage not verified** | Hook startup and failure behavior depend on the host and its configuration. |
| Cline | **MCP configuration fixture; native built-in tool coverage not verified** | MCP registration does not intercept unrelated built-in tools. |

## Read this before deployment

- Treat MCP_DECOY_INSTALLED, a host configuration entry, or a passing doctor result as setup evidence only.
- VERIFIED_PROTECTED must be tied to an exact host version, artifact/commit, callback, and observed effect.
- Agent Canary cannot undo an operation that already started. Some callback failures or host hook failures may be outside its control.
- Evidence and trial plans do not establish third-party certification, a security rating, or a user count.

## Current Hook build contract: M8 ACCEPT #99

M8 **ACCEPTS** the M7-owned packaging/windows/build-contract.mjs contract at M7 feature commit 37034a971d00477a8aa3d57f34773c125939ec92. Its Git blob is cd39752ecbbd88849a365dea210e242ba90ca786, identical in M8 pre-merge HEAD 60cfe8d976a42d0f635d4be93ca24c00e81246d5 and incoming feature baseline e4732d9745bb4fbbebf6896a35b4657ad82abd73.

- M7 remains implementation owner. Default source: packaging/windows/claude-native-hook.mjs. Explicitly allowlisted M8 source adapter: security-lab/claude-native-hook.mjs. Arbitrary source paths are rejected.
- Both paths must resolve at recorded source HEAD to M1 canonical Git blob b7ed4aba70a597f4f63a05decc6de1b32f67372e, canonical LF SHA-256 ff0bfef67e92c9ee387f78dd617408b63db6a9646566e16ca0f8e02c842c511d. Checkout CRLF normalization must not admit altered bytes, symlinks or malformed endings. Packaged bytes come from the committed Git blob and must hash-match after writing.
- M8 consumes this interface without modifying M7 implementation. Hook output preserves allow/deny/ask, projects safe fixed reasons, and logs timestamp/event/decision only. The current canonical sanitizer supersedes older distinct-adapter source statements for this candidate; historical results stay bound to their original blob.
- Preserve source-commit, tamper-rejection, provenance and installer lifecycle assertions. M1 owns canonical Hook semantics/tests; M6 owns E4/lifecycle-test dispositions. M9 consumes only the reviewed merge commit SHA after M0 commits and the required current-candidate checks pass.

The M0-provided Issue #99 snapshot (2026-10-24) records M9 head d6a4bfbd8f30b714e464691f9998779d16ec9387, run 40061290284: 21/21 composition and 2/2 offline checks on Ubuntu and Windows. These are prior exact-source results, not validation of this uncommitted resolution. Installer lifecycle was skipped; clean-VM and independent product E4 remain NOT_VERIFIED. [Issue #99](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/99) awaits the PR #40 owner record and required acceptance gates; this local document does not post that record.
