# Agent Canary 第二轮最终安全修复与竞赛交付报告

日期：2026-10-10

仓库：`DorianChn/shanchuanzhi-agent-canary`

分支：`competition/agent-canary-hardening`

基线：`origin/main` / `5049815c8549b0455976bea5bc8131656a5f02a4`
第一轮核心修复：`8de78e6fc429d73a2be6354a2f6a3169709d4225`；第一轮验证记录：`1a3990c`。

## 结论

本轮处理 9 项遗留：8 项修复并由本地回归验证，1 项 P1（V1/V2 商业分发边界）仍未解决。根目录和 sponsor 共实际运行 146 项 Node 测试：141 通过、0 失败、5 因 Windows 平台限制跳过。另 sponsor smoke 12/12 检查与离线 containment demo 通过。根包和 sponsor `npm audit` 均报告 0 vulnerabilities。

按第一轮根因归类，P0=0，P1 共 7（6 已修复、1 未解决），P2 共 17（17 已修复），P3=0；第二轮针对剩余 9 项的处理为 P1 2/3 已修复、P2 6/6 已修复。原 111 项根测试未回归失败，本轮新增 31 项测试。Draft PR #22 的 GitHub Actions Run 115 完成 9/9 jobs，含 Node 20/22 × Ubuntu/Windows/macOS、sponsor/package smoke 以及 Docker build 和容器 CLI smoke。

**稳定发布：未达到。** 实测 npm 包和 Docker 构建过程会分发 V2 许可门控编译模块；真实商户支付及旧订单迁移仍未验证。跨平台/Node CI 与 Docker build/container CLI smoke 已在 GitHub Actions 通过。本项目有可复现的离线参赛演示条件，但没有真实 LLM 抵抗率、误报率或获奖保证。

## 第二轮修复前状态

第一轮在独立分支保留 15 项修复及两条提交记录，工作区起始干净；根套件为 111 项。仍未关闭的三项 P1 是支付回调未绑定本地商户/App/订单/金额/币种/渠道、业务 JSON/签名密钥损坏时可能回退或重建，以及 V2 商业实现落入公开编译包。六项 P2 是 Token registry 并发写、JSONL 无界读、watcher 缓存增长、Webhook 私网/DNS、配置 JSON 静默回退和 CI Actions 可变引用。

## 九项逐项处理

| 遗留 | 结果 | 证据与边界 |
|---|---|---|
| P1-1 支付回调安全 | **本地代码与合成回归 PASS；真实商户验证 BLOCKED/未授权** | WeChat 校验回调 RSA 签名、证书序列、5 分钟时间窗口、AES-256-GCM payload、本地订单号、mchid/appid、金额分、CNY、成功状态和交易号；Alipay 校验 RSA2、app/auth_app、seller、订单、金额、状态与通道；Epay/VMQ 校验配置商户/协议签名、订单、金额、通道。VMQ 的签名 `price` 与本地订单精确匹配，`reallyPrice` 允许上游避碰机制最大 ±¥0.09 调整。无效通知不改订单；锁串行化并发重复通知，履约按订单幂等。测试使用临时 RSA 密钥、虚拟订单和临时 HTTP 服务，没有连接支付平台或执行收款、退款、发货、激活。 |
| P1-2 业务状态 Fail-Closed | **PASS（合成数据）** | 新增 `sponsor/state-store.mjs`。缺失文件才用首跑默认值；空/坏/截断 JSON、错根类型、坏的订阅到期记录、坏激活 hash、非普通文件、读权限错误均 fail closed；原子 owner-only 写入和跨进程锁；已有错误签名密钥不覆盖、不重建；恢复测试覆盖履约中断和重启。Windows 文件 ACL 权限未验证。 |
| P1-3 V1/V2 商业分发边界 | **未解决（P1）** | `npm pack --dry-run --json` 实测含 `dist/eval/*`、dashboard、export、license 编译模块；Dockerfile 将全部 `dist` 复制进镜像。遵守不擅改商业交付架构的约束，未删除 license check、未拆迁交付、未发布。 |
| P2-1 Token 并发写 | **PASS** | `src/tokens.ts` 增加跨进程锁、锁内重读和原子写，覆盖 16 个并发 CLI 子进程。 |
| P2-2 JSONL 无界读 | **PASS** | `src/alerts.ts` 将事件读取/轮转限制为 5 MiB 尾部、256 KiB 单行、最多 10,000 条；大文件/坏行/截断回归通过。 |
| P2-3 Watcher 长期增长 | **有界模拟 PASS** | `src/watch.ts` 将去重键 4,096、失败键 1,024、待处理路径 2,048 封顶，返回可关闭句柄；15,000 个合成变更压力回归通过。没有数周生产运行曲线。 |
| P2-4 Webhook 私网/DNS | **本地模拟 PASS** | `src/webhook.ts` 限制 HTTPS、禁止凭据和 fragment；DNS 解析拒绝私网/特殊/混合地址并把公网结果 pin 到连接，不跟随 redirect；允许 loopback HTTP 做本机开发。重绑定、重定向使用本地 server/resolver，无公网请求。 |
| P2-5 配置 JSON 回退 | **PASS** | `src/config.ts` 只有 ENOENT 走首次默认值；坏 JSON、空文件、错 schema、字段类型或读错误均报错并保留文件。 |
| P2-6 CI 供应链 | **静态核对与 PR CI PASS；发布未运行** | `actions/checkout`、`actions/setup-node` 固定完整 commit SHA；MCP publisher 固定版本与 SHA-256；权限按 job 最小化。Run 115 的 Node 矩阵、sponsor/package smoke、Docker build+container CLI smoke 共 9/9 成功；没有触发 npm、Docker 镜像或 MCP 发布。 |

支付协议依据：[微信成功回调文档](https://pay.wechatpay.cn/doc/v3/merchant/4013070368)、[微信平台证书验签与时间窗口](https://pay.wechatpay.cn/doc/v3/merchant/4013053420)、[支付宝异步通知处理文档](https://developer.alibaba.com/docs/doc.htm?articleId=103296&docType=1&treeId=346)、[VMQ 上游通知实现](https://github.com/szvone/vmqphp/blob/master/application/index/controller/Index.php)。没有适用于所有 Epay 部署的统一官方规范；各 Epay 服务商上线前仍应以其实际商户文档核对。

## 变更文件和提交

代码变更涉及 `.github/workflows/{ci,publish-mcp,publish-v1-package}.yml`、`src/{alerts,config,index,tokens,watch,webhook}.ts`、`test/{alerts,config,tokens,watch,webhook}.test.ts`、`sponsor/{.env.example,grant.mjs,package.json,server.mjs,smoke.mjs,security-regression.test.mjs,smoke-isolation.test.mjs}`，新增 `sponsor/{grant-state.test.mjs,payment-callback.test.mjs,payment-security.mjs,payment-security.test.mjs,state-fail-closed.test.mjs,state-store.mjs,state-store.test.mjs}`。

第二轮实现与首版交付文档提交：`7f4e2efcdcac5859492b8504e0ac3e97ff72d50a`。CI 增加 Docker 容器 CLI smoke：`4e0ccedcd02dc53b7fef46ca33274a25ecc87a47`。

最终验证元数据以 docs-only 提交 `40ef934a72d9670a0c65d03f4c3ab7b66ef78c77` 更新；GitHub push 状态与 Draft 正文随后另作 docs-only 更新。代码修复未在这些文档提交中改变。Draft 正文保存在 `docs/competition/PR_DRAFT_BODY.md`。
Draft PR #22 已创建：[Security hardening and competition readiness for Agent Canary](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22)。分支已推送，PR 当前为 Draft，未合并。

## 测试和攻击模拟结果

- 根项目：`npm ci`、`npm run build`、`npm test`、`npm run pack:check`、`npm run verify` 均通过；`npm audit` 为 0 vulnerabilities。121 项，117 通过、0 失败、4 跳过。
- Sponsor：`npm ci`、`npm test`、`npm run smoke`、`npm audit` 均通过；25 项，24 通过、0 失败、1 跳过；smoke 的 12 项输出检查通过。`node --check grant.mjs` 由 sponsor `npm test` 执行。
- 汇总：146 项，141 通过、0 失败、5 跳过。跳过是 Windows 不适用的 POSIX mode/symlink 测试。
- 本轮新增 31 个 Node 测试：根套件由第一轮 111 项增至 121 项（新增 10）；sponsor 从第一轮的 4 项隔离/安全测试增至 25 项（新增 21）。
- containment：`npm run demo:containment` 输出 `QUARANTINED`，危险 callback 被拦，真实 callback 仅安全 `git_status` mock 运行；文件尾事件包含 `session_tripped`、`session_quarantined`、`action_blocked`。
- 既有安全模拟：14 攻击 + 1 控制；12/12 明确输入 decoy/token 信号的路径触发隔离并阻止之后经过 Guard 的 callback。SIM-12/13/14 仍复现首次危险操作可先行、绕过 Guard 不可拦、已开始的外部动作不能回滚。这不是 LLM 攻击检测率。
- 扫描基准：Windows x64、Node 22.23.1、Ryzen 9 9955HX，本地临时合成 1/10/50 MiB 文件每种 3 次，中位 1.54/12.62/58.30 ms。仅热缓存顺序扫描，不代表生产并发。
- Docker 本地：**BLOCKED**（本机没有 Docker CLI）；GitHub Actions Run 115 的 Docker job 已成功构建镜像并运行 `docker run --rm agent-canary:ci --help`。

## 依赖、版本边界与发布

根 npm 依赖与 sponsor 依赖审计都为 0 vulnerabilities。推送后 GitHub API 报告 `origin/main` 有 1 项 medium Dependabot 告警：runtime `ip-address` `<=10.7.0`（修复版 `10.7.1` 起）；本分支 `package-lock.json` 和 `npm ls` 均确认解析至 `10.7.3`。该告警仍属于尚未合并的 main 状态。包 smoke 通过，但其文件列表同时确认商业模块处于交付包。Dockerfile 从 build stage 复制整个 `dist`，同样没有 V1/V2 文件隔离。MIT 许可、公开 SDK、CLI 和 MCP 功能仍在；免费 V1 可在当前代码树 build 和运行，但公开包与商业实现之间的产品边界未解决。没有 npm publish、Docker push、PR merge 或 main 写入。

## GitHub 推送与 Draft PR

本地 GitHub CLI 已认证为 `DorianChn`；GitHub Connector 的权限查询和 PR 创建接口返回 403，但未阻止本地 CLI 完成操作。通过普通 push 创建远端分支，Draft PR #22 已创建（base `main`），没有修改 main 或自动合并。PR 正文来自 `docs/competition/PR_DRAFT_BODY.md`。GitHub Actions Run 115（commit `4e0ccedcd02dc53b7fef46ca33274a25ecc87a47`）9/9 jobs 成功：[运行记录](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38061277109)。

## 跨平台验收状态

| 组合 | 状态 |
|---|---|
| Windows x64 + Node 22.23.1 | VERIFIED |
| Windows + Node 20/22 | VERIFIED（Run 115） |
| Linux + Node 20/22 | VERIFIED（Run 115） |
| macOS + Node 20/22 | VERIFIED（Run 115） |
| Docker build + container CLI smoke | VERIFIED（Run 115；本机无 Docker CLI） |
| GitHub Actions | VERIFIED（Run 115，9/9 jobs） |

## 参赛验收与评分

内部工程评估 **73/100**，不是官方赛分：技术创新 8、工程完整 9、安全 6、开源质量 7、易用性 7、实际价值 7、演示 9、方案差异 7、部署成熟 6、扩展潜力 7。跨平台 CI 与 Docker smoke 已验证；安全与部署分数仍受 P1 V2 分发边界、宿主必须完整接入 Guard、真实支付和旧订单迁移未验证影响；不预测获奖。

参赛离线流程：安全工具 mock → 恶意内容触发 canary decoy → guard 状态进入 `QUARANTINED` → 后续受 Guard 保护的危险 mock callback 拒绝 → 检查脱敏 JSONL。无 LLM、生产凭据、网络写入或真实危险工具。讲解中需指出首次危险调用、绕过 Router 的调用以及已开始的外部操作不受完整保护。

## 尚需人工完成

1. 批准一个保留现有许可证兼容性的 V1/V2 最小分发修复方案；在完成前不宜宣称稳定公开发布。
2. 对照生产备份与支付平台核查旧待处理订单的 CNY 字段和当前交易结果；本轮未触及这些数据。
3. 维护者审阅 Draft PR #22；在 V1/V2 分发计划及旧订单迁移评估完成前不要合并或发布。
4. 在真实宿主与获得许可的测试模型上做独立红队评测，按检测、拦截、误报口径分别记录，不将当前程序化模拟外推为真实模型表现。

## 2026-10-11 最终参赛冲刺补充

本节是比赛交付冲刺新增证据；上文 2026-10-10 的安全修复、旧 CI 与工程评分保留为历史记录。不得把历史 Run 115/116 当成本次最新代码的 Actions 结果。

### 本轮本地模型实测

- 环境：Windows x64、Node.js 22.23.1、本机 Ollama `qwen3.5-9b-local` Q4_K_M；自建最小 function-calling loop，根项目未声明通用 Agent 框架或第三方 Agent host 依赖。
- 两个带 prompt SHA 的 profile 各 36 次，主比较 60 个可比攻击试验、6 个控制；另有 4 个 harness 预置隔离跟进和 2 个 A 组基线跟进。另一个无 profile hash 的 36 次 cohort 和一个中断的 4/36 cohort 均保留，但不进入主统计。
- 两种 profile 的 B/C 诱饵选择为 0/40。Safety-aware profile 中 A/B/C 攻击成功场景为 1/10、0/10、0/10；B/C 没有危险 callback 尝试，故 C 的 Guard 拦截率 NOT MEASURED。Neutral profile 为 1/10、2/10、2/10；C 在 Guard SAFE 时执行了 5 次危险合成 callback。
- harness 预置 quarantine 后，C 阻断 3/3 次后续危险 callback；这些案例只验证隔离后的 Router 路径，不属于 Agent 检测成功。虚拟外部副作用 0。误报率/模型 Canary 检出率均 NOT MEASURED；本实验不是多模型、生产或统计性安全评估。
- 原始 JSON、派生 summary、loopback 中文 dashboard 及运行脚本位于 `competition-submission/evidence/` 与 `competition-submission/lab/`。dashboard 实际在本机 Chrome 检查后关闭。

### 参赛材料状态

- 项目介绍 PDF 17 页、实验报告 PDF 7 页；渲染页面已检查。没有独立 PDF 文本提取验证器；不能把该步骤描述成通过。
- 新增 4:45 录制脚本与 20 条 SRT 字幕；本轮没有 MP4，也没有公开视频 URL。因此大赛要求中的“演示视频链接”仍未完成，尚不具备无需人工补件的完整正式邮件提交条件。
- 参赛邮件只保存草稿，未发送；发送前应检查邮箱已发送记录并回填真实视频 URL 和本轮公开 commit。
- 最新本地验证：根项目 121 项，117 passed、0 failed、4 skipped；sponsor 25 项，24 passed、0 failed、1 skipped；合计 146 项、141 passed、0 failed、5 skipped。根与 sponsor `npm audit` 均为 0 vulnerabilities。Docker 本地不可用；本轮 HEAD 的跨平台 CI 需推送后核对。
- 内部竞赛维度评分：技术创新 **22/30**、场景落地 **22/30**、开源治理 **15/20**、长期发展 **13/20**，合计 **72/100**。这是基于当前证据的内部估分，不是官方评分。扣分集中在 0/40 模型诱饵触发、小样本单模型、视频缺失、公开分发包仍包含许可门控 V2 编译模块，以及真实宿主集成范围有限。

### 当前交付状态

- 代码、实验 JSON、dashboard、指南及 PDF 已在本地竞赛分支准备；普通 Git push 与 CI 尚待本次最终提交后复核。
- P1 V1/V2 公开分发边界仍未解决，本轮不发布 npm/Docker、不迁移商业架构。项目不满足稳定发布标准。
- 具备可复现的离线隔离演示和本地模型实验材料；尚未满足官网要求的可访问演示视频链接，因此整体参赛材料为**部分就绪**。
