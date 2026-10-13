# M0 技术问题分级与协作流程

更新日期：2026-10-13。当前状态基于 GitHub、文件系统和本机 Codex thread-history 记录；当前 Desktop 工具集合没有 `read_thread`/`wait_threads`。

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
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN）：PR #38 run 38397135538 的 Windows Node22 唯一失败落在 M1-owned test/agent-hook.test.ts:54；M6 owner 本地定向1/1、整文件10/10且未能复现。M1 本地 Node22 整文件10/10、子测试重复5/5通过，Node20不可用，未发现确定性修复；根因仍 UNKNOWN，保留超时/无 allow/无 callback 断言。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，OPEN）：M1 owner 报告 Windows Node 22 聚焦 34/34 通过，证明同进程 quarantine 时先 abort、dispatch 被拒且没有合成副作用；跨进程/shared-store 边界仍未验证。一次 push 90 秒无输出后 exit 1，PR #43 远端仍 d0fd595。保持 P0，等待当前 PR 头 CI 与充分端到端验收。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：PR #39 远端 `f17b7e6` 的 wrapper 与跨平台 jobs 失败；owner 本地候选 `65ce028` 的单次 push 因 non-interactive HTTPS 凭据不可用而未成功。
- [#42 M3 package manifest/current-head validation](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)（P1，CLOSED/completed）：PR #33 当前 head c404b6b、run 38400488378 9/9（含 package-smoke）且含 owner-authored M3 API 契约；旧 cf42dde manifest 证据不适用于当前 AC3 PR。跨模块 manifest 组合继续跟踪于 #27。

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- 开发并行度上限为 2。2026-10-13 13:59 UTC，M1/M6 后续工作均完成，槽位0/2。没有 VMware、真实模型或安装测试活动。下一批推送不早于14:00 UTC。
- VMware、真实模型和安装测试共用一个互斥槽，同一时间最多运行其中一项。当前无互斥测试在运行，M7 本轮未运行真实安装、VM 或模型测试。
- 本会话工具清单未暴露原生 read_thread/wait_threads。M0 曾经用户许可从本机 thread_history 只读记录核对已引用任务，并用 codex queue 续作；该本机记录不冒称原生 read_thread。当前活动状态对照实际 GitHub ref/Issue/PR 和 owner worktree。
