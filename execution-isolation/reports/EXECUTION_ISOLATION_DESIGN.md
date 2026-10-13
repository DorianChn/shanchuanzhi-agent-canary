# Execution Isolation 设计

日期：2026-10-13；状态：Windows 最小原型已运行；没有接管 Codex 通用 Shell。

## 目标

把 MCP Gateway 的应用层工具授权与操作系统执行隔离分开。所有不可信程序都应由隔离执行器启动；直接 Shell 不能因为绕过 Gateway 就继承同一用户的全部文件和网络权限。M2 不修改 M1 接口或源码。

## 设计

1. **宿主调用闸门候选**：Codex PreToolUse Hook 片段匹配 Bash，输出 UNPROTECTED_NATIVE_SHELL 并拒绝该调用。处理器协议和 Windows 命令目前以仓库根目录为工作目录验证；片段尚未安装到根目录 `.codex/hooks.json`，须先完成 M0 ownership 协调并由 Codex 信任/审查。当前错误或未加载时不得假定 Shell 已被拦截。
2. **Windows 执行器**：execution-isolation/windows/AppContainerLauncher.cs 使用受支持的 Win32 AppContainer 与 Job Object API。创建唯一 per-user profile，不申请 capability；通过 PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES 创建 suspended 进程，先加入设置 JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE 的 Job，再恢复运行。执行后读取 TokenIsAppContainer 与 TokenIntegrityLevel。
3. **资源限制**：仅为本次随机临时工作区授予 AppContainer SID Modify；父临时目录只授予必要的 Traverse。测试哨兵在工作区外。传入最小环境变量，不继承宿主完整环境。AppContainer LocalAppData 路径用 GetAppContainerFolderPath 获取。
4. **生命周期**：每次运行有 timeout；超时调用 TerminateJobObject；关闭 Job 句柄清理残留后代。profile 与随机临时目录在成功/失败路径都清理；只触及测试临时目录的 ACL。

## 分类定义

- **PROTECTED**：运行时验证了 AppContainer token、Low Integrity、包 SID 文件 ACL、未授网络 capability、Job 归属与超时清理。结论仅适用于这次被隔离创建的进程树和 OS 实际检查的路径。
- **PARTIALLY_PROTECTED**：已加载且受信任的 Hook 可告警/拒绝匹配 Bash；专用工具可能绕过默认 Hook，且当前原型未接管所有宿主执行路径。M1 Gateway 登记回调也属于此类。
- **UNPROTECTED**：当前 unrestricted Shell、未经过 Hook/执行器的进程，或未证明由 OS 沙箱约束的其他路径。

本次直接 Shell 是 UNPROTECTED；AppContainer Node -e 测试进程在测试范围内是 PROTECTED；整个项目仍是 PARTIALLY_PROTECTED。没有当前 Codex UI Hook 激活证据，直接 Shell 仍保持 UNPROTECTED。

## 兼容性阻塞

Node.js 22.23.1 的 -e 编程任务在临时工作区成功。相同 AppContainer 运行 node entrypoint-test.js 时，Node 解析入口会对 C:\ 执行 lstat 并收到 EPERM。测试用户路径的祖先没有 AppContainer SID ACE。为让常规 Node 项目脚本运行而向 C:\ 或真实用户目录扩大 ACL 会违反要求，因此没有这样做。

所以原型不能被称作通用 Node/npm 执行器；典型 node test.js 入口仍失败。后续应在 M0 协调后评估 Codex/Microsoft 正式 Sandbox API 的文件绑定，或只映射指定工作树的受支持 broker；不能改系统根目录 ACL。此限制属于真实技术阻塞。

网络探测只测试本机 TCP listener：宿主基线连接成功，AppContainer 尝试超时，listener 没有新待接收连接；测试没有申请 network capability。它不覆盖所有协议、DNS 或所有网络策略。正式集成应使用宿主官方 Windows sandbox 权限策略并逐项验证。[Codex Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)

## 性能与资源

10 次交替的 Node --version 启动中，对照与隔离组使用相同 Node 文件、CWD、最小环境和 Job Object；对照组使用当前用户 token。最新一次复测中位数差为 +1.60 ms（AppContainer 81.06 ms；对照 79.46 ms），均值差为 +2.88 ms。Profile/临时 ACL 初始化约 397.47 ms；复制 86.9 MB Node 可执行文件约 56.59 ms。这只是单机启动微基准，不代表 npm build/test。正式执行器不应每次复制大型 runtime；复用只读、受校验的 runner image 时仍需保持工作区 ACL 隔离。

## 激活与限制

`execution-isolation/codex/codex-hooks.fragment.json` 是待协调的 Codex 项目 Hook 配置片段。M0 文件所有权表只分配 M2 的 `execution-isolation/`；根目录 `.codex/hooks.json` 属于范围外路径，按 M0 规则须先建 Issue 并由 owner 协调。片段未激活，当前原生 Shell 仍是 UNPROTECTED。没有更改 ~/.codex、宿主内部文件、Defender、防火墙或真实用户目录全局 ACL，也没有进程注入。

Codex Windows 官方已有兼容设备推荐的 MXC 沙箱；M2 原型独立于 MCP Gateway，但没有接管通用 Shell，也没有验证当前宿主使用 MXC。M0 分支 API 契约定义 M2 输入为 Gateway 已授权请求、输出为隔离执行器和可检查结果，且 M2 依赖 Gateway 执行与取消语义；当前原型尚未做该适配。引用线程的 read_thread 工具不可用，隐藏线程是否补充约定无法确认。没有宣称全局 Shell 防护。

## 官方接口

- [Codex Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)
- [Codex Hooks](https://learn.chatgpt.com/docs/hooks)
- [Microsoft: Launch an AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)
- [Microsoft: GetAppContainerFolderPath](https://learn.microsoft.com/en-us/windows/win32/api/userenv/nf-userenv-getappcontainerfolderpath)
- [Microsoft: Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
