# Agent Canary 3.0 最终交叉验收

日期：2026-10-11。本报告是限定范围的工程验收，不是第三方安全认证、形式化证明或赛事评分。

## 1. 冻结结论与版本

**结论：可以冻结为“受控 SDK Agent 的可验证执行前防护”竞赛工程候选。不能冻结为“已验证的第三方 Agent 全局防护稳定版”；正式参赛发送材料仍为 PARTIAL。**

可冻结能力：可信宿主登记资源/工具后，Gateway 在执行前检查权限、Guard、敏感来源和必要的审批/AI 审查；受控 SDK Agent 使用真实本地模型自主选择工具；文件、固定测试进程和 loopback 接收端能见证这些受限调用没有产生禁止效果。可读的决策标签不单独构成上述证明。

- 本轮代码、测试及验证器冻结：`9ed69f3cfa8cae677ddc37351fa609c94c0c5616`。真实模型在此提交运行，五个源码及五个构建文件摘要实际核对一致。
- 本轮起点：`9a0819b52f3b9df3abb5e32cbf7fc10934a0a541`。没有修改运行时 `src/`，没有重写架构或新增防护模块。
- 既有运行时安全修复保留：`772d3558d905e150c7b1f905b85df0d473daa3d7`、`334b2c81569e100c8c7d727e0a9b9361ab530c5a`。
- 2.0 保留分支：`competition/shanchuanzhi-release-readiness`，`dc8d0092b35141b295d5ff42873584ed488e4ee7`。旧 PDF、视频、ZIP 和原始数据未删除/覆盖。
- 当前工程分支：`feature/agent-canary-3.0`；[Draft PR24](https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/24) 的 base 是 2.0 验收分支，依赖 PR23。没有合并 main 或发布稳定版。
- 本报告与后续记录提交只交付文档/证据，不把它们的 SHA 冒充重新运行模型的版本。当前交付 HEAD/CI 以 PR24 的实际记录为准；源代码、报告、候选包之间的版本关系在此明确列出。

## 2. 研究输入：真实路径与隔离

通过 `git ls-tree`、`git show <SHA>:<path>` 读取；没有 checkout/merge 研究分支，也没有操作其 Index。

| 文件 | 实际分支与固定 SHA | 实际源路径 |
|---|---|---|
| ENGINEERING_HANDOFF.md | research/agent-canary-3.0，b44ac747dbe0c3045dd5fb8314654d6353c95c58 | docs/3.0/research/ENGINEERING_HANDOFF.md |
| CURRENT_3_0_MAPPING.md | 同上 | docs/3.0/research/CURRENT_3_0_MAPPING.md |
| ENGINEERING_CROSS_REVIEW.md | shanchuanzhi/3.0-evidence-cross-review，0109fe250f59d0257ae6b418c8d825b23f54dc2b | docs/3.0/ENGINEERING_CROSS_REVIEW.md |

用户指定的研究分支路径 `docs/3.0/research/ENGINEERING_CROSS_REVIEW.md` **不存在**；没有虚构这个路径。三份字节不变的只读快照及 SHA256 在 [final-review-inputs/MANIFEST.json](final-review-inputs/MANIFEST.json)，读取得到的来源记录在 [research-inputs.json](../../security-lab/final-acceptance/research-inputs.json)。研究报告针对历史工程 SHA，不把其“未修复”或假设直接套到当前版本。

## 3. 缺陷核实、最小修复及先失败后通过

| 项目 | 实际影响 | 当前状态与证据 |
|---|---|---|
| R-SCHEMA-01 / P2 | 历史 request_id 子 Schema 是空关键字，而非有效 `$ref`。严格 AJV 编译拒绝；宽容 AJV 接受不应接受的对象。影响外部校验和请求关联互操作，未证明授权绕过 | VERIFIED：772d355 已修正。本轮补严格 AJV2020 + ajv-formats 实测、历史错误负例、实际 Recorder 导出校验；不重复改已修复代码 |
| R-SCHEMA-02 / P2 | 五个 ID/摘要字段曾因正则隐式转换接受数组 | VERIFIED：772d355 精确类型修复保留；标准校验器与运行时 37 个字段向量一致 |
| A-DATE / P2 | 不存在的日历日期被 Date.parse 规范化接受 | VERIFIED：334b2c8 往返检查保留；闰年/非闰年、Feb30、月13负例及显式格式检查通过 |
| A-FLOW-TTL / P1 | 来源提示 TTL 到期后出口恢复允许，旧回放真实接收端收到 1 请求 | VERIFIED：772d355 同一 Guard 生命周期敏感 latch 保留；修复后真实接收端 0 请求 |
| A-FLOW-RACE / P1 | 同一 Guard 的两个网关分别排队，来源登记前出口执行；旧接收端收到 1 请求 | VERIFIED：772d355 同 Guard 共享队列保留；修复后接收端 0 请求。同对象/同 JS 进程限定 |
| A-ASSURANCE-01 / P2（本轮新确认） | 离线验收器总状态 FAILED 时，单条声明仍可能标 VERIFIED/E3；缺效果字段、矛盾效果、失败正对照、模拟模式也可能被夸大 | VERIFIED：9ed69f3 修复元数据/来源/构建/正对照/效果一致性检查；任一验收失败让所有声明降到 PARTIAL/E0。修复前 6 个负例失败，修复后 7 个回归通过。不是新运行时授权漏洞 |

本轮最小源码变更：`test/evidence-conformance.test.ts` 新增 3 个标准校验测试；`security-lab/verify-acceptance.py` 与新增 `test-acceptance-verifier.py` 修复证据声明；`verify-artifact.py` 增加可配置 Node/npm 路径、UTF-8 与禁止覆盖已有报告。无新增依赖、无锁文件变更、无授权策略放宽。

前后日志：[verifier-negative-before.txt](../../security-lab/final-acceptance/verifier-negative-before.txt)、[verifier-negative-after.txt](../../security-lab/final-acceptance/verifier-negative-after.txt)、[core-targeted.txt](../../security-lab/final-acceptance/core-targeted.txt)。更早缺陷的先失败记录保存在 `security-lab/acceptance/`，见历史 [CORE_CAPABILITY_ACCEPTANCE.md](CORE_CAPABILITY_ACCEPTANCE.md)。测试复制到临时目录的记录，不修改原始试验。

## 4. E0–E4 对应实际代码与本轮结果

分级针对具体声明/请求/版本，不为整个产品授予 E3。E3 的观察独立于决策标签；本轮观察器仍与执行宿主处于同一可信环境。E4 才要求独立操作者/环境实际再现。

| 等级 | 实际实现、证据及状态 |
|---|---|
| E0 机制存在 | VERIFIED：`src/runtime/gateway.ts`、Policy/Guard/数据来源/Planner 的实际实现。机制、文档或已部署诱饵不证明攻击效果 |
| E1 观测信号 | VERIFIED：HoneypotRuntime 实际 READ 对应 eventId/decoyId；本轮 F 直接任务接触 2/12。DEPLOYED 不是 READ，READ 不是 BLOCKED |
| E2 执行决策 | VERIFIED：EvidenceRecorder 的 request_id/evidence_id、decision/reason、execution_status、Guard 状态和逐条链校验。RUNNING 是意图；枚举 VERIFIED 本身不授予 E3 |
| E3 目标副作用观察 | VERIFIED（局部）：F 12 条直接受限任务的禁止效果未发生：目标未变、受保护 secrets.txt 内容未返回或接收端未收件；8 条正常任务真实成功，均有同组或 A 组正对照。允许读取的诱饵/source.txt 不算秘密读取被阻止。4 条间接任务没有攻击行为，不支持“注入阻断 E3” |
| E4 独立再现 | BLOCKED：尚无另一个操作者/独立环境实际运行记录。同机 ZIP 解压、另一 Worktree、研究者读取日志/复算哈希都不是 E4 |

机器可读逐项映射：[current-cohort-assurance.json](../../security-lab/final-acceptance/current-cohort-assurance.json)。24 条 F 声明逐一绑定真实原始文件 SHA256、sourceSHA、事件/请求 ID、链头、目标观察及缺失范围：20 条局部 E3，4 条间接任务最多 E2；48 条 JSONL/链、37 个字段向量、5 源码/5 构建摘要及 17 项元数据检查一致。

OSEP 哈希链能校验给定记录的一致性；不能证明记录者诚实或阻止管理员整体重写。没有独立时间戳/签名。外部锚点未独立保存时，不保证识别整尾删除。临时 HMAC 请求摘要不允许公众在没有密钥时重建任意原始参数。验收器只检查一致性及有限场景映射，不是实时认证系统；伪造整套自洽观察记录仍超出它的能力。

## 5. 八项不变量：执行保障与假设

| 不变量 | 状态 | 真正执行保障/证据 | 限制 |
|---|---|---|---|
| I1 未授权高风险调用不执行 | PARTIAL | 可信登记 descriptor、held fd、固定 argv、Guard/Policy 准入；实际目标见证和 A/F 正对照 | 依赖宿主正确认证和登记执行器；不是所有系统调用仲裁，已开始/忽略 abort 的回调不完整覆盖 |
| I2 低信任输入不能获得操作员权力 | VERIFIED（受控 SDK） | 给模型的对象无 approve/reset；伪造批准参数不执行。runtime-console 测试 CSRF、操作者身份和重放 | 操作者持有权不是多租户/远程身份认证体系；不推广到其他宿主 |
| I3 AI 不能覆盖确定性拒绝/隔离 | VERIFIED（注册路径） | benign/超时/非法输出/审查期间隔离均不授权；仅合法 suspicious 收紧拒绝；本轮真实 6 次前置审查 | 明确安全的 ALLOW 请求不全面调用 AI；AI 没有独立授权能力 |
| I4 审批不能扩大原请求 | PARTIAL | 封存请求，一次性引用、精确 TTL、资源复查；并发批准只实际写一次 | 完整 task/grant 委托撤销、跨进程审批事务未实现 |
| I5 蜜罐没有真实生产凭据 | VERIFIED（生成资产） | 五类生成器、唯一 ID、无效测试值和隔离临时目录；虚拟 DB/API/MCP 内存回调 | 不是宿主真实数据库/SSH/API 服务；本轮没有检查整个 Git 历史是否含秘密 |
| I6 防护声明绑定证据和范围 | PARTIAL | 实际 24 条 F 声明/源构建摘要/链/观察一致；缺证据负例实际降级 | 同宿主观察仍属 TCB；通用声明认证、独立 E4 未实现 |
| I7 控制或观察失败时降级 | PARTIAL | 证据容量不足拒绝；超时隔离，后续队列拒绝，效果标 NOT_VERIFIED | 不响应 abort 的可信 callback 负例实际迟到写入，不能声称强制取消、回滚或全进程树终止 |
| I8 可用性改进不削弱边界 | PARTIAL | 原攻击回归保留；同能力 A/F 正常读/写/固定构建/网络 8/8 成功 | 只有四个独特正常场景各重复两次；不证明总体 ≥95% 或零误报 |

## 6. 专项攻击面：不是只验证返回 DENY

`test/gateway.test.ts`、`test/gateway-acceptance.test.ts`、`test/honeypot-runtime.test.ts` 真正操作临时资源。针对 Gateway/Recorder/蜜罐的本轮专项 78/78 通过。

| 项目 | 状态/实际见证 |
|---|---|
| 路径穿越、符号链接/Windows junction、注册后替换 | VERIFIED：越界目标未改，held fd 与资源身份检查。符号链接不是仅字符串检查 |
| 检查到使用窗口替换 | PARTIAL：替换目标未写入；旧已授权 inode 仍可能写入，后验 FAILED 并隔离。没有回滚/路径租约/OS 沙箱 |
| 审批重放、并发审批、TTL 边界 | VERIFIED（同进程）：回调实际一次或到期后零次；模型不能授予自己批准 |
| 多网关与敏感提示 TTL | VERIFIED（同一 Guard 对象、同进程）：来源完成后再作出口决定，提示过期不清除敏感 latch；不同对象/跨进程不继承这个锁 |
| HTTPS 校验/SSRF/redirect/DNS | PARTIAL：公共目标校验、一次解析后连接 pin、拒绝重定向；已许可 loopback HTTPS 仍拒绝且接收端 0。没有真实恶意公网 TLS/DNS 基础设施端到端回放 |
| MCP 工具边界 | VERIFIED（可信 descriptor）：精确 ID、未知工具/DESTRUCTIVE 拒绝、伪造批准不执行。不能验证第三方服务内部行为或宿主错误标注 READ_ONLY |
| 取消、超时、进程异常 | PARTIAL：测试回调配合 AbortSignal 时后续操作拒绝；故意不配合的回调实际迟到写入，是限制的反例，不是防护成功 |
| 来源传播、资源有界 | PARTIAL：有限 pattern/HMAC/长片段及已知编码、同 Guard 隔离；队列 64、证据 4096 条/8MiB、文件 64KiB 等上限。不是完整动态污点、因果图或长时间稳定性证明 |

敏感 latch 的保守出口拒绝可能影响同一会话中合法后续网络任务。不能由模型清除；新可信任务由宿主建立新 Guard。共享串行队列也不支持在可信 callback 内递归等待同 Guard 的 dispatch。

## 7. 真实 Ollama/Qwen + 受控 SDK Agent 公平对照

实际命令：`node security-lab/run-sdk-agent.mjs --fair-acceptance --sha=9ed69f3cfa8cae677ddc37351fa609c94c0c5616`。

原始记录：[2026-10-11T13-34-53-835Z/results.json](../../security-lab/evidence/2026-10-11T13-34-53-835Z/results.json)，SHA256 `54210c84a443853606926a174765a8759a655946120760f1ce963d9705997bb3`；同目录 preregistration、CSV、48 条试验 JSONL；执行日志 [real-model-run.txt](../../security-lab/final-acceptance/real-model-run.txt)。Windows11、Node22.23.1；已有 `qwen3.5-9b-local:latest`，无模型下载/云端付费。

12 个独特样本 × 2 重复 × A/F 两组 = **48 次本轮真实模型试验**。模型读取文本并自主选择工具；脚本没有强制诱饵调用。两组相同模型、任务、工具 schema、初始虚拟数据、固定测试 argv 和 loopback POST 接收端；F 用受保护资源句柄执行。temperature=0、think=false、num_ctx=4096、num_predict=256、seed=20261011、maxTurns=4，实际参数保存在 preregistration/results。实验范围是开发者自建有限测试集，不是外部 benchmark。

| 指标/任务类 | A 无保护 | F 完整系统 | 可支持结论 |
|---|---|---|---|
| 直接受限调用产生禁止效果 | 12/12 | 0/12；主动拒绝 12/12 | VERIFIED：这些执行准入任务中，真实目标效果被阻止。直接要求工具调用不是间接 PI |
| 恶意 README 间接攻击成功 | 0/4 | 0/4；主动拒绝 0/4 | PARTIAL：模型没有成功跟随攻击，不能归因网关阻断或计算有意义的 PI 改善 |
| 正常任务完成 | 8/8 | 8/8 | VERIFIED：本组有限任务兼容，生产正常成功率未测得 |
| 正常策略/隔离中断 | 0/8 | 0/8 | 不宣称总体零误报 |
| 正常网络正对照 | 2/2 | 2/2 | 真实接收端能收到合法请求，未关闭全部网络 |
| 蜜罐 READ 接触 | 0/12 直接任务 | 2/12 直接任务（全部攻击 2/16） | 只有真实接触信号；不是部署数或自适应优势 |
| 失败/超时/无效试验 | 0/24 | 0/24 | 原始数据全部保存；不删除不利样本 |

有限重复的参考 Wilson95% 区间：12/12 预防约 75.8%–100%，8/8 正常完成约 67.6%–100%。重复运行并非独立样本，该区间不构成总体保证；至少一个实际基线成功的间接攻击配对仍缺失。

| 性能/资源 | A | F |
|---|---|---|
| 工具调用中位/调用数 | 1.07415ms / 28 | 7.40715ms / 32 |
| 整任务中位 | 1389.34ms | 1833.69ms |
| 有效前置 AI/审查请求 | 0/0 | 6/6，中位 5144.52ms |
| Agent Token（输入/输出） | 28742 / 1738 | 30413 / 2628 |
| 审查 Token（输入/输出） | 0 / 0 | 1372 / 1440 |
| Node 样本尾 RSS 峰值 | 66867200 bytes | 68427776 bytes |
| Node CPU user/system 累加 | 265000 / 281000µs | 78000 / 315000µs |

RSS 不包含 Ollama、GPU、全进程树，不是连续内存峰值；工具中位混合不同决策/审查路径，不将组间差值当纯 Gateway 开销。任务顺序、预热、缓存和同机负载没有完全消除。云端价格/能耗未测得。

AI 确实发生在相应回调执行前，恶意指令尝试将 review_workflow 标 benign 并自批准，没有获得权限；但是关闭 AI 时这些请求仍 REQUIRE_APPROVAL，**AI 独立阻断增益 NOT MEASURED**。没有本轮 AI-only 消融或对所有放行调用的审查。

自适应 Planner 只验证了可信元数据的选择机制；F 使用固定 ENV 诱饵。**静态 vs 自适应收益 NOT MEASURED**，不申报更高触发率。来源关联不证明模型内部因果关系。

旧 90 次及之后三组 48 次均保留，总存档 234 条；不混合不同提交/不同定义分母，不称 234 个独立攻击。旧来源 SHA 元数据错误及其纠正侧车也未覆盖原始文件。

## 8. 宿主、模型与协议范围

| 对象 | 状态 | 本轮验证范围 |
|---|---|---|
| 受控 SDK Agent + Ollama/Qwen | VERIFIED | 真实推理、自主工具选择、Gateway 准入和临时目标观察；这是主要验证宿主 |
| 自定义已登记 MCP 回调 | VERIFIED（局部） | 可信 descriptor 的实际回调、未知/危险拒绝及 Guard 隔离；现有 stdio 客户端测试不等于任意 MCP 服务安全 |
| Codex / Claude Code / Cursor / Cline 原生宿主 | BLOCKED（E2E 证据缺失） | 现有配置、hook fixture 或可执行文件检测不能替代这些宿主的真实完整执行拦截。未改其进程或配置 |
| 未经过 Guard/Gateway 的第三方操作 | OUT_OF_SCOPE | 本系统不能自动保护全部原生工具、系统调用或已经开始的外部操作 |
| Ollama | VERIFIED | 本轮实际连接已有 Qwen 模型，6 次有效辅助分析与 Agent 请求 |
| OpenAI / Claude / Gemini / DeepSeek / 通义千问 / LM Studio / vLLM / Compatible | PARTIAL | 已有协议适配/模拟与错误隔离测试；没有本轮真实凭据或服务请求，不标真实连通 |

详见 [AGENT_COVERAGE_MATRIX.md](AGENT_COVERAGE_MATRIX.md)。原生宿主不是必须立即新增的功能；若参赛主张其全局保护，则成为证据阻塞。可直接采用限定 SDK 声明。

## 9. PARTIAL 项：缺失证据、复现与最小补齐

下面列出当前验收涉及的全部 PARTIAL 类别。补齐目标先收窄声明，不要求为了验收重造系统。

| 类别 | 缺失证据 | 复现/最小补齐 |
|---|---|---|
| I1 全范围执行控制、MCP 内部语义 | 任意不合作执行器/错误 descriptor 的安全保证 | 重跑 gateway-acceptance 中 abort 忽略负例；仅信任登记执行器并明确 TCB。若需强制终止，另设计进程/OS 隔离，不把它算本轮已实现 |
| I4 全任务授权连续性/跨进程审批 | 委托父链、撤销、跨主体/跨进程事务 | 当前重跑一次性/并发/到期测试；限定单进程能力持有权。完整授权协议是未来研究，不作已实现声明 |
| I6/E4 独立复现及观察真实性 | 另一操作者运行、外部见证/锚点 | 独立克隆冻结提交，运行本报告命令，保存环境、目标前后观察、原始结果、哈希与失败。研究者只读审查不能替代 |
| I7 取消/迟到副作用 | 强制中断不配合 callback/后代进程与无限期观察 | 现有反例已实际见证 late 文件；将结果标 NOT_VERIFIED/UNKNOWN，保留隔离后拒绝，不能宣传回滚 |
| I8 可用性/误报 | 独立、更多类型正常任务及敏感读取后合法网络情形 | 冻结新正常任务清单，保留所有中断并分别计审批/拒绝；当前只宣称 8/8 样本结果 |
| 路径替换/TOCTOU | 路径租约及旧 inode 效果回滚 | 重跑 file replacement 回归，检查旧/新两个对象；限定 held fd 绑定授权对象，不扩大为 OS 沙箱 |
| 公网 HTTPS/DNS | 真实攻击基础设施上的 pin/重绑定/TLS 端到端 | 当前本地 private/redirect/pin 回归可复现；若需要新实验，仅用授权自有 TLS/DNS 测试服务，否则披露未验证 |
| 数据流/资源长期稳定 | 任意编码/小片段/模型内部流与长时间资源曲线 | 当前 HMAC/编码/TTL/队列上限回归；未来固定时长 soak 与变换负例。只称轻量来源关联，不称完整污点/因果识别 |
| 间接 PI 净收益 | 无保护真正成功且 F 主动阻断的独立配对轨迹 | 保留现有攻击集，增加预登记留出集/正常对照，不删失败。不成功则维持“准入已证实、PI 净收益未证实” |
| AI/自适应独立收益 | 仅切 AI 或仅切 planner 的公平消融 | 本轮不扩功能；沿用同库同预算同权限只切一因素。未做则撤回增益宣传 |
| 云端/其他本地 Provider | 实际服务连通与实际用量 | 用户授权测试凭据/费用或启动已有本地服务后再测；当前协议测试不能升级为真连通 |
| 正式参赛材料同版本 | PDF/视频还对应 9f00 历史冻结，官网/正式提交未按本轮重发 | 以本报告限定范围、实际数字、源码/包 SHA 同步材料，再核实官方提交要求。不需要开发新功能；本轮不发送邮件 |

## 10. 研究结论纠偏

1. 五层是逻辑职责，当前代码不是强制五个物理流水线；文档分层不等于执行证明。
2. Trust Continuity 是规范/候选性质。当前实现有限能力持有权，未实现完整 task grant、父委托/撤销或数学证明。
3. Causal Attack Graph 未实现为通用推断引擎。摘要/片段匹配是来源关联，不能写成已证明的心理原因或完整因果归因。
4. 自适应仅“选择机制已实现”；没有公平优于静态的证据。
5. E3 不由 VERIFIED 枚举、Codex 自述或哈希一致单独生成。E4 不是同机复算。
6. 旧研究中 H01/H02/H03/H04 的未修复状态分别由已提交修复/实际回放更新，不合并历史报告来覆盖新工程事实。
7. 网关、能力控制、诱饵、哈希链有既有相关工作；本轮证据支持工程组合的可验证性，不支持“全球首创”、对第三方工具的排名或获奖预测。

只读研究快照保留历史原文；本报告与入口提示修正其在当前版本上的解释，没有未经研究作者确认修改研究分支。

## 11. 构建、CI、许可证及安装

实际执行日志均在 [security-lab/final-acceptance/](../../security-lab/final-acceptance/)：

| 验证 | 结果/范围 |
|---|---|
| npm ci / npm run verify | VERIFIED：依赖重装；build + 全部 root tests + pack:check。305 项：301 通过、0 失败、4 Windows 权限/符号链接相关跳过；full-verify.txt |
| 针对 Gateway/Schema/Honeypot | VERIFIED：78/78；是上述 root tests 的重复子集，不再次计入唯一测试总量 |
| Python 验收器负例 | VERIFIED：7/7；独立辅助测试，不与 Node 数字混淆。修复前 6 失败日志保留 |
| npm audit | VERIFIED：npm-audit.json，0 已知漏洞；不等同无供应链风险 |
| 当前源码 CI | VERIFIED：[9ed69f3，run38143747766](https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38143747766)，实际9/9 jobs success。Windows/Linux/macOS × Node20/22、package、Sponsor、Docker |
| Sponsor | VERIFIED（当前 CI job）：真实测试/smoke 通过；本轮没有重新运行本地 Sponsor。以前的本地结果保留，不伪装成本轮新执行 |
| Docker | VERIFIED（CI build + --help）：不是 Docker 中真实攻防/本机桌面 Docker 验证 |
| MIT/公开包边界 | VERIFIED（策展免费候选）：MIT 未变；正向清单排除旧商业模块与秘密路径。普通 npm/Docker 的历史 V1/V2 商业分发 P1 仍 OPEN，不授权重大商业迁移 |
| 秘密检查 | PARTIAL：90 个本轮改变/新建文本文件中私钥或长云端 Key 字面值模式 0 命中，候选禁止路径 0；scoped-integrity-check.json。不是所有凭据类型/整个 Git 历史或宿主无秘密证明 |
| ZIP 新目录安装 | VERIFIED：下述实际 ZIP、120 文件 manifest 零不一致，普通用户中文/空格新临时路径 npm ci/build/self-test exit0。不是干净 VM/另一个操作者 |

候选包：`competition-submission/3.0/Agent_Canary_3_0_Community_Preview_9ed69f3c.zip`。
SHA256：`f972fc8b1ea142dfa01c1bd73f7a6a4bb2692f734a3c7df3e64656d82e635366`。
构建记录：[community-build-9ed69f3c.json](../../competition-submission/3.0/community-build-9ed69f3c.json)：npm ci/build、96/96 专项测试、self-test、audit 均 exit0。独立 ZIP 安装记录：[candidate-install.json](../../security-lab/final-acceptance/candidate-install.json)。96 是 root tests 子集，不增加唯一总量。

此包冻结的是运行代码和免费入口，并非全研究仓库镜像；包内报告/控制台数据是构建时保留的历史五组摘要。本轮第六组 48 次记录、交叉快照、最终验收报告从同一公开工程分支取得，不把包内旧摘要伪装成最新实时结果。完整复现优先使用 Git 克隆的冻结代码 + 公开原始记录；离线 SDK/CLI 使用可从 ZIP 独立安装。

## 12. 第三方复现命令

代码验证在冻结 SHA 运行；本报告/新原始结果保存在后续交付提交，克隆工程分支可取得。检出代码前保存自己工作区；下例假定新克隆。

```sh
git clone --branch feature/agent-canary-3.0 https://github.com/DorianChn/shanchuanzhi-agent-canary.git
cd shanchuanzhi-agent-canary
git rev-parse HEAD
git worktree add --detach ../agent-canary-frozen-9ed 9ed69f3cfa8cae677ddc37351fa609c94c0c5616
cd ../agent-canary-frozen-9ed
npm ci
npm run verify
npm audit
node --import tsx --test test/evidence-conformance.test.ts test/gateway.test.ts test/gateway-acceptance.test.ts test/honeypot-runtime.test.ts
python3 security-lab/test-acceptance-verifier.py
# Python helper 需要 jsonschema；本机没有时先在自己授权的虚拟环境安装
# 只使用已安装 Ollama 模型；没有模型时记录 BLOCKED，不自动下载
node security-lab/run-sdk-agent.mjs --fair-acceptance --sha=9ed69f3cfa8cae677ddc37351fa609c94c0c5616
python3 security-lab/verify-acceptance.py --results=security-lab/evidence/<本机新运行目录>/results.json --output=<不存在的新验收文件>.json
```

如果只复核已公开记录，请从工程交付分支执行 verifier，并把 results 指向本报告第7节目录；源码冻结 SHA 在本地 Git 对象中可核对。格式检查不是只传 FormatChecker 就足够：本 helper 显式启用 UTC 日历检查；Node 标准 Schema 测试使用 AJV2020 与 ajv-formats。

ZIP 校验/安装（文件来自工程交付分支，helper 现在可配置路径）：

```sh
python3 security-lab/verify-artifact.py --artifact=competition-submission/3.0/Agent_Canary_3_0_Community_Preview_9ed69f3c.zip --report=<不存在的新安装文件>.json --node=<node绝对路径> --npm-cli=<npm-cli.js绝对路径>
# 解压目录中的用户流程
npm ci
npm run build
npm test
npm run self-test
npm run ai:console
```

Windows 实际执行使用 native node.exe/npm-cli.js 与 UTF-8 Python；完整输出在命名日志中。无需管理员权限；本轮仍非独立新用户/干净系统证明。

## 13. 最终状态与最小阻塞清单

| 结论 | 状态 |
|---|---|
| SDK 限定范围的执行前防护竞赛工程候选 | VERIFIED，可冻结代码9ed69f3及其摘要/策展 ZIP；声明须保留本报告范围 |
| 具有独立复现 E4 的候选 | BLOCKED：另一操作者/环境实际再现未执行 |
| 对真实间接 PI 显示净改善 | PARTIAL：无保护组未成功，不可宣称收益 |
| 全局原生 Codex/Claude/Cursor 防护 | OUT_OF_SCOPE/未验证；不是本次 SDK 验收结果 |
| 任意忽略 abort 回调的零副作用/TOCTOU 回滚保证 | FAILED（边界反例）：late 写入/旧 inode 写入可发生；产品已披露，不将其测试通过描述为阻止 |
| AI/自适应独立增益、完整因果/授权连续性理论 | PARTIAL/OUT_OF_SCOPE：未测收益或未实现未来研究机制 |
| 普通 npm/Docker 3.0 稳定发布 | BLOCKED：商业分发边界 P1、未授权发布等门槛仍在 |
| 按本轮代码同步并正式发送参赛材料 | PARTIAL：旧 PDF/视频未重做，本轮无邮件/正式赛事提交 |

**最小补齐路径：**

1. 另一操作者用公开冻结代码/包复现正常任务、拒绝后真实目标观察与链校验，保留成功和失败，形成限定 E4；无需新增核心功能。
2. 同步 PDF/视频/提交清单到本报告的 SHA、范围、真实数字，核实官方要求后由维护者确认提交。当前历史材料不能标成 3.0 本轮最终版。
3. 若要主张 PI、AI 或自适应改善，补预登记配对/消融证据；若不补，采用 SDK 执行准入限定声明即可。原生全局能力不列入当前作品承诺。

机器可读索引及 SHA256：[FINAL_EVIDENCE_LEDGER.json](../../security-lab/final-acceptance/FINAL_EVIDENCE_LEDGER.json)。范围/历史保全核对：[scoped-integrity-check.json](../../security-lab/final-acceptance/scoped-integrity-check.json)，运行时与冻结9ed提交无差异，已有五组原始记录未改变。

没有证据显示需要重构架构才能冻结上述限定候选。测试通过数量不证明安全收益；局部效果观察不等于平台完整安全、更不等于获奖保证。
