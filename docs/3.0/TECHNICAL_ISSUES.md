# M0 技术问题分级与协作流程

更新时间：2026-10-14 UTC。以上实时快照优先；其余 Issue 细节是对应日期的历史记录。

## 实时协作快照（2026-10-14 03:08:17 UTC；覆盖下方旧状态）

- 当前仅安排一个开发槽：M7 处理 #41。当前工具无法读取其他 Codex 窗口的会话内容或活跃状态；本快照只记录可核对的 GitHub 与文件状态。
- M1 PR #43 为 OPEN/Draft，head 2276526，run 38502266488 的 9 项检查全通过；#35 已 CLOSED。#32/#44 仍 OPEN，历史 CI 根因尚未确认，不安排新的 M1 改码任务。
- M7 PR #39 远端仍为 4f3a2c5，当前检查失败；本地候选 9b0a504 未推送。Windows 聚焦回归 3/3；reliability 43 pass、3 symlink 权限 skip、0 fail。候选尚无远端 CI、NSIS 实际编译或干净 VM 安装验收。提交前须由 M7 删除本机绝对 VM 路径。
- M2 PR #37 的 9 项检查全通过；#45 仍 OPEN，Codex 原生 Shell 状态为 UNPROTECTED。M2 等 M7 的 #41/#28 处理后再排槽。
- 当前 Issue：#27 OPEN、#28 OPEN、#29 OPEN、#32 OPEN、#35 CLOSED、#41 OPEN、#42 CLOSED、#44 OPEN、#45 OPEN。旧段落中的状态按其记录日期保留，不覆盖此实时快照。
- PR #24 仍 OPEN/Draft，head 62496d4，最近可见 11/11 checks 通过；CLI 未报告该分支有 required checks，分支保护规则未确认。PR #30 M0 协调分支的 10 项检查全通过。
- 使用情况页监视在 2026-10-14 02:57:50 UTC 读到 88% 剩余、约 2h52m 后重置；用户提供的截图为 91%、约 4h 后重置。两个读数都高于 5% 暂停线。低于 5% 或读数无法取得时暂停；仅在确认五小时额度已重置后恢复。
- 最近一次远端推送是 PR #43 于 02:44:51 UTC；下一次推送最早 03:04:51 UTC，之后各批至少间隔 20 分钟。当前没有 VMware、真实模型或本地安装测试在运行。
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
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN）：旧 PR #38 run `38397135538` 的 marker 断言失败仍未解释。新证据：PR #39 head `65ce028`、run `38415887207`、Windows Node22 job `115360080156` 在 M1-owned 测试 `native lab wrapper interruption emits no allow decision and invokes no tool callback` 失败，Expected true / actual false；Ubuntu Node20/22与macOS Node22通过，Windows Node20/macOS Node20被取消。M1 正检查该 job 的精确源码并做最多3次定向复现；保留 marker、无 allow、无 callback 断言。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，OPEN）：M1 本地 HEAD `dc4d7fa`，相关回归证据仍在工作树中；远端 PR #43 仍为 `d0fd595`，没有远端修复/CI 验收。M1 正先处理此项；保留跨进程/shared-store 未验证边界。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：PR #39 远端 `65ce028` 的 Windows wrapper、Windows Node20/22 与 macOS Node20 检查有失败；部分 Hook 失败归 M1/#32。M7 本地 HEAD `68e7caa`，正在修改 `INSTALLER_ACCEPTANCE.md` 和 `test/reliability.test.mjs`，不得跳过 NSIS 编译或 symlink 拒绝检查。
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
