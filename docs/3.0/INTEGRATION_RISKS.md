# M0/M9 集成风险登记

## Current integration risk snapshot (2026-10-15 02:27 UTC)

| Risk | Priority | Verified state | Required gate |
| --- | --- | --- | --- |
| #27 M6 package fields and E4 evidence | P1 | M6 `e4:auto`, `e4:verify`, `e4:test` owner signoff is ACCEPT; M9 ACCEPTed field/path compatibility and E4 API semantics. M1 owns the separate shared store failure under #51; its ten-run Linux workflow passes and current PR #38 exact-head checks are green. Original RETRY_LIMIT cause remains UNKNOWN; do not infer cause from reruns. | Keep OPEN for evidence-based cause classification and combined manifest/package integration acceptance. External E4 NOT_VERIFIED. |
| [#51](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/51) shared Guard/quarantine store CI failure | P1 | Ubuntu Node22 `file-state-store` four-process test initially reported `RETRY_LIMIT`; source/test blobs match the AC3 baseline and M6 diff does not touch them. Attempts 2–4 each passed the Ubuntu Node22 full test job consecutively (3 passes); attempt 2 also passed all 9 product jobs and package smoke. M1 confirmed the direct failure path: 500 consecutive `STATE_STORE_BUSY` lock retries end in `RETRY_LIMIT`. The original lock-holder/timing evidence is absent, so the underlying trigger remains UNKNOWN; no data loss or implementation defect is established. M1 accepted path ownership in comment `6182359961`; commit `3828bee` adds the path-scoped ten-run workflow. Run 38668337033 passed on merge candidate `3c8d880` (M1 `3828bee` + base `62496d4`): 10 iterations, each 17 tests / 14 pass / 0 fail / 3 skip, including the four-process test. M0 comment `6182797086` records this owner disposition. | The ten-run Linux workflow and current exact-head PR #38 checks passed; retain all 48 assertions. Keep OPEN because the original trigger remains UNKNOWN. |
| #32 Hook interruption fixture | P1 | M1 confirmed the direct historical failure mechanism on Windows Node20 run `38390302812`: old `spawnSync` fixture had a 1s timeout; why runner startup exceeded 1s remains UNKNOWN. M3 `f9bd818` and M4 `9288de0` port the bounded async fixture on their separate existing branches; both target files passed 10/10 and M3 targeted case passed 1/1. Interruption checks no stdout/stderr/decision log but do not run the real host; callback NOT_VERIFIED. M9 combined review is pending. | Keep OPEN pending M9 baseline review and exact-head CI; retain fail-closed/no-decision/no-output assertions. Native host callback NOT_VERIFIED. |
| #45 native Codex Shell | P1 | PR #37 checks 9/9 pass. M2 read-only audit found no repo-level fail-open but could not inspect effective host policy/trust or native callback. No WSL distro means M2 Git status/head is unverified; no code/test changes. Native Shell remains UNPROTECTED. | Keep OPEN/BLOCKED_NOT_VERIFIED until host owner supplies effective sandbox/profile and Hook trust/source, followed by a real Desktop Shell sentinel deny/hash check. |
| #41 installer lifecycle | P1 | Clean-VM lifecycle remains NOT_VERIFIED; no exclusive reservation. | Keep OPEN/HOLD pending visible resource reservation and lifecycle evidence. |
| External E4 / M4 backend | P1 | Independent E4 NOT_VERIFIED; M4 backend UNKNOWN. | Make no PASS claim without independent evidence. |
| Exclusive VM/model/installer resources | P2 | Occupancy in other windows is unknown. | Treat unavailable until owner/worktree/start/release is recorded on #29. |
| Quota / push cadence | Scheduling | Usage page remains open/readable above stop threshold; exact values are not public. Last push 02:20 UTC. | Stop if quota <5% or unreadable. Next push no earlier than 02:40 UTC. |

M0 PR #30 remote `1a73704` has 9/9 product jobs and a successful coordination run. M1 PR #43 remote `3828bee` has passing standard CI and ten-run store workflow; PR #38 exact head `0908449` has all current product and wrapper checks green. M3/M4 fixture commits remain local until the next batch; M5/M6 are active in existing worktrees. The original store trigger remains UNKNOWN. M9 PR #36 `bc5390d` remains 11/11. PR #24 remains OPEN/Draft, unchanged, with 11/11 checks.

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
