# M3 宿主接入实现与验证报告

日期：2026-10-13

工作区：`agents/M3-onboarding`

分支：`feature/ac3-agent-onboarding`

## 结论

Codex 项目级 MCP 配置向导、检测、预览、备份/收据、保守回滚和真实 Codex CLI 自检已实现。真实 Codex CLI 在临时配置下调用了固定合成 MCP 工具；该测试桥内部使用 Agent Canary Gateway 并留下 `ALLOW` 证据。这只证明合成测试调用路径，不证明产品宿主回调已接线或受到保护。本次 Hook 探针没有被拦截，必须标为未生效。当前接入项只添加 Agent Canary 自身的 decoy MCP，不能据此声称 Codex 原生工具已经受保护。

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

## Issue #32 与 Issue #52：当前宿主接线核对（2026-10-21）

历史源码复核快照为 M3 `be3880298e1c6766024ecbce5f6dbc23c4d2daa1`；复核时 PR #33 也指向该 head，其 CI run `38706654588` 的 9 项检查均通过。模块对照快照：M1 PR #43 `5e9e22d3feb4c3be4d4e7e50e0b34ec5a8803c96`，M2 PR #37 `29386c312fd52d52e888c4633a1fef34ead69c09`，M5 PR #47 `e3662e9ca7363504eea7dd5e3262352018519a56`。这些是历史独立 PR 快照，不代表其代码已合并进 M3；该 M3 状态已被下文记录的 PR #33 exact head `9841bd8…` 取代。

### Issue #32 的 M3 修复状态

M3 的 `test/agent-hook.test.ts` 已在既有提交 `f9bd818` 使用异步 marker wait、确认子进程越过 wrapper timeout 后再中断，并检查进程终止、无 spawn error、stdout/stderr 为空及没有 decision log。Issue #32 记录了 M1 对等价 marker-wait/interruption 测试形状的接受，并已关闭该合成子进程时序回归。此测试不观察真实宿主回调；`native-host callback` 仍为 `NOT_VERIFIED`。本次没有重复覆盖该测试或改动其断言。

### M3 产品入口与 M1/M2/M5 调用链

> 历史快照：以下入口审计反映 2026-10-21 的实现。其“没有 M3 到 M2/M5 的 Host probe 调用链”结论已被本文末尾“P0 #52 fixed-path Host probe/status”记录取代；Hook 与原生工具保护边界仍然有效。

- `package.json` 的 `agent-canary` bin 指向 `dist/index.js`，构建为 `tsc`。M3 向导生成的项目 MCP 入口为 `node dist/competition.js serve --stdio`；`src/competition.ts` 调用 `src/server.ts` 的 decoy MCP handler，工具表来自 `DECOY_TOOLS`，调用由 `handleDecoyCall` 处理。此 Codex 接入入口不导入 M2 adapter，也不创建或消费 M1 Gateway capability。
- 独立的内置演示入口 `agent-canary ai console`（`package.json` 的 `ai:console` 指向 `node dist/index.js ai console`）会从 `src/ai/console.ts` 创建 `src/runtime/demo.ts`。该 demo 直接创建 M1 `createTrustedExecutionGateway`，经 `runtime.agent.dispatch` 执行固定的读/写调用，目标为 `HoneypotRuntime` 创建的临时演示文件；不经过 M2 adapter。它证明内置隔离 demo 调用 Gateway，不是外部 Agent 宿主 callback、用户 workspace 文件或 Codex 原生工具已受保护的证据。Console 中 Agent 配置演示也使用隔离的临时项目。
- `connect-check` 确实运行已安装 Codex CLI，但使用临时、ephemeral 配置与独立的 `dist/codex-connection-mcp.js`。该测试服务器直接创建 M1 `createTrustedExecutionGateway`，登记固定 `public_read`/`hook_probe` 合成回调，且 `files: []`；它没有调用 M2 adapter，也不消费用户文件、原生 Codex callback 或项目刚安装的配置。因此 `ALLOW` 仅是该合成路径证据。
- `detectAgentHosts` 只报告 CLI/configuration/Hook 元数据。M3 `src/agent-hook.ts` 的 Hook adapter 使用 M5 `createSecurityToolRouter({verifyRealPaths:true})`，其 `executeRealTool` 为 `HOOK_NEVER_EXECUTES`；它不是产品宿主 callback dispatcher，也不能证明真实宿主已安装或加载该 Hook。
- M2 当前 `createSecurityGatewayAdapter(gateway, fixedFileReads)` 绑定精确 tool ID 与相对路径白名单，随后以 `{name:'read_file', args:{path}}` 及 `AbortSignal` 调用 `gateway.agent.dispatch`。它向 M1 传递的是路径字符串；M1 Gateway 可在其自身注册资源映射中再验证并使用已持有文件句柄。Codex onboarding/self-test 未消费此 adapter；AI Console 则直接创建独立 M1 Gateway 供临时演示使用。当前已识别的 M3 first-party 调用点都没有调用 M2 adapter。
- M5 `verifyRealPaths:true` 的 router contract 明确要求文件执行绑定到已检查文件身份；其通用 `executeRealTool(call, {signal})` 形状不携带一个可由 router 验证的 M1 资源身份。由当前接口形状可知，M2 的 path-string callback 不能单独证明 strict execution binding。把 `verifyRealPaths` 关闭会退回词法路径行为；增加通用 path fallback 会绕过该 fail-closed 边界，两者均不采用。

### M3 处置及剩余 owner 决策

M3 尚无经真实宿主工具调用验证的产品 callback 入口（`NOT_VERIFIED`），当前也没有安全的 M3-only 外部宿主适配点：Codex 向导启动的是 decoy 服务，Codex 自检是 `files:[]` 的合成 Gateway 测试服务器；AI Console 是单独的隔离演示，直接使用 M1 Gateway 操作临时 fixture，但不接管外部宿主 callback。已识别的 M3 first-party 调用点没有消费 M2 adapter。PR #33 的 `9841bd8` 已修改 M1-owned `src/agent-hook.ts` 与 `test/agent-hook.test.ts`，M1 owner review pending；本次宿主入口审计未改 M2/M5 API，不复制 M2 adapter、不关闭 strict mode，也不把内置演示或自检标成外部宿主保护。`Codex native shell` 仍为 `OUT_OF_SCOPE / UNPROTECTED`；安装配置、Hook 元数据、MCP Gateway 自检均不改变此状态。

若要把外部宿主文件 callback 接入 M5 strict router，继续实现前需要：M1 定义可由消费方验证的 host/resource identity 或等价的 held-resource capability 契约；M5 owner 确认 strict router 如何消费该能力并维持路径替换/别名时 fail closed；M2 提供与该能力兼容的 adapter/backend 调用形状；M3 再接入真实 first-party host callback，并以实际宿主调用验证。M0 负责确认跨模块契约与验收基线。AI Console 的直接 M1 临时演示路径不解决该外部宿主接线缺口。产品宿主 callback 与原生工具保护维持 `NOT_VERIFIED`。

本次本地验证（源码无运行时代码修改）：`npm ci --no-audit --no-fund` 在 M3 worktree 按 lockfile 安装 102 个包；`npm run build` 通过；`node --import tsx --test test/agent-hook.test.ts` 为 11/11 通过；`node --import tsx --test test/agent-integrations.test.ts test/onboarding.test.ts test/codex-connection-check.test.ts` 为 25/25 通过；`git diff --check` 通过。未运行真实 Codex/模型调用，未编辑其他模块 worktree，未推送。

## Issue #55：native file Hook fail-closed 对齐（2026-10-21）

M3 `decideAgentHook` 对 native `Read`/`Write`/`Delete` 在没有 M1 held-file capability 时返回 `deny` 与 `native_file_execution_not_pinned`；更具体的既有策略硬拒绝仍保留。M3 Hook 输入不承载该 capability，因此原生 Hook 不可因 lexical/realpath workspace 路径而直接放行。测试另以 M1 Gateway 登记并持有临时 `normal.txt`，验证受支持的 `read_file` capability 仍 `ALLOW`，与 unpinned native Hook 拒绝分开。

此前针对 PR #33 `9841bd8` 快照的本地验证为 `npm run build` 通过、`node --import tsx --test test/agent-hook.test.ts test/gateway.test.ts` 34/34 通过；exact-head CI run `39504984014` 为 9/9 通过。当前 PR #33 exact head 为 `5ef54c19f5fd04360dcd898cea8d3eaf33341539`；M1 对 `9841bd8..5ef54c1` 的 owner review 为 ACCEPT（Issue #64 comment `6304451949`），当前 exact-head CI run `39517509901` 通过。本次 M3-owned contract test 在该 head 上的定向回归为 15/15，`npm run build` 通过。M9 run `38727481764` 固定 M1 `b1d7423` 与旧 M3 `be38802`，没有验证当前 head；M9 仍需对 `5ef54c1` 重跑 Ubuntu/Windows exact-source composition checks。上述均为合成函数、子进程与临时文件验证，不证明真实宿主 callback 或原生 I/O 已受保护；M9 composition checks 仍未完成。

### M9 run 38727481764：历史 exact-pin failure 与 owner 边界（2026-10-21）

M9 PR #36 head 为 `de3799aae540f58173acec4ab3f7a1fe98593aa7`。该 run 的 composition fixture pin 了 M1 `b1d7423e70f2d47f43a5ec42e63a650ff93f6dcc` 和 M3 `be3880298e1c6766024ecbce5f5dbc23c4d2daa1`。GitHub run logs 显示 Ubuntu 与 Windows 均在 `M3 native Hook denies an unpinned normal Read like the current M1 Hook` 失败：M1 返回 `deny`，M3 返回 `allow`（期望 `deny`、实际 `allow`），失败点为 `test/m9-cross-module-composition.test.mjs:101`。这准确记录了旧 M3 pin 的决策不一致。

该 M9 子测试只在临时 workspace 写入 `M9_SYNTHETIC_UNPINNED_READ_FIXTURE`，并调用 M1/M3 Hook decision functions 比较返回值；没有执行真实宿主文件 callback 或读取用户文件。因此该 run 没有证明发生真实数据暴露，也不能据此推断发生过用户数据读取。

版本边界：上述失败针对 M9 固定的 M3 `be388…`，不能代表当前 M3 PR head。PR #33 当前 head 为 `5ef54c19f5fd04360dcd898cea8d3eaf33341539`；M1 对评审范围 `9841bd8..5ef54c1` 为 ACCEPT（Issue #64 comment `6304451949`），exact-head CI run `39517509901` 通过。该 head 的 M3-owned focused regression 为 15/15，build 通过。旧 M9 run `38727481764` 没有测试此 head；M9 owner 仍需 pin 此 exact ref 并重跑 Ubuntu/Windows composition。

M0 ownership 表将 Hook 语义与规范断言归 M1。PR #33 exact head `5ef54c19f5fd04360dcd898cea8d3eaf33341539` 的 changed-file 范围包含 M1-owned `src/agent-hook.ts` 与 `test/agent-hook.test.ts` 及 M3 文件；M1 对 `9841bd8..5ef54c1` 的 disposition 为 ACCEPT（Issue #64 comment `6304451949`）。本次仅更正 M3 报告，未写入 Hook 实现/测试。真实宿主 Hook 生效与原生 I/O 覆盖仍为 `NOT_VERIFIED`；M5 `verifyRealPaths:true` 保持 fail closed，未关闭 strict mode 或加入通用路径回退。#55 保持开启，等待 M9 exact-source Ubuntu/Windows composition checks 通过。

## 2026-10-23 Console CLI protected-read bootstrap recheck

M3 worktree `feature/ac3-agent-onboarding` was clean at
`c7b7772c9d62e138e1cc6deed7c43104eaccafa6`. The ordinary
`src/ai/cli.ts` `ai console` action passes only port and process-local API / operator
secrets to `startAIConsole`; it has no explicit owner bootstrap. The Console's
fixed-temp action now lazily loads only package self-reference public subpaths:
M1 Gateway `@dorianchn/agent-canary/sdk`, M5 router
`@dorianchn/agent-canary/policy-router`, and M2
`@dorianchn/agent-canary/gateway-adapter`. It does not accept request, model,
environment, or browser-selected dependencies. CSRF, operator, and exact `{}`
checks still happen before this loader runs.

At M3 baseline `43d765ff1ed0986b90fe6123633e8bcd24e64e1d`, `package.json` exposes only `./sdk`; direct Node
self-references to M5 `./policy-router` and M2 `./gateway-adapter` fail with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. M5's new public-export candidate is owner
commit `8d1b832f46db363dd8ba5cdd7d573baa89e9a46d`, while GitHub PR #47 still
reported head `12b2499a1f7b8525f3bf2d7659249c1bd8e881ed` at this audit.
Consequently the normal default Console route returns sanitized
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` before temp probe creation, Gateway
construction, M5 router creation, or callback. The M3 regression asserts that
the legacy M3 SDK router is present but does not use it as an M5 fallback; it
checks the absent-owner-subpath result and verifies no probe directory remains.
This is fail-closed negative evidence only. The exact M1/M2/M5 candidate public
contracts are recorded in
`docs/3.0/M3_ISSUE52_PROTECTED_READ_STATUS.md`; M9 must test the default
no-injection route in the exact integrated package. M4's Desktop UI still does
not call this M3 route, and neither this synthetic temp probe nor M9's future
positive control may be described as arbitrary product-file or native-tool
protection. Issue #52 remains OPEN / P0 / NOT_VERIFIED.

## 2026-10-23 Security Center status-route read-only recheck

M3 baseline `b85c4ad4de92fdcdf48e65e664c149b9de347b4f` already contained the
exact `GET /api/security-center` handler. This update binds its provider type
to M2's `PublicM2HostAdapter.securityCenterStatusProvider` and isolates the
route in a snapshot-only fail-closed reader. With no explicit trusted M2
provider, it returns the static UNKNOWN snapshot. With one, it invokes it only
after same-origin and CSRF checks, passes no request values, and normalizes
only the returned snapshot. Provider exceptions produce UNKNOWN. The normal
`ai console` CLI still supplies no M2 provider, so its status remains UNKNOWN.

The added M3 regression verifies missing CSRF returns HTTP 403 without calling
the provider; a query/path parameter cannot select a resource or escape in the
404 response; the exact GET invokes the M2 snapshot once; and the protected-read
dependency loader remains untouched. Existing tests continue to cover UNKNOWN
defaults, status-field allowlisting, private path/argument/secret/content
redaction, provider failure, and getter avoidance. `npm run build` passed and
`node --import tsx --test test/security-center-route-m3.test.ts` passed 9/9.
This route reports status only; it does not establish product-host file
protection or positive protected-read evidence. Issue #52 remains OPEN / P0 /
NOT_VERIFIED pending M9's exact-source integration.

## 2026-10-23 Real package-composition boundary

The current M3 branch head is `47474e3ea71b8a3ab0f175a74e2970ee52150878`.
Its actual `package.json` identifies `@dorianchn/agent-canary@1.2.7` and exports
only `./sdk`. The exact M2 owner branch `db98c7d5d409aa390ef539c96a209d6daba8d793`
exports `./gateway-adapter` from
`execution-isolation/gateway-adapter/gateway-adapter.mjs`; exact M5 owner branch
`7fa47e8d82e4b92307a4429ea743931b4600ac90` exports `./policy-router` from its
typed `dist` entry. These are the same package name and version, and the M2/M5
targets are absent from the M3 checkout. Separate package aliases or guessed
exports would therefore misstate the published boundary and could create a
broken tarball.

`test/packaged-owner-consumer.test.mjs` builds a temporary manifest and copies
exact owner files to exercise cross-module behavior. Its cases are now named
and commented as **synthetic composition fixtures**; they are useful behavioral
tests, but are not evidence that the actual M3 package resolves those owner
exports. The standalone M3 package remains fail-closed when the M2 or M5
subpath is absent.

The M3-owned command `npm run check:integrated-package` runs
`scripts/check-integrated-package.mjs` against the actual checkout and its real
`npm pack` output. It requires `M1_ROOT`, `M2_ROOT`, and `M5_ROOT` to identify the
exact owner checkouts, compares the integrated subpath entries and target bytes
against each owner manifest, verifies the packed targets, then installs the
tarball offline and resolves/imports the three public subpaths. It never edits
the manifest or copies owner files. A missing export or any mismatch yields a
machine-readable `NOT_READY` report and a failing exit code; the current M3-only
checkout is expected to fail this integration gate until the package owners'
entries and files are present in the same integrated tree.

Final package acceptance needs: M1's exact `./sdk` owner entry and bytes; M2's
exact `./gateway-adapter` export and target; M5's exact `./policy-router` export,
target, and import closure; M3 to retain those owner entries in the single
package manifest and pack allowlist; and M9 to run this gate against the actual
integrated checkout/tarball. The owner export names, target paths, package
identity/version, and bytes must come from those manifests and checkouts, not
from a synthetic package. This gate checks package composition only; it does
not prove desktop-host or operating-system enforcement. Issue #52 remains
OPEN / P0 / NOT_VERIFIED.

On this exact M3 head, `M1_ROOT`, `M2_ROOT`, and `M5_ROOT` were set to the
current owner worktrees and `npm run check:integrated-package` ran the actual
M3 `npm pack`. It exited non-zero with `NOT_READY`: the real M3 package exposed
only `./sdk`, `./gateway-adapter` and `./policy-router` were absent, and the
M3-built `dist/sdk.d.ts` differed from M1's exact owner target. The actual M3
tarball listed 96 files. This records a real package-boundary failure; it is
not a successful composite-package check. The gate must be rerun after M1's
owner artifact and M2/M5 exports have been integrated into one checkout.
The existing `npm run pack:check` also passed for the standalone M3 package
(same 96-file tarball); that smoke check covers the current SDK/CLI surface only
and does not establish M2/M5 subpath availability.

## M3 normal-CLI Host probe and status boundary — 2026-10-24

This section supersedes earlier claims that the checked-out default Console
route completes a positive M1/M2/M5 probe. At the start of this follow-up, the
existing branch was `feature/ac3-agent-onboarding` at local report commit
`75388fd619da884e072b4c0e51167777e1dd295d`, based on public PR #90 head
`a49c0f796e4ab487de86089245cc1ea123a92b86`. The saved
`test/agent-hook.test.ts` delta in `stash@{0}` was left untouched; no shared Hook
path was edited.

M3's ordinary Console keeps the exact, empty-body,
`POST /api/security-center/protected-read` action behind origin, CSRF, and
operator checks. It creates only a process-owned temporary
`agent-canary-public.txt`, binds that exact registered file to M1, and asks
M2's public `createSecurityGatewayHostAdapter` to compose M5's public
`createSecurityToolRouter` with `mode: OBSERVE` and `verifyRealPaths: true`.
The result is reduced to the fixed scope/status/reason/marker fields. The
read-only `GET /api/security-center` route invokes only a trusted injected
snapshot provider, applies the existing allowlist sanitizer, and returns
UNKNOWN when the normal CLI has no provider. It never runs the POST probe.
Sanitized M2 status now preserves only the exact coverage value
`M2_FIXED_FILE_READS_ONLY`; paths, arguments, contents, hook state, and native
tool protection remain excluded or UNKNOWN.

The M3 adapter wrapper now requires M2's capability provider to expose the
owner-reviewed `readFileWithCapability(capability, call, signal?)` method.
It forwards those values unchanged through M5's strict router and counts only
that held-read provider invocation. It does not adapt or fall back to M2's
generic `executeRealTool` path callback. If the method is absent, composition
fails closed with internal adapter reason
`M2_CAPABILITY_PROVIDER_UNAVAILABLE` before a protected callback or M1 read
evidence can occur. The Console response keeps its existing fixed public reason
enum and returns sanitized `UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`; it does not
expose the internal adapter reason through HTTP.

The current M3 checkout does export `./gateway-adapter`, but the exact file
`execution-isolation/gateway-adapter/gateway-adapter.mjs` in that checkout
still supplies only `resolve` and `verify` on `fileReadCapability`. The M1-
reviewed M2 candidate is PR #91 head
`92dd42b900b10ce0294e9e3faa7e175d728228b3` (OPEN/Draft; M1 scoped ACCEPT in
Issue #91 comment `6374194267`); its patch adds the
missing provider method and routes it directly to M1's held-file read. That
candidate is not integrated into the current M3 package. M5 PR #94 remains
OPEN/Draft at `cca42cd1762f995e92454d55ffa5e63951e39144`; M3 continues to load
only the public `./policy-router` subpath and never substitutes its local
router if that export is unavailable. This is the precise blocker to a
successful normal-CLI positive probe on the current package snapshot.

The M3 contract fixture supplies the accepted M2 provider shape synthetically,
then exercises M3's wrapper with a real M1 Gateway and the package's M5 router.
It verifies a safe registered-read positive, a side-effect-free status query,
physical junction/symlink alias denial, and same-path identity replacement
denial before another held-read-provider invocation, generic callback, or M1
read-evidence event. The separate default-package test confirms the checked-out
M2 gap stays `UNKNOWN`; the Security Center GET regressions cover CSRF, exact
route handling, UNKNOWN defaults, and sanitized status filtering. The synthetic
contract fixture is not evidence that current M2 PR/package bytes are
integrated.

Local Windows validation for this M3 revision passed: `npm run build`;
`node --import tsx --test test/codex-connection-check.test.ts test/security-center-route-m3.test.ts`
(27/27); and `git diff --check`.

Issue #52 remains OPEN / P0 / NOT_VERIFIED. M4 is a read-only status consumer;
the default normal CLI currently supplies no M2 status provider, so its GET
status correctly remains UNKNOWN. No real product-host callback, native tool,
installer, M4 UI protection, or OS-atomic path/open transaction is verified.
M9 must pin the exact M1/M2/M3/M5 sources and pass its Ubuntu and Windows
composition checks before this P0 can advance.

### Exact-head CI follow-up — 2026-10-24

PR #90 run `40027402261` on exact head
`ed9f5b4e1cb27a09d217509671c31bd20430ceb6` failed on macOS Node 22 in the new
synthetic M2-contract test's cleanup hook. The test compared a `/var/...`
temporary path with macOS `realpath`'s `/private/var/...` spelling. This was a
test cleanup assertion, not a Host/capability decision failure. Ubuntu Node 20
and 22, Docker, sponsor smoke, and ownership-contract evidence passed; the
other matrix jobs were cancelled after the macOS failure.

Test-only commit `c462b29c65c47f385ccaabcb69b8bb8b0895085b` verifies the
temporary directory's device/inode identity and canonical containment before
cleanup, without comparing noncanonical path spellings. It is included in
public PR #90 head `606395eae6173384711afa1aafc5f71614b26ab9`. Exact-head main
workflow run `40028179680` passed all 9 jobs, including macOS, Ubuntu, and
Windows Node 20/22. A separate ownership-contract-evidence run
`40028487559` failed because the PR body used a `## Test-Evidence` heading
instead of the required `Test-Evidence:` metadata line; no code failure was
reported by that check.

Current local verification after the Console reason-enum correction and the
missing-M2-provider regression: `npm run build` PASS; the two focused files
PASS (27/27); `git diff --check` PASS. The public response remains within the
existing fixed enum, while internal M3 diagnostics retain the precise missing
M2 method. The ordinary CLI still lacks that method in its checked-out M2
adapter and therefore remains UNKNOWN. No M1/M2/M4/M5 owner file or shared M0
contract was changed.

Exact-head PR CI for `98a034fa2066cec18f833440cc51275c389681c6` completed:
workflow run `40031961789` passed 9/9 jobs (Docker, package smoke, sponsor
smoke, and macOS/Ubuntu/Windows Node 20/22); ownership-contract-evidence run
`40031991694` passed. This M3 branch CI does not replace M9's exact-source
M1/M2/M3/M5 Ubuntu/Windows composition gate. Issue #52 remains OPEN / P0 /
NOT_VERIFIED; M1 review of the host seam and M2/M5 package integration are
still pending.

### M9 ordinary-CLI composition failure — 2026-10-24

M9 run `40031324000` on M9 head `b72d54eb7daeef4765ffe854edf9733ee3ffd865`
checked out M3 `606395eae6173384711afa1aafc5f71614b26ab9`, M2 PR #91
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5 PR #94
`cca42cd1762f995e92454d55ffa5e63951e39144`. On both Ubuntu and Windows, M9
subtest 11, “M3 ordinary CLI passes only after its fixed protected-read and
replacement controls,” expected `PASS / FIXED_PROBE_CONTROLS_PASSED` but got
`UNKNOWN / M2_CAPABILITY_PROVIDER_UNAVAILABLE`. M9 subtests 16 and 17 pass when
the M3 adapter is directly composed with the packed exact M2 facade and M5
router, including alias denials.

The M9 CLI test resolves the public self-reference
`@dorianchn/agent-canary/gateway-adapter` under `M3_ROOT`. Its package path is
the same relative export path as M2's, but the checked-out target bytes differ:
M3 tree blob `7a05ed64300c6345222dff13a4e929a250646acc`; exact M2 candidate blob
`0d7053114e87177669ec2c3b416028e05affb62f`, which contains
`fileReadCapability.readFileWithCapability`. Thus the ordinary CLI reaches the
stale M2 copy in the M3 tree and correctly fails closed. M3 must not copy M2's
implementation, import its private source tree, or fall back to a generic path
callback. The next step is for the M9/package-composition owner to place the
exact M2 public export bytes at the M3 package export target, assert blob
identity, and rerun both hosts against current reviewed refs.

M9 run `40031324000` is not exact-current-M3 evidence because it pins M3
`606395e`; the current M3 head is `98a034fa2066cec18f833440cc51275c389681c6`.
The run also has an unrelated M8 candidate assertion failure. M9 wrapper runs
`40031323821` fail `npm audit --audit-level=high` for existing Hono,
ip-address, and zod advisories; M3 did not change those dependencies. Issue #52
remains OPEN / P0 / NOT_VERIFIED until the composition blocker is resolved and
M9 exact-source Ubuntu/Windows composition passes.

### Current-M3 exact-source M9 rerun — 2026-10-24

M9 PR #36 advanced to head `ebd7c7e2fdc049a8d9e0f07d93b89e8934c870d5` and
run `40032565764` now pins current M3 PR #90 head
`98a034fa2066cec18f833440cc51275c389681c6`, M2 PR #91
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5 PR #94
`cca42cd1762f995e92454d55ffa5e63951e39144`. The M3 ordinary-CLI subtest 11
still fails on both Ubuntu and Windows with response
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE` instead of the expected fixed-probe
PASS. The internal adapter reason remains
`M2_CAPABILITY_PROVIDER_UNAVAILABLE`; PR #90 `98a034f` keeps that internal
reason out of the fixed Console response enum.
This is now exact-current-M3 failure evidence, not only the earlier stale-pin
run. The M2 packed-adapter composition and alias-denial controls still pass;
the public-export target blob mismatch documented above remains the cause.

The same run has an independent M8 candidate test failure. Current wrapper
regression run `40032565853` still fails only its `npm audit --audit-level=high`
step on existing Hono, ip-address, and zod advisories. M3 does not own those
paths/dependencies. Issue #52 remains OPEN / P0 / NOT_VERIFIED until the M9
composition owner fixes the public package contents and the exact-current
Ubuntu/Windows run passes.

### Latest M9 completion — 2026-10-24

M9 PR #36 advanced to `80b721f02d5aa861654b89d3fd019b369caa3a39`; exact
composition run `40034276936` uses M3 code `98a034fa2066cec18f833440cc51275c389681c6`
(the subsequent M3 PR head `de12f31` is documentation-only), M2
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5
`cca42cd1762f995e92454d55ffa5e63951e39144`. M3 ordinary-CLI subtest 11 fails
on both Ubuntu and Windows. The actual HTTP result is
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`; the internal M3 reason is
`M2_CAPABILITY_PROVIDER_UNAVAILABLE`. Subtests 16 and 17 pass on both hosts
when the M3 adapter is composed directly with the packed exact M2 facade and
M5 router, including alias denial. The same run has a separate M8 candidate
subtest 10 failure.

M9 wrapper run `40034276939` fails the audit step on existing Hono,
ip-address, and zod advisories. PR #90 code checks remain passing; this M9
composition result leaves Issue #52 OPEN / P0 / NOT_VERIFIED pending exact M2
public-export bytes in the M3 package target and a passing exact-source rerun.

### Exact-current-PR M9 rerun — 2026-10-24

M9 PR #36 advanced to `405a4fbbbe41a192f2dad8a8e52c246ed5c7bc2e`; run
`40035799661` pins current M3 PR #90 head
`10d488336ce8873f7eeade59064f6601f468e126`, M2 PR #91
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M5 PR #94
`cca42cd1762f995e92454d55ffa5e63951e39144`. The M3 ordinary-CLI subtest 11
fails on both Ubuntu and Windows. Its actual HTTP result is
`UNKNOWN / OWNER_ADAPTER_UNAVAILABLE`; the internal M3 adapter reason is
`M2_CAPABILITY_PROVIDER_UNAVAILABLE`. Direct packed exact-M2/M5 composition
subtests 16/17 pass on both hosts, including alias denial; the public export
target blob mismatch remains. A separate M8 subtest 10 fails in the same run.

M9 wrapper run `40035799522` fails its audit step on existing Hono,
ip-address, and zod advisories. M3 PR checks pass; Issue #52 stays OPEN / P0 /
NOT_VERIFIED until M9/package composition aligns the M2 bytes and reruns the
exact-source Ubuntu/Windows test successfully.

### P0 #52 fixed-path Host probe/status — 2026-10-24

Current M3 PR #90 exact head is `3a377ffe1d1f34b97a71ae6657accb9126d052f2`.
M4's exact audit report commit `7922309da0f6ea60c02b9bd17e6872aa98d753e5`
and Issue #52 evidence confirm M4 is a read-only consumer of the sanitized
Security Center status; the missing normal-CLI probe/route is M3-owned.
The first-party Console protected-read action in
`src/codex-connection-mcp.ts` is written against the public M1 Gateway
capability, M2 `createSecurityGatewayHostAdapter`, and M5 strict OBSERVE router
contracts. M3 fixes the tool name, relative file, and argument shape; its M2
bridge verifies the opaque capability before passing it to M5 through the
M2 capability-bound executor/provider. The M5 router is requested with
`verifyRealPaths:true`. Missing M1/M2/M5 methods or exports leave the adapter
`UNKNOWN`; the Console route exposes only its bounded status enum and never
falls back to a path-only callback.

The default Console process resolves these public self-reference subpaths from
the M3 package. Its `gateway-adapter` target blob is
`7a05ed64300c6345222dff13a4e929a250646acc`, which differs from exact M2 PR #91
blob `0d7053114e87177669ec2c3b416028e05affb62f`. The local first-party CLI test
therefore validates the checked-in M3 package path and synthetic capability
fixture, not composition with the exact M2 candidate. M9 must repin current M3
and run its package-composition check to resolve this boundary.

The protected-read POST validates CSRF/operator/body before loading probe
dependencies. It returns PASS only after the fixed registered-file positive
control and alias/path-replacement denials. The GET Security Center route reads
only an injected, sanitized M2 snapshot, checks the Console CSRF boundary, and
does not start the protected probe. Native Codex tools and real installed-host
callback activation remain `UNPROTECTED / NOT_VERIFIED`.

Verification on this exact M3 head: `node --import tsx --test
test/codex-connection-check.test.ts test/security-center-route-m3.test.ts`
passed 27/27; `npm run build` passed. Exact PR workflow `40037861929` passed
9/9 jobs, including package smoke and macOS/Ubuntu/Windows Node 20/22; separate
ownership-contract evidence run `40037861836` passed. These tests use fixed
fixtures and synthetic owner-contract seams; they do not establish activation
inside a user-installed Codex process.

M9 PR #36 run `40037657193` is not a current-source result: its log records M3
`a84ee13fa0e7e8ba0ace371235236f1d6b203780`, M2
`92dd42b900b10ce0294e9e3faa7e175d728228b3`, and M1 baseline
`7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`. Ubuntu and Windows both stopped in
the M3 focused regression step: the missing-executor case expected internal
reason `M2_CAPABILITY_PROVIDER_UNAVAILABLE` but `a84ee13` returned
`M5_STRICT_ROUTER_COMPOSITION_UNAVAILABLE`. M3 commit `3a377ff` corrects this
classification and current M3 CI is green. A later M9 run checked out
`3a377ff` but failed its stale M3 pin assertion before the exact composition
regression; see the current M9 pin result below. The M3 package subpath still has
a different adapter blob from the exact M2 package export; the runs so far do
not establish whether that byte difference affects the corrected ordinary-CLI
path.

No M1 review of exact M3 head `3a377ff` is recorded on PR #90. Keep Issue #52
OPEN / P0 / NOT_VERIFIED until M9 pins the current M3 head and the exact-source
Ubuntu and Windows composition checks pass. Do not infer real host activation,
installer effectiveness, native-tool protection, or E4 from local/PR synthetic
checks.

### Current M9 pin assertion — 2026-10-24

M9 PR #36 head `759f5f88ecc21ab4fe485d6a5683754828bbf374`, run
`40037963937`, checked out the current M3 code `3a377ffe1d1f34b97a71ae6657accb9126d052f2`,
M2 `92dd42b900b10ce0294e9e3faa7e175d728228b3`, M5
`cca42cd1762f995e92454d55ffa5e63951e39144`, and M1 baseline
`7cd34454c4bd6aa7176e0e076f5333639e3ccd5d`. Ubuntu and Windows both fail at
the first M9 composition-test assertion in `test/m9-cross-module-composition.test.mjs`:
the test expects M3 `10d488336ce8873f7eeade59064f6601f468e126`, while the checked-out
M3 source is `3a377ffe1d1f34b97a71ae6657accb9126d052f2`. The remaining composition
assertions do not run. This is an M9 pin/test freshness blocker; no M3 source
failure was reached in this run. M9 must update its expected M3 SHA and rerun
both hosts. Issue #52 remains OPEN / P0 / NOT_VERIFIED.

### Latest M9 composition gate — 2026-10-24

M9 PR #36 run `40039180984` checked out the exact current M3 source
`3a377ffe1d1f34b97a71ae6657accb9126d052f2`; its M3 pin assertion now matches.
Both Ubuntu and Windows nevertheless fail in the same M9 test-file setup at
`M6 current source root must use the recorded actual merge tree`: actual M6 tree
`d768ae07b109f978072c8805e29424d49f49f154`, expected
`bbb5eea8678ebfaaa1826bd529079cf16e6bdeda`. The setup aborts before M3-specific
composition assertions run. This is an M6/M9 provenance-gate blocker, not an
observed M3 behavior failure. M9 must update/verify its M6 merge-tree record and
rerun both hosts before #52 can be considered for promotion.

### Configured-target route validation — 2026-10-25

Validated on base `0d61b434ba2ac81e313b82432f4ac00afedd3cbc` in the existing
`feature/ac3-agent-onboarding` worktree. This follow-up changes only the
M3 route regression tests and this report; no runtime or public API change
was required by the reproduced checks.

`POST /api/security-center/target-read` selects startup-configured IDs. Tests
now load the public M1 SDK, M2 `gateway-adapter`, and M5 `policy-router`
package entries, verify exact tool/path bindings for two ordinary files after
the caller mutates its original configuration, and assert M5 `OBSERVE` with
`verifyRealPaths: true`. Responses contain only the configured-read scope and
status. The configured route does not load the fixed-marker probe.

Unknown IDs, duplicate/invalid maps, lexical and junction/symlink aliases
(including a sensitive target), same-path replacement, missing per-call
capability, and a stale M1 capability all deny with no forbidden read callback,
generic executor call, added M1 read evidence, approval, or fixture-content
change. The missing per-call capability is a synthetic resolver fault at the
trusted M3 test seam; the stale case uses the public M1 Gateway's real `close()`
lifecycle. Unavailable owner dependencies remain sanitized `UNKNOWN`.
Host/Origin, cross-site, CSRF, operator-code, content-type, malformed JSON, and
oversized-body regressions assert sanitized DENY before dispatch. Raw HTTP is
used for these headers because Node fetch rewrites a custom Host value.

`POST /api/security-center/protected-read` retains its separate fixed temporary
marker probe and its existing positive/alias/replacement controls. The ordinary
CLI subprocess tests pass for both routes. Final local validation:
`npm run build` passed;
`node --import tsx --test test/codex-connection-check.test.ts test/security-center-route-m3.test.ts`
passed **35/35**, with no skips; `git diff --check` passed.

These are local source-fixture and CLI-process checks using this checkout's
public package entries. They do not establish installed/native-host activation,
user-machine coverage, OS-atomic TOCTOU acceptance, or an M9 exact-source
composition result. Product acceptance remains `NOT_VERIFIED` from this
evidence. Publishing and hosted validation of this local candidate remain for
the coordinated batch.
