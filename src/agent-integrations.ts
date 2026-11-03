import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {writeFileAtomically} from './config.js';
import {parse as parseToml} from 'smol-toml';

export type AgentClient='claude'|'cursor'|'cline'|'codex'|'custom';
export type IntegrationState='MCP_DECOY_INSTALLED'|'GUARD_INTEGRATED'|'VERIFIED_PROTECTED'|'PARTIAL'|'UNSUPPORTED';
const paths={claude:'.mcp.json',cursor:'.cursor/mcp.json',cline:'.cline/data/settings/cline_mcp_settings.json',codex:'.codex/config.toml',custom:'mcp.json'};
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
const backupRoot=()=>path.join(os.homedir(),'.agent-canary-integration-backups');
function checkedToml(source:string){try{return parseToml(source);}catch{throw Error('INTEGRATION_TOML_INVALID');}}
function checkedJson(source:string){try{return JSON.parse(source);}catch{throw Error('INTEGRATION_JSON_INVALID');}}
function readConfig(file:string){
  try{
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256_000)throw Error('INTEGRATION_CONFIG_UNSAFE');
    return fs.readFileSync(file,'utf8');
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return '';throw error;}
}
function readBackup(file:string){
  const root=backupRoot();
  let rootStat:fs.Stats;
  try{rootStat=fs.lstatSync(root);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw Error('INTEGRATION_BACKUP_MISSING');throw error;}
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw Error('INTEGRATION_BACKUP_ROOT_UNSAFE');
  const backupDirectory=path.dirname(file);
  let directoryStat:fs.Stats;
  try{directoryStat=fs.lstatSync(backupDirectory);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw Error('INTEGRATION_BACKUP_MISSING');throw error;}
  if(!directoryStat.isDirectory()||directoryStat.isSymbolicLink())throw Error('INTEGRATION_BACKUP_DIRECTORY_UNSAFE');
  const realRoot=fs.realpathSync(root),realDirectory=fs.realpathSync(backupDirectory);
  const relative=path.relative(realRoot,realDirectory);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('INTEGRATION_BACKUP_OUTSIDE_ROOT');
  let stat:fs.Stats;
  try{stat=fs.lstatSync(file);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw Error('INTEGRATION_BACKUP_MISSING');throw error;}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256_000)throw Error('INTEGRATION_BACKUP_UNSAFE');
  return fs.readFileSync(file,'utf8');
}

function planAgentIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]}){
  if(!Object.hasOwn(paths,agent)||!path.isAbsolute(project)||typeof entry?.command!=='string'||!entry.command.trim()||!Array.isArray(entry.args)||entry.args.some(argument=>typeof argument!=='string'))throw Error('INTEGRATION_INPUT_INVALID');
  let projectStat:fs.Stats;
  try{projectStat=fs.statSync(project);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')throw Error('INTEGRATION_PROJECT_NOT_FOUND');throw error;}
  if(!projectStat.isDirectory())throw Error('INTEGRATION_PROJECT_NOT_DIRECTORY');
  const file=path.join(project,paths[agent]);
  const originalExisted=fs.existsSync(file),original=readConfig(file);
  let next:string;
  if(originalExisted&&!original.trim()&&agent!=='codex')throw Error('INTEGRATION_CONFIG_EMPTY');
  if(agent==='codex'){
    const parsed=checkedToml(original) as Record<string,unknown>;
    if(parsed.mcp_servers!==undefined&&(!parsed.mcp_servers||typeof parsed.mcp_servers!=='object'||Array.isArray(parsed.mcp_servers)))throw Error('INTEGRATION_CONFIG_INVALID');
    if(parsed.mcp_servers&&Object.hasOwn(parsed.mcp_servers,'agent-canary'))throw Error('INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW');
    const addition='[mcp_servers.agent-canary]\ncommand = '+JSON.stringify(entry.command)+'\nargs = '+JSON.stringify(entry.args)+'\n';
    next=original+(original.endsWith('\n')||!original?'':'\n')+'\n'+addition;
    checkedToml(next);
  }else{
    const document=original?checkedJson(original):{};
    if(!document||Array.isArray(document)||typeof document!=='object')throw Error('INTEGRATION_CONFIG_INVALID');
    const doc=document as Record<string,any>;
    if(Object.hasOwn(doc,'mcpServers')&&(!doc.mcpServers||typeof doc.mcpServers!=='object'||Array.isArray(doc.mcpServers)))throw Error('INTEGRATION_CONFIG_INVALID');
    if(doc.mcpServers&&Object.hasOwn(doc.mcpServers,'agent-canary'))throw Error('INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW');
    next=JSON.stringify({...doc,mcpServers:{...doc.mcpServers,'agent-canary':entry}},null,2)+'\n';
  }
  return {agent,configPath:file,entry:structuredClone(entry),baseHash:hash(original),status:'PARTIAL' as IntegrationState,coverage:'Only callbacks explicitly registered with Agent Canary are routed through its Gateway; host-native tools and other servers are OUT_OF_SCOPE',originalExisted,original,next};
}

export function detectAgents(home=os.homedir()){
  // Legacy coarse detector retained for SDK compatibility; the CLI uses detectAgentHosts.
  return (['claude','cursor','cline','codex','custom'] as AgentClient[]).map(agent=>({agent,detected:agent==='custom'||fs.existsSync(path.join(home,agent==='claude'?'.claude':agent==='cline'?'.cline':'.'+agent)),status:'PARTIAL' as IntegrationState,coverage:'Only this managed MCP server; native tools and other servers OUT_OF_SCOPE'}));
}

export function previewAgentIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]}){
  const {original,next,...preview}=planAgentIntegration(agent,project,entry);
  return preview;
}

type InstallRecord={agent:AgentClient;configPath:string;backupPath:string;installedHash:string;originalHash:string;originalExisted:boolean;status:'MCP_DECOY_INSTALLED';coverage:string};
function install(agent:AgentClient,project:string,entry:{command:string;args:string[]},expectedHash:string,includeReceipt:boolean):InstallRecord&{receiptPath?:string}{
  const preview=planAgentIntegration(agent,project,entry);
  if(preview.baseHash!==expectedHash)throw Error('INTEGRATION_CONFIG_CHANGED');
  fs.mkdirSync(path.dirname(preview.configPath),{recursive:true});
  const realProject=fs.realpathSync(project),realParent=fs.realpathSync(path.dirname(preview.configPath));
  const relative=path.relative(realProject,realParent);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('INTEGRATION_PARENT_OUTSIDE_PROJECT');
  const lock=preview.configPath+'.agent-canary-lock';
  let lockFd:number|undefined;
  try{lockFd=fs.openSync(lock,'wx',0o600);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw Error('INTEGRATION_LOCKED');throw error;}
  try{
    if(hash(readConfig(preview.configPath))!==expectedHash)throw Error('INTEGRATION_CONFIG_CHANGED');
    const root=backupRoot();
    fs.mkdirSync(root,{recursive:true,mode:0o700});
    const rootStat=fs.lstatSync(root);
    if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw Error('INTEGRATION_BACKUP_ROOT_UNSAFE');
    const directory=fs.mkdtempSync(path.join(root,'entry-'));
    fs.chmodSync(directory,0o700);
    const backup=path.join(directory,randomUUID()+'.backup');
    const backupFd=fs.openSync(backup,'wx',0o600);
    try{fs.writeFileSync(backupFd,preview.original,'utf8');fs.fsyncSync(backupFd);}finally{fs.closeSync(backupFd);}
    const record:InstallRecord={agent,configPath:preview.configPath,backupPath:backup,installedHash:hash(preview.next),originalHash:expectedHash,originalExisted:preview.originalExisted,status:'MCP_DECOY_INSTALLED',coverage:preview.coverage};
    let receiptPath:string|undefined;
    if(includeReceipt){
      receiptPath=backup+'.receipt.json';
      const receiptFd=fs.openSync(receiptPath,'wx',0o600);
      try{fs.writeFileSync(receiptFd,JSON.stringify(record,null,2)+'\n','utf8');fs.fsyncSync(receiptFd);}finally{fs.closeSync(receiptFd);}
    }
    if(hash(readConfig(preview.configPath))!==expectedHash)throw Error('INTEGRATION_CONFIG_CHANGED');
    writeFileAtomically(preview.configPath,preview.next);
    return {...record,...(receiptPath?{receiptPath}:{})};
  }finally{
    if(lockFd!==undefined){fs.closeSync(lockFd);try{fs.unlinkSync(lock);}catch{}}
  }
}

export function installAgentIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]},expectedHash:string){
  const {receiptPath,...record}=install(agent,project,entry,expectedHash,false);
  return record;
}

/** CLI-only transaction that persists a user-home recovery receipt before committing the host config. */
export function installAgentIntegrationWithReceipt(agent:AgentClient,project:string,entry:{command:string;args:string[]},expectedHash:string){
  return install(agent,project,entry,expectedHash,true);
}

/** Restore only if the complete config is unchanged; later user edits are preserved. */
export function restoreAgentIntegration(record:ReturnType<typeof installAgentIntegration>){
  if(!record||!Object.hasOwn(paths,record.agent)||typeof record.configPath!=='string'||!path.isAbsolute(record.configPath)||typeof record.backupPath!=='string'||!path.isAbsolute(record.backupPath)||typeof record.originalExisted!=='boolean'||!/^([0-9a-f]{64})$/.test(record.installedHash)||!/^([0-9a-f]{64})$/.test(record.originalHash))throw Error('INTEGRATION_RECEIPT_INVALID');
  const expectedSuffix=path.sep+paths[record.agent].split('/').join(path.sep);
  if(!record.configPath.endsWith(expectedSuffix))throw Error('INTEGRATION_RECEIPT_PATH_INVALID');
  const lock=record.configPath+'.agent-canary-lock';
  let lockFd:number|undefined;
  try{lockFd=fs.openSync(lock,'wx',0o600);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw Error('INTEGRATION_LOCKED');throw error;}
  try{
    if(hash(readConfig(record.configPath))!==record.installedHash)throw Error('INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED');
    const original=readBackup(record.backupPath);
    if(hash(original)!==record.originalHash)throw Error('INTEGRATION_BACKUP_CHANGED');
    // Cooperating onboarding/rollback processes honor this lock. Recheck directly before replacement too.
    if(hash(readConfig(record.configPath))!==record.installedHash)throw Error('INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED');
    if(record.originalExisted)writeFileAtomically(record.configPath,original);
    else fs.unlinkSync(record.configPath);
    return {status:'RESTORED',configPath:record.configPath};
  }finally{if(lockFd!==undefined){fs.closeSync(lockFd);try{fs.unlinkSync(lock);}catch{}}}
}
