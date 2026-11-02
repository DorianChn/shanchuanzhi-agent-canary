# Security Policy

## What agent-canary is

agent-canary is a **defensive** tripwire and containment SDK. It plants decoys
(fake MCP tools and fake secrets) in your development environment and records a
signal when an agent touches them. A signal can indicate compromise, but an
accidental integration call or copied fixture can also trigger it.

## Supported source and package scope

The `v3.0.0` GitHub Release is published but has no attached Release assets. The repository contains the corresponding `v3.0.0` source tag, and GitHub Packages distribution is a separate channel. Report security issues against the exact tag, commit, package, and host configuration involved. Preview and development builds may differ from a source tag or package. E4 independent reproduction remains NOT_VERIFIED; see [the evidence index](E4_EVIDENCE_INDEX.md).

## Hard guarantees

- **The represented decoy action is inert.** `canary_run_shell` does not execute
  commands, and `canary_transfer_funds` does not touch money. Each call does
  mint a local trace token and write an audit event; configured webhook or
  desktop notifications may also run. The decoy's represented operation is not
  performed.
- **Canary tokens are not credentials.** They are random strings with a `cnry_`
  prefix that unlock nothing anywhere. They exist purely to be detected in output.
- **No telemetry.** Events stay on your machine (JSONL file) unless you configure
  your own webhook URL. Desktop notifications are local.
- **Containment is opt-in at the integration boundary.** The V1.1 session
  circuit breaker can block only real callbacks routed through
  `guard.executeToolCall()` or checked with `guard.beforeToolCall()`. It does
  not magically intercept a tool that an agent or host calls directly.

## V1.1 containment boundary

`createAgentGuard()` creates isolated in-memory state for one agent session:
`SAFE → TRIPPED → QUARANTINED`. A decoy handled through `guard.runDecoy()` or a
canary token found by `guard.inspect()` changes that state synchronously before
JSONL/webhook/desktop alert delivery starts. In quarantine, every non-allowlisted
guarded call is blocked; the callback is not invoked.

## Vulnerabilities in scope

- A bypass or defect in a Guard, Router, SDK, or registered Gateway callback that causes a later guarded callback to run after quarantine.
- Exposure of real credentials by the product's own logging, configuration, backup, webhook, installer, or package paths.
- Unsafe configuration writes, restore behavior, or package/update behavior attributable to Agent Canary.
- A reproducible defect that changes a documented security decision or effect in a supported product path.

This makes the useful guarantee deliberately narrow: if an attacker first causes
the agent to touch a harmless decoy, later guarded actions can be contained. It
does **not** claim to prevent all prompt injection, nor can it stop a first real
dangerous call that bypasses the guard.

`guard.reset()` requires an acknowledgement string and is intentionally an SDK
host API. Do not expose reset as an MCP tool or a model-callable function; keep
it behind a human incident-response control plane. Audit metadata and decoy
arguments are redacted for common secret-bearing field names, but integrations
must never submit credentials or full tool payloads as event metadata.

## Current host and status boundary

Native Codex Shell remains **UNPROTECTED**. AppContainer evidence covers only tested child-process operations. Current Console status and separately authorized fixed-probe/configured-target reads do not imply general native-host, product-file or OS-atomic protection. M4 consumes status only. Missing/404 Security Center or E4 status is **UNKNOWN**; fixtures are not independent E4 passes. See [COMPATIBILITY.md](COMPATIBILITY.md) and [API contracts](docs/3.0/API_CONTRACTS.md).

## Intended use

Only deploy decoys on systems you own or are explicitly authorized to test.
Using canary tripwires to entrap or frame a third party is not an intended use.

## Reporting a vulnerability

Use a private [GitHub Security Advisory](https://github.com/DorianChn/shanchuanzhi-agent-canary/security/advisories/new) or contact the maintainer directly. Do not publish exploitable details. If private reporting is unavailable, request a private channel without disclosing the exploit.

Include the exact source/artifact hash, host/runtime, minimized synthetic reproduction, expected and observed effects, and redacted logs. Never send credentials or private project contents. A documented native-tool coverage gap alone does not prove a Guard bypass. There is no guaranteed response SLA or third-party certification; coordinate disclosure with the maintainer.
## Optional AI analysis boundary

AI adapters are advisory only and cannot reset Guard, change policy or execute tools.
Cloud requests require explicit minimized-input consent; redaction is best effort,
not a DLP guarantee. Keys stay in the host process. The local console binds only
loopback and checks Host, Origin and CSRF; do not reverse-proxy it publicly.
Report provider schema, evidence grounding, key disclosure, destination validation
and console authorization issues through the private disclosure process below.
Real cloud account behavior has not been verified by the local protocol fixtures.
