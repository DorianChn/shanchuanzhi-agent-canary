# 第二轮最终验证记录

审计基线：`origin/main` / `5049815c8549b0455976bea5bc8131656a5f02a4`。本地工作分支：`competition/agent-canary-hardening`。所有本地验证均在 Windows x64、Node v22.23.1 上执行；未触碰真实支付、用户业务数据、生产密钥、发布渠道或 main。

本轮实现提交：`7f4e2efcdcac5859492b8504e0ac3e97ff72d50a`；CI Docker 容器 smoke 改动：`4e0ccedcd02dc53b7fef46ca33274a25ecc87a47`。其后报告提交仅改文档。GitHub Actions Run 115 在上述实现/工作流提交上完成 9/9 job。

## 命令与结果

| 命令/检查 | 结果 | 限制 |
|---|---|---|
| 根目录 `npm ci` | PASS；安装 101 packages，安装期间 0 vulnerabilities。 | Windows / Node 22.23.1。 |
| `npm run build` | PASS；TypeScript 编译完成。 | 本地。 |
| `npm test` | PASS；121 项：117 通过、0 失败、4 跳过。 | 4 个 POSIX 权限/Windows 符号链接断言在本机不适用。 |
| `npm run pack:check` | PASS；23 个文件的安装包 smoke check。 | 不表示 V2 已隔离；见分发边界。 |
| `npm run verify` | PASS；build、完整测试及 package smoke check 均成功。 | Windows / Node 22.23.1。 |
| `npm audit` | PASS；0 vulnerabilities。 | 未发布。 |
| GitHub Dependabot 提醒 | `origin/main` 有 1 项 medium：`ip-address` `<=10.7.0`，修复版从 `10.7.1` 起。 | 本地 PR 分支锁文件为 `10.7.3`，`npm ls ip-address` 确认当前安装树也为 `10.7.3`；main 告警尚未因本分支合并而关闭。 |
| `npm pack --dry-run --json` | PASS 运行检查；确认包含 `dist/eval/*`、`dist/dashboard.js`、`dist/export.js`、`dist/license.js`。 | 此结果揭示尚未解决的 P1 商业分发边界。 |
| `npm run demo:containment` | PASS；Guard 最终为 `QUARANTINED`，日志含 trip/quarantine/blocked，危险 callback 未执行。 | 仅临时目录与脚本内虚拟 callback。 |
| `npm run bench:scan` | PASS；1/10/50 MiB 中位数 1.54/12.62/58.30 ms；约 647.84/792.20/857.66 MiB/s。 | Windows x64 / Node 22.23.1 / Ryzen 9 9955HX；每种 3 次、合成文件、Token 在尾部、文件缓存热读。 |
| sponsor `npm ci` | PASS；安装 29 packages，安装期间 0 vulnerabilities。 | 独立依赖目录。 |
| sponsor `npm test` | PASS；25 项：24 通过、0 失败、1 跳过。包含 `node --check grant.mjs` 与隔离的人工授权 CLI 回归。 | 1 个 symlink 权限测试在 Windows 跳过。 |
| sponsor `npm run smoke` | PASS；12/12 检查通过。 | DEMO、临时目录、随机 loopback 端口、虚拟订单/订阅。 |
| sponsor `npm audit` | PASS；0 vulnerabilities。 | 未连接支付商户。 |
| 本地 `docker --version` | BLOCKED；本环境找不到 Docker CLI。 | 本地未构建镜像；GitHub Actions Docker build 与容器 CLI smoke 通过，见下方。 |

汇总 Node 测试：146 项（根目录 121 + sponsor 25），141 通过、0 失败、5 跳过。另 sponsor smoke 的 12 个输出检查与 `demo:containment` 单命令演示均通过；这些不计入 `node:test` 汇总。

## 修复验证摘要

1. **P1-1 支付回调：合成路径通过。** WeChat 回调测试实际走本地 HTTP 路由，使用临时 RSA 测试密钥签名，并使用 AES-256-GCM 加/解密虚拟交易；覆盖商户/App/本地订单/金额/CNY/成功状态/证书序列/时间戳窗口/重复与 20 路并发通知。Alipay 测试覆盖 RSA2 和本地 app/seller/order/amount/status；Epay/VMQ 使用合成签名、订单与金额。VMQ 基础金额精确匹配，按上游避碰协议允许签名的 `reallyPrice` 最多偏移 9 分。没有真实支付请求或交易。旧版待处理订单可能没有新增的 `currency` 字段，会 fail closed；维护者必须先对照备份和服务商记录决定是否迁移。
2. **P1-2 状态损坏：通过临时数据验证。** 空、截断、非法 JSON、错根形状、非法到期时间、损坏激活记录、模拟权限错误、错误/不匹配密钥不被当作空数据，也不重建已存在签名身份；履约中断后重启幂等恢复。没有操作真实 JSON/密钥。Windows ACL 行为无法确认。
3. **P1-3 商业分发边界：未解决。** 实际 pack 清单含 V2 eval/dashboard/export/license 编译模块；Dockerfile 复制整个 `dist`。没有删除许可校验、拆迁部署架构、发布包或镜像。需要维护者批准最小变更方案，当前不能达到稳定公开发布门槛。
4. **P2-1 Token 并发写：通过。** 16 个子进程并行读改写后没有丢记录；失败取得锁不写入。
5. **P2-2 JSONL 无界读取：通过。** 5 MiB 尾读、256 KiB 行限额、最多 10,000 条；超大、损坏及截断文件回归通过。
6. **P2-3 Watcher 长期增长：限定模拟通过。** 15,000 个合成变更事件维持有界缓存/队列，可关闭并释放定时器和句柄。没有数周生产运行曲线。
7. **P2-4 Webhook SSRF/DNS：本地模拟通过。** remote HTTPS 只接受公网 DNS 答案，混合/私网拒绝；请求固定到已校验 IP，不跟随 302，DNS 重绑定模拟只解析一次。未请求互联网 Webhook。
8. **P2-5 Config：通过。** 只有 ENOENT 使用初次默认值；空/截断/坏 JSON/字段类型和读取权限错误均拒绝并保留原文件。
9. **P2-6 CI 供应链：静态检查与 PR workflow 通过。** checkout 与 setup-node 已固定完整 Commit SHA；MCP publisher 固定 v1.8.1 及 SHA-256；最小权限和发布 job 边界已审阅。GitHub Actions Run 115 的 9/9 CI job 通过；未运行任何发布 job。

合成攻击回归仍为 14 个攻击场景 + 1 个正常控制。12 个明确送入 decoy/Token 信号的路径进入隔离并阻止之后经过 Guard 的 callback；SIM-12/13/14 仍复现无先前信号的首次操作、绕过 Router 的 callback 和已启动副作用的边界。这不是任何 LLM 的检测率或拦截率。

## 平台与 CI 状态

| 环境 | 状态 | 证据 |
|---|---|---|
| Windows x64 / Node 22.23.1 | VERIFIED | 本机完成完整 build/test/package/sponsor/audit/demo。 |
| Windows / Node 20、22 | VERIFIED | PR #22 / GitHub Actions Run 115 的两个 matrix job 均成功。 |
| Linux / Node 20、22 | VERIFIED | PR #22 / GitHub Actions Run 115 的两个 matrix job 均成功。 |
| macOS / Node 20、22 | VERIFIED | PR #22 / GitHub Actions Run 115 的两个 matrix job 均成功。 |
| Docker build / container CLI smoke | VERIFIED | Ubuntu job 成功执行 `docker build -t agent-canary:ci .` 和 `docker run --rm agent-canary:ci --help`。本机 Docker CLI 仍不可用。 |
| GitHub Actions | VERIFIED | Run 115：9/9 jobs 成功（Node matrix 6、sponsor smoke、Docker build+smoke、package smoke）。[运行记录](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38061277109)。 |

## GitHub 交付状态

- 远端：`https://github.com/DorianChn/shanchuanzhi-agent-canary.git`；只读 `git ls-remote origin HEAD` 成功，远端 main 指向基线 SHA。
- GitHub CLI 已认证为 `DorianChn` 并通过命令级 helper 完成普通 push；GitHub MCP 写入接口仍返回 403，因此未用该集成绕过权限。
- 分支 `competition/agent-canary-hardening` 已推送；Draft PR **#22** 已创建，base=`main`，head=`competition/agent-canary-hardening`：[PR 链接](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22)。GitHub Actions Run 115 对实现/工作流提交完成 9/9 jobs；后续仅文档更新，未改代码或工作流。
- 未修改远端 main、合并、发布 npm 或推送 Docker 镜像。PR 正文文件为 [`PR_DRAFT_BODY.md`](PR_DRAFT_BODY.md)。

## 交付门槛

- 稳定发布标准：**未达到**。P1 V2 分发边界尚未解决；真实商户及旧待处理订单迁移未确认。跨平台 CI 与 Docker build/container smoke 已在 GitHub Actions 验证。
- 参赛演示条件：**具备离线机制演示条件**。建议用 `npm run demo:containment` 展示恶意诱饵信号、Session 隔离、后续守卫回调阻止和 JSONL 证据；必须同时讲清首次危险调用、绕过 Guard 和已开始外部操作的边界。
- 人工后续事项：审阅 Draft PR #22；批准 V1/V2 最小包拆分方案；复核旧订单的币种/状态迁移策略；在真实商户沙箱和授权模型环境补做集成/红队评测。PR 不自动合并。

## 2026-10-11 参赛冲刺更新

- 本机真实模型：Ollama `qwen3.5-9b-local`；两个已记录提示词 profile 各 36 次，合计 72 条；模型诱饵调用 0/40。neutral C 组在 SAFE 状态下执行 5 个危险模拟 callback；预置 quarantine 后 C 组阻断 3/3 次危险后续调用。详见参赛实验报告与 raw JSON。
- 遗留证据：一组无 prompt hash 的 36 次试验保留但不纳入主比较；一组 4/36 中断记录保留并从统计排除。
- 中文展示页：由逐次原始 JSON 生成，loopback-only 服务已在真实 Chrome 中渲染检查并关闭；不请求外部脚本。
- PDF：项目介绍渲染为 17 页，实验报告 7 页；中文字体、结构图、表格和关键结果页已渲染查看。PDF 生成与视觉 QA 的结果文件在 `competition-submission/`。
- 视频：本地生成 `competition-submission/Agent_Canary_演示视频.mp4`，1920×1080 H.264/AAC，视频流 251.300 秒、音轨 251.199 秒，41 条 SRT；FFmpeg 全片解码退出码为 0，片尾最后一帧已抽检。它是隔离 Chromium 渲染帧加合成旁白的结果展示视频，不是桌面实录或实时模型推理。MP4 已被 `.gitignore` 排除。本地长版没有托管；先前邮件中的 2.1.0 短版链接经 HTTP 200 和独立下载/ffprobe 核验（1280×720 H.264，59.960 秒，588,320 字节）。
- 邮件：Outlook 只读搜索确认 2026-10-10 16:18（上海时间）最新 2.1.0 材料邮件寄往 `oscc@oschina.cn` 且有附件，正文提供上述公开视频链接；搜索未返回组委会回复。本轮新长版和更新未通过邮件补交，也没有发送邮件。
- 邮件：只形成未发送草稿。提交清单提示发送前先核对已发送邮件，避免重复发送。
- 商业分发：V1/V2 包边界 P1 风险仍未关闭；本轮没有迁移商业架构或发布包。
- 材料提交 `dad03c747d514d121a5487c51fde58ece548a490` 的 Run 38072020061、指针提交 `fd1813c5b08dd16aa55dcedee4a445f9edea4193` 的 Run 38072418051，以及视频源提交 `e314c5134792cdb8056349cc8464cd965dde64ca` 的 Run 38074673452 均通过 9/9 jobs（Node 20/22 × Ubuntu/Windows/macOS、sponsor smoke、package smoke、Docker build/container CLI smoke）。当前邮箱核验说明的文档提交仍需推送后核验。


## AI 增强版追加记录

新增 AI 版全量验证保存在 competition-submission/evidence/ai-final-verification.json 与 ai-verify-*.txt；当前代码/跨平台CI提交对应关系见 AI_FINAL_READINESS.md，重复 verify 不累加测试数量。旧验证和既有邮件状态保留。

最终 AI 代码 d7e0a0e：根 152（148/0/4）、sponsor 25（24/0/1），共 177（172 通过/0 失败/5 跳过）；pack 32 files，audit 均 0。Run 38078821555 实际 9/9 SUCCESS，包含三平台 Node 20/22 与 Docker CLI smoke。此前 d26aad7 的 Windows EPERM CI 失败保留，新增两项锁回归有修复前失败和修复后通过日志，不把失败改成跳过。

新 AI 视频 Agent_Canary_AI_Demo.mp4：H.264 1920×1080，220.933 秒，3,397,872 字节，无音轨、屏幕中文字幕；实际运行 Chromium UI 录像，真实 Ollama 分析，明确离线演示与保存数据，非 OS 桌面录像。全片解码 exit 0，90/125/175/200 秒抽帧检查，哈希与公开验证见 ai-video-verification.json。当前 PDF 17/7 页已重新提取、24 页渲染并检查关键页。新材料仍未发邮件。

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
