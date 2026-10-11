# 技术创新说明（第四轮）

Agent Canary 将 MCP inert诱饵、精确Canary Token、同步Session隔离、可信宿主参数策略与可替换AI建议连接成可审计工具执行边界。

1. 信号与执行分离：诱饵/Token形成信号，Guard在注册callback前拒绝；未收到信号不等于安全。
2. 首次调用补足：按可信工具类别、参数和敏感历史决策，危险外传拒绝、普通高风险操作可信人工批准，不等待AI超时。
3. AI权力隔离：AI仅解释脱敏日志，不能修改Guard、策略、批准或Reset；本地/云端可替换是工程能力，不自动构成研究首创。
4. 证据闭环：模型自主选工具，原样本与独立集、失败、正常任务代价、策略/Guard原因分别留档。最终数据见ABCD报告，不使用合成12/12作为真实模型率。

相关工具官方定位： [Promptfoo红队文档](https://www.promptfoo.dev/docs/red-team/)（其生态也含guardrails/MCP proxy）；[Microsoft PyRIT](https://github.com/Azure/PyRIT)（生成式AI风险识别/编排）。本项目聚焦Canary信号到宿主callback隔离与可选参数策略；未做统一效果基准，不能声称比它们更优或全首创。

限制：只保护接入Router的工具，参数规则非完整OS/网络沙箱；当前单Qwen、小样本，AI独立防护增益未测；构建需人工批准可能中断正常任务。
