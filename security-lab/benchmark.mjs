import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {performance} from 'node:perf_hooks';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-3-benchmark-'));
const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder,verifyEvidenceChain}=await import('../dist/sdk.js');
const root=process.env.AGENT_CANARY_HOME;fs.writeFileSync(path.join(root,'public.txt'),'normal file content');
const recorder=new EvidenceRecorder(4096),guard=createAgentGuard({alert:false});const runtime=createTrustedExecutionGateway({agentId:'benchmark',guard,workspaceRoot:root,files:[{path:'public.txt'}],evidence:recorder});
const before=process.memoryUsage();const latency=[];const start=performance.now();
try{for(let i=0;i<1500;i++){const t=performance.now();await runtime.agent.dispatch({name:'read_file',args:{path:'public.txt'}});latency.push(performance.now()-t);}}finally{await runtime.close();}
latency.sort((a,b)=>a-b);const result={scope:'Windows Node 22 microbenchmark, actual held-fd read plus in-memory hash-chain evidence, no disk fsync and no model inference; not long-duration resource proof',iterations:1500,durationMs:performance.now()-start,medianMs:latency[749],p95Ms:latency[1424],p99Ms:latency[1484],before,after:process.memoryUsage(),events:recorder.snapshot().length,chain:verifyEvidenceChain(recorder.snapshot()),timestamp:new Date().toISOString()};
const output='security-lab/evidence/benchmark-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,result}));
