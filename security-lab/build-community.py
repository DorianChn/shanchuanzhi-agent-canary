"""Independent positive-list 3.0 candidate. Never modifies the legacy npm/Docker package."""
import argparse, hashlib, json, subprocess, tempfile, zipfile, sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--node',required=True);p.add_argument('--npm-cli',required=True);p.add_argument('--sha',required=True);p.add_argument('--candidate-id',default='engineering-preview.1');p.add_argument('--output-dir',default='competition-submission/3.0');a=p.parse_args()
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent.parent
if len(a.sha)!=40 or any(c not in '0123456789abcdef' for c in a.sha):raise SystemExit('Exact source SHA required')
if not a.candidate_id or len(a.candidate_id)>64 or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789.-' for c in a.candidate_id):raise SystemExit('Invalid candidate identifier')
seed=root/'competition-submission/Agent_Canary_Competition_2_0_Readiness.zip'
if hashlib.sha256(seed.read_bytes()).hexdigest()!='57db33063111f45860f9317b6bcaa493fe9949abc50a4fcb0b6fc7fc64ae4b22':raise SystemExit('Verified 2.0 seed digest mismatch')
stage=Path(tempfile.mkdtemp(prefix='Agent Canary 3 中文 Community '))/ 'agent-canary-community-3';stage.mkdir()
with zipfile.ZipFile(seed) as z:
 for info in z.infolist():
  parts=Path(info.filename).parts
  if not parts or parts[0]!='agent-canary-competition' or '..' in parts:raise SystemExit('Unexpected seed path')
  relative=Path(*parts[1:])
  if relative.parts and relative.parts[0]=='dist':continue
  dest=stage/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(info))
for relative in ['src/competition.ts','src/agent-hook.ts','competition-submission/lab/agent-hook.mjs','src/file-state-store.ts','src/ai/console.ts','src/ai/console-page.ts','src/runtime/gateway.ts','src/runtime/evidence.ts','src/runtime/honeypot.ts','src/runtime/dataflow.ts','src/runtime/demo.ts','test/product-identity.test.ts','test/file-state-store.test.ts','test/gateway.test.ts','test/honeypot-runtime.test.ts','test/runtime-console.test.ts','test/evidence-conformance.test.ts','test/evidence-vectors.json','test/gateway-acceptance.test.ts','security-lab/evidence.schema.json','security-lab/run-sdk-agent.mjs','security-lab/holdout-v1.json','security-lab/holdout-protocol.md','packaging/ubuntu/install.sh','packaging/ubuntu/install.mjs','scripts/claude-hook-preview.mjs']:
 dest=stage/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((root/relative).read_bytes())
for f in (root/'docs/3.0').glob('*.md'):
 if f.name=='PR_BODY.md':continue
 dest=stage/'docs/3.0'/f.name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(f.read_bytes())
summary=root/'security-lab/evidence/console-summary.json'
if summary.exists():dest=stage/'security-lab/evidence/console-summary.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(summary.read_bytes())
correction=root/'security-lab/evidence/SOURCE_PROVENANCE_CORRECTIONS.json'
if correction.exists():dest=stage/'security-lab/evidence/SOURCE_PROVENANCE_CORRECTIONS.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(correction.read_bytes())
sdk=stage/'src/sdk.ts';text=sdk.read_text(encoding='utf-8')
for line in (root/'src/sdk.ts').read_text(encoding='utf-8').splitlines():
 if "from './runtime/" in line:text+='\n'+line
sdk.write_text(text+'\n',encoding='utf-8')
pkg=json.loads((stage/'package.json').read_text());pkg['version']='3.0.0-'+a.candidate_id;pkg['private']=True
pkg['exports']['./sdk']={'types':'./dist/sdk.d.ts','import':'./dist/sdk.js','default':'./dist/sdk.js'}
(stage/'tsconfig.json').write_bytes((root/'tsconfig.json').read_bytes())
(stage/'scripts').mkdir(exist_ok=True)
(stage/'scripts/check-sdk-types.mjs').write_bytes((root/'scripts/check-sdk-types.mjs').read_bytes())
(stage/'reproduction-kit').mkdir(exist_ok=True)
for name in ['run-offline-demo.mjs','verify-community-manifest.mjs','RESULT_RECEIPT_TEMPLATE.md']:
 (stage/'reproduction-kit'/name).write_bytes((root/'competition-submission/roadshow-3.0/reproduction-kit'/name).read_bytes())
pkg['scripts']['types:check']='node scripts/check-sdk-types.mjs'
pkg['scripts']['acceptance:offline']='npm run self-test && npm run types:check && node reproduction-kit/run-offline-demo.mjs --root=.'
pkg['scripts']['test']='node --import tsx --test test/gateway.test.ts test/honeypot-runtime.test.ts test/runtime-console.test.ts test/file-state-store.test.ts test/evidence-conformance.test.ts test/gateway-acceptance.test.ts test/product-identity.test.ts'
pkg['scripts']['self-test']='node dist/competition.js self-test --json'
(stage/'package.json').write_text(json.dumps(pkg,indent=2)+'\n')
lock=json.loads((root/'package-lock.json').read_text(encoding='utf-8'))
lock_root=lock.get('packages',{}).get('',{})
if lock.get('name')!=pkg.get('name') or lock_root.get('name')!=pkg.get('name'):raise SystemExit('Community package lock name mismatch')
for field in ('dependencies','devDependencies','optionalDependencies'):
 if lock_root.get(field,{})!=pkg.get(field,{}):raise SystemExit('Community package lock '+field+' mismatch')
lock['version']=pkg['version'];lock_root['version']=pkg['version'];(stage/'package-lock.json').write_text(json.dumps(lock,indent=2)+'\n',encoding='utf-8')
version={'product':'Agent Canary 3.0 Community Engineering Preview','sourceSHA':a.sha,'seedSHA256':hashlib.sha256(seed.read_bytes()).hexdigest(),'license':'MIT','scope':'curated free entry and SDK, no legacy license/dashboard/eval/export commercial modules','notStable':True,'runtimeBaselineSHA':'99660b36db9d5b1121eea6fe06b026c5f1e36bcf','candidateId':a.candidate_id,'securityRuntimeModified':True,'repair':'Explicit product identity, Hook module-load denial, and recheck held file identity before effects; historical experiments are not relabelled as this build'}
(stage/'FREE_BUILD_VERSION.json').write_text(json.dumps(version,indent=2)+'\n')
for readme in ['README.md','README.zh-CN.md']:
 f=stage/readme;f.write_text('# Agent Canary 3.0 Community Engineering Preview\n\nSource: '+a.sha+'\n\n本候选内置dist/sdk.d.ts和类型导出；原candidate.1及其已发送材料保持不变。快速复验：npm ci → npm run build → npm run acceptance:offline。另人独立环境真实运行后才可能支持E4，目前NOT_VERIFIED。\n\n独立免费候选，MIT；不是稳定版，不保护未接入的工具。真实模型结果见 docs/3.0，AI 独立收益与自适应蜜罐收益尚未测得。\n\n`npm ci` → `npm run build` → `npm test` → `npm run self-test` → `npm run ai:console`。\n\n原有文档（2.0 历史基线）：\n\n'+f.read_text(encoding='utf-8'),encoding='utf-8')
logs={}
for cmd in [['ci'],['run','build'],['test'],['run','self-test'],['run','types:check'],['run','acceptance:offline'],['audit','--json']]:
 r=subprocess.run([a.node,a.npm_cli,*cmd],cwd=stage,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf-8',errors='replace');logs[' '.join(cmd)]={'exitCode':r.returncode,'output':r.stdout}
 if r.returncode:break
out=(root/a.output_dir).resolve()
if not out.is_relative_to(root/'competition-submission'):raise SystemExit('Output must stay within competition-submission')
out.mkdir(parents=True,exist_ok=True)
logfile=out/('community-build-'+a.sha[:8]+'.json')
with logfile.open('x',encoding='utf-8')as f:json.dump({'version':version,'temporaryBuild':str(stage),'steps':logs},f,ensure_ascii=False,indent=2)
if any(v['exitCode']for v in logs.values()):raise SystemExit('Community validation failed; logs preserved')
if not (stage/'dist/sdk.d.ts').is_file():raise SystemExit('Public SDK declaration missing')
included=[]
for file in sorted(stage.rglob('*')):
 if not file.is_file():continue
 rel=file.relative_to(stage)
 if 'node_modules' in rel.parts:continue
 if any(p in ['sponsor','license.ts','license.js','license.d.ts','dashboard.ts','dashboard.js','dashboard.d.ts','export.ts','export.js','export.d.ts','eval']for p in rel.parts):raise SystemExit('Commercial boundary violation: '+str(rel))
 if any(p=='.env' or p.startswith('.env.') or p.endswith('.key')or p.endswith('.pem')for p in rel.parts):raise SystemExit('Sensitive path: '+str(rel))
 included.append((file,rel))
manifest={str(rel).replace('\\','/'):hashlib.sha256(file.read_bytes()).hexdigest()for file,rel in included}
(stage/'SOURCE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n');included.append((stage/'SOURCE_MANIFEST.json',Path('SOURCE_MANIFEST.json')))
artifact=out/('Agent_Canary_3_0_Community_Preview_'+a.sha[:8]+'.zip')
with zipfile.ZipFile(artifact,'x',zipfile.ZIP_DEFLATED)as z:
 for file,rel in included:z.write(file,str(Path('agent-canary-community-3')/rel))
print(json.dumps({'file':str(artifact),'sha256':hashlib.sha256(artifact.read_bytes()).hexdigest(),'files':len(included),'sourceSHA':a.sha,'status':'VERIFIED_POSITIVE_LIST_BUILD'},ensure_ascii=False))
