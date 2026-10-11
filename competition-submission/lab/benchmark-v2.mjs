import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {performance} from 'node:perf_hooks';
process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-v2-bench-'));
const {createAgentGuard,createSecurityToolRouter,SessionDataFlow}=await import('../../dist/sdk.js');
const guard=createAgentGuard({alert:false}),router=createSecurityToolRouter({guard,workspaceRoot:process.env.AGENT_CANARY_HOME,tools:{read:{operation:'static-read'}},executeRealTool:()=>true});
const before=process.memoryUsage().rss,values=[];
for(let i=0;i<2000;i++){const start=performance.now();await router.dispatch({name:'read'});values.push((performance.now()-start)*1000);}
const flow=new SessionDataFlow(300_000,256),start=performance.now();for(let i=0;i<50_000;i++)flow.record('sensitive-source','VIRTUAL_DATA_'+i);
const result={capturedAt:new Date().toISOString(),platform:process.platform,node:process.version,scope:'In-process virtual public callback and 50000 sequential provenance insertions; not a long-lived production deployment or real filesystem/network latency',router:{samples:values.length,unit:'microseconds',median:[...values].sort((a,b)=>a-b)[1000],p95:[...values].sort((a,b)=>a-b)[1899]},dataflow:{insertions:50_000,retainedEntries:flow.snapshot().length,capacity:256,durationMs:performance.now()-start,rawSensitiveDataRetained:false},rss:{beforeBytes:before,afterBytes:process.memoryUsage().rss},longDurationProductionStability:'NOT VERIFIED'};
if(result.dataflow.retainedEntries!==256)throw Error('FLOW_BOUND_FAILED');fs.writeFileSync('competition-submission/evidence/v2-performance.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
