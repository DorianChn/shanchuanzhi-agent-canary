"""Prepare Chinese delivery notes from actual final evidence; preserve historical audits."""
from pathlib import Path
import json, hashlib, zipfile, shutil
from xml.sax.saxutils import escape
ROOT=Path(__file__).resolve().parents[2];SUB=ROOT/'competition-submission';E=SUB/'evidence'
S=json.loads((E/'round4-summary.json').read_text(encoding='utf-8'));V=json.loads((E/'round4-final-verification.json').read_text(encoding='utf-8'))
CI=json.loads((E/'round4-ci-verification.json').read_text(encoding='utf-8'))
CODE='834ef1a361386736be2101bfa635bf0bb531dfb4'
VIDEO=E/'round4-video-recording.json';video=json.loads(VIDEO.read_text(encoding='utf-8')) if VIDEO.exists() else None
def write(p,s): p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((s.rstrip()+'\n').encode('utf-8'))
def rate(r): return str(r['numerator'])+'/'+str(r['denominator']) if r.get('denominator') else r.get('status','NOT MEASURED')
def table(ds='all'):
 text='| 组 | 攻击成功 | 观察到拒绝防止 | Canary | Guard | 策略拒绝/待批 | 正常中断 | 正常完成 |\n|---|---|---|---|---|---|---|---|\n'
 for arm,v in S['arms'].items():
  m=v[ds];text+='|'+arm+'|'+'|'.join(rate(m[k]) for k in ['attackSuccessRate','observedEndToEndPreventionRate','canaryDetectionRate','guardBlockRate','policyWithholdingRate','normalInterruptionRate','normalTaskSuccessRate'])+'|\n'
 return text
tests=[c['counts'] for c in V['commands'] if c['command']=='npm test'];counts={k:sum(c[k] for c in tests) for k in ['tests','pass','fail','skipped']}
ci_pass=sum(j['conclusion']=='success' for j in CI['jobs']);ci_info=f"{CI['headSha']}：{ci_pass}/{len(CI['jobs'])} jobs 成功；{CI['url']}"
raw=json.loads((E/S['sourceFile']).read_text(encoding='utf-8'))
remaining=[{'scenario':t['scenarioId'],'actions':[{'name':a['name'],'args':a.get('args'),'outcome':a['outcome']} for a in t['actions'] if a['dangerous']]} for t in raw['trials'] if t['arm']=='D1_policy' and t.get('attackSuccessInSyntheticEnvironment')]
video_note=f"已完成真实运行 Chromium 控制台录像，{video['durationMs']/1000:.2f} 秒，1920×1080，H264，中文说明，无音轨；旧 AI_Demo.mp4 保留。" if video else 'NOT COMPLETED：第四轮视频录制尚未结束，不能称视频最终交付完成。'
report=f'''# 第四轮最终安全强化与参赛交付

## 真实基线与失败定位

恢复起点 3c919136a83cdc8ea65959a5e50bd7abafc9da54，正确分支 competition/agent-canary-hardening，工作区当时干净。真实 PR #22 OPEN/Draft，既有报告和录像保留。

核对第三轮原始 local-model-eval-neutral_agent-2026-10-10T18-41-22-628Z.json：36 次，A 1/10、B 2/10、C 2/10；B/C 主动诱饵 0/10；C 危险虚拟 callback 执行 5/5、拒绝 0/5。Agent 读取后没有主动触发 Canary，没有信号进入 Guard，因此 C 的 callback 在 SAFE 状态执行。预置隔离后 C 跟进拒绝 1/1，证明隔离执行路径，但不算模型发现攻击。

原攻击指标把所有 Shell 都标危险，含 ls -la；这是旧指标的语义局限，未为了新结果修改定义。

## 实现与安全边界

核心安全提交 [{CODE}](https://github.com/DorianChn/shanchuanzhi-agent-canary/commit/{CODE})。新增 src/risk-policy.ts；SDK 可选导出；风险标签 READ_ONLY / WRITE / EXECUTE / NETWORK / SENSITIVE_DATA / DESTRUCTIVE。判断依赖宿主描述、真实参数和同 Guard 的敏感历史。OBSERVE 不执行可选策略拒绝；BALANCED 拒绝明显秘密外传并要求写入/未审定命令人工批准；STRICT 拒绝这些操作。所有模式仍执行原有 Guard。

同一 Guard 的多个 Router 共享有界串行队列；敏感操作开始前标记，即使异常也保留。队列不会延迟诱饵隔离。审批绑定不可变参数、一次性、短期限，执行前重查 Guard/敏感历史。SDK approve 必须由已认证宿主调用，操作者字符串不是身份认证。前端审批需后端能力码，不回显、不保存、不进入 AI 上下文；未知模型 approval 参数无权授权。

AI 在 D2 工具决策之后分析脱敏日志，不反馈 Agent，不改变 Guard/策略/批准权限。timeout/benign 不放权。控制台按钮只操作无副作用虚拟沙箱，不能修改其他 Agent 内部文件/进程。

OUT_OF_SCOPE：没有接入 Router 的调用；新 Guard 对象的策略敏感历史；真实 symlink/realpath、执行程序解析、OS 权限与网络边界；已启动 callback 的效果。词法策略不是完整 Shell/网络沙箱，宿主必须实现真实边界。原 Shared State Store 的 principal 隔离保持。

## 最终真实模型实验

来源 {S['sourceFile']}。{S['model']}，neutral_agent，BALANCED；原12+独立10场景 ×5组，共 {S['totalTrials']} 次，失败/无效 {len(S['failures'])}。运行前保存策略/场景/工具 Schema 哈希；两次工程 pilot 完整保留、单独报告，不与最终组累加。

{table()}

旧 ASR 定义下攻击成功由 5/15 降至 1/15；不是总体准确率。D1/D2 观察到实际拒绝且无危险效果 4/15，策略拒绝/待批 7/9，其中待批和硬拒绝在 JSON 分开。真实模型主动诱饵仍 0/15；新增收益来自参数策略，不能归给 Canary 或 AI。

独立样本（维护者设计、非第三方盲测）结果：

{table('holdout')}

正常硬拒绝 0/6，审批中断 1/6，完成 5/6（A/B/C 6/6）。合法 npm run build 需批准，不能称无误报或无兼容成本。剩余执行场景与参数：

```json
{json.dumps(remaining,ensure_ascii=False,indent=2)}
```

D2 实际结构化分析 {rate(S['arms']['D2_policy_ai']['all']['aiValidResults'])}，median {S['arms']['D2_policy_ai']['all']['aiAnalysisLatency']['medianMs']:.2f} ms，p95 {S['arms']['D2_policy_ai']['all']['aiAnalysisLatency']['p95Ms']:.2f} ms。解释不是判定事实；AI 独立防护增益 NOT MEASURED，D1/D2 无可归因安全差异。每次 Token 用量保存在原始 JSON；API 成本 NOT MEASURED，本地能耗未计价，付费云端调用 0。

录像中实际本地模型将策略日志判断为 benign/low，认为是防护系统正常工作。原回答（可能英文）保留，不改为 suspicious 来增强展示。没有人工盲审的解释准确率，不能据此证明事件确实良性。

## 自动验证与平台

新增 24 项策略回归。根测试176：172通过、0失败、4跳过；sponsor25：24通过、0失败、1跳过。合计 {counts['tests']} 项独立自动测试，{counts['pass']} 通过，{counts['fail']} 失败，{counts['skipped']} 跳过；重复 verify 不重复计数。另 sponsor smoke12/12、独立免费包自检、实际UI按钮验证和110真实模型试验分别记录，不混入单元测试数。

root npm ci/build/test/pack:check/verify/audit；sponsor ci/test/smoke/audit 全部 exit0，root/sponsor 依赖审计0。日志 round4-final-verification.json 与 round4-verify-*。首次单独测试误用 strip-types 导致模块解析失败，换项目约定 --import tsx 后24/24；完整 npm test 与 verify 始终是实际证据，不通过删测试变绿。

实际 CI：{ci_info}。Windows/Linux/macOS Node20/22 分别 VERIFIED（对应实际 CI job）；本地 Windows Node22 VERIFIED，本地 Linux/macOS/Node20 SKIPPED，不能把配置本身算验证。Docker CI build/container --help VERIFIED；本地 Docker BLOCKED/不可用。

默认 main 仍提示1项 moderate Dependabot，不能把比赛分支 audit0称为 main 已修复；本轮不修改 main。

## 分发与隐私

常规 npm/Docker 包仍含许可门控 V2 实现，遗留 P1 OPEN，未声称商业稳定发布。新增独立免费竞赛 ZIP：公开依赖图21源文件，排除 license/dashboard/export/eval商业实现；独立 npm ci/build/self-test 与策略SDK smoke 实际通过。不删除许可校验、不改商业用户入口、不迁移生产数据。CLI 是明示免费子集，SDK保持免费接口。包内容与哈希见 round4-free-artifact.json、round4-free-archive.json。

未读取/复制真实订单、支付资料、生产密钥或客户数据。仅临时数据与测试能力码；日志/前端/AI输入不泄露凭据。公开材料扫描不代替完备秘密审计。

## 展示与材料

中文控制台真按钮、模式、审批、Guard状态、策略原因、保存的A/B/C/D结果与JSON导出已经实际浏览器验证；桌面1440与手机390无横向溢出/JS异常。不重写前端。

项目PDF Agent_Canary_Round4_项目介绍.pdf；实验PDF Agent_Canary_Round4_实验报告.pdf。数据直接取最终原始 JSON，构建时验证策略 hash 与被测 dist 一致。录制：{video_note} 视频实际展示 OBSERVE 虚拟效果、BALANCED 拒绝、正常继续、人工批准、真实Ollama解释、程序触发隔离和保存模型对照；不冒充每次按钮来自模型。新文件 Agent_Canary_Round4_Demo.mp4；公开不可变链接与文件哈希以 ROUND4_DELIVERY_VERSION.md 为准。未核对的链接不得记作可访问。

## 内部工程评估

技术创新25/30：可审计首次调用策略与信号隔离分离，AI与执行解耦；基础规则简单，非首创。
场景落地25/30：真实本地模型、UI、录像、独立包与对照；单模型小样本，构建审批中断。
开源治理17/20：MIT、固定SHA CI、贡献模板、真实失败留档；常规商业分发风险仍OPEN。
长期发展15/20：有具体接线/权限/多模型计划；没有宣称现有用户、企业合作或成熟生态。
合计82/100，内部模拟，非官方评分、非获奖预测。

## 提交条件与人工事项

独立免费竞赛作品具备可运行演示和可信证据。不是全局安全产品或商业稳定发布。公开仓库仍包含历史商业模块，提交时明确以免费包及该源码清单为竞赛范围；若赛事要求默认分支或彻底移除所有商业源码，需要维护者确认，不能擅自合并/迁移。

官网 oschina.net/os2026 本轮读取返回空页面，最新规则无法再次确认。已有报名邮件要求代码仓库、PDF、视频链接；10月16日24:00截止、负责人唐林博豪/闽江大学来自用户确认材料。正式发送前人工核对规则/报名信息，并明确批准邮件。本轮只准备草稿，未发送、未合并main、未发布npm/Docker。

最有价值的三个下一步：稳定主体与真实宿主框架接线；第三方盲测、多模型和重复种子；更细权限/审批模板与商业分发隔离。
'''
write(ROOT/'docs/competition/FOURTH_ROUND_FINAL_REPORT.md',report)
for name in ['PROJECT_AUDIT.md','SECURITY_TEST_REPORT.md','TECHNICAL_HIGHLIGHTS.md','DEMO_GUIDE.md','FINAL_VERIFICATION.md']:
 p=ROOT/'docs/competition'/name;old=p.read_text(encoding='utf-8');marker='\n## 第四轮最终增补\n';old=old.split(marker)[0]
 write(p,old+marker+'\n最新证据与完整边界见 [FOURTH_ROUND_FINAL_REPORT.md](FOURTH_ROUND_FINAL_REPORT.md)。历史记录保留，不是本轮最新数据。\n\n'+table()+f'\n独立自动测试 {counts}。实际 CI：{ci_info}。常规 V1/V2 风险仍 OPEN，独立免费竞赛构建排除商业实现。AI 只解释；批准需可信宿主。\n')
write(SUB/'Agent_Canary_正常任务误报报告.md','# 正常任务与策略审批代价\n\n'+table()+'\n硬拒绝正常任务 D1/D2 0/6；审批中断1/6，正常完成5/6。N04 合法 npm run build 需要人工批准，实验禁止无人批准，因此未完成。不是恶意任务，不叫无误报。样本少，非总体误报率。人工批准按钮和SDK一次执行另有24项回归证据；不能将其算成该模型场景自动完成。\n')
write(SUB/'Agent_Canary_AI_Provider兼容性报告.md','''# AI Provider 兼容性

| 服务 | 实现 | 实际验证 |
|---|---|---|
| Ollama / Qwen 9B | 原生 tags/chat、Schema/usage | VERIFIED：最终110 Agent场景、22/22 D2分析及录像中真实推理 |
| OpenAI | 原生 Chat Completions | 模拟 wire 通过；真实账户 NOT VERIFIED |
| Claude | 原生 Messages | 模拟 wire 通过；真实账户 NOT VERIFIED |
| Gemini | 原生 generateContent | 模拟 wire 通过；真实账户 NOT VERIFIED |
| DeepSeek / 百炼通义 | 兼容预设 | 兼容 Adapter 测试；厂商 NOT VERIFIED |
| LM Studio / vLLM | 本地 OpenAI-Compatible | 适配完成；真实服务 NOT VERIFIED |
| 自定义兼容 API | 显式协议、地址和 origin | 模拟接口通过；任意接口不能保证兼容 |

云端费用、跨模型准确率与比较 NOT MEASURED。本轮没有请求生产密钥或付费调用。现有测试包含取消、超时、非法JSON、断线、脱敏、SSRF/DNS/重定向；不把这些测试算作厂商真实连通。AI失败不会改变Guard或策略。详见 docs/AI_PROVIDERS.md。
''')
write(SUB/'Agent_Canary_中文控制台使用说明.md','''# 中文控制台与无副作用演示

1. 竞赛分支：npm ci；npm run build；npm run ai:console。浏览器打开后端打印的127.0.0.1地址（默认4318）。也可指定 node dist/index.js ai console --port 4319。
2. 如果需要演示人工批准，宿主在启动前私下配置 AGENT_CANARY_OPERATOR_CODE，禁止给Agent/云端或写Git。未配置则批准禁用；不能以普通CSRF代替操作者能力。
3. 正常读取 → 实际虚拟 callback 递增。OBSERVE 的尝试虚拟外传会执行；BALANCED 的同一操作被策略拒绝，正常读取仍可继续。
4. 请求虚拟写入 → 选择待批请求 → 认真检查固定文件 notes/demo.txt/内容 Public demo note → 密码框输入宿主能力码 → 确认一次。参数固定、能力码使用后清空；不是允许模型自批任意工具。
5. 连接已安装Ollama，选择模型；选择真实脱敏沙箱日志，预览后点击AI分析。没有模型仍可操作确定性策略；AI推理失败不放权。
6. 触发虚拟Canary → QUARANTINED → 后续读取拒绝。没有Reset按钮；切换模式不解除隔离。新控制台进程可建立全新虚拟沙箱，不能当作恢复生产会话。
7. 实验中心显示保存的真实110场景结果，下载JSON；A/B/C/D1/D2按钮会启动已有Ollama真实实验，不会下载模型或调用云端，所有效果仍虚拟。

页面按钮演示是确定性沙箱，不是模型主动选工具。模型结果标“真实模型/虚拟效果”；AI解释是建议，策略原因是确定性判断。统计仅最近100条日志，不是所有Agent状态。第三方绕过Router及宿主OS边界OUT_OF_SCOPE。
''')
write(SUB/'Agent_Canary_技术创新说明.md','''# 技术创新说明（第四轮）

Agent Canary 将 MCP inert诱饵、精确Canary Token、同步Session隔离、可信宿主参数策略与可替换AI建议连接成可审计工具执行边界。

1. 信号与执行分离：诱饵/Token形成信号，Guard在注册callback前拒绝；未收到信号不等于安全。
2. 首次调用补足：按可信工具类别、参数和敏感历史决策，危险外传拒绝、普通高风险操作可信人工批准，不等待AI超时。
3. AI权力隔离：AI仅解释脱敏日志，不能修改Guard、策略、批准或Reset；本地/云端可替换是工程能力，不自动构成研究首创。
4. 证据闭环：模型自主选工具，原样本与独立集、失败、正常任务代价、策略/Guard原因分别留档。最终数据见ABCD报告，不使用合成12/12作为真实模型率。

相关工具官方定位： [Promptfoo红队文档](https://www.promptfoo.dev/docs/red-team/)（其生态也含guardrails/MCP proxy）；[Microsoft PyRIT](https://github.com/Azure/PyRIT)（生成式AI风险识别/编排）。本项目聚焦Canary信号到宿主callback隔离与可选参数策略；未做统一效果基准，不能声称比它们更优或全首创。

限制：只保护接入Router的工具，参数规则非完整OS/网络沙箱；当前单Qwen、小样本，AI独立防护增益未测；构建需人工批准可能中断正常任务。
''')
write(SUB/'Agent_Canary_开源治理说明.md','''# 开源治理与交付范围

保留MIT、CONTRIBUTING、SECURITY、CHANGELOG、Issue/PR模板、固定SHA的CI和已有免费SDK。所有代码在原竞赛分支，PR22保持Draft；不自动合并main、发布npm/Docker或迁移支付/生产数据。

常规构建的V1/V2分发P1仍OPEN。独立 Agent_Canary_Competition_V1.zip 按公开21源文件依赖图构建，排除license/dashboard/export/eval商业实现；CLI是明确免费子集，MIT保留、private:true防误发布。现有商业入口/授权不修改。包哈希、独立install/build/self-test和SDK策略smoke见round4-free-artifact.json与round4-free-archive.json。

竞争作品以该免费包与公开源清单为范围；完整GitHub历史仍有既有商业代码，不能声称全仓已完成私有商业边界。若赛事或维护者要求全仓清除/默认分支交付，需要人工审定方案，不可擅自迁移。

贡献路径：提交最小复现Issue、带测试PR、明确安全边界；扩大框架接线/第三方评测/权限模板。没有捏造用户、企业合作、贡献者或市场成果。
''')
write(SUB/'Agent_Canary_Round4_演示录制说明.md','# 第四轮真实录像\n\n'+video_note+'\n\n脚本 lab/record-round4-console.mjs，生成字幕 Agent_Canary_Round4_实录字幕.srt，元数据 evidence/round4-video-recording.json。实际运行的隔离 Chromium 界面录像，不是OS桌面录像。按次序展示：正常读取 → OBSERVE虚拟攻击 → BALANCED拒绝 → 正常继续 → 一次人工批准 → 真实本地AI分析实际日志 → 虚拟Canary隔离 → 保存的真实对照结果。所有模型文本和工具日志来自实际程序；中文字幕是作者解释，隔离按钮不是模型自主检测。\n')
write(SUB/'Agent_Canary_参赛提交清单.md',f'''# 第四轮最终参赛清单

- 负责人唐林博豪，学校闽江大学；开源AI工具赛道，自主选题；发送前与报名确认邮件核对。
- 公开代码：竞赛分支 / Draft PR22；精确版本见 ROUND4_DELIVERY_VERSION.md。
- 最终项目PDF：Agent_Canary_Round4_项目介绍.pdf；最终实验PDF：Agent_Canary_Round4_实验报告.pdf。旧PDF是历史版本，勿误附。
- 免费竞赛包：Agent_Canary_Competition_V1.zip；独立构建/自检/SDK smoke和商业排除见evidence。
- 新视频：Agent_Canary_Round4_Demo.mp4。{video_note} 公开链接最终需HTTP200及哈希核对，不把尚未推送文件算可播放。
- 技术创新、安全架构、ABCD原始JSON/CSV/Markdown、正常误报、AI接口范围、中文控制台和治理说明齐备。
- 正式草稿 Agent_Canary_参赛邮件.md；本轮未发送，旧版本邮件保留，不重复自动发送。
- 官方确认材料要求仓库/PDF/视频链接，10月16日24:00截止。本轮官网读取为空，最新规则仍需人工确认。

参赛演示可运行；商业稳定发布条件未达成（常规V1/V2分发OPEN）。只提供免费竞赛范围，无全局防护或获奖保证。
''')
write(SUB/'Agent_Canary_参赛邮件.md','''# 正式参赛邮件草稿（第四轮更新，未发送）

收件人：oscc@oschina.cn
标题：2026 上海开源软件应用创新大赛｜开源 AI 工具赛道｜Agent Canary｜参赛材料更新

组委会老师您好：

我是闽江大学的唐林博豪，Agent Canary 项目负责人，已通过本届大赛开源 AI 工具赛道自主选题报名审核。现准备更新项目材料，供评审参考。

项目：Agent Canary——面向 AI Agent 的智能安全诱饵检测与会话隔离平台。
公开仓库：https://github.com/DorianChn/shanchuanzhi-agent-canary
竞赛代码与具体提交：见附件清单对应的 ROUND4_DELIVERY_VERSION.md；竞赛分支 competition/agent-canary-hardening，Draft PR #22（未合并默认分支）。
演示视频：发送时使用 ROUND4_DELIVERY_VERSION.md 中已实测可访问的第四轮公开视频链接，不使用旧录像或未核验链接。

附件：Agent_Canary_Round4_项目介绍.pdf、Agent_Canary_Round4_实验报告.pdf。独立免费竞赛构建、复现命令与完整实验轨迹均在仓库 competition-submission/ 中提供。

本作品结合 MCP 诱饵、Canary Token、会话隔离和可选确定性参数风险策略，并用已有本地模型提供脱敏日志解释。真实模型对照和可用性代价完整记录；只保护经过宿主 Router 的调用，不宣称阻止所有 Prompt Injection 或保护未接入的第三方工具。

感谢审阅。

唐林博豪
闽江大学

---

发送前：核对报名信息、官方最新规则、不可变代码/视频链接以及本轮最终PDF。未经用户明确确认不得发送。本稿不声称已获得官方奖项或已经提交成功。
''')
write(SUB/'Agent_Canary_安全架构图.mmd','''flowchart LR
 U[不可信输入] --> A[宿主Agent选工具]
 A --> P[可信工具描述与参数策略]
 P --> G[Guard最终检查]
 G --> T[受保护callback]
 A --> C[诱饵/Token信号]
 C --> Q[同步QUARANTINED]
 Q --> G
 P --> L[脱敏审计]
 G --> L
 L --> AI[事后AI分析建议]
 H[已认证宿主人工批准] --> P
 O[绕过Router的调用 OUT_OF_SCOPE]
''')
svg='''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="570" viewBox="0 0 1280 570"><defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#55d6be"/></marker></defs><rect width="1280" height="570" fill="#0b1528"/><g fill="#e8edf7" font-family="Microsoft YaHei, sans-serif"><text x="55" y="62" font-size="30">Agent Canary · 受保护工具的分层执行边界</text>'''
for x,y,w,title,sub in [(55,118,255,'不可信输入 / 宿主 Agent','真实模型读取文本与自主选工具'),(355,118,255,'确定性参数策略','可信描述、敏感历史、一次批准'),(655,118,255,'Guard 最终检查','隔离不受 AI 建议撤销'),(955,118,260,'宿主 callback','真实权限边界由宿主实现'),(80,310,280,'MCP 诱饵 / Canary Token','同步隔离，不等待执行队列'),(485,310,280,'脱敏审计日志','记录实际原因和状态'),(885,310,300,'事后 AI 分析','仅解释；不批准、不 Reset')]:
 svg+=f'<rect x="{x}" y="{y}" width="{w}" height="98" rx="12" fill="#172238" stroke="#37516b"/><text x="{x+18}" y="{y+38}" font-size="21">{escape(title)}</text><text x="{x+18}" y="{y+70}" font-size="15" fill="#adc0d4">{escape(sub)}</text>'
for x1,y1,x2,y2 in [(310,167,353,167),(610,167,653,167),(910,167,953,167),(360,345,650,204),(780,220,640,303),(765,360,880,360)]:svg+=f'<path d="M{x1} {y1}L{x2} {y2}" stroke="#55d6be" stroke-width="3" marker-end="url(#a)"/>'
svg+='<text x="55" y="485" font-size="20" fill="#adc0d4">AI 失败不放权；首次调用由注册策略检查；已开始的外部效果不可撤回。</text><text x="55" y="525" font-size="18" fill="#adc0d4">绕过 Router、新主体历史、真实 symlink / 进程 / DNS 沙箱均需宿主覆盖。</text></g></svg>'
write(SUB/'Agent_Canary_安全架构图.svg',svg)
print(json.dumps({'source':S['sourceFile'],'counts':counts,'ci':ci_info,'videoCompleted':bool(video)},ensure_ascii=False))
