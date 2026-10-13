# Agent Canary 3.0 公共接口契约

状态：基于 `62496d4020bd90ba2eede49b2e80a2bbebb036b4` 的源码快照。模块分支中的未提交改动可能改变实现；变更须由接口所有者更新契约并提供适配说明。PR #24 指向 readiness 分支，不是已合并到 `main`。

## 通用兼容规则

- 3.0 以增量导出为主，保留现有 CLI/MCP/SDK 行为。公共字段、路由、事件或失败语义的改变都算契约变更。
- 接口所有者在同一 Draft PR 更新契约，并说明旧调用方的适配方式、错误语义和版本边界。其他模块经适配层集成，不私自修改接口。
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

## Hook — M1

- 当前 Claude `PreToolUse` 桥接脚本接收四个绝对路径参数：模块路径、workspace root、state directory、日志路径；stdin 是 JSON hook 输入。
- stdout 输出 `hookSpecificOutput`，`hookEventName` 为 `PreToolUse`，`permissionDecision` 只接受 `allow|deny|ask`，并带 `permissionDecisionReason`。
- 参数无效、载入失败、输入超限、超时、决策格式错误或日志写失败必须 fail closed，输出 deny。Hook 是宿主接入层，不能替代 Gateway 执行前授权与最终复查。
- 其他宿主适配须说明覆盖范围并保留超时、错误、默认拒绝语义；MCP 接入不等同于原生工具全覆盖。

## Policy / Guard / Canary — M5 + M1

- `createRiskPolicyRouter({ guard, ... })` 对工具分类为 `ALLOW|DENY|APPROVAL_REQUIRED`，返回风险、理由和模式。未登记工具默认需审批；外部网络和敏感数据按当前策略拒绝或要求审批。
- `OBSERVE` 只影响可选策略层，不覆盖 `AgentGuard` quarantine/containment。策略 `ALLOW` 不等于 Gateway 资源登记。
- `createAgentGuard()` 宿主接口包括 `beforeToolCall`、`executeToolCall`、`runDecoy`、`inspect`、`trip`、`reset`。`trip/reset` 是宿主侧操作，不注册为 agent 工具。
- Canary 检测由 `inspect(text, source?)` 返回结构化 token；处置保留来源、会话与隔离语义，不把原始敏感值写入普通日志。
- 当前 M5 编辑 `src/risk-policy.ts`，需与 M1 Gateway 最终执行检查保持单向收紧关系。

## Agent 宿主接入与安装 — M3

- 当前 `AgentClient` 为 `claude|cursor|cline|codex|custom`；状态为 `MCP_DECOY_INSTALLED|GUARD_INTEGRATED|VERIFIED_PROTECTED|PARTIAL|UNSUPPORTED`。MCP 配置不证明宿主原生工具已受保护。
- 配置先 `previewAgentIntegration`，再以预览 `baseHash` 调 `installAgentIntegration`；hash 不符须拒绝写入。安装生成用户配置备份。`restoreAgentIntegration` 仅在当前完整配置 hash 等于安装 hash 时恢复；用户后续编辑必须保留。
- `src/install.ts` 的既有 `installServer/uninstallServer` 是 CLI 安装 API，需保留原行为；不要与带 preview/hash/restore 的 Agent Integration API 混为一个接口。

### M3 owner contract update — onboarding (PR #33)

#### Export and distribution boundary

- M3 adds the module exports DetectedAgentHost and detectAgentHosts from src/agent-host-detection.ts, plus installAgentIntegrationWithReceipt from src/agent-integrations.ts. It hardens the existing previewAgentIntegration, installAgentIntegration, restoreAgentIntegration, and detectAgents behavior without changing their parameter order or legacy installServer/uninstallServer behavior.
- M3 also adds the module export runCodexConnectionCheck from src/codex-connection-check.ts. It returns Gateway and Hook observations separately; passed reflects the synthetic public_read Gateway call only. Hook confirmation requires the probe to be denied before it reaches Gateway. Missing CLI/build, unsupported Windows command wrappers, timeout, startup failure, and non-zero Codex exit throw CONNECTION_CODEX_NOT_INSTALLED, CONNECTION_CHECK_BUILD_REQUIRED, CONNECTION_CODEX_WRAPPER_UNSUPPORTED, CONNECTION_CODEX_TIMEOUT, CONNECTION_CODEX_START_FAILED, or CONNECTION_CODEX_RUN_FAILED respectively.
- These are compiled module exports, not additions to the package SDK export map. package.json continues to expose only ./sdk. Consumers that need the onboarding helpers should use the documented CLI; direct imports from internal dist paths are not a stable package entry point.
- The source competition CLI adds onboard and connect-check. In a source checkout they are invoked with node dist/competition.js. The onboard command currently provides end-to-end onboarding only for Codex CLI. Other host rows and generic integration helpers do not imply end-to-end compatibility.

#### Detection contract

- detectAgentHosts(options?) returns one metadata record for Codex, Claude Code, Cursor, and Cline. The record distinguishes CLI/extension installation, configuration-only presence, and not-found; reports discovered executable/version and documented MCP/configuration locations; and does not return configuration values.
- Hook configured state is metadata only. Activation is always reported as unverified; a detected config or Hook entry is not proof that the host loaded it or enforced it.
- Detection errors that prevent a CLI version read produce a null version rather than a protection claim. Callers must treat not-found and configuration-only as distinct states.

#### Preview, install, and restore contract

- AgentClient remains claude|cursor|cline|codex|custom. A preview requires a supported agent id, an absolute existing project directory, a non-empty command, and a string argument array. It returns configPath, the requested entry, baseHash, originalExisted, status PARTIAL, and an explicit coverage string; it does not return the existing configuration contents.
- For Codex, preview appends one mcp_servers.agent-canary TOML table while retaining existing TOML bytes. JSON hosts merge the named entry into mcpServers. Invalid syntax, invalid container types, symlink/non-file/oversized configs, or an existing same-name entry fail before write; same-name entries require manual review.
- installAgentIntegration(agent, project, entry, expectedHash) and installAgentIntegrationWithReceipt(...) both re-plan and compare expectedHash before and under an exclusive lock. A stale preview fails with INTEGRATION_CONFIG_CHANGED. Installation writes only the planned project config and creates a private backup under the user home integration-backups directory. The receipt form also writes a recovery receipt and returns receiptPath.
- An install record reports status MCP_DECOY_INSTALLED and coverage limited to callbacks explicitly registered with Agent Canary. It does not report VERIFIED_PROTECTED. The existing installServer/uninstallServer interface remains separate.
- restoreAgentIntegration(record) checks the record shape and host config suffix, current complete-config hash, backup path containment, and original backup hash. It restores the original bytes only when the installed config has not changed, or removes the config only when installation created it. Later user edits fail with INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED and remain untouched.

#### CLI adaptation and errors

- onboard defaults to a metadata-only preflight/preview. --apply is the explicit write confirmation; --json returns machine-readable metadata without original config values. --restore accepts the generated receipt. A successful write reports configurationWrite SUCCEEDED and protectionStatus NOT_VERIFIED, then directs the operator to run connect-check.
- onboard rejects non-Codex hosts with ONBOARDING_HOST_NOT_END_TO_END_VERIFIED, requires Node.js 20+, a detected Codex CLI and a writable target for apply, and checks the user-level Codex entry for a same-name conflict before writing. It does not install a Hook.
- connect-check runs the installed Codex executable with an ephemeral configuration and synthetic read-only MCP tools. It reports Gateway and PreToolUse results separately, never changes persistent Codex config, and marks native host tools OUT_OF_SCOPE. A Hook miss is reported as GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE; it must not be interpreted as Hook protection.
- integrate --agent cline fails with INTEGRATION_CLINE_PATH_UNSUPPORTED because the legacy write path does not match the documented user-level path. The CLI does not write that configuration.
- Integration and rollback failures use symbolic Error.message codes, including INTEGRATION_INPUT_INVALID, INTEGRATION_PROJECT_NOT_FOUND, INTEGRATION_PROJECT_NOT_DIRECTORY, INTEGRATION_CONFIG_UNSAFE, INTEGRATION_CONFIG_INVALID, INTEGRATION_JSON_INVALID, INTEGRATION_TOML_INVALID, INTEGRATION_CONFIG_EMPTY, INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW, INTEGRATION_CONFIG_CHANGED, INTEGRATION_PARENT_OUTSIDE_PROJECT, INTEGRATION_LOCKED, INTEGRATION_RECEIPT_INVALID, INTEGRATION_RECEIPT_PATH_INVALID, INTEGRATION_BACKUP_MISSING, INTEGRATION_BACKUP_CHANGED, and INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED. The CLI maps known codes and common filesystem permission/path errors to Chinese diagnostics and exits non-zero; callers must not convert them to success or retry by overwriting user config.
- The current integration state is partial: Gateway coverage applies only to registered callbacks. Codex shell, file editing, browser, built-in search, other MCP servers, and Hook enforcement remain outside verified protection unless separately demonstrated by a real host check.

## 桌面安全中心与 Console — M4

- UI 位于 `src/ai/console-page.ts`，服务入口 `startAIConsole()` 位于 `src/ai/console.ts`。已有只读路由包括 `/api/state`、`/api/job`、`/api/policy/state`、`/api/runtime3`、`/api/agents`；写入/审批路由以服务端实际定义为准。
- 请求受 Host/Origin 与 `x-canary-csrf` 校验保护；需要 operator 的写操作继续要求 operator 权限/确认。UI 不能以本地模拟成功覆盖服务端状态。
- UI 调用 API；字段/响应变更由服务端接口 owner 更新本契约。视觉改造不得删 CSRF、认证或 origin 检查。

## E4 与证据 — M6

- 机器事件 schema 为 `SecurityEvidenceEvent` v0.1，固定 decision/status 枚举；`canonicalJSON` 定义有限 JSON 规范化，`verifyEvidenceChain(events, expectedHead?)` 检查事件链和可选预期链尾。
- `expectedHead` 必须来自独立可信来源才能检测尾部截断。无外部锚定、签名和可信时间戳时不能宣称绝对防篡改；格式/哈希验证也不证明执行隔离或所有副作用。
- E4 报告保留状态、输入 artifact/hash、工具版本和验证范围；缺少证据不得转为 PASS。schema/状态语义变更由 M6 与消费者协商。

## Draft PR 契约

模块 PR base 为 `feature/agent-canary-3.0`，以 Draft 打开。PR 正文提供 `Test-Evidence:`、`API-Contract-Change: yes|no`；若候选接口文件变更且声明 `yes`，须同步本文件。修改共享路径还需填写 `Coordinated-with: Mx` 并关联 Issue。CI 结果由 GitHub check runs 展示，报告链接由 PR 作者提供。
