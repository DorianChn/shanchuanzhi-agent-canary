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
node --test smoke-isolation.test.mjs security-regression.test.mjs
node smoke.mjs
```

回归会复制服务到隔离目录，预置虚拟订单数据，检查既有数据未被 smoke 改写；之后 smoke 在随机 loopback 端口和 DEMO 模式创建临时订单/订阅并清理。不得用真实支付凭据或将 DEMO 服务公开为实际收款服务。

## 演示时必须说明

- Agent Canary 不是全局 Agent 防火墙，也不分析任意 prompt 是否注入。
- 第一次危险调用若先于信号，或调用路径不经过 Guard，仍可能执行。
- 本地合成模拟不是 LLM 攻击成功率，也不能支持“确保获奖”“零误报”或生产防护率。
- 真实 payment callbacks 和 Docker 构建没有在本次本机验证中运行。
