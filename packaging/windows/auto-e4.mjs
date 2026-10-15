import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {writeFileAtomically} from './durable-files.mjs';

export const AUTO_E4_STAGES = Object.freeze([
  'environment','clean-vm','release-package','sdk-side-effects','gpt6-agent',
  'hook-failures','evidence-review','uninstall-reinstall','github-pr','materials'
]);
const VALID = new Set(['PASS','FAIL','BLOCKED','SKIPPED','NOT_VERIFIED']);

function reclaimStaleLock(lock){
  let raw,owner;
  try{raw=fs.readFileSync(lock);owner=JSON.parse(raw.toString('utf8'));}
  catch(error){if(error.code==='ENOENT')return;throw Error('AUTO_E4_LOCK_CORRUPT');}
  if(owner.schemaVersion!==1||!/^[a-f0-9-]{36}$/.test(owner.runId??'')||!Number.isSafeInteger(owner.pid)||owner.pid<1)throw Error('AUTO_E4_LOCK_OWNER_UNVERIFIABLE');
  try{process.kill(owner.pid,0);throw Error('AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');}
  catch(error){if(error.code!=='ESRCH')throw error.message==='AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED'?error:Error('AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');}
  const stale=lock+'.stale.'+randomUUID();
  try{fs.renameSync(lock,stale);}catch(error){if(error.code==='ENOENT')return;throw Error('AUTO_E4_LOCK_RECOVERY_FAILED');}
  try{
    if(!fs.readFileSync(stale).equals(raw)){
      try{fs.renameSync(stale,lock);}catch{}
      throw Error('AUTO_E4_LOCK_OWNER_CHANGED');
    }
    fs.unlinkSync(stale);
  }catch(error){if(error.message==='AUTO_E4_LOCK_OWNER_CHANGED')throw error;throw Error('AUTO_E4_LOCK_RECOVERY_FAILED');}
}

export function createAutoE4Run({dataDir,now=()=>new Date(),emit=()=>{},sanitize=value=>value}) {
  if(!path.isAbsolute(dataDir)||path.parse(path.resolve(dataDir)).root===path.resolve(dataDir))throw Error('UNSAFE_DATA_DIRECTORY');
  fs.mkdirSync(dataDir,{recursive:true});
  const runId=randomUUID(),runs=path.join(dataDir,'auto-e4-runs');
  fs.mkdirSync(runs,{recursive:true});
  const runDir=path.join(runs,runId);fs.mkdirSync(runDir,{recursive:false});
  const lock=path.join(dataDir,'auto-e4.lock');
  let lockFd;
  try{
    try{lockFd=fs.openSync(lock,'wx',0o600);}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      reclaimStaleLock(lock);
      try{lockFd=fs.openSync(lock,'wx',0o600);}catch(retryError){if(retryError.code==='EEXIST')throw Error('AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw retryError;}
    }
    fs.writeFileSync(lockFd,JSON.stringify({schemaVersion:1,runId,pid:process.pid,startedAt:now().toISOString()}));
    fs.fsyncSync(lockFd);
  }
  catch(error){
    try{if(lockFd!==undefined)fs.closeSync(lockFd);}catch{}
    if(lockFd!==undefined){try{fs.unlinkSync(lock);}catch{}}
    try{fs.rmSync(runDir,{recursive:true,force:true});}catch{}
    throw error;
  }
  const eventsFile=path.join(runDir,'events.jsonl');
  const report={schemaVersion:'agent-canary.auto-e4.v1',runId,startedAt:now().toISOString(),mode:'AUTOMATED_BOUNDED_ACCEPTANCE',stages:[],commands:[],logs:[],externalIndependence:{status:'NOT_VERIFIED',reason:'No separate human operator and independent environment attestation has been reviewed.'},overallE4:'E4 EXTERNAL INDEPENDENCE NOT VERIFIED'};
  const record=(event)=>{const cleaned=sanitize({at:now().toISOString(),...event});const line=JSON.stringify(cleaned)+'\n';fs.appendFileSync(eventsFile,line,{mode:0o600,flag:'a'});emit(cleaned);};
  async function stage(id,action){
    if(!AUTO_E4_STAGES.includes(id))throw Error('UNKNOWN_AUTO_E4_STAGE');
    record({type:'progress',stageId:id,status:'RUNNING',message:'Stage started'});
    const started=Date.now();let status='NOT_VERIFIED',detail={};
    try{const result=await action();status=result?.status??'NOT_VERIFIED';detail=sanitize(result?.detail??{});if(!VALID.has(status))throw Error('INVALID_STAGE_STATUS');}
    catch(error){status='FAIL';detail={error:String(error?.message??error).slice(0,500)};}
    const item={id,status,durationMs:Date.now()-started,detail};report.stages.push(item);
    record({type:'progress',stageId:id,status,durationMs:item.durationMs,message:detail.summary??detail.reason??status,detail});
    return item;
  }
  function finish(){
    for(const id of AUTO_E4_STAGES)if(!report.stages.some(s=>s.id===id))report.stages.push({id,status:'SKIPPED',durationMs:0,detail:{reason:'Not run because its required prerequisite was unavailable.'}});
    const counts=Object.fromEntries([...VALID].map(s=>[s,report.stages.filter(x=>x.status===s).length]));
    report.coverage={verified:counts.PASS,failed:counts.FAIL,blocked:counts.BLOCKED,skipped:counts.SKIPPED,notVerified:counts.NOT_VERIFIED,total:report.stages.length,label:'Stage coverage only; not a security score or protection rate.'};
    report.technicalResult=counts.FAIL?'FAIL':counts.BLOCKED?'BLOCKED':counts.NOT_VERIFIED||counts.SKIPPED?'PARTIAL':'READY_FOR_EXTERNAL_REVIEW';
    report.externalIndependence={status:'NOT_VERIFIED',reason:'Automated author-run tests cannot establish an independent operator/environment.'};
    report.overallE4='E4 EXTERNAL INDEPENDENCE NOT VERIFIED';
    report.completedAt=now().toISOString();report.eventsFile='events.jsonl';
    return report;
  }
  function release(){
    try{const current=fs.readFileSync(lock,'utf8');if(current.includes(runId)){fs.closeSync(lockFd);lockFd=undefined;fs.unlinkSync(lock);}}
    catch{}
  }
  return {runId,runDir,report,stage,record,finish,release};
}

export function writeAutoE4Artifacts(report,runDir){
  const jsonFile=path.join(runDir,'AUTO_E4_REPORT.json');
  const mdFile=path.join(runDir,'AUTO_E4_REPORT.md');
  const indexFile=path.join(runDir,'EVIDENCE_INDEX.json');
  for(const file of [jsonFile,mdFile,indexFile]){
    try{fs.lstatSync(file);throw Error('AUTO_E4_ARTIFACT_ALREADY_EXISTS');}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
 const writeArtifact=(file,content)=>{
  try{writeFileAtomically(file,content);}
  catch(error){if(error.code==='EEXIST')throw Error('AUTO_E4_ARTIFACT_ALREADY_EXISTS');throw error;}
 };
  const safe={...report};
 writeArtifact(jsonFile,JSON.stringify(safe,null,2)+'\n');
  const lines=['# 自动 E4 验收报告','','技术执行状态：'+report.technicalResult,'E4 状态：'+report.overallE4,'运行 ID：'+report.runId,'开始：'+report.startedAt,'结束：'+report.completedAt,'','自动运行覆盖率：'+report.coverage.verified+'/'+report.coverage.total+' 项 PASS（仅步骤覆盖，不是安全得分或攻击阻断率）','外部独立性：NOT_VERIFIED','',
    '## 阶段结果',...report.stages.map(s=>'- **'+s.status+'** `'+s.id+'`（'+s.durationMs+' ms）：'+String(s.detail?.summary??s.detail?.reason??'详见结构化报告')),'',
    '## 边界','- 作者或同机自动测试不能构成 E4 独立复现。','- 受控 SDK / MCP Gateway 结果不代表第三方 Agent 原生工具全局受保护。','- 只有观察到目标文件/网络副作用后才能报告副作用结论；DENY 日志本身不是阻断证明。','- 没有 VM、模型或 GitHub 授权时对应步骤会标记 BLOCKED/NOT_VERIFIED。',''];
  writeArtifact(mdFile,lines.join('\n'));
  const eventFile=path.join(runDir,report.eventsFile??'events.jsonl');
  const artifacts=[jsonFile,mdFile,eventFile].filter(f=>fs.existsSync(f)).map(file=>({name:path.basename(file),sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),bytes:fs.statSync(file).size}));
  writeArtifact(indexFile,JSON.stringify({schemaVersion:'agent-canary.auto-e4-evidence-index.v1',runId:report.runId,artifacts},null,2)+'\n');
  return {jsonFile,mdFile,indexFile,artifacts};
}
