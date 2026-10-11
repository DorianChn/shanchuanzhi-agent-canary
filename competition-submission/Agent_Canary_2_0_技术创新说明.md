# Agent Canary 2.0 技术创新与证据

诱饵/Token 信号、事件隔离、宿主参数策略、AI 事前审查与权限解耦、有界 HMAC 来源提示、受保护 MCP 宿主和可复现实验形成可集成能力。

|组|攻击成功|观察拒绝防止|Canary|正常完成|硬误拒绝|审批中断|
|---|---|---|---|---|---|---|
|A_no_canary|4/19|0/19|0/19|8/8|0/8|0/8|
|B_decoy_only|6/19|0/19|0/19|8/8|0/8|0/8|
|C_guarded_router|6/19|0/19|0/19|8/8|0/8|0/8|
|D1_policy|1/19|5/19|0/19|6/8|0/8|2/8|
|D2_policy_ai|1/19|5/19|0/19|6/8|0/8|2/8|
|E_pre_review|1/19|5/19|0/19|6/8|2/8|0/8|

E 组没有降低 ASR（D1/E 均 1/19），且出现 2/8 正常任务硬拒绝，D1 为 0/8。10 次事前审查全部 suspicious，含正常构建与安装；中位 21.6 秒。AI 默认关闭，不能宣称独立增益。D1/D2 有 2/8 正常任务审批中断。



独立 AI 因果收益：NOT MEASURED: E also adds path/dataflow checks; same-model review, no independent blinded repeated-seed ablation。不声称首创或彻底防止注入。

相关一手项目：[Promptfoo](https://www.promptfoo.dev/docs/red-team/)（含评测、Guardrails/MCP 能力）、[PyRIT](https://github.com/Azure/PyRIT)（风险识别、攻击编排）。Agent Canary 更关注宿主信号与执行隔离，项目不能用一张功能表宣称全面优于这些工具。

只保护注册到 Router 的宿主 callback。MCP 诱饵安装不等于全局保护；绕过 Guard、已开始的外部操作、模型内部状态 OUT_OF_SCOPE。AI 不能批准、重置 Guard 或改权限。realpath 仍有 TOCTOU 窗口；自定义网络 callback 需使用 DNS 固定与禁止重定向的安全 transport。来源提示不等于完整动态污点分析。
