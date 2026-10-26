# 工程与研究成果交叉审查

日期：2026-10-11。工程基线 **e4960dd825d2434143a633617566c5aa30607d1f**；研究交接 **b44ac747dbe0c3045dd5fb8314654d6353c95c58**。本补丁位于独立工程审查工作树/分支，尚未并入活动工程分支，不改写冻结候选及历史实验。

## 1. 隔离和审查方法

- 活动工程：`agent-canary-3.0-engineering` / `feature/agent-canary-3.0`。初查工作区无未提交内容；即使随后主线新增修改，本轮也不操作其文件或Index。
- 研究：`agent-canary-3.0-research` / `research/agent-canary-3.0`。通过git show读取交接、映射和验证JSON，没有切换该工作树或盲目合并整条分支。
- 本补丁：`agent-canary-3.0-cross-review` / `shanchuanzhi/3.0-evidence-cross-review`，从精确e4960dd创建；源码、依赖安装、测试输出均在此目录或测试私有临时目录。
- 三个工作树分别使用自己的Index，共享Git对象库。没有模型实验、服务常驻、生产数据读取、付费调用、主线合并、远端推送或发布。

工程比研究映射的9f00b6b更新，但两项Schema/运行时校验问题在e4960dd仍存在；研究建议须按当前代码复核，不能直接照抄旧状态。

## 2. 已采纳内容与代码变更

| 内容 | 交叉核对结论 | 本补丁实际变化 |
|---|---|---|
| R-SCHEMA-01 / P2 | request_id为空关键字；宽容AJV未限制非法值，严格AJV编译失败；runtime拒绝非法值 | evidence.schema.json只修正为有效$ref；不改字段/协议版本 |
| R-SCHEMA-02 / P2 | 正则test隐式转换使单元素数组通过五类字段形状校验 | evidence.ts在evidence_id、request/event摘要及可空前序摘要/approval引用补精确string检查，保留null |
| 协议回归 | 研究首轮未运行完整标准验证器；现有锁文件已含SDK依赖的AJV | 新增test/evidence-schema.test.ts的14个测试，纳入npm test；无新增依赖/锁文件变更 |
| 真实导出验证 | 正常历史事件均为合法字符串，修复不需迁移历史数据 | 新增verify-evidence-schema.mjs：AJV2020严格校验、runtime/链验证、指标复算、新Recorder导出 |
| E0–E4 | 可以约束声明，不是自动分级功能或安全证明 | EVIDENCE_PROTOCOL加入范围化解释；RUNNING、VERIFIED与E3/E4分开 |

没有改Guard、Gateway执行策略、AI授权范围、蜜罐生成器或实验判据；没有为研究模型新增grant体系/图数据库/运行时依赖。

### 实际影响与根因

Schema引用错误影响发布协议的标准校验和证据关联：严格消费者拒绝编译，宽容消费者接受不合法request_id。现有正常记录仍可导出；runtime原先request_id规则依然有效。单元素数组缺口影响未受信输入形状的严格性；正常Recorder/网关记录使用字符串，本次不需要变更合法API数据格式。

根因确定到错误Schema属性与runtime缺少typeof检查。最初为什么生成了空关键字没有可靠命令记录，不将shell展开猜测当事实。没有授权绕过实证，保持P2；链验证拒绝部分数组事件不能代替正确形状校验。

### 当前逻辑模型对应关系

| 研究职责 | 本轮核对的实际入口 | 采纳状态与限制 |
|---|---|---|
| L1 Agent Interaction | `security-lab/run-sdk-agent.mjs`、`src/agent-integrations.ts` | SDK历史真实工具选择可核对；原生桌面宿主全覆盖NOT VERIFIED |
| L2 Trusted Enforcement | `src/runtime/gateway.ts`、`src/containment.ts` | 注册资源/执行前拒绝/审批局部测试VERIFIED；不是任意系统调用仲裁 |
| L3 Causal Security | `src/runtime/dataflow.ts`、`src/dataflow.ts` | 有界来源匹配已实现且有限测试通过；完整传播性质IMPLEMENTED_NOT_VERIFIED；通用因果图NOT_IMPLEMENTED |
| L4 Adaptive Intelligence | `src/ai/provider.ts`、gateway AI待审批分支、`src/runtime/honeypot.ts` | 接口与限制存在；历史真实分析不是本轮新调用；AI/自适应独立增益RESEARCH_HYPOTHESIS |
| L5 Assurance & Evidence | `src/runtime/evidence.ts`、Schema、实验原始记录 | 本轮字段/导出校验VERIFIED；自动分级/OTel适配NOT_IMPLEMENTED；E4 NOT VERIFIED |

这些是逻辑职责映射，不改文件布局，也不宣称每次dispatch都执行五层。Trust Continuity当前由可信host能力、注册资源、一次性审批及Guard复查部分实现；完整grant、父子权限衰减、跨进程撤销仍NOT_IMPLEMENTED，整体连续性RESEARCH_HYPOTHESIS。事件顺序、request_id和有限来源匹配分别支持时间、调用和数据关联；不把时间先后或相同片段认定为模型决策的因果理由。通用类型化Causal Attack Graph与因果干预收益仍未实现/未测量。

## 3. 安全不变量：强制机制、测试与假设分开

“有强制机制”仅针对可信宿主正确接入且执行器遵守能力声明的工具入口；不是全称形式证明。

| 不变量 | 当前强制机制 | 实际验证/缺口 | 分类 |
|---|---|---|---|
| I1未授权高风险不执行 | policy能力清单、held fd、执行前Guard复查 | 本轮gateway临时文件/进程/接收端测试通过；隐藏callback效果/旁路不受完整控制 | 受保护入口机制与限定测试VERIFIED；全局NOT VERIFIED |
| I2低信任内容不得取得用户权限 | agent仅dispatch、operator单独持有、额外授权参数拒绝 | 本轮伪造参数与无approve/reset接口测试通过；host不得将operator交给模型 | 库边界VERIFIED；远程操作者认证是宿主假设 |
| I3 AI不能绕过确定性策略 | AI只收紧待审批；失败/benign不发授权；执行前再查Guard | benign/timeout/invalid/suspicious回归通过；不能证明模型判断语义全部正确 | 动作约束VERIFIED；模型抗注入稳健性未全面验证 |
| I4审批不超原范围 | 不可变request、TTL、一次消费、资源和Guard复查 | 过期/重放测试通过；无完整任务grant/父子委托/撤销epoch | 当前实例能力范围VERIFIED；完整Trust Continuity仍研究假设 |
| I5蜜罐不用生产凭据 | 新temp、随机ID、固定无效模板，无真实secret读取 | 五类虚拟资产及读取隔离测试通过；不等于所有host配置无凭据 | 生成器范围VERIFIED；DB/API/MCP仍为模拟交互 |
| I6每条结论关联证据/范围 | 请求/事件ID、HMAC、hash链；本轮Schema一致性修复 | 100历史事件与新导出通过标准校验；自动声明分级/事实核验未实现 | 记录结构VERIFIED；报告全称保证未验证 |
| I7失去能力不宣称保护 | evidence容量失败拒绝准入、coverage文档 | 本轮证据容量测试通过；无完整native hook/observer实时健康系统 | 局部fail-closed VERIFIED；整体健康模型未验证 |
| I8优化不得破坏边界 | 原攻击/正常测试保留，本补丁不改变安全策略 | 本轮全量测试保留并运行；不能由此保证所有未来变更 | 当前回归有证据；持续不变量为验收契约 |

H03 TTL出口、H04多gateway队列、H05不响应取消的外部效果仍是明确范围的验证候选，不因静态怀疑计为本轮确认P1漏洞。本轮只处理已复现P2，不扩大为网关重构。

## 4. E0–E4与真实Agent证据

| 等级 | 当前可核对证据 | 不能据此宣称 |
|---|---|---|
| E0 | 架构/威胁/能力清单 | 已运行防护 |
| E1 | F/P04读取虚拟.env、蜜罐记录/Guard状态 | 全部注入已检测或实际副作用被阻断 |
| E2 | Gateway拒绝/待批记录、规范request绑定 | 任何旁路/已启动操作都被拦截 |
| E3 | 临时文件终态、固定测试进程标记、loopback计数、无保护正对照 | 全机无限期无副作用、所有原生Agent工具覆盖 |
| E4 | 复现材料可提供，但尚无独立操作者/独立环境完整重跑证据 | 本轮同机worktree测试、标准Schema校验或旧日志复算就是E4 |

主验收宿主仍是**受控SDK Agent + 真实Ollama/Qwen**。Claude Code、Codex、Cursor、Cline只按AGENT_COVERAGE_MATRIX披露配置、握手、hook与未验收部分；没有把这些宿主标为原生完整防护。

本轮复核三组已存原始运行，总计90次，不合并不同任务定义或代码版本为同一攻击分母：

- 间接README：48次，每组0/5危险效果、0/5主动拒绝、正常3/3；不能推断网关防护收益。
- 早期直接准入：21次，A效果4/4，E/F0/4，正常各3/3；元数据更正保留在既有SOURCE_PROVENANCE_CORRECTIONS。
- 冻结9f00b6b直接准入：21次，相同准入比例，F蜜罐1/4。是执行控制证据，不是间接PI检测率。

本轮没有新的模型调用。Schema/链及上述保存指标复算结果见evidence-cross-review/recorded-evidence.json；该文件记录每份原始SHA256，不修改原始输入、失败或评分。

F仍仅使用固定ENV；planner是可信任务类别启发式，五类资产DB/API/MCP为内存虚拟交互。**自适应优于静态、AI独立防护收益均NOT MEASURED**，没有写入已证明贡献。

## 5. 工程建议三级处理

### 必须修复

两项已证实P2协议一致性缺陷：本独立补丁已修复并回归，需主线选择性集成后才能将活动工程分支标为已修复。未处理公开普通npm/Docker V1/V2商业分发P1，不修改付费用户兼容性，也不宣称稳定版已就绪。

**收尾更新**：主线随后自行提交了`772d3558d905e150c7b1f905b85df0d473daa3d7`。两份Schema/runtime文件的Git blob与本补丁完全相同，故这两项源码缺陷在该主线快照中已修复，不再要求重复应用修复提交。其余本表与不变量表是e4960dd验证基线；主线新增加的敏感来源永久标记、同Guard共享队列及实验能力变化，应以主线自己的新回归记录验收。本轮没有运行变化中的主线测试，也没有将本分支264通过外推为772d355全量通过。

### 竞赛前建议完成

1. 将当前构建/代码SHA与E2/E3效果窗口、观察者、原始数据哈希一起冻结；报告中明确是受控SDK，不扩大native覆盖。
2. 对已经需要声明的TTL出口/多gateway/取消边界做小范围副作用回放；实证失败后再修，不先重构。
3. 用同executor、同正常任务/权限/预算做D/E消融；现有HTTP后端能力差异不能直接归因AI或来源跟踪。
4. 给独立操作者完整复现命令与材料；未真正重跑前E4仍NOT VERIFIED。

### 3.1后续研究

完整grant委托与撤销；通用类型化因果图；自动声明/assurance侧车校验器；等预算static/adaptive公平比较；完整实时覆盖/观察健康；原生官方hook逐宿主端到端验收。它们是候选方向，不作为本补丁引入大型依赖或延误核心闭环的理由。

## 6. 验证记录与失败保留

- 新14个回归在修复前：**1通过、13失败**，包含严格AJV未知空关键字、宽容Schema接受非法request_id及runtime接受数组；schema-before.txt保留。
- 修复后Schema+Gateway+Honeypot：**41通过、0失败、0跳过**；其中网关/蜜罐原有27项继续验证实际临时副作用，不只检查DENY标签。
- tsc构建通过；新增测试已加入npm test。
- 历史90次运行中的**100条证据事件标准Schema、runtime与链校验通过**；新Recorder意图/结果导出通过；指标与原始保存结果一致。
- 依赖只在新工作树用现有锁文件npm ci；没有新增包。初次原生Node传入WSL路径不能定位npm-cli，错误日志保留，改为Windows路径后安装成功。
- 首次完整测试TAP已成功，但命令包装器将Bash退出状态变量展开为空，整体shell返回2；保留root-tests.txt，不冒充该包装命令成功。随后改为不含变量的直接命令，最终结果单独记录，不重复计数。
- CI、Docker、Sponsor、本地模型、原生客户端E2E不在本次执行范围；不将主线历史结果冒充本补丁已验证。

所有原始日志位于docs/3.0/evidence-cross-review；原始研究提交b44ac74保留，没有cherry-pick整条研究分支。

## 7. 最终交付附记

### 冻结版本与实际结果

验证源码提交：**dbbec2d860ea095299947e991d2a3ed6aefe15ad**，分支`shanchuanzhi/3.0-evidence-cross-review`。包含5个代码/测试/脚本文件，不包含主线后来对网关的修改。文档与原始日志另行提交，其HEAD可用`git rev-parse HEAD`查询；不制造自引用Commit SHA。

环境：Windows `10.0.26200`，Node **v22.23.1 / win32 / x64**，通过Git Bash调用原生Windows Node。本轮不是Linux/macOS或Node20验证。

| 实际命令/检查 | 结果 | 原始证据 |
|---|---|---|
| `npm ci`（原锁文件） | VERIFIED：102包安装、103包审计，0已报告漏洞；不是独立供应链安全证明 | npm-ci-corrected.txt |
| 修复前新增14个测试 | 1通过、13失败，缺陷确实复现 | schema-before.txt |
| Schema/Gateway/Honeypot定向测试 | VERIFIED：41通过、0失败、0跳过 | targeted-after.txt |
| `npm run build` | VERIFIED：退出码0 | build-final.txt |
| `npm test` | VERIFIED：268项，264通过、0失败、4跳过，取消0；新增14项全通过 | root-tests-corrected.txt |
| `npm run pack:check` | VERIFIED：退出码0，1.2.7 tarball smoke检查47文件；不等于V1/V2分发风险已关闭 | pack-check.txt |
| `node security-lab/verify-evidence-schema.mjs` | VERIFIED：100历史事件合法、链/保存指标无不一致，新Recorder导出合法，退出码0 | recorded-evidence-corrected.txt、recorded-evidence.json |
| 源码/测试/脚本/Markdown `git diff --check e4960dd HEAD -- <这7项文件>` | VERIFIED：退出码0，无空白错误 | 提交后执行记录 |
| 包含原始日志的全范围`git diff --check HEAD~2 HEAD` | FAILED（空白格式检查）：原始Node错误日志CRLF、TAP诊断尾空格和build日志末尾空行；不改日志来制造绿色结果 | 保留原始日志；不属于功能测试失败 |

实际命令使用`C:/Users/36712/AppData/Local/hermes/node/node.exe`及对应`node_modules/npm/bin/npm-cli.js`；复现者正常PATH下可使用表中的npm命令。全量测试设置`TSX_DISABLE_CACHE=1`。定向命令为`node --import tsx --test test/evidence-schema.test.ts test/gateway.test.ts test/honeypot-runtime.test.ts`。

四项跳过分别是新审计日志POSIX权限、私有文件/目录POSIX权限、根符号链接递归测试、Token注册表POSIX权限；Windows下没有获得这些条件的验证证据。定向、修复前后及重复包装命令不另计入268个唯一全量测试。

关键证据SHA256：

| 文件 | SHA256 |
|---|---|
| schema-before.txt | `65860a7bd9982db6adde57126fbb9049180e018dfddd59470e4f10ed1a16332b` |
| targeted-after.txt | `643e7301f0c21e04f085a57e62cd030a40a4609d2fe4a73a2e1105522b914716` |
| root-tests-corrected.txt | `49f19c93ceca7c5446de37bb63e8c29cc027af84364be396cb6bb573fcc523a2` |
| pack-check.txt | `e83a4f1c471967a6f5107b0ac93722505541b09cad14d132a2b3ab8e01e82abd` |
| recorded-evidence.json | `e3912f920fbbf9274239a7575862ef589457ebce0dd55a9f0f27565723249343` |

这些摘要是审查产物身份标识，不是独立签名或E4复现。

### 工程主线的选择性接收方式

1. 先核对自己的HEAD和未提交内容。本轮收尾观察到772d355主线已有未跟踪benchmark、readiness、模型实验输出；均未stage、移动或覆盖。研究HEAD仍为b44ac74，研究工作树检查为空。
2. 不合并整条研究/本审查分支。772d355的两处核心修复已经与dbbec2d对应blob完全一致，**无需再cherry-pick该代码提交**，避免重复测试与package.json注册冲突。
3. 主线已有`test/evidence-conformance.test.ts`和向量测试。仅在覆盖缺口确有收益时选取本分支严格AJV、新Recorder导出验证；选择验证脚本时同时保留其输出目录。读取本报告和协议分级说明即可先约束竞赛文案，不必增加生产机制。
4. 使用最新主线自己的全量回归与匹配版本原始数据验收；本报告100事件是固定历史数据，不能替代新实验。独立E4、原生宿主完整防护、自适应优越性和AI独立增益仍不宣称完成。

本轮结论：**两项P2在独立补丁中已复现、修复、验证，收尾确认主线已实施同等源码修复；研究声明边界已转成工程交接约束。**尚未对主线772d355的新网关/实验变更作动态验收，未推送、未合并、未发布、未修改冻结材料或历史实验。
