import type {ToolCall} from '../containment.js';
import {isTrustedExecutionGateway,type TrustedExecutionGatewayReadHost} from './gateway.js';

export type GatewayReadHost=TrustedExecutionGatewayReadHost;
export type FixedFileRead={toolName:'read_file';path:string};
declare const securityGatewayHostAdapterBrand:unique symbol;
export type SecurityGatewayHostAdapter=Readonly<{[securityGatewayHostAdapterBrand]:true;
  supports:(call:ToolCall)=>boolean;
  dispatch:(call:ToolCall,signal?:AbortSignal)=>Promise<unknown>;
  callbackCount:()=>number;
}>;
const trustedAdapters=new WeakSet<object>();
export function isSecurityGatewayHostAdapter(value:unknown):value is SecurityGatewayHostAdapter{return typeof value==='object'&&value!==null&&trustedAdapters.has(value as object);}

/** M2-style adapter: only fixed host-registered read_file paths reach the held M1 Gateway. */
export function createSecurityGatewayHostAdapter(options:{gateway:GatewayReadHost;fixedFileReads:readonly FixedFileRead[]}){
  if(!options?.gateway||!isTrustedExecutionGateway(options.gateway)||typeof options.gateway.agent.dispatch!=='function'||!Array.isArray(options.fixedFileReads)||options.fixedFileReads.length===0)throw Error('M2_GATEWAY_ADAPTER_CONFIG_INVALID');
  const bindings=new Map<string,Set<string>>();
  for(const entry of options.fixedFileReads as readonly FixedFileRead[]){
    if(!entry||entry.toolName!=='read_file'||typeof entry.path!=='string'||!entry.path||entry.path.includes('\0')||entry.path.includes('\\')||entry.path.includes(':')||entry.path.startsWith('/')||entry.path.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('M2_GATEWAY_ADAPTER_BINDING_INVALID');
    const paths=bindings.get(entry.toolName)??new Set<string>();
    if(paths.has(entry.path))throw Error('M2_GATEWAY_ADAPTER_BINDING_DUPLICATE');
    paths.add(entry.path);bindings.set(entry.toolName,paths);
  }
  let callbacks=0;
  const supports=(call:ToolCall)=>!!call&&call.name==='read_file'&&!!call.args&&!Array.isArray(call.args)&&Object.keys(call.args).length===1&&typeof call.args.path==='string'&&!!bindings.get(call.name)?.has(call.args.path);
  const adapter=Object.freeze({
    supports,
    dispatch(call:ToolCall,signal?:AbortSignal){
      if(!supports(call))throw Error('M2_GATEWAY_ADAPTER_CALL_DENIED');
      callbacks++;
      return options.gateway.agent.dispatch({name:'read_file',args:{path:call.args!.path as string}},signal);
    },
    callbackCount:()=>callbacks,
  }) as unknown as SecurityGatewayHostAdapter;
  trustedAdapters.add(adapter);
  return adapter;
}
