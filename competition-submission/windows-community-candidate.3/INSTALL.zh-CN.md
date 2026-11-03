# Agent Canary Community：Windows 安装说明

**试用候选 candidate.3，未签名，尚未完成干净 Windows 用户/虚拟机 GUI 安装验收。** 不属于稳定版；candidate.2 继续保留。

1. 在项目 GitHub Release `v3.0.0-competition-candidate.3` 下载 `AgentCanary-Community-Setup.exe` 和 `SHA256SUMS.txt`。核对摘要；不要使用来源不明的转载包。
2. 双击安装器，阅读 MIT 许可，选择当前用户的空目录。需要 Windows 11 x64 内置 .NET Framework 4.8；**不用安装 Node.js、Python 或 Git，不需要管理员权限**。不关闭 Defender，不绕过 SmartScreen。没有有效代码签名时 Windows 可能警告发布者未知，请按自己的安全政策决定是否运行。
3. 从桌面或开始菜单打开 **Agent Canary Community**。默认中文；右上角可切换 English。
4. 点击「一键环境检测」：实际核对随包文件、Node、磁盘及 CLI 自检。模型未测试显示 NOT_VERIFIED；无需 Ollama。
5. 点击「一键安全验证」：在临时沙箱真实写入正常文件、拒绝虚拟凭据读取、拒绝危险回调；核对目标文件前后 SHA-256、回调执行次数及模拟网络接收次数。另验证一次性人工审批和蜜罐触发后的 Guard 拒绝。**操作员触发的 SDK 检查，不是真实模型攻击，不是其他 Agent 的全局防护。**
6. 选择真实身份（作者/外部测试者/其他），点击「导出复现报告」，选择 JSON 保存位置。自动生成同名 Markdown，导出前脱敏路径和 Token。首次启动生成唯一会话 ID，重启保留。外部身份声明不能自动获得 E4。
7. 关闭程序后，可从 Windows「设置 → 应用 → 已安装的应用」卸载。卸载不删除未知用户文件或复现报告；报告保留在当前用户 LocalAppData 下的 `AgentCanaryCommunityData`。

失败时不要修改安全策略：重新下载并核对摘要；确保安装目录未被改动、不是链接目录、有足够磁盘空间。如仍失败，将脱敏 JSON/Markdown 附到 GitHub Issue。若没有成功运行报告，则注明失败步骤及错误，不能标记通过。

已验证：后台原生 C# → 随包 Node → 冻结 SDK 链路、中文空格路径、实际临时副作用见证、报告脱敏。**未验证：真实双击 GUI、Windows 家庭/专业版各自验收、干净用户/VM、实际卸载及 SmartScreen 下载体验。**
