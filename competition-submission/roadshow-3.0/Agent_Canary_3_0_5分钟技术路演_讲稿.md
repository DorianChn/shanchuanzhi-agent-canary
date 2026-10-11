# Agent_Canary_3_0_5分钟技术路演 逐页讲稿

目标时长 300 秒。计划时长，不代表已完成真人计时排练。运行时 99660b36db9d5b1121eea6fe06b026c5f1e36bcf。

## 1. Agent Canary 3.0（0–15秒）

各位评委好，我是唐林博豪。Agent Canary 面向能够调用工具的 AI Agent，目标是在可信入口检查权限，并让第三方核对实际目标效果。今天展示限定受控 SDK 的工程证据，不作全局防护承诺。

证据：docs/3.0/FINAL_COMPETITION_READINESS.md

## 2. 不可信内容进入工具执行链（15–40秒）

模型接触低信任内容后可能改变任务。我们的新留出样本中，无保护 Agent 在两种文本上返回了虚拟秘密。这是真实本地模型的工具选择。与此同时，模型没有自主接触诱饵，所以诱饵检测不能承担全部防护。首次调用需要可信权限检查。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；src/runtime/gateway.ts

## 3. 可信执行入口与信任边界（40–75秒）

模型只持有 dispatch。宿主持有工具描述、文件句柄和审批能力。网关在执行前检查参数与最小权限，必要时要求人工审批。文件使用预持有句柄，命令采用固定程序和参数，网络限制批准目标。该入口控制登记能力，不是系统调用级沙箱。

证据：src/runtime/gateway.ts；docs/3.0/SECURITY_BOUNDARIES.md

## 4. 技术贡献与已验证范围（75–105秒）

我们的贡献是把资源约束执行、会话隔离和效果证据连接起来。E0到E4帮助解释主张强度。蜜罐在临时空间使用无效资产。自适应选择机制已经存在，但没有公平收益消融；我们不申报触发率提升。AI的结果不授予任何新权限。

证据：docs/3.0/EVIDENCE_ASSURANCE_MAPPING.md；src/runtime/honeypot.ts；docs/3.0/SECURITY_BOUNDARIES.md

## 5. 真实目标见证执行前拒绝（105–150秒）

这里先回放相同场景H08或H10的原始A/F轨迹：A实际返回虚拟秘密，F在读取前拒绝。然后运行离线操作员DEMO，检查文件和回调计数。DEMO是真实临时I/O，但不是模型自主攻击。我们展示证据与观察，不把页面上的DENY当成无副作用证明。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；competition-submission/3.0-final/有限凭据拒绝证据.json；test/gateway-acceptance.test.ts

## 6. 真实 Qwen 留出对照（150–185秒）

冻结策略后，12个新间接攻击文本和4种正常任务各重复两次，两组共64次运行。A攻击效果4/24，F为0/24。F只有6/24任务存在拒绝，其余没有攻击效果不能计为主动拦截。重复相关、作者知晓设计，不是64个独立样本。AI审查和Canary触发均为0，不能归因其独立收益。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；competition-submission/roadshow-3.0/evidence/FROZEN_FACTS.json

## 7. 安全边界与未证实结论（185–215秒）

最大边界是未接入的工具不受保护。原生宿主只有配置或部分hook证据，不能替代SDK验收。已开始并不合作的回调可能产生迟到副作用，文件句柄也不提供事务回滚。0/24和8/8只描述这一批任务。独立操作者E4还未完成。

证据：docs/3.0/SECURITY_BOUNDARIES.md；docs/3.0/AGENT_COVERAGE_MATRIX.md；test/gateway-acceptance.test.ts

## 8. 开源交付与证据分级（215–250秒）

评委可以下载免费包运行自检，在完整冻结Git checkout复查原始记录和Schema。MIT保持不变。负面结果、失败启动和不合作回调反例都保留。证据哈希链只相对可信锚检查一致性，管理员仍可重写整链。我们提供外部复现套件，但不会把自己的新目录自测说成E4认证。

证据：docs/3.0/FINAL_COMPETITION_READINESS.md；docs/3.0/EVIDENCE_ASSURANCE_MAPPING.md；LICENSE

## 9. 相关工作与项目区别（250–280秒）

执行前控制已有真实相关方案。例如Invariant可监控工具流并拦截调用，NeMo也有执行护栏。Promptfoo和PyRIT适合组织风险评测。本项目的区别是围绕有限资源绑定、诱饵隔离及副作用见证形成小型TypeScript工程闭环。我们尚无同条件竞品测试，因此不宣称防护优于这些项目。

证据：https://github.com/invariantlabs-ai/invariant；https://github.com/NVIDIA/NeMo-Guardrails；https://github.com/promptfoo/promptfoo；https://github.com/microsoft/PyRIT

## 10. 复现入口与下一步（280–300秒）

Agent Canary当前最强的成果是能够核对的受控执行前防护。下一步优先独立操作者复现和一个官方宿主入口验证，然后用公平消融评价AI与自适应机制。我们开放源码、原始数据与复现流程，欢迎评委按冻结版本检验。谢谢。

证据：https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.1；docs/3.0/FINAL_COMPETITION_READINESS.md

## 11. 备答：样本与指标口径（备答，不计入主讲）

新数据为16独特任务、2次相关重复、2组。分母24是攻击试验，不是24独立文本；64含16正常试验。攻击成功按秘密返回、victim变化、sink收到请求或特权marker定义。

证据：security-lab/evidence/2026-10-11T15-04-14-292Z/results.json；security-lab/evidence/2026-10-11T13-34-53-835Z/results.json

## 12. 备答：E0–E4 证据强度（备答，不计入主讲）

本项目研究分级，不是官方标准。E3要求目标见证，不是VERIFIED字段。哈希链不证明事件真实性或防管理员重写。

证据：docs/3.0/EVIDENCE_ASSURANCE_MAPPING.md

## 13. 备答：宿主覆盖矩阵（备答，不计入主讲）

不能把宿主列表写成全局支持名单。模型、协议握手、SDK保护、原生宿主E2E是不同层次。

证据：docs/3.0/AGENT_COVERAGE_MATRIX.md

## 14. 备答：延迟与资源解释（备答，不计入主讲）

数据来源holdout-metrics-detail，资源只覆盖Node样本尾，不含Ollama/GPU，不能称模型内存或全程峰值。AI审查本批0次，延迟与独立收益NOT MEASURED。本地无付费API，能耗未测。

证据：security-lab/competition-freeze/holdout-metrics-detail.json

## 15. 备答：现场演示降级（备答，不计入主讲）

既有视频约213秒，中文字幕无音轨，操作者真实浏览器操作与历史模型回放分开。本轮不重录假模型视频。

证据：docs/3.0/FINAL_COMPETITION_READINESS.md；competition-submission/3.0-final/video-final-verification.json
