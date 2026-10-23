# M3 Owner Contract：宿主发现与 Agent 接入

本文是 M3 所有的宿主发现、MCP 配置预览/写入/回滚及 Codex 自检接口契约；共享契约由 M0 维护，本文件不替代 docs/3.0/API_CONTRACTS.md。首次完整源码审阅对应提交 `c404b6b`；2026-10-21 的 first-party host/build callsite 复核及当前 M1/M2/M5 兼容性边界见 [ONBOARDING_TEST_REPORT.md](../../../ONBOARDING_TEST_REPORT.md)。

**保护状态：** Codex 项目级 MCP 写入状态为 MCP_DECOY_INSTALLED，并不代表 VERIFIED_PROTECTED。Agent Canary Gateway 只覆盖可信宿主显式登记并转交的回调。宿主原生工具、未登记回调和其他 MCP 服务器均为 OUT_OF_SCOPE。真实宿主保护和 Hook 生效状态仍为 NOT_VERIFIED，除非相应运行证据明确证明该窄路径。

## 1. 包与入口边界

- package.json 的 SDK export map 只声明 ./sdk；宿主发现、自检及接入辅助函数是内部模块导出，不构成稳定的包子路径 API。
- 当前 package.json 的 bin 仅声明 agent-canary -> dist/index.js。M3 竞争构建 CLI 源码入口是 src/competition.ts，本地构建后可用 node dist/competition.js 调用。独立 agent-canary-competition 命令是否包含在 Windows/发布构建中，源码和包元数据未能确认，状态为 NOT_VERIFIED。
- Codex onboarding 写入的 MCP entry 启动 `node dist/competition.js serve --stdio`，该 server 当前只处理 Agent Canary decoy tools；它没有消费 M2 `createSecurityGatewayAdapter` 或转交用户/原生 host callbacks。`connect-check` 运行的临时 Gateway MCP 是独立合成测试入口，不等于安装后的产品 callback path。
- 包含于构建的 `agent-canary ai console` / `npm run ai:console` 是另一个 first-party 隔离演示入口：`src/ai/console.ts` 创建 `src/runtime/demo.ts`，后者直接创建并调用 M1 Gateway，对 `HoneypotRuntime` 临时 fixture 执行固定读写。它不调用 M2 adapter，也不接管桌面宿主 callback 或用户文件。这个 Gateway demo 路径不能作为 Codex onboarding 或原生工具保护的证据。
- src/install.ts 中既有的 installServer / uninstallServer 与 integrate、onboard、connect-check CLI 及下列 Agent Integration API 是不同接口；添加 MCP 配置不代表 Gateway 或原生工具保护。

## 2. 宿主发现

### detectAgentHosts(options?)

返回顺序为 Codex、Claude Code、Cursor、Cline 四条记录。每条记录包含 agent、label、installed、installationSource、executable、version、mcp 和 hooks；当前四项的 mcp.supported 均为 true。可选检测参数包括 home、project、env、platform、exists 和 version，后两者也供测试注入。installationSource 为 cli | editor-extension | configuration-only | not-found；automation 为 toml | json | official-cli | official-ui；hooks.configured 为布尔值或 null，activation 固定为 unverified。

| 宿主 | 命令/安装来源 | MCP 配置路径 | Hook 元数据路径 | 自动化标签 |
|---|---|---|---|---|
| Codex | PATH 中 codex | CODEX_HOME 环境变量指定目录下的 config.toml（未设置时 ~/.codex/config.toml），以及可选项目 .codex/config.toml | 与 MCP 路径相同 | toml |
| Claude Code | PATH 中 claude | ~/.claude.json，以及可选项目 .mcp.json | ~/.claude/settings.json、可选项目 .claude/settings.json | json |
| Cursor | PATH 中 cursor-agent，否则 cursor | ~/.cursor/mcp.json，以及可选项目 .cursor/mcp.json | 无 | json |
| Cline | PATH 中 cline；另检查 VS Code/VS Code Insiders 扩展目录中的 Cline 扩展 | CLINE_MCP_SETTINGS_PATH 指定位置（未设置时 ~/.cline/data/settings/cline_mcp_settings.json） | 无 | CLI 时 official-cli，仅扩展时 official-ui，否则 json |

- installed 只表示发现可执行 CLI，或发现 Cline VS Code 扩展。只有 MCP 配置文件存在时 installationSource 为 configuration-only，不据此宣称宿主仍已安装或能够运行。
- configuration 是候选路径列表，不表示文件存在；记录不返回配置值。版本通过发现的命令运行 --version；失败或无输出时为 null。Cline 扩展不会提供 CLI 版本。
- Codex Hook 元数据只检查可解析 TOML 中 hooks.PreToolUse 的 matcher 是否含 agent-canary；Claude 只检查可解析 JSON 中 hooks.PreToolUse 是否非空。Cursor/Cline 没有 M3 Hook 配置路径。configured 不证明 Hook 属于正确实现、被宿主加载或实际执行；配置不可安全读取或解析失败时可为 null。activation 恒为 unverified。
- `decideAgentHook` 没有接收 M1 held-file capability 的参数，因此 native `Read`/`Write`/`Delete` 不得单凭 workspace 路径获准；无 capability 时返回 `deny` 与 `native_file_execution_not_pinned`，并保留更具体的策略硬拒绝。已登记 held-file 的正向文件访问仍通过独立 M1 Gateway capability 路径，不代表 native Hook callback 已接线。
- hooks.supported 是接口能力元数据，不是接入结论；当前 Cline 只有发现 CLI 时才标为 supported，仍没有 M3 Hook 路径或 Hook 生效证明。

### 旧接口 detectAgents(home?)

保留为兼容既有调用的粗粒度检测器，返回 PARTIAL 状态和固定覆盖说明。CLI 的宿主检测使用 detectAgentHosts；不得将 detectAgents 的结果用作已连接或已保护证明。

## 3. Agent Integration API

AgentClient 为 claude | cursor | cline | codex | custom。IntegrationState 为 MCP_DECOY_INSTALLED | GUARD_INTEGRATED | VERIFIED_PROTECTED | PARTIAL | UNSUPPORTED。

项目配置路径：Claude .mcp.json、Cursor .cursor/mcp.json、Cline .cline/data/settings/cline_mcp_settings.json、Codex .codex/config.toml、custom mcp.json。Cline 旧项目相对写入路径不等同于官方用户配置位置；CLI integrate --agent cline 会拒绝此路径，底层函数存在不构成 Cline 兼容承诺。

### 预览

previewAgentIntegration(agent, project, {command, args})：

- project 必须为绝对路径且指向已存在目录；command 必须是非空字符串，args 必须为字符串数组。预览读取目标配置以计算哈希，但不返回原配置内容。
- 返回 configPath、entry、baseHash、originalExisted、status: PARTIAL 与 coverage。覆盖说明限定为显式登记给 Agent Canary 的回调；其他工具仍为 OUT_OF_SCOPE。
- 配置文件必须是非链接普通文件且不大于 256 KB。Codex 使用 TOML；其他配置使用 JSON。无效容器类型、格式错误或同名 agent-canary MCP 项在写入前拒绝。
- Codex 通过追加 [mcp_servers.agent-canary] TOML 表保留原有 TOML 字节；JSON 宿主合并 mcpServers.agent-canary，保留其他键的值，但会重新序列化 JSON。已有非 Codex 空配置会拒绝；空 Codex TOML 可作为追加基线。

### 安装与回执

installAgentIntegration(agent, project, entry, expectedHash) 与 installAgentIntegrationWithReceipt(...)：

两者都重新规划并核对 expectedHash；取得目标配置旁的排他锁后再次检查完整配置哈希，并在提交前复查。配置父目录经链接解析后若离开项目目录，则拒绝写入。

- 普通安装返回 agent、configPath、backupPath、installedHash、originalHash、originalExisted、status: MCP_DECOY_INSTALLED、coverage。
- 带回执安装额外在用户目录 .agent-canary-integration-backups 创建备份和回执文件，并返回 receiptPath。代码请求目录 mode 0700、文件 mode 0600；Windows ACL 未验证。回执不是宿主保护证明。
- 安装只写 MCP 项；没有自动注册第三方宿主原生工具的回调、安装 Agent Canary Hook 或证明 MCP 服务器已被宿主调用。因此结果保持 MCP_DECOY_INSTALLED / PARTIAL，不能提升为 VERIFIED_PROTECTED。

### 安全回滚

restoreAgentIntegration(record) 要求回执字段、绝对路径和宿主配置后缀有效；目标完整配置哈希必须仍等于 installedHash；备份必须位于用户目录备份根内并通过 originalHash 校验。原配置存在时恢复原始字节；原来不存在时仅删除本次创建的目标文件。任一检查失败则停止，不覆盖安装后的用户编辑。备份/回执哈希是本地完整性检查，不构成签名或可信来源。

### 接入/回滚错误码

以下为源码中的符号 Error.message。调用者不能把它们转换成成功，也不能通过重试覆盖用户配置。

- 输入与配置：INTEGRATION_INPUT_INVALID、INTEGRATION_PROJECT_NOT_FOUND、INTEGRATION_PROJECT_NOT_DIRECTORY、INTEGRATION_CONFIG_UNSAFE、INTEGRATION_CONFIG_EMPTY、INTEGRATION_CONFIG_INVALID、INTEGRATION_TOML_INVALID、INTEGRATION_JSON_INVALID、INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW。
- 并发与路径：INTEGRATION_CONFIG_CHANGED、INTEGRATION_PARENT_OUTSIDE_PROJECT、INTEGRATION_LOCKED、INTEGRATION_RECEIPT_INVALID、INTEGRATION_RECEIPT_PATH_INVALID。
- 回滚备份：INTEGRATION_BACKUP_MISSING、INTEGRATION_BACKUP_CHANGED、INTEGRATION_BACKUP_ROOT_UNSAFE、INTEGRATION_BACKUP_DIRECTORY_UNSAFE、INTEGRATION_BACKUP_OUTSIDE_ROOT、INTEGRATION_BACKUP_UNSAFE、INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED。
- CLI 预检/适配：INTEGRATION_PROJECT_REQUIRED、INTEGRATION_GLOBAL_ENTRY_CONFLICT、INTEGRATION_ENTRY_MISSING、INTEGRATION_CLINE_PATH_UNSUPPORTED、ONBOARDING_HOST_NOT_END_TO_END_VERIFIED、ONBOARDING_HOST_NOT_INSTALLED、ONBOARDING_WRITE_PERMISSION_REQUIRED、ONBOARDING_NODE_VERSION。

## 4. CLI 契约

### onboard

- onboard --agent codex [--project <path>] [--apply] [--json]；项目默认当前工作目录。端到端向导只支持 Codex CLI，要求 Node.js 20+ 和 PATH 可运行的 Codex CLI。
- 预览检查用户级 Codex 配置中的同名项以及项目配置。JSON 预览输出 metadata、追加内容和 baseHash，不输出原配置值；非交互调用不带 --apply 时不写入。交互终端只有用户确认，或显式传入 --apply，才写入。
- 只写项目 .codex/config.toml 的 MCP 表；不会改用户级配置，也不会安装 Hook。成功写入分别报告 configurationWrite: SUCCEEDED、status: MCP_DECOY_INSTALLED、protectionStatus: NOT_VERIFIED 和回执路径。
- onboard --restore <receipt> 调用安全回滚规则。用户级同名项以 INTEGRATION_GLOBAL_ENTRY_CONFLICT 停止；项目同名项由预览以 INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW 停止。

### integrate

既有 CLI 继续提供 --detect、--project、--apply、--restore。--detect 只返回发现 metadata；Cline 因旧项目相对路径与官方用户路径不符而返回 INTEGRATION_CLINE_PATH_UNSUPPORTED。其他宿主的预览/写入 API 可用不代表已通过该宿主的端到端测试。

### connect-check

- CLI 调用模块函数 runCodexConnectionCheck()；它运行检测到的 Codex 可执行文件，Windows 上仅接受 .exe。缺少 Codex、连接检查构建文件、启动错误、超时或 Codex 非零退出分别报 CONNECTION_CODEX_NOT_INSTALLED、CONNECTION_CHECK_BUILD_REQUIRED、CONNECTION_CODEX_START_FAILED、CONNECTION_CODEX_TIMEOUT、CONNECTION_CODEX_RUN_FAILED；Windows 非 .exe 包装器报 CONNECTION_CODEX_WRAPPER_UNSUPPORTED。临时目录安全检查失败时报 CONNECTION_CHECK_TEMP_PATH_UNSAFE。
- 在临时目录及 ephemeral/ignore-user-config CLI 配置运行两个合成只读 MCP 工具：public_read 经 createTrustedExecutionGateway.agent.dispatch；hook_probe 由临时生成的 PreToolUse 探针尝试在到达 Gateway 前拒绝。另有固定临时文件工具 protected_read：它只可通过 M2 公共 strict facade、M5 createSecurityToolRouter 与 M1 held-file capability 组合读取固定探针文件，不接受 generic path callback 或 path-only fallback。缺少任一接口、组合失败、正向读取未返回固定标记时，独立结果为 protectedHost.status: UNKNOWN；不会提升 connect-check 的 Gateway/Hook 状态。测试结束清理临时目录，不修改持久 Codex 配置。它不检查刚安装的项目配置是否被现有 Codex 会话加载，也不验证 Agent Canary 本地 Hook 已安装或已生效。
- passed 只在 Codex 进程退出码为 0 且 Gateway 证据恰有一次 public_read 的 ALLOW 时为 true；它与 Hook 结论分开。checks 分别报告进程、Gateway、PreToolUse 探针拒绝、拒绝标记和探针是否到达 Gateway。状态为 GATEWAY_AND_HOOK_CONFIRMED、GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE，或 Gateway 条件不满足时 CONNECTION_FAILED。非零 CLI 退出会报错，不返回状态对象。
- 返回对象还包括 agent: codex、version、protectedHost、evidence.gatewayCallbacks、evidence.protectedHost、evidence.hookToolNames、persistentConfigModified: false 和 temporaryMcpApproval。protectedHost 仅在这个临时 first-party MCP host 的固定文件正向控制实际通过后才报告 FIXED_TEMP_FILE_READ_CONFIRMED；否则保持 UNKNOWN 并给出阻塞原因。nativeToolsProtection 恒为 OUT_OF_SCOPE；临时服务器的审批只用于本次固定只读探针。GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE 绝不等于 Hook 保护。
- limits 仅包含对所有运行结果成立的窄范围说明，不随 Hook 成败变化。Hook 状态由 status 和逐项 checks 表示；limits 不得声称本次探针未拦截或证明任意宿主路径受到保护。

## 5. 协作边界

- M3 是上述宿主发现、Agent Integration 和接入 CLI 的接口 owner。对这些调用形状、返回字段、状态或错误语义的变更，由 M3 先更新本文件和对应实现/测试。
- M0 的共享契约文件只保留跨模块摘要；其他模块通过适配层消费这些接口，不在其 PR 中复制或修改本文件。
- 当前 Codex 向导、隔离自检结果及所有兼容性声明均不得覆盖 NOT_VERIFIED / OUT_OF_SCOPE 限制。真实 Claude、Cursor、Cline 端到端兼容、Windows 发布命令和原生工具保护均需独立证据。
- M5 strict real-path execution remains fail closed unless a trusted host can bind execution to the checked resource identity. M3's connection-check MCP uses the public `@dorianchn/agent-canary/gateway-adapter` facade and a trusted M5 router factory; its exact-source positive and negative controls are maintained by M9. The Console has a fixed temporary probe action and a built-in trusted bootstrap that lazily self-imports only the public M1/M5 `./sdk` and M2 `./gateway-adapter` subpaths. The M3-only package does not yet expose M2's subpath, so its ordinary CLI path returns sanitized `UNKNOWN` before creating the probe file or Gateway. The self-package import is not accepted as proof of owner composition: M9 must validate the integrated exact owner sources. No private-source import, generic path fallback, or strict-mode opt-out is part of this M3 contract. Native Codex tool coverage remains `OUT_OF_SCOPE`.

## 6. Console fixed-probe action — implemented, product gate pending

`POST /api/security-center/protected-read` is a fixed synthetic probe action.
The existing `GET /api/security-center` remains status-only and never runs file
I/O. The action does not read a user-selected path and does not prove protection
of a Desktop/native host.

### Request and response

- Method/path: `POST /api/security-center/protected-read`.
- The request must pass the Console's existing same-origin and CSRF checks and
  its configured operator check. The operator code is supplied only through
  `x-canary-operator-code` and compared with the existing constant-time check;
  it is never accepted in the body. If no operator code was configured, reject
  with HTTP 403 before creating a file, directory, Gateway, or adapter.
- The JSON body must be exactly `{}`. It has no path, tool, workspace, or other
  caller-controlled fields. Any extra field, including a path alias, is
  rejected before probe dispatch.
- The built-in bootstrap loads the M1 Gateway factory and M5 strict-router
  factory from the package's public `./sdk` subpath and the M2 public facade
  from `./gateway-adapter`; no HTTP data, environment value, or model response
  selects these dependencies. M3 does not use its own branch's SDK as a
  substitute for missing M1/M5 owner behavior. The M2 facade is preflighted
  before creating one process-owned temporary directory and fixed marker file.
  The resolved directory is contained under the resolved OS temp
  root and both created objects are identity-checked. The fixed M1/M2/M5 route
  uses the opaque held-file capability and M5 `OBSERVE` with strict real-path
  checks. Missing package subpaths/APIs, setup errors, dispatch
  errors without an explicit owner `DENY`, and unknown outcomes return
  `UNKNOWN`; there is no direct filesystem-read fallback.
- `ALLOW` requires the owner route to return the exact fixed marker. A result
  that claims ALLOW without an exact marker match is `UNKNOWN` with the fixed
  reason `integrity_mismatch`. Only an explicit M1 or M5 `DENY` is reported as
  `DENY`; other failures remain `UNKNOWN`.
- The action response contains only
  `{scope: "M3_FIXED_TEMP_PROBE_ONLY", status, reason, markerMatched}` where
  status is `ALLOW | DENY | UNKNOWN` and reason is a fixed enum. It never
  returns a path, file bytes, exception text, Gateway evidence, or adapter
  object. Wrong/missing operator authorization or an invalid body is rejected
  before probe work with a fixed HTTP error and the same sanitized envelope
  using `UNKNOWN` plus a fixed authorization/request reason. Probe `DENY` is
  reserved for an explicit M1/M5 `DENY` result.
- After the action, close the Gateway first. Remove only the exact
  process-created temporary directory after rechecking temp-root containment,
  its real path, and the identities of the expected probe objects. Do not
  recurse into or remove unexpected/replaced objects. A cleanup failure
  changes the result to `UNKNOWN` with a fixed reason.

### Current package gate and acceptance criteria

M1 PR #43 publishes the Gateway factory and held-file methods through `./sdk`;
M2 PR #37 publishes `./gateway-adapter`; M5 PR #47 publishes
`createSecurityToolRouter` through `./sdk`. The ordinary `ai console` CLI
passes its port and host-local secrets to `startAIConsole`; the route's
built-in bootstrap resolves these public subpaths without caller input. On the
M3-only exact head the M2 subpath is absent, so the route returns `UNKNOWN`
before creating probe filesystem state, a Gateway, or a router callback. The
optional injected dependency loader remains an M3 test/composition seam; it
does not count as exact-source integration evidence. M9 must compose the exact
owner sources and test the ordinary no-injection Console route through these
public boundaries before any fixed-probe positive status is reported.

Acceptance must cover the authorized exact-marker positive control; missing
M1/M2/M5 component and unclassified-error `UNKNOWN`; explicit M1/M5 denial;
wrong-marker `INTEGRITY_MISMATCH`; wrong/missing operator code and CSRF with no
probe filesystem or Gateway work; extra-body/path-alias rejection with no
dispatch; and owner-composed symlink/junction alias plus same-path replacement
denials with zero M5 execution callback / M1 read evidence and unchanged
fixture bytes. The latter are controlled synthetic-fixture cases only. M4 may
label a successful result only as a “fixed synthetic probe”; Issue #52 and
product arbitrary-file / symlink-junction protection remain `OPEN / P0 /
NOT_VERIFIED` until the real product-host configuration and attacker-controlled
alias acceptance run succeeds.
