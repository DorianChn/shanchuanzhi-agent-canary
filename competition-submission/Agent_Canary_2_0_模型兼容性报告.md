# AI Provider 兼容性

|接口|实现|真实服务|
|---|---|---|
|Ollama / Qwen9B|原生 tags/chat、结构校验、取消、用量|VERIFIED：本轮真实 Agent + 事前审查 + 控制台|
|OpenAI|原生协议 / fixture|IMPLEMENTED_NOT_VERIFIED：无真实授权密钥/成本范围|
|Anthropic Claude|原生 Messages / fixture|IMPLEMENTED_NOT_VERIFIED|
|Gemini|原生 generateContent / fixture|IMPLEMENTED_NOT_VERIFIED|
|DeepSeek / 通义|兼容配置 / fixture|IMPLEMENTED_NOT_VERIFIED|
|LM Studio / vLLM / 自定义兼容|协议适配|IMPLEMENTED_NOT_VERIFIED：服务未实际连通|

API Key 在后端显式配置中；不在 GET、前端、普通日志或提示词中。云端必须授权最小化脱敏预览；本轮零付费云调用，费用 NOT MEASURED，不能把云服务适配当实际连通。

NOT MEASURED: E also adds path/dataflow checks; same-model review, no independent blinded repeated-seed ablation
