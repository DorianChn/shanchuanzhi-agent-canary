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
