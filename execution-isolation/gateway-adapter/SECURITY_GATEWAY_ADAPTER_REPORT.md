# M2 Security Router to Gateway Adapter Report

Date: 2026-10-15
Scope: M2-owned adapter seam for Issue #52
Status: `SYNTHETIC_ADAPTER_COMPATIBLE; NO_PRODUCT_HOST_INTEGRATION; PRODUCTION_ALIAS_PROTECTION_NOT_VERIFIED`

## Contract compatibility

The current M5 `createSecurityToolRouter` contract accepts a fixed `tools` map
and an `executeRealTool(call, { signal })` callback. The M2
`createSecurityGatewayAdapter(gateway, fixedFileReads)` returns that map and
callback without changing either public API. For a registered tool ID and an
exact allowlisted relative path, the callback constructs a new `read_file`
call and forwards it, with the signal, to M1's public
`gateway.agent.dispatch(call, signal)` API. M1's Gateway is constructed with
the corresponding fixed file registration. This is a compatible synthetic
adapter seam; no shared-interface change is needed.

The M2 adapter accepts only the registered tool ID, exactly one `path`
argument, a path in its fixed allowlist, and a valid signal. Unknown IDs,
aliases or other unregistered paths, extra arguments, malformed calls, and
invalid or aborted signals fail before M1 Gateway dispatch. It does not open
files itself or expose Gateway operator controls.

## Evidence

`check-security-gateway-adapter.mjs` checks the M2 adapter with the M2
branch-local compiled router and an M1 Gateway fixture. It verifies that an
allowed file read goes through M1 Gateway once, while the adapter's own
allowlist rejects tested sensitive/outside aliases and malformed or
unregistered calls before M1 dispatch. Those alias results are M2 adapter
rejections; this checker alone does not establish that M5 denied the calls.

The M9 synthetic composition test
`exact M1/M2/M5 sources enforce OBSERVE hard-deny before adapter dispatch`
separately exercises exact M1 `f14aab781c62db60ac241d2114f543f6cac223ae`,
M2 PR #37 adapter `76066cbb750ec714ce8691bc0f30c8171186f079`, and M5
`b6a40b49f132decba97d269ff942d868fcef928f`. It verifies that the allowed
fixture read reaches the M2 adapter and M1 Gateway, and that explicit DENY
decisions for direct sensitive paths, workspace aliases, and an outside
junction alias in OBSERVE raise M5 `PolicyBlockedError` before the M2 callback
or M1 Gateway dispatch. The focused case passed 1/1. This test uses synthetic
filesystem fixtures and its own scope comment explicitly says it does not
prove a production host hookup.

Focused M2 checks passed:

- `npm run build`
- `node execution-isolation/gateway-adapter/check-security-gateway-adapter.mjs`

## Limits and Issue #52 status

The tested M2-to-M1 route delegates an allowed read to M1's registered
Gateway held-fd path. This does not show that a first-party product host calls
the adapter. No such production host consumer was found in the M2 source
search. It also does not establish protected-open behavior in a production
host or prove that TOCTOU is eliminated.

M1 separately demonstrated a synthetic race in the generic
`verifyRealPaths`-then-host-callback route: the callback replaced the checked
path with a hard link and returned an external synthetic sentinel. That
result shows that path validation followed by a generic host callback is not
equivalent to protected-open. It is separate from the M2-to-M1 Gateway route
tested above and does not prove production exposure or that the product is
wired through that generic callback.

Accordingly, Issue #52 remains open. Production alias protection and
first-party host integration remain `NOT_VERIFIED`; no AppContainer, native
Shell, or installed-hook protection is claimed here.
