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

只读核对了公共协调目录 `coordinator/docs/3.0/` 中的 `API_CONTRACTS.md`、`MODULE_OWNERSHIP.md` 和 `MODULE_DEPENDENCIES.md`。M0 契约规定 M2 独占 `execution-isolation/`，范围外路径须先建 Issue 并由 owner 协调；Draft PR base 为 `feature/agent-canary-3.0`，正文需 `Test-Evidence:` 与 `API-Contract-Change: yes|no`。三个报告放在 `execution-isolation/reports/`。没有改 M1 文件或接口；原型仍未接入 M1 Gateway 授权请求/执行取消契约，需按 #28 协调。

引用的 M0 Codex 线程要求调用 `read_thread`；当前工具面没有该工具，按引用 ID 的调用也返回工具不存在。已从指定协调目录核对可见契约，但无法确认隐藏线程是否还有补充。M2 已请求把 #29 更新为 `RUNNING` 并记录下一步，但 GitHub 评论与 issue 更新接口均返回 HTTP 403；Chrome Browser MCP 也显示未连接，所以 Issue 尚未变化。通过 #28 提交 M1 Gateway 执行/取消语义对齐请求也遇到相同 403，尚未送达。下一步是在取得有效 Issue 写入通道后补记 #29、重送 #28 请求，再实现 Gateway adapter。Draft PR 仍待本地后续提交和推送；当前不能声称已创建。
