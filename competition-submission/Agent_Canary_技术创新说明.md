# Agent Canary 技术创新说明

## 一句话定位

Agent Canary 是一组面向宿主 Agent 集成的运行时信号与调用隔离组件：MCP 诱饵用于产生可识别的安全信号，Canary Token 用于精确匹配泄露线索，Session Guard 管理会话状态，Guarded Tool Router 在真实工具回调执行前做隔离判定。

它不是任意 Agent、任意 MCP 工具或任意网络操作的全局防火墙。守卫只覆盖集成方明确接入 Router 或 Guard 的调用。

## 解决的问题

AI Coding Agent 会读取仓库、网页和工具输出。间接提示注入可把不可信文本伪装成任务指令，诱导模型读取文件、使用工具或把信息带出当前任务。单靠提示词或静态文本分类，无法证明真实工具回调在风险信号出现后被停止。

Agent Canary 将运行时的信号产生和工具执行边界连接起来：被 Agent 调用的诱饵会触发会话状态转换；宿主随后把危险回调交给 Guarded Tool Router，Router 在调用用户提供的回调前检查会话状态。其价值在于提供一条可审计、可复现的后续调用拒绝路径。

## 核心机制

### MCP 诱饵

项目注册 12 个名称明确的合成工具，覆盖凭据、云控制台、Shell、网络等 Agent 常见工具语义。诱饵返回模拟内容，不访问真实凭据、网络或主机 Shell。调用本身会记录本地事件并可改变 Guard 状态，因此不应描述为“没有任何副作用”。

诱饵的作用是产生信号，不是证明模型已经被攻破。模型可以识别并避开诱饵；本次本地模型小样本中，模型自行选择诱饵的次数为 0。

### Canary Token

SDK 生成高熵随机标记，提供注册、存储、扫描与精确匹配路径。发现受监控内容中的已注册标记时，宿主可以把事件交给对应会话守卫。精确匹配降低了仅凭普通关键词误报的可能，但不能检出没有暴露标记的任意恶意行为。

### Session Guard 与 Router

状态按 `SAFE → TRIPPED → QUARANTINED` 递进。进入隔离后，经过 Guard 的后续真实工具调用在回调之前被拒绝，并写入审计事件。`createGuardedToolRouter()` 需要包住宿主实际使用的真实回调；若某个调用绕过 Router，Agent Canary 不会替宿主拦截它。

### 审计路径

JSONL 事件保留信号与阻断原因，支持脱敏和后续分析。审计记录是集成与调查的证据，不代表已发生的外部副作用可被撤销。

## 与相关工具的关系

| 工具 | 官方资料所述关注点 | 与 Agent Canary 的关系 |
|---|---|---|
| Promptfoo | 支持 Agent 与 MCP 红队测试，生成攻击输入并检查 Agent 的工具轨迹和结果。 | 更适合发现、评估和回归测试；Agent Canary 侧重宿主在运行时把检测信号连接到受守卫工具回调。二者可组合使用。 |
| Microsoft PyRIT | 可组合 target、转换器、评分器、记忆和多轮红队策略，支持自动或人工评估。 | 适合扩展攻击场景和模型评估；Agent Canary 的 Router 是部署集成层的执行控制组件，不替代红队框架。 |

Promptfoo 已提供 MCP 与 Agent 安全测试能力，PyRIT 也已支持多轮策略；因此本项目不声称同类工具“不能测 Agent”或“没有攻击评估”。差异在于关注点与集成面，而非对抗评测能力的高低。

参考：

- [2026 上海开源软件应用创新大赛官网](https://www.oschina.net/os2026/)
- [Promptfoo MCP 安全测试](https://www.promptfoo.dev/docs/red-team/mcp-security-testing/)
- [Promptfoo Agent 红队测试](https://www.promptfoo.dev/docs/red-team/agents/)
- [Microsoft PyRIT 文档](https://github.com/microsoft/PyRIT)

## 实际证据与限制

- SDK/MCP 单元及集成测试通过；本轮 Windows、Node 22 的离线隔离演示确认隔离后的后续受守卫 callback 未执行。
- 真实本地模型试验使用 Ollama 已安装的 `qwen3.5-9b-local`，并将所有危险操作替换为内存中的模拟 callback。它是小样本单模型试验，不代表一般模型表现。
- 在已完成的 safety-aware 试验中，模型主动选择诱饵为 0/10；这说明本轮没有测到模型触发检测信号，不能据此宣传真实模型检测有效。
- 第一次危险调用若在触发信号前执行、绕过 Guard 的回调，以及已经开始的外部操作，不受完整保护。
- 本项目未验证生产支付、真实外部网络、真实凭据或分布式共享状态部署。


## AI 增强版追加记录

AI 增强版追加：可选多模型协议、AI 建议/确定性执行解耦、证据来源绑定与中文本地控制台已实现。真实云端未验证，模型自主诱饵仍为0，不夸大智能阻断。详见 docs/competition/AI_ENHANCEMENT_REPORT.md。
