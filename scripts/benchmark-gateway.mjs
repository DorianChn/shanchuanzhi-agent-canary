import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runGatewayBatch} from './gateway-benchmark-core.mjs';
import {writeFileAtomically} from '../packaging/windows/durable-files.mjs';

const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')).map(x=>{const i=x.indexOf('=');return i<0?[x.slice(2),'true']:[x.slice(2,i),x.slice(i+1)];}));
const integer=(name,fallback,min,max)=>{const n=Number(args[name]??fallback);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`INVALID_${name.toUpperCase()}`);return n;};
const operations=integer('iterations',1000,1,2048),concurrency=integer('concurrency',16,1,64),warmupOperations=integer('warmup',100,0,2048),rounds=integer('rounds',3,1,10);
const root=path.resolve(args['output-root']??'security-lab/evidence');fs.mkdirSync(root,{recursive:true});
const output=path.resolve(args.output??path.join(root,`m7-gateway-benchmark-${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}.json`));
const report={schemaVersion:'agent-canary.m7.gateway-benchmark.v1',startedAt:new Date().toISOString(),environment:{platform:process.platform,architecture:process.arch,node:process.version,osRelease:(await import('node:os')).release(),cpuCount:(await import('node:os')).availableParallelism?.()??null,totalMemoryBytes:(await import('node:os')).totalmem()},workload:{kind:'synthetic in-process read-only MCP callback',network:false,externalServices:false,warmupOperations,operations,concurrency,rounds}};
if(warmupOperations){const warmup=await runGatewayBatch({operations:warmupOperations,concurrency});report.warmup={operations:warmup.successes,errors:warmup.errors};}
report.results=[];
for(let round=1;round<=rounds;round++)report.results.push({round,...await runGatewayBatch({operations,concurrency,agentId:`m7_gateway_bench_${round}`})});
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);const value=sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;return Number((value??0).toFixed(3));};
report.summary={operationsTotal:report.results.reduce((total,result)=>total+result.operations,0),successesTotal:report.results.reduce((total,result)=>total+result.successes,0),errorsTotal:report.results.reduce((total,result)=>total+result.errors,0),throughputOpsPerSecondMedian:median(report.results.map(result=>result.throughputOpsPerSecond)),latencyMsMedianOfRounds:{p50:median(report.results.map(result=>result.latencyMs.p50)),p95:median(report.results.map(result=>result.latencyMs.p95)),p99:median(report.results.map(result=>result.latencyMs.p99))},cpuMsTotal:report.results.reduce((total,result)=>total+result.cpuMs.total,0),rssDeltaBytesMedian:median(report.results.map(result=>result.memoryBytes.rssDelta)),heapDeltaBytesMedian:median(report.results.map(result=>result.memoryBytes.heapDelta)),evidenceChainsValid:report.results.every(result=>result.evidence.chainValid)};
report.completedAt=new Date().toISOString();report.status=report.summary.errorsTotal===0&&report.summary.evidenceChainsValid?'COMPLETED':'FAILED';
writeFileAtomically(output,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify({status:report.status,output,summary:report.summary,results:report.results})+'\n');
if(report.status!=='COMPLETED')process.exitCode=1;
