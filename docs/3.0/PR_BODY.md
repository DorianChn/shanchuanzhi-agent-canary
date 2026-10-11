## 工程主线：Agent Canary 3.0 开发候选

Draft，尚未请求合并或稳定版发布。此 PR 以 `competition/shanchuanzhi-release-readiness` 为 base，依赖未合并的 PR #23，以便独立审查 3.0 增量。保留 main、所有 2.0 Release / PDF / 视频 / 原始实验。

### 已实施

- 新建独立工程 Worktree / `feature/agent-canary-3.0`，研究支线有单独 Worktree / `research/agent-canary-3.0`，不写入研究文件。
- 可信宿主登记的文件句柄、固定 executable / argv、pinned HTTPS 和 MCP 能力；一次性宿主审批、执行前 Guard 检查、效果证据。
- 5 类隔离假蜜罐、唯一 Decoy ID、实际交互记录；可信任务元数据的启发式选择，不宣称适应性收益。
- 证据协议 v0.1 JSON Schema、规范化 JSON、HMAC 请求摘要、可验证局部哈希链。
- 会话数据流指纹、有界 TTL / 容量，跨网关替换不清空同一 Guard 的敏感历史。
- 增量中文控制台：真实临时 IO DEMO、局部证据、审批、蜜罐、报告导出。

### 已有测试证据

- 新增 28 项网关 / 蜜罐 / 数据流 / 控制台测试通过。旧回归测试保留。
- 完整验证检查点：root 252 tests，248 pass、4 skip；Sponsor 25 tests，24 pass、1 skip，零失败。最终同会话历史保留补丁之后完整验证 / CI 另行更新，不把较旧检查点当最终结果。
- 48 次真实本地 Qwen / 受控 SDK Agent 间接 README 对照：A–F 均攻击成功 0/5、正常 3/3，主动阻断 0/5。模型未跟随注入，不能证明额外防护收益。
- 21 次单独的真实模型直接执行准入验证：A 危险效果 4/4，E/F 0/4，正常各 3/3。F 实际读取虚拟 .env 后隔离，后续写入拒绝、文件未改变。此组 **不是 Prompt Injection 防护率**。
- E/F 各一次真实事前 AI 审查为有效 suspicious，AI 不能授权；独立因果防护收益 NOT MEASURED。
- 复现并修复：无效 AI 输出被当作有效结论、敏感 MCP 输出后的 network 能力绕过、同一 Guard 替换网关清空敏感历史。失败与修复后日志全部保留。

### 安全与兼容边界

- 仅保护登记且经过 dispatch 的调用，非原生 Codex / Claude / Cursor 全局拦截，非 OS 沙箱。
- 本地同权限攻击者、已开始的外部副作用、固定程序内部系统调用、短片段 / 任意数据变换 OUT_OF_SCOPE。
- 哈希链没有外部锚 / 独立签名，管理员可整体重写，不宣称绝对防篡改。
- MIT 与原有 CLI/SDK API 保留，未触碰真实支付、客户数据、生产 Key，未 npm / Docker 发布。
- 普通 root npm / Docker 的历史 V1/V2 边界仍 OPEN；不能据此宣布稳定版，公开工程候选应使用正向清单。

### 文档与复现

见 `docs/3.0/{BASELINE_AUDIT,ARCHITECTURE,SECURITY_BOUNDARIES,THREAT_MODEL,AGENT_COVERAGE_MATRIX,EVIDENCE_PROTOCOL,DEVELOPER_GUIDE}.md`。

运行 `npm ci && npm run build && npm test`；使用已安装 Ollama，顺序运行 `node security-lab/run-sdk-agent.mjs --sha=<真实 Git SHA>` 与 `--execution-proof`。所有工具副作用局限于新建的隔离临时目录和 loopback 测试端点。3.0 不替代当前已验证 2.0 竞赛版本，未发送参赛邮件。
