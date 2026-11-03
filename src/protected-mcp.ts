import {Server} from '@modelcontextprotocol/sdk/server/index.js';import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';import {randomUUID} from 'node:crypto';
import {DECOY_TOOLS} from './decoys.js';import {createSecurityToolRouter,type SecurityRouterOptions} from './security-router.js';
import {createAgentGuard} from './containment.js';import {createTrustedExecutionGateway} from './runtime/gateway.js';import {createSecurityGatewayHostAdapter} from './runtime/gateway-adapter.js';import {EvidenceRecorder} from './runtime/evidence.js';
/** Host-owned registered callbacks only. Never intercepts another server or native client tools. */
export async function serveProtectedMCP<T>(options:SecurityRouterOptions<T>&{
  schemas:Record<string,{description:string;inputSchema:Record<string,unknown>}>;
  instructions?:string;
  onClose?:()=>void|Promise<void>;
}){
  const {schemas,instructions,onClose,...routerOptions}=options,router=createSecurityToolRouter(routerOptions);
  const server=new Server({name:'agent-canary-protected-host',version:'2.0.0-preview'},{capabilities:{tools:{}},instructions:instructions??'Host-registered callbacks use deterministic policy and Guard. Other MCP servers and native client tools are OUT_OF_SCOPE. AI cannot grant approval. Decoys are inert.'});
  const names=Object.keys(routerOptions.tools);if(names.some(n=>!Object.hasOwn(schemas,n)||DECOY_TOOLS.some(d=>d.name===n)))throw Error('PROTECTED_MCP_SCHEMA_INVALID');
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...DECOY_TOOLS,...names.map(name=>({name,...schemas[name]}))]}));
  server.setRequestHandler(CallToolRequestSchema,async req=>{
    try{return {content:[{type:'text' as const,text:JSON.stringify({result:await router.dispatch({name:req.params.name,args:req.params.arguments??{}}),scope:'HOST_REGISTERED_CALLBACKS_ONLY'})}]};}
    catch(error){const safe=error instanceof Error&&['PolicyBlockedError','CanaryBlockedError'].includes(error.name)?error.message:'TOOL_CALLBACK_FAILED';return {isError:true,content:[{type:'text' as const,text:JSON.stringify({error:safe,guardState:routerOptions.guard.state})}]};}
  });
  if(onClose)server.onclose=()=>{void Promise.resolve(onClose()).catch(()=>{});};
  await server.connect(new StdioServerTransport());return {server,router};
}

/**
 * Start an opt-in model-facing MCP host whose only real file tool reads the
 * explicit startup allowlist through the M1 Gateway, M2 adapter, and M5 router.
 */
export async function serveProtectedFileMCP(options:{workspaceRoot:string;paths:readonly string[]}){
  if(!options||typeof options.workspaceRoot!=='string'||!path.isAbsolute(options.workspaceRoot)||!Array.isArray(options.paths)||options.paths.length===0||options.paths.length>32)throw Error('PROTECTED_MCP_CONFIG_INVALID');
  const paths=options.paths.map(value=>{
    if(typeof value!=='string'||!value||value.includes('\\')||value.includes('\0')||value.includes(':')||path.isAbsolute(value)||path.win32.isAbsolute(value)||path.posix.normalize(value)!==value||value.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('PROTECTED_MCP_PATH_INVALID');
    return value;
  });
  const pathKeys=new Set<string>();
  for(const value of paths){const key=process.platform==='win32'||process.platform==='darwin'?value.toLowerCase():value;if(pathKeys.has(key))throw Error('PROTECTED_MCP_PATH_DUPLICATE');pathKeys.add(key);}
  if(DECOY_TOOLS.some(tool=>tool.name==='read_file'))throw Error('PROTECTED_MCP_TOOL_NAME_CONFLICT');

  const workspaceRoot=path.resolve(options.workspaceRoot),guard=createAgentGuard({sessionId:`protected-mcp-${randomUUID()}`,alert:false}),evidence=new EvidenceRecorder();
  const gateway=createTrustedExecutionGateway({agentId:`protected-mcp-${randomUUID()}`,guard,workspaceRoot,files:paths.map(filePath=>({path:filePath})),evidence});
  try{
    const secureFileReadAdapter=createSecurityGatewayHostAdapter({gateway,fixedFileReads:paths.map(filePath=>({toolName:'read_file' as const,path:filePath}))});
    const routerOptions={
      guard,workspaceRoot,mode:'OBSERVE' as const,verifyRealPaths:true,
      tools:{read_file:{operation:'file-read' as const}},secureFileReadAdapter,
      executeRealTool:()=>{throw Error('PROTECTED_MCP_GATEWAY_REQUIRED');},
    };
    const preflight=createSecurityToolRouter(routerOptions);
    for(const filePath of paths){
      const decision=await preflight.decide({name:'read_file',args:{path:filePath}});
      if(decision.action==='DENY')throw Error('PROTECTED_MCP_TARGET_DENIED');
    }
    const running=await serveProtectedMCP({
      ...routerOptions,
      instructions:'This MCP server exposes read_file only for the explicit host-registered allowlist. Allowed file content is returned to the requesting MCP client. Arbitrary paths, sensitive files, and other host or native tools are not covered.',
      onClose:()=>gateway.close(),
      schemas:{read_file:{
        description:'Read one host-registered file from the startup allowlist. The selected file content is returned to this MCP client; arbitrary paths are denied.',
        inputSchema:{type:'object',properties:{path:{type:'string',enum:[...paths]}},required:['path'],additionalProperties:false},
      }},
    });
    return running;
  }catch(error){await gateway.close();throw error;}
}
