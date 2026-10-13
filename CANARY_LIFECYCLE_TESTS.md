# Canary 生命周期与状态恢复测试

本文件描述现有 Guard 保证与本分支新增的 M5 托管路由回归测试。所有执行器均为测试回调，没有执行真实破坏性工具。

## 生命周期

| 阶段 | 行为 | 覆盖测试 |
|---|---|---|
| 正常态 | `SAFE` 允许受 Guard 保护的普通工具调用。 | `test/containment.test.ts`：`SAFE session permits a normal tool call` |
| 触发 | 诱饵调用先触发同步隔离，再返回惰性诱饵响应；Token 检测也先隔离再写告警。 | `test/containment.test.ts`：`decoy invocation synchronously quarantines its own session`、`token detection trips before its token event is emitted` |
| 隔离 | 常规受保护 callback 在 Guard 前置检查处被阻断；M5 额外记录 `CANARY_GUARD` 来源和 `NOT_STARTED` 状态。 | `test/containment.test.ts`：`a blocked callback is never executed`；`test/policy-management.test.ts`：`managed router records Canary quarantine, blocks callbacks, and resumes only after host reset` |
| 并发 | 诱饵不等待已开始的普通 callback；隔离后尚未启动的 callback 拒绝。已经开始的外部副作用不能撤回。 | `test/containment.test.ts`：`no async race allows a post-decoy dangerous callback through`；`test/risk-policy.test.ts`：`a decoy quarantines immediately while another callback is in flight` |
| 告警/撤销故障 | 本地 Guard 先隔离。告警或凭据撤销失败不把 Guard 恢复为 `SAFE`。 | `test/containment.test.ts`：`alert delivery failure cannot re-open a quarantined session`、`credential revoker failures do not re-open the circuit` |
| 显式恢复 | 空操作者拒绝 Reset；宿主确认后写入 `session_reset` 并恢复本地状态。 | `test/containment.test.ts`：`a human acknowledgement is required before reset restores normal operation`；M5 集成测试确认 Reset 后普通路由恢复。 |
| 共享状态 | 身份作用域隔离可被新会话继承；共享 Store 出错时本地闭锁。 | `test/containment.test.ts`：共享 principal、新会话竞争及 shared-store 故障测试；`test/file-state-store.test.ts`：跨进程恢复和损坏/锁错误闭锁测试。 |

## 状态语义

1. Guard 的 `trip()` 在日志和告警 I/O 前同步关闭本地回路；运行时通常直接观察到 `QUARANTINED`，`TRIPPED` 是内部瞬态。
2. 隔离阻止未来经过 Guard 的 callback；已经开始或已完成的工具操作不可能靠 Reset、日志或后续隔离自动撤销。
3. 默认隔离后不允许任何工具。仅可信宿主显式配置的精确 `quarantineAllow` 可作为例外，且不改变策略 Router 自身的检查。
4. 进程内 Guard 重启后状态不会自动持久化。跨 Guard/进程继承隔离需宿主提供共享 `ContainmentStateStore` 或文件状态存储，并把 `principalId` 绑定到可信主体。共享存储恢复成 `SAFE` 不会自动解除已闭锁的本地 Guard。
5. `reset()` 是宿主控制面能力，不得暴露为模型工具。SDK 中的 `acknowledgedBy` 只是审计字段格式，真人身份验证和恢复审批由宿主完成。
6. Guard 事件写入是尽力而为；M5 结构化审计提供策略记录及防篡改校验，但不能把审计写入成功当成拦截成功证明。验证真实阻断还需检查 callback 是否启动，以及宿主侧副作用证据。

## 本分支验证

M5 新增的集成测试通过托管 Router 触发诱饵、断言 callback 未执行、确认后续读取被拒绝，再由宿主 Reset 并确认正常只读回调恢复。测试同时检查 M5 审计中的 `CANARY_GUARD` 事件与执行状态。

适用的原有测试还覆盖不同 Guard 会话隔离、共享身份作用域、文件存储重启、失效/过大的共享状态、告警失败和异步 callback 竞争。目标测试命令和最终通过数见 Draft PR；测试通过不代表真实宿主所有工具路径均被接入。
