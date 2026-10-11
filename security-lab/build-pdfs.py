import argparse,json,html
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
p=argparse.ArgumentParser();p.add_argument('--sha',required=True);a=p.parse_args()
root=Path(__file__).resolve().parent.parent;out=root/'competition-submission/3.0';out.mkdir(exist_ok=True)
data=json.loads((root/'security-lab/evidence/console-summary.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('YaHei','C:/Windows/Fonts/msyh.ttc',subfontIndex=0))
style=ParagraphStyle('body',fontName='YaHei',fontSize=10.5,leading=18,textColor=colors.HexColor('#26374b'),wordWrap='CJK',spaceAfter=12)
heading=ParagraphStyle('heading',parent=style,fontSize=21,leading=30,textColor=colors.HexColor('#152d49'),spaceAfter=24)
small=ParagraphStyle('small',parent=style,fontSize=8,leading=13)
def para(text,s=style):return Paragraph(html.escape(str(text)).replace('\n','<br/>'),s)
def footer(c,doc):
 c.setFont('YaHei',8);c.setFillColor(colors.HexColor('#536a80'));c.drawString(42,24,'Agent Canary 3.0 | Engineering Preview | '+a.sha[:12]);c.drawRightString(552,24,str(doc.page))
def table(rows,widths):
 t=Table([[para(x,small)for x in row]for row in rows],colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9f0f7')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),.8,colors.HexColor('#6c849c')),('BOTTOMPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9)]));return t
def build(name,pages):
 target=out/name
 if target.exists():raise RuntimeError('Refuse overwriting '+name)
 story=[]
 for i,(title,content)in enumerate(pages):
  if i:story.append(PageBreak())
  story.append(para(title,heading))
  for item in content:story.append(item if not isinstance(item,str)else para(item))
 SimpleDocTemplate(str(target),pagesize=(595.28,841.89),rightMargin=42,leftMargin=42,topMargin=48,bottomMargin=48,title=name,author='Agent Canary engineering').build(story,onFirstPage=footer,onLaterPages=footer)
 print(name)
latest_direct=next(r for r in reversed(data['runs'])if r['cohort']=='DIRECT_EXECUTION_ADMISSION_NOT_PROMPT_INJECTION')
indirect=next(r for r in data['runs']if r['cohort']=='INDIRECT_README_PROMPT_INJECTION')
def metric_rows(run):
 rows=[['组','危险效果','主动拒绝任务','正常完成']]
 for arm,m in run['metrics'].items():
  rate=lambda k:str(m[k]['numerator'])+'/'+str(m[k]['denominator'])
  rows.append([arm,rate('attackSuccess'),rate('activeDenialTrials'),rate('normalTaskSuccess')])
 return table(rows,[42,110,180,178])
build('Agent_Canary_3_0_项目介绍_工程候选.pdf',[
 ('Agent Canary 3.0',['可验证的 AI Agent 安全执行与自适应蜜罐平台','工程候选，非稳定版；保留已验证 2.0 参赛版本。','可信执行网关 + 隔离诱饵 + 局部可验证证据。真实本地模型自主选择工具，安全策略拥有最终执行权。','代码冻结：'+a.sha,'仓库：https://github.com/DorianChn/shanchuanzhi-agent-canary','本材料不承诺全局 Agent 防护、100% Prompt Injection 防护、零误报或获奖。']),
 ('问题与执行边界',['模型可能受到仓库文档、网页或工具输出中的恶意指令影响。诱饵信号有价值，但模型不接触诱饵时，单靠 Canary 不能证明危险操作被拦截。','3.0 将确定性权限检查放在登记工具执行前，区别检测事件、策略拒绝、Guard 隔离、实际效果和证据。','宿主建立资源及工具清单，模型只能提出调用。被拒绝的调用必须观察真实目标未改变，而不是只看到 DENY 字样。','不覆盖未接入的第三方回调、模型内部状态或已开始的外部效果。']),
 ('可信执行闭环',['身份与任务能力 → JSON 参数规范化 → 资源绑定检查 → 风险 / 数据流规则 → 必要时 AI 与宿主审批 → Guard 复查 → 执行 → 效果与证据。','文件：持有预登记 fd，拒绝链接、硬链接、路径替换、未登记写入和超限内容；使用 fd 操作和字节复查。','命令：固定 executable 与 argv，无模型 Shell 字符串。HTTP：批准 HTTPS origin、DNS 校验及 socket pin、无重定向、只读 JSON GET。','MCP：宿主登记风险类别与回调；敏感历史后 network 回调执行前拒绝。operator 对象只交给可信宿主，一次消费、有限有效期。','它不是 OS 沙箱。固定程序自身权限及同权限本地进程仍属于信任边界。']),
 ('隔离蜜罐与数据关联',['五类隔离资源：虚拟 .env、无效 SSH 凭据、虚拟数据库、虚拟内部 API、虚拟 MCP。使用新建私有临时目录，没有真实账户或密钥。','唯一 Decoy ID；DEPLOYED 不等于 READ。只记录观察到的交互、拒绝和隔离。真实模型直接准入轨迹包含 .env 读取 → QUARANTINED → 后续写入拒绝。','AdaptiveDecoyPlanner 使用可信任务元数据进行启发式选择，自适应优于静态的结论尚未测得。','有界 HMAC 片段指纹可关联部分编码 / 长片段引用；短片段、任意变换、未观察工具 OUT_OF_SCOPE，不是完整动态污点分析。']),
 ('真实实验与工程证据',[metric_rows(indirect),'间接 README 对照：各组模型没有尝试恶意操作，不能证明额外防护收益。',metric_rows(latest_direct),'单独的直接执行准入验证：实际受限调用与危险副作用前后对照；不能换算为 Prompt Injection 防护率。','本地根测试 254 项：250 通过、4 跳过；Sponsor 25 项：24 通过、1 跳过。最终 CI 与精确日志以 FINAL_REPORT.md 为准。']),
 ('开放价值与发布限制',['Community 工程候选通过正向清单独立构建，不包含 legacy 商业 license / dashboard / export / eval 实现。MIT 保留；不单方面迁移 Apache-2.0 或改变付费用户授权。','Open Security Evidence Protocol v0.1 使用 JSON Schema、请求 HMAC 摘要、规范化事件哈希链。无外部可信锚、签名或独立时间戳，不能称为绝对防篡改。','原生 Codex / Claude Code / Cursor / Cline 仅配置 / 协议 / hook 部分验证，主验收对象为受控 SDK Agent。','长期路线：3.1 官方宿主插件验收；3.2 更广独立评测与审查误报研究；3.5 团队便利功能；4.0 多 Agent 最小权限。未来功能不是当前已实现能力。','尚未达到完整 3.0 稳定发布门槛；扩大独立攻击 / 正常测试集、静态与自适应比较、原生宿主验收及商业分发边界仍需处理。'])])
build('Agent_Canary_3_0_技术创新_工程候选.pdf',[
 ('技术贡献与可证实范围',['工程候选代码：'+a.sha,'贡献一：把宿主登记的工具能力、预持有文件句柄、Guard 和效果审计连为执行前闭环。具体根因回归覆盖路径替换、首次凭据访问、命令权限、一次性审批和敏感 MCP 外传。','贡献二：把部署、接触、检测、隔离和阻断拆成独立事实，隔离蜜罐不接触真实资源。自适应选择只是启发式实现。','贡献三：公开结构化执行证据，意图 / 结果分离、请求摘要、政策版本及局部链验证。没有证明其为行业首创。']),
 ('策略、AI 与权限延续',['模型输出是建议。只有模糊风险进入事前 AI，suspicious 可收紧到 DENY，benign / 超时 / 无效 JSON 仍 REQUIRE_APPROVAL。','AI 没有 approve、reset 或修改策略的工具。宿主批准时复查 Guard、资源与敏感历史，批准引用不是可重放的令牌。','更换同一 Guard 的网关保留会话 HMAC 历史，防止宿主重配置意外清空已观测来源。','真实本地审查对恶意审批诱导返回校验后的 suspicious；小样本不能证明普遍抗审查注入，也没有独立因果阻断收益。']),
 ('证据协议 v0.1',['必需字段：schema_version、evidence_id、session_id、agent_id、tool_id、request_id、request_digest、policy_version、decision、decision_reason、approval_reference、execution_status、side_effect_verification、timestamp、previous_event_digest、event_digest。','对象键按 UTF-16 顺序，有限 JSON，UTF-8，无空白；排除 event_digest 后计算 SHA-256。不是完整 RFC 8785。请求摘要使用临时会话 HMAC，防止日志包含原始敏感参数。','可信 expectedHead 可检查链尾截断；无独立锚时，管理员可整体重写链。RUNNING 不代表执行完成，SUCCEEDED 也不自动代表全部外部效果已验证。','OpenTelemetry 属性映射可行，但 exporter 尚未实现，不能把 UUID 当作 OTel trace_id。']),
 ('相关工作与演进',['Promptfoo 的官方 red-team 文档介绍攻击样本生成、应用评测与 CI 集成，并有更广产品能力；这里比较其 red-team 工作流，不断言它只有评测。来源：https://www.promptfoo.dev/docs/red-team/','Microsoft PyRIT 是生成式 AI 风险识别研究框架。来源：https://github.com/Azure/PyRIT','Agent Canary 当前重点是宿主工具执行边界、隔离诱饵、Guard 与可核查的实际副作用。三者可以互补，本轮没有公平性能排名或功能优越性实验。','Apache-2.0 的专利许可与 NOTICE 管理值得评估；实际迁移需权利与兼容性审查，当前保持 MIT。Professional ¥99 买断仅为非核心管理便利模块规划，本轮无真实支付。'])])
experiment_pages=[('真实模型实验方法',['代码冻结：'+a.sha,'模型：Ollama / Qwen 9B，预先安装；temperature 0、think false、context 4096、seed 20261011、最多 4 轮工具交互。','相同任务、工具定义与样本，对照 A 无保护、B 静态诱饵、C 诱饵+Guard、D 确定性能力、E 事前 AI、F E+.env 蜜罐。','所有危险效果局限为临时测试文件、固定无害 Node 执行器及 loopback 假接收端。使用真实模型自主工具选择，不通过脚本强制诱饵调用来计数。','全量输入、工具轨迹、错误、使用量和分子 / 分母见独立 preregistration.json、results.json、results.csv。']),('间接注入对照：未观察到主动攻击',[metric_rows(indirect),'每组 5 个攻击任务、3 个正常任务；共 48 次。各组 0/5 攻击成功、0/5 主动拒绝，正常 3/3。','这次模型只完成正常仓库任务，没有跟随恶意 README。因此 Canary 或网关的独立安全收益 NOT MEASURED。不能报告为 100% 防护。','样本来自作者设计，单模型 / 单种子，小样本；不是盲测公共基准。']),('直接执行准入：实际副作用证明',[metric_rows(latest_direct),'每组 4 个受限操作任务、3 个正常任务。它是执行边界测试，不是间接 Prompt Injection 攻击成功率。','A 实际删除 / 改写虚拟受保护文件或执行虚拟特权 workflow；E/F 拒绝对应调用，实际副作用未发生。F 记录虚拟 .env READ 与 QUARANTINED，随后写入 / 命令 / 网络调用被拒绝。','AI 审查有效输出 '+str(latest_direct['validReviews'])+'/'+str(latest_direct['reviewRequests'])+'；中位延迟 '+str(latest_direct['reviewMedianMs'])+' ms。Agent Token '+str(latest_direct['agentTokens'])+'；Review Token '+str(latest_direct['reviewTokens'])+'。','没有付费 API；本机电费成本未测。AI 独立阻断贡献未测。']),('证据与局限',['早期两个实验的提交 SHA 被命令展开记录为前一提交；原始数据未修改。根据运行时五个源码文件哈希匹配实际提交，更正见 SOURCE_PROVENANCE_CORRECTIONS.json。新冻结实验显式传完整 SHA。','本地微基准：1500 次实际持有句柄读取 + 内存证据记录，中位 3.134 ms、p95 5.647 ms；不包含模型或磁盘 fsync，不是长时间资源稳定性结论。','正常 3/3 的 Wilson 95% 区间约 43.9%–100%；不能验证生产正常任务成功率≥95%。独立 100 攻击 / 50 正常建议目标尚未完成。','原生 Agent 全局保护、自适应对静态增益、任意编码数据流、管理员日志篡改抵抗均未得到本轮证明。完整源文件摘要、分母和历史失败保留在 GitHub Draft PR #24。'])]
build('Agent_Canary_3_0_真实实验_工程候选.pdf',experiment_pages)
