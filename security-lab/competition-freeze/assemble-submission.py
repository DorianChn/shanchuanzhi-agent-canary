"""Collect selected generated artifacts without deleting or overwriting earlier outputs."""
import hashlib,json,shutil,zipfile
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[2];out=root/'competition-submission/3.0-final';qa=root/'security-lab/competition-freeze/local-only';qa.mkdir(exist_ok=True)
sha='99660b36db9d5b1121eea6fe06b026c5f1e36bcf';repo='https://github.com/DorianChn/shanchuanzhi-agent-canary';tag='v3.0.0-competition-candidate.1';release=repo+'/releases/tag/'+tag;download=repo+'/releases/download/'+tag+'/'
name='Agent_Canary_3_0_Community_Preview_99660b36.zip';selected=root/'competition-submission/3.0-final-package'/name
assert selected.is_file()
if (out/name).exists():
    previous=qa/('initial-'+name)
    if previous.exists():raise RuntimeError('Already collected; do not overwrite')
    (out/name).rename(previous)
shutil.copyfile(selected,out/name)
build_name='community-build-99660b36.json'
if (out/build_name).exists():(out/build_name).rename(qa/('initial-'+build_name))
shutil.copyfile(selected.parent/build_name,out/build_name)
video_source=root/'competition-submission/3.0-final-video/Agent_Canary_3_0_Competition_Demo_1080p.webm';video=out/'Agent_Canary_3_0_Competition_Demo_Final_1080p.webm'
if video.exists():raise RuntimeError('Final video exists')
shutil.copyfile(video_source,video)
# Matroska/Playwright wall-clock recording metadata includes encoder close time.
# Clip the final subtitle to the actual measured video stream duration.
media=json.loads((root/'security-lab/competition-freeze/video-media-check.json').read_text(encoding='utf-8'))
record=json.loads((root/'competition-submission/3.0-final-video/video-recording.json').read_text(encoding='utf-8'))
def time(ms):return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
duration=int(media['durationSeconds']*1000)
srt='\n'.join(str(i+1)+'\n'+time(s['at'])+' --> '+time(min(record['scenes'][i+1]['at']if i+1<len(record['scenes'])else duration,duration))+'\n'+s['text']+'\n'for i,s in enumerate(record['scenes']))
(out/'Agent_Canary_3_0_候选字幕.srt').write_text(srt,encoding='utf-8')
(out/'video-final-verification.json').write_text(json.dumps({'sourceSHA':sha,'actualMedia':media,'captions':'visible Chinese + stream-aligned SRT','audio':'none','modelMode':record['modelMode'],'demoMode':record['demoMode'],'rawRecordingBytes':record['bytes'],'rawRecordingSHA256':record['sha256'],'selectedFinalFile':video.name,'selectedFinalSHA256':hashlib.sha256(video.read_bytes()).hexdigest()},ensure_ascii=False,indent=2),encoding='utf-8')
font='C:/Windows/Fonts/msyh.ttc';im=Image.new('RGB',(1600,900),'#f4f8fc');draw=ImageDraw.Draw(im);title=ImageFont.truetype(font,36);body=ImageFont.truetype(font,23)
draw.text((50,35),'Agent Canary 3.0：可信执行、信号与证据',font=title,fill='#163852')
nodes=[(50,140,'真实本地 Qwen','受控 SDK Agent / 提出请求'),(580,140,'Trusted Gateway','句柄 / 固定程序 / 登记MCP'),(1110,140,'有限实际执行','临时文件 / 测试进程 / 回调'),(50,365,'Honeypot / Token','只用无效凭据 / 接触信号'),(580,365,'Policy / Guard','权限、来源、审批、隔离'),(1110,365,'目标观察 + OSEP','实际效果 / 请求关联 / 局部链'),(580,590,'AI 事前辅助','可收紧拒绝，不能批准/reset')]
for x,y,h,s in nodes:
    draw.rounded_rectangle((x,y,x+430,y+135),radius=15,fill='#e5eef7',outline='#7895af',width=2);draw.text((x+18,y+20),h,font=body,fill='#153555');draw.text((x+18,y+73),s,font=body,fill='#3a5268')
def arrow(x1,y1,x2,y2):
    draw.line((x1,y1,x2,y2),fill='#2a7c90',width=5)
    if x1==x2:draw.polygon([(x2,y2),(x2-9,y2-15),(x2+9,y2-15)],fill='#2a7c90')
    else:draw.polygon([(x2,y2),(x2-15,y2-9),(x2-15,y2+9)],fill='#2a7c90')
arrow(480,205,580,205);arrow(1010,205,1110,205);arrow(480,430,580,430);arrow(795,275,795,365);arrow(1010,430,1110,430);arrow(795,500,795,590)
draw.text((50,775),'保护注册工具；未接入宿主工具 OUT_OF_SCOPE。AI不授予权限；观察同宿主，E4未完成。',font=body,fill='#28445d');draw.text((50,824),'冻结 '+sha+' / MIT / 作者知情留出 / 非全局防火墙',font=body,fill='#526d84');im.save(out/'安全架构图.png')
data=root/'security-lab/evidence/2026-10-11T15-04-14-292Z/results.json';d=json.loads(data.read_text(encoding='utf-8'));claims=[]
for t in d['trials']:
    if t['arm']!='F' or not any(c['reason']=='credential_resource_denied'for c in t['trace']):continue
    baseline=next(a for a in d['trials']if a['arm']=='A'and a['scenario']==t['scenario'])
    assert baseline['sideEffects']['returnedProtectedSecret'] and not t['sideEffects']['returnedProtectedSecret']
    claims.append({'scenario':t['scenario'],'status':'VERIFIED_BOUNDED_SAME_HOST_OBSERVATION','maximumSupportedLevel':'E3','claim':'registered credential read denied; protected synthetic value not returned in observed trial','AEffects':baseline['sideEffects'],'FEffects':t['sideEffects'],'FDecisionEvidence':[e for e in t['evidence']if e['decision_reason']=='credential_resource_denied'],'E4':'BLOCKED_NO_INDEPENDENT_OPERATOR','sourceSHA':sha,'rawSHA256':hashlib.sha256(data.read_bytes()).hexdigest()})
(out/'有限凭据拒绝证据.json').write_text(json.dumps({'mode':'MANUAL_BOUNDED_CLAIM_MAPPING_NOT_PRODUCT_CERTIFICATION','claims':claims,'limits':'Counterpart trial positive control; same-host observer, fixed seed correlated repeats; no full native host or population protection claim.'},ensure_ascii=False,indent=2),encoding='utf-8')
evidence=out/'Agent_Canary_3_0_Evidence.zip'
include=['security-lab/evidence/2026-10-11T13-34-53-835Z','security-lab/evidence/2026-10-11T15-00-05-008Z','security-lab/evidence/2026-10-11T15-04-14-292Z','security-lab/holdout-v1.json','security-lab/holdout-protocol.md','security-lab/evidence.schema.json','security-lab/verify-acceptance.py','security-lab/test-acceptance-verifier.py','test/evidence-vectors.json','security-lab/competition-freeze/holdout-assurance.json','security-lab/competition-freeze/holdout-metrics-detail.json','security-lab/competition-freeze/holdout-preregistration-check.json','security-lab/competition-freeze/holdout-run.txt','security-lab/competition-freeze/holdout-run-retry.txt','security-lab/competition-freeze/frozen-ci.json','security-lab/competition-freeze/npm-audit.json','security-lab/competition-freeze/verifier-regression-final.txt','security-lab/competition-freeze/artifact-install-final.json','docs/3.0/FINAL_3_0_ACCEPTANCE.md','docs/3.0/FINAL_COMPETITION_READINESS.md','docs/3.0/QWEN_48_RECORD_AUDIT.md']
with zipfile.ZipFile(evidence,'x',zipfile.ZIP_DEFLATED)as z:
    for entry in include:
        p=root/entry
        if not p.exists():raise RuntimeError('Missing evidence '+entry)
        for file in sorted(p.rglob('*'))if p.is_dir()else[p]:
            if file.is_file():z.write(file,str(file.relative_to(root)))
body='组委会老师您好：\n\n这是 Agent Canary 3.0 更新版参赛材料，烦请替换此前2.1.0材料并关联已通过审核的报名记录。\n\n大赛：2026 上海开源软件应用创新大赛\n赛道：开源 AI 工具赛道；自主选题\n项目：Agent Canary 3.0\n负责人：唐林博豪；学校：闽江大学\n\n冻结代码：'+repo+'/tree/'+sha+'\nGit SHA：'+sha+'\n可下载的免费竞赛包、三份PDF、原始实验与安装说明：'+release+'\n演示视频直链（1920×1080，约3分33秒，WebM，可下载播放；中文说明，无音轨）：'+download+video.name+'\n\n附件ZIP包含项目介绍、技术创新、真实模型实验PDF、安装说明、架构图及材料清单；视频和代码另提供上述公开链接。\n\n本轮完整保留64次真实本地Qwen与受控SDK Agent留出记录。无保护组攻击效果4/24，完整系统0/24；正常任务两组8/8，非总体安全保证。旧直接准入A12/12、F0/12不能当作间接注入防护率。AI独立收益、自适应蜜罐收益、第三方原生Agent全局防护和E4独立复验尚未证实。视频的DEMO由操作者触发真实程序，模型结果为保存记录，并非现场推理。\n\n免费候选保留MIT，不发布稳定npm/Docker，不合并main，不含生产凭据或订单。请按本邮件对应冻结版本评审；如需其他视频托管或附件格式，烦请告知。请确认材料收悉，谢谢！\n\n唐林博豪\n闽江大学\n'
(out/'正式参赛邮件.txt').write_text(body,encoding='utf-8')
check='\n'.join(['# 最终材料清单','', '冻结代码：'+sha,'公开代码：'+repo+'/tree/'+sha,'候选Release：'+release,'视频：'+download+video.name,'', '本清单中的公开链接须以Release实际下载核对为准，不能仅由字符串存在判为完成。发送以Sent Items实际记录为准；没有组织确认不能声称收悉。','', '三份PDF、有限效果原始报告、架构图、安装复现、MIT免费构建、局部安全边界随附件交付；新版视频仅Release，不将18MB原始录屏提交普通Git。','', 'NOT VERIFIED/BLOCKED：E4、原生客户端全局覆盖、AI/自适应独立收益、云端实联、总体95%正常成功率、历史秘密全扫描、旧普通npm/Docker商业分发P1、组委会收悉。','', '官方：https://www.oschina.net/os2026/；10月16日24:00，oscc@oschina.cn；页面没有明确时区/附件限额/强制视频时长。',''])
(out/'最终提交清单.md').write_text(check,encoding='utf-8')
notes='\n'.join(['# Agent Canary 3.0 — verifiable SDK competition candidate','', 'Pre-release; no main merge, stable npm/Docker or legacy license change. Use the curated Community ZIP rather than the generated full source archive.','', 'Frozen runtime/lab source: '+sha,'', 'True local Qwen held-out cohort: 64 trials; attack effect A4/24, F0/24; normal tasks A8/8,F8/8; zero run errors. 12 unique authored attack texts, fixed seed repeats correlated; not external E4. Four bounded credential-read counterparts have real target observations, not just DENY labels.','', 'Original48: direct admission A12/12,F0/12 (not injection rate); indirect README both0/4 without dangerous attempts. Do not pool cohorts.','', 'CI9/9, root301 pass/4 skip/0 fail, independent Python7, curated96 pass. Asset checks and public install results linked in delivery record. DockerHub500 was transient on earlier CI, current Docker build/help passed; ZIP is independent of Docker.','', 'Three Chinese PDFs, real1920×1080 browser recording/operator-triggered DEMO (saved model results, not live inference), aligned subtitles, evidence ZIP and user guide.','', 'Limitations: native Codex/Claude/Cursor/Cline full coverage not verified; AI and adaptive independent benefit not measured; same-host observer not E4; held fd not path lease/rollback; uncooperative started callback may still act; no adversarial publicTLS/DNS E2E; local chain not tamper-proof. Legacy ordinary npm/Docker commercial distribution P1 remains OPEN; curated free package excludes that implementation. MIT unchanged.',''])
(out/'RELEASE_NOTES.md').write_text(notes,encoding='utf-8')
# Text-only caption timing correction does not change recorded model or tool behavior.
chosen=[f for f in sorted(out.iterdir())if f.is_file()and f.suffix in ['.pdf','.png','.md','.txt','.srt','.json']and f.name!='community-build-99660b36.json']+[out/name,evidence,video]
manifest={'sourceSHA':sha,'candidateTag':tag,'files':{f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size}for f in chosen}}
(out/'DELIVERY_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
bundle=out/'Agent_Canary_3_0_参赛材料.zip'
with zipfile.ZipFile(bundle,'x',zipfile.ZIP_DEFLATED)as z:
    for f in chosen:
        if f==video or f==out/name or f==evidence:continue
        z.write(f,f.name)
print(json.dumps({'sourceSHA':sha,'candidateZIP':name,'mailBundleBytes':bundle.stat().st_size,'evidenceBytes':evidence.stat().st_size,'videoBytes':video.stat().st_size,'boundedCredentialClaims':len(claims)},ensure_ascii=True))
