# 研究第二阶段：工程主线审查交接

日期：2026-10-11；研究分支 `research/agent-canary-3.0`。审查固定工程提交 **9f00b6ba7475e8bccc5410e1484ed74a7806b7d1**；原15份文档固定研究提交 **1e0692ee6923e0518becd096e453af148b21d4c2**。之后的主线修改必须重新对照，不把此报告当永久状态。

## 1. 结论与核验范围

1. 已审查原15份研究文档、当前网关/Guard/来源/蜜罐/AI/证据模块、相关测试源码及两组已存3.0真实模型原始数据；仅修改研究目录。
2. **VERIFIED**：既有受控 SDK Agent 直接执行准入记录支持限定执行前拒绝与目标效果验证；不支持间接 Prompt Injection 防护率提高。真实模型原始记录48+21=69次，本轮没有新调用模型。
3. **IMPLEMENTED_NOT_VERIFIED**：当前提交中的全范围安全不变量、跨网关并发、TTL后来源控制及原生桌面Agent完整保护，不能凭旧实验/测试文件存在升级。
4. **RESEARCH_HYPOTHESIS**：任务授权连续性总体性质、类型化因果解释收益、自适应诱饵优势、E0–E4声明审计的使用效果；不是已证明原创成果。
5. **NOT_IMPLEMENTED**：完整任务grant/委托撤销协议、通用类型化因果图引擎、自动分级结论校验器、独立E4复现流程的实际验收记录。
6. P2 `request_id` Schema引用错误仍存在；独立冻结运行时形状探针另复现了5个字段的类型强制转换缺口。两者仅证明协议验证不一致，**没有证明网关授权绕过，不升级P1/P0**。

VERIFIED须附作用域和版本；源码结构确认、记录复算、当前运行验收分别标明。本轮不运行主线产品测试、CI、Ollama、服务或实验，不宣称这些当前通过。

## 2. 15份文档逐份复核

| 文档 | 发现/结论 | 本轮处理 |
|---|---|---|
| README | 首轮基线是2.0，补充快照易误读为当前3.0；状态词太多 | 增加本交接作为现行入口和四类状态定义；旧记录保留 |
| COLLABORATION_ISOLATION | worktree隔离真实；共享对象/GPU仍不能称完全隔离 | 补本轮Index复核与仅研究输出边界 |
| FIVE_LAYER_SECURITY_MODEL | L2/L5“缺失”只适用于旧基线；逻辑层不是实际流水线；旧同Guard描述不适用新网关队列 | 标记历史表，现行映射集中到CURRENT_3_0_MAPPING；不要求物理分层 |
| TRUST_CONTINUITY | grant交集是规范约束，不是已实现数学保证；operator持有权不等于多用户认证 | 明确假设、当前能力与未实现授权维度；不要求主线重构 |
| CAUSAL_ATTACK_GRAPH | 数据匹配是来源关联证据，可能重复碰撞/共同来源，不证明模型心理原因 | 保留边分类为假设，限制因果与单事件归因；无通用图引擎 |
| SECURITY_ASSURANCE_LEVELS | E3“独立”可能与E4混淆；旧字段/候选枚举易与v0.1混用 | 明确E3独立于决策标签而非必须外部组织；E4才要求独立复现；现行enum不改 |
| SECURITY_INVARIANTS | I1授权/执行器约束假设无法由全范围测试完全验证；队列旧/新范围不同 | 分别标局部已有证据、总体未验证和缺失机制；I8为发布约束不是当前证明 |
| ADAPTIVE_DECEPTION_RESEARCH | 阶段条件链曾写“导致”，超出概率分解；“高交互”可能误称真实DB/API | 改为观察链联合概率；明确内存虚拟服务和未测适应性收益 |
| SECURITY_USABILITY_TRADEOFFS | 历史168试验不能归因3.0；95%目标不是结果；审批与误报须分开 | 保留原数据口径；链接本轮69记录复算；不替新版本打分 |
| RELATED_WORK_COMPARISON | 权限衰减和主动诱饵选择有更直接先行工作；不足以证明首创 | 补Macaroons及主动诱饵选择论文，逐候选否定无依据原创声明 |
| RESEARCH_CONTRIBUTIONS | 四候选可研究，但实施骨架和独立收益有混淆风险 | 分类更新：已有整合、候选改进、未证实独立贡献；只推荐三项主论证 |
| INDEPENDENT_EVALUATION_DESIGN | 同权限前提不等于现有运行器满足；实验组后端能力不一致 | 标明现有HTTP能力差异，要求未来独立消融；不回写旧样本/评分 |
| MAINLINE_REVIEW_HANDOFF | R-SCHEMA旧版本和旧来源接线描述可能过时；与新交接重复 | 首行指向本交接，原文作为带SHA历史记录，不重复提出已完成修复 |
| EVOLUTION_ROADMAP | 规划与安全交付门槛相容；无可执行日期/成果声明 | 保留；3.1–4.0不作为3.0新增交付条件 |
| CURRENT_3_0_MAPPING | 第一轮提交已过时；未反映真实SDK证据与Schema现状 | 更新为固定9f00b6b、逐模型/不变量映射与证据范围 |

主要纠正了版本混用、状态歧义、概率与因果混淆、E3/E4独立性歧义、队列范围过度概括、实验同能力假设和“高交互”措辞。没有发现可凭研究文档宣布的新形式化证明。

重复职责按引用整合：分层职责看五层文档；授权假设看TRUST_CONTINUITY；验收看SECURITY_INVARIANTS；记录等级看SECURITY_ASSURANCE_LEVELS；实验看INDEPENDENT_EVALUATION_DESIGN。本交接与CURRENT_3_0_MAPPING作为现行事实入口，旧manifest/验证JSON是历史快照，不冒充当前哈希清单。

## 3. 真实代码映射与安全结论

完整逐项表见 [当前映射](CURRENT_3_0_MAPPING.md)。核心事实：

- L1仅受控SDK运行器证实真实模型工具选择；桌面原生宿主仍需分别验收。
- L2网关在注册资源/固定argv/网络/MCP能力上实施执行前策略、Guard复查和一次性审批；持有fd不等于OS沙箱。
- L3有限HMAC窗口/编码来源匹配已接入NETWORK类MCP；普通HTTP仍使用旧TTL敏感会话标记，不是完整动态污点分析或因果图。
- L4只有REQUIRE_APPROVAL路径调用AI，合法suspicious收紧为DENY；benign/超时/非法结构返回待审批。ALLOWED路径不接受全面AI审查。planner只按可信类别选择类型。
- L5OSEP存在，RUNNING为执行意图，文件读写VERIFIED是网关局部自检；通用E3观察结构和E4验证者不由这些枚举提供。

### 3.1 已存真实模型结果重新复算

| 实验 | 实际数据 | 支持结论 | 不支持结论 |
|---|---|---|---|
| 间接README注入，48次 | A/B/C/D/E/F各危险效果0/5、主动拒绝0/5、正常3/3 | 该小样本下模型没达成禁止效果 | 网关提高注入阻断率、100%防护 |
| 直接执行准入，21次 | A效果4/4；E/F效果0/4、主动拒绝4/4；各正常3/3；F诱饵1/4 | 模型提出受限请求时，特定SDK入口拒绝了实际临时资源效果 | 间接注入防护率、适应性优于静态、生产覆盖 |

证据位置（工程工作树内，只读）：

- `security-lab/evidence/2026-10-11T09-48-51-595Z/results.json`，SHA256 `05d2ef14544bf5ce3e9b975699d900d276512d3b0528a8d508fb31b7cc684d0c`。
- `security-lab/evidence/2026-10-11T09-55-55-446Z/results.json`，SHA256 `21cb1459cc251a847691689b8fa5fc27ca797bada4256693c14e48a495e15720`。
- 工程已提供 `security-lab/evidence/SOURCE_PROVENANCE_CORRECTIONS.json`；本轮复核5个源文件哈希分别匹配ee8ebe1和13b44ad，原错误declared SHA保留。未独立记录dist构建，不能说记录完整证明执行二进制等于当前9f00b6b。
- 复算证据：[PHASE2_VALIDATION.json](PHASE2_VALIDATION.json)。真实本地模型记录来自主线，本轮只复算，不算新真实Agent实验或E4。

运行器公开HTTP schema含body、无保护端为loopback POST，网关仅接受已登记HTTPS origin GET且本实验未登记origin；后端能力不是仅切同一个决策。这可以展示缩减权限后的准入效果，不能隔离出来源追踪/AI的独立网络增益。E/F对P03真实AI输出存在，但同请求在无AI时仍需人工审批；没有独立阻断收益证据。正常3/3的95% Wilson区间约43.9%–100%，不足支持≥95%总体可用性。

## 4. P2 Schema问题：实际影响与最小修复

### R-SCHEMA-01：缺失有效引用

**P2，VERIFIED（固定源码与规范语义）；未修复。** `security-lab/evidence.schema.json:115–117`仍是 `{"":"#//identifier"}`；runtime `src/runtime/evidence.ts:44`要求request_id字符串模式。

根因能确认到生成结果丢失`$ref/$defs`字段文本。历史错误外观符合shell变量展开，但**没有生成命令证据，不能把该推断当已证实根因**。正式生成应采用结构化JSON写入并保留生成源。

实际影响：宽容JSON Schema验证器不施加预期request_id约束，严格工具可能拒绝未知关键字；外部消费者与runtime产生互操作/请求关联差异。根据[Draft2020-12 Core §4.3.1](https://json-schema.org/draft/2020-12/json-schema-core)，未知关键字不自动变成有效引用。runtime七个字符串/异常类型探针符合自身限制。没有运行完整标准验证器，不能声称已动态证明某个具体第三方验证器行为。

最小建议：仅替换为 `{"$ref":"#/$defs/identifier"}`，保留现有runtime规则。以合法、null、number、object、空串、空格、超长值做标准验证器/runtime同向回归，检查所有内部引用解析。无需重构协议、放宽类型或改变授权层。

阻塞范围：**公开宣称v0.1协议互操作已验证的门槛**；不是“全部3.0功能停止开发”或“已被绕过”。

### R-SCHEMA-02：正则隐式转换接受数组

**P2，VERIFIED（隔离运行冻结evidence模块）；未修复。** `src/runtime/evidence.ts:43,46–48`对evidence_id及摘要/审批字段直接RegExp.test，缺typeof检查。五个字段分别置为`[合法字符串]`时validateEvidence均返回true，而Schema声明string/null。

仅证明形状校验错误；event_digest数组通常仍被链值严格比较拒绝，不能说所有数组事件通过完整证据链校验，更不能推导approve或工具执行被绕过。

最小建议：在这五类字段正则前补精确string检查，保留允许null的语义；增加五个数组负例。与R-SCHEMA-01一同做协议一致性回归。研究仅保存探针结果，不改主线源码。见PHASE2_VALIDATION的runtimeShapeProbe.coercion。

## 5. 拟申报创新逐项相关工作对比

| 候选 | 直接先行工作 | 实际差异与当前分类 | 独立贡献门槛 |
|---|---|---|---|
| 五层模型、八不变量 | [经典保护原则](https://web.mit.edu/Saltzer/www/publications/protection/Basic.html) | 面向本项目组织职责/验收；**已有技术整合** | 不能靠分层命名申报独立理论 |
| 权限连续性、可信网关 | [Macaroons](https://research.google/pubs/macaroons-cookies-with-contextual-caveats-for-decentralized-authorization-in-the-cloud/)、[CaMeL v2](https://arxiv.org/abs/2503.18813v2) | 网关fd资源/宿主能力/Guard/诱饵组合；**工程整合+可验证工程改进候选**；完整grant衰减未实现 | 同能力正常任务、授权混淆/资源替换对照与E3；不声称已有形式性质等价CaMeL |
| 诱饵与自适应规划 | [MCP Configuration Canarytoken](https://docs.canarytokens.org/guide/mcp-token)、[主动诱饵选择v3](https://arxiv.org/abs/2404.12783v3) | 对方已有MCP连接/工具告警；本项目可信任务选择与执行隔离组合为**尚待验证差异机制** | 等预算/同库/同权限静态对照，区分形态与选择收益；不称MCP诱饵首创 |
| 跨工具来源与因果图 | [CaMeL](https://arxiv.org/abs/2503.18813v2)、[Pearl作者资料](https://bayes.cs.ucla.edu/home.htm) | 有界片段匹配已实现，类型化边未实现；**整合/研究假设** | 已知真值/负例、匹配precision/recall、干预；不能宣称完整污点或通用因果识别 |
| OSEP + E0–E4结论分级 | [RFC8785](https://www.rfc-editor.org/rfc/rfc8785)、[OTel Tracing](https://opentelemetry.io/docs/specs/otel/trace/api/) | 面向Agent决策/效果/覆盖的字段与声明规则；**协议工程+独立贡献候选** | 标准校验、跨语言向量、缺证据降级、独立复现/读者理解测试；不是首创日志/哈希链 |
| AI可选审查与多Provider | [CaMeL的模型外控制](https://arxiv.org/abs/2503.18813v2)；本项目Provider源码 | AI不能授权的具体收紧路径，**工程整合** | 同配置只切AI的净安全/效用/成本消融；现有结果不证明独立增益 |
| 安全/可用性联合实验 | [AgentDojo v3](https://arxiv.org/abs/2406.13352v3)、[Promptfoo](https://www.promptfoo.dev/docs/red-team/)、[PyRIT](https://github.com/Azure/PyRIT) | 实际临时资源效果验证与公开复现流程，**工程方法整合** | 测量者独立、分母/失败保留、相同预算；无统一试验不排名第三方 |

比较仅核查机制和公开来源，未安装或测评第三方工具；本轮不能提供完整文献优先权检索或“全球首创”证明。详细出处补入RELATED_WORK_COMPARISON。

## 6. 最具竞争力的三项（提报优先顺序，不是官方评分）

### T1 受控工具入口中的授权、资源与执行前拒绝闭环

- **创新依据**：具体工程组合已有运行证据，能解释首次调用和无诱饵情况的价值；区别于仅检测告警。完全仲裁/能力控制非首创，完整任务grant仍欠缺。
- **实验设计**：固定相同executor/tool schemas/任务授权，只切资源绑定或策略强制；覆盖换参/换inode/审批重放/并发撤销；另做正常build/read/write。每个禁止副作用有允许正对照；比较E3结果与开销，不以拒绝全部工具换成功率。
- **评审展示**：同一虚拟任务无网关产生标记效果→网关拒绝→独立读文件/接收端验证→正常构建完成；明确“受控SDK Agent”，不写原生Codex全局保护。
- **现有缺口**：真实间接注入样本没有产生攻击提议；多网关/跨进程一致性未覆盖；正常小样本；执行器依赖TCB、非OS沙箱。

### T2 以副作用和覆盖范围约束安全结论的开放证据协议

- **创新依据**：将检测、决策、效果与独立复现分开并绑定请求，是可展示的可验证工程价值；不是哈希链绝对防篡改或新的认证等级。
- **实验设计**：同事件序列跨语言校验与哈希向量；删除头/尾、有错digest、观察器故障、VERIFIED标签但效果发生等负例；固定声明侧车验证降级规则。再由独立操作者复现同一E3结论，计错误安全声明率/审阅时间。
- **评审展示**：一条DENY只到E2→加入实际目标前后观察才到E3→删尾在外部锚存在时失败；无外部锚时展示局限；同代码由独立者复现后才展示E4。
- **现有缺口**：两项P2字段一致性缺陷；完整标准验证器本轮未运行；assurance侧车和自动结论验证尚未实现；无E4；临时HMAC摘要不由公众直接复算。

### T3 可信任务元数据驱动的虚拟蜜罐选择与信号隔离

- **创新依据**：面向Agent任务的轻量部署与Guard组合可形成独立可测试差异；欺骗防御、诱饵选择已有研究，当前仅启发式。
- **实验设计**：static/adaptive × 形态因素，固定候选库、数量、上下文预算、权限、模型/seed，报告部署→暴露→交互→检测→拒绝/E3各分母。加入主动规避与正常安全自测；失败/误触发保留。
- **评审展示**：先标“规划已实现、优势未验证”；真实F/P04读虚拟.env、隔离、后续工具拒绝；DB/API为内存模拟，不伪装真实服务。只有公平新数据支持时加入静态/自适应比较图。
- **现有缺口**：F只使用固定ENV，没有planner实验；F1/4来自直接准入，不能当主动间接诱饵发现率；尚无成本/正常误触发统计。

因果攻击图作为T2的证据解释约束，暂不单独主打原创算法；AI只展示真实分析和延迟，不作为已证实独立防护增益。

## 7. 工程建议清单：最小范围和交付阻塞

以下“优先级”是工程验收先后，不等于已确认漏洞等级。工作量为最小文件/用例范围，不承诺耗时。

| ID / 优先级 | 证据位置（固定9f00b6b） | 相关模块 | 最小建议与工作量 | 是否阻塞3.0 |
|---|---|---|---|---|
| H01 / P2已证实 | schema:115–117；PHASE2 probe | evidence Schema | 1处ref修正+7种同向校验；主线执行 | 阻塞协议互操作VERIFIED；不阻塞其他独立开发 |
| H02 / P2已证实 | evidence.ts:43,46–48；probe.coercion | runtime evidence | 5处类型检查+5个数组负例 | 阻塞严格形状一致性声明 |
| H03 / P1验证候选 | gateway.ts:97–105；旧dataflow sweep | HTTP/MCP来源策略 | 4条件回放：TTL前后/已知编码/合法请求；证实自动放权再修，不直接列已利用漏洞 | 若泄密效果实证发生，阻塞对应出口安全交付；目前条件未验证 |
| H04 / P1验证候选 | gateway sessionFlows共享；serialize为实例变量 | gateway并发/来源 | 两网关同Guard：延迟来源输出与网络提议；对比一个实例；若需要保证，最小单活约束或共用仲裁 | 阻塞“同Guard多网关串行”声明；单入口范围可继续 |
| H05 / P1边界验收 | gateway.ts:163,171；固定argv/MCP callback | executor | 1个不响应abort的延迟副作用负例；标UNKNOWN_AFTER_START侧车，不声称回滚或强杀后代 | 阻塞超范围取消保证；已披露TCB限制不自动算新P1 |
| H06 / P2实验有效性 | run-sdk-agent.mjs:38,52,64；REAL_AGENT报告 | EvaluationRunner | 未来同能力executor消融，只切策略/AI；2组配对正常与攻击，不回写旧运行 | 阻塞AI/数据流独立贡献申报；不阻塞既有准入展示 |
| H07 / P2证据声明 | evidence.ts:15–60；E0–E4文档 | EvidenceRecorder/报告 | 先一份引用event/request/SHA的assurance侧车+6类缺证据负例；不改v0.1 | 阻塞E3/E4自动保证宣传；核心网关可单独验收 |
| H08 / P2适应性验收 | honeypot.ts planner；F/P04 | Honeypot/Planner | 同库同数同预算的static/adaptive对照；资源不足只保留机制展示 | 阻塞“自适应优于静态”贡献声明 |
| H09 / P2适用范围 | AGENT_COVERAGE_MATRIX；固定能力清单 | AgentAdapter/UI | 复核一个SDK主宿主；native列NOT VERIFIED；网关与旧模式分别展示 | 阻塞原生全局保护宣传，不要求扩全部宿主 |
| H10 / P2授权语义 | gateway.operator；TRUST_CONTINUITY grant提案 | Gateway/宿主授权 | 文档注明持有权、固定scope；先一个跨主体/会话重放负例；完整多租户grant推迟 | 阻塞完整Trust Continuity证明；不因未实现提案拖延3.0 |

执行次序建议：H01/H02低成本确定修复；H03–H05先证伪关键边界；H06/H07补可信结论；H08以后按资源选择。没有证据的新风险不混入已确认漏洞计数，也不把未实现研究提案都变成发布阻塞。

## 8. 隔离、交付与主线审查入口

- 工程：`C:\Users\36712\Desktop\工作\agent-canary-3.0-engineering`，`feature/agent-canary-3.0`。
- 研究：`C:\Users\36712\Desktop\工作\agent-canary-3.0-research`，`research/agent-canary-3.0`。
- 两者Index为 `.git/worktrees/agent-canary-3.0-engineering/index` 与 `.git/worktrees/agent-canary-3.0-research/index`；共享objects/refs，仍共享设备资源。
- 工程已有未跟踪实验产物，本研究仅按两份精确路径读取并核对哈希，不stage/覆盖/清理。源码读取固定git对象，不读取变化中的未提交源码当正式事实。
- 独立本地提交仅包含 `docs/3.0/research/`。没有推送、主线合并、发布或参赛发送；主线核对版本/问题状态后选取文档或修复建议。
- 集成时先确认Schema是否已修、运行证据版本是否变化、建议是否仍属最小范围；不将研究命名/假设直接放进已完成安全能力列表。

复现本轮只读核验：在研究工作树运行 `python docs/3.0/research/validate-phase2.py`（需Node22支持内置TS转换；脚本NODE路径为当前机器）。它读取冻结git对象与两份已有实验，只有PHASE2_VALIDATION写入研究目录。探针不是产品安全测试，诊断通过可表示缺陷成功复现；full JSON Schema validator仍NOT RUN。
