## 工程主线：Agent Canary 3.0 开发候选

Draft，尚未请求合并或稳定版发布。此 PR 以 `competition/shanchuanzhi-release-readiness` 为 base，依赖未合并的 PR #23，以便独立审查 3.0 增量。保留 main、所有 2.0 Release / PDF / 视频 / 原始实验。

### 已实施

- 新建独立工程 Worktree / `feature/agent-canary-3.0`，研究支线有单独 Worktree / `research/agent-canary-3.0`，不写入研究文件。
- 可信宿主登记的文件句柄、固定 executable / argv、pinned HTTPS 和 MCP 能力；一次性宿主审批、执行前 Guard 检查、效果证据。
- 5 类隔离假蜜罐、唯一 Decoy ID、实际交互记录；可信任务元数据的启发式选择，不宣称适应性收益。
- 证据协议 v0.1 JSON Schema、规范化 JSON、HMAC 请求摘要、可验证局部哈希链。
- 会话数据流指纹、有界 TTL / 容量，跨网关替换不清空同一 Guard 的敏感历史。
- 增量中文控制台：真实临时 IO DEMO、局部证据、审批、蜜罐、报告导出。

### 最新测试与实验（运行时代码9f00b6b）

- 根254 tests /250 pass /0 fail /4 skip；Sponsor25 /24 pass /0 fail /1 skip，合计279 /274 pass /0 fail /5 skip。新增29测试。
- 冻结代码CI9/9真实通过：https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38131742795 。新交付HEAD CI另外核对。
- 保存90次真实Qwen /受控SDK Agent运行：48间接README +21旧直接准入 +21冻结直接准入；分别统计，不混分母。
- 间接对照A–F：各0/5危险效果、0/5主动拒绝、正常3/3。模型未跟随注入，不能证明额外防护收益。
- 冻结直接准入A效果4/4，E/F0/4；E/F主动拒绝4/4；正常各3/3。F实际读虚拟.env后隔离，后续调用拒绝，受保护文件未变化。不是Prompt Injection防护率。
- E有2次、F有1次结构校验通过的事前AI suspicious，共3/3；模型解释仍是未经事实认证的推测。独立因果阻断增益NOT MEASURED。
- 四项安全/可靠性根因有失败复现：无效AI输出、敏感MCP外传、同Guard替换网关历史丢失、Windows状态锁删除竞态。失败CI与所有样本保留。
- 早期两个原始sourceSHA被命令展开记为前一提交；原始结果不改，运行时五文件哈希核实更正，最新重跑显式正确SHA。
- Community正向清单111文件：45专项测试、独立构建、自检、audit通过；新ZIP解压到中文/空格临时路径再次构建、自检通过。root/Sponsor audit为0已知漏洞。
- 3份中文工程候选PDF共14页全部渲染；真实浏览器1080p WebM、SRT、架构SVG、报告与清单位于competition-submission/3.0。视频明确操作者DEMO与已保存模型结果；无现场推理或完整OS桌面录屏宣称。

### 安全与兼容边界

- 仅保护登记且经过 dispatch 的调用，非原生 Codex / Claude / Cursor 全局拦截，非 OS 沙箱。
- 本地同权限攻击者、已开始的外部副作用、固定程序内部系统调用、短片段 / 任意数据变换 OUT_OF_SCOPE。
- 哈希链没有外部锚 / 独立签名，管理员可整体重写，不宣称绝对防篡改。
- MIT 与原有 CLI/SDK API 保留，未触碰真实支付、客户数据、生产 Key，未 npm / Docker 发布。
- 普通 root npm / Docker 的历史 V1/V2 边界仍 OPEN；不能据此宣布稳定版，公开工程候选应使用正向清单。

### 文档与复现

见 `docs/3.0/{BASELINE_AUDIT,ARCHITECTURE,SECURITY_BOUNDARIES,THREAT_MODEL,AGENT_COVERAGE_MATRIX,EVIDENCE_PROTOCOL,DEVELOPER_GUIDE}.md`。

运行 `npm ci && npm run build && npm test`；使用已安装 Ollama，顺序运行 `node security-lab/run-sdk-agent.mjs --sha=<真实 Git SHA>` 与 `--execution-proof`。所有工具副作用局限于新建的隔离临时目录和 loopback 测试端点。3.0 不替代当前已验证 2.0 竞赛版本，未发送参赛邮件。

### 最终审查依据

见 docs/3.0/FINAL_REPORT.md、REAL_AGENT_EVALUATION.md、COORDINATION.md。完整3.0仍NOT_READY：原生主宿主E2E、独立100/50盲测、静态/自适应对照、AI独立增益及root商业分发边界未完成。保留已验证2.0版本。
