## M0 ownership risk delta — 2026-10-15 21:16 UTC

- **M0/M1 PR scope overlap (#56, P2):** PR #30 currently lists M1-owned `test/agent-hook.test.ts`; PR #43 also changes the same canonical path. M1 owner approval is not visible in the PR #30 timeline. No runtime failure is established, but the M0 scope statement and changed-file list differ. Keep #30 Draft until the M1-owned path is removed from the M0 diff or an explicit M1-reviewed exception and accurate PR scope are recorded.
- **M3/M7/M8 activity:** no owner reply or PR-head movement was visible by 21:12. Existing M3 and M7 sessions accepted follow-ups at 21:16; evidence/blocker is due 21:32. This is delivery evidence only, not start/completion evidence.

## M0 risk delta — 2026-10-15 21:06 UTC

- **#55 P1 / M3-to-M9 native Hook contract:** run `38727481764` failed the same unpinned normal `Read` assertion on Windows (`116396823551`) and Ubuntu (`116396823888`): expected `deny`, actual `allow`. The M9 run pins older M1 `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc`, not current M1 PR #43 `9ef3dc265f9f386508bbeec7ff6d9a264ab1a0a4`; current-head compatibility is NOT_VERIFIED. Require the M3-owned `native_file_execution_not_pinned` denial, unchanged M1 deny assertions, supported-capability positive control, and exact-head M9 rerun. M0 comment `6202315177`; owner evidence/blocker due 21:12 UTC.
- **Local module isolation:** the coordinator clone currently contains only the coordinator Git worktree; `main`, `agents`, and `integration` are empty. Other module worktree paths remain UNKNOWN.
- PR #24 remains OPEN/Draft and unchanged. Usage tab remains open/readable above the stop threshold. Last M0 branch push 20:58 UTC; next push no earlier than 21:19 UTC.

## Current integration risk snapshot (2026-10-15 20:52 UTC)

The following evidence is current as of the M0 checkpoint. Green source CI does not establish product-host, packaged-artifact, installer, or independent E4 acceptance.

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Product-host protected file execution (#52) | P0 | M5 alias-denial changes are in PR #47 and exact-head CI passes 9/9. M2 has no first-party host consumer; selected-host protected-open/held-handle, current M1/M2/M5 composition, and TOCTOU remain NOT_VERIFIED. | Verify a selected supported host consumes M5 → M2 → M1 against sensitive, alias, and path-replacement cases; then pass exact-head composition. |
| Packaged Hook log privacy (#53) | P0 | No real pinned Setup.exe/payload, manifest, extracted-Hook byte comparison, or extracted-harness canary evidence is recorded. No real-world disclosure is claimed. | M7/M8 provide exact artifact hashes and extracted-harness results; independently verify reachable package copies and retain external E4 as a separate gate. |
| Native Hook unpinned read (#55) | P1 | M3 head be388029 allows where M1 requires native_file_execution_not_pinned denial; M9 composition run 38727481764 fails Ubuntu and Windows. | M3 corrects its owned branch, preserves M1 denies and a supported-capability positive control; M9 reruns both platforms on exact SHAs. |
| Quarantine retry exhaustion (#51) | P1 | M4 run 38698635434 has one actual Ubuntu Node 20 failure after 500 STATE_STORE_BUSY retries; four jobs were cancelled, package-smoke skipped. Root trigger UNKNOWN; no data loss shown. | Preserve retry behavior/assertions; require lock-holder/timing evidence or owner disposition before product changes. |
| Native Codex Shell (#45) | P1 | Actual Desktop Shell remains UNPROTECTED / NOT_VERIFIED. | Keep the visible boundary until supported-host denial is demonstrated. |
| Installer lifecycle (#41) | P1 | Clean-VM lifecycle remains NOT_VERIFIED. | Reserve the exclusive VM slot and record install/upgrade/uninstall/cancel outcomes before PASS. |
| Independent external E4 | P1 | M6 tool and CI checks pass; independent external validation remains NOT_VERIFIED. | Require independent run and artifacts. |
| Windows Node 22 AI retry (#54) | P1 | Current M9 Windows Node 22 product check passes; historical 503 retry trigger remains UNKNOWN. Full M9 composition is separately blocked by #55. | Preserve bounded retries and diagnostics; assign provider/transport source ownership before any future source edit. |
| Local module worktree isolation | P2 / M0 | Only coordinator worktree is visible to Windows Git; WSL is unavailable and agents/ is empty. Other module worktree paths remain UNKNOWN. | Obtain exact paths/branches from owners before claiming local isolation. |
| PR #24 / Release boundary | M0 | PR #24 remains OPEN/Draft and unchanged; no main merge or Release. | Preserve no-merge/no-Release boundary. |

Assigned lanes are M3 #55 and M7/M8 #53; task start is not independently verified. No VMware, real-model, or installer task is running/reserved. The Usage page remains open and readable above the stop threshold. Next M0 push no earlier than 20:58 UTC.

## Archived integration risk snapshot (2026-10-15 18:52 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Product-host protected file execution (#52) | P0 | M1 has an internal held-descriptor Gateway; M2 adapter report says no first-party host is connected. Native-host trial is BLOCKED with zero protected cases. Current exact-head composition, host protected-open, and TOCTOU are NOT_VERIFIED. | Install a selected supported host and verify M5 → M2 → M1 identity/handle enforcement against sensitive, alias, and path-replacement cases; then pass exact-head composition. |
| Packaged Hook-log reachability (#53) | P0 | M7/M8 source/wrapper checks pass and Hook blobs match; no real Windows payload/Setup.exe or extracted-Hook artifact was verified. Shipped artifact reachability and independent E4 are NOT_VERIFIED. | Build from pinned integrated source, record package SHA/manifest, compare extracted Hook bytes to the canonical blob, and run sanitized canary checks from the extracted harness. |
| Native M3 unpinned Read (#55) | P1 | M1 denies; M3 head be38802 allows in M9 run 38727481764 on Ubuntu and Windows. | M3 correction on its existing PR, preserve M1 denies, add supported-capability positive control; M9 repins and passes both platforms. |
| Quarantine retry exhaustion (#51) | P1 | M4 run 38698635434 failed one Ubuntu Node 20 worker after 500 STATE_STORE_BUSY retries. M1 x10 Node 20/22 did not reproduce; trigger UNKNOWN. | Keep retry behavior and assertions; require a failure trace or owner disposition before any production change. |
| Native Codex Shell (#45) | P1 | UNPROTECTED / NOT_VERIFIED on actual Desktop host. | Preserve user-facing boundary until supported-host enforcement is demonstrated. |
| Clean-VM installer lifecycle (#41) | P1 | NOT_VERIFIED. | Reserve the exclusive VM slot before installation testing; record sanitized evidence. |
| Independent external E4 | P1 | NOT_VERIFIED. | Preserve this state until an independent external run and artifacts exist. |
| PR #24 / Release boundary | M0 | PR #24 OPEN/Draft, unchanged at 62496d4; no main merge or Release. | Preserve the existing no-merge/no-Release boundary. |

# M0/M9 集成风险登记

## Current integration risk snapshot (2026-10-15 16:44 UTC)

This table supersedes the older snapshot below. Exact-head CI covers the listed source state; it does not establish actual host interception, shipped-package reachability, installer lifecycle, or independent E4.

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| M1/M3 native Hook read contract (#55) | P1 | M1 #43 `7d6f091` denies an unpinned native `Read`; M3 #33 `be38802` allows it. M9 #36 run `38727481764` fails on Ubuntu and Windows. | M3 changes its owned behavior/test, retains M1's deny assertions, adds a supported-capability positive control; M9 repins the exact M3 SHA and reruns both platforms. |
| Quarantine state-store retry (#51) | P1 | M1 #43 CI and ten-run workflow pass; direct 500-`STATE_STORE_BUSY` retry exhaustion is confirmed, but original lock-holder/timing cause is UNKNOWN. M4 #34 Ubuntu Node 20 run `38698635434` failed this shared test. | Keep all 48 assertions and retry behavior; collect safe owner PID/acquire-release timing if feasible. Make no product fix without reproduced defect evidence. |
| M5 protected open / held handle (#52) | P0 | M5 #47 `373e2c2` CI passes synthetic alias-denial tests; a production host consumer and TOCTOU/handle enforcement are NOT_VERIFIED. | Keep OPEN until first-party host wiring and protected-open/handle evidence are demonstrated. |
| Packaged Hook log privacy (#53) | P0 | M8 #40 `c1ff677` product and wrapper CI pass synthetic sanitization checks; package reachability and independent E4 are NOT_VERIFIED. No actual secret exposure is established. | Reconcile every reachable packaged copy and verify a real package lifecycle; do not infer host protection from wrapper tests. |
| Installer lifecycle (#41) | P1 | M7 #39 `cf4b70f` product and wrapper checks pass; clean-VM install/upgrade/uninstall/cancel rollback are NOT_VERIFIED. | Wait for an exclusive VM reservation; record lifecycle outcomes and sanitized evidence. |
| Native Codex Shell (#45) | P1 | M2 #37 `9db59ed` checks pass, while actual Desktop host policy remains UNPROTECTED / NOT_VERIFIED. | Retain the visible boundary until actual host-enforced denial is demonstrated. |
| External E4 | P1 | M6 #38 `c1fdf3c` product/wrapper checks pass; independent E4 remains NOT_VERIFIED. | Preserve NOT_VERIFIED until an independent E4 run and artifacts exist. |
| Historical Windows Node 22 retry failure (#54) | P1 | M9 #36 `de3799a` product check passes 9/9 including Windows Node 22; current bounded diagnostic test change preserves assertions. The old trigger remains UNKNOWN. | M9 records a disposition against the current head; do not change provider/transport code without an identified owner. |
| PR #24 / release boundary | P2 / M0 | PR #24 is OPEN/Draft and unchanged at `62496d4`; #30 is OPEN/Draft at `3004dcf` with product CI `38769306353` 9/9 and ownership check `38769777348` 1/1. | Preserve no-merge/no-Release boundary. |

## Current integration risk snapshot (2026-10-15 09:31 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| M1/M5 native Hook file authorization | P0 | M1 #43 b683d84 denies unpinned native file operations and exact-head CI passes 10/10. M5 #47 carries the change but its current six test jobs fail on the separate #51 quarantine retry path. A hook decision still does not prove host I/O uses the Gateway. | Keep verifyRealPaths=true; require held-file capability routing before allowing native file reads/writes/deletes. |
| #52 OBSERVE alias contract | P0 | Synthetic alias behavior is tested, but no production file host/held-handle route is verified. Current M9 #36 exact head fails its generic path-callback expectation; owner is aligning that test locally with M5 fail-closed semantics. | Keep OPEN until M9 exact-head composition passes and a real product host consumes the registered capability with canonical path/handle identity; retain TOCTOU limits. |
| #53 Hook log privacy | P0 | M7 #39 and M8 #40 exact-head CI pass. M9 #36 composition is failing; no actual credential exposure or external transmission is verified. | Keep OPEN until all reachable/package copies and a real package lifecycle are reconciled; preserve sanitized synthetic evidence. |
| Windows Hook source provenance | P1 | M8 #40 c1ff677 applies eol=lf only to the native Hook; Windows packaging regression and strict raw-byte comparator remain. Exact-head checks pass 11/11 including Windows. | Keep the scoped LF rule and exact-blob assertion; M9 must pin the accepted M8 source. |
| #51 quarantine-store retries | P1 | PR #47 run 38712035551 has one actual Ubuntu 24 / Node 22 failure at 500 STATE_STORE_BUSY retries; five matrix jobs were canceled by fail-fast. Ten separate direct-store repetitions passed, but do not identify the original trigger; lock-owner/timing/I/O cause remains UNKNOWN. | Keep OPEN; retain retries and all assertions; change source only on owner-confirmed reproduction. |
| #41 installer lifecycle | P1 | M7 #39 checks 11/11; no clean-VM lifecycle evidence. | Keep OPEN/HOLD until exclusive VM reservation and install/launch/upgrade/uninstall/cancel-rollback evidence. |
| #45 native Codex Shell | P1 | M2 #37 checks 9/9; actual desktop host policy/callback is unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; report UNPROTECTED. |
| M4 security/E4 provider | P1 | M4 #34 test jobs are failing on the #51 quarantine retry path; backend enforcement/E4 provider remains UNKNOWN. | Never map UNKNOWN to PASS; track the test failure through #51. |
| PR #24 / release boundary | P2 / M0 | PR #24 remains OPEN/Draft at unchanged head 62496d4; no merge to main or Release occurred. | Preserve the boundary; continue only through existing Draft PRs and coordinator evidence. |

## Archived integration risk snapshot (2026-10-15 07:31 UTC)



| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #52 OBSERVE alias contract | P0 | M5 PR #47 head b6a40b4 passes exact-head CI 9/9. M9 PR #36 head 3dfef35 passes exact-head CI 13/13; cross-checkout job 38696382427 passes Ubuntu and Windows 1/1 each against M1 f14aab7, M2 76066cb, M5 b6a40b4, and M9 3dfef35. No production file host/held-handle wiring is verified. | Keep #52 OPEN until a real host uses protected open/handle enforcement; TOCTOU and shipped-host integration remain unverified. |
| #30 ownership evidence check | P1 | PR #30 exact head bd8686e passes product and ownership checks, 10/10 total. | Keep PR OPEN/Draft for review; coordination snapshot is current through this integration batch. |
| #51 store retries | P1 | Historical Windows Node20 reached `RETRY_LIMIT` after 500 busy retries; later exact-source runs pass, but lock owner/timing evidence is absent. | Keep OPEN; root cause UNKNOWN. Preserve all assertions. |
| #41 installer lifecycle | P1 | PR #39 checks 11/11; no clean-VM lifecycle evidence. | Keep OPEN/HOLD until exclusive VM reservation and lifecycle artifacts. |
| #45 native Shell | P1 | PR #37 checks 9/9; actual desktop host policy/callback unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| M4 security/E4 provider | P1 | M4 commit fbf2090 is PR #34 head; it adds a persistent Native Codex Shell UNPROTECTED / BLOCKED_NOT_VERIFIED warning. Focused tests pass 2/2. Run 38698635434 failed the existing Ubuntu Node 20 state-store test with `RETRY_LIMIT` (#51); Ubuntu Node 22/build/sponsor passed, four matrix jobs were cancelled, and package-smoke was skipped. M1 source/test blobs match `f14aab7`. | UI does not imply protection or a live PASS; native shell remains UNPROTECTED. Track the unrelated CI failure through #51; trigger remains UNKNOWN. |
| #53 Hook log sensitive data | P0 candidate | M8 commit d12dd2c is PR #40 head and passes 11/11; it adds strict allowlisted JSONL/timestamp checks and a co-located packaged-payload E4 regression. M7 local 52cc149 directly asserts the packaged positive-control JSONL (focused test 1/1); its CI is pending. | Keep OPEN pending reachable shipped-copy, built package lifecycle, and independent E4 evidence; no actual exposure/transmission claim. |

## Archived integration risk snapshot (2026-10-15 06:05 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #53 Hook log sensitive data | P0 candidate | M1 owner copy verified; M7 `87e0df0` exact-head CI 11/11. M2 `04c7ec7`, M3 `1829e05`, M4 `66e679b`, M5 `a6d610e`, M6 `c1fdf3c`, M8 `454873c`, and M9 `2d3f1da` are remote with their current exact-head checks green. No real secret exposure or external transmission observed. | Keep OPEN until reachable shipped copies and package evidence are reconciled; retain M7 package and M9 composition checks. |
| #52 OBSERVE aliases | P0 | M5's audit found no production file-host consumer. M9 remote head `f87a70f` composes M5 OBSERVE routing with M1's registered-file Gateway in a test fixture; valid reads reach the Gateway and sensitive/external aliases deny before dispatch (4/4 focused tests, build and diff checks pass). M2 is working on an adapter candidate within existing PR #37. | Keep OPEN; synthetic composition does not prove a production host uses the Gateway or protected handles. Production-host enforcement and TOCTOU remain NOT_VERIFIED. |
| #51 store retries | P1 | Ubuntu run `38662965312` attempt 1 and M0 Windows Node20 run `38682225388` both exhaust 500 retries; identical store/test blobs pass in later Windows CI. Local Windows Node22 test and 48-state diagnostic pass. Failed attempts skip final 48-state assertion loop; logs lack lock-owner/duration traces. | Keep OPEN; root cause UNKNOWN. Retain `RETRY_LIMIT` and all 48 assertions; no defensible product fix identified. |
| #32 Hook interruption | P1 | M1/M3/M4/M6/M9 current exact-head CI green; historical direct test mechanism was a one-second fixture window before marker. | CLOSED for the synthetic subprocess marker regression only; historical runner delay UNKNOWN and native-host callback NOT_VERIFIED. |
| #27 M9 E4 composition | P1 | Issue #27 is CLOSED for package manifest ownership and M9 combined validation; M9 exact-head CI 11/11 and M6 verifier compatibility retained. | External E4 remains NOT_VERIFIED and is outside the closed issue scope. |
| #41 installer lifecycle | P1 | PR #39 checks 11/11; no clean-VM lifecycle evidence. | Keep OPEN/HOLD until exclusive resource reservation and lifecycle artifacts. |
| #45 native Shell | P1 | M2 PR #37 checks 9/9; actual desktop host policy/callback unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| M4 security/E4 provider | P1 | M4 PR #34 checks 9/9; provider/IPC absent. | UI remains UNKNOWN; do not show mock PASS. |

## Archived integration risk snapshot (2026-10-15 04:04 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 manifest / M9 E4 composition | P1 | M9 `37a09e8` exact CI 11/11; local full npm test 409 pass/0 fail/6 environment skips, build, E4 16/16, package smoke 100 files; M6 verifier byte-identical to `cd55717`. | Keep issue record synchronized; external E4 remains NOT_VERIFIED. |
| #32 Hook interruption | P1 | M3 #33 and M4 #34 current exact heads pass 9/9; interruption fixture remains synthetic, host callback NOT_VERIFIED, historical runner delay UNKNOWN. | Keep OPEN; retain fail-closed assertions and require real host evidence for broader claims. |
| #52 OBSERVE aliases | P0 | M1/M5 changes integrated at M9 `37a09e8`; M1 10/10, M5 9/9, M9 11/11 exact-head checks pass. Synthetic read/write junction tests prove zero approvals/callbacks and unchanged fixtures only. | Keep OPEN until a real filesystem host is identified, opts in to canonical-path checks, and protects open/handle; record TOCTOU limit. |
| #51 store retries | P1 | Ten-run workflow passes; 500 consecutive `STATE_STORE_BUSY` retries reproduce `RETRY_LIMIT`; original lock-owner/timing trigger UNKNOWN. | Keep OPEN and preserve assertions. |
| #45 native Shell | P1 | M2 PR #37 exact checks 9/9; actual desktop host policy and callback unavailable. | Keep OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| #41 installer lifecycle | P1 | PR #39 checks pass 9+2; no exclusive clean-VM lifecycle evidence. | Keep OPEN/HOLD until resource reservation and lifecycle artifact. |
| M4 security/E4 provider | P1 | M4 exact PR #34 checks 9/9 and tests 8/8; no provider or IPC; UI remains UNKNOWN. | Do not represent absent provider as live PASS. |
| quota / push cadence | Scheduling | Usage page remains open/active and readable above 5%; batch began 04:00 UTC. | Stop if unreadable or below 5%; space the next public batch at least 20 minutes after the final write in this batch. |

## Archived integration risk snapshot (2026-10-15 03:31 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | M6 `cd55717` is the exact PR #38 head; product checks 9/9 and wrappers 2/2 pass. M9 local `e2e25fb` integrates the byte-identical M6 verifier and implements BLOCKED export propagation, immutable sidecar/snapshot hashes, and stable EEXIST normalization. Negative tests reject a forged sidecar without mutation and preserve an existing sidecar. Build, `e4:test` 16/16 and `verify` 399 pass/6 skip/0 fail pass locally. M6 owner final rereview found no contract gap. | Keep OPEN until next exact-head CI and M9 combined acceptance pass. External E4 remains NOT_VERIFIED; verifier/export path-read TOCTOU remains. |
| [#32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32) Hook interruption fixture | P1 | PR #33 run `38672489688` and PR #34 run `38672493385` each pass 9/9; #33 Windows Node20 passes. The former 1s marker window explains the direct fixture failure, not why the historical runner exceeded the window. Synthetic child interruption does not observe native host callback. | Keep OPEN pending M9 combined-baseline review and real host callback evidence; retain fail-closed, no-output, and no-decision assertions. |
| [#52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52) OBSERVE file reads through aliases | P0 | PR #47 `c54e7eb` exact-head CI passes 9/9. M1 Gateway file operations use a held/rechecked descriptor, but no native host callback is connected to that Gateway. M5 has no production filesystem-host consumer; its adapter does not open files. | Keep OPEN until the actual filesystem host is shown to enable the canonical-path boundary and protect the open/handle. Preserve hard DENY and TOCTOU limits. |
| PR #40 M8 public documentation accuracy | P2 | Existing-branch docs and PR body were updated through the logged-in web UI; new head `16e3d01c485f039bfa4eedc97523d223340f93e0` run `38674816292` passes all 9 checks. The PR body now records that exact-head success and keeps local GHCR pull/runtime and independent E4 as NOT_VERIFIED. PR remains OPEN/Draft. |
| #51 shared Guard/quarantine store failure | P1 | Ten-run Linux workflow passes, but original lock-holder/timing evidence remains absent and the trigger is UNKNOWN. | Keep OPEN; retain all 48 assertions and do not infer data loss or defect. |
| #45 native Codex Shell | P1 | M2 repo audit found no reproducible fail-open; effective desktop policy/trust/native callback remain unobservable. Native Shell remains UNPROTECTED. | Keep OPEN/BLOCKED_NOT_VERIFIED until supported-host policy, Hook trust, and real sentinel deny/hash evidence exist. |
| #41 installer lifecycle | P1 | Clean-VM lifecycle remains NOT_VERIFIED; exclusive reservation is not recorded. | Keep OPEN/HOLD until the #29 resource reservation and lifecycle evidence are available. |
| External E4 / M4 backend | P1 | External E4 NOT_VERIFIED. M4 confirms there are no providers/IPC for `/api/security-center` or `/api/e4/status`; 404 tests pass 7/7 and UI remains UNKNOWN. | Do not report live PASS until a real backend provider and independent external E4 evidence exist. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other windows remains unknown. | Treat unavailable until owner, worktree, start, and release are recorded on #29. |
| Quota / push cadence | Scheduling | Usage page remains open/readable above the stop line; M0 re-read at 03:31 UTC and keeps it open at the user's request. The quota-checked public-write batch completed at 03:13:51 UTC. | Stop if unreadable or below 5%; next public-write batch no earlier than 03:33:51 UTC. |

## Archived integration risk snapshot (2026-10-15 02:40 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | M6 confirmed `e4:auto`, `e4:verify`, `e4:test` exactly match M9 (`MATCH_CONFIRMED`). PR #38 remote head `0908449` checks 11/11; local verifier commit `cd55717` has `e4:test` 16/16 but lacks exact-head CI. M1 owns the separate shared store failure under #51; its ten-run Linux workflow passes. Original RETRY_LIMIT cause remains UNKNOWN; do not infer cause from reruns. | Keep OPEN until `cd55717` exact-head CI and combined manifest/package acceptance. External E4 NOT_VERIFIED. |
| [#51](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/51) shared Guard/quarantine store CI failure | P1 | Ubuntu Node22 `file-state-store` four-process test initially reported `RETRY_LIMIT`; source/test blobs match the AC3 baseline and M6 diff does not touch them. Attempts 2–4 each passed the Ubuntu Node22 full test job consecutively (3 passes); attempt 2 also passed all 9 product jobs and package smoke. M1 confirmed the direct failure path: 500 consecutive `STATE_STORE_BUSY` lock retries end in `RETRY_LIMIT`. The original lock-holder/timing evidence is absent, so the underlying trigger remains UNKNOWN; no data loss or implementation defect is established. M1 accepted path ownership in comment `6182359961`; commit `3828bee` adds the path-scoped ten-run workflow. Run 38668337033 passed on merge candidate `3c8d880` (M1 `3828bee` + base `62496d4`): 10 iterations, each 17 tests / 14 pass / 0 fail / 3 skip, including the four-process test. M0 comment `6182797086` records this owner disposition. | The ten-run Linux workflow and current exact-head PR #38 checks passed; retain all 48 assertions. Keep OPEN because the original trigger remains UNKNOWN. |
| #32 Hook interruption fixture | P1 | M1 confirmed the direct historical failure mechanism on Windows Node20 run `38390302812`: old `spawnSync` fixture had a 1s timeout; why runner startup exceeded 1s remains UNKNOWN. M3 `f9bd818` and M4 `9288de0` port the bounded async fixture on their separate existing branches; both target files passed 10/10 and M3 targeted case passed three times on Windows Node22. Local Node20 is unavailable. Interruption checks no stdout/stderr/decision log but do not run the real host; callback NOT_VERIFIED. M9 combined review is pending. | Keep OPEN pending M9 baseline review and exact-head Windows Node20 CI; retain fail-closed/no-decision/no-output assertions. Native host callback NOT_VERIFIED. |
| #52 OBSERVE read through aliases | P0 | Synthetic sensitive-junction and external-junction paths reached the M5 callback before the local fix; no real data disclosure is claimed. M1 confirms legacy `createRiskPolicyRouter` default behavior is lexical by documented contract. M5 local `c54e7eb` requires explicit `verifyRealPaths:true` for canonical containment and sensitive-target classification; sensitive and escaping junction regressions now deny with zero approvals/callbacks. | Keep OPEN until exact-head CI and real-host opt-in/host-executor protection are evidenced. Preserve legacy compatibility, hard DENY, and TOCTOU limitation. |
| #45 native Codex Shell | P1 | PR #37 checks 9/9 pass. M2 read-only audit found no repo-level fail-open but could not inspect effective host policy/trust or native callback. No WSL distro means M2 Git status/head is unverified; no code/test changes. Native Shell remains UNPROTECTED. | Keep OPEN/BLOCKED_NOT_VERIFIED until host owner supplies effective sandbox/profile and Hook trust/source, followed by a real Desktop Shell sentinel deny/hash check. |
| #41 installer lifecycle | P1 | Clean-VM lifecycle remains NOT_VERIFIED; no exclusive reservation. | Keep OPEN/HOLD pending visible resource reservation and lifecycle evidence. |
| External E4 / M4 backend | P1 | Independent E4 NOT_VERIFIED. M4 confirmed no Console provider/IPC exists for `/api/security-center` or `/api/e4/status`; current runtime-console tests assert 404 (7/7 pass), and UI remains UNKNOWN. | M4 UI is truthful; backend owner must implement verified runtime providers before live status can be shown. External E4 still requires independent evidence. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other windows is unknown. | Treat unavailable until owner/worktree/start/release is recorded on #29. |
| Quota / push cadence | Scheduling | Usage page remains open/readable above stop threshold; exact values are not public. Last push 02:20 UTC. | Stop if quota <5% or unreadable. This batch is due; keep later pushes at least 20 minutes apart. |

M0 PR #30 remote `1a73704` has 9/9 product jobs and a successful coordination run. M1 PR #43 remote `3828bee` has passing standard CI and ten-run store workflow; PR #38 exact head `0908449` has 11/11 checks, which do not cover local `cd55717`. M3/M4 fixture commits and M5/M6 local fixes await the current batch and new exact-head CI. The original store trigger remains UNKNOWN. M9 PR #36 `bc5390d` remains 11/11. PR #24 remains OPEN/Draft, unchanged, with 11/11 checks.

## Archived integration risk snapshot (2026-10-15 00:30 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | Comment 6181516836 records two reproduced defects: consistent metadata can falsely claim E4_VERIFIED, and repeated Auto E4 artifact generation overwrites earlier evidence. M6 fix commit 4e39762 has focused tests 18/18; exact PR #38 CI pending. Existing evidence directory is preserved. | Keep OPEN until both regressions pass exact-head CI and M6 owner disposition/M9 combined acceptance are recorded; external E4 NOT_VERIFIED. |
| #32 Hook interruption fixture | P1 | M1 audit comment 6181394646 records passing exact-head and subprocess fixtures; no M3/M4 acknowledgement follows it. Latest checkpoint 6181111750 leaves them UNACKNOWLEDGED/HOLD. | Keep OPEN. Do not edit or reassign until hold state clears. Preserve fail-closed/no-output/no-decision assertions; root cause UNKNOWN and native callback NOT_VERIFIED. |
| #45 native Codex Shell | P1 | M2 audit complete with no justified code change; Issue comment 6181405060 records BLOCKED_NOT_VERIFIED. Native Shell remains UNPROTECTED without supported-host evidence. | Keep OPEN; require actual supported-host evidence or explicit UNPROTECTED/BLOCKED status. |
| #41 installer lifecycle | P1 | Clean-VM installation/launch/upgrade/uninstall/cancel rollback NOT_VERIFIED; comment 6180703085 requests evidence or BLOCKED_RESERVATION; no reply as of00:13. | Keep OPEN/HOLD pending lifecycle evidence and visible exclusive reservation. |
| External E4 | P1 | Verifier CI and synthetic artifacts do not establish independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 remains UNKNOWN. | No PASS claim without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Treat unavailable until reservation/release visible on #29. |
| Quota / push cadence | Scheduling | Usage page readable at00:29 UTC and above stop threshold; exact values local-only. Last push00:16 UTC. | Stop if quota <5% or unreadable. Next push no earlier than00:36 UTC. |

PR #30 head `205df8e` has 1/1 coordination check and 9/9 product CI checks passing. M9 PR #36 is clean with 11/11 checks passing; M1 PR #43 is at `4b562be` with 9/9 checks passing. Issue #44 is COMPLETED/CLOSED. PR #24 remains OPEN/Draft at the recorded base/head with 11/11 checks passing; it was not modified or merged.

## Archived snapshot (2026-10-14 22:34 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | M6 slot released; no owner signoff. M6/M9 three script values match by static read. | Keep OPEN pending explicit M6 disposition and M9 combination; external E4 NOT_VERIFIED. Preserve untracked evidence. |
| #32 Hook interruption fixture | P1 | M3/#33 and M4/#34 slots remain assigned; at 22:34 both worktrees and PR heads unchanged. Task messages were queued; consumption is not verified. Old exact-head CI is green but the copies remain synchronous. | Keep OPEN until each owned copy has the narrow approved timing update and exact-head CI. Preserve fail-closed/no-output/no-decision checks; native callback NOT_VERIFIED and root cause UNKNOWN. |
| #45 native Codex Shell | P1 | Native Shell UNPROTECTED; protocol tests do not prove installed-host enforcement. | Keep OPEN; require actual supported host evidence or show UNPROTECTED/BLOCKED. |
| #41 installer lifecycle | P1 | Clean-VM install/launch/upgrade/uninstall/cancel rollback remains NOT_VERIFIED. | Keep OPEN/HOLD pending lifecycle evidence. |
| External E4 | P1 | Verifier CI and synthetic bundle do not prove independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 endpoints and enforcement remain UNKNOWN. | No PASS claim without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Treat unavailable until reservation/release is visible on #29. |
| Quota / push cadence | Scheduling | Usage page readable/open/active at 22:32 UTC, above stop line; exact values local-only. Last push 22:15 UTC. | Stop if quota <5% or unreadable. Next M0 push no earlier than 22:35 UTC; following batch no earlier than 22:55 UTC. |

Issue #32 latest checkpoint comment is `6179870318`. PR #30 head `5685d8e` has product run `38646435036` 9/9 and ownership runs `38646435026`/`38646704479` 1/1. PR #24 remains OPEN/Draft and unchanged with 11/11 checks passing.

## Archived snapshot (2026-10-14 22:14 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | Active slot released; field-owner reply still absent. M6/M9 `e4:auto`, `e4:verify`, `e4:test` are statically equal only. | Keep OPEN through explicit M6 owner disposition and M9 combined acceptance; external E4 NOT_VERIFIED; preserve local E4 evidence. |
| #32 Hook interruption fixture | P1 | M3/#33 and M4/#34 are active slots. At 22:14 worktrees and PR heads unchanged; exact-head old-fixture CI is green. Owner task messages are queued, but consumption is unconfirmed. | Keep OPEN until owner-authored branch copies and exact-head CI verify the limited timing fix. Keep fail-closed/no-output/no-decision assertions. Root cause UNKNOWN; native callback NOT_VERIFIED. |
| #45 native Codex Shell | P1 | Native Shell remains UNPROTECTED; child-process/protocol tests do not prove installed-host enforcement. | Keep OPEN; do not present a fixture as host coverage. |
| #41 installer lifecycle | P1 | Clean-VM install/launch/upgrade/uninstall/user-cancel rollback remains unverified. | Keep OPEN/HOLD pending clean-VM evidence. |
| External E4 | P1 | Verifier CI and synthetic bundle are not independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Security/E4 backend endpoints and enforcement remain UNKNOWN. | Do not claim PASS without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Treat as unavailable until reservation/release is visible on #29. |
| Quota / push cadence | Scheduling | Usage page readable and above stop threshold at 22:13 UTC; exact values local-only. Last push 21:55 UTC. | Stop all work if quota <5% or unreadable; next push batch no earlier than 22:15 UTC. |

Issue #32 latest status checkpoint is 6179514296. M3/M4 queued-session acknowledgments are recorded locally only; they are not proof of task completion. PR #30 current head `6f27e16` has product run 38644017236 9/9 and ownership runs 38644017422, 38644355243, 38644503756 each 1/1. PR #24 is unchanged with 11/11 checks passing.

## Archived snapshot (2026-10-14 21:53 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | M6 slot released at 21:47; owner signoff is still absent. M6/M9 `e4:auto`, `e4:verify`, `e4:test` match by static read only. | Keep OPEN through explicit M6 owner disposition and M9 integration acceptance; external E4 remains NOT_VERIFIED. Preserve M6's untracked evidence directory. |
| #32 Hook interruption fixture | P1 | M1 accepts `d3b64fc` only for timing-fix behavior. M3/#33 and M4/#34 now hold the two active slots; at 21:53 both worktrees are clean and heads unchanged. Their existing exact-head CIs pass, but both copies remain old synchronous blob `1ecb3ee`. | Keep OPEN until each owned branch updates the fixture and passes exact-head CI. Retain fail-closed/no-decision/output/log assertions. Native-host callback and historical root cause remain NOT_VERIFIED/UNKNOWN. |
| #45 native Codex Shell | P1 | Native Shell remains UNPROTECTED; protocol and child-process fixtures do not prove installed-host enforcement. | Keep OPEN until evidence from an actual supported host, or user-facing state remains explicitly UNPROTECTED/BLOCKED. |
| #41 installer lifecycle | P1 | Current evidence still lacks clean-VM install/launch/upgrade/uninstall/user-cancel rollback. | Keep OPEN/HOLD until lifecycle evidence exists. |
| External E4 | P1 | Verifier tests and archived synthetic bundle do not establish independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 endpoints and enforcement remain UNKNOWN. | Do not report PASS without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other Codex windows is unavailable. | Treat as unavailable until #29 records reservation/release. |
| M1 PR description | P2 | #43 body stale-push wording was previously reported to its owner; no correction is confirmed in this checkpoint. | M1 owner retains PR-body ownership. |
| Quota / push cadence | Scheduling | Usage page readable and above stop threshold at 21:53 UTC; exact values are local-only. Last push 21:32 UTC. | Stop all work if quota <5% or unreadable. Next push batch no earlier than 22:13 UTC. |

Issue #32 latest routing comment: 6179220646. Issue #27 slot disposition: 6179220160. PR #30 head `9a8a79e` product CI 38641094976 passed 9/9; ownership runs 38641094955 and 38641613332 each passed 1/1. PR #24 remains OPEN/Draft, unchanged, with 11/11 checks passing.

## Archived snapshot (2026-10-14 21:26 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields | P1 | M6/M9 e4:auto, e4:verify, e4:test values match by static read; M6 owner confirmation pending. | Keep OPEN through owner disposition and M9 integration check; external E4 remains NOT_VERIFIED. |
| #32 Hook interruption fixture | P1 | M3 remains on synchronous blob 1ecb3ee; current M1 owner fixture is 6c2d8da. M3 lacks stderr/decision-log checks; subprocess does not observe native-host callback. | Keep OPEN; port only approved asynchronous timing behavior on owned branch, retain fail-closed assertions, rerun exact-head CI; callback remains NOT_VERIFIED. |
| #45 native Codex Shell | P1 | Native Shell remains UNPROTECTED; protocol/child-process fixtures do not prove installed host enforcement. | Keep OPEN until a real supported host blocks a protected synthetic write or all user-facing status explicitly keeps it UNPROTECTED/BLOCKED. |
| #41 installer lifecycle | P1 | NSIS/template CI passed; clean-VM install/launch/upgrade/uninstall/cancel rollback unverified. | Keep OPEN/HOLD pending clean-VM evidence. |
| External E4 | P1 | M6 verifier/archived synthetic bundle is not independent external E4. | Keep NOT_VERIFIED. |
| M4 backend | P1 | Backend security/E4 endpoints and enforcement remain UNKNOWN. | Do not report PASS without backend evidence. |
| Exclusive VM/model/installer resources | P2 | Other-window occupancy unavailable. | Assume unavailable until #29 records reservation/release. |
| M1 PR description | P2 | #43 body still says d26a0c3 awaits push, but current remote head 4b562be descends from it. | Ask M1 owner to correct owner-authored body; M0 does not rewrite it. |

M0 checkpoint comments: #32 6178865306, #27 6178865803. PR #30 head ff9822b has product run 38638309831 (9/9) and ownership runs 38638309677/38638890338 (both 1/1). PR #24 remains OPEN/Draft and unchanged.


## Archived snapshot (2026-10-14 21:06 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 package manifest / M6 fields | P1 | M6 与 M9 的 e4:auto、e4:verify、e4:test 静态值一致；M6 owner 确认待回复。 | 保持 OPEN，等 owner 确认/修正并完成 M9 exact-head 验证。外部 E4 仍 NOT_VERIFIED。 |
| #32 Hook interruption fixture | P1 | M3 仍为同步 blob 1ecb3ee；M1 owner 参考为 6c2d8da。M3 当前 fixture 未核 stderr/空决策日志；子进程不能观察 native-host callback。 | 保持 OPEN；各 owner 分支只移植获批异步 marker/interruption 行为，保留 fail-closed 断言并跑 exact-head CI。callback 状态仍 NOT_VERIFIED。 |
| #45 native Codex Shell | P1 | 原生 Shell 仍 UNPROTECTED；协议或子进程测试不能证明宿主已安装可信策略。 | 保持 OPEN，直到真实宿主阻断受保护合成写入，或用户状态明确标为 UNPROTECTED/BLOCKED。 |
| #41 installer lifecycle | P1 | 固定 NSIS/template CI 通过；无 clean-VM 生命周期证据。 | 保持 OPEN/HOLD，直至验证 clean-VM 安装、启动、升级、卸载及用户取消回滚。 |
| External E4 | P1 | verifier 和合成归档不能证明独立外部 E4。 | 保留证据；保持 NOT_VERIFIED，直至获授权的独立运行。 |
| M4 backend state | P1 | 后端安全/E4 endpoint 和 enforcement 仍 UNKNOWN。 | 不将 UNKNOWN 报为 PASS；等待后端证据。 |
| Exclusive VM/model/installer slot | P2 | 本会话无法看到其他窗口占用情况。 | #29 未记录释放/预约前按不可用处理。 |
| Stale M1 PR description | P2 | PR #43 head 4b562be 的祖先含 d26a0c3，但 PR body 仍称该提交待推送。 | 请 M1 owner 修正文案；M0 不改 owner-authored PR 正文。 |

M0 在 21:06 UTC 更新 #32/#27 状态请求：comments 6178530800 与 6178531392。PR #30 head 71c2545 的产品 CI 38635153635 为 9/9，最新 ownership check 38635518024 为 1/1。PR #24 仍 OPEN/Draft 且未变。


## Archived snapshot (2026-10-14 20:46 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Shared package manifest / M6 fields | P1 | M9 candidate preserves the statically reviewed composition; explicit M6 field-owner confirmation is absent. | Keep #27 OPEN until M6 confirms/corrects e4:auto, e4:verify, e4:test and M9 exact-head CI passes. |
| Windows Hook interruption fixture | P1 | M1 disposition is limited to timing-fixture equivalence. M3/M4/M6 branches still use the synchronous marker blob despite green CI. Root cause UNKNOWN. | Keep #32 OPEN; update owner copies or document evidence-backed exceptions, preserve fail-closed assertions, rerun exact heads. Native callback is NOT_VERIFIED. |
| Native Codex Shell | P1 | Current M2 candidate and protocol tests do not establish installed, trusted host enforcement; status is UNPROTECTED. | Keep #45 OPEN until actual host policy denies a protected synthetic write or limitation is documented in user-facing status. |
| Installer lifecycle | P1 | M7 CI compiles the pinned NSIS template; no clean-VM install/launch/upgrade/uninstall/cancel-rollback result. | Keep #41 OPEN/HOLD until runtime lifecycle evidence exists. |
| External E4 | P1 | M6 local evidence and verifier CI do not establish independent external E4. | NOT_VERIFIED; preserve local evidence and obtain external run only under the exclusive schedule. |
| Desktop backend state | P1 | M4 backend security/E4 endpoints and enforcement remain UNKNOWN. | Do not present UNKNOWN as PASS; require actual backend contract evidence. |
| Exclusive VM/model/installer slot | P2 | Other-window occupancy cannot be observed here. | Treat as unavailable until a reservation/release is recorded on #29. |

Issue #46 is CLOSED only for M0/M5 documentation synchronization. Green automation does not close any of the runtime, host, installer, or external-E4 risks above.

## 当前风险快照（2026-10-14 19:12 UTC）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| Shared API contract path | P1 | M0 #30 head `af39e96` contract blob `693d437`；M9 #36 head `6abd4da` passes 9/9 + wrapper 2/2. | Issue #49 CLOSED（仅记录的路径/hash范围） |
| #27 package/M6 composition | P1 | M9 package blob `6b3042`；此前静态核对为 36 个唯一测试路径，保留 AC3 发布字段。M6 对 `e4:auto`/`e4:verify`/`e4:test` 尚无显式 owner 确认。 | OPEN / OWNER CONFIRMATION PENDING |
| #28 Gateway lifecycle | P1 | M7 #39 `4267c61` CI 9/9 + wrapper 2/2；M1 owner review 已读回。 | CLOSED（有限合同范围） |
| #32 Hook interruption | P1 | 当前 #43/#36 测试 blob `6c2d8da`，#37 为异步 marker-wait blob `d3b64fc`，#33/#34/#38 仍为旧 blob `1ecb3ee`。各当前 CI 通过，但不能据此排除历史竞态；M1 的 subprocess fixture 也不能观测 native-host callback。 | OPEN / FIXTURE COORDINATION PENDING |
| #35 Guard quarantine | P0 | 已关闭；结论限同进程、同一 Guard、遵守 AbortSignal 的 callback。 | CLOSED（有限范围） |
| #41 installer lifecycle | P1 | Windows pinned NSIS/template compile 有 CI 证据；clean-VM 安装/启动/升级/卸载/取消回滚无验证。 | OPEN / HOLD / NOT VERIFIED |
| #44 approval expiry | P1 | M1 owner head `4b562be` 与当前 M9 CI 通过；关闭范围仍限对应 expiry regression。 | CLOSED（有限范围） |
| #45 native Shell | P1 | 实际 Windows Codex Shell 没有可信 fail-closed policy enforcement 证据。 | OPEN / UNPROTECTED |
| #46 OBSERVE docs sync | P2 | M0 contract blob `693d437`、M5 report blob `1300b4d` 与 M5 PR #47 描述相互引用；#48 已按有限 hard-deny 证据关闭；#30/#47 exact-head CI 通过。 | DOCUMENTATION ACCEPTANCE MET / GITHUB CLOSE PENDING |
| #48 OBSERVE policy/router | P1 | M5/M1 有限 hard-deny、零审批/零 callback、safe-read/egress 证据。 | CLOSED（有限策略/router范围） |
| External E4 | P1 | M6 自动 verifier CI 不替代独立真实模型/外部 E4 evidence。 | NOT VERIFIED |
| M4 backend state | P2 | 当前安全/E4 后端状态不可用/未核实。 | UNKNOWN |
| quota / push interval | Scheduling gate | 19:10 UTC 用量页可读：5小时 97%、周 64%、113 credits；上批推送 19:04 UTC，下批不早于 19:24 UTC。 | MONITOR |

Do not merge main or PR #24, publish a Release, or claim fixture/CI results as native-host, external-E4, or clean-VM acceptance.

更新日期：2026-10-14。实时风险快照位于首个风险表；旧记录按原时间保留。

## 实时风险快照（2026-10-14 11:56 UTC；额度页 11:50 UTC；PR checks 11:45 UTC）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | CLOSED 范围仍限同进程、同 Guard 实例且 callback 遵守 AbortSignal。 | CLOSED（有限范围） |
| #32 Hook interruption | P1 | #30 当前头 run `38558211885` Windows Node22 失败；#39 run `38558208490` Windows Node20/22 失败，均在旧 M1 interruption marker fixture。M1 owner 的仅测试夹具 patch 已生成，M2/M8 正在应用；该子进程夹具不观测宿主 callback。 | OPEN / CROSS-PR FIX INTEGRATION |
| #44 approval expiry | P1 | M1 `ca24d37` 已推送；PR #43 当前头 CI 9/9 通过，保留过期拒绝、清理、callback=0。 | OPEN / CI PASS; M9组合仍待验 |
| #39 honeypot | P1 | M7 `c9a6b5c` 已推送，旧 resolve 期望已对齐并本地 6/6；当前 #39 只因未整合的 M1 Hook fixture 在 Windows 20/22 失败。 | OPEN / CROSS-PR CI BLOCK |
| #27 manifest / E4 | P1 | M9 `ab382fe` 已推送；#36 当前头 11/11；外部 E4 未验证。 | OPEN / EXTERNAL E4 NOT VERIFIED |
| #28 Gateway lifecycle | P1 | M7 `c9a6b5c` 已推送；#39 等 M1 Hook 修正集成后的新头组合 CI。 | OPEN / CROSS-PR CI PENDING |
| #48 OBSERVE sensitive read | P1 | hard DENY 保持；M5 PR #47 旧头受 Hook 夹具失败影响，等待更新后的组合 CI。 | OPEN / CI PENDING |
| #41 clean-VM install | P1 | 无已验证 clean-VM 快照，本轮未运行安装程序。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | M2 本地 Hook 协议夹具 PASS，但候选 Hook 未安装或信任，未做真实宿主 Shell 验收；官方 Hooks 存在错误/超时后继续执行及专用路径绕过边界。 | OPEN / UNPROTECTED / BLOCKED_NOT_VERIFIED |
| #46 canonical API contract | P2 | API_CONTRACTS 唯一 owner 为 M0；M5/M6 event schema 分离，无消费关系。 | OPEN |
| quota / schedule | 调度门槛 | 网页 11:50 UTC 显示五小时 88%（4小时8分后重置）、周额度 66%（6天后重置）、113 credits；本批四分支更新已推送。 | MONITOR |

下批推送不得早于 12:01 UTC；仅允许快进到已有 PR 分支。PR #24、main 和 Release 未触碰。

## 历史风险快照（2026-10-14 11:26 UTC；GitHub checks 11:24 UTC）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | CLOSED 范围限同进程、同 Guard 实例且 callback 遵守 AbortSignal。 | CLOSED（范围有限） |
| #32 Hook interruption CI | P1 | #30/#37/#40/#47 的当前检查仍含旧 `spawnSync(1000ms)` 入口 marker 断言；M1 当前异步等待入口后再中断版本在 #43 通过相关矩阵。需窄范围向旧分支集成 M1 所有者测试修正。 | OPEN / CROSS-PR FIX PENDING |
| #44 approval expiry | P1 | #43 Ubuntu20/macOS20/macOS22 的精确到期测试失败；M1 已提交 `ca24d37`，将 1ms TTL 换为 60s 并固定当前时钟，保留拒绝、清理、callback=0。 | OPEN / LOCAL FIX |
| #39 honeypot quarantine expectation | P1 | #39 的 6 个测试矩阵因旧测试期待读取 resolve 而失败；M7 `c9a6b5c` 与 M1/M9 错误契约对齐，保留隔离与无副作用断言。 | OPEN / LOCAL FIX |
| #27 manifest / E4 | P1 | #36 远端 head `f125e70` 11/11；M9 本地 `ab382fe` 纳入 M1 exact-expiry 更新。verify 393/399、0 fail、6 环境跳过，package smoke 100 文件，E4 测试 12/12；外部 E4 未验证。 | OPEN / NEW M9 HEAD PENDING; EXTERNAL E4 NOT VERIFIED |
| #28 Gateway lifecycle | P1 | #36 远端 head 11/11；M7 `c9a6b5c` 与 M9 已有期望对齐，待 M7 新 head checks。 | OPEN / LOCAL FIX |
| #48 OBSERVE sensitive read | P1 | M9 当前远端 CI 11/11；M9 local `ab382fe` pending push; M5 PR #47 受旧 Hook 回归影响；敏感读取 hard DENY 未放宽。 | OPEN / NEW HEAD CI PENDING |
| #41 clean-VM install | P1 | 无可核实 clean VM 快照，未运行安装程序。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | 协议测试不能证明原生宿主已安装且 fail-closed；真实 Windows Desktop sentinel 验证仍缺。 | OPEN / UNPROTECTED |
| #46 canonical API contract | P2 | M0 维护唯一契约；M5/M6 event schema 分离，无消费关系。 | OPEN |
| M4 diagnostic truth | P2 | PR #34 9/9；既有 `69ec7f1` 定向 7/7。 | VERIFIED FOR REPORTED CHANGE |
| quota / scheduling | 调度门槛 | 网页约 11:24 UTC 实读五小时 95%、每周 67%、余额 113。 | MONITOR |

11:15:25 UTC 批次已完成。M1 `ca24d37`、M7 `c9a6b5c` 仅本地；下次推送不早于 11:35:25 UTC。main、PR #24 与 Release 未改动。

## 实时风险快照（2026-10-14 11:16 UTC；额度页 11:10 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | CLOSED 范围限同进程、同 Guard 实例且 callback 遵守 AbortSignal。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | M1 新 head `4099ee3` 已推送；CI 排队/运行中，marker 历史根因仍 UNKNOWN。 | OPEN / CI PENDING |
| #44 approval expiry | P1 | M1 新 head `4099ee3` 含精确过期零 callback 回归，定向 2/2；#43 CI/M9 组合结果未完成。 | OPEN / CI PENDING |
| #48 OBSERVE sensitive read | P1 | M5 hard DENY 未放宽；M9 `f125e70` 已推送，#36 CI 运行中，尚无组合验收结论。 | OPEN / CI PENDING |
| #41 clean-VM install | P1 | M7 报告 `9088bd2` 无法核实干净快照，安装程序来源未验证；没有运行安装器。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | M2 `d9d775b` 已推送；Hook 协议测试不等于宿主集成，Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`。 | OPEN / HOST EVIDENCE BLOCKED |
| #27 manifest / E4 | P1 | M9 新 head `f125e70` 已推送；本地 verify 393/399、0 fail、6 环境跳过，100-file package smoke；新 head CI 运行中，外部 E4 未验证。 | OPEN / CI PENDING |
| #28 Gateway lifecycle | P1 | M7 `9088bd2` 已推送；PR #39 checks queued/in progress，未报告失败或通过终结结果。 | OPEN / CI PENDING |
| #46 canonical API contract | P2 | M0 维护 canonical contract；M5/M6 events schema 分离，M6 当前不消费 M5 audit stream。 | OPEN |
| M4 diagnostic truth | P2 | 修复 `69ec7f1` 已推送，定向 7/7；PR #34 新 head checks 尚未结束。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | #36 新 head `f125e70`；11:16 UTC 已有 2 checks success、3 in progress、5 queued，未见 failure。 | IN PROGRESS |
| quota / scheduling | 调度门槛 | 网页 11:10 UTC 实读五小时 98%、4h48m 后重置、每周 68%、113 credits。 | MONITOR |
| worktree pointers | P2 | WSL Git worktrees 正常；M6 未跟踪 E4 原始运行目录保持未动。 | MONITOR |

11:15:25 UTC 完成一次 10 分支 fast-forward 批次；下批不得早于 11:35:25 UTC。main、PR #24 和 Release 未改动。VMware/真实模型/安装测试互斥，本轮未运行。

## 历史风险快照（2026-10-14 11:10 UTC；额度页 11:10 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | Issue #35 CLOSED；证据限同进程、同 Guard 实例且 callback 遵守 AbortSignal，不覆盖跨进程/shared-store 或强制终止。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | PR #43 旧远端 head `f59ba37` 的 checks 通过；M1 本地 HEAD `4099ee3` 增加精确过期边界回归，但历史 marker 根因仍 UNKNOWN。 | OPEN / COMBINED CI PENDING |
| #44 approval expiry | P1 | M1 精确到期时断言 `EXPIRED`、清除 pending 且 callback 零调用；2 个定向过期测试通过。新测试尚未经过 PR head CI/M9 组合验收。 | OPEN / COMBINED CI PENDING |
| #48 OBSERVE sensitive read | P1 | M5 保留 hard DENY；PR #47 旧 head `cf4e2cd` 检查通过。M9 新组合 head CI 尚未运行，未确认真实数据泄露。 | OPEN / M9 CI PENDING |
| #41 clean-VM install | P1 | M7 `9088bd2` 报告无法核实干净 VM 快照，安装程序来源未验证；未运行安装或变更 VM。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | M2 协议测试不等于宿主集成；Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`。Issue #45 已收到证据说明评论。 | OPEN / HOST EVIDENCE BLOCKED |
| #27 manifest / E4 | P1 | M9 `f125e70` 本地组合 `npm run verify` 393/399、0 失败、6 环境跳过，100 文件 package smoke；M6 外部 E4 仍 `NOT_VERIFIED`。 | OPEN / COMBINED CI PENDING |
| #28 Gateway lifecycle | P1 | M7 本地 `9088bd2` 和 M1 lifecycle 审核尚未进入当前 PR #39 远端 `5c7d95d` 的 CI。 | OPEN / CANDIDATE CI PENDING |
| #46 canonical API contract | P2 | M0 保持唯一 canonical contract；M5/M6 event schema 分离且 M6 当前不消费 M5 audit stream。 | OPEN |
| M4 diagnostic truth | P2 | M4 本地 `69ec7f1` 将 API 不可用状态显示为 null/null；定向测试 7/7。旧 PR #34 远端 `f301195` 不覆盖新提交。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | PR #36 远端 `996073a`；本地 `f125e70` 的 verify 393/399、package smoke 100 文件、E4 测试 12/12 均尚无新 head GitHub CI。 | LOCAL VERIFIED / REMOTE CI PENDING |
| quota / scheduling | 调度门槛 | 网页 11:10 UTC 实读五小时 98%、4h48m 后重置、每周 68%、113 credits。低于 5% 或读数不明时停所有开发/测试/浏览器/GitHub 操作。 | MONITOR |
| worktree pointers | P2 | AC3 子工作树由 WSL Git 管理。M6 未跟踪 `security-lab/e4-runs/20261013T114513Z/` 原样保留。 | MONITOR |

推送只使用已有 PR 分支的快进更新，不 force-push。main 与 PR #24 不变、不合并 Release。VMware、真实模型和安装测试互斥；本轮未运行其中任一项。fixture、CI 与本地组合验证不能替代原生 Shell、外部 E4 或 clean-VM 结果。

## 历史风险快照（2026-10-14 10:51 UTC；额度页 10:50 UTC 实读）

| 风险 | 级别 | 责任与证据 | 状态 |
| --- | --- | --- | --- |
| #35 Guard quarantine | P0 | Issue #35 CLOSED；证据限同进程、同 Guard 实例且 callback 遵守 AbortSignal。跨进程/shared-store 与强制终止不在证据内。 | CLOSED（范围有限） |
| #32 Hook interruption | P1 | PR #43 远端 f59ba37 精确 head 检查 9/9；历史 Hook marker 根因仍 UNKNOWN。M1 正在既有分支核对 #44 回归。 | OPEN / INTEGRATION PENDING |
| #44 approval expiry | P1 | M1 既有报告支持 expiry sweep 与测试观察时序竞争，未证明 Gateway 错误放行；当前追加核对零 callback 的确定性回归覆盖。 | OPEN / COMBINED CI PENDING |
| #48 OBSERVE sensitive read | P1 | PR #47 head cf4e2cd run 38527097304 9/9；敏感读取 hard DENY 不变，M1/M5 host wiring 与 M9 组合验收未闭合。未确认真实泄露。 | OPEN / M9 PENDING |
| #41 M7 reliability | P1 | PR #39 远端 5c7d95d 旧 head 检查 11/11；M7 报告提交 9088bd2 记录候选 VM 无可验证快照且需要密码，旧安装程序产物来源不明。未运行安装或改动 VM。 | HOLD / NOT VERIFIED |
| #45 native host Shell | P1 | PR #37 远端 cb84f43 检查 9/9；M2 正检查 Hook 可表达的失败关闭路径；不覆盖 Codex Desktop 原生 Shell。 | UNPROTECTED / OPEN |
| #27 manifest / E4 | P1 | M9 本地旧候选 5c11113 aggregate verify 391 pass/0 fail/6 环境跳过，100 文件 package smoke；组合 GitHub CI 未运行，M6 外部 E4 仍 NOT_VERIFIED。M7/M8 后续提交未纳入候选。 | OPEN / COMBINED CI PENDING |
| #28 Gateway lifecycle | P1 | M1 owner 审查通过 M7 候选中五个 M1 文件；代码候选 6d978a5、M7 当前提交 9088bd2。PR #39 远端仍 5c7d95d，该旧 head 11/11；新候选 CI pending。 | OPEN / OWNER-APPROVED LOCAL CANDIDATE |
| #46 canonical API contract | P2 | M0 维护唯一 canonical contract；M6 与 M5 event schema 分离且无消费关系。Issue #48 行为闭合仍待验收。 | OPEN |
| M4 diagnostic truth | P2 | M4 提交 69ec7f1 修复审计接口不可用时误导性 0/[]，定向测试 7/7。PR #34 远端旧 head f301195 9/9，不覆盖新提交；后端保护/E4 仍 UNKNOWN。 | LOCAL FIX / CI PENDING |
| M9 combined acceptance | P1 | 本地 integration HEAD 5c11113 相对 PR #36 远端 996073a 有 86 个提交差异、136 个文件改动；本地 verify 与 package smoke 通过但新 head CI 未运行；M7/M8 提交未纳入当前候选。 | LOCAL ONLY / REBASE REVIEW PENDING |
| worktree pointers | P2 | AC3 子工作树 .git 指针使用 WSL 绝对路径；对子工作树须用 WSL Git。根仓库 .git 可由 Windows Git Bash 用于 ref dry-run/推送；避免跨 runtime repair/prune。 | MONITOR |
| quota / scheduling | 调度门槛 | 网页 10:50 UTC 实读五小时 43%、约 9 分钟重置、每周 69%、余额 113。M1 和 M2 当前占用 2 个开发槽；VM/模型/安装互斥槽空闲。 | MONITOR |

VMware、真实模型和安装测试互斥。五小时额度低于 5% 或无法读取时，暂停所有开发、测试、浏览器和 GitHub 操作；确认额度重置后再继续。不得把 fixture、CI 或本地组合验证冒充真实 E4、原生 Shell 或 clean-VM 安装结果。
## 历史风险增量（2026-10-13 16:16 UTC）

| ID | 优先级 | 风险/证据 | 责任与当前动作 | 状态 |
| --- | --- | --- | --- | --- |
| R10 / #35 | P0 | ec3bc96 Guard/Gateway fix 在 PR #43 远端祖先中；current head 89e40cd 的回归测试及 9/9 CI 通过 | M1 确认所有验收标准并给 issue disposition；M0 已记录远端证据，保持 P0 门禁 | OWNER REVIEW |
| #32 | P1 | M1 PR #43 当前 9/9 checks 通过；历史 Windows Hook marker 根因/处置尚未由 owner 关闭 | M1 保留 fail-closed 断言并提交诊断结论 | OPEN |
| #44 | P1 | M1 PR #43 当前 9/9 checks 通过；approval-expiry 历史失败仍待 owner 明确结论 | M1 核对失效语义与请求追踪 | OPEN |
| R11 / #41 | P1 | PR #39 远端 head 65ce028 有 Windows Node20/22、macOS Node20、Windows wrapper 失败；本地 4f3a2c5+WIP 尚未过 CI | M7 推送后验证固定版本 NSIS 安装、编译和测试结果，保留全部门禁 | IN PROGRESS |
| R12 / #45 | P1 | PR #37 子进程范围通过；Codex 原生 Shell 仍 UNPROTECTED | M2 获槽后验证真实宿主 Hook，或如实维持 BLOCKED | OPEN |
| R3 / #27 | P1 | M5 无远端 PR，M6 外部 E4 NOT_VERIFIED，API 合同路径及 manifest 字段未组合验证 | M3/M5/M6/M7 按字段 owner 协调，再由 M9 检查组合 | OPEN |
| R5 | P1 | 本轮未读取其他 Codex 对话；codex queue 对 M1/M7 返回已排队回执，不证明已消费 | 进度只按 GitHub/worktree 交叉核对 | MONITOR |
| quota | P1（调度） | 16:16 UTC 可见读数 13%，约 1h12m 重置 | <=5% 或读数不明时全部暂停；实际低额度暂停须等确认重置 | MONITOR |

| ID | 优先级 | 风险 | 证据 | 责任/处置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| R10 | P1 | M1 PR #43 远端 quarantine 测试失败；同进程 owner 证据未获远端复验 | 远端 d0fd595/run 38399797819 子测试 217 失败；owner 报告本地 Windows Node 22 34/34（quarantine/abort/no-side-effect）；13:40 唯一 push 等 90 秒 exit 1、无文本，远端未变；跨进程未验证 | 保持 #35 P0 独立开放；等待 M1 可审查 head 与 CI，并单独审计历史 P0 的副作用路径 | IN PROGRESS |
| R1 | P1 | M6 package-smoke 本地修复未经过远端 CI | 旧 PR #31 远端 package-smoke 失败；本地 899dbf5 修 SOURCE_MANIFEST 中 package.json SHA，181 项 Git-tree 校验 0 mismatch；PR head 未更新 | M6 owner 发布授权后运行确切 CI job；#27 保持 OPEN | IN PROGRESS |
| R2 | P1 | M1 close 修复和 M7 reliability 变更尚未同一 AC3 集成验证 | M1 本地 Gateway tests 28/28；M7 旧远端 head `f17b7e6` 的 CI 失败，本地候选 `65ce028` 修正 Windows-only compiler check 和 symlink temp-root 处理；M1 commit 未包含在 M7 候选 | M1 保持 API owner；M7 仅改自有 workflow/test；统一候选后跑 Gateway/reliability/CI；#28/#35/#41 | IN PROGRESS |
| R3 | P1 | M3/M5/M6/M7 的共享 package.json 字段与各自 PR 组合结果仍待 AC3 验证 | #27 记录各字段 owner；M3 PR #33 c404b6b 的 9/9（含 package-smoke）通过且契约已补；M5 本地 9ec08d9 无 PR；M6 AC3 PR #38 有 Windows Node 22 测试失败，旧 PR #31 的本地 manifest 修复仍待远端重验；M7 本地 65ce028 未上传 | 字段 owner 最终组合，保留测试与策略；AC3 基线组合验证继续由 #27 跟踪 | IN PROGRESS |
| R9 | P1 | Windows Hook interruption 历史失败根因未知，owner Node20 复验尚缺 | PR #38 run 38397135538 的 Windows Node22 marker 断言失败；M6 本地同子测试1/1、整文件10/10；M1 本地Node22整文件10/10、重复5/5；Node20不可用。没有确定性修复或新提交 | M1 保留 fail-closed 断言；后续获得 Node20 环境时复验，CI失败 disposition 记录于 #32 | OPEN |
| R11 | P1 | M7 修复尚未进入 PR #39 的 CI | 远端 PR head f17b7e6 的 runs 38397157815/38397158016 失败；本地候选 65ce028 已完成但未上传，单次 push 因 non-interactive HTTPS 凭据不可用而被阻止 | 保持 #41 OPEN；不改凭据。Owner 有可用 GitHub 写权限后再发布既有候选并检查新 head CI | BLOCKED |
| R4 | P1（协调环境） | AC3 子工作树 .git 文件指向 WSL 绝对路径；Windows Git 对这些路径不可读，曾报告 not a git repository | M0 使用 WSL Git 管理各 worktree；根仓库 .git 使用 Windows Git Bash 执行远端 ref dry-run/快进推送 | 禁止跨 runtime repair/prune；每个 worktree 使用创建它的 runtime | OPEN |
| R5 | P1 | Desktop 没有原生线程读取/等待 API，任务快照有异步延迟 | M0 经用户许可只读本机 `thread_history` 并通过 `codex queue` 续作；再对照 worktree、GitHub Issue/PR。不能把它描述成调用 `read_thread` | M0 每次排期同时记录快照时间与 GitHub/文件证据；#29 | MONITOR |
| R6 | P2 | 原 `.gitignore` 未覆盖 `.env.*`、临时文件和协调输出 | baseline 检查仅有 `.env`、`*.log` 等 | 本 PR 增加相应模式；密钥仍需 PR/CI secret scanning | FIXED IN THIS PR |
| R7 | P2 | 桌面安全中心后端能力接口当前不可用 | M4 已完成 UI/API adapter，但 `/api/security-center`、`/api/e4/status` 返回 404；相应总防护与 E4 状态仍标为 UNKNOWN | M3/M4 后续按 API 合同接通实际后端；保留 UNKNOWN，不用 mock 覆盖 | OPEN |
| R8 | P2 | PR #24 为 Draft，base 是 readiness 分支，不是 main | GitHub PR 元信息 | 仅作状态对照；协调 PR Draft 指向 AC3，不合并 main、不发 Release | MONITOR |

## 安全边界

- 证据链没有独立可信锚、签名和独立时间戳时不能证明绝对防篡改。
- Gateway 文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不是全部副作用证明。
- AI reviewer 只能拒绝/收紧；人工审批和宿主能力不能暴露成 agent 自助接口。
- E4 PASS 只覆盖声明的 artifact 与检查范围；缺失证据要标 UNKNOWN/NOT TESTED。

## 资源冲突

开发并行上限为 2；2026-10-13 16:16 UTC 时 M1/M7 占满 2/2 槽位。无 VMware 或真实模型测试运行证据；下一次安装测试归 M7 独占，PR #39 新 CI 尚未开始。额度 13%、约 1h12m 后重置。最新推送批次 16:02:40 UTC，下一批不早于 16:22:40 UTC。


## Latest risk delta — 2026-10-15 18:24 UTC

This checkpoint supersedes older risk entries in this file for the listed issues. Passing synthetic tests and CI do not establish product-host, package, installer, or independent E4 acceptance.

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| M1/M2/M5 file identity (#52) | P0 | M1 local commit `9ef3dc2` denies generic path-string file callbacks in strict mode; focused 20/20 and build/diff checks reported passing. M2 adapter remains synthetic and has no first-party product host consumer. Remote PR #43 has not yet advanced to the fix. | Publish M1 at the scheduled batch, pass exact-head CI, compose current M1/M2/M5, then demonstrate real host protected-open/handle behavior. Keep OPEN; TOCTOU NOT_VERIFIED. |
| Native Hook unpinned read (#55) | P1 | M3 PR #33 remains `be388029`; M9 run `38727481764` fails Ubuntu and Windows because unpinned native Read returns allow. | M3-owned deny with `native_file_execution_not_pinned`, preserve M1 assertions, add supported-capability positive control, rerun M9 on exact source SHAs. |
| Shared quarantine retry (#51) | P1 | M1 Node 20 and Node 22 x10 runs pass; M4 Ubuntu Node 20 run `38698635434` still has one `RETRY_LIMIT` failure after 500 busy retries. Root trigger UNKNOWN; no data loss shown. | Preserve tests/assertions and retry semantics; claim no root cause without new holder/timing evidence. |
| Packaged Hook privacy (#53) | P0 | Sanitized source-wrapper evidence exists; shipped package reachability and independent E4 are NOT_VERIFIED. No actual secret exposure is claimed. | Verify reachable packaged artifacts and independent E4; keep OPEN. |
| Native Codex Shell (#45) | P1 | M2 PR #37 checks do not prove Desktop-host interception; actual Shell remains UNPROTECTED. | Require host-enforced denial evidence; keep visible boundary. |
| Installer / E4 (#41 and M6) | P1 | M7 clean-VM lifecycle and independent M6 E4 remain NOT_VERIFIED. | Reserve the mutually exclusive VM/install resource and retain independently reviewable artifacts before PASS. |

## Latest integration risk delta — 2026-10-17 10:06 UTC

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Shared Windows packaging / auto-E4 paths (#59) | P1 | PRs #38/#39/#40 differ on packaging files; M9 #36 has not recorded a confirmed canonical owner map. No security incident is established. | M6/M7/M8 confirm exact primary owners; M9 records selected SHAs and passes Windows package/auto-E4 checks. Keep the issue OPEN until exact-head evidence is attached. |
| M3 native unpinned Read composition (#55) | P1 | M3 #33 remains at `be388029`; M9 #36 remains at `de3799a`, with Ubuntu and Windows composition failures against the current M1 deny contract. | M3 preserves fail-closed denial and a supported-capability positive control; M9 pins exact current M1/M3 SHAs and reruns both platforms. |
| M4 shared quarantine retry (#51) | P1 | PR #34 has a current Ubuntu Node 20 `RETRY_LIMIT` failure after bounded retries; cause remains UNKNOWN. | Preserve tests and retry semantics; require lock-holder/timing evidence before claiming root cause. |
| M0/M9 ignore-rule divergence (#58) | P1 | The M0/M9 `git check-ignore` probes show missing secret/temp/workspace protections on M9; no leak is confirmed, and the scoped E4 evidence exception matches. | M9 reconciles the M0 rules on PR #36, preserves only reviewed exceptions, and posts exact check-ignore results. |
| M1/M5 security-router and store-test overlaps (#51/#52) | P0/P1 | Current M1/M5 PR heads have distinct router blobs; M5 also edits M1's canonical store test. Green individual CI does not prove shared semantics. | Obtain M1/M5 disposition and M9 exact-head composition; preserve deny-before-side-effect and retry assertions. |
| M1 Hook test copies (#56) | P2 | `test/agent-hook.test.ts` appears with distinct blobs across all module PRs, including M0 #30. | M1 defines canonical lineage; owners confirm adapters and keep M0 #30 Draft until its scope is reconciled. |

## Current integration risk snapshot — 2026-10-17 13:09 UTC

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| Product-host protected file execution (#52) | P0 | M1/M5 source and synthetic alias checks exist, but a first-party host consuming the held protected object, handle identity, and TOCTOU behavior are NOT_VERIFIED. | Prove the supported host call path, M1 held-object enforcement, M2 adapter, M5 DENY precedence, and exact-head M9 composition. Keep OPEN until host evidence passes. |
| Packaged Hook-log privacy (#53) | P0 | No actual pinned Setup.exe/manifest, extracted-Hook comparison, or extracted-harness evidence is recorded. Source checks do not prove packaged reachability; no leak is confirmed. | M6/M7/M8 select exact owner-controlled refs; reserve the exclusive installer/VM slot; verify hashes, byte provenance, and sanitized canary outcome. |
| Native Hook unpinned Read (#55) | P1 | M3 #33 `be388029` still disagrees with M1 deny; M9 run `38727481764` fails Ubuntu and Windows and uses a stale M1 pin. | M3 denies and preserves a supported-capability positive control; M9 pins current M1/M3 exact SHAs and passes both composition jobs. |
| Quarantine store retry (#51) | P1 | M4 #34 exact head run `38698635434` exhausts 500 bounded retries in test 163; that PR does not change the failing test. Root trigger UNKNOWN; no data loss established. | M1/M5 resolve test ownership and diagnose with evidence; keep retry bounds and assertions unchanged until a reproduced root cause supports a fix. |
| Ignore-rule drift (#58) | P1 | M9 `.gitignore` lacks reviewed M0 secret/temp/workspace rules; its scoped E4 raw-log exception matches. No committed leak is confirmed. | M9 reconciles on existing PR #36, verifies representative paths and intentional E4 paths, and posts exact evidence. |
| Windows packaging/auto-E4 path overlap (#59) | P1 | M6/M7/M8 packaging files differ; the proposed owner split has no module confirmation. | Obtain exact path-owner dispositions, then have M9 pin the selected SHAs and pass combined package/E4 checks. |
| Clean-VM lifecycle / Native Shell / independent E4 (#41/#45/#57) | P1 | Clean-VM lifecycle and independent product E4 are NOT_VERIFIED; native Codex Shell remains UNPROTECTED. | Preserve visible boundaries; obtain supported-host/runtime or reserved installer/E4 evidence before PASS. |
| Historical Windows Node 22 retry (#54) | P1 | Current ordinary Windows check passes, but historical HTTP 503 trigger remains UNKNOWN. | Keep bounded retries and sanitized diagnostics; require owner/root-cause evidence. |
| Canonical Hook test overlap (#56) | P2 | Current Draft PRs contain distinct `test/agent-hook.test.ts` blobs; M1 is canonical owner. | Obtain M1 lineage/adapter disposition and reconcile M0's shared-path diff before marking PR #30 ready. |
| Release boundary (#24) | M0 | PR #24 remains OPEN/Draft and unchanged; PR #30 is OPEN/Draft. No merge or Release occurred. | Keep both Draft and preserve the no-main-merge/no-Release boundary. |

The current #29 readback has no owner-confirmed active task or exclusive installer/VM/model reservation. M3 #55 and M9 #58 remain requested, not confirmed RUNNING. Activity in other Codex sessions is UNKNOWN; do not infer it from issue comments or unchanged PR heads.

## Current integration risk snapshot — 2026-10-17 14:28 UTC

This snapshot uses exact PR/issue and inspected worktree evidence through the 14:20 UTC owner check. Earlier snapshots are retained as history. In particular, the earlier description of M6/M9 raw.log exceptions as scoped is superseded: their current PR diffs contain a blanket negation for all E4 raw.log files.

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected file/host boundary (#52) | P0 / M1, M2, M5, M9 | M1 held-object and M5 deny source paths exist; M2 has no first-party product-host wiring. M3 alias path is a static risk only; no exposure is confirmed. OPEN / NOT_VERIFIED. | Supported host protected-open, held-object identity, alias/path-replacement denial, current exact-head composition. |
| Packaged Hook privacy (#53) | P0 / M6, M7, M8, M9 | M8 source logs fixed decision metadata and has a synthetic co-located payload/caller-canary fixture. Real Setup.exe, manifest, extracted bytes, and installed behavior are NOT_VERIFIED. No leak is confirmed. | Real artifact hashes, extraction identity, sanitized installed-harness result. |
| Native Codex Shell (#45) | P1 / M2 | Candidate Hook not installed at repository root; active Desktop host and invocation telemetry UNKNOWN. UNPROTECTED / BLOCKED_NOT_VERIFIED. | Actual host invocation/sentinel or named unsupported-host blocker. |
| Quarantine retry (#51) | P1 / M1, M5 | M4 #34 run 38698635434 has one Ubuntu Node 20 RETRY_LIMIT after 500 bounded STATE_STORE_BUSY retries; trigger UNKNOWN, no data loss. | M1 reproducible lock/timing diagnosis or explicit blocker; preserve tests and retry bounds. |
| Native Hook read/alias (#55) | P1 / M3, M9 | M3 #33 allows unpinned native Read at source level; M9 run 38727481764 fails Ubuntu/Windows deny expectation with stale M1 pin. No host exposure is established. | M3 fail-closed correction and exact-head M9 rerun. |
| Ignore-rule divergence (#58) | P1 / M0, M6, M9 | M0 PR #30 has one exact reviewed E4 log exception; M6 #38 and M9 #36 still have a blanket raw.log negation. One current log had no common credential/PII-pattern matches; future output is unverified. No leak is confirmed. | M6/M9 align to M0 path-specific rule or reviewed sanitized export; preserve global log ignore. |
| Windows/auto-E4 path ownership (#59) | P1 / M6, M7, M8, M9 | Changed-path overlaps across #36/#38/#39/#40 are recorded in #59; owner split remains unconfirmed. | Each owner confirms exact paths, adapter/reviewer, and M9 consumption plan. |
| Clean-VM / external E4 (#41/#57) | P1 / M7, M6 | Actual clean-VM lifecycle and independent external E4 remain NOT_VERIFIED. | Exclusive installer/VM reservation and independently reviewable artifacts. |
| Historical provider retry (#54) | P1 / M6, M9 | Current Windows Node 22 check passes; historical 503 trigger remains UNKNOWN. | Keep bounded retries; assign provider/transport ownership before edits. |
| Shared Hook test (#56) | P2 / M1 and consuming modules | M1/M3 test blobs encode different unpinned-Read behavior; no tests were removed or weakened. | M1 canonical disposition and owner-approved adapters; keep PR #30 Draft pending its shared-path scope. |

At the 14:20 UTC scheduler readback, no owner-confirmed task or exclusive VMware/real-model/installer reservation was visible. PR #24 remains OPEN/Draft and unchanged. M0 PR #30 head d341932c3cfb589b3fe3ed6cb5ae3c761001f8e7 passed 10/10 exact-head checks; those checks do not close any product/host/installer/E4 gate.

## M4 desktop security-center CI risk — 2026-10-18 00:49 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M4 PR #34 exact-head CI (#60) | P1 / M4 integration; M1 owns the shared failing test | Unchanged head `fbf2090` has one actual failed job in `38698635434`: Ubuntu Node 20 test 163 (`RETRY_LIMIT` in M1-owned file-store test, #51). Ubuntu Node 22, Docker, sponsor-smoke passed; macOS/Windows cancelled after fail-fast; package-smoke skipped. Trigger UNKNOWN; no M4 cause or incident inferred. | M1 resolves/diagnoses #51; M4 supplies exact worktree and focused console tests; then rerun full exact-head matrix and package-smoke. Reconcile shared Hook test via #56; keep PR #34 Draft. |

Do not conflate this CI gate with M1 quarantine retry diagnosis #51; preserve all assertions and unsupported/unknown states.

## M9 composition and owner-response risk — 2026-10-18 01:20 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M9 exact-head security composition (#55) | P1 / M3 + M9; M1 contract owner | PR #36 head `de3799a` product CI 9/9 and wrapper 2/2 pass, but composition run `38727481764` fails on Ubuntu and Windows. The tracked issue identifies an unpinned native Read contract mismatch; no M3/M9 head change is visible. | M3 preserves explicit deny for unpinned reads and a supported-capability positive control; M9 pins reviewed M1/M3 refs and reruns exact composition. |
| Remaining M9 release gates (#52/#53/#58/#59/#41/#57) | P0/P1 / M1–M9 owners by issue | Open issues still require protected-path/host evidence, real packaged-Hook evidence, reviewed ignore rules, M6–M8 shared-path ownership, clean-VM lifecycle, and independent E4. | Keep M9 Draft; do not mark final integration PASS until each owner-specific artifact/check is recorded. |

This checkpoint does not infer a production bypass, leak, data loss, successful installation, or independent E4 result.
## M0 integration risk update — 2026-10-18 02:20 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M5 protected-path alias and shared-file contract (#52) | P0 / M5 implementation, M1 canonical contract, M9 composition | PR #47 head 373e2c2 product CI 9/9 including package-smoke; synthetic alias fixtures are documented. PR #47 also changes M1-owned router and shared test paths. Product-host wiring, held-object use, TOCTOU, and M1 disposition are NOT_VERIFIED/pending. No actual exposure is claimed. | M1 reviews shared-path semantics; M5 preserves hard denials and owner boundaries; M9 runs exact-head composition and records host evidence. Keep OPEN. |
| M1/M4/M5 shared Hook tests (#56) | P2 / M1 canonical owner; M0 coordination | PR #30, #34, and #47 change M1-owned test/agent-hook.test.ts; M5 copy differs from M1 current head. | M1 records canonical test disposition; keep #30 Draft until its diff and scope are reconciled. |
| M9 cross-module composition (#55 and #36) | P1 / M3 + M9; M1 interface owner | PR #36 product CI 9/9 and wrapper 2/2 pass; composition run 38727481764 still fails on Ubuntu and Windows. | M3 preserves fail-closed unpinned-read behavior and positive control; M9 pins reviewed heads and reruns both composition jobs. Do not mark integration PASS. |

This checkpoint does not establish a production bypass, sensitive-data exposure, successful host integration, installer acceptance, or independent E4 result.

## M0 P0 evidence checkpoint — 2026-10-18 05:16 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path alias / first-party host enforcement (#52) | P0 / M1 contract, M2 host adapter, M5 policy, M9 composition | Read-only audit reports synthetic junction denial with `verifyRealPaths` enabled, but M2 PR #37's adapter call is only in a check harness and does not add a core host callsite. Baseline `src/agent-integrations.ts:31` marks native tools OUT_OF_SCOPE. Real host use, protected-open/held-object, and TOCTOU remain NOT_VERIFIED. No real bypass is asserted. | M2 supplies the actual host consumer/path and protected-object evidence; M1 reviews any contract change; M9 reruns exact reviewed heads. Keep OPEN. |
| Sensitive Hook log data in shipped package (#53) | P0 / M7 package evidence, M8 docs/source, M9 acceptance | Current Windows verifier uses a synthetic temp payload, compiles only, reports `installerExecuted=false`, and deletes the output; workflow has no artifact upload. An older unsigned candidate.3 hash exists without a tracked Setup.exe and with GUI install NOT_VERIFIED. No current extracted-Hook proof or real disclosure is established. | M7 uses the scheduled installer/VM slot to locate/build only from authentic inputs and capture sanitized, hash-bound evidence or name the missing artifact; M8 owns any Hook-source correction. Keep OPEN. |

M1 + M3 reached the 05:20 UTC boundary. At 05:40, no new M2/M7 PR head or owner evidence was visible; those lanes continued through 06:00. At 06:00 no M2/M7 result was visible, so M2 was paused and M1 owned #52 through 06:20 while M7 continued #53. At 06:20 M1's registered worktree was still clean and no owner result was visible; M1 is paused with work preserved, M2 resumed #52 through 06:40, and M7 retained the exclusive installer/VM slot. At 06:40 no M2/M7 result was visible; both are paused by schedule with work preserved, and the installer/VM slot is released. M1 now works #51 and M8 works the source/logging half of #53 through 07:00. No P0 gate is closed by synthetic tests or source inspection.
## M0 #52 host-integration scheduling update — 2026-10-18 03:00 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| First-party host use of execution isolation (#52) | P0 / M2 adapter + host integration; M1 Gateway contract; M5 policy; M9 composition | M5 PR #47 alias/path fix has exact-head CI 9/9. No M2 worktree or new M2 implementation is verified in the inspected clone; held-object use, protected-open, and TOCTOU remain NOT_VERIFIED. | M2 confirms existing path and wires through the current M1 contract; M1 reviews any public interface change; M9 runs exact-head composition. Keep OPEN. |

No production bypass or real exposure is claimed. Synthetic path-alias evidence is not host-enforcement acceptance.
## M0 cross-module status — 2026-10-18 03:40 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | M3 #33 head be388029 exact CI passes 9/9, but the branch-local contract allows an unpinned normal Read; M1 requires native_file_execution_not_pinned denial. M9 run 38727481764 fails Ubuntu/Windows. | M3-owned fail-closed correction plus supported-capability positive control; M9 repins reviewed M3 SHA and reruns both composition jobs. Preserve M1 tests; keep #55 OPEN. |
| First-party isolated host (#52) | P0 / M2 adapter, M1 Gateway, M5 policy, M9 composition | M5 #47 is green 9/9. M2 path and host consumer remain unverified; protected-open/held-handle and TOCTOU remain NOT_VERIFIED. | Resume M2 after exact existing path is reported; use current M1 contract; M9 composition and host evidence required. Keep #52 OPEN. |

No production bypass, real disclosure, or installed-host enforcement is claimed.

## M0 07:00 UTC cross-module risk checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| First-party host enforcement for protected paths (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | Adapter call remains in a synthetic/check harness. First-party host callsite, protected-open/held-object, and TOCTOU are NOT_VERIFIED. No real bypass is claimed. | M2 supplies the exact consumer and deny-before-callback proof or named missing owner/path; M1 reviews contract changes; M9 composes exact reviewed SHAs. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | Source wrapper logs fixed fields and current reason tokens are static; no caller-data leak was reproduced. Actual Setup.exe/manifest/extracted-Hook evidence is still absent. | M7 provides hash-bound artifact and harness evidence or precise blocker. Do not treat source tests as package acceptance. |
| M6–M8 Windows packaging overlap (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 composition | No exact path-owner acceptance is visible; M9 composition run 38727481764 failed on Ubuntu and Windows at the current recorded refs. | Owners confirm exact canonical paths and M9 pins the reviewed SHAs before composition rerun. Preserve each module's tests and semantics. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 exact-head M9 readiness checkpoint — 2026-10-18 11:18 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 adapter, M3 host integration, M1 Gateway contract, M5 policy, M9 | M3 PR #33 contains a Gateway-backed synthetic MCP self-test at `src/codex-connection-mcp.ts:21,35`, but it uses `files: []` and fixed callbacks; M3 `src/agent-integrations.ts:64,69` marks native tools OUT_OF_SCOPE. M2 adapter invocations remain check-script-only. No protected user-file host route is proven. | M3 host -> M5 router -> M2 fixed-resource adapter -> M1 held-file dispatch; prove alias deny-before-callback and unchanged target bytes, or name the exact missing API/owner. Keep OPEN / NOT_VERIFIED. |
| Caller data in packaged Hook logs (#53) | P0 / M7 packaging, M8 Hook copy, M9 acceptance | A published candidate4 Community ZIP input and pinned toolchain hashes are available, but no current M7-built Setup.exe, manifest, extracted-Hook comparison, or packaged harness readback is visible. | M7 supplies its own exact-source hash-bound build and extraction chain. Published candidate4 assets are inputs, not M7 acceptance evidence. Keep OPEN / NOT_VERIFIED. |
| M9 cross-module native Read gate (#55/#36) | P1 / M3 Hook, M1 contract, M9 | M9 head `de3799a`; run `38727481764` fails Windows and Ubuntu because M3's unpinned normal Read returns allow instead of deny. The workflow pins M1 `b1d7423`, stale vs current PR #43 `9ef3dc2`. | M3 preserves the denial assertion and positive control; M9 then updates to exact reviewed heads and reruns both platforms. |
| M6–M8 packaging ownership/pins (#59) | P1 / M6 E4, M7 packaging, M8 docs/copies, M9 | No visible per-path owner/reviewer confirmation from M8 or affected M6/M7 owners. Current M6/M7/M8 heads remain #38 `c1fdf3c`, #39 `cf4b70f`, and #40 `c1ff677`. | Confirm primary owner and reviewer per intersecting path, then M9 consumes exact reviewed SHAs. Do not infer signoff from CI. |
| Root secret/temp ignore rules in M9 (#58) | P1 / M0 canonical rules, M9 integration | Current M9 diff still lacks the complete reviewed M0 secret/temp set; M0's narrow historical log exception does not establish broad log safety. No leak is confirmed. | M9 reconciles root rules while retaining only path-specific sanitized evidence exceptions; verify representative paths on exact head. |
| M4 exact-head desktop checks (#60) | P1 / M4 UI/tests, M1 shared Hook test | PR #34 head `fbf2090`; run `38698635434` has one M1-owned Ubuntu Node 20 test failure, with other platform checks cancelled/passed and package-smoke skipped. No M4 causation is established. | M4 supplies focused M4-owned behavior evidence; rerun exact-head matrix after M1 resolves #51. |

No production bypass, sensitive disclosure, successful package installation, external E4 acceptance, or fully green M9 composition is inferred by this checkpoint.

## M0 07:20 UTC integration readiness checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path host enforcement (#52) | P0 / M2, M1, M5, M9 | M2's synthetic adapter harness remains the only verified adapter callsite; first-party host/open-object/TOCTOU evidence is absent. | Keep NOT_VERIFIED; require exact host callsite and deny-before-callback proof or named blocker, then exact-head M9 composition. |
| Packaged Hook log privacy (#53) | P0 / M7, M8, M9 | Source wrapper uses fixed-field JSONL and current reason tokens; no caller-data leak reproduced. Current Setup.exe/manifest/extracted-Hook proof remains absent. | M7 must supply hash-bound package evidence or precise blocker; package and isolated VM gates stay open. |
| M6–M8 shared Windows/E4 paths (#59) | P1 / M6, M7, M8, M9 | No exact owner acceptance is visible; M9 composition remains failed on Ubuntu/Windows at recorded refs. | M6 confirms E4 files; M7 confirms installer paths; M8 confirms docs/Hook copy; M9 pins reviewed exact SHAs. Preserve each module's checks and semantics. |
| M3 native Hook unpinned-read contract (#55) | P1 / M3, M1, M9 | PR #33 current head be388029 does not yet have the requested owner correction; prior M9 run reports expected deny / actual allow. | M3-owned fix plus supported-capability positive control; rerun exact reviewed heads in M9 without changing the assertion. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred.

## M0 07:40 UTC integration gate audit — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| M9 composition exact-source pin (#36/#55) | P1 / M9 integration, M1 contract, M3 Hook | M9 workflow checks out M1 ancestor b1d7423, not current PR #43 head 9ef3dc2; M3 pin be388029 matches PR #33. Prior run 38727481764 fails both platforms and does not prove exact-current-M1 behavior. | M9 reruns unchanged assertions against exact current reviewed heads and records all SHAs; M3 supplies native_file_execution_not_pinned deny plus positive control. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | PR file lists confirm shared packaging/test paths; no owner acceptance is visible. M1 retains canonical Hook wrapper/test semantics. | M6 confirms E4 paths; M7 owns installer semantics; M8 names its exact copies/adapters; M9 consumes reviewed refs. No transfer inferred. |
| Quarantine retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Historical four-process test exhausted 500 STATE_STORE_BUSY retries; trigger remains UNKNOWN. | M1 provides a bounded current-head reproduction/diagnostic without changing production locks or retry cap. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred.

## M0 08:00 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | PR #37 remains at `9db59ed`; only the synthetic/check harness is verified. No first-party callsite or deny-before-callback evidence is visible. | M2 supplies the exact host consumer and alias-denial evidence, or names the missing path/API/owner. Preserve fail-closed behavior and module ownership. Keep OPEN / NOT_VERIFIED. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | PR #39 remains at `cf4b70f`; current hash-bound Setup.exe, manifest, and extracted-Hook comparison remain absent. Static/source checks do not establish package acceptance. | M7 supplies current artifact provenance and extraction evidence or the precise blocker. No install on the daily host. Keep OPEN / NOT_VERIFIED. |
| M6–M8 Windows packaging/E4 path ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 composition | No exact owner acceptance is visible; PR #38/#39/#40 shared paths remain unresolved. M9 composition must consume exact reviewed refs. | Confirm canonical owners, adapter/reviewer boundaries, and exact M9 SHAs; no ownership transfer by inference. |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Historical 4-process × 12-call test exhausted 500 retries on Ubuntu Node 20; current trigger remains UNKNOWN. | M1 supplies the bounded diagnostic/result while preserving all assertions, locks, fail-closed behavior, and retry cap. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 08:20 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No new public result during M2's 08:00–08:20 lane; PR #37 remains `9db59ed`. Synthetic adapter checks do not prove first-party host enforcement. | Keep OPEN / NOT_VERIFIED; require exact host callsite and deny-before-callback proof or named missing owner/path. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No new package result during M7's 08:00–08:20 lane; PR #39 remains `cf4b70f`. Current package/manifest/extracted-Hook chain remains unverified. | Keep OPEN / NOT_VERIFIED; require current hash-bound artifact evidence or a precise blocker. No daily-host install. |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | PR #33 remains `be38802`; required unpinned normal Read denial and supported positive-control result are not newly verified. | M3 implements the exact denial and preserves assertions; M9 consumes the reviewed SHA and reruns unchanged composition. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | Exact path ownership remains unresolved; PR #38 remains `c1fdf3c`. | M6 confirms per-path primary owner/reviewer and M9 exact-SHA plan; preserve M7 installer and M1 Hook boundaries. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 quota-gate recovery — 2026-10-18 08:27 UTC

- The 08:25 quota read timed out twice and screenshot fallback was rejected, so the planned M0 push was held and M3/M6 were sent emergency stop messages. The existing Usage tab recovered at 08:27 UTC and showed 64% five-hour / 94% weekly; the remaining 08:20–08:40 M3/M6 slot was resumed. Queue delivery is not proof of work start.
- Pause receipts: M3 `01a14e1f-2393-7910-a54b-094b8e44bb9d`, M6 `01a14e1f-25fc-7891-a6ea-8ed8959d98d9`. Resume receipts: M3 `01a14e20-16a8-7290-a844-fb7671c3e59b`, M6 `01a14e20-18e8-7a13-948c-086bc64ac4ff`.
- No module source or PR #24 change occurred during the gate. The M0 docs batch remains local pending fresh push preflight; last M0 push is 08:05 UTC.

## M0 08:40 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No new public evidence in M2's prior lane; PR #37 remains `9db59ed`. A synthetic harness is not a product host callsite. | M2 implements the M2-owned call path with deny-before-callback alias proof or identifies the exact absent host API/owner. Keep OPEN / NOT_VERIFIED. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No new package evidence in M7's prior lane; PR #39 remains `cf4b70f`. Current artifact provenance and extracted-Hook comparison remain absent. | M7 supplies current hash-bound artifact chain or precise blocker and owner deliverable. No daily-host install. Keep OPEN / NOT_VERIFIED. |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | No new PR #33 result; required denial and positive-control proof remain unverified. | Resume M3 for the exact policy-preserving fix and rerun M9 against reviewed exact heads. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | No new M6 owner confirmation; M9 exact reviewed refs still depend on explicit path responsibility. | Preserve ownership boundaries and require exact per-path owner/reviewer plus M9 pin plan. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 09:02 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No visible M2 PR/Issue result in the 08:40–09:00 lane; PR #37 remains `9db59ed`. A synthetic harness is insufficient. | Keep OPEN / NOT_VERIFIED until real host callsite and deny-before-callback alias proof or exact missing API/owner. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No visible M7 package result in the 08:40–09:00 lane; PR #39 remains `cf4b70f`. Current artifact provenance/extracted-Hook chain remains unverified. | Keep OPEN / NOT_VERIFIED until hash-bound package and extracted-Hook evidence or precise blocker. |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Historical Ubuntu Node20 4x12 run exhausted 500 retries; current trigger remains UNKNOWN. | M1 runs current exact test with bounded diagnostics without changing locks, assertions, fail-closed behavior, or retry cap. |
| M6–M8 Windows/E4 path ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | Exact M8 path-owner confirmation remains absent; M9 exact reviewed pins depend on explicit ownership. | M8 names its precise paths/adapters; M6/M7 retain E4/installer ownership; M9 pins reviewed exact SHAs. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 quota-gate recovery — 2026-10-18 09:11 UTC

- The 09:10 pre-push Usage read timed out, so the planned push was held and M1/M8 received a temporary stop message. After switching back to the existing Usage tab, a fresh read at about 09:11 showed 64% five-hour / 94% weekly; M1/M8 resumed the remainder of their current slot, preserving their work.
- Pause receipts: M1 `01a14e47-3b66-75b1-9e54-dcb99b736b65`, M8 `01a14e47-3da4-7f72-ad17-73ebced603b6`. Resume receipts: M1 `01a14e48-393c-7ad0-90f7-a843f17f2439`, M8 `01a14e48-3b71-7dc2-99e1-392b5b1040d6`. Delivery does not prove task start.
- No module source or PR #24 write occurred during the gate. The M0 documentation batch may continue only after fresh quota and PR/ref/scope preflight.

## M0 09:26 UTC integration gate checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 host adapter, M1 Gateway contract, M5 policy, M9 composition | No visible M2 result; PR #37 remains `9db59ed`. Synthetic harness is insufficient for first-party host enforcement. | Keep OPEN / NOT_VERIFIED until a real host callsite and deny-before-callback alias proof or exact missing API/owner. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package evidence, M8 source/logging, M9 acceptance | No visible M7 artifact; PR #39 remains `cf4b70f`. Current hash-bound artifact/manifest/extracted-Hook chain remains absent. | Keep OPEN / NOT_VERIFIED until current package evidence or precise blocker. |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 CI, M9 | Run `38698635434` has one actual failed Ubuntu Node 20 test 163; macOS/Windows Node 20/22 were cancelled, Ubuntu Node 22 passed. Trigger remains UNKNOWN. | M1 provides current exact-run bounded diagnostics; preserve locks, assertions, fail-closed behavior, and 500 cap. |
| Unpinned native Hook read (#55) | P1 / M3 behavior, M1 contract, M9 composition | PR #33 still lacks visible exact correction/positive-control result. | M3-owned denial with exact reason and supported positive control; M9 consumes reviewed exact SHA. |
| M4 security center exact-head verification (#60) | P1 / M4 UI/tests, M1 shared Hook test, M0 gate | PR #34 run has one M1-owned Ubuntu Node 20 failure; remaining platform checks were cancelled or passed, package-smoke skipped. No M4 causation established. | M4 provides focused M4-owned test evidence without editing M1 shared files; full exact-head matrix only after #51 owner resolves. |
| M6–M8 Windows/E4 ownership (#59) | P1 / M6 E4, M7 packaging, M8 docs/Hook copy, M9 | M8 path-owner result remains absent; exact reviewed refs still need owner acceptance. | M8 names exact paths/adapters; M6/M7 retain E4/installer semantics; M9 pins reviewed exact SHAs. |

No production bypass, real disclosure, data loss, successful installation, or independent E4 result is inferred by this checkpoint.

## M0 exact-head CI update — 2026-10-18 11:50 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M4 exact-head CI, M0 coordination | M0 PR #30 head `a1b0f8da79f9c0c3cd5e9dea365a0ab07928364e` run `39124717837` failed Ubuntu 24.04 / Node 22.23.3 test 163 in `test/file-state-store.test.ts`: 500 `STATE_STORE_BUSY` retries reached `RETRY_LIMIT`; build passed, 321 passed / 1 failed / 4 skipped. Other Node matrix jobs were cancelled and package-smoke skipped by fail-fast; sponsor-smoke, docker-build, and ownership check passed. No data loss or corruption is established. | Keep OPEN/P1; M1 preserves the retry cap, assertions, production lock and fail-closed behavior, and compares exact failure timing/lock diagnostics before any implementation change. |## M0 11:58 UTC active-lane checkpoint — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path first-party host enforcement (#52) | P0 / M2 adapter, M3 host, M1 Gateway, M5 policy, M9 | The 11:38–11:58 M2/M3 slot ended without visible PR-head or Issue-result movement; private workspace activity remains UNKNOWN. M3 is paused by schedule, M2 continues in its owned adapter path. | M2 provides its exact seam/tests or a precise contract blocker; M3 later consumes the seam in its owned host path. Keep OPEN/P0/NOT_VERIFIED until deny-before-callback alias evidence and a registered-file positive control are composed. |
| Caller data in packaged Hook logs (#53) | P0 / M7 package, M8 Hook copy, M9 acceptance | M7 is assigned a build-only provenance chain using the published candidate4 ZIP and pinned official NSIS/Node inputs. No fresh Setup.exe/manifest/extracted-Hook chain is yet verified. | Require source/input/tool hashes, exact Setup.exe hash, manifest, extracted Hook comparison, and packaged harness result. No install, VM, or VMware run is reserved. Keep OPEN/P0/NOT_VERIFIED. |

## M0 M9 composition status — 2026-10-18 12:04 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Exact-ref M9 security composition (#36/#55) | P1 / M3 Hook, M1 contract, M9 workflow | Current PR #36 head de3799a has 11/13 checks green; both compose-current-module-refs jobs fail in run 38727481764 (Ubuntu and Windows). The reproduced mismatch remains M3 unpinned native Read expected deny / actual allow; M9 still pins stale M1 b1d7423 versus current M1 PR #43 head 9ef3dc2. | M3 retains the fail-closed denial and supported-capability positive control; M9 updates reviewed exact refs and reruns both OS jobs. Keep #55/#36 OPEN; host routing remains NOT_VERIFIED. |

## M0 #51 exact-head follow-up — 2026-10-18 12:11 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M0 CI coordination | M0 PR #30 head 2566220 run 39126103158 passes 9/9, including the Ubuntu Node22 test 163 that failed on prior docs-only head a1b0f8d in run 39124717837. Store/test sources did not change between these M0 commits; the observed failure is intermittent, with trigger UNKNOWN. | Keep OPEN/P1 for M1 diagnosis; preserve lock, fail-closed behavior, assertions, and retry cap. No data loss/corruption is established. |

## M0 12:29 UTC lane handoff — 2026-10-18

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Protected-path host enforcement (#52) | P0 / M2 adapter, M3 host, M1 Gateway, M5 policy, M9 | M2's final checkpoint ended with no visible PR/Issue result; M2 is paused by schedule, private state UNKNOWN. No host route/alias evidence is established. | Keep OPEN/P0/NOT_VERIFIED; next M2 slot requires exact adapter files/tests or API blocker, then M3 composes without editing M1 shared tests. |
| Packaged Hook data disclosure (#53) | P0 / M7, M8, M9 | M7's checkpoint ended without current Setup.exe/manifest/extracted-Hook evidence; M7 is paused by schedule, private state UNKNOWN. | Keep OPEN/P0/NOT_VERIFIED; require source-bound build/hash/harness chain; no install or VM claim. |
| Unpinned native Read contract (#55) | P1 / M3 behavior, M1 contract, M9 | M3 is active on PR #33 to deny unpinned native Read with the canonical reason and preserve a supported-capability positive control. | Keep OPEN until M3 exact-head evidence passes and M9 consumes the reviewed SHA; M3 does not edit M9 workflow or M1 shared Hook tests. |
| Quarantine retry exhaustion (#51) | P1 / M1 store | M1 is active comparing M0 exact-head failure 39124717837 with pass 39126103158; trigger remains UNKNOWN and no data loss/corruption is established. | Preserve assertions, lock/fail-closed behavior, and retry cap; require bounded cause/diagnostic or precise blocker. |

## M0 #51 CI confirmation — 2026-10-18 12:32 UTC

| Risk | Priority / owners | Current evidence and status | Gate |
| --- | --- | --- | --- |
| Quarantine concurrency retry exhaustion (#51) | P1 / M1 store, M0 CI coordination | After failure on docs-only M0 head a1b0f8d (run 39124717837), two consecutive docs-only exact heads 2566220 and b7b6e14 passed 9/9, including the Ubuntu Node22 state-store test. Source/test did not change. | Trigger remains UNKNOWN despite passing reruns. Keep OPEN/P1 for M1 bounded diagnosis or blocker; preserve all assertions, production lock/fail-closed behavior, and retry cap. No data loss/corruption is established. |

### M0 scheduler update — 2026-10-18 12:54 UTC

#59 has a visible 12:49–13:09 UTC read-only assignment to M6 and M8 for path-level primary-owner/reviewer mapping across PRs #38/#39/#40. The assigned comparison must state M9's exact consuming SHAs (`#38 c1fdf3c`, `#39 cf4b70f`, `#40 c1ff677`) and identify any missing M6/M7 confirmation. No result is visible yet and private execution is UNKNOWN; keep #59 OPEN/P1. M1 #51 and M3 #55 are schedule-held while this two-lane window runs. No install, VM, VMware, or real-model resource is reserved.

### M0 #59 patch-level cross-check — 2026-10-18 12:59 UTC

Paginated current-head patches confirm that #38/#39/#40 overlap on the Hook wrapper and two tests, and that each PR alters the M1-owned `test/agent-hook.test.ts`. M1 review is required for the shared test and Hook semantics; M6 owns the E4 test contract; M7 owns packaging/lifecycle behavior; M8's fixture/docs/consumer changes require the relevant owner review. `package.json` fields and the shared `.gitattributes` purpose still need named owner confirmation. M9 pins #38/#39/#40 exactly but has a stale M1 pin (`b1d7423...` vs current #43 `9ef3dc2...`). Keep #59 OPEN/P1 pending the owner map and confirmations; no source/test changes were made by M0.

### M0 M9 exact-pin blocker — 2026-10-18 13:02 UTC

Issue #61 tracks the M9 workflow's stale M1 source pin at PR #36 head `de3799a...` (`b1d7423...` versus current PR #43 head `9ef3dc2...`) and the exact-head remediation after M1/M3 confirmation. Run `38727481764` is historical and fails both composition platforms; its log identifies the M3 unpinned native Read assertion failure. Keep #61 OPEN/P1 and PR #36 Draft until the owner-reviewed M1 ref is pinned and #55 is fixed with the positive control preserved. M0 did not edit module code or weaken checks.

### M0 P0 scheduler update — 2026-10-18 13:10 UTC

M2 #52 and M7 #53 are assigned as the only two active lanes through 13:29. M2 must provide a real supported first-party protected-file host path and alias-denial/positive-control evidence, or a precise owner/API blocker. M7 must provide a source/tool/hash-bound build and extracted-Hook harness chain or a precise missing input; this slot authorizes no installation, VM, or VMware test. M6/M8 #59, M1 #51, and M3 #55 are paused with work preserved; private status remains UNKNOWN. The P0 issues stay OPEN/NOT_VERIFIED until evidence is visible.

### M0 quota hold/recovery — 2026-10-18 13:30 UTC

A transient Usage-page timeout at 13:19:55 caused a hold on #52/#53 and all pushes. Two successful reads at 13:29:42 and 13:30:19 showed 92% five-hour / 81% weekly; M2/M7 then resumed under a fresh 13:30–13:50 assignment. The browser issue is reported; the Usage tab remains open. No module source was changed during the hold.

### M0 13:40 exact-head readback

PR #30's docs-only head `8e44dad` passes product CI 9/9 and coordination CI 1/1. PR #24 remains unchanged. M2 #52 / M7 #53 are still assigned through 13:50; public PR refs are unchanged at this checkpoint, with private work status UNKNOWN. Both P0 gates remain OPEN/NOT_VERIFIED.
