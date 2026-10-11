"""Positive-list free archive, complete PDF render/text checks and artifact hashes."""
from pathlib import Path
import os,json,hashlib,zipfile,subprocess
from PIL import Image,ImageOps,ImageDraw
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2];SUB=ROOT/'competition-submission';E=SUB/'evidence'
artifact=json.loads((E/'v2-free-build-location.txt').read_text(encoding='utf-8').strip())['artifactDirectory']
base=Path(artifact);zip_path=SUB/'Agent_Canary_Competition_2_0.zip'
files=[base/n for n in ['LICENSE','THIRD_PARTY_NOTICES.md','README.md','README.zh-CN.md','package.json','package-lock.json','tsconfig.json']]
for folder in ['src','dist','docs','competition-submission']:
 files.extend(p for p in (base/folder).rglob('*') if p.is_file())
bad=[]
for p in files:
 rel=p.relative_to(base).as_posix()
 if any(x in rel.split('/') for x in ['node_modules','test-home','sponsor','data','.env']) or rel in ['src/license.ts','dist/license.js','src/dashboard.ts','dist/dashboard.js','src/export.ts','dist/export.js'] or rel.startswith(('src/eval/','dist/eval/')):bad.append(rel)
if bad:raise RuntimeError('Forbidden private/commercial archive entries')
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(files):z.write(p,'agent-canary-competition/'+p.relative_to(base).as_posix())
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None
 record={'status':'VERIFIED_FILE_BOUNDARY','entries':len(z.namelist()),'bytes':zip_path.stat().st_size,'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'commercialImplementationFiles':bad,'includesThirdPartyNotices':True,'independentExtractionTest':'PENDING'}
previous=E/'v2-free-archive.json'
if previous.exists():
 old=json.loads(previous.read_text(encoding='utf-8'))
 if old.get('sha256')==record['sha256']:
  for key in ['extractedArchiveInstallBuildSelfTest','mcpStdioInterop']: 
   if key in old:record[key]=old[key]
  if old.get('extractedArchiveInstallBuildSelfTest')=='VERIFIED':record['independentExtractionTest']='VERIFIED'
previous.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
render=E/'v2-pdf-pages';render.mkdir(exist_ok=True)
poppler=Path(os.environ['LOCALAPPDATA']).parent/'.cache' # explicit installed executable below
exe=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
pdfs=[]
for stem in ['Agent_Canary_2_0_项目介绍','Agent_Canary_2_0_技术创新','Agent_Canary_2_0_真实模型实验']:
 pdf=SUB/(stem+'.pdf');reader=PdfReader(pdf);texts=[p.extract_text() for p in reader.pages]
 assert all(len(t)>60 for t in texts),'EMPTY_PDF_PAGE'
 assert all('\ufffd' not in t for t in texts),'BROKEN_FONT_TEXT'
 subprocess.run([str(exe),'-r','70','-png',str(pdf),str(render/stem)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 images=sorted(render.glob(stem+'-*.png'),key=lambda p:int(p.stem.rsplit('-',1)[-1]));assert len(images)==len(reader.pages)
 thumbw,thumbh=300,440;cols=4;rows=(len(images)+cols-1)//cols
 sheet=Image.new('RGB',(cols*thumbw,rows*(thumbh+25)), '#dce2ec');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(images):
  im=Image.open(p).convert('RGB');im.thumbnail((thumbw-12,thumbh));x=(i%cols)*thumbw+(thumbw-im.width)//2;y=(i//cols)*(thumbh+25)
  sheet.paste(im,(x,y));draw.text(((i%cols)*thumbw+10,y+thumbh+3),'Page '+str(i+1),fill='#172334')
 contact=E/(stem+'-contact.png');sheet.save(contact)
 pdfs.append({'file':pdf.name,'pages':len(reader.pages),'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'allPagesRendered':True,'chineseTextExtracted':True,'contactSheet':contact.name,'visualReview':'PENDING'})
(E/'v2-pdf-verification.json').write_text(json.dumps({'pdfs':pdfs},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pdfPages':[p['pages'] for p in pdfs],'archiveEntries':record['entries']}))
