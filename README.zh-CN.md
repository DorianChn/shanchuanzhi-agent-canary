> Windows 预发布下载：[Community candidate.4](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.4)。安装器无需另装 Node/Python/Git；未签名，本机 GUI 已验收，干净 Windows VM 与 E4 未验证。仅已接入工具受保护。

> 3.0 Community product acceptance / 产品验收：本轮修复候选说明见 [RELEASE_READINESS](docs/3.0/RELEASE_READINESS.md)。旧 npm 兼容版本 1.2.7 与 Community 产品版本分列；CLI `build-info` 可查看构建身份。仅已接入的工具受保护，原生宿主及干净 Windows VM 限制公开披露。

# agent-canary

> 自动 E4 桌面功能正在开放 PR 分支开发，**尚未包含在公开 candidate.4**。当前源码流水线会生成有界本地证据包；不会启动/恢复虚拟机、调用 GPT-6、修改 GitHub，也不会自动证明外部 E4。详见[自动 E4 范围与复现](docs/3.0/AUTO_E4.md)。

给 AI 编程 agent 装绊线。它在你的环境里布置诱饵 MCP 工具和金丝雀令牌，并给 SDK 集成提供会话熔断器，在发现失陷信号后阻断下一次经过守卫的真实操作。

## 版本与分发范围

- **发行状态：** v3.0.0 已作为 [Agent Canary 3.0 GitHub Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0) 发布；该发行版对应其源码快照。
- **安装：** v3.0.0 源码清单声明了通过 GitHub Packages 分发的 CLI 包，该渠道需要带 `read:packages` 权限的 GitHub Token。本次审查未验证实际包下载；见[快速上手](GETTING_STARTED.md)中的固定 tag 源码构建方式。
- **容器镜像：** 本次审查**未验证**当前 GHCR 包和标签是否可用，也未执行本地拉取或运行；不要假定 `3.0.0` 或 `latest` 当前可拉取。
- **独立 E4 复现：** 尚未验证；[证据索引](E4_EVIDENCE_INDEX.md)列出已完成与未完成的检查。
- **许可证：** 本仓库代码为 MIT。第三方依赖各自保留原许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- **运行环境：** 从源码构建需要 Node.js 20 或更高版本。

本开发分支是独立候选，当前 package manifest 仍为 1.2.7。

面向支持 stdio 的 MCP 客户端；非 MCP agent 可以用 SDK。本次审计用 MCP
JavaScript 客户端验证了 stdio 协议，没有逐个验证各编辑器的安装界面。Node 20+，MIT，无遥测。

中文文档（本文件）｜ [English](README.md)

**历史 3.0 工程候选证据（2026-10-12）**：[验收报告](docs/3.0/FINAL_3_0_ACCEPTANCE.md) · [公平真实模型对照](docs/3.0/FAIR_CORE_EVALUATION.md) · [E0–E4证据映射](docs/3.0/EVIDENCE_ASSURANCE_MAPPING.md)。受控 SDK Agent 的执行前控制已有真实效果证据；原生客户端全局防护、AI 独立收益、自适应效果未验证。保留 2.0 竞赛版本；该报告不代表当前开发分支已成为稳定发行。

**类型修复补充候选**：[candidate.2](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.2)内置dist/sdk.d.ts、./sdk类型导出及三命令离线复验；33个运行时JS与candidate.1逐字节相同。已发送的candidate.1及原视频/PPT保留。[新增Claude原生Read/Bash限定证据](docs/3.0/AGENT_COVERAGE_MATRIX.md)属于独立的直接准入测试，不能作为全局保护或新Prompt Injection防护率。

## 覆盖范围与限制

- **原生 Codex Shell — UNPROTECTED（未保护）：** 内置 Shell 不在 Agent Canary 路径内；配置 MCP/Guard 不改变该边界。
- **AppContainer — LIMITED（有限）：** 仅覆盖已测试的子进程操作，尚未证明整个宿主或通用 Shell 保护。
- **Security Center — PARTIAL（部分）/ 产品验收 NOT_VERIFIED：** 当前 Console 实现 GET 状态接口及分别授权的固定探针/配置目标读取接口。M4 仅消费状态。这些接口不证明通用产品文件或 OS 原子级保护。见 [API 契约](docs/3.0/API_CONTRACTS.md)与[问题 #52](https://github.com/DorianChn/shanchuanzhi-agent-canary/issues/52)。
- **Security Center / E4 后端缺失 — UNKNOWN（未知）：** 404 或状态不可用必须保持 UNKNOWN，不能推断已保护或成功拒绝。
- **E4 — NOT_VERIFIED（未验证）：** 合成 fixture、源码检查和 CI 都不等于独立产品 E4 通过。

宿主与功能状态见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 3.0 竞赛候选与后续发展

[下载免费候选 Release](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v3.0.0-competition-candidate.1) · [公开复现索引](competition-submission/roadshow-3.0/GitHub公开复现索引.md) · [发展路线补强版路演](competition-submission/roadshow-3.0/development-plan-update/README.md)

运行时冻结于99660b36db9d5b1121eea6fe06b026c5f1e36bcf。已验证防护限受控SDK的登记工具；配置MCP不代表原生宿主全局防护。普通npm元数据和旧商业包边界见下文，3.0候选不是稳定npm/Docker发行。

|证据方向|现在有什么|下一步及验收门槛|
|---|---|---|
|开发容量|已公开规划估算，实际可用时间待确认|维护者确认开发预算，维护另计；容量不足延期，不承诺全路线按年完成|
|长期维护|10月12日一份真实复盘，公开CI与失败记录|拟每月公开实际SHA、命令、故障、耗时与未验项；完成后才计入维护历史|
|外部参与|复现手册、签收模板、贡献者SDK套件|另一位真实操作者独立环境复现并保存效果观察；目前E4和新增外部参与未验|
|插件协议|冻结SDK接口、candidate.2内置声明及MCP扩展示例|3.1先评审版本化协议，验证类型/导出、权限、取消、生命周期和兼容，再验证一个官方宿主受控入口|

**未来计划**：3.0维护 → 3.1可信Adapter与协议 → 3.2公平消融与误报研究 → 3.5按真实需求评估团队便利 → 4.0权限传播研究。阶段推进取决于资源和验收，不把路线图作为实现证明。整个原路线估算18–31人周；开发约720–1240小时按40小时/人周假设，维护另计，均未确认投入。

详见[资源与证据门槛](competition-submission/roadshow-3.0/development-plan-update/DEVELOPMENT_EVIDENCE_GATES.md)、[贡献者上手](docs/competition/score-review-2026-10-12/CONTRIBUTOR_START.md)、[当前扩展快照](docs/competition/score-review-2026-10-12/EXTENSION_CONTRACT_SNAPSHOT.md)。AI/自适应蜜罐独立收益仍未测得；不因新增计划提高安全结论或评分。

[在线体验与赞助](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [Glama 条目](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary) · [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions)

![Agent Canary — AI Agent / MCP 安全](docs/agent-canary-cover-v2.png)

## Agent Canary 2.0 竞赛预览

可选的[文件持久化状态适配器](docs/FILE_STATE_STORE.md)可保存可信主体的隔离状态，重启后重新读取；默认仍为进程内状态，不能把 Map 当成磁盘持久化。损坏、缺失及锁竞争均拒绝回退为空状态。

[GitHub 预览发行版](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/tag/v2.0.0-competition-preview.1) · [更新后的双语网站](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [下载独立免费构建](https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v2.0.0-competition-preview.1/Agent_Canary_Competition_2_0.zip)

这是 GitHub 竞赛预览发行，不是 npm/Docker 稳定版发布。npm 元数据仍为 1.2.7，请使用明确分离的免费 ZIP。PDF 和视频保留其已验证的冻结核心版本。

可选的[安全 Router](docs/SECURITY_ROUTER_2.md)增加可信宿主参数策略、有界敏感来源提示、realpath 检查、callback 截止时间和事前 AI 审查；原有 CLI、SDK 与确定性 Guard 保持兼容。AI 不能批准操作或解除隔离，事前审查**默认关闭**。

[Agent 接入指南](docs/AGENT_INTEGRATIONS_2.md)提供 Claude Code、Cursor、Cline CLI、Codex 与自定义 MCP 的安全预览、私有备份、安装和恢复。实际桌面任务保护**尚未验证**；自定义受保护 MCP 宿主已用真实本地模型自主调用虚拟 callback 验证，其他服务器及原生工具不自动受保护。

[168 次真实 Qwen 实验](competition-submission/evidence/v2-summary.json)保留 A/B/C/D/E 全部结果。沿用原指标，D1 与 E 的攻击成功均为 1/19；E 对正常任务新增 2/8 硬拒绝，未证明 AI 独立阻断增益。模型自主选择工具，危险效果均虚拟。参见[最终审计](docs/competition/AGENT_CANARY_2_FINAL_REPORT.md)、[冻结版本](competition-submission/V2_DELIVERY_VERSION.md)与[独立免费包](competition-submission/Agent_Canary_Competition_2_0.zip)。普通商业包分发边界仍有 P1；本轮没有发布或迁移商业授权。

## V1.2.7：隔离状态会覆盖紧随其后的重试

V1.2.7 是免费公开版本线。它用明确的诱饵调用和生成令牌的精确匹配作为高特异性信号；
这不等于保证零误报。它保留免费的 SDK 隔离能力，
新增 `createGuardedToolRouter()`，让诱饵和真实工具共用一条经过审查的分发路径；
同时保留完全离线的 `self-test` 和 JSONL / webhook 出口的统一审计脱敏；还会发布精简的 MCP server instructions，让目录和客户端在调用工具前明确知道诱饵无害，以及受守卫隔离的适用边界。使用短期、会话范围 vault 引用的宿主可以额外接入不含 secret 的 `credentialRevoker`，在隔离完成、告警发送前开始吊销；还可用显式共享状态仓库让同一已审查身份的新会话继承隔离状态：

| 层 | 作用 |
|---|---|
| 检测 | 不执行真实操作的诱饵 MCP 工具与已埋放的金丝雀令牌发现失陷信号。 |
| 隔离 | 同步执行 `SAFE → TRIPPED → QUARANTINED`；Router 把诱饵送入隔离，把真实工具送入失败闭合 guard。 |
| 告警 | 状态变更之后写入 JSONL 审计事件，并可发送 webhook / 桌面告警；工具参数和金丝雀值会脱敏。 |

```text
不可信内容 → agent 可能遵循它 → 调用诱饵 / 出现已登记令牌
                              ↓
                        SESSION TRIPPED
                              ↓
                         QUARANTINED
                              ↓
                     危险的受守卫工具调用
                              ↓
                           BLOCKED
                              ↓
                      告警 + 本地审计日志
```

完整 API 与边界见 [docs/containment.md](docs/containment.md)。审计时的 `main`
仍跟踪了 `src/` 中受许可证门控的评测、面板、导出和许可实现；包清单包含整个
`dist/`，因此由此源码构建的包也含有这些编译模块。许可证门控不等于源码隔离。
本次审计不改变现有商业分发边界；不能把当前代码树描述成“V2 源码私有”。

## 问题背景

编程 agent 能读文件、执行命令、调 API。如果它读到被投毒的 README、网页或文档，跟着里面的恶意指令走，可能会悄悄外传密钥，而你没有收到任何提示。

Agent Canary 不给 prompt 打分，也不判断模型是否听从了注入。它等待诱饵被调用或已登记令牌出现，再记录信号。集成误调用也可能触碰诱饵，因此仍需人工核查告警。

- **诱饵 MCP 工具**：假的转账、假的生产密钥读取、假的 root shell。它们不会执行所模拟的操作；每次调用会更新 Agent Canary 本地令牌注册表和审计日志，并可向你配置的 webhook 或桌面通知发送告警。
- **金丝雀令牌**：埋在蜜罐文件里的随机 `cnry_...` 字符串。在扫描文本中发现精确匹配，说明该令牌出现在该文本中；应结合来源和上下文调查。

每个假工具的返回内容里带一次性追踪令牌，"密钥"被外传时能定位到具体哪次调用泄露的。

## 安装免费 V1.2.7

要求：Node.js 20 或更高版本。公开源码构建包含免费 V1.2.7 基础能力：

    git clone https://github.com/DorianChn/shanchuanzhi-agent-canary && cd shanchuanzhi-agent-canary
    npm install && npm run build && npm link

执行 `agent-canary --help` 后，再运行离线隔离自检。免费 SDK 和诱饵路径无需付费许可；
但当前源码/包构建也包含受许可门控的编译模块。若要声称付费源码保持私有，维护者须先
明确并验证独立的源码与分发边界。

### 容器与 Glama 评测

仓库提供一个最小化、仅 stdio 的 Docker 镜像，供 Glama 等 MCP 目录构建免费 V1
服务并内省工具 schema；该过程不需要凭据、网络访问或 V2 交付包：

    docker build -t agent-canary .
    docker run --rm -i agent-canary

镜像启动的是 `agent-canary serve`，提供无害诱饵工具，不执行真实工具。Docker 构建上下文
含编译后的许可校验代码，但不含赞助网关、签名私钥或客户记录。

## 使用

    # 埋一个假密钥蜜罐文件
    agent-canary tokens plant .env.canary --label my-project

    # 注册 12 个诱饵工具到 Claude Code（Cursor 用 install cursor）
    agent-canary install claude

    # 验证告警链路
    agent-canary alert-test

    # 在本地验证 SAFE → QUARANTINED → BLOCKED；不会访问网络或写入用户数据
    agent-canary self-test

重启编辑器。之后如果 agent 调了诱饵或泄露了令牌：

    $ agent-canary events
    2026-09-15T10:21:04Z  decoy_called  tool=canary_read_secrets
    2026-09-15T10:21:09Z  token_found   label=my-project path=report.md

扫描器可以直接接 CI（发现泄露 exit 1），也有实时监控：

    agent-canary tokens check . && echo clean
    agent-canary watch .

## 诱饵清单

agent 眼里这些都是管理员级工具，但它们什么都不做。

| 诱饵工具 | 被劫持的 agent 以为能拿到（仅模拟） |
|---|---|
| `canary_transfer_funds` | 转账，5 万以下自动放行 |
| `canary_read_secrets` | 任意环境的生产 API 密钥 |
| `canary_run_shell` | 构建服务器上的 root shell |
| `canary_delete_files` | 永久删除，无回收站 |
| `canary_send_email` | 以任意内部地址发邮件，跳过 SPF |
| `canary_export_database` | 全表导出 CSV，不留审计 |
| `canary_fetch_internal` | 从内网访问管理后台 |
| `canary_disable_security` | 关闭终端防护 |
| `canary_cloud_console` | 云控制台会话 + 临时凭证 |
| `canary_k8s_exec` | 在生产 Pod 内执行命令 |
| `canary_secrets_rotate` | 紧急轮换凭证（锁死人类操作员） |
| `canary_git_force_push` | 强推受保护分支 |

## 免费版与个人版

当前公开代码树包含受许可证门控的评测、面板、导出和许可实现；签名私钥、客户记录和交付包
不在本次审计的已跟踪文件中。是否将这些实现拆出公共分发，需要维护者先批准商业分发边界变更。

| | 免费版（永久） | 个人版（¥72 / 30 天） |
|---|---|---|
| 诱饵服务器、令牌、监控、告警、安装 | 有 | 有 |
| `eval` 注入抗性评分 | | 有 |
| `dashboard` 攻击链时间线 | | 有 |
| `export` CEF / JSON / CSV 导出 | | 有 |
| V1.2.7 会话熔断器、共享身份隔离、可选凭据吊销、受守卫工具 Router、MCP 安全说明与离线 `self-test` | 有 | 有 |
| SDK 诱饵处理与金丝雀扫描 | 有 | 有 |

V2 Personal 目前采用**人工确认**的微信/支付宝付款流程。请查看公开的[付款说明](https://dorianchn.github.io/shanchuanzhi-agent-canary/pay.html)：其中包含二维码、价格和交付所需信息。作者核对实际到账后才发送安装与激活说明；不承诺自动交付或即时激活。

## 合作与集成

欢迎 MCP 客户端维护者、AI Agent/框架作者、AI 安全研究者和 DevSecOps 团队开展定向合作：

- 集成到 MCP 客户端、Agent 框架或安全模板；
- 运行可复现的 Prompt Injection 抗性评测并共同发布结果；
- 在受控开发环境或 CI 中试点告警与审计链路；
- 讨论付费集成、私有部署或安全评估支持。

请在 [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions)
说明集成目标、范围和首选联系方式。不要提交 API 密钥、付款凭证、客户数据或未公开漏洞。

## 分发与合作渠道

项目已进入[官方 MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.DorianChn%2Fagent-canary)，
并保留 [Glama 展示页](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary)。如果要和更大的安全平台做集成，
[Snyk Technology Alliance Partner Program](https://snyk.io/partners/tapp/) 是一个候选渠道；正式申请或商业条款必须先由维护者确认。
我们不会批量发帖或向陌生人发送骚扰式推广。

## 非 MCP Agent（V1.2.7 免费受守卫工具 Router）

每个 agent 会话创建一个 guard，然后交给一个 Router。Router 用
`guard.runDecoy()` 回答诱饵，并把所有非诱饵回调交给
`guard.executeToolCall()`。

```ts
import { CanaryBlockedError, createAgentGuard, createGuardedToolRouter, decoyToolDefs } from "agent-canary/sdk";

const guard = createAgentGuard({
  sessionId: "support-chat-42",
  // 仅精确列出经审查的安全操作；默认空 allowlist。
  quarantineAllow: ["read_file", "git_status"],
});
const toolDefs = [...myRealToolSchemas, ...decoyToolDefs("openai")];
const router = createGuardedToolRouter({
  guard,
  executeRealTool: realTool, // 由宿主实现真实回调
});

await router.dispatch({ name: "git_status", args: {} });              // SAFE：允许
await router.dispatch({ name: "canary_read_secrets", args: {} });     // trip → quarantine

try {
  await router.dispatch({ name: "http_post", args: { url: "https://example.invalid" } });
} catch (error) {
  if (error instanceof CanaryBlockedError) console.log(error.decision); // action_blocked
}

// 只能放在真人的事件响应控制面，不能注册成 MCP/LLM 工具。
guard.reset({ acknowledgedBy: "on-call-human" });
```

`guard.inspect(agentOutput, "final-answer")` 发现已埋令牌时，会 trip 同一个会话。

## 注入抗性评测

V2 Personal 包含可复现的 20 条攻击载荷评测。人工查看可使用文本输出，CI
可使用 JSON；模型/API 失败会按失败闭合处理，不会被错误计为“已抵抗”：

    agent-canary eval --provider openai --model gpt-4o --format json
    agent-canary eval --provider openai --model deepseek-chat \
      --base-url https://api.deepseek.com/v1 --format json --out eval.json

`decoyToolDefs("anthropic")` 输出 Anthropic 格式。

## 面板与 SIEM

    agent-canary dashboard --out report.html   # 自包含 HTML 时间线
    agent-canary export --format cef           # 或 json、csv

## 保证与限制

- 诱饵工具不会执行所模拟的操作。`canary_run_shell` 不会运行命令；调用会维护 Agent Canary 本地令牌/审计状态，并可能发送已配置告警（见 [SECURITY.md](SECURITY.md)）。
- 金丝雀令牌在哪儿都解不开任何东西。
- 无遥测。事件留在 `~/.agent-canary/events.jsonl`，除非你自己配 webhook。
- 扫描到诱饵调用或已登记令牌时产生告警；误调用或复制测试样例也会产生信号。
- **隔离只覆盖已集成的调用链。** 只有经过 `router.dispatch()`、
  `guard.executeToolCall()` / `guard.beforeToolCall()` 的真实工具调用可以被阻断。如果被劫持 agent 的第一个危险操作绕过这些路径，agent-canary 无法拦截它。诱饵本身无害；一旦先碰到诱饵，guard 就能在之后的受守卫操作前隔离该会话。
- 此版本没有声称支持任意上游 MCP server 的代理；下一阶段的可审计 MCP proxy 设计见 [docs/containment.md](docs/containment.md)。

已知限制：这是 JavaScript，改 `dist/` 可以拆掉许可检查。签名许可提高了白嫖门槛，但它不是 DRM。

## 命令列表

    serve / init / install / uninstall
    tokens generate|plant|check|list
    watch, events, report, dashboard, export, eval
    self-test
    status, activate, alert-test, set-webhook, set-notify

`agent-canary --help` 看详情。

## 开发与开源治理

- 贡献前请读 [CONTRIBUTING.md](CONTRIBUTING.md)，通过 Issue/PR 模板提交可复现且已脱敏的报告。
- 进行安全测试或报告漏洞前请读 [SECURITY.md](SECURITY.md)。
- 可执行的维护计划见 [ROADMAP.md](ROADMAP.md)。
- 参赛实验、复现方式和真实模型/模拟模式边界见 [competition-submission/](competition-submission/README.md)。

## 许可证

MIT
# 可选 AI 分析与中文本地控制台

竞赛强化分支新增 OpenAI、Claude、Gemini 原生协议及 DeepSeek/百炼兼容配置，支持 Ollama、LM Studio、vLLM 和自定义兼容地址。**只有 Ollama 已完成真实本机推理；云端只有模拟协议回归，未验证真实厂商账号。**

```sh
npm ci
npm run build
npm run ai:console
```

打开输出的 loopback 地址，配置已有模型、选择证据、检查预览并分析。密钥只在宿主进程，云端每次推理需确认；AI 无解除隔离或执行工具权限。没有模型时基础防护仍可运行。控制台支持 JSON/Markdown/CSV 报告。

完整参数与隐私边界见 [AI 接入指南](docs/AI_PROVIDERS.md)，真实实验与失败数据见 [AI 实施报告](docs/competition/AI_ENHANCEMENT_REPORT.md)。

## 可选确定性风险策略

SDK 新增 createRiskPolicyRouter，支持 OBSERVE / BALANCED / STRICT。宿主注册工具描述并按参数检查，敏感外传拒绝，普通写入/构建可申请一次性人工批准。AI 仅提供事后解释，不能放权。只保护经过此 Router 的调用；路径、进程、网络和身份边界仍由宿主实现。详见 [策略合同与边界](docs/RISK_POLICY.md)。


## 3.0 工程候选（独立分支，非稳定版）

[Evidence and limitations](docs/3.0/FINAL_REPORT.md) · [SDK integration](docs/3.0/DEVELOPER_GUIDE.md) · [Real local-model trials](docs/3.0/REAL_AGENT_EVALUATION.md) · [Agent coverage](docs/3.0/AGENT_COVERAGE_MATRIX.md).

Draft PR #24; only registered gateway callbacks are protected. Verified 2.0 materials remain available.
