# M0 技术协调状态

## Current authoritative snapshot (2026-10-14 21:06 UTC)

- 用量页可读且高于 5% 暂停线；精确额度仅保存在被 gitignore 忽略的本地报告。低于 5% 或不可读时停止开发、测试、浏览器与 GitHub 操作。上批分支推送为 20:48 UTC。
- 当前两个模块槽仍为 M3/#32 与 M6/#27。21:06 状态请求已记录：#32 comment 6178530800、#27 comment 6178531392；请求发出时没有负责人回复或分支新提交。
- M3 PR #33 为 OPEN/Draft，head d9364cc5ad533b8b922859e97d2387e70718d931，exact-head CI 38555297535 通过。M3 当前同步夹具 blob 1ecb3ee 不检查 stderr 和决策日志。M1 owner fixture blob 6c2d8da 使用异步 marker-wait 与外部中断，并检查退出、空 stdout/stderr、无决策记录；子进程不能观察原生宿主 callback。#32 保持 OPEN。
- M6 PR #38 为 OPEN/Draft，head ed82f0612b9f69463afc9f80a1082b951e7e88fe，exact-head CI 38555297615 通过。M0 静态比对确认 M6 与 M9 的 e4:auto、e4:verify、e4:test 值完全相同；M6 owner 确认仍待回复。保留 M6 未跟踪 E4 证据目录；外部 E4 仍 NOT_VERIFIED。
- M1 PR #43 为 OPEN/Draft，head 4b562bed32ebcc3f241a17543d8d2ce9f6108c26，CI 38620584097 通过。PR 描述称 d26a0c3 在本地等待推送，但该提交已在当前远端 head 的祖先中；请 M1 owner 修正文案。
- M7 PR #39 exact-head CI 38596572303 通过 9/9，Windows Community wrapper 38596572179 通过 2/2。M7 owner review 接受其自有 manifest 字段与 M9 对齐。#41 clean-VM 安装/启动/升级/卸载/真实取消回滚仍 NOT_VERIFIED/HOLD。
- M9 PR #36 为 OPEN/Draft，head 6abd4da78f161577bff90a5d18fd0d3ec329fdd3；CI 38620602632 通过 9/9，wrapper 38620603071 通过 2/2。CI 不替代原生 Shell、外部 E4 或 clean-VM 验收。
- M0 PR #30 为 OPEN/Draft，head 71c25453cf0e05f5984c1a5016fec78c8b5a2b0f；产品 CI 38635153635 通过 9/9，最新 ownership check 38635518024 通过 1/1。PR #24 仍 OPEN/Draft，head 62496d4020bd90ba2eede49b2e80a2bbebb036b4、base 未变；9 项产品与 2 项 wrapper 检查通过。
- P1 门槛仍开放：#27 M6 owner 确认与整合；#32 Hook 夹具跨分支复验；#41 clean-VM 生命周期；#45 原生 Codex Shell 仍 UNPROTECTED。M4 后端安全/E4 为 UNKNOWN。其他窗口 VMware、真实模型与安装资源占用不可见，不能假设可用。
- 此 M0 更新未修改模块产品代码或运行产品测试；未修改/合并 main 或 PR #24，未发布 Release。


## Archived snapshot (2026-10-14 20:46 UTC)

- The usage page was readable at 20:46 UTC and above the 5% stop threshold. The exact reading from this checkpoint is in the ignored local coordinator report; this public current snapshot omits it, while older historical snapshots retain readings published earlier. Stop all work if the 5-hour quota is below 5% or unreadable. Last Git push batch was 20:26 UTC; next push is no earlier than 20:46 UTC.
- M1's owner-disposition task on #32 is complete. The two active slots remain M3/#32 and M6/#27; M4/#32 and M6/#32 are queued until a slot is released. M0 progress comments 6178087679 and 6178091644 specify owner actions and acceptance evidence; neither owner response nor completion commit is visible yet. VMware, real-model, and installer work share an exclusive reservation; occupancy in other windows remains unconfirmed.
- PR #24 remains OPEN/Draft and mergeable, base competition/shanchuanzhi-release-readiness at dc8d0092b35141b295d5ff42873584ed488e4ee7, head feature/agent-canary-3.0 at 62496d4020bd90ba2eede49b2e80a2bbebb036b4. Current head CI run 38332394567 passed 9/9 and Windows wrapper run 38332394500 passed 2/2. It was not changed or merged.
- Existing coordination PRs remain OPEN/Draft at their current AC3 heads: M0 #30 50801a0 (product 38632104799 9/9; ownership 38633006905 1/1); M1 #43 4b562be (38620584097 9/9); M2 #37 0f2c10c (38561262930 9/9); M3 #33 d9364cc (38555297535 9/9); M4 #34 69ec7f1 (38555299339 9/9); M5 #47 7d5df63 (38617317812 9/9); M6 #38 ed82f06 (38555297615 9/9); M7 #39 4267c61 (38596572303 9/9, wrapper 38596572179 2/2); M8 #40 139e7f2 (38561307114 9/9); M9 #36 6abd4da (38620602632 9/9, wrapper 38620603071 2/2). These runs verify only their automated jobs.
- Last complete cross-runtime worktree inventory (20:10 UTC) verified ten independent M0-M9 paths/branches with merge-base 62496d4020bd90ba2eede49b2e80a2bbebb036b4: Windows Git 2.54 checked M0, M1, M3-M6, and M9; WSL Git 2.53 with explicit git-dir/work-tree checked M2, M7, and M8. At 20:14 UTC, Windows Git rechecked M0, M1, M3, M4, and M6; M3 is clean, and M6's untracked security-lab/e4-runs/20261013T114513Z/ remains preserved. Current WSL refresh for M2/M7/M8 did not complete; no worktree repair/prune was run.
- M1/M2/M5/M8 local branch tracking points at origin/feature/agent-canary-3.0 rather than each module PR ref. No config was changed; any future push must name and verify its exact destination branch.
- P1 gates remain OPEN: #27 awaits M6 package-field signoff and combined-manifest acceptance; #32 awaits M3/M4/M6 owner fixture copies and exact-head CI; #41 clean-VM installation lifecycle is NOT_VERIFIED/HOLD; #45 native Codex Shell remains UNPROTECTED. External E4 is NOT_VERIFIED; M4 backend security/E4 is UNKNOWN. P2 #46 is CLOSED for documentation synchronization only; #48 is CLOSED for its scoped hard-deny evidence.
- M1's limited disposition accepts the async marker-wait/interruption behavior only; the child-process fixture cannot prove native-host callback behavior. M0 recorded current M3 and M6 checkpoints in #32 comment 6177102252 and #27 comment 6177103034. Root cause remains UNKNOWN and #32 remains OPEN.

No M1-M8 product source changed in this M0 update. No local product tests ran. Do not merge main or PR #24, and do not publish a Release.

## 当前权威快照（2026-10-14 19:12 UTC）

- **额度与调度**：额度页仍为活动标签；19:10 UTC 实读五小时剩余 97%（约 1 小时 58 分后重置）、每周剩余 64%、113 credits。低于 5% 或无法读数即暂停开发、测试、浏览器和 GitHub 操作。最多 2 个模块任务并行；最近推送批次为 19:04 UTC，下批不得早于 19:24 UTC。本协调会话未启动 VMware、真实模型或安装测试；其他窗口的资源占用无法直接读取，启动同类任务前须在 #29 取得互斥调度记录。
- **当前 PR / exact-head CI**：PR #24 仍 OPEN/Draft、base `competition/shanchuanzhi-release-readiness`、head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`，9 项产品检查 + 2 项 wrapper 检查通过，未触碰。M0–M9 Draft PR 均 OPEN：#30 `af39e96` run `38617312991` 为 9/9、ownership run `38617313009` 为 1/1；#33 `d9364cc` run `38555297535` 9/9；#34 `69ec7f1` run `38555299339` 9/9；#36 `6abd4da` run `38620602632` 9/9、wrapper run `38620603071` 2/2；#37 `0f2c10c` run `38561262930` 9/9；#38 `ed82f06` run `38555297615` 9/9；#39 `4267c61` run `38596572303` 9/9、wrapper run `38596572179` 2/2；#40 `139e7f2` run `38561307114` 9/9；#43 `4b562be` run `38620584097` 9/9；#47 `7d5df63` run `38617317812` 9/9。检查来自 GitHub 当前 PR 读回；这些结果只证明相应自动化 job。
- **M9 / package.json**：PR #36 的当前 package.json blob 为 `6b3042bbe7ba5b14a904c7d04fca9a9011a47883`。此前静态组合核对保留 AC3 原 31 个测试路径并增加 5 个不同路径，共 36 个且无重复；保留 version/bin/files/`./sdk`，并含 `./policy`、M6 E4 与 M7 脚本。Issue #27 仍 OPEN，等待 M6 对当前字段的显式 owner 确认及组合接受；外部 E4 仍 NOT_VERIFIED。
- **Hook 跨分支风险 / #32**：当前 #43/#36 的 `test/agent-hook.test.ts` blob 为 `6c2d8da...`，#37 为 `d3b64fc...`，#33/#34/#38 均为 `1ecb3ee...`。后者仍使用旧的同步中断 marker fixture；当前 #33/#34/#38 CI 通过不证明历史竞态已排除。M1/M9 当前夹具明确说明子进程不能观测宿主侧 callback，因此根因和 native-host callback 行为仍未验证。#32 保持 OPEN，待 M1 提供最小 owner-approved 更新/适配方案，相关模块纳入后重跑精确 head CI；不得删改 fail-closed 断言。
- **契约与问题状态**：#28、#35、#44、#48、#49 按明示有限范围关闭；#27、#32、#41、#45 保持 OPEN（#41 为 HOLD、#45 为 UNPROTECTED）。#46 的 P2 文档验收已核实：M0 canonical contract blob `693d437...`，M5 report blob `1300b4d...`，M5 PR #47 指向 M0 所有的契约，#48 已关闭；GitHub Issue 关闭及回读待下一批远端协调操作。clean-VM 生命周期未验证；M4 backend security/E4 状态 UNKNOWN。
- **核验边界**：本轮只读复核 GitHub checks、PR heads、Issue 与工作树；未运行本地测试。不得删除失败测试、降低安全策略或伪造结果；不合并 main 或 PR #24、不发布 Release。只按文件系统、GitHub 和可见用量页核验，不声称读取其他会话聊天内容，也不把 CI 等同于原生宿主、clean-VM 或外部 E4 验收。

本节为当前快照；较早时间点内容按历史记录保留。

## 历史快照（2026-10-14 17:03 UTC）

- **额度与窗口**：用量页保持打开；17:02 UTC 实读五小时剩余 97%（约 4 小时 5 分后重置）、每周剩余 64%（约 5 天 19 小时后重置）、113 credits。低于 5% 或无法读数即暂停全部开发、测试、浏览器和 GitHub 操作。
- **开发与推送**：最多 2 个模块任务并行。M0/M1 推送批次于 16:52 UTC 完成；下批不得早于 17:12 UTC。VMware、真实模型和安装测试互斥，当前未启动。
- **PR 与 CI（GitHub 实时回读）**：PR #24 OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4`，11/11 检查通过，未触碰。M0/M1–M8/M9 现有 Draft PR 均 OPEN；#30 `a469e37` 10/10（run `38602030773` 9 项产品检查 + `38602030720` ownership）；#33 `d9364cc` 9/9，#34 `69ec7f1` 9/9，#36 `ab382fe` 9/9 + wrapper 2/2，#37 `0f2c10c` 9/9，#38 `ed82f06` 9/9，#39 `4267c61` 9/9 + wrapper 2/2，#40 `139e7f2` 9/9，#43 `d26a0c3` 9/9（run `38602072618`），#47 `5fd4707` 9/9。PR 仍为 Draft，不等于集成验收。
- **M1**：当前 #43 head `d26a0c3`、run `38602072618` 9/9。#44 定向回归 2/2；审批到期在 sweep/lookup 前拒绝，pending 清空、decision 不放行、callback=0。旧 1ms 测试窗口导致 `requestId` 观察时序问题；当前 60 秒 TTL/exact-deadline 测试稳定。#32 历史 marker 根因仍 UNKNOWN；#28 等 M9 集成。
- **M1/M5 与 M9**：#47 exact-head run `38561283918` 9/9，硬拒绝敏感读取不变；safe-read fixture 只用于下游 egress assertion。M1 owner contract 已推送至 `docs/3.0/M1/GATEWAY_API_CONTRACT.md`。M9 本地 HEAD `ed0dd01`（路径修复由 `3b5990e` 引入）已固定 canonical root 和 M1 模块路径；远端 #36 仍为 `ab382fe`，Issue #49 等候下批推送和新 head CI。
- **M7**：#39 run `38596572303` 9/9；wrapper `38596572179` 2/2，含 Windows pinned NSIS/setup/template compile。此 CI 不验证实际安装生命周期；clean-VM install、first launch、upgrade、uninstall、真实用户取消回滚均 NOT VERIFIED/HOLD。
- **仍未验收**：#27 manifest/M6 组合；#28 Gateway 生命周期组合；#32 Hook 历史根因与旧分支结果；#41 clean-VM 安装；#44 等 M9 baseline acceptance；#45 原生 Codex Shell 仍 UNPROTECTED；#46/#48 OBSERVE 文档与联合验收；外部 E4 NOT_VERIFIED；M4 backend status UNKNOWN。P0 #35 CLOSED 的边界仍限同进程、同 Guard，且 callback 遵守 AbortSignal。
- **未改变的安全边界**：不删/跳过失败测试，不放宽安全策略，不伪造结果；不合并 main 或 PR #24，不发布 Release。8 个引用聊天不可直接读取，本快照只依据文件系统、GitHub 和当前可见网页。

本节是 17:03 UTC 历史快照；以下较早记录按原时间保留。

## 当前状态（2026-10-14 11:56 UTC；额度页 11:50 UTC；PR checks 11:45 UTC）

- **额度**：网页版当前显示五小时剩余 88%、4 小时 8 分后重置；每周剩余 66%、6 天后重置，余额 113。页面已关闭。低于 5% 或不能读数时暂停开发、测试、浏览器和 GitHub 操作。
- **推送节奏**：本批已将 M0 `9aee510`、M1 `ca24d37`、M7 `c9a6b5c`、M9 `ab382fe` 快进推至各自已有 PR 分支；远端 ref 回读一致。为满足 20 分钟间隔，下批不得早于 12:01 UTC。
- **CI 回读**：#43 当前头 9/9 全通过；#36 当前头 11/11 全通过。#30 当前头仅 Windows Node22 的 Hook interruption marker 断言失败，其余测试矩阵、Docker、sponsor 和 ownership gate 通过；package smoke 因失败而跳过。#39 当前头 Windows Node20/22 同一 M1 Hook interruption 测试失败，其余矩阵与 wrapper 通过，package smoke 跳过。
- **本地修复证据**：M1 `ca24d37` 精确过期定向 3/3、Hook 10/10、Node22 Hook 3/3；M7 `c9a6b5c` 蜜罐定向 6/6；M9 `ab382fe` verify 393/399（0 fail、6 skip）、package smoke 100 文件、E4 测试 12/12。
- **跨分支修复**：M1 owner 的可移植 Hook 夹具补丁位于 ignored `logs/m1-hook-fixture.portable.patch`（SHA-256 `7b75374e…49e114b9`），仅触及 `test/agent-hook.test.ts`；预检可用于 M0/M2/M5/M7/M8，M0 需忽略 CRLF 空白差异。M2/M8 正在各自分支接入并定向验证；未 cherry-pick 含三份报告文档的整提交。此子进程夹具不能观测宿主侧 tool callback，不声称 callback=0。
- **M2 / #45**：本地 M2 Hook 协议夹具退出码 0，合成 deny 与可见告警通过；没有安装或信任 Hook，也没有宿主 Shell 实测。状态保持 UNPROTECTED / BLOCKED_NOT_VERIFIED。
- **待验门槛**：#32/#37/#40/#47 仍需合入 owner 修正并重跑 CI；#30/#39 也需在兼容修正后重跑。#45 原生 Shell、#41 clean-VM 安装、外部 E4 未验证，保持 UNKNOWN/NOT VERIFIED。M9 本地结果仍为 verify 393/399（0 fail、6 skip）、package smoke 100 文件、E4 测试 12/12。
- **资源边界**：当前没有 VMware、真实模型或安装测试。并行最多两个任务；其它 Codex 会话的聊天内容不可见，状态仅以文件系统、GitHub 和本会话网页读数为准。

## 当前状态（2026-10-14 11:26 UTC；PR checks 11:24 UTC；额度页约 11:24 UTC）

- **额度**：网页显示五小时 95%、4 小时 35 分钟后重置；每周 67%，余额 113。用量标签与辅助标签已关闭。
- **最近推送**：11:15:25 UTC 对 M0、M1–M8、M9 的 10 个已有 PR 分支完成 fast-forward 批次，GitHub head 回读一致。下次推送不得早于 11:35:25 UTC。
- **CI 通过**：PR #33/#34/#38 均 9/9；PR #36 远端组合 head `f125e70` 11/11。M9 已在现有分支提交 `ab382fe` 纳入 M1 过期测试修正；当前本地验证 393/399、0 fail、6 环境跳过，包 smoke 100 文件，E4 测试 12/12。外部 E4 仍未验证。
- **CI 失败与定位**：#30/#37/#40/#47 的失败矩阵都落在旧版同步 Hook 中断测试 `spawnSync(timeout:1000)` 的进入 marker 断言；M1 已在 #43 使用异步子进程、等待 marker 后再中断的版本。#39 的 6 个测试矩阵均在蜜罐读取的旧 resolve 预期失败；#43 有 3 个矩阵在精确到期回归失败，根因是测试使用 1ms TTL，慢 runner 可先扫除审批。
- **M1 本地修复**：现有 `feature/ac3-security-core` 新提交 `ca24d37` 把精确到期测试 TTL 改为 60 秒并固定时钟到 `expiresAt`；保留过期拒绝、审批清理与 callback 零调用。Node 20 跨文件定向 3/3、Hook 全文件 10/10、Node 22 Hook 定向 3/3、diff check 通过。尚未推送。
- **M7 本地修复**：现有 `feature/ac3-reliability-ac3` 新提交 `c9a6b5c` 只将蜜罐读取测试期望对齐 M1/M9 的 `GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK`；隔离、拒绝后续写入、哨兵不变和计数断言保留。定向 6/6、diff check 通过。尚未推送。
- **仍未关闭**：#32 历史 marker 根因仍 UNKNOWN；#44 等 M1 新 head CI；#28 等 M7 新 head 组合 CI；#27、#48 等 M9 新 head 与对应 PR 验收；#45 原生 Shell 继续 `UNPROTECTED / BLOCKED_NOT_VERIFIED`；#41 clean-VM 安装继续 `HOLD / NOT_VERIFIED`；外部 E4 仍 `NOT_VERIFIED`。不以本地测试替代宿主或 VM 证据。
- **边界**：PR #24 仍 OPEN/Draft、head `62496d4`；未修改/合并 PR #24 或 main，也未发布 Release。VMware、真实模型、安装测试均未运行。

## 当前状态（2026-10-14 11:16 UTC；GitHub 回读 11:16 UTC；额度页 11:10 UTC）

- **推送批次**：11:15:25 UTC 将 M0、M1–M8、M9 的 10 个既有分支按 fast-forward 一次推送；GitHub PR head 回读与目标提交一致。WSL Git 使用本次命令级 GitHub CLI credential helper；未修改全局 Git 配置。
- **PR #24**：仍 OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4`；本轮未改该分支、未合并 main。已记录的旧 head checks 为 11/11。
- **远端 head**：PR #30 `a18a126`、#33 `d9364cc`、#34 `69ec7f1`、#36 `f125e70`、#37 `d9d775b`、#38 `ed82f06`、#39 `9088bd2`、#40 `4c11981`、#43 `4099ee3`、#47 `bcbec98`；均为 OPEN/Draft。新 head GitHub checks 在 11:16 UTC 回读时排队或运行，尚未见失败结论。
- **M1 / #32 / #44**：#43 新 head `4099ee3` 已推送。精确过期定向测试 2/2；#44 仍等该 head CI 及 M9 组合验收，#32 marker 根因 UNKNOWN。#44 评论已发布并读回。
- **M2 / #45**：#37 新 head `d9d775b` 已推送，Hook 协议测试通过；原生 Codex Desktop Shell 继续 `UNPROTECTED / BLOCKED_NOT_VERIFIED`，#45 评论已发布并读回。
- **M3/M4/M5/M6/M7/M8**：各自新 head 已推送；M4 定向测试 7/7，M6 E4 测试 12/12 但外部 E4 仍 `NOT_VERIFIED`，M7 clean-VM 仍 `HOLD`，M8 文档检查通过且未发布 Release。M6 的未跟踪 E4 原始运行目录保留不动。
- **M9 / #27/#28/#48**：#36 新 head `f125e70` 已推送。本地组合结果为 verify 393/399（0 fail、6 环境跳过）、package smoke 100 文件、E4 测试 12/12；新 head CI 已启动，组合验收仍未完成。
- **额度与剩余门槛**：最近网页实读五小时 98%、4h48m 后重置；每周 68%，余额 113。#27、#28、#32、#41、#44、#45、#48 仍需各自列明的 CI/宿主/clean-VM 证据；#46 与 M4 诊断为 P2。#35 CLOSED 的边界仅限同进程、同 Guard 且 callback 遵守 AbortSignal。
- **下次推送**：不早于 11:35:25 UTC。后续只推现有 PR 分支的快进提交；不 force-push、不改/合并 main 或 PR #24、不发布 Release。

## 当前状态（2026-10-14 11:10 UTC；用量页 11:10 UTC 实读；PR heads 11:07 UTC 刷新）

- **额度与调度**：五小时剩余 98%、4 小时 48 分钟后重置；每周剩余 68%，余额 113。该页面已关闭。低于 5% 或读数不明时暂停开发、测试、浏览器及 GitHub 操作，确认实际重置后恢复。
- **本地候选**：模块 worktree 在刷新后的对应远端分支上均为快进候选、无远端独有提交：M1 `4099ee3`（5 ahead）、M2 `d9d775b`（5 ahead）、M3 `d9364cc`（1）、M4 `69ec7f1`（1）、M5 `bcbec98`（2）、M6 `ed82f06`（1）、M7 `9088bd2`（4）、M8 `4c11981`（1）、M9 `f125e70`（87）。M6 未跟踪的 E4 原始运行目录原样保留。此快照写入时，当前批次尚未推送。
- **PR #24**：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4`，最近确认的旧 head 检查 11/11；本轮未修改、未推送、未合并。
- **M0 / PR #30**：远端仍为 `a81a33d`。本地协调分支保留既有提交和本快照；未改 main。
- **M1 / #32 / #44**：PR #43 远端 `f59ba37`；本地回归提交 `4099ee3` 覆盖精确到期时无 callback，定向过期测试 2/2。#44 的本地回归还需 M9 组合 CI；#32 marker 历史根因 UNKNOWN。#44 已收到本轮证据说明评论，Issue 仍 OPEN。
- **M2 / #45**：PR #37 远端 `cb84f43`；Hook 协议测试覆盖显式 Bash 拒绝、无效输入和日志写失败。未能证明宿主原生 Shell 会执行该 Hook；Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`。#45 已收到本轮边界说明评论，Issue 仍 OPEN。
- **M3 / #27、M4、M5**：PR #33 `54facf0`、#34 `f301195`、#47 `cf4e2cd` 的远端 head 未变。本地分别为 M3 报告、M4 诊断修复（定向 7/7）、M5 policy 报告候选；新 head CI 尚未运行。#27/#48 仍等组合验收。
- **M6 / #27**：PR #38 远端 `d513810`；本地 E4 测试 12/12、package smoke 100 文件通过，bundle verifier 保留 `NOT_VERIFIED`；不能代替外部 E4。
- **M7 / #28 / #41**：PR #39 远端 `5c7d95d`。本地报告 `9088bd2` 记录没有可确认的干净 VM 快照；没有运行安装器或改动 VM。#41 clean-VM 安装/升级/卸载与真实取消回滚继续 `HOLD / NOT_VERIFIED`。
- **M8**：PR #40 远端 `b0f30ff`；本地 `4c11981` 的 11 份公开文档更正经 `check-docs` 验证。未发布 Release；包注册表未认证状态不能证明是否发布。
- **M9 / PR #36**：本地组合候选 `f125e70` 汇入已审阅的 M1/M4/M6/M7/M8 文件；`npm run verify` 为 393/399 通过、0 失败、6 项环境跳过，package smoke 100 文件通过，`npm run e4:test` 12/12。PR #36 远端仍 `996073a`；这些本地结果不是新 head GitHub CI，也不证明外部 E4、原生 Shell 或 clean-VM 安装通过。
- **待关闭门槛**：#27 manifest/组合验收、#28 Gateway lifecycle 组合 CI、#32 Hook marker 根因、#41 clean-VM 安装验收、#44 组合 CI、#45 原生 Shell 宿主证据、#48 OBSERVE 联合验收仍 OPEN/HOLD；#46 为 P2 契约文档项。#35 CLOSED 的证据范围仍限同进程、同 Guard 且 callback 遵守 AbortSignal。
- **推送边界**：批次仅更新各自已存在的 M0–M9 PR 分支；以 dry-run 结果和 fast-forward 推送为准。不得 force-push、修改/合并 main 或 PR #24，也不发布 Release。

## 历史快照（2026-10-14 10:51 UTC；用量页 10:50 UTC 实读；GitHub 状态沿用 10:34 UTC 核验）

- **额度与并发**：网页显示五小时剩余 43%、约 9 分钟后重置；每周 69%，余额 113。M1 #44 回归检查与 M2 #45 Hook 失败路径改进为当前 2/2 模块任务；M7/M8 已释放槽位。低于 5% 或读数不可用即暂停开发、测试、浏览器和 GitHub 操作。
- **PR #24**：最近核验为 OPEN/Draft，base `competition/shanchuanzhi-release-readiness`、head `62496d4`，检查 11/11；本轮未触碰、未合并。
- **M0 / PR #30**：最近核验远端 head `a81a33d`、检查 10/10；协调文档在现有 `feature/ac3-m0-coordination` 分支有本地变更，尚未推送。
- **M1 / #32 / #44**：PR #43 远端 head `f59ba37`，检查 9/9；本地报告 head `7a6eb98`。已有证据未证明 #44 是产品错误放行；当前 M1 在既有分支核对过期审批回归缺口，需保留 callback 零调用断言。#32 历史 Hook marker 根因仍 UNKNOWN。
- **M2 / #45**：PR #37 远端 head `cb84f43`，检查 9/9；本地 `d9d775b` 含事件名前置拒绝与路径脱敏修订。当前 M2 检查 Hook timeout/异常/错误回包路径，仅在协议支持时实施 fail-closed 改进。Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`。
- **M3 / #27**：PR #33 远端 head `54facf0`，检查 9/9；本地 `d9364cc` 记录测试登记和 manifest 责任。跨模块 manifest 合并仍须组合验收。
- **M4**：PR #34 远端旧 head `f301195` 检查 9/9。本地修复 `69ec7f1` 将审计 API 不可用诊断由假 `0/[]` 改为 `null/null`；定向测试 7/7，新提交无 GitHub CI。该非关键诊断问题按 P2 跟踪；后端保护/E4 仍 `UNKNOWN`。
- **M5 / #46 / #48**：PR #47 远端 head `cf4e2cd`，精确 head run `38527097304` 检查 9/9；PR 描述已更正并保持 Draft。OBSERVE 对敏感读取保留 hard DENY；#48 等待 M9 组合验收和 M1/M5 行为闭合，未确认真实数据泄露。
- **M6 / #27 / #46**：PR #38 远端 head `d513810`，检查 9/9。M6 `SecurityEvidenceEvent` 与 M5 `PolicyAuditEvent` 分离且无消费关系；外部 E4 仍 `NOT_VERIFIED`。未跟踪 E4 运行目录保留未动。
- **M7 / #28 / #41**：PR #39 远端 head `5c7d95d` 的旧 head 检查 11/11；M7 新本地报告提交 `9088bd2`，包含只读 VM 验收前置结论。当前无运行 VM；候选 VM 的 `.vmsd` 只有编码行，`vmrun listSnapshots` 因 VM 密码要求失败，无法确认干净快照；旧安装程序产物来源也未核实。未运行安装程序/改动 VM，#41 clean-VM 安装、升级、卸载及取消回滚保持 `HOLD / NOT_VERIFIED`。
- **M8**：现有分支新增本地提交 `4c11981`，修正 11 份公开文档的 Release、安全中心原生 Shell/E4 声明；`check-docs` 对 14 份文档、55 个本地链接、13 个代码示例、4 个 issue 模板通过。尚未推送；PR #40 远端旧 head `b0f30ff` 检查 9/9。GitHub Packages 因未认证返回 401，分发状态未核实。
- **M9 / PR #36**：集成候选仍为 `5c11113`；此前本地 `npm run verify` 为 391 pass/0 fail/6 环境跳过、100 文件 package smoke 通过。PR #36 远端旧 head `996073a` 的检查 9/9；本地候选与远端差异 86 个提交、136 个文件，新 head CI 未运行。M7/M8 最新提交尚未包含在该候选中。
- **仍未关闭门槛**：P1 #27、#28、#32、#41、#44、#45、#48；P2 #46 与 M4 诊断真实性。#35 已 CLOSED，证据仅限同进程、同 Guard 且 callback 遵守 AbortSignal；外部 E4、原生 Shell 和干净 VM 验收不能由合成测试替代。
- **操作边界**：最近一次代码推送约 07:14 UTC；20 分钟间隔已满足，但等 M1/M2 当批任务结束并复核后再统一 dry-run/快进推送。不得 force-push；未合并 main/PR #24，未发布 Release。

- **额度与并发**：网页显示五小时剩余 47%、约 26 分钟后重置；每周 69%，余额 113。M7 隔离 VM 可用性核查与 M8 文档声明审查为当前 2/2 模块任务；VM/真实模型/安装测试互斥，低于 5% 或读数不可用即暂停所有开发、测试、浏览器和 GitHub 操作。
- **PR #24**：仍 OPEN/Draft，base `competition/shanchuanzhi-release-readiness`、head `62496d4`，精确 head 检查 11/11；本轮未触碰、未合并。
- **M0 / PR #30**：远端 head `a81a33d`，检查 10/10；本地 `feature/ac3-m0-coordination` 含协调文档更新，待现有分支批次推送。
- **M1 / #32 / #44**：PR #43 远端 head `f59ba37`，检查 9/9；本地报告 head `7a6eb98`。M1 对 #44 的证据支持审批过期清理与测试观察时序竞争，未证明 Gateway 错误放行；精确托管 runner 时序仍 UNKNOWN。#32 历史 Hook marker 根因仍 UNKNOWN；Issue #44 保持 OPEN 等待组合 CI/验收。
- **M2 / #45**：PR #37 远端 head `cb84f43`，检查 9/9；本地 `d9d775b` 含事件名前置拒绝与路径脱敏修订。真实 Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`，协议测试不证明宿主保护。
- **M3 / #27**：PR #33 远端 head `54facf0`，检查 9/9；本地 `d9364cc` 记录测试登记和 manifest 责任。M3 onboarding 测试已在根脚本登记；跨模块 manifest 合并仍须组合验收。
- **M4**：PR #34 远端 head `f301195`，旧 head 检查 9/9。本地新增修复 `69ec7f1`：审计 API 不可用的导出由假 `0/[]` 改为 `null/null`，与真实空审计区分；定向测试 7/7。新提交尚无 GitHub CI。后端保护和 E4 状态继续显示 `UNKNOWN`。
- **M5 / #46 / #48**：PR #47 远端 head `cf4e2cd`，精确 head run `38527097304` 检查 9/9；本地 readiness report `bcbec98` 已同步。M5 owner 已修正 PR 描述，将旧 `f8291c9` 失败标为已被取代，并保持 Draft；#48 仍 OPEN，等待 M9 组合验收和 M1/M5 行为闭合，未确认真实数据泄露。
- **M6 / #27 / #46**：PR #38 远端 head `d513810`，检查 9/9。M6 SecurityEvidenceEvent 与 M5 PolicyAuditEvent 是不同 schema，当前没有消费关系；外部 E4 仍 `NOT_VERIFIED`。M6 worktree 的未跟踪 E4 运行目录保留未动。
- **M7 / #28 / #41**：PR #39 远端 head `5c7d95d`，旧 head 检查 11/11；本地候选/报告 head `ead9593`（代码候选 `6d978a5`），M1 owner 已审查 5 个 M1 文件 blob。新 head GitHub CI 未运行。M7 正在只读检查隔离 VM 前置条件；clean-VM 安装、升级、卸载和真实取消回滚仍不得标 PASS。
- **M8**：PR #40 远端 head `b0f30ff`，检查 9/9；正在复核中英文公开说明是否准确呈现原生 Shell 未保护、E4 未验证和未发布状态。
- **M9 / PR #36**：本地集成候选 `5c11113` 的 npm run verify 通过：397 项中 391 通过、0 失败、6 项环境条件跳过；100 文件 package smoke 通过。该结果仅为本地验证；PR #36 远端仍在 `996073a`，该旧 head 检查 9/9。候选相对远端有 86 个提交差异、136 个文件改动；隐私扫描未发现用户路径、私钥标记或邮箱，固定 token-like 测试输入已由 M7 判为安全夹具。推送后仍需当前组合 head CI 和跨模块验收。
- **仍未关闭门槛**：P1 #27、#28、#32、#41、#44、#45、#48；P2 #46。#35 已 CLOSED，但证据只覆盖同进程、同 Guard 且 callback 遵守 AbortSignal。E4 外部运行、原生宿主保护和干净 VM 验收均不可由合成测试替代。
- **操作边界**：最近一次代码推送约 07:14 UTC，20 分钟批次间隔已满足；将先 dry-run，再一次性快进推送经审查的既有分支。未合并 main/PR #24，未发布 Release。

## 历史快照（2026-10-14 07:16 UTC；额度沿用 07:13 UTC 读数）

- **PR #24**：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4`；本轮未修改、未合并。
- **M0 PR #30**：head `a81a33d`；CI run `38527097301` 9/9、ownership contract run `38527097311` 1/1 通过。
- **M1 PR #43**：head `f59ba37`，CI 9/9。#44 的过期审批测试修正已通过 Ubuntu Node 20、Windows Node 20/22；#32 旧 wrapper 漏 marker 的精确根因仍 UNKNOWN，#44 与 #32 等 M9 共同基线验收。
- **M2 PR #37**：远端 head `cb84f43`，CI run `38522973817` 9/9。脱敏候选 `cfde2f0` 在现有分支本地通过 JSON 与 diff 检查，尚未推送；实际 Codex Desktop 原生 Shell 仍 `UNPROTECTED / BLOCKED_NOT_VERIFIED`，Issue #45 OPEN。
- **M3 PR #33**：head `54facf0`，run `38519955779` 9/9；契约保留在 M3 专属附录。
- **M4 PR #34**：head `f301195`，9/9；后端 endpoint 仍 `UNKNOWN/UNSUPPORTED`。
- **M5 PR #47**：远端 head `cf4e2cd`，CI run `38527097304` 9/9，含完整 Node 20/22 × Ubuntu/Windows/macOS 矩阵、Docker、Sponsor 与 package-smoke。M1 的安全 fixture 修正已纳入；OBSERVE sensitive-read 仍 hard DENY。M5 正修正 readiness report 旧契约路径说明；#48 保持 OPEN 等 M9 组合验收。
- **M6 PR #38**：head `d513810`，CI 9/9；合成事件与 bundle 测试分别 41/41、12/12。真实外部 E4 仍 `NOT_VERIFIED`。M6 已确认它的 `SecurityEvidenceEvent` 与 M5 `PolicyAuditEvent` 是分离 schema，M6 不消费 M5 audit stream。
- **M7 PR #39**：head `5c7d95d`，主 CI 9/9、wrapper 2/2。Issue #41 的 clean-VM 安装/升级/卸载/取消回滚仍 `NOT VERIFIED / HOLD`；VM 快照、磁盘链、NSIS 3.13 与安装器包前置条件未满足。
- **M8 PR #40**：head `b0f30ff`，CI 9/9；未发布 Release。
- **M9 PR #36**：head `996073a`，自身 CI 9/9；现正核对 M1–M8 远端候选并准备组合验收，结果未出。
- **未关闭门槛**：P1 #27、#28、#32、#41、#44、#45、#48；P2 #46。#35 已 CLOSED，证据仅覆盖同进程、同 Guard 且 callback 遵守 AbortSignal。
- **调度**：当前并行 M5 与 M9（2/2）；无 VMware、真实模型或安装测试运行。五小时额度最后成功读取于 07:13 UTC：77%（每周 74%，余额 113）；浏览器本轮额度页重定向，故不宣称有更新读数。最近推送批次约 07:14 UTC，下一批不早于 07:34 UTC。
- 当前没有可调用的 `read_thread`；进度以现有 worktree、GitHub PR/Issue 与 CI 为准。未合并 main/PR #24，未发布 Release，M0 只改协调文档。

## 历史快照（2026-10-14 06:48 UTC；原始核验记录）

- **PR #24**：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `feature/agent-canary-3.0` / `62496d4`，未合并、未改动。
- **M0 PR #30**：远端 head `aa1450a`，9 项 CI 与 ownership evidence 1 项均通过；本地 M0 文档待 06:54 UTC 之后的既有分支批次。
- **M1 PR #43**：head `f59ba37`，9/9 CI 通过。Issue #44 复核确认旧 5 ms TTL 测试在读取 `pending()[0]` 前已过期；dispatch 约 6 ms，失败发生在调用 `approve` 之前。更新测试先从拒绝错误捕获 requestId，再确认过期审批不会执行 callback；Ubuntu Node 20、Windows Node 20/22 都通过。#44 仍 OPEN 等共同基线复验。#32 仍 OPEN，当前候选全矩阵通过但旧 wrapper 的精确漏 marker 原因仍未证实。#48 的 M1 fixture 修正已进入 M5 本地候选。
- **M2 PR #37**：head `cb84f43`，9/9 CI 通过。Binder 缺少/未知可信 `executionSurface` 时 fail closed；原生 Shell 在执行前报告 `M2_NATIVE_SHELL_UNPROTECTED`。实际 Codex 原生 Shell 仍 UNPROTECTED，M2 正在现有分支推进 #45。
- **M3 PR #33**：head `54facf0`，9/9 通过；M3 契约归入模块附录，M0 canonical contract 路径无 M3 净变更。
- **M4 PR #34**：head `f301195`，9/9 通过；后端 endpoint 仍 UNKNOWN/UNSUPPORTED。
- **M5 PR #47**：远端仍为 `f8291c9`，旧 run 的 Ubuntu Node 22 router flow 失败、五个矩阵任务被 fail-fast 取消。M5 本地候选 `cf4e2cd` 精确纳入 M1 `f59ba37`；路由/策略 43/43、完整测试 341 pass/5 skip/0 fail、build 与 diff-check 通过。Package-smoke 和更新后的远端矩阵尚待 06:54 批次推送；未降低 OBSERVE 敏感读取拒绝。
- **M6 PR #38**：head `d513810`，9/9 通过；通过的是合成归档证据，外部 E4 NOT_VERIFIED。原始本地 E4 目录保持不变。
- **M7 PR #39**：head `5c7d95d`，主矩阵 9/9、wrapper 2/2 通过。#27 字段核对已评论：M3/M5/M7 分别增补测试脚本、M5 增加 policy export、M6 增加 e4 命令且不改 test 列表，锁文件相同。#41 安装验收前置盘点为 BLOCKED/HOLD：候选 VM 留有 `.vmx.lck`、`cleanShutdown=FALSE`，快照查询要求未提供的 VM 密码；既有记录提示虚拟盘锁拒绝/链不一致；找不到 NSIS 3.13 `makensis.exe` 和安装器 EXE。未启动/修复 VM，未运行安装、升级、卸载或取消回滚；禁止宿主直装。
- **M8 PR #40**：head `b0f30ff`，9/9 通过；未发布 Release。
- **M9 PR #36**：head `996073a`，9/9 通过，但 M1–M8 候选尚未组合验收。
- **开放跨模块门槛**：#27 package/manifest 组合 CI；#28 Gateway 生命周期组合 CI；#32 Hook 共同基线复验；#41 安装器 clean-VM 验收；#44 approval expiry 共同基线复验；#45 原生 Shell 保护；#46 canonical contract/M6 consumer 对齐；#48 更新后的 M5 CI。#35 关闭范围限同进程、同 Guard 且 callback 遵守 AbortSignal。
- **排程与额度**：M2 #45 是当前活动模块任务；M7 #41 前置盘点结束并释放槽位，状态 BLOCKED/HOLD，需修复隔离测试环境并备齐 NSIS 3.13 与安装器后才安排独占窗口。用量页本轮实读 5 小时剩余 82%、每周 75%、余额 113、约 4h15 后重置；低于 5% 或无法读取即暂停，确认重置后再恢复。最近推送批次约 06:34 UTC，下一批不早于 06:54 UTC。VMware、真实模型和安装测试继续互斥。
- 本会话没有可用 `read_thread` 工具；只按 worktree、PR、CI、Issue 与额度页实况记录。未合并 main 或 PR #24，未发布 Release，M0 未改 M1–M8 产品源码。

## 历史快照（2026-10-14 05:17 UTC；保留原始核验记录）

- PR #24：OPEN/Draft，head 62496d4，base competition/shanchuanzhi-release-readiness；未修改、未合并。PR #30 仍 OPEN/Draft，head 9300f80；本批 M0 文档已推送，run 38515050934 的节点矩阵、package-smoke、Docker、sponsor 与 ownership-contract-evidence 当前均通过。
- M1：PR #43 head 2276526，run 38502266488 为 9/9；Hook interruption 测试采用异步 marker wait。Issue #32 和 #44 保持 OPEN，需将修复纳入基线并验证；未发现实际审批绕过或宿主 callback 证据。
- M2：PR #37 head 08c93bc 已推送。run 38515077665 只有 Windows Node 20 真正失败（test/agent-hook.test.ts marker 断言）；macOS Node 20 与 Windows Node 22 因 fail-fast 取消，其余通过。该失败属于 M1 测试，见 #32。Windows CLI sandbox 的 :workspace 合成哨兵写入成功仅证明允许路径可写；未证明拒绝路径、Desktop Shell 或 Hook，原生桌面仍 UNPROTECTED，#45 OPEN。
- M3：PR #33 远端仍为 c404b6b。候选 54facf0 的净 PR diff 仅新增 docs/3.0/M3/ONBOARDING_API_CONTRACT.md，不改共享 docs/3.0/API_CONTRACTS.md；这符合模块细节与 M0 canonical contract 分离的所有权约定。已更正此前错误留言；现有提交待下一批推送并触发 CI。
- M4：PR #34 head f301195 已推送，run 38515082347 全部 9 jobs 通过；保留未实现后端 API 为 UNKNOWN/UNSUPPORTED。
- M5：现有分支 feature/ac3-policy-audit 已建立 Draft PR #47，head f8291c9。targeted policy tests 44/44、TypeScript no-emit 与 diff-check 通过；run 38515368157 的 Ubuntu Node 22 在 security-router 的 same-Guard flow 测试失败，报 observe_sensitive_data_blocked；其他 5 个测试 job 被 fail-fast 取消，Docker/sponsor 通过，package-smoke 跳过。P1 #48 跟踪 M1/M5 行为与测试冲突；P2 #46 跟踪 M5 OBSERVE contract 与 M0 canonical 文档同步。M5 最终 PR diff 不改共享 contract 路径；其报告中的 duplicate-path 说明待 M5 owner 校正。未发现真实数据泄露。
- M6：PR #38 head d513810，run 38512550585 为 9/9；PR 描述已补当前证据。该结果只验证归档的 synthetic E4 bundle，不代表真实模型/外部 E4 验收；状态 BLOCKED / NOT_VERIFIED。
- M7：PR #39 head 5c7d95d，CI run 38510356534 为 9/9，wrapper run 38510356548 两个平台通过。PR 与 #41 已补状态，Issue #41 保持 OPEN 等候集成；clean-VM 安装、升级、卸载与真实用户取消回滚仍 NOT VERIFIED / HOLD。
- M8：PR #40 head b0f30ff，run 38397180263 为 9/9；PR 描述已补当前 CI。未发布 Release。
- 本批对已有分支作 fast-forward push：M0、M2、M4；未新建模块分支，未合并 main 或 PR #24。下次 branch push 不早于 05:32 UTC，按 20 分钟批次。
- 05:16 UTC 左右读取使用额度页：5 小时剩余 73%，约 34 分钟后重置；周额度 80%，余额 113。低于 5% 或无法读数时暂停开发、测试、浏览器与 GitHub 操作，等确认额度重置后继续。
- 当前工具清单没有 read_thread/send_message_to_thread；没有删除或读取 8 个引用聊天，也不声称其会话状态。当前协调只按 worktree、远端 refs、Issues、PR 与 CI 实况记录。M0 未观察到 VMware、真实模型或安装测试预约；不能据此断言其他聊天没有运行这些测试。
- M9 集成 worktree/branch 已存在，等待 M1–M8 契约与候选门禁满足后再集成。

## 历史状态（2026-10-14 04:36:33 UTC；该时间点的快照）

- PR #24：OPEN/Draft，base `competition/shanchuanzhi-release-readiness`，head `62496d4020bd90ba2eede49b2e80a2bbebb036b4`；11/11 checks 通过。未修改或合并。
- PR #30：OPEN/Draft，M0 head `19ee8ca` 已于 04:14 UTC 推送；run `38510345880` 为 7 pass、Windows Node 20 1 fail、Windows Node 22 cancelled、package-smoke skipped。失败是旧基线 `spawnSync` 1 秒等待窗口未等到 marker；Node 22 job 日志为 322 pass、0 fail 后被取消。M1 PR #43 的更新代码 Windows Node 20/22 检查通过；#32 保持 OPEN，等待集成后的基线 CI 验收。
- 当前两个开发槽是 M3 与 M4。M3 正将 owner-authored onboarding 契约交接到 M3 专属附录、清除共享契约路径重叠；M4 审核 OBSERVE/Guard 状态展示是否保留拒绝、隔离与 UNKNOWN。两者只在各自 worktree/文件所有权内工作。
- M2 commit `63b9c08` 已加入 M2 Gateway callback binder seam 与 fixture；8 个 M2-owned 文件、定向检查通过，当前本地未推送。PR #37 远端仍为 `a1c239d`；该 binder 不集成 AppContainer，原生 Codex Shell 仍 `UNPROTECTED`，宿主验收仍 `BLOCKED_NOT_VERIFIED`。
- M5 commit `9f33f97` 保留显式 DENY、禁止 OBSERVE 放行 `SENSITIVE_DATA`；后续 commit `f8291c9` 添加已登记 `sensitive-read` 拒绝、零回调/零审批请求和敏感 egress 日志脱敏测试，并移除 M5 分支重复的公共契约文件。定向测试 44/44、TypeScript no-emit、diff check 通过。M5 尚无远端 PR/CI，P0 仍 OPEN。
- M6 commit `d513810` 比 PR #38 远端 head `bca895f` 超前 1、落后 0；现有 PR 为 OPEN/Draft。此前 12/12 verifier 回归通过，PR 的当前旧头 CI 有 M1-owned Windows Node 22 interruption marker 失败，package-smoke skipped；M6 候选不含 Hook 改动。原始 E4 证据未跟踪且不随 PR 上传，外部 E4 仍 `NOT_VERIFIED`；VMware、真实模型和安装测试未运行。
- M6 commit `d513810` 已完成 bundle verifier 修复与审计：聚焦回归 12/12 通过；sidecar 漂移、元数据不一致与 ZIP 字节篡改在临时副本中均被拒绝；原始 16 文件 E4 目录未改。PR #38 远端仍是旧 head `bca895f`（7 pass、M1-owned Windows Node 22 Hook marker fail、package-smoke skipped）。真实 E4 仍 `NOT_VERIFIED`。
- M7 commit `5c7d95d` 已推送至 PR #39；新 run `38510356534` 与 wrapper run `38510356548` 合计 11/11 checks 通过。该修复改用 `MUI_CUSTOMFUNCTION_ABORT AgentCanaryAbortCleanup`，保留 `MUI_ABORTWARNING` 与 `RollbackInstall`。定向测试 8 pass/1 skip、可靠性套件 43 pass/3 skip；本机没有固定 NSIS 3.13 编译器，真实编译和 VM 安装仍未验证。
- M1 PR #43 head `2276526`，run `38502266488` 为 9/9 通过。M1 核查确认 #30 Windows Node 20 失败、Node 22 取消；失败来自旧基线的一秒启动窗口，不表示 Hook 放行。M1 当前异步测试等待实际 marker，并验证无输出、无决策日志、无 allow；M7 不修改 Hook 路径。
- M3 PR #33、M4 PR #34、M8 PR #40 当前头均为 9/9 checks 通过；M9 最终集成尚未完成。
- 04:36 UTC 用量页：五小时剩余 73%，1h14m 后重置；周额度 80%，额度余额 113。若五小时剩余低于 5% 或读数不可确认，暂停开发、测试与 GitHub 操作；恢复前确认五小时额度已实际重置。
- 本批远端 push 包含 M0 与 M7 两个分支，协调时点为 04:14 UTC；下一批不得早于 04:34:50 UTC。模块提交/CI 准备期间继续按 20 分钟一批安排。
- `main` worktree 存在大量未提交改动；本轮未在其中编辑或清理，所有模块更新留在各自 worktree。VMware、真实模型、安装测试互斥；当前没有此类本地测试预约。未合并 main、未合并 PR #24、未发布 Release。

## 历史快照（2026-10-13 16:16 UTC；保留作记录）

- PR #24：OPEN/Draft，base competition/shanchuanzhi-release-readiness，head 62496d4，未合并；最近核对 11/11 checks 通过。
- M0 PR #30：OPEN/Draft，远端 head d23f1ae、CI 10/10 通过；本地协调快照已提交到 da25925，待下个推送批次。最新推送为 16:02:40 UTC；下次不早于 16:22:40 UTC。
- M1：活跃槽位 1/2；PR #43 head 89e40cd，9/9 checks 通过。P0 修复提交 ec3bc96 已在该远端祖先中；当前回归测试通过。#35 保持 OPEN，等待 M1 确认剩余缺口或 owner disposition；#32/#44 仍 OPEN。M1 本地 HEAD b0478b9 是证据文档更新。
- M7：活跃槽位 2/2；PR #39 远端仍为 65ce028，现有 CI 有 Windows Node20/22、macOS Node20 与 Windows wrapper 失败。本地 HEAD 4f3a2c5（比远端多 4 个提交），含固定 NSIS 编译器安装 workflow；工作树干净，新候选 CI 尚未运行/验证。
- M2：PR #37 OPEN/Draft、9/9 checks 通过；Codex 原生 Shell 仍 UNPROTECTED，P1 #45 OPEN，等待槽位。
- M3：PR #33 9/9 checks 通过，#42 已关闭；M4：PR #34 9/9 checks 通过；M8：PR #40 9/9 checks 通过。三者 IDLE。
- M5：feature/ac3-policy-audit 本地干净、5 commits ahead，无远端 PR；API_CONTRACTS.md 路径及 package.json 字段按 #27 协调。
- M6：PR #38 head bca895f 的旧 CI 为 7 pass、Windows Node22 1 fail、package-smoke 1 skipped；外部 E4 仍 NOT_VERIFIED。未跟踪 E4 run 目录保持本地。
- M9：PR #36 OPEN/Draft、head 996073a，9/9 checks 通过；描述已刷新为两项并行和当前门禁。
- 并行开发上限 2；当前仅 M1、M7 活跃（2/2）。额度页 13%，约 1 小时 12 分钟后重置；监控每 60 秒轮询。<=5% 或读数不清时全部暂停，实际低额度暂停只在确认五小时额度重置后恢复。
- VMware/真实模型测试未运行。M7 负责下一个独占安装测试窗口；CI 验证尚未开始。未合并 main、未合并 PR #24、未发布 Release。
- 本节为当前权威快照；较早记录按原时间保留作历史证据。
## 基线与 PR #24

- 总仓库 checkout：`main`，HEAD `146be17ea924d09a78ceff90b83006cdd40dfc43`。
- AC3 开发基线：`feature/agent-canary-3.0` HEAD `62496d4020bd90ba2eede49b2e80a2bbebb036b4`。
- PR #24：OPEN、Draft、mergeable；base `competition/shanchuanzhi-release-readiness`（`dc8d0092b35141b295d5ff42873584ed488e4ee7`），head AC3 `62496d4...`。不是已合并 main。
- 检查时 `gh pr checks 24` 的 11 项全部通过：3 OS × Node 20/22 测试矩阵 6 项、package smoke、Docker build、sponsor smoke、2 wrapper regression。之后状态可能变化，以 PR checks 为准。

## 工具检查

| 工具 | 观察结果 |
| --- | --- |
| Git for Windows | 2.54.0 |
| GitHub CLI | 2.102.0；`gh auth status` 显示已登录 DorianChn，未记录/输出 token |
| Codex CLI | 0.162.0-alpha.17.2 |
| Node.js / npm | 22.23.1 / 10.9.8 |
| Python | Windows `python`/`python3` 为 Store stub，`py` 不存在；WSL Python 3.14.4 可用 |

## 工作树矩阵

| 模块 | 分支 | HEAD | 当前改动快照 | 路径环境 |
| --- | --- | --- | --- | --- |
| M1 | feature/ac3-security-core | b0478b9 | PR #43 remote 89e40cd、9/9 checks；fix commit ec3bc96 is in remote ancestry; #35 owner disposition pending | WSL Git worktree |
| M2 | feature/ac3-execution-isolation | a1c239d | PR #37 OPEN/Draft、9/9 checks；原生 Shell 仍 UNPROTECTED，#45 等待槽位 | WSL Git worktree |
| M3 | feature/ac3-agent-onboarding | c404b6b | PR #33 9/9 checks；#42 已关闭；工作树快照不变 | Windows Git worktree |
| M4 | feature/ac3-desktop-security-center | fe2c973 | PR #34 9/9 checks；工作树快照不变 | Windows Git worktree |
| M5 | feature/ac3-policy-audit | 9ec08d9 | 本地干净、5 commits ahead；无远端 PR；契约路径及 package.json 字段由 #27 协调 | WSL Git worktree |
| M6 | feature/ac3-e4-validation-ac3（另有旧 PR #31 分支） | bca895f | PR #38 旧 CI 7 pass/1 Windows Node22 fail/1 package-smoke skipped；有未跟踪 E4 run 文件；外部 E4 NOT_VERIFIED | Windows Git worktree |
| M7 | feature/ac3-reliability-ac3 | 4f3a2c5 | PR #39 remote 65ce028; four local commits ahead, clean; pinned NSIS CI setup awaits new remote run | WSL Git worktree |
| M8 | feature/ac3-open-source-product | b0f30ff | PR #40 当前头，9/9 checks 通过；未发布 Release | WSL Git worktree |
| M0 | feature/ac3-m0-coordination | da25925 local; d23f1ae remote | PR #30 current remote CI 10/10 pass; next batch >=16:22:40 UTC | Windows Git worktree |
| M9 | feature/ac3-m9-integration | 996073a | 集成计划在 Draft PR #36；当前头 9/9 checks 通过 | Windows Git worktree |

初始 main 与 AC3 快照存在不同历史；M3 当前 PR #33 head `c404b6b` 已基于 AC3 `62496d4`，旧 main-based 快照 `cf42dde` 保留在 `backup/ac3-agent-onboarding-main-base`。M6 旧 PR #31 分支仍为 main-based `da52c17`；独立 AC3 PR #38 使用 `bca895f`，manifest 与字段组合继续由 #27 跟踪。M4/M0/M9 worktree 基于 `62496d4`。工作目录/index 独立；WSL 创建的工作树由 WSL Git 使用，Windows 创建的工作树由 Git for Windows 使用，用另一运行环境查看会把外部绝对路径显示为 prunable。

## GitHub 协作

- [Issue #27](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)：M3/M6 基线与 M3/M5/M6/M7 manifest 冲突，OPEN。
- [Issue #28](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)：M1/M7 Gateway 冲突，OPEN。
- [Issue #32](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)：Hook interruption 历史失败仍 OPEN；M1当前 async 测试10/10、M6对PR #38旧spawnSync/1秒版本5/5通过，但均未复现远端marker缺失，根因UNKNOWN。
- [Issue #35](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)：quarantine P0 保持 OPEN；M1 最新修正仍仅在本地，PR #43 远端 head 未改变。
- [Issue #41](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)：M7 可靠性 CI 失败保持 OPEN；候选65ce028正按失败日志验证，后续需新 head CI。
- [Issue #44](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/44)：P1 gateway approval-expiry CI 失败；M1按精确源版本复现与归因，OPEN。
- [Issue #42](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)：已依据 M3 head `c404b6b`、run `38400488378` 9/9（含 package-smoke）及 PR 内 M3 契约章节关闭为 completed。旧 `cf42dde` manifest 证据留作历史。
- `.github/workflows/ci.yml` 在 PR 自动跑构建/测试/打包/容器/sponsor 检查。本 PR 加入协作字段与接口冲突 gate；未核实 branch protection 是否强制这些 check。
- Codex Desktop Connector 未暴露 `read_thread`、`wait_threads` 或 `send_message_to_thread`。应用户许可，M0 曾只读本机 `thread_history` 并用 `codex queue` 调度；具体模块进度以对应 worktree 与 GitHub refs/Issues/PR 为准，不把本机记录说成原生 `read_thread`。

PR [#30](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/30) 仍 OPEN/Draft，base `feature/agent-canary-3.0`，远端 head `1179ed1`。当前头检查 10/10 通过。上一头 `0091759` 的 run `38421264751` 中 macOS Node22 job 等待 15 分钟后被取消，`runner_id=0` 且无步骤日志；`package-smoke` 跳过，故仅记为 runner 分配结果未知。

## M0 交付边界

已建立 `main/`（AC3 detached 基线快照）、`agents/M1–M8`、`coordinator/`、`integration/`、`reports/`、`logs/`。根仓库 `main` checkout 保持原状。M0 未改 M1–M8 源码，未合并 main，未发布 Release。WSL 与 Windows 工作树各由对应 Git runtime 读取；交叉 runtime 会显示不兼容指针为 `prunable`，没有执行 `repair/prune`。
