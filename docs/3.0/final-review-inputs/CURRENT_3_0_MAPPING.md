# 当前3.0研究模型与代码逐项映射

第二阶段固定提交：**9f00b6ba7475e8bccc5410e1484ed74a7806b7d1**。只读代码、测试源码和已存记录，未重跑产品/模型/CI。第一阶段ee8ebe1/5382448映射保存在研究Git历史1e0692e，不能再作为最新完整事实。

**VERIFIED**＝注明范围的源码结构确认/冻结探针/已存原始记录复算；**IMPLEMENTED_NOT_VERIFIED**＝有实现但缺该性质的充分运行证据；**RESEARCH_HYPOTHESIS**＝模型、约束或机制收益待验证；**NOT_IMPLEMENTED**＝当前核查路径未找到相应机制。状态不授予整个模块“安全认证”。

代码引用均相对固定工程提交。精确文件哈希、旧实验运行SHA及探针见 [PHASE2_VALIDATION.json](PHASE2_VALIDATION.json)；风险与最小动作见 [ENGINEERING_HANDOFF](ENGINEERING_HANDOFF.md)。

## 1. 五层实际映射

| 层/研究职责 | 实际模块与路径 | 状态及准确范围 | 缺口 |
|---|---|---|---|
| L1 Agent Interaction：实际调用入口 | security-lab/run-sdk-agent.mjs；src/agent-integrations.ts；protected-mcp | VERIFIED（既有受控SDK记录：真实Qwen工具选择）；配置/握手机制存在 | 原生桌面宿主当前完整OS工具保护未验证；不得按名单说全局支持 |
| L2 Trusted Enforcement：实际执行仲裁 | runtime/gateway.ts::policy/execute/dispatch/operator；containment.ts | VERIFIED（既有准入E/F 0/4危险效果，局部E3）；当前全范围IMPLEMENTED_NOT_VERIFIED | 固定fd/argv/HTTPS/MCP能力，不是通用Shell安全语义或OS沙箱；完整task grant未实现 |
| L3 Causal Security：边界来源关联 | runtime/dataflow.ts；src/dataflow.ts；gateway NETWORK MCP分支 | IMPLEMENTED_NOT_VERIFIED（有限16字符、Base64/URI匹配接线存在）；来源同Guard跨网关保留 | 类型化图NOT_IMPLEMENTED；TTL/容量/短片段/未知变换限制；无模型内部完整污点 |
| L4 Adaptive Intelligence：分析/规划 | runtime/gateway.ts::aiDenies；ai/provider.ts；honeypot.ts::planAdaptiveDecoys | VERIFIED（历史真实审查2次schema有效输出）；planner效用IMPLEMENTED_NOT_VERIFIED | AI仅收紧待审批路径，不审查全部ALLOW；适应性/AI独立增益RESEARCH_HYPOTHESIS |
| L5 Assurance & Evidence：记录/验收 | runtime/evidence.ts；security-lab/evidence.schema.json；run-sdk-agent/summarize | VERIFIED（当前形状探针与原始记录复算）；OSEP全互操作IMPLEMENTED_NOT_VERIFIED | 两项P2不一致；自动声明分级NOT_IMPLEMENTED；无独立E4 |

逻辑层表示职责，dispatch不会机械地调用五层全部模块。AI只在待审批条件运行；不能将概念图当全调用路径运行证明。

## 2. Trust Continuity逐项映射

| 性质 | 实际机制 | 状态与限制 |
|---|---|---|
| 权限来源 | GatewayOptions由宿主构造；agent仅dispatch；operator宿主持有能力 | VERIFIED（代码结构与既有记录）；远程人类认证由宿主承担 |
| 权限不自动传播 | schemas拒绝approved等额外参数；agent无approve/reset/资源注册 | IMPLEMENTED_NOT_VERIFIED（全面恶意输入性质）；相应测试源码存在，本轮未重跑 |
| 任务资源范围 | files预注册、root.realpath、fd、固定command、readOrigins/MCP表 | IMPLEMENTED_NOT_VERIFIED（任务全语义）；范围清单不是完整TaskGrant |
| 工具主体 | 固定agentId、guard.sessionId、tool id和request摘要 | VERIFIED（结构）；agentId来自可信host，不认证外部远程操作者 |
| 审批重放/过期 | pending不可变请求、TTL、先delete再execute、实例队列 | IMPLEMENTED_NOT_VERIFIED（全边界）；gateway测试含顺序重放/过期；恰等期限/跨进程未充分验收 |
| 授权变化/撤销 | 执行前policy/Guard重查；初始化scope | IMPLEMENTED_NOT_VERIFIED（有限复查）；revocation_epoch/父grant失效传播NOT_IMPLEMENTED |
| 新session | Guard principalId+共享store可选；sessionFlows按Guard对象 | IMPLEMENTED_NOT_VERIFIED（部署依赖host）；审批独立，不自动跨session传播 |
| 委托衰减 | 理论G元组/交集约束 | RESEARCH_HYPOTHESIS；签名grant、父子委托协议NOT_IMPLEMENTED |
| 并发一致性 | 单gateway tail；WeakMap仅保存来源 | IMPLEMENTED_NOT_VERIFIED（多gateway）；不能照搬旧Router同Guard队列为新gateway保证 |

TC-1是条件命题：完整仲裁、认证/资源绑定、授权消费与executor副作用契约正确后才成立；没有当前系统全部满足前提的形式化证明。

## 3. Causal Attack Graph逐项映射

| 关系 | 已有代码/记录 | 状态与可支持结论 |
|---|---|---|
| TEMPORAL | trace.turn、timestamp、哈希链顺序 | VERIFIED（记录顺序）；跨进程时钟及模型因果不可推导 |
| DATA_ORIGIN | HMAC窗口/有限编码；旧flow标签 | IMPLEMENTED_NOT_VERIFIED（所有变换）；值关联不是意图或完整因果 |
| INVOCATION_DEPENDENCY | 运行器turn+工具循环、OSEP request_id | VERIFIED（受控宿主调用记录）；通用父子图NOT_IMPLEMENTED |
| AUTHORIZATION_DEPENDENCY | pending、approval_reference、execute重查 | IMPLEMENTED_NOT_VERIFIED（全面绑定/主体）；完整grant依赖图NOT_IMPLEMENTED |
| MECHANISTIC_EFFECT | direct raw.sideEffects与trace；文件前后观察 | VERIFIED（限定资源记录）；不扩为全部系统副作用或当前代码全量性质 |
| CAUSAL_HYPOTHESIS | 研究结构模型R=f(U,X,M)，AI解释 | RESEARCH_HYPOTHESIS；不得让AI虚构事实节点 |
| INTERVENTION_SUPPORTED | A/E/F准入组受控效果对照 | VERIFIED（缩减能力后的准入效果）；AI、自适应、注入原因独立效应RESEARCH_HYPOTHESIS |

通用类型化边、图查询、关系证据校验器：NOT_IMPLEMENTED。source_event_ids/relation_type是报告侧车建议，不是当前OSEP字段。

## 4. E0–E4逐项映射

| 等级 | 当前证据入口 | 状态/限制 |
|---|---|---|
| E0设计声明 | ARCHITECTURE、THREAT_MODEL、SECURITY_BOUNDARIES与本研究 | VERIFIED（文档存在且代码对照）；不能直接升为防护成果 |
| E1实际观察 | F/P04 honeypot READ、Guard状态、工具trace | VERIFIED（历史direct限定事件）；不是主动间接注入检测率 |
| E2可信决策 | gateway策略/审批及raw.evidence.request_id | VERIFIED（历史拒绝记录）；RUNNING是意图，不是executor启动见证 |
| E3目标效果 | raw.sideEffects、victim/build检查、sink计数、A正对照 | VERIFIED（有限终态记录）；独立于决策标签，由同一host观察，无外部持续监测；不是原生工具全覆盖 |
| E4独立复现 | 复现脚本与源码/哈希已存在 | RESEARCH_HYPOTHESIS（方法）；实际独立操作者/环境验收记录NOT_IMPLEMENTED；本轮复算不是E4 |

实际v0.1：16个必需字段；execution_status为NOT_STARTED/RUNNING/SUCCEEDED/FAILED/CANCELLED；side_effect_verification为NOT_STARTED/VERIFIED/NOT_VERIFIED/FAILED。observer/window/UNKNOWN_AFTER_START属于侧车候选，不能插入additionalProperties:false的事件。

canonicalJSON采用有限JSON、UTF-16键排序和ECMAScript JSON.stringify，明确不是完整RFC8785。临时HMAC保护隐私但公众不能自行复算；哈希链只有相对可信锚的完整性，不认证事件真实、阻止管理员重写整链或提供独立时间戳。

## 5. I1–I8逐项映射

| 不变量 | 实际实现/证据 | 当前范围状态 | 未满足/不可证明范围 |
|---|---|---|---|
| I1未授权高风险不得执行 | 能力清单、Guard复查、held fd、固定argv；direct E/F效果0/4 | VERIFIED（历史限定准入）；整体IMPLEMENTED_NOT_VERIFIED | 隐藏callback副作用、原生旁路、多gateway并发、完整grant |
| I2低信任输入不得取得用户权力 | schemas、独立operator、Provider无管理接口 | IMPLEMENTED_NOT_VERIFIED（性质）；结构VERIFIED | host泄露operator、远程人身份不由库自动认证 |
| I3 AI不绕过策略 | aiDenies仅于REQUIRE_APPROVAL；false仍待批；执行前重查 | VERIFIED（源码允许动作闭包）；恶意输入语义稳健性IMPLEMENTED_NOT_VERIFIED | 误拒绝仍损可用性；不证明模型判断可靠 |
| I4审批不超原授权 | 一次性pending、不可变request、资源重查 | IMPLEMENTED_NOT_VERIFIED；相关测试已实现 | 完整grant/task/撤销上界NOT_IMPLEMENTED；operator持有该实例scope |
| I5虚拟资产无生产凭据 | 随机ID+固定无效模板、独立temp，无真实数据读取 | VERIFIED（生成器结构+历史虚拟资产记录） | 外部host替换/手工挂载真实文件不在模板保证内；不是全仓库secret证明 |
| I6结论关联证据/范围 | 请求HMAC、链、source correction、报告局限 | IMPLEMENTED_NOT_VERIFIED（自动全报告约束） | 自动声明校验器NOT_IMPLEMENTED；Schema/类型P2待修 |
| I7失去能力须降级 | evidence.canRecord阻止准入、coverage矩阵 | IMPLEMENTED_NOT_VERIFIED（完整health模型） | 原生旁路和observer掉线需独立健康检查 |
| I8优化不能破坏边界 | 预注册正常/攻击、失败保留、拒绝测试源码 | RESEARCH_HYPOTHESIS（持续验收契约） | 当前测试不能证明所有未来变更；逐差异回归，不降低hard DENY |

旧Router的OBSERVE/BALANCED/STRICT不自动是新gateway模式；网关能力清单为强制边界，没有通用OBSERVE切换参数。不得为“模式统一”放宽它。
