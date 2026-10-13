# M3 宿主接入实现与验证报告

日期：2026-10-13

工作区：`agents/M3-onboarding`

分支：`feature/ac3-agent-onboarding`

## 结论

Codex 项目级 MCP 配置向导、检测、预览、备份/收据、保守回滚和真实 Codex CLI 自检已实现。真实 Codex 工具调用已通过 Agent Canary Gateway 测试桥并留下 `ALLOW` 证据。本次 Hook 探针没有被拦截，必须标为未生效。当前接入项只添加 Agent Canary 自身的 decoy MCP，不能据此声称 Codex 原生工具已经受保护。

## M0 公共接口契约

引用的活动 M0 thread 无法通过当前工具读取（没有 `read_thread` 能力）。我只读检查了本机 `coordinator` M0 工作区的 `docs/3.0/API_CONTRACTS.md`，其分支为 `feature/ac3-m0-coordination`，契约文件提交为 `60d7ff0`，文中说明该契约基于 AC3 源码快照 `62496d4`。契约要求保留既有 CLI/MCP/SDK 行为；Agent Integration 仍按 `previewAgentIntegration`、`baseHash`、`installAgentIntegration`、`restoreAgentIntegration` 工作，回滚不得覆盖安装后的用户编辑；模块 Draft PR 指向 `feature/agent-canary-3.0`，并写入 `Test-Evidence:`、`API-Contract-Change: yes|no`。

本分支保留现有 SDK 公共导出、方法参数和返回字段；新增 CLI 子命令是 M3 的增量入口，receipt 事务 helper 没有加入 `package.json` 的 SDK export map。没有修改 `src/sdk.ts`。原 M3 分支基于 main `146be17`，AC3 目标为 `62496d4`，共同祖先为 `73cfdf9`；本次不自动 rebase，手工 cherry-pick M3 提交到临时迁移分支并保留原提交备份，以满足 M0 的基线迁移检查。PR 正文记录该 merge-base 与验证证据；公共 ABI 变更仍交由 M0。

## 基线能力审计

| 面 | 原有能力与限制 | M3 结论 |
|---|---|---|
| CLI | `serve --stdio` 只提供 decoy；`doctor` 只做离线自检；原 `integrate` 可预览/写入配置，但写入本身不验证保护。 | 新增 `onboard` 和 `connect-check`。安装报告和自检分别记录“配置写入”与“真实 Gateway 调用”；旧 Cline 项目相对路径与官方位置不符，现已拒绝该路径写入。 |
| SDK | `createTrustedExecutionGateway` 需要可信宿主传入资源、固定能力和 `mcpTools` callback；不接管第三方客户端已有能力。 | SDK 公共 exports/signatures 未改变。 |
| Protected MCP | 现有 `serveProtectedMCP` 使用 `createSecurityToolRouter` 处理显式登记工具；不能仅凭名称视为 `createTrustedExecutionGateway`。 | 额外的临时 Codex 检查服务器直接把 MCP `tools/call` 转到 `createTrustedExecutionGateway.agent.dispatch`，证据记录 `ALLOW`。服务器只返回内存中的固定文本。 |
| Hook | 仓库已有 `decideAgentHook` 仅针对 Claude/Cursor 协议输入，并未写入宿主配置；Codex 原生工具覆盖不等于 Gateway 接管。 | Codex Hook 没有安装。真实临时 Hook 探针未触发并且探针到达 Gateway，因此状态为未生效；未将其宣传为保护。 |

## 本轮实现

- 宿主检测：从 PATH 识别 Codex、Claude Code、Cursor、Cline CLI 并读取可执行版本，报告公开配置位置；Cline 另识别 VS Code 扩展目录。只有配置文件不等于宿主已安装；配置读取只返回路径和 Hook 状态，不返回任何配置值。
- Codex 向导：默认预览；交互确认或 `--apply` 才能写入。只追加独立 MCP 表，不重写原 TOML。用户级/项目级同名项均停止处理。
- 预检：检查宿主 CLI、Node 版本、项目目录、全局冲突、TOML 格式、目标写权限可达性和基线哈希。路径/权限/配置错误会给出不改配置的说明。
- 事务：先创建项目外备份和回滚收据，再提交配置；配置哈希变化时终止。回滚只在完整安装后哈希仍匹配时恢复；之后用户编辑会保留。
- 输出范围：接入结果标注 `MCP_DECOY_INSTALLED` / `protectionStatus: NOT_VERIFIED`，并明确原生 Codex 工具 `OUT_OF_SCOPE`。旧 `integrate --agent cline` 会停止并提示路径不受支持。
- Windows 文件 mode 不等于 NTFS ACL。备份放在用户目录，但 Windows ACL 未由此实现验证，报告和向导已明确标注。

## 本机检测

- 检测到 Codex CLI：`codex-cli 0.162.0-alpha.17.2`。
- Claude CLI 未检测到；存在配置文件，所以仅分类为 `configuration-only`。
- 未检测到 Cursor 或 Cline CLI/扩展。
- 用户 Codex 配置只做只读的 section/conflict 检查；本次没有写入或输出其中的值。

## 真实 Codex 运行结果

自检通过临时配置调用已安装 Codex CLI，设置 `--ignore-user-config`、`--ephemeral`，工作目录在临时目录；服务器只暴露固定只读合成工具。审批模式 `approve` 仅对临时测试服务器生效，以适配 `codex exec` 的无交互审批策略，不会写入任何用户或项目配置。

| 检查 | 结果 | 证据 |
|---|---|---|
| Codex MCP 发现并调用 `public_read` | **通过** | CLI 事件显示 `server=agent_canary_m3`, `tool=public_read`, `status=completed`。 |
| Trusted Execution Gateway | **通过** | MCP 请求进入 `createTrustedExecutionGateway.agent.dispatch`，测试回调返回 `AGENT_CANARY_GATEWAY_CONNECTION_OK`，Gateway evidence 含 `decision=ALLOW`；无文件/网络/命令副作用。 |
| Codex `PreToolUse` Hook 拦截 `hook_probe` | **未生效** | Hook trace 为空；探针成功抵达 Gateway 并返回 `AGENT_CANARY_HOOK_WAS_NOT_EFFECTIVE`。不计为 Hook 保护。 |
| 永久用户配置写入 | **未发生** | 测试使用 CLI 临时 override，用户级和项目级 Codex 配置均未写入。 |
| 原生 Codex 工具覆盖 | **未覆盖** | 不属于本 MCP Gateway 测试服务器的工具均为 `OUT_OF_SCOPE`。 |

第一次 CLI 尝试因 `--ask-for-approval` 参数位置不适用于 `codex exec` 而停止，已按本机 CLI `--help` 修正。第二次实际模型回合发现 MCP 工具，但无交互审批策略拒绝调用，回调未运行。第三次测试曾带 Hook trust bypass，故不作为 Hook 结果证据；它只说明临时 per-server `default_tools_approval_mode="approve"` 能让合成测试服务器被调用。本次用已更新的 `connect-check` 再运行，没有 Hook trust bypass：Codex 仍实际调用 `public_read` 与 `hook_probe`，Gateway `ALLOW` 可见，但 Hook trace 为空、探针到达 Gateway。因而当前验证结果是 Gateway 通过、Hook 未生效。

## 自动化验证

| 命令 | 结果 |
|---|---|
| `npm ci` | 通过，103 个包审计，0 vulnerabilities。 |
| `node --import tsx --test test/onboarding.test.ts` | 11 项通过（包含在完整测试套件中）。 |
| `npm test` | 通过：111 项通过，0 失败。 |
| `npm run build` | 通过。 |
| `npm run self-test -- --json` | 通过：4 项自检通过。 |
| `npm run types:check` | 通过：SDK consumer type checks verified。 |
| `node reproduction-kit/run-offline-demo.mjs --root=.` | 通过：`VERIFIED_BOUNDED_OPERATOR_DEMO`，6 个场景；该脚本明确将 E4 标为 `NOT_VERIFIED_NO_EXTERNAL_OPERATOR`。结果文件留在临时目录。 |
| `npm run pack:check` | 通过：npm 包 smoke check，78 个文件。 |
| `node dist/competition.js onboard --project . --json` | 通过：只输出检测/预览、目标路径和哈希；`PREVIEW_ONLY`，未写入项目或用户 Codex 配置。 |
| `node dist/competition.js connect-check` | 通过：真实 Codex CLI `0.162.0-alpha.17.2` 的只读合成 MCP 调用经 Gateway 并记录 `ALLOW`；Hook 未触发；原生工具 `OUT_OF_SCOPE`；持久配置未修改。 |
| `npm run verify` | 需在 AC3 基线迁移完成后更新。 |

### Windows manifest 校验失败原因

主分支 `package.json` 的 `verify` 会调用 community manifest verifier；当前 M0 AC3 基线的 `verify` 只运行 build/test/pack check。此前在主分支开发工作区单独运行原始字节校验器时报告 181 项中有 104 项不匹配：未修改的 `README.md` 工作树哈希为 `739e81b…`，Git blob 和 manifest 均为 `c4b78bf…`，且 `git diff --quiet -- README.md` 为 clean，确认其中包含 Windows CRLF 基线误报；本分支改动的 manifest 覆盖源文件和生成物也需要维护者更新摘要。这里记录此前的主分支检查，不将其误报成 AC3 基线的 `npm run verify` 结果。

## 未完成/不可确认项

- M0 活动 thread 无法由本会话读取；M0 契约文件已从本地 coordinator 分支只读核对。PR 按其 AC3 base 和证据字段提交，SDK 导出/签名保持不变。
- 本机没有 Claude Code、Cursor、Cline 的实际安装，未进行这些宿主的真实工具调用测试。
- Codex Hook 临时实测没有生效；尚无可用于证明 Hook 在 Agent Canary 安装后真实拦截的证据。
- 当前 Codex 安装配置连接的是 decoy 服务，不会接管 Codex 内建工具。需要可信宿主按 SDK 契约注册真实 callbacks，才能将那些回调纳入 Gateway。
