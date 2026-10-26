# Windows Community candidate.3 — native installer preview

新增真实原生 WinForms 启动器及 NSIS 当前用户安装 EXE，携带固定 Node 22.23.1 与 Community candidate.2。安装后不依赖开发目录、全局 Node/Python/Git。提供中英文界面、环境检测、真实临时 SDK 安全验证、脱敏 JSON/Markdown 导出。

**本候选并非稳定版。真实 GUI 安装、干净 Windows 用户/虚拟机、实际卸载尚未验证。** EXE 未签名，不绕过 Windows 安全警告。用户要求“把安装包放 GitHub”后发布为独立预发布，保留旧版本及 PR #24。

运行时基线：`99660b36db9d5b1121eea6fe06b026c5f1e36bcf`。Community 类型修复来源：`975d838443cd56e5becd23c51941f81cfe12c994`。对 candidate.2 的33个 JS 文件逐个摘要比对无差异；SDK 类型仍可被独立消费。

后台证据：原有核心306通过/4跳过；Sponsor24通过/1跳过；包装层15通过/1跳过（Windows 符号链接权限未假定）；npm 根项目及 Sponsor 审计均0漏洞。新 EXE 的 C# 后台命令 initialize/environment/verify/export 全部退出0；正常文件实际写入，危险回调0次、模拟网络接收0次、目标文件前后 SHA-256 相同。

发布附件：安装 EXE、SHA256SUMS、中文一页安装说明、脱敏验证证据 ZIP。请核对摘要后使用。

边界：真实临时 I/O 是操作员触发的受控 SDK 检查，不是真实模型或 Claude/Codex/其他宿主的本次端到端防护。不自动声称 E4。哈希一致性不是发布者签名或防管理员篡改认证。不提供自动更新、服务、自启动或生产支付能力。
