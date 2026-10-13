# Native Shell 绕过复现报告

日期：2026-10-13；工作树：agents/M2-isolation；分支：feature/ac3-execution-isolation

## 结论与证据

MCP Gateway 不是原生 Shell 的 OS 安全边界。M1 的 SECURITY_BOUNDARIES.md 与 src/protected-mcp.ts 将 Gateway 限定为可信宿主登记的回调，不拦截 Codex 自带 Shell。M2 用当前会话的 Bash/exec_command 路径复现：普通 Shell 直接改写临时测试哨兵。测试脚本内没有 Gateway 调用；本次没有接入 Gateway 遥测，因此 Gateway 日志状态未观测，不能把测试脚本输出当作真实 Gateway 日志证据。

证据脚本：execution-isolation/codex/reproduce-native-shell-bypass.sh。测试前 SHA-256 为 be9351741a8155d01fd028d158546f1005e73ceeb0bb2d093335feac4144e450，测试后为 5f8c1df4a2ad71a4accaf99aa75b5333b08d6d05fc7d673bf12c7faab879eb98。机器结果：execution-isolation/codex/native-shell-bypass-evidence.json，字段明确标记 `gatewayTelemetry=NOT_INSTRUMENTED`。

此运行环境是 WSL2 Bash，文件系统权限为 unrestricted。测试不代表 Windows PowerShell Shell 的现场行为，也不代表所有 Codex 安装。临时哨兵没有 Windows ACL；它只证明直接 Shell 能绕过 Gateway 记录，不能证明 OS 隔离。

## 宿主接口调查

Codex Windows 官方文档支持 mxc、elevated、unelevated 三种命令沙箱；兼容设备推荐 MXC，能约束命令及其子进程的文件和网络权限。elevated 是传统备用方案，unelevated 网络隔离较弱且不支持拒绝读取路径。当前没有证据表明本会话的 WSL2 Shell 受这些 Windows 沙箱约束。[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)；[Sandboxing](https://learn.chatgpt.com/docs/sandboxing)

Codex PreToolUse Hook 可匹配 Bash（包括 unified exec_command）并返回 deny 与 systemMessage。官方文档同时指出：项目层必须受信任、Hook 定义必须审查，且部分专用工具路径可以不经过默认 Hook。因此 Hook 是告警和调用闸门，不是 OS 边界。[Hooks](https://learn.chatgpt.com/docs/hooks)

Windows AppContainer 通过包 SID、能力 SID、DACL 与低完整性令牌限制资源访问；未授予网络 capability 时不应有网络访问。Job Object 管理子进程组，并能在最后一个 Job 句柄关闭时终止该组。[Launch an AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)；[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)

## 分类

| 路径 | 状态 | 边界 |
|---|---|---|
| M1 Gateway 已登记回调 | PARTIALLY_PROTECTED | 仅限制登记的回调；同权限本机进程和宿主原生工具不经过 Gateway。 |
| 本次直接 Bash/exec_command | UNPROTECTED | 脚本直接写入临时哨兵且不含 Gateway 调用；Gateway 遥测未接入，执行环境 unrestricted。 |
| 项目 Hook 已加载并受信任时的 Bash | PARTIALLY_PROTECTED | 匹配调用会告警并拒绝；不覆盖所有工具路径，不是 OS 沙箱。 |
| 本次 AppContainer 子进程测试 | PROTECTED（仅测试范围） | AppContainer、低完整性、ACL、网络探测与 Job 行为均已实测；未接入 Codex 通用 Shell。 |
| 官方 MXC Windows 命令 | PROTECTED（启用并验证后） | 官方宿主边界；本次没有验证当前会话使用 MXC。 |

## 告警与宿主信任

候选 Codex 项目 Hook 片段位于 execution-isolation/codex/codex-hooks.fragment.json，处理器为 execution-isolation/codex/pre-tool-use.mjs。处理器在 PreToolUse/Bash 输入下返回可见的 UNPROTECTED_NATIVE_SHELL 告警并拒绝调用。Windows 命令只在仓库根目录工作目录下验证；项目 Hook 的真实 Codex 生命周期尚未验证。若设置 AGENT_CANARY_ALERT_LOG，只记录会话/工具元数据、命令长度与 SHA-256，不记录命令原文。协议测试与 Windows 命令调用均通过，见 execution-isolation/codex/hook-test-results.json。

该片段使用官方项目级 Hook 格式，没有改 ~/.codex 或宿主内部文件；尚未安装到根目录 `.codex/hooks.json`，因此当前没有 Codex Hook 告警处于激活状态。若获准安装，Codex 仍需信任项目层并审查 Hook 定义。我们没有在 Codex UI 内启用或验证生命周期，所以当前原生 Shell 仍标 UNPROTECTED。Hook 未加载或运行失败不算阻断成功。

## M0/M1 契约与文件范围

只读检查了 M0 分支 `feature/ac3-m0-coordination`（HEAD `1a65374e40802803c827ba16ca2ffaeac75fabee`）中的 `API_CONTRACTS.md`、`MODULE_OWNERSHIP.md`、`MODULE_DEPENDENCIES.md`、`COORDINATION.md`，以及 M1 `SECURITY_BOUNDARIES.md` 与 `src/protected-mcp.ts`。M0 契约规定 M2 独占 `execution-isolation/`，范围外路径须先建 Issue 并由 owner 协调；Draft PR base 为 `feature/agent-canary-3.0`，正文需 `Test-Evidence` 与 `API-Contract-Change`。三个报告已放在 `execution-isolation/reports/`；根目录 `.codex/hooks.json` 不在 M2 所有权内，当前只保留未激活片段，等待 M0 协调。没有改 M1 文件或接口；原型也没有接入 M1 Gateway 授权请求/执行取消契约。

引用的 M0 Codex 线程要求调用 read_thread；当前工具面没有该工具，按引用 ID 的调用也返回工具不存在。上面已从 M0 分支读取可见契约，但无法确认隐藏线程是否还有补充。未创建 Draft PR：所有权例外仍需按 M0 规则协调，且 M2→Gateway 执行器集成须等待 M1 执行/取消契约稳定。
