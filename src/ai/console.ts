import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import {promisify} from 'node:util';
import { readEvents } from '../alerts.js';
import { createAIProvider, PROVIDER_PRESETS, previewAnalysis, redactAnalysisText, formatAnalysisEvent } from './provider.js';
import type { ProviderConfig, SecurityAnalysisResult } from './types.js';
import { CONSOLE_PAGE } from './console-page.js';
import { runAdvisoryDemo } from './demo.js';
import { renderAIReport } from './report.js';
import {createPolicySandbox} from './policy-demo.js';
import os from 'node:os';
import {detectAgents,previewAgentIntegration,installAgentIntegration,restoreAgentIntegration,type AgentClient} from '../agent-integrations.js';
import {createRuntimeDemo} from '../runtime/demo.js';
import type {AgentGuard} from '../containment.js';
import type {EvidenceRecorder} from '../runtime/evidence.js';
import {createProtectedHostAdapter,type PublicM2Facade,type PublicM2HostAdapter,type ProtectedHostDependencies} from '../codex-connection-mcp.js';

const protectedReadRoute='/api/security-center/protected-read';
const protectedReadFile='agent-canary-public.txt';
const protectedReadMarker='AGENT_CANARY_CONSOLE_PROTECTED_READ_OK';
const protectedReadScope='M3_FIXED_TEMP_PROBE_ONLY';
type SecurityToolRouterFactory=NonNullable<ProtectedHostDependencies['createSecurityToolRouter']>;
type ProtectedReadReason='FIXED_PROBE_CONTROLS_PASSED'|'OWNER_ADAPTER_UNAVAILABLE'|'OWNER_ROUTE_NOT_CONFIRMED'|'INTEGRITY_MISMATCH'|'OWNER_POLICY_DENIED'|'OWNER_DISPATCH_FAILED'|'CLEANUP_FAILED'|'REQUEST_AUTH_REQUIRED'|'REQUEST_INVALID';
type ProtectedReadGateway={
  bindFileReadCapability:(binding:{toolName:string;operation:'file-read';path:string;pathArg?:string})=>object;
  verifyFileReadCapability:(capability:object,call:{name:string;args:Record<string,unknown>},operation:'file-read')=>boolean;
  readFileWithCapability:(capability:object,call:{name:string;args:Record<string,unknown>},operation:'file-read',signal?:AbortSignal)=>Promise<unknown>;
  evidence?:()=>unknown[];
  close:()=>Promise<void>;
};
type ProtectedReadGatewayFactory=(options:{agentId:string;guard:AgentGuard;workspaceRoot:string;files:readonly {path:string}[];evidence:EvidenceRecorder})=>ProtectedReadGateway;
type ProtectedReadDependencies={
  createGuard:(options:{sessionId:string;alert:boolean})=>AgentGuard;
  createEvidenceRecorder:()=>EvidenceRecorder;
  createGateway:ProtectedReadGatewayFactory;
  loadM2Facade:()=>Promise<PublicM2Facade>;
  createSecurityToolRouter:SecurityToolRouterFactory;
};
export type SecurityCenterProtectedReadDependencies=()=>Promise<ProtectedReadDependencies>;

async function loadDefaultProtectedReadDependencies():Promise<ProtectedReadDependencies>{
  // These are package self-references to the public M1 Gateway, M5 policy
  // router, and M2 facade. Keep them runtime-resolved: this M3-only checkout
  // does not yet export the M5/M2 subpaths, while integration adds them.
  const sdkSpecifier:string='@dorianchn/agent-canary/sdk';
  const policyRouterSpecifier:string='@dorianchn/agent-canary/policy-router';
  const adapterSpecifier:string='@dorianchn/agent-canary/gateway-adapter';
  const [sdkValue,policyRouterValue,adapterValue]=await Promise.all([import(sdkSpecifier),import(policyRouterSpecifier),import(adapterSpecifier)]);
  const sdk=sdkValue as unknown as {
    createAgentGuard?:(options:{sessionId:string;alert:boolean})=>AgentGuard;
    EvidenceRecorder?:new()=>EvidenceRecorder;
    createTrustedExecutionGateway?:ProtectedReadGatewayFactory;
  };
  const policyRouter=policyRouterValue as unknown as {createSecurityToolRouter?:SecurityToolRouterFactory};
  const facade=adapterValue as unknown as PublicM2Facade;
  if(typeof sdk.createAgentGuard!=='function'||typeof sdk.EvidenceRecorder!=='function'||typeof sdk.createTrustedExecutionGateway!=='function'||typeof policyRouter.createSecurityToolRouter!=='function'||typeof facade?.createSecurityGatewayHostAdapter!=='function')throw new Error('PROTECTED_READ_DEPENDENCY_UNAVAILABLE');
  return{
    createGuard:sdk.createAgentGuard,
    createEvidenceRecorder:()=>new sdk.EvidenceRecorder!(),
    createGateway:sdk.createTrustedExecutionGateway,
    loadM2Facade:async()=>facade,
    createSecurityToolRouter:policyRouter.createSecurityToolRouter,
  };
}

function protectedReadEnvelope(status:'PASS'|'DENY'|'UNKNOWN',reason:ProtectedReadReason,markerMatched:boolean){
  return{scope:protectedReadScope,status,reason,markerMatched};
}

function isEmptyProtectedReadRequest(value:unknown):boolean{
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  return Reflect.ownKeys(value).length===0;
}

function isExplicitProtectedReadDenial(error:unknown):boolean{
  const decision=ownDataValue(error,'decision');
  return decision==='DENY'||ownDataValue(decision,'action')==='DENY';
}

function containsTempPath(root:string,candidate:string):boolean{
  const relative=path.relative(root,candidate);
  return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
}

function protectedReadEvidenceCount(gateway:ProtectedReadGateway):number|undefined{
  const descriptor=Object.getOwnPropertyDescriptor(gateway,'evidence');
  if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='function')return undefined;
  try{
    const events=Reflect.apply(descriptor.value,gateway,[]);
    return Array.isArray(events)?events.length:undefined;
  }catch{return undefined;}
}

function hasExactOwnerError(error:unknown,code:string):boolean{
  return error instanceof Error&&error.message===code;
}

function removeVerifiedDirectoryAlias(aliasPath:string,targetPath:string,identity:{dev:number;ino:number}):void{
  const aliasStat=fs.lstatSync(aliasPath);
  if(!aliasStat.isSymbolicLink()||aliasStat.dev!==identity.dev||aliasStat.ino!==identity.ino||fs.realpathSync(aliasPath)!==targetPath)throw new Error('PROTECTED_READ_ALIAS_CLEANUP_UNSAFE');
  if(process.platform==='win32')fs.rmdirSync(aliasPath);else fs.unlinkSync(aliasPath);
}

async function runConsoleProtectedRead(loadDependencies:SecurityCenterProtectedReadDependencies|undefined){
  let outcome=protectedReadEnvelope('UNKNOWN','OWNER_ADAPTER_UNAVAILABLE',false);
  let gateway:ProtectedReadGateway|undefined;
  let tempRoot:string|undefined;
  let tempDirectory:string|undefined;
  let aliasDirectory:string|undefined;
  let directoryIdentity:{dev:number;ino:number}|undefined;
  let fileIdentity:{dev:number;ino:number}|undefined;
  let aliasDirectoryIdentity:{dev:number;ino:number}|undefined;
  let replacementIdentity:{dev:number;ino:number}|undefined;
  let replacementStage:'created'|'original-held'|'active'|undefined;
  let cleanupSucceeded=true;
  if(!loadDependencies)return outcome;
  try{
    const dependencies=await loadDependencies();
    if(typeof dependencies.createGateway!=='function'||typeof dependencies.loadM2Facade!=='function'||typeof dependencies.createSecurityToolRouter!=='function')throw new Error('PROTECTED_READ_DEPENDENCY_UNAVAILABLE');
    const facade=await dependencies.loadM2Facade();
    if(typeof facade?.createSecurityGatewayHostAdapter!=='function')throw new Error('PROTECTED_READ_DEPENDENCY_UNAVAILABLE');
    tempRoot=fs.realpathSync(os.tmpdir());
    tempDirectory=fs.mkdtempSync(path.join(tempRoot,'agent-canary-console-probe-'));
    const realDirectory=fs.realpathSync(tempDirectory),directoryStat=fs.lstatSync(tempDirectory);
    directoryIdentity={dev:directoryStat.dev,ino:directoryStat.ino};
    if(realDirectory!==tempDirectory||!containsTempPath(tempRoot,realDirectory)||!directoryStat.isDirectory()||directoryStat.isSymbolicLink())throw new Error('PROTECTED_READ_TEMP_DIRECTORY_UNSAFE');
    const probePath=path.join(tempDirectory,protectedReadFile);
    const probeDescriptor=fs.openSync(probePath,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW??0),0o600);
    try{
      const createdProbeStat=fs.fstatSync(probeDescriptor);
      fileIdentity={dev:createdProbeStat.dev,ino:createdProbeStat.ino};
      if(!createdProbeStat.isFile()||createdProbeStat.nlink!==1)throw new Error('PROTECTED_READ_TEMP_FILE_UNSAFE');
      fs.writeFileSync(probeDescriptor,protectedReadMarker,'utf8');
    }finally{fs.closeSync(probeDescriptor);}
    const realProbePath=fs.realpathSync(probePath),probeStat=fs.lstatSync(probePath);
    if(realProbePath!==probePath||!probeStat.isFile()||probeStat.isSymbolicLink()||probeStat.nlink!==1||probeStat.size!==Buffer.byteLength(protectedReadMarker)||probeStat.dev!==fileIdentity.dev||probeStat.ino!==fileIdentity.ino)throw new Error('PROTECTED_READ_TEMP_FILE_UNSAFE');
    const guard=dependencies.createGuard({sessionId:'console-protected-read-'+randomBytes(12).toString('hex'),alert:false});
    gateway=dependencies.createGateway({agentId:'agent-canary-console-probe',guard,workspaceRoot:tempDirectory,files:[{path:protectedReadFile}],evidence:dependencies.createEvidenceRecorder()});
    const initialEvidence=protectedReadEvidenceCount(gateway);
    const host=initialEvidence===undefined?undefined:await createProtectedHostAdapter(gateway,guard,tempDirectory,{loadM2Facade:async()=>facade,createSecurityToolRouter:dependencies.createSecurityToolRouter});
    if(initialEvidence===undefined){outcome=protectedReadEnvelope('UNKNOWN','OWNER_ROUTE_NOT_CONFIRMED',false);}
    else if(!host?.dispatch){outcome=protectedReadEnvelope('UNKNOWN','OWNER_ADAPTER_UNAVAILABLE',false);}
    else{
      const before=host.m5Callbacks();
      try{
        const result=await host.dispatch({name:'protected_read',args:{path:protectedReadFile}});
        const matched=result===protectedReadMarker||ownDataValue(result,'content')===protectedReadMarker;
        const positiveEvidence=protectedReadEvidenceCount(gateway);
        if(!matched){
          outcome=protectedReadEnvelope('UNKNOWN','INTEGRITY_MISMATCH',false);
        }else if(host.m5Callbacks()-before!==1||positiveEvidence===undefined||positiveEvidence<=initialEvidence){
          outcome=protectedReadEnvelope('UNKNOWN','OWNER_ROUTE_NOT_CONFIRMED',false);
        }else{
          const positiveCallbackCount=host.m5Callbacks();
          const aliasEvidenceBefore=protectedReadEvidenceCount(gateway);
          let aliasDenied=false;
          try{await host.dispatch({name:'protected_read',args:{path:'./agent-canary-public.txt'}});}
          catch(error){aliasDenied=hasExactOwnerError(error,'M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED');}
          const aliasEvidenceAfter=protectedReadEvidenceCount(gateway);
          if(!aliasDenied||host.m5Callbacks()!==positiveCallbackCount||aliasEvidenceBefore===undefined||aliasEvidenceBefore!==positiveEvidence||aliasEvidenceAfter!==aliasEvidenceBefore){
            outcome=protectedReadEnvelope('UNKNOWN','OWNER_ROUTE_NOT_CONFIRMED',false);
          }else{
            const probePath=path.join(tempDirectory,protectedReadFile);
            const aliasCandidate=path.join(tempRoot,`agent-canary-console-probe-alias-${randomBytes(12).toString('hex')}`);
            fs.symlinkSync(tempDirectory,aliasCandidate,process.platform==='win32'?'junction':'dir');
            aliasDirectory=aliasCandidate;
            const aliasStat=fs.lstatSync(aliasDirectory);
            aliasDirectoryIdentity={dev:aliasStat.dev,ino:aliasStat.ino};
            const aliasProbePath=path.join(aliasDirectory,protectedReadFile);
            const aliasArgument=path.relative(tempDirectory,aliasProbePath);
            const aliasTargetMatches=aliasStat.isSymbolicLink()&&fs.statSync(aliasDirectory).isDirectory()&&fs.realpathSync(aliasDirectory)===tempDirectory&&fs.realpathSync(aliasProbePath)===probePath&&aliasArgument!==protectedReadFile&&aliasArgument!=='';
            const junctionEvidenceBefore=protectedReadEvidenceCount(gateway);
            const junctionCallbackCount=host.m5Callbacks();
            let junctionDenied=false;
            try{await host.dispatch({name:'protected_read',args:{path:aliasArgument}});}
            catch(error){junctionDenied=hasExactOwnerError(error,'M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED');}
            const junctionEvidenceAfter=protectedReadEvidenceCount(gateway);
            const probeAfterAlias=fs.lstatSync(probePath);
            const probeStillHeld=!probeAfterAlias.isSymbolicLink()&&probeAfterAlias.isFile()&&probeAfterAlias.nlink===1&&probeAfterAlias.dev===fileIdentity.dev&&probeAfterAlias.ino===fileIdentity.ino;
            const junctionAliasRejected=aliasTargetMatches&&junctionDenied&&host.m5Callbacks()===junctionCallbackCount&&junctionEvidenceBefore!==undefined&&junctionEvidenceBefore===positiveEvidence&&junctionEvidenceAfter===junctionEvidenceBefore&&probeStillHeld;
            if(!junctionAliasRejected){
              outcome=protectedReadEnvelope('UNKNOWN','OWNER_ROUTE_NOT_CONFIRMED',false);
            }else{
              removeVerifiedDirectoryAlias(aliasDirectory,tempDirectory,aliasDirectoryIdentity);
              aliasDirectory=undefined;
              aliasDirectoryIdentity=undefined;
              const heldPath=path.join(tempDirectory,protectedReadFile+'.held');
              const replacementPath=path.join(tempDirectory,protectedReadFile+'.replacement');
              const currentEntries=fs.readdirSync(tempDirectory);
              if(currentEntries.length!==1||currentEntries[0]!==protectedReadFile||fs.existsSync(heldPath)||fs.existsSync(replacementPath)){
                outcome=protectedReadEnvelope('UNKNOWN','OWNER_ROUTE_NOT_CONFIRMED',false);
              }else{
                const replacementDescriptor=fs.openSync(replacementPath,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|(fs.constants.O_NOFOLLOW??0),0o600);
                try{
                  const replacementStat=fs.fstatSync(replacementDescriptor);
                  replacementIdentity={dev:replacementStat.dev,ino:replacementStat.ino};
                  if(!replacementStat.isFile()||replacementStat.nlink!==1)throw new Error('PROTECTED_READ_REPLACEMENT_FILE_UNSAFE');
                  fs.writeFileSync(replacementDescriptor,'AGENT_CANARY_CONSOLE_REPLACEMENT','utf8');
                }finally{fs.closeSync(replacementDescriptor);}
                replacementStage='created';
                fs.renameSync(probePath,heldPath);
                const heldStat=fs.lstatSync(heldPath);
                if(heldStat.isSymbolicLink()||!heldStat.isFile()||heldStat.nlink!==1||heldStat.dev!==fileIdentity.dev||heldStat.ino!==fileIdentity.ino)throw new Error('PROTECTED_READ_HELD_FILE_CHANGED');
                replacementStage='original-held';
                fs.renameSync(replacementPath,probePath);
                const activeReplacementStat=fs.lstatSync(probePath);
                if(activeReplacementStat.isSymbolicLink()||!activeReplacementStat.isFile()||activeReplacementStat.nlink!==1||activeReplacementStat.dev!==replacementIdentity.dev||activeReplacementStat.ino!==replacementIdentity.ino)throw new Error('PROTECTED_READ_REPLACEMENT_FILE_UNSAFE');
                replacementStage='active';
                const replacementEvidenceBefore=protectedReadEvidenceCount(gateway);
                let replacementDenied=false;
                try{await host.dispatch({name:'protected_read',args:{path:protectedReadFile}});}
                catch(error){replacementDenied=hasExactOwnerError(error,'M2_SECURITY_GATEWAY_CAPABILITY_INVALID');}
                const replacementEvidenceAfter=protectedReadEvidenceCount(gateway);
                const replacementStillHeld=fs.lstatSync(probePath),originalStillHeld=fs.lstatSync(heldPath);
                const replacementIntact=replacementStillHeld.isFile()&&!replacementStillHeld.isSymbolicLink()&&replacementStillHeld.nlink===1&&replacementStillHeld.dev===replacementIdentity.dev&&replacementStillHeld.ino===replacementIdentity.ino;
                const originalIntact=originalStillHeld.isFile()&&!originalStillHeld.isSymbolicLink()&&originalStillHeld.nlink===1&&originalStillHeld.dev===fileIdentity.dev&&originalStillHeld.ino===fileIdentity.ino;
                outcome=replacementDenied&&host.m5Callbacks()===positiveCallbackCount&&replacementEvidenceBefore!==undefined&&replacementEvidenceAfter===replacementEvidenceBefore&&replacementIntact&&originalIntact
                  ?protectedReadEnvelope('PASS','FIXED_PROBE_CONTROLS_PASSED',true)
                  :protectedReadEnvelope('UNKNOWN','OWNER_ROUTE_NOT_CONFIRMED',false);
              }
            }
          }
        }
      }catch(error){
        outcome=isExplicitProtectedReadDenial(error)
          ?protectedReadEnvelope('DENY','OWNER_POLICY_DENIED',false)
          :protectedReadEnvelope('UNKNOWN','OWNER_DISPATCH_FAILED',false);
      }
    }
  }catch{
    outcome=protectedReadEnvelope('UNKNOWN','OWNER_ADAPTER_UNAVAILABLE',false);
  }finally{
    if(gateway){try{await gateway.close();}catch{cleanupSucceeded=false;}}
    if(aliasDirectory){
      if(!tempDirectory||!aliasDirectoryIdentity)cleanupSucceeded=false;
      else try{removeVerifiedDirectoryAlias(aliasDirectory,tempDirectory,aliasDirectoryIdentity);aliasDirectory=undefined;aliasDirectoryIdentity=undefined;}catch{cleanupSucceeded=false;}
    }
    if(tempRoot&&tempDirectory&&directoryIdentity&&fileIdentity&&replacementIdentity&&replacementStage&&cleanupSucceeded){
      try{
        const realRoot=fs.realpathSync(tempRoot),realDirectory=fs.realpathSync(tempDirectory),directoryStat=fs.lstatSync(tempDirectory);
        if(realRoot!==tempRoot||realDirectory!==tempDirectory||!containsTempPath(realRoot,realDirectory)||!directoryStat.isDirectory()||directoryStat.isSymbolicLink()||directoryStat.dev!==directoryIdentity.dev||directoryStat.ino!==directoryIdentity.ino)throw new Error('PROTECTED_READ_REPLACEMENT_CLEANUP_UNSAFE');
        const probePath=path.join(tempDirectory,protectedReadFile),heldPath=path.join(tempDirectory,protectedReadFile+'.held'),replacementPath=path.join(tempDirectory,protectedReadFile+'.replacement');
        const entries=fs.readdirSync(tempDirectory);
        const expectedNames=replacementStage==='created'?[protectedReadFile,protectedReadFile+'.replacement']:[protectedReadFile+'.held',replacementStage==='active'?protectedReadFile:protectedReadFile+'.replacement'];
        if(entries.length!==expectedNames.length||entries.some(name=>!expectedNames.includes(name)))throw new Error('PROTECTED_READ_REPLACEMENT_CLEANUP_UNSAFE');
        if(replacementStage==='created'){
          const original=fs.lstatSync(probePath),replacement=fs.lstatSync(replacementPath);
          if(original.isSymbolicLink()||!original.isFile()||original.nlink!==1||original.dev!==fileIdentity.dev||original.ino!==fileIdentity.ino||replacement.isSymbolicLink()||!replacement.isFile()||replacement.nlink!==1||replacement.dev!==replacementIdentity.dev||replacement.ino!==replacementIdentity.ino)throw new Error('PROTECTED_READ_REPLACEMENT_CLEANUP_UNSAFE');
          fs.unlinkSync(replacementPath);
        }else if(replacementStage==='original-held'){
          const original=fs.lstatSync(heldPath),replacement=fs.lstatSync(replacementPath);
          if(original.isSymbolicLink()||!original.isFile()||original.nlink!==1||original.dev!==fileIdentity.dev||original.ino!==fileIdentity.ino||replacement.isSymbolicLink()||!replacement.isFile()||replacement.nlink!==1||replacement.dev!==replacementIdentity.dev||replacement.ino!==replacementIdentity.ino)throw new Error('PROTECTED_READ_REPLACEMENT_CLEANUP_UNSAFE');
          fs.unlinkSync(replacementPath);
          fs.renameSync(heldPath,probePath);
        }else{
          const original=fs.lstatSync(heldPath),replacement=fs.lstatSync(probePath);
          if(original.isSymbolicLink()||!original.isFile()||original.nlink!==1||original.dev!==fileIdentity.dev||original.ino!==fileIdentity.ino||replacement.isSymbolicLink()||!replacement.isFile()||replacement.nlink!==1||replacement.dev!==replacementIdentity.dev||replacement.ino!==replacementIdentity.ino)throw new Error('PROTECTED_READ_REPLACEMENT_CLEANUP_UNSAFE');
          fs.unlinkSync(probePath);
          fs.renameSync(heldPath,probePath);
        }
      }catch{cleanupSucceeded=false;}
    }
    if(tempRoot&&tempDirectory&&directoryIdentity&&fileIdentity&&cleanupSucceeded){
      try{
        const realRoot=fs.realpathSync(tempRoot),realDirectory=fs.realpathSync(tempDirectory),directoryStat=fs.lstatSync(tempDirectory);
        const probePath=path.join(tempDirectory,protectedReadFile),realProbePath=fs.realpathSync(probePath),probeStat=fs.lstatSync(probePath);
        const entries=fs.readdirSync(tempDirectory);
        if(realRoot!==tempRoot||realDirectory!==tempDirectory||!containsTempPath(realRoot,realDirectory)||!directoryStat.isDirectory()||directoryStat.isSymbolicLink()||directoryStat.dev!==directoryIdentity.dev||directoryStat.ino!==directoryIdentity.ino||realProbePath!==probePath||!probeStat.isFile()||probeStat.isSymbolicLink()||probeStat.nlink!==1||probeStat.dev!==fileIdentity.dev||probeStat.ino!==fileIdentity.ino||entries.length!==1||entries[0]!==protectedReadFile)throw new Error('PROTECTED_READ_TEMP_CLEANUP_UNSAFE');
        fs.unlinkSync(probePath);
        fs.rmdirSync(tempDirectory);
      }catch{cleanupSucceeded=false;}
    }else if(tempRoot&&tempDirectory&&directoryIdentity&&!fileIdentity&&cleanupSucceeded){
      try{
        const realRoot=fs.realpathSync(tempRoot),realDirectory=fs.realpathSync(tempDirectory),directoryStat=fs.lstatSync(tempDirectory);
        if(realRoot!==tempRoot||realDirectory!==tempDirectory||!containsTempPath(realRoot,realDirectory)||!directoryStat.isDirectory()||directoryStat.isSymbolicLink()||directoryStat.dev!==directoryIdentity.dev||directoryStat.ino!==directoryIdentity.ino||fs.readdirSync(tempDirectory).length!==0)throw new Error('PROTECTED_READ_EMPTY_TEMP_CLEANUP_UNSAFE');
        fs.rmdirSync(tempDirectory);
      }catch{cleanupSucceeded=false;}
    }else if(tempDirectory){cleanupSucceeded=false;}
  }
  return cleanupSucceeded?outcome:protectedReadEnvelope('UNKNOWN','CLEANUP_FAILED',false);
}

export type SecurityCenterStatusProvider = NonNullable<PublicM2HostAdapter['securityCenterStatusProvider']>;

const UNKNOWN_SECURITY_CENTER_STATUS = Object.freeze({
  protectionStatus: 'UNKNOWN',
  gateway: Object.freeze({ protectionStatus: 'UNKNOWN', connectionStatus: 'UNKNOWN' }),
  hook: Object.freeze({ protectionStatus: 'UNKNOWN' }),
  canaryIsolation: Object.freeze({ protectionStatus: 'UNKNOWN' }),
  policy: Object.freeze({ protectionStatus: 'UNKNOWN' }),
});

const SECURITY_CENTER_PROTECTION_STATUSES = new Set(['PROTECTED', 'PARTIALLY_PROTECTED', 'NOT_PROTECTED', 'UNKNOWN']);
const SECURITY_CENTER_CONNECTION_STATUSES = new Set(['CONNECTED', 'DISCONNECTED', 'UNKNOWN']);
const SECURITY_CENTER_AGENT_IDS = new Set(['claude', 'cursor', 'cline', 'codex']);

function ownDataValue(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

function securityCenterProtectionStatus(value: unknown): string {
  return typeof value === 'string' && SECURITY_CENTER_PROTECTION_STATUSES.has(value) ? value : 'UNKNOWN';
}

function securityCenterConnectionStatus(value: unknown): string {
  return typeof value === 'string' && SECURITY_CENTER_CONNECTION_STATUSES.has(value) ? value : 'UNKNOWN';
}

function securityCenterArrayValues(value: unknown, limit = 100): unknown[] {
  if (!Array.isArray(value)) return [];
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < 0) return [];
  const values: unknown[] = [];
  for (let index = 0; index < Math.min(length, limit); index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor && Object.hasOwn(descriptor, 'value')) values.push(descriptor.value);
  }
  return values;
}

function normalizeSecurityCenterSnapshot(value: unknown) {
  const gateway = ownDataValue(value, 'gateway');
  const policy = ownDataValue(value, 'policy');
  const normalized: Record<string, unknown> = {
    // The only current provider scope is fixed M2 reads, so it cannot claim full-product protection.
    protectionStatus: ownDataValue(value, 'protectionStatus') === 'PARTIALLY_PROTECTED'
      || ownDataValue(value, 'protectionStatus') === 'NOT_PROTECTED'
      ? ownDataValue(value, 'protectionStatus')
      : 'UNKNOWN',
    gateway: {
      protectionStatus: securityCenterProtectionStatus(ownDataValue(gateway, 'protectionStatus')),
      connectionStatus: securityCenterConnectionStatus(ownDataValue(gateway, 'connectionStatus')),
    },
    // The M2 status provider has no evidence for native Hook or Canary isolation.
    hook: { protectionStatus: 'UNKNOWN' },
    canaryIsolation: { protectionStatus: 'UNKNOWN' },
    policy: {
      protectionStatus: securityCenterProtectionStatus(ownDataValue(policy, 'protectionStatus')),
    },
  };

  const policyName = ownDataValue(policy, 'name');
  if (policyName === 'M2 fixed file reads / M5 OBSERVE') {
    (normalized.policy as Record<string, unknown>).name = 'M2_FIXED_FILE_READS';
  } else if (policyName === 'OBSERVE' || policyName === 'M2_FIXED_FILE_READS') {
    (normalized.policy as Record<string, unknown>).name = policyName;
  }

  const protectedToolCount = ownDataValue(value, 'protectedToolCount');
  if (Number.isSafeInteger(protectedToolCount) && (protectedToolCount as number) >= 0) {
    normalized.protectedToolCount = protectedToolCount;
  }

  const coverage = ownDataValue(value, 'coverage');
  if (coverage === 'M2_FIXED_FILE_READS_ONLY') normalized.coverage = coverage;

  const paths = securityCenterArrayValues(ownDataValue(value, 'unprotectedExecutionPaths'))
    .filter((item): item is string => item === 'NATIVE_SHELL');
  if (paths.length > 0) normalized.unprotectedExecutionPaths = [...new Set(paths)];

  const agents = securityCenterArrayValues(ownDataValue(value, 'agents'))
    .map(item => ({ agent: ownDataValue(item, 'agent'), detected: ownDataValue(item, 'detected') }))
    .filter(item => typeof item.agent === 'string' && SECURITY_CENTER_AGENT_IDS.has(item.agent))
    .map(item => ({
      agent: item.agent,
      ...(typeof item.detected === 'boolean' ? { detected: item.detected } : {}),
      // Configuration detection is not evidence of a live connection or protected native tools.
      connectionStatus: 'UNKNOWN',
      protectionStatus: 'UNKNOWN',
    }));
  if (agents.length > 0) normalized.agents = agents;

  return normalized;
}

async function readSecurityCenterStatus(provider: SecurityCenterStatusProvider | undefined) {
  if (typeof provider !== 'function') return UNKNOWN_SECURITY_CENTER_STATUS;
  try {
    // M2 owns this side-effect-free snapshot. The Console only normalizes its
    // return value; this path never constructs or invokes protected execution.
    return normalizeSecurityCenterSnapshot(await provider());
  } catch {
    return UNKNOWN_SECURITY_CENTER_STATUS;
  }
}

export async function startAIConsole(options: { port?: number; apiKey?: string; keyOrigin?: string; eventsFile?: string; operatorApprovalCode?: string; preReviewTimeoutMs?:number; securityCenterStatusProvider?: SecurityCenterStatusProvider; securityCenterProtectedReadDependencies?:SecurityCenterProtectedReadDependencies } = {}) {
  const port = options.port ?? 4318;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('AI_CONSOLE_PORT_INVALID');
  const csrf = randomBytes(32).toString('hex');
  let config: ProviderConfig = { id: 'ollama', ...PROVIDER_PRESETS.ollama, model: 'qwen3.5-9b-local:latest' };
  let provider = createAIProvider(config);
  let busy = false, url = '';
  const analyses: SecurityAnalysisResult[] = [];
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  let job: { status: string; progress: string[] } = { status: 'idle', progress: [] };
  let child: ChildProcess | undefined;
  const operatorCode=options.operatorApprovalCode;
  const secrets = [...(options.apiKey?[options.apiKey]:[]),...(operatorCode?[operatorCode]:[])];
  const sandbox=createPolicySandbox({reviewTimeoutMs:options.preReviewTimeoutMs});
  const runtime3=createRuntimeDemo();
  const integrationProject=fs.mkdtempSync(path.join(os.tmpdir(),'canary-console-integration-'));
  const integrationRecords=new Map<string,ReturnType<typeof installAgentIntegration>>();
  const integrationEntry={command:process.execPath,args:[path.join(root,'dist/competition.js'),'serve']};
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const reply = (value: unknown, status = 200) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    const protectedReadAction=req.method==='POST'&&req.url===protectedReadRoute;
    try {
      if (req.headers.host !== new URL(url).host || req.headers.origin && req.headers.origin !== url || req.headers['sec-fetch-site'] === 'cross-site') { reply(protectedReadAction?protectedReadEnvelope('UNKNOWN','REQUEST_AUTH_REQUIRED',false):{ error: 'AI_CONSOLE_ORIGIN_REJECTED' }, 403); return; }
      if (req.method === 'GET' && req.url === '/') {
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'nonce-" + csrf + "'; style-src 'nonce-" + csrf + "'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(CONSOLE_PAGE.replace('<style>', '<style nonce="' + csrf + '">').replace('<script>', '<script nonce="' + csrf + '">').replace('__CSRF__', csrf)); return;
      }
      if (req.headers['x-canary-csrf'] !== csrf) { reply(protectedReadAction?protectedReadEnvelope('UNKNOWN','REQUEST_AUTH_REQUIRED',false):{ error: 'AI_CONSOLE_CSRF_REJECTED' }, 403); return; }
      if (req.method === 'GET' && req.url === '/api/state') {
        const events = readEvents(options.eventsFile, 100).map(e => JSON.parse(JSON.stringify(e), (_k, v) => typeof v === 'string' ? redactAnalysisText(v, secrets) : v));
        let experiments: unknown = '尚无保存的模型实验结果。';
        const evidenceFile = path.join(root, 'competition-submission/evidence/analysis-summary.json');
        if (fs.existsSync(evidenceFile) && fs.statSync(evidenceFile).size < 256_000) {
          const data = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
          experiments = { generatedAt: data.analysisGeneratedAt, caveat: '按运行文件 UTC 时间排序的完整组，真实模型选择工具，执行器为虚拟工具；非 AI 分析准确率。', cohorts: data.cohorts?.filter((c: any) => c.promptSha256).sort((a: any,b: any)=>String(a.runStamp||'').localeCompare(String(b.runStamp||''))).map((c: any) => ({ sourceFile:c.sourceFile,runStamp:c.runStamp,profile: c.profile, model: c.model, trials: c.totalTrials, arms: c.arms })) };
        }
        reply({ presets: PROVIDER_PRESETS, events, counts: { signals: events.filter(e => e.kind === 'decoy_called' || e.kind === 'token_found').length, sessions: new Set(events.filter(e => e.kind === 'session_quarantined').map(e => e.sessionId)).size, blocked: events.filter(e => e.kind === 'action_blocked').length }, countScope: 'latest 100 recorded events only', experiments }); return;
      }
      if (req.method === 'GET' && req.url === '/api/security-center') {
        reply(await readSecurityCenterStatus(options.securityCenterStatusProvider));
        return;
      }
      if (req.method === 'GET' && req.url === '/api/job') { reply(job); return; }
      if (req.method === 'GET' && req.url === '/api/policy/state') { reply(sandbox.state()); return; }
      if(req.method==='GET'&&req.url==='/api/runtime3'){reply(runtime3.state());return;}
      if(req.method==='GET'&&req.url==='/api/runtime3/evaluation'){const p=path.join(root,'security-lab/evidence/console-summary.json');reply(fs.existsSync(p)&&fs.statSync(p).size<512_000?JSON.parse(fs.readFileSync(p,'utf8')):{status:'NOT MEASURED',reason:'尚无保存的 3.0 实验'});return;}
      if(req.method==='GET'&&req.url==='/api/agents'){reply({agents:detectAgents(),scope:'Configuration demonstration in an isolated temporary project. Does not change your live client config.',installed:[...integrationRecords.values()].map(r=>({agent:r.agent,status:r.status,coverage:r.coverage})),project:integrationProject});return;}
      if(req.method==='GET'&&req.url==='/api/v2'){const p=path.join(root,'competition-submission/evidence/v2-summary.json');reply(fs.existsSync(p)&&fs.statSync(p).size<512_000?JSON.parse(fs.readFileSync(p,'utf8')):{complete:false,status:'NOT COMPLETED'});return;}
      if (req.method === 'GET' && req.url === '/api/round4') {
        const p=path.join(root,'competition-submission/evidence/round4-summary.json');
        reply(fs.existsSync(p)&&fs.statSync(p).size<512_000?JSON.parse(fs.readFileSync(p,'utf8')):{complete:false,status:'NOT COMPLETED'});return;
      }
      if (req.method === 'GET' && req.url === '/api/report') { reply({ generatedAt: new Date().toISOString(), advisoryOnly: true, scope: 'up to 100 analyses in this console process', analyses }); return; }
      if (req.method === 'GET' && req.url?.startsWith('/api/export?')) {
        const format=new URL(req.url,url).searchParams.get('format');
        if (format!=='json'&&format!=='markdown'&&format!=='csv') throw new Error('AI_REPORT_FORMAT_INVALID');
        reply({ format, content:renderAIReport(analyses,format) }); return;
      }
      if (req.method !== 'POST' || !req.url?.startsWith('/api/')) { reply({ error: 'NOT_FOUND' }, 404); return; }
      if (!req.headers['content-type']?.startsWith('application/json')) { reply(protectedReadAction?protectedReadEnvelope('UNKNOWN','REQUEST_INVALID',false):{ error: 'AI_JSON_REQUIRED' }, 415); return; }
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) { size += chunk.length; if (size > 32_000) { reply(protectedReadAction?protectedReadEnvelope('UNKNOWN','REQUEST_INVALID',false):{ error: 'AI_INPUT_TOO_LARGE' }, 413); return; } chunks.push(chunk); }
      let body:any;
      try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
      catch{if(protectedReadAction){reply(protectedReadEnvelope('UNKNOWN','REQUEST_INVALID',false),400);return;}throw new Error('AI_CONSOLE_REQUEST_INVALID');}
      if(req.url===protectedReadRoute){
        if(!isEmptyProtectedReadRequest(body)){reply(protectedReadEnvelope('UNKNOWN','REQUEST_INVALID',false),400);return;}
        const suppliedHeader=req.headers['x-canary-operator-code'];
        const supplied=Buffer.from(typeof suppliedHeader==='string'?suppliedHeader:''),expected=Buffer.from(operatorCode??'');
        if(!operatorCode||typeof suppliedHeader!=='string'||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){reply(protectedReadEnvelope('UNKNOWN','REQUEST_AUTH_REQUIRED',false),403);return;}
        reply(await runConsoleProtectedRead(options.securityCenterProtectedReadDependencies??loadDefaultProtectedReadDependencies));return;
      }
      if(req.url==='/api/runtime3/action'){reply(await runtime3.action(body.action));return;}
      if(req.url==='/api/runtime3/approve'){
        const supplied=Buffer.from(typeof body.operatorCode==='string'?body.operatorCode:''),expected=Buffer.from(operatorCode??'');
        if(body.confirm!==true||!operatorCode||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){reply({error:'POLICY_OPERATOR_AUTH_REQUIRED'},403);return;}
        reply(await runtime3.approve(body.requestId));return;
      }
      if(req.url==='/api/agents/preview'){const p=previewAgentIntegration(body.agent as AgentClient,integrationProject,integrationEntry);reply({agent:p.agent,configPath:p.configPath,entry:p.entry,baseHash:p.baseHash,status:p.status,coverage:p.coverage});return;}
      if(req.url==='/api/agents/install'){const r=installAgentIntegration(body.agent,integrationProject,integrationEntry,body.baseHash);integrationRecords.set(body.agent,r);reply({agent:r.agent,status:r.status,coverage:r.coverage});return;}
      if(req.url==='/api/agents/restore'){const r=integrationRecords.get(body.agent);if(!r)throw new Error('INTEGRATION_NOT_INSTALLED');reply(restoreAgentIntegration(r));integrationRecords.delete(body.agent);return;}
      if(req.url==='/api/agents/probe'){const script=path.join(root,'competition-submission/lab/verify-v2-mcp.mjs');if(!fs.existsSync(script))throw new Error('PROTECTED_MCP_PROBE_NOT_INCLUDED');const result=await promisify(execFile)(process.execPath,[script],{cwd:root,windowsHide:true,timeout:20_000,maxBuffer:8000});reply({...JSON.parse(result.stdout.trim()),coverage:'Actual SDK stdio probe of three virtual host callbacks; desktop client activation NOT VERIFIED'});return;}
      if(req.url==='/api/policy/review'){if(typeof body.enabled!=='boolean')throw new Error('PRE_REVIEW_BOOLEAN_REQUIRED');reply(sandbox.setReview(body.enabled,provider));return;}
      if (req.url === '/api/policy/mode') { reply(sandbox.setMode(body.mode)); return; }
      if (req.url === '/api/policy/action') { reply(await sandbox.action(body.action)); return; }
      if (req.url === '/api/policy/approve'||req.url==='/api/policy/deny') {
        if(body.confirm!==true)throw new Error('POLICY_HUMAN_CONFIRMATION_REQUIRED');
        const supplied=Buffer.from(typeof body.operatorCode==='string'?body.operatorCode:'');
        const expected=Buffer.from(operatorCode??'');
        if(!operatorCode||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){reply({error:'POLICY_OPERATOR_AUTH_REQUIRED'},403);return;}
        reply(req.url==='/api/policy/deny'?sandbox.deny(body.requestId):await sandbox.approve(body.requestId));return;
      }
      if (req.url === '/api/preview') { reply(previewAnalysis(body.events, secrets)); return; }
      if (req.url === '/api/demo') { const demo = await runAdvisoryDemo(); reply({ ...demo, analysisEvents: demo.events.map((e,i)=>({id:'sandbox-'+i,text:formatAnalysisEvent(e as unknown as Record<string,unknown>)})) }); return; }
      if (busy || child) { reply({ error: 'AI_CONSOLE_BUSY' }, 409); return; }
      if (req.url === '/api/configure') {
        if (!body || Object.keys(body).some(k => !['id','protocol','kind','baseUrl','model','timeoutMs'].includes(k))) throw new Error('AI_CONFIG_INVALID');
        if(secrets.some(secret=>JSON.stringify(body).includes(secret)))throw new Error('AI_CONFIG_SECRET_REJECTED');
        const origin = new URL(body.baseUrl).origin;
        const allowedOrigin = options.keyOrigin ?? process.env.AGENT_CANARY_AI_KEY_ORIGIN;
        if (options.apiKey && body.kind === 'cloud' && origin !== allowedOrigin) throw new Error('AI_KEY_ORIGIN_NOT_AUTHORIZED');
        const next: ProviderConfig = { ...body, ...(body.kind === 'cloud' && options.apiKey ? { apiKey: options.apiKey } : {}) };
        provider = createAIProvider(next); config = next;
        reply({ ok: true }); return;
      }
      if (req.url === '/api/eval') {
        if (config.protocol !== 'ollama' || config.kind !== 'local') throw new Error('AI_EVAL_OLLAMA_ONLY');
        const script = path.join(root, 'competition-submission/lab/run-agent-eval.mjs');
        if (!fs.existsSync(script)) throw new Error('AI_EVAL_REQUIRES_REPOSITORY_CHECKOUT');
        const env: NodeJS.ProcessEnv = { ...process.env, OLLAMA_BASE_URL: config.baseUrl, OLLAMA_MODEL: config.model };
        delete env.AGENT_CANARY_AI_KEY;
        job = { status: 'running', progress: [] };
        child = spawn(process.execPath, [script, '--profile=neutral_agent',...(body.v2===true?['--v2']:body.round4===true?['--round4']:[])], { cwd: root, env, stdio: ['ignore','pipe','pipe'], windowsHide: true });
        const capture = (chunk: Buffer) => { job.progress.push(redactAnalysisText(chunk.toString('utf8'), secrets).slice(0, 1000)); if (job.progress.length > 12) job.progress.shift(); };
        child.stdout?.on('data', capture); child.stderr?.on('data', capture);
        child.once('error', () => { job.status = 'failed'; child = undefined; });
        child.once('exit', code => { job.status = code === 0 ? 'completed' : 'failed'; child = undefined; });
        reply({ status: 'running', model: config.model, profile: 'neutral_agent', virtualToolsOnly: true }); return;
      }
      const abort = new AbortController();
      const onClose = () => { if (!res.writableEnded) abort.abort(); };
      res.on('close', onClose);
      busy = true;
      try {
        if (req.url === '/api/connect') reply(await provider.testConnection(abort.signal));
        else if (req.url === '/api/ollama') reply(await createAIProvider({ id: 'ollama', ...PROVIDER_PRESETS.ollama, model: 'probe' }).testConnection(abort.signal));
        else if (req.url === '/api/analyze') {
          const rawResult = await provider.analyze({ events: previewAnalysis(body.events,secrets), cloudConsent: body.cloudConsent, signal: abort.signal });
          const result:SecurityAnalysisResult=JSON.parse(JSON.stringify(rawResult),(_key,value)=>typeof value==='string'?redactAnalysisText(value,secrets):value);
          analyses.push(result); if (analyses.length > 100) analyses.shift(); reply(result);
        } else reply({ error: 'NOT_FOUND' }, 404);
      } finally { busy = false; res.off('close', onClose); }
    } catch (error) {
      if (!res.headersSent) reply({ error: error instanceof Error && /^(AI|POLICY)_[A-Z_]+$/.test(error.message) ? error.message : 'AI_CONSOLE_REQUEST_INVALID' }, 400);
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.maxConnections = 16;
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('AI_CONSOLE_LISTEN_FAILED');
  url = 'http://127.0.0.1:' + address.port;
  return { url, server, close: async () => { child?.kill(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); sandbox.close(); await runtime3.close(); } };
}
