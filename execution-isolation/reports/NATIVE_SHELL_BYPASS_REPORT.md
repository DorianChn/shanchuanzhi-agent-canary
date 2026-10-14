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
