"""Build a new free candidate from the verified public ZIP without replacing it."""
from pathlib import Path
import json,zipfile,tempfile,shutil,subprocess,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'competition-submission/evidence'
node,npm,download,sha=sys.argv[1:5]
assert __import__('re').fullmatch('[0-9a-f]{40}',sha),'Pass the exact source commit SHA'
original=Path(download)/'Agent_Canary_Competition_2_0.zip'
assert hashlib.sha256(original.read_bytes()).hexdigest()=='a70b0e1a22ad9c0be56732ad47d7b11734a5741955fbc34b6342ff29a2a060b6'
temp=Path(tempfile.mkdtemp(prefix='Agent Canary 中文 Candidate '));root=temp/'agent-canary-competition'
with zipfile.ZipFile(original) as z:
 assert all(n.startswith('agent-canary-competition/') and '..' not in Path(n).parts for n in z.namelist());z.extractall(temp)
shutil.copy2(ROOT/'src/file-state-store.ts',root/'src/file-state-store.ts')
sdk=root/'src/sdk.ts';sdk.write_text(sdk.read_text(encoding='utf-8')+"\nexport {createFileContainmentStateStore} from './file-state-store.js';\n",encoding='utf-8')
shutil.copy2(ROOT/'docs/FILE_STATE_STORE.md',root/'docs/FILE_STATE_STORE.md')
for name in ['build-v2-report.mjs','run-agent-eval.mjs','benchmark-v2.mjs','stability-v2.mjs']:shutil.copy2(ROOT/'competition-submission/lab'/name,root/'competition-submission/lab'/name)
shutil.copy2(E/'readiness-final-summary.json',root/'competition-submission/evidence/v2-summary.json')
meta={'product':'Agent Canary 2.0 readiness candidate','sourceChangesCommit':sha,'modelEvaluatedBaseline':'73cfdf990e7de669d5ffdb47ae56f5041ad4d31b','originalRelease':'v2.0.0-competition-preview.1','privatePackageVersion':'1.2.7 (legacy metadata, not an npm 2.0 release)','commercialModules':'excluded by positive list','distribution':'unpublished candidate, not stable'}
(root/'FREE_BUILD_VERSION.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
record={'date':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'version':meta,'checks':[]}
env=dict(__import__('os').environ);env['AGENT_CANARY_HOME']=str(temp/'test-state');env['AGENT_CANARY_ALERT']='false'
for k in list(env):
 if any(x in k.upper() for x in ['API_KEY','SECRET','TOKEN','PASSWORD','WECHAT_','ALIPAY_','EPAY_','VMQ_']):env.pop(k)
for name,args in [('ci',[npm,'ci']),('build',[npm,'run','build']),('self-test',[npm,'test']),('audit',[npm,'audit','--json'])]:
 with (E/('readiness-free-'+name+'.log')).open('w',encoding='utf-8') as log:code=subprocess.call([node]+args,cwd=root,env=env,stdout=log,stderr=log)
 record['checks'].append({'id':name,'exitCode':code,'status':'VERIFIED' if code==0 else 'FAILED'});assert code==0,name
probe="import fs from 'node:fs';import path from 'node:path';import {createAgentGuard,createFileContainmentStateStore} from './dist/sdk.js';fs.mkdirSync(process.env.AGENT_CANARY_HOME,{recursive:true});const file=path.join(process.env.AGENT_CANARY_HOME,'state.json');const s=createFileContainmentStateStore(file,{initialize:true});const g=createAgentGuard({alert:false,principalId:'fixture',stateStore:s});g.trip({reason:'fixture'});const next=createAgentGuard({alert:false,principalId:'fixture',stateStore:createFileContainmentStateStore(file)});if(next.state!=='QUARANTINED'||next.beforeToolCall({name:'read'}).allowed)throw Error('PERSISTENCE_FAILED');"
subprocess.run([node,'--input-type=module','-e',probe],cwd=root,env=env,check=True,stdout=subprocess.DEVNULL)
record['persistedQuarantine']='VERIFIED';out=ROOT/'competition-submission/Agent_Canary_Competition_2_0_Readiness.zip';files=[]
for p in root.rglob('*'):
 if not p.is_file() or 'node_modules' in p.parts:continue
 rel=p.relative_to(root).as_posix()
 if any(x in rel.split('/') for x in ['sponsor','data','.env']) or rel in ['src/license.ts','dist/license.js','src/dashboard.ts','dist/dashboard.js','src/export.ts','dist/export.js'] or rel.startswith(('src/eval/','dist/eval/')):raise RuntimeError('COMMERCIAL_FILE_PRESENT')
 files.append(p)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(files):z.write(p,'agent-canary-competition/'+p.relative_to(root).as_posix())
record.update(status='VERIFIED',archive=out.name,entries=len(files),sha256=hashlib.sha256(out.read_bytes()).hexdigest(),bytes=out.stat().st_size,sourceSHA=sha)
(E/'readiness-free-candidate.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8');print(json.dumps(record))
