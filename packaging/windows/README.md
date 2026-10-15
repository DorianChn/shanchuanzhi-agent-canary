# Windows Community 安装器与自动验收包装层

此目录构建原生 C# WinForms 启动器、随包 Node 22.23.1、由输入 payload 标识的 Community candidate 与当前用户 NSIS 安装器。当前分支新增「自动 E4」有界本地验收入口；它尚未进入公开 candidate.4，也不修改冻结安全核心、不升级普通 npm/Docker 分发、不覆盖旧 Release。

## 构建者要求

Windows 11 x64；内置 .NET Framework 4.8 编译器；Node/npm；Git；Python zipfile；官方 NSIS 3.13 的便携编译文件。最终用户不需要 Node、Python、Git 或 NSIS。

1. `node packaging/windows/prepare.mjs "EMPTY_BUILD_DIRECTORY" "PYTHON_EXE" "NPM_CLI_JS"`
2. 下载并核对官方 NSIS 3.13 校验值；可用 7-Zip 解压，不需要管理员安装工具。
3. 将 Node 完整 LICENSE 与 `packaging/windows/THIRD_PARTY_NOTICES.md` 放入随包目录。生产依赖原始 LICENSE 随 node_modules 保留。
4. 将 `prepare.mjs` 输出的 `next` 命令中的 `PATH_TO_VERIFIED_PORTABLE_NSIS_3_13` 替换为 NSIS 3.13 便携目录后，运行该完整命令。参数顺序固定为 payload、NSIS 目录、同次 prepare 输出的 `community.zip`、当前源码 checkout 的 40 位 Git commit SHA。Hook 文件有未提交修改时会拒绝生成 provenance；build 会再次核对该 SHA，并从传入的 ZIP 文件重新计算 `communityZIP_SHA256`。
5. `node --test packaging/windows/test-worker.mjs`
6. 用 `scripts/check-sdk-types.mjs --package-root BUILD_DIRECTORY/payload/app` 进行干净外部 SDK 类型消费检查。

输出：真实 `AgentCanary-Community-Setup.exe`、`.sha256`、`BUILD_RESULT.json`、拥有文件清单、构建日志。中文路径通过 UTF-8 BOM NSIS 脚本支持。

## 信任边界

启动器编译时嵌入 payload manifest 摘要；执行 Node 前逐个核对文件大小、SHA-256 与 reparse point。安装记录摘要来自实际 `$EXEPATH`。这些是本地一致性检查，**不是代码签名或防本机管理员篡改认证**。不合作 callback、未登记 Agent 原生工具、系统级隔离仍在边界外。

安装器 RequestExecutionLevel=user；HKCU 标准卸载项；桌面及开始菜单快捷方式。卸载仅逐个删除本发行包拥有文件，拒绝目录重定向，不递归清理用户目录。复现报告保留在 `%LOCALAPPDATA%/AgentCanaryCommunityData`，不自动删除用户证据。

## 验证语义

「一键安全验证」是真实临时 I/O 与受控 SDK 回调检查，非真实模型攻击。「自动 E4」另行运行 SDK 副作用夹具、打包 Hook wrapper 故障夹具、只读检查 VMware/公开 Release，并导出运行证据 ZIP。它不会启动/恢复 VM、运行 GPT-6、执行 Guest Operations 或写入 GitHub；没有这些前提时对应阶段为 BLOCKED。自动测试和外部身份声明都不能建立 E4。详见 [自动 E4 文档](../../docs/3.0/AUTO_E4.md)。

完整验收仍要求另一干净 Windows 用户或虚拟机：双击安装、按钮点击、导出、重启、卸载、系统残留核对。当前开发用户后台测试不能代替这项。
