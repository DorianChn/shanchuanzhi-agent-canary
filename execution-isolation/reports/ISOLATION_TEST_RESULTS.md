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

M2 本地调度状态为 `RUNNING`（占用 1 个开发槽；未占 VMware/真实模型/安装器独占资源）。已尝试把状态与下一步写入 #29，并通过 #28 提交 M1 Gateway 授权执行/取消语义对齐请求；GitHub Issue 评论和更新 API 均因 `Resource not accessible by integration` 返回 403，Browser MCP 未连接，两个 Issue 都未变化。本地验证增量已提交于 `61db870`；`git push` 因无法读取 GitHub 用户名失败，尚无远端分支或 Draft PR。下一步：取得有效写入通道后更新 #29、重送 #28 请求，推送并创建 Draft PR，再实现 adapter 并保留 Gateway 执行前复查。

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
- M2 在 M0 `MODULE_OWNERSHIP.md` 中仅拥有 `execution-isolation/`。请求将 #29 更新为 RUNNING 并报告下一步时，GitHub 评论与 issue 更新 API 均返回 HTTP 403，Chrome Browser MCP 未连接；该 Issue 状态尚未实际更新。

Windows PowerShell 7 复现命令：

pwsh -NoLogo -NoProfile -File execution-isolation/windows/Test-AppContainerPrototype.ps1 -NodeExecutable C:\path\to\node.exe -EvidencePath execution-isolation/windows/prototype-evidence.json

当前测试 Node 路径：C:\Users\36712\AppData\Local\hermes\node\node.exe。失败时应依据 JSON 证据分类，不应把失败路径记为受保护。
