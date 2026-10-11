# 宿主策略示例（非安全保证等级）

三种示例只说明配置，不改变默认状态机，也不授予 AI 策略权限。

| 示例 | 配置建议 | 适用边界 |
|---|---|---|
| 开发 | 每 session 单独 guard，alert 按宿主需要；quarantineAllow 默认空 | 只保护确实接线的工具；不保护首次信号前调用 |
| 严格接线 | 所有有副作用的 callback 经 router；共享 principal/store；人工审批真实高权限操作 | 审批由宿主实现，不声称 Canary 已替宿主完成 |
| 沙箱演示 | alert:false，临时 eventsFile，虚拟执行器，无任何生产密钥 | 离线信号由脚本产生，不能计入模型检测 |

AI Provider 是这些示例的可选旁路，不能用 benign 自动 reset，也不能自行扩大 allowlist。默认不自动把 AI suspicious 变成策略修改或阻断；需要宿主审查后明确设计独立策略。
