# M0 技术问题分级与协作流程

更新时间：2026-10-14 UTC。以上实时快照优先；其余 Issue 细节是对应日期的历史记录。

## 当前调度（2026-10-14 10:02 UTC）

- 当前 2/2 并发槽由 M1 与 M7 占用：M1 已完成 #28 owner handoff，M7 在自己的 PR #39 worktree 制作集成候选；M9 已完成计划文档更新并释放槽位。进度依据 GitHub、文件系统与额度页，不声称读取其他窗口聊天。
- **PR #24** 仍 OPEN/Draft，base competition/shanchuanzhi-release-readiness、head 62496d4；未修改、未合并。**PR #30** 仍 OPEN/Draft，head a81a33d；记录的 CI run 38527097301 为 9/9、ownership-contract run 38527097311 为 1/1。
- **M1 / #28 / #32 / #44**：PR #43 最近远端 head f59ba37，CI 9/9；本地报告提交 738a783，Gateway/containment 定向测试 51/51。M1 owner 已确认 M1/M7 共基线 62496d4 但互非祖先，并审查通过 M7 提交 `6d978a5` 中五个 owner 文件；M7 报告 Gateway/containment/acceptance 66/66、reliability 43 通过/3 跳过，M1 未独立重跑。M7 候选尚未推送，#28 维持 OPEN，待共同 CI 与最终审查。#32 历史 marker 根因仍 UNKNOWN，#44 仍 OPEN。
- **M2 / #45**：PR #37 远端 head cb84f43、CI 9/9；本地提交 4875d84 前置 hook_event_name 校验：缺失/错误事件名拒绝，仅完整 PreToolUse 非 Bash 透传；定向 protocol 测试通过。真实 Codex Desktop Shell 仍 UNPROTECTED / BLOCKED_NOT_VERIFIED；协议 fixture 与 AppContainer 子进程证据不代表原生宿主受保护。
- **M3–M4**：PR #33 head 54facf0、PR #34 head f301195；已记录 CI 各 9/9。M4 后端保护/E4 状态仍须显示 UNKNOWN，不得由 UI fixture 推断 PASS。
- **M5 / #48**：PR #47 最近远端 head cf4e2cd、CI run 38527097304 为 9/9。M5 本地最新报告修订在 bcbec98；OBSERVE 敏感读取仍 hard DENY。Issue #48 保持 OPEN，等待组合验收。
- **M6 / #46**：PR #38 head d513810；schema 测试 41/41、bundle verifier 12/12。M6 的 SecurityEvidenceEvent 与 M5 PolicyAuditEvent 分离，当前 M6 不消费 M5 stream，也未验证 M2 binder 的端到端行为；外部 E4 为 NOT_VERIFIED。
- **M7 / #28 / #41**：PR #39 远端 head 5c7d95d、该旧 head 的主 CI 9/9、wrapper 2/2；本地集成提交 `6d978a5` 已在既有 M7 分支，包含五个 M1 owner 文件和两份 M7 报告。M1 owner 确认五文件与 M1 HEAD blob 一致且候选语义可接受；M7 报告的定向测试为 Gateway/containment/acceptance 66/66、reliability 43 通过/0 失败/3 跳过。尚未推送；新 head 的 GitHub CI 未运行。clean-VM 安装/升级/卸载和真实取消回滚 NOT VERIFIED / HOLD。
- **M8**：PR #40 head b0f30ff、CI 9/9；未发布 Release。**M9 / PR #36**：本地计划文档 head 5c11113；此前 397 项统计对应功能组合 head 83d7268，391 pass、6 环境条件 skip、0 fail，不能当作新提交测试或 #28 集成证明。PR #36 最近远端仍为 996073a，组合 GitHub CI 待推送后运行。
- 当前未关闭门槛：P1 #27、#28、#32、#41、#44、#45、#48；P2 #46。#35 已 CLOSED，证据仅覆盖同进程、同 Guard 且 callback 遵守 AbortSignal。
- 网页用量页约 10:00 UTC 实读：五小时剩余 54%、约 59m 重置；每周剩余 70%、额度 113。低于 5% 或读数不可用时暂停开发、测试、浏览器和 GitHub 操作；确认重置后才恢复。
- 最近已知推送批次约 07:14 UTC，间隔已超过 20 分钟；候选和分支 ancestry 审查完后统一批次推送。VMware、真实模型和安装测试共用一个互斥槽；目前无此类运行。未合并 main/#24，未发布 Release，M0 只改协调文档。
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
