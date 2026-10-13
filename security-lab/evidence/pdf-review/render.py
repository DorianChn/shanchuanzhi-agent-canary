from pathlib import Path
import subprocess,json
from pypdf import PdfReader
from PIL import Image,ImageDraw
root=Path.cwd();out=root/'security-lab/evidence/pdf-review';meta=[]
exe='C:/Users/36712/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
for i,p in enumerate(sorted((root/'competition-submission/3.0').glob('*.pdf'))):
 r=PdfReader(p);prefix=out/('pdf'+str(i));subprocess.run([exe,'-scale-to','900','-png',str(p),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 texts=[x.extract_text() or '' for x in r.pages];meta.append({'file':p.name,'pages':len(r.pages),'allPagesContainText':all(texts),'characters':sum(map(len,texts))})
imgs=sorted(out.glob('pdf*.png'));sheet=Image.new('RGB',(1200,((len(imgs)+3)//4)*450),'#dddddd');d=ImageDraw.Draw(sheet)
for i,p in enumerate(imgs):
 im=Image.open(p).convert('RGB');im.thumbnail((285,415));x=(i%4)*300;y=(i//4)*450;sheet.paste(im,(x,y+20));d.text((x,y),p.name,fill='black')
sheet.save(out/'contact-sheet.jpg');(out/'results.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(meta,ensure_ascii=True))
