"""Check and render actual competition artifacts; does not fabricate visual QA.
Requires pypdf and installed Poppler/FFmpeg. Set POPPLER_PATH/FFMPEG_PATH.
"""
import hashlib,json,os,subprocess,tempfile
from pathlib import Path
from pypdf import PdfReader

root=Path(__file__).resolve().parents[2]
materials=root/'competition-submission'
evidence=materials/'evidence'
render=Path(tempfile.mkdtemp(prefix='agent-canary-artifact-qa-'))
poppler=os.environ.get('POPPLER_PATH','pdftoppm')
ffmpeg=os.environ.get('FFMPEG_PATH','ffmpeg')
ffprobe=str(Path(ffmpeg).with_name('ffprobe.exe')) if ffmpeg.endswith('.exe') else 'ffprobe'
checks=[]
for prefix,filename,expected in [('project','Agent_Canary_项目介绍.pdf',17),('report','Agent_Canary_实验报告.pdf',7)]:
    pdf=materials/filename
    pages=PdfReader(pdf).pages
    texts=[page.extract_text() or '' for page in pages]
    assert len(pages)==expected and all(t.strip() for t in texts)
    assert 'AI' in ''.join(texts) and '152' in ''.join(texts)
    subprocess.run([poppler,'-scale-to','1000','-png',str(pdf),str(render/prefix)],check=True,capture_output=True)
    checks.append(dict(file=filename,pages=len(pages),bytes=pdf.stat().st_size,sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),emptyPages=[],AIContent=True,mentions152Tests=True))
pdf_result=dict(files=checks,renderedPages=sum(x['pages'] for x in checks),visualReview='PENDING_MANUAL_REVIEW')
(evidence/'ai-pdf-verification.json').write_text(json.dumps(pdf_result,ensure_ascii=False,indent=2),encoding='utf-8')
video=materials/'Agent_Canary_AI_Demo.mp4'
probe=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_entries','format=duration,size:stream=codec_name,width,height','-of','json',str(video)]))
assert any(s.get('width')==1920 and s.get('height')==1080 for s in probe['streams'])
assert 180<=float(probe['format']['duration'])<=300
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-i',str(video),'-f','null','-'],check=True,capture_output=True)
for t in [90,125,175,200]:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-ss',str(t),'-i',str(video),'-frames:v','1','-y',str(render/f'video-{t}.png')],check=True,capture_output=True)
result=dict(file=video.name,probe=probe,sha256=hashlib.sha256(video.read_bytes()).hexdigest(),fullDecodeExitCode=0,frameReview='PENDING_MANUAL_REVIEW',publicURLVerification='PENDING_PUSH',audio='none; visible Chinese explanatory subtitles')
(evidence/'ai-video-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(renderDirectory=str(render),pdfPages=sum(x['pages'] for x in checks),videoDuration=probe['format']['duration']),ensure_ascii=False))
