import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createHash,randomUUID} from 'node:crypto';
import {writeFileAtomically} from './config.js';
import {parse as parseToml} from 'smol-toml';
export type AgentClient='claude'|'cursor'|'cline'|'codex'|'custom';
export type IntegrationState='MCP_DECOY_INSTALLED'|'GUARD_INTEGRATED'|'VERIFIED_PROTECTED'|'PARTIAL'|'UNSUPPORTED';
const paths={claude:'.mcp.json',cursor:'.cursor/mcp.json',cline:'.cline/data/settings/cline_mcp_settings.json',codex:'.codex/config.toml',custom:'mcp.json'};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function checkedToml(source:string){try{return parseToml(source);}catch{throw Error('INTEGRATION_TOML_INVALID');}}
function checkedJson(source:string){try{return JSON.parse(source);}catch{throw Error('INTEGRATION_JSON_INVALID');}}
export function detectAgents(home=os.homedir()){
  // Filesystem metadata only: never return unrelated client configuration or secrets.
  return (['claude','cursor','cline','codex','custom'] as AgentClient[]).map(agent=>({agent,detected:agent==='custom'||fs.existsSync(path.join(home,agent==='claude'?'.claude':agent==='cline'?'.cline':'.'+agent)),status:'PARTIAL' as IntegrationState,coverage:'Only this managed MCP server; native tools and other servers OUT_OF_SCOPE'}));
}
function read(file:string){try{const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.size>256_000)throw Error('INTEGRATION_CONFIG_UNSAFE');return fs.readFileSync(file,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return '';throw e;}}
function planAgentIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]}){
  if(!Object.hasOwn(paths,agent)||!path.isAbsolute(project)||!entry.command||entry.args.some(a=>typeof a!=='string'))throw Error('INTEGRATION_INPUT_INVALID');
  const file=path.join(project,paths[agent]);const originalExisted=fs.existsSync(file),original=read(file);let next:string;
  if(originalExisted&&!original.trim()&&agent!=='codex')throw Error('INTEGRATION_CONFIG_EMPTY');
  if(agent==='codex'){
    const parsed=checkedToml(original);
    // Append a dedicated table without parsing/re-serializing user's TOML or credential values.
    if(parsed.mcp_servers&&Object.hasOwn(parsed.mcp_servers as object,'agent-canary'))throw Error('INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW');
    next=original+(original.endsWith('\n')||!original?'':'\n')+'\n[mcp_servers.agent-canary]\ncommand = '+JSON.stringify(entry.command)+'\nargs = '+JSON.stringify(entry.args)+'\n';
    checkedToml(next); // Validate the merged table without reserializing user preferences.
  }else{
    const doc=original?checkedJson(original):{};
    if(!doc||Array.isArray(doc)||typeof doc!=='object'||doc.mcpServers&&(typeof doc.mcpServers!=='object'||Array.isArray(doc.mcpServers)))throw Error('INTEGRATION_CONFIG_INVALID');
    if(doc.mcpServers&&Object.hasOwn(doc.mcpServers,'agent-canary'))throw Error('INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW');
    next=JSON.stringify({...doc,mcpServers:{...doc.mcpServers,'agent-canary':entry}},null,2)+'\n';
  }
  return {agent,configPath:file,entry:structuredClone(entry),baseHash:hash(original),status:'PARTIAL' as IntegrationState,coverage:'MCP server callbacks only; client-native tools OUT_OF_SCOPE',originalExisted,original,next};
}
export function previewAgentIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]}){const {original,next,...preview}=planAgentIntegration(agent,project,entry);return preview;}
export function installAgentIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]},expectedHash:string){
  const preview=planAgentIntegration(agent,project,entry);if(preview.baseHash!==expectedHash)throw Error('INTEGRATION_CONFIG_CHANGED');
  fs.mkdirSync(path.dirname(preview.configPath),{recursive:true});
  // Reject redirected parent paths and serialize cooperating installers using exclusive lock.
  const realProject=fs.realpathSync(project),realParent=fs.realpathSync(path.dirname(preview.configPath));const rel=path.relative(realProject,realParent);
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('INTEGRATION_PARENT_OUTSIDE_PROJECT');
  const lock=preview.configPath+'.agent-canary-lock',fd=fs.openSync(lock,'wx',0o600);
  try{if(hash(read(preview.configPath))!==expectedHash)throw Error('INTEGRATION_CONFIG_CHANGED');
    // Existing config may contain credentials: keep its private backup outside project/Git.
    const backupRoot=path.join(os.homedir(),'.agent-canary-integration-backups');fs.mkdirSync(backupRoot,{recursive:true,mode:0o700});if(fs.lstatSync(backupRoot).isSymbolicLink())throw Error('INTEGRATION_BACKUP_ROOT_SYMLINK');
    const backupDirectory=fs.mkdtempSync(path.join(backupRoot,'entry-'));fs.chmodSync(backupDirectory,0o700);
    const backup=path.join(backupDirectory,randomUUID()+'.backup');fs.writeFileSync(backup,preview.original,{flag:'wx',mode:0o600});
    writeFileAtomically(preview.configPath,preview.next);
    return {agent,configPath:preview.configPath,backupPath:backup,installedHash:hash(preview.next),originalHash:expectedHash,originalExisted:preview.originalExisted,status:'MCP_DECOY_INSTALLED' as IntegrationState,coverage:preview.coverage};
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
/** Restore only if the complete config is unchanged; never overwrite later user edits. */
export function restoreAgentIntegration(record:ReturnType<typeof installAgentIntegration>){
  if(hash(read(record.configPath))!==record.installedHash)throw Error('INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED');
  const original=read(record.backupPath);if(hash(original)!==record.originalHash)throw Error('INTEGRATION_BACKUP_CHANGED');
  if(record.originalExisted)writeFileAtomically(record.configPath,original);else fs.unlinkSync(record.configPath);return {status:'RESTORED',configPath:record.configPath};
}
