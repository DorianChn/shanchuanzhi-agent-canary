import {Server} from '@modelcontextprotocol/sdk/server/index.js';import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {DECOY_TOOLS} from './decoys.js';import {createSecurityToolRouter,type SecurityRouterOptions} from './security-router.js';
/** Host-owned registered callbacks only. Never intercepts another server or native client tools. */
export async function serveProtectedMCP<T>(options:SecurityRouterOptions<T>&{schemas:Record<string,{description:string;inputSchema:Record<string,unknown>}>}){
  const router=createSecurityToolRouter(options);
  const server=new Server({name:'agent-canary-protected-host',version:'2.0.0-preview'},{capabilities:{tools:{}},instructions:'Host-registered callbacks use deterministic policy and Guard. Other MCP servers and native client tools are OUT_OF_SCOPE. AI cannot grant approval. Decoys are inert.'});
  const names=Object.keys(options.tools);if(names.some(n=>!Object.hasOwn(options.schemas,n)||DECOY_TOOLS.some(d=>d.name===n)))throw Error('PROTECTED_MCP_SCHEMA_INVALID');
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...DECOY_TOOLS,...names.map(name=>({name,...options.schemas[name]}))]}));
  server.setRequestHandler(CallToolRequestSchema,async req=>{
    try{return {content:[{type:'text' as const,text:JSON.stringify({result:await router.dispatch({name:req.params.name,args:req.params.arguments??{}}),scope:'HOST_REGISTERED_CALLBACKS_ONLY'})}]};}
    catch(error){const safe=error instanceof Error&&['PolicyBlockedError','CanaryBlockedError'].includes(error.name)?error.message:'TOOL_CALLBACK_FAILED';return {isError:true,content:[{type:'text' as const,text:JSON.stringify({error:safe,guardState:options.guard.state})}]};}
  });
  await server.connect(new StdioServerTransport());return {server,router};
}
