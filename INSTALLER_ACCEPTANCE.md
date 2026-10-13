# Windows 安装器验收记录（M7）

日期：2026-10-13
本地候选复核：2026-10-14
结论：**HOLD。源码与模板渲染检查通过；NSIS 编译检查尚无通过证据，实际安装验收未执行。**

## 边界和证据级别

当前 M7 AC3 候选位于独立分支 `feature/ac3-reliability-ac3`，以 `feature/agent-canary-3.0` 为基线。2026-10-14 本轮获分配 VMware/安装验收资源，但没有启动 VM、修复磁盘或运行安装器。检查到候选 VM `D:\AgentCanary-3.0-Win11-VM\Windows11-Clean-Test\Agent-Canary-Windows11-Clean-Test.vmx` 已关机（`vmrun -T ws list` 显示 0 台运行中的 VM），仍留有 `.lck` 目录，VMX 为 `cleanShutdown = FALSE`。只读磁盘链检查返回 VMware 偏好文件锁 `Access is denied`，并报告 `The specified virtual disk needs repair (0x3e86)` / `Disk chain is not consistent`。为保留原始 VM 状态，本轮未清锁、修盘或启动该 VM；访客系统的当前状态无法确认。没有更改共享 Git 引用、系统安全设置或真实用户安装目录。

本记录区分三类证据：

- **本轮源码测试**：`npm run verify` 及 Windows 包装器专项回归；这些结果不代表已运行安装程序。
- **编译检查**：Windows CI 候选流程下载并校验 NSIS 3.13 安装包，安装到临时目录，强制要求 `makensis.exe` 存在并匹配预期版本，再用它编译渲染后的模板；安装步骤会记录安装包与编译器 SHA-256，编译步骤会记录实际版本及输出/模板 SHA-256；编译不启动生成的 EXE。PR #39 在远端 head `65ce028` 的 run `38415886978` 于 Windows 编译步骤失败，报 `NSIS_COMPILER_MISSING`。本地候选修正了 `/D` 参数传递并增加 Windows-only 编译器安装步骤，但本地改动尚未由 hosted Windows runner 执行，真实编译仍未验证。
- **实际安装验收**：本轮未执行。公开或本机构建的真实安装包没有在 M7 环境中运行；VMware 安装测试资源现已释放，没有留下运行中的 VM 或访客安装进程。

历史 Windows 记录见 [`docs/3.0/INSTALLATION_ACCEPTANCE.md`](../../docs/3.0/INSTALLATION_ACCEPTANCE.md)：公开 candidate.4 曾在 EFS LocalAppData 环境卸载失败；随后本机 NSIS 3.10 诊断构建完成了两轮生命周期，但它不是公开 candidate，也不是发行工具链 NSIS 3.13。该历史结果没有被挪作本轮证明。

## 验收矩阵

| 场景 | 本轮状态 | 证据与限制 |
|---|---|---|
| 普通用户安装 | **源码配置通过；实际未验证** | NSIS `RequestExecutionLevel user`，注册信息写入 HKCU，快捷方式与默认路径为当前用户。没有用标准用户令牌运行 EXE。 |
| 中文路径、空格路径 | **模板渲染通过；编译与实际安装未验证** | 回归测试以 `Agent Canary 安装` 和空格路径渲染输出、载荷及 License 路径。远端 Windows CI 在 `65ce028` 上未通过 NSIS 编译器检查；本地 `68e7caa` 尚未在有可运行 NSIS 的环境中完成编译。 |
| EFS 路径 | **源码检查通过；实际未验证** | 模板检测 LocalAppData 的 `FILE_ATTRIBUTE_ENCRYPTED` 并将默认位置改到当前用户目录；对自定义目标检查最近的现存祖先。没有在 EFS 目录中运行本轮安装器。不得通过改变宿主机 EFS/安全设置制造测试环境。 |
| 首次启动 | **未验证** | 本轮没有构建和启动真实 M7 安装包。 |
| 重复安装同一候选 | **拒绝逻辑有源码测试；实际未验证** | 非空目录、已登记候选或冲突快捷方式会被拒绝。 |
| 升级 | **未实现原位升级 / 未验证** | 候选号对应独立安装目录、注册项和快捷方式；不同候选可并存。当前源码没有旧版本迁移或原位升级事务。发行前需明确支持的升级方式并验证。 |
| 卸载与重装 | **源码清单逻辑通过；实际未验证** | 只删除清单中的精确文件和空目录，不递归删除目录；对目录重解析点做拒绝检查。不能据此宣称公开安装包已卸载或重装成功。 |
| 安装失败回滚 | **模板逻辑已补；实际未验证** | 复制载荷、安装收据或注册失败时按精确清单回滚；取消/失败回调也尝试回滚。回滚遇到重解析目录会保留目录并报告不完整。未用 NSIS 安装器注入失败、磁盘耗尽或中断。 |
| 卸载残留 | **未验证** | 无真实安装目录树、注册表和快捷方式的安装前后差分。未知文件及应用报告按设计保留。 |
| 签名 / SmartScreen | **未验证 / 构建为 unsigned** | M7 没有代码签名证书，也未测下载信誉提示。哈希只证明字节一致，不证明发布者身份。 |

## 本轮修复

- `prepare.mjs` 现在要求调用者明确提供 Community ZIP 与 SHA-256；拒绝符号链接/非普通文件和摘要不匹配，不再静默回退到历史 candidate.2 包。
- 安装器模板按候选号生成独立身份；对路径中的 `$` 做 NSIS 转义，检查未展开占位符。
- 增加精确文件/目录清单回滚；回滚和正常卸载均检查目录重解析点，保持非递归删除。
- 回滚与卸载在目录删除前显式将 NSIS 当前目录切换到 `$TEMP`；安装过程把输出目录设为 `$INSTDIR`，避免回滚时根目录仍被当前目录占用。卸载在清单删除失败时提前退出并报告，保留后续重试路径。该行为有渲染模板回归覆盖，尚无真实 EXE 生命周期证据。
- Windows Community workflow 新增 Windows-only NSIS 3.13 安装步骤：按仓库 provenance 校验下载 SHA-256，验证实际 `makensis /VERSION` 后将可执行路径传给编译步骤；模板验收再次核对版本，并只在真实编译成功且输出文件存在时报告成功。该候选尚未触发 hosted Windows CI，不能记作编译通过。
- `worker.mjs` 的报告、最新指针和安装收据使用同目录临时文件后发布；损坏的会话状态先保留为 `.corrupt.*.bak`，再创建新会话；不安全符号链接仍然失败关闭。
- 为会话恢复和报告发布加入可选文件系统注入点；新增损坏状态备份拒绝、恢复 ENOSPC、最新报告指针替换 ENOSPC、清理清单路径穿越等负面回归。包装器测试 fixture 现于每个测试后清理。

## 本轮执行结果

- `npm run verify`：**334 项，329 通过、0 失败、5 跳过**；构建通过，包检查通过（90 个文件）。
- 上一轮 `npm run test:reliability`：**36 项，34 通过、0 失败、2 跳过**。
- 本轮 Windows 本机 `npm run test:reliability`：**43 项，40 通过、0 失败、3 跳过**；跳过项是 Windows 符号链接创建权限相关测试。包含 WinForms 编译测试；没有本地 NSIS 编译器，因此本轮没有 NSIS 3.13 编译结果。
- 本机 Windows 检查：`Get-Command makensis.exe` 与 `where.exe makensis.exe` 均未找到编译器。运行 `node scripts/verify-installer-template.mjs` 时，SHA-256 校验后的 NSIS setup 因 `spawnSync ... nsis-setup.exe EACCES` 无法启动；脚本在检查 `makensis.exe` 和模板编译前退出。这是宿主执行限制，不是安装或编译通过。
- 官方 NSIS 3.13 ZIP 替代路径未得到可用压缩包：官方记录的预期 SHA-256 为 `ba63dffc4410ee89193e1cb5a41989991bd77c61068da17e3156d136b7b0b3d8`；首次下载返回 152,105 字节 HTML，SHA-256 为 `b41c3ad3f186e44893b9916c8456a2395d2365a39806e2f53943e2b8cb3cf5c2`，与预期不符；另一个官方 SourceForge 下载链接重定向后连接超时。没有解包或运行该响应。
- `npm audit --audit-level=high`：**0 vulnerabilities**。
- 本轮没有运行 `npm run verify`、真实安装包、真实模型或 24 小时/7 天测试。VMware 仅执行了只读清单和磁盘链检查，没有启动、修复或修改 VM。以上本地源码/模板结果仍不代表安装器验收。
- 本地候选 `68e7caa` 的静态 NSIS 参数回归检查通过，但真实 NSIS setup 启动和模板编译仍未验证。对应远端失败来自旧 head `65ce028`；修复需进入 PR 并由 Windows CI 重新执行。即使 CI 编译通过，仍需单独完成实际 EXE 验收。
- 2026-10-14 本地代码检查点 `77ac15051723dc02339f6da43a4e0ee12eb8f5e4` 的窄范围测试 `node.exe --import tsx --test --test-name-pattern="NSIS|Windows community workflow" test/reliability.test.mjs`：**3 项通过**，覆盖参数、编译器门禁和 Windows-only workflow 条件。它是回归断言，未执行 NSIS 编译器；该候选尚无 hosted Windows run，真实版本输出和模板编译结果仍待 CI。
- 2026-10-14 本轮真实安装尝试受 VM 环境阻塞：`'/mnt/d/虚拟机/vmrun.exe' -T ws list` 输出 `Total running VMs: 0`；`'/mnt/d/虚拟机/vmware-vdiskmanager.exe' -e 'D:\AgentCanary-3.0-Win11-VM\Windows11-Clean-Test\Agent-Canary-Windows11-Clean-Test.vmdk'` 输出 VMware preferences `.lck` `Access is denied`，随后报告虚拟盘需要修复，退出码 1。没有运行磁盘修复或重试 VMware 写操作。宿主机此前 `Get-Command makensis.exe` 和 `where.exe makensis.exe` 均未找到编译器；本轮没有获得 `makensis /VERSION`，没有真实模板编译和 EXE 安装结果。安装器验收仍为 **NOT VERIFIED / HOLD**。
- 可用 Community Preview ZIP `Agent_Canary_3_0_Community_Preview_99660b36.zip` 的 SHA-256 为 `011e8db21bc53d813168d8400ace05116e25c89ae837c66e5e321379cad0e8ed`；Python `zipfile.testzip()` 返回 `None`，126 项，无路径异常项，内部元数据标为 `notStable: true`。这是 ZIP 完整性检查，不是编译、来源认证或安装证据。

## 发行前必须补齐

1. 由 M0 协调取得可丢弃的 Windows VM/快照后，用当前源码和固定 NSIS 3.13 构建实际安装包，记录源码 SHA、载荷 ZIP SHA、安装器 SHA 与工具链。
2. 在该 VM 的普通用户会话中验证首次安装/启动、相同版本重复安装拒绝、不同候选升级策略、标准卸载、残留检查、重装与失败回滚。
3. 分别验证中文/空格路径和 EFS 路径；EFS 测试只在隔离 VM 的测试目录中进行。
4. 把实际安装的 EXE 与来源 ZIP、构建收据、日志、注册表/快捷方式差分、卸载后目录差分关联起来。编译通过不能替代这些证据。
