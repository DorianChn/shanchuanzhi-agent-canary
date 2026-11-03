# M2 Security Router to Gateway Adapter Report

Date: 2026-10-21
Scope: M2-owned adapter seam for Issue #52
Status: `M2_M1_M5_OPAQUE_CAPABILITY_ADAPTER_PUBLIC_IN_PR37; M3_SOURCE_CONSUMER_PRESENT_BUT_UNPACKAGED; PRODUCT_HOST_INTEGRATION_NOT_VERIFIED; PRODUCTION_ALIAS_PROTECTION_NOT_VERIFIED`

Native Codex Shell boundary (Issue #45): **`UNPROTECTED / BLOCKED_NOT_VERIFIED`**.
Codex documents supported Windows command enforcement through MXC or the
legacy `elevated` / `unelevated` sandbox and filesystem permission profiles,
but this adapter does not inspect or prove the active Desktop session's
effective policy or native Shell call path. A repository Hook fixture is not
host-enforcement evidence.

> **Latest checkpoint:** The baseline notes below document earlier M2/M1/M5
> snapshots. The 2026-10-21 checkpoint at the end records the current local
> adapter candidate against M1 commit `7279336` and M5 commit `ed304e3`.

## Contract compatibility

At the original adapter baseline, M5 `createSecurityToolRouter` accepted a
fixed `tools` map and an `executeRealTool(call, { signal })` callback. M2's
`createSecurityGatewayAdapter(gateway, fixedFileReads)` returns that map and
callback. The M2 `fixedFileReads` entries are relative path strings, not a
path-handle descriptor or capability passed to M5. For a registered tool ID
and exact allowlisted path, the callback constructs a `read_file` call whose
`args.path` is still a string, then forwards it with the signal to M1's
`gateway.agent.dispatch(call, signal)` API. M1 resolves that call through its
registered-file Gateway and owns the held-handle check internally.

The callback remains path-only, so it is **not compatible for successful
reads with current strict `verifyRealPaths:true`**. M5 PR #47 at exact head
`99ab80770d8004ef85f13f2d5c0f48f934607603` denies generic file callbacks with
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

`check-security-gateway-adapter.mjs` uses `verifyRealPaths:false` only for an
M2 branch-local synthetic SDK fixture in lexical mode. It preserves the
positive fixed-read and pre-dispatch rejection assertions to exercise the M2
adapter-to-M1 Gateway seam in that checkout. This setting is not a product
policy and does not establish current PR #47 compatibility. Current PR #47
strict mode separately rejects a path-only callback as
`path_execution_not_pinned` before callback or approval; the fixture's alias
results are M2 adapter rejections, not M5 denials.

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

The current M5 PR #47 source at `99ab807` contains the regression
`realpath mode fails closed for path-based file reads and keeps safe HTTPS GET
available`; it asserts `path_execution_not_pinned` and zero file callback
calls for `verifyRealPaths:true`. Exact-head CI run `39558618457` passed 9/9.
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
`src/risk-policy.ts` blob differs from current PR #47 head `99ab807`. This is
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

The M2 checker uses `verifyRealPaths:false` only in its branch-local synthetic
lexical fixture to exercise the adapter-to-Gateway seam. It is not product
configuration or current PR #47 evidence. Current PR #47 strict mode still
denies the safe path-only callback before approval or execution; that denial
is separately evidenced by its source, focused test, and exact-head CI. The
M2 lexical fixture does not replace or weaken that strict evidence.

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

## 2026-10-21 M0 scope clarification

The M2 checker uses `verifyRealPaths:false` only for its branch-local
synthetic/lexical SDK fixture. Its positive read and alias/marker assertions
cover only the M2 adapter-to-M1 Gateway seam in that checkout, not product
policy or current M5 integration. At current PR #47 head
`99ab80770d8004ef85f13f2d5c0f48f934607603`, strict OBSERVE rejects generic
path callbacks as `path_execution_not_pinned` before callback and approval.
That remains the integration blocker and fail-closed behavior, independently
evidenced by the current M5 source, focused test, and exact-head CI. No M5 code
was copied or changed; the lexical fixture does not replace or weaken the
strict M5 evidence.

Local verification on Windows / Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs execution-isolation/gateway-adapter/test-security-gateway-host-adapter.mjs` — 7/7 passed. The real temporary junction case is in the M2 adapter test and rejects before its mock M1 dispatcher. The three host-composition cases use an explicit strict-router contract double; safe-path and alias requests are denied before callback, M1 dispatch, or approval. These are M2-local tests, not current PR #47 runtime evidence.
- `node execution-isolation/gateway-adapter/check-security-gateway-adapter.mjs` — unable to execute because this worktree has no `dist/sdk.js` (`ERR_MODULE_NOT_FOUND`). It is configured with `verifyRealPaths:false` only as an M2 branch-local synthetic/lexical fixture; its prior positive-read/alias/marker assertions remain in source. Dependencies/build artifacts were not installed or generated for this run.
- `npm run build` — unable to compile because `tsc` is not recognized; `node_modules` is absent. No dependencies were installed.
- `git diff --check` — passed.

## 2026-10-21 M0 #52 host-connection checkpoint

In the repository worktree for branch `feature/ac3-execution-isolation`, starting HEAD
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
effects. M5's strict router rejects generic path callbacks, so using
`verifyRealPaths:false` for a product/PR #47 execution path, relabeling the
read as another operation, or directly calling the adapter outside the router
would weaken/bypass the boundary. The M2 checker uses false only in an
isolated branch-local synthetic fixture. M2 will not take those paths for a
product host or reopen a user path.

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

## 2026-10-21 current M1 API and fail-closed denial checkpoint

The current public M1 PR #43 head observed during this checkpoint is
`c016431875a7783f579aa93cd135459ea954d560`. Its `src/runtime/gateway.ts`
defines `GatewayOptions.files` as trusted file descriptors and privately
stores each opened file's descriptor, `dev`, and `ino`. `stillBound` compares
the current named path and held descriptor before policy and again before file
effects; Gateway reads use the held descriptor. The returned public object is
`{agent, operator, evidence, dataflow, provenance, close}`. It does not expose
the held file identity as a capability M5 can validate.

M1 expiry is an operator-approval boundary: `operator.approve(requestId)`
sweeps expired pending requests and throws
`GATEWAY_APPROVAL_EXPIRED_OR_CONSUMED` when the request is missing, expired,
or already consumed. The M2 adapter accepts only `gateway.agent.dispatch`; it
does not receive or call the M1 operator capability. An M1 `REQUIRE_APPROVAL`
or denial therefore propagates as a rejection and cannot become an M2 allow.
M2 cannot independently inspect or complete the expired-approval path without
an owner-reviewed host/API composition.

The current M5 PR #47 head is
`99ab80770d8004ef85f13f2d5c0f48f934607603`. Its strict router/policy denies a
generic path-string callback with `path_execution_not_pinned` before the M2
callback or approval. M2 preserves `verifyRealPaths:true` in the host adapter;
the lexical `verifyRealPaths:false` setting remains confined to the separate
branch-local synthetic SDK fixture above.

## Current product host boundary and exact blockers

The source call chain is `src/ai/cli.ts::registerAICommands` to
`src/ai/console.ts::startAIConsole` to `src/runtime/demo.ts::createRuntimeDemo`.
That demo constructs M1 Gateway and dispatches a fixed `read_file` call
directly; a source search found no `src/` import or call of
`createSecurityGatewayAdapter` or `createSecurityGatewayHostAdapter`. M4 PR
#34 at `fbf20907c6accffc37246eddf04f8599060d99ea` describes
`src/ai/console.ts` as unchanged and its host as the existing demo Console,
not a production OBSERVE file-read consumer. M2 does not own that entrypoint.

The remaining blockers are exact and owner-bound:

1. **Owner contract wiring:** M1 commit `7279336` exposes a host-only
   registered-file capability, and M5 commit `ed304e3` resolves/verifies it
   and passes it in callback context. The M2 adapter candidate now wires these
   APIs locally; exact shared-branch composition and owner acceptance remain
   pending.
3. **Product host gap:** the repository's existing Console path is a demo and
   has no M2 adapter callsite. M4 owns `src/ai/console.ts`; the task has not
   identified a supported first-party OBSERVE read host that can be changed
   within M2 ownership. M0 must coordinate the selected host owner/path.
4. **Approval routing gap:** M2 exposes no approval bridge. It propagates
   M1 denials and does not call `operator.approve`; approval-required reads
   remain denied unless an owner-reviewed host flow handles them.

`test-adapter-call-shape.mjs` adds a branch-local seam regression for
quarantine, approval-required, and stale/expired M1-style rejection markers:
each rejection must propagate unchanged after one dispatch, with zero retry
and zero auto-approval. The stale/expired marker is a synthetic adapter-boundary
input, not an execution of M1's expiry path. Current M1 source handles actual
expiry at `operator.approve`, which M2 does not call. Existing tests continue
to reject unregistered tools/paths and the actual temporary junction alias
before the mock M1 dispatcher. These are focused M2 adapter tests only.

Local verification on Windows / Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs execution-isolation/gateway-adapter/test-security-gateway-host-adapter.mjs` — 8/8 passed; the added denial-propagation case checks quarantine, approval-required, and stale/expired rejection markers.
- `git diff --check` — passed with no whitespace errors.
- No product build, M1 runtime, or M4 host integration was run or claimed; the change is limited to the M2 `.mjs` seam test and this report.

## 2026-10-23 native Codex Shell boundary recheck

Supported native enforcement APIs exist: Codex's Windows sandbox can enforce
filesystem and network permissions for commands and child processes using
MXC, `elevated`, or `unelevated`; permission profiles support scoped filesystem
`deny` rules. This establishes platform capability, not the active policy for
any particular Desktop session. The documented MXC CLI compatibility probe
starts a separate CLI command and is not evidence about the Desktop native
Shell call path.

Codex `PreToolUse` can deny a matching supported Bash call when its callback
returns the documented denial shape. Callback errors, timeouts, or malformed
responses may fail without blocking the tool, so the candidate Hook alone is
not a fail-closed boundary. The M2 project fragment remains a candidate and
has not been installed/trusted or exercised through the actual Desktop native
Shell. No effective session policy, native callback decision, or sentinel
hash pair is available from this adapter task.

**Disposition:** native Codex Shell remains `UNPROTECTED / BLOCKED_NOT_VERIFIED`
under Issue #45. Acceptance requires a host owner to
expose the effective sandbox/permission profile, then run a unique synthetic
sentinel through the actual native Shell and observe an OS-level denial with
an unchanged hash. Keep the status unchanged if the active policy, host
decision, or callback cannot be observed. M2 did not change host/global
configuration, install/trust a hook, or attempt a native-shell sentinel.

Sources rechecked 2026-10-23: [Codex Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox), [Codex permissions](https://learn.chatgpt.com/docs/permissions), and [Codex Hooks](https://learn.chatgpt.com/docs/hooks).

Disposition: **M2 adapter fail-closed at its tested seam; product OBSERVE
read, strict positive control, M1/M5 identity binding, M4 host wiring, and
end-to-end expiry/quarantine integration remain `NOT_VERIFIED`.** Native
Codex Shell remains `UNPROTECTED`. No M1/M4/M5 paths or public contracts were
changed; no push was performed.

## 2026-10-21 Issue #52 deterministic replacement boundary (baseline)

This section records the pre-capability adapter and is superseded by the
capability checkpoint below.

At the M2-owned seam, `createSecurityGatewayAdapter` snapshots the approved
relative path as a string, checks it against the fixed allowlist, and calls
M1 with only `{name: "read_file", args: {path}}` plus the original signal.
There is no M1 identity capability in this payload. A new deterministic
synthetic regression triggers a same-name target replacement on the second
signal `aborted` read, after M2's path check and immediately before its
captured `agent.dispatch` call. Its synthetic M1 boundary models the reviewed
held `fd/dev/ino` comparison and rejects `resource_not_bound`; the replacement
remains unchanged and the allowed file callback count stays zero. The test
also asserts the dispatch payload carries a plain path string and no identity
capability. This proves the M2 interleaving and interface limit only; its M1
boundary is a contract double, not the M1 runtime or a product host.

The owner source checkpoints reviewed for this case are M1 PR #43 head
`5cb57c9b1b61884ab06d10b2f8a40426941ad0bc` and M5 PR #47 head
`99ab80770d8004ef85f13f2d5c0f48f934607603`. M1 stores held `fd/dev/ino`
privately and rechecks the named and held objects in its Gateway. Its public
`agent.dispatch(ToolCall, signal?)` accepts no identity capability. M5's
`verifyRealPaths:true` strict route denies path-only file callbacks with
`path_execution_not_pinned` before calling the adapter. M2 must preserve that
denial until both owners review a shared contract.

Required owner contract before a positive strict read can be enabled:

1. M1 defines a host-only, opaque capability bound to one constructor-registered
   file and its held object, with explicit lifetime/revocation rules; M1 still
   owns the final identity revalidation before file effects. The capability
   must not be model-controlled call data or an exposed raw file descriptor.
2. M5 defines how that capability is supplied and checked for the exact
   registered callback, and denies missing, mismatched, stale, or replaced
   identities before callback or approval. M5 must not accept path strings as
   a substitute in strict mode.
3. M2 can adapt only the owner-reviewed capability shape. M0 coordinates the
   shared API and the M4-owned product host callsite; this test does not create
   or claim that callsite.

Focused verification after this change on Windows / Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs` — 6/6 passed, including the deterministic post-validation replacement denial.
- `git diff --check` — passed.
- No M1/M5 source or public API was changed; no product host or real M1 runtime was exercised. The issue remains `NOT_VERIFIED` pending owner contract review and product-host integration.

## 2026-10-21 M1/M5 opaque-capability adapter checkpoint

M2's local adapter candidate was updated against the exact owner commits M1
`7279336307fc7aacd46119405858d4fd91499757` and M5
`ed304e399ec237a47e03830e5013695ddcc10dd6`. Source inspection confirmed the
M1 host-only methods `bindFileReadCapability`, `verifyFileReadCapability`,
and `readFileWithCapability`, plus M5's
`fileReadCapability.resolve/verify` provider and callback context
`{signal, fileReadCapability}`.

At adapter construction, M2 requests an M1 opaque capability for each exact
fixed M5 tool/path pair. It passes the M1-backed resolver/verifier provider to
M5 and reserves that option against caller override. Before forwarding the
callback, M2 rechecks the exact tool, path, signal, capability identity, and
M1 verification result. It then invokes M1's capability-bound read method
with the same capability object. There is no path-only fallback; missing,
substituted, stale, revoked, and replaced capabilities fail closed. The M2
adapter remains read-only and exposes no write or delete mapping.

Focused tests now cover unchanged capability forwarding, missing/substituted/
stale denial, an actual temporary symlink/junction allowlist denial, and a
synthetic held-identity replacement denied before the M5 callback or M1 read.
The host-composition tests use M1/M5 contract doubles; they are not a live
execution of the owner implementations. No first-party product host currently
imports this adapter, and no runtime integration, protected-open guarantee,
TOCTOU elimination, or installed native-hook protection is claimed.

Local verification on Windows / Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-adapter-call-shape.mjs execution-isolation/gateway-adapter/test-security-gateway-host-adapter.mjs` — 11/11 passed.
- `npm run build` — could not run because `tsc` is unavailable in this worktree (`node_modules` is absent); no dependencies were installed.
- `git diff --check` — passed.

Disposition: **M2 adapter contract implemented locally; Issue #52 remains
OPEN/P0 pending current M1/M5 owner acceptance, product host wiring, and
end-to-end runtime evidence.** No push or GitHub update was performed.

## 2026-10-22 packed strict-only gateway entry

M5 rejected the earlier proposal to export `security-gateway-adapter.mjs`
directly (Issue #52 comment `6320309631`): that module also exports the
lower-level `createSecurityGatewayAdapter`, which can bypass the M5 router.
M1 review found that shipping `security-gateway-adapter.mjs` in `files` still
allowed consumers to load it directly by filesystem path, regardless of the
package `exports` map. M2 now bundles the adapter implementation into
`gateway-adapter.mjs`, converts `createSecurityGatewayAdapter` to a private
module function, and leaves only `createSecurityGatewayHostAdapter` exported.
`bundle-gateway-adapter.mjs --check` detects drift from the M2 implementation
source. The original source module is not included in the package allowlist.

M5 and M6 accepted the public subpath/API shape, and M7 gave conditional
acceptance before the M1 direct-file review. That earlier packaging shape still
included the raw implementation dependency, so this revision removes it from
the package. The revised manifest delta in the M2 branch is:

- `exports["./gateway-adapter"]` →
  `./execution-isolation/gateway-adapter/gateway-adapter.mjs`
- Add only `execution-isolation/gateway-adapter/gateway-adapter.mjs` to `files`.
- Do not add a package export for `security-gateway-adapter.mjs`.

Local verification on Windows / Node.js v22.23.1:

- `node --test execution-isolation/gateway-adapter/test-gateway-adapter-facade.mjs execution-isolation/gateway-adapter/test-packed-gateway-adapter.mjs execution-isolation/gateway-adapter/test-adapter-call-shape.mjs execution-isolation/gateway-adapter/test-security-gateway-host-adapter.mjs` — 14/14 passed. The packed artifact smoke test creates and extracts a real tarball, confirms that only the public M2 entry is included, imports the public subpath, and verifies that the low-level package path is not exported and its direct file path is absent.
- `npm pack --dry-run --json` — 5 package entries; the only file under `execution-isolation/gateway-adapter/` is `gateway-adapter.mjs`.
- `git diff --check` — passed.
- `npm run pack:check` was not run because `scripts/check-package.mjs` remains the known M7-owned blocker. M2 did not edit that checker; no checker result is claimed.

The facade still requires the trusted host to pass the actual M5 router
factory. The archive test proves package contents and module reachability, not a
first-party host callsite or successful strict real-file read. The one-file
packaging revision needs updated exact-diff owner readback; no M1/M5/M6/M7
implementation paths or security policies were changed.

## 2026-10-23 Issue #52 M2 owner check — current public contracts and consumer

**Decision:** M2's public adapter is already capability-bound to M1's current
Gateway contract and requires strict M5 `OBSERVE` composition. No M2 runtime or
test change is needed. A first-party M3 source route is prepared to call it,
but the current M3-only package does not expose the required M2/M5 public
subpaths; its default route therefore returns `UNKNOWN` before probe-file or
Gateway creation. Issue #52 remains **OPEN / P0 / NOT_VERIFIED**.

### Exact refs

- M1 PR #43: `27c417627b0e89e9db999025b65b25e12f0f1d7f` (OPEN / Draft),
  Gateway source blob `2be0a1a0ab6a324f0426cf71308bb62d1170957c`.
- M2 PR #37: `58c2e46fef70021fbfd70e1caa7ba44e7281ee43` (OPEN / Draft),
  exact-head CI run `39896034781` passed all nine jobs.
- M5 PR #47: `f05edaeeabff2e261bf563fb0782d7b9bc500645` (OPEN / Draft).
- M3 PR #33: `8104ab30eed5245eb61eeebb1075b915e8557b46` (OPEN / Draft).

The M2 delta from the previously reviewed public head
`1c050abace5af6e09b7b934730f2361b78f9d938` changes only
`execution-isolation/reports/ISOLATION_TEST_RESULTS.md` and
`execution-isolation/windows/Test-AppContainerPrototype.ps1`. Its package,
public facade, adapter implementation, and host-adapter test blobs are
unchanged at `0e0fceffdc7e07a67b60173c46c6bc8ec29e7d3b`,
`7a05ed64300c6345222dff13a4e929a250646acc`,
`5c1d461a4af0c840a7c2a93d0173ec1f6ad87ac8`, and
`3b3819aeba755ce8a39040936b82e2e5e47e65db`, respectively. This addendum
supersedes earlier report paragraphs that describe the pre-capability,
path-string-only adapter.

### M1/M2/M5 contract result

At the exact M1 source, the Gateway exposes host-only
`bindFileReadCapability`, `verifyFileReadCapability`, and
`readFileWithCapability` methods. M1 binds an opaque object to one safe,
constructor-registered resource and the exact tool/operation/path argument;
verification rechecks that held identity. The current M5 router accepts a
trusted `fileReadCapability.resolve/verify` provider and carries only the
verified capability in execution context.

M2's `createSecurityGatewayHostAdapter` exports as the sole public facade
function. It requires `mode: "OBSERVE"` and `verifyRealPaths: true`, reserves
the tool map, execution callback, and capability provider, and accepts only
construction-time fixed tool/path bindings. For each binding it requests the
M1 capability, supplies the M1-backed resolver/verifier to M5, preflights
before router dispatch, verifies the same capability again in the M2 callback,
and calls M1 `readFileWithCapability`. It has no path-only read fallback.
The current M2 implementation therefore consumes the M1 identity contract
when given the real M1 Gateway and trusted M5 router. M2's host-composition
tests still use contract doubles; they are not a live product composition.

### Product consumer boundary

M3 PR #33 contains a first-party source-level fixed temporary-probe route:
`src/ai/console.ts::runConsoleProtectedRead` lazily imports the intended M1 SDK,
M5 policy-router, and M2 gateway-adapter public subpaths, creates one marker
file, and dispatches the fixed `protected_read` tool through the M2 host adapter.
`src/codex-connection-mcp.ts::createProtectedHostAdapter` supplies the same
strict OBSERVE composition. This is a fixed temporary probe, not an
arbitrary user-file or native Codex-tool path.

The current M3 package manifest exports only `./sdk`; it does not expose the
M2 `./gateway-adapter` or M5 `./policy-router` subpaths. M3's own route test
checks those exports and asserts that the ordinary `ai console` route returns
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` before creating a temporary directory,
Gateway, router, or callback when either is missing. Its successful route
fixture injects a test facade/router, so it is not evidence that the current
packaged product consumes the M2/M1/M5 implementations. The M2 source adapter
exists and has a source-level caller, but a runnable, exact-owner product
consumer is not yet established.

### Owners and acceptance still required

- **M3** owns composing the exact public M1 SDK, M2 facade, and M5 router
  subpaths into its actual package/runtime entrypoint. The default route must
  execute through those public owner implementations without injected test
  doubles; missing subpaths must remain `UNKNOWN` with no filesystem or
  Gateway side effect.
- **M4/M3** must identify the shipped first-party consumer that is meant to
  protect reads. A fixed temporary marker cannot establish protection for
  user-selected files or native host tools.
- The exact composed route needs a safe fixed-read positive control plus
  sensitive/alias/junction and same-path replacement negatives. Denials must
  occur before the M5 execution callback and M1 read evidence, leave approval
  count at zero, and preserve fixture bytes. These tests must use the exact
  owner implementations and clearly label the fixture scope.
- Keep Issue #52 **OPEN / P0 / NOT_VERIFIED** until that product route and its
  alias/path-replacement acceptance evidence exist. M1 held-identity checks
  are not an OS-atomic path/operation transaction; this M2 adapter makes no
  change-and-revert or native Shell protection claim.

No source, test, policy, package, or other-module files were changed for this
owner check. No tests were run; the cited M2 exact-head CI is the existing
verification for the unchanged public adapter blobs.

## 2026-10-23 M3 packed owner-consumer review

**M2 owner disposition: ACCEPT_WITH_CONDITIONS** for the adapter contract and
call shape exercised by M3's packed-consumer test. This is a bounded M2 review;
it does not accept M1 alias/held-file guarantees, M5 policy behavior, or
protection of real user files/native host operations.

### Exact source and public export

- M3 PR #33 exact head: `e3e7584cd186728b1756df3542af9aff13937a36`.
- New test blob: `test/packaged-owner-consumer.test.mjs`,
  `a01e1f75d360eed45a3789bb27722c6dd17ecf30`.
- M2 PR #37 exact public head at review: `c43e7ba33e29d9097ac68b444137b65aeaa92acc`.
- M2 `package.json` blob: `0e0fceffdc7e07a67b60173c46c6bc8ec29e7d3b`;
  it maps `./gateway-adapter` to the single bundled facade file.
- M2 facade blob:
  `execution-isolation/gateway-adapter/gateway-adapter.mjs`,
  `7a05ed64300c6345222dff13a4e929a250646acc`.

The test is not injecting an M2 return value or a fake M2 facade. Its
`prepareComposedPackage` reads each supplied owner package manifest, copies the
manifest-declared M2 export target byte-for-byte, merges the public export maps
into a temporary combined package, then runs `npm pack` and extracts it.
Assertions resolve the packed `./gateway-adapter` entry and compare its bytes
to the selected M2 checkout. The packed M3 CLI then handles the protected-read
request through its default package-self-reference imports. M3's
`createProtectedHostAdapter` invokes
`createSecurityGatewayHostAdapter` from that resolved M2 facade, and the
positive-control result requires a completed `host.dispatch` plus one M5
callback. This exercises the M2 public export and actual adapter call shape;
the combined manifest/package is a synthetic composition assembled for the
test, not a published integrated artifact.

The two negative cases remove `./gateway-adapter` (or the M5 export) from the
composed package's export map while retaining the copied owner file. Node's
public-subpath import consequently fails, M3 returns
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`, and the temporary probe directory
remains absent. That establishes fail-closed behavior for a missing public
export, not for a missing M2 file or every packaging failure mode.

### Verification and conditions

On Windows / Node.js `v22.23.1`, I ran the test directly with
`M1_ROOT`, `M2_PACKED_ROOT`, `M3_ROOT`, and `M5_ROOT` set to the current owner
worktrees. All three cases passed (positive composed consumer, missing M2
export, missing M5 export). The M2 path was the exact PR #37 head above. No
repository files were changed by this run.

GitHub run `39901051277` for M3 exact head `e3e7584...` has since completed
successfully. It is not evidence that this new test ran: the test is not listed
in M3's `npm test` script and is not invoked by the CI workflow's commands.
The test also accepts owner-root paths from environment variables without
asserting expected commit IDs; the exact M2 pin in this review comes from the
explicit local `M2_PACKED_ROOT` selection and the compared facade blob.
Accordingly, acceptance is conditional on pinning the M2 owner root and
explicitly invoking this test in CI before treating it as automated exact-head
coverage. Issue #52 remains **OPEN / P0 / NOT_VERIFIED** pending product-scope
and owner evidence outside this review.
