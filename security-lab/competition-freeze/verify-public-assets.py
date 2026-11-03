"""Anonymous HTTP body verification; no credentials or mailbox content."""
import json,hashlib,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'competition-submission/3.0-final';download=root/'security-lab/competition-freeze/local-only/public-download';download.mkdir(parents=True,exist_ok=True)
manifest=json.loads((out/'RELEASE_ASSET_MAP.json').read_text(encoding='utf-8'));base='https://github.com/DorianChn/shanchuanzhi-agent-canary/releases/download/v3.0.0-competition-candidate.1/';checks=[]
for name,expected in manifest['files'].items():
    request=urllib.request.Request(base+name,headers={'User-Agent':'Agent-Canary-public-artifact-verification'})
    with urllib.request.urlopen(request,timeout=90)as response:
        status=response.status;body=response.read(20*1024*1024+1)
    match=hashlib.sha256(body).hexdigest()==expected['sha256']and len(body)==expected['bytes']
    checks.append({'name':name,'httpStatus':status,'anonymous':True,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'matchesLocal':match,'url':base+name})
    if not match:raise RuntimeError('PUBLIC_ASSET_MISMATCH '+name)
    (download/name).write_bytes(body)
report={'sourceSHA':manifest['sourceSHA'],'tag':'v3.0.0-competition-candidate.1','checkedAssets':checks,'status':'VERIFIED'}
(root/'security-lab/competition-freeze/public-assets.log').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'status':'VERIFIED','anonymousHTTP200':sum(c['httpStatus']==200 for c in checks),'hashMatches':sum(c['matchesLocal']for c in checks),'count':len(checks)}))
