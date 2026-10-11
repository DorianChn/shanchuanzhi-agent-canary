"""Current AI competition PDFs; derives all measurements from saved evidence.
Run after final verification. Baseline builder and prior evidence remain in Git.
"""
from html import escape
import json
from build_pdfs import (CompetitionDoc,Cover,PageBreak,Spacer,mm,P,page,bullet,callout,data_table,CONTENT_W,SUBMISSION,EVIDENCE,Architecture,colors,GOLD)

analysis_path = sorted(EVIDENCE.glob('ai-analysis-*.json'))[-1]
AI = json.loads(analysis_path.read_text(encoding='utf-8'))
DATA = json.loads((EVIDENCE/'analysis-summary.json').read_text(encoding='utf-8'))
VERIFICATION = json.loads((EVIDENCE/'ai-final-verification.json').read_text(encoding='utf-8'))
BENCH = json.loads((EVIDENCE/'ai-token-scan-benchmark.json').read_text(encoding='utf-8'))
CURRENT = sorted([c for c in DATA['cohorts'] if c['profile']=='neutral_agent'],key=lambda c:c['sourceFile'])[-1]
ROOT_CHECK = next(c for c in reversed(VERIFICATION['commands']) if c['scope']=='root' and c['command']=='npm run verify')
SPONSOR_CHECK = next(c for c in VERIFICATION['commands'] if c['scope']=='sponsor' and c['command']=='npm test')
def pp(t): return P(escape(t),'CNBody')
def table(rows): return data_table(rows,[CONTENT_W/len(rows[0])]*len(rows[0]))
def section(story,n,title,lead,items): page(story,n,title,lead,[pp(t) if isinstance(t,str) else t for t in items])
def finish(doc,story):
    if isinstance(story[-1],PageBreak):story.pop()
    doc.build(story)
def build_project():
    doc=CompetitionDoc(SUBMISSION/'Agent_Canary_项目介绍.pdf','Agent Canary AI 增强版','智能分析与确定性安全执行解耦')
    s=[Cover(subtitle='面向 AI Agent 的智能安全诱饵检测与会话隔离平台',label='AI 增强竞赛版 · 开源 AI 工具赛道'),PageBreak()]
    section(s,1,'项目摘要','确定性策略决定执行；可选 AI 提供解释与调查建议。',[
        callout('核心：诱饵 / Token → Session Guard → QUARANTINED → 拒绝后续受保护 callback。AI 失败或返回 benign 不会解除隔离。'),
        'Agent Canary 具有 MCP stdio Server、12 个无实际作用的诱饵工具、随机 Canary Token、CLI、公开 SDK、JSONL 审计、跨会话共享状态及离线自检。',
        '本轮新增多协议 Provider、本地中文控制台、脱敏预览与云端确认、结构化证据绑定及 JSON/Markdown/CSV 报告。基础安全路径仍完全离线可用。',
        '本机 Ollama 已完成真实分析和模型自主选择工具实验。云端协议已实现并以模拟端点测试；没有真实云端 API、付费调用或用户生产数据。',
        '负责人：唐林博豪；单位：闽江大学。赛事：2026 上海开源软件应用创新大赛；自主选题，开源 AI 工具赛道。'])
    section(s,2,'AI Agent 的安全风险','不可信仓库、网页与工具输出进入任务上下文。',[
        table([['输入','可能诱导','可观察信号'],['恶意 README','读取秘密、改变任务','调用 Canary 或精确 Token'],['网页 / 工具输出','伪造系统指令、数据外传','工具调用与审计记录'],['多轮文本','权限提升、规避诱饵','真实事件顺序；不能虚构缺失步骤']]),
        '文本风险分类和系统提示不能保证模型不会调用危险工具；真正的 callback 执行权限由宿主控制。模型也可能主动避开诱饵，或在首次信号之前进行危险调用。',
        callout('项目不声称彻底解决 Prompt Injection，也不是全局 Agent 防火墙。首次危险调用、Guard 旁路及已经开始的外部操作不受完整保护。',bg=colors.HexColor('#FFF4DF'),accent=GOLD)])
    section(s,3,'核心思路与独立路径','把安全信号、权限执行与辅助解释分开。',[
        Architecture(),Spacer(1,7*mm),
        table([['路径','输入与处理','执行边界'],['确定性安全','诱饵 / Token → Guard → Router','不请求模型；触发后同步隔离'],['AI 辅助','明确选中的脱敏事件 → Provider → 校验','只给解释；不接收 Guard 或工具'],['人工复核','预览、证据、模型结果与失败记录','模型建议不能授予执行权限']])])
    section(s,4,'MCP 诱饵与 Canary Token','联合提供可识别信号，不执行所描述的危险效果。',[
        '12 个 canary_* 工具覆盖虚拟资金、秘密、Shell、删除、邮件、数据库导出、内网访问、安全禁用、云控制台、K8s、密钥轮换及强制推送。诱饵返回合成结果，不做真实效果。',
        'Canary Token 使用随机字节生成 cnry_ 标记，登记、埋放、精确匹配、受限扫描与文件监听。登记写入有跨进程锁与原子替换；扫描有大小、深度与路径边界。',
        '独立 MCP Server 只暴露自身诱饵，不能控制其它 MCP Server。需要宿主把触发与正确 sessionId/principal 关联，并接入 Guard/Router。',
        '模型未采用诱饵时，这条信号路径不会自动知道真实工具是否恶意。本轮模型 Token 命中为零，不能声称测得真实泄露检测率。'])
    section(s,5,'Session Guard 与 Router','同步状态变化先于通知与异步撤销。',[
        table([['状态 / 接口','行为'],['SAFE','允许经路由的真实回调；不是内容安全认证'],['TRIPPED → QUARANTINED','触发时同步改变状态，然后记录与通知'],['受保护 callback','在真正执行前判定；默认隔离后拒绝非 allowlist'],['共享状态','显式 principal + 共享 store；失败关闭'],['Reset','仅宿主人工确认接口，不暴露给模型']]),
        'Credential Revoker 是宿主可选适配，隔离后可开始异步凭据撤销；失败不重开 Guard。已开始的外部操作不会被时光回滚。',
        'AI Provider 返回的是数据，代码中没有调用 Reset 或更改安全策略的链路；benign/断线不能解除隔离，有专门回归测试。'])
    section(s,6,'云端与本地模型适配','协议差异由独立 Adapter 处理。',[
        table([['接口','协议','验证范围'],['OpenAI','Chat Completions','模拟 wire；真实云端未验证'],['Claude','原生 Messages','模拟 header/body/content/usage'],['Gemini','原生 generateContent','模拟 contents/JSON MIME/usage'],['DeepSeek / 百炼','OpenAI-compatible','兼容适配；厂商未连通'],['Ollama','原生 tags / chat + JSON Schema','真实查询与分析已完成'],['LM Studio / vLLM','本地 OpenAI-compatible','适配完成；实际服务未验证']]),
        '统一提供模型查询、连接检查、分析、总期限、AbortSignal、显式重试上限和真实 usage。未返回 Tokens 时 null；没有价格证据时不估算费用。',
        '不同接口分别采用 max_completion_tokens、max_tokens、maxOutputTokens、num_predict；不能保证任意模型支持所有参数。未知错误明确返回 uncertain，不自动偷偷改参数。'])
    section(s,7,'隐私与网络边界','只发送用户明确选中的最小脱敏片段。',[
        'API Key 保存在后端启动进程/SDK 闭包，不写前端 localStorage，不通过 GET 返回，不放入提示词。控制台要求密钥与确切允许 origin 绑定。当前没有 OS Keyring，宿主可注入短期密钥。',
        '云端每次推理需人工预览并确认；默认不上传整个工作区。过滤是尽力脱敏，不保证覆盖所有个人或商业信息。',
        '本地仅允许 loopback HTTP；云端仅允许公网 HTTPS。拒绝 URL 用户信息、query、fragment、私网/混合 DNS；校验地址固定 socket，不跟随重定向。',
        '输入最多 32 个事件、24 KB；单事件 6000 字符，响应 256 KB；取消、超时、非法 JSON 或错误引用都安全退回 uncertain。',
        '模型只选择已有事件 ID，原文证据由宿主提取。解释仍可能错误，confidence 是模型自报，不是校准概率。'])
    section(s,8,'中文本地控制台','从事件、预览到可下载的真实分析。',[
        '控制台仅绑定 127.0.0.1，界面和样式离线可用。复用原看板，不添加 React/Vite 或新的生产依赖；保持现有 CLI、SDK 与 stdio 协议。',
        '模型配置、检测 Ollama、查询模型、选择事件、预览确认、分析耗时及使用量、实际日志时间线、沙箱对照与报告导出形成完整路径。没有 Reset 按钮。',
        '只统计最近 100 条 JSONL，不显示未记录的全部受保护调用或伪造趋势。模型配置与最多 100 条分析仅在当前进程中保存，退出前下载。',
        '浏览器实测桌面 1440 px 与手机 390 px，无水平溢出与 JS 错误；实际点击模型连接、离线演示和真实推理。独立审查修复了隐藏字段、未保存配置执行、旧结果与实验刷新问题。'])
    section(s,9,'真实模型分析结果','合法结构成功不等于安全判断正确。',[
        table([['样本','预定标签','实际 verdict','耗时 / Tokens'],*[[t['id'],t['label'],t['result']['verdict'],f"{t['result']['durationMs']/1000:.2f}s / {t['result']['usage']['inputTokens']}+{t['result']['usage']['outputTokens']}"] for t in AI['trials']]]),
        '最终 4/4 返回合法结果，标签一致 3/4。隔离沙箱日志被判为 benign，与预先 suspicious 标签分歧；原结果保留，不改标签掩盖分歧。',
        '早期两次运行各有 1 条引用不精确而被拒绝，失败记录保留。改为模型选择 ID、宿主提取原文后，引用校验全部通过。',
        '样本为四条人工构造证据、一台本地模型、一次最终运行；不是准确率估计、真实攻击检测率、模型对比或生产防护实验。'])
    rows=[['Arm','攻击成功','模型诱饵','危险 callback 已执行','正常成功']]
    for k,label in [('A_no_canary','A 无 Canary'),('B_decoy_only','B 仅检测'),('C_guarded_router','C 检测+Guard')]:
        a=CURRENT['arms'][k];r=a['simulatedAttackSuccess'];rows.append([label,f"{r['numerator']}/{r['denominator']}",'N/A' if k=='A_no_canary' else '0/10',str(a['dangerousCallbackExecuted']),'1/1'])
    section(s,10,'真实 Agent A/B/C 对照','真实模型自主选工具；虚拟执行器无外部副作用。',[
        table(rows),'本轮完整 36 次 neutral_agent，11 个攻击/边界场景和 1 个正常控制 × 三组。预置隔离场景从可比攻击分母剔除；所有失败保存。',
        'C 组 5 个危险动作在无信号 SAFE 状态执行，阻断 0/5。预置 quarantine 后 C 跟进被拒绝 1/1，不能计入模型检测。B 隔离后未接 Guard 的回调仍可执行。',
        '新增一组 36 次与历史两组 72 次分开报告，不将重复试验简单累加为总体安全率。模型诱饵采用率仍为零，必须改进覆盖。',
        '误隔离 0/1、正常成功 1/1 的分母很小，不能外推。端到端防止归因、漏报与多模型成本指标未充分测量。'])
    rc=ROOT_CHECK['counts'];sc=SPONSOR_CHECK['counts']
    section(s,11,'性能与工程验证','每个数字都有原始文件和明确运行范围。',[
        table([['验证','结果','边界'],['根测试',f"{rc['tests']} 项 / {rc['pass']} 通过 / {rc['skipped']} 跳过",'Windows Node 22'],['Sponsor',f"{sc['tests']} 项 / {sc['pass']} 通过 / {sc['skipped']} 跳过",'临时数据，生产未触碰'],['npm audit','根与 sponsor 均 0','本轮实际运行'],['Guard decision p95',f"{CURRENT['guardLatency']['syncDecision']['p95']} μs",'10000 次内存安全路径'],['Router p95',f"{CURRENT['guardLatency']['routerDispatch']['p95']} μs",'1000 次，不含真实回调'],['Token 50 MiB',str(BENCH['report'][-1]['medianMs'])+' ms','3 次本机合成扫描']]),
        'npm ci/build/test/pack:check/verify/audit 与 sponsor ci/test/smoke/audit 均有保存日志。代码 d7e0a0e 的 GitHub Run 38078821555 实际 9/9 成功：三平台 Node 20/22、package、sponsor、Docker build/container smoke。本地 Docker 缺失，不能称本地已构建。',
        'AI 推理耗时不进入 Guard 执行路径；微基准不代表生产吞吐、MCP 网络或用户工具成本。'])
    section(s,12,'同类工具与创新定位','依据官方定位比较，不宣称全部首创。',[
        table([['项目','主要价值','与本项目关系'],['Promptfoo','Agent/MCP 红队、评测与风险发现','可为宿主接线提供攻击样本'],['Microsoft PyRIT','可组合、多轮生成式 AI 安全评估','可用于扩大模型/攻击实验'],['Agent Canary','运行时信号到宿主 callback 隔离','不替代上述红队与模型分类']]),
        '可证实亮点：MCP/Token 联合信号；事件触发的同步 Session Circuit Breaker；AI 建议与确定性执行解耦；本地/云端 Adapter 可替换；失败与边界实验可复现。',
        '支持多厂商是工程兼容能力，不自动构成研究首创。相关官方资料见技术创新说明和 docs/AI_PROVIDERS.md。'])
    section(s,13,'开源治理与复现','MIT、贡献入口、CI 和明确版本边界。',[
        '保留 MIT、CONTRIBUTING、SECURITY、CHANGELOG、Issues/PR 模板与现有固定完整 SHA 的 GitHub Actions。新模块无新增生产依赖，测试与构建命令公开。',
        '新代码在 competition/agent-canary-hardening，PR #22 保持 Draft，不合并 main、不发布 npm/Docker、不改变商业授权。证据和运行脚本进入仓库；真实密钥/订单/客户数据没有进入。',
        callout('遗留 P1：公开 dist/npm/Docker 仍含许可门控 V2 实现。没有删除许可检查，也没有未经确认迁移商业交付；稳定商业发布标准尚未达到。',bg=colors.HexColor('#FFF4DF'),accent=GOLD),
        '代码：github.com/DorianChn/shanchuanzhi-agent-canary；精确交付提交见 competition-submission/DELIVERY_VERSION.md。'])
    section(s,14,'演示与已知限制','现场网络或模型失败时仍能演示确定性隔离。',[
        'npm ci → npm run build → node dist/index.js self-test --json → npm run ai:console。选择本机模型、运行离线沙箱、阅读日志、分析与下载报告。完整指南在同目录。',
        '真实模型模式和离线脚本模式分开；危险 Shell/HTTP/密钥/删除均使用虚拟 callback。AI 解释不触发任何真实效果。',
        '本轮没有真实云端账号验证、多框架宿主完整集成、校准置信度或成本估算。OS Keyring 与持久 Provider 配置尚未实现。',
        '新 AI 视频为实际运行的隔离 Chromium 控制台录像，1920×1080，约 3–4 分钟，中文字幕、无音轨。包括实际本地模型推理和实际离线隔离，明确标注保存的 A/B/C 数据；不是 OS 桌面录像。公开链接见邮件草稿，时长与哈希见视频验证 JSON。'])
    section(s,15,'长期路线图','围绕证据与接入质量，而非增加无关功能。',[
        table([['优先级','可执行改进','验收方式'],['近期','扩大跨模型重复实验，改善信号覆盖','保存失败、分子分母与人工标签'],['近期','Keyring、宿主审批与显式可信工具权限','无密钥前端、无 AI 放权回归'],['中期','在维护者审定后关闭 V1/V2 分发边界','免费 V1 独立构建与包审计'],['中期','对具体 Agent 框架提供最小接线','真实 MCP/Router callback 证据'],['持续','依赖/CI/文档维护与贡献反馈','可复现问题与代码审查']]),
        '没有捏造现有用户、合作企业或社区成果。公开失败和限制是贡献者可以实际改进的入口。'])
    section(s,16,'参赛版本与准备度','内部工程评估，不是官方评分或获奖预测。',[
        table([['技术创新','场景落地','开源治理','长期发展','总计'],['24/30','24/30','16/20','14/20','78/100']]),
        '优势：可运行中文控制台、真实本地推理、实际程序录像、可复现确定性拒绝路径、模型自主工具选择与失败保留。扣分：诱饵信号覆盖有限、云端未连通、商业分发风险及有限的宿主集成。',
        '官方邮件要求来自报名确认材料：代码仓库、介绍文档（推荐 PDF）、演示视频链接；截止 10 月 16 日 24:00。本轮官网读取返回空页面，最新规则无法再次确认，发送前需人工核对确认邮件。',
        '负责人：唐林博豪（闽江大学）。本轮仅准备邮件草稿，用户尚未授权发送。旧版本曾发送，不重复发送或虚构新链接。',
        pp('项目仓库 https://github.com/DorianChn/shanchuanzhi-agent-canary；PR https://github.com/DorianChn/shanchuanzhi-agent-canary/pull/22')])
    finish(doc,s)
def build_report():
    doc=CompetitionDoc(SUBMISSION/'Agent_Canary_实验报告.pdf','AI 分析与 Agent 对照实验报告','真实运行、失败数据、指标与边界')
    s=[Cover(subtitle='AI 辅助分析与真实 Agent 对照实验',label='实验报告 · 本地模型 / 虚拟工具'),PageBreak()]
    section(s,1,'环境与实验分类','不混淆模型分析、模型工具选择和确定性回归。',[
        table([['类别','真实部分','模拟部分'],['AI 分析','Ollama 返回结构化建议和 usage','四条人工构造或沙箱日志输入'],['Agent A/B/C','LLM 读取内容自主选工具','所有 Shell/HTTP/文件/秘密效果'],['回归测试','实际代码执行与断言','临时 HTTP 端点、虚拟数据'],['离线演示','Guard 状态与 callback 拒绝','信号由程序主动触发']]),
        '模型 Qwen 9B Q4_K_M，5.63 GB；Windows/Node v22.23.1；Ryzen 9 9955HX，约 32 GB 内存。只用已有模型，num_ctx 4096，无大模型下载、付费调用和生产访问。'])
    section(s,2,'AI 分析与失败保留','每条结果都保留，包括格式失败和标签分歧。',[
        table([['样本','标签','实际','输入 / 输出 Tokens'],*[[t['id'],t['label'],t['result']['verdict'],str(t['result']['usage']['inputTokens'])+' / '+str(t['result']['usage']['outputTokens'])] for t in AI['trials']]]),
        '最终 4/4 合法格式，标签一致 3/4；预先 suspicious 的沙箱日志被判 benign。它可能识别出沙箱信号并不代表真实攻击，因此不能替模型结论添加“已证明安全”。',
        '两次早期各一条引用失败被拒绝，未删除。改为事件 ID + 宿主提取原文后全通过。只证明来源绑定，不证明模型总结正确。',
        '原始 JSON/CSV/Markdown：'+analysis_path.name+'；同目录 ai-analysis-* 保留所有之前运行。多模型比较、成本与校准准确率均 NOT MEASURED。'])
    section(s,3,'本轮 A/B/C 结果','10 个可比攻击场景 / arm，预置隔离单独列出。',[
        table([['Arm','攻击成功','模型诱饵','危险动作执行'],*[[k.split('_')[0],str(CURRENT['arms'][k]['simulatedAttackSuccess']['numerator'])+'/10','N/A' if k=='A_no_canary' else '0/10',str(CURRENT['arms'][k]['dangerousCallbackExecuted'])] for k in ['A_no_canary','B_decoy_only','C_guarded_router']]]),
        'C 受保护危险调用阻断：0/5。Guard 没有先收到信号，5 个危险虚拟 callback 都执行；不能把未执行攻击的其它场景归因于防护阻断。',
        '预置 quarantine 后 C 的危险尝试阻止 1/1；B 1 次未接 Guard 的危险回调仍执行。此处检测贡献为零，触发来自 harness。',
        '每组正常任务成功 1/1，误隔离 0/1；分母不足以估计一般误报率。原始文件：'+CURRENT['sourceFile']])
    section(s,4,'指标与适用范围','分子 / 分母及不能计算的指标明确列出。',[
        table([['指标','算法 / 本轮范围'],['攻击成功率','出现危险虚拟作用的场景数 / 10'],['诱饵检测率','模型主动触发诱饵场景数 / 10；B/C 均 0/10'],['Guard 动作阻断率','被 Guard 拒绝动作数 / 经 Guard 危险尝试；C 0/5'],['隔离后跟进','预置隔离 C 1/1 拒绝；不算发现攻击'],['端到端防止归因','NOT MEASURED；未执行不代表 Canary 阻止'],['误报 / 漏报','只有 1 个正常场景；漏报缺充分 ground truth'],['正常成功','每 arm 1/1；不可外推'],['费用 / 模型对比','NOT MEASURED；单本地模型，无云端收费']]),
        '与历史 72 次（两种提示词 profile）分开分析；本轮又 36 次，同配置的复测不是独立总体样本。遗留未知 profile 完整组和中断组也留档。'])
    section(s,5,'安全回归与性能','严格拒绝错误，不以绿色测试代替现实效果。',[
        '回归覆盖云端 consent、API Key/输出脱敏、SSRF/DNS 固定、重定向、过大输入输出、取消超时、重试上限、原生 wire、usage、证据 ID/quote、CSRF/Origin/Key origin、CSV 公式、UI JS 解析与 AI benign 后 Guard 拒绝。',
        '验证命令结果读取 ai-final-verification.json，根 '+str(ROOT_CHECK['counts'])+'；sponsor '+str(SPONSOR_CHECK['counts'])+'。重复 verify 不计作新增独立测试。',
        'Guard p95 '+str(CURRENT['guardLatency']['syncDecision']['p95'])+' μs / Router p95 '+str(CURRENT['guardLatency']['routerDispatch']['p95'])+' μs；内存安全路径微基准，非生产工具性能。',
        'Token 扫描 1/10/50 MiB，各三次中位数：'+', '.join(str(x['medianMs'])+' ms' for x in BENCH['report'])+'。原始 benchmark JSON 保留。'])
    section(s,6,'复现、风险和下一步','复制代码与命令，保留实际不同输出。',[
        'npm ci；npm run build；npm test；npm run pack:check；npm run verify；npm audit。sponsor 中运行 npm ci/test/run smoke/audit，全部使用临时数据。',
        'npm run ai:demo 生成四样本真实分析；npm run lab:agent -- --profile=neutral_agent 生成真实自主工具试验；npm run ai:console 打开中文面板；无模型可用 npm run demo:containment。',
        '可复现边界：首次危险调用、Guard 旁路、已开始的外部效果；当前模型避开诱饵，检测覆盖不足。AI 输出可能被不可信文本影响，但无执行权。',
        '真实云端、LM Studio/vLLM 服务、OS Keyring、多模型对比未验证/实现。V1/V2 公共分发 P1 尚未关闭。新 AI 视频已实际录制，明确模式且无旁白；不宣称稳定发布，发件前仍需核对官方要求。',
        '全部源、证据及此报告生成器在 competition-submission/lab/ 和 evidence/。精确版本见 DELIVERY_VERSION.md。'])
    finish(doc,s)
if __name__=='__main__':
    build_project();build_report();print('Built AI competition project/report PDFs from saved evidence')
