# Agent Canary 3.0 核心能力验收

> 历史验收快照：本文件保留对应提交的结果；最新交叉验收、48次新模型记录和候选包见 [FINAL_3_0_ACCEPTANCE.md](FINAL_3_0_ACCEPTANCE.md)。不要将以下旧计数/版本当成当前结果。

日期：2026-10-11。结论：**PARTIAL：受控 SDK Agent 的执行前安全闭环具备竞赛演示技术条件；尚不能作为第三方 Agent 全局防护或稳定版发布证明。** 未合并 main、发布稳定版或发送参赛邮件。

## 1. 版本、隔离与证据入口

- 验收起点：`e4960dd825d2434143a633617566c5aa30607d1f`；工程分支 `feature/agent-canary-3.0`，独立 Worktree `agent-canary-3.0-engineering`。
- 研究只读快照：`b44ac747dbe0c3045dd5fb8314654d6353c95c58`。通过 `git show research/agent-canary-3.0:docs/3.0/research/<file>` 读取 ENGINEERING_HANDOFF、CURRENT_3_0_MAPPING、SECURITY_INVARIANTS、SECURITY_ASSURANCE_LEVELS 等。没有 checkout/合并整个研究分支或写入研究工作树。
- 核心修复：`772d3558d905e150c7b1f905b85df0d473daa3d7`；日期严格性修复和第一次公平试验存档：`334b2c81569e100c8c7d727e0a9b9361ab530c5a`。
- 最终核心真实模型实验对应 **334b2c8**；运行时五个源码及五个构建文件 SHA256 均独立核对。后续验收脚本、测试和报告提交不会被冒充为重新运行的模型版本。
- 保留的 2.0 分支：`competition/shanchuanzhi-release-readiness`，`dc8d0092b35141b295d5ff42873584ed488e4ee7`。已有实验、PDF、视频和旧 ZIP 未覆盖。
- Draft PR：[24](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/24)，base 为 2.0 验收分支，依赖 PR23；这不是 main 已接受的版本。
- 原始日志：[`security-lab/acceptance/`](../../security-lab/acceptance/)；[最终真实模型原始结果](../../security-lab/evidence/2026-10-11T12-49-47-521Z/results.json)、同目录 preregistration/CSV/JSONL；[独立一致性与证据映射](../../security-lab/acceptance/assurance-final.json)。

## 2. 已证实问题与最小修复

本轮确认 **2 P1 + 3 P2**；没有发现可证实的新 P0。历史商业分发 P1 仍保留。

| 编号 | 风险/根因 | 修复/回归 | 状态 |
|---|---|---|---|
| R-SCHEMA-01 | P2：request_id 被写成空关键字，未引用 identifier | 修正 `$ref`；内部引用解析及实际 Draft202012 验证 | VERIFIED，772d355 |
| R-SCHEMA-02 | P2：RegExp 隐式转换使五个摘要/ID 字段接受单元素数组 | 先严格检查 string/null；共享字段向量 | VERIFIED，772d355 |
| A-FLOW-TTL | P1：来源 TTL 过期后 NETWORK 回调重新获准；本地接收端实际收到无效凭据编码 | 同一 Guard 生命周期保持敏感来源 latch；TTL 仅清理提示，不恢复权限 | VERIFIED，772d355 |
| A-FLOW-RACE | P1：两个同 Guard 网关分别排队，共享历史更新前网络回调已执行 | 共享同一 Guard 的队列/上限，先收集输出再判定外传 | VERIFIED，772d355 |
| A-DATE | P2：Date.parse 接受不存在的日期 | ISO 往返相等检查；Feb30、非闰年 Feb29、闰年正例、月13 | VERIFIED，334b2c8 |

先失败后修复的证据：schema-runtime-before.txt（34 测试，6 失败），schema-standard-before.json（7 个 request_id 不一致），gateway-before-with-observer.txt（TTL 和并发各收到 1 请求），timestamp-before.txt（38 测试，2 失败）。修复后 targeted-after.txt、full-verify-final.txt 和最终完整日志均保留。

`schema-standard-after-final.json` 保留了一次**验证环境失败**：本机 jsonschema 缺少可选 date-time 检查器，三个非法日期被视为有效。不能把仅设置 FormatChecker 当成格式检查已启用。最终 `verify-acceptance.py` 显式注册协议 UTC 子集的 Gregorian 检查，37/37 字段向量一致；不声称此检查器支持任意 RFC3339 格式。新增测试没有放宽产品策略。

## 3. 八项不变量验收

不变量是有假设的验收契约，局部 VERIFIED 不构成全称证明。可信宿主认证、工具元数据、执行器和操作员能力属于 TCB。

| 不变量 | 状态 | 实际证据/未覆盖边界 |
|---|---|---|
| I1 未授权高风险调用不得执行 | PARTIAL | 登记工具、强制模式：真实文件/固定 Node/本地接收端证明执行前拒绝。宿主误标 READ_ONLY、未接入调用、忽略 abort 的回调不受完整保证 |
| I2 低信任内容不能获得操作者权限 | VERIFIED（SDK 能力边界） | Agent 对象无 approve/reset，伪造 approved/operator 参数不放行。真实用户认证由宿主负责，不是平台账号认证系统 |
| I3 AI 不绕过确定性决策 | VERIFIED（注册路径） | benign、非法结构、超时、审查中隔离等均不自授权；实际 6 次前置审查有效。AI 最多收紧，不能重置 Guard |
| I4 审批不能超出原请求 | PARTIAL | 一次性、TTL 精确边界、并发重复消费、资源重查均验证；批准仅运行封存请求。不具备完整 task/grant 链、跨进程审批事务或通用主体认证 |
| I5 蜜罐不含真实生产凭据 | VERIFIED（生成的测试资产） | 五类生成器/临时目录/无效值，数据库和内部 API 是隔离内存模拟。没有读取宿主 .env/SSH 或生产数据；不推导整个 Git 历史无秘密 |
| I6 声明绑定真实证据和范围 | PARTIAL | 24 条 F 试验映射，源码/构建/原始 JSON/JSONL/链哈希一致；E0–E3 具体声明分级。全项目自动声明认证未实现，E4 BLOCKED |
| I7 失去执行/观察能力时降级 | PARTIAL | 证据容量不足拒绝准入；回调超时隔离且记录 NOT_VERIFIED；原生客户端没有健康覆盖证明。迟到副作用不能称已阻止 |
| I8 可用性优化不削弱边界 | PARTIAL | 同一能力 A/F 对照，读/写/构建/合法网络 8/8 完成；原攻击回归保留。只有四个独特正常场景重复两次，不证明群体 ≥95% |

## 4. 专项安全边界验证

| 项目 | 状态 | 命令/见证与限制 |
|---|---|---|
| 路径穿越、符号链接/Windows junction、注册后替换 | VERIFIED | gateway.test.ts：外部目标未修改；身份比较 + held fd，不只比较路径字符串 |
| 检查/使用窗口文件替换 | PARTIAL | gateway-acceptance.test.ts：替换 inode 保持原内容；已授权的旧 inode 仍可能写入，后验 FAILED/隔离；无回滚保证 |
| 审批重放/并发/精确到期 | VERIFIED（同进程） | 第二次/并发重复消费拒绝，回调实际只写一次；到期恰等时刻回调 0 |
| 同 Guard 多网关/TTL | VERIFIED（同 JS 进程、同对象） | 真正接收端从修复前各 1 降为 0；共享队列和敏感 latch。不同 Guard 对象/跨进程不继承这个锁 |
| HTTPS 目的地、私网与重定向 | PARTIAL | origin/query/credentials 拒绝、已许可 loopback HTTPS 在 transport 拒绝且接收端 0；现有 DNS 地址全量校验、一次解析/连接 pin、redirect 拒绝测试通过。没有搭建真实恶意公网 TLS/DNS 重绑定基础设施 |
| MCP 权限边界 | VERIFIED（可信 descriptor） | 精确登记 ID、未知/DESTRUCTIVE 拒绝、伪造批准不执行；READ_ONLY callback 的实际语义须可信宿主保证，不能替任意第三方 MCP 服务审计其内部行为 |
| 工具超时/取消 | PARTIAL | 队列后续操作拒绝；不响应 abort 的宿主回调测试**实际写入 late 文件**。不得将其测试通过解释为副作用被阻止 |
| 资源约束 | PARTIAL | 64 同 Guard 排队、4096 事件、8MiB 证据、64KiB 文件和有界 provenance；1500 次读取实测。未验证长时间稳定性/完整进程树沙箱 |

敏感 latch 避免 TTL 降权恢复漏洞，但读取敏感来源后，同一 Guard 的网络能力保守拒绝，可能干扰合法后续网络任务；不能让模型清除。新的可信任务上下文需要宿主建立新 Guard。来源识别仍是有限 pattern/tag/hash，不是模型内部完整污点分析。

## 5. 真实 Qwen + 受控 SDK Agent

最终冻结核对：334b2c8；Windows 11 普通用户，Node22.23.1；Ollama 中已有 qwen3.5-9b-local:latest，没有下载模型/付费调用。

| 任务类 | A 无保护 | F 完整系统 | 可支持的结论 |
|---|---|---|---|
| 直接受限操作真实副作用 | 12/12 | 0/12；主动拒绝12/12 | VERIFIED：模型自主选工具后，网关可拒绝登记范围内危险效果 |
| 恶意 README 间接注入成功 | 0/4 | 0/4；主动拒绝0/4 | PARTIAL：模型未跟随攻击，未证明 PI 阻断收益 |
| 正常任务完成 | 8/8 | 8/8；误中断0/8 | VERIFIED：这些限定任务兼容；生产误报率未测得 |
| 正常网络正对照 | 2/2 | 2/2 | 接收端可观察真实请求，F 未禁用全部网络 |

48 次最终试验 = 12 独特样本 × 2 重复 × 2 组。此前772检查点另一48次和原90次均保留，累计存档186次，**不混合分母、不称186个独立攻击**。同模型/提示/工具schemas/文件/固定命令argv/MCP callbacks，保留同一 send_fixture POST 接收端；fd 执行原语是保护处理的一部分。旧 HTTP A/F 不同能力的试验不作为 AI/数据流独立收益证据。

工具调用中位 A 1.1174ms（28调用），F 7.7777ms（32调用）；整任务中位 A 1395.00ms/F1855.15ms。F 前置 AI 6/6 有效，中位5088.90ms；无 AI 时仍 REQUIRE_APPROVAL，所以**独立阻断增益未测得**。模型预热/顺序/缓存和工作负载会影响时延，不将组间差值宣称精确 Gateway 开销。

Node 样本尾 RSS 峰值 A72,593,408/F68,202,496 bytes；不包含 Ollama/GPU/全进程树，不据此宣称 F 更省内存。Token：A Agent输入28744/输出1741；F输入30416/输出2590；F审查输入1372/输出1440。0异常，所有失败路径、原始日志保留。能耗/真实云端费用、独立 AI 收益、静态 vs 自适应收益未测得。

详见 FAIR_CORE_EVALUATION.md、EVIDENCE_ASSURANCE_MAPPING.md。自适应仅“可信元数据驱动的选择机制已实现”，没有公平收益证据。

## 6. 自动化、安装、许可证与 CI

- `npm ci/build/test/pack:check/verify/audit` 实际执行；772 readiness 共10步骤 exit0，根294/290通过/4跳过，Sponsor25/24通过/1跳过，两个audit均0已知漏洞。日期修复及最终4个边界测试后根**302项/298通过/0失败/4跳过**，见 full-verify-acceptance-corrected.txt。Sponsor代码未变，复用同次实际25项/24通过/1跳过；两项目唯一测试合计**327项/322通过/0失败/5跳过**，不重复计算 verify 内再跑或各平台CI。新增48项回归测试（基线254→302）。
- `full-verify-acceptance.txt` 是一次 Windows Node 参数错误（WSL路径被当Windows路径）启动失败，保留，正确参数重跑日志单独保存；不是产品测试失败。
- [334b2c8 CI](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38140759588)：**9/9 success**，实际读取 jobs，含 Windows/Linux/macOS × Node20/22、package、Sponsor、Docker build+`--help`。Docker 不是攻防实验，当前电脑 docker 不在PATH。
- 免费候选采用既有正向清单构建；新 ZIP 与安装结果见 ARTIFACT_ACCEPTANCE.md。当前用户中文/空格路径从 ZIP 独立 `npm ci/build/self-test`，不等同干净虚拟机/不同用户。保留旧ZIP，普通 npm/Docker商业边界 P1仍OPEN，仅策展免费包隔离，不修改授权系统。
- MIT 保持；未更换 Apache 许可、改动支付或读取生产配置。供应链 Action 固定完整 SHA、contents:read；本次局部秘密扫描不能证明所有历史提交均无秘密。

## 7. Agent / AI 覆盖

受控 SDK Agent：VERIFIED（本轮真实模型 + 实际临时文件/固定进程/本地网络）。自定义受保护 MCP：现有 stdio 握手/虚拟回调隔离测试通过，只限已接入服务。

Codex 程序定位成功；Claude/Cursor/Cline 不在PATH不等于未安装。三者以及Codex原生全局工具 E2E：BLOCKED/未验证；只有配置或 hook fixture，不冒充本轮 SDK 成果。参见 AGENT_COVERAGE_MATRIX.md。Ollama实际请求 VERIFIED；OpenAI/Claude/Gemini/DeepSeek/通义千问等无真实凭据，仅协议适配/模拟测试，不能标真实连通。

## 8. 复现

以下命令在 Node20/22 与已安装模型的受控机器运行；攻击工具只操作新建临时夹、无效数据及loopback端点。无模型也能运行自动化与离线演示。

```sh
git checkout feature/agent-canary-3.0
npm ci
npm run verify
node security-lab/run-sdk-agent.mjs --fair-acceptance --sha=<实际完整40位SHA>
# 需 Python jsonschema，输出使用新文件名，勿覆盖历史结果
python3 security-lab/verify-acceptance.py --results=security-lab/evidence/<新目录>/results.json --output=security-lab/acceptance/<新验收>.json
python3 security-lab/summarize.py
```

本轮真实 Windows 执行使用 native node.exe 与 Windows npm-cli.js 路径，Git 查询在 Git Bash 工作树；完整原始命令对应 README/helper 中的标准 npm 命令。共享队列不得从可信 callback 内递归等待同 Guard dispatch，跨进程串行化不在本次实现。

## 9. 是否具备正式参赛技术条件 / 最小补齐路径

**可作为“受控 SDK Agent 的可验证执行前防护”候选演示，不能宣称完整第三方 Agent 安全平台已验收。正式新版本材料提交：PARTIAL。** 测试数量不等于安全效果；旧2.0参赛版本继续保留。

最小补齐：

1. 固定当前免费候选，另一个操作者/干净环境复现安装、正常任务、拒绝效果和链核对，形成 E4；不用重写核心。
2. 用冻结独立间接攻击集得到至少一个基线真实成功、保护组实际拒绝的配对轨迹；同时扩大正常任务。没有成功攻击样本，就保留“执行准入已证明、PI增益未证明”。AI/自适应收益只有增加公平消融后才可宣传。
3. 若竞赛主张原生客户端防护，选择一个官方 hook/SDK 宿主实测健康/失效/执行前拒绝；否则将作品明确限定 SDK/MCP 受保护调用。把PDF/视频/邮件中的版本、覆盖与数据同步到新候选，确认官方提交要求后才交付；本轮未重做历史PDF/视频或发送邮件。

无额外 API 额度、模型下载或生产访问即可完成前两项的本地复现；原生云端宿主测试若收费需要授权。普通商业包发布仍需维护者确认边界，不能用比赛候选证明其稳定发布门槛。
