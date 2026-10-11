"""Read-only ZIP integrity and fresh Windows install; no source checkout runtime."""
from pathlib import Path
import zipfile,tempfile,json,hashlib,subprocess,argparse,shutil
p=argparse.ArgumentParser();p.add_argument('--artifact',default='competition-submission/3.0/Agent_Canary_3_0_Community_Preview_9f00b6ba.zip');p.add_argument('--report',default='security-lab/evidence/artifact-install.json');p.add_argument('--node',default=shutil.which('node')or'node');p.add_argument('--npm-cli');a=p.parse_args()
if not a.npm_cli:
 node=Path(a.node).resolve();npm=shutil.which('npm');candidates=[node.parent/'node_modules/npm/bin/npm-cli.js']
 if npm:candidates.extend([Path(npm).resolve(),Path(npm).parent/'node_modules/npm/bin/npm-cli.js'])
 a.npm_cli=next((str(c)for c in candidates if c.is_file()and c.name=='npm-cli.js'),None)
if not a.npm_cli:p.error('Cannot locate npm-cli.js; provide --node and --npm-cli absolute paths')
if (Path.cwd()/a.report).exists():p.error('Report already exists; choose a new output name to preserve evidence')
root=Path.cwd();artifact=root/a.artifact;stage=Path(tempfile.mkdtemp(prefix='Canary 3 普通用户 中文 path '));results={}
with zipfile.ZipFile(artifact)as z:
 for n in z.namelist():
  parts=Path(n).parts
  if '..'in parts or Path(n).is_absolute()or parts[0]!='agent-canary-community-3':raise RuntimeError('Unsafe ZIP path')
 z.extractall(stage)
cwd=stage/'agent-canary-community-3';manifest=json.loads((cwd/'SOURCE_MANIFEST.json').read_text(encoding='utf-8'));mismatch=[n for n,h in manifest.items()if hashlib.sha256((cwd/n).read_bytes()).hexdigest()!=h]
if mismatch:raise RuntimeError('Manifest mismatch')
for cmd in [['ci'],['run','build'],['run','self-test']]:
 p=subprocess.run([a.node,a.npm_cli,*cmd],cwd=cwd,encoding='utf-8',errors='replace',text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);results[' '.join(cmd)]={'exitCode':p.returncode,'output':p.stdout}
 if p.returncode:break
out={'artifactSHA256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'manifestFiles':len(manifest),'manifestMismatch':mismatch,'freshExtractedDirectory':str(cwd),'scope':'fresh extracted ZIP under Chinese and space path; current user, not separate clean VM','steps':results}
(root/a.report).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'manifestFiles':len(manifest),'steps':{k:v['exitCode']for k,v in results.items()}},ensure_ascii=True));raise SystemExit(int(any(v['exitCode']for v in results.values())))
