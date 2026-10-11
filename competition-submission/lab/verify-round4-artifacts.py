from pathlib import Path
import json, hashlib, zipfile, shutil, subprocess, os
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[2];SUB=ROOT/'competition-submission';E=SUB/'evidence'

def archive():
 b=json.loads((E/'round4-free-build-output.txt').read_text(encoding='utf-8'));base=Path(b['artifactDirectory']).resolve()
 if base.parent!=Path(os.environ['TEMP']).resolve() or not base.name.startswith('agent-canary-free-artifact-'): raise RuntimeError('Archive source outside known temp root')
 # Final saved summary is data, independent of the previously verified code build.
 shutil.copyfile(E/'round4-summary.json',base/'competition-submission/evidence/round4-summary.json')
 files=[]
 for folder in ['src','dist','docs','competition-submission']: files.extend(p for p in (base/folder).rglob('*') if p.is_file())
 files.extend(base/n for n in ['LICENSE','README.md','README.zh-CN.md','package.json','package-lock.json','tsconfig.json'])
 for p in files:
  n=p.relative_to(base).as_posix()
  if p.is_symlink() or any(s in n.lower() for s in ['license.ts','license.js','dashboard.ts','dashboard.js','export.ts','export.js','sponsor/','test-home','node_modules/','/eval/','private-key','orders.json','subscriptions.json']): raise RuntimeError('Forbidden distribution member: '+n)
 out=SUB/'Agent_Canary_Competition_V1.zip';manifest=[]
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in sorted(files):
   n=p.relative_to(base).as_posix();data=p.read_bytes();z.writestr('agent-canary-competition/'+n,data);manifest.append({'file':n,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 with zipfile.ZipFile(out) as z: assert z.testzip() is None
 record={'file':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'independentInstallBuildSelfTest':'VERIFIED','sdkPolicySmoke':'VERIFIED: public read executed once, secret egress refused, decoy quarantine refused follow-up','commercialImplementationFiles':[],'regularPackageP1':'OPEN','archiveIntegrity':'VERIFIED','manifest':manifest}
 (E/'round4-free-archive.json').write_bytes((json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
 return record

def pdfs():
 directory=ROOT/'tmp/pdfs/round4';directory.mkdir(parents=True,exist_ok=True)
 poppler='C:/Users/36712/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
 reports=[]
 for label,name in [('project','Agent_Canary_Round4_项目介绍.pdf'),('experiment','Agent_Canary_Round4_实验报告.pdf')]:
  p=SUB/name;reader=PdfReader(p);texts=[page.extract_text() or '' for page in reader.pages]
  assert all(len(t)>80 for t in texts),'empty/sparse PDF page';assert all('\ufffd' not in t for t in texts),'bad font extraction'
  assert '5/15' in ''.join(texts) and '1/15' in ''.join(texts) and '172' in ''.join(texts),'stale result PDF'
  subprocess.run([poppler,'-r','80','-png',str(p),str(directory/label)],check=True,creationflags=subprocess.CREATE_NO_WINDOW)
  paths=sorted(directory.glob(label+'-*.png'));assert len(paths)==len(reader.pages)
  for batch in range(0,len(paths),8):
   selected=paths[batch:batch+8];sheet=Image.new('RGB',(4*340,2*495),'#e7edf4');draw=ImageDraw.Draw(sheet)
   for i,f in enumerate(selected):
    im=Image.open(f);im.thumbnail((324,459));x=(i%4)*340+8;y=(i//4)*495+20;sheet.paste(im,(x,y));draw.text((x,y-15),f.stem,fill='#172238')
   sheet.save(E/f'round4-{label}-contact-{batch//8+1}.png')
  reports.append({'file':name,'pages':len(reader.pages),'renderedPages':len(paths),'pageTextLengths':[len(t) for t in texts],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 (E/'round4-pdf-verification.json').write_bytes((json.dumps({'pdfs':reports,'rendering':'VERIFIED; visual inspection recorded separately'},indent=2)+'\n').encode('utf-8'))
 return reports

if __name__=='__main__':
 print(json.dumps({'archive':{k:v for k,v in archive().items() if k!='manifest'},'pdfs':pdfs()},ensure_ascii=False))
