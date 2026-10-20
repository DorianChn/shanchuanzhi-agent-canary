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
