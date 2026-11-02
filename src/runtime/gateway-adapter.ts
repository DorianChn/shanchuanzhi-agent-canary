import type {ToolCall} from '../containment.js';

export type GatewayReadHost={
  agent:{dispatch:(call:ToolCall,signal?:AbortSignal)=>Promise<unknown>};
};
export type FixedFileRead={toolName:'read_file';path:string};

/** M2-style adapter: only fixed host-registered read_file paths reach the held M1 Gateway. */
export function createSecurityGatewayHostAdapter(options:{gateway:GatewayReadHost;fixedFileReads:readonly FixedFileRead[]}){
  if(!options?.gateway||typeof options.gateway.agent?.dispatch!=='function'||!Array.isArray(options.fixedFileReads)||options.fixedFileReads.length===0)throw Error('M2_GATEWAY_ADAPTER_CONFIG_INVALID');
  const bindings=new Map<string,Set<string>>();
  for(const entry of options.fixedFileReads as readonly FixedFileRead[]){
    if(!entry||entry.toolName!=='read_file'||typeof entry.path!=='string'||!entry.path||entry.path.includes('\0')||entry.path.includes('\\')||entry.path.includes(':')||entry.path.startsWith('/')||entry.path.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('M2_GATEWAY_ADAPTER_BINDING_INVALID');
    const paths=bindings.get(entry.toolName)??new Set<string>();
    if(paths.has(entry.path))throw Error('M2_GATEWAY_ADAPTER_BINDING_DUPLICATE');
    paths.add(entry.path);bindings.set(entry.toolName,paths);
  }
  let callbacks=0;
  return Object.freeze({
    dispatch(call:ToolCall,signal?:AbortSignal){
      if(!call||call.name!=='read_file'||!call.args||Array.isArray(call.args)||Object.keys(call.args).length!==1||typeof call.args.path!=='string'||!bindings.get(call.name)?.has(call.args.path))throw Error('M2_GATEWAY_ADAPTER_CALL_DENIED');
      callbacks++;
      return options.gateway.agent.dispatch({name:'read_file',args:{path:call.args.path}},signal);
    },
    callbackCount:()=>callbacks,
  });
}
