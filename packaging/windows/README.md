# Windows Community candidate.3 包装层

此目录构建原生 C# WinForms 启动器、随包 Node 22.23.1、固定 Community candidate.2 与当前用户 NSIS 安装器。**不修改冻结核心、不升级普通 npm/Docker 商业分发、不覆盖 candidate.2。**

## 构建者要求

Windows 11 x64；内置 .NET Framework 4.8 编译器；Node/npm；Python zipfile；官方 NSIS 3.13 的便携编译文件。最终用户不需要 Node、Python、Git 或 NSIS。

1. `node packaging/windows/prepare.mjs "EMPTY_BUILD_DIRECTORY" "PYTHON_EXE" "NPM_CLI_JS"`
2. 下载并核对官方 NSIS 3.13 校验值；可用 7-Zip 解压，不需要管理员安装工具。
3. 将 Node 完整 LICENSE 与 `packaging/windows/THIRD_PARTY_NOTICES.md` 放入随包目录。生产依赖原始 LICENSE 随 node_modules 保留。
4. `node packaging/windows/build.mjs "BUILD_DIRECTORY/payload" "PORTABLE_NSIS_DIRECTORY"`
5. `node --test packaging/windows/test-worker.mjs`
6. 用 `scripts/check-sdk-types.mjs --package-root BUILD_DIRECTORY/payload/app` 进行干净外部 SDK 类型消费检查。

输出：真实 `AgentCanary-Community-Setup.exe`、`.sha256`、`BUILD_RESULT.json`、拥有文件清单、构建日志。中文路径通过 UTF-8 BOM NSIS 脚本支持。

## 信任边界

启动器编译时嵌入 payload manifest 摘要；执行 Node 前逐个核对文件大小、SHA-256 与 reparse point。安装记录摘要来自实际 `$EXEPATH`。这些是本地一致性检查，**不是代码签名或防本机管理员篡改认证**。不合作 callback、未登记 Agent 原生工具、系统级隔离仍在边界外。

安装器 RequestExecutionLevel=user；HKCU 标准卸载项；桌面及开始菜单快捷方式。卸载仅逐个删除本发行包拥有文件，拒绝目录重定向，不递归清理用户目录。复现报告保留在 `%LOCALAPPDATA%/AgentCanaryCommunityData`，不自动删除用户证据。

## 验证语义

离线按钮是真实临时 I/O 与受控 SDK 回调验证，非真实模型攻击。只有明确实际执行的检查标记 VERIFIED。模型未运行、第三方 Agent 未测及 E4 均保持 NOT_VERIFIED。外部测试者的身份是声明，不是机器指纹判定。

完整验收仍要求另一干净 Windows 用户或虚拟机：双击安装、按钮点击、导出、重启、卸载、系统残留核对。当前开发用户后台测试不能代替这项。
