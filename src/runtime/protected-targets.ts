import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {createAgentGuard} from '../containment.js';
import {createSecurityToolRouter} from '../security-router.js';
import {createTrustedExecutionGateway} from './gateway.js';
import {EvidenceRecorder} from './evidence.js';
import {createSecurityGatewayHostAdapter} from './gateway-adapter.js';

export type SecurityCenterProtectedTarget=Readonly<{id:string;path:string}>;
const targetIdPattern=/^[a-z][a-z0-9_-]{0,62}$/;

function validateTargets(targets:readonly SecurityCenterProtectedTarget[]|undefined){
  if(targets===undefined||targets.length===0)return[];
  if(!Array.isArray(targets)||targets.length>32)throw Error('AI_CONSOLE_TARGET_CONFIG_INVALID');
  const ids=new Set<string>(),paths=new Set<string>();
  return (targets as readonly SecurityCenterProtectedTarget[]).map(target=>{
    if(!target||typeof target.id!=='string'||!targetIdPattern.test(target.id)||ids.has(target.id)||typeof target.path!=='string'||!target.path||target.path.includes('\\')||target.path.includes('\0')||target.path.includes(':')||path.isAbsolute(target.path)||path.win32.isAbsolute(target.path)||path.posix.normalize(target.path)!==target.path||target.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(target.path))throw Error('AI_CONSOLE_TARGET_CONFIG_INVALID');
    ids.add(target.id);paths.add(target.path);
    return Object.freeze({id:target.id,path:target.path});
  });
}

/** First-party OBSERVE path from target ID -> M5 router -> M2 fixed binding -> M1 held Gateway read. */
export async function createProtectedTargetRuntime(options:{workspaceRoot?:string;targets?:readonly SecurityCenterProtectedTarget[]}){
  const targets=validateTargets(options.targets),byId=new Map(targets.map(target=>[target.id,target]));
  if(targets.length===0)return Object.freeze({
    configured:false as const,
    adapterCallbacks:()=>0,
    async read(_targetId:unknown):Promise<'UNKNOWN'>{return 'UNKNOWN';},
    async close():Promise<void>{},
  });
  const workspaceRoot=path.resolve(options.workspaceRoot??process.cwd());
  if(!path.isAbsolute(workspaceRoot))throw Error('AI_CONSOLE_TARGET_ROOT_INVALID');
  const guard=createAgentGuard({sessionId:'console-'+randomUUID(),alert:false});
  const evidence=new EvidenceRecorder();
  const gateway=createTrustedExecutionGateway({
    agentId:'console-'+randomUUID(),guard,workspaceRoot,
    files:targets.map(target=>({path:target.path})),evidence,
  });
  try{
    const adapter=createSecurityGatewayHostAdapter({gateway,fixedFileReads:targets.map(target=>({toolName:'read_file',path:target.path}))});
    const router=createSecurityToolRouter({
      guard,workspaceRoot,mode:'OBSERVE',verifyRealPaths:true,
      tools:{read_file:{operation:'file-read'}},
      secureFileReadAdapter:adapter,
      executeRealTool:()=>{throw Error('PROTECTED_TARGET_GATEWAY_ADAPTER_REQUIRED');},
    });
    return Object.freeze({
      configured:true as const,
      adapterCallbacks:adapter.callbackCount,
      async read(targetId:unknown):Promise<'ALLOW'|'DENY'|'UNKNOWN'>{
        if(typeof targetId!=='string'||!targetIdPattern.test(targetId))return 'DENY';
        const target=byId.get(targetId);if(!target)return 'DENY';
        try{
          const result=await router.dispatch({name:'read_file',args:{path:target.path}});
          const descriptor=result&&typeof result==='object'?Object.getOwnPropertyDescriptor(result,'content'):undefined;
          return descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='string'?'ALLOW':'UNKNOWN';
        }catch{return 'DENY';}
      },
      async close(){await gateway.close();},
    });
  }catch(error){await gateway.close();throw error;}
}
