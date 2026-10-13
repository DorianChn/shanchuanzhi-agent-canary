# Agent Canary 3.0 M1 安全核心审计

审计日期：2026-10-13
分支：feature/ac3-security-core
审计基线：feature/agent-canary-3.0，提交 62496d4020bd90ba2eede49b2e80a2bbebb036b4

## 范围与边界

本次审计覆盖 src/runtime/gateway.ts、src/agent-hook.ts、security-lab/claude-native-hook.mjs、受控工具测试及 3.0 安全边界文档。全程使用临时隔离目录、合成文件内容、合成凭据标记和仅绑定 127.0.0.1 的本地网络 sink。

M1 checkout 不包含协调文档；续作时已从 `C:\Users\36712\Desktop\Agent-Canary-Dev\coordinator\docs\3.0\` 核对 `API_CONTRACTS.md`、`MODULE_OWNERSHIP.md` 和 `MODULE_DEPENDENCIES.md`。文档以 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 为基线，将 Gateway 契约 owner 暂定为 M1，并将 `src/runtime/gateway.ts` 标记为 M1/M7 共享路径（Issue #28）。当前可用工具没有 `read_thread`，因此没有把引用对话内容当作事实依据；以下结论基于工作树、协调文档、CI 与本地测试证据。

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

## 续作补充：Hook interruption、M7 Gateway 协调与 Guard 通知

- Issue #32 的失败 run `38374902576` 中，`spawnSync` 的 `ETIMEDOUT` 断言通过，但紧随其后的 Hook-entry marker 断言为 false。旧测试的一秒预算同时覆盖 Windows 子进程启动与模块导入，失败日志没有保留 stdout/stderr 或进程状态，因此只能确认 Hook 入口 marker 未出现，不能确认是 wrapper 产品缺陷还是启动/测试时序问题。根因记录为 `UNKNOWN / BLOCKED`，等待修订测试的新 Windows Node 20 CI 结果。
- 回归测试已改为异步启动合成 wrapper，先等 Hook 入口 marker，再主动终止进程；同时检查启动错误、退出状态、stdout/stderr 和决策日志。Windows Node `v20.20.2` 本地定向测试连续通过 15 次；详见 `SECURITY_REGRESSION_RESULTS.md`。这只验证 wrapper 子进程中断时没有输出 allow，不等于真实 Claude 宿主端到端验证。
- M7 分支 `feature/ac3-reliability` 的提交 `9d316fe` 增加 memoized close Promise、等待队列、逐个尝试关闭所有资源，并在任何资源关闭失败时返回固定错误。M1 Gateway 同时有 M7 提交未包含的活动 controller 中止、审批先清除和安全调用检查。#28 集成必须合并两边行为，不能用 M7 的 Gateway 文件整体替换 M1 文件。
- 复现了另一项已确认的接口缺口：在一个合成 MCP callback 等待期间，从 Gateway 外部对共享 Guard 调用 `trip()`，Guard 变为 `QUARANTINED`，但活动 callback 的 signal 仍为未中止；释放 gate 后它可以写入隔离临时目录中的 marker。当前 API 契约没有 Guard quarantine 的同步订阅/取消通知。该项需要 M0 协调共享接口；在接口确定前不单方面改变公共 Guard API。尝试新建 M0 Issue 返回 GitHub API `403 Resource not accessible by integration`，浏览器备用通道亦未连接，Issue 尚未创建。

## 安全日志

Hook 回归曾用纯合成凭据标记证实原 JSONL 会写入完整参数。修复后 wrapper 只写固定决策元数据；错误 detail 和参数不会进入该 Hook 日志。Gateway 证据使用 HMAC 请求摘要而非参数正文，回归覆盖敏感输出后的网络拒绝。日志写入失败会 deny。管理员/同机进程可读取日志的系统访问控制不属于本次验证范围。

## 仍需 M0 协调的接口问题

协调文档现已存在并完成核对，但 `AgentGuard.trip()` 仍没有供 Gateway 订阅的同步隔离通知/取消契约。上文的合成复现确认外部路由触发 quarantine 后活动 callback 可继续。建议 M0 与 M1/Guard owner 定义通知时序、订阅生命周期、重复 trip、close/unsubscribe 和失败语义，并更新契约；新 Issue 标题草案为 `[P1] Define Guard quarantine notification for active Gateway executions`。Issue 创建及向 #28/#29/#32 评论的 API 写入均返回 403，浏览器扩展未连接，故该 Issue 尚未创建、现有 Issue 也未收到本轮评论。该问题处于 `CONFIRMED / BLOCKED on M0 interface coordination`；远端同步限制见 `SECURITY_REGRESSION_RESULTS.md`。
