# M0 技术问题分级与协作流程

更新时间：2026-10-14 UTC。以上实时快照优先；其余 Issue 细节是对应日期的历史记录。

## 实时协作快照（2026-10-14 03:59:05 UTC；覆盖下方旧状态）

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

- [#27 M3/M6 AC3 基线与 M3/M5/M6/M7 package.json 协调](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/27)（P1，OPEN）。
- [#28 M1/M7 TrustedExecutionGateway 并行变更协调](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/28)（P1，OPEN）。
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN/UNKNOWN）：PR #39 head f66dcc6、run 38506733463 的 Windows Node 22 全套测试再次在 test/agent-hook.test.ts:54 失败；中断子进程后预期的 marker 文件未出现（false !== true）。责任模块 M1；保留 fail-closed、无 allow 与无 callback 断言，不删测试、不降低策略。当前单槽由 M7 使用，M1 暂不并行启动。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，CLOSED，范围有限）：接受范围为同一进程、同一 Guard，且 callback 配合 AbortSignal。该结果不证明跨进程/shared-store 场景；缺失证据仍需标 UNKNOWN。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：PR #39 head f66dcc6 的 run 38506733650 在 Windows 上真实 pinned-NSIS 编译失败，错误为 .onUserAbort 重复定义；run 38506733463 的 Windows Node 22 job 另有 M1-owned marker 失败（详见 #32）。M7 保留编译门禁、MUI abort warning、RollbackInstall 和现有测试。官方 MUI2 支持在 language macros 前登记 MUI_CUSTOMFUNCTION_ABORT；仍须由实际编译和新 head CI 验证。
- [#44 gateway approval-expiry CI failure](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/44)（P1，OPEN）：旧 PR #30 head `f2f2d10` / run `38412534723` 的 Ubuntu Node20 子测试出现 `requestId` undefined；根因仍 UNKNOWN。M1 按精确源码复现并判断行为/时序，不弱化过期审批 fail-closed 不变量。
- [#45 Resolve native Codex Shell unprotected boundary](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/45)（P1，OPEN）：M2 的 PR #37 仅验证过特定 AppContainer 子进程；原生 Codex Shell 明确为 `UNPROTECTED`，候选 Hook 未在宿主安装/信任。要求提供真实宿主合成 sentinel 证据，或以宿主能力证据明确保持 `UNPROTECTED`/`BLOCKED`，不得误称已保护；待 M1/M7 释放并发槽后派工。
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
