# 技术亮点、应用价值与客观比较

## 项目定位

Agent Canary 为由宿主控制的 AI Agent 工具调用链提供**事件触发式隔离组件**。它不判断任意文本是否恶意，也不替宿主执行或代理所有工具：它提供无副作用的 MCP 诱饵、已登记随机 Token 检查，以及宿主可以放在真实回调前的 SDK Guard/Router。

## 可由代码和测试支持的技术点

1. **不执行所模拟操作的 MCP 诱饵。** `src/decoys.ts` 定义 12 个模拟工具；`src/server.ts` 用 MCP stdio 暴露它们。调用会创建本地 trace Token、尝试写审计事件，也可能触发已配置告警，但不执行所表示的转账、取密钥、文件、Shell 或网络操作。实际 MCP 客户端子进程测试列举工具并调用 `canary_run_shell`，检查没有真实 Shell 执行。独立 stdio 服务不会自动隔离其他 MCP server 的工具。
2. **检测与真实工具执行分层。** `createGuardedToolRouter()` 把 decoy 调用送入 Guard，把其他工具送到宿主提供的 callback。SAFE 时正常放行；信号同步触发隔离后，后续非 allowlist callback 被拒绝。隔离测试检查 callback 计数，而不只检查错误文本。
3. **隔离可跨 session 继承。** 宿主可为同一受审身份提供显式 `principalId` 与共享状态 Store；当前内存实现只覆盖一个可信进程。远程数据库/多进程的事务性和身份认证仍由宿主负责。
4. **金丝雀 Token 与本地扫描。** Token 用 Node crypto 随机字节生成。扫描包含 dotfile、按 64 KiB 块读取并处理跨块 Token；`.git`、`node_modules`、符号链接和超过 4 层的内容按定义排除/报扫描不完整。
5. **审计出口先脱敏。** 事件字段在进入 JSONL 或 Webhook 前统一净化；工具原始参数和完整 Token 不作为一般审计字段输出。Webhook/桌面告警是 best-effort，隔离不会等待它们成功。
6. **离线自检与复现路径。** `self-test` 在临时目录中验证安全调用、decoy quarantine、callback 拦截与事件顺序；它不读用户配置或真实 Token。

上述内容说明的是宿主在完成集成后可复现的机制，不是所有 Agent 或 MCP 客户端的自动保护。

## 性能测量

本分支新增 `npm run bench:scan`。在 Windows x64、Node v22.23.1、AMD Ryzen 9 9955HX 上，对临时合成二进制文件扫描尾部 Token，每种大小 3 次并取中位数：

| 合成文件大小 | 中位扫描时间 | 推算顺序吞吐 |
|---:|---:|---:|
| 1 MiB | 1.43 ms | 697.84 MiB/s |
| 10 MiB | 12.78 ms | 782.42 MiB/s |
| 50 MiB | 59.50 ms | 840.37 MiB/s |

复现：先 `npm run build`，再 `npm run bench:scan`。这些数据来自本机临时文件和 OS 文件缓存，未控制磁盘、温度、背景负载或冷缓存；不能代表生产并发、网络延迟、模型响应时间或全盘扫描表现。

## 与相邻开源工具的定位比较

以下比较依据 2026-10-10 可查阅的官方仓库/文档定位；本次只审计 Agent Canary 代码，**没有安装运行 Promptfoo 或 PyRIT，也不比较未实测性能、覆盖率或质量排名**。

| 工具 | 官方公开定位 | 与 Agent Canary 的区别/互补关系 |
|---|---|---|
| Agent Canary（本项目） | 以 decoy/Token 作为信号，再通过集成 Guard 隔离之后的受守卫 callback。真实拦截范围由宿主的路由覆盖率决定。 | 偏运行时、事件触发、工具回调边界；没有证明能检测所有注入或未触发诱饵的攻击。 |
| [Promptfoo](https://github.com/promptfoo/promptfoo) | 官方将其定位为 LLM 应用评测与 red-team CLI/library；其 red-team 文档描述生成对抗输入并在目标上运行评测。 | 偏攻击测试和目标应用评估；可用于寻找 Agent Canary 接入目标的脆弱路径。它的测试结果不能代替运行时 callback enforcement。 |
| [Microsoft PyRIT](https://github.com/microsoft/PyRIT) | 官方将其定位为生成式 AI 风险识别开源框架；其架构包含 seeds、scenarios、attack techniques、executors/targets 与 scorers。 | 偏可编排的红队与风险识别工作流；与本项目的同步工具回调隔离属不同层，可互补。 |

官方参考：[Promptfoo repository](https://github.com/promptfoo/promptfoo)、[Promptfoo red-team quickstart](https://github.com/promptfoo/promptfoo/blob/main/site/docs/red-team/quickstart.md)、[PyRIT repository](https://github.com/microsoft/PyRIT)、[PyRIT architecture](https://github.com/microsoft/PyRIT/blob/main/doc/code/framework.md)。

## 对参赛演示的价值

- 演示者可展示一条可观察链路：调用 synthetic decoy → 同步记录 quarantine → 安全工具仍按策略处理 → 危险 callback 计数保持为 0 → JSONL 事件可复查。
- 通过 SIM-12/13/14 展示边界：不先触发信号的首次真实工具调用可以放行；不经过 Router 的调用不能被发现；已启动外部操作不能由 Agent Canary 撤销。
- 可以离线运行 MCP 进程、CLI 自检和合成模拟；无需在大赛演示时提供真实 API key、真实支付或真实危险工具。
- 当前没有可声称的用户案例、真实模型分数、生产拦截率或模型误报率；演示应称“可复现的机制验证”。
