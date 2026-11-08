# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The published surface is the static GitHub Pages site in docs/. Keep the entry as HTML, CSS, and browser JavaScript so the existing Pages URL can serve it without a runtime or secret-bearing build step. This stack choice is inferred from the existing site and requested deployment target.

## Users

Inferred from the explicit competition brief: reviewers and security practitioners who need to understand Agent Canary's control flow and inspect a safe demonstration. Their exact evaluation rubric is not confirmed here.

## Product Purpose

Agent Canary is an open-source MCP and SDK security toolkit for AI agents. It supplies inert decoy tools, canary signals, a guarded execution gateway, local self-tests, and an optional advisory policy console. The host must explicitly register the callbacks it wants protected.

## Positioning

The project records and contains risky calls routed through its registered integration path; model advice does not grant permissions or override the host's deterministic policy.

## Operating Context

The public front end is hosted at https://dorianchn.github.io/shanchuanzhi-agent-canary/ and remains static. The existing backend binds to 127.0.0.1. It serves the same workbench at `/workbench/` and exposes read-only same-origin state APIs there after the console process starts. The public page links to that local route; the link targets the viewer's own computer and does not create a remote backend. A separate public HTTPS API has not been configured.

## Capabilities and Constraints

- The source contains MCP decoys, canary events, Guard/Gateway policy decisions, evidence records, a local console, and best-effort sensitive-text redaction.
- Coverage applies only to calls routed through explicitly registered SDK/Gateway callbacks; installation does not provide global protection for native tools in other clients.
- The public Pages route has no live data source. On the local loopback route only, the workbench reads `/api/state`, `/api/runtime3`, and `/api/policy/state` with the backend's per-process CSRF token and same-origin checks; it does not submit tool actions or policy changes.
- API event data is limited to the backend's documented response scope (up to 100 recent records). The temporary runtime and virtual policy sandbox must remain labeled as local demonstrations, not production Agent telemetry.
- All rows, timestamps, traces, and values authored for the static display must be clearly labeled synthetic demonstration data.
- Do not claim measured security scores, certifications, real incidents, or successful attacks without source evidence.
- Never put API keys, operator codes, or private user data in the frontend.

## Brand Commitments

The user supplied five dashboard screenshots as the binding visual reference: warm ivory paper, fine dark rules, editorial serif display type, compact sans-serif labels, monospaced technical values, and restrained rust-orange warning accents. Adapt this visual language to Agent Canary's verified concepts and labels.

## Evidence on Hand

- Current source and project documentation on the GitHub main branch.
- Existing public Pages URL, checked as reachable during this task.
- No live backend data, real-time security score, certification record, or verified contest-run telemetry is available to this static page.

## Product Principles

- Distinguish recorded evidence from a visual demonstration.
- Label every synthetic incident and metric at the point of use.
- Explain the host-registration boundary of protection.
- Keep credentials and local-only APIs out of the public frontend.
