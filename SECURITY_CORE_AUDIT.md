# Agent Canary 3.0 M1 安全核心审计

审计日期：2026-10-13  
分支：feature/ac3-security-core  
审计基线：feature/agent-canary-3.0，提交 62496d4020bd90ba2eede49b2e80a2bbebb036b4

## 范围与边界

本次审计覆盖 src/runtime/gateway.ts、src/agent-hook.ts、security-lab/claude-native-hook.mjs、受控工具测试及 3.0 安全边界文档。全程使用临时隔离目录、合成文件内容、合成凭据标记和仅绑定 127.0.0.1 的本地网络 sink。

本次审计 checkout 中没有 MODULE_OWNERSHIP.md 或 API_CONTRACTS.md；检视到的 3.0 基线文档也未给出 M0–M8 的文件归属和可依赖接口清单。用户提供的 M0 任务引用要求读取对应 Codex thread，但当前可用工具没有 read_thread，因此没有将该 thread 内容作为事实依据。跨模块接口待 M0 协调事项见文末。

Gateway 是宿主创建的受控调用面。它只处理 agent.dispatch 进入的已登记文件能力、固定 executable/argv 命令、受允许的 HTTPS origin 和宿主注册 MCP callback。run_command 使用 shell:false 和固定参数，不执行模型提供的任意 Shell 字符串。不能据此声称保护桌面 Agent 的原生 Shell、直接文件/网络 API、未接入的 MCP 客户端或所有操作系统调用。

## 调用链与策略顺序

1. 请求被规范化、限制大小并计算 HMAC 摘要；拒绝证据只记录工具 ID、摘要和固定策略字段，不记录参数正文。
2. dispatch 在排队前调用 Guard.inspect 和 beforeToolCall。MCP 包装请求会先解析内层工具名，使 canary decoy 命中 Guard；命中隔离时立即拒绝并中止此 Guard 会话中已跟踪的 Gateway 请求。
3. 入队后再次检查 Gateway 是否关闭、调用者是否取消及 Guard 状态，再执行宿主 capability policy。未知工具/参数、未绑定文件、凭据文件、未登记命令、越权网络 origin、已观察敏感数据后的网络 egress、高风险 MCP 都在 callback 前拒绝。
4. 仅 REQUIRE_APPROVAL 可以进入可选 AI 预审；AI 只能收紧，不能批准。取消和超时与 provider Promise 竞速，审批等待有界并且尚未调用工具。
5. 宿主 operator 对审批 ID 消费一次。执行时重新计算 policy 并检查 Guard；容量不足时不进入 callback。
6. 执行记录写入后，工具开始前再检查关闭/取消/Guard。文件操作还会重验已打开句柄对应的路径、inode、链接数和 realpath。受控 callback 收到 Gateway 的 AbortSignal。

DENY 和审批等待均在受控 callback、文件写入、固定进程启动或网络请求前结束。回归测试用文件哈希和 loopback sink 计数确认了对应夹具中的拒绝没有副作用。

## 已证实缺陷与修复

| ID | 缺陷 | 修复与回归证据 |
| --- | --- | --- |
| SEC-01 | Claude native Hook wrapper 将原始 tool_input、工具名和带回显内容的 decision 写入 JSONL。用合成标记 NOT_A_REAL_CREDENTIAL_HOOK_LOG_FIXTURE 复现了日志泄露。 | 日志只保留时间、固定 PreToolUse 事件名和 allow/deny/ask 枚举；新增回归确认合成标记不落盘。 |
| SEC-02 | Gateway 将外层 mcp_tool 交给 Guard，内层 canary 工具可能被当成普通已登记 callback；Guard 隔离被串行队列延后时，已运行 callback 也不会及时取消。 | Guard 现在检查解析后的内层工具名，隔离检查在入队前同步完成，并中止同一 Guard 会话内跟踪的活动 Gateway 请求。回归让慢 callback 活跃时触发 canary，确认 callback 未完成副作用、decoy callback 未运行、后续调用被拒绝。 |
| SEC-03 | close 只阻止新请求；已排队请求可能在 close 后继续进入受控执行器。 | close 幂等、清除审批并中止本 Gateway 活动请求；队列执行时复查 closed。回归确认活动请求被取消、已排队文件不变。 |
| SEC-04 | 请求取消只通知 AbortSignal；AI provider 或 callback 若忽略信号，dispatch 可能一直等到完成或超时。 | review 与 execution 都和 abort 事件竞速，取消会及时结束 dispatch。回归覆盖不合作的挂起 provider 和运行中的 callback。 |

重复审批为既有的 consume-once 实现：审批 ID 在执行前从 pending 删除；原有并发/重复审批回归确认 callback 最多执行一次。本次未确认重复执行漏洞，因此没有放宽策略或改动审批模型。

## Fail-closed 的实际适用路径

| 路径 | 可以确认的 fail-closed 范围 |
| --- | --- |
| createTrustedExecutionGateway().agent.dispatch | 仅限实际经该方法进入的已登记宿主能力。无效/越权请求、Guard 隔离、审批未通过、关闭、调用取消和证据容量不足都不会开始新的 Gateway callback。需要宿主把传输断开映射到 AbortSignal，并调用 close。 |
| security-lab/claude-native-hook.mjs 被 Claude PreToolUse 实际启动 | wrapper 运行后，输入/模块加载/回调/返回结构/证据日志失败与 wrapper 内部 2 秒超时都输出 deny。Hook 返回是否阻止工具，还依赖 Claude 版本、匹配器和 onFailure:block 等宿主配置。 |
| decideAgentHook 的 Claude/Cursor 决策函数 | 测试验证返回的协议形状和策略判断；这不证明任何桌面宿主已加载或执行该 Hook。 |

未启动 wrapper、Hook 被禁用、使用 --bare、宿主未匹配该工具、Node/Hook 进程在输出决定前被系统杀死，均不是 wrapper 内部可兜底的情况。对 Claude 的这些情形，必须由实际宿主配置 onFailure:block；本次没有做真实 Claude 宿主端到端故障注入。Cursor 只验证了决策函数，不宣称其宿主路径已 fail-closed。

## 竞态、取消、重启与 TOCTOU

- Gateway 对共享 Guard 会话串行排队并限制队列长度；每个执行阶段重查 Guard 和 policy。close 和调用者 AbortSignal 会取消合作执行器并阻止尚未启动的排队请求。
- 同进程、以同一 Guard 对象重建 Gateway 时，敏感输出与数据流历史保存在 Guard 键控的会话状态中；回归确认新 Gateway 不会重置已观察的敏感输出状态。新进程/新 Guard 的持久化恢复未验证，不能宣称跨进程重启状态自动保留。
- Promise 取消不能撤销 callback 已完成的外部动作，也不能强制终止忽略 AbortSignal 的不合作 callback。现有反例测试确认不合作 callback 可能迟到地产生副作用；应用层 Gateway 不是 OS 沙箱。
- 文件 capability 绑定打开句柄，执行前复查路径与 inode，并对写入回读验证。这能阻止已观察到的替换，但不是 OS 级原子事务，不能证明所有并发文件系统变化均无 TOCTOU。
- 被审计的 Gateway 是宿主内 dispatch 能力，没有独立 MCP socket/session transport。传输断线后的取消只有在宿主将其映射到 AbortSignal/close 时成立；本次没有验证任意 MCP server 传输栈的自动重连或断线语义。

## 安全日志

Hook 回归曾用纯合成凭据标记证实原 JSONL 会写入完整参数。修复后 wrapper 只写固定决策元数据；错误 detail 和参数不会进入该 Hook 日志。Gateway 证据使用 HMAC 请求摘要而非参数正文，回归覆盖敏感输出后的网络拒绝。日志写入失败会 deny。管理员/同机进程可读取日志的系统访问控制不属于本次验证范围。

## 仍需 M0 协调的接口问题

AgentGuard 暴露 state、beforeToolCall 和 trip，但没有隔离状态转换订阅或统一取消信号。Gateway 可在自己的 dispatch 发现 canary 时主动中止本进程内已跟踪请求；若 Hook/其他路由通过共享 Guard 触发 trip，已运行 Gateway callback 没有同步通知接口。已准备要求 M0 补齐 MODULE_OWNERSHIP.md、API_CONTRACTS.md 并定义隔离通知/取消契约的 Issue；GitHub Connector 创建请求返回 403，gh 不可用，Chrome 扩展当前未连接，因此尚无已创建 Issue 的编号或链接。
