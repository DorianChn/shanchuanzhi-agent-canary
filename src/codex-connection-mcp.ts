import fs from 'node:fs';
import path from 'node:path';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {fileURLToPath} from 'node:url';
import {createAgentGuard} from './containment.js';
import {EvidenceRecorder} from './runtime/evidence.js';
import {createTrustedExecutionGateway} from './runtime/gateway.js';
import {createSecurityToolRouter} from './security-router.js';

const sdkSpecifier='@dorianchn/agent-canary/sdk';
const adapterSpecifier='@dorianchn/agent-canary/gateway-adapter';
const policyRouterSpecifier='@dorianchn/agent-canary/policy-router';
const protectedTool='protected_read';
const protectedRelativePath='agent-canary-public.txt';
const protectedMarker='AGENT_CANARY_PROTECTED_FILE_READ_OK';

export type ProtectedHostAdapter = {
  status:'UNKNOWN';
  reason:string;
  dispatch?:(call:{name:string;args:unknown})=>Promise<unknown>;
  /** Live M2 capability and M5 OBSERVE status for the real bound Gateway. */
  securityCenterStatusProvider?:()=>unknown|Promise<unknown>;
  m5Callbacks:()=>number;
};
export type ProtectedProbeOutcome={status:'ALLOW'|'DENY'|'UNKNOWN';reason:string;markerMatched:boolean};

export type PublicM2HostAdapter={
  dispatch:(call:{name:string;args?:unknown})=>Promise<unknown>;
  securityCenterStatusProvider?:()=>unknown|Promise<unknown>;
};
export type PublicM2Facade={
  createSecurityGatewayHostAdapter:(options:unknown)=>PublicM2HostAdapter;
};
/** Trusted host-only seams for composing the separately owned M1/M2/M5 sources. */
export type ProtectedHostDependencies={
  loadM2Facade?:()=>Promise<PublicM2Facade>;
  /** M3-owned loader seam so incomplete package compositions can be tested without mutating exports. */
  loadM5PolicyRouter?:()=>Promise<{createSecurityToolRouter?:typeof createSecurityToolRouter}>;
  createSecurityToolRouter?:typeof createSecurityToolRouter;
};

/** Resolve the Gateway through M1's public package entry in a composed build.
 * The M3-only package still has a compatible standalone SDK for the ordinary
 * connection markers; createProtectedHostAdapter independently requires M1's
 * held-file capability methods before it can expose any protected read. */
async function loadDefaultGatewayFactory():Promise<typeof createTrustedExecutionGateway>{
  try{
    const specifier=sdkSpecifier;
    const sdk=await import(specifier) as {createTrustedExecutionGateway?:typeof createTrustedExecutionGateway};
    if(typeof sdk.createTrustedExecutionGateway==='function')return sdk.createTrustedExecutionGateway;
  }catch{/* Standalone M3 may be run from a source checkout without self-reference resolution. */}
  return createTrustedExecutionGateway;
}

/** Trusted first-party runtime inputs. These are construction-time dependencies,
 * never request/model data; the fixed probe path and callback set stay owned by M3. */
export type ConnectionCheckRuntimeDependencies=ProtectedHostDependencies&{
  workspaceRoot?:string;
  createGateway?:typeof createTrustedExecutionGateway;
};
export type ConnectionCheckRuntime={
  root:string;
  guard:ReturnType<typeof createAgentGuard>;
  evidence:EvidenceRecorder;
  callbacks:Record<string,()=>Promise<{content:string;sideEffects:number}>>;
  files:readonly {path:string}[];
  gateway:ReturnType<typeof createTrustedExecutionGateway>;
  protectedHost:ProtectedHostAdapter;
};

/**
 * Compose this first-party onboarding MCP host through M2's public strict facade.
 * M9 may inject the exact M2 package facade and M5 router implementation here;
 * both are trusted host dependencies, never values from a request or model call.
 * The M1 Gateway must still expose its opaque held-read capability methods.
 * Missing owner APIs or package composition stays UNKNOWN and has no path fallback.
 */
export async function createProtectedHostAdapter(gateway:unknown,guard:ReturnType<typeof createAgentGuard>,workspaceRoot:string,dependencies:ProtectedHostDependencies={}):Promise<ProtectedHostAdapter>{
  let m5CallbackCount=0;
  const unavailable=(reason:string):ProtectedHostAdapter=>({status:'UNKNOWN',reason,m5Callbacks:()=>m5CallbackCount});
  if(gateway===null||typeof gateway!=='object')return unavailable('M1_HELD_FILE_CAPABILITY_UNAVAILABLE');
  for(const method of ['bindFileReadCapability','verifyFileReadCapability','readFileWithCapability']){
    const descriptor=Object.getOwnPropertyDescriptor(gateway,method);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='function')return unavailable('M1_HELD_FILE_CAPABILITY_UNAVAILABLE');
  }
  let routerFactory=dependencies.createSecurityToolRouter;
  if(!routerFactory){
    try{
      // M5 owns the strict OBSERVE router. Never silently substitute M3's local
      // router when the composed package export is absent.
      const specifier=policyRouterSpecifier;
      const policy=dependencies.loadM5PolicyRouter
        ?await dependencies.loadM5PolicyRouter()
        :await import(specifier) as {createSecurityToolRouter?:typeof createSecurityToolRouter};
      if(typeof policy.createSecurityToolRouter==='function')routerFactory=policy.createSecurityToolRouter;
    }catch{/* A missing M5 public export keeps the protected route unavailable. */}
  }
  if(!routerFactory)return unavailable('M5_PUBLIC_POLICY_ROUTER_UNAVAILABLE');
  const observedM5Factory=(options:unknown)=>{
    if(options===null||typeof options!=='object'||Array.isArray(options))throw new TypeError('M5_ROUTER_OPTIONS_INVALID');
    const values=options as Record<string,unknown>;
    const executeDescriptor=Object.getOwnPropertyDescriptor(values,'executeRealTool');
    const execute=executeDescriptor&&Object.hasOwn(executeDescriptor,'value')?executeDescriptor.value:undefined;
    if(typeof execute!=='function')throw new TypeError('M2_SECURITY_GATEWAY_CAPABILITY_EXECUTOR_UNAVAILABLE');
    const providerDescriptor=Object.getOwnPropertyDescriptor(values,'fileReadCapability');
    const provider=providerDescriptor&&Object.hasOwn(providerDescriptor,'value')?providerDescriptor.value:undefined;
    if(provider===null||typeof provider!=='object')throw new TypeError('M2_FILE_READ_CAPABILITY_PROVIDER_MISSING');
    const resolveDescriptor=Object.getOwnPropertyDescriptor(provider,'resolve');
    const verifyDescriptor=Object.getOwnPropertyDescriptor(provider,'verify');
    const readDescriptor=Object.getOwnPropertyDescriptor(provider,'readFileWithCapability');
    if(!resolveDescriptor||!Object.hasOwn(resolveDescriptor,'value')||typeof resolveDescriptor.value!=='function'||
      !verifyDescriptor||!Object.hasOwn(verifyDescriptor,'value')||typeof verifyDescriptor.value!=='function'||
      readDescriptor&&(!Object.hasOwn(readDescriptor,'value')||typeof readDescriptor.value!=='function')){
      throw new TypeError('M2_SECURITY_GATEWAY_FILE_READ_PROVIDER_UNAVAILABLE');
    }
    const resolve=resolveDescriptor.value as (...args:unknown[])=>unknown;
    const verify=verifyDescriptor.value as (...args:unknown[])=>unknown;
    const ownerRead=readDescriptor?.value as ((...args:unknown[])=>unknown)|undefined;
    // M2's current public facade exposes the opaque-capability resolver and
    // verifier, plus an executor that accepts that same capability in its
    // context and then calls M1's held-file read. Adapt that supported shape
    // to M5's read method; never pass a path-only callback or an unverified
    // capability through this boundary.
    const fileReadCapability=Object.freeze({
      resolve:(call:unknown)=>Reflect.apply(resolve,provider,[call]),
      verify:(capability:unknown,call:unknown,operation:unknown)=>Reflect.apply(verify,provider,[capability,call,operation]),
      readFileWithCapability:(capability:unknown,call:unknown,signal?:AbortSignal)=>{
        const readSignal=signal??new AbortController().signal;
        if(readSignal===null||typeof readSignal!=='object'||typeof readSignal.aborted!=='boolean'||
          typeof readSignal.addEventListener!=='function'||typeof readSignal.removeEventListener!=='function'||readSignal.aborted||
          Reflect.apply(verify,provider,[capability,call,'file-read'])!==true){
          throw new TypeError('M2_SECURITY_GATEWAY_CAPABILITY_INVALID');
        }
        m5CallbackCount++;
        if(ownerRead)return Reflect.apply(ownerRead,provider,[capability,call,readSignal]);
        return Reflect.apply(execute,undefined,[call,Object.freeze({signal:readSignal,fileReadCapability:capability})]);
      },
    });
    const observed={...values,fileReadCapability};
    return routerFactory(observed as never);
  };
  let facade:PublicM2Facade|undefined;
  try{
    if(dependencies.loadM2Facade){
      facade=await dependencies.loadM2Facade();
    }else{
      // Keep this dynamic: the M2 facade is added by the separately owned M2 PR.
      // TypeScript intentionally does not resolve the not-yet-composed self export.
      const load=adapterSpecifier;
      facade=await import(load) as PublicM2Facade;
    }
  }catch{
    return unavailable('M2_PUBLIC_ADAPTER_UNAVAILABLE');
  }
  if(typeof facade?.createSecurityGatewayHostAdapter!=='function')return unavailable('M2_PUBLIC_ADAPTER_UNAVAILABLE');
  try{
    const host=facade.createSecurityGatewayHostAdapter({
      gateway,
      fixedFileReads:{[protectedTool]:[protectedRelativePath]},
      createSecurityToolRouter:observedM5Factory,
      routerOptions:{guard,workspaceRoot,mode:'OBSERVE',verifyRealPaths:true},
    });
    const statusDescriptor=Object.getOwnPropertyDescriptor(host,'securityCenterStatusProvider');
    const securityCenterStatusProvider=statusDescriptor&&Object.hasOwn(statusDescriptor,'value')&&typeof statusDescriptor.value==='function'
      ?statusDescriptor.value as ()=>unknown|Promise<unknown>
      :undefined;
    return{
      status:'UNKNOWN',reason:'POSITIVE_CONTROL_PENDING',
      dispatch:call=>host.dispatch(call as never),
      securityCenterStatusProvider,
      m5Callbacks:()=>m5CallbackCount,
    };
  }catch(error){
    const code=error instanceof Error?error.message:'';
    const reason=code==='M2_SECURITY_GATEWAY_CAPABILITY_UNAVAILABLE'||code==='M2_SECURITY_GATEWAY_HANDLE_INVALID'
      ?'M1_HELD_FILE_CAPABILITY_UNAVAILABLE'
      :code==='M2_SECURITY_GATEWAY_FILE_READ_PROVIDER_UNAVAILABLE'||code==='M2_FILE_READ_CAPABILITY_PROVIDER_MISSING'||code==='M2_SECURITY_GATEWAY_CAPABILITY_EXECUTOR_UNAVAILABLE'
        ?'M2_CAPABILITY_PROVIDER_UNAVAILABLE'
      :'M5_STRICT_ROUTER_COMPOSITION_UNAVAILABLE';
    return unavailable(reason);
  }
}

function isExactProtectedProbeArgs(value:unknown):boolean{
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const keys=Reflect.ownKeys(value);
  const descriptor=Object.getOwnPropertyDescriptor(value,'path');
  return keys.length===1&&keys[0]==='path'&&descriptor!==undefined&&Object.hasOwn(descriptor,'value')&&descriptor.value===protectedRelativePath;
}

/** Reject model supplied aliases in the M3 host before entering the M5 callback. */
export async function dispatchProtectedRead(host:ProtectedHostAdapter,args:unknown):Promise<ProtectedProbeOutcome>{
  if(!isExactProtectedProbeArgs(args))return{status:'DENY',reason:'FIXED_PROBE_PATH_REQUIRED',markerMatched:false};
  if(!host.dispatch)return{status:'UNKNOWN',reason:host.reason,markerMatched:false};
  try{
    const result=await host.dispatch({name:protectedTool,args});
    const markerMatched=(typeof result==='string'?result:JSON.stringify(result)??'').includes(protectedMarker);
    return markerMatched
      ?{status:'ALLOW',reason:'HELD_FILE_POSITIVE_CONTROL',markerMatched:true}
      :{status:'UNKNOWN',reason:'PROTECTED_READ_RESULT_UNEXPECTED',markerMatched:false};
  }catch{return{status:'DENY',reason:'PROTECTED_HOST_DISPATCH_DENIED',markerMatched:false};}
}

function appendTrace(traceFile:string,event:Record<string,unknown>){
  fs.appendFileSync(traceFile,JSON.stringify(event)+'\n',{encoding:'utf8',mode:0o600});
}

/** Build the actual first-party connection-check host route from trusted host inputs. */
export async function createConnectionCheckRuntime(dependencies:ConnectionCheckRuntimeDependencies={}):Promise<ConnectionCheckRuntime>{
  const root=dependencies.workspaceRoot??process.cwd();
  if(!path.isAbsolute(root))throw Error('CONNECTION_CHECK_WORKSPACE_ROOT_INVALID');
  const guard=createAgentGuard({sessionId:'codex-onboarding-connection-check',alert:false});
  const evidence=new EvidenceRecorder();
  const callbacks={
    public_read:async()=>({content:'AGENT_CANARY_GATEWAY_CONNECTION_OK',sideEffects:0}),
    hook_probe:async()=>({content:'AGENT_CANARY_HOOK_WAS_NOT_EFFECTIVE',sideEffects:0}),
  };
  const files=fs.existsSync(path.join(root,protectedRelativePath))?[{path:protectedRelativePath}]:[];
  const gatewayFactory=dependencies.createGateway??await loadDefaultGatewayFactory();
  const gateway=gatewayFactory({
    agentId:'codex-onboarding-check',guard,workspaceRoot:root,files,evidence,
    mcpTools:Object.fromEntries(Object.entries(callbacks).map(([name,execute])=>[name,{risk:'READ_ONLY' as const,approvalRequired:false,execute:async()=>execute()}])),
  });
  const protectedHost=files.length===1
    ?await createProtectedHostAdapter(gateway,guard,root,dependencies)
    :{status:'UNKNOWN' as const,reason:'FIXED_PROBE_FILE_UNAVAILABLE',m5Callbacks:()=>0};
  return{root,guard,evidence,callbacks,files,gateway,protectedHost};
}

export async function runConnectionCheckMcp(dependencies:ConnectionCheckRuntimeDependencies={}){
  const traceFile=process.env.AGENT_CANARY_CONNECTION_TRACE;
  if(!traceFile||!path.isAbsolute(traceFile))throw Error('CONNECTION_CHECK_TRACE_PATH_REQUIRED');
  const {root,guard,evidence,callbacks,gateway,protectedHost}=await createConnectionCheckRuntime(dependencies);
  const server=new Server({name:'agent-canary-gateway-connection-check',version:'3.0.0'},{capabilities:{tools:{}}});
  const tools=[...Object.keys(callbacks).map(name=>({
    name,description:name==='public_read'?'Return a fixed local onboarding check marker. Does not access user data.':'Return a fixed Hook validation marker. Does not access user data.',
    inputSchema:{type:'object' as const,properties:{},additionalProperties:false},
  })),{
    name:protectedTool,
    description:'Read only the fixed, temporary Agent Canary onboarding probe through the protected host route.',
    inputSchema:{type:'object' as const,properties:{path:{type:'string' as const}},required:['path'],additionalProperties:false},
  }];
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
  server.setRequestHandler(CallToolRequestSchema,async request=>{
    const name=request.params.name;
    if(name===protectedTool){
      const callbacksBefore=protectedHost.m5Callbacks();
      const outcome=await dispatchProtectedRead(protectedHost,request.params.arguments??{});
      appendTrace(traceFile,{kind:'protected-host',tool:name,status:outcome.status,reason:outcome.reason,m5Callbacks:protectedHost.m5Callbacks()-callbacksBefore,markerMatched:outcome.markerMatched});
      if(outcome.status!=='ALLOW')return{isError:true,content:[{type:'text' as const,text:outcome.status==='UNKNOWN'?'PROTECTED_HOST_NOT_VERIFIED':'PROTECTED_HOST_DISPATCH_DENIED'}]};
      return{content:[{type:'text' as const,text:protectedMarker}]};
    }
    if(!Object.hasOwn(callbacks,name))return{isError:true,content:[{type:'text' as const,text:'UNREGISTERED_CONNECTION_CHECK_TOOL'}]};
    const before=gateway.evidence().length;
    try{
      const result=await gateway.agent.dispatch({name:'mcp_tool',args:{tool:name,arguments:request.params.arguments??{}}});
      const events=gateway.evidence().slice(before).map(event=>({decision:event.decision,executionStatus:event.execution_status,toolId:event.tool_id}));
      appendTrace(traceFile,{kind:'gateway',tool:name,events});
      return{content:[{type:'text' as const,text:JSON.stringify({result,route:'createTrustedExecutionGateway.agent.dispatch',effects:'none'})}]};
    }catch(error){
      const events=gateway.evidence().slice(before).map(event=>({decision:event.decision,executionStatus:event.execution_status,toolId:event.tool_id}));
      appendTrace(traceFile,{kind:'gateway',tool:name,events,error:error instanceof Error?error.name:'unknown'});
      return{isError:true,content:[{type:'text' as const,text:'GATEWAY_CONNECTION_CHECK_FAILED'}]};
    }
  });
  await server.connect(new StdioServerTransport());
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await runConnectionCheckMcp();
