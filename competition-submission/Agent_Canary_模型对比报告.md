# 模型适配与对比状态

## 已有真实测量

本机 Ollama / qwen3.5-9b-local:latest Q4_K_M，约 5.63 GB，Windows/Node 22：完成模型查询、四条证据的真实建议分析、中文界面真实分析及新增 36 次自主工具选择 A/B/C。

四条最终输入合法格式 4/4，与预先标签一致 3/4；逐条原文、耗时、usage 和所有失败保留在 `evidence/ai-analysis-*.json`。不能把此比例称为一般准确率。

## 比较状态

| 项目 | 当前证据 |
|---|---|
| Ollama 真实分析 | VERIFIED |
| OpenAI / Claude / Gemini 原生请求格式 | 模拟端点回归 VERIFIED；真实厂商账号 NOT VERIFIED |
| DeepSeek / 百炼兼容配置 | 适配已实现；厂商真实调用 NOT VERIFIED |
| LM Studio / vLLM | 适配已实现；服务运行 NOT VERIFIED |
| 多模型同输入比较 | NOT MEASURED（只有一个真实模型，没有付费调用） |
| 校准置信度 / 通用准确率 | NOT MEASURED |
| 费用比较 | NOT MEASURED，没有读取生产密钥或申请付费服务 |

如后续授权比较，应固定相同证据、标签与 Schema，保存所有结果和 Tokens，再使用可核实的当前价格计算费用；必须在调用前预估并获得付费授权。模型一致意见不构成安全事实。
