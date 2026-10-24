"""Publish only the explicitly authorized prerelease candidate; never merge or publish npm/Docker."""
import hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'competition-submission/3.0-final';gh='C:/Program Files/GitHub CLI/gh.exe';repo='DorianChn/shanchuanzhi-agent-canary';tag='v3.0.0-competition-candidate.1';sha='99660b36db9d5b1121eea6fe06b026c5f1e36bcf'
manifest=json.loads((out/'DELIVERY_MANIFEST.json').read_text(encoding='utf-8'))
if manifest['sourceSHA']!=sha:raise RuntimeError('FREEZE_MISMATCH')
for name,record in manifest['files'].items():
    if hashlib.sha256((out/name).read_bytes()).hexdigest()!=record['sha256']:raise RuntimeError('ASSET_MISMATCH '+name)
files=['Agent_Canary_3_0_Community_Preview_99660b36.zip','Agent_Canary_3_0_Evidence.zip','Agent_Canary_3_0_参赛材料.zip','Agent_Canary_3_0_项目介绍.pdf','Agent_Canary_3_0_技术创新.pdf','Agent_Canary_3_0_真实模型实验报告.pdf','Agent_Canary_3_0_Competition_Demo_Final_1080p.webm','Agent_Canary_3_0_候选字幕.srt','安装与独立复现.md','安全架构图.png','DELIVERY_MANIFEST.json']
subprocess.run([gh,'release','create',tag,'--repo',repo,'--target',sha,'--prerelease','--latest=false','--title','Agent Canary 3.0 — verified SDK competition candidate','--notes-file',str(out/'RELEASE_NOTES.md'),*[str(out/n)for n in files]],cwd=root,check=True)
