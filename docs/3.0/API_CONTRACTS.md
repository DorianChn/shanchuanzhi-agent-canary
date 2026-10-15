# Agent Canary 3.0 公共接口契约

## Current coordination evidence (2026-10-15 06:41 UTC)

M0 maintains the cross-module contract; M1 owns Gateway and Hook semantics, M2 owns its adapter, and M5 owns policy/router semantics. This record adds no runtime implementation.

- **OBSERVE decision contract (#52):** OBSERVE may waive optional approval only for registered, non-sensitive operations. It must not mask an explicit policy `DENY`. M9's current `security-router.decide()` returns `DENY` for such decisions; M5 #47 returns `UNCHANGED` early under OBSERVE and does not project `d.action === 'DENY'`. M5 `risk-policy` still denies the tested sensitive `.env` and outside aliases before callback dispatch when `verifyRealPaths` is enabled. M5 owner review must reconcile the public decision result and add/retain focused regressions without weakening denial assertions.
- **Symlink scope:** M9 rejects every observed symlink component, including links resolving to in-workspace non-sensitive files; M5 #47 currently does not share that blanket rule. M5 must state and test the intended policy boundary. Do not treat M2's exact-path adapter rejection as equivalent to a policy decision.
- **Adapter and integration order:** M2 candidate `76066cbb` is now the remote head of existing PR #37 and its exact-head CI is running; it remains absent from the M9 CI tree. Its checker uses M2's older policy build. M5 owner reconciliation precedes M2's boundary revalidation; M9 then tests the actual checked-out M1/M2/M5 trees, distinguishing policy DENY from adapter allowlist rejection. No function-signature incompatibility was found.
- **Production boundary:** M5 has no first-party production file-host consumer; actual I/O remains the host callback. A policy or adapter fixture does not prove a shipped host opts into canonical checks or performs protected-open/handle execution. Issue #52 stays P0/OPEN; production enforcement and TOCTOU remain NOT_VERIFIED.
- **Current PR state:** #24 is OPEN/Draft, unchanged, with 11/11 checks. M9 #36 `f87a70f` passes 11/11 but its synthetic tree is not proof against current M5/M2 trees. M5 #47 `a6d610e` passes 9/9. M2 #37 `76066cb` is the current remote head with CI running. M0 #30 `494890c` has passing product checks and mixed ownership-check history (one failed, one successful); require a fresh exact-head run.

## Archived coordination evidence (2026-10-15 06:05 UTC)

M0 maintains this cross-module contract; M1 owns Hook logging semantics and M7 owns Windows package wiring. This coordination entry adds no runtime implementation.

- **Persistent Hook log contract (P0 candidate #53):** emit only reviewed allowlisted metadata: timestamp, fixed Hook event name, and permission-decision enum. Do not persist raw `tool_input`, the full `decision` object, decision reasons, paths, or other caller-controlled detail. Keep a synthetic canary-value regression proving the value is absent from the log; do not delete or weaken it.
- **Packaging dependency:** M7's Windows installer payload and hook-fault harness must consume the M1-approved sanitized behavior and retain package-smoke coverage. `npm pack` exclusion does not establish that the Windows installer omits the wrapper. M2/M3/M4/M5/M6/M8 branch copies and the M9 composition must be reviewed by their owners; adapt through the owner-approved contract.
- **P0 evidence boundary (#53):** this is a potential local at-rest disclosure based on code-path review; no real credential, production exposure, or external transmission was observed. M2 #37 `04c7ec7` and M8 #40 `454873c` are now remote exact heads with 9/9 checks each; M3 #33 `1829e05` and M9 #36 `2d3f1da` also have green exact-head checks. M7 `87e0df0` retains the packaged-harness regression and 11/11 checks. Keep #53 OPEN until reachable/shipped copies and package evidence are fully reconciled.
- **M1/M5 file-execution boundary (#52):** M1's `createTrustedExecutionGateway` is the registered-file execution boundary; it uses canonical-path checks and held-handle identity checks for its file operations. M5 `createSecurityToolRouter` owns the policy decision but delegates actual file I/O to its caller-provided `executeRealTool`. The M5 read-only audit found no production file-host consumer. M9 commit `f87a70f` adds a test-only adapter from an OBSERVE read to `gateway.agent.dispatch({ name: 'read_file' })`; valid registered-fixture reads pass through the Gateway, while sensitive in-workspace and external aliases deny before dispatch with zero approvals and unchanged fixtures (4/4 focused tests, build and diff checks pass). M2 is developing an adapter candidate on its existing branch without planned M1/M5 API changes. This remains synthetic API composition; no first-party production host joins these components, so #52 stays OPEN and production protection remains NOT_VERIFIED.
- **Hook interruption disposition:** #32 is CLOSED only for the synthetic subprocess marker regression. The old one-second fixture window terminated the child before the marker; why the original runner exceeded that window remains UNKNOWN. Native-host callbacks remain NOT_VERIFIED.
- **Current PR checks:** #24 11/11; M0 #30 `3b93f8b` product 9/9, but latest ownership check `38688865257` fails because its refreshed PR body lacks `Test-Evidence` and `API-Contract-Change` markers; M1 #43 `f14aab7` 10/10; M2 #37 `04c7ec7` 9/9; M3 #33 `1829e05` 9/9; M4 #34 `66e679b` 9/9; M5 #47 `a6d610e` 9/9; M6 #38 `c1fdf3c` 11/11; M7 #39 `87e0df0` 11/11; M8 #40 `454873c` 9/9; M9 #36 remote `2d3f1da` 11/11 with local test-only commit `f87a70f` pending publication. #51's original retry trigger remains UNKNOWN; no assertions were weakened.

## Archived coordination evidence (2026-10-15 04:04 UTC)

M0 maintains this canonical cross-module summary; M1 and M5 retain ownership of runtime and policy semantics.

- **M1 file router boundary:** commit `f14aab7` preserves the lexical legacy default and, when `verifyRealPaths:true`, hard-denies symlink/junction components for file read/write/delete before approval and again at dispatch. OBSERVE alias regressions assert preview/dispatch DENY, zero approvals/callbacks, and unchanged target content/hash. M1 focused router tests pass 20/20. This synthetic routing test does not establish a connected native host; open-by-path TOCTOU still requires a protected handle/OS boundary.
- **M5 policy composition:** M5 `nonOverridableDeny` remains hard DENY under OBSERVE. Commit `0fdbd92` separates M5 policy-reason assertions from the M1 alias preflight reason; sensitive-path tests retain DENY, `SENSITIVE_DATA`, zero approvals/callbacks, and unchanged fixture assertions. M5 focused policy tests pass 30/30.
- **M9 integrated candidate:** `37a09e8` combines the owner commits on the existing branch. Cross-module focused tests 53/53, full `npm test` 409/0 failures/6 environment skips, build, E4 verifier 16/16, and package smoke 100 files pass. Exact PR #36 CI 11/11 is green. M9-owned changes are limited to package test registration and a dedicated composition test. M6 verifier blobs match M6 `cd55717` byte-for-byte.
- **M4 status boundary:** no `/api/security-center` or `/api/e4/status` provider/IPC exists. M4 tests preserve UNKNOWN and security-origin checks; do not substitute mock values.
- **Remaining evidence limits:** no production M5 filesystem-host consumer or native M1 callback was found. External E4, native host execution, clean-VM installer lifecycle remain NOT_VERIFIED. M1 held-handle Gateway path still does not prove every same-privilege concurrent rename race.
- **Exact-head PR checks:** M1 #43 `f14aab7` 10/10; M4 #34 `e939f04` 9/9; M5 #47 `0fdbd92` 9/9; M9 #36 `37a09e8` 11/11. All remain OPEN/Draft. PR #24 is unchanged.

## Archived coordination evidence (2026-10-15 03:31 UTC)

M0 maintains the canonical cross-module summary; M1 and M5 retain ownership of their runtime and policy semantics.

- **File execution boundary:** the M1 `createTrustedExecutionGateway` file path canonicalizes and validates registered paths, opens and retains a descriptor, compares `lstat`/`fstat` identity, rechecks binding before effects, and reads/writes through the retained descriptor. Its focused Gateway/router tests pass 48/48 and build passes. The repository audit found no native-host callback connected to this Gateway; native host use remains NOT_VERIFIED. On Windows Node22, `O_NOFOLLOW` is unavailable, and the documented identity/path checks do not eliminate every same-privilege concurrent rename race.
- **Generic policy router:** `createRiskPolicyRouter` keeps its documented lexical-path legacy default. A real filesystem host must explicitly set `verifyRealPaths: true` on `createSecurityToolRouter` (or provide an equivalent canonical containment/sensitive-target boundary), then perform the open through a protected handle/no-follow/OS boundary. The M5 management adapter passes the option through but does not itself open files; no production M5 file-host consumer was found. Check-then-open alone does not eliminate TOCTOU. Issue #52 remains P0/OPEN pending real-host evidence.
- **Hook interruption:** PR #33 (`f9bd818`, run `38672489688`) and PR #34 (`9288de0`, run `38672493385`) each pass 9/9; #33 Windows Node20 passes. The old fixture's one-second marker window is the direct historical failure mechanism; runner delay beyond that window remains UNKNOWN. The synthetic subprocess test does not establish native-host callback behavior. Issue #32 remains OPEN pending M9 combined review and host evidence.
- **E4 integration:** M6 confirms the three `e4:*` package fields match M9. M9 local candidate `e2e25fb` integrates the M6 verifier guard and path checks, preserves atomic no-overwrite reports, exports bundle failures as BLOCKED with immutable sidecar/snapshot metadata, and rejects forged sidecars without modifying saved evidence. Sidecar collisions normalize to `AUTO_E4_ARTIFACT_ALREADY_EXISTS`. Build, `e4:test` 16/16 and `verify` 399/405 pass locally; M6 owner final rereview found no contract gap. The verifier/export still use lstat followed by path reads, retaining a TOCTOU limitation. External E4 remains NOT_VERIFIED.
- **Current PR checks:** M5 #47 exact head `c54e7eb` passes 9/9; M6 #38 exact head `cd55717` passes 9 product checks and 2 wrappers; M8 #40 new head `16e3d01` run `38674816292` passes 9/9. PR #24 remains OPEN/Draft and unchanged.

## Archived coordination evidence (2026-10-14 19:43 UTC)

M0 remains the sole owner of the canonical cross-module contract at docs/3.0/API_CONTRACTS.md; each interface owner remains responsible for semantics and compatibility. No public runtime API change was made by this M0 update.

For the M1-owned Hook test contract, M1 recorded that blob d3b64fc is behaviorally equivalent to blob 0de664c solely for marker-wait/interruption timing. This is not byte identity and does not prove native-host callback behavior. PRs #33/#34/#38 still carry the older synchronous fixture; M1 owns the fixture semantics while M3/M4/M6 own their branch copies. Keep the issue open until each branch has an owner disposition and exact-head CI. Preserve fail-closed behavior.

Current exact-head checks and interface status are summarized in TECHNICAL_STATUS.md. Issue #46 is CLOSED for documentation synchronization only; this does not imply runtime integration, E4, or host enforcement.



状态：基于 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 的源码快照。模块分支中的未提交改动可能改变实现；变更须由接口所有者更新契约并提供适配说明。PR #24 指向 readiness 分支，不是已合并到 `main`。

## 通用兼容规则

- 3.0 以增量导出为主，保留现有 CLI/MCP/SDK 行为。公共字段、路由、事件或失败语义的改变都算契约变更。
- 接口所有者在同一 Draft PR 更新契约，并说明旧调用方的适配方式、错误语义和版本边界。其他模块经适配层集成，不私自修改接口。
- `docs/3.0/API_CONTRACTS.md` 是 M0 维护的唯一跨模块 canonical contract；每个接口 owner 定义并审核自己接口的语义。M0 将 owner-approved 语义汇入本文件，模块 PR 可保留 `docs/3.0/<Mx>/...` owner-authored contract，不得在根路径新增另一份不同内容。其他模块经适配层集成。
- 权限判定必须在受信任执行器启动前最终复查。超时、解析失败、状态不明或证据写失败不能转成成功或放行。
- AI 分析器只能收紧决定，不能创建权限、批准操作或重置隔离。

## 当前契约与集成状态（2026-10-14 19:12 UTC）

- PR #43 M1 owner head `4b562be` / run `38620584097` passed 9/9. M1 owns Gateway/Guard semantics and its contract remains at `docs/3.0/M1/GATEWAY_API_CONTRACT.md`; the latest Hook subprocess fixture explicitly cannot observe the native-host tool callback.
- Issue #32 remains OPEN. Current `test/agent-hook.test.ts` blobs: M1 #43 and M9 #36 `6c2d8da`; M2 #37 `d3b64fc`; M3 #33, M4 #34, and M6 #38 `1ecb3ee`. The latter branches retain the old synchronous interruption-marker fixture. Their currently passing CI does not prove that historical timing race is eliminated; coordinate an owner-approved minimal update and run the affected exact-head checks.
- PR #47 M5 head `7d5df63` / run `38617317812` passed 9/9. `OBSERVE` only waives optional approval for registered, non-sensitive operations; it cannot override explicit `DENY`, `SENSITIVE_DATA`, path boundaries, or Guard quarantine. The M5 report at blob `1300b4d` and M5 PR description point to this M0-owned contract; Issue #48 is CLOSED for its scoped hard-deny evidence. Issue #46's P2 documentation criteria are verified and its GitHub close is pending the next coordination batch.
- PR #36 M9 head `6abd4da` / product run `38620602632` passed 9/9 and wrapper run `38620603071` passed 2/2. The current package manifest blob is `6b3042`; the previously reviewed additive composition preserves 36 unique test paths and AC3 package fields. Issue #27 remains OPEN pending explicit M6 field-owner confirmation and combined acceptance. Issue #49 remains closed only for its recorded path/hash scope.
- PR #30 M0 head `af39e96` / product run `38617312991` passed 9/9 and ownership run `38617313009` passed 1/1; current contract blob `693d437`. PR #24 remains OPEN/Draft at `62496d4020bd90ba2eede49b2e80a2bbebb036b4`, with 9 product and 2 wrapper checks passing; it was not modified or merged.
- PRs #33/#34/#37/#38/#39/#40/#43/#47 are also OPEN/Draft and their current reported checks pass. Native Codex Shell remains UNPROTECTED; external E4 and clean-VM installation remain NOT_VERIFIED; M4 backend security/E4 state remains UNKNOWN. Automated checks and fixtures do not expand these claims.


## TrustedExecutionGateway — M1（接口 owner）

- 入口：`createTrustedExecutionGateway(GatewayOptions)`，返回 `{ agent, operator, evidence, dataflow, provenance, close }`。
- `agent.dispatch(ToolCall, signal?)` 是 agent 工具执行唯一入口。只接受 `read_file`、`write_file`、`run_command`、`http_request`、宿主登记的 `mcp_tool`；未登记资源/命令/MCP 工具或额外参数必须拒绝。
- `GatewayOptions` 绑定 `agentId`、共享 `AgentGuard`、绝对 `workspaceRoot`、固定文件/命令/HTTPS origin、`EvidenceRecorder`；MCP 回调由宿主按精确 tool ID 登记。
- `operator.pending/approve/reject` 是宿主能力，不得暴露为 agent/MCP 工具。审批引用不可重放；执行前再次检查 Guard 和资源绑定。
- 文件能力使用预持有句柄和身份复查；命令使用固定 executable + argv；网络仅允许登记的 HTTPS origin，禁止凭据/查询/hash；敏感内容外发应拒绝。
- 拒绝记录为 `NOT_STARTED`。`RUNNING` 不是成功。当前文件读写才记录副作用 `VERIFIED`；命令/MCP/网络成功不证明全部副作用。
- `src/runtime/gateway.ts` 与 `src/containment.ts` 的执行/Guard 契约由 M1 所有；M7 的可靠性分支须集成这些语义，不能另行削弱或替换。集成跟踪于 Issue #28。
- **M1 owner-verified lifecycle contract (PR #43 head `d26a0c3`; exact-head run `38602072618` passed 9/9):** Gateway must subscribe to the same shared `AgentGuard`; construction fails closed when quarantine subscription is unavailable. `trip()` latches quarantine before synchronously notifying that Guard instance's listeners; a new subscriber is notified immediately if quarantine is already active; duplicate `trip()` does not notify twice; one listener throwing cannot suppress the rest; a disposer is idempotent; `reset()` permits a later new quarantine notification.
- `close()` synchronously marks the Gateway closed and clears pending approvals, publishes one shared `closePromise` before any abort/disposer callback can re-enter, aborts this Gateway's active controllers, unsubscribes at most once, drains `history.tail`, then attempts to close every resource owned by this Gateway. Concurrent/re-entrant close calls share the same Promise. A resource failure does not skip later closes; all callers receive only the stable sanitized `GATEWAY_RESOURCE_CLOSE_FAILED` error.
- Quarantine synchronously invalidates pending approvals and active work; queued/review work from an older Guard epoch must not revive after `reset()`. Preserve fail-closed and no-callback behavior. A callback that ignores `AbortSignal` cannot be forcibly terminated, and already completed external side effects are not rolled back.
- M1 PR #43 current head `d26a0c3` passed 9/9; M7 PR #39 current head `4267c61` includes integration commit `6d978a5`, with current lifecycle/containment regressions passing 9/9 and wrapper `38596572179` passing 2/2. M1 owner confirmation and M0 scoped acceptance are recorded in Issue #28 comments `6174345116` and `6174407469`; #28 is CLOSED for this Gateway/Guard lifecycle scope only. M9 PR #36 head `ed0dd01` passed docs-on-AC3 product 9/9 and wrapper 2/2; that does not include additional module code. #44 remains OPEN pending M9 baseline acceptance.

## Hook — M1

- 当前 Claude `PreToolUse` 桥接脚本接收四个绝对路径参数：模块路径、workspace root、state directory、日志路径；stdin 是 JSON hook 输入。
- stdout 输出 `hookSpecificOutput`，`hookEventName` 为 `PreToolUse`，`permissionDecision` 只接受 `allow|deny|ask`，并带 `permissionDecisionReason`。
- 参数无效、载入失败、输入超限、超时、决策格式错误或日志写失败必须 fail closed，输出 deny。Hook 是宿主接入层，不能替代 Gateway 执行前授权与最终复查。
- 其他宿主适配须说明覆盖范围并保留超时、错误、默认拒绝语义；MCP 接入不等同于原生工具全覆盖。

## Policy / Guard / Canary — M5 + M1

- `createRiskPolicyRouter({ guard, ... })` 对工具分类为 `ALLOW|DENY|APPROVAL_REQUIRED`，返回风险、理由和模式。未登记工具默认需审批；外部网络和敏感数据按当前策略拒绝或要求审批。
- `OBSERVE` 只豁免已登记、非敏感操作的可选审批；它不得把显式 `DENY` 或 `SENSITIVE_DATA` 改成 `ALLOW`。越界路径、明确危险操作、敏感读取与敏感外发继续拒绝；`AgentGuard` quarantine/containment 在所有模式下优先。策略 `ALLOW` 不等于 Gateway 资源登记。
- Draft PR #47 current head `584f96c` (report-only update) passed exact-head run `38608355200` 9/9 across Node 20/22 on Ubuntu/Windows/macOS, Docker, Sponsor, and package-smoke. M0 PR #30 head `63d10b8` passed product checks 9/9 and ownership evidence 1/1. Issue #48 is CLOSED for the scoped sensitive-read denial, zero pending approvals/callbacks, safe-read taint fixture, and downstream egress assertions. Issue #46 tracks final report/PR-description synchronization. This evidence does not establish real M1+M5 host wiring or real side effects.
- `createAgentGuard()` 宿主接口包括 `beforeToolCall`、`executeToolCall`、`runDecoy`、`inspect`、`trip`、`reset`、`subscribeQuarantine(listener: () => void): () => void`。`trip/reset` 和订阅管理是宿主侧操作，不注册为 agent 工具。
- `trip()` 先锁存 quarantine 状态，再同步通知该 Guard 实例的订阅者；已处于 quarantine 状态时新订阅立即通知；重复 `trip()` 不重复通知，`reset()` 后再次 `trip()` 可重新通知。单个 listener 抛错不得阻止其他 listener；返回的 disposer 可重复调用。
- Gateway 创建时订阅其绑定的同一个 Guard，若订阅能力不可用则构造失败关闭。以上顺序和失败语义由 M1 owner 定义。M1 PR #43 current head `d26a0c3` / run `38602072618` 9/9；M7 PR #39 current head `4267c61` contains the M1 close-contract integration commit `6d978a5`, with run `38596572303` 9/9 and wrapper run `38596572179` 2/2. Issue #28 is CLOSED after M1 owner confirmation and M0 scoped acceptance; this does not claim the PR was merged or all module code was integrated. M9 PR #36 remote head `ed0dd01` contains a 137-path multi-module integration candidate relative to AC3 base, including Gateway, policy, onboarding, execution-isolation, desktop, E4 verifier, reliability, package, test and documentation paths; its exact-head checks passed 9/9 product jobs and 2/2 wrapper jobs. Local commit `fbf358f` changes only the canonical contract document and awaits the scheduled push and fresh exact-head CI. These checks do not establish native-host protection, clean-VM lifecycle, external E4 or verified real-world side effects. Guard notification only covers one process and one Guard instance; callbacks that ignore AbortSignal cannot be forcibly terminated, and completed side effects are not rolled back.
- Canary 检测由 `inspect(text, source?)` 返回结构化 token；处置保留来源、会话与隔离语义，不把原始敏感值写入普通日志。
- 当前 M5 编辑 `src/risk-policy.ts`，需与 M1 Gateway 最终执行检查保持单向收紧关系。
- M5 本地提交 `cd8abea` 进一步约束策略审计事件：`DECISION` 只表示执行尚未开始；`EXECUTION_RESULT` 使用 `decision=NOT_APPLICABLE` 且状态表示执行已开始；策略变更事件不得伪装成执行结果。新增和导入证据都经过同一语义校验；非法组合不得进入哈希链。策略审计事件的判定来源、执行状态和副作用验证状态必须保持一致。
### M5 policy-audit event contract (Draft PR #47 head `cf4e2cd`; not yet integrated)

- `DECISION` is a pre-execution policy outcome: `decision` is `ALLOW`, `DENY`, `UNKNOWN`, or `REQUIRE_CONFIRMATION`; both execution and side-effect status are `NOT_STARTED`.
- `EXECUTION_RESULT` is emitted only after execution has started: `decision=NOT_APPLICABLE`; execution and side-effect statuses cannot remain `NOT_STARTED`.
- `POLICY_APPLIED`, `POLICY_ROLLED_BACK`, and `POLICY_CHANGE_REJECTED` are policy-management events, not tool decisions or execution results; they use `decision=NOT_APPLICABLE` and both statuses `NOT_STARTED`.
- Invalid event-type/status combinations are rejected before append and rejected again by evidence-chain/export verification.
- `UNKNOWN` must not be converted to `ALLOW`, `DENY`, or confirmed failure without evidence. Callback success does not prove side effects; use `NOT_VERIFIED` unless a trusted verifier establishes them. If a callback fails and effects cannot be determined, use `decision=NOT_APPLICABLE`, execution `UNKNOWN`, and side-effect `UNKNOWN`.
- This contract is reviewable in Draft PR #47 at current report-only head `584f96c`; exact-head run `38608355200` passed 9/9. M6 confirmed `SecurityEvidenceEvent` and M5 `PolicyAuditEvent` are separate schemas; M6 does not currently consume the M5 policy-audit stream, so this is schema-boundary information, not consumer compatibility proof. M9 PR #36 remote head `ed0dd01` contains a 137-path multi-module integration candidate and passed product 9/9 plus wrapper 2/2; local `fbf358f` only synchronizes this canonical contract and awaits push/current-head CI. This evidence does not establish native-host protection, clean-VM lifecycle, external E4 or real side effects. The event contract does not replace final host/Gateway authorization.

## 执行隔离与原生 Shell — M2

- Trusted Gateway/MCP registration must provide a recognized `executionSurface`. Missing or unknown metadata fails closed with `M2_GATEWAY_MCP_METADATA_INVALID`.
- Native Codex Shell is not covered by the current isolated worker. The binder rejects it before backend dispatch with `M2_NATIVE_SHELL_UNPROTECTED`; callers must preserve the `UNPROTECTED` state and must not fall through to direct execution.
- PR #37 remote head `0f2c10c`; exact-head run `38561262930` passed 9/9. `M2_ISOLATED_WORKER` is a tested adapter seam. Its tests do not prove AppContainer enforcement, trusted Hook installation, or protection of the actual Codex Desktop Shell. Issue #45 remains OPEN; the actual native Shell remains `UNPROTECTED` until a supported, trusted host path and synthetic protected-path denial are verified.

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
- 当前证据：PR #39 remote head `4267c61` has 9/9 exact-head checks and wrapper run `38596572179` has 2/2, including the pinned NSIS/template compile steps on Windows. This does not prove real user cancellation rollback. Clean-VM installation, first launch, upgrade, uninstall, and cancellation rollback remain NOT VERIFIED / HOLD until actually run and artifacts reviewed.
- M1 负责执行与 Guard 授权契约。M2 只能适配已授权的 Gateway 请求；M4 显示后端真实状态并保留 UNKNOWN/UNPROTECTED；M5 可以收紧策略但不能创建权限；M6 验证声明的证据包，但 fixture 成功不能证明运行时保护。
## Draft PR 契约

模块 PR base 为 `feature/agent-canary-3.0`，以 Draft 打开。PR 正文提供 `Test-Evidence:`、`API-Contract-Change: yes|no`；若候选接口文件变更且声明 `yes`，须同步本文件。修改共享路径还需填写 `Coordinated-with: Mx` 并关联 Issue。CI 结果由 GitHub check runs 展示，报告链接由 PR 作者提供。
