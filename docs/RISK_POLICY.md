# 可选工具风险策略 / Optional tool risk policy

这是宿主注册的执行边界，不是全局 Agent 防火墙。默认 BALANCED；原有 `createGuardedToolRouter()`、CLI 与 MCP stdio 接口保持兼容。只有改用 `createRiskPolicyRouter()` 的 callback 才经过新增策略。

M5 策略 `ALLOW` 只表示本层检查通过，不代表 Gateway 已登记该资源。若与 M1 TrustedExecutionGateway 组合，宿主 callback 仍须把调用交给 Gateway 的 `agent.dispatch`，由 Gateway 在最终执行前重新授权；不要用裸 callback 绕过该检查。本 M5 改动没有变更 Hook、Gateway 或 Guard 的接口。

```ts
import { createAgentGuard, createRiskPolicyRouter } from 'agent-canary/sdk';
const guard = createAgentGuard({ sessionId: 'host-session', alert: false });
const router = createRiskPolicyRouter({
  guard, workspaceRoot: process.cwd(), mode: 'BALANCED',
  tools: { read_file: { operation: 'file-read' }, run_shell: { operation: 'shell' } },
  executeRealTool: hostExecutor, // 实现真实路径、权限、进程和网络边界
});
await router.dispatch({ name: 'read_file', args: { path: 'README.md' } });
```

工具描述必须由可信宿主提供，不能来自模型参数。工具别名和参数都会参与判断。类型：READ_ONLY、WRITE、EXECUTE、NETWORK、SENSITIVE_DATA、DESTRUCTIVE。

| 模式 | 正常公开读取、审定只读命令 | 写入、构建、未审定网络 | 明显秘密外传、越界路径 | 已隔离 Guard |
|---|---|---|---|---|
| OBSERVE | 执行并记录 | 执行并记录 | 执行并记录 | 拒绝 |
| BALANCED | 执行 | 人工批准 | 拒绝 | 拒绝 |
| STRICT | 执行 | 拒绝 | 拒绝 | 拒绝 |

OBSERVE 会允许危险虚拟操作；不要把模式名称理解为安全保证。BALANCED 的构建、写入审批会中断无人值守工作流。STRICT 有明确兼容性影响。

## 决策语义

- `ALLOW`：宿主已注册能力，确定性规则判定可继续；它只代表进入宿主回调，不代表操作成功。
- `DENY`：确定性边界拒绝，执行回调不会启动。
- `UNKNOWN`：无法将调用映射到可信宿主注册能力。为保持现有 API 兼容，返回 `action: 'DENY'`、`reason: 'unregistered_tool'`；所有模式都 fail closed，不进入审批队列。先由宿主注册并审查能力，再允许调用。
- `APPROVAL_REQUIRED`：能力和风险类别已知，但需宿主认证的人工确认。请求本身不启动回调；批准仅对不可变请求生效一次，并有时限。模型输出、调用参数和身份字符串本身都不能认证审批人。

`policy_allowed` 是策略判定事件，不是回调成功凭证。要确认实际结果，必须另看执行结果和宿主侧副作用证据。日志写入成功也不证明某个回调已被阻断。

## 项目级加固策略

`agent-canary/policy` 导出 `createManagedRiskPolicyRouter()`。它把项目级拒绝规则放在确定性策略和宿主/模型复核之前。项目规则仅支持精确工具名及可选风险类别上的 `DENY`；不能写 `ALLOW` 或削弱全局默认规则。规则以项目根路径的哈希作为作用域，存储在用户 Agent Canary 数据目录，不放入可由 Agent 修改的项目目录。

```ts
import { createManagedRiskPolicyRouter } from 'agent-canary/policy';
const router = createManagedRiskPolicyRouter({
  guard, workspaceRoot: process.cwd(), mode: 'BALANCED', tools,
  executeRealTool: hostExecutor,
});
const preview = router.policyManager.preview([
  { id: 'deny_remote_release', tool: 'publish_release', risk: 'NETWORK', effect: 'DENY', reasonCode: 'release_requires_owner' },
]);
if (preview.conflicts.length === 0) router.policyManager.apply(preview.rules, 'authenticated-operator');
```

预览列出新增、移除、变更和选择器冲突。移除拒绝规则、替换工具选择器或缩窄风险范围属于项目策略放宽，`apply` 必须显式传入 `acknowledgeWeakening: true`；扩大拒绝范围可直接应用。`rollback(version, operator, true)` 会新增一个更高版本来恢复历史规则，不重写旧记录。传入的操作者字符串由宿主认证流程提供，SDK 本身不验证身份。

托管 Router 在真实 callback 开始前用同一存储锁再次检查当前项目策略，并在 callback 完成/失败后记录结果再释放锁。执行期间的策略更改会因存储忙而失败并保持旧策略，宿主可在执行结束后重试；不要把更新失败误报为已应用。

管理器的 `reviewDecision` 可与 `createRiskPolicyRouter()` 配合，也由 `createManagedRiskPolicyRouter()` 自动接线。该托管路由可记录 `SDK`、`NATIVE_HOOK`、`GATEWAY`、`HOST` 来源，但 Hook/Gateway 适配器需由宿主显式调用 `policyManager.recordDecision()`；当前 M1 Hook 和 Gateway 的既有日志协议尚未自动迁移到此 M5 格式。

表格按 Guard 默认空 `allowAfterQuarantine` 配置。若可信宿主明确配置隔离后的例外工具，沿用原 Guard 的例外决策；新增策略仍检查其风险，AI 无权添加例外。宿主 callback 应有自身超时/取消边界：挂起操作会阻塞同 Guard 的后续串行调用，但不会阻止诱饵立即隔离。

## 审批权限

`pendingApprovals()` 给出请求 ID、工具、风险和期限。`approve(id, operatorIdentity)` **只能由宿主的已认证人工审批流程调用**；identity 字符串本身不是认证，SDK 不代替宿主身份系统。禁止将 approve 暴露为 Agent/MCP 工具。

审批绑定原始不可变 JSON 调用，一次性使用，默认 60 秒过期，最多 100 个待批请求。执行前重新检查 Guard 与敏感数据标记。模型参数中的 approval、approvedBy、请求 ID 均不能授予权限。

中文控制台的 `/api/policy/*` 仅运行虚拟沙箱。人工批准额外要求后端启动时提供 `AGENT_CANARY_OPERATOR_CODE`；未设置则拒绝批准。前端密码输入使用后清空，不存 localStorage。不要让 Agent 读取该环境或浏览器操作能力；控制台不是 OS 用户隔离系统。

## 时序、安全边界

1. 同一 Guard 对象的多个策略 Router 共享有界串行队列，避免敏感读取与外传竞争。
2. 诱饵不等待队列，立即产生 Guard 隔离信号。已经开始的 callback 无法撤回。
3. 敏感操作开始前标记会话；即使 callback 抛错也保留。相同 Guard 更换模式不清除标记。不同 Guard 对象之间不共享该标记；宿主必须将会话绑定稳定主体，并用权限/持久策略覆盖重新建会话。原有 shared-state quarantine 独立保持。
4. 策略依据路径、请求参数和已知信号，**不完整解析 Shell、不解析 symlink/realpath、不执行 DNS/网络沙箱**。宿主需固定工作目录、执行程序与网络目的地址；`static-read` 必须确实无副作用。
5. 最终 Guard 在 callback 前检查；Token 参数和返回结果精确检查保留。返回结果中首次出现的 Token 不能撤回该次已执行 callback。
6. AI 分析在第四轮 D2 中发生于决策之后；超时/断线不导致放行或改变隔离。模型建议既不批准也不 Reset。
7. 策略审计失败时不执行 callback；日志不记录原始 args。未注册工具视为 UNKNOWN 并直接拒绝，不能通过一次性审批绕过宿主能力注册。

## 复现

`npm ci && npm run build && npm test`；`npm run ai:console`；`node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent --round4`。危险文件、Shell、HTTP、删除和凭据都是虚拟执行器。模型自主工具选择和确定性控制台演示分开记录。

## English summary

The optional router enforces host-owned tool descriptors and parameter/context checks before registered callbacks. OBSERVE logs while allowing optional policy risks; BALANCED requires authenticated human approval for writes/unreviewed commands; STRICT denies them. All modes retain Guard quarantine. Approval is immutable, expiring and one-shot; host authentication is mandatory. AI advice never grants rights. Same-Guard routers serialize operations and retain sensitive-data taint across mode changes; a new Guard object does not inherit policy taint. Host executors remain responsible for real paths, symlinks, executable resolution, network controls, identity and every call outside this router.
