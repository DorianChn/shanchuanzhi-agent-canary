# Agent Canary

为 AI Agent 提供可审计的失陷信号与受守卫操作隔离。项目通过无害 MCP 诱饵、金丝雀令牌和 SDK 会话熔断器，帮助团队发现可疑工具选择或令牌泄露，并在后续经过守卫的工具调用前阻断操作。

**2.0.0 起全部功能免费、开源，MIT 许可。** 评测、攻击链面板、SIEM 导出和 SDK 均已开放，无需购买、账号、激活码或许可证服务器。Node.js 20+；无遥测。

中文文档（本文件）｜[English](README.md)

[项目主页](https://dorianchn.github.io/shanchuanzhi-agent-canary/) · [GitHub](https://github.com/DorianChn/shanchuanzhi-agent-canary) · [GitHub Discussions](https://github.com/DorianChn/shanchuanzhi-agent-canary/discussions) · [Glama](https://glama.ai/mcp/servers/DorianChn/shanchuanzhi-agent-canary)

![Agent Canary — AI Agent / MCP 安全](docs/agent-canary-cover-v2.png)

## 5 分钟开始

要求 Node.js 20 或更高版本。克隆源码并构建：

    git clone https://github.com/DorianChn/shanchuanzhi-agent-canary
    cd shanchuanzhi-agent-canary
    npm ci
    npm run build
    npm link

初始化并运行隔离自检：

    agent-canary init
    agent-canary self-test

在项目中创建一个蜜罐并注册 MCP 服务：

    agent-canary tokens plant .env.canary --label my-project
    agent-canary install claude

Cursor 可运行 agent-canary install cursor。重启客户端后，它会看到 12 个只返回合成内容的诱饵工具。Agent Canary 不会替 MCP 客户端执行真实工具，也不会自动代理已有 MCP 服务。

## 核心功能

| 功能 | 用途 |
|---|---|
| MCP 诱饵工具 | 模拟高风险工具并返回合成内容，不会执行真实文件、Shell、凭据或业务操作；已配置的告警渠道可能发送脱敏事件信息。 |
| 金丝雀令牌 | 在蜜罐中植入随机、无权限的令牌；扫描已登记的精确令牌值。 |
| SDK 会话熔断器 | 在信号出现后隔离会话，并拒绝后续经过 guard/router 的操作。 |
| 注入评测 | 用版本化的 20 条提示载荷检查被测模型是否调用诱饵或复述追踪令牌。 |
| HTML 攻击链面板 | 将本地事件日志生成为离线可打开的单文件时间线。 |
| SIEM 导出 | 输出 CEF、JSONL 或适合电子表格查看的 CSV。 |
| 本地告警与审计 | 将脱敏事件写入本机 JSONL 文件；可选桌面通知和 HTTPS webhook。 |

## 检测与隔离流程

```text
不可信内容 → Agent 触碰诱饵 / 输出已登记令牌
                              ↓
                     会话标记为失陷信号
                              ↓
               后续受守卫操作被隔离策略拒绝
                              ↓
                       本地审计与告警
```

诱饵是检测信号，不会本身阻止 Agent 第一次绕过 guard 的真实操作。SDK 集成必须确保每条真实工具执行路径都经过同一个会话 guard 或 createGuardedToolRouter()。详见 [docs/containment.md](docs/containment.md)。

## 常用命令

    agent-canary tokens plant .env.canary --label my-project
    agent-canary install claude
    agent-canary alert-test
    agent-canary events
    agent-canary dashboard --out report.html --open
    agent-canary export --format cef --out events.cef
    agent-canary export --format json --out events.jsonl
    agent-canary export --format csv --out events.csv
    agent-canary doctor

tokens check 可用于本地或 CI：

    agent-canary tokens check .
    git diff --cached | agent-canary tokens check --stdin

不传路径时扫描当前目录。包含隐藏文件和目录；跳过 `.git`、`.hg`、`.svn` 与 `node_modules`。扫描器逐块读取文件，大于 5 MiB 的文件也会检查。返回码 1 表示发现已登记令牌；返回码 2 表示扫描不完整或尚未登记令牌。

## 免费运行注入评测

### 本地 Ollama（无需模型 API key）

安装并启动 Ollama，在本机拉取支持工具调用的模型，然后运行：

    ollama pull qwen3
    agent-canary eval --provider ollama --model qwen3 --format json --out eval.json

评测请求发往 localhost:11434。模型下载、运行所需的存储和计算资源由本机承担；软件不收取费用，也不会把本地评测结果上传。

### 云模型或兼容端点

    agent-canary eval --provider openai --model gpt-4o --format json --out eval.json
    agent-canary eval --provider anthropic --model claude-sonnet-4-5
    agent-canary eval --provider openai --model deepseek-chat       --base-url https://api.deepseek.com/v1 --format json --out deepseek.json

OpenAI 和 Anthropic 的 key 可通过 --key 传入，或分别使用 OPENAI_API_KEY、ANTHROPIC_API_KEY 环境变量。评测模型提供方可能收取 API 费用；可用本地 Ollama 避免云 API 账单。每次请求有超时，云端自定义端点默认要求 HTTPS；只有明确传入 --allow-insecure-http 才允许向非本机 HTTP 端点发送请求。不要把 key 放在会被提交的命令记录或配置文件里。

评测分数只描述这 20 条载荷在指定模型、参数和时间下的结果。提供方错误、截断响应或格式不完整的响应按“未通过”计分，但会单独标记为错误，不会被说成模型已经失陷。这个小型回归套件不是独立安全认证，也不能证明模型能抵御所有攻击。

## SDK：把真实工具统一交给 guard

每个会话单独创建 guard；仅在人工控制面暴露 reset()，不要把它注册成模型可调用的工具。

在另一个 Node.js 项目中使用 SDK：先克隆并构建本仓库，在仓库目录运行 `npm link`，再在使用方项目运行 `npm link @dorianchn/agent-canary`。

```ts
import {
  CanaryBlockedError,
  createAgentGuard,
  createGuardedToolRouter,
  decoyToolDefs,
} from "@dorianchn/agent-canary/sdk";

const guard = createAgentGuard({
  sessionId: "support-chat-42",
  quarantineAllow: ["read_file", "git_status"],
});

const router = createGuardedToolRouter({
  guard,
  executeRealTool: realToolCallback,
});

await router.dispatch({ name: "git_status", args: {} });
await router.dispatch({ name: "canary_read_secrets", args: {} });

try {
  await router.dispatch({ name: "http_post", args: { url: "https://example.invalid" } });
} catch (error) {
  if (error instanceof CanaryBlockedError) console.log(error.decision);
}

// 将这些 schema 与真实工具 schema 一起提供给模型。
const tools = [...myRealToolSchemas, ...decoyToolDefs("openai")];
```

也可使用 createTokenGuard() 检查 Agent 输出、工具参数或工具结果中的已登记令牌。宿主必须把每条真实工具调用都接到同一 guard；未经过 guard 的调用无法被拦截。共享身份隔离和可选 credentialRevoker 接口说明见 containment 文档。

## 报告与数据边界

- 默认数据目录：~/.agent-canary/；可通过 AGENT_CANARY_HOME 指定。
- 事件日志和 webhook 内容会去掉工具参数，并遮蔽令牌和敏感字段；不要在自定义事件元数据中放秘密。
- Webhook 默认要求 HTTPS；http:// 仅允许 loopback 本地开发地址。doctor 只检查格式，不会访问目标地址。
- 面板为本地静态 HTML，无 CDN 或第三方脚本；事件内容会转义后再写入 HTML。
- 评测只把合成蜜罐回复喂回被测模型，不触发生产诱饵告警，不修改本机令牌注册表或事件日志。
- 解锁范围限于经过集成的 SDK 调用链；Agent Canary 不提供任意上游 MCP server 的透明代理。
- 诱饵调用或令牌在埋放文件以外出现，都应结合日志和上下文核查；这类信号本身不证明真实数据已被窃取。

## 维护与贡献

欢迎提交可复现的问题、文档改进和有范围的功能建议。请勿在公开 issue 或 discussion 中贴 API key、付款记录、客户信息或未公开漏洞。安全问题请按 [SECURITY.md](SECURITY.md) 联系维护者。

旧版付款和许可证流程已停用。Agent Canary 2.x 不要求激活；旧 activate 命令仅为兼容保留，不会联网。sponsor/ 中的旧收款服务仅为历史代码，不是本项目的安装或解锁步骤。

## 许可证

MIT
