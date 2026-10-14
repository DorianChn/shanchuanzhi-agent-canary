# Native Shell 绕过复现报告

日期：2026-10-13；工作树：agents/M2-isolation；分支：feature/ac3-execution-isolation

## 结论与证据

MCP Gateway 不是原生 Shell 的 OS 安全边界。M1 的 Gateway 设计将执行限制在可信宿主登记回调中，不等于拦截 Codex 自带 Shell。M2 用当前会话的 Bash/exec_command 路径复现：普通 Shell 直接改写临时测试哨兵。测试脚本内没有 Gateway 调用；本次没有接入 Gateway 遥测，因此 Gateway 日志状态未观测，不能把测试脚本输出当作真实 Gateway 日志证据。

证据脚本：execution-isolation/codex/reproduce-native-shell-bypass.sh。测试前 SHA-256 为 be9351741a8155d01fd028d158546f1005e73ceeb0bb2d093335feac4144e450，测试后为 5f8c1df4a2ad71a4accaf99aa75b5333b08d6d05fc7d673bf12c7faab879eb98。机器结果：execution-isolation/codex/native-shell-bypass-evidence.json，字段明确标记 `gatewayTelemetry=NOT_INSTRUMENTED`。

此运行环境是 WSL2 Bash，文件系统权限为 unrestricted。测试不代表 Windows PowerShell Shell 的现场行为，也不代表所有 Codex 安装。临时哨兵没有 Windows ACL；它只证明直接 Shell 能绕过 Gateway 记录，不能证明 OS 隔离。

## 宿主接口调查

Codex Windows 正式支持 MXC、`elevated` 和 `unelevated`。MXC 在设备和策略支持时由桌面应用优先选用，并约束命令及子进程的文件和网络权限；官方当前列出的最低 Windows build 为 26100.9278 或 26200.9278。`elevated` 使用专用低权限用户、ACL 与防火墙；`unelevated` 使用当前用户派生的受限 token 和 ACL，但网络隔离较弱且不支持拒绝读取路径。测试证据只记录 Windows `10.0.26200.0`，未证明设备符合 MXC capability 门槛，也没有确认该会话使用 MXC。直接复现运行在 WSL2 Bash，不受本报告证明的 Windows AppContainer 或 MXC 边界约束。[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)

Codex `PreToolUse` Hook 可匹配 `Bash`（包括 unified `exec_command`），通过 `hookSpecificOutput.permissionDecision="deny"` 拒绝调用，并以 `systemMessage` 在 UI 或事件流呈现警告。Hook 定义必须经信任审查；部分专用工具路径可以不经过默认 Hook。因此 Hook 只能保护已匹配且已加载的调用路径，不是 OS 边界。[Hooks](https://learn.chatgpt.com/docs/hooks)

Windows AppContainer 通过包 SID、能力 SID、DACL 与低完整性令牌限制资源访问；未授予网络 capability 时不应有网络访问。Job Object 管理子进程组，并能在最后一个 Job 句柄关闭时终止该组。[Launch an AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)；[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)

## 分类

| 路径 | 状态 | 边界 |
|---|---|---|
| M1 Gateway 已登记回调 | PARTIALLY_PROTECTED | 只限制登记回调；不拦截同权限本机进程或未经 Gateway 的宿主原生工具。 |
| 本次直接 Bash/exec_command | UNPROTECTED | 直接写入临时哨兵且不含 Gateway 调用；Gateway 遥测未接入，执行环境 unrestricted。 |
| 项目 Hook 已加载并受信任时的匹配 Bash | PARTIALLY_PROTECTED | 协议输出中实际返回 warning `systemMessage` 和 deny；部分专用工具路径可能绕过 Hook，因此不是 OS 沙箱。 |
| 本次 AppContainer 子进程 | PROTECTED（仅实测范围） | 验证 AppContainer/低完整性 token、工作区 ACL、绝对与相对路径受保护文件写入拒绝、loopback 探测及 Job 超时进程树清理；未接入 Codex 通用 Shell。 |
| Codex MXC Windows 命令 | PROTECTED（启用并验证后） | 官方宿主执行边界；当前会话是否使用 MXC 未确认，build/capability 兼容性也未实测。 |

## 告警与宿主信任

候选 Codex 项目 Hook 片段位于 `execution-isolation/codex/codex-hooks.fragment.json`，处理器为 `execution-isolation/codex/pre-tool-use.mjs`。处理器对 `PreToolUse/Bash` 返回可见的 `UNPROTECTED_NATIVE_SHELL` `systemMessage` 告警并拒绝调用。测试覆盖正常拒绝、无关工具透传、格式错误输入、告警写入成功，以及告警目录不可创建时仍拒绝并告警。若设置 `AGENT_CANARY_ALERT_LOG`，只记录会话/工具元数据、命令长度与 SHA-256，不记录命令原文。协议结果见 `execution-isolation/codex/hook-test-results.json`。

该片段使用官方 Hook 输出协议，没有改 `~/.codex` 或宿主内部文件；尚未安装到项目 `.codex/hooks.json`，也未在 Codex UI 信任或验证生命周期。因此当前原生 Shell 没有活动告警，状态仍为 `UNPROTECTED`。Hook 处理器已具备真实的 UI 警告/拒绝输出；但只有安装并加载后该警告才会作用于匹配 Shell 调用，Hook 未加载或运行失败不算阻断成功。M0 所有权表把 M2 限定在 `execution-isolation/`，跨范围 Hook 配置须先经 M0 协调。

## M0/M1 契约与文件范围

历史范围记录（截至 2026-10-13）：曾只读核对 M0 的 API/所有权/依赖契约，M2 仅改 `execution-isolation/`。2026-10-14 04:19 UTC 再核对 M0 契约 commit `19ee8ca62e4a4717733264cc0ca96ff55acf79fd` 与 M1 worktree 当前 commit `2276526cc70f4a13539e2172efae1fe3b4be16dd`；M1 Gateway 的精确 constructor-time `mcpTools` callback seam、执行前授权次序及 signal 行为见 [`gateway-adapter/COMPATIBILITY_PROPOSAL.md`](../gateway-adapter/COMPATIBILITY_PROPOSAL.md)。Issue #28 当前是 M1/M7 Gateway close/quarantine 生命周期协作，不是 M2 worker protocol 契约；M2 adapter 仍未集成，也未修改 M1 文件或共享契约。

历史协作记录（截至 2026-10-13）：引用线程读取工具不可用；当时 M2 的 GitHub 写操作返回 HTTP 403，CLI push 因 GitHub 用户名不可用而失败，记录显示尚无远端分支或 Draft PR。本段仅保留当时的访问/发布状态。2026-10-14 的只读 GitHub 状态复核与修正见后文；本轮没有尝试 GitHub 写操作。

## 2026-10-14 原生宿主 Hook 核验更新

机器可读记录：`execution-isolation/codex/native-host-hook-evidence.json`。本工作树在核验时为 `a1c239d3734a9acb355db97ea5eb10758eceedd1`。当前任务 shell 报告为 WSL2 Bash，内核 `6.18.33.2-microsoft-standard-WSL2`；可定位的 Codex CLI 版本为 `0.162.0-alpha.17.2`。Codex Desktop 本体版本以及当前 Desktop 会话实际加载的 Hook/trust 状态，无法从本次任务工具接口读取，记为 `UNKNOWN`。

官方 Hook 文档确认 `PreToolUse` 可匹配 `Bash`（包括 unified `exec_command`），并可通过 `permissionDecision: "deny"` 在受支持路径调用前拒绝；非托管 Hook 必须先审查并信任确切定义，定义变化后需重新审查。官方文档同时说明 Hook callback 错误、超时或无效响应可能导致 Hook 失败但工具继续执行，且专用工具路径可以绕过默认 Hook。因此协议拒绝能力并不等于 Hook 故障时 fail-closed，也不能据此宣布原生 Shell 已受保护。[Codex Hooks 官方文档](https://learn.chatgpt.com/docs/hooks)

只读启动独立 Codex CLI 并定位到此 M2 worktree 后，CLI 显示该目录尚需 Folder access 信任确认，并说明选择会保存信任决定。为避免更改持久化信任状态，未接受，按 Escape 退出。此结果只描述该独立 CLI 启动，不推断当前 Desktop 会话的信任状态。仓库根 `.codex/hooks.json` 不存在；`execution-isolation/codex/codex-hooks.fragment.json` 仍未安装，尚无可信回调或宿主决策记录。

没有发起真实宿主 Shell sentinel 写入，因此没有回调调用、deny/allow 决策或前后 SHA-256；不把空测试说成阻断成功。原生 Shell 继续标记 `UNPROTECTED`，该验收项为 `BLOCKED_NOT_VERIFIED`。解除阻塞所需证据仍是：在被审查并信任的受支持宿主中，记录产品版本和 Hook/trust 状态，再由 native Shell 发起仅针对合成 sentinel 的写入尝试，留存 Hook 决策/回调与前后摘要。若必须更改当前 Desktop 的持久化信任设置才能运行，则需要由相应宿主所有者完成该审查/信任步骤后复测。

## 2026-10-14 04:26 UTC 状态与 Gateway seam 复核

GitHub connector read-only fetch at 04:26 UTC confirms PR #37 remains OPEN/Draft, base `feature/agent-canary-3.0`, head `a1c239d3734a9acb355db97ea5eb10758eceedd1`; run `38390381288` has 9/9 successful jobs. Public M0 PR #30 and M1 PR #43 are OPEN/Draft at heads `19ee8ca62e4a4717733264cc0ca96ff55acf79fd` and `2276526cc70f4a13539e2172efae1fe3b4be16dd` respectively. Issue #45 remains OPEN/P1 (updated 03:57:16 UTC). Issue #28 remains OPEN and covers M1/M7 Gateway lifecycle coordination, not an M2 worker protocol. Issue #29's latest M0 comment is `6160815558` (04:15 UTC), listing M2 and M5 as active. Read-only GitHub access succeeded; write access was not tested. Earlier 403 notes remain historical.

Gateway 对齐分析见 [`gateway-adapter/COMPATIBILITY_PROPOSAL.md`](../gateway-adapter/COMPATIBILITY_PROPOSAL.md)。当前 M2 branch checkpoint：API contract `19ee8ca62e4a4717733264cc0ca96ff55acf79fd`，M1 implementation `2276526cc70f4a13539e2172efae1fe3b4be16dd`；04:25 UTC GitHub 只读核验确认该 M1 commit 是公开 PR #43 的 OPEN/Draft head。M2 与 Gateway 的适配仍为提案/fixture，未集成；native Shell 继续标记 `UNPROTECTED`，真实宿主 Hook 验收继续 `BLOCKED_NOT_VERIFIED`。

## 2026-10-14 04:55 UTC fail-closed 能力复核

本轮重新检查当前执行环境：Git Bash 调用实际落在 WSL2（内核 `6.18.33.2-microsoft-standard-WSL2`），Node 为 `v22.23.1`，当前 shell 的 `PATH` 上没有 `codex` 可执行文件，也没有读取 Desktop Hook 回调遥测的接口。仓库中的 `codex-hooks.fragment.json` 仍是候选片段，并未安装到 `.codex/hooks.json`；因此无法从此进程调用或观测真实 Desktop 原生 Shell，也没有尝试写入真实宿主哨兵。

官方 Hooks 文档确认：受信任的 `PreToolUse` Hook 对匹配的受支持工具返回 `permissionDecision: "deny"` 时可以拒绝调用；项目 Hook 必须先审查并信任其当前精确定义。该信任条件并不提供 fail-closed 保证：回调错误、超时或无效响应可能令 Hook 失败而工具仍继续，且部分专用工具路径可不经过默认 Hook。托管 Hook 可以由策略预先信任，但官方没有因此改变上述回调故障行为。故不存在一个仅靠本仓库 Hook 安装/信任即可证明“故障时仍阻断”的方案；协议单测只验证处理器主动输出 deny，不是实际宿主验收。

官方 Windows Sandbox 提供 MXC 及 legacy `elevated`/`unelevated` 执行边界，但本轮实际执行在 WSL2，不能据此推断当前 Windows Desktop 命令使用哪种沙箱，也未执行对应原生环境兼容性探测。要解除阻塞，必须在目标宿主由其所有者启用并核验 OS 沙箱/权限边界，再对仅含合成文件的原生 Shell 写入尝试记录真实 hook/宿主结果和前后摘要；若宿主仍为 WSL2，则需在该 Codex WSL 执行路径验证其实际强制的 Linux sandbox。当前结论维持 `UNPROTECTED` / `BLOCKED_NOT_VERIFIED`。

更新证据：[`native-host-hook-evidence.json`](../codex/native-host-hook-evidence.json)。官方资料：[Hooks](https://learn.chatgpt.com/docs/hooks)、[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)。

## 2026-10-14 05:01 UTC Windows CLI sandbox probe

按 M0 只读核验提供的 CLI 路径，启动 Windows Codex CLI `0.162.0-alpha.17.2`；宿主策略值已省略：`host-specific policy values omitted; active fail-closed state not demonstrated; effective session policy UNKNOWN`。命令从 M2 worktree 调用 `codex.exe sandbox -P :workspace --include-managed-config -- powershell.exe ...`，仅尝试把 `%TEMP%\agent-canary-m2-native-cli-probe-zIe5UB\synthetic-sentinel.txt` 从合成内容 `BEFORE` 改为 `AFTER`，并由子命令回读确认。

测试目录解析后确认位于 `%TEMP%`；写入前 SHA-256 为 `be9351741a8155d01fd028d158546f1005e73ceeb0bb2d093335feac4144e450`，写入后为 `94c3f1415d2061d05e4cce4d33e43e26a5ad7ebcf6e89acace6e8b84240a629c`。CLI 退出码 `0`，观察到 `SENTINEL_WRITE_COMPLETED`，stderr 为空。核验前目录为新建唯一目录；完成摘要检查后只删除此目录，并确认其已不存在。

这证明 Windows Codex CLI 的 `sandbox` 子命令能启动本次 PowerShell 并允许该临时目录写入。它不是 Desktop 中 Codex 原生 Shell 工具的调用，未观测 Desktop Hook 回调或决定；也没有测试沙箱拒绝写入。官方 `:workspace` profile 明确允许系统临时目录写入，因此本次成功是预期行为，不能据此声称受保护路径阻断已通过。Desktop 原生 Shell 状态仍为 `UNPROTECTED` / `BLOCKED_NOT_VERIFIED`。一次前置脚本探测因 PowerShell 命令解析失败、哨兵 hash 未变化且没有成功标记而作废，没有记作 sandbox deny。

详细机器结果见 [`native-host-hook-evidence.json`](../codex/native-host-hook-evidence.json)。

## 2026-10-14 06:49 UTC Windows Desktop active-policy inspection

我用只读 Windows PowerShell 检查了当前运行的 Codex 桌面进程、Windows AppX 包和指定配置字段，没有改任何用户配置。Desktop 包版本为 `OpenAI.Codex 26.1007.2314.0`；Windows CLI 为 `0.162.0-alpha.17.2`。M2 agent 自己仍运行在 WSL2（Linux `6.18.33.2-microsoft-standard-WSL2`），没有调用桌面原生 Shell，亦没有宿主 Hook callback 遥测。

只读主机检查涉及 `%USERPROFILE%\.codex\config.toml`，具体宿主策略值不在报告中：`host-specific policy values omitted; active fail-closed state not demonstrated; effective session policy UNKNOWN`。用户 `hooks.json`、用户 `requirements.toml`、文档所列 `%ProgramData%\OpenAI\Codex\requirements.toml`、同目录旧版 `managed_config.toml`，以及 M2 worktree 根 `.codex` 配置/Hook 均不存在；M2 候选 Hook fragment 未安装。有效会话权限未从 Desktop UI 读取；云托管与插件 Hook 来源未枚举，因此将二者记为 `UNKNOWN`，不据此声称所有宿主层都没有 Hook。

OpenAI 当前文档说明：`PreToolUse` 可以对匹配的 `Bash` 调用作显式拒绝，但 callback 错误、超时或格式错误可能不阻断工具；Windows sandbox/permission profile 可限制本机命令及其子进程的文件访问。换言之，Windows 平台有支持的 OS 沙箱能力，但本次检查未证明实际会话启用了 fail-closed 保护：`host-specific policy values omitted; active fail-closed state not demonstrated; effective session policy UNKNOWN`。M2 Hook 未安装，且本会话无法从 WSL agent 调用 Desktop Shell 复验。不能将此结论扩大为“平台完全不支持”，也不能把 Hook 片段或 CLI 子命令测试算作桌面验收。

**当前结果：**Desktop 原生 Shell 仍是 `UNPROTECTED / BLOCKED_NOT_VERIFIED`；Issue #45 保持 OPEN。`host-specific policy values omitted; active fail-closed state not demonstrated; effective session policy UNKNOWN`。验收要求：对受保护路径存在可重复的 OS-level deny，且在真正的 Windows Desktop 原生 Shell 中用全新唯一哨兵复测；记录 Hook 是否调用、宿主决定、退出状态及操作前后 SHA-256，并确认写入未发生。Hook 可作额外阻断，但不能单独满足 fail-closed，因为宿主文档明确记录了 callback 失败时可能放行。M2 不修改用户级或 ProgramData 配置，也不安装全局 Hook。

本记录依据 OpenAI 官方 [Hooks](https://learn.chatgpt.com/docs/hooks)、[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)、[Permissions](https://learn.chatgpt.com/docs/permissions) 与 [Windows desktop app](https://learn.chatgpt.com/docs/app/windows) 文档。

## 2026-10-14 06:30 UTC M2 native-shell gate 与 #32 集成门槛

当前 M2 会话没有能够调用 Desktop 原生 Shell 或读取其 Hook 回调/宿主决定的接口。Windows CLI 的 `sandbox` 命令是独立 CLI 子进程路径，不能代表 Desktop 工具链。M1 Gateway 的注册 ID 是 host-owned MCP map key，ID `Bash` 本身不能证明它就是原生 Shell；如果误按名称拒绝，会破坏合法的受隔离 Gateway 工具。因此 M2 binder 现要求可信 host registrar 为每个固定登记显式给出 `executionSurface`：只允许 `M2_ISOLATED_WORKER`，缺失/未知值构造失败；标记为 `NATIVE_CODEX_SHELL` 的任意 ID 在 binder 返回 callback 前以 `M2_NATIVE_SHELL_UNPROTECTED` 拒绝。登记 ID `Bash` 配 `M2_ISOLATED_WORKER` 仍可用。此 seam 只约束经 binder 且分类正确的登记，不会截住 Desktop 直接 Shell，也不能证明注入的 backend 实际隔离。候选 `PreToolUse/Bash` 回执显式给出 `UNPROTECTED` 和 `BLOCKED_NOT_VERIFIED`；项目 Hook fragment 尚未安装，Desktop 是否加载/信任未知，且 Hook 仅在 handler 实际运行时输出 deny，callback 失败时仍不能证明 fail-closed。Native Shell 总体分类保持 `UNPROTECTED` / `BLOCKED_NOT_VERIFIED`。

新增最小回归：同一个登记 ID `Bash` 在 `M2_ISOLATED_WORKER` 下构造并能调用 backend；在 `NATIVE_CODEX_SHELL` 下则构造失败，backend 调用数不变，证明拒绝发生在登记 callback/backend 入口之前；缺失 surface 的任意 alias 也构造失败。Hook 协议夹具使用一条合成受保护哨兵写入命令，验证响应是 deny 并带上述状态。该命令只作为 Hook 输入，不会在测试中执行。

只读 GitHub 核验（06:26 UTC 查询）：PR #37 当时为 OPEN/Draft，head `08c93bcac9906c27fac6d14c029d2134553a575b`。其最新 CI run `38515077665` 使用 merge head `543c6eab69e9aec58d168603c9da3eabe8ae21f8`（base `62496d4020bd90ba2eede49b2e80a2bbebb036b4`）；Windows Node 20 job `115691940178` 的 `npm run build` 通过，但 `npm test` 在 M1-owned `test/agent-hook.test.ts:54:53` 的中断 marker 断言失败，输出 `false !== true`。该 job 汇总为 321 passed / 1 failed / 4 skipped，`package-smoke` 被跳过；Windows Node 22 job 最终标记 cancelled，虽然其 `npm test` 步骤报告 success。没有 M2-owned Hook 文件出现在失败路径中。

PR #43 当前 OPEN/Draft head `2276526cc70f4a13539e2172efae1fe3b4be16dd` 的提交祖先包含 M1 commit `46af1f1`。只读 diff 确认该 M1-owned改动保留 `test/agent-hook.test.ts` 中断验收，将基于定时 `spawnSync` 的夹具替换为显式 entry marker、child `spawn` 和外部中断，并继续断言无 allow 输出和无工具回调/日志。PR #43 描述了 Windows Node 20/22 的 73/73 focused suites，但那不是 PR #37+M1 的组合 CI。M1 当前本地 head `f59ba37c2fd9d1b5e181e067f80981f8920ef16a` 相对 `2276526` 只改 `test/security-router.test.ts`，自身不是 #32 的 Hook 测试修复；它的历史包含 PR #43 的修复基线。

**M9 集成门槛：**组合候选必须包含至少 PR #43 head `2276526` / M1 Hook 修复 `46af1f1`；若纳入较新 M1 本地 head，需由 M0/M1明确选定其提交。保留原中断测试，随后在组合候选重跑 Windows Node 20、Windows Node 22 完整测试和 `package-smoke`，确认 marker 中断断言、无 allow/无 callback 及 package smoke 全部通过。Issue #32 保持 OPEN 直到该组合 CI 有证据；若复发，由 M1 继续定位，不由 M2删测或改 M1测试。

## 2026-10-14 10:17 UTC Issue #45 supported-host capability audit

Read-only GitHub fetch at 10:17 UTC confirms Issue #45 remains OPEN. This audit ran from WSL2 Bash (`Linux localhost 6.18.33.2-microsoft-standard-WSL2`); `codex` is not on this shell's PATH, and this task interface cannot invoke Windows Desktop native Shell or observe its Hook telemetry. No Desktop settings were changed, no hook was installed or trusted, and no native Shell sentinel write was attempted.

The current OpenAI Hooks documentation confirms that `PreToolUse` can match `Bash` (including unified `exec_command`) and return an explicit `permissionDecision: "deny"`. Non-managed hooks require review and trust of the current exact definition. Hook callback errors, timeouts, and malformed/unsupported responses can fail the hook while the tool continues, and some specialized paths can opt out of the default Hook path. Thus this candidate can provide a useful guardrail when loaded and invoked, but it cannot by itself satisfy Issue #45's fail-closed native-Shell acceptance. The fixture result remains protocol-only.

Codex does document a separate host-enforced route: native Windows sandbox implementations include MXC and the legacy `elevated`/`unelevated` modes, and permission profiles support scoped filesystem `deny` rules on native Windows. The Desktop app automatically prefers MXC for consumer accounts only when the device and policy support it; compatibility can be checked with the documented CLI probe, but that probe is a distinct command path. `unelevated` has weaker network isolation than `elevated` and does not support denied read paths. This means it would be inaccurate to say Codex lacks native enforcement APIs generally. M2 has not demonstrated that a particular effective policy is active in the target Desktop session, nor that it rejects an operation from that session's native Shell.

**Decision:** no repository-only Hook change can prove the missing fail-closed host behavior. Host policy provisioning and Desktop acceptance require a host-owned effective sandbox/permission profile and a native Shell sentinel run. Until those are observed, all M2 native Shell status remains `UNPROTECTED` / `BLOCKED_NOT_VERIFIED`, and Issue #45 stays open. The machine-readable audit, including the exact next evidence required, is in [`native-host-hook-evidence.json`](../codex/native-host-hook-evidence.json) under `reassessment.issue45CapabilityAssessment`.

Sources checked at 10:17 UTC: OpenAI [Hooks](https://learn.chatgpt.com/docs/hooks), [Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox), and [Permissions](https://learn.chatgpt.com/docs/permissions). Relevant documented contracts are the `Bash`/unified-exec Hook coverage and callback failure behavior; MXC capability and selection requirements; legacy sandbox distinctions; and scoped filesystem `deny` rules for native Windows. The live issue was read-only fetched from [Issue #45](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/45).
