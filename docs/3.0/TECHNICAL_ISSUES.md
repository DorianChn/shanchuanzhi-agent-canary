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
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN；历史 Hook interruption 失败仍待 owner 组合修复和精确 head CI，不能由无关的绿色 PR 推断已解决）。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，OPEN）：历史 pre-fix 复现确认 quarantine 后仍有活动 callback 写入合成标记。PR #43 远端仍为 `d0fd595`；run `38399797819` 在 Ubuntu Node 22 的子测试 217 失败。M1 owner 本地复现称 dispatch 已中止、读取未返回、标记未变且后续写入被拒；test-only commit `dc4d7fa` 与 34/34 聚焦结果仍仅为 owner 本地证据，push 未更新远端。保持 P0，等待当前 head CI 与端到端安全验收。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：PR #39 远端 `f17b7e6` 的 wrapper 与跨平台 jobs 失败；owner 本地候选 `65ce028` 的单次 push 因 non-interactive HTTPS 凭据不可用而未成功。
- [#42 M3 package manifest/current-head validation](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)（P1，CLOSED/completed）：PR #33 当前 head c404b6b、run 38400488378 9/9（含 package-smoke）且含 owner-authored M3 API 契约；旧 cf42dde manifest 证据不适用于当前 AC3 PR。跨模块 manifest 组合继续跟踪于 #27。

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- 开发并行度上限按用户最新要求为 2。2026-10-13 13:25 UTC，模块任务槽为 0/2。M1/M5/M7 当前均已停在安全点；没有 VMware、真实模型或安装测试活动。下一次批量上传不早于 13:40 UTC，可将 ready 分支合并在同一批；窗口前不重复推送。
- VMware、真实模型和安装测试共用一个互斥槽，同一时间最多运行其中一项。当前无互斥测试在运行，M7 本轮未运行真实安装、VM 或模型测试。
- 本会话工具清单未暴露原生 read_thread/wait_threads。M0 曾经用户许可从本机 thread_history 只读记录核对已引用任务，并用 codex queue 续作；该本机记录不冒称原生 read_thread。当前活动状态对照实际 GitHub ref/Issue/PR 和 owner worktree。
