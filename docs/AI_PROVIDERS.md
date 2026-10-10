# 可选 AI 辅助分析

Agent Canary 的诱饵、Token、Guard、Router 保持确定性执行。此模块不接收 Guard 实例，不提供 Reset、Shell、密钥读取或策略修改工具。AI 输出只作调查建议；AI 返回 benign 或 API 断开都不能解除隔离。

## 接口与验证范围

| 服务 | 协议 / 默认地址 | 本轮证据 |
|---|---|---|
| OpenAI | Chat Completions / https://api.openai.com/v1 | 本地模拟官方 wire 格式与 usage 回归；真实云端 NOT VERIFIED |
| Anthropic Claude | 原生 Messages / https://api.anthropic.com/v1 | 系统提示分离、x-api-key、anthropic-version、content/usage 回归；真实云端 NOT VERIFIED |
| Google Gemini | 原生 generateContent / https://generativelanguage.googleapis.com/v1beta | systemInstruction、contents、generationConfig、x-goog-api-key、usageMetadata 回归；真实云端 NOT VERIFIED |
| DeepSeek | OpenAI-compatible / https://api.deepseek.com | 共用兼容适配；真实厂商 NOT VERIFIED |
| 百炼 / 通义千问 | OpenAI-compatible / https://dashscope.aliyuncs.com/compatible-mode/v1 | 共用兼容适配；用户须选择账号地域对应地址；真实厂商 NOT VERIFIED |
| Ollama | 原生 / http://127.0.0.1:11434 | 已查询本机模型，完成真实结构化分析与真实模型工具选择实验 |
| LM Studio | OpenAI-compatible / http://127.0.0.1:1234/v1 | 已实现适配；本机服务未验证 |
| vLLM | OpenAI-compatible / http://127.0.0.1:8000/v1 | 已实现适配；本机服务未验证 |
| 自定义 | 明确选择上述协议及 local/cloud | 不是任意 HTTP 协议翻译器；私网远端地址不允许 |

调用 `createAIProvider(config)`，使用 `listModels(signal?)`、`testConnection(signal?)`、`analyze({events,cloudConsent?,signal?})`。testConnection 只查模型，不调用推理。分页模型列表当前只取第一页；服务不支持 `/models` 时连接诊断失败不等于推理接口不可用。

## 本地快速开始

```sh
npm ci
npm run build
node dist/index.js ai models --provider ollama
node dist/index.js ai test --provider ollama
npm run ai:console
```

打开输出的 `http://127.0.0.1:4318`。保存并检测 → 选择已安装模型 → 运行离线演示或选择审计事件 → 检查预览 → AI 分析 → 下载 JSON/Markdown/CSV。新分析、模型配置与报告保存在当前进程内；退出后不保留，需下载报告。没有 localStorage，也没有保存 API Key 的接口。

Ollama 仅查询/使用已安装模型，不下载模型，不修改全局服务或模型设置。默认上下文 4096，可显式设置 2048–8192；这不是资源适配保证。本次主机为 Windows x64、Ryzen 9 9955HX、约 31.18 GiB 内存，验证模型为 Qwen 9B Q4_K_M、5,629,108,857 字节。当前适合安全分析的程度只能根据样本测量，不根据模型名称或体积判定。

LM Studio/vLLM 必须自行启动 loopback 服务，选择 preset、地址与正确模型 ID，再检测。没有运行服务时返回明确失败，基础防护不受影响。

## 云端配置与隐私

密钥仅通过宿主 SDK 参数或启动环境 `AGENT_CANARY_AI_KEY` 提供。不要使用 CLI 参数传密钥，也不要在公开示例、版本库、前端、报告中保存。当前未实现操作系统 keyring；可由宿主安全凭据代理在启动时注入短期密钥。环境变量也不是操作系统密钥保险箱，需限制同用户进程访问。

带密钥启动控制台时，同时设置 `AGENT_CANARY_AI_KEY_ORIGIN` 为允许的确切云端 origin（例如 `https://api.openai.com`）。切换至其他 origin 会拒绝，防止把某厂商密钥发送给另一个地址。未提供密钥时可浏览/使用本地模型。不得为了本轮验证自行调用付费服务。

CLI 输入仅接受明确文件的 `[{"id":"event-1","text":"需要分析的片段"}]` 数组，不扫描或上传整个项目：

```sh
node dist/index.js ai analyze --provider openai --model YOUR_MODEL_ID --input evidence.json --preview
node dist/index.js ai analyze --provider openai --model YOUR_MODEL_ID --input evidence.json --cloud-consent
```

`--cloud-consent` 是本次推理的明确发送授权。先人工检查 preview；过滤器是尽力脱敏，不保证覆盖所有个人或商业信息。本地 provider 仅允许 loopback HTTP；cloud 仅允许公网 HTTPS。禁止 URL 内用户信息、查询参数和 fragment；DNS 公私混合、私网、link-local 被拒绝，校验后的 DNS 地址固定到 socket，重定向不跟随，响应最多 256 KB。不自动暴露校园网或公网监听。

## 参数、取消与结果

- 默认总超时 60 秒，可设置 100–180000 ms；支持 AbortSignal。默认不重试，显式最多 2 次，仅 429/503，复用请求总期限。重试可能增加厂商成本。
- 默认 maxTokens 1024，范围 128–4096。OpenAI 使用 max_completion_tokens，兼容接口/Claude 使用 max_tokens，Gemini 使用 maxOutputTokens，Ollama 使用 num_predict。不能保证所有自定义模型支持这些参数，厂商拒绝会显式报错，不自动改参数继续发送。
- temperature 默认不向云端发送；Ollama 默认 0。当前已知 OpenAI reasoning 模型显式 temperature 被拒绝。兼容端的 JSON mode 需显式 jsonMode；Ollama 使用 JSON Schema，Gemini JSON MIME；Claude 用可信系统提示加宿主校验。
- 1–32 个事件、每事件最多 6000 字符、脱敏上下文最多 24 KB；响应和输出字符串/数组均有上限。
- 模型只能选择输入 eventId。宿主从对应输入提取原文 quote；若模型主动给 quote，也必须精确匹配。未知 ID、伪造引用、额外 reset 字段、非法 JSON 均拒绝并返回 uncertain/error。解释文字仍可能出错，不是安全事实。
- confidence 为模型自报置信度，非已校准概率。Tokens 仅取厂商实际返回的 usage；不存在时 null。费用和跨模型对比均 NOT MEASURED。

## 最小 SDK 示例

```ts
import { createAIProvider, createAgentGuard, createGuardedToolRouter } from '@dorianchn/agent-canary/sdk';
const guard = createAgentGuard({ alert: false });
const router = createGuardedToolRouter({ guard, executeRealTool: async call => ({ simulated: true, name: call.name }) });
const advisory = createAIProvider({ id: 'ollama', kind: 'local', protocol: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'YOUR_INSTALLED_MODEL' });
const analysis = await advisory.analyze({ events: [{ id: 'input-1', text: 'explicitly selected evidence' }] });
// Present analysis to a human. It is never passed as permission to router.
await router.dispatch({ name: 'read_public_file', args: {} });
```

只有交给 Router/Guard 的调用受保护。SAFE 时真实回调仍可执行；首次危险调用、旁路调用和已经开始的外部效果不受完整保护。

## 官方接口来源（本轮读取）

[OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[Claude Messages](https://platform.claude.com/docs/en/api/messages/create)、[Gemini generateContent](https://ai.google.dev/api/generate-content?hl=en)、[Ollama Chat](https://docs.ollama.com/api/chat)、[DeepSeek API](https://api-docs.deepseek.com/)、[百炼 Qwen](https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/)、[LM Studio OpenAI compatibility](https://lmstudio.ai/docs/developer/openai-compat)。接口格式适配不证明真实账号权限或厂商端可用性。
