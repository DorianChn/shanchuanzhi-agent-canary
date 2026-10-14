# M0 技术问题分级与协作流程

更新时间：2026-10-14 UTC。以上实时快照优先；其余 Issue 细节是对应日期的历史记录。

## 当前调度（2026-10-14 04:54 UTC）

- 双槽节奏已实际执行两轮：M3/M4 同时开发并分别本地提交 54facf0 / f301195；随后 M6/M7 并行审计当前 PR 与 CI。第三轮已在两个独立模块 worktree 启动：M1 处理 #44 approval-expiry 失败复现，M2 处理 #45 原生 Codex Shell 边界；当前 2/2 槽位占用。以 `collaboration.list_agents` 与独立 Git 分支/worktree 为实际运行证据，不把聊天标题当成完成证据。
- M1 槽位：`feature/ac3-security-core` / `agents/M1-security`；只处理 M1 Gateway/Guard 与测试，复现 #44 指定的 PR #30 run `38412534723` Ubuntu Node 20 失败；有必要时保留失败测试并做最小 fail-closed 修复。不得推送或改 Issue，交由 M0 批次处理。
- M2 槽位：`feature/ac3-execution-isolation` / `agents/M2-isolation`；只处理 #45 原生 Shell 支持能力和 M2 所有权文件。若当前宿主 API 无法证明受支持的 fail-closed enforcement，明确记录限制并继续标注 UNPROTECTED/BLOCKED；不得变更全局 Codex 配置。
- PR #30 当前 head 16a9142、run 38512532532：7 个 job 通过；Windows Node 20 测试为 321 pass、1 fail、4 skip，package-smoke 跳过。唯一失败是 test/agent-hook.test.ts:54 的中断 marker 断言，属于 M1 路径；PR #43 当前头的独立 CI 9/9 通过，不替代 PR #30 base 的结果。Issue #32 保持 OPEN，待集成后的 CI 再验。
- M2 PR #37 head 63b9c08，run 38512537164 的 9 个 CI jobs 全通过；callback binder 不代表 Gateway/AppContainer/宿主安装完成，原生 Codex Shell 仍 UNPROTECTED。
- M3 本地 commit 54facf0：契约专属附录、发行命令 NOT_VERIFIED 文案和 connect-check limits 修复；build 与 Windows Node 22 定向测试 14/14 通过，共享契约路径净 diff 为零。PR #33 仍旧头 c404b6b，待本批推送和新 CI。
- M4 本地 commit f301195：安全中心冲突展示与 UI 回归；build、定向测试 6/6、diff check 通过；两个缺失后端 API 实测 404，UI 保持 UNKNOWN/UNSUPPORTED。PR #34 仍旧头 fe2c973，待本批推送和新 CI。
- M5 本地候选 f8291c9 已推至 feature/ac3-policy-audit；44/44 测试、TypeScript no-emit、diff check 通过。待本批建立 P0 Issue 和 Draft PR。Issue 应描述 OBSERVE 下显式 DENY/SENSITIVE_DATA 的关键安全不变量和 synthetic 回归，不声称真实敏感数据已泄露；候选进入 PR/集成并完成 CI 前保持 OPEN。
- M6 PR #38 head d513810，run 38512550585 的 9 个 jobs 全通过。PR 实际包含归档 synthetic bundle 20261013T084123Z；未跟踪的 20261013T114513Z 16 文件目录保持本地。PR body 旧失败叙述过期，待本批更新；E4 仍 BLOCKED / NOT_VERIFIED。
- M7 PR #39 head 5c7d95d，run 38510356534 的 9 个 jobs 与 wrapper run 38510356548 两平台任务通过；Windows 固定 NSIS 编译步骤通过。Issue #41 的候选修复已验证，Issue 保持 OPEN 等待集成；运行时取消回滚与 clean-VM 安装/升级/卸载仍 NOT VERIFIED / HOLD。
- M8 PR #40 head b0f30ff，CI run 38397180263 成功，但 PR body 仍写 pending；待本批刷新。
- 额度页 04:54 UTC 实读：5 小时 73%、56 分钟后重置；周额度 80%、余额 113。低于 5% 或无法确认读数时暂停所有模块、测试、浏览器与 GitHub 操作，直至确认额度重置。
- 最近 push 批次约 04:37 UTC；不得早于 04:57 UTC 再推送/刷新 PR/Issue。VMware、真实模型、安装测试互斥，目前均未预约。

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

- M5 拟建 P0 Issue（下一 GitHub 批次创建，当前尚无 Issue 编号）：[P0] Preserve explicit denials and sensitive-data blocking in OBSERVE。责任模块 M5，契约协调 M0，Gateway 接入边界由 M1 核对；只用 synthetic sensitive-read，验收要求 DENY、0 callback、0 approval、无敏感输出且日志脱敏。候选修复 f8291c9 已有 44/44 定向测试，但在 PR CI/集成验证完成前不关闭，也不宣称发生了真实泄露。
- [#27 M3/M6 AC3 基线与 M3/M5/M6/M7 package.json 协调](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)（P1，OPEN）。
- [#28 M1/M7 TrustedExecutionGateway 并行变更协调](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)（P1，OPEN）。
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN）：PR #30 当前 head 16a9142 / run 38512532532 的 Windows Node 20 全量测试在 test/agent-hook.test.ts:54 失败，321 pass、1 fail、4 skip；未到达的 marker 断言属于 M1。PR #43 head 2276526 的独立 CI 9/9 通过，候选修复尚未进入 PR #30 base；不把独立分支结果算作该基线通过。保留 fail-closed、无 allow 与无 callback 断言，不删测试、不降低策略；集成后再验并关闭。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，CLOSED，范围有限）：接受范围为同一进程、同一 Guard，且 callback 配合 AbortSignal。该结果不证明跨进程/shared-store 场景；缺失证据仍需标 UNKNOWN。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN，候选修复已验证、待集成）：PR #39 当前 head 5c7d95d 的 CI run 38510356534 全部 9 jobs 通过；wrapper run 38510356548 的 Windows pinned-NSIS compile 与 Ubuntu reliability checks 通过。修复使用 MUI_CUSTOMFUNCTION_ABORT AgentCanaryAbortCleanup 并保留 RollbackInstall；它证明模板可编译，不证明真实用户取消时 rollback 的运行时效果。Issue 等候集成后关闭；clean-VM install/upgrade/uninstall 仍 NOT VERIFIED / HOLD。
- [#44 gateway approval-expiry CI failure](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/44)（P1，OPEN）：旧 PR #30 head `f2f2d10` / run `38412534723` 的 Ubuntu Node20 子测试出现 `requestId` undefined；根因仍 UNKNOWN。M1 按精确源码复现并判断行为/时序，不弱化过期审批 fail-closed 不变量。
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
