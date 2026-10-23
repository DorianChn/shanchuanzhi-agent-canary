# Windows 安装器验收记录（M7）

证据刷新：2026-10-23
历史本机候选复核：2026-10-14
结论：**HOLD。被测 source SHA 的 NSIS 模板编译、Windows Community 包静态构建/提取，以及 GitHub 托管 Windows runner 中的限界安装、重复目标拒绝检查与卸载 smoke 均通过；干净 Windows 11 VM、标准用户令牌、EFS 和失败回滚仍未验证。**

## Hosted run 证据（2026-10-23，精确 PR head）

- PR [#39](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/39) 核验时为 OPEN / Draft，分支 `feature/ac3-reliability-ac3`，head 为 `1448a46ce43a2211e14be70fcd9c256b21d74c1f`。CI run [39893792149](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39893792149) 在该 head 上 9/9 job 成功；Windows Community wrapper run [39893792191](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39893792191) 的 4/4 job 成功，包括 build-evidence 与 installer-lifecycle。
- lifecycle 结果 artifact [12475873203](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/39893792191) 记录 `PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL`、`installerExecuted=true`，source SHA `1448a46ce43a2211e14be70fcd9c256b21d74c1f`，候选 `competition-candidate.2`，安装器 SHA-256 `25442c5e350225cea8f2c33bc8d09bc9e4008734a38ccbcca87dc1caa9eb086f`。它在 GitHub-hosted Windows Server 2025 Datacenter build 26100 runner 上运行，使用 runner account；报告明确没有断言 standard-user token。
- 该 smoke 对同一 run 构建出的包执行中文/空格临时路径静默安装并校验 3,848 个清单文件、收据和注册项；重复候选安装到第二目标时进程退出码为 2、原安装保留且第二目标为空；静默卸载退出码为 0，清除了受管文件、注册表及快捷方式，等待 NSIS 临时副本完成 1,107 ms，保留未知 sentinel，残留计数为 0。
- 上述是受限的 hosted install/uninstall smoke，不是 clean Windows 11 VM 验收；它不证明 standard-user token、EFS、首次启动、失败/取消回滚、原位升级或真实 Agent/模型集成。较早 run `39882121777` / `39882121780` 为历史证据，当前结果以精确 head 的 `39893792191` artifact 为准。

## 边界和证据级别

当前 M7 AC3 候选位于独立分支 `feature/ac3-reliability-ac3`，以 `feature/agent-canary-3.0` 为基线。2026-10-14 的 VMware/安装验收复核没有启动 VM、修复磁盘或运行安装器。检查到候选 VM `候选 Windows 11 clean-test VM` 已关机（`vmrun -T ws list` 显示 0 台运行中的 VM），仍留有 `.lck` 目录，VMX 为 `cleanShutdown = FALSE`。只读磁盘链检查返回 VMware 偏好文件锁 `Access is denied`，并报告 `The specified virtual disk needs repair (0x3e86)` / `Disk chain is not consistent`。截至 2026-10-23 02:25 UTC 的 M0 只读记录，M7 测试槽仍保留，但未建立安全 clean baseline；另一次检查确认 VMX `cleanShutdown = FALSE` 且 `.vmsd` 没有快照条目。为保留原始 VM 状态，没有清锁、修盘或启动 VM；访客系统状态无法确认（见 [Issue #41 的 M0 只读记录](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41#issuecomment-6355913185) 和[基线补查](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/41#issuecomment-6355939380)）。没有更改共享 Git 引用、系统安全设置或真实用户安装目录。

本记录区分三类证据：

- **本轮源码测试**：本机 `npm run test:reliability` 为 58 项，55 通过、0 失败、3 跳过（均为符号链接权限/能力未假设相关）；这是临时 fixture、源码和包装器回归，不会执行 NSIS 安装器。另有下述精确 PR head 的 hosted lifecycle smoke，两者证明范围不同。本轮未运行完整 `npm run verify`。
- **编译检查**：Windows CI 候选流程下载并校验 NSIS 3.13 安装包，安装到临时目录，强制要求 `makensis.exe` 存在并匹配预期版本，再用它编译渲染后的模板；编译输出是使用合成 payload 的临时 smoke-fixture EXE，不是发行包，且不会运行。安装步骤记录安装包与编译器 SHA-256，编译步骤记录实际版本及输出/模板 SHA-256。历史 run `38415886978`（旧 head `65ce028`）曾因 `NSIS_COMPILER_MISSING` 失败，run `38430069038`（head `4f3a2c5`）则在此前测试步骤失败导致编译被跳过；这些已被后续 M7 workflow 修复覆盖。精确 head `1448a46` 的 wrapper run `39893792191` 中 Windows build-evidence 和 installer-lifecycle 均成功。
- **限界安装验收**：精确 head `1448a46` 同 run 构建的 Community Setup 已在 GitHub-hosted 临时 Windows runner 中实际运行并完成安装、重复目标拒绝检查和卸载，见上方 run `39893792191` artifact `12475873203`。这不是 M7 本机 clean VM 或 Windows 11 标准用户会话；M0 记录的 VMware 槽仍保留，但 VM 锁/快照及 cleanShutdown 状态不提供安全 clean baseline。没有清锁、修盘或启动该 VM。

历史 Windows 记录见 [`docs/3.0/INSTALLATION_ACCEPTANCE.md`](../../docs/3.0/INSTALLATION_ACCEPTANCE.md)：公开 candidate.4 曾在 EFS LocalAppData 环境卸载失败；随后本机 NSIS 3.10 诊断构建完成了两轮生命周期，但它不是公开 candidate，也不是发行工具链 NSIS 3.13。该历史结果没有被挪作本轮证明。

## 验收矩阵

| 场景 | 本轮状态 | 证据与限制 |
|---|---|---|
| 普通用户安装 | **源码配置通过；实际未验证** | NSIS `RequestExecutionLevel user`，注册信息写入 HKCU，快捷方式与默认路径为当前用户。尚未用标准用户令牌运行候选安装包。 |
| 中文路径、空格路径 | **GitHub-hosted 临时 runner 生命周期通过；clean Windows 11 VM 未验证** | run `39893792191`（source SHA `1448a46ce43a2211e14be70fcd9c256b21d74c1f`）用实际 Community Setup 安装到 `Agent Canary 验收 …\Agent Canary 安装目录`，并校验清单、收据和卸载。它不是 M7 clean VM 或标准用户令牌验收。 |
| EFS 路径 | **源码检查通过；实际未验证** | 模板检测 LocalAppData 的 `FILE_ATTRIBUTE_ENCRYPTED` 并将默认位置改到当前用户目录；对自定义目标检查最近的现存祖先。尚未在 EFS 目录中运行候选安装包。不得通过改变宿主机 EFS/安全设置制造测试环境。 |
| 首次启动 | **未验证** | 生成包的 `BUILD_REPORT.json` 明确 `installerExecuted=false`，表示静态构建步骤本身没有执行安装器；后续 lifecycle job 实际运行安装器并检查安装文件，但没有启动已安装的 Agent Canary 应用。 |
| 重复安装同一候选到第二目标 | **GitHub-hosted runner 拒绝检查通过；clean Windows 11 VM 未验证** | run `39893792191` 调用同一安装器到第二目录后，进程退出码为 2，原安装及注册项保留、第二目录为空；这是 hosted runner 的结果，不是 clean Windows 11 VM 验收。 |
| 升级 | **未实现原位升级 / 未验证** | 候选号对应独立安装目录、注册项和快捷方式；不同候选可并存。当前源码没有旧版本迁移或原位升级事务。发行前需明确支持的升级方式并验证。 |
| 卸载与重装 | **hosted runner 卸载通过；clean Windows 11 VM 未验证** | source SHA `1448a46ce43a2211e14be70fcd9c256b21d74c1f` 对应的 Community Setup 静默卸载退出码为 0，清除了受管文件、注册表项和快捷方式，并保留未知 sentinel；结果报告残留数为 0。独立重装循环、clean VM 生命周期仍未验证；卸载仅按清单删除精确文件和空目录，并拒绝目录重解析点。 |
| 安装失败回滚 | **模板逻辑已补；实际未验证** | 复制载荷、安装收据或注册失败时按精确清单回滚；取消/失败回调也尝试回滚。回滚遇到重解析目录会保留目录并报告不完整。未用 NSIS 安装器注入失败、磁盘耗尽或中断。 |
| 卸载残留 | **hosted runner 安装目录检查通过；clean VM 未验证** | run `39893792191` 检查受管文件、注册表、快捷方式及未知文件 sentinel，受管文件残留数为 0；没有 M7 clean VM 的安装前后差分。未知文件及应用报告按设计保留。 |
| 签名 / SmartScreen | **未验证 / 构建为 unsigned** | M7 没有代码签名证书，也未测下载信誉提示。哈希只证明字节一致，不证明发布者身份。 |

## 截至 2026-10-14 的实现记录（历史说明）

- `prepare.mjs` 现在要求调用者明确提供 Community ZIP 与 SHA-256；拒绝符号链接/非普通文件和摘要不匹配，不再静默回退到历史 candidate.2 包。
- 安装器模板按候选号生成独立身份；对路径中的 `$` 做 NSIS 转义，检查未展开占位符。
- 增加精确文件/目录清单回滚；回滚和正常卸载均检查目录重解析点，保持非递归删除。
- 回滚与卸载在目录删除前显式将 NSIS 当前目录切换到 `$TEMP`；安装过程把输出目录设为 `$INSTDIR`，避免回滚时根目录仍被当前目录占用。卸载在清单删除失败时提前退出并报告，保留后续重试路径。该行为有渲染模板回归覆盖，尚无真实 EXE 生命周期证据。
- Windows Community workflow 新增 Windows-only NSIS 3.13 安装步骤：按仓库 provenance 校验下载 SHA-256，验证实际 `makensis /VERSION` 后将可执行路径传给编译步骤；模板验收再次核对版本，并只在真实编译成功且输出文件存在时报告成功。此项已在历史 run `39573529232` 通过；更新的源码 SHA `7c348622e6c94e6f583044832c4a415c6a19c209` 对应编译结果见 run `39882121777`。
- `worker.mjs` 的报告、最新指针和安装收据使用同目录临时文件后发布；损坏的会话状态先保留为 `.corrupt.*.bak`，再创建新会话；不安全符号链接仍然失败关闭。
- 为会话恢复和报告发布加入可选文件系统注入点；新增损坏状态备份拒绝、恢复 ENOSPC、最新报告指针替换 ENOSPC、清理清单路径穿越等负面回归。包装器测试 fixture 现于每个测试后清理。

## 截至 2026-10-14 的执行结果（历史快照）

- `npm run verify`：**334 项，329 通过、0 失败、5 跳过**；构建通过，包检查通过（90 个文件）。
- 上一轮 `npm run test:reliability`：**36 项，34 通过、0 失败、2 跳过**。
- 本轮 Windows 本机 `npm run test:reliability`：**43 项，40 通过、0 失败、3 跳过**；跳过项是 Windows 符号链接创建权限相关测试。包含 WinForms 编译测试；没有本地 NSIS 编译器，因此本轮没有 NSIS 3.13 编译结果。
- 本机 Windows 检查：`Get-Command makensis.exe` 与 `where.exe makensis.exe` 均未找到编译器。运行 `node scripts/verify-installer-template.mjs` 时，SHA-256 校验后的 NSIS setup 因 `spawnSync ... nsis-setup.exe EACCES` 无法启动；脚本在检查 `makensis.exe` 和模板编译前退出。这是宿主执行限制，不是安装或编译通过。
- 官方 NSIS 3.13 ZIP 替代路径未得到可用压缩包：官方记录的预期 SHA-256 为 `ba63dffc4410ee89193e1cb5a41989991bd77c61068da17e3156d136b7b0b3d8`；首次下载返回 152,105 字节 HTML，SHA-256 为 `b41c3ad3f186e44893b9916c8456a2395d2365a39806e2f53943e2b8cb3cf5c2`，与预期不符；另一个官方 SourceForge 下载链接重定向后连接超时。没有解包或运行该响应。
- `npm audit --audit-level=high`：**0 vulnerabilities**。
- 本轮没有运行 `npm run verify`、真实安装包、真实模型或 24 小时/7 天测试。VMware 仅执行了只读清单和磁盘链检查，没有启动、修复或修改 VM。以上本地源码/模板结果仍不代表安装器验收。
- 本地候选 `68e7caa` 的静态 NSIS 参数回归检查通过，但真实 NSIS setup 启动和模板编译仍未验证。旧 head `65ce028` 的失败由后续代码修正；新 head `4f3a2c5` 的 CI 详情见下一项。即使 CI 编译通过，仍需单独完成实际 EXE 验收。
- 2026-10-13 PR head `4f3a2c5c8114ee7ec77e43d2f1085a8aa5fc949a` 的 run `38430069038`：Windows wrapper job 在 `npm run test:reliability` 的断言 `the Windows runner must provision the pinned compiler` 失败，`Install pinned NSIS compiler on Windows` 和 `Compile installer template on Windows` 均 **skipped**；Ubuntu wrapper job 最终 **cancelled**，其 reliability、audit、package-check 和语法步骤均显示通过。相邻 CI run `38430069098`：Windows Node 20/22 均在同一 M7 workflow 断言失败；macOS Node 20 与 Ubuntu Node 22 通过；Ubuntu Node 20 和 macOS Node 22 job 被取消（其 `npm test` 步骤显示通过）；Docker 和 sponsor 通过。失败断言对换行做了 LF 硬匹配；M7 已改为比较前统一 CRLF。本地 Windows 窄范围 Node 测试 **3 项通过**，并增加断言保证 NSIS 编译步骤先于可能失败的 npm 测试、M7 Windows/Ubuntu wrapper 矩阵不因首个失败而取消。修复还未推送，真实 GitHub Windows job 尚未重跑。
- 2026-10-14 本地代码检查点 `77ac15051723dc02339f6da43a4e0ee12eb8f5e4` 的窄范围测试 `node.exe --import tsx --test --test-name-pattern="NSIS|Windows community workflow" test/reliability.test.mjs`：**3 项通过**，覆盖参数、编译器门禁和 Windows-only workflow 条件。它是回归断言，未执行 NSIS 编译器。
- 2026-10-14 本轮真实安装尝试受 VM 环境阻塞：`'vmrun.exe' -T ws list` 输出 `Total running VMs: 0`；`'vmware-vdiskmanager.exe' -e '<候选 VM 虚拟磁盘>'` 输出 VMware preferences `.lck` `Access is denied`，随后报告虚拟盘需要修复，退出码 1。没有运行磁盘修复或重试 VMware 写操作。宿主机此前 `Get-Command makensis.exe` 和 `where.exe makensis.exe` 均未找到编译器；本轮没有获得 `makensis /VERSION`，没有真实模板编译和 EXE 安装结果。安装器验收仍为 **NOT VERIFIED / HOLD**。
- 2026-10-14 M7 VMware 独占槽位只读复查（M0 确认没有其他 VMware、真实模型或安装器测试运行/排程）：VMware Workstation `26.0.1 build-25688693`；`vmrun -T ws list` 输出 `Total running VMs: 0`。`D:\AgentCanary-3.0-Win11-VM\Windows11-Clean-Test\Agent-Canary-Windows11-Clean-Test.vmx` 声明 Windows 11 x64、NAT、4 vCPU、8192 MiB；相邻 `.vmsd` 只有 `.encoding = "UTF-8"`，没有快照条目。`vmrun -T ws listSnapshots <vmx>` 返回 `A password is required for this operation`，无法核实快照树或已知干净基线，因此该 VM 不满足本轮验收前置条件。未启动或修改 VM、磁盘、宿主配置，也未运行安装器。
- 可用 Community Preview ZIP `Agent_Canary_3_0_Community_Preview_99660b36.zip` 的 SHA-256 为 `011e8db21bc53d813168d8400ace05116e25c89ae837c66e5e321379cad0e8ed`；Python `zipfile.testzip()` 返回 `None`，126 项，无路径异常项，内部元数据标为 `notStable: true`。这是 ZIP 完整性检查，不是编译、来源认证或安装证据。

## 发行前必须补齐

1. 由 M0 协调取得可丢弃的 Windows VM/快照后，用当前源码和固定 NSIS 3.13 构建实际安装包，记录源码 SHA、载荷 ZIP SHA、安装器 SHA 与工具链。
2. 在该 VM 的普通用户会话中验证首次安装/启动、相同版本重复安装拒绝、不同候选升级策略、标准卸载、残留检查、重装与失败回滚。
3. 分别验证中文/空格路径和 EFS 路径；EFS 测试只在隔离 VM 的测试目录中进行。
4. 把实际安装的 EXE 与来源 ZIP、构建收据、日志、注册表/快捷方式差分、卸载后目录差分关联起来。编译通过不能替代这些证据。
