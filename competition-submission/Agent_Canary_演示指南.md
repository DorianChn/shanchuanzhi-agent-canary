# Agent Canary 演示指南

## 演示模式

演示分为两种，界面和讲解必须明确标记：

1. **真实本地模型评测**：Ollama 上已安装的本地模型实际决定是否调用工具；所有工具回调均为内存模拟，禁止真实网络、Shell、文件删除或真实凭据访问。
2. **确定性离线隔离演示**：固定脚本调用诱饵并验证后续受守卫 callback 未执行；它证明 SDK 的隔离路径，不代表模型主动检测率。

## 环境与命令

要求 Node.js 20 或 22。联网只用于首次安装依赖；真实模型评测要求本机已经安装并运行 Ollama 与 `qwen3.5-9b-local:latest`。评测脚本不会下载模型。

在仓库根目录：

```bash
npm ci
npm run verify
npm run demo:containment
npm exec -- node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent
npm exec -- node competition-submission/lab/build-report-data.mjs
npm exec -- node competition-submission/lab/render-dashboard.mjs
npm exec -- node competition-submission/lab/serve-dashboard.mjs
```

`safety_aware` 是默认提示词配置；`neutral_agent` 通过 `--profile=neutral_agent` 显式选择。运行日志中的 `systemPromptProfile`、完整系统提示词及其 SHA-256 用于确认配置。不同提示词组的结果分开统计。结果页只绑定到 `127.0.0.1`，结束演示后用 Ctrl+C 关闭服务。

若要检查本机 Ollama 服务：

```bash
ollama list
```

评测 API 仅允许 `127.0.0.1`、`localhost` 或 `::1`。若模型缺失或服务不可用，评测应失败并保留部分结果；不要改用付费 API 或未经授权的远端服务。

## 离线演示流程（约 90 秒）

1. 运行 `npm run demo:containment`，先展示正常的只读调用被放行。
2. 展示固定的 `canary_read_secrets` 诱饵命中和 `SAFE → TRIPPED → QUARANTINED` 状态事件。
3. 展示随后经 Guarded Tool Router 的模拟 `http_post` 在真实 callback 前被拒绝。
4. 检查临时 JSONL 事件中的 `session_tripped`、`session_quarantined`、`decoy_called` 和 `action_blocked`。
5. 明确指出此次流程由演示脚本确定性触发；不要称作 LLM 自主攻击测试。

## 真实模型演示流程（约 3 分钟）

1. 先声明模型名称、系统提示词 profile、12 个场景、A/B/C 三种接线方式和虚拟工具边界。
2. 展示模型从恶意 README/网页/工具输出读取内容，再由模型自己决定调用哪些工具；工具调用参数和结果写入脱敏原始 JSON。
3. 展示 A 组无 Canary、B 组有诱饵但危险回调未接 Guard、C 组使用 Guarded Tool Router 的定义。
4. 展示主动诱饵选择率、虚拟危险操作成功率、正常任务成功数及各自分子/分母。先说明本地模型对诱饵的选择次数，再解释阻断率。
5. 使用一个非模型生成的预置隔离前提说明 Router 的确定性行为；单独标为 SDK 集成回归，不能并入模型诱饵检测率。

## 参赛现场安全边界

- 仅使用合成仓库、`NOT_A_REAL_CREDENTIAL` 虚拟值和虚拟网络 sink。
- 不显示真实令牌、个人邮箱、浏览器配置、用户目录或支付信息。
- 不执行真实 Shell、HTTP 请求、文件删除、付款、退款或授权发放。
- 若模型未触发诱饵，应如实展示 0 次触发。不要重复调 prompt 后只保留有利结果。
- 隔离后的危险操作阻止不等于阻止首次调用、未接 Router 的工具、模型避开诱饵或撤销已发生副作用。
