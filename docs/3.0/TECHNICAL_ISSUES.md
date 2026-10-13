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
- [#32 Windows Hook interruption 测试回归](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/32)（P1，OPEN）：旧 PR #38 run `38397135538` 的 marker 断言失败仍未解释。新证据：PR #39 head `65ce028`、run `38415887207`、Windows Node22 job `115360080156` 在 M1-owned 测试 `native lab wrapper interruption emits no allow decision and invokes no tool callback` 失败，Expected true / actual false；Ubuntu Node20/22与macOS Node22通过，Windows Node20/macOS Node20被取消。M1 正检查该 job 的精确源码并做最多3次定向复现；保留 marker、无 allow、无 callback 断言。
- [#35 Abort active Gateway executions on Guard quarantine](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/35)（P0，OPEN）：M1 owner 报告 Windows Node 22 聚焦 34/34 通过，证明同进程 quarantine 时先 abort、dispatch 被拒且没有合成副作用；跨进程/shared-store 边界仍未验证。14:20 单次 push 约51秒后 exit1且无输出，PR #43 远端仍 d0fd595；未重试。保持 P0，等待当前 PR 头 CI 与充分端到端验收。
- [#41 M7 cross-platform reliability CI failures](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41)（P1，OPEN）：PR #39 head `65ce028` 的新 run `38415886978` 中，Ubuntu wrapper通过、Windows wrapper因 `NSIS_COMPILER_MISSING` 失败；run `38415887207` 中 Ubuntu Node20/22与macOS Node22通过，Windows Node22失败属于M1-owned Hook测试（#32），Windows Node20/macOS Node20被取消，Docker/sponsor通过、package-smoke跳过。M7 负责 Windows runner 提供实际 NSIS 编译器，不能跳过检查；M1-owned测试缺陷由 #32 跟进。owner 本地套件40通过/0失败/3权限跳过，diff-check通过；不宣称新 CI 全绿。
- [#44 gateway approval-expiry CI failure](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/44)（P1，OPEN）：PR #30 head f2f2d10 / run 38412534723 在 Ubuntu Node20 的“approval expires with no actual callback”失败，`requestId` undefined（321 pass/1 fail/4 skip）；fail-fast 取消其余矩阵任务，不能算成独立失败。M1 正在精确源版本上复现并判断是行为缺陷还是测试时序问题；不得弱化“过期审批不调用真实 callback、不产生 allow”不变量。
- [#42 M3 package manifest/current-head validation](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/42)（P1，CLOSED/completed）：PR #33 当前 head c404b6b、run 38400488378 9/9（含 package-smoke）且含 owner-authored M3 API 契约；旧 cf42dde manifest 证据不适用于当前 AC3 PR。跨模块 manifest 组合继续跟踪于 #27。

## PR 与自动检查

- 模块 PR 以 `feature/agent-canary-3.0` 为 base，并保持 Draft，直到实现、测试证据、接口声明和 CI 状态齐全。
- PR 正文必须提供 `Test-Evidence:`（命令及报告路径/链接；不适用时说明原因），并显式填写 `API-Contract-Change: yes|no`。共享文件需填写 `Coordinated-with: Mx`。
- `.github/workflows/ci.yml` 已在 PR 自动运行构建、Node 20/22 × Ubuntu/Windows/macOS 测试、打包检查、Docker smoke 和 sponsor smoke。本 PR 新增的 AC3 工作流检查测试证据字段、候选公共接口改动是否同步契约、共享文件是否声明协作模块。
- GitHub CI 状态是测试结果来源；报告链接和运行条件仍须在 PR 中提供。check 状态不等于分支保护规则已强制要求通过；规则状态未核实。

## 运行资源

- 开发并行度上限为 2。2026-10-13 14:47 UTC，M1 处理 #32、M7 处理 #41，共占2/2槽；M5单次上传失败后已结束，M6精确旧Hook路径复现结束。推送至少间隔20分钟，由M0合批；最近成功批次14:42 UTC，下一批不早于15:03 UTC。没有VMware、真实模型或安装测试活动。
- VMware、真实模型和安装测试共用一个互斥槽，同一时间最多运行其中一项。当前无互斥测试在运行；本轮 M6 只做本地合成 Hook 测试，M7 未运行真实安装、VM 或模型测试。
- 本会话工具清单未暴露原生 read_thread/wait_threads。M0 曾经用户许可从本机 thread_history 只读记录核对已引用任务，并用 codex queue 续作；该本机记录不冒称原生 read_thread。当前活动状态对照实际 GitHub ref/Issue/PR 和 owner worktree。
