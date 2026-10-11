# 安装与一键本地演示

推荐独立 Agent_Canary_Competition_2_0.zip；解压后 npm ci / npm run build / npm test / npm run ai:console。需要 Node 20/22。普通根 CLI 的商业发行不在本次授权迁移范围。

无模型仍可正常读取、虚拟外传拒绝、审批与 Canary 隔离演示。模型连接默认 loopback Ollama11434；LM Studio1234/v1 与 vLLM8000/v1 可配置但服务未真实验证。已安装 Qwen9B 可用于真实审查；不会自动下载模型。

预览真实项目配置：node dist/competition.js integrate --agent codex --project "绝对项目目录"；明确加 --apply 才写。--protected-demo 是无副作用 MCP 示例，不保护其他工具。安装输出 receiptPath；--restore 对应路径仅恢复未被后来修改的配置。备份私有、在项目外；备份与 receipt 存放用户目录下的私有 .agent-canary-integration-backups；请妥善保管，不上传仓库。

实际桌面 Agent 激活与任务回调覆盖尚未验证，不能标为 VERIFIED_PROTECTED。参见 docs/AGENT_INTEGRATIONS_2.md。
