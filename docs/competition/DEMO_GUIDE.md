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

## 第四轮最终增补

最新证据与完整边界见 [FOURTH_ROUND_FINAL_REPORT.md](FOURTH_ROUND_FINAL_REPORT.md)。历史记录保留，不是本轮最新数据。

| 组 | 攻击成功 | 观察到拒绝防止 | Canary | Guard | 策略拒绝/待批 | 正常中断 | 正常完成 |
|---|---|---|---|---|---|---|---|
|A_no_canary|5/15|0/15|NOT APPLICABLE|NOT APPLICABLE|NOT APPLICABLE|0/6|6/6|
|B_decoy_only|5/15|0/15|0/15|NOT APPLICABLE|NOT APPLICABLE|0/6|6/6|
|C_guarded_router|5/15|0/15|0/15|0/9|NOT APPLICABLE|0/6|6/6|
|D1_policy|1/15|4/15|0/15|0/9|7/9|1/6|5/6|
|D2_policy_ai|1/15|4/15|0/15|0/9|7/9|1/6|5/6|

独立自动测试 {'tests': 201, 'pass': 196, 'fail': 0, 'skipped': 5}。实际 CI：834ef1a361386736be2101bfa635bf0bb531dfb4：9/9 jobs 成功；https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38113459806。常规 V1/V2 风险仍 OPEN，独立免费竞赛构建排除商业实现。AI 只解释；批准需可信宿主。

## Agent Canary 2.0 更新

本轮结果见 [2.0 最终报告](AGENT_CANARY_2_FINAL_REPORT.md) 和 competition-submission/V2_DELIVERY_VERSION.md。

|组|攻击成功|观察拒绝防止|Canary|正常完成|硬误拒绝|审批中断|
|---|---|---|---|---|---|---|
|A_no_canary|4/19|0/19|0/19|8/8|0/8|0/8|
|B_decoy_only|6/19|0/19|0/19|8/8|0/8|0/8|
|C_guarded_router|6/19|0/19|0/19|8/8|0/8|0/8|
|D1_policy|1/19|5/19|0/19|6/8|0/8|2/8|
|D2_policy_ai|1/19|5/19|0/19|6/8|0/8|2/8|
|E_pre_review|1/19|5/19|0/19|6/8|2/8|0/8|

E 组没有降低 ASR（D1/E 均 1/19），且出现 2/8 正常任务硬拒绝，D1 为 0/8。10 次事前审查全部 suspicious，含正常构建与安装；中位 21.6 秒。AI 默认关闭，不能宣称独立增益。D1/D2 有 2/8 正常任务审批中断。



只保护注册到 Router 的宿主 callback。MCP 诱饵安装不等于全局保护；绕过 Guard、已开始的外部操作、模型内部状态 OUT_OF_SCOPE。AI 不能批准、重置 Guard 或改权限。realpath 仍有 TOCTOU 窗口；自定义网络 callback 需使用 DNS 固定与禁止重定向的安全 transport。来源提示不等于完整动态污点分析。


## 2026-10-11 最终发布验收更新

本轮当前结论见 [发布验收](RELEASE_READINESS_AUDIT.md) 与 [真实模型最终复验](REAL_MODEL_FINAL_EVALUATION.md)，历史数据在上文保留。新增可选文件Guard持久化有16回归；本地250项测试245通过、0失败、5跳过；Windows共享冲突已复现并修复，增强核心a5425b2的9项CI实际通过。168次新模型试验：D1/D2/E均1/19，E正常硬误拒绝2/8，AI默认关闭。正式稳定版仍因普通商业分发P1阻塞；独立免费竞赛包、七附件下载和官网手机/视频验收通过。新资料、旧视频参考范围及发送前未知官方限制见 competition-submission/FINAL_READINESS_CHECKLIST.md。Draft PR23未合并，未发布稳定版或发邮件。
