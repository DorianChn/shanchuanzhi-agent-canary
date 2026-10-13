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
- [#32 Windows Node 20 Hook interruption 测试失败](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN）。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，OPEN）：M1 的合成复现观察到外部 `Guard.trip()` 后活动 callback signal 仍为 `aborted=false`，释放测试 gate 后产生临时 marker 副作用。M1 独占本轮 `src/runtime/gateway.ts` 修复和 Guard/Gateway 契约提案；M7 仅继续其 packaging/scripts/M7 测试工作。

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- 开发并行度上限为 3。当前开发槽由 M1（P0 #35）、M5（策略/Guard 审计）和 M7（独立 packaging/scripts 工作）占用。M4 代码已完成且 PR #34 CI 通过，M0 已要求其结束 CI 轮询并释放槽；M2/M3 当前无开发工作；M6/M8 排队。
- VMware、真实模型和安装测试共用一个互斥槽，同一时间最多运行其中一项。当前无互斥测试在运行，M7 被要求不执行真实安装/VM 测试。
- M0 从本机保存的 Codex `thread_history` 只读记录核对任务和状态，使用 `codex queue` 续发消息。该本地记录不等于 `read_thread` 工具；开发状态同时对照 Git worktree 和 GitHub Issue/PR。
