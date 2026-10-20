# M2 Security Router to Gateway Adapter Report

Date: 2026-10-21
Scope: M2-owned adapter seam for Issue #52
Status: `SYNTHETIC_ADAPTER_COMPATIBLE_IN_LEXICAL_MODE; STRICT_M5_MODE_FAILS_CLOSED; NO_PRODUCT_HOST_INTEGRATION; PRODUCTION_ALIAS_PROTECTION_NOT_VERIFIED`

## Contract compatibility

The current M5 `createSecurityToolRouter` contract accepts a fixed `tools` map
and an `executeRealTool(call, { signal })` callback. M2's
`createSecurityGatewayAdapter(gateway, fixedFileReads)` returns that map and
callback. The M2 `fixedFileReads` entries are relative path strings, not a
path-handle descriptor or capability passed to M5. For a registered tool ID
and exact allowlisted path, the callback constructs a `read_file` call whose
`args.path` is still a string, then forwards it with the signal to M1's
`gateway.agent.dispatch(call, signal)` API. M1 resolves that call through its
registered-file Gateway and owns the held-handle check internally.

This adapter is compatible with M5's lexical policy mode
(`verifyRealPaths:false`) for this exact fixed-read route. It is **not
compatible for successful reads with current strict `verifyRealPaths:true`**.
M5 PR #47 at exact head
`e3662e9ca7363504eea7dd5e3262352018519a56` denies generic file callbacks with
`path_execution_not_pinned` before `executeRealTool`; its focused test also
asserts zero callback invocations for a safe path. M2 currently provides no
M1-issued, M5-verifiable identity capability that would distinguish this
Gateway-backed callback from an arbitrary path-string callback. Strict mode
therefore fails closed, but the allowed read is unavailable.

The M2 adapter accepts only the registered tool ID, exactly one `path`
argument, a path in its fixed allowlist, and a valid signal. Unknown IDs,
aliases or other unregistered paths, extra arguments, malformed calls, and
invalid or aborted signals fail before M1 Gateway dispatch. It does not open
files itself or expose Gateway operator controls.

## Evidence

`check-security-gateway-adapter.mjs` checks the M2 adapter with the M2
branch-local compiled router in lexical mode and an M1 Gateway fixture. It
verifies that an allowed fixed read dispatches once through M1 with a plain
string path and an AbortSignal. The adapter's own allowlist rejects tested
sensitive/outside aliases and malformed or unregistered calls before M1
dispatch. Those alias results are M2 adapter rejections; this checker does not
establish M5 strict-mode behavior or that M5 denied the calls.

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
prove a production host hookup. It pins older M1/M2/M5 sources and is not
current PR #47 strict-mode composition evidence.

The current M5 PR #47 source at `e3662e9` contains the regression
`realpath mode fails closed for path-based file reads and keeps safe HTTPS GET
available`; it asserts `path_execution_not_pinned` and zero file callback
calls for `verifyRealPaths:true`. Exact-head CI run `39500126875` passed 9/9.
The M2-only `test-adapter-call-shape.mjs` run verifies that M2 emits the plain
path-string callback shape and denies unregistered inputs before its mock M1
dispatcher. Together these are source- and test-based compatibility evidence,
not a cross-branch runtime composition test.

Previously recorded baseline M2 checks (before this report/checker update):

- `npm run build`
- `node execution-isolation/gateway-adapter/check-security-gateway-adapter.mjs`

Current update verification on Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs` — 3/3 passed.
- `git diff --check` — passed.
- The M2 branch-local build/checker was not rerun: this worktree has no
  `node_modules` or `dist`. Dependencies were not installed.

## Host/build call-site audit

At M2 head `9db59ed8f2deae905edcb2179982f8bcb594167c`, a code-only search finds
the adapter definition and its M2 checker; no `src/`, CLI, server, or other
first-party product entry imports or calls it. Root `package.json` publishes
`dist/index.js`, exports only `./sdk`, and its package file allowlist contains
`dist` and documentation, not `execution-isolation/`. No supported in-repo
host/build entry consuming this adapter was found. This does not rule out an
external consumer; none is evidenced here.

Selected remote host/build review found no adapter reference in M3 PR #33 or
M7 PR #39. M9 PR #36 at head `de3799aae540f58173acec4ab3f7a1fe98593aa7` does
contain a call site in `test/m9-cross-module-composition.test.mjs`; the test
explicitly labels itself synthetic and says it does not prove production host
hookup. It checks strict-mode denial before the M2 callback and a
`verifyRealPaths:false` fixed-read positive control. Its pinned M2 is current
`9db59ed`, but its M1/M5 pins are older (`b1d7423` / `373e2c2`); the M5
`src/risk-policy.ts` blob differs from current PR #47 head `e3662e9`. This is
useful synthetic composition evidence, not a current-exact-head host/build
consumer.

## Limits and Issue #52 status

The tested M2-to-M1 route delegates an allowed read to M1's registered
Gateway held-handle path. This does not show that a first-party product host
calls the adapter. No such production host consumer was found in the M2 source
search. It also does not establish protected-open behavior in a production
host or prove that TOCTOU is eliminated.

M1 separately demonstrated a synthetic race in the generic
`verifyRealPaths`-then-host-callback route: the callback replaced the checked
path with a hard link and returned an external synthetic sentinel. That
result shows that path validation followed by a generic host callback is not
equivalent to protected-open. It is separate from the M2-to-M1 Gateway route
tested above and does not prove production exposure or that the product is
wired through that generic callback.

### Adapter plan and exact interface gap

Without a shared API change, the bounded synthetic route is M5 lexical mode
only for the M2 fixed-read callback, with M2 exact-path allowlisting and M1
Gateway as the sole file executor. This does not satisfy strict M5
`verifyRealPaths:true` and is not a product-host integration claim.

To retain strict mode while permitting a registered read, the owner-approved
contract needs an opaque, host-only M1-issued capability bound to a registered
file identity/held object, plus an M5 router input that verifies that
capability for that specific callback and revalidates it at execution. M2 can
then adapt fixed tool IDs to the capability without exposing an OS handle or
accepting model-supplied capability data. Current exact gaps: M5 callback
context carries only `{ signal }`; M2 forwards a path string; and M1's held
descriptor identity is not represented in a capability M5 can verify. M1 owns
Gateway capability semantics, M5 owns policy/router semantics, and M0 must
coordinate any public contract change. No M1/M5 code was changed here.

Accordingly, Issue #52 remains OPEN/P0. Production alias protection,
first-party host integration, protected-open evidence, and TOCTOU acceptance
remain `NOT_VERIFIED`; no AppContainer, native Shell, or installed-hook
protection is claimed here.
