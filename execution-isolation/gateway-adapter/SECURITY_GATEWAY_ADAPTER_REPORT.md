# M2 Security Router to Gateway Adapter Report

Date: 2026-10-15
Scope: synthetic M2 adapter composition for Issue #52 investigation
Status: `SYNTHETIC_ADAPTER_VERIFIED; NO_PRODUCT_HOST_INTEGRATION`

## Implemented boundary

`security-gateway-adapter.mjs` exposes a frozen read-only tool map from a
trusted host's exact tool IDs and exact relative file paths. Its callback
accepts only `{path}` for a registered ID and forwards a new fixed
`read_file` call through `gateway.agent.dispatch(call, signal)`. The M1 Gateway
therefore performs the final constructor-time resource lookup, held-handle
identity check, Guard checks, and evidence recording. Unknown tool IDs,
unlisted paths, additional arguments, malformed calls, and invalid signals
fail before Gateway dispatch. The adapter does not expose the Gateway
operator interface or invoke a file callback directly.

The adapter deliberately does not reimplement M5 alias classification or
OBSERVE policy. Its exact fixed path table rejects the tested workspace
sensitive alias and external directory junction alias before M1 Gateway
dispatch. This is an adapter allowlist result; it does not demonstrate that
the M2 branch's current OBSERVE router or the current M5 PR #47 head rejects
those aliases. The branch-local router implementation was the one exercised
by the test.

## Verification

`check-security-gateway-adapter.mjs` composes the M2 branch's compiled
`createSecurityToolRouter({mode: 'OBSERVE', verifyRealPaths: true})`, this
adapter, and an actual `createTrustedExecutionGateway` with one registered
public file handle. It verifies:

- the registered file is read through M1 Gateway exactly once;
- the sensitive workspace alias, external junction alias, arbitrary path,
  unknown tool ID, and extra argument are rejected before Gateway dispatch;
- those denials create no Gateway evidence, no M1 or M5 pending approvals,
  and no file byte or SHA-256 changes;
- only the allowed read produces the expected two Gateway evidence events.

Commands run:

- `node --check execution-isolation/gateway-adapter/security-gateway-adapter.mjs` — passed
- `node --check execution-isolation/gateway-adapter/check-security-gateway-adapter.mjs` — passed
- `npm run build` — passed
- `node execution-isolation/gateway-adapter/check-security-gateway-adapter.mjs` — passed

## Limits and status

This is a synthetic adapter and composition regression only. No first-party
product host or real M2 isolated worker currently calls this adapter. It does
not prove production host protection, AppContainer isolation, installed-hook
behavior, or the current M5 PR #47 implementation. Issue #52 must remain open;
production alias protection is `NOT_VERIFIED` until the real host path is
integrated and verified against the current M5 policy contract.
