from pathlib import Path
import subprocess, json, hashlib
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2];SUB=ROOT/'competition-submission';E=SUB/'evidence';VIDEO=SUB/'Agent_Canary_Round4_Demo.mp4'
BIN=Path('C:/Users/36712/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin')
data=json.loads((E/'round4-video-recording.json').read_text(encoding='utf-8'));out=ROOT/'tmp/round4-video';out.mkdir(parents=True,exist_ok=True)
probe=json.loads(subprocess.check_output([str(BIN/'ffprobe.exe'),'-v','error','-show_streams','-show_format','-of','json',str(VIDEO)],creationflags=subprocess.CREATE_NO_WINDOW))
stream=next(s for s in probe['streams'] if s['codec_type']=='video');assert stream['codec_name']=='h264' and stream['width']==1920 and stream['height']==1080
duration=float(probe['format']['duration']);assert 180<=duration<=300
decode=subprocess.run([str(BIN/'ffmpeg.exe'),'-v','error','-i',str(VIDEO),'-f','null','NUL'],capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW);assert decode.returncode==0 and not decode.stderr
sheet=Image.new('RGB',(1440,5*290),'#e7edf4');draw=ImageDraw.Draw(sheet)
for i,scene in enumerate(data['scenes']):
 at=min(duration-1,scene['at']/1000+5);f=out/f'scene-{i+1}.png'
 subprocess.run([str(BIN/'ffmpeg.exe'),'-v','error','-y','-ss',str(at),'-i',str(VIDEO),'-frames:v','1',str(f)],check=True,creationflags=subprocess.CREATE_NO_WINDOW)
 im=Image.open(f);im.thumbnail((700,265));x=(i%2)*720+10;y=(i//2)*290+20;sheet.paste(im,(x,y));draw.text((x,y-15),f'scene {i+1}, {at:.1f}s',fill='#172238')
sheet.save(E/'round4-video-contact.png')
record={'file':VIDEO.name,'seconds':duration,'bytes':VIDEO.stat().st_size,'sha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'codec':stream['codec_name'],'width':stream['width'],'height':stream['height'],'fullDecode':'VERIFIED','renderedActualSceneFrames':len(data['scenes']),'contentMode':'actual Chromium UI recording, virtual tools, one real local model analysis; not OS desktop','audio':'none; authored visible Chinese subtitles','oldVideoPreserved':(SUB/'Agent_Canary_AI_Demo.mp4').exists(),'publicPlayback':'NOT VERIFIED until GitHub upload and actual browser load'}
(E/'round4-video-verification.json').write_bytes((json.dumps(record,indent=2)+'\n').encode('utf-8'));print(json.dumps(record))
