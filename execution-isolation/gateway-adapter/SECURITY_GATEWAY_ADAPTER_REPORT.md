# M2 Security Router to Gateway Adapter Report

Date: 2026-10-21
Scope: M2-owned adapter seam for Issue #52
Status: `M2_FAIL_CLOSED_HOST_COMPOSITION_HELPER_ADDED; STRICT_M5_MODE_FAILS_CLOSED; NO_PRODUCT_HOST_INTEGRATION; PRODUCTION_ALIAS_PROTECTION_NOT_VERIFIED`

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

The callback remains path-only, so it is **not compatible for successful
reads with current strict `verifyRealPaths:true`**. M5 PR #47 at exact head
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

`check-security-gateway-adapter.mjs` is an M2-checkout synthetic SDK fixture.
It keeps `verifyRealPaths:true`, checks the fixed read through the compiled
router and an M1 Gateway fixture, and preserves the existing positive-read and
pre-dispatch rejection assertions. It does not establish compatibility with
current PR #47: that exact-head strict router rejects a path-only callback as
`path_execution_not_pinned` before the positive callback can run. Its alias
results are M2 adapter rejections; they do not establish that current M5
strict policy denied those calls.

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

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs` — 4/4 passed.
- `git diff --check` — passed.
- The added fixture creates an actual temporary directory junction on Windows (directory symlink on other platforms) to a synthetic sibling file, verifies it resolves to the target, then asserts the M2 fixed-path allowlist rejects the alias with zero mock M1 dispatches. This proves only the M2 adapter's exact allowlist rejection; it does not test M5's strict router or a product host callback.
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

PR #24's `feature/agent-canary-3.0` source makes the registration boundary
explicit in `src/agent-integrations.ts:31`: `planAgentIntegration()` returns
`coverage: 'MCP server callbacks only; client-native tools OUT_OF_SCOPE'`.
PR #24's own acceptance record also says native Codex/Claude/Cursor/Cline
global coverage is `NOT VERIFIED`. This is MCP server configuration, not a
native OBSERVE file-read callsite and not a consumer of the M2 adapter.

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

The older synthetic M2/M9 lexical-mode positive control used
`verifyRealPaths:false`; it is not an acceptable security setting or current
PR #47 evidence, and it cannot replace the strict-mode check. The M2 checker
now keeps `verifyRealPaths:true`. Current PR #47 still denies the safe
path-only callback before approval or execution.

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

## 2026-10-21 M0 strict-setting review correction

The M2 checker is configured with `verifyRealPaths:true`; all prior positive-
read and denial assertions remain present. Its intended label is an
M2-checkout synthetic SDK fixture, not compatibility evidence for current M5
PR #47. At PR #47 head `e3662e9ca7363504eea7dd5e3262352018519a56`, strict
OBSERVE rejects generic path callbacks as `path_execution_not_pinned` before
the callback and approval. That is an integration blocker and fail-closed
status. No M5 code was copied or changed, and no non-strict setting substitutes
for this strict checker.

Local verification after the correction, on Windows / Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs execution-isolation/gateway-adapter/test-security-gateway-host-adapter.mjs` — 7/7 passed. The real temporary junction case is in the M2 adapter test and rejects before its mock M1 dispatcher. The three host-composition cases use an explicit strict-router contract double; safe-path and alias requests are denied before callback, M1 dispatch, or approval. These are M2-local tests, not current PR #47 runtime evidence.
- `node execution-isolation/gateway-adapter/check-security-gateway-adapter.mjs` — unable to execute because this worktree has no `dist/sdk.js` (`ERR_MODULE_NOT_FOUND`). The checker remains configured with `verifyRealPaths:true`; its prior positive-read assertions were not skipped or weakened. Dependencies/build artifacts were not installed or generated for this run.
- `npm run build` — unable to compile because `tsc` is not recognized; `node_modules` is absent. No dependencies were installed.
- `git diff --check` — passed.

## 2026-10-21 M0 #52 host-connection checkpoint

In the existing M2 worktree, branch `feature/ac3-execution-isolation`, starting HEAD
`6ad4303540499341b59a97db3b4ec4562fe5e29e`, the first-party host consumer was
verified in source: `src/ai/cli.ts` registers `ai console`,
`src/ai/console.ts` calls `createRuntimeDemo`, and `src/runtime/demo.ts` creates
an M1 Gateway with registered temporary files and dispatches its fixed `read`
action through `runtime.agent.dispatch({name:"read_file", args:{path:"public.txt"}})`.
This is the console's first-party demo host; it consumes M1 Gateway but does
not import or call `createSecurityGatewayAdapter`.

The M0 ownership map assigns `src/runtime/gateway.ts` to M1/M7,
`src/ai/console.ts` to M3/M4, and `package.json` to M3/M5/M6/M7; M2 owns
`execution-isolation/gateway-adapter/*`. The package file allowlist excludes
`execution-isolation/`, so importing the current M2 `.mjs` adapter from the
published TypeScript host would leave a missing runtime module unless a
shared package/build owner approves a packaging change. The current M2-owned
scope contains no product-host callsite that can consume the adapter.

The adapter forwards a plain path string to M1 `agent.dispatch`; it does not
pass an M1-held-object identity capability into the strict router. The supplied
M1 contract requires `DENY` until the callback is bound to the exact registered
file identity and that same held object is revalidated immediately before
effects. M1's strict router rejects generic path callbacks, so using
`verifyRealPaths:false`, relabeling the read as another operation, or directly
calling the adapter outside the router would weaken/bypass the boundary. M2
will not take those paths or reopen a user path.

Required owner review: M1 must decide whether its existing Gateway capability
can be represented to the strict router for this exact callback or define an
opaque host-only capability bound to the held object, including alias and
replacement denial before side effects. M0 must coordinate any shared
contract, host-callsite, or package change; M5 review is needed if its policy
router contract is touched. No M1/M5 files or public interfaces were changed.

Focused evidence on this HEAD: the following test passed 3/3.

```sh
node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs
```

It verifies M2's exact fixed-path allowlist, unchanged signal forwarding, and
pre-dispatch rejection using a mock dispatcher; it is not adapter-to-host
integration evidence. The Gateway integration checker could not run in this
worktree because `dist/sdk.js` and `node_modules` are absent; dependencies
were not installed. First-party host consumption of the M2 adapter,
protected-open at the product host, and real-host alias/replacement behavior
remain `NOT_VERIFIED`; native Codex Shell remains `UNPROTECTED`.

## 2026-10-21 M2 strict host-composition adapter

`createSecurityGatewayHostAdapter` is an M2-owned composition helper for a
trusted host that supplies the M5 `createSecurityToolRouter` factory, M1
Gateway, and fixed read map. It requires the host to explicitly select
`mode: "OBSERVE"` and `verifyRealPaths: true`, reserves `tools` and
`executeRealTool` for the M2 adapter, and returns only `dispatch` plus the
read-only pending-approval view. It never selects lexical mode or calls M1
outside the policy router.

The current M5 strict router still denies both a safe fixed path and an alias
before invoking the path-only callback. The focused M2 host-composition test
uses a strict-router contract double to assert the wiring and zero callbacks,
zero M1 dispatches, and zero approvals. The existing adapter call-shape test
retains the fixed-path positive control and actual temporary symlink/junction
rejection before its mock M1 dispatcher. These are adapter/contract tests,
not a callsite in a supported product host and not actual M1/M5 cross-branch
runtime evidence.

The host-composition adapter cannot make the fixed M1 `GatewayOptions.files`
identity visible to M5: M1 retains the held fd/dev/ino privately, while the
M2 callback and current M5 callback context expose only a path and `{ signal }`.
An M1-issued opaque capability bound to one held registered file, and M5
strict-router validation/revalidation of that capability, remain owner API
work. M3/M4 must identify and wire the selected product OBSERVE consumer, and
M0 must coordinate those owner reviews. No shared path or public contract was
changed. Until then a strict safe file read correctly fails closed with
`path_execution_not_pinned`.

Local focused verification for this M2 helper:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs execution-isolation/gateway-adapter/test-security-gateway-host-adapter.mjs` — 7/7 passed on Node v22.23.1 / Windows. The existing case creates a real temporary junction and verifies pre-dispatch alias rejection. New host-composition cases require explicit OBSERVE strict mode, reject legacy/non-OBSERVE or callback/tool overrides, and verify safe-path and alias requests stop before the policy callback, M1 dispatch, or approval. The strict-router implementation in this test is a contract double; current PR #47 exact-head tests/CI remain the evidence for M5 behavior.
- `git diff --check` — passed.
- This is local M2 evidence. It does not establish that a supported product entry imports the helper, that a safe file read succeeds through current M5 strict mode, or that M1's private held identity is visible to M5. The M2 changes remain unpushed and have no exact-head hosted CI.
