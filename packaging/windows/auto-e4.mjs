import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {writeFileAtomically} from './durable-files.mjs';

export const AUTO_E4_STAGES = Object.freeze([
  'environment','clean-vm','release-package','sdk-side-effects','gpt6-agent',
  'hook-failures','evidence-review','uninstall-reinstall','github-pr','materials'
]);
const VALID = new Set(['PASS','FAIL','BLOCKED','SKIPPED','NOT_VERIFIED']);

function lockMatchesOwner(lock,lockFd,expected){
  const descriptorStat=fs.fstatSync(lockFd);
  const matchesDescriptor=stat=>stat.isFile()&&!stat.isSymbolicLink()&&stat.dev===descriptorStat.dev&&stat.ino===descriptorStat.ino;
  if(!matchesDescriptor(fs.lstatSync(lock)))return false;
  const owner=JSON.parse(fs.readFileSync(lock,'utf8'));
  return matchesDescriptor(fs.lstatSync(lock))
    &&owner!==null&&typeof owner==='object'&&!Array.isArray(owner)
    &&Object.keys(owner).length===4
    &&owner.schemaVersion===expected.schemaVersion
    &&owner.runId===expected.runId
    &&owner.pid===expected.pid
    &&owner.startedAt===expected.startedAt;
}

export function createAutoE4Run({dataDir,now=()=>new Date(),emit=()=>{},sanitize=value=>value}) {
  if(!path.isAbsolute(dataDir)||path.parse(path.resolve(dataDir)).root===path.resolve(dataDir))throw Error('UNSAFE_DATA_DIRECTORY');
  fs.mkdirSync(dataDir,{recursive:true});
  const runId=randomUUID(),runs=path.join(dataDir,'auto-e4-runs');
  fs.mkdirSync(runs,{recursive:true});
  const runDir=path.join(runs,runId);fs.mkdirSync(runDir,{recursive:false});
  const lock=path.join(dataDir,'auto-e4.lock');
  const lockOwner={schemaVersion:1,runId,pid:process.pid,startedAt:now().toISOString()};
  let lockFd;
  try{
    try{lockFd=fs.openSync(lock,'wx',0o600);}
    catch(error){if(error.code==='EEXIST')throw Error('AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw error;}
    fs.writeFileSync(lockFd,JSON.stringify(lockOwner));
    fs.fsyncSync(lockFd);
  }
  catch(error){
    if(lockFd!==undefined){try{if(lockMatchesOwner(lock,lockFd,lockOwner))fs.unlinkSync(lock);}catch{}try{fs.closeSync(lockFd);}catch{}lockFd=undefined;}
    try{fs.rmSync(runDir,{recursive:true,force:true});}catch{}
    throw error;
  }
  const eventsFile=path.join(runDir,'events.jsonl');
  const report={schemaVersion:'agent-canary.auto-e4.v1',runId,startedAt:now().toISOString(),mode:'AUTOMATED_BOUNDED_ACCEPTANCE',stages:[],commands:[],logs:[],externalIndependence:{status:'NOT_VERIFIED',reason:'No separate human operator and independent environment attestation has been reviewed.'},overallE4:'E4 EXTERNAL INDEPENDENCE NOT VERIFIED'};
  const startedStages=new Set(),activeStages=new Set();let finished=false;
  const record=(event)=>{if(finished)throw Error('AUTO_E4_RUN_FINISHED');const cleaned=sanitize({at:now().toISOString(),...event});const line=JSON.stringify(cleaned)+'\n';fs.appendFileSync(eventsFile,line,{mode:0o600,flag:'a'});emit(cleaned);};
  async function stage(id,action){
    if(!AUTO_E4_STAGES.includes(id))throw Error('UNKNOWN_AUTO_E4_STAGE');
    if(finished)throw Error('AUTO_E4_RUN_FINISHED');
    if(startedStages.has(id))throw Error('DUPLICATE_AUTO_E4_STAGE');
    startedStages.add(id);
    activeStages.add(id);
    try{
      record({type:'progress',stageId:id,status:'RUNNING',message:'Stage started'});
      const started=Date.now();let status='NOT_VERIFIED',detail={};
      try{const result=await action();status=result?.status??'NOT_VERIFIED';detail=sanitize(result?.detail??{});if(!VALID.has(status))throw Error('INVALID_STAGE_STATUS');}
      catch(error){status='FAIL';detail={error:String(error?.message??error).slice(0,500)};}
      const item={id,status,durationMs:Date.now()-started,detail};report.stages.push(item);
      record({type:'progress',stageId:id,status,durationMs:item.durationMs,message:detail.summary??detail.reason??status,detail});
      return item;
    }finally{
      activeStages.delete(id);
    }
  }
  function finish(){
    if(finished)return report;
    if(activeStages.size>0)throw Error('AUTO_E4_STAGE_IN_PROGRESS');
    finished=true;
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
    if(activeStages.size>0)throw Error('AUTO_E4_STAGE_IN_PROGRESS');
    if(lockFd===undefined)return;
    try{if(lockMatchesOwner(lock,lockFd,lockOwner))fs.unlinkSync(lock);}
    catch{}
    finally{try{fs.closeSync(lockFd);}catch{}lockFd=undefined;}
  }
  return {runId,runDir,report,stage,record,finish,release};
}

function autoE4ArtifactPaths(report,runDir){
  return{jsonFile:path.join(runDir,'AUTO_E4_REPORT.json'),mdFile:path.join(runDir,'AUTO_E4_REPORT.md'),indexFile:path.join(runDir,'EVIDENCE_INDEX.json'),eventFile:path.join(runDir,report.eventsFile??'events.jsonl')};
}
function autoE4Markdown(report){
  return ['# 自动 E4 验收报告','','技术执行状态：'+report.technicalResult,'E4 状态：'+report.overallE4,'运行 ID：'+report.runId,'开始：'+report.startedAt,'结束：'+report.completedAt,'','自动运行覆盖率：'+report.coverage.verified+'/'+report.coverage.total+' 项 PASS（仅步骤覆盖，不是安全得分或攻击阻断率）','外部独立性：NOT_VERIFIED','',
    '## 阶段结果',...report.stages.map(s=>'- **'+s.status+'** `'+s.id+'`（'+s.durationMs+' ms）：'+String(s.detail?.summary??s.detail?.reason??'详见结构化报告')),'',
    '## 边界','- 作者或同机自动测试不能构成 E4 独立复现。','- 受控 SDK / MCP Gateway 结果不代表第三方 Agent 原生工具全局受保护。','- 只有观察到目标文件/网络副作用后才能报告副作用结论；DENY 日志本身不是阻断证明。','- 没有 VM、模型或 GitHub 授权时对应步骤会标记 BLOCKED/NOT_VERIFIED。',''].join('\n');
}
function autoE4ArtifactContents(report,runDir,eventContent){
  const paths=autoE4ArtifactPaths(report,runDir);
  const jsonContent=JSON.stringify({...report},null,2)+'\n';
  const mdContent=autoE4Markdown(report);
  const artifacts=[{name:path.basename(paths.jsonFile),content:jsonContent},{name:path.basename(paths.mdFile),content:mdContent}];
  if(eventContent===undefined&&fs.existsSync(paths.eventFile))eventContent=fs.readFileSync(paths.eventFile);
  if(eventContent!==undefined)artifacts.push({name:path.basename(paths.eventFile),content:eventContent});
  const artifactIndex=artifacts.map(item=>({name:item.name,sha256:createHash('sha256').update(item.content).digest('hex'),bytes:Buffer.byteLength(item.content)}));
  return{...paths,jsonContent,mdContent,eventContent,indexContent:JSON.stringify({schemaVersion:'agent-canary.auto-e4-evidence-index.v1',runId:report.runId,artifacts:artifactIndex},null,2)+'\n',artifacts:artifactIndex};
}
function writeAutoE4ArtifactContents(output,{replace=false}={}){
  const files=[['jsonFile','jsonContent'],['mdFile','mdContent'],...(replace&&output.eventContent!==undefined?[['eventFile','eventContent']]:[]),['indexFile','indexContent']];
  if(!replace&&[output.jsonFile,output.mdFile,output.indexFile].some(file=>fs.existsSync(file)))throw Error('AUTO_E4_ARTIFACT_ALREADY_EXISTS');
  for(const [fileKey,contentKey] of files)writeFileAtomically(output[fileKey],output[contentKey],{replace});
}
export function writeAutoE4Artifacts(report,runDir){
  const output=autoE4ArtifactContents(report,runDir);
  writeAutoE4ArtifactContents(output);
  return{jsonFile:output.jsonFile,mdFile:output.mdFile,indexFile:output.indexFile,artifacts:output.artifacts};
}

export function recordAutoE4BundleFailure(report,runDir,reason,{now=()=>new Date(),sanitize=value=>value}={}){
  if(!report?.completedAt)throw Error('AUTO_E4_RUN_NOT_FINISHED');
  if(!path.isAbsolute(runDir)||path.parse(path.resolve(runDir)).root===path.resolve(runDir))throw Error('UNSAFE_RUN_DIRECTORY');
  const paths=autoE4ArtifactPaths(report,runDir);
  let previous,index;
  try{
    for(const file of [paths.jsonFile,paths.mdFile,paths.indexFile,paths.eventFile]){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('INVALID_RUN_ARTIFACT');}
    previous=JSON.parse(fs.readFileSync(paths.jsonFile,'utf8'));index=JSON.parse(fs.readFileSync(paths.indexFile,'utf8'));
  }
  catch{throw Error('AUTO_E4_ARTIFACT_REVISION_UNAVAILABLE');}
  if(previous.schemaVersion!=='agent-canary.auto-e4.v1'||previous.runId!==report.runId||index.schemaVersion!=='agent-canary.auto-e4-evidence-index.v1'||index.runId!==report.runId)throw Error('AUTO_E4_ARTIFACT_REVISION_RUN_MISMATCH');
  if(!Array.isArray(index.artifacts))throw Error('AUTO_E4_ARTIFACT_REVISION_INTEGRITY_FAILED');
  for(const file of [paths.jsonFile,paths.mdFile,paths.eventFile]){
    const bytes=fs.readFileSync(file),entry=index.artifacts.find(item=>item.name===path.basename(file));
    if(!entry||entry.bytes!==bytes.length||entry.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('AUTO_E4_ARTIFACT_REVISION_INTEGRITY_FAILED');
  }
  const stage=report.stages.find(item=>item.id==='materials');
  if(!stage)throw Error('AUTO_E4_MATERIALS_STAGE_MISSING');
  const detail={reason:String(sanitize(String(reason??'EVIDENCE_BUNDLE_CREATE_FAILED').slice(0,500))),summary:'Reports exist, but a verified ZIP bundle could not be created.'};
  const priorStage=previous.stages?.find(item=>item.id==='materials');
  const changed=priorStage?.status!=='BLOCKED'||priorStage?.detail?.reason!==detail.reason;
  stage.status='BLOCKED';stage.detail=detail;
  const counts=Object.fromEntries([...VALID].map(status=>[status,report.stages.filter(item=>item.status===status).length]));
  report.coverage={verified:counts.PASS,failed:counts.FAIL,blocked:counts.BLOCKED,skipped:counts.SKIPPED,notVerified:counts.NOT_VERIFIED,total:report.stages.length,label:'Stage coverage only; not a security score or protection rate.'};
  report.technicalResult=counts.FAIL?'FAIL':counts.BLOCKED?'BLOCKED':counts.NOT_VERIFIED||counts.SKIPPED?'PARTIAL':'READY_FOR_EXTERNAL_REVIEW';
  let eventContent;
  if(changed){
    const event=sanitize({at:now().toISOString(),type:'progress',stageId:'materials',status:'BLOCKED',durationMs:stage.durationMs,message:detail.summary,detail:{reason:detail.reason}});
    eventContent=Buffer.concat([fs.readFileSync(paths.eventFile),Buffer.from(JSON.stringify(event)+'\n')]);
  }
  const output=autoE4ArtifactContents(report,runDir,eventContent);
  writeAutoE4ArtifactContents(output,{replace:true});
  return{jsonFile:output.jsonFile,mdFile:output.mdFile,indexFile:output.indexFile,artifacts:output.artifacts};
}
