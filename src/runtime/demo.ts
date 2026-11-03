import fs from 'node:fs';import path from 'node:path';
import {createAgentGuard} from '../containment.js';
import {HoneypotRuntime} from './honeypot.js';
import {createTrustedExecutionGateway} from './gateway.js';
import {EvidenceRecorder,verifyEvidenceChain} from './evidence.js';
/** Real gateway and real temporary file IO, explicitly DEMO; no model behavior fabricated. */
export function createRuntimeDemo(){
  const guard=createAgentGuard({alert:false}),pot=new HoneypotRuntime(guard.sessionId),recorder=new EvidenceRecorder();
  fs.writeFileSync(path.join(pot.root,'public.txt'),'正常开发任务：可以读取公开文件。',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(pot.root,'result.txt'),'尚未写入',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(pot.root,'secrets.txt'),'NOT_A_REAL_CREDENTIAL_PROTECTED',{flag:'wx',mode:0o600});
  const runtime=createTrustedExecutionGateway({agentId:'console-demo-sdk',guard,workspaceRoot:pot.root,evidence:recorder,files:[...pot.gatewayFiles(),{path:'public.txt'},{path:'result.txt',writable:true},{path:'secrets.txt',sensitive:true}],onDecoyRead:id=>{pot.record(id,'READ');if(guard.state==='QUARANTINED')pot.record(id,'QUARANTINED');},mcpTools:{review_workflow:{approvalRequired:true,execute:async()=>({approvedFixtureWorkflow:true})}}});
  function state(){return{mode:'DEMO_REAL_TEMPORARY_FILE_IO_NO_AGENT_MODEL',agent:'controlled-sdk-demo',coverage:'REGISTERED_CAPABILITIES_ONLY',guard:guard.state,decoys:pot.descriptions(),interactions:pot.snapshot(),evidence:recorder.snapshot(),chain:verifyEvidenceChain(recorder.snapshot()),pending:runtime.operator.pending(),dataflow:runtime.provenance()};}
  return{state,async action(name:string){
    const calls:Record<string,{name:string;args:Record<string,unknown>}>={read:{name:'read_file',args:{path:'public.txt'}},write:{name:'write_file',args:{path:'result.txt',content:'NORMAL_OK'}},credential:{name:'read_file',args:{path:'secrets.txt'}},honeypot:{name:'read_file',args:{path:'.env'}},approval:{name:'mcp_tool',args:{tool:'review_workflow',arguments:{}}}};
    if(!Object.hasOwn(calls,name))throw Error('AI_RUNTIME_ACTION_INVALID');
    let result:unknown;try{result=await runtime.agent.dispatch(calls[name]);}catch(e){result={error:e instanceof Error?e.message:'EXECUTION_FAILED'};}
    return{...state(),lastResult:result};
  },async approve(id:string){const result=await runtime.operator.approve(id);return{...state(),lastResult:result};},async close(){await runtime.close();recorder.close();}};
}
