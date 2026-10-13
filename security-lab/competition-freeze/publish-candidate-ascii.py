"""Avoid failed Unicode upload paths; publish only after verifying each draft asset."""
import hashlib,json,subprocess,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'competition-submission/3.0-final';stage=root/'security-lab/competition-freeze/local-only/release-upload';stage.mkdir(parents=True,exist_ok=True)
gh='C:/Program Files/GitHub CLI/gh.exe';repo='DorianChn/shanchuanzhi-agent-canary';tag='v3.0.0-competition-candidate.1';sha='99660b36db9d5b1121eea6fe06b026c5f1e36bcf'
names={'Agent_Canary_3_0_Community_Preview_99660b36.zip':'Agent_Canary_3_0_Community_Preview_99660b36.zip','Agent_Canary_3_0_Evidence.zip':'Agent_Canary_3_0_Evidence.zip','Agent_Canary_3_0_参赛材料.zip':'Agent_Canary_3_0_Submission_Materials.zip','Agent_Canary_3_0_项目介绍.pdf':'Agent_Canary_3_0_Project_Overview.pdf','Agent_Canary_3_0_技术创新.pdf':'Agent_Canary_3_0_Technical_Innovation.pdf','Agent_Canary_3_0_真实模型实验报告.pdf':'Agent_Canary_3_0_Real_Model_Evaluation.pdf','Agent_Canary_3_0_Competition_Demo_Final_1080p.webm':'Agent_Canary_3_0_Competition_Demo_Final_1080p.webm','Agent_Canary_3_0_候选字幕.srt':'Agent_Canary_3_0_Chinese_Subtitles.srt','安装与独立复现.md':'INSTALL_AND_REPRODUCE.md','安全架构图.png':'SECURITY_ARCHITECTURE.png','DELIVERY_MANIFEST.json':'DELIVERY_MANIFEST.json'}
mapping={}
for local,remote in names.items():
    shutil.copyfile(out/local,stage/remote);mapping[remote]={'local':local,'sha256':hashlib.sha256((stage/remote).read_bytes()).hexdigest(),'bytes':(stage/remote).stat().st_size}
(stage/'RELEASE_ASSET_MAP.json').write_text(json.dumps({'sourceSHA':sha,'files':mapping},ensure_ascii=False,indent=2),encoding='utf-8')
subprocess.run([gh,'release','create',tag,'--repo',repo,'--target',sha,'--draft','--prerelease','--latest=false','--title','Agent Canary 3.0 - verified SDK competition candidate','--notes-file',str(out/'RELEASE_NOTES.md')],check=True,cwd=root)
for file in sorted(stage.iterdir()):
    subprocess.run([gh,'release','upload',tag,'--repo',repo,str(file)],check=True,cwd=root)
draft=json.loads(subprocess.check_output([gh,'release','view',tag,'--repo',repo,'--json','isDraft,assets,tagName'],cwd=root))
expected=set(mapping)|{'RELEASE_ASSET_MAP.json'}
if not draft['isDraft']or{a['name']for a in draft['assets']}!=expected:raise RuntimeError('DRAFT_ASSET_SET_MISMATCH')
for asset in draft['assets']:
    local=stage/asset['name']
    if asset['size']!=local.stat().st_size:raise RuntimeError('ASSET_SIZE_MISMATCH')
subprocess.run([gh,'release','edit',tag,'--repo',repo,'--draft=false','--prerelease','--latest=false'],check=True,cwd=root)
shutil.copyfile(stage/'RELEASE_ASSET_MAP.json',out/'RELEASE_ASSET_MAP.json')
print(json.dumps({'publishedTag':tag,'sourceSHA':sha,'assets':len(expected),'state':'PRERELEASE_NOT_STABLE'},ensure_ascii=True))
