# Agent Canary 3.0 发布前收尾验收

日期：2026-10-12（Asia/Shanghai）。本记录只覆盖 candidate.4 Windows 安装路径、Hook/Gateway 故障关闭行为和本轮回归。它不重写历史实验，不代表第三方宿主覆盖、干净虚拟机验收或正式发布。

## 结论

**当前结论：不应发布新候选版；修复源码与本机诊断构建通过，但候选包级验收仍有阻塞。** 本机没有可用的 Windows 虚拟机；旧 candidate.4 Release 未被覆盖，本轮也没有发布新 Release。发布前仍应使用修复后的源码生成新的、可追溯候选包，并在干净 Windows 环境完成安装生命周期验证。

## 修复

1. `packaging/windows/installer.nsi.in`：EFS 检测后，静默安装跳过交互消息框，避免 `/S` 安装停在 `MessageBox`；交互安装仍显示说明。默认目标选择当前用户目录，且拒绝仍位于 EFS 目录的自定义目标。
2. `security-lab/claude-native-hook.mjs`：增加 2 秒 Hook 决策期限；Hook 超时、导入失败、抛错、返回结构无效或证据日志写入失败都输出固定 `deny`。超时路径同步输出拒绝后退出，避免迟到的 Promise 返回授权。
3. 新增回归测试：Hook 导入失败、异常、无效结构、日志写入失败、超时和进程中断；Gateway 关闭后请求拒绝，受控文件/网络 callback 均未执行。

## 真实测试结果

| 项目 | 状态 | 证据 |
|---|---|---|
| EFS 默认回退安装 | **PASS，本机诊断构建** | 从 EFS 标记的 `%LOCALAPPDATA%` 目录启动测试 EXE，不传 `/D` 覆盖；安装退出码 0，落在非 EFS 的用户目录，Launcher `--smoke` 退出码 0，卸载退出码 0，测试安装目录与测试注册项随后消失。EXE SHA-256 见 `candidate4-path-matrix.json`。 |
| 普通、含空格、中文目标路径 | **PASS，本机诊断构建** | 三个 test-only 安装器均从 EFS 源目录启动；安装/启动、自检、报告导出、卸载均通过。空格路径完成卸载后重装并再次卸载。合成危险 callback `unsafeCalls=0`、本地 sink 请求 `0`，目标文件 SHA-256 前后相同。 |
| 受限写权限 | **PASS，安全拒绝** | 非管理员账户在仅供测试的目标父目录遇到显式拒绝写入 ACL；真实写入探针失败，安装器退出 2，未创建目标目录或卸载注册项；恢复后当前用户 Deny ACE 数为 0，实际写入探针成功。旧的原始记录和 ACL 控制位差异说明均保留于本机临时 QA 目录；本仓库仅保存脱敏摘要。 |
| Hook 未加载/抛错/无效结果/日志失败 | **PASS，包装层测试** | 每个情形都由真实 `claude-native-hook.mjs` 子进程返回 `permissionDecision=deny`。 |
| Hook 挂起超时 | **PASS，包装层测试** | 挂起模块在 2 秒期限后返回 `deny`，子进程正常退出；没有执行宿主工具回调。 |
| Hook 进程中断 | **PARTIAL** | 测试进程在 Hook 已启动后被终止，未产生授权输出，也没有调用测试工具。第三方宿主收到无响应后的处理方式未在真实宿主中验证。 |
| Gateway 连接关闭 | **PASS，受控 Gateway 测试** | 已关闭的 Gateway 拒绝请求；回调次数为 0，本地 HTTP sink 请求数为 0，合成目标文件 SHA-256 不变。完整断言在 `test/gateway-acceptance.test.ts`。 |
| 宿主原生 Shell 绕过 | **OUT_OF_SCOPE，绕过已复现** | 直接调用 Windows `cmd.exe` 在隔离临时目录创建合成标记，命令未经过 Agent Canary Gateway。这证实当前保护仅适用于接入 Hook/Gateway 的受控路径，不是宿主全局拦截。见 `hook-gateway-failures.json`。 |
| Windows 干净虚拟机 | **BLOCKED** | 当前环境无可用 Windows VM；本机诊断安装不能标记为干净环境验收。 |
| 公开 candidate.4 安装包 | **未替换** | 本轮没有更改或覆盖历史 Release。诊断 EXE 使用 test-only 注册键/数据目录，不是新的公开候选包。 |

本地结果只适用于当前 Windows 11 Home 用户环境和测试构建。它不能证明其他 Windows 版本、Defender/SmartScreen 策略、外部账户或真实 Agent 宿主行为。

## 完整回归

- 环境：Windows 11 Home；Node.js 22.23.1；npm；本机 PowerShell。`npm run verify` 实际运行 build、全部 Node 测试和 package smoke。
- `npm run verify`：**PASS**，320 项，315 通过、0 失败、5 跳过；`pack:check` 显示打包 smoke passed。
- 定向 Hook/Gateway/Windows 测试：**PASS**，25 项，24 通过、0 失败、1 跳过。
- Windows worker/安装器测试：**PASS**，19 项，18 通过、0 失败、1 跳过。
- `npm audit --audit-level=high`：**PASS**，0 vulnerabilities。
- 脱敏命令输出：`security-lab/closeout-2026-10-12/npm-verify.txt`、`npm-audit.txt`、`windows-worker-tests.txt`。未脱敏副本保留在本机临时 QA 目录，不进入公开仓库。

测试跳过项没有计为通过；其中包含 POSIX 权限测试和需要 Windows 符号链接特权的测试。

## 保护边界与剩余风险

- Hook fail-closed 测试验证包装进程输出，但没有验证 Claude Code/Codex/Cursor 在 Hook 无响应、超时或被系统终止时必然拒绝原生操作；真实宿主 MCP 传输断连的行为也未验证。
- `cmd.exe` 直连已证明能够绕过 Gateway；没有已验证的系统级防护可以阻止该路径。
- MCP Gateway 关闭时的副作用由本地合成 callback 测试验证；未证明任意不合作的第三方 callback 都能取消或回滚已经开始的外部副作用。
- 没有干净 Windows VM 验收；Ubuntu 桌面/安装组合不在本机可验证范围内。
- 原 candidate.4 安装包保持原样。必须先按生产构建流程重新打包并核对 SHA，再决定是否创建 candidate.5；不得把本地诊断 EXE 作为发布资产。

## 版本与 PR

- 历史冻结运行时基线：`99660b36db9d5b1121eea6fe06b026c5f1e36bcf`，本轮没有改动 Gateway 核心运行时代码。
- 修改前分支 HEAD：`076452f6de2acf290070988bbd30508461277913`。
- PR #24 与 CI 状态以本轮推送后的 GitHub 记录为准；不得用本地测试替代远端 Actions。未合并 main，未发布新 Release，未发布 npm/Docker。
