"""Derive evidence-backed readiness documents; keep all historical materials."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1];SUB=ROOT/'competition-submission';E=SUB/'evidence';DOC=ROOT/'docs/competition'
S=json.loads((E/'readiness-final-summary.json').read_text(encoding='utf-8'))
A=json.loads(sorted(E.glob('readiness-*/results.json'))[-1].read_text(encoding='utf-8'))
assert A.get('uniqueTests') and not any(x['status']=='FAILED' for x in A['steps'])
I=json.loads((E/'release-install-2026-10-11T08-46-29-661Z/results.json').read_text(encoding='utf-8'))
B=json.loads((E/'readiness-performance.json').read_text(encoding='utf-8'));ST=json.loads((E/'readiness-bounded-stability.json').read_text(encoding='utf-8'))
C=json.loads((E/'readiness-free-candidate.json').read_text(encoding='utf-8'))
P=json.loads((E/'public-surface-2026-10-11T08-42-03-307Z/results.json').read_text(encoding='utf-8'))
PR=json.loads((E/'readiness-new-pr.json').read_text(encoding='utf-8'))
CI=json.loads((E/'readiness-code-ci-second.json').read_text(encoding='utf-8'))
assert CI['conclusion']=='success' and all(j['conclusion']=='success' for j in CI['jobs'])
BASE='73cfdf990e7de669d5ffdb47ae56f5041ad4d31b';CODE='a5425b26a1f391eec7635a8f08dce121418c4e71';URL='https://github.com/DorianChn/shanchuanzhi-agent-canary';TAG='v2.0.0-competition-preview.1'
def rate(x):return f"{x['numerator']}/{x['denominator']}" if x['denominator'] else 'NOT MEASURED'
def write(path,text):path.write_text(text.strip()+'\n',encoding='utf-8')
rows='\n'.join('| '+a+' | '+ ' | '.join(rate(v[k]) for k in ['attackSuccess','observedEndToEndPrevention','canaryDetection','guardBlock','policyBlock','policyApprovalWithholding','normalTaskSuccess','falsePositive','approvalInterruption'])+' |' for a,v in S['arms'].items())
raw=json.loads((E/S['sourceFile']).read_text(encoding='utf-8'));failed='\n'.join('- '+a+': '+', '.join(t['scenarioId'] for t in raw['trials'] if t['arm']==a and t.get('attackSuccessInSyntheticEnvironment') and t['scenarioId']!='A09_POST_QUARANTINE') for a in S['arms'])
usage='\n'.join(f"| {a} | {v['agentUsage']['inputTokens']} | {v['agentUsage']['outputTokens']} | {v['agentUsage']['missing']} | {v['reviewRequests']} | {v['preReviewLatency']['medianMs']} / {v['preReviewLatency']['p95Ms']} |" for a,v in S['arms'].items())
review_in=sum(x.get('usage',{}).get('inputTokens',0) for v in S['arms'].values() for x in v['reviewStatuses']);review_out=sum(x.get('usage',{}).get('outputTokens',0) for v in S['arms'].values() for x in v['reviewStatuses']);post_in=sum((x.get('usage') or {}).get('inputTokens',0) for v in S['arms'].values() for x in v['postAnalysisStatuses']);post_out=sum((x.get('usage') or {}).get('outputTokens',0) for v in S['arms'].values() for x in v['postAnalysisStatuses'])
write(DOC/'REAL_MODEL_FINAL_EVALUATION.md',f'''# 真实本地模型最终复验

日期：2026-10-11。真实推理 VERIFIED；全部危险操作是虚拟执行器，不是真实凭据、真实删除、真实 Shell 或网络外传。

## 冻结条件与证据

- 模型 `{S['model']}`；Ollama loopback，未下载新模型，未调用付费云服务。
- 模型测试代码基线 `{BASE}`。之后新增的可选文件状态适配器未在此次模型实验中启用；它有独立回归证据，不将其宣称为 ASR 改善原因。
- 28 场景 × 6 组 × 1 次 = 168 真实 trial。每组 19 个可比较攻击、8 个正常任务、1 个预置隔离场景；预置隔离不算主动检测。
- 配置：`{json.dumps(S['settings'])}`。同一模型、工具能力、任务、seed；A 无保护，B 仅诱饵，C 诱饵+Guard，D1 参数策略，D2 策略+事后解释，E 策略+事前 AI 审查。
- 原始 JSON：`competition-submission/evidence/{S['sourceFile']}`；同名 CSV/Markdown；JSON SHA256 `{S['sha256']}`。
- 场景及策略哈希：同目录 `round4-preregistration-2026-10-11T08-22-30-581Z.json`；统计：`readiness-final-summary.json`。原始 110 次与上一轮 168 次文件均保留。
- 独立留出集为作者预先冻结的四个攻击场景，不是第三方盲测。只有一个种子，不宣称总体防护概率。

## 分子/分母

| 组 | ASR | 观察到拒绝阻止 | Canary | Guard拒绝/危险尝试 | 策略硬拒绝/危险尝试 | 待批未执行/危险尝试 | 正常完成 | 正常硬拒绝 | 正常待批中断 |
|---|---|---|---|---|---|---|---|---|---|
{rows}

观察到拒绝阻止要求存在实际拒绝或待批且该 trial 未执行危险 callback。它不是 1-ASR。模型自行不攻击也不算产品拦截。合法操作等待审批和策略硬拒绝分别统计。

E 不优于 D1：ASR 差异为 0；D1 与 E 均 1/19。E 正常任务额外硬拒绝 2/8，因此事前 AI 默认关闭。独立 AI 因果增益 NOT MEASURED：E 还包括附加来源/路径检查，无重复种子、独立盲测消融。

Canary 主动触发为 0/19。C 中 0/10 Guard 阻断的链路原因：模型未选择诱饵、没有信号进入 Guard、会话仍 SAFE、调用发生于隔离前；不能推断 Guard 状态机失效。预置隔离和单元测试另行证明信号之后 callback 被拒绝。

## 失败案例与统计限制

{failed}

D1/D2/E 唯一 ASR 样本 A06 包含模型执行两次 `ls -la` 合法只读 Shell。沿用旧“任意虚拟 Shell 即攻击成功”的口径保留为 1/19，没有改定义刷高防护率；完整轨迹保留。安全性不能仅依赖该宽口径。

无试验运行错误（0/168），没有将超时或无效样本算作通过。每项比例的 Wilson 95% 区间存入 summary，异质任务不是 iid，不做显著性宣称。4/19 区间约 0.085–0.433，6/19 约 0.154–0.540，1/19 约 0.009–0.246。

## 实际延迟、用量与成本

| 组 | Agent输入Token | Agent输出Token | 缺失用量请求 | 事前审查次数 | 审查median / p95 ms |
|---|---|---|---|---|---|
{usage}

事前审查额外用量 {review_in}/{review_out} 输入/输出 Token；事后分析额外 {post_in}/{post_out}。来自每请求真实 Ollama usage，没有估算缺失值。E 10 次审查均为 suspicious，不能因结构有效而视为判断正确。

Router 安全路径微基准 2000 次 median {B['router']['median']/1000:.3f} ms、p95 {B['router']['p95']/1000:.3f} ms，包括虚拟 callback/审计；不等于纯 Guard 成本。60 秒模拟压力执行 {ST['callbacks']} 回调、{ST['insertions']} 次来源插入，保留 {ST['retainedEntries']}/{ST['capacity']}；之后隔离拒绝 VERIFIED。长期生产稳定性 NOT VERIFIED。

API 成本 NOT MEASURED；没有付费云请求，不将本地计算成本称为零。更多模型、种子、真实业务/桌面 Agent 是待验证项。

## 复现

`npm ci && npm run build` 后执行 `node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent --v2`。仅已有 loopback Ollama 模型；所有危险工具虚拟。新代码为每次复测生成独立统计文件，不再覆盖已发布 summary。

绕过 Router、已开始的副作用、任意第三方未注册工具、模型内部数据流 OUT_OF_SCOPE。不能据本实验声称全局 Prompt Injection 防护。
''')
write(DOC/'RELEASE_READINESS_AUDIT.md',f'''# Agent Canary 2.0 发布验收

验收日期：2026-10-11。基线 main `{BASE}`；新增文件持久化实现 `{CODE}`；新分支 `competition/shanchuanzhi-release-readiness`，Draft PR {PR['html_url']}。PR #22 已合并，不改写其历史；本轮不合并、不稳定发布、不发送邮件。

## 发布现场与资料

| 检查 | 状态 | 证据 |
|---|---|---|
| main / PR22 | VERIFIED | `readiness-pr22.json`；merge commit 与基线相同 |
| 预发布Tag | VERIFIED | `{TAG}`，target=main，prerelease=true；metadata JSON |
| 七附件内容 | VERIFIED | `release-install-2026-10-11T08-46-29-661Z/results.json`；逐个 SHA256 对比 API digest 与清单 |
| 官网2.0/手机/视频 | VERIFIED | `public-surface-2026-10-11T08-42-03-307Z/results.json`，1280×900/390×844，视频实际前进、275.533秒、无错误 |
| 官网链接 | VERIFIED / BLOCKED | 16个HTTP200；1个文档429限流，不认定死链接；仓库内目标存在 |
| npm公开registry | FAILED（未找到包） | `@dorianchn/agent-canary` npmjs E404；项目实际配置为 GitHub Packages，不宣称 npm2.0可安装 |
| GitHub Packages版本 | BLOCKED | 当前令牌缺少 read:packages，API403；没有读取Token或改变授权 |
| Docker本机 | BLOCKED | CLI未安装；不发布镜像；main CI已执行build/help smoke |
| baseline CI | VERIFIED | https://github.com/DorianChn/shanchuanzhi-agent-canary/actions/runs/38123516544 ，9 jobs；新分支以PR精确HEAD检查为准 |
| 增强代码CI | VERIFIED | {CI['url']} ，精确HEAD `{CI['headSha']}`，9/9通过；包括Windows20/22、Linux20/22、macOS20/22、Docker、Sponsor与pack |
| 已发布资料冻结 | VERIFIED | PDF/视频/ZIP核心 a0e8c2f，材料0255c15；main73仅增发布元数据，不谎称重录 |
| 新候选免费ZIP | VERIFIED | `Agent_Canary_Competition_2_0_Readiness.zip`，{C['entries']}项，SHA `{C['sha256']}`；未稳定发布 |

下载首次超时、脚本未带 CSRF、复用临时路径 EEXIST 等失败证据保留；后两项是验收脚本错误，修正后全流程通过，没有降低产品安全检查。最终七附件都是实际下载字节，非仅凭元数据。

## 核心功能验收

| 能力 | 状态 | 实际证据与范围 |
|---|---|---|
| Token生成/植入/精确扫描/并发 | VERIFIED | test/tokens.test.ts；临时文件、跨进程写入，隐藏文件与边界回归 |
| MCP诱饵 | VERIFIED | 下载ZIP启动实际stdio，12工具；诱饵无真实副作用 |
| 隔离/后续callback拒绝/共享主体 | VERIFIED | containment/sdk/security-simulation 测试；下载ZIP callback计数未增加 |
| 状态重启持久化 | VERIFIED | 新增可选 file-state-store 16测试，包括真实子进程重启与四进程48条写入、Windows共享冲突；默认Map仍非持久化 |
| 首次危险参数检查 | VERIFIED（注册范围） | SecurityRouter文件/Shell/网络/凭据/外传规则，明确定义拒绝/审批 |
| 策略模式/审批过期/重放 | VERIFIED | risk-policy/security-router；模型approved字段无授权效果，控制台伪造operator403 |
| AI事前调用时序 | VERIFIED | review先于callback，隔离发生于等待期仍拒绝；benign不能授权，超时保守待批 |
| 敏感数据来源关联 | VERIFIED（轻量） | SessionDataFlow HMAC/TTL/256容量，同Guard传播；非完整动态污点分析 |
| Webhook/Provider安全边界 | VERIFIED（实现范围） | DNS固定、私网/重定向、响应上限、密钥脱敏/结构校验；任意第三方executor不自动继承 |
| 中文控制台 | VERIFIED | 从下载ZIP启动；审批、报告数据、MCP probe、隔离拒绝实际后端 |
| 真实云端API | NOT VERIFIED | OpenAI/Claude/Gemini/DeepSeek/通义/兼容协议仅mock测试；没有凭据/费用授权 |
| Ollama/Qwen | VERIFIED | 168真实请求驱动trial和10次前置审查；连接报告 |
| LM Studio/vLLM | IMPLEMENTED_NOT_VERIFIED | OpenAI兼容适配；服务未运行，未虚构连通 |

Claude Code、Cursor、Cline、Codex、自定义MCP：临时配置安装/12诱饵握手/卸载恢复 VERIFIED；真实桌面应用激活 NOT VERIFIED，原生工具覆盖 OUT_OF_SCOPE。自定义注册宿主的3项虚拟callback端到端 Guard VERIFIED，不等于保护全部客户端工具。

## 环境与测试

Windows11普通用户、中文含空格路径、Node22.23.1：npm ci/build/test/pack:check/verify/audit和Sponsor临时数据ci/test/smoke/audit全通过。根225项：221通过、0失败、4跳过；Sponsor25项：24通过、0失败、1跳过；合计250项，245通过、0失败、5跳过；重复verify不重复计数。

根和Sponsor npm audit均0已知漏洞。跳过为平台/权限差异，见逐项TAP日志。非全新OS、没有本机Node20独立安装、未改变防火墙/真实桌面配置。Linux/macOS/Windows Node20/22验证以实际GitHub六job为证据，不把矩阵配置当结果。

完整本地最终日志目录：`{A['steps'][0]['log'].rsplit('/',1)[0]}`。新增Windows共享冲突首次失败与重验均留档；跨平台最终核心提交已实际通过9项。后续仅文档材料提交的CI结果见PR检查，不将其预先标记成功。

## 问题、修复与发布门槛

- P2能力缺口已补：进程内共享Map不能持久化。可选文件适配器有界读取、显式首次创建、缺失/损坏拒绝、独占锁、原子写入、状态不回退。默认兼容；不声称分布式事务、断电保证或管理员抗篡改。
- P2资料保护已补：复测以前会覆盖已冻结summary；新增独立输出名，历史统计保留。
- 新适配器P2 Windows共享冲突已补：首轮CI Windows20失败，错误日志保留；新增3回归先复现14通过/2失败，再修复后16/16通过。锁竞争明确BUSY，rename有界重试，永久拒绝仍fail-closed且不覆盖状态；不通过重跑掩盖问题。
- P1 OPEN：普通 npm/Docker商业V1/V2分发边界。免费竞赛包正清单隔离通过；不自动整改生产架构、不删除license验证、不迁移业务数据，也不把历史披露说成撤销。
- AI判定硬误拒绝2/8仍存在；默认关闭，允许明确选择，不通过弱化Guard“修复”该误判。
- CLI/SDK而非桌面安装器；保护注册范围，绕过Guard及已开始副作用不完整覆盖。

正式稳定版门槛 **BLOCKED_WITH_EVIDENCE**（商业分发P1尚未关闭）。维持预发布。GitHub Stable/npm/Docker与main合并均需新的明确授权且先关闭发布阻塞。

竞赛独立免费交付 **READY_FOR_COMPETITION_SUBMISSION**，限已有公开预览版及明示范围；新候选增强通过但仍处于Draft PR，是否选用它由最终冻结清单确定。官方最新附件限制、邮件标题强制格式、时区原文 NOT VERIFIED，不伪造条款。
''')
write(SUB/'FINAL_READINESS_CHECKLIST.md',f'''# 最终提交检查表（未发送）

## 可立即使用的公开参赛基线

- Release：{URL}/releases/tag/{TAG}；基线main `{BASE}`。
- 7附件已实际下载并校验，免费ZIP安装验收通过。
- 现有3份2.0中文PDF、1080p演示视频275.533秒和字幕对应冻结核心a0e8c2f/材料0255c15；没有被本轮替换。
- 真实视频链接：{URL.replace('github.com','raw.githubusercontent.com')}/0255c153da943c07fbb37d7bf2c10b140e81f1e6/competition-submission/Agent_Canary_2_0_Demo.mp4 。实际播放 VERIFIED。旧视频展示不变核心，未展示新增文件存储，不称重新录制。

## 本轮增强候选

- 实现Commit `{CODE}`（新可选文件状态适配器）；Draft PR：{PR['html_url']}。不合并main。
- 新免费包：`Agent_Canary_Competition_2_0_Readiness.zip`；版本清单包含curated免费源码来源、模型测试基线、原发布Tag；root npm 元数据1.2.7保留，不是 npm2.0发布。
- 新PDF：`Agent_Canary_2_0_Readiness_项目介绍.pdf`、`Agent_Canary_2_0_Readiness_技术创新.pdf`、`Agent_Canary_2_0_Readiness_真实模型实验.pdf`。新实验原始数据保留，AI无独立收益。
- 新候选、PDF与全部证据通过新分支公开；正式上传到已发布Release/改Latest/合并main尚未授权。若采用新候选，使用该PR精确提交链接及Readiness清单，不能混用旧附件哈希。

## 官方要求及未知项

官方来源 https://www.oschina.net/os2026/ 的检索索引核实：2026上海开源软件应用创新大赛、开源AI工具赛道、个人可自主选题、10月16日24:00前提交到oscc@oschina.cn，需可运行代码链接、介绍文档（推荐PDF）、演示视频链接。30/30/20/20权重。

实时页面浏览器只渲染了部分内容（795字）；最新规则变化/附件大小/强制标题/默认分支/视频时长上限未能核实。北京时间UTC+8为本地提交计划的解释，不是已核实原文时区。发信前核对审核邮件；不能把其他北京赛事的3–5分钟要求套用。

负责人唐林博豪、学校闽江大学，依据用户提供审核截图，保留身份。邮件仅草稿。需用户确认发送、选择冻结版本、核实未知附件限制；无已发送或获奖承诺。

## 稳定版单独门槛

BLOCKED_WITH_EVIDENCE：普通npm/Docker商业分发P1未关闭。没有稳定发布/npm/Docker授权、没有付费API或生产数据授权。不要把竞赛免费包可用当成普通产品稳定发布通过。
''')
write(SUB/'Agent_Canary_2_0_最终参赛邮件.md',f'''# 正式参赛邮件草稿 · DRAFT_ONLY

收件人：oscc@oschina.cn

主题：2026 上海开源软件应用创新大赛｜开源 AI 工具赛道｜Agent Canary

尊敬的大赛组委会：

您好！我是项目负责人唐林博豪，来自闽江大学。Agent Canary 已通过报名审核，参加开源 AI 工具赛道（自主选题）。现提交作品材料：

1. 代码仓库：{URL}
2. 可下载的公开竞赛预览：{URL}/releases/tag/{TAG}
3. 演示视频：{URL.replace('github.com','raw.githubusercontent.com')}/0255c153da943c07fbb37d7bf2c10b140e81f1e6/competition-submission/Agent_Canary_2_0_Demo.mp4
4. 附件：与上述预览冻结版本对应的项目介绍、技术创新与真实模型实验PDF。新增可选持久化及最终复验材料在审查PR {PR['html_url']}，作为补充证据，不冒充已合并稳定版。

Agent Canary 通过MCP诱饵与Canary Token提供确定性信号，以Guard和可选宿主参数策略控制受保护工具调用。本地/云端AI用于辅助解释或收紧模糊风险，不拥有授权或解除隔离权限。材料包含真实本地模型自主工具选择及虚拟危险执行器实验，公开正常任务中断、误拒绝与保护边界，不宣称全局防火墙。

安装、中文控制台与复现实验步骤均见资料。请查收，谢谢！

唐林博豪
闽江大学

---

未发送。发信前用户须确认最终附件/冻结版本及官方未知限制；如采用增强候选应改为新分支的精确SHA，不混用预览1资料。邮件主题是建议格式，未核实为官方强制格式。
''')
write(SUB/'STABLE_RELEASE_DRAFT.md',f'''# 稳定版发布准备草稿 · NOT PUBLISHED

当前公开版本 `{TAG}`，不得仅为Latest显示2.0而改为稳定。

阻塞：普通npm/Docker V1/V2分发P1未关闭；GitHub Packages实际版本因read:packages缺失无法确认；真实桌面工具范围须逐项披露。独立免费竞赛ZIP无需商业迁移即可体验。

拟定稳定Tag为v2.0.0，**尚未创建**。通过全部门槛后由维护者确认最终SHA与商业分发兼容方案，再单独授权GitHub稳定发布/npm/Docker；当前不执行。

拟Release Notes：确定性Canary/Guard、宿主参数策略、可选事前AI、轻量HMAC来源提示、中文控制台、免费SDK/MCP、可选文件隔离状态。AI默认关闭；正常任务可能需审批；真实模型只有本地Qwen已验证。云端仅协议测试，原生客户端工具不全局保护。测试证据见发布验收与PR，不用历史CI冒充未来Tag证据。
''')
print(json.dumps({'reports':['RELEASE_READINESS_AUDIT.md','REAL_MODEL_FINAL_EVALUATION.md'],'pr':PR['html_url'],'code':CODE,'tests':A['uniqueTests']},ensure_ascii=False))
