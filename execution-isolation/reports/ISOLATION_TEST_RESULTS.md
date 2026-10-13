# Isolation Test Results

日期：2026-10-13；宿主：Windows 10.0.26200.0（Windows 11 build），PowerShell 7.6.5，x64，Node.js v22.23.1。测试由 WSL2 Bash 调度，并调用 Windows PowerShell/.NET 执行原生 AppContainer API。

## 结果摘要

| 检查 | 结果 | 证据 |
|---|---|---|
| C# P/Invoke 编译 | PASS | Windows PowerShell Add-Type；测试脚本每次运行会重新编译。 |
| AppContainer 与低完整性令牌 | PASS | TokenIsAppContainer=true；Integrity SID 为 S-1-16-4096。 |
| 工作区 ACL | PASS | 只为随机 %TEMP% 子目录设置 AppContainer SID ACE，并读回验证 Modify。 |
| 受保护文件写入 | PASS，写入被拒 | 工作区外测试哨兵返回 EPERM；SHA-256 前后均为 15E702AE88388FB3E9692D97EF420C53B1C6ACFF0A33EF6954E22356EDB7ABA5。 |
| 正常编程任务 | PASS，范围有限 | Node -e 计算平方并写入 1,4,9；退出码 0。 |
| Node 文件入口 | FAIL | node entrypoint-test.js 退出码 1；Node 对 C:\ 的 lstat 得到 EPERM；没有放宽祖先 ACL。 |
| 无能力网络探测 | PASS，限回环 | 宿主 TCP listener 基线连接成功；AppContainer 返回 ETIMEDOUT 且无新待接收连接。仅证明此次连接没有到达 listener。 |
| Job 子进程清理 | PASS | Node 创建 timeout.exe 后退出；Job 关闭后该 PID 不再运行。 |
| profile 与临时目录清理 | PASS | profile 删除成功；随机临时目录完成前缀/GUID/reparse 检查后删除。 |
| Bash 绕过复现 | PASS | 临时哨兵变更；测试脚本内无 Gateway 调用，Gateway 遥测未接入。见 execution-isolation/codex/native-shell-bypass-evidence.json。 |
| Hook 协议 | PASS；Codex UI 生命周期未测 | Windows Node/PowerShell 输入 PreToolUse/Bash 得到 deny 和 warning JSON；Windows 命令只在仓库根目录工作目录验证。Hook 片段未安装，当前没有 Codex UI 告警被激活。 |

证据：execution-isolation/windows/prototype-evidence.json；execution-isolation/codex/hook-test-results.json。实现与测试：execution-isolation/windows/AppContainerLauncher.cs、execution-isolation/windows/Test-AppContainerPrototype.ps1。

## 性能微基准

对照与隔离组各 10 次交替启动 Node --version。二者使用同一 Node 文件、工作目录、最小环境和 Job Object；对照组使用当前用户 token，不附加 AppContainer capability/token。

- 最新复测：对照中位数 79.46 ms；AppContainer 中位数 81.06 ms；中位数差 +1.60 ms。
- 最新复测：对照均值 79.62 ms；AppContainer 均值 82.50 ms；均值差 +2.88 ms。
- 初始化 profile/临时 ACL 约 397.47 ms；复制 86.9 MB Node 可执行文件约 56.59 ms。

这是单机进程启动微基准，不能代表大型编译或 npm install/test。

## 安全范围与复现

- 受保护文件和工作区均由测试脚本创建在随机临时目录，不是用户文件。只有该临时目录的 ACL 被修改。
- 未关闭 Windows 安全功能；未改真实用户目录或系统 ACL；未注入进程。
- 没有在 Codex UI 中验证 Hook 信任/生命周期，也没有验证当前 Codex 是否使用 MXC。
- M0 `MODULE_OWNERSHIP.md` 将 M2 范围限定为 `execution-isolation/`；三个报告已放入该目录。Hook 根配置仍待 M0 Issue/owner 协调，不能把协议输出称为当前宿主中的实时告警。
- PROTECTED 只指本次已验证的 AppContainer 子进程操作；文件入口失败仍是集成阻塞。原型尚未接管所有 Shell、IDE 工具或宿主进程。

Windows PowerShell 7 复现命令：

pwsh -NoLogo -NoProfile -File execution-isolation/windows/Test-AppContainerPrototype.ps1 -NodeExecutable C:\path\to\node.exe -EvidencePath execution-isolation/windows/prototype-evidence.json

当前测试 Node 路径：C:\Users\36712\AppData\Local\hermes\node\node.exe。失败时应依据 JSON 证据分类，不应把失败路径记为受保护。
