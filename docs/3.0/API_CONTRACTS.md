# Agent Canary 3.0 公共接口契约

状态：基于 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 的源码快照。模块分支中的未提交改动可能改变实现；变更须由接口所有者更新契约并提供适配说明。PR #24 指向 readiness 分支，不是已合并到 `main`。

## 通用兼容规则

- 3.0 以增量导出为主，保留现有 CLI/MCP/SDK 行为。公共字段、路由、事件或失败语义的改变都算契约变更。
- 接口所有者在同一 Draft PR 更新契约，并说明旧调用方的适配方式、错误语义和版本边界。其他模块经适配层集成，不私自修改接口。
- `docs/3.0/API_CONTRACTS.md` 由 M0 维护为唯一公共契约文件。模块发现契约缺口时提交变更建议给 M0；模块 PR 不重复新增或维护同一路径。
- 权限判定必须在受信任执行器启动前最终复查。超时、解析失败、状态不明或证据写失败不能转成成功或放行。
- AI 分析器只能收紧决定，不能创建权限、批准操作或重置隔离。

## TrustedExecutionGateway — M1（接口 owner）

- 入口：`createTrustedExecutionGateway(GatewayOptions)`，返回 `{ agent, operator, evidence, dataflow, provenance, close }`。
- `agent.dispatch(ToolCall, signal?)` 是 agent 工具执行唯一入口。只接受 `read_file`、`write_file`、`run_command`、`http_request`、宿主登记的 `mcp_tool`；未登记资源/命令/MCP 工具或额外参数必须拒绝。
- `GatewayOptions` 绑定 `agentId`、共享 `AgentGuard`、绝对 `workspaceRoot`、固定文件/命令/HTTPS origin、`EvidenceRecorder`；MCP 回调由宿主按精确 tool ID 登记。
- `operator.pending/approve/reject` 是宿主能力，不得暴露为 agent/MCP 工具。审批引用不可重放；执行前再次检查 Guard 和资源绑定。
- 文件能力使用预持有句柄和身份复查；命令使用固定 executable + argv；网络仅允许登记的 HTTPS origin，禁止凭据/查询/hash；敏感内容外发应拒绝。
- 拒绝记录为 `NOT_STARTED`。`RUNNING` 不是成功。当前文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不证明全部副作用。
- `src/runtime/gateway.ts` 与 `src/containment.ts` 的执行/Guard 契约由 M1 所有；M7 的可靠性分支须集成这些语义，不能另行削弱或替换。集成跟踪于 Issue #28。
- **M1 owner-verified lifecycle contract (2026-10-14; combined GitHub CI still pending):** Gateway must subscribe to the same shared `AgentGuard`; construction fails closed when quarantine subscription is unavailable. `trip()` latches quarantine before synchronously notifying that Guard instance's listeners; a new subscriber is notified immediately if quarantine is already active; duplicate `trip()` does not notify twice; one listener throwing cannot suppress the rest; a disposer is idempotent; `reset()` permits a later new quarantine notification.
- `close()` synchronously marks the Gateway closed and clears pending approvals, publishes one shared `closePromise` before any abort/disposer callback can re-enter, aborts this Gateway's active controllers, unsubscribes at most once, drains `history.tail`, then attempts to close every resource owned by this Gateway. Concurrent/re-entrant close calls share the same Promise. A resource failure does not skip later closes; all callers receive only the stable sanitized `GATEWAY_RESOURCE_CLOSE_FAILED` error.
- Quarantine synchronously invalidates pending approvals and active work; queued/review work from an older Guard epoch must not revive after `reset()`. Preserve fail-closed and no-callback behavior. A callback that ignores `AbortSignal` cannot be forcibly terminated, and already completed external side effects are not rolled back.
- M1 owner review found the five M1-owned file blobs in M7 local code candidate `6d978a5` identical to M1 owner source HEAD `738a783`; M1 later report-only HEAD is `7a6eb98`. M7 current local HEAD `9088bd2` adds the read-only VM acceptance preflight report. M7 records Gateway/containment/acceptance 66/66 and reliability 43 pass, 0 fail, 3 skipped. The candidate includes `89e40cd` approval-expiry test requestId stabilization; this does not resolve or close #44. PR #39 remote remains `5c7d95d` with its exact-head 11/11 checks; those checks do not cover the unpushed candidate. Keep #28 OPEN until the candidate and combined CI are reviewed.

## Hook — M1

- 当前 Claude `PreToolUse` 桥接脚本接收四个绝对路径参数：模块路径、workspace root、state directory、日志路径；stdin 是 JSON hook 输入。
- stdout 输出 `hookSpecificOutput`，`hookEventName` 为 `PreToolUse`，`permissionDecision` 只接受 `allow|deny|ask`，并带 `permissionDecisionReason`。
- 参数无效、载入失败、输入超限、超时、决策格式错误或日志写失败必须 fail closed，输出 deny。Hook 是宿主接入层，不能替代 Gateway 执行前授权与最终复查。
- 其他宿主适配须说明覆盖范围并保留超时、错误、默认拒绝语义；MCP 接入不等同于原生工具全覆盖。

## Policy / Guard / Canary — M5 + M1

- `createRiskPolicyRouter({ guard, ... })` 对工具分类为 `ALLOW|DENY|APPROVAL_REQUIRED`，返回风险、理由和模式。未登记工具默认需审批；外部网络和敏感数据按当前策略拒绝或要求审批。
- `OBSERVE` 只豁免已登记、非敏感操作的可选审批；它不得把显式 `DENY` 或 `SENSITIVE_DATA` 改成 `ALLOW`。越界路径、明确危险操作、敏感读取与敏感外发继续拒绝；`AgentGuard` quarantine/containment 在所有模式下优先。策略 `ALLOW` 不等于 Gateway 资源登记。
- Draft PR #47 remote head `cf4e2cd` retains the OBSERVE hard deny for registered sensitive reads. It includes M1 same-Guard fixture coverage; exact-head run `38527097304` passed 9/9 across Node 20/22 on Ubuntu/Windows/macOS, Docker, Sponsor, and package-smoke. M5 corrected the PR description to mark the older `f8291c9` failure superseded. M9 local combined candidate `5c11113` passed npm run verify (391 passed, 0 failed, 6 environment-condition skips) and 100-file package smoke; GitHub CI for that combined head is pending. The M5 branch does not modify this M0-owned canonical file. Issue #48 remains OPEN until M1/M5 behavior and combined acceptance are confirmed; no real leak is established.
- `createAgentGuard()` 宿主接口包括 `beforeToolCall`、`executeToolCall`、`runDecoy`、`inspect`、`trip`、`reset`、`subscribeQuarantine(listener: () => void): () => void`。`trip/reset` 和订阅管理是宿主侧操作，不注册为 agent 工具。
- `trip()` 先锁存 quarantine 状态，再同步通知该 Guard 实例的订阅者；已处于 quarantine 状态时新订阅立即通知；重复 `trip()` 不重复通知，`reset()` 后再次 `trip()` 可重新通知。单个 listener 抛错不得阻止其他 listener；返回的 disposer 可重复调用。
- Gateway 创建时订阅其绑定的同一个 Guard，若订阅能力不可用则构造失败关闭。以上顺序和失败语义由 M1 owner 定义并已复核本地候选。M1 PR #43 remote `f59ba37` has 9/9 checks; its local report-only head is `7a6eb98`. M7 code candidate is `6d978a5`, current local M7 head `9088bd2` (the report-only follow-up); PR #39 remote remains `5c7d95d` OPEN/DRAFT with 11/11 checks on the older remote head, not on the unpushed candidate. Combined GitHub CI is pending. Guard notification only covers one process and one Guard instance; callbacks that ignore AbortSignal cannot be forcibly terminated, and completed side effects are not rolled back.
- Canary 检测由 `inspect(text, source?)` 返回结构化 token；处置保留来源、会话与隔离语义，不把原始敏感值写入普通日志。
- 当前 M5 编辑 `src/risk-policy.ts`，需与 M1 Gateway 最终执行检查保持单向收紧关系。
- M5 本地提交 `cd8abea` 进一步约束策略审计事件：`DECISION` 只表示执行尚未开始；`EXECUTION_RESULT` 使用 `decision=NOT_APPLICABLE` 且状态表示执行已开始；策略变更事件不得伪装成执行结果。新增和导入证据都经过同一语义校验；非法组合不得进入哈希链。策略审计事件的判定来源、执行状态和副作用验证状态必须保持一致。
### M5 policy-audit event contract (Draft PR #47 head `cf4e2cd`; not yet integrated)

- `DECISION` is a pre-execution policy outcome: `decision` is `ALLOW`, `DENY`, `UNKNOWN`, or `REQUIRE_CONFIRMATION`; both execution and side-effect status are `NOT_STARTED`.
- `EXECUTION_RESULT` is emitted only after execution has started: `decision=NOT_APPLICABLE`; execution and side-effect statuses cannot remain `NOT_STARTED`.
- `POLICY_APPLIED`, `POLICY_ROLLED_BACK`, and `POLICY_CHANGE_REJECTED` are policy-management events, not tool decisions or execution results; they use `decision=NOT_APPLICABLE` and both statuses `NOT_STARTED`.
- Invalid event-type/status combinations are rejected before append and rejected again by evidence-chain/export verification.
- `UNKNOWN` must not be converted to `ALLOW`, `DENY`, or confirmed failure without evidence. Callback success does not prove side effects; use `NOT_VERIFIED` unless a trusted verifier establishes them. If a callback fails and effects cannot be determined, use `decision=NOT_APPLICABLE`, execution `UNKNOWN`, and side-effect `UNKNOWN`.
- This contract is reviewable in Draft PR #47 at remote head `cf4e2cd`; it is not integrated. M6 confirmed `SecurityEvidenceEvent` and M5 `PolicyAuditEvent` are separate schemas; M6 does not currently consume the M5 policy-audit stream, so this is schema-boundary information, not consumer compatibility proof. M9 local combined candidate `5c11113` passed aggregate verify (391 passed, 0 failed, 6 environment-condition skips) and its 100-file package smoke; combined GitHub CI remains pending. The event contract does not replace final host/Gateway authorization and does not establish all execution paths are integrated.

## 执行隔离与原生 Shell — M2

- Trusted Gateway/MCP registration must provide a recognized `executionSurface`. Missing or unknown metadata fails closed with `M2_GATEWAY_MCP_METADATA_INVALID`.
- Native Codex Shell is not covered by the current isolated worker. The binder rejects it before backend dispatch with `M2_NATIVE_SHELL_UNPROTECTED`; callers must preserve the `UNPROTECTED` state and must not fall through to direct execution.
- PR #37 remote head is `cb84f43`; a sanitized local descendant `cfde2f0` is not yet published. `M2_ISOLATED_WORKER` is a tested adapter seam. Its tests do not prove AppContainer enforcement, trusted Hook installation, or protection of the actual Codex Desktop Shell. Issue #45 remains OPEN; the actual native Shell remains `UNPROTECTED` until a supported, trusted host path and synthetic protected-path denial are verified.

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
- M6 confirmed that `SecurityEvidenceEvent` and M5 `PolicyAuditEvent` are separate schemas; current M6 code does not consume the M5 policy-audit stream. M6's Shell fixture is classified as `OBSERVED_BYPASS`, but it does not invoke the M2 binder or verify `executionSurface`; M6 tests also do not exercise M5 OBSERVE hard-deny behavior. Do not claim cross-module compatibility or E4 runtime protection from these synthetic checks.

## Windows 安装包与宿主接入边界 — M7 / M3

- M7 负责 Windows 产品安装包生成与验收。Windows CI 必须安装固定版本 NSIS 并编译安装模板；缺少编译器或编译失败都必须失败退出。只检查 workflow 文本或运行 package smoke 不代表实际执行过编译。
- M3 负责宿主配置的 preview/install/restore。baseHash 校验和保留用户后续编辑的契约，与产品安装器生命周期分开。
- 当前证据：PR #39 remote head `5c7d95d` has 11/11 exact-head checks, including the pinned NSIS/template workflow checks. Local M7 candidate `ead9593` is not included in that run. This does not prove real user cancellation rollback. Clean-VM installation, first launch, upgrade, uninstall, and cancellation rollback remain NOT VERIFIED / HOLD until actually run and artifacts reviewed.
- M1 负责执行与 Guard 授权契约。M2 只能适配已授权的 Gateway 请求；M4 显示后端真实状态并保留 UNKNOWN/UNPROTECTED；M5 可以收紧策略但不能创建权限；M6 验证声明的证据包，但 fixture 成功不能证明运行时保护。
## Draft PR 契约

模块 PR base 为 `feature/agent-canary-3.0`，以 Draft 打开。PR 正文提供 `Test-Evidence:`、`API-Contract-Change: yes|no`；若候选接口文件变更且声明 `yes`，须同步本文件。修改共享路径还需填写 `Coordinated-with: Mx` 并关联 Issue。CI 结果由 GitHub check runs 展示，报告链接由 PR 作者提供。
