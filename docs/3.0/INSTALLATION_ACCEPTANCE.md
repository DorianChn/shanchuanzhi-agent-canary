# Agent Canary 3.0 产品安全验收

日期：2026-10-12。核心修复 SHA：`9007e3a9fa6def487416e1dbb183143829b44aca`。历史冻结运行时 `99660b36db9d5b1121eea6fe06b026c5f1e36bcf` 保留；本轮确实修改网关检查，不能把历史实验重新标为新代码结果。独立分支 `fix/shanchuanzhi-3.0-product-acceptance`，不合并 main、PR24，不发送邮件，不发布稳定 npm/Docker。

## Windows

candidate.3 公开下载安装器 SHA256：6c78620d249ec7e9f13ad929c4c1fb44c307f4b818751e7446f193a09a5d27e1。Windows11 HomeChina25H2、32GiB、当前用户。实际双击等效启动 GUI，完成安装、按钮、导出、关闭重启和标准卸载。无需用户安装 Node/Python/Git；内置官方 Node22.23.1与 Windows .NET4.8，未关闭安全软件。

无签名；SmartScreen浏览器下载体验 NOT_VERIFIED。干净 Windows 用户/虚拟机 BLOCKED；专业版和 Node20组合 NOT_VERIFIED。同机测试不是E4。候选4最终安装与公开摘要在后续 PACKAGE_RELEASE_VERIFICATION.json 中单独记录，不沿用候选3GUI证明。

## Ubuntu

已有 WSL2 Ubuntu26.04。显式前置 Node20/22、Python3，发行包带 dist、不需要 Git；npm ci需要依赖下载网络。运行 packaging/ubuntu/install.sh install ZIP SHA TARGET；目标必须空且非根/家目录，无 sudo。ZIP CRC、路径、安全链接、SDK声明及 SOURCE_MANIFEST 均检查，doctor实际运行。卸载只删除清单文件，未知/修改文件保留；node_modules/.bin 是 npm 正常产生的链接目录，发行执行不依赖它。

复现脚本 security-lab/run-ubuntu-acceptance.sh；本轮中文/空格路径、SDK外部类型消费、正常/拒绝副作用、卸载重复运行通过。真正Ubuntu桌面GUI安装不适用CLI交付。公开候选4下载复验待单独收据。

## 版本映射

旧npm兼容版1.2.7保留；Community产品候选3.0.0-competition-candidate.4；构建sourceSHA与历史runtimeBaselineSHA分列，securityRuntimeModified=true。免费 CLI --version/build-info/doctor不宣称全部 Agent 保护启用。安装≠配置≠真实工具接入≠副作用验证。

## 候选四本机GUI复验

真实 GUI 安装、环境按钮、安全按钮、导出与重启曾通过；随后对标准卸载进行的复测在本机 EFS LocalAppData 下失败，见下方 2026-10-12 增补。因此不能将公开 candidate.4 宣称为完整安装/卸载生命周期通过。安装器 SHA `567b1e7e8832b6aa31fc80c86994eb915bf8d3db9caf125c1f7a08b42cf94ce6`。候选3中文/空格路径实测仍是独立的历史记录，不推导候选4卸载成功。

## 2026-10-12 卸载缺陷复现与修复候选验证

| 检查 | 状态 | 实际结果 |
|---|---|---|
| 公开 candidate.4 在当前 LocalAppData 下卸载 | **FAIL** | LocalAppData 属性包含 EFS `Encrypted`；GUI `Uninstall.exe` 两次显示 `NSIS Error: Error launching installer`。静默卸载没有移除安装目录。原注册项和原 Community 报告仍保留。 |
| 同一旧包在未加密 profile 路径差分 | **PARTIAL** | 安装成功、卸载进程退出码 0，但目录树仍残留。旧构建只清理有文件的父目录，未覆盖空目录。 |
| 修复源码 | **VERIFIED** | commit `afe5f92cd888a64208a9cc2768caed89a904551a` 检测 EFS 并改用当前用户非加密目录；校验自定义目标最近现存祖先；记录所有目录（包括空目录）并按深度倒序非递归清理。 |
| 本机修复诊断 EXE 的安装/启动/验证/导出/卸载/重装 | **VERIFIED_LOCAL_DIAGNOSTIC** | 两轮当前用户 GUI 生命周期完成。诊断 EXE 38,395,643 bytes，SHA-256 `d3defdd1818d51b19565627fce6769e255e1d7d0697809939487f133f4dd94ef`。它不是公开 candidate.5，未签名，使用本机 NSIS 3.10；发行流水线要求 NSIS 3.13。 |
| 干净 VM、其他 Windows 环境、独立 E4 | **NOT_VERIFIED** | 仅当前 Windows 11 Home 用户环境。 |
| Ubuntu 当前 WSL 安装入口 | **BLOCKED** | Python 3.14.4 可用但 PATH 无 Node.js；实际 `sh packaging/ubuntu/install.sh install ...` 在安装前退出 1 并提示需要 Node 20/22。本轮未下载或安装 Node。 |

修复后的本机诊断流程用 candidate.4 运行时构建，未替换旧 Release。六份用户报告仍存在（本轮仅核实数量，未重算其内容哈希）；原始公开 candidate.4 安装目录和指向该目录的卸载登记仍存在。旧 EFS 故障复现目录 `%LOCALAPPDATA%\AgentCanary-EFS-Probe-20261012` 留有 3,857 个产品文件；自动安全审查拒绝了递归清理尝试，未通过其他方式绕过。结构化记录：`security-lab/windows-installer-recheck-2026-10-12.json`。没有干净 VM 或新官方安装包结果，不能据此标记正式候选发行生命周期通过。
