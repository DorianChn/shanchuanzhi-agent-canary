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
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN；PR #30 的 Windows Node 20 与 PR #34/#36 的 Windows Node 22 均有失败证据）。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，OPEN）：历史 pre-fix 复现确认 quarantine 后仍有活动 callback 写入合成标记，P0 仍须由当前 PR 验收关闭。PR #43 run `38399797819` 的新失败经 M1 本地复现为测试预期不符：quarantine 中止 dispatch、读取内容未返回、文件标记未变且后续写入被拒；M1 已以 commit `dc4d7fa` 只修正测试断言，等待该精确 head 的远端 CI。不得把这次测试异常说成新产品漏洞，也不得以此关闭历史 P0。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：远端 PR #39 head `f17b7e6` 的 Ubuntu 模板检查和 macOS symlink 测试失败；owner 本地候选 `65ce028` 待上传并由相同 CI 验收。
- [#42 M3 package manifest/current-head validation](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)（P1，OPEN；正文待更正）：PR #33 当前 head `c404b6b` 的 run `38400488378` 为 9/9 成功。旧 `SOURCE_MANIFEST` 差异属于历史 head，不代表当前 AC3 缺陷；将在下一远端窗口更正文案并按验收结果结案。

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- 开发并行度上限按用户最新要求为 2。2026-10-13 12:56 UTC，M1（#35/#43 CI 复现）与 M7（#41 可靠性 CI）为 RUNNING（2/2）；M3、M5 当前为 IDLE。下一次批量上传不早于 13:12 UTC。
- VMware、真实模型和安装测试共用一个互斥槽，同一时间最多运行其中一项。当前无互斥测试在运行，M7 本轮未运行真实安装、VM 或模型测试。
- 本会话工具清单未暴露原生 `read_thread`/`wait_threads`。M0 经用户许可从本机 `thread_history` 只读记录核对已引用任务，并用 `codex queue` 续作；该本机记录不冒称原生 `read_thread`。开发状态同时对照 Windows Git worktree 和 GitHub Issue/PR。
