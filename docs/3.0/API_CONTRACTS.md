# Agent Canary 3.0 公共接口契约

状态：基于 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 的源码快照。模块分支中的未提交改动可能改变实现；变更须由接口所有者更新契约并提供适配说明。PR #24 指向 readiness 分支，不是已合并到 `main`。

## 通用兼容规则

- 3.0 以增量导出为主，保留现有 CLI/MCP/SDK 行为。公共字段、路由、事件或失败语义的改变都算契约变更。
- 接口所有者在同一 Draft PR 更新契约，并说明旧调用方的适配方式、错误语义和版本边界。其他模块经适配层集成，不私自修改接口。
- `docs/3.0/API_CONTRACTS.md` 由 M0 维护为唯一公共契约文件。模块发现契约缺口时提交变更建议给 M0；模块 PR 不重复新增或维护同一路径。
- 权限判定必须在受信任执行器启动前最终复查。超时、解析失败、状态不明或证据写失败不能转成成功或放行。
- AI 分析器只能收紧决定，不能创建权限、批准操作或重置隔离。

## TrustedExecutionGateway — M1（接口 owner 暂定）

- 入口：`createTrustedExecutionGateway(GatewayOptions)`，返回 `{ agent, operator, evidence, dataflow, provenance, close }`。
- `agent.dispatch(ToolCall, signal?)` 是 agent 工具执行唯一入口。只接受 `read_file`、`write_file`、`run_command`、`http_request`、宿主登记的 `mcp_tool`；未登记资源/命令/MCP 工具或额外参数必须拒绝。
- `GatewayOptions` 绑定 `agentId`、共享 `AgentGuard`、绝对 `workspaceRoot`、固定文件/命令/HTTPS origin、`EvidenceRecorder`；MCP 回调由宿主按精确 tool ID 登记。
- `operator.pending/approve/reject` 是宿主能力，不得暴露为 agent/MCP 工具。审批引用不可重放；执行前再次检查 Guard 和资源绑定。
- 文件能力使用预持有句柄和身份复查；命令使用固定 executable + argv；网络仅允许登记的 HTTPS origin，禁止凭据/查询/hash；敏感内容外发应拒绝。
- 拒绝记录为 `NOT_STARTED`。`RUNNING` 不是成功。当前文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不证明全部副作用。
- M1/M7 都在改 `src/runtime/gateway.ts`；见 Issue #28。
- 生命周期协调提案（截至 2026-10-13，待 M1 owner review，尚无集成 CI 证据）：M1 `ec3bc96` 的 Guard quarantine 通知需在 `trip()` 同步触发活动 callback 中止；Gateway `close()` 也应先拒绝新调用、取消活动 callback 并退订，再等待队列排空后关闭已持有资源。M7 `9d316fe` 增加幂等 memoized close 和稳定错误 `GATEWAY_RESOURCE_CLOSE_FAILED`。组合实现需同时保留这些语义；不合作且忽略 AbortSignal 的 callback 和已经发生的外部副作用仍不承诺回滚。跟踪于 #28。

## Hook — M1

- 当前 Claude `PreToolUse` 桥接脚本接收四个绝对路径参数：模块路径、workspace root、state directory、日志路径；stdin 是 JSON hook 输入。
- stdout 输出 `hookSpecificOutput`，`hookEventName` 为 `PreToolUse`，`permissionDecision` 只接受 `allow|deny|ask`，并带 `permissionDecisionReason`。
- 参数无效、载入失败、输入超限、超时、决策格式错误或日志写失败必须 fail closed，输出 deny。Hook 是宿主接入层，不能替代 Gateway 执行前授权与最终复查。
- 其他宿主适配须说明覆盖范围并保留超时、错误、默认拒绝语义；MCP 接入不等同于原生工具全覆盖。

## Policy / Guard / Canary — M5 + M1

- `createRiskPolicyRouter({ guard, ... })` 对工具分类为 `ALLOW|DENY|APPROVAL_REQUIRED`，返回风险、理由和模式。未登记工具默认需审批；外部网络和敏感数据按当前策略拒绝或要求审批。
- `OBSERVE` 只豁免已登记、非敏感操作的可选审批；它不得把显式 `DENY` 或 `SENSITIVE_DATA` 改成 `ALLOW`。越界路径、明确危险操作、敏感读取与敏感外发继续拒绝；`AgentGuard` quarantine/containment 在所有模式下优先。策略 `ALLOW` 不等于 Gateway 资源登记。
- M5 candidate `f8291c9` is reviewable in Draft PR #47. Under OBSERVE, a registered sensitive read returns `observe_sensitive_data_blocked` with no approval request and no callback; the M5 focused policy suite reports 44/44 passing. PR #47's Ubuntu Node 22 full-matrix job currently fails in the existing security-router expectation for sensitive-read under OBSERVE; five other matrix jobs were cancelled by fail-fast. Issue #48 tracks M1/M5 alignment. Preserve the deny; update the M1-owned fixture/test or adapter only after confirming the intended contract. M5's final branch diff does not modify this canonical file. Issue #46 tracks this wording and M6 consumer confirmation. No real leak is established; the candidate is not integrated.
- `createAgentGuard()` 宿主接口包括 `beforeToolCall`、`executeToolCall`、`runDecoy`、`inspect`、`trip`、`reset`、`subscribeQuarantine(listener: () => void): () => void`。`trip/reset` 和订阅管理是宿主侧操作，不注册为 agent 工具。
- `trip()` 先锁存 quarantine 状态，再同步通知该 Guard 实例的订阅者；已处于 quarantine 状态时新订阅立即通知；重复 `trip()` 不重复通知，`reset()` 后再次 `trip()` 可重新通知。单个 listener 抛错不得阻止其他 listener；返回的 disposer 可重复调用。
- Gateway 创建时订阅其绑定的同一个 Guard，若订阅能力不可用则构造失败关闭。M1 owner 实现 `close()` 的顺序为：同步锁定 closed 并清空 pending；在触发 abort/disposer 回调前发布唯一 memoized `closePromise`；中止活动 controller、至多一次安全退订 Guard observer；等待已入队的 Gateway 任务结算；逐个尝试关闭全部本实例资源。任一资源关闭失败时，所有调用共享以 `GATEWAY_RESOURCE_CLOSE_FAILED` 拒绝的 promise，不泄露路径或底层 cause。M1 本地提交 f15fdcfa 的 Windows Node 22 Gateway 测试为 28/28、TypeScript build 和 diff check 通过；尚无远端集成 PR/CI 证据，M7 本地提交 f17b7e6 后，候选相对 AC3 的 src/runtime/gateway.ts 净差异为零，并保留 M7 独有 evidence/reliability 测试（83 pass、0 fail、1 symlink-permission skip）；该候选并不包含 M1 f15fdcfa，组合 CI 尚待完成。Guard 通知只覆盖同一进程、同一 Guard 实例；忽略 AbortSignal 的不合作 callback 不会被强制终止，已经发生的副作用不承诺回滚。
- Canary 检测由 `inspect(text, source?)` 返回结构化 token；处置保留来源、会话与隔离语义，不把原始敏感值写入普通日志。
- 当前 M5 编辑 `src/risk-policy.ts`，需与 M1 Gateway 最终执行检查保持单向收紧关系。
- M5 本地提交 `cd8abea` 进一步约束策略审计事件：`DECISION` 只表示执行尚未开始；`EXECUTION_RESULT` 使用 `decision=NOT_APPLICABLE` 且状态表示执行已开始；策略变更事件不得伪装成执行结果。新增和导入证据都经过同一语义校验；非法组合不得进入哈希链。策略审计事件的判定来源、执行状态和副作用验证状态必须保持一致。
### M5 policy-audit event contract (Draft PR #47 head `f8291c9`; not yet integrated)

- `DECISION` is a pre-execution policy outcome: `decision` is `ALLOW`, `DENY`, `UNKNOWN`, or `REQUIRE_CONFIRMATION`; both execution and side-effect status are `NOT_STARTED`.
- `EXECUTION_RESULT` is emitted only after execution has started: `decision=NOT_APPLICABLE`; execution and side-effect statuses cannot remain `NOT_STARTED`.
- `POLICY_APPLIED`, `POLICY_ROLLED_BACK`, and `POLICY_CHANGE_REJECTED` are policy-management events, not tool decisions or execution results; they use `decision=NOT_APPLICABLE` and both statuses `NOT_STARTED`.
- Invalid event-type/status combinations are rejected before append and rejected again by evidence-chain/export verification.
- `UNKNOWN` must not be converted to `ALLOW`, `DENY`, or confirmed failure without evidence. Callback success does not prove side effects; use `NOT_VERIFIED` unless a trusted verifier establishes them. If a callback fails and effects cannot be determined, use `decision=NOT_APPLICABLE`, execution `UNKNOWN`, and side-effect `UNKNOWN`.
- This contract is reviewable in Draft PR #47 at head `f8291c9`; it is not integrated. M6 consumer confirmation and combined AC3 CI remain pending. The event contract does not replace final host/Gateway authorization and does not establish that all execution paths are integrated.

## Agent 宿主接入与安装 — M3

- 当前 `AgentClient` 为 `claude|cursor|cline|codex|custom`；状态为 `MCP_DECOY_INSTALLED|GUARD_INTEGRATED|VERIFIED_PROTECTED|PARTIAL|UNSUPPORTED`。MCP 配置不证明宿主原生工具已受保护。
- 配置先 `previewAgentIntegration`，再以预览 `baseHash` 调 `installAgentIntegration`；hash 不符须拒绝写入。安装生成用户配置备份。`restoreAgentIntegration` 仅在当前完整配置 hash 等于安装 hash 时恢复；用户后续编辑必须保留。
- `src/install.ts` 的既有 `installServer/uninstallServer` 是 CLI 安装 API，需保留原行为；不要与带 preview/hash/restore 的 Agent Integration API 混为一个接口。

## 桌面安全中心与 Console — M4

- UI 位于 `src/ai/console-page.ts`，服务入口 `startAIConsole()` 位于 `src/ai/console.ts`。已有只读路由包括 `/api/state`、`/api/job`、`/api/policy/state`、`/api/runtime3`、`/api/agents`；写入/审批路由以服务端实际定义为准。
- 请求受 Host/Origin 与 `x-canary-csrf` 校验保护；需要 operator 的写操作继续要求 operator 权限/确认。UI 不能以本地模拟成功覆盖服务端状态。
- UI 调用 API；字段/响应变更由服务端接口 owner 更新本契约。视觉改造不得删 CSRF、认证或 origin 检查。

## E4 与证据 — M6

- 机器事件 schema 为 `SecurityEvidenceEvent` v0.1，固定 decision/status 枚举；`canonicalJSON` 定义有限 JSON 规范化，`verifyEvidenceChain(events, expectedHead?)` 检查事件链和可选预期链尾。
- `expectedHead` 必须来自独立可信来源才能检测尾部截断。无外部锚定、签名和可信时间戳时不能宣称绝对防篡改；格式/哈希验证也不证明执行隔离或所有副作用。
- E4 报告保留状态、输入 artifact/hash、工具版本和验证范围；缺少证据不得转为 PASS。schema/状态语义变更由 M6 与消费者协商。
- M6 本地提交 `bca895f` 的 bundle verifier 还逐字节比对外置 `SHA256SUMS.txt`、`report.json`、`report.md`、`raw.log` 与 ZIP 内副本；缺失或不一致均拒绝。合成 fixture 通过只证明对应验证器路径，不提升 E4 状态；真实模型、工具调用、VM/安装器范围未覆盖时继续标 `NOT_VERIFIED`。

## Windows 安装包与宿主接入边界 — M7 / M3

- M7 负责 Windows 产品安装包生成与验收。Windows CI 必须安装固定版本 NSIS 并编译安装模板；缺少编译器或编译失败都必须失败退出。只检查 workflow 文本或运行 package smoke 不代表实际执行过编译。
- M3 负责宿主配置的 preview/install/restore。baseHash 校验和保留用户后续编辑的契约，与产品安装器生命周期分开。
- 当前证据：M7 本地候选 9b0a504 的聚焦源码测试通过，但该提交尚无 CI、NSIS 编译结果或干净 VM 安装结果。上述步骤实际运行且产物复核前，不得把安装验收标为 PASS。
- M1 负责执行与 Guard 授权契约。M2 只能适配已授权的 Gateway 请求；M4 显示后端真实状态并保留 UNKNOWN/UNPROTECTED；M5 可以收紧策略但不能创建权限；M6 验证声明的证据包，但 fixture 成功不能证明运行时保护。
## Draft PR 契约

模块 PR base 为 `feature/agent-canary-3.0`，以 Draft 打开。PR 正文提供 `Test-Evidence:`、`API-Contract-Change: yes|no`；若候选接口文件变更且声明 `yes`，须同步本文件。修改共享路径还需填写 `Coordinated-with: Mx` 并关联 Issue。CI 结果由 GitHub check runs 展示，报告链接由 PR 作者提供。
