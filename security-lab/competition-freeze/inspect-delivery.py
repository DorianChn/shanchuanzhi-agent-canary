import hashlib,json,statistics
from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image,ImageDraw

root=Path(__file__).resolve().parents[2]
out=root/'competition-submission/3.0-final';qa=root/'security-lab/competition-freeze/pdf-qa';qa.mkdir(exist_ok=True)
records=[]
for f in sorted(out.glob('*.pdf')):
    reader=PdfReader(f);doc=pdfium.PdfDocument(str(f));thumbs=[]
    for i,page in enumerate(doc):
        text=reader.pages[i].extract_text()
        image=page.render(scale=1.5).to_pil().convert('RGB')
        image.save(qa/(f.stem+'-page-'+str(i+1)+'.png'))
        thumb=image.copy();thumb.thumbnail((300,430));thumbs.append((thumb,i+1))
        records.append({'file':f.name,'page':i+1,'textChars':len(text),'containsFreezeFooter':'99660b36' in text,'replacementCharacters':text.count('\ufffd')})
    sheet=Image.new('RGB',(300*4,460*((len(thumbs)+3)//4)),'#dbe3ed');draw=ImageDraw.Draw(sheet)
    for j,(im,index)in enumerate(thumbs):
        x,y=j%4*300,j//4*460;sheet.paste(im,(x,y));draw.text((x+5,y+435),'Page '+str(index),fill='black')
    sheet.save(qa/(f.stem+'-contact.png'))
(qa/'pdf-text-validation.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
data=json.loads((root/'security-lab/evidence/2026-10-11T15-04-14-292Z/results.json').read_text(encoding='utf-8'))
details={}
for arm in ['A','F']:
    trials=[t for t in data['trials']if t['arm']==arm];calls=[c for t in trials for c in t['trace']];reviews=[r for t in trials for r in t['reviews']]
    details[arm]={'attackSuccess':data['metrics'][arm]['attackSuccess'],'normalSuccess':data['metrics'][arm]['normalTaskSuccess'],'dangerousEffects':[{ 'scenario':t['scenario'],'sideEffects':t['sideEffects']}for t in trials if t['attack']and t['success']], 'denials':[{'scenario':t['scenario'],'calls':[{'name':c['name'],'reason':c['reason']}for c in t['trace']if c['status']=='REJECTED']}for t in trials if any(c['status']=='REJECTED'for c in t['trace'])],'callCount':len(calls),'callMedianMs':statistics.median([c['durationMs']for c in calls])if calls else None,'trialMedianMs':statistics.median([t['durationMs']for t in trials]),'agentTokens':{'input':sum(t['inputTokens']for t in trials),'output':sum(t['outputTokens']for t in trials)},'reviewCount':len(reviews),'reviewMedianMs':statistics.median([r['durationMs']for r in reviews])if reviews else None,'rssEndRangeBytes':[min(t['resources']['endRSS']for t in trials),max(t['resources']['endRSS']for t in trials)]}
(root/'security-lab/competition-freeze/holdout-metrics-detail.json').write_text(json.dumps(details,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pdfPages':len(records),'textChecks':all(r['textChars']>100 and r['containsFreezeFooter'] and r['replacementCharacters']==0 for r in records),'metrics':details},ensure_ascii=True))
