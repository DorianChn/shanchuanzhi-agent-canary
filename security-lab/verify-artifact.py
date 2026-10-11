"""Read-only ZIP integrity and fresh Windows install; no source checkout runtime."""
from pathlib import Path
import zipfile,tempfile,json,hashlib,subprocess
root=Path.cwd();artifact=root/'competition-submission/3.0/Agent_Canary_3_0_Community_Preview_9f00b6ba.zip';stage=Path(tempfile.mkdtemp(prefix='Canary 3 普通用户 中文 path '));results={}
with zipfile.ZipFile(artifact)as z:
 for n in z.namelist():
  parts=Path(n).parts
  if '..'in parts or Path(n).is_absolute()or parts[0]!='agent-canary-community-3':raise RuntimeError('Unsafe ZIP path')
 z.extractall(stage)
cwd=stage/'agent-canary-community-3';manifest=json.loads((cwd/'SOURCE_MANIFEST.json').read_text());mismatch=[n for n,h in manifest.items()if hashlib.sha256((cwd/n).read_bytes()).hexdigest()!=h]
if mismatch:raise RuntimeError('Manifest mismatch')
for cmd in [['ci'],['run','build'],['run','self-test']]:
 p=subprocess.run(['C:/Users/36712/AppData/Local/hermes/node/node.exe','C:/Users/36712/AppData/Local/hermes/node/node_modules/npm/bin/npm-cli.js',*cmd],cwd=cwd,encoding='utf-8',errors='replace',text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);results[' '.join(cmd)]={'exitCode':p.returncode,'output':p.stdout}
 if p.returncode:break
out={'artifactSHA256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'manifestFiles':len(manifest),'manifestMismatch':mismatch,'freshExtractedDirectory':str(cwd),'scope':'fresh extracted ZIP under Chinese and space path; current user, not separate clean VM','steps':results}
(root/'security-lab/evidence/artifact-install.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'manifestFiles':len(manifest),'steps':{k:v['exitCode']for k,v in results.items()}},ensure_ascii=True));raise SystemExit(int(any(v['exitCode']for v in results.values())))
