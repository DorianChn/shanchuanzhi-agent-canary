# Changelog

## Unreleased

- Add optional 2.0 host security routing, pre-execution review, bounded provenance, callback deadlines and protected MCP stdio hosting; AI cannot grant rights or undo containment.
- Add non-overwriting Agent configuration installation/restore, official hook protocol fixtures, private backups and cross-session hook state. Desktop-native protection remains unverified.
- Extend the Chinese console and preserve 168 autonomous local-model A/B/C/D/E trials, including adverse AI false refusals. Deliver separately verified free competition artifacts; no npm/Docker release.
- Add an opt-in local Ollama agent-tool evaluation harness with three comparison arms; all tools use synthetic, side-effect-free handlers.
- Add competition reproduction materials, maintainer roadmap, and structured GitHub issue/PR templates.
- No package release or API compatibility change is made by these documentation and evaluation additions.

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
## Unreleased — competition AI enhancement

- Optional advisory providers: OpenAI-compatible, native Ollama, Anthropic Messages and Gemini generateContent.
- Chinese loopback console, evidence preview/consent, origin-bound backend key injection, model lookup, sandbox demos and bounded JSON/Markdown/CSV reports.
- Strict schema/evidence-ID validation, pinned DNS, redirect refusal, cancellation/deadlines and bounded retries; no changes to Guard authority.
- Real local Qwen analysis and repeated A/B/C tool-selection pilot, including failed references and label disagreement.
- Additional AI security regression tests and reproducible PDF/material generation. Not an npm release; cloud account verification and V1/V2 distribution boundary remain open.
