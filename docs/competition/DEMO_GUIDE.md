# 参赛演示：Agent Canary 的本地隔离链路

本演示只使用合成 callback 和临时目录，不连接 LLM/provider、付款平台、外部 Webhook，不运行 Shell，也不读取用户配置或凭据。它演示“收到明确 compromise signal 后，阻止之后经过 Router 的 callback”，不演示模型是否会自行发现/调用诱饵。

## 环境

- Node.js 20 或 22；本次本地验证使用 Node 22.23.1。
- Git clone 后在仓库根目录执行。
- 需要 npm registry 安装依赖；运行之后的演示逻辑不需要外部网络。

## 一键演示

```bash
npm ci
npm run build
npm run demo:containment
```

脚本位置：[`scripts/demo-containment.mjs`](../../scripts/demo-containment.mjs)。它用临时目录创建 SDK Guard 和 Router，然后依次：

1. 通过 Router 执行一个虚拟 `git_status` callback，作为 SAFE 正常路径；
2. 调用 `canary_read_secrets`，接收带随机 trace Token 的**合成**诱饵结果；
3. 再次请求 `http_post`，确认返回 `CanaryBlockedError`，callback 没有被执行；
4. 读取临时 JSONL，确认包含 trip、quarantine 和 blocked 事件；
5. 删除整个临时演示目录。

输出中的 `realCallbacksRun` 应只有 `git_status`；`blockedDangerousCallback` 为 `true`；`finalGuardState` 为 `QUARANTINED`。工具回调全是脚本内的 mock，不触碰系统 Shell、真实 HTTP、文件删除、账号、API key 或资金。

## 真实 MCP stdio 协议演示

同一次 `npm test` 会运行 [`test/metadata.test.ts`](../../test/metadata.test.ts) 中的真实本地进程集成：MCP JS Client 启动 `serve` 子进程，调用 `listTools`，调用 `canary_run_shell`，并确认 stdout 只输出协议内容，事件记录到 JSONL。可单独复现：

```bash
node --import tsx --test test/metadata.test.ts
```

这验证 MCP stdio 协议与 Agent Canary 诱饵实现，不验证 Claude Code、Cursor 等具体编辑器的 UI 安装、模型行为或生产宿主的工具接入。

## CLI 自检与扫描

```bash
node dist/index.js self-test --json
node dist/index.js --help
```

自检应返回 `passed: true`。Token 扫描应传入明确的文件或目录：

```bash
node dist/index.js tokens check .
```

递归扫描纳入隐藏文件，忽略 `.git`、`node_modules`、符号链接；最多遍历 4 层。权限错误、输入路径不存在或超过深度会返回错误，表示扫描不完整；不要把此类错误算作 clean。命令只搜索已经登记在 Agent Canary Token registry 的字符串。

## 复现攻击测试

```bash
node --import tsx --test test/security-simulation.test.ts
```

测试用程序化信号覆盖虚拟密钥读取、HTTP、Shell、邮件、删除、令牌泄露、重复尝试、同一身份新 session、并发派发、Webhook 故障、Store 故障和三个边界情况。模拟不会调用模型来阅读攻击文本。SIM-12/13/14 有意展示：未先产生信号时首次真实工具调用会被允许，绕过 Router 的 callback 无法被观察，已开始的副作用不会被追溯取消。

## 赞助 demo smoke

```bash
cd sponsor
npm ci
npm test
npm run smoke
```

`npm test` 在临时目录使用 RSA2、WeChat RSA + AES-256-GCM 和虚拟 Epay/VMQ 签名测试回调验证；包括错商户/订单/金额、错误状态、旧时间戳、20 路重复通知与损坏状态恢复。没有请求真实支付 API，也没有读取真实 `.env`、订单、订阅、激活记录或密钥。`npm run smoke` 在随机 loopback 端口与 DEMO 模式验证 12 个页面/订单/订阅/激活检查，并清理临时目录。不得使用真实支付凭据或把 DEMO 服务公开为实际收款服务。

## 演示时必须说明

- Agent Canary 不是全局 Agent 防火墙，也不分析任意 prompt 是否注入。
- 第一次危险调用若先于信号，或调用路径不经过 Guard，仍可能执行。
- 本地合成模拟不是 LLM 攻击成功率，也不能支持“确保获奖”“零误报”或生产防护率。
- payment callbacks 是合成密钥和临时订单的真实本地 HTTP 路由测试，不代表真实商户连接/收款确认。Docker CLI 未安装，未本地构建；GitHub Actions Run 115 已实际 build 镜像并执行 `docker run --rm agent-canary:ci --help` smoke。
- 公开 npm 包和 Docker 构建上下文当前仍带有许可门控的 V2 编译模块。分发边界尚未完成前，应在评审时如实说明，不要称商业实现已隔离。

## 2026-10-11 本地 Agent 评测与结果页

模型自行选工具的评测及逐项结果在 [`competition-submission`](../../competition-submission/README.md)：

```bash
npm ci
npm run build
npm exec -- node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent
npm exec -- node competition-submission/lab/build-report-data.mjs
npm exec -- node competition-submission/lab/render-dashboard.mjs
npm exec -- node competition-submission/lab/serve-dashboard.mjs
```

本地结果页监听 `127.0.0.1:4173`，仅展示脱敏汇总。真实本地模型组与确定性离线隔离演示必须分别说明；模型从未选择诱饵的结果为 0/40。不要把 `A09_POST_QUARANTINE` 的 harness 前置状态当作模型检测。

本轮已生成本地 1920×1080 H.264/AAC MP4（251.3 秒）和 41 条同步 SRT，路径见 `competition-submission/`。视频由隔离 Chromium 渲染页面帧、Microsoft Huihui 合成旁白和 FFmpeg 组装；不是原始桌面录屏，也不运行实时模型推理。完整解码与片尾抽帧已在本机检查。先前提交的 2.1.0 版 60 秒视频链接目前可公开读取（HTTP 200），但它不是本轮长版结果演示；本轮长版仍未托管。


## AI 增强版追加记录

AI 增强入口：npm run build 后 npm run ai:console，选择已有 Ollama 模型、离线隔离日志、真实分析和报告。npm run ai:demo 产生四样本真实分析；npm run lab:agent -- --profile=neutral_agent 复用虚拟工具框架。新旧视频区分见 competition-submission/Agent_Canary_AI增强录屏脚本.md。
