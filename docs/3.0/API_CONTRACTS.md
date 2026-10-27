# Current cross-module contract and acceptance snapshot — 2026-10-26 19:17 UTC

This snapshot supersedes older dated status rows below without changing any public API. Only the owning module may change a shared contract; consumers implement adapters at their own boundary. M0 records evidence and coordinates promotion but does not edit module implementation.

| Interface | Owner and consumer boundary | Required invariant | Current evidence and acceptance status |
| --- | --- | --- | --- |
| Gateway, protected path, held-file identity | M1 owns canonical path/identity and Gateway denial; M2 owns the execution-isolation adapter; M5 consumes the decision. | M2 forwards only a capability issued/revalidated by M1 for a startup-bound target. Symlink/junction aliases, replaced files, traversal and workspace escapes deny before approval, callback or file effect. | Synthetic OBSERVE alias/junction tests pass. P0 #52 remains OPEN because a production first-party OBSERVE callsite consuming the same protected identity and installed-host TOCTOU evidence are not verified. No real secret exposure is claimed. |
| Hook and packaged Hook | M1 owns canonical Hook decision and redaction semantics; M3 maps host calls; M7 owns its packaged copy; M8 owns public compatibility/redaction documentation. | Preserve allow/deny/ask and only reviewed fixed result fields/reason codes. Consumers adapt at their edge; they do not copy or weaken the M1 implementation. | Source-level and hosted composition evidence does not prove installed output parity. M8 head 685520cbb000b3dc6950876f115199cdebf81ea5 has no matching M6 exact-head disposition under #80; M9 remains pinned to reviewed older M8 1c94ed4b8beb8ab3f9e04004c0bc3b0f372b2841. |
| Policy, Guard, Canary and audit | M5 owns risk-policy/router decision and policy-audit fields; M1 owns Guard/Canary security semantics; M6 evidence is a separate schema. | OBSERVE can omit optional approval only for registered non-sensitive actions. It cannot override explicit DENY, containment, sensitive-path rules, or missing M1 capability. Policy audit, Hook telemetry and E4 evidence remain distinct event schemas. | M5 build/tests pass. M5 package check is safely blocked until its checker proves the child OS-temporary root, cwd propagation, explicit npm --prefix installDir, and wrapper invocation. PR #122 also fails ownership-contract evidence and direct exact-source composition. |
| Configured target and desktop Security Center | M3 owns the configured-target CLI/route; M4 owns the desktop status consumer. | Bind id=relative-path at startup. Status APIs are read-only; M4 does not use a status probe as an execution route or present synthetic evidence as PROTECTED. | The M9 candidate composition passes on its manifest-selected sources. Direct PRs #120/#121 currently fail both exact-source composition jobs. M4 has no verified shipping OBSERVE file-read callsite for #52; keep the product host state NOT_VERIFIED. |
| E4 and evidence | M6 owns SecurityEvidenceEvent v0.1, canonicalization, chain verification and bundle schema; M7 supplies lifecycle artifacts; independent reviewers own acceptance. | Verify exact artifact/source/hash/provenance; require a trusted expected head for truncation claims. Self-check, fixtures and green CI do not equal independent installed-product acceptance. | Latest nested E4 run 20261026T191059221Z: 507/518 project tests passed, 0 failed, 11 skipped; build/package/bundle self-check steps passed; synthetic automation has two FAIL cases and three environment-gated cases. Product E4 and independent review remain NOT_VERIFIED. |
| Windows package and installer lifecycle | M7 owns Windows package production and lifecycle harness; M6 owns evidence schema; M0 coordinates Issue #29's exclusive slot. | Producer/consumer artifact paths, bytes and hashes must match. Installer/VM/real-model operations require one shared exclusive reservation before launch and a recorded terminal result. | M7 PR #128 is CONFLICTING with no checks. Issue #29's latest resource readback found no registered/running clean VM and no exclusive slot reservation; no installer or VM test ran. |
| Open-source docs and community interface | M8 owns compatibility/onboarding/readiness docs, documentation checks, and its public wrapper boundary. | Public docs must state supported hosts, security limitations, and actual verification level; do not claim a protected host or E4 result beyond evidence. | M8 PR #129 fails ownership-contract evidence and both direct exact-source composition checks. Its current local HEAD is not yet accepted by M6 for the specific #80 scoped disposition. |
| M9 immutable source composition | M9 owns exact manifest pins, manifest validator, integration workflow/tests and risk aggregation; module owners retain implementation paths. | Check exact owner-reviewed SHAs on both Ubuntu and Windows. A green candidate validates only the pinned SHAs and never updates owner pins implicitly. | PR #127 at 635f8bc55216b044627fa83f0b402003d0eaa893 has 12/12 checks green. Its M7/M8 manifest pins bba0f0f89c610f8198660e799de7a652b8ea8e96 and 1c94ed4b8beb8ab3f9e04004c0bc3b0f372b2841 do not match local M7/M8 heads; hold pin changes for exact owner dispositions. |
## M0 exclusive runtime resource contract — 2026-10-24

- At most two module development tasks run concurrently. GitHub comments alone do not start chats; retain an actual worker/job handle or completed owner result before recording execution.
- GitHub jobs that execute an installer, disposable VM workload or real-model acceptance must share the static job concurrency group `agent-canary-exclusive-e4`, with `cancel-in-progress: false`. Ordinary builds and source-only composition do not consume this resource.
- M7 installer execution requires explicit `workflow_dispatch` and `run_installer_lifecycle=true`; a pull request must not run an installer automatically. Reserve the exclusive resource in Issue #29 before dispatch, recording source SHA, purpose and job/run identity; release it after inspecting the actual terminal result. Local VMware/model runs use the same Issue #29 reservation because a GitHub concurrency group cannot lock a desktop resource.
- Same-run producer/consumer provenance, exact artifact inventory and checksum verification remain mandatory. A hosted-runner lifecycle result does not establish a Windows 11 client or ordinary-user token unless separately evidenced. Developer SELF_CHECK and independent E4 remain distinct.
- Push substantive changes in batches separated by at least 20 minutes. The active M0 goal requires stopping new work if the readable five-hour quota drops below 5%; latest authenticated read at 2026-10-25 06:32 UTC showed 94% remaining and 99% weekly. If the percentage becomes unreadable, do not start VMware, real-model, or installer work until it is readable. Runtime/API implementation ownership is unchanged.

## Current configured-target contract status — 2026-10-24 09:21 UTC

M3's merged feature source now implements the configured-target CLI/HTTP contract documented below. The exact-source M9 run `40066875122` passed Ubuntu and Windows. This corrects older snapshots in this file that described the M3 route as absent; it does not promote source/fixture evidence to installed-package, native-host, or OS-atomic TOCTOU acceptance. Issue #52 remains OPEN/P0/NOT_VERIFIED for those product gates. M3 owns runtime semantics; this M0 entry records the observed public boundary without changing it.

## M0 contract-evidence delta — 2026-10-15 21:06 UTC

This adds CI evidence only; it does not change a public API. M9 composition run `38727481764` fails on Windows job `116396823551` and Ubuntu job `116396823888` because M3's unpinned normal native `Read` returns `allow` where the M1 Hook contract requires `deny` with `native_file_execution_not_pinned`. The selected M1/M2/M5 denial and constrained-read controls and the M3 allowlisted-JSONL check pass on both platforms. The run checked out M1 `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc`; current M1 PR #43 is `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4`, so this does not establish current-M1-head compatibility. M3 retains ownership of its correction; M1's denial contract/assertions remain authoritative; M9 must rerun both platforms against current exact refs after M3 advances. Evidence is recorded in Issue #55 comment `6202315177`.

## Current coordination evidence (2026-10-15 20:52 UTC)

This snapshot refreshes acceptance state; it does not change runtime interfaces. Public contract changes remain owner-controlled, and other modules adapt at their boundary.

- **M1 generic file callbacks:** PR #43 exact head 9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4 denies generic path-string file-read, file-write, and delete callbacks with path_execution_not_pinned when verifyRealPaths is true, before approval or callback dispatch. Exact-head checks and the ten-run Ubuntu Node 20/22 stress checks pass. This does not prove a product host consumes the Gateway.
- **M1 Gateway / M2 adapter / M5 policy:** Gateway held-descriptor behavior and M2's fixed-resource adapter are internal/synthetic seams. M5 PR #47 contains the path-alias/outside-link fixes and exact-head CI passes 9/9. No selected first-party host consumer, protected-open/held-handle proof, current-host composition, or TOCTOU evidence is verified (#52).
- **M3 native Hook:** without the M1-approved held-file capability, native Read must deny with native_file_execution_not_pinned. M3 PR #33 current head be388029 still allows it in M9 run 38727481764 on Ubuntu and Windows. M3 owns correction and positive control; M1 retains denial assertions; M9 repins only after a corrected exact M3 SHA.
- **Hook logging and packaging:** wrapper logs remain limited to the reviewed fixed-field allowlist. Source/wrapper tests do not prove the installed package uses those bytes. M7/M8 must provide real package manifest, extracted-Hook comparison, and harness evidence under #53.
- **M0 implementation scope:** no product source/API implementation changed in this checkpoint. This update records priority labels and current evidence only. PR #24 remains unchanged and unmerged.

## Archived coordination evidence (2026-10-15 18:52 UTC)

- **M1 generic file callbacks:** PR #43 exact head 9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4 denies generic path-string file-read, file-write, and delete callbacks with path_execution_not_pinned when verifyRealPaths is true, including OBSERVE, before approval or callback dispatch. False/unset retain legacy lexical behavior and make no canonical-path or protected-open claim. Exact-head CI passed 9/9; Node 20 and Node 22 stress each passed ten runs.
- **M1 Gateway:** the current source preopens and identity-checks a descriptor, then reads through that held descriptor. This is an internal Gateway capability; it does not prove a product host uses it.
- **M2 adapter / M5 policy:** M2's adapter forwards allowlisted reads to M1 Gateway, but its report says there is no first-party product-host consumer. M5's strict policy fails closed when a generic callback cannot prove it uses the checked file identity. These layers have distinct ownership; do not treat an allowlisted adapter fixture as product-host enforcement.
- **#52 acceptance:** first-party host adoption, exact current M1/M2/M5 composition, host protected-open/held-handle use, and TOCTOU acceptance remain NOT_VERIFIED. The native-host trial is BLOCKED with zero completed protected cases.
- **M3 Hook contract:** native unpinned Read must deny with native_file_execution_not_pinned. M3's current exact head still allows it in M9 run 38727481764; M3 owns correction, M9 owns repin/composition.
- Public contract changes remain owner-controlled. Other modules adapt at their boundary instead of editing the shared contract.

## Current coordination evidence (2026-10-15 16:44 UTC)

M0 maintains these public cross-module semantics. M1 owns Gateway and Hook behavior, M2 owns its adapter, M3 owns onboarding/host adaptation, M5 owns policy/router behavior, and M9 owns composition tests. Any shared contract change must be made by its owner; other modules adapt at their own boundary.

- **Unpinned native file read (#55, P1):** the canonical M1 contract is fail-closed: without an M1-approved held-file capability, native `Read` denies with `native_file_execution_not_pinned`. M1 PR #43 is currently `7d6f091`; M3 PR #33 is `be388029` and still allows the synthetic unpinned read. M9 PR #36 run `38727481764` fails on both Ubuntu and Windows. M3 owns the correction and a separate supported-capability positive control; M9 repins only after the corrected M3 SHA exists. This does not prove a production host exploit or exposure.
- **M1 investigation boundary (#51):** the test already gathers four child outcomes, retries, sparse identity metadata, and monotonic offsets. The underlying retry-exhaustion trigger remains UNKNOWN; optional test-only lock-owner PID and acquire/release duration evidence is the remaining request. No change to production locking, retry semantics, or the 48 assertions is allowed without a reproduced defect and owner-approved fix.
- **M5 policy / M2 adapter / M1 I/O boundary (#52):** M5 owns policy decisions and the adapter owns routing; an allowed policy result alone does not authorize arbitrary path I/O. The first-party production host must consume the registered-file capability and enforce protected open/handle identity. Synthetic alias checks do not satisfy this boundary; production host and TOCTOU evidence remain NOT_VERIFIED.
- **Other acceptance boundaries:** M2 Native Codex Shell remains UNPROTECTED (#45); M7 clean-VM lifecycle remains NOT_VERIFIED (#41); M8 package reachability remains NOT_VERIFIED (#53); independent external E4 remains NOT_VERIFIED. No CI result is promoted to a host or installer claim.

## Current coordination evidence (2026-10-15 11:33 UTC)

M0 maintains this cross-module contract. M1 owns Gateway and Hook semantics; M2 owns its execution adapter; M3 owns agent onboarding and host adaptation; M5 owns policy/router semantics; M9 owns composition checks. This update records the exact current M9 result and adds no runtime implementation.

- **Native Hook unpinned-read contract (#55, P1):** M1 PR #43 head `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc` denies a native file `Read` without an approved held-file capability using `native_file_execution_not_pinned`. M3 PR #33 remains at `be3880298e1c6766024ecbce5f6dbc23c4d2daa1` and allows the synthetic unpinned read. M9 PR #36 run `38727481764` completed on Ubuntu and Windows and both composition steps failed on this mismatch; the job summaries reported M1 deny and M3 allow. M3 owns its behavior/test correction, M1 retains the fail-closed contract, and M9 will repin only after M3 advances. This is synthetic contract evidence, not production-host exposure.
- **Current M9 checks:** PR #36 exact head `de3799aae540f58173acec4ab3f7a1fe98593aa7`; product CI `38727481643` and Windows wrapper `38727481657` passed. Cross-module composition `38727481764` failed on both platforms. Workflow `fail-fast: false` ensured both platform results were reported.
- **Hook logging and remaining boundaries:** the prior exact-head synthetic JSONL regressions and wrapper-blob checks remain as recorded below. Package reachability, native-host activation, protected-open/held-handle behavior, clean-VM lifecycle, and external E4 remain NOT_VERIFIED where applicable. M2 native Codex Shell remains UNPROTECTED (#45); M4's Ubuntu Node 20 `RETRY_LIMIT` trigger remains UNKNOWN (#51); Issue #52 remains open for production-host and TOCTOU evidence. No assertion was deleted or weakened.

# Agent Canary 3.0 公共接口契约

## Archived coordination evidence (2026-10-15 11:15 UTC)

M0 maintains this cross-module contract. M1 owns Gateway and Hook semantics; M2 owns its execution adapter; M3 owns agent onboarding and host adaptation; M5 owns policy/router semantics; M9 owns composition checks. This record adds no runtime implementation.

- **Native Hook file-operation contract (#55, P1):** without an M1-approved held-file capability, a native file `Read` must deny with `native_file_execution_not_pinned`. M1 PR #43 head `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc` enforces this; M3 PR #33 head `be3880298e1c6766024ecbce5f6dbc23c4d2daa1` currently allows the same synthetic unpinned `Read`. M9 exact-head Ubuntu composition run `38724906633` observed `expected deny, actual allow`. M3 owns its implementation/test correction; M9 updates its M3 pin after that head advances. This is a test-level contract mismatch, not evidence of production host exposure.
- **Hook log contract (#53, P0 candidate):** persist only the allowlisted timestamp, fixed `PreToolUse` event, and permission-decision enum. M2/M5/M7/M8/M9 tracked wrapper blobs match the M1 canonical blob `d6f93249306b7966259cab463dd39475728ef338`; M3 has a separate equivalent executable wrapper with a comment-only difference. M9's exact-head synthetic JSONL checks for M3 fields and caller/reason/path/command canaries passed in run `38724906633`. Package reachability, native host activation, and clean-VM lifecycle remain NOT_VERIFIED.
- **Current M9 composition:** PR #36 exact head `16163357f6c3ed67db69e85cb3ad435bbe95ce95` product CI passed 9/9 and wrapper CI passed 2/2. Ubuntu composition passed 6/7 subtests; the new M1/M3 contract gate is the failure. Windows composition was cancelled by matrix fail-fast. M9 local commit `de3799aae540f58173acec4ab3f7a1fe98593aa7` sets `fail-fast: false` and awaits the next publication batch and exact-head CI.
- **M1/M2/M5 file boundary (#52, P0):** `verifyRealPaths:true` blocks registered read/write/delete callbacks before approval and dispatch; the exact M2 adapter provides only a fixed read through M1 Gateway's held handle. These source fixtures remain synthetic and do not establish a production file-host consumer or protected-open TOCTOU resistance; keep #52 OPEN.
- **Other integration limits:** M2 native Codex Shell remains UNPROTECTED (#45); M4's Ubuntu Node 20 `RETRY_LIMIT` trigger remains UNKNOWN (#51); clean-VM installation lifecycle (#41), independent external E4, and exclusive VMware/real-model/installer reservation (#29) remain NOT_VERIFIED or unreserved. No merge of PR #24, main merge, or Release occurred.


## Archived coordination evidence (2026-10-15 08:44 UTC)

M0 maintains the cross-module contract; M1 owns Gateway and Hook semantics, M2 owns its execution adapter, and M5 owns policy/router semantics. This coordination record adds no runtime implementation.

- **M1/M2/M5 file boundary (#52):** M5 candidate code `06fdbb060574e96e5d1eba5c77721014e0a81a3b` (report commit `d578b1d93f2b71692ab76a5c3557f7779f2a6faf`) was reviewed by M1. With `verifyRealPaths:true`, M5 denies registered `file-read`, `file-write`, and `delete` operations before approvals and before the generic `executeRealTool` callback; alias/path-specific denials may occur earlier. OBSERVE cannot override these decisions. This prevents the generic path-check-then-reopen route in this mode, but reduces file functionality and does not prove a production host uses the router.
- **Approved synthetic read composition:** M5 `verifyRealPaths:false` is lexical policy only and is unsafe as a standalone arbitrary path callback. The exact M2 adapter at `9db59ed8f2deae905edcb2179982f8bcb594167c` exposes only a fixed registered read and sends it directly to M1 `agent.dispatch`, whose Gateway reads its held file handle. M2 has no write/delete adapter and has no fallback or path reopen. M9 local candidate `036308eec5f7f96d16285e2d0a594d04268ed799` tests this restricted read plus M5 true-mode zero-callback denials; its 3/3 local composition result is synthetic API evidence only. No first-party production host callsite has been verified.
- **Current PR/check state:** #24 remains OPEN/Draft, unchanged at head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`; M1 #43 `f14aab7`, M2 #37 `9db59ed`, M3 #33 `be38802`, M4 #34 `fbf2090`, M5 #47 remote `b6a40b4`, M6 #38 `c1fdf3c`, M7 #39 `cf4b70f`, M8 #40 `499db51`, and M9 #36 remote `4d1dc7a` remain OPEN/Draft. M3 and M7 latest exact-head CI pass; M8 Windows product and wrapper runs `38706666596`/`38706666613` fail with `WRAPPER_SOURCE_PROVENANCE_MISMATCH` and are under owner investigation. M4 run `38698635434` has the separate #51 retry failure. M5 and M9 candidates are local and have not yet been pushed.
- **Evidence limits:** #52 remains P0/OPEN because no production host path is verified; retain the synthetic TOCTOU finding without claiming product exposure. Native Codex Shell remains UNPROTECTED, Hook trust/activation is NOT_VERIFIED, clean-VM installer lifecycle is NOT_VERIFIED, and external E4 is NOT_VERIFIED.

## Archived coordination evidence (2026-10-15 07:31 UTC)

M0 maintains the cross-module contract; M1 owns Gateway and Hook semantics, M2 owns its adapter, and M5 owns policy/router semantics. This record adds no runtime implementation.

- **OBSERVE decision contract (#52):** M5 owner commit b6a40b4 preserves explicit policy DENY and its original reason under OBSERVE; dispatch remains blocked before approvals/callbacks. The commit is local on the existing #47 branch, so current GitHub head a6d610e does not yet contain it. Focused M5 tests pass 48/48.
- **Symlink scope:** M5 b6a40b4 with verifyRealPaths enabled denies any symlink/junction component, including in-workspace non-sensitive aliases, matching the M1 literal-path resource boundary. verifyRealPaths=false retains legacy lexical behavior. M5 and M9 agree locally; exact GitHub cross-tree CI is pending.
- **Adapter and integration order:** M2 candidate 76066cbb is the current remote head of PR #37 with exact-head CI 9/9. M9 3dfef35 adds an independent-checkout CI regression to existing PR #36; run 38696382427 passes on Ubuntu and Windows (1/1 each), and both logs record M9 `3dfef3509ada2b974cd3e0c1e55e6b57d45b2074`, M1 `f14aab781c62db60ac241d2114f543f6cac223ae`, M2 `76066cbb750ec714ce8691bc0f30c8171186f079`, and M5 `b6a40b49f132decba97d269ff942d868fcef928f`. PR #36 exact-head checks are 13/13. Do not treat this synthetic composition as production-host proof.
- **Production boundary:** M5 has no first-party production file-host consumer; actual I/O remains the host callback. A policy or adapter fixture does not prove a shipped host opts into canonical checks or performs protected-open/handle execution. Issue #52 stays P0/OPEN; production enforcement and TOCTOU remain NOT_VERIFIED.
- **Current PR state:** #24 is OPEN/Draft, unchanged, with 11/11 checks. M9 #36 head 3dfef35 passes 13/13 including both cross-tree jobs. M5 #47 head b6a40b4 passes 9/9. M2 #37 head 76066cb passes 9/9. M0 #30 head bd8686e passes 10/10 including ownership-contract-evidence.
- **M4/M8/M7 PR updates:** M4 fbf2090 is the exact head of PR #34; its run 38698635434 failed the existing Ubuntu Node 20 state-store concurrency case (`RETRY_LIMIT`, #51), Ubuntu Node 22/build/sponsor passed, four matrix jobs were cancelled by fail-fast, and package-smoke was skipped. M1 confirmed exact source/test blobs match `f14aab7`; no cause or data loss is established. M8 d12dd2c is the exact head of PR #40 and passes 11/11. M7 local 52cc149 adds direct packaged positive-control JSONL assertions; its focused test passes 1/1, but it is not pushed. None of this establishes native-host protection, a built installer lifecycle, or external E4.

## Archived coordination evidence (2026-10-15 06:05 UTC)

M0 maintains this cross-module contract; M1 owns Hook logging semantics and M7 owns Windows package wiring. This coordination entry adds no runtime implementation.

- **Persistent Hook log contract (P0 candidate #53):** emit only reviewed allowlisted metadata: timestamp, fixed Hook event name, and permission-decision enum. Do not persist raw `tool_input`, the full `decision` object, decision reasons, paths, or other caller-controlled detail. Keep a synthetic canary-value regression proving the value is absent from the log; do not delete or weaken it.
- **Packaging dependency:** M7's Windows installer payload and hook-fault harness must consume the M1-approved sanitized behavior and retain package-smoke coverage. `npm pack` exclusion does not establish that the Windows installer omits the wrapper. M2/M3/M4/M5/M6/M8 branch copies and the M9 composition must be reviewed by their owners; adapt through the owner-approved contract.
- **P0 evidence boundary (#53):** this is a potential local at-rest disclosure based on code-path review; no real credential, production exposure, or external transmission was observed. M2 #37 `04c7ec7` and M8 #40 `454873c` are now remote exact heads with 9/9 checks each; M3 #33 `1829e05` and M9 #36 `2d3f1da` also have green exact-head checks. M7 `87e0df0` retains the packaged-harness regression and 11/11 checks. Keep #53 OPEN until reachable/shipped copies and package evidence are fully reconciled.
- **M1/M5 file-execution boundary (#52):** M1's `createTrustedExecutionGateway` is the registered-file execution boundary; it uses canonical-path checks and held-handle identity checks for its file operations. M5 `createSecurityToolRouter` owns the policy decision but delegates actual file I/O to its caller-provided `executeRealTool`. The M5 read-only audit found no production file-host consumer. M9 commit `f87a70f` adds a test-only adapter from an OBSERVE read to `gateway.agent.dispatch({ name: 'read_file' })`; valid registered-fixture reads pass through the Gateway, while sensitive in-workspace and external aliases deny before dispatch with zero approvals and unchanged fixtures (4/4 focused tests, build and diff checks pass). M2 is developing an adapter candidate on its existing branch without planned M1/M5 API changes. This remains synthetic API composition; no first-party production host joins these components, so #52 stays OPEN and production protection remains NOT_VERIFIED.
- **Hook interruption disposition:** #32 is CLOSED only for the synthetic subprocess marker regression. The old one-second fixture window terminated the child before the marker; why the original runner exceeded that window remains UNKNOWN. Native-host callbacks remain NOT_VERIFIED.
- **Current PR checks:** #24 11/11; M0 #30 `3b93f8b` product 9/9, but latest ownership check `38688865257` fails because its refreshed PR body lacks `Test-Evidence` and `API-Contract-Change` markers; M1 #43 `f14aab7` 10/10; M2 #37 `04c7ec7` 9/9; M3 #33 `1829e05` 9/9; M4 #34 `66e679b` 9/9; M5 #47 `a6d610e` 9/9; M6 #38 `c1fdf3c` 11/11; M7 #39 `87e0df0` 11/11; M8 #40 `454873c` 9/9; M9 #36 remote `2d3f1da` 11/11 with local test-only commit `f87a70f` pending publication. #51's original retry trigger remains UNKNOWN; no assertions were weakened.

## Archived coordination evidence (2026-10-15 04:04 UTC)

M0 maintains this canonical cross-module summary; M1 and M5 retain ownership of runtime and policy semantics.

- **M1 file router boundary:** commit `f14aab7` preserves the lexical legacy default and, when `verifyRealPaths:true`, hard-denies symlink/junction components for file read/write/delete before approval and again at dispatch. OBSERVE alias regressions assert preview/dispatch DENY, zero approvals/callbacks, and unchanged target content/hash. M1 focused router tests pass 20/20. This synthetic routing test does not establish a connected native host; open-by-path TOCTOU still requires a protected handle/OS boundary.
- **M5 policy composition:** M5 `nonOverridableDeny` remains hard DENY under OBSERVE. Commit `0fdbd92` separates M5 policy-reason assertions from the M1 alias preflight reason; sensitive-path tests retain DENY, `SENSITIVE_DATA`, zero approvals/callbacks, and unchanged fixture assertions. M5 focused policy tests pass 30/30.
- **M9 integrated candidate:** `37a09e8` combines the owner commits on the existing branch. Cross-module focused tests 53/53, full `npm test` 409/0 failures/6 environment skips, build, E4 verifier 16/16, and package smoke 100 files pass. Exact PR #36 CI 11/11 is green. M9-owned changes are limited to package test registration and a dedicated composition test. M6 verifier blobs match M6 `cd55717` byte-for-byte.
- **M4 status boundary:** no `/api/security-center` or `/api/e4/status` provider/IPC exists. M4 tests preserve UNKNOWN and security-origin checks; do not substitute mock values.
- **Remaining evidence limits:** no production M5 filesystem-host consumer or native M1 callback was found. External E4, native host execution, clean-VM installer lifecycle remain NOT_VERIFIED. M1 held-handle Gateway path still does not prove every same-privilege concurrent rename race.
- **Exact-head PR checks:** M1 #43 `f14aab7` 10/10; M4 #34 `e939f04` 9/9; M5 #47 `0fdbd92` 9/9; M9 #36 `37a09e8` 11/11. All remain OPEN/Draft. PR #24 is unchanged.

## Archived coordination evidence (2026-10-15 03:31 UTC)

M0 maintains the canonical cross-module summary; M1 and M5 retain ownership of their runtime and policy semantics.

- **File execution boundary:** the M1 `createTrustedExecutionGateway` file path canonicalizes and validates registered paths, opens and retains a descriptor, compares `lstat`/`fstat` identity, rechecks binding before effects, and reads/writes through the retained descriptor. Its focused Gateway/router tests pass 48/48 and build passes. The repository audit found no native-host callback connected to this Gateway; native host use remains NOT_VERIFIED. On Windows Node22, `O_NOFOLLOW` is unavailable, and the documented identity/path checks do not eliminate every same-privilege concurrent rename race.
- **Generic policy router:** `createRiskPolicyRouter` keeps its documented lexical-path legacy default. A real filesystem host must explicitly set `verifyRealPaths: true` on `createSecurityToolRouter` (or provide an equivalent canonical containment/sensitive-target boundary), then perform the open through a protected handle/no-follow/OS boundary. The M5 management adapter passes the option through but does not itself open files; no production M5 file-host consumer was found. Check-then-open alone does not eliminate TOCTOU. Issue #52 remains P0/OPEN pending real-host evidence.
- **Hook interruption:** PR #33 (`f9bd818`, run `38672489688`) and PR #34 (`9288de0`, run `38672493385`) each pass 9/9; #33 Windows Node20 passes. The old fixture's one-second marker window is the direct historical failure mechanism; runner delay beyond that window remains UNKNOWN. The synthetic subprocess test does not establish native-host callback behavior. Issue #32 remains OPEN pending M9 combined review and host evidence.
- **E4 integration:** M6 confirms the three `e4:*` package fields match M9. M9 local candidate `e2e25fb` integrates the M6 verifier guard and path checks, preserves atomic no-overwrite reports, exports bundle failures as BLOCKED with immutable sidecar/snapshot metadata, and rejects forged sidecars without modifying saved evidence. Sidecar collisions normalize to `AUTO_E4_ARTIFACT_ALREADY_EXISTS`. Build, `e4:test` 16/16 and `verify` 399/405 pass locally; M6 owner final rereview found no contract gap. The verifier/export still use lstat followed by path reads, retaining a TOCTOU limitation. External E4 remains NOT_VERIFIED.
- **Current PR checks:** M5 #47 exact head `c54e7eb` passes 9/9; M6 #38 exact head `cd55717` passes 9 product checks and 2 wrappers; M8 #40 new head `16e3d01` run `38674816292` passes 9/9. PR #24 remains OPEN/Draft and unchanged.

## Archived coordination evidence (2026-10-14 19:43 UTC)

M0 remains the sole owner of the canonical cross-module contract at docs/3.0/API_CONTRACTS.md; each interface owner remains responsible for semantics and compatibility. No public runtime API change was made by this M0 update.

For the M1-owned Hook test contract, M1 recorded that blob d3b64fc is behaviorally equivalent to blob 0de664c solely for marker-wait/interruption timing. This is not byte identity and does not prove native-host callback behavior. PRs #33/#34/#38 still carry the older synchronous fixture; M1 owns the fixture semantics while M3/M4/M6 own their branch copies. Keep the issue open until each branch has an owner disposition and exact-head CI. Preserve fail-closed behavior.

Current exact-head checks and interface status are summarized in TECHNICAL_STATUS.md. Issue #46 is CLOSED for documentation synchronization only; this does not imply runtime integration, E4, or host enforcement.



状态：基于 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 的源码快照。模块分支中的未提交改动可能改变实现；变更须由接口所有者更新契约并提供适配说明。PR #24 指向 readiness 分支，不是已合并到 `main`。

## 通用兼容规则

- 3.0 以增量导出为主，保留现有 CLI/MCP/SDK 行为。公共字段、路由、事件或失败语义的改变都算契约变更。
- 接口所有者在同一 Draft PR 更新契约，并说明旧调用方的适配方式、错误语义和版本边界。其他模块经适配层集成，不私自修改接口。
- `docs/3.0/API_CONTRACTS.md` 是 M0 维护的唯一跨模块 canonical contract；每个接口 owner 定义并审核自己接口的语义。M0 将 owner-approved 语义汇入本文件，模块 PR 可保留 `docs/3.0/<Mx>/...` owner-authored contract，不得在根路径新增另一份不同内容。其他模块经适配层集成。
- 权限判定必须在受信任执行器启动前最终复查。超时、解析失败、状态不明或证据写失败不能转成成功或放行。
- AI 分析器只能收紧决定，不能创建权限、批准操作或重置隔离。

## Owner-reviewed M1/M2/M5 file operation contract (2026-10-15 08:40 UTC)

- `verifyRealPaths:true` in M5 is fail closed for all registered `file-read`, `file-write`, and `delete` operations through its generic `executeRealTool` path. The router denies before creating an approval or invoking that callback, including in OBSERVE mode. If true mode is later changed to permit a file operation, M5 needs an explicit, owner-reviewed way to distinguish a trusted held-handle adapter from an arbitrary path callback.
- `verifyRealPaths:false` means M5 applies lexical policy only; it makes no canonical-path or protected-open claim. A standalone arbitrary callback that reopens the path remains unsafe.
- The exact M2 adapter currently exposes only a fixed-path read. It validates the exact registered tool, path, and arguments, then dispatches directly to M1's registered-file Gateway. M1 holds and checks the registered file handle; M2 does not reopen the path, catch-and-fallback, write, or delete. M5 policy can wrap this adapter in lexical mode for the reviewed synthetic composition. This is an adapter-specific boundary, not blanket approval for generic file callbacks.
- A trusted adapter path through this interface has been exercised only by M9 synthetic composition tests. No production host consumer/wiring is established; #52 remains open until the real host owner supplies a protected execution path and evidence.

## Archived contract and integration status snapshot (2026-10-14 19:12 UTC)

- PR #43 M1 owner head `4b562be` / run `38620584097` passed 9/9. M1 owns Gateway/Guard semantics and its contract remains at `docs/3.0/M1/GATEWAY_API_CONTRACT.md`; the latest Hook subprocess fixture explicitly cannot observe the native-host tool callback.
- Issue #32 remains OPEN. Current `test/agent-hook.test.ts` blobs: M1 #43 and M9 #36 `6c2d8da`; M2 #37 `d3b64fc`; M3 #33, M4 #34, and M6 #38 `1ecb3ee`. The latter branches retain the old synchronous interruption-marker fixture. Their currently passing CI does not prove that historical timing race is eliminated; coordinate an owner-approved minimal update and run the affected exact-head checks.
- PR #47 M5 head `7d5df63` / run `38617317812` passed 9/9. `OBSERVE` only waives optional approval for registered, non-sensitive operations; it cannot override explicit `DENY`, `SENSITIVE_DATA`, path boundaries, or Guard quarantine. The M5 report at blob `1300b4d` and M5 PR description point to this M0-owned contract; Issue #48 is CLOSED for its scoped hard-deny evidence. Issue #46's P2 documentation criteria are verified and its GitHub close is pending the next coordination batch.
- PR #36 M9 head `6abd4da` / product run `38620602632` passed 9/9 and wrapper run `38620603071` passed 2/2. The current package manifest blob is `6b3042`; the previously reviewed additive composition preserves 36 unique test paths and AC3 package fields. Issue #27 remains OPEN pending explicit M6 field-owner confirmation and combined acceptance. Issue #49 remains closed only for its recorded path/hash scope.
- PR #30 M0 head `af39e96` / product run `38617312991` passed 9/9 and ownership run `38617313009` passed 1/1; current contract blob `693d437`. PR #24 remains OPEN/Draft at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, with 9 product and 2 wrapper checks passing; it was not modified or merged.
- PRs #33/#34/#37/#38/#39/#40/#43/#47 are also OPEN/Draft and their current reported checks pass. Native Codex Shell remains UNPROTECTED; external E4 and clean-VM installation remain NOT_VERIFIED; M4 backend security/E4 state remains UNKNOWN. Automated checks and fixtures do not expand these claims.


## TrustedExecutionGateway — M1（接口 owner）

- 入口：`createTrustedExecutionGateway(GatewayOptions)`，返回 `{ agent, operator, evidence, dataflow, provenance, close }`。
- `agent.dispatch(ToolCall, signal?)` 是 agent 工具执行唯一入口。只接受 `read_file`、`write_file`、`run_command`、`http_request`、宿主登记的 `mcp_tool`；未登记资源/命令/MCP 工具或额外参数必须拒绝。
- `GatewayOptions` 绑定 `agentId`、共享 `AgentGuard`、绝对 `workspaceRoot`、固定文件/命令/HTTPS origin、`EvidenceRecorder`；MCP 回调由宿主按精确 tool ID 登记。
- `operator.pending/approve/reject` 是宿主能力，不得暴露为 agent/MCP 工具。审批引用不可重放；执行前再次检查 Guard 和资源绑定。
- 文件能力使用预持有句柄和身份复查；命令使用固定 executable + argv；网络仅允许登记的 HTTPS origin，禁止凭据/查询/hash；敏感内容外发应拒绝。
- 拒绝记录为 `NOT_STARTED`。`RUNNING` 不是成功。当前文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不证明全部副作用。
- `src/runtime/gateway.ts` 与 `src/containment.ts` 的执行/Guard 契约由 M1 所有；M7 的可靠性分支须集成这些语义，不能另行削弱或替换。集成跟踪于 Issue #28。
- **M1 owner-verified lifecycle contract (PR #43 head `d26a0c3`; exact-head run `38602072618` passed 9/9):** Gateway must subscribe to the same shared `AgentGuard`; construction fails closed when quarantine subscription is unavailable. `trip()` latches quarantine before synchronously notifying that Guard instance's listeners; a new subscriber is notified immediately if quarantine is already active; duplicate `trip()` does not notify twice; one listener throwing cannot suppress the rest; a disposer is idempotent; `reset()` permits a later new quarantine notification.
- `close()` synchronously marks the Gateway closed and clears pending approvals, publishes one shared `closePromise` before any abort/disposer callback can re-enter, aborts this Gateway's active controllers, unsubscribes at most once, drains `history.tail`, then attempts to close every resource owned by this Gateway. Concurrent/re-entrant close calls share the same Promise. A resource failure does not skip later closes; all callers receive only the stable sanitized `GATEWAY_RESOURCE_CLOSE_FAILED` error.
- Quarantine synchronously invalidates pending approvals and active work; queued/review work from an older Guard epoch must not revive after `reset()`. Preserve fail-closed and no-callback behavior. A callback that ignores `AbortSignal` cannot be forcibly terminated, and already completed external side effects are not rolled back.
- M1 PR #43 current head `d26a0c3` passed 9/9; M7 PR #39 current head `4267c61` includes integration commit `6d978a5`, with current lifecycle/containment regressions passing 9/9 and wrapper `38596572179` passing 2/2. M1 owner confirmation and M0 scoped acceptance are recorded in Issue #28 comments `6174345116` and `6174407469`; #28 is CLOSED for this Gateway/Guard lifecycle scope only. M9 PR #36 head `ed0dd01` passed docs-on-AC3 product 9/9 and wrapper 2/2; that does not include additional module code. #44 remains OPEN pending M9 baseline acceptance.

## Hook — M1

- 当前 Claude `PreToolUse` 桥接脚本接收四个绝对路径参数：模块路径、workspace root、state directory、日志路径；stdin 是 JSON hook 输入。
- stdout 输出 `hookSpecificOutput`，`hookEventName` 为 `PreToolUse`，`permissionDecision` 只接受 `allow|deny|ask`，并带 `permissionDecisionReason`。
- 参数无效、载入失败、输入超限、超时、决策格式错误或日志写失败必须 fail closed，输出 deny。Hook 是宿主接入层，不能替代 Gateway 执行前授权与最终复查。
- 其他宿主适配须说明覆盖范围并保留超时、错误、默认拒绝语义；MCP 接入不等同于原生工具全覆盖。

## Policy / Guard / Canary — M5 + M1

The owner-reviewed file-operation rules above are authoritative for the current M1/M2/M5 seam. Older PR heads and run IDs in this historical section are retained as dated implementation evidence; consult the 2026-10-15 08:44 snapshot for current remote state.

- `createRiskPolicyRouter({ guard, ... })` 对工具分类为 `ALLOW|DENY|APPROVAL_REQUIRED`，返回风险、理由和模式。未登记工具默认需审批；外部网络和敏感数据按当前策略拒绝或要求审批。
- `OBSERVE` 只豁免已登记、非敏感操作的可选审批；它不得把显式 `DENY` 或 `SENSITIVE_DATA` 改成 `ALLOW`。越界路径、明确危险操作、敏感读取与敏感外发继续拒绝；`AgentGuard` quarantine/containment 在所有模式下优先。策略 `ALLOW` 不等于 Gateway 资源登记。
- Draft PR #47 current head `584f96c` (report-only update) passed exact-head run `38608355200` 9/9 across Node 20/22 on Ubuntu/Windows/macOS, Docker, Sponsor, and package-smoke. M0 PR #30 head `63d10b8` passed product checks 9/9 and ownership evidence 1/1. Issue #48 is CLOSED for the scoped sensitive-read denial, zero pending approvals/callbacks, safe-read taint fixture, and downstream egress assertions. Issue #46 tracks final report/PR-description synchronization. This evidence does not establish real M1+M5 host wiring or real side effects.
- `createAgentGuard()` 宿主接口包括 `beforeToolCall`、`executeToolCall`、`runDecoy`、`inspect`、`trip`、`reset`、`subscribeQuarantine(listener: () => void): () => void`。`trip/reset` 和订阅管理是宿主侧操作，不注册为 agent 工具。
- `trip()` 先锁存 quarantine 状态，再同步通知该 Guard 实例的订阅者；已处于 quarantine 状态时新订阅立即通知；重复 `trip()` 不重复通知，`reset()` 后再次 `trip()` 可重新通知。单个 listener 抛错不得阻止其他 listener；返回的 disposer 可重复调用。
- Gateway 创建时订阅其绑定的同一个 Guard，若订阅能力不可用则构造失败关闭。以上顺序和失败语义由 M1 owner 定义。M1 PR #43 current head `d26a0c3` / run `38602072618` 9/9；M7 PR #39 current head `4267c61` contains the M1 close-contract integration commit `6d978a5`, with run `38596572303` 9/9 and wrapper run `38596572179` 2/2. Issue #28 is CLOSED after M1 owner confirmation and M0 scoped acceptance; this does not claim the PR was merged or all module code was integrated. M9 PR #36 remote head `ed0dd01` contains a 137-path multi-module integration candidate relative to AC3 base, including Gateway, policy, onboarding, execution-isolation, desktop, E4 verifier, reliability, package, test and documentation paths; its exact-head checks passed 9/9 product jobs and 2/2 wrapper jobs. Local commit `fbf358f` changes only the canonical contract document and awaits the scheduled push and fresh exact-head CI. These checks do not establish native-host protection, clean-VM lifecycle, external E4 or verified real-world side effects. Guard notification only covers one process and one Guard instance; callbacks that ignore AbortSignal cannot be forcibly terminated, and completed side effects are not rolled back.
- Canary 检测由 `inspect(text, source?)` 返回结构化 token；处置保留来源、会话与隔离语义，不把原始敏感值写入普通日志。
- 当前 M5 编辑 `src/risk-policy.ts`，需与 M1 Gateway 最终执行检查保持单向收紧关系。
- M5 本地提交 `cd8abea` 进一步约束策略审计事件：`DECISION` 只表示执行尚未开始；`EXECUTION_RESULT` 使用 `decision=NOT_APPLICABLE` 且状态表示执行已开始；策略变更事件不得伪装成执行结果。新增和导入证据都经过同一语义校验；非法组合不得进入哈希链。策略审计事件的判定来源、执行状态和副作用验证状态必须保持一致。
### M5 policy-audit event contract (recorded against PR #47 head `cf4e2cd`; current PR head `373e2c2`, still Draft)

- `DECISION` is a pre-execution policy outcome: `decision` is `ALLOW`, `DENY`, `UNKNOWN`, or `REQUIRE_CONFIRMATION`; both execution and side-effect status are `NOT_STARTED`.
- `EXECUTION_RESULT` is emitted only after execution has started: `decision=NOT_APPLICABLE`; execution and side-effect statuses cannot remain `NOT_STARTED`.
- `POLICY_APPLIED`, `POLICY_ROLLED_BACK`, and `POLICY_CHANGE_REJECTED` are policy-management events, not tool decisions or execution results; they use `decision=NOT_APPLICABLE` and both statuses `NOT_STARTED`.
- Invalid event-type/status combinations are rejected before append and rejected again by evidence-chain/export verification.
- `UNKNOWN` must not be converted to `ALLOW`, `DENY`, or confirmed failure without evidence. Callback success does not prove side effects; use `NOT_VERIFIED` unless a trusted verifier establishes them. If a callback fails and effects cannot be determined, use `decision=NOT_APPLICABLE`, execution `UNKNOWN`, and side-effect `UNKNOWN`.
- This contract is reviewable in Draft PR #47 at current report-only head `584f96c`; exact-head run `38608355200` passed 9/9. M6 confirmed `SecurityEvidenceEvent` and M5 `PolicyAuditEvent` are separate schemas; M6 does not currently consume the M5 policy-audit stream, so this is schema-boundary information, not consumer compatibility proof. M9 PR #36 remote head `ed0dd01` contains a 137-path multi-module integration candidate and passed product 9/9 plus wrapper 2/2; local `fbf358f` only synchronizes this canonical contract and awaits push/current-head CI. This evidence does not establish native-host protection, clean-VM lifecycle, external E4 or real side effects. The event contract does not replace final host/Gateway authorization.

## 执行隔离与原生 Shell — M2

- Trusted Gateway/MCP registration must provide a recognized `executionSurface`. Missing or unknown metadata fails closed with `M2_GATEWAY_MCP_METADATA_INVALID`.
- Native Codex Shell is not covered by the current isolated worker. The binder rejects it before backend dispatch with `M2_NATIVE_SHELL_UNPROTECTED`; callers must preserve the `UNPROTECTED` state and must not fall through to direct execution.
- PR #37 remote head `0f2c10c`; exact-head run `38561262930` passed 9/9. `M2_ISOLATED_WORKER` is a tested adapter seam. Its tests do not prove AppContainer enforcement, trusted Hook installation, or protection of the actual Codex Desktop Shell. Issue #45 remains OPEN; the actual native Shell remains `UNPROTECTED` until a supported, trusted host path and synthetic protected-path denial are verified.

## Agent 宿主接入与安装 — M3

- 当前 `AgentClient` 为 `claude|cursor|cline|codex|custom`；状态为 `MCP_DECOY_INSTALLED|GUARD_INTEGRATED|VERIFIED_PROTECTED|PARTIAL|UNSUPPORTED`。MCP 配置不证明宿主原生工具已受保护。
- 配置先 `previewAgentIntegration`，再以预览 `baseHash` 调 `installAgentIntegration`；hash 不符须拒绝写入。安装生成用户配置备份。`restoreAgentIntegration` 仅在当前完整配置 hash 等于安装 hash 时恢复；用户后续编辑必须保留。
- `src/install.ts` 的既有 `installServer/uninstallServer` 是 CLI 安装 API，需保留原行为；不要与带 preview/hash/restore 的 Agent Integration API 混为一个接口。
- **Trusted connection-check construction seam (M3 PR #33 candidate `bf40d1309e571338b3f36152226ec44b082e5037`):** `createConnectionCheckRuntime()` factors the existing first-party `cwd` / fixed `agent-canary-public.txt` binding / registered callback construction. Its optional Gateway factory, M2 facade loader, M5 router factory, and absolute workspace root are trusted construction-time dependencies only; MCP request/model arguments cannot supply or replace them. `runConnectionCheckMcp()` uses the same builder with existing defaults. This internal seam lets M9 exercise the actual M3 builder with exact M1/M2/M5 sources; it is not a public request-facing capability API and does not by itself establish product protection.
- **Fail-closed default:** the M3 branch-local Gateway still lacks M1 held-file methods. Until the exact M1/M2/M5 composition is verified through the M3 builder, protected status must remain `UNKNOWN` (`M1_HELD_FILE_CAPABILITY_UNAVAILABLE`); there is no path-string fallback. Structural wiring tests do not count as a protected read.

## 桌面安全中心与 Console — M4

- UI 位于 `src/ai/console-page.ts`，服务入口 `startAIConsole()` 位于 `src/ai/console.ts`。已有只读路由包括 `/api/state`、`/api/job`、`/api/policy/state`、`/api/runtime3`、`/api/agents`；写入/审批路由以服务端实际定义为准。
- 请求受 Host/Origin 与 `x-canary-csrf` 校验保护；需要 operator 的写操作继续要求 operator 权限/确认。UI 不能以本地模拟成功覆盖服务端状态。
- UI 调用 API；字段/响应变更由服务端接口 owner 更新本契约。视觉改造不得删 CSRF、认证或 origin 检查。

## E4 与证据 — M6

- 机器事件 schema 为 `SecurityEvidenceEvent` v0.1，固定 decision/status 枚举；`canonicalJSON` 定义有限 JSON 规范化，`verifyEvidenceChain(events, expectedHead?)` 检查事件链和可选预期链尾。
- `expectedHead` 必须来自独立可信来源才能检测尾部截断。无外部锚定、签名和可信时间戳时不能宣称绝对防篡改；格式/哈希验证也不证明执行隔离或所有副作用。
- E4 报告保留状态、输入 artifact/hash、工具版本和验证范围；缺少证据不得转为 PASS。schema/状态语义变更由 M6 与消费者协商。
- M6 本地提交 `bca895f` 的 bundle verifier 还逐字节比对外置 `SHA256SUMS.txt`、`report.json`、`report.md`、`raw.log` 与 ZIP 内副本；缺失或不一致均拒绝。合成 fixture 通过只证明对应验证器路径，不提升 E4 状态；真实模型、工具调用、VM/安装器范围未覆盖时继续标 `NOT_VERIFIED`。
- M6 confirmed that `SecurityEvidenceEvent` and M5 `PolicyAuditEvent` are separate schemas; current M6 code does not consume the M5 policy-audit stream. M6's Shell fixture is classified as `OBSERVED_BYPASS`, but it does not invoke the M2 binder or verify `executionSurface`; M6 tests also do not exercise M5 OBSERVE hard-deny behavior. Do not claim cross-module compatibility or E4 runtime protection from these synthetic checks.

## Windows 安装包与宿主接入边界 — M7 / M3

- M7 负责 Windows 产品安装包生成与验收。Windows CI 必须安装固定版本 NSIS 并编译安装模板；缺少编译器或编译失败都必须失败退出。只检查 workflow 文本或运行 package smoke 不代表实际执行过编译。
- M3 负责宿主配置的 preview/install/restore。baseHash 校验和保留用户后续编辑的契约，与产品安装器生命周期分开。
- 当前证据：PR #39 remote head `4267c61` has 9/9 exact-head checks and wrapper run `38596572179` has 2/2, including the pinned NSIS/template compile steps on Windows. This does not prove real user cancellation rollback. Clean-VM installation, first launch, upgrade, uninstall, and cancellation rollback remain NOT VERIFIED / HOLD until actually run and artifacts reviewed.
- M1 负责执行与 Guard 授权契约。M2 只能适配已授权的 Gateway 请求；M4 显示后端真实状态并保留 UNKNOWN/UNPROTECTED；M5 可以收紧策略但不能创建权限；M6 验证声明的证据包，但 fixture 成功不能证明运行时保护。
## Draft PR 契约

模块 PR base 为 `feature/agent-canary-3.0`，以 Draft 打开。PR 正文提供 `Test-Evidence:`、`API-Contract-Change: yes|no`；若候选接口文件变更且声明 `yes`，须同步本文件。修改共享路径还需填写 `Coordinated-with: Mx` 并关联 Issue。CI 结果由 GitHub check runs 展示，报告链接由 PR 作者提供。


## Current coordination evidence — 2026-10-15 18:24 UTC

M1 owns the `verifyRealPaths` execution contract, M2 owns the fixed-resource adapter, M5 owns policy decisions, and M9 owns cross-module composition. This checkpoint records a local owner change; the public PR/CI state remains separate.

- **M1 generic file callback:** local M1 commit `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4` (not yet pushed to PR #43) denies generic path-string `file-read`, `file-write`, and `delete` callbacks with `path_execution_not_pinned` when `verifyRealPaths:true`, including OBSERVE, before approval or callback dispatch. `false`/unset preserve legacy lexical behavior and make no canonical-path or protected-open claim. The owner reports 20/20 focused tests plus build/diff checks passing. Exact-head hosted CI is pending publication.
- **M2/M5 adapter:** PR #37 head `9db59ed8f2deae905edcb2179982f8bcb594167c` contains a fixed exact-path read adapter that forwards through M1 `agent.dispatch` to a registered Gateway file. M2's current report says the binder/backend is not wired to a first-party product host; its recorded M9 composition pins older M1/M2/M5 SHAs. Do not call the adapter a production integration or use its allowlist rejection as proof of M5 policy denial.
- **Acceptance boundary:** Issue #52 stays P0/OPEN until current exact-head M1/M2/M5 composition passes and a first-party product host is shown consuming the registered file identity with protected-open/handle evidence. Real-host enforcement and TOCTOU remain NOT_VERIFIED. Synthetic fixtures do not establish actual data exposure.
- **Native Hook:** M1's fail-closed unpinned-read contract remains `native_file_execution_not_pinned`; M3 PR #33 head `be3880298e1c6766024ecbce5f6dbc23c4d2daa1` still violates it in M9 composition run `38727481764` on both Ubuntu and Windows. M3 owns the correction and positive control; M9 owns the exact-head rerun.

## Current native-file Hook decision contract — 2026-10-17 14:11 UTC

- Ownership: M1 owns protected-file/Gateway identity and the fail-closed native-file contract; M2 owns the fixed-resource adapter; M3 owns host Hook decision mapping; M5 may strengthen policy but cannot grant a capability; M9 owns exact source pins and composition checks. Public semantic changes require the interface owner to update this contract and reviewers to use an adapter.
- Native Hook file reads/writes must remain DENY until the operation is bound to a trusted M1 Gateway capability and the same held file object is revalidated before effects. Lexical path checks or final-path containment alone are not sufficient. Reject unsupported symlink/reparse aliases and path replacement before any callback or side effect.
- The supported positive path is the fixed-resource M2 adapter dispatching through M1 Gateway; it must not reopen a user-controlled path or fall back to a generic path callback. M5 policy can deny this path, but its generic callback mode cannot substitute for held-object authorization.
- Current exact-head evidence: M1 PR #43 (9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4) denies native file operations until pinned Gateway routing with reason native_file_execution_not_pinned; M2 PR #37 (9db59ed8f2deae905edcb2179982f8bcb594167c) has the adapter seam but reports no first-party product-host integration; M3 PR #33 (be3880298e1c6766024ecbce5f6dbc23c4d2daa1) maps an in-root native Read policy ALLOW to host allow without the held-capability guard; M5 PR #47 (373e2c2c16e404ad6fc1c28170d7ccc5f5e8c13c) denies generic registered filesystem callbacks when verifyRealPaths=true.
- M3's missing component-level alias rejection is a source-level risk; a workspace symlink to a protected file has not been runtime-reproduced and actual hook activation is UNKNOWN. Do not report a confirmed bypass or exposure.
- M9 PR #36 currently has stale M1 pinning and its composition run fails the unpinned-Read deny assertion on Ubuntu and Windows. Keep #52/#55 OPEN / NOT_VERIFIED until M3 preserves fail-closed behavior and M9 passes composition on exact owner SHAs; keep #56 open until the M1-owned shared test semantics are reconciled.

## M9 source pin and owner-review reference — 2026-10-19 00:55 Asia/Shanghai

- PR #36 must pin an exact M1 source commit that M1 confirms as reviewed for the Hook/Gateway contract. At 16:48 UTC, PR #43 source head was `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4`; Issue #61 still requires M1 owner confirmation before M9 treats it as the reviewed input.
- The separate owner-review SHA recorded in Issue #61 (`f14aab781c62db60ac241d2114f543f6cac223ae`) is review evidence and must not be substituted for a source checkout pin unless M1 explicitly confirms that it identifies the same source commit.
- M9 owns its workflow and exact consumed refs. M1 owns source-contract review; M0 verifies the resulting refs and both Ubuntu/Windows composition runs. Keep #61 OPEN until this distinction is confirmed in the issue.

## M1/M2/M5 fixed-file adapter compatibility gate — 2026-10-20 21:37 UTC

**Status: owner review required; no public API change is approved by this coordination note.** M1 owns Gateway registration and held-object enforcement; M2 owns the fixed-resource adapter; M5 owns policy classification, approval, and callback dispatch; M9 owns exact-head composition. Other modules must use an owner-approved adapter at their boundary.

### Verified current seams

- M1's Gateway accepts a trusted constructor-time GatewayOptions.files list and exposes agent.dispatch. The M2 adapter forwards an exact relative path through gateway.agent.dispatch({ name: "read_file", args: { path } }, signal) after checking its private fixed tool-to-path map.
- M2's adapter exposes policy descriptors as { operation: "file-read", pathArg: "path" }. Its descriptor does not expose a separate bound-resource capability to policy preflight.
- Current M5 PR #47 behavior with verifyRealPaths: true denies path-bearing filesystem operations as path_execution_not_pinned before executeRealTool. Therefore the existing M2 path descriptor cannot be assumed compatible with current strict M5 policy dispatch. Do not turn off strict mode or add a generic path callback to work around this.
- M2's check-security-gateway-adapter.mjs creates synthetic files/aliases and an SDK Gateway in its checkout. It proves that fixture's path allowlist and Gateway dispatch behavior; it is not evidence of a first-party product host consuming the adapter or of current PR #47 integration.
- M2 source search found the adapter definition and test plus an SDK demo, but no selected product-host consumer in the examined M2 source paths. Host adoption remains NOT_VERIFIED.

### M9 integration acceptance contract

1. The supported host/build entrypoint must be named and shown constructing a single immutable host manifest that binds each allowed resource to the same exact relative path registered with M1 Gateway and the M2 adapter.
2. M5 must receive an owner-approved representation that identifies that trusted binding before policy/approval decisions, without trusting a model-supplied path or arbitrary capability token. M5 retains deny/approval authority; only the M1 Gateway can authorize and open the registered file.
3. After approval, the M2 adapter must dispatch only the exact registered operation through M1 Gateway; it must not reopen a user-controlled path or fall back to a generic callback. Alias, replacement, stale-manifest, and mismatched-registration cases must fail before side effects.
4. M9 must test the actual selected host composition at exact M1/M2/M5 commits and show denial, callback/approval counts, unchanged fixture bytes, and held-file identity behavior. Synthetic SDK-only fixtures remain supporting evidence, not host acceptance.

If compatibility needs a public type or behavior change, M1 changes Gateway APIs, M5 changes policy/router APIs, or M2 changes its adapter API within its own ownership; the other modules adapt through their owned boundary and update this contract after review. Until then, strict path-based DENY is the safe behavior and #52 remains OPEN/P0/NOT_VERIFIED.

### M9 source-scope status — 2026-10-21 07:36 UTC

- M7 ACCEPTed `b0581407def769946fa710f55cd1d0986ce0cf3b` as the M7 packaging-source reference only. M7 owns packaging/build invocation and reliability paths; M6 owns E4 verifier/evidence semantics. M9 still needs a final composed SHA and exact-tree packaging, auto-E4, and integration checks.
- M5 `99ab80770d8004ef85f13f2d5c0f48f934607603` has M1 source-scope acceptance in Issue #61 comment `6309875503` and exact-head CI success in run `39558618457`; this is eligible as a source input, not whole-tree composition approval.
- M2 local `d054cee` remains unpinned until M1's explicit review and exact-head hosted CI are available. Strict `verifyRealPaths:true` denial remains fail-closed; neither the local synthetic adapter fixture nor the current M2 branch establishes a first-party product-host safe-read path.

## Current Hook adapter contract and M9 byte-check boundary - 2026-10-21 09:06 UTC

- M1 owns the canonical sanitized Hook wrapper contract. Its current approved source blob is d6f93249306b7966259cab463dd39475728ef338.
- M8 PR #40 at 2d5a0ffe1e93dcc93673a3fd2de5a6bf71ac09d3 carries distinct adapter blob 544b5eb76633469b7185c4ea77d85d7f1754393e. M1 explicitly accepted this exact blob as a distinct logging/consumer adapter in Issue #65 comment 6308270032. This is not byte-identical to the canonical M1 copy by design.
- M8's adapter must preserve permissionDecision. Any reason normalization is fixed display/consumer metadata only; it must not infer, grant, or alter authorization.
- M9 must require byte equality only for copies that are approved as canonical. For M8, pin the exact M1-reviewed blob and assert the M8 contract through its behavioral and log-schema tests. Keep the M8 provenance, LF checkout, JSONL allowlist, and canary checks.
- At M9 PR #36 head 72249c617687571f88f5c3a8a688245cbace65e6, exact Ubuntu/Windows run 39573535645 failed only the broad equality assertion at test/m9-cross-module-composition.test.mjs:50; the M8-specific provenance/LF/JSONL step passed. This identifies a composition-test scope defect, not a confirmed log leak. Preserve all fail-closed, redaction, and canary assertions while correcting the owner-approved variant boundary.
- M7's hosted Setup.exe extraction evidence at PR #39 head 9330005b2e15c521b9645a728d34e9477d8d6340 confirms the package's extracted Hook Git blob equals the M1 canonical blob; its controlled package harness passed without executing the installer. See Issue #53 comment 6312265610.

This current note supersedes older dated M9 status and Hook-copy statements in this file where those statements imply that M8's owner-approved adapter must be byte-identical to M1 canonical.
## Candidate fixed protected-read host composition — 2026-10-22 16:26 UTC

This records a reviewed candidate seam for M9 composition; it does not freeze a new public API or close Issue #52.

- **M3 host tool:** fixed tool ID `protected_read`; fixed temporary probe path `agent-canary-public.txt`; the request must have exactly one own data property, `path`, with that exact value. M3 owns the host callsite and rejects aliases before the M5 callback.
- **M1 Gateway:** required owner methods are `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability`. A held-file capability remains opaque and bound to the registered tool/path and object identity. Missing methods produce `UNKNOWN`; no generic path callback is permitted.
- **M2 package boundary:** import the public `@dorianchn/agent-canary/gateway-adapter` subpath and call only exported `createSecurityGatewayHostAdapter`. The re-reviewed M2 candidate's packed artifact includes only `execution-isolation/gateway-adapter/gateway-adapter.mjs`; its low-level implementation is absent. M1 ACCEPTED this exact package boundary WITH CONDITIONS: the trusted host must supply the actual M5 router factory.
- **M5 policy router:** trusted host supplies its owned `createSecurityToolRouter` and fixed router options including `mode: OBSERVE` and `verifyRealPaths: true`. Do not let model input select the router factory, callback, path map, or capability. OBSERVE never bypasses M1 containment.
- **M9 acceptance:** compose exact public M1/M2/M3/M5 refs; prove a registered held-file positive read; prove alias and same-path inode replacement deny before callback/evidence/effect with unchanged bytes; exercise missing interfaces and malformed arguments as fail-closed/UNKNOWN. A source-composition pass is not production-host interception or OS-atomic TOCTOU evidence.

## M9 candidate readiness — 2026-10-22 16:26 UTC

- Current M9 branch/PR #36 remains at `6c9c794a83e3a3e8a1948661ae1e96728406a4d6`; do not refresh pins yet.
- Candidate M2 `be66cf8f4c1a60f093740577796ec5cd633e1d93` has M1 package-boundary acceptance with conditions but is local, not public/hosted-CI validated. Candidate M3 `429cd73c03273bc77f3781b489f541e396cd9361` is local and its own branch deliberately reports UNKNOWN while owner interfaces are unavailable; its focused build/tests pass, but exact combined-source host validation remains M9 work.
- M7 owns the one-file package checker adaptation in its existing PR #39 branch. M9 must use the checker and manifest together in an isolated exact-source composition after all candidate refs are published and current checks pass. Keep #52 OPEN/P0/NOT_VERIFIED until host-facing positive/negative controls pass; keep #41/#45/#57 at their separate HOLD/NOT_VERIFIED boundaries.

## Current M4/M5 host-adapter contract — 2026-10-21 19:16 UTC

**Status:** source-verified contract for integration review; this note does not approve a public API change. Preserve the M1 capability boundary and use the M2 facade as the only adapter.

### Ownership

- M1 owns registration and issuance of the opaque held-file capability from the Gateway.
- M2 owns the fixed tool/path map and `createSecurityGatewayHostAdapter` facade.
- M5 owns policy decisions and forwarding of M2's `fileReadCapability` through the host callback context.
- M0 ownership ruling (2026-10-22): M3 owns the backend/host route and capability binding in `src/ai/console.ts`; M4 owns the Security Center UI and UI-side status adapter in `src/ai/console-page.ts` / `src/ai/security-center-adapter.ts`, consuming the M3 route. M4's local Gateway/router is not evidence of M1 capability use.
- M9 owns immutable exact-source composition and cross-module verification.

### M2 facade input contract

`createSecurityGatewayHostAdapter` accepts `gateway`, `fixedFileReads`, `createSecurityToolRouter`, and `routerOptions`. `routerOptions` must set `mode: "OBSERVE"` and `verifyRealPaths: true`; the caller must not supply `tools`, `executeRealTool`, or `fileReadCapability`. M2 injects those reserved fields from its fixed tool/path map and the M1 Gateway. The facade then exposes only `dispatch` and `pendingApprovals`.

M5's `createSecurityToolRouter` must accept the injected `fileReadCapability` provider through router options and preserve the resulting capability context to its reserved `executeRealTool`. M2's reserved executor re-verifies the exact tool/path and opaque M1 capability, then calls M1's `readFileWithCapability`; the host cannot replace this file-read executor with a generic callback. A sensitive alias, workspace escape, mismatched capability, replaced path, or stale capability must deny before approval creation, callback dispatch, or file effect. Expected denial evidence must remain accurate without recording raw file contents or secrets. A registered safe file is the positive control.

### Current branch compatibility blocker

At M4 PR #34 head `803a015f3e97ae69b7adeb4411f93defc0a06cfe`, `src/runtime/gateway.ts` blob `02cf0ec02c75e0368d70472038af892b1280a21f` differs from M1 PR #43's blob `40bfe437ea70f0cc21a5a5dbc2bcdf304f0d486c`. M4's `src/security-router.ts` has no `fileReadCapability` support, and the M4 checkout's `package.json` exports only `./sdk`; however, exact M2 PR #37 head `be66cf8f4c1a60f093740577796ec5cd633e1d93` adds the public `./gateway-adapter` export and includes the adapter file in its package allowlist (package blob `1853295866fd313163e7968027b88b4c6d1b39d7`). The M2 public boundary is therefore available in its candidate and must be included by M9 composition; it is not accurate to claim the current M2 candidate lacks a public export. M4's local `runtime/demo.ts` and virtual `ai/policy-demo.ts` still do not prove first-party use of the M1/M2 contract. Do not copy M1/M5 implementations or claim compatibility by matching function names. Validate the contract in an exact-source composition that includes the reviewed M1, M2, M3, M4, and M5 commits.

## Current #52 owner and desktop status interface — 2026-10-22 06:04 UTC

This routing supersedes the earlier tentative route-owner note. It assigns files only; it does not transfer Gateway, adapter, or policy semantics.

- **M3 backend owner:** `src/ai/console.ts` owns the read-only `GET /api/security-center` handler and composes the M3 protected-host adapter with exact M1/M2/M5 owner APIs. M3 also owns its host probe and denial checks.
- **M4 consumer owner:** `src/ai/console-page.ts` and `src/ai/security-center-adapter.ts` own the Desktop Security Center consumer, normalization, display, and UNKNOWN behavior. M4 consumes the M3 route and does not implement Gateway/policy internals.
- **Status payload:** optional top-level fields are `protectionStatus`, `gateway.{protectionStatus,connectionStatus}`, `hook.protectionStatus`, `canaryIsolation.protectionStatus`, `policy.{protectionStatus,name}`, `protectedToolCount`, `unprotectedExecutionPaths`, and `agents[]` entries `{agent,detected,connectionStatus,protectionStatus}`. Status values use the M4 adapter enums; absent/invalid/unavailable data stays UNKNOWN. Counts must be non-negative safe integers. `unprotectedExecutionPaths` may contain only stable non-sensitive identifiers or coarse labels, never absolute user paths, arguments, file contents, secrets, or tokens.
- **Evidence boundary:** the route is read-only and does not execute an Agent action. It must not infer live protection from the Console sandbox, historical events, configuration presence, or the temporary demo. E4 status remains on the separate M6/M7-owned `/api/e4/status` contract. Native Codex Shell stays `UNPROTECTED / BLOCKED_NOT_VERIFIED` unless its own host enforcement is independently verified.
- M1 continues to own opaque held-file capability issuance/verification/read behavior; M2 owns the public `@dorianchn/agent-canary/gateway-adapter` export and fixed tool/path map; M5 owns strict `OBSERVE` policy/provider semantics; M9 owns immutable exact-source composition and verification. M3/M4 use these contracts through their adapter boundary and do not change their APIs.
- Exact candidates at this update: M1 PR #43 `7279336307fc7aacd46119405858d4fd91499757`; M2 PR #37 `be66cf8f4c1a60f093740577796ec5cd633e1d93`; M3 PR #33 `429cd73c03273bc77f3781b489f541e396cd9361`; M4 PR #34 `803a015f3e97ae69b7adeb4411f93defc0a06cfe`; M5 PR #47 `bbce79aa086b39b51422cc72471c23c963778650`. #52 stays OPEN/P0/NOT_VERIFIED until the unified source route proves a safe positive read and alias/replacement denials with zero side effects.

## P0 #52 exact public route boundary — 2026-10-22 12:40 UTC

- M2 PR #37 exact head `be66cf8f4c1a60f093740577796ec5cd633e1d93` exports `./gateway-adapter` to the allowlisted `execution-isolation/gateway-adapter/gateway-adapter.mjs` (`package.json` blob `1853295866fd313163e7968027b88b4c6d1b39d7`). The module exports `createSecurityGatewayHostAdapter(options)` (adapter blob `2962466f7d2a24a22aac10e9990659deb7d20625`). Use the public package subpath; M3's uncomposed branch does not already carry this package-export change.
- M4 PR #34 exact page blob `017c90923322bf2b52b0ddf2f00eca99471428d2` requests `GET /api/security-center`; M3 PR #33's current Console backend blob `236073a4bdce5c1b3b0c377600c6dbdf61afe3cd` has no corresponding handler. M3 owns the backend handler/capability binding; M4 owns the UI consumer and keeps absent data UNKNOWN.
- M9 head `7c8d808` verifies a synthetic M1 Gateway + packed M2 facade + pinned M5 strict-router composition. It does not verify the first-party Console host path or OS-atomic TOCTOU. Keep #52 OPEN / P0 / NOT_VERIFIED until both route wiring and exact safe-positive/alias/replacement denial controls pass.

## Held-file capability consumption — 2026-10-22 13:00 UTC

M1 PR #43 exact `src/runtime/gateway.ts` blob `40bfe437ea70f0cc21a5a5dbc2bcdf304f0d486c` exposes a branded opaque `GatewayFileReadCapability` with `bindFileReadCapability`, `verifyFileReadCapability`, and `readFileWithCapability`. The capability is bound to the issuing Gateway, registered tool/path/resource and held file; the held descriptor is revalidated before content access. M5 PR #47 exact `src/security-router.ts` blob `cbcf4889adb8f7926fd61c7ca291d9899a5d2d7e` requires `verifyRealPaths: true` for the strict OBSERVE path and forwards the optional capability context to its executor. M2's public facade owns the adapter boundary and injection. M3 must consume these contracts through the public M2 facade; it must not construct/serialize capabilities, copy internals, or fall back to path-only reads.

## P0 #52 status provider contract — 2026-10-22 14:46 UTC

- **M2 PR #37 public candidate at exact head `23d1647151119eab02cf752a1bd34cfad197cb9c` (CI `39799086549` queued):** `host.securityCenterStatusProvider()` returns a read-only snapshot from the M2 Gateway host adapter. It checks only registered fixed-file bindings by verifying each opaque M1 capability for its exact call and asking M5's side-effect-free `inspectPolicy(call)` under OBSERVE. It must never call `dispatch`, approval creation, tool callbacks, or file reads.
- **Scope and status:** `coverage` is `M2_FIXED_FILE_READS_ONLY`; the aggregate `protectionStatus` is at most `PARTIALLY_PROTECTED`. Hook, Canary isolation, and all unmeasured execution paths stay `UNKNOWN`. A replaced/stale capability must no longer count as protected. No absolute paths, arguments, file contents, secrets, or tokens are returned.
- **M3 consumer:** pass the provider only when a real trusted host adapter exists. Existing `GET /api/security-center` defaults to UNKNOWN when no provider is supplied; provider failure/unavailable data must remain unavailable/UNKNOWN at the UI boundary. Do not substitute a demo/probe or manufacture a Console host.
- **Current blocker:** M3 `src/ai/cli.ts:51` starts Console with port and credentials only. Its configuration has no trusted workspace root, fixed file map, or callbacks, and this startup does not construct M1 Gateway or M5 router. Therefore the M2 provider cannot yet be injected into the first-party Console safely; the route must remain UNKNOWN until M3 has an actual host composition.
- **Acceptance remains open:** M9 must test an exact-source first-party host with one registered safe read plus sensitive-alias and path-replacement denials before approval/callback/read, zero side effects, and unchanged original bytes. P0 #52 remains OPEN / NOT_VERIFIED; this adapter snapshot is not product-host protection evidence by itself.

## 2026-10-23 current public subpath ownership — P0 #52

- **M1 `@dorianchn/agent-canary/sdk`:** canonical Gateway and opaque held-file capability issuance, verification, and read. M1 owns these semantics.
- **M2 `@dorianchn/agent-canary/gateway-adapter`:** fixed tool/path map and host adapter; it injects the M1 capability into the policy router and re-verifies before read. M2 owns this adapter boundary.
- **M5 `@dorianchn/agent-canary/policy-router`:** added in M5 PR #47 commit `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`. This is an additive public export of the current strict router and its risk-policy context. It preserves the pre-existing `./sdk` and `./policy` exports and avoids two different implementations claiming the same subpath. M5 owns policy/router semantics.
- **M3 Console loader:** M3 PR #33 commit `b85c4ad4de92fdcdf48e65e664c149b9de347b4f` now loads M1 Gateway from `./sdk`, M5 router from `./policy-router`, and M2 facade from `./gateway-adapter`. If M5 or M2 export is absent, it must return sanitized UNKNOWN before creating a probe, Gateway, router, or callback; it cannot fall back to a legacy router, private import, path-only read, or hand-built shim. M3 owns this host route and loader.
- **M3 status route:** the read-only `GET /api/security-center` is separate from protected-read execution. Without an explicitly injected trusted M2 status provider, it returns UNKNOWN; a missing or invalid CSRF credential follows the existing Console `403` contract and must not call the provider. Query parameters cannot trigger a provider call or Agent action.
- **M4 status consumer:** M4 PR #34 commit `7fe375d75ea8ca219abcae2e5cbc40d7b1b2e33b` consumes only `GET /api/security-center`. It validates the payload, redacts absolute paths and free-form policy names, bounds waiting to 8 seconds, and normalizes missing/unauthorized/error/malformed responses to UNKNOWN. Partial `M2_FIXED_FILE_READS_ONLY` coverage cannot render overall PROTECTED; even a received PROTECTED value is downgraded to UNKNOWN until M9 verifies the exact route. The page must not call the protected-read POST or execute Agent actions.
- **M9 exact-source gate:** M9's 12-case candidate run passed with M1 `e8be92d`, M2 `6742813`, M3 `b85c4ad`, M4 `4bd9822`, and M5 `8d1b832`. Review then found M1 Gateway was loaded directly from source `src/sdk.ts` instead of the public `@dorianchn/agent-canary/sdk` package export. That run does not establish public-export resolution. M9 must rebuild and rerun the ordinary no-injection route plus fixed-marker positive, denial, alias, replacement, and zero-side-effect controls with M1 loaded through the exact public package subpath before recording final composition.
- **Acceptance boundary:** M3-only missing-export behavior is fail-closed UNKNOWN. Synthetic fixed-marker composition is not product-user-file, live Desktop UI, or OS-atomic TOCTOU evidence. M4 has no caller for the protected-read route. Keep Issue #52 OPEN/P0/NOT_VERIFIED until the latest exact-source route and all deny controls pass, and keep product/UI protection claims separate from synthetic evidence.

## M3 fixed protected-read probe API — 2026-10-23

- **Owner and route:** M3 owns the additive `POST /api/security-center/protected-read` handler and its construction-time dependency seam in `src/ai/console.ts`. The existing `GET /api/security-center` remains a status-only API. The M4 page consumes only GET and must not call this POST or execute an Agent action.
- **Request boundary:** the POST requires the Console's same-origin/Host/Origin and CSRF checks, a configured operator code in `x-canary-operator-code`, and a JSON body exactly equal to `{}`. Invalid or missing authorization and any extra body field are rejected before probe dependencies or file I/O; no caller-supplied path, workspace, tool, callback, or marker is accepted.
- **Probe composition:** the default loader resolves only the public M1 `./sdk`, M2 `./gateway-adapter`, and M5 `./policy-router` package subpaths. It creates one process-owned file with a fixed marker under a verified temporary directory and reads it through the M1/M2/M5 owner path. It then checks the fixed lexical alias and same-path replacement denials, requiring the denied controls to add no M5 callback or M1 read evidence. Missing owner exports, unclassified failures, mismatched evidence, or cleanup failure remain `UNKNOWN`; only an explicit owner denial of the positive read returns `DENY`.
- **Response and evidence limit:** the response is limited to `{scope: "M3_FIXED_TEMP_PROBE_ONLY", status, reason, markerMatched}` with `status` in `PASS | DENY | UNKNOWN` and a fixed reason enum. `PASS` means only that this synthetic temporary-marker positive and denial-control probe completed; it does not establish product-file, installed Hook, native-host, or OS-atomic TOCTOU protection. No path, file bytes, exception text, raw Gateway evidence, secrets, or tokens are returned.
- **Integration gate:** M9 must resolve these public package subpaths from the exact built package and run the ordinary no-injection route, positive marker, alias denial, replacement denial, zero-side-effect, and cleanup controls. Keep Issue #52 OPEN/P0/NOT_VERIFIED until those exact-source checks pass; do not use this route to raise the M4 UI's protection status.

## M5 STRICT held-file read default — 2026-10-23

- In `mode: STRICT`, every file-read decision requires a host-bound M1 held-file capability whether `verifyRealPaths` is omitted, `true`, or `false`. A missing capability is a deterministic denial before review hooks, approval creation, or generic pathname callbacks.
- When the capability is present, M5 forwards the opaque context through the trusted M2 host adapter to M1's `readFileWithCapability`; callers cannot authorize a STRICT read through a path-only callback.
- `verifyRealPaths: false` retains its legacy behavior in BALANCED mode. These checks establish the M5 router contract only; first-party host wiring, packaged-consumer behavior, and OS-atomic TOCTOU remain separate M9/product acceptance gates. Keep Issues #79 and #52 open until their exact-source and hosted checks pass.

## M3 configured protected-target host contract — 2026-10-24

- **Owners:** M3 owns the Console/CLI host route and fixed target bindings. M0 owns this shared contract text. M4 shares `src/ai/console.ts` coordination metadata but its desktop page remains status-only and does not call the execution route.
- **Configuration:** `agent-canary ai console` accepts `--workspace-root <directory>` and repeatable `--protected-target <id=relative-path>`. The host validates the allowlist during startup, binds each target to a host-generated tool name and relative path, and keeps the mapping in process memory. Requests cannot supply a path, tool name, workspace, or callback.
- **Route:** `POST /api/security-center/target-read` uses the Console's same-origin/Host/Origin, CSRF, JSON, and operator-code checks. The only accepted JSON shape is `{ "targetId": "<configured-id>" }`; the ID must select one startup-bound target. Unknown, malformed, blocked, duplicate, or unauthorized targets fail closed.
- **Owner chain:** the host creates the M1 Gateway and held-file capability, passes the immutable fixed map through M2's public `./gateway-adapter`, and configures M5's public `./policy-router` with `mode: "OBSERVE"` and `verifyRealPaths: true`. Missing exports, invalid paths, unavailable owner APIs, or failed capability checks cannot fall back to path-only reads.
- **Response:** the route returns only `{ "scope": "M3_CONFIGURED_TARGET_READ", "status": "ALLOW" | "DENY" | "UNKNOWN" }`. File bytes, absolute paths, relative paths, arguments, exception text, secrets, and tokens are not returned. `ALLOW` means the configured held-file dispatch completed with one M5 callback; it does not prove OS-atomic TOCTOU protection or installed Hook enforcement.
- **Acceptance:** M3's focused CLI/source fixtures and exact-source M9 Ubuntu/Windows run `40066875122` provide source-composition evidence for the configured-target route and its safe-read, sensitive/alias/junction, and path-replacement controls. Required product evidence is still outstanding: M3/M4 owner disposition, shipped-package/runtime proof, and any native-host/OS-atomic TOCTOU claim. Keep Issue #52 OPEN/P0/NOT_VERIFIED until those scoped gates are accepted.

## Current cross-module contract matrix — 2026-10-24 10:14 UTC

Public semantics remain owned by the module that implements them. This matrix records the current boundaries and evidence limits; it does not change runtime APIs. Other modules adapt at their owned edge and must not copy or weaken another owner's implementation.

| Contract | Owner boundary | Required behavior at the seam | Current acceptance / issue |
| --- | --- | --- | --- |
| Gateway protected file | M1 owns held-file identity/capability and final authorization; M2 owns the fixed-resource host adapter. | M2 forwards only an M1-issued, revalidated capability for a startup-bound target. Path strings, aliases, stale/replaced files, and workspace escapes deny before approval, callback, or file effect. | Exact source tests passed in M9 run `40066875122`; shipped host adoption and OS-atomic TOCTOU remain NOT_VERIFIED (#52). |
| Hook and packaged payload | M1 owns canonical Hook decision/redaction semantics; M3 owns host mapping; M7 owns Windows package wiring. | Emit only the reviewed Hook result fields and `allow|deny|ask`; sanitize caller-controlled reasons; fail closed on invalid input, timeout, or persistence failure. The packaged Hook must use reviewed M1 bytes. | Installed package stdout/log redaction remains NOT_VERIFIED (#93); source parity alone does not close it. |
| Policy and Canary | M5 owns policy classification/audit; M1 owns Guard/Canary security semantics. | `OBSERVE` may skip optional approval only for registered non-sensitive actions; it cannot override explicit DENY, sensitive-data rules, containment, or missing M1 capability. Canary output is structured and must not log raw sensitive values. Policy audit and M6 security-evidence events remain distinct schemas. | Synthetic policy/Canary checks do not prove product host effects; #52/#93 remain open. |
| Configured target and desktop UI | M3 owns the configured-target CLI/route; M4 owns the desktop status consumer. | Bind `id=relative-path` at startup; POST accepts only a configured target ID and returns status only. M4 consumes the read-only status endpoint and does not invoke the execution route or promote a synthetic probe to PROTECTED. | Exact source composition passed once at `40066875122`; shipped runtime and product-host acceptance remain NOT_VERIFIED (#52). |
| E4 evidence | M6 owns `SecurityEvidenceEvent` v0.1, canonicalization, chain verification, and bundle schema. | Verify supplied artifact/hash/provenance; require a trusted external expected head for truncation claims. Do not equate M5 `PolicyAuditEvent`, fixtures, or build success with product E4. | Independent product artifact/operator receipt is absent; #57 remains OPEN/P1/NOT_VERIFIED. |
| Windows installer lifecycle | M7 owns package production and lifecycle harness; M6 owns evidence semantics; M0 schedules the exclusive resource. | Producer and consumer checksum path lists must match exactly and in order, with duplicate/path/regular-file/hash/source checks retained. Lifecycle execution requires an explicit reserved slot; automatic PR dispatch without serialization is not accepted. | Current producer emits 11 paths while consumer allows 7; the last hosted lifecycle stopped before Setup.exe. #41 OPEN; #29 is the reservation ledger. |
| M9 source composition | M9 owns immutable source pins and the composition workflow/test; module owners retain implementation paths. | Validate exact intended M1–M8 refs on Ubuntu and Windows. A skipped job is missing evidence, never a pass. | Current workflow admits manual dispatch or PR #36 and checks out PR #36; other current-ref PR events skip (#76 OPEN/P1). |

## Current configured-target contract status — 2026-10-24 09:21 UTC

## M0 current contract precedence — 2026-10-24 10:15 UTC
The cross-module matrix above is the current owner/contract map. Repeated 09:21 headings and older dated entries are retained as historical snapshots; use the 10:14 matrix where they differ, including the fact that M3's configured-target route exists while installed-package, native-host, and OS-atomic acceptance remain open.

## AC3 immutable common-source floor — 2026-10-25

M0 records `e4732d9745bb4fbbebf6896a35b4657ad82abd73` as the approved immutable common-source baseline in `scripts/ac3-ownership.json`. For each coordination check, both the event's actual current feature base and the exact PR head must descend from this baseline. The check also runs `git merge-tree --write-tree` against those exact base/head commits and records both SHAs plus the resulting composition tree; missing or invalid baseline data, wrong lineage, unavailable commits, and merge conflicts fail closed. This permits a clean manifest-only feature advance without requiring every module head to absorb a self-moving feature tip.

The current feature tip remains the actual comparison and merge-tree input. M9's exact source pins, exact owner-approved blobs, sensitive-path policy, and required API/evidence fields remain unchanged and exact; post-merge CI remains required. This source-lineage rule does not alter or weaken Gateway, Hook, or policy security semantics.

### Immutable test-merge base versus webhook base (M0/M9, 2026-10-25)

A reopened PR can retain an older `pull_request.base.sha` even though its actual GitHub test-merge first parent is the new feature tip. Both values must be recorded separately. AC3 checks out the exact `github.sha` test merge, requires exactly two parents and second-parent equality with the event head, then composes its first parent with that frozen head. The event base must be an ancestor of that first parent. Missing merge metadata, wrong checkout/head, unrelated base or actual merge conflicts fail closed. M9 uses the equivalent immutable parent contract before selecting its source checkout; strict manifest PR/ref/head and owner acceptance remain unchanged. Reopening alone is never evidence of a refreshed base.

## 2026-10-27 — M3 to M4 configured-target metadata proposal (owner decision pending)

M4 PR #121 reports that the existing configured-target POST route is not discoverable from the desktop page because the status snapshot exposes neither trusted target IDs nor operation/auth readiness. This entry records the proposed handoff contract; M3 remains the interface owner and has not approved or implemented it yet.

- M3 should expose only immutable configured target IDs and operation/auth readiness from the same startup manifest. Define schema, unavailable/error states, and freshness semantics with M4 before implementation.
- The discovery response must not expose paths, file bytes, credentials, held capabilities, or model-controlled target choices. The UI must remain disabled and `UNKNOWN` when metadata is absent, stale, or malformed.
- M4 may adapt the owner-approved metadata at its boundary, allow an operator to choose among fixed IDs and explicitly trigger the existing read route, and render only the documented status/scope result. It must not infer product/native/OS protection from a route result.
- Acceptance remains separate: metadata/schema tests; actual authorized host read using the M1-bound capability; sensitive alias, junction, replacement and TOCTOU denials before effects; independent E4/installed-product evidence. P0 #52 remains OPEN/NOT_VERIFIED until the host identity and effect criteria are met.

Handoff was posted on M3 PR #120, M4 PR #121 and P0 #52. This M0 documentation does not authorize M0 to alter the shared API or module implementation.
