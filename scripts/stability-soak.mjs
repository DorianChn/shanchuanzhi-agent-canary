import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {runGatewayBatch} from './gateway-benchmark-core.mjs';
import {writeFileAtomically} from '../packaging/windows/durable-files.mjs';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const i=x.indexOf('=');return i<0?[x.slice(2),'true']:[x.slice(2,i),x.slice(i+1)];}));
const integer=(name,fallback,min,max)=>{const n=Number(args[name]??fallback);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`INVALID_${name.toUpperCase()}`);return n;};
const hours=Number(args.hours??24),intervalSeconds=integer('interval-seconds',60,1,3600),operations=integer('operations',100,1,2048),concurrency=integer('concurrency',16,1,64);
if(!Number.isFinite(hours)||hours<=0||hours>168)throw Error('INVALID_HOURS');
const evidenceRoot=path.resolve(args['output-root']??'security-lab/evidence');fs.mkdirSync(evidenceRoot,{recursive:true});
const runDir=path.join(evidenceRoot,`m7-soak-${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}`);fs.mkdirSync(runDir,{recursive:false});
const eventsFile=path.join(runDir,'samples.jsonl'),stateFile=path.join(runDir,'run-state.json'),eventsFd=fs.openSync(eventsFile,'wx',0o600);
const startedAt=new Date(),start=performance.now(),deadline=start+hours*3_600_000,intervalMs=intervalSeconds*1000;
const cpuStart=process.cpuUsage(),baseline={rss:process.memoryUsage().rss,heap:process.memoryUsage().heapUsed,activeResources:process.getActiveResourcesInfo().length};
const environment={platform:process.platform,architecture:process.arch,node:process.version,osRelease:os.release(),cpuCount:os.availableParallelism?.()??os.cpus().length,totalMemoryBytes:os.totalmem()};
let samples=0,successful=0,failed=0,interrupted=false,infraError=null,previousCpu=process.cpuUsage(),previousSampleAt=start;
const state=status=>({schemaVersion:'agent-canary.m7.stability-soak.v1',status,startedAt:startedAt.toISOString(),updatedAt:new Date().toISOString(),requestedHours:hours,elapsedMs:Math.round(performance.now()-start),samples,successfulOperations:successful,failedOperations:failed,environment,parameters:{intervalSeconds,operations,concurrency,workload:'synthetic in-process read-only MCP callback'},baseline,eventsFile:'samples.jsonl',infrastructureError:infraError});
let stopping=false;
const stopSignal=new AbortController();
const stop=()=>{interrupted=true;stopping=true;stopSignal.abort();};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
const writeState=status=>writeFileAtomically(stateFile,JSON.stringify(state(status),null,2)+'\n',{replace:fs.existsSync(stateFile)});
const writeSample=sample=>{const line=Buffer.from(JSON.stringify(sample)+'\n');fs.writeSync(eventsFd,line);fs.fsyncSync(eventsFd);};

try{
  writeState('RUNNING');
  while(!stopping&&performance.now()<deadline){
    const sampleStart=performance.now();
    try{
      const result=await runGatewayBatch({operations,concurrency,agentId:`m7_soak_${samples+1}`});
      successful+=result.successes;failed+=result.errors;
      const cpu=process.cpuUsage(previousCpu),memory=process.memoryUsage();
      let freeBytes=null;try{const stat=fs.statfsSync(evidenceRoot);freeBytes=stat.bavail*stat.bsize;}catch{}
      const sample={sequence:samples+1,at:new Date().toISOString(),sampleDurationMs:Number((performance.now()-sampleStart).toFixed(3)),intervalSincePreviousMs:Number((sampleStart-previousSampleAt).toFixed(3)),operations:result.operations,successes:result.successes,errors:result.errors,errorSamples:result.errorSamples,throughputOpsPerSecond:result.throughputOpsPerSecond,latencyMs:result.latencyMs,cpuDeltaMs:{user:Number((cpu.user/1000).toFixed(3)),system:Number((cpu.system/1000).toFixed(3))},memoryBytes:{rss:memory.rss,heapUsed:memory.heapUsed,rssGrowthFromStart:memory.rss-baseline.rss,heapGrowthFromStart:memory.heapUsed-baseline.heap},activeResources:process.getActiveResourcesInfo().length,activeResourceKinds:Object.fromEntries(process.getActiveResourcesInfo().reduce((map,name)=>map.set(name,(map.get(name)??0)+1),new Map())),freeDiskBytes:freeBytes,evidenceChainValid:result.evidence.chainValid};
      samples++;writeSample(sample);previousCpu=process.cpuUsage();previousSampleAt=performance.now();writeState('RUNNING');
    }catch(error){infraError=String(error?.message??error).slice(0,500);stopping=true;break;}
    const nextSampleAt=start+samples*intervalMs,now=performance.now();
    if(!stopping&&now<deadline&&nextSampleAt>now)await delay(Math.min(nextSampleAt-now,deadline-now),undefined,{signal:stopSignal.signal}).catch(error=>{if(error.name!=='AbortError')throw error;});
  }
}catch(error){infraError=String(error?.message??error).slice(0,500);}
finally{
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
  try{fs.fsyncSync(eventsFd);fs.closeSync(eventsFd);}catch{}
}
const elapsedMs=performance.now()-start,cpuTotal=process.cpuUsage(cpuStart),completed=elapsedMs>=hours*3_600_000&& !interrupted && !infraError;
const status=infraError?'FAILED':interrupted?'INTERRUPTED':completed&&failed===0?'COMPLETED_WITHOUT_HARNESS_ERRORS':completed?'COMPLETED_WITH_ERRORS':'INCOMPLETE';
const report={...state(status),completedAt:new Date().toISOString(),durationMs:elapsedMs,completedDuration:completed,cpuTotalMs:{user:Math.round(cpuTotal.user/1000),system:Math.round(cpuTotal.system/1000)},memoryEnd:{rss:process.memoryUsage().rss,heapUsed:process.memoryUsage().heapUsed},interpretation:'Harness execution status only. A completed run records this synthetic workload and environment; it is not proof of product-wide reliability or installer acceptance.'};
try{writeFileAtomically(stateFile,JSON.stringify(report,null,2)+'\n',{replace:fs.existsSync(stateFile)});}catch(error){process.stderr.write(`Could not publish final state: ${String(error?.message??error)}\n`);process.exitCode=1;}
process.stdout.write(JSON.stringify({status,runDir,durationMs:elapsedMs,samples,successfulOperations:successful,failedOperations:failed,infrastructureError:infraError})+'\n');
if(status!=='COMPLETED_WITHOUT_HARNESS_ERRORS')process.exitCode=1;
