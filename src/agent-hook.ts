import path from 'node:path';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {createAgentGuard,type ContainmentStateStore} from './containment.js';import {createSecurityToolRouter} from './security-router.js';import {isDecoy} from './sdk.js';
function hookStore(directory:string):ContainmentStateStore{
 fs.mkdirSync(directory,{recursive:true,mode:0o700});if(fs.lstatSync(directory).isSymbolicLink())throw Error('HOOK_STATE_SYMLINK');
 const file=(scope:string)=>path.join(directory,createHash('sha256').update(scope).digest('hex')+'.quarantine');
 const get=(scope:string)=>{try{const name=file(scope),stat=fs.lstatSync(name);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>1000)throw Error('HOOK_STATE_UNSAFE');if(fs.readFileSync(name,'utf8')!=='QUARANTINED\n')throw Error('HOOK_STATE_CORRUPT');return 'QUARANTINED' as const;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e;}};
 return {get,quarantine(scope){try{fs.writeFileSync(file(scope),'QUARANTINED\n',{flag:'wx',mode:0o600});return true;}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return get(scope)==='QUARANTINED';throw e;}},reset(){throw Error('HOOK_RESET_UNSUPPORTED');}};
}
/** Official hook protocol adapter. Input fixtures verified; actual client activation is separate. */
export async function decideAgentHook(client:'claude'|'cursor',workspaceRoot:string,stateDirectory:string,input:Record<string,unknown>){
 if(!['claude','cursor'].includes(client)||!path.isAbsolute(workspaceRoot)||!path.isAbsolute(stateDirectory)||Buffer.byteLength(JSON.stringify(input))>32_000)throw Error('HOOK_INPUT_INVALID');
 const session=String(input.session_id??input.conversation_id??'');if(!/^[a-zA-Z0-9_.-]{1,128}$/.test(session))throw Error('HOOK_SESSION_REQUIRED');
 const name=String(input.tool_name??(typeof input.command==='string'?'Shell':'Unknown'));
 const raw=input.tool_input&&typeof input.tool_input==='object'&&!Array.isArray(input.tool_input)?input.tool_input as Record<string,unknown>:input;
 const principal=createHash('sha256').update(client+':'+session).digest('hex');
 const guard=createAgentGuard({sessionId:principal,principalId:principal,stateStore:hookStore(stateDirectory),alert:false});
 const decoy=name.split('__').at(-1)??name;
 let permission:'allow'|'deny'|'ask'='ask',reason='unregistered_tool';
 if(isDecoy(decoy)){await guard.runDecoy(decoy,{});permission='deny';reason='canary_quarantine';}
 else{
  const shell=['Bash','Shell','run_shell'].includes(name),read=['Read','read_file'].includes(name),write=['Write','Edit','write_file'].includes(name),del=['Delete','delete_file'].includes(name);
  const tool=shell?'shell':read?'read':write?'write':del?'delete':'unknown';let target=raw.file_path??raw.path;
  if(typeof target==='string'&&path.isAbsolute(target))target=path.relative(workspaceRoot,target);
  const router=createSecurityToolRouter({guard,workspaceRoot,verifyRealPaths:true,tools:{shell:{operation:'shell'},read:{operation:'file-read'},write:{operation:'file-write'},delete:{operation:'delete'}},executeRealTool:()=>{throw Error('HOOK_NEVER_EXECUTES');}});
  const d=await router.decide({name:tool,args:{...(target===undefined?{}:{path:target}),...(raw.command===undefined?{}:{command:raw.command})}});permission=d.action==='ALLOW'?'allow':d.action==='DENY'?'deny':'ask';reason=d.reason;
 }
 return client==='claude'?{hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:permission,permissionDecisionReason:'Agent Canary: '+reason}}:{permission,user_message:'Agent Canary: '+reason,agent_message:'Trusted host policy decision; no model may change this authorization.'};
}
