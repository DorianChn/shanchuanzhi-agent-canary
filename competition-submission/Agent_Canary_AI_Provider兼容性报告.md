# AI Provider 兼容性

| 服务 | 实现 | 实际验证 |
|---|---|---|
| Ollama / Qwen 9B | 原生 tags/chat、Schema/usage | VERIFIED：最终110 Agent场景、22/22 D2分析及录像中真实推理 |
| OpenAI | 原生 Chat Completions | 模拟 wire 通过；真实账户 NOT VERIFIED |
| Claude | 原生 Messages | 模拟 wire 通过；真实账户 NOT VERIFIED |
| Gemini | 原生 generateContent | 模拟 wire 通过；真实账户 NOT VERIFIED |
| DeepSeek / 百炼通义 | 兼容预设 | 兼容 Adapter 测试；厂商 NOT VERIFIED |
| LM Studio / vLLM | 本地 OpenAI-Compatible | 适配完成；真实服务 NOT VERIFIED |
| 自定义兼容 API | 显式协议、地址和 origin | 模拟接口通过；任意接口不能保证兼容 |

云端费用、跨模型准确率与比较 NOT MEASURED。本轮没有请求生产密钥或付费调用。现有测试包含取消、超时、非法JSON、断线、脱敏、SSRF/DNS/重定向；不把这些测试算作厂商真实连通。AI失败不会改变Guard或策略。详见 docs/AI_PROVIDERS.md。
