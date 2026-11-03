import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

const quantile=(values,q)=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return Number(sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)].toFixed(3));
};

export async function runGatewayBatch({operations=1000,concurrency=16,agentId='m7_gateway_bench'}={}){
  if(!Number.isSafeInteger(operations)||operations<1||operations>2048)throw Error('OPERATIONS_MUST_BE_1_TO_2048');
  if(!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>64)throw Error('CONCURRENCY_MUST_BE_1_TO_64');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-gateway-bench-'));
  try{
    const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder,verifyEvidenceChain}=await import('../src/sdk.js');
    const guard=createAgentGuard({alert:false});
    const evidence=new EvidenceRecorder(Math.max(2,operations*2));
    const gateway=createTrustedExecutionGateway({
      agentId,guard,workspaceRoot:root,files:[],evidence,
      mcpTools:{noop:{risk:'READ_ONLY',approvalRequired:false,execute:async args=>({ok:true,sequence:args.sequence})}}
    });
    const latencies=[],errors=[];
    const rssBefore=process.memoryUsage().rss,heapBefore=process.memoryUsage().heapUsed,cpuBefore=process.cpuUsage(),started=performance.now();
    let dispatched=0;
    try{
      while(dispatched<operations){
        const width=Math.min(concurrency,operations-dispatched),base=dispatched;
        await Promise.all(Array.from({length:width},async(_,offset)=>{
          const began=performance.now();
          try{
            await gateway.agent.dispatch({name:'mcp_tool',args:{tool:'noop',arguments:{sequence:base+offset}}});
            latencies.push(performance.now()-began);
          }catch(error){errors.push(String(error?.message??error).slice(0,200));}
        }));
        dispatched+=width;
      }
    }finally{await gateway.close();}
    const durationMs=performance.now()-started,cpu=process.cpuUsage(cpuBefore),memory=process.memoryUsage();
    const events=gateway.evidence(),chain=verifyEvidenceChain(events);
    return{
      operations,successes:latencies.length,errors:errors.length,errorSamples:errors.slice(0,10),concurrency,
      durationMs:Number(durationMs.toFixed(3)),throughputOpsPerSecond:Number((latencies.length/(durationMs/1000)).toFixed(3)),
      latencyMs:{p50:quantile(latencies,.50),p95:quantile(latencies,.95),p99:quantile(latencies,.99),max:quantile(latencies,1)},
      cpuMs:{user:Number((cpu.user/1000).toFixed(3)),system:Number((cpu.system/1000).toFixed(3)),total:Number(((cpu.user+cpu.system)/1000).toFixed(3))},
      memoryBytes:{rssBefore,rssAfter:memory.rss,rssDelta:memory.rss-rssBefore,heapBefore,heapAfter:memory.heapUsed,heapDelta:memory.heapUsed-heapBefore},
      evidence:{events:events.length,chainValid:chain.valid},
      activeResources:Object.fromEntries(process.getActiveResourcesInfo().reduce((map,name)=>map.set(name,(map.get(name)??0)+1),new Map()))
    };
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}
