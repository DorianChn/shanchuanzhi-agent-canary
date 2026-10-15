import fs from 'node:fs';
import path from 'node:path';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {createAgentGuard} from './containment.js';
import {EvidenceRecorder} from './runtime/evidence.js';
import {createTrustedExecutionGateway} from './runtime/gateway.js';

const traceFile=process.env.AGENT_CANARY_CONNECTION_TRACE;
if(!traceFile||!path.isAbsolute(traceFile))throw Error('CONNECTION_CHECK_TRACE_PATH_REQUIRED');
const appendTrace=(event:Record<string,unknown>)=>fs.appendFileSync(traceFile,JSON.stringify(event)+'\n',{encoding:'utf8',mode:0o600});
const root=process.cwd();
const guard=createAgentGuard({sessionId:'codex-onboarding-connection-check',alert:false});
const evidence=new EvidenceRecorder();
const callbacks={
  public_read:async()=>({content:'AGENT_CANARY_GATEWAY_CONNECTION_OK',sideEffects:0}),
  hook_probe:async()=>({content:'AGENT_CANARY_HOOK_WAS_NOT_EFFECTIVE',sideEffects:0}),
};
const gateway=createTrustedExecutionGateway({
  agentId:'codex-onboarding-check',guard,workspaceRoot:root,files:[],evidence,
  mcpTools:Object.fromEntries(Object.entries(callbacks).map(([name,execute])=>[name,{risk:'READ_ONLY' as const,approvalRequired:false,execute:async()=>execute()}])),
});
const server=new Server({name:'agent-canary-gateway-connection-check',version:'3.0.0'},{capabilities:{tools:{}}});
const tools=Object.keys(callbacks).map(name=>({
  name,description:name==='public_read'?'Return a fixed local onboarding check marker. Does not access user data.':'Return a fixed Hook validation marker. Does not access user data.',
  inputSchema:{type:'object' as const,properties:{},additionalProperties:false},
}));
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
server.setRequestHandler(CallToolRequestSchema,async request=>{
  const name=request.params.name;
  if(!Object.hasOwn(callbacks,name))return{isError:true,content:[{type:'text' as const,text:'UNREGISTERED_CONNECTION_CHECK_TOOL'}]};
  const before=gateway.evidence().length;
  try{
    const result=await gateway.agent.dispatch({name:'mcp_tool',args:{tool:name,arguments:request.params.arguments??{}}});
    const events=gateway.evidence().slice(before).map(event=>({decision:event.decision,executionStatus:event.execution_status,toolId:event.tool_id}));
    appendTrace({kind:'gateway',tool:name,events});
    return{content:[{type:'text' as const,text:JSON.stringify({result,route:'createTrustedExecutionGateway.agent.dispatch',effects:'none'})}]};
  }catch(error){
    const events=gateway.evidence().slice(before).map(event=>({decision:event.decision,executionStatus:event.execution_status,toolId:event.tool_id}));
    appendTrace({kind:'gateway',tool:name,events,error:error instanceof Error?error.name:'unknown'});
    return{isError:true,content:[{type:'text' as const,text:'GATEWAY_CONNECTION_CHECK_FAILED'}]};
  }
});
await server.connect(new StdioServerTransport());
