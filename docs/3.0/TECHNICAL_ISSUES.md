# M0 技术问题分级与协作流程

## Latest issue ledger (2026-10-15 08:12 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #29 | P2 / M0 | M1 completed its read-only #52 Gateway audit; M2 completed adapter compatibility review without a shared API change. M7 #39 `52cc149` exact-head product run `38701046560` passes 9/9 and wrapper run `38701046563` passes 2/2. | OPEN; active coding slots 2/2 (M7/M8 static package-reachability audits). No exclusive resource reserved. Last public write was 07:52:36 UTC; next batch no earlier than 08:12:36 UTC. Keep the quota page open and stop below 5% or if unreadable. |
| #30 | P1 / M0 | Remote PR #30 head `c61c6a46d6db92d31c069a2a380427381b5d3950` passes 10/10; M0 has two local documentation commits pending the batch. | OPEN/Draft; keep for coordination-doc review. |
| #41 | P1 / M7 | PR #39 `52cc149` passes product checks 9/9 and wrapper checks 2/2. | OPEN/HOLD; clean-VM install/launch/upgrade/uninstall/rollback remains NOT_VERIFIED. Reserve the exclusive VM/installer resource before lifecycle testing. |
| #45 | P1 / M2; M4 security-center visibility | PR #37 remote head `76066cb` passes 9/9. M2 local commits `dab0445` and `9db59ed` clarify local PreToolUse behavior, failure limits, and adapter compatibility; neither configures/trusts a Hook or proves native Shell enforcement. M4 #34 `fbf2090` persists Native Codex Shell `UNPROTECTED / BLOCKED_NOT_VERIFIED`; its single CI failure is tracked under #51. | OPEN/BLOCKED_NOT_VERIFIED; actual supported-host enforcement remains unverified. |
| #51 | P1 / M1 | PR #34 run `38698635434`: Ubuntu Node 20 worker 2 reached 500 `STATE_STORE_BUSY` retries and `RETRY_LIMIT` before final state assertions. Node 22 passed; four matrix jobs cancelled by fail-fast; package-smoke skipped. | OPEN; root cause UNKNOWN. Preserve `RETRY_LIMIT` and all assertions; no data loss or causal product defect established. |
| #52 | P0 / M1 Gateway, M2 adapter, M5 policy, M9 integration; M0 coordinates | M1 confirms a held-fd Gateway implementation, but its only in-repo consumer is a temporary-file demo, not a production agent host. A synthetic race after `verifyRealPaths` but before a host callback's path-based read reached an outside hard-link sentinel; this demonstrates the generic callback boundary is not protected-open, not production exposure. M2 confirms its existing adapter and M1/M5 APIs are compatible; adapter/build checks and the exact M1/M2/M5 M9 case pass, but no first-party production host callsite exists. M9 local commit `4d1dc7a` adds synthetic composition tests; previous remote #36 head `3dfef35` passed 13/13 and cross-tree run `38696382427` passed on Ubuntu and Windows. | OPEN/P0; production host wiring and atomic protected-open remain NOT_VERIFIED. Retain TOCTOU limits; require a real host-owned protected-handle path before closure. |
| #53 | P0 candidate / M1 logging contract, M7 packaging; branch-copy owners | M7 #39 `52cc149` product 9/9 and wrapper 2/2; M8 #40 `d12dd2c` 11/11. M7 and M8 are tracing their exact source-to-payload staging paths in owned worktrees. Tests cover synthetic/co-located payloads. | OPEN; built-installer reachability, clean-VM lifecycle, and independent E4 remain NOT_VERIFIED; no confirmed exposure or external transmission. |

## Archived issue ledger (2026-10-15 07:31 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #29 | P2 / M0 | M4 #34 `fbf2090` passed its UI-focused tests; exact-head CI has one Ubuntu Node 20 #51 failure, while Ubuntu Node 22/build/sponsor pass, four matrix jobs were cancelled by fail-fast, and package-smoke was skipped. M8 #40 `d12dd2c` passes 11/11. M7 completed local commit `52cc149`; M1's #51 diagnosis found no cause or code fix. No exclusive test resource is reserved. Usage page remains open. | OPEN; cap active module work at two. VMware, real-model, installer tests require an exclusive reservation. Next public write no earlier than 07:45 UTC. |
| #30 | P1 / M0 | PR #30 head bd8686e passes all 10 checks, including ownership-contract-evidence and package-smoke. | OPEN/Draft; keep for coordination-doc review. |
| #41 | P1 / M7 | PR #39 exact head `87e0df0` passes 11/11; no clean-VM install/launch/upgrade/uninstall/rollback evidence. | OPEN/HOLD; reserve the exclusive VM/installer resource before lifecycle testing. |
| #45 | P1 / M2; M4 security-center visibility | PR #37 exact head 76066cb passes 9/9; M4 PR #34 contains fbf2090, which makes Native Codex Shell's UNPROTECTED / BLOCKED_NOT_VERIFIED state persistent in the UI. Host policy/callback remains unavailable; #34's separate exact-head failure is tracked by #51. | OPEN/BLOCKED_NOT_VERIFIED; UI visibility does not provide native protection evidence. |
| #51 | P1 / M1 | New PR #34 exact-head run 38698635434 fails the four-process quarantine test on Ubuntu Node 20: worker 2 reaches 500 `STATE_STORE_BUSY` attempts and `RETRY_LIMIT` before the final state assertions. Exact CI source/test blobs match M1 `f14aab7`; Ubuntu Node 22 passes and the remaining four matrix jobs were cancelled. Lock release uses `finally`, but logs omit holder/timing traces. No data loss/corruption or causal code defect is established. | OPEN; trigger remains UNKNOWN. Preserve `RETRY_LIMIT` and all state assertions; do not infer a Node-version defect or weaken tests. |
| #52 | P0 / M5 policy, M2 adapter, M9 integration; M0 coordinates | M5 PR #47 head b6a40b4 passes 9/9. M9 PR #36 head 3dfef35 passes 13/13; cross-tree run 38696382427 passes on Ubuntu and Windows, and logs exact M1/M2/M5/M9 source SHAs. Production host wiring and protected open/handle remain NOT_VERIFIED. | OPEN. Preserve TOCTOU limits; do not close until a real product host demonstrates the protected open/handle enforcement path. |
| #53 | P0 candidate / M1 logging contract, M7 packaging; branch-copy owners | M8 PR #40 head `d12dd2c` passes 11/11 and adds strict allowlisted JSONL/timestamp assertions plus a co-located payload regression. M7 local `52cc149` adds direct positive-control log assertions (focused test 1/1); exact-head CI pending. Clean-VM/package lifecycle and independent E4 remain NOT_VERIFIED. | OPEN pending complete reachable-copy/built-package evidence; no actual exposure or external transmission is claimed. |

## Archived issue ledger (2026-10-15 06:05 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #27 | P1 / M6, M9; M0 coordinates | Issue body records acceptance at M3/M5/M6/M7/M9 verified heads; previous M9 #36 head `2d3f1da` passed 11/11 exact-head checks. Current M9 head `f87a70f` adds test-only M1/M5 Gateway composition coverage; its exact-head CI is running. PR body correction is in the current batch. | CLOSED for shared manifest ownership and M9 combined validation only; independent external E4 remains NOT_VERIFIED. |
| #29 | P2 / M0 | Usage page reread at 06:14 UTC, readable and above stop threshold. M1/#51 remains active; M5 completed its #52 read-only host-callsite audit. M9's synthetic M5-to-M1 Gateway composition test is pushed on PR #36 at `f87a70f`; exact-head CI is running. M2/#52 is active on an M2-owned adapter candidate for the existing Gateway seam. M2/#37 and M8/#40 exact heads are green; original WSL worktrees remain untouched. | OPEN; keep the two-task cap and VMware/model/installer unavailable until a visible exclusive reservation exists. Stop if quota is unreadable or below 5%; after the last public write at 05:50:51 UTC, next public writes are no earlier than 06:10:51 UTC. |
| #32 | P1 / M1; M0 tracks | M1 focused Windows diagnostics; M1/M3/M4/M6/M9 current exact-head checks green; M6 accepts timing-equivalent fixture; historical failing runs retained. | CLOSED for the synthetic subprocess marker regression only. Why the original runner exceeded the one-second window remains UNKNOWN; native-host callback remains NOT_VERIFIED. |
| #41 | P1 / M7 | PR #39 current head `87e0df0` checks 11/11; no clean-VM install/launch/upgrade/uninstall/rollback evidence. | OPEN/HOLD; exclusive resource and sanitized lifecycle proof required. |
| #45 | P1 / M2 | PR #37 checks 9/9; native Codex Shell host policy/callback unavailable. | OPEN/BLOCKED_NOT_VERIFIED; do not claim native protection. |
| #51 | P1 / M1 | M1 matched Ubuntu Node22 attempt 1 and M0 Windows Node20 run `38682225388`: both exhausted 500 retries; identical store/test blobs pass in later M1 Windows Node20 CI. Local Windows Node22 test and 48-state diagnostic pass. CI lacks lock-owner/duration traces; no source change or assertion reduction. | OPEN; root cause UNKNOWN. Preserve `RETRY_LIMIT` and all 48 assertions. |
| #52 | P0 / M1 router, M5 policy, M2 adapter candidate; M0 coordinates | M5 read-only audit found no production file-host consumer: `risk-policy.ts` delegates to a host callback; policy-management filesystem I/O is policy/audit state. M1 Gateway has a registered-file held-handle path. M9 remote head `f87a70f` verifies synthetic OBSERVE routing into that Gateway (4/4 focused tests, build and diff checks pass); M2 is implementing an owner-scoped adapter candidate on its existing branch. | OPEN pending a real product host that consumes the adapter and evidence that it opts into canonical-path checks and opens through a protected handle/no-follow/OS boundary. Synthetic composition alone does not close the issue; retain the documented TOCTOU limit. |
| #53 | P0 candidate / M1 logging contract, M7 Windows packaging; affected branch-copy owners | M3 #33 uses fixed allowlisted fields and synthetic input/reason canaries; M4 #34, M5 #47, M6 #38, M7 #39 and M9 #36 carry M1 wrapper blob `d6f9324`. M2 #37 is now `04c7ec7` and M8 #40 `454873c`; both carry sanitized wrapper copies and exact-head CI is green (9/9 each). M9 #36 head `2d3f1da` adds exact-head CI coverage for a packaged Windows E4 wrapper copy with synthetic argument/reason/path/command canaries. | OPEN; verify every reachable/shipped package copy, retain M7 package and M9 composition evidence. No confirmed exposure or external transmission. |

## Archived issue ledger (2026-10-15 04:04 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #27 | P1 / M6, M9; M0 coordinates | M6 fields match M9. M9 `37a09e8` exact-head CI passes 11/11; local composition 53/53, full npm test 409 pass/0 fail/6 environment skips, build, E4 16/16, package smoke 100 files pass. | OPEN pending owner/issue record synchronization; external E4 remains NOT_VERIFIED and the separate #51 trigger remains UNKNOWN. |
| #29 | P2 / M0 | Usage page read at 04:00 UTC, readable and above stop threshold. VMware/model/installer occupancy is not confirmed. | OPEN; keep two module-task cap; reserve exclusive resources visibly before any such test. Stop all work if unreadable or below 5%. |
| #32 | P1 / M1; M3/M4 own copies | PR #33/#34 current heads pass 9/9; current fixture evidence remains synthetic and does not establish real host callback. Historical runner delay remains UNKNOWN. | OPEN pending owner scope and real-host evidence; retain fail-closed/no-output/no-decision assertions. |
| #41 | P1 / M7 | PR #39 exact head passes 9 product checks+2 wrappers; clean-VM install/launch/upgrade/uninstall/rollback not run or verified. | OPEN/HOLD pending exclusive reservation and sanitized lifecycle evidence. |
| #44 | P1 / M1; M9 baseline acceptance | Expiry tests preserve EXPIRED and zero callback; baseline review accepted. | CLOSED only for approval-expiry timing and M9 baseline scope. |
| #45 | P1 / M2 | PR #37 passes 9/9; native desktop policy/trust/callback remain unobservable. | OPEN/BLOCKED_NOT_VERIFIED; Native Codex Shell remains UNPROTECTED. |
| #51 | P1 / M1 | 500 consecutive `STATE_STORE_BUSY` retries reach `RETRY_LIMIT`; ten-run Linux workflow passes, original lock-holder/timing cause absent. | OPEN; cause remains UNKNOWN. Preserve all assertions and do not infer data loss/defect. |
| #52 | P0 / M1 router, M5 policy; M0 coordinates | M1 `f14aab7`, M5 `c54e7eb`+`0fdbd92`, M9 `37a09e8` are on pushed heads; M9 exact-head CI 11/11; synthetic junction read/write and M5 sensitive-path tests preserve DENY, zero approvals/callbacks and unchanged fixtures. | OPEN pending evidence that real filesystem hosts opt in and protect the open/handle. TOCTOU and native-host wiring remain NOT_VERIFIED. |

## Archived issue ledger (2026-10-15 03:31 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #27 | P1 / M6, M9; M0 coordinates | M6 `cd55717` is the exact PR #38 head; product checks 9/9 and wrappers 2/2 pass. Owner confirms all `e4:*` fields match M9. M9 local clean `e2e25fb` passes build, `e4:test` 16/16, `verify` 399 pass/6 skip/0 fail, and package smoke 100 files; M6 owner final rereview found no contract gap. | OPEN until M9 exact-head CI and combined acceptance pass. External E4 remains NOT_VERIFIED; path reads retain the documented TOCTOU limitation. |
| #29 | P2 / M0 | Usage was freshly read at 03:31 UTC, remained readable and above 5%; the last public-write batch completed at 03:13:51 UTC. Exclusive VMware/model/installer occupancy remains unknown. | OPEN; keep the two-task cap and existing worktrees. Do not run exclusive tests until owner/resource/worktree/start/release are recorded. Stop if usage is unreadable or below 5%; next public batch no earlier than 03:33:51 UTC. |
| #32 | P1 / M1 Hook semantics; M0 tracks; M3/M4 own branch copies | PR #33 `f9bd818` run `38672489688` and PR #34 `9288de0` run `38672493385` each pass 9/9; Windows Node20 is green on #33. Historical direct mechanism was the old fixture's 1s marker window; why the runner exceeded it remains UNKNOWN. Synthetic fixtures do not verify a real host callback. | OPEN pending M9 combined-baseline review and real-host callback evidence. Preserve no-output/no-decision/fail-closed checks; do not report the historical runner delay as explained. |
| #51 | P1 / M1 | Direct failure path remains 500 consecutive `STATE_STORE_BUSY` retries ending in `RETRY_LIMIT`; the original lock-holder/timing evidence is absent. Ten-run workflow passes. | OPEN because the original contention trigger is UNKNOWN; preserve all assertions and do not infer data loss or a code defect. |
| #52 | P0 / M5 policy, M1 router/Gateway boundary; M0 coordinates | PR #47 `c54e7eb` exact-head product CI passes 9/9. M1 Gateway holds and rechecks file handles, but no native host callback is connected to it. M5 has no production file-host consumer; its adapter passes through explicit `verifyRealPaths` and does not open files. | OPEN pending evidence that each real filesystem host opts into the canonical-path boundary and opens through a protected handle/no-follow/OS boundary. Preserve hard DENY, zero-callback assertions, and the documented TOCTOU limit. |
| #41 | P1 / M7 | PR #39 checks pass 9 product jobs plus 2 wrappers; clean-VM install/launch/upgrade/uninstall/cancel rollback remains NOT_VERIFIED. | OPEN/HOLD; reserve the exclusive VM/installer resource before testing and retain sanitized lifecycle evidence. |
| #45 | P1 / M2 | PR #37 checks pass 9/9. M2 found no reproducible repo-level fail-open, but the effective desktop policy, Hook trust/source, and native callback are not observable. | OPEN/BLOCKED_NOT_VERIFIED; native Codex Shell remains UNPROTECTED until supported-host evidence and a real sentinel deny/hash test exist. |
| #44 | P1 / M1; M9 baseline acceptance | M1's short-TTL and exact-deadline tests preserve EXPIRED and zero-callback assertions; M9 baseline source/test comparison and exact-head checks were accepted. | CLOSED for approval-expiry timing regression and M9 baseline scope only; this does not establish native-host wiring or external side effects. |

## Archived issue ledger (2026-10-15 02:40 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #27 | P1 / M3, M5, M6, M7; M0 coordinates | M6 confirmed `e4:auto`, `e4:verify`, and `e4:test` match M9 exactly (`MATCH_CONFIRMED`). PR #38 remote head `0908449` checks 11/11; local verifier commit `cd55717` has `e4:test` 16/16 but is not covered by CI. M9 accepted manifest path compatibility and E4 API semantics. Shared store issue is separately owned by M1 under #51; ten-run Linux workflow passes, but its original trigger remains UNKNOWN. | OPEN for exact-head CI on `cd55717`, evidence-based store-cause classification, and combined manifest/package integration acceptance. External E4 remains NOT_VERIFIED. |
| #29 | P2 / M0 | No module task currently occupies a slot. M3 completed three Windows Node22 focused repetitions; M4 confirmed both runtime status endpoints are absent and UI remains UNKNOWN; M5 completed the explicit-realpath fix locally; M6/M9 package-field comparison is complete. M0 head `1a73704` was pushed at 02:20 UTC; current batch is due. Exclusive VM/model/installer occupancy remains unknown. | OPEN; keep the two-task cap and use existing worktrees only. Do not start exclusive tests until owner, resource, worktree, start and release are recorded. Stop all activity if the usage page is unreadable or below 5%. |
| #51 | P1 / M1 (confirmed by comment `6182359961`); M0 coordinates | Ubuntu 24.04 / Node 22.23.3 run `38662965312` initially failed worker 0 with `RETRY_LIMIT`; 322 pass/1 fail/4 skip. Final 48-write assertion did not run, so data loss is not established. M1 confirms the direct path: 500 consecutive `STATE_STORE_BUSY` lock attempts exhaust before the test sentinel `RETRY_LIMIT`; the underlying trigger remains UNKNOWN because original lock-owner/timing evidence is absent. M6 diff does not touch either store path; WSL reproduction inconclusive. Ubuntu Node22 full `npm test` passed in attempts 2–4. The dedicated ten-run workflow `38668337033` passed on merge candidate `3c8d880` (M1 `3828bee` + base `62496d4`): ten iterations each reported 17 tests / 14 pass / 0 fail / 3 skip, including all four-process runs. Standard PR #43 CI `38668336887` passed; current exact-head PR #38 product and wrapper checks are green. M0 comments `6182651725` and `6182797086` record evidence and root-cause limits. No store code/assertions changed; no data loss or implementation defect is established. | OPEN; repeated-run and current #38 CI gates are met. Keep open because the original contention trigger remains UNKNOWN; preserve all existing assertions. |
| #32 | P1 / M1 owns Hook semantics; M0 tracks; M3/M4 own their branch copies | M1 triaged Windows Node20 run `38390302812`: old `spawnSync` fixture waited only 1s for the marker; why the hosted runner exceeded 1s remains UNKNOWN. M3 `f9bd818` and M4 `9288de0` each port the bounded async fixture to their own test file; target files passed 10/10, M3 focused case passed three times on local Windows Node22. Local Node20 is unavailable. The synthetic child emits no allow output/decision log on interruption; it does not observe the real host callback. M6 fixture remains under its owned review. | OPEN pending M9 combined-baseline review and exact-head Windows Node20 CI for M3/M4 changes. Native-host callback stays NOT_VERIFIED; retain all fail-closed assertions. |
| #52 | P0 / M5 policy; M1 owns router contract; M0 tracks | Synthetic fixtures reproduced sensitive in-workspace junction and workspace-escape reads. M1 confirms the legacy `createRiskPolicyRouter` default intentionally omits realpath checks. M5 local `c54e7eb` preserves that default and gates canonical containment/sensitive-target classification behind explicit `verifyRealPaths:true`; junction tests assert zero approvals and zero callbacks. Policy tests 29/29, security-router tests 16/16, build passed. No actual data disclosure is claimed. | OPEN pending exact-head CI and evidence that real filesystem hosts opt into the canonical path boundary or equivalent no-follow/handle protection. Keep hard DENY and all zero-callback assertions. |
| #41 | P1 / M7 | PR #39 exact-head checks 11/11 pass. Clean-VM install/launch/upgrade/uninstall/cancel rollback remains NOT_VERIFIED; no exclusive reservation is recorded. | OPEN/HOLD; record the exclusive VM/installer reservation before testing and retain sanitized lifecycle evidence. |
| #45 | P1 / M2 | PR #37 checks 9/9 pass. M2 read-only audit found no reproducible repo-level fail-open; handler denies valid PreToolUse, but current session policy, managed/plugin hook sources, trust, and native callback are not observable. No WSL distro is available to verify M2 worktree Git status; no M2 files or tests were changed. Native Codex Shell remains UNPROTECTED. | OPEN/BLOCKED_NOT_VERIFIED; host owner must provide effective sandbox/profile and trusted Hook source, followed by a real Desktop Shell sentinel deny/hash check. |

## Archived issue ledger (2026-10-15 00:30 UTC)

| Issue | Priority / owner | Current evidence | State and next acceptance |
| --- | --- | --- | --- |
| #27 | P1 / M3, M5, M6, M7; M0 coordinates | PR #38 remote parent ed82f0612b9f69463afc9c80a1082b951e7e88fe has 9/9. Static M6/M9 script fields match. Comment 6181516836 records two reproduced P1 defects: verifier accepted forged E4_VERIFIED classification and Auto E4 rerun overwrote prior reports. M6 fix commit 4e39762 is local; focused tests 18/18; M0 readback comment 6181562646 confirms the clean commit scope, exact-head CI pending. | OPEN; keep both regressions, pass exact-head CI, obtain M6 owner disposition and M9 combined acceptance. External E4 remains NOT_VERIFIED. |
| #29 | P2 / M0 | M6 candidate 0908449 and M9 plan d133c35 are local commits awaiting the next batch; no module agent is currently editing. Last push 00:36 UTC; next batch no earlier than 00:56 UTC. Exclusive VM/model/installer occupancy remains unknown. | OPEN; do not start exclusive tests until owner, resource, worktree, start and release are recorded. Stop all activity if the usage page is unreadable or below 5%; exact quota values stay in ignored local reports. |
| #32 | P1 / M1 owns Hook semantics; M0 tracks; M3/M4 own their branch copies | M1 audit found no justified code change; comment 6181394646 records exact-head CI and Windows Node20/22 fixture logs (337 pass / 0 fail each). M3/#33 and M4/#34 remain on fixture blob 1ecb3ee; no M3/M4 acknowledgement follows the latest visible M1 audit. | OPEN; preserve fail-closed/no-decision assertions, keep M3/M4 on HOLD until acknowledged, then port the minimal M1-approved async timing fixture and run exact-head CI. Root cause UNKNOWN; native callback NOT_VERIFIED. |
| #41 | P1 / M7 | PR #39 remains at 4267c61; current checks 11/11 pass. Clean-VM install/launch/upgrade/uninstall/user-cancel rollback is NOT_VERIFIED. M0 comment 6180703085 requests evidence or BLOCKED_RESERVATION; no reply as of00:13. | OPEN/HOLD; reserve the exclusive VM/installer resource on #29 before testing; record sanitized lifecycle evidence. |
| #45 | P1 / M2 | PR #37 remains at 0f2c10c; current checks 9/9 pass. M2 audit is complete with no justified code change. Comment 6181405060 records BLOCKED_NOT_VERIFIED; native Codex Shell remains UNPROTECTED. | OPEN; obtain actual supported-host evidence without claiming WSL/protocol fixtures as host enforcement, or keep visibly UNPROTECTED. |
| #46 | P2 / M0, M5 semantics owner | Canonical M0 contract and M5 report are synchronized. | CLOSED 2026-10-14 19:28:53Z, documentation-only scope. |
| #48 | P1 / M1 and M5 | Scoped sensitive-read hard denial and zero-callback/zero-pending-approval evidence. | CLOSED for the recorded narrow behavior only. |
| #28, #35, #42, #44 | P1/P0 / respective owners | GitHub state is CLOSED/COMPLETED; closures remain limited to their documented Gateway contract, same-process quarantine, M3 manifest, or approval-expiry scope. | CLOSED with no inference of complete platform protection. |

## 最新问题台账（2026-10-14 19:12 UTC）

| Issue | 级别 | 责任模块 | 当前确认事实 | 状态/下一验收 |
| --- | --- | --- | --- | --- |
| #27 | P1 | M3/M5/M6/M7，M0 协调 | M9 `6abd4da` package.json blob `6b3042`；此前静态对照保留 36 个唯一测试路径与 AC3 package fields。M6 对 `e4:auto`/`e4:verify`/`e4:test` 尚无显式 owner 确认。 | OPEN；取得 M6 字段确认并记录组合接受 |
| #28 | P1 | M1 owner，M7 配合，M0 协调 | M7 #39 head 4267c61 的 Gateway/Guard 生命周期改动经 M1 owner确认，CI 9/9 + wrapper 2/2。 | CLOSED；仅限合同/生命周期代码审查，不代表 PR 合并或真实宿主验收 |
| #29 | P2 / M0 | M6 candidate 0908449 and M9 plan d133c35 are local commits awaiting the next batch; no module agent is currently editing. Last push 00:36 UTC; next batch no earlier than 00:56 UTC. Exclusive VM/model/installer occupancy remains unknown. | OPEN; do not start exclusive tests until owner, resource, worktree, start and release are recorded. Stop all activity if the usage page is unreadable or below 5%; exact quota values stay in ignored local reports. |
| #32 | P1 | M1 owner，M0 跟踪 | 当前 #43/#36 test blob `6c2d8da`；#37 `d3b64fc`；#33/#34/#38 `1ecb3ee`。M1 当前子进程夹具不能观测宿主 callback；各 PR 最新 checks 通过不能排除旧 fixture 的历史竞态。 | OPEN；M1 提供最小 owner-approved 更新/适配方案，受影响 PR 重跑 exact-head CI，保留 fail-closed 断言 |
| #35 | P0 | M1 | 关闭范围限同进程、同一 Guard 和遵守 AbortSignal 的 callback。 | CLOSED（有限范围） |
| #41 | P1 | M7 | PR #39 exact CI 9/9、wrapper 2/2，含 Windows pinned NSIS/template compile；clean-VM 安装、启动、升级、卸载及实际取消回滚仍 NOT VERIFIED/HOLD。 | OPEN / HOLD |
| #44 | P1 | M1 | #43 head d26a0c3 CI 9/9；M9 current Gateway/test blob 与 owner head 匹配；过期拒绝、pending 清理和 callback=0 证据已读回。 | CLOSED；仅审批过期路径和现有测试基线 |
| #45 | P1 | M2 | 子进程隔离和 Hook fixture 不覆盖实际 Codex 原生 Shell；宿主策略仍未启用/验证。 | OPEN / UNPROTECTED |
| #46 | P2 | M0 owner，M5 提供语义 | M0 contract blob `693d437` 与 M5 report blob `1300b4d` 已核对；M5 PR #47 head `7d5df63` 指向 canonical contract，run `38617317812` 为 9/9；#48 已关闭。 | 文档验收满足；下一批执行 GitHub 关闭并回读 |
| #48 | P1 | M1/M5，M0 契约 | OBSERVE sensitive-read hard DENY、审批队列零新增/callback=0及下游 egress 有限证据均记录。 | CLOSED（有限范围） |
| #49 | P1 | M0/M1/M9 | M0/M9 canonical 根路径与 M1 owner 契约路径已按 blob 对照，exact M9 CI 通过。 | CLOSED（仅路径/hash 和对应候选 CI） |

更新日期：2026-10-14 UTC。以上实时快照优先；其余 Issue 细节是对应日期的历史记录。

问题处理规则：P0 为保护路径失效放行、敏感信息泄露或严重数据损坏；P1 为接口不兼容、构建失败或关键功能不可用；P2 为非关键 UI、文档及一般性能。保留失败测试和安全策略，禁止伪造结果。跨模块 Issue 必须写责任模块、复现、验收标准和状态。

更新时间：2026-10-14 UTC。以上实时快照优先；其余 Issue 细节是对应日期的历史记录。

## 当前调度（2026-10-14 11:56 UTC；额度页 11:50 UTC；PR checks 11:45 UTC）

- **额度与推送**：网页 11:50 UTC 实读五小时 88%（4小时8分后重置）、周额度 66%（6天后重置）、113 credits。低于5%或读数不明即暂停。M0/M1/M7/M9 已推送本批更新，下批不早于 12:01 UTC。
- **CI 分流**：#43 当前头 9/9、#36 11/11 均通过。#30 当前头仅 Windows Node22 Hook interruption marker 失败；#39 当前头 Windows Node20/22 同一 M1 Hook 测试失败，其余矩阵及 wrappers 通过，package smoke 跳过。
- **跨分支冲突**：M1 owner 的最小可移植 Hook 夹具 patch 仅改 `test/agent-hook.test.ts`，SHA-256 `7b75374e…49e114b9`；M0/M2/M5/M7/M8 预检可用（M0 忽略 CRLF 空白差异）。M2/M8 正在各自分支应用；M0/M5/M7 尚未改动。不得声称该子进程夹具验证了宿主侧 callback=0。
- **集成验收**：#30/#37/#39/#40/#47 要在 owner 修正集成后重跑当前头 CI，保留 no-allow、无决策输出、quarantine、sentinel 和 hard DENY 断言，不删失败测试、不降低策略。子进程 Hook 夹具不能观测宿主侧 tool callback；只有真实宿主可观测的断言才可报告 callback=0。
- **未关闭 P1**：#27/#28/#32/#41/#44/#45/#48。原生 Shell、外部 E4、clean-VM 不得用本地协议测试代替；P2 #46 和 M4 后端诊断范围待分别验收。
- **调度**：最多两个模块任务并行；VMware、真实模型、安装测试互斥。PR #24 与 main 保持不动，不合并、不发布 Release。

## 当前调度（2026-10-14 11:26 UTC；网页额度约 11:24 UTC）

- **额度与推送**：五小时剩余 95%、约 4 小时 35 分钟后重置；每周 67%、113 credits。最近批次 11:15:25 UTC；不早于 11:35:25 UTC 再推送。额度低于 5% 或读数不明即暂停所有开发、测试、浏览器和 GitHub 操作。
- **当前 head checks**：#33/#34/#38 为 9/9，#36 为 11/11；#30/#37/#40/#47 有旧 `spawnSync` Hook interruption marker 测试失败；#39 蜜罐读取预期失败；#43 精确到期测试在 3 个矩阵失败。以上都以 11:24 UTC GitHub 回读为准。
- **责任路由**：#30/#37/#40/#47 的同步 Hook 子进程测试已由 M1 的异步、先确认入口再中断版本替代；失败分支仍包含旧基线测试，需协调按 M1 所有者提交做窄范围集成，并保留 no-allow/no-callback 断言。#43 的 1ms TTL 夹具已由 M1 在 `ca24d37` 改为 60 秒固定时钟。#39 的 M7 蜜罐读取期望已按 M1/M9 契约修正，提交 `c9a6b5c`。
- **M1/M7/M9 验证**：M1 Node 20 定向 3/3、Hook 文件 10/10、Node 22 Hook 3/3；M7 蜜罐文件 6/6；M9 已本地提交 `ab382fe` 纳入 M1 exact-expiry 夹具修正，verify 393/399（0 fail、6 skip）、package smoke 100 文件、E4 测试 12/12。三项新提交均未推送。
- **剩余 P1/P2**：#27/#28/#32/#41/#44/#45/#48 保持 OPEN 或 HOLD，按各自 acceptance gate 关闭；原生 Codex Shell、外部 E4、clean-VM 均不得标 PASS。#46 与 M4 diagnostic 为 P2。
- **资源边界**：当前无 VMware、真实模型或安装测试；并行开发最多 2 个任务。只按文件系统与 GitHub 核对状态，不声称读取其他 Codex 聊天。

## 当前调度（2026-10-14 11:16 UTC）

- **推送与 PR**：11:15:25 UTC 已一次 fast-forward 推送 M0、M1–M8、M9 的 10 个已有分支。GitHub 回读的 #30/#33/#34/#36/#37/#38/#39/#40/#43/#47 head 分别为 `a18a126`、`d9364cc`、`69ec7f1`、`f125e70`、`d9d775b`、`ed82f06`、`9088bd2`、`4c11981`、`4099ee3`、`bcbec98`；均 OPEN/Draft。PR #24 仍是 `62496d4`，未触碰。下批不早于 11:35:25 UTC。
- **新 head CI**：11:16 UTC 回读的 10 个 PR 检查仍处于 queued/in progress，部分检查已有 success；当时无 failure/cancelled。结果未终结前不关闭 Issue，也不把旧 head CI 当作新 head 证据。
- **P0/P1/P2**：#35 仍只按同进程/同 Guard/遵守 AbortSignal 范围 CLOSED。P1 #27/#28/#32/#41/#44/#45/#48 等组合 CI、宿主或 clean-VM 证据；#41 为 HOLD、#45 原生 Shell 仍 UNPROTECTED。P2 #46 为契约文档项，M4 诊断修复已推送、#34 新 head CI 仍待完成。
- **模块验证**：M1 过期边界定向测试 2/2；M2 Hook 协议路径通过但不能证明宿主 Shell；M4 定向 7/7；M6 E4 测试 12/12、外部 E4 `NOT_VERIFIED`；M7 未找到可验证干净 VM，未运行安装；M8 文档检查通过；M9 本地 393/399、0 fail、6 环境跳过、package smoke 100 文件，E4 测试 12/12。
- **额度与互斥**：11:10 UTC 实读五小时 98%、4h48m 后重置、周额度 68%、余额 113。低于 5% 或不可读则停开发、测试、浏览器和 GitHub 操作；VMware、真实模型、安装测试互斥，当前没有启动这类测试。
- **会话可见性**：只按 GitHub 与 worktree 证据更新；其他 Codex GUI 窗口的即时活跃状态无法确认，不声称读取聊天内容。

## 历史调度（2026-10-14 11:10 UTC）

- **额度**：用量网页 11:10 UTC 实读五小时 98%、4h48m 后重置，每周 68%、113 credits；低于 5% 或读数不明时停开发、测试、浏览器与 GitHub 操作，直到确认额度重置。VMware、真实模型、安装测试互斥。
- **远端基线**：PR #24 仍 OPEN/Draft、head `62496d4`、最近确认的旧 head checks 11/11；未触碰。当前 PR #30/#33/#34/#36/#37/#38/#39/#40/#43/#47 远端 head 依次为 `a81a33d`、`54facf0`、`f301195`、`996073a`、`cb84f43`、`d513810`、`5c7d95d`、`b0f30ff`、`f59ba37`、`cf4e2cd`；均保持 Draft。模块本地候选尚未有这些新 head 的远端 CI。
- **模块证据**：M1 `4099ee3` 的精确过期回归定向测试 2/2；M2 Hook 协议测试通过，但原生 Codex Desktop Shell 仍 `UNPROTECTED`，#45 说明评论已回读；M3 `d9364cc` 为责任/报告增量；M4 `69ec7f1` 定向测试 7/7；M5 `bcbec98` 为报告增量；M6 `ed82f06` 的 E4 测试 12/12，原始运行目录未动，外部 E4 `NOT_VERIFIED`；M7 `9088bd2` 确认无可验证 clean-VM 快照，#41 `HOLD`；M8 `4c11981` 的公开文档检查通过；M9 `f125e70` 本地 verify 393/399、0 fail、6 skip，package smoke 100 文件，E4 测试 12/12。各分支相对对应 PR head 均无远端独有提交。
- **Issue 状态**：P0 #35 仅在同进程/同 Guard/遵守 AbortSignal 范围 CLOSED；P1 #27、#28、#32、#41、#44、#45、#48 仍 OPEN 或 HOLD，等待各自列出的组合 CI、宿主或 clean-VM 证据；P2 #46 和 M4 诊断项不阻断安全边界。#44/#45 本轮评论已发布并读回，其他 Issue 状态未擅自更改。
- **推送**：现有分支快进候选进入一次批次；推送前做多 ref dry-run，只快进，禁止 force-push。main、PR #24 和 Release 不动。
- **窗口可见性**：M0 按 worktree、GitHub、CI 记录模块事实，不声称能读取其他 Codex 窗口聊天；未能观察的 GUI 窗口活跃状态保持未知。M0 本轮不超过双槽并发，VM/真实模型/安装测试没有运行。

## 历史调度（2026-10-14 10:51 UTC）

- 当前模块并发 2/2：M1 在现有安全分支核对 #44 过期审批零 callback 回归；M2 在现有隔离分支核对 #45 Hook 失败路径并按协议能力改进。两者只操作各自所有权文件，本轮先本地提交、不推送。
- M7 已结束只读 VM 前置核查并提交报告 `9088bd2`：没有可确认的干净快照，#41 继续 HOLD；未改 VM、主机或安装程序。M8 已提交 `4c11981` 修正 11 份公开文档，定向文档校验通过；尚未推送。
- **PR #24** OPEN/Draft，最近核验 head `62496d4`、11/11 检查；未触碰、未合并。**PR #30** 最近核验 head `a81a33d`、10/10；M0 文档改动待推送批次。
- **M1 / #32 / #44**：PR #43 最近远端 `f59ba37`、9/9；本地报告 `7a6eb98`。历史 #44 证据不足以认定产品错误放行；#32 marker 根因 UNKNOWN。当前任务保留安全断言，不能删减或放宽。
- **M2 / #45**：PR #37 最近远端 `cb84f43`、9/9；本地 `d9d775b` 含 Hook 事件名校验和路径脱敏。当前只实现协议能表达的 fail-closed 行为；Codex 原生 Shell 仍 UNPROTECTED，#45 OPEN。
- **M3 / #27**：PR #33 `54facf0`、9/9；本地 `d9364cc`。M3/M5/M6/M7 manifest 字段需按嵌套键合并；#27 等待组合包验收。
- **M4**：PR #34 旧 head `f301195`、9/9；本地修复 `69ec7f1`，定向测试 7/7，新 head CI 待运行。诊断真实性按 P2 跟踪，UI 不推断后端保护/E4 PASS。
- **M5 / #46 / #48**：PR #47 `cf4e2cd` 精确 head 9/9，描述已修正并保持 Draft；OBSERVE 敏感读取 hard DENY；#48 等 M1/M5/M9 联合验收。
- **M6 / #27**：PR #38 `d513810`、9/9；外部 E4 `NOT_VERIFIED`，M6 不消费 M5 audit stream。未跟踪运行目录保持原样。
- **M7 / #28 / #41**：PR #39 旧 head `5c7d95d`、11/11；本地报告 `9088bd2`。vmrun 因密码要求无法验证快照，候选 VM 没有可见快照清单；未运行安装。#28 等新候选 CI，#41 保持 HOLD。
- **M8**：本地文档提交 `4c11981`，check-docs 通过；PR #40 旧 head `b0f30ff`、9/9。尚未推送；Package 注册表返回 401，状态未知。
- **M9 / PR #36**：本地 `5c11113` 旧集成候选；391/0/6 本地 verify、100 文件 package smoke，仅证明本地结果。最新 M7/M8 提交未集成；GitHub 新 head CI 未运行。
- **待推送**：M0、M1、M2、M3、M4、M5、M7、M8、M9 的现有分支候选，先核对 ancestry 和 dry-run；仅快进项纳入一批，不 force-push。M6 无新提交，#24/main 不动。
- **额度与互斥**：用量页 10:50 UTC 实读五小时 43%、9 分钟后重置、每周 69%、113 credits；低于 5% 或读数不可用立即暂停全部开发、测试、浏览器和 GitHub。VMware/模型/安装测试共用互斥槽，目前未运行；最近推送约 07:14 UTC，20 分钟推送间隔已满足。

- 当前并发 2/2：M7 只读检查隔离 VM 及安装验收前置条件；M8 检查公开文档安全声明。二者只写各自模块文件；M0 维护协调文档。未声称读取其他 Codex 窗口聊天。
- **PR #24** OPEN/Draft，base competition/shanchuanzhi-release-readiness、head 62496d4，11/11 检查；未触碰、未合并。**PR #30** OPEN/Draft，远端 head a81a33d，10/10 检查；M0 新快照待批次推送。
- **M1 / #32 / #44**：PR #43 f59ba37 9/9；本地报告 7a6eb98。#44 证据指向测试观察时序，不足以确认产品错误放行；保留测试和安全断言。#32 marker 根因 UNKNOWN；两 Issue 均 OPEN。
- **M2 / #45**：PR #37 cb84f43 9/9；本地 d9d775b 含 hook_event_name 前置校验与路径脱敏。Hook 协议 fixture/AppContainer 子进程不证明原生 Desktop Shell；宿主仍 UNPROTECTED / BLOCKED_NOT_VERIFIED，#45 OPEN。
- **M3 / #27**：PR #33 54facf0 9/9；本地 d9364cc 为责任/验证记录，root scripts.test 已含 onboarding test。M3、M5、M6、M7 的 manifest 字段必须按嵌套键合并，不能覆盖彼此；#27 等待联合包验收。
- **M4**：PR #34 旧 head f301195 9/9；本地修复 69ec7f1 将审计 API 不可用诊断导出改为 null/null，保留可读但为空的 0/[]。runtime-console.test.ts 定向 7/7、diff 检查通过；新 head CI 待运行。安全中心不推断后端保护或 E4 PASS。
- **M5 / #46 / #48**：PR #47 cf4e2cd 当前 head run 38527097304 为 9/9；M5 已修正 PR 描述中过期失败记录，PR 仍 Draft。OBSERVE 对敏感读取保留 hard DENY；#48 仍 OPEN，需 M1/M5 对齐并由 M9 组合验收；#46 仍为 P2 文档契约 Issue。
- **M6 / #27**：PR #38 d513810 9/9。bundle verifier/fixture 不证明外部 E4；M6 不消费 M5 audit stream；外部 E4 保持 NOT_VERIFIED。未跟踪目录 security-lab/e4-runs/20261013T114513Z/ 保留原样。
- **M7 / #28 / #41**：PR #39 远端 5c7d95d 11/11；本地候选/报告 ead9593 含 6d978a5 代码候选，待推送后新 CI。#28 owner 复核已完成，仍待组合 CI。#41 真实取消回滚和 clean-VM 安装/升级/卸载未验；M7 正在核查是否有可安全使用的现成 VM，无则保持 HOLD。
- **M8**：PR #40 b0f30ff 9/9；正在逐条核对 README/公开说明的保护范围，不把未验证功能宣传为 PASS。
- **M9 / PR #36**：PR 远端 996073a 的旧 head 9/9；本地候选 5c11113 有 86 个提交差异、136 个文件改动，npm run verify 为 391 pass / 0 fail / 6 environment skip，package smoke 100 files；尚未推送、当前 head GitHub CI 未运行。发布前须保留对 E4 原始证据包的审查记录并取得新 head CI。
- **待推送候选**：M0、M1、M2、M3、M4、M5、M7、M9 的既有分支。先检查各目标远端 head 并执行 --dry-run；仅 fast-forward 可纳入同一批次，禁止 force-push。M6/M8 无新提交；#24 与 main 不动。
- **额度/互斥**：网页 10:33 UTC 实读五小时 47%、约 26 分钟重置、每周 69%、余额 113；低于 5% 或读数不可用时立即暂停开发、测试、浏览器和 GitHub。VMware、真实模型、安装测试共用一个互斥槽；当前由 M7 持有检查/潜在测试槽，其他同类任务不得启动。最近代码推送约 07:14 UTC，20 分钟间隔已满足。

## 历史调度（2026-10-14 04:36:33 UTC）

- 双槽调度：M3 收尾 onboarding owner contract 与 M0 唯一契约文件的所有权交接；M4 审核 OBSERVE/Guard 状态展示的 fail-closed 与 UNKNOWN 边界。M0 按 worktree、PR、CI、Issue 和额度页核实进度，不声称读取其他 Codex 窗口聊天。M1 #32、M2 adapter、M5 policy 和 M6 bundle 审查已完成本地步骤并释放槽位。
- PR #30 head `19ee8ca` 的 run `38510345880` 为 7 pass、Windows Node 20 1 fail、Windows Node 22 cancelled、package-smoke skipped。M1 查明旧基线使用 `spawnSync` 的 1 秒启动窗口；Node 22 job 日志 322 pass、0 fail 后被取消。更新的 M1 PR #43 Windows Node 20/22 检查通过。#32 保持 OPEN，等待该修复集成到基线后的验收；不删减 fail-closed、no-allow、no-callback 断言。PR #39 runs `38510356534/38510356548` 为 11/11 pass。
- M2 commit `63b9c08` 已提交 8 个 M2-owned adapter/fixture/report 文件；聚焦检查通过，未推送。PR #37 远端仍为 `a1c239d`；仅实现 callback binder，不代表 AppContainer/原生宿主集成，Shell 仍 `UNPROTECTED`。
- M5 commits `9f33f97` 和 `f8291c9` 已本地完成；44/44 policy tests、TypeScript 与 diff 检查通过。M5 移除了共享契约路径的重复变更；尚无远端 PR/CI，P0 仍 OPEN。
- M6 `d513810` 比 PR #38 当前远端 `bca895f` 超前 1、落后 0；PR #38 OPEN/Draft。候选审查符合 M6 所有权，原始 bundle 不随 PR 上传，现有旧头 CI 的 Windows Node 22 失败来自 M1 Hook test，E4 仍 `NOT_VERIFIED`。
- M6 commit `d513810` 修复 sidecar/metadata 校验，12/12 聚焦测试通过；PR #38 远端仍为旧 head `bca895f`，外部 E4 为 `NOT_VERIFIED`。原始 run `security-lab/e4-runs/20261013T114513Z/` 保持不变。
- M7 commit `5c7d95d` 已推送；PR #39 新 NSIS run 与 wrapper run 合计 11/11 pass。固定编译器本机不可用，真实 NSIS 编译/安装验收仍未验证，不关闭安装验收风险。
- PR #24 仍 OPEN/Draft，head `62496d4`、base `competition/shanchuanzhi-release-readiness`，11/11 checks 通过。M0 PR #30 仍 OPEN/Draft；M3 #33、M4 #34、M8 #40 各 9/9 通过；M9 集成未完成。
- 用量页 04:36 UTC 实读：五小时剩余 73%，1h14m 后重置；周额度 80%，余额 113。低于 5% 或读数不可用时暂停所有模块、测试和 GitHub 操作；确认五小时额度实际重置后再恢复。
- 最近批量 push 为 04:14 UTC（M0、M7）；下一批不早于 04:34:50 UTC。VMware、真实模型和安装测试未预约，三者共用互斥槽。

## 历史快照（2026-10-14 04:14:50 UTC；以下保留当时状态）

- 双槽调度：M2 处理 #45 与 Gateway adapter seam，M5 收尾 policy/audit 自有文件。M0 不读取其他 Codex 窗口聊天，活跃状态按 worktree、PR、CI 和 Issue 核实。M6 本轮已完成本地 verifier 修复并释放槽；M7 修复已推送，等待新 CI。
- PR #39 新 head `5c7d95d`，run `38510356534` 启动后仍 pending。前一 head `f66dcc6` 的 run `38506733463/38506733650` 为 8 pass、2 fail、1 skipped：一项是现已修复的 pinned-NSIS 重复 `.onUserAbort`，另一项为 M1-owned Windows Node 22 Hook marker 失败（#32）。M7 不修改 M1 Hook 测试。
- M1 PR #43 head `2276526` 的 run `38502266488` 为 9/9 通过。历史 marker 根因 `UNKNOWN`，#32 保持 OPEN。
- M7 commit `5c7d95d` 使用 `MUI_CUSTOMFUNCTION_ABORT AgentCanaryAbortCleanup`，保留 abort warning 与 `RollbackInstall`；相关测试 8 pass/1 skip、可靠性套件 43 pass/3 skip。已推送至 PR #39，新的实际 NSIS CI 正在运行；固定 NSIS 3.13 未在本机安装，真实编译与 VM 安装未验证。
- M2 PR #37 远端 head `a1c239d`、先前 CI 9/9 通过；原生 Codex Shell 仍 `UNPROTECTED`，#45 的真实宿主验收仍 `BLOCKED_NOT_VERIFIED`。当前 adapter 仅在 M2 所有权目录内推进，不修改 M1 Gateway。
- M6 PR #38 远端 head `bca895f` 的旧 CI 为 7 pass、M1-owned Windows Node 22 1 fail、package-smoke 1 skipped。M6 新修复在本地聚焦测试 12/12 通过，三文件 staged、未提交/未推送；原始 `security-lab/e4-runs/20261013T114513Z/` 16 文件未改，真实 E4 仍 `NOT_VERIFIED`。提交身份待解决，不伪造。
- PR #24 仍 OPEN/Draft，head `62496d4`、base `competition/shanchuanzhi-release-readiness`，本次复核 11/11 checks 通过；PR #30 OPEN/Draft，head `19ee8ca` 已推送，新 CI run `38510345880` 中 ownership gate 已过、常规 jobs 仍 pending。均未合并。
- #35 CLOSED 的范围仍限同一进程/同一 Guard 且 callback 配合 AbortSignal；#44/#45/#27/#28 保持 OPEN。M3 #33、M4 #34、M8 #40 目前各 9/9 checks；M9 最终验收尚未完成。
- 用量页 04:14 UTC：五小时剩余 79%，约 1h35m 后重置；周额度 81%，余额 113。低于 5% 或读数不明时全部暂停，实际重置后再恢复。
- M0 与 M7 在本批次已推送，协调时点为 04:14:50 UTC；下次批次不早于 04:34:50 UTC。VMware、真实模型、安装测试无运行预约，且共用一个互斥槽。

## 历史快照（2026-10-14 03:59:05 UTC；以下保留当时状态）

- 双槽调度：M2 处理 #45，M6 检查 #27/#38 中的 E4 verifier 与证据完整性；M0 无法读取其他 Codex 窗口的对话或活跃状态，进度以实际 worktree、PR、CI 和 Issue 为准。M7 本地代码步骤完成后等待下一批推送与 CI，开发槽已释放。
- PR #39 head f66dcc6；run 38506733463/38506733650 结束。8 pass、2 fail、1 skipped：Windows pinned-NSIS 编译因 .onUserAbort 重复定义失败；Windows Node 22 的 M1 Hook 中断测试在 test/agent-hook.test.ts:54 未观察到 marker。M7 负责 NSIS 修复并保留取消警告、RollbackInstall、编译门禁和测试；M1 Hook 用例仍由 M1 所有并在 #32 跟踪。
- M1 PR #43 head 2276526 的 run 38502266488 为 9/9 通过。历史 Hook marker 根因 UNKNOWN，#32 保持 OPEN；M7 不更改该 Hook 测试。
- M7 本地候选 commit 5c7d95d 使用 MUI_CUSTOMFUNCTION_ABORT AgentCanaryAbortCleanup 保留 abort warning 与 RollbackInstall；相关测试 8 pass/1 skip、可靠性套件 43 pass/3 skip。固定 NSIS 3.13 未安装，本机无编译证据；commit 未推送，等待 04:12:10 UTC 之后的批次。
- M2 PR #37 head a1c239d、run 38390381288 为 9/9 通过；原生 Codex Shell 仍 UNPROTECTED。#45 要求真实隔离宿主 synthetic sentinel 证据，或记录明确能力限制并保持 UNPROTECTED/BLOCKED。Hook 协议 fixture 与 AppContainer 子进程证据不等于原生宿主保护。
- M6 PR #38 head bca895f 为 7 pass、Windows Node 22 1 fail（失败点属 M1 Hook marker 测试）、package-smoke 1 skipped；外部 E4 未验证。其未跟踪目录 security-lab/e4-runs/20261013T114513Z/ 必须保持不变。
- PR #24 仍 OPEN/Draft，head 62496d4，base competition/shanchuanzhi-release-readiness，11/11 checks 通过；PR #30 OPEN/Draft，head 82cdc3e，9 个常规 CI jobs 加 ownership gate 通过。均未修改、未合并。
- #35 已 CLOSED，范围限同一进程/同一 Guard 且 callback 配合 AbortSignal；#44/#45/#27/#28 保持 OPEN。M3–M6、M8 状态沿用已记录的对应模块 PR/Issue；M9 验收尚未完成。
- 队列快照：M3 #33、M4 #34、M8 #40 的当前 PR checks 均通过；M5 有 5 个本地提交、无 PR；M6 #38 有 1 个 Windows Node 22 失败及 1 个 skipped，E4 外部验证未完成。M5/M6 留待槽位释放。
- 用量页 03:58 UTC：五小时限额剩余 82%，约 1h51m 重置；用户截图另显示 91%、约 4h，是较早读数。当前高于 5% 暂停线。低于 5% 或实时读数不可得即暂停，确认五小时额度重置后才恢复。
- 最近远端 push 为 03:52:10 UTC；下一批最早 04:12:10 UTC，此后至少 20 分钟。VMware、真实模型和安装测试无运行预约；三者共用互斥槽。

## 优先级

- **P0**：受保护路径失效放行、敏感信息泄露、严重数据损坏。立即停止相关执行/集成，保留证据，先修安全边界。
- **P1**：接口不兼容、构建失败、关键功能不可用，或会阻塞安全集成的共享接口/基线冲突。
- **P2**：非关键 UI、文档、一般性能问题。

优先级不是解决方式。不得删除失败测试、降低安全策略、伪造测试/CI/模型结果或把未验证标成已验证。

## GitHub Issue 流程

跨模块或无法归属的缺陷建立 Issue，并填写：优先级、责任模块与接口所有者；精确分支/提交和可复制步骤；实际/期望结果；验收标准及所需 CI/测试/证据链接；状态（OPEN、IN PROGRESS、BLOCKED、RESOLVED）。只有验收证据齐全才关闭。未知责任人标明待认领。

当前已建立：

- [#48 OBSERVE sensitive-read policy/router contract](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/48)（P1，OPEN）：M5 owns hard DENY semantics; M1 owns the cross-module router fixture/dispatch behavior; M0 owns the canonical contract. Current PR #47 head `cf4e2cd` CI run `38527097304` is 9/9. Preserve DENY, zero callback, zero approval, no sensitive output, and redacted audit evidence; keep open until M9 confirms combined behavior. No real leak is established.
- [#27 M3/M6 AC3 基线与 M3/M5/M6/M7 package.json 协调](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)（P1，OPEN）。
- [#28 M1/M7 TrustedExecutionGateway 并行变更协调](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)（P1，OPEN）。
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN）：PR #43 head `f59ba37` 的独立 CI 9/9 通过；历史 wrapper 漏 marker 的根因尚 UNKNOWN。待 M9 把候选置于共同基线后复验；保留 fail-closed、无 allow 与无 callback 断言，不删测试或降低策略。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，CLOSED，范围有限）：接受范围为同一进程、同一 Guard，且 callback 配合 AbortSignal。该结果不证明跨进程/shared-store 场景；缺失证据仍需标 UNKNOWN。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：PR #39 当前 head `5c7d95d` 的主 CI run `38510356534` 为 9/9，wrapper run `38510356548` 为 2/2。Pinned NSIS 模板编译已过；clean-VM install/upgrade/uninstall 和真实用户取消回滚仍 `NOT VERIFIED / HOLD`。VM 继续保持不启动/不修复。
- [#44 gateway approval-expiry CI failure](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/44)（P1，OPEN）：旧失败源于 approval-expiry 回归测试中读取已被 `pending()` 清扫的请求；M1 候选先从拒绝结果取 requestId，再验证过期时 callback 为零。PR #43 当前 CI 9/9；需 M9 共同基线复验后再判断关闭。
- [#45 Resolve native Codex Shell unprotected boundary](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/45)（P1，OPEN）：M2 的 PR #37 仅验证过特定 AppContainer 子进程；原生 Codex Shell 明确为 UNPROTECTED，候选 Hook 未在宿主安装/信任。要求提供真实宿主 synthetic sentinel 证据，或以宿主能力证据明确保持 UNPROTECTED/BLOCKED，不得误称已保护；后续与 M1/M2 按双槽安排，未获得宿主证据前保持该状态。
- [#42 M3 package manifest/current-head validation](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)（P1，CLOSED/completed）：PR #33 当前 head c404b6b、run 38400488378 9/9（含 package-smoke）且含 owner-authored M3 API 契约；旧 cf42dde manifest 证据不适用于当前 AC3 PR。跨模块 manifest 组合继续跟踪于 #27。

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- 2026-10-13 15:43 UTC：M1 处理 #35/#44/#32、M7 处理 #41，占用 2/2 槽；M2 的 #45 已登记，等待空闲槽。Quota 最新读数 13%，约 1h45m 重置，M0 会话内每60秒监看；上次 push 15:41:29 UTC，下一批不早于 16:02 UTC。没有 VMware、真实模型或安装测试预约。
- VMware、真实模型和安装测试共用一个互斥槽，同一时间最多运行其中一项。当前无互斥测试在运行；本轮 M6 只做本地合成 Hook 测试，M7 未运行真实安装、VM 或模型测试。
- 本会话工具清单没有原生 `read_thread`/`wait_threads`；M0 用 `codex queue` 向窗口投递消息，但不把“已投递”当作接收或完成确认。进度只按 GitHub refs/Issues/PR 与模块 worktree 记录，不声称读取聊天内容。
