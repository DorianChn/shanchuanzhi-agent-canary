import {requestAIJson} from './ai/transport.js';import type {ToolCall} from './containment.js';
/** Optional real JSON HTTP callback: public HTTPS, checked/pinned DNS, no redirects, 256 KB cap. */
export async function executePinnedJSONTool(call:ToolCall,context:{signal:AbortSignal}){
 const u=new URL(String(call.args?.url??''));if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('NETWORK_TOOL_TARGET_INVALID');
 const method=String(call.args?.method??'POST').toUpperCase();if(!['GET','POST'].includes(method)||method==='GET'&&call.args?.body!==undefined)throw Error('NETWORK_TOOL_METHOD_INVALID');
 return requestAIJson({id:'guarded-json-tool',kind:'cloud',protocol:'openai-compatible',baseUrl:u.origin,model:'not-an-ai-request'},u.pathname,method==='GET'?undefined:call.args?.body??{},context.signal);
}
