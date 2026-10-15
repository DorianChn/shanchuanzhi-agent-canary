# M3 宿主接入实现与验证报告

日期：2026-10-13

工作区：`agents/M3-onboarding`

分支：`feature/ac3-agent-onboarding`

## 结论

Codex 项目级 MCP 配置向导、检测、预览、备份/收据、保守回滚和真实 Codex CLI 自检已实现。真实 Codex 工具调用已通过 Agent Canary Gateway 测试桥并留下 `ALLOW` 证据。本次 Hook 探针没有被拦截，必须标为未生效。当前接入项只添加 Agent Canary 自身的 decoy MCP，不能据此声称 Codex 原生工具已经受保护。

## M0 公共接口契约

引用的活动 M0 thread 无法通过当前工具读取（没有 `read_thread` 能力）。我只读检查了本机 `coordinator` M0 工作区的 `docs/3.0/API_CONTRACTS.md`，其分支为 `feature/ac3-m0-coordination`，契约文件提交为 `60d7ff0`，文中说明该契约基于 AC3 源码快照 `62496d4`。契约要求保留既有 CLI/MCP/SDK 行为；Agent Integration 仍按 `previewAgentIntegration`、`baseHash`、`installAgentIntegration`、`restoreAgentIntegration` 工作，回滚不得覆盖安装后的用户编辑；模块 Draft PR 指向 `feature/agent-canary-3.0`，并写入 `Test-Evidence:`、`API-Contract-Change: yes|no`。

本分支保留现有 SDK 公共导出、方法参数和返回字段；新增 CLI 子命令是 M3 的增量入口，receipt 事务 helper 没有加入 `package.json` 的 SDK export map。没有修改 `src/sdk.ts`。原 M3 分支基于 main `146be17`，AC3 目标为 `62496d4`，共同祖先为 `73cfdf9`；本次不自动 rebase，手工 cherry-pick M3 提交到独立迁移分支并保留原提交备份。迁移后 HEAD 以 AC3 目标为父提交；PR 正文记录该 merge-base、`Test-Evidence:` 和 `API-Contract-Change: no`。公共 ABI 变更仍交由 M0。

## 基线能力审计

| 面 | 原有能力与限制 | M3 结论 |
|---|---|---|
| CLI | `serve --stdio` 只提供 decoy；`doctor` 只做离线自检；原 `integrate` 可预览/写入配置，但写入本身不验证保护。 | 新增 `onboard` 和 `connect-check`。安装报告和自检分别记录“配置写入”与“真实 Gateway 调用”；旧 `integrate --agent cline` 的项目相对路径与官方位置不符，CLI 现拒绝该宿主，同时保留底层旧函数形状。 |
| SDK | `createTrustedExecutionGateway` 需要可信宿主传入资源、固定能力和 `mcpTools` callback；不接管第三方客户端已有能力。 | SDK 公共 exports/signatures 未改变。 |
| Protected MCP | 现有 `serveProtectedMCP` 使用 `createSecurityToolRouter` 处理显式登记工具；不能仅凭名称视为 `createTrustedExecutionGateway`。 | 额外的临时 Codex 检查服务器直接把 MCP `tools/call` 转到 `createTrustedExecutionGateway.agent.dispatch`，证据记录 `ALLOW`。服务器只返回内存中的固定文本。 |
| Hook | 仓库已有 `decideAgentHook` 仅针对 Claude/Cursor 协议输入，并未写入宿主配置；Codex 原生工具覆盖不等于 Gateway 接管。 | Codex Hook 没有安装。真实临时 Hook 探针未触发并且探针到达 Gateway，因此状态为未生效；未将其宣传为保护。 |

## 本轮实现

- 宿主检测：从 PATH 识别 Codex、Claude Code、Cursor、Cline CLI 并读取可执行版本，报告公开配置位置；Cline 另识别 VS Code 扩展目录。只有配置文件不等于宿主已安装；配置读取只返回路径和 Hook 状态，不返回任何配置值。
- Codex 向导：默认预览；交互确认或 `--apply` 才能写入。只追加独立 MCP 表，不重写原 TOML。用户级/项目级同名项均停止处理。
- 预检：检查宿主 CLI、Node 版本、项目目录、全局冲突、TOML 格式、目标写权限可达性和基线哈希。路径/权限/配置错误会给出不改配置的说明。
- 事务：先创建项目外备份和回滚收据，再提交配置；配置哈希变化时终止。回滚只在完整安装后哈希仍匹配时恢复；之后用户编辑会保留。
- 输出范围：接入结果标注 `MCP_DECOY_INSTALLED` / `protectionStatus: NOT_VERIFIED`，并明确原生 Codex 工具 `OUT_OF_SCOPE`。旧 `integrate --agent cline` 会停止并提示路径不受支持，既有底层集成函数保持兼容。
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
| `npm ci` | 通过，102 个包审计，0 vulnerabilities。 |
| `node --import tsx --test test/onboarding.test.ts` | 12 项通过。含配置保留、冲突/路径拒绝、回滚和真实 CLI 临时项目写入/恢复。 |
| `npm run verify` | 通过：build 成功，338 项中 333 通过、5 项平台条件跳过、0 失败；package smoke check 通过（96 个文件）。 |
| `node dist/competition.js onboard --project . --json` | 通过：只输出检测/预览、目标路径和哈希；`PREVIEW_ONLY`，未写入项目或用户 Codex 配置。 |
| 临时项目 CLI `onboard --apply --json` / `onboard --restore` | 通过：输出单个 JSON 事务结果，创建外部备份/收据，再从收据恢复临时项目原状态；隔离 Codex 用户配置，测试后清理自建备份目录。 |
| `node dist/competition.js connect-check` | 通过：真实 Codex CLI `0.162.0-alpha.17.2` 的只读合成 MCP 调用经 Gateway 并记录 `ALLOW`；Hook 未触发；原生工具 `OUT_OF_SCOPE`；持久配置未修改。 |

## Issue #27：package.json 字段责任核对（2026-10-14）

M3 责任项已存在：`test/onboarding.test.ts` 文件存在，并由根 `package.json` 的 `scripts.test` 注册；PR #33 当前远端 head 与本地 `54facf027b32f3eef4a737e4cf51a3cbca9f4f63` 一致，PR 仍为 OPEN/Draft。M3 在共享 `scripts.test` 命令中的责任仅为保留 onboarding 测试路径，不需要再改写或重复追加该字段。

兼容性边界：M5 的 `exports["./policy"]` 可与现有 `exports["./sdk"]` 并列；M5/M6/M7 的测试路径需要并入同一个 `scripts.test` 列表，不能以各自分支的列表覆盖其他模块注册。M6 的 E4 脚本和 M7 的可靠性命令应使用各自唯一的新增 script key。只读核对的 M5、M6、M7 分支提交快照尚未包含 Issue #27 所列的这些新增字段，因此这段记录证明 M3 字段已就位，不代表四模块合并后的 manifest 已完成或通过 package-smoke；合并后的 manifest 与验证仍待 M0/模块所有者协调。

核对范围：本工作区 `package.json` 与 `test/onboarding.test.ts`；M5 `bcbec98`、M6 `d513810`、M7 `6d978a5` 的已提交 `package.json` 快照；PR #33 元数据。未读取或改动 M6 工作区 artifacts，未修改任何其他模块文件。

## 未完成/不可确认项

- M0 活动 thread 无法由本会话读取；M0 契约文件已从本地 coordinator 分支只读核对。PR 按其 AC3 base 和证据字段提交，SDK 导出/签名保持不变。
- 本机没有 Claude Code、Cursor、Cline 的实际安装，未进行这些宿主的真实工具调用测试。
- Codex Hook 临时实测没有生效；尚无可用于证明 Hook 在 Agent Canary 安装后真实拦截的证据。
- 当前 Codex 安装配置连接的是 decoy 服务，不会接管 Codex 内建工具。需要可信宿主按 SDK 契约注册真实 callbacks，才能将那些回调纳入 Gateway。

## 跨模块接口兼容性复核（2026-10-15）

复核时各模块 GitHub 分支精确快照：M3 `1829e0518d44879eb67e0fef0e256ca762e1e8fd`（PR #33 head），M1 `f14aab781c62db60ac241d2114f543f6cac223ae`，M2 `9db59ed8f2deae905edcb2179982f8bcb594167c`，M5 `b6a40b49f132decba97d269ff942d868fcef928f`。这些是各模块独立分支，不代表 M1/M2/M5 已集成到 M3 或主线。

| 契约 | M3 实际调用 | 兼容性与边界 |
|---|---|---|
| M1 Trusted Execution Gateway | `src/codex-connection-mcp.ts` 以精确工具 ID 构造 `mcpTools` 注册项，再调用 `gateway.agent.dispatch({name:'mcp_tool', args:{tool, arguments}})`。注册项使用 M1 形状 `{risk, approvalRequired, execute(args, signal)}`；M1 当前 `GatewayOptions` 与 `dispatch(ToolCall, signal?)` 保持兼容。 | 形状兼容；只用于两个固定合成回调。该临时服务未注册用户文件/命令能力，也不暴露 Gateway operator。M3 没有把该测试桥接成生产宿主。未运行 M3+M1 精确源码树的组合 CI。 |
| M2 执行隔离适配器 | M3 未导入或调用 M2 adapter/backend；`onboard` 仅写入启动 M3 decoy MCP 的项目配置（源码模式下为 `node dist/competition.js serve --stdio`）。 | 不存在 M3 到 M2 隔离 worker 的生产调用链。不得从“接入 MCP”推断 AppContainer、隔离执行或 Native Codex Shell 保护；Native Codex Shell 保持 `UNPROTECTED / NOT_VERIFIED`。 |
| M5 安全策略路由 | M3 自检服务器直接通过 M1 Gateway 路由固定 MCP 回调，不调用 M5 policy router。仓库中既有 Hook adapter 使用 `createSecurityToolRouter({verifyRealPaths:true, ...})` 并消费 `decide()` 的 `action`/`reason` 字段；M5 当前返回结构仍兼容该读取方式。 | M3 没有改 M5 API，也没有已接线的生产文件执行消费者。路径检查后由任意 host callback 按路径重新打开文件不等同于 M1 持有句柄的 Gateway 文件操作；生产宿主接线与 TOCTOU 防护均 `NOT_VERIFIED`。 |

M3 自身的状态映射、配置写入和报告继续区分 `MCP_DECOY_INSTALLED`、`GATEWAY_AND_HOOK_CONFIRMED`（仅临时探针）、`GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE` 与 `NOT_VERIFIED`。Hook 配置元数据不证明 Hook 实现可信、已被宿主加载或真实工具调用会执行它；Codex 原生 Shell、其他原生工具及其他 MCP 服务器始终 `OUT_OF_SCOPE`。本次兼容复核未发现可复现的 M3-owned 运行时 API 不一致，因此没有改动 M1/M2/M5 接口、降低拒绝行为或改写安全测试。

本次本地验证：`npm run build` 通过；`node --import tsx --test test/onboarding.test.ts test/codex-connection-check.test.ts test/agent-hook.test.ts` 为 25/25 通过；`git diff --check` 通过。没有启动真实 Codex/模型调用，也没有做宿主安装或 M3+M1 精确源码树组合 CI。
