# 相关工作与技术贡献边界

日期：2026-10-12。模式：DOCUMENTATION_COMPARISON。未部署或运行下列竞品，EXPERIMENTAL_COMPARISON 未完成。GitHub 元数据在 roadshow-3.0/evidence/RELATED_WORK_SOURCES.json；仓库更新时间不等于响应速度或维护质量。

## 可比能力与差异

| 项目 / 主要定位 | 执行前控制与接入 | 目标效果与复现证据 | 边界、接入成本和正常任务影响 | 许可与来源 |
|---|---|---|---|---|
| Invariant Guardrails | 规则匹配工具流，MCP/LLM 代理可检查拦截 | 官方有工具流与规则示例；本次未运行其目标效果测试，不作缺失判定 | 需要代理/规则集成；正常任务成本未同条件测量 | Apache-2.0；[官方仓库](https://github.com/invariantlabs-ai/invariant) |
| NVIDIA NeMo Guardrails | 多种 rails，包含 custom action 的 execution rails | 官方配置、评估工具与示例；未同条件测试 | 需应用/rails配置，可控制动作但不自动推导全OS覆盖；影响未测 | API自动识别NOASSERTION，但实际[LICENSE.md](https://github.com/NVIDIA-NeMo/Guardrails/blob/develop/LICENSE.md)声明Apache-2.0；依赖另核；[官方仓库](https://github.com/NVIDIA/NeMo-Guardrails) |
| Promptfoo | 提示、Agent、RAG评测与红队，CLI/CI配置 | 官方可复现评测配置；不把它当已部署的系统权限网关 | 主要是评测工作流，与在线强制执行功能不可直接等价比较 | MIT；[官方仓库](https://github.com/promptfoo/promptfoo) |
| Microsoft PyRIT | 生成式AI风险识别与红队工作流 | 官方框架、示例和风险评估记录 | 需目标/编排/评分器；不以资料调研断言其没有外部效果观察 | MIT；[官方仓库](https://github.com/microsoft/PyRIT) |
| AgentDojo | Agent攻击/防御与正常任务评估环境 | 动态任务、攻击和防御研究框架 | 可作未来外部任务来源；本项目未跑其数据集，不能称通过AgentDojo | MIT；[官方仓库](https://github.com/ethz-spylab/agentdojo) |
| Thinkst Canarytokens | 欺骗信号与网络活动追踪 | 官方部署、告警与多种Token机制 | 信号不自动等于Agent执行隔离；服务器配置和目标不同，不能直接比触发率 | [实际LICENSE](https://github.com/thinkst/canarytokens/blob/master/LICENSE)为GPLv3加声明的澄清/例外条款，不能简化为MIT或标准GPL；本项目未引入其代码；[官方仓库](https://github.com/thinkst/canarytokens) |
| Agent Canary 3.0 | TypeScript受控SDK登记资源，持有fd、固定argv、有限HTTPS及MCP回调；Policy/Guard/审批在执行前 | 公开冻结版本、原始真实Qwen、A正对照及同宿主目标观察、Schema与负例；E4尚缺 | 限登记工具，不是OS沙箱；敏感会话出口latch可影响合法任务，宽正常集未测 | MIT Community候选；运行时99660b36 |

## 不夸大原创性的三类结论

1. **已有技术工程整合（VERIFIED，限定本仓库）**：能力登记、权限仲裁、tripwire、会话隔离、结构化日志都已有相关先例。本项目将其连接为有限工具执行闭环，不能称全球首创或取代其他框架。
2. **对本项目既有机制的可验证改进（VERIFIED，局部）**：从依赖诱饵接触扩展到首次受限调用的确定性检查。新留出H08/H10各两次A虚拟秘密返回、F执行前credential_resource_denied且未返回。相比无保护有局部效果证据。不能把该结论写成相对竞品优势。
3. **原创研究假设（NOT_VERIFIED）**：Trust Continuity完整授权委托、Causal Attack Graph、E0–E4声明治理效用和自适应诱饵增益。逻辑模型与工程映射已整理，完整形式化证明、独立消融或通用图引擎未建立。

## 实验比较的下一步门槛

选择一个运行时可比方案，固定模型、任务、工具与权限、正常任务、目标观察器和预算。公开对方配置和版本，确认没有把对方未启用功能算作失败。留出集先冻结，保留全部错误与未尝试。此前不公布相对防护率、速度排名或创新“第一”。
