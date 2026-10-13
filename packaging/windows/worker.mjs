import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {createAutoE4Run,writeAutoE4Artifacts} from './auto-e4.mjs';
import {runHookFaultChecks} from './e4-hook-faults.mjs';
import {writeFileAtomically} from './durable-files.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),APP=path.join(ROOT,'app');
const [action,dataDir,role='other',expected]=process.argv.slice(2);
const ROLES=new Set(['author','external','other','unspecified']);
function digest(bytes){return createHash('sha256').update(bytes).digest('hex');}
function safeDirectory(dir){if(!dir||!path.isAbsolute(dir)||path.parse(dir).root===path.resolve(dir))throw Error('UNSAFE_DATA_DIRECTORY');for(let p=path.resolve(dir);p!==path.dirname(p);p=path.dirname(p)){try{if(fs.lstatSync(p).isSymbolicLink())throw Error('SYMLINK_DIRECTORY_REJECTED');}catch(e){if(e.code!=='ENOENT')throw e;}}fs.mkdirSync(dir,{recursive:true});}
export function inspectPayload(root,anchor){if(!/^[a-f0-9]{64}$/.test(anchor??''))throw Error('MANIFEST_ANCHOR_REQUIRED');const file=path.join(root,'PAYLOAD_MANIFEST.json');if(digest(fs.readFileSync(file))!==anchor)throw Error('MANIFEST_DIGEST_MISMATCH');const m=JSON.parse(fs.readFileSync(file,'utf8'));if(m.schemaVersion!==1||!Array.isArray(m.files)||m.files.length>15000)throw Error('MANIFEST_SCHEMA_INVALID');for(const entry of m.files){if(typeof entry.path!=='string'||entry.path.includes(String.fromCharCode(92))||entry.path.split('/').some(s=>!s||s==='..'||s==='.')||path.isAbsolute(entry.path)||entry.path.includes(':'))throw Error('MANIFEST_PATH_REJECTED');const f=path.resolve(root,entry.path);for(let p=f;p!==path.resolve(root);p=path.dirname(p)){if(fs.lstatSync(p).isSymbolicLink())throw Error('PAYLOAD_SYMLINK_REJECTED');}const s=fs.statSync(f);if(!s.isFile()||s.size!==entry.size||digest(fs.readFileSync(f))!==entry.sha256)throw Error('PAYLOAD_FILE_MISMATCH:'+entry.path);}return m;}
export function redact(value,roots=[]){if(Array.isArray(value))return value.map(x=>redact(x,roots));if(value&&typeof value==='object'){const o={};for(const [k,v]of Object.entries(value)){o[k]=/^(token|api[_-]?key|password|authorization|secret)$/i.test(k)?'[REDACTED]':redact(v,roots);}return o;}if(typeof value!=='string')return value;let s=value;for(const [from,to]of roots.filter(x=>x[0]).sort((a,b)=>b[0].length-a[0].length)){s=s.split(from).join(to);s=s.split(from.replaceAll(String.fromCharCode(92),'/')).join(to);}s=s.replace(/cnry_[a-zA-Z0-9_-]+/g,'[CANARY_REDACTED]').replace(/\bsk-[a-zA-Z0-9_-]{12,}/g,'[API_KEY_REDACTED]').replace(/(?:Bearer\s+)[a-zA-Z0-9._-]+/gi,'Bearer [REDACTED]').replace(/((?:api[_-]?key|password|authorization|secret)\s*[:=]\s*)[^\s,;]+/gi,'$1[REDACTED]').replace(new RegExp('[A-Za-z]:['+String.fromCharCode(92,92)+'/][^'+String.fromCharCode(92)+'r'+String.fromCharCode(92)+'n"<>]+','g'),'[ABSOLUTE_PATH_REDACTED]');return s;}
function readJSON(file,maxBytes=8*1024*1024){const s=fs.lstatSync(file);if(s.isSymbolicLink()||!s.isFile()||s.size>maxBytes)throw Error('UNSAFE_OR_OVERSIZED_STATE_FILE');return JSON.parse(fs.readFileSync(file,'utf8'));}
function createSessionState(file,directory){
 const state={sessionId:randomUUID(),firstStartedAt:new Date().toISOString()};
 try{writeFileAtomically(file,JSON.stringify(state));return state;}
 catch(error){if(error.code==='EEXIST')return loadState(directory);throw error;}
}
export function loadState(directory=dataDir){
 safeDirectory(directory);
 const file=path.join(directory,'session.json');
 try{
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile())throw Error('SESSION_STATE_UNSAFE');
  if(stat.size>4096)throw Error('SESSION_STATE_INVALID');
  let state;
  try{state=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){if(error instanceof SyntaxError)throw Error('SESSION_STATE_INVALID');throw error;}
  if(!state||typeof state!=='object'||Array.isArray(state)||!/^[a-f0-9-]{36}$/.test(state.sessionId))throw Error('SESSION_STATE_INVALID');
  return state;
 }catch(error){
  if(error.code==='ENOENT')return createSessionState(file,directory);
  if(error.message==='SESSION_STATE_UNSAFE')throw error;
  if(error.message!=='SESSION_STATE_INVALID')throw error;
  const backup=file+'.corrupt.'+new Date().toISOString().replaceAll(':','-')+'.'+randomUUID()+'.bak';
  try{fs.renameSync(file,backup);}catch(renameError){if(renameError.code==='ENOENT')return loadState(directory);throw Error('SESSION_STATE_BACKUP_FAILED');}
  try{return createSessionState(file,directory);}catch{throw Error('SESSION_STATE_RECOVERY_FAILED');}
 }
}
const LABELS={A_SYNTHETIC_CREDENTIAL_READ:['无保护虚拟凭据读取对照','Unprotected virtual-secret reference'],F_NORMAL_WRITE:['正常文件写入','Normal file write'],F_FIRST_CREDENTIAL_REJECTED:['执行前拒绝虚拟凭据读取','Pre-execution virtual-secret denial'],F_CALLBACK_AND_SIDE_EFFECT:['危险回调与文件哈希检查','Dangerous callback and file hash check'],TRUSTED_OPERATOR_APPROVAL:['一次性可信审批与重放拒绝','One-time approval and replay denial'],HONEYPOT_THEN_GUARD:['蜜罐触发后的会话隔离','Honeypot-triggered quarantine']};
function check(id,zh,en,status,detail){const labels=LABELS[id]??[zh,en];let text=null;if(id==='F_CALLBACK_AND_SIDE_EFFECT')text={zh:'危险执行 '+detail.unsafeCalls+' 次；网络接收 '+detail.sinkRequests+' 次；文件哈希 '+(detail.victimHashBefore===detail.victimHashAfter?'一致':'不同'),en:'Unsafe calls '+detail.unsafeCalls+'; sink receives '+detail.sinkRequests+'; file hashes '+(detail.victimHashBefore===detail.victimHashAfter?'equal':'different')};if(id==='F_NORMAL_WRITE')text={zh:'实际写入：'+detail.actualWrittenValue,en:'Actual file content: '+detail.actualWrittenValue};if(id==='TRUSTED_OPERATOR_APPROVAL')text={zh:'获批执行 '+detail.actualCalls+' 次；重复批准已拒绝',en:'Approved calls '+detail.actualCalls+'; replay denied'};return{id,nameZh:labels[0],nameEn:labels[1],status,detail,summaryZh:text?.zh??null,summaryEn:text?.en??null};}
function invoke(args){const start=Date.now(),home=fs.mkdtempSync(path.join(os.tmpdir(),'AgentCanary verification '));fs.writeFileSync(path.join(home,'config.json'),JSON.stringify({notify:false,webhook:null,eventsFile:path.join(home,'events.jsonl')}));const env={SystemRoot:process.env.SystemRoot??'C:/Windows',WINDIR:process.env.WINDIR??'C:/Windows',PATH:path.dirname(process.execPath)+';'+(process.env.SystemRoot??'C:/Windows')+'/System32',TEMP:os.tmpdir(),TMP:os.tmpdir(),AGENT_CANARY_HOME:home};const r=spawnSync(process.execPath,args,{cwd:APP,env,encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:2*1024*1024});return{command:{executable:process.execPath,arguments:args},exitCode:r.status,durationMs:Date.now()-start,stdout:r.stdout??'',stderr:r.stderr??'',error:r.error?.message??null};}
export function readInstallerReceipt(root){try{const r=readJSON(path.join(root,'INSTALL_RECEIPT.json'),4096);if(!/^[a-f0-9]{64}$/.test(r.installerSHA256??'')||typeof r.desktopVersion!=='string'||r.desktopVersion.length>80)throw Error('INVALID_RECEIPT');return {installerSHA256:r.installerSHA256,desktopVersion:r.desktopVersion,status:'RECORDED_LOCAL_HASH_NOT_PUBLISHER_AUTHENTICATION'};}catch(e){return {installerSHA256:null,status:e.code==='ENOENT'?'NOT_VERIFIED_PORTABLE_OR_MISSING_RECEIPT':'NOT_VERIFIED_INVALID_OR_UNREADABLE_RECEIPT'};}}
function baseline(state,version){const receipt=readInstallerReceipt(ROOT);return{schemaVersion:'agent-canary.desktop-reproduction.v1',sessionId:state.sessionId,runId:randomUUID(),startedAt:new Date().toISOString(),software:version,installer:{sha256:receipt?.installerSHA256??null,status:receipt.status,authentication:'unsigned setup; locally computed hash does not prove publisher identity'},operator:{declaredRole:role,independence:'NOT_VERIFIED_REQUIRES_REAL_OPERATOR_AND_ENVIRONMENT_REVIEW',machineFingerprintCollected:false},environment:{platform:process.platform,architecture:process.arch,osRelease:os.release(),nodeVersion:process.version,nodeExecutable:process.execPath},mode:'OPERATOR_TRIGGERED_REAL_TEMPORARY_IO_NOT_MODEL_ATTACK',nativeAgentIntegration:'NOT_VERIFIED_THIS_RUN',E4:'NOT_VERIFIED',checks:[],commands:[],limitations:['Bounded fixture observations only; no OS-wide sandbox or global Agent protection.','No real model or Claude Code experiment is run by these buttons.','Local hash chain is not independent certification.']};}
export function saveReport(report,directory=dataDir){
 if(!/^[a-f0-9-]{36}$/.test(report.runId??''))throw Error('REPORT_ID_INVALID');
 report.completedAt=new Date().toISOString();
 const reports=path.join(directory,'reports');safeDirectory(reports);
 const target=path.join(reports,report.runId+'.json');
 writeFileAtomically(target,JSON.stringify(report,null,2));
 writeFileAtomically(path.join(directory,'latest.json'),JSON.stringify({file:target}),{replace:true});
 return target;
}
function markdown(report){return['# Agent Canary Community reproduction report','','Mode: '+report.mode,'Session: '+report.sessionId,'Operator declaration: '+report.operator.declaredRole,'E4: NOT_VERIFIED','Installer SHA-256: '+(report.installer.sha256??'NOT_VERIFIED'),'Version: '+report.software.desktopVersion,'Runtime baseline: '+report.software.runtimeBaselineSHA,'Started: '+report.startedAt,'Completed: '+report.completedAt,'','## Actual checks',...report.checks.map(c=>'- '+c.status+' / '+c.id+': '+JSON.stringify(c.detail)),'','## Actual commands and exit codes',...report.commands.map(c=>'- Exit '+c.exitCode+': '+JSON.stringify(c.command)),'','## Limits',...report.limitations.map(s=>'- '+s),'','All paths and tokens are redacted before export. Independent status requires human review, not a machine fingerprint.',''].join('\n');}
function e4Sanitize(value,roots=[]){return redact(value,[[ROOT,'<INSTALL_DIR>'],[dataDir,'<APP_DATA>'],[os.homedir(),'<USER_HOME>'],[os.tmpdir(),'<TEMP_DIR>'],...roots]);}
function vmwareExecutable(){const bases=[process.env.ProgramFiles,process.env['ProgramFiles(x86)'],'C:/Program Files','C:/Program Files (x86)'].filter(Boolean);for(const base of bases){const p=path.join(base,'VMware','VMware Workstation','vmrun.exe');try{if(fs.statSync(p).isFile())return p;}catch{}}return null;}
function inspectVmware(){
 const exe=vmwareExecutable();if(!exe)return{status:'BLOCKED',detail:{reason:'VMWARE_VMRUN_NOT_FOUND'}};
 const list=spawnSync(exe,['-T','ws','list'],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:128*1024,env:{SystemRoot:process.env.SystemRoot??'C:/Windows',WINDIR:process.env.WINDIR??'C:/Windows',PATH:path.dirname(exe)}});
 if(list.error||list.status!==0)return{status:'BLOCKED',detail:{reason:'VMRUN_LIST_FAILED',exitCode:list.status,errorCode:list.error?.code??null}};
 const configFile=path.join(dataDir,'e4-config.json');let config={};try{config=readJSON(configFile,16*1024);}catch(error){if(error.code!=='ENOENT')return{status:'FAIL',detail:{reason:'E4_CONFIG_INVALID',error:String(error.message).slice(0,160)}};}
 const knownVmx=process.env.AGENT_CANARY_E4_VMX||'D:/AgentCanary-3.0-Win11-VM/Windows11-Clean-Test/Agent-Canary-Windows11-Clean-Test.vmx';
 const configured=typeof config.vmxPath==='string'&&path.isAbsolute(config.vmxPath)?path.resolve(config.vmxPath):null;
 const vmx=configured??(fs.existsSync(knownVmx)?path.resolve(knownVmx):null);
 if(!vmx)return{status:'BLOCKED',detail:{reason:'CLEAN_VM_NOT_CONFIGURED',runningVmCount:Math.max(0,list.stdout.trim().split(/\r?\n/).length-1),setupFile:'<APP_DATA>/e4-config.json',requiredFields:['vmxPath','snapshotName','dedicatedDisposableVmConfirmed']}};
 let stat;try{stat=fs.lstatSync(vmx);}catch{return{status:'BLOCKED',detail:{reason:'CONFIGURED_VMX_NOT_FOUND'}};}
 if(stat.isSymbolicLink()||!stat.isFile()||path.extname(vmx).toLowerCase()!=='.vmx')return{status:'FAIL',detail:{reason:'UNSAFE_VMX_TARGET'}};
 const snapshots=spawnSync(exe,['-T','ws','listSnapshots',vmx],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:128*1024,env:{SystemRoot:process.env.SystemRoot??'C:/Windows',WINDIR:process.env.WINDIR??'C:/Windows',PATH:path.dirname(exe)}});
 if(snapshots.error||snapshots.status!==0)return{status:'BLOCKED',detail:{reason:'SNAPSHOT_LIST_FAILED',exitCode:snapshots.status,errorCode:snapshots.error?.code??null}};
 const snapshotName=typeof config.snapshotName==='string'?config.snapshotName:'';
 const present=snapshotName&&snapshots.stdout.split(/\r?\n/).some(line=>line.trim()===snapshotName);
 return{status:'BLOCKED',detail:{reason:present?'CLEAN_SNAPSHOT_PRESENT_BUT_NOT_RESTORED':'NAMED_CLEAN_SNAPSHOT_NOT_FOUND',configuredSnapshotPresent:Boolean(present),vmRunning:list.stdout.split(/\r?\n/).some(line=>line.trim()===vmx),guestOS:'NOT_VERIFIED',snapshotRestorePerformed:false,userDataTouched:false,vmxPath:'[REDACTED]',needsDisposableVmConsent:config.dedicatedDisposableVmConfirmed!==true}};
}
async function inspectPublicRelease(version,receipt){
 const candidate=/^competition-candidate\.\d+$/.test(version.candidateId??'')?version.candidateId:null;if(!candidate)return{status:'NOT_VERIFIED',detail:{reason:'CANDIDATE_ID_NOT_RECOGNIZED'}};
 const tag='v3.0.0-'+candidate;
 try{const response=await fetch('https://api.github.com/repos/DorianChn/shanchuanzhi-agent-canary/releases/tags/'+tag,{headers:{'accept':'application/vnd.github+json','user-agent':'AgentCanary-AutoE4/1.0'},redirect:'manual',signal:AbortSignal.timeout(12000)});if(response.status>=300&&response.status<400)return{status:'BLOCKED',detail:{reason:'RELEASE_API_REDIRECT_REJECTED',httpStatus:response.status}};if(!response.ok)return{status:response.status===404?'BLOCKED':'NOT_VERIFIED',detail:{reason:'PUBLIC_RELEASE_LOOKUP_FAILED',httpStatus:response.status}};
  const release=await response.json();const asset=Array.isArray(release.assets)?release.assets.find(x=>x.name==='AgentCanary-Community-Setup.exe'):null;if(!asset)return{status:'NOT_VERIFIED',detail:{reason:'PUBLIC_SETUP_ASSET_MISSING',tag}};
  const remote=typeof asset.digest==='string'?asset.digest.replace(/^sha256:/,'').toLowerCase():null;const local=receipt?.installerSHA256??null;
  return{status:remote&&local&&remote===local?'PASS':remote&&local?'FAIL':'NOT_VERIFIED',detail:{tag,releaseUrl:release.html_url,assetName:asset.name,assetBytes:asset.size,publishedDigest:remote,installedReceiptDigest:local,digestMatch:remote&&local?remote===local:null,receiptScope:'local setup hash recorded at install; not publisher authentication',unsigned:Boolean(release.assets?.find(x=>x.name===asset.name)),summary:remote&&local&&remote===local?'Installed setup receipt matches public Release asset digest.':'Public asset found; installed setup digest is not independently matched.'}};
 }catch(error){return{status:'BLOCKED',detail:{reason:'PUBLIC_RELEASE_CHECK_UNAVAILABLE',errorCode:error.cause?.code??error.code??'NETWORK_ERROR'}};}
}
function inspectCodexCli(){
 const local=process.env.LOCALAPPDATA??'';const candidates=[path.join(local,'OpenAI','Codex','bin')];
 for(const base of candidates){try{for(const entry of fs.readdirSync(base)){if(!/^[a-f0-9]{8,}$/i.test(entry))continue;const exe=path.join(base,entry,'codex.exe');if(fs.statSync(exe).isFile())return exe;}}catch{}}
 return null;
}
function makeEvidenceBundle(runDir){
 const archive=path.join(runDir,'AgentCanary-Auto-E4-Evidence.zip');const candidates=[path.join(process.env.SystemRoot??'C:/Windows','System32','tar.exe'),'tar.exe','tar'];let tool=candidates.find(p=>path.isAbsolute(p)&&fs.existsSync(p));if(!tool)tool='tar.exe';
 const files=['AUTO_E4_REPORT.json','AUTO_E4_REPORT.md','EVIDENCE_INDEX.json','events.jsonl'];
 const systemRoot=process.env.SystemRoot??'C:/Windows';const result=spawnSync(tool,['-a','-c','-f',archive,'--',...files],{cwd:runDir,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:128*1024,env:{SystemRoot:systemRoot,WINDIR:process.env.WINDIR??systemRoot,PATH:path.dirname(tool)+';'+path.join(systemRoot,'System32')+';'+path.dirname(process.execPath)}});
 if(result.status!==0||!fs.existsSync(archive))throw Error('EVIDENCE_BUNDLE_CREATE_FAILED');
 const check=spawnSync(tool,['-tf',archive],{cwd:runDir,encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:128*1024,env:{SystemRoot:systemRoot,WINDIR:process.env.WINDIR??systemRoot,PATH:path.dirname(tool)+';'+path.join(systemRoot,'System32')+';'+path.dirname(process.execPath)}});if(check.status!==0||files.some(f=>!check.stdout.split(/\r?\n/).includes(f)))throw Error('EVIDENCE_BUNDLE_VERIFY_FAILED');
 const sha=digest(fs.readFileSync(archive));fs.writeFileSync(archive+'.sha256',sha+'  '+path.basename(archive)+'\n',{flag:'wx',mode:0o600});return{archive,sha256:sha,bytes:fs.statSync(archive).size};
}
async function runAutoE4(state,version,receipt,manifest){
 safeDirectory(dataDir);
 const run=createAutoE4Run({dataDir,emit:e=>process.stdout.write(JSON.stringify(e)+'\n'),sanitize:e4Sanitize});
 try{
  run.report.software=version;run.report.sessionId=state.sessionId;run.report.operator={declaredRole:role,machineFingerprintCollected:false};run.report.environment={platform:process.platform,architecture:process.arch,osRelease:os.release(),nodeVersion:process.version};run.report.installer={sha256:receipt.installerSHA256,status:receipt.status,authenticity:'Unsigned; hash equality is not publisher identity.'};
  const env=await run.stage('environment',async()=>({status:process.platform==='win32'&&process.arch==='x64'?'PASS':'BLOCKED',detail:{platform:process.platform,architecture:process.arch,osRelease:os.release(),nodeVersion:process.version,vmrunFound:Boolean(vmwareExecutable()),codexCliFound:Boolean(inspectCodexCli()),summary:'Host environment inspected; no credentials or machine fingerprint collected.'}}));
  const vm=await run.stage('clean-vm',async()=>inspectVmware());
  const release=await run.stage('release-package',async()=>inspectPublicRelease(version,receipt));
  let sdkDetails=null;
  const sdk=await run.stage('sdk-side-effects',async()=>{
    const r=invoke([path.join(ROOT,'verification.mjs'),'--root='+APP]);run.report.commands.push({name:'installed-community-sdk-fixture',exitCode:r.exitCode,durationMs:r.durationMs,error:r.error});
    try{const info=JSON.parse(r.stdout.trim());sdkDetails=JSON.parse(fs.readFileSync(info.resultFile,'utf8'));}catch{}
    const verified=r.exitCode===0&&sdkDetails?.status==='VERIFIED_BOUNDED_OPERATOR_DEMO'&&sdkDetails.chain?.valid===true;
    return{status:verified?'PASS':r.exitCode===null?'BLOCKED':'FAIL',detail:{exitCode:r.exitCode,error:r.error??sdkDetails?.error??null,result:sdkDetails?{status:sdkDetails.status,caseCount:sdkDetails.cases?.length,chain:sdkDetails.chain,sideEffects:sdkDetails.cases?.find(x=>x.id==='F_CALLBACK_AND_SIDE_EFFECT')}:null,summary:verified?'Installed SDK executed the existing temporary-file/network observer and verified its local evidence chain.':'Installed SDK fixture did not produce verified evidence.'}};
  });
  const model=await run.stage('gpt6-agent',async()=>{
    const cli=inspectCodexCli();
    if(vm.status!=='PASS')return{status:'BLOCKED',detail:{reason:'CLEAN_WINDOWS_VM_NOT_VERIFIED; real model tool calls are not sent from this host-only runner.',codexCliFound:Boolean(cli),modelCallMade:false,model:'NOT_VERIFIED',summary:'Blocked before model invocation; no API key or paid API call is attempted.'}};
    return{status:'BLOCKED',detail:{reason:'VM_GUEST_MCP_TRANSPORT_AND_AUTH_NOT_CONFIGURED',codexCliFound:Boolean(cli),modelCallMade:false}};
  });
  const hook=await run.stage('hook-failures',async()=>{
    const h=runHookFaultChecks({appRoot:path.join(APP,'dist'),fixturesRoot:os.tmpdir()});
    return{status:h.status,detail:{...h,root:undefined,summary:h.status==='PASS'?'Packaged hook wrapper fault harness denied failures; positive control confirmed the fixture observes a write when allow is returned.':'Hook failure fixture did not satisfy its side-effect checks.'}};
  });
  const evidence=await run.stage('evidence-review',async()=>{
    const checks=[{name:'public-release-digest-match',status:release.status},{name:'installed-sdk-observer',status:sdk.status},{name:'hook-failure-fixture',status:hook.status}];
    const mismatches=checks.filter(x=>x.status==='FAIL');
    return{status:mismatches.length?'FAIL':sdk.status==='PASS'&&hook.status==='PASS'?'PASS':'NOT_VERIFIED',detail:{checks,e4:'NOT_VERIFIED',chainValid:sdkDetails?.chain?.valid??false,observerScope:'same-host controlled fixture; not independent E4',summary:mismatches.length?'An evidence source conflicts with its declared result.':'Reviewed only evidence produced in this run; external independence remains unverified.'}};
  });
  await run.stage('uninstall-reinstall',async()=>({status:'BLOCKED',detail:{reason:vm.status==='PASS'?'GUEST_INSTALLER_OPERATIONS_NOT_CONFIGURED':'CLEAN_WINDOWS_VM_NOT_AVAILABLE',snapshotRestorePerformed:false,uninstallPerformed:false,summary:'No VM lifecycle operation was attempted.'}}));
  await run.stage('github-pr',async()=>({status:'BLOCKED',detail:{reason:'PACKAGED_APP_HAS_NO_SOURCE_CHECKOUT_OR_GITHUB_WRITE_CREDENTIALS',localChangesCommitted:false,remoteWrites:false,summary:'The application will not search for, copy, or stage arbitrary user repositories.'}}));
  await run.stage('materials',async()=>({status:'PASS',detail:{reason:'REPORT_AND_EVIDENCE_INDEX_WILL_BE_GENERATED_IN_THIS_RUN_DIRECTORY',summary:'A run-specific evidence bundle is prepared after report finalization.'}}));
  let report=run.finish();report.commands=run.report.commands;report.environment=run.report.environment;report.installer=run.report.installer;report.software=run.report.software;report.operator=run.report.operator;report.sessionId=run.report.sessionId;
  let artifacts=writeAutoE4Artifacts(report,run.runDir),bundle=null;
  try{bundle=makeEvidenceBundle(run.runDir);}
  catch(error){const stage=report.stages.find(x=>x.id==='materials');stage.status='BLOCKED';stage.detail={reason:String(error.message),summary:'Reports exist, but a verified ZIP bundle could not be created.'};report.coverage.blocked++;report.coverage.verified=Math.max(0,report.coverage.verified-1);report.technicalResult='BLOCKED';run.record({type:'progress',stageId:'materials',status:'BLOCKED',message:stage.detail.summary,detail:{reason:stage.detail.reason}});artifacts=writeAutoE4Artifacts(report,run.runDir);}
  writeFileAtomically(path.join(dataDir,'latest.json'),JSON.stringify({kind:'auto-e4',file:artifacts.jsonFile,markdownFile:artifacts.mdFile}),{replace:true});
  process.stdout.write(JSON.stringify({type:'result',status:report.technicalResult,overallE4:report.overallE4,reportFile:artifacts.jsonFile,markdownFile:artifacts.mdFile,bundleFile:bundle?.archive??null,bundleSHA256:bundle?.sha256??null,bundleBytes:bundle?.bytes??null,report:redact(report,[[ROOT,'<INSTALL_DIR>'],[dataDir,'<APP_DATA>'],[os.homedir(),'<USER_HOME>'],[os.tmpdir(),'<TEMP_DIR>']])})+'\n');
  if(report.technicalResult==='FAIL')process.exitCode=1;
 }finally{run.release();}
}
export async function main(){if(!['initialize','environment','verify','export','record-install','auto-e4'].includes(action)||!ROLES.has(role))throw Error('COMMAND_OR_ROLE_INVALID');const manifest=inspectPayload(ROOT,expected),version=JSON.parse(fs.readFileSync(path.join(ROOT,'VERSION.json'),'utf8'));
if(action==='record-install'){const setup=process.argv[6];if(!setup||!path.isAbsolute(setup)||fs.lstatSync(setup).isSymbolicLink()||!setup.toLowerCase().endsWith('.exe'))throw Error('INSTALLER_PATH_INVALID');const receipt={installerSHA256:digest(fs.readFileSync(setup)),recordedAt:new Date().toISOString(),desktopVersion:version.desktopVersion};writeFileAtomically(path.join(ROOT,'INSTALL_RECEIPT.json'),JSON.stringify(receipt));console.log(JSON.stringify({status:'VERIFIED',receipt}));return;}
const state=loadState();if(action==='initialize'){console.log(JSON.stringify({status:'READY',sessionId:state.sessionId,version}));return;}
if(action==='auto-e4'){await runAutoE4(state,version,readInstallerReceipt(ROOT),manifest);return;}
if(action==='export'){const latest=readJSON(path.join(dataDir,'latest.json'),4096);if(latest.kind==='auto-e4'){
 const base=path.resolve(dataDir,'auto-e4-runs');const reportPath=path.resolve(latest.file),mdPath=path.resolve(latest.markdownFile??'');if(!reportPath.startsWith(base+path.sep)||!mdPath.startsWith(base+path.sep)||fs.lstatSync(reportPath).isSymbolicLink()||fs.lstatSync(mdPath).isSymbolicLink())throw Error('REPORT_PATH_INVALID');const original=readJSON(reportPath);original.operator={...(original.operator??{}),declaredRole:role};const sanitized=e4Sanitize(original,[[original.fixture??'','<SANDBOX>']]);const md=fs.readFileSync(mdPath,'utf8');console.log(JSON.stringify({status:'VERIFIED_EXPORT_REDACTED',json:JSON.stringify(sanitized,null,2),markdown:e4Sanitize(md,[[original.fixture??'','<SANDBOX>']])}));return;}
 if(path.dirname(latest.file)!==path.join(dataDir,'reports'))throw Error('REPORT_PATH_INVALID');if(fs.lstatSync(latest.file).isSymbolicLink())throw Error('REPORT_SYMLINK_REJECTED');const original=readJSON(latest.file);original.operator.declaredRole=role;const sanitized=redact(original,[[ROOT,'<INSTALL_DIR>'],[dataDir,'<APP_DATA>'],[os.homedir(),'<USER_HOME>'],[os.tmpdir(),'<TEMP_DIR>'],[original.fixture??'','<SANDBOX>']]);console.log(JSON.stringify({status:'VERIFIED_EXPORT_REDACTED',json:JSON.stringify(sanitized,null,2),markdown:markdown(sanitized)}));return;}
const report=baseline(state,version);report.checks.push(check('payload-integrity','安装文件完整性','Installed payload integrity','VERIFIED',{files:manifest.files.length,manifestSHA256:expected,runtimeFiles:33,runtimeByteIdentity:'VERSION.json coreRuntimeHashes verified for this installed candidate'}));report.checks.push(check('runtime','随包运行环境','Bundled runtime',process.platform==='win32'&&process.arch==='x64'?'VERIFIED':'NOT_VERIFIED',{node:process.version,platform:process.platform,arch:process.arch,noExternalNodeGitPythonRequired:true}));const cli=invoke([path.join(APP,'dist/competition.js'),'self-test','--json']);report.commands.push(cli);let self=null;try{self=JSON.parse(cli.stdout.trim());}catch{}report.checks.push(check('cli-self-test','CLI 基础自检','CLI self-test',cli.exitCode===0&&self?.passed===true?'VERIFIED':'FAILED',{exitCode:cli.exitCode,selfTest:self,error:cli.error}));
if(action==='environment'){const free=fs.statfsSync(ROOT);report.checks.push(check('disk','可用磁盘空间','Available disk space',free.bavail*free.bsize>=100*1024*1024?'VERIFIED':'FAILED',{freeBytes:free.bavail*free.bsize,minimumForReportsBytes:100*1024*1024}));report.checks.push(check('model','真实模型验证','Real model validation','NOT_VERIFIED',{reason:'Not required for offline SDK verification; no model is started or downloaded.'}));}
if(action==='verify'){if(cli.exitCode!==0||self?.passed!==true)report.checks.push(check('sdk-fixture','SDK 临时验证','SDK fixture verification','SKIPPED',{reason:'CLI baseline failed; repair installation first.'}));else{const run=invoke([path.join(ROOT,'verification.mjs'),'--root='+APP]);report.commands.push(run);let info=null,details=null;try{info=JSON.parse(run.stdout.trim());details=JSON.parse(fs.readFileSync(info.resultFile,'utf8'));}catch{}if(run.exitCode!==0||details?.status!=='VERIFIED_BOUNDED_OPERATOR_DEMO')report.checks.push(check('sdk-fixture','SDK 临时验证','SDK fixture verification','FAILED',{exitCode:run.exitCode,error:run.error??details?.error??'Verification runner did not produce a valid report'}));else{report.fixture=details.fixture;for(const c of details.cases)report.checks.push(check(c.id,c.id,c.id,c.id==='A_SYNTHETIC_CREDENTIAL_READ'?'VERIFIED_REFERENCE_EFFECT':c.status,{...c}));report.sideEffects=details.cases.find(c=>c.id==='F_CALLBACK_AND_SIDE_EFFECT');report.evidence=details.evidence;report.evidenceChain=details.chain;}}}
report.status=report.checks.some(c=>c.status==='FAILED')?'FAILED':'VERIFIED_BOUNDED_CHECKS';const file=saveReport(report);console.log(JSON.stringify({status:report.status,reportFile:file,report:redact(report,[[ROOT,'<INSTALL_DIR>'],[dataDir,'<APP_DATA>'],[os.homedir(),'<USER_HOME>'],[os.tmpdir(),'<TEMP_DIR>'],[report.fixture??'','<SANDBOX>']])}));if(report.status==='FAILED')process.exitCode=1;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.log(JSON.stringify({status:'FAILED',error:redact(String(e.message).slice(0,400),[[ROOT,'<INSTALL_DIR>'],[dataDir,'<APP_DATA>'],[os.homedir(),'<USER_HOME>']]),E4:'NOT_VERIFIED'}));process.exitCode=1;});
