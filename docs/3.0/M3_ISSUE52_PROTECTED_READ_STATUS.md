# M3 Issue #52 protected-read route status

**Product status: `NOT_VERIFIED`**

**M3 source under review:** `feature/ac3-agent-onboarding` at `fcaa24f8479c7072da0a51e96100ddfb3b2774c8` plus the unpushed M3-owned change in this worktree.

**Scope:** the first-party onboarding connection-check MCP route only.

## First-party inputs and supported composition seam

The M3 entry point has trusted host-owned inputs: it takes its default workspace
root from `process.cwd()`, registers only the fixed `agent-canary-public.txt`
probe when that file exists, creates the M3 Guard and Gateway, and owns the
registered `public_read` / `hook_probe` callbacks. It does not derive these
values from MCP request arguments or model output.

`createConnectionCheckRuntime()` now factors that real first-party construction
path into a testable host factory. M9 can inject an exact-source M1 Gateway
factory, M2 public facade loader, and M5 router factory at construction time.
The fixed M3 file map and callback set remain fixed. `runConnectionCheckMcp()`
uses the same factory with defaults, so the runtime behavior and default
package self-reference remain unchanged. This is a trusted-host test/composition
seam; it is not a new request-facing capability API.

The current M3 worktree still creates the M3-branch Gateway by default, and that
Gateway does not expose M1's held-file methods. Its default protected route must
therefore return `UNKNOWN` with `M1_HELD_FILE_CAPABILITY_UNAVAILABLE`; it must
not fall back to a path-string read. The new focused test checks that the actual
M3 runtime factory forwards only its fixed file binding, same Guard/root, and
`OBSERVE` / `verifyRealPaths: true` options. Its structural doubles are wiring
evidence only and do not verify a product read.

## Owner contracts inspected

| Owner | Exact candidate | Contract relevant to M3 |
| --- | --- | --- |
| M1 | PR #43, `c67b15f76973a2333ce523dd58d5b7439ab40702` | Exposes host-only bind, verify, and read methods for opaque exact tool/path capabilities; reads from the held descriptor and checks identity again after reading. This narrows the race window but does not claim an OS-wide atomic transaction. |
| M2 | PR #37, `099ad64e4a09330920cbd40847adec3fe631e91e` | Exposes `./gateway-adapter`; `createSecurityGatewayHostAdapter` reserves the router callbacks/capability provider, preflights exact fixed bindings, and requires `OBSERVE` plus `verifyRealPaths: true`. |
| M5 | PR #47, `e6bb5cfaf5e3a55497ab300da3bf14bbb4b4b3d2` | Requires a valid M1 capability for protected reads in this composition and preserves Guard/policy denials under OBSERVE. |
| M3 | PR #33, `fcaa24f8479c7072da0a51e96100ddfb3b2774c8` plus this local change | Owns the fixed probe, Guard/Gateway construction, public M2 loading, and exact-argument precheck; now exposes a trusted-host factory so M9 can exercise this callsite with exact owner sources. |

## Required M0 / M9 integration contract delta

1. The exact-source composition test should call M3's
   `createConnectionCheckRuntime()` rather than constructing a separate M1
   Gateway and invoking `createProtectedHostAdapter()` directly.
2. Supply `createGateway` from exact M1 source, `loadM2Facade` from the exact
   public `./gateway-adapter` export, and `createSecurityToolRouter` from exact
   M5 source. These are trusted construction-time inputs; never take them from
   an MCP call or model response.
3. Assert the M3 fixed file binding reaches that route, then verify the positive
   read, alias denial, and same-path replacement denial with callback counts,
   evidence deltas, and fixture hashes. Preserve `UNKNOWN` if any adapter or
   capability is absent.
4. Separately run the default M3 package/runtime path to prove package
   self-resolution and default wiring. An injected seam alone does not prove
   this default runtime path, a native host tool, or protection of user files.
5. Keep Issue #52 open and product status `NOT_VERIFIED` until exact integrated
   evidence passes. Do not describe M1's pre/post held-file checks as an
   OS-atomic path-and-operation transaction.

The existing M3 acceptance test remains fail-closed on this worktree's default
Gateway. The M3 runtime factory's trusted input test is wiring evidence only.
The later exact-source M9 composition and current Console consumer boundary are
recorded below; neither establishes a real product-host protected read.

## M3/M4 consumer recheck — 2026-10-22 21:32 UTC

### Exact M3 runtime result

M9 PR #36 at `8ebb206e124e76501441690e3da9249472244503` ran the M3
`createConnectionCheckRuntime()` with exact M1
`c67b15f76973a2333ce523dd58d5b7439ab40702`, M2
`099ad64e4a09330920cbd40847adec3fe631e91e`, M3
`aa6f1a5f0ee410b3c883fbe0c60e89020273966a`, and M5
`c9003234913a0ccccca56fe2a36fb1ce3dacb2de` sources. Hosted composition run
`39855082035` passed on Ubuntu and Windows; CI run `39855081975` and wrapper run
`39855081991` also passed.

The composition test uses M3's fixed `agent-canary-public.txt` binding and
`dispatchProtectedRead()` entry point. A positive read reaches the M1 held-file
Gateway through M2 and M5 and returns only `{status, reason, markerMatched}`
from the M3 helper. Alias and same-path replacement attempts are denied before
another M5 callback or M1 read event; the fixture hashes remain unchanged.
M9's exact M5 regressions also confirm sensitive path aliases remain hard-denied
in `OBSERVE`, without optional review, approval, or execution callbacks. This is
exact-source synthetic fixture evidence, not a live Desktop Console read or an
OS-atomic identity guarantee.

The M3 onboarding MCP caller returns only its fixed probe marker after an
`ALLOW`; it does not relay arbitrary file bytes. A focused M3 regression now
also asserts that `dispatchProtectedRead()` drops synthetic file contents from
its result and returns `DENY` or `UNKNOWN` without path fallback when the host
denies or lacks the M1/M2 composition.

### Exact remaining consumer blocker

M3's `/api/security-center` route does not call
`createConnectionCheckRuntime()` or `dispatchProtectedRead()`. Its optional
`securityCenterStatusProvider` is not wired by the `startAIConsole()` CLI
callsite. When supplied, the M2 provider reports binding and `OBSERVE` policy
status only; it does not perform the positive held-file read. The route's
normalizer returns an allowlisted status snapshot and drops arbitrary path,
argument, token, and file-content fields. Without a provider the route returns
`UNKNOWN`.

M4's current `adaptSecuritySnapshot()` still hardcodes
`firstPartyObserveReadStatus: NOT_VERIFIED`; its own test states that a live
Gateway binding or demo is not a Console consumer callsite. Thus the remaining
Issue #52 blocker is specifically the M4/first-party Console consumer path:
there is no supported Desktop Console callsite that invokes the fixed M3 probe
through the exact M1/M2/M5 composition and consumes only its sanitized status.
The default M3 branch also lacks the separate M1 held-read methods and M2
package facade, so it correctly remains `UNKNOWN`; no path-string fallback was
added. A polled status GET was not changed to execute file I/O, and no M4 file
was modified.

Keep Issue #52 OPEN / P0 / `NOT_VERIFIED` for the Desktop Console consumer and
product-host identity boundary. Do not promote M9 synthetic composition to
product protection or OS-atomic TOCTOU acceptance.

## M3 Console API export audit — 2026-10-23

The M3-owned Console consumer was rechecked against the exact current local
module worktrees before adding an action route. M3 is at
`42559bcbd6223c035014d982d1be3ed420d39e3f`; M1 is at
`c67b15f76973a2333ce523dd58d5b7439ab40702`, M2 at
`92a9562a44ad395ec33d5afd74c394d7f0863c85`, and M5 at
`c9003234913a0ccccca56fe2a36fb1ce3dacb2de`.

The required runtime composition is not available through supported
dependencies from this M3 Console build:

- M1 returns the held-file capability methods from
  `createTrustedExecutionGateway`, but that factory lives in internal
  `src/runtime/gateway.ts`; the M1 package export map does not expose it.
- M2's candidate package exposes `./gateway-adapter`, but the current M3
  package export map contains only `./sdk`. The M3 Console CLI does not load
  this M2 adapter.
- M5 exports `./policy` for policy management, while
  `createSecurityToolRouter` remains in internal `src/security-router.ts` and
  is not a package subpath available to the Console.
- M3's `createConnectionCheckRuntime()` accepts trusted exact-source factories
  for M9 composition tests. This does not make those internal source imports a
  product Console dependency, and no M3 Console startup callsite supplies them.

Therefore no POST action route was added. A route that merely returned
`UNKNOWN`, used private source imports, or substituted the M3 path-string
Gateway would either be a dead product API or bypass the owner boundaries. The
proposed M3-owned request/response and security semantics are recorded in
[ONBOARDING_API_CONTRACT.md](M3/ONBOARDING_API_CONTRACT.md) as blocked and not
active. The existing GET remains status-only. M4 must continue reporting
`NOT_VERIFIED`; a future positive Console result may be labeled only as a
“fixed synthetic probe.”

### Required owner and integration work

1. M1 must provide a supported product-runtime way for the M3 host to construct
   the Gateway with the held-file capability methods, without making opaque
   capabilities model-visible.
2. M2's published `./gateway-adapter` must be included in the composed M3
   product package/runtime.
3. M5 must provide a supported product-runtime route to the strict
   `createSecurityToolRouter` that preserves hard `DENY` under `OBSERVE`.
4. M3 may then wire those supported dependencies into the Console at trusted
   startup and implement the POST contract. The request body must stay exactly
   `{}`; operator and CSRF checks precede any temp file/Gateway work; only the
   fixed M3-owned marker may return `ALLOW`; there is never direct `fs.readFile`
   fallback.
5. M9 must test exact source composition, request boundary, explicit deny,
   unknown/error behavior, alias/symlink/junction rejection, same-path
   replacement rejection, zero forbidden callbacks/evidence, and safe
   temp-object cleanup. These are synthetic probe acceptance cases, not proof
   of arbitrary product-host protection.

Issue #52 remains `OPEN / P0 / NOT_VERIFIED` until supported owner dependencies
are wired and the real product-host configuration plus attacker-controlled
alias acceptance passes. No M1/M2/M4/M5 source or shared M0 contract was changed.

## M3 Console fixed-probe action — 2026-10-23 follow-up

The Console now owns `POST /api/security-center/protected-read`. It accepts an
exact empty JSON object, requires the existing CSRF check and a configured
operator code in `x-canary-operator-code`, and exposes only the fixed scope,
status, reason enum, and marker-match boolean. It creates a per-request
temporary directory only after both checks, registers only
`agent-canary-public.txt`, composes M1/M2/M5 through injected trusted factories
supplied by a construction-time host bootstrap, closes the Gateway before
cleanup, and removes only the identity-checked file and directory it created.
The M3 Console never imports its own `./sdk` as an M1/M5 substitute. Missing owner exports,
unclassified dispatch failures, an unexpected marker, or failed cleanup remain
`UNKNOWN`; only explicit M1/M5 `DENY` is surfaced as `DENY`. There is no path
argument, direct Console file-read fallback, or user-workspace path.

### Exact owner candidate surfaces rechecked

| Owner | Current local PR candidate | Public surface verified |
| --- | --- | --- |
| M1 | PR #43, `6886d6eef3beb972bc8f4c797584b0f522483870` | `createTrustedExecutionGateway` and the held-file capability methods are exposed through `./sdk`. |
| M2 | PR #37, `67428139e53c3f63a1101b4f94e84b291cbb1196` | `createSecurityGatewayHostAdapter` is exposed through `./gateway-adapter`; its fixed file map routes to M5 and M1. |
| M5 | owner commit `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`; PR #47 GitHub head was still `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` at audit | Adds the public `./policy-router` transparent re-export for canonical `createSecurityToolRouter` and its types; strict real-path mode still requires a valid M1 capability and preserves hard `DENY` under `OBSERVE`. |
| M3 | PR #33, baseline `43d765ff1ed0986b90fe6123633e8bcd24e64e1d` plus this M3 patch | Trusted construction-time dependency bootstrap, fixed route, request authorization, sanitized output, and identity-checked cleanup are M3-owned. |

The M3 package manifest at its current source base exposes only `./sdk`, so
`./gateway-adapter` is not available in the default current M3 build. More
fundamentally, the M3 self-package SDK is not accepted as proof of the exact M1
held-capability Gateway or M5 strict router. With no trusted composed bootstrap,
the Console returns `UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` before creating the
probe directory, Gateway, or router callback. An injected bootstrap that cannot
preflight M2 also stops before those effects. The injected M3 tests verify
request and response boundaries and cleanup using structural test doubles;
they do not count as M1/M2/M5 product security evidence.

M9 must supply exact M1, M2, M3, and M5 owner references to the trusted
construction-time bootstrap and run the composed Console route. Preserve the
positive, explicit-deny, unknown,
wrong-marker, alias, same-path replacement, zero-callback, unchanged-fixture,
and cleanup controls. This Console probe covers only a synthetic temporary
file. Issue #52 remains `OPEN / P0 / NOT_VERIFIED`; no arbitrary product-host
file protection, native tool coverage, or OS-atomic identity guarantee is
claimed. No M1/M2/M4/M5 source or shared M0 contract was changed.

## Normal CLI bootstrap audit — 2026-10-23

M3 exact head `c7b7772c9d62e138e1cc6deed7c43104eaccafa6` was checked with a
clean worktree. The ordinary `ai console` CLI callsite in `src/ai/cli.ts`
passes only `port`, `AGENT_CANARY_AI_KEY`, and `AGENT_CANARY_OPERATOR_CODE` to
`startAIConsole`; it has no external bootstrap provider. M3's own package
export map exposes `./sdk` only. Its current Gateway source does not contain
M1's opaque held-file bind/verify/read methods, so loading M3's own SDK cannot
stand in for the current M1 owner implementation.

The latest verified public PR heads include M1 PR #43
`6886d6eef3beb972bc8f4c797584b0f522483870` with the held-file Gateway from
`./sdk`, and M2 PR #37
`67428139e53c3f63a1101b4f94e84b291cbb1196` with
`createSecurityGatewayHostAdapter` from `./gateway-adapter`. M5 owner commit
`8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` adds `./policy-router` as a
transparent re-export of the canonical router and types. GitHub still reported
M5 PR #47 at `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed`; the additive export
must not be treated as a public PR surface until that head advances. The
M3-only package does not yet export either M5 `./policy-router` or M2's
`./gateway-adapter` subpath.

M3 now uses a trusted, lazy package self-reference to the public M1 `./sdk`,
M5 `./policy-router`, and M2 `./gateway-adapter` subpaths as the default
Console bootstrap. Runtime loading occurs only after the protected route has
passed CSRF, operator, and exact-empty-body checks. It does not import a
private M5 router implementation, fall back to the legacy M3 `./sdk` router,
or provide a local router shim. At this exact M3 head neither
`@dorianchn/agent-canary/policy-router` nor
`@dorianchn/agent-canary/gateway-adapter` is exported; the route returns
sanitized `UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` before creating its temporary
probe, Gateway, policy router, or callback. The M3 regression confirms the
legacy M3 SDK router exists but is not used as fallback, and verifies no probe
directory is left behind. M3's injected structural test doubles remain wiring
tests, not owner-runtime evidence.

M5 owner commit `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d` adds the M5 public
`./policy-router` alias as a transparent re-export of the canonical router and
types. At this audit, GitHub PR #47 still exposed head
`12b2499a1f7b8525f3bf2d7659249c1bd8e881ed`; the additive export has not yet
been confirmed at the public PR head. M1/M2/M5 positive protected-read
evidence must wait for M9's exact-source harness/report using the confirmed
owner heads, including M5 `8d1b832` after it is available to that harness.

M9 must run the ordinary no-injection Console route against the exact M1/M2/M5
composition and retain the fixed-marker positive control, hard-deny/unknown
controls, sensitive and alias rejection, same-path replacement, zero forbidden
callback/read-evidence assertions, unchanged fixture hashes, and safe cleanup.
That result may establish only the fixed synthetic temporary probe. M4's
Desktop UI still has no confirmed caller for this POST route; product files,
native host tools, and UI protection remain `NOT_VERIFIED`, and Issue #52 stays
`OPEN / P0` until the required integrated acceptance passes.

## M3 default OBSERVE callsite follow-up — 2026-10-24

This section supersedes earlier statements above that the M3 branch lacked the
public M2/M5 package subpaths. After fast-forwarding the existing M3 branch to
public base `e771c06f72d8a03fb7945037a3facbc2d0ed8a6e`, the integrated package
exports `./sdk`, `./gateway-adapter`, and `./policy-router`. M3 did not edit the
shared package manifest or any M1, M2, or M5 implementation file.

The default first-party `POST /api/security-center/protected-read` Console
callsite now exercises its physical directory-alias denial control as well as
the existing fixed safe-read positive and same-path replacement controls. It
creates only the fixed temporary `agent-canary-public.txt`, obtains the M1
Gateway factory through public `./sdk`, calls M2's public
`createSecurityGatewayHostAdapter`, and supplies M5's public
`createSecurityToolRouter` with `mode: OBSERVE` and `verifyRealPaths: true`.
There is no generic pathname callback or private-module fallback.

The safe registered-file read returns only the fixed status marker. A Windows
directory junction (a directory symlink on other platforms) aliases the same
registered file under an outside-workspace path spelling; M2 rejects that
fixed-map mismatch before another M5 callback or M1 evidence event. A
same-path inode replacement is also denied before either count advances. The
alias entry is removed only after its link identity and canonical target match
the objects created by this probe; failed cleanup returns `UNKNOWN`.

At code commit `02be066e3f0fc82fd53b3664a19c15e30a80e45f`, the M3-owned source
and integration regression were committed on the existing branch. Follow-up
commit `a49c0f796e4ab487de86089245cc1ea123a92b86` adds a no-injection test of
the default Console route through the public owner exports. Local Windows
verification passed:

- `npm run build`
- `node --import tsx --test test/codex-connection-check.test.ts test/security-center-route-m3.test.ts` — 25/25 passed.
- `git diff --check`

These results cover a synthetic temporary file only. They do not verify a
user/product file, the M4 Desktop UI, native Codex/Claude callbacks, installer
effectiveness, or an OS-atomic path-and-operation transaction. M9 exact-source
composition review remains required; Issue #52 remains `OPEN / P0 / NOT_VERIFIED`.
The M1 exact review of the shared Hook sanitizer synchronization is still
pending, and this follow-up does not touch either M1 Hook path.

## M4 status-consumer handoff and exact M2 provider blocker — 2026-10-24

This is the current M3 follow-up for M4's report-only audit in Issue #52
(report commit `7922309da0f6ea60c02b9bd17e6872aa98d753e`). M4 is a read-only
consumer of `GET /api/security-center`; it does not call the protected-read
POST and does not own a Gateway capability. M3 owns the normal Console probe
and sanitized status route.

M3's fixed probe binds only its process-owned temporary marker to M1 and
requests the public M2 host adapter and public M5 router in strict OBSERVE
mode. M3 now requires the M2 capability provider method
`readFileWithCapability(capability, call, signal?)`, forwards the opaque
capability/call/signal unchanged, and never routes a strict file read through
the generic path-only callback. If this method is missing, the internal M3
adapter records `M2_CAPABILITY_PROVIDER_UNAVAILABLE` and stops before callback
or M1 read evidence. The Console POST keeps its existing fixed public reason
enum and returns `UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`; it does not expose the
internal reason. The GET status route stays read-only and CSRF protected. It
normalizes a trusted provider snapshot, allows only the exact
`M2_FIXED_FILE_READS_ONLY` coverage label, and defaults to UNKNOWN when the
ordinary CLI has no provider. GET does not trigger the fixed probe.

Exact blocker: the checked-out M3 package exports `./gateway-adapter`, but its
current `execution-isolation/gateway-adapter/gateway-adapter.mjs` provider has
only `resolve` and `verify`; it does not have
`readFileWithCapability`. M2 PR #91 at
`92dd42b900b10ce0294e9e3faa7e175d728228b3` is OPEN/Draft; M1's scoped ACCEPT is
recorded in Issue #91 comment `6374194267`. Its reviewed patch adds that exact
M5-facing method. It is not present in the checked-out package bytes. M5 PR #94
at `cca42cd1762f995e92454d55ffa5e63951e39144` is also OPEN/Draft. M3 must wait
for the owner package surfaces to be integrated and
then rerun exact-source composition; this change does not modify M1, M2, M4,
M5, or `package.json`.

M3's M2 contract test uses a clearly synthetic M2 facade implementing the
reviewed provider shape, a real M1 Gateway, and M5's exported router. It checks
the safe registered read, side-effect-free snapshot, physical alias rejection,
and path-replacement rejection before additional provider callbacks, generic
callbacks, or M1 read evidence. This fixture verifies only M3 forwarding and
denial behavior; it does not claim current M2 bytes are integrated. The default
package regression expects UNKNOWN for the checked-out missing provider.

Local Windows verification for this revision: `npm run build` PASS;
`node --import tsx --test test/codex-connection-check.test.ts test/security-center-route-m3.test.ts`
PASS (27/27); `git diff --check` PASS.

Issue #52 remains OPEN / P0 / NOT_VERIFIED. M9 must run the exact integrated
M1/M2/M3/M5 references on Ubuntu and Windows. These M3 tests do not prove a
real product-host callback, native tool protection, installer effectiveness,
M4 UI protection, or OS-atomic TOCTOU safety.

### Exact-head CI cleanup-path correction — 2026-10-24

PR #90 exact-head run `40027402261` failed on macOS Node 22 in the new M3
synthetic M2-contract test's cleanup hook: macOS resolved the temporary
`/var/...` path to `/private/var/...`, while the test compared the original
string. Ubuntu Node 20/22, Docker, sponsor smoke, and ownership-contract
evidence passed; remaining matrix jobs were cancelled after that failure. The
failure did not involve a Host decision or file-read callback.

M3 test-only commit `c462b29c65c47f385ccaabcb69b8bb8b0895085b` checks
directory identity by device/inode and containment using canonical paths. Its
local Windows build, focused 26/26 tests, and diff check passed at the time.
The commit is included in public PR #90 head
`606395eae6173384711afa1aafc5f71614b26ab9`; exact-head main workflow run
`40028179680` passed all 9 jobs, including macOS, Ubuntu, and Windows Node
20/22. A separate ownership-contract-evidence run `40028487559` failed because
the PR body lacked the required `Test-Evidence:` metadata line; this is a PR
body evidence-format failure, not a source test failure. The current focused
M3 run is 27/27 with `npm run build` and `git diff --check` passing. Issue #52
stays OPEN / P0 / NOT_VERIFIED pending owner package integration and M9's
exact-source Ubuntu/Windows composition.

### Exact-head M3 CI — 2026-10-24

PR #90 exact head `98a034fa2066cec18f833440cc51275c389681c6` completed
workflow run `40031961789` with 9/9 jobs passing: Docker, package smoke,
sponsor smoke, and macOS/Ubuntu/Windows Node 20/22. The separate
ownership-contract-evidence run `40031991694` also passed. These are M3 PR
checks only; M9's exact integrated M1/M2/M3/M5 Ubuntu and Windows composition
remains pending. Keep Issue #52 OPEN / P0 / NOT_VERIFIED.

### M9 ordinary-CLI composition blocker — 2026-10-24

M9 run `40031324000` (M9 `b72d54eb7daeef4765ffe854edf9733ee3ffd865`) pins M3
`606395eae6173384711afa1aafc5f71614b26ab9`, M2 PR #91
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5 PR #94
`cca42cd1762f995e92454d55ffa5e63951e39144`. Its ordinary-CLI protected-read
subtest fails on Ubuntu and Windows: expected the fixed probe to PASS, but the
route returns `UNKNOWN / M2_CAPABILITY_PROVIDER_UNAVAILABLE`. The direct M3
adapter + packed exact-M2 + M5 composition and alias-denial subtests pass.

The ordinary CLI loads the public self-reference
`@dorianchn/agent-canary/gateway-adapter` from the M3 package tree. M9 verifies
that M3 and M2 use the same relative export path, but the target blobs differ:
M3's target is `7a05ed64300c6345222dff13a4e929a250646acc`; M2 PR #91's file is
`0d7053114e87177669ec2c3b416028e05affb62f` and contains the required held-read
provider. The M3 package therefore resolves its stale adapter copy and fails
closed. M3 must not copy M2-owned source, load a private M2 path, or use the
generic callback as fallback. The M9/package-composition owner must place the
exact M2 public-export bytes at the M3 package target, verify blob identity,
and rerun the ordinary CLI test on both hosts.

This M9 run is not exact-current-M3 evidence: it pins M3 `606395e`, while PR #90
is now `98a034f`. It also has a separate M8 assertion failure; M9 wrapper run
`40031323821` fails the dependency audit for existing Hono, ip-address, and
zod advisories. Issue #52 remains OPEN / P0 / NOT_VERIFIED until the package
composition blocker is resolved and M9 exact-source Ubuntu/Windows composition
passes. No M1/M2/M4/M5 file was changed.

### Current-M3 M9 rerun — 2026-10-24

M9 PR #36 is now at `ebd7c7e2fdc049a8d9e0f07d93b89e8934c870d5`. Exact-source
run `40032565764` pins current M3 PR #90 head
`98a034fa2066cec18f833440cc51275c389681c6`, M2 PR #91
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5 PR #94
`cca42cd1762f995e92454d55ffa5e63951e39144`. The M3 ordinary-CLI subtest fails
on Ubuntu and Windows, returning
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` instead of the expected fixed-probe PASS.
The internal M3 adapter reason is `M2_CAPABILITY_PROVIDER_UNAVAILABLE`; the
current Console keeps that value out of the fixed public response enum. This
is an exact-current-M3 failure.
Direct composition with the packed M2 candidate passes, but M3's public
self-reference resolves to a different adapter blob as described above.

The M9 run also fails a separate M8 candidate assertion. Wrapper run
`40032565853` fails the dependency audit on existing Hono, ip-address, and zod
advisories. These are outside M3 ownership. Keep Issue #52 OPEN / P0 /
NOT_VERIFIED until the M9 package-composition owner aligns the public M2 export
bytes in the M3 package tree and exact-current Ubuntu/Windows composition
passes.

### Latest M9 completion — 2026-10-24

M9 PR #36 is at `80b721f02d5aa861654b89d3fd019b369caa3a39`. Run
`40034276936` pins M3 code `98a034fa2066cec18f833440cc51275c389681c6` (M3
PR #90 `de12f31` adds documentation only), M2
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5
`cca42cd1762f995e92454d55ffa5e63951e39144`. The ordinary-CLI subtest fails
on both Ubuntu and Windows: its actual HTTP status is
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`; the internal M3 adapter reason is
`M2_CAPABILITY_PROVIDER_UNAVAILABLE`. Direct M3 adapter composition with the
packed exact M2 facade and M5 router (subtests 16/17) passes on both hosts,
including alias denial. A separate M8 candidate subtest 10 also fails.

M9 wrapper run `40034276939` fails its audit step on existing Hono,
ip-address, and zod advisories. M3 PR checks remain green. Issue #52 remains
OPEN / P0 / NOT_VERIFIED until the public M2 export bytes are composed into
the M3 package target and the exact-source M9 run passes both hosts.

### Exact-current-PR M9 rerun — 2026-10-24

M9 PR #36 is at `405a4fbbbe41a192f2dad8a8e52c246ed5c7bc2e`. Run
`40035799661` pins current M3 PR #90 head
`10d488336ce8873f7eeade59064f6601f468e126`, M2 PR #91
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5 PR #94
`cca42cd1762f995e92454d55ffa5e63951e39144`. The ordinary-CLI subtest 11
fails on both Ubuntu and Windows with actual HTTP status
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`; the internal adapter reason remains
`M2_CAPABILITY_PROVIDER_UNAVAILABLE`. Direct packed exact-M2/M5 subtests 16/17
pass on both hosts, including alias denial. The public export target blob
mismatch is unchanged; a separate M8 subtest 10 also fails.

M9 wrapper run `40035799522` fails its audit step on existing Hono,
ip-address, and zod advisories. M3 PR checks pass. Keep Issue #52 OPEN / P0 /
NOT_VERIFIED pending M9/package composition alignment and a successful
exact-source Ubuntu/Windows run.

### Fixed-path Host probe/status verification — 2026-10-24

M3 PR #90 exact head `3a377ffe1d1f34b97a71ae6657accb9126d052f2` composes the
normal Console protected-read probe against public M1 held-file Gateway,
M2 `createSecurityGatewayHostAdapter`, and M5 strict OBSERVE router contracts
with `verifyRealPaths:true`. M3 owns the fixed registered tool/path and
sanitized route. It verifies the opaque M2 capability before adapting the
capability-bound M2 executor/provider to M5; no generic path-only callback is
accepted. Missing owner exports/methods fail closed as `UNKNOWN`.

M4's exact audit report commit `7922309da0f6ea60c02b9bd17e6872aa98d753e5`
and its Issue #52 evidence confirm M4 is a read-only consumer of the sanitized
Security Center status; it does not own or implement the protected-read host
route.

The default Console process resolves package self-reference exports from the
M3 package. Its `gateway-adapter` target blob is
`7a05ed64300c6345222dff13a4e929a250646acc`, different from exact M2 PR #91
blob `0d7053114e87177669ec2c3b416028e05affb62f`. The local CLI positive test
uses the checked-in M3 package path and synthetic capability fixture; it does
not prove the ordinary process consumed the exact M2 candidate package. M9's
current-source package-composition test is needed to settle this boundary.

The POST action checks CSRF, operator authority, and an empty request body
before loading probe dependencies. Its PASS requires the fixed registered-read
positive control and both alias and path-replacement denial controls before
callback/side effect. The GET route checks CSRF and serializes only the
allowlisted M2 status fields; it is snapshot-only and never runs a read. The
focused local command
`node --import tsx --test test/codex-connection-check.test.ts
test/security-center-route-m3.test.ts` passed 27/27, `npm run build` passed,
PR exact-head workflow `40037861929` passed 9/9, and ownership-contract evidence
run `40037861836` passed. These are synthetic host/contract tests, not proof of
an installed Codex callback or native-tool protection.

M9 run `40037657193` completed failure on both Ubuntu and Windows, but checked
out M3 `a84ee13fa0e7e8ba0ace371235236f1d6b203780`, not current M3
`3a377ffe1d1f34b97a71ae6657accb9126d052f2`. It failed before the M9 exact
composition regression: M3's missing-capability-executor test expected
`M2_CAPABILITY_PROVIDER_UNAVAILABLE`, while `a84ee13` returned
`M5_STRICT_ROUTER_COMPOSITION_UNAVAILABLE`. Current `3a377ff` fixes that
M3-owned reason mapping and its exact PR CI passes, but no M9 run has yet
validated current `3a377ff`. The M3 package's `gateway-adapter` target remains
byte-different from the exact M2 export; this older failed run does not establish
whether that packaging difference affects the corrected normal-CLI path.

No M1 review of exact M3 head `3a377ff` is recorded on PR #90. Keep Issue #52
OPEN / P0 / NOT_VERIFIED until M9 repins `3a377ff` and exact-source Ubuntu and
Windows composition checks pass. Native host activation, installer behavior,
and E4 remain `NOT_VERIFIED`.
