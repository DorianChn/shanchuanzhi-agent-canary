# 可选工具风险策略 / Optional tool risk policy

这是宿主注册的执行边界，不是全局 Agent 防火墙。默认 BALANCED；原有 `createGuardedToolRouter()`、CLI 与 MCP stdio 接口保持兼容。只有改用 `createRiskPolicyRouter()` 的 callback 才经过新增策略。

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
7. 审计失败时不执行 callback；日志不记录原始 args。未知工具仍需可信宿主评审，不能随意批准未经注册的能力。

## 复现

`npm ci && npm run build && npm test`；`npm run ai:console`；`node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent --round4`。危险文件、Shell、HTTP、删除和凭据都是虚拟执行器。模型自主工具选择和确定性控制台演示分开记录。

## English summary

The optional router enforces host-owned tool descriptors and parameter/context checks before registered callbacks. OBSERVE logs while allowing optional policy risks; BALANCED requires authenticated human approval for writes/unreviewed commands; STRICT denies them. All modes retain Guard quarantine. Approval is immutable, expiring and one-shot; host authentication is mandatory. AI advice never grants rights. Same-Guard routers serialize operations and retain sensitive-data taint across mode changes; a new Guard object does not inherit policy taint. Host executors remain responsible for real paths, symlinks, executable resolution, network controls, identity and every call outside this router.
