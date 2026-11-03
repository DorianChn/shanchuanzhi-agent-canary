# Isolation Test Results

日期：2026-10-13；宿主：Windows 10.0.26200.0（Windows 11 build），PowerShell 7.6.5，x64，Node.js v22.23.1。测试由 WSL2 Bash 调度，并调用 Windows PowerShell/.NET 执行原生 AppContainer API。

## 结果摘要

| 检查 | 结果 | 证据 |
|---|---|---|
| C# P/Invoke 编译 | PASS | Windows PowerShell Add-Type；测试脚本每次运行会重新编译。 |
| AppContainer 与低完整性令牌 | PASS | TokenIsAppContainer=true；Integrity SID 为 S-1-16-4096。 |
| 工作区 ACL | PASS | 只为随机 %TEMP% 子目录设置 AppContainer SID ACE，并读回验证 Modify。 |
| 受保护文件写入 | PASS，绝对与相对路径均拒绝 | 工作区外合成哨兵通过绝对路径和 `..\protected.txt` 相对路径尝试写入，均返回 EPERM；SHA-256 前后均为 15E702AE88388FB3E9692D97EF420C53B1C6ACFF0A33EF6954E22356EDB7ABA5。 |
| 正常编程任务 | PASS，范围有限 | Node -e 计算平方并写入 1,4,9；退出码 0。 |
| Node 文件入口 | FAIL | node entrypoint-test.js 退出码 1；Node 对 C:\ 的 lstat 得到 EPERM；没有放宽祖先 ACL。 |
| 无能力网络探测 | PASS，限回环 | 宿主 TCP listener 基线连接成功；AppContainer 返回 ETIMEDOUT 且无新待接收连接。仅证明此次连接没有到达 listener。 |
| Job 子进程清理 | PASS | Node 正常退出后 Job 关闭，后代 PID 结束；另启动一个生成 timeout.exe 后代并持续运行的 Node 进程，1.5 秒超时后父 PID 与子 PID 均不再运行。 |
| 不存在的可执行文件 | PASS，按预期失败关闭 | 唯一临时目录中的随机不存在路径触发 Win32 error 2；没有 ProcessId/进程被返回，launcher finally 路径释放 Job、启动属性和环境块。 |
| profile 与临时目录清理 | PASS | profile 删除成功、`cleanupErrors=[]`；随机临时目录完成前缀/GUID/reparse 检查后删除。 |
| Bash 绕过复现 | PASS | 临时哨兵变更；测试脚本内无 Gateway 调用，Gateway 遥测未接入。见 execution-isolation/codex/native-shell-bypass-evidence.json。 |
| Hook 协议与告警 | PASS；Codex UI 生命周期未测 | Windows Node 输入 PreToolUse/Bash 得到 `permissionDecision=deny` 与 `UNPROTECTED_NATIVE_SHELL` systemMessage；格式错误输入也拒绝。合成日志目录不可创建时，仍拒绝并返回告警；日志不含命令原文。Hook 片段未安装，当前没有 Codex UI 告警被激活。 |

历史记录（截至 2026-10-13）：M2 曾登记为 `RUNNING`；当时尝试通过 #29 登记状态及通过 #28 提交 Gateway 对齐请求，GitHub 写操作返回 403 且 Browser MCP 未连接。该次记录的本地提交为 `61db870`，当时的 push 失败且尚无 M2 Draft PR。后续 PR/Issue 事实以本报告的 2026-10-14 状态复核为准。

证据：`execution-isolation/windows/prototype-evidence.json`（schema v2）；`execution-isolation/codex/hook-test-results.json`。实现与测试：`execution-isolation/windows/AppContainerLauncher.cs`、`execution-isolation/windows/Test-AppContainerPrototype.ps1`。

## 性能微基准

对照与隔离组各 30 次交替启动 Node --version。二者使用同一 Node 文件、工作目录、最小环境和 Job Object；对照组使用当前用户 token，不附加 AppContainer capability/token。

- 最新复测：对照中位数 79.64 ms；AppContainer 中位数 80.59 ms；中位数差 +0.95 ms。
- 最新复测：对照均值 80.04 ms；AppContainer 均值 81.71 ms；均值差 +1.67 ms。
- 初始化 profile/临时 ACL 约 397.47 ms；复制 86.9 MB Node 可执行文件约 47.55 ms。

这是单机进程启动微基准，不能代表大型编译或 npm install/test。

## 安全范围与复现

- 受保护文件和工作区均由测试脚本创建在随机临时目录，不是用户文件。只有该临时目录的 ACL 被修改。
- 未关闭 Windows 安全功能；未改真实用户目录或系统 ACL；未注入进程。
- 没有在 Codex UI 中验证 Hook 信任/生命周期，也没有验证当前 Codex 是否使用 MXC。OpenAI 当前 Windows Sandbox 文档列出 MXC 最低 build 为 26100.9278 或 26200.9278；本机证据记录 `10.0.26200.0`，未记录 UBR/capability，不能据此确认 MXC 兼容或当前激活。`elevated` 依赖专用低权限用户、ACL 和防火墙；`unelevated` 网络隔离较弱且不能拒绝读取路径。[官方 Windows sandbox 文档](https://learn.chatgpt.com/docs/windows/windows-sandbox)
- M0 `MODULE_OWNERSHIP.md` 将 M2 范围限定为 `execution-isolation/`；三个报告已放入该目录。Hook 根配置仍待 M0 Issue/owner 协调，不能把协议输出称为当前宿主中的实时告警。
- PROTECTED 只指本次已验证的 AppContainer 子进程操作；Node 文件入口失败仍是集成阻塞。原型尚未接管所有 Shell、IDE 工具或宿主进程。
- `PreToolUse` 对 Bash/unified exec 可返回 `permissionDecision=deny` 和 UI `systemMessage`；部分专用工具路径能绕过默认 Hook。协议测试通过不等于项目 Hook 已加载或当前 Shell 已有实时警告。[官方 Hooks 文档](https://learn.chatgpt.com/docs/hooks)
- 历史记录（2026-10-13）：M2 的 GitHub 写操作返回 HTTP 403；该结果仅描述当时的写入尝试，不代表当前读写权限。M2 的模块文件范围仍为 `execution-isolation/`。

Windows PowerShell 7 复现命令：

pwsh -NoLogo -NoProfile -File execution-isolation/windows/Test-AppContainerPrototype.ps1 -NodeExecutable C:\path\to\node.exe -EvidencePath execution-isolation/windows/prototype-evidence.json

当前测试工具：Windows Node.js v22.23.1；为保护宿主隐私，未记录本机绝对路径。失败时应依据 JSON 证据分类，不应把失败路径记为受保护。

## 2026-10-14 原生宿主状态

原生 Codex Shell 仍为 `UNPROTECTED`，Hook 实际阻断为 `BLOCKED_NOT_VERIFIED`。当前任务能识别 Codex CLI `0.162.0-alpha.17.2`，但无法读取 Desktop 本体版本或该 Desktop 会话的 Hook/trust 状态。独立 CLI 针对此 worktree 显示 Folder access 信任提示；未接受并已退出。候选 Hook 未安装，未发起 native Shell sentinel 写入，没有回调决策或前后 SHA-256。详见[原生宿主核验记录](../codex/native-host-hook-evidence.json)和[绕过复现报告](NATIVE_SHELL_BYPASS_REPORT.md)。

## 2026-10-14 04:26 UTC Gateway 与协作状态复核

- GitHub connector read-only fetch at 04:26 UTC: PR #37 remains OPEN/Draft on `feature/agent-canary-3.0`, head `a1c239d3734a9acb355db97ea5eb10758eceedd1`; run `38390381288` has 9/9 successful jobs. P1 Issue #45 remains OPEN (last updated 03:57:16 UTC). Issue #28 remains OPEN and is scoped to M1/M7 Gateway lifecycle coordination, not an M2 worker protocol. Issue #29's latest M0 comment is `6160815558` (04:15 UTC), listing M2 and M5 as active. GitHub read-only fetch succeeded; write access was not tested. Earlier 403 notes remain historical.
- Read-only compatibility checkpoint: M0 public PR #30 head/contract commit `19ee8ca62e4a4717733264cc0ca96ff55acf79fd`; M1 public PR #43 head and local clean worktree commit `2276526cc70f4a13539e2172efae1fe3b4be16dd`. Both PRs were OPEN/Draft at 04:25–04:26 UTC. The M2 proposal and fixture are under [`gateway-adapter/COMPATIBILITY_PROPOSAL.md`](../gateway-adapter/COMPATIBILITY_PROPOSAL.md).
- This M2 change does not alter M1/M0/shared files. Gateway adapter integration remains `NOT_INTEGRATED`; native Shell remains `UNPROTECTED`.
- Focused M2 checks at 04:30 UTC on Node.js v22.23.1: `check-gateway-mcp-tools.mjs` and `check-contract-fixture.mjs` PASS; `node.exe --check`, JSON parsing, and staged/unstaged `git diff --check` PASS. The binder check covers local callback binding; neither check invokes M1 Gateway or a native host.

## 2026-10-23 normal-exit child cleanup acceptance guard

Source review found that `Test-AppContainerPrototype.ps1` recorded `jobObjectChildResult` but did not include it in the final success predicate. If the AppContainer could not start the synthetic child, or the child remained alive after its parent exited, the script could still return success. The final predicate now requires the exact result `CHILD_TERMINATED_ON_JOB_CLOSE`; a denied spawn or surviving child is a failed lifecycle acceptance.

After this change, the M2 worktree based on exact PR #37 head `1c050abace5af6e09b7b934730f2361b78f9d938`, with this local acceptance-guard modification, ran the prototype on Windows 11 build `10.0.26200.0`, PowerShell `7.6.5`, and Node.js `v22.23.1`. The run passed the new normal-exit child cleanup gate and the existing timeout parent/child cleanup gate. AppContainer and Low Integrity tokens were confirmed; absolute and relative writes to the synthetic outside-workspace sentinel were denied with its SHA-256 unchanged; the bounded loopback probe timed out; profile and temporary root cleanup succeeded with no cleanup errors. The ordinary Node file entrypoint still failed with `EPERM` on `lstat C:\`, as already documented. This is a bounded AppContainer prototype result, not Codex Desktop native Shell protection, MXC activation, or production-host integration. Issue #52 remains OPEN / P0 / NOT_VERIFIED.
