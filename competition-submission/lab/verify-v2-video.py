from pathlib import Path
import json,subprocess,hashlib
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[2];S=R/'competition-submission';E=S/'evidence'
native=Path.home()/'AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin'
v=S/'Agent_Canary_2_0_Demo.mp4';record=json.loads((E/'v2-video-recording.json').read_text(encoding='utf-8'))
probe=json.loads(subprocess.check_output([str(native/'ffprobe.exe'),'-v','error','-show_entries','format=duration:stream=width,height,codec_type','-of','json',str(v)],text=True))
stream=next(s for s in probe['streams'] if s['codec_type']=='video');assert (stream['width'],stream['height'])==(1920,1080)
subprocess.run([str(native/'ffmpeg.exe'),'-v','error','-i',str(v),'-f','null','-'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
assert hashlib.sha256(v.read_bytes()).hexdigest()==record['sha256']
frames=E/'v2-video-frames';frames.mkdir(exist_ok=True);contact=Image.new('RGB',(1920,500),'#dce2ec');draw=ImageDraw.Draw(contact)
for i,scene in enumerate(record['scenes']):
 at=min(scene['at']/1000+5,float(probe['format']['duration'])-1);dest=frames/('scene-'+str(i+1)+'.png')
 subprocess.run([str(native/'ffmpeg.exe'),'-v','error','-y','-ss',str(at),'-i',str(v),'-frames:v','1',str(dest)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 image=Image.open(dest).convert('RGB');image.thumbnail((384,216));x=(i%5)*384;y=(i//5)*250;contact.paste(image,(x,y));draw.text((x+8,y+224),'Scene '+str(i+1)+' / '+str(round(at,1))+' sec',fill='#172334')
contact.save(E/'v2-video-contact.png');record['fullDecode']='VERIFIED';record['sceneFrames']=len(record['scenes']);record['visualReview']='PENDING';record['explicitReviewTimeoutMs']=60000;record['initialAttempt']='v2-video-failure.json preserved; default 10s review did not return validated result; recording retry uses explicit 60s host budget, not changed experiment definition'
(E/'v2-video-recording.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'fullDecode':'VERIFIED','scenes':len(record['scenes']),'duration':probe['format']['duration']}))
