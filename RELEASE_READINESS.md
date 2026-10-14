# Agent Canary 3.0 发布准备情况（M7）

日期：2026-10-13
整体状态：**HOLD — 不建议将当前 Windows 候选标为已通过安装与稳定性验收。**

## 已完成

- 按 M0 的隔离约定在 `feature/ac3-reliability` 工作；M7 增补可靠性、包装器持久化、Windows 安装器模板、CI、基准/Soak 工具和报告；未改变既有 CLI/MCP/SDK 接口。
- 持久化写入的原子发布、损坏 session 恢复、陈旧 Auto E4 锁回收、安装包输入摘要固定和精确回滚有回归覆盖。Gateway close/quarantine 生命周期已交由 M1 所有者；当前 M7 候选仍未集成 M1 当前 close 实现，不把并发/重入关闭标记为已修复。
- Windows 包装器 CI 扩展到依赖安装、TypeScript 构建、可靠性/包装器测试、依赖审计、包检查及 NSIS 3.13 模板编译。NSIS 编译使用一次性合成载荷；CI 不运行编译出的 EXE。该工作流需在 Draft PR 创建后读取真实运行结果。
- 上一轮基线：`npm run verify` 334 项、329 通过、0 失败、5 跳过；包检查 90 个文件；`npm audit --audit-level=high` 报告 0 vulnerabilities。本轮没有重跑全量 `verify` 或依赖审计。
- 本轮本机定向结果（Node `v22.23.1`）：`npm run test:reliability` 46 项、43 通过、0 失败、3 跳过；Gateway/containment 定向测试 40 项、40 通过、0 失败、0 跳过。它们未覆盖 M1 handoff 要求的 close Promise 身份/回入、同步 pending 清理、quarantine 退订和逐资源脱敏关闭错误，不证明 Issue #28 已解决。
- Gateway 3 轮合成微基准：每轮 1,000 次调用、并发 16；吞吐中位数 1,685.626 ops/s，延迟中位数 p50/p95/p99 为 4.924/9.020/10.353 ms，0 错误。完整数据见 [`PERFORMANCE_BENCHMARK.md`](PERFORMANCE_BENCHMARK.md)。

## 发布阻断项

1. **真实安装包生命周期没有验收。** 当前 M7 未生成并运行真实 NSIS 安装包；普通用户安装、首次启动、中文/空格自定义路径、EFS、重复安装、卸载和重装均没有本轮真实 EXE 证据。
2. **升级语义不完整。** 不同 candidate 采用并行安装目录；同候选重复安装会拒绝。没有原位升级/旧版本数据迁移路径及回归验证。发布产品若只支持并行候选，需明确写入升级流程并验证。
3. **失败回滚仅有源码/模板证据。** 尚未在真实 NSIS 安装中注入复制失败、收据失败、注册失败或用户取消，并检查磁盘、快捷方式和 HKCU 残留。
4. **长时可靠性证据缺失。** 24 小时与 7 天 Soak 均为 `NOT RUN`。本机 10.813 秒是工具冒烟，不是长稳结果。
5. **共享 Windows VM 当前状态未验证。** 本轮仅恢复本地开发槽，没有申请或占用 VMware/安装资源；不修改系统安全设置，也不在真实用户目录进行破坏性安装测试。
6. **发行身份与信誉未解决。** 目前候选为 unsigned；SmartScreen 下载体验、签名验证与发布者身份尚未验证。
7. **Gateway close/quarantine 契约未集成。** PR #39 当前源码状态为 OPEN；M7 候选的 `src/runtime/gateway.ts` 尚未集成 M1 close/quarantine 实现。Issue #28 保持 OPEN，必须按 M1 handoff 接入其生命周期顺序与回归测试，并通过 M7+M1 combined CI 后再评估。

## 依赖和构建完整性

- `npm audit --audit-level=high`：0 vulnerabilities（本机所用 lockfile 与 `npm ci` 安装依赖）。
- 社区 ZIP 现在必须由构建调用者显式给出并匹配 SHA-256；构建记录来源 ZIP 摘要、Node 版本/摘要、运行时清单、安装器摘要。
- 工具链 provenance 固定 NSIS 3.13 与 Node `v22.23.1` 的 SHA-256。Windows CI 对 NSIS 安装程序摘要校验后，在临时目录安装编译器并编译合成载荷模板。
- CI 合成模板编译、源码打包检查或 `npm run verify` 任何一个都不能代表实际发行包通过安装验收。

## 下一步转为 READY 的证据

- Draft PR 的 Windows CI 全绿，包括真实 NSIS 3.13 模板编译；记录运行链接和提交 SHA。
- 先整合 M1 owner 的 Gateway close/quarantine 代码与回归测试，再对 M7+M1 候选运行组合验证；M1 单独 CI 或 M7 当前定向测试不能替代该证据。
- M0 协调的可丢弃 VM 中，针对与发布相同的源码/ZIP/NSIS 构建实际 EXE；进行普通用户首次安装、路径与 EFS、崩溃/失败回滚、重复安装、所定义的升级策略、卸载和重装；保存安装前后差分和哈希。
- 同一隔离环境完成 24 小时测试；若基础设施允许，再完成独立 7 天测试。报告运行时长、环境、参数、错误与内存趋势，不以短测替代。
- 由发布责任方决定并验证签名/下载信誉要求。未满足这些项目之前保持 `HOLD`。

## M7 本轮续作记录

- 修复 NSIS 回滚/卸载时当前工作目录仍指向 `$INSTDIR` 的清理缺陷；卸载清理错误会提前停止后续卸载登记删除，便于释放占用后重试。
- 新增故障注入与模板负例回归。定向测试通过不代表 NSIS 编译或真实 EXE 生命周期通过；本轮没有运行安装包、VMware、真实模型、24 小时或 7 天测试。
