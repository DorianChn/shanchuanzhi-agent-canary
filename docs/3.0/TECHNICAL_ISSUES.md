# M0 技术问题分级与协作流程

更新日期：2026-10-13。协调结论基于 GitHub 与文件系统实况；被引用的 Codex 会话当前不可读取，模块目标细节和会话运行状态标记为“无法确认”。

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

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- M0 调度开发并行度上限为 3。M0 通过本机 `codex queue` 恢复 M1/M2/M4（当前 3 个开发槽）；M3/M5/M6/M7/M8 只收到排队登记消息，未获准改文件。Codex Desktop Connector 未提供 `read_thread`/`wait_threads`，本次会话内容和状态读取自本机保存的 Codex session/thread-history 记录。当前没有 VMware、真实模型或安装测试资源申请。工作树状态以 Git 快照核验，不以会话状态替代。
- VMware、真实模型和安装测试占用同一互斥槽，同一时间只允许其中一项。开始前登记负责人、工作树、开始时间和结束/释放状态。
