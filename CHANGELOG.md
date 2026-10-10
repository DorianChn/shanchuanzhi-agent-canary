# Changelog

## 2.1.0 - responsive monitoring and containment (2026-10-10)

- Abort in-flight guarded work synchronously on quarantine and pass the signal
  to router callbacks so hosts can cancel provider and tool requests.
- Add an opt-in risk deny policy that blocks configured tool-risk classes before
  host callbacks start, including while the session is still healthy.
- Reduce watch response latency with 100 ms event debounce, asynchronous
  directory traversal and streaming reads, and a configurable 2 second default
  fingerprint scan; full content scans retain the existing 30 second native
  watcher / 3 second fallback cadence, and unreadable paths are surfaced
  instead of treated as clean.
- Document cancellation, host-owned credential revocation, and the limits of
  defensive containment and filesystem monitoring.

## 2.0.0 — all features free and public

- Open the former paid evaluation, dashboard, SIEM export and SDK features
  under the existing MIT license; remove CLI activation gates and retire the
  payment/activation page.
- Add local Ollama evaluation without a cloud API key, request timeouts, HTTPS
  checks for remote OpenAI-compatible endpoints, and strict response validation.
- Keep evaluation runs isolated from the user's token registry, audit log and
  alert channels; distinguish provider failures from model compromise.
- Escape unknown dashboard event labels, sanitize exported events, neutralize
  spreadsheet formulas in CSV, and harden Markdown reports.
- Validate token counts and config shapes; batch honeypot token registration
  into one atomic registry write.
- Replace V1/V2 sales copy with one free-feature guide and document the actual
  SDK, scanner, evaluation, and data-handling boundaries.

## 1.2.7

- Surface credential-revocation adapter failures through the normal alert path
  while preserving the already fail-closed circuit state.
- Add a regression test proving that a new session for the same reviewed
  identity cannot race a synchronous decoy trip.

## 1.2.6

- Add an explicit host-owned shared identity state store so a reviewed
  principal's fresh session inherits quarantine instead of silently retrying
  with a new session handle.
- Keep identity keys out of audit events and fail closed if a shared store is
  unavailable.

## 1.2.5

- Add an optional secret-free `credentialRevoker` hook for hosts that use
  short-lived, session-scoped vault or broker references.
- Request revocation after synchronous quarantine and before alert delivery;
  adapter failure is audited but can never reopen the circuit breaker.

## 1.2.4

- Publish concise MCP server instructions: every `canary_*` tool is inert and
  containment applies only to guarded tool calls.
- Update public repository metadata and documentation links after the GitHub
  repository move.

## 1.2.3 — free guarded-router release

- Add `createGuardedToolRouter()` for non-MCP agent integrations. It routes
  decoys to the inert, synchronous containment path and all other calls through
  the same fail-closed guard.
- Extend the offline `self-test` to exercise the router's guarded real-tool
  dispatch path without touching user state.
- Update the English and Chinese SDK examples to use the router instead of
  hand-written decoy branching.
- Add a minimal, stdio-only Docker image for reproducible MCP registry
  introspection; it carries the free V1 server only and no payment or V2 data.
- Add claimed-server metadata for Glama and align public MCP metadata with
  the free V1.2.3 release.

## 1.2.2 — free V1 stability release

- Add `agent-canary self-test`, an offline check of the SAFE → QUARANTINED →
  BLOCKED path that does not touch user config, tokens, events, or network.
- Centralize event sanitization so JSONL logs and webhooks omit tool arguments
  and redact canary values and sensitive metadata.
- Add a packed-install smoke check to CI; the public package is verified to
  contain only the compiled V1 CLI, documentation, and license.
- Use `npm ci` in public V1 workflows for repeatable installs.
- Merge the current V1 stability fixes: atomic config/token writes, preserved
  MCP-config backups, webhook URL validation, and explicit alert-test delivery
  status.

## 1.2.1

- Keep the V1 SDK detection and containment primitives free to use without a
  V2 license.
- Improve `events` and `report` output for session trip, quarantine, blocked
  action, and human reset events.
- Update the public documentation to separate the free V1.x line from paid
  V2.x delivery.
