"""Resume packaging already generated artifacts; preserve the failed assembly log."""
import json,hashlib,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'competition-submission/3.0-final';sha='99660b36db9d5b1121eea6fe06b026c5f1e36bcf'
excluded={'Agent_Canary_3_0_演示字幕.srt','video-recording.json','community-build-99660b36.json'}
chosen=[f for f in sorted(out.iterdir())if f.is_file()and f.suffix in['.pdf','.png','.md','.txt','.srt','.json']and f.name not in excluded]
zip_names=['Agent_Canary_3_0_Community_Preview_99660b36.zip','Agent_Canary_3_0_Evidence.zip']
video=out/'Agent_Canary_3_0_Competition_Demo_Final_1080p.webm';chosen+=[out/n for n in zip_names]+[video]
assert all(f.exists()for f in chosen)
manifest={'sourceSHA':sha,'candidateTag':'v3.0.0-competition-candidate.1','files':{f.name:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size}for f in chosen}}
with (out/'DELIVERY_MANIFEST.json').open('x',encoding='utf-8')as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
bundle=out/'Agent_Canary_3_0_参赛材料.zip'
with zipfile.ZipFile(bundle,'x',zipfile.ZIP_DEFLATED)as z:
    for f in chosen:
        if f==video or f.name in zip_names:continue
        z.write(f,f.name)
print(json.dumps({'sourceSHA':sha,'bundleBytes':bundle.stat().st_size,'videoBytes':video.stat().st_size,'manifestFiles':len(chosen),'manifestMismatch':[f.name for f in chosen if hashlib.sha256(f.read_bytes()).hexdigest()!=manifest['files'][f.name]['sha256']]},ensure_ascii=True))
