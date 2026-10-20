# Agent Canary 3.0 M1 安全核心审计

审计日期：2026-10-13
分支：feature/ac3-security-core
审计基线：feature/agent-canary-3.0，提交 62496d4020bd90ba2eede49b2e80a2bbebb036b4

## 范围与边界

本次审计覆盖 src/runtime/gateway.ts、src/agent-hook.ts、security-lab/claude-native-hook.mjs、受控工具测试及 3.0 安全边界文档。全程使用临时隔离目录、合成文件内容、合成凭据标记和仅绑定 127.0.0.1 的本地网络 sink。

M1 checkout 不包含协调文档；续作时已从协调 worktree 核对 `API_CONTRACTS.md`、`MODULE_OWNERSHIP.md` 和 `MODULE_DEPENDENCIES.md`。文档以 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 为基线，将 Gateway 契约 owner 暂定为 M1，并将 `src/runtime/gateway.ts` 标记为 M1/M7 共享路径（Issue #28）。当前可用工具没有 `read_thread`，因此没有把引用对话内容当作事实依据；以下结论基于工作树、协调文档、CI 与本地测试证据。

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

## 续作补充：Hook interruption、M7 Gateway 协调与 Guard 通知（P0 #35 修复前状态记录）

- Issue #32 的失败 run `38374902576` 中，`spawnSync` 的 `ETIMEDOUT` 断言通过，但紧随其后的 Hook-entry marker 断言为 false。旧测试的一秒预算同时覆盖 Windows 子进程启动与模块导入，失败日志没有保留 stdout/stderr 或进程状态，因此只能确认 Hook 入口 marker 未出现，不能确认是 wrapper 产品缺陷还是启动/测试时序问题。根因记录为 `UNKNOWN / BLOCKED`，等待修订测试的新 Windows Node 20 CI 结果。
- 回归测试已改为异步启动合成 wrapper，先等 Hook 入口 marker，再主动终止进程；同时检查启动错误、退出状态、stdout/stderr 和决策日志。Windows Node `v20.20.2` 本地定向测试连续通过 15 次；详见 `SECURITY_REGRESSION_RESULTS.md`。这只验证 wrapper 子进程中断时没有输出 allow，不等于真实 Claude 宿主端到端验证。
- M7 分支 `feature/ac3-reliability` 的提交 `9d316fe` 增加 memoized close Promise、等待队列、逐个尝试关闭所有资源，并在任何资源关闭失败时返回固定错误。M1 Gateway 同时有 M7 提交未包含的活动 controller 中止、审批先清除和安全调用检查。#28 集成必须合并两边行为，不能用 M7 的 Gateway 文件整体替换 M1 文件。
- 复现了另一项已确认的接口缺口：在一个合成 MCP callback 等待期间，从 Gateway 外部对共享 Guard 调用 `trip()`，Guard 变为 `QUARANTINED`，但活动 callback 的 signal 仍为未中止；释放 gate 后它可以写入隔离临时目录中的 marker。当前 API 契约没有 Guard quarantine 的同步订阅/取消通知。该项需要 M0 协调共享接口；在接口确定前不单方面改变公共 Guard API。尝试新建 M0 Issue 返回 GitHub API `403 Resource not accessible by integration`，浏览器备用通道亦未连接，Issue 尚未创建。

## 安全日志

Hook 回归曾用纯合成凭据标记证实原 JSONL 会写入完整参数。修复后 wrapper 只写固定决策元数据；错误 detail 和参数不会进入该 Hook 日志。Gateway 证据使用 HMAC 请求摘要而非参数正文，回归覆盖敏感输出后的网络拒绝。日志写入失败会 deny。管理员/同机进程可读取日志的系统访问控制不属于本次验证范围。

## M0 契约同步：P0 #35 本地修复

本节更新 supersede 上一节在修复前记录的 Guard 通知状态。Issue #35 的最小复现是在 Gateway callback 等待 gate 时，从 Gateway 外部对同一 `AgentGuard` 对象调用 `trip()`；状态已 quarantine，但活动 signal 没有 abort，gate 释放后 callback 可以产生合成 marker。

M1 现在提供 `AgentGuard.subscribeQuarantine(listener: () => void): () => void`：

- 每次本地状态进入 `QUARANTINED` 时同步通知，发生在持久化、审计日志、凭据撤销和告警之前；通知不带参数或敏感上下文。
- 已隔离时订阅会同步收到一次通知；同一隔离状态的重复 `trip()` 不重复通知。host reset 后的下一次隔离是新 transition，会再次通知。
- listener 异常被隔离，不会撤销隔离或阻止其他 listener；返回的 disposer 可重复调用。
- Gateway 在返回 host runtime 前注册订阅；通知会同步 abort 此 Guard 跟踪的活动 Gateway 请求。订阅注册失败时 Gateway 创建失败并关闭已打开的 capability 文件句柄。`close()` 会先 abort 本 Gateway 活动请求，再退订，然后等待队列并关闭资源。

该同步保证的范围是同一进程中的同一个 `AgentGuard` 实例。另一个 Guard 实例只通过共享 `ContainmentStateStore` 改变状态，或另一进程直接修改持久化标记，不会主动触发此实例的同步 listener；本地 state 读取能在观察到隔离后 latch，但不能替代跨实例/跨进程事件通道。M0 更新 `API_CONTRACTS.md` 时应明确这个边界及订阅生命周期；若要覆盖跨进程变化，需要单独定义 IPC/状态存储通知契约。此修复不表示保护桌面 Agent 的原生 Shell、未接入 MCP 或直接文件/网络 API。

本地实现与合成回归通过；远端 Issue/PR 状态本轮没有查询或更新。完整命令、结果和未覆盖边界见 `SECURITY_REGRESSION_RESULTS.md`。

### P0 #35 增补：共享 Guard 下的 Gateway 队列

实现路径包括已提交的 M1 产品修复 `ec3bc96` 和本轮最小修复：`src/containment.ts` 在 `latchQuarantine()` 中先设置本地 `QUARANTINED`，再同步通知订阅者；`src/runtime/gateway.ts` 创建 Gateway 时订阅该通知，`quarantineSession()` 推进共享失效 epoch、清空本 Gateway 的 pending approval，再由 `abortSession()` 遍历同一 Guard 实例的共享 controller 集合。`dispatch()` 记录准入 epoch，并在排队执行和异步 AI review 返回后复核；旧 epoch 请求即使在宿主 reset 后恢复调度，也会以 `guard_quarantined` 拒绝。由同一 Guard 创建的 Gateway 还共享 `history.tail`，所以排队 callback 不会启动。

本轮在 `test/gateway.test.ts` 保留单 Gateway gate/marker 回归，并新增共享 Guard 双 Gateway 活动/排队回归、quarantine 后 reset 仍消费旧 pending approval 的回归，以及 quarantine 中断 AI review 后 reset 不能生成新 pending approval 的回归。修复前两个 reset 回归分别观察到 `callbackCalls=1; markerExists=true` 和 `pending=1; approval=callback_ran; callbackCalls=1; markerExists=true`。修复后同步隔离会使活动 signal 立即 aborted，旧 epoch 的 review/排队请求被拒绝，pending approval 已清除，合成 marker 均不存在。

保证范围仍限于同一进程中的同一个 Guard 对象和遵守 AbortSignal 的 callback。不能强制停止忽略 signal 的任意宿主 callback，也不覆盖共享 store 的跨实例通知、跨进程取消或绕过 Gateway 的原生 Shell/文件/网络路径。

## Gateway close 生命周期 owner-side 修复（Issue #28，2026-10-13）

按 M1 的 Gateway/Guard 契约 owner review，close 的组合顺序固定为：同步设置 `closed` 并清空 pending approval；创建并发布唯一 memoized Promise；abort 本 Gateway 的活动 controller；先把 disposer 替换成空操作，再安全调用一次退订；等待已入队 Gateway task 的 `history.tail`；最后逐个尝试关闭所有已登记资源。任一 `closeSync` 失败都会被隔离，后续资源仍继续关闭，最终只以 `GATEWAY_RESOURCE_CLOSE_FAILED` 拒绝，不携带底层异常或资源路径。并发及同步重入调用均取得同一 Promise 和最终结果。

本次仅修改 M1 的 `src/runtime/gateway.ts` 与 `test/gateway.test.ts`，没有增加公共 API。回归覆盖 abort listener 与 Guard disposer 中的同步重入及 Promise identity；close 时 active dispatch 被 abort、已入队写文件和已排队 approval callback 均不执行且资源只在队列结果落定后关闭；以及第一个资源关闭抛合成异常后其余资源仍全部尝试、结果错误固定且不泄露合成路径/cause。原有 Guard quarantine 同步 abort 回归仍在同一 Gateway 定向 suite 内通过。

关闭会等待 Gateway 自身串行队列完成拒绝/收尾，但 AbortSignal 不能强制终止忽略信号的 host callback，也不能撤销 callback 已完成或自行继续产生的外部副作用；这不构成 OS 沙箱，也不保护所有原生 Shell、文件或网络路径。`SECURITY_REGRESSION_RESULTS.md` 记录本次 Node/build 证据及资源关闭错误注入的限制。M0 仍需将 close 的同步锁定、Promise 发布时点、退订/队列/资源顺序和稳定错误同步到共享 `API_CONTRACTS.md`。

## Hook interruption P1 #32 本地续作（2026-10-13）

在合成复现中确认 wrapper 固定 2 秒 fail-closed timer 与父测试“marker 后立即外部 kill”的调度存在竞态：若父进程在 marker 后延迟 2.5 秒，wrapper 先输出固定 deny 并 code 0 退出，导致 interruption 专项断言失败。只修测试夹具，使 synthetic Hook 在 marker 后阻塞自身事件循环；测试再故意等待超过 2 秒并核验外部 kill、无 allow/日志。Node 20.20.2 和 22.23.1 定向回归均通过。该证据确认 harness 缺陷，不证明旧 CI 各失败都由它导致；历史 CI 根因仍需新 Windows CI 对照。详见 `SECURITY_REGRESSION_RESULTS.md` 与 `HOOK_FAILURE_MATRIX.md`。

## M1 owner checkpoint — #51 / #52 / #56（2026-10-21 03:00 UTC）

### #51：四进程 state-store 重试耗尽

- 原始 Ubuntu Node 20 run 39072320332 / job 117512297915 的 test 163 在 worker 0 的 500 次 STATE_STORE_BUSY 循环后抛 RETRY_LIMIT；日志没有 AC3_LOCK_TRACE。Node 22 run 39073687546 / worker 2 同样在 500 次后 RETRY_LIMIT，也没有 trace。历史日志不能事后补采失败时锁状态。
- 独立 instrumented Ubuntu Node 22 run 39497366090 / job 118885773068 捕获四个 worker：0/1 各完成 12 次 acquire/release。worker 0 前段持锁迭代 0–4 的区间约为 51.561259–52.293880 秒，之后在 worker 1 的 52.293971–52.816332 秒区间结束后，再完成迭代 5–11（52.816431–52.825108 秒）。worker 2/3 分别在约 1062/1067 ms 后以 500 次 EEXIST 耗尽，各有 20 次锁采样且无 stat error。owner 时序由独占 open/unlink 事件推断，不是锁内 owner 元数据；采样未显示 owner 区间重叠。这支持调度饥饿假设，不证明根因或数据丢失。
- 当前 M1 Windows Node 22.23.1 聚焦复测通过 1/1；failure-only trace 未触发。生产锁、500 次上限、2 ms 退避、48 个 quarantine 检查及最终 48-state 检查未改动。Issue #51 保持 OPEN / P1 / UNKNOWN；下一证据是对当前 M1 trace 测试做 Ubuntu Node 20/22 定向 CI 复跑，不能把旧无 trace 日志当作已归因。

### #52：M2 host 接线与 M1 Gateway 契约

- canonical coordinator/docs/3.0/API_CONTRACTS.md 规定：verifyRealPaths:true 下通用 path-string 文件回调以 path_execution_not_pinned 在审批和 callback 前拒绝；false/未设置只保留旧 lexical policy，不构成 real-path 或 protected-open 保证。M1 Gateway 对登记资源先校验文件身份，以 O_NOFOLLOW 打开并持有 descriptor，之后经该 descriptor 操作。
- M2 在 #52 的 owner 更新 6302184591 报告：createSecurityGatewayAdapter 目前只出现在定义和 checker，没有 first-party src/CLI/server 调用点；fixedFileReads 转发 path string，不是 M1 签发的 identity capability。因而它不能满足 M5 strict verifyRealPaths:true 回调边界；当前可验证范围仍是 synthetic adapter，first-party host/TOCTOU 未验证。
- M1 不批准本轮增加或改变 public interface。M2 可继续定位真实 host callsite；若要让 M5 在 strict mode 接受该执行器，先由 M0/M1/M5 明确签核 capability 表达和验证契约。#52 维持 OPEN / P0 / NOT_VERIFIED。

### #56：PR #47 的 M1-owned 路径 disposition

PR #47 当前 head e3662e9ca7363504eea7dd5e3262352018519a56 与 PR #43 的共享 M1 路径如下，规范内容由 M1 的 PR #43 维护；本轮没有编辑 M5 文件：

- src/security-router.ts（两边不同）：M5 增加别名分量检查与 OBSERVE 硬拒绝保持；M1 规范版本同时保留 generic unpinned operation 在审批/callback 前以 path_execution_not_pinned 拒绝。语义不接受任何放宽；M5 无共享路径例外。
- test/security-router.test.ts（不同）：M1 保留 canonical deny-before-approval/callback、symlink/junction 和 pinned-execution 断言；M5 专属策略用例留在 M5 风险策略测试。
- src/agent-hook.ts、security-lab/claude-native-hook.mjs（当前两边 blob 相同）：保留 M1 规范副本；native 文件操作未绑定 Gateway held-file capability 时拒绝，wrapper 日志不含原始参数/原因正文。
- test/agent-hook.test.ts（不同）：M1 规范副本保留中断 marker、无 decision/output/log 断言及 Hook 策略/脱敏覆盖。中断子进程不能观测进程外 native host callback；不把该 fixture 描述成端到端 callback 计数证明。
- test/file-state-store.test.ts（不同）：确认 M1 为 owner/canonical。M1 all-worker failure-only trace 汇总 child 状态、重试桶与 open/unlink owner 时序；保留 500/2 ms 和 48 状态断言。M5 的并行采样副本应由协调方移除或按 M1 版本协调，不能替换其诊断覆盖。

当时的 PR 路径清单是早期快照；其中“#30 不含 Hook 测试”的结论已被下节 2026-10-21 的协调方 blob inventory 更正。当前文件级 owner disposition 以该 inventory 和下节的 ref/blob 一致性限制为准。

## M1 owner checkpoint — #51 failure trace and shared-path disposition（2026-10-21）

### #51：新增 M4 精确复现签名的对照

- M4 run `38698635434` / Ubuntu 24.04 / Node `20.20.2` / job `116301121869` 使用 PR #34 merge SHA `0237411d3b63531b8164da9c04bfcbd140630afa`。test 163 的几何为 4 个独立进程各执行 12 次 quarantine 调用；worker 2 的外层 `STATE_STORE_BUSY` 循环达到 500 次、每次等待 2 ms 后以 `RETRY_LIMIT` 失败。日志没有 `AC3_LOCK_TRACE`，因此不能从该旧 job 重建失败瞬间的锁持有者或持有时长。
- 同一几何的当前 M1 failure-only trace 已在测试代码中实现。当前 Windows Node `22.23.1` 定向运行通过 1/1（子测试 `980.9615 ms`，整个命令 `1432.9705 ms`），失败专属 trace 未触发。此前 Ubuntu Node 20/22 的有界重复也曾通过；另一次 instrumented Ubuntu Node 22 运行则记录 worker 2/3 各自耗尽 500 次 `EEXIST`，约 `1062/1067 ms`，20 个锁采样均未出现 stat error，owner 仅按独占 open/unlink 事件推断且未见区间重叠。这些不同结果说明触发间歇，不能证明根因或数据丢失。
- 本次没有修改测试或生产代码；48 个 quarantine/state 检查、500 上限、2 ms 退避和 fail-closed 行为均保持。根因仍为 UNKNOWN。精确 blocker 是旧 M4 job 没有失败时 trace，当前可用本机是 Windows；下一步应在当前 M1 诊断测试上跑 Ubuntu Node 20/22 定向 CI，并保留失败时四 worker 汇总。不能把旧无 trace 失败与一次本机通过合并成已修复结论。

### #56：M1-owned 重叠文件的 canonical disposition

以下按协调方提供的当前 PR blob inventory 判定；blob 仅标识文件版本，不单独证明语义等价。M1 的 owner-canonical 变更来源为 PR #43；其他 PR 对同一路径的副本属于待协调快照，不得覆盖 M1 的硬拒绝和 deny-before-side-effect 语义。

| M1-owned path | PR overlap / supplied blob | M1 disposition |
| --- | --- | --- |
| `test/agent-hook.test.ts` | #30 `d3b64fc265da5c24e45cbdd1c24abecc467c4a5d`; #33 `4adf0827643fa7eedd865e9b550fab380a724b05`; #34 `e8ae8202492fc44fbb13c7ee855198ac8e62f436`; #43 `82ca4662e0a6c4269011ff8eba9470f2a26ccc39`; #47 `15f42f7d647b5fc403cc312d7c7dbfc421fa86f1` | #43 is the M1 canonical source. Keep its interruption marker, no-allow/no-callback, hard-deny and redaction assertions. #30/#33/#34/#47 must reconcile by porting only needed distinct coverage onto the M1 version; do not delete or weaken the M1 assertions. |
| `src/security-router.ts` | #43 supplied `8581ba8ed7df31bf1e9db1fcc707c1dbdcb209b3`; #47 `a9a3e9f8b90e7db6a466352c37e2dee066abaa47` | #43 is the M1 canonical owner path. Preserve hard deny before approval/callback, unpinned path rejection, and real-path checks. #47’s alias-component checks may be retained only if they compose without changing these deny semantics. No overlap was listed for #30/#33/#34. |
| `test/security-router.test.ts`, `src/agent-hook.ts`, `security-lab/claude-native-hook.mjs`, `test/file-state-store.test.ts` | Previously reviewed as #43/#47 shared paths; no new blob IDs supplied in this checkpoint | Keep the M1 PR #43 behavior and assertions canonical. Reconcile #47 additions without replacing deny-before-effect, Hook failure, or all-worker lock diagnostics. |

There is a ref/blob consistency blocker for an exact current-head review: the supplied #43 router blob `8581ba8...` differs from the blob read earlier from the live/local PR #43 head `5e9e22d...` (`183d1f8443498568e9d49143e746f0bc274faa2c`). The ownership disposition above is stable, but the canonical router blob must be rechecked against a single agreed PR head before declaring the content-level reconciliation complete. The earlier statement that #30 did not contain `test/agent-hook.test.ts` is superseded by the supplied inventory. No M5/M3 file was edited.

## M1 owner checkpoint — #51 non-reproduction and test-only fairness experiment（2026-10-21）

- **Baseline rerun: non-reproduction.** Run `39497366090` attempt 2 used the unchanged baseline SHA `5e9e22d3feb4c3be4d4e7e50e0b34ec5a8803c96`. Ubuntu Node 22 job `118897641785` and Ubuntu Node 20 job `118897644470` each passed all ten complete `test/file-state-store.test.ts` iterations. Each iteration reported 17 tests, 14 passed, 0 failed, and 3 platform skips; the four-process test passed 10/10 on each runtime. The failure-only trace did not trigger. This contrasts with attempt 1's confirmed worker 2/3 `EEXIST` retry exhaustion, but does not explain that intermittent event.
- **Test-only fairness experiment.** Existing M1 commit `34dc6685baaa0446d9adfebe490253c1c3b2ee2e` changes only `test/file-state-store.test.ts`: after `STATE_STORE_BUSY`, the test varies its delay deterministically from 2–8 ms using worker, operation, and retry indices, instead of fixed 2 ms polling. All four child processes remain concurrent; each must complete 12 quarantine writes. The 500-attempt ceiling is unchanged. Per-worker assertions still require 12 distinct lock acquisitions and 12 matching lock cleanups; the owner/failure trace remains; all 48 final quarantined scopes and the aggregate count of 48 remain asserted. No production lock, retry, or fail-closed behavior changed.
- **Candidate verification.** Ubuntu Node 20 and Node 22 x10 jobs passed on commit `34dc6685baaa0446d9adfebe490253c1c3b2ee2e` in run `39510559958` (jobs `118930226542` and `118930226013`). The full PR CI run `39510560017` also passed. The stagger is a bounded test-harness experiment, not evidence that it fixed or caused the historical failure.
- **Disposition.** The original contention failure is confirmed in the instrumented baseline attempt 1; attempt 2 on that same baseline is a non-reproduction. Fixed-polling/worker-scheduling starvation remains a plausible, unproven hypothesis. Root cause remains **UNKNOWN**; no production defect or data loss is established. Issue #51 remains **OPEN / P1**. This evidence and disposition are recorded in [the M1 #51 owner comment](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/51#issuecomment-6303579304). The earlier #51 checkpoint's proposed Ubuntu rerun is superseded by attempt 2; preserve the trace and failure signal for any later recurrence.
