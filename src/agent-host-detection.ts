import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse as parseToml} from 'smol-toml';

export type DetectedAgentHost = {
  agent:'codex'|'claude'|'cursor'|'cline';
  label:string;
  installed:boolean;
  installationSource:'cli'|'editor-extension'|'configuration-only'|'not-found';
  executable:string|null;
  version:string|null;
  mcp:{supported:boolean;configuration:string[];automation:'toml'|'json'|'official-cli'|'official-ui'};
  hooks:{supported:boolean;configured:boolean|null;configuration:string[];activation:'unverified'};
};

type DetectionOptions={
  home?:string;
  project?:string;
  env?:NodeJS.ProcessEnv;
  platform?:NodeJS.Platform;
  exists?:(candidate:string)=>boolean;
  version?:(executable:string)=>string|null;
};

const labels={codex:'OpenAI Codex',claude:'Claude Code',cursor:'Cursor',cline:'Cline'} as const;
const exists=(candidate:string)=>{try{fs.accessSync(candidate);return true;}catch{return false;}};

function findCommand(name:string,env:NodeJS.ProcessEnv,platform:NodeJS.Platform):string|null{
  const extensions=platform==='win32'?(env.PATHEXT||'.COM;.EXE;.BAT;.CMD').split(';'):[''];
  for(const folder of (env.PATH||'').split(path.delimiter).filter(Boolean)){
    const candidates=path.extname(name)?[path.join(folder,name)]:extensions.map(extension=>path.join(folder,name+extension));
    for(const candidate of candidates){if(exists(candidate))return candidate;}
  }
  return null;
}

function readVersion(executable:string,env:NodeJS.ProcessEnv,platform:NodeJS.Platform):string|null{
  try{
    let output:string;
    if(platform==='win32'&&/\.(?:bat|cmd)$/i.test(executable)){
      // Execute only the known host shim found on PATH. Reject shell metacharacters in its path.
      if(/[\r\n&|<>^%!()]/.test(executable))return null;
      const comspec=env.ComSpec||'cmd.exe';
      output=execFileSync(comspec,['/d','/s','/c',`""${executable}" --version"`],{encoding:'utf8',timeout:2500,stdio:['ignore','pipe','ignore'],windowsHide:true});
    }else{
      output=execFileSync(executable,['--version'],{encoding:'utf8',timeout:2500,stdio:['ignore','pipe','ignore'],windowsHide:true});
    }
    const result=output.trim();return result?result.slice(0,160):null;
  }catch{return null;}
}

function codexHookState(file:string,existsFile:(candidate:string)=>boolean):boolean|null{
  if(!existsFile(file))return false;
  try{
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256_000)return null;
    const document=parseToml(fs.readFileSync(file,'utf8')) as Record<string,any>;
    const hooks=document.hooks?.PreToolUse;
    return Array.isArray(hooks)&&hooks.some((item:any)=>typeof item?.matcher==='string'&&item.matcher.includes('agent-canary'));
  }catch{return null;}
}

function claudeHookState(file:string,existsFile:(candidate:string)=>boolean):boolean|null{
  if(!existsFile(file))return false;
  try{
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256_000)return null;
    const document=JSON.parse(fs.readFileSync(file,'utf8')) as Record<string,any>;
    return Array.isArray(document.hooks?.PreToolUse)&&document.hooks.PreToolUse.length>0;
  }catch{return null;}
}

/** Inspect supported host commands, versions, and documented MCP locations without returning config values. */
export function detectAgentHosts(options:DetectionOptions={}):DetectedAgentHost[]{
  const home=options.home??os.homedir();
  const project=options.project?path.resolve(options.project):undefined;
  const env=options.env??process.env;
  const platform=options.platform??process.platform;
  const fileExists=options.exists??exists;
  const version=options.version??((executable:string)=>readVersion(executable,env,platform));
  const homePath=(...parts:string[])=>path.join(home,...parts);
  const projectPath=(...parts:string[])=>project?path.join(project,...parts):null;
  const codexHome=env.CODEX_HOME?path.resolve(env.CODEX_HOME):homePath('.codex');
  const clineConfig=env.CLINE_MCP_SETTINGS_PATH?path.resolve(env.CLINE_MCP_SETTINGS_PATH):homePath('.cline','data','settings','cline_mcp_settings.json');
  const vscodeExtensionRoots=[homePath('.vscode','extensions'),homePath('.vscode-insiders','extensions')];
  const hasClineExtension=vscodeExtensionRoots.some(directory=>{
    try{return fs.readdirSync(directory).some(name=>/^cline\.cline-/i.test(name)||/^saoudrizwan\.claude-dev-/i.test(name));}
    catch{return false;}
  });

  const codexExe=findCommand('codex',env,platform);
  const claudeExe=findCommand('claude',env,platform);
  const cursorExe=findCommand('cursor-agent',env,platform)??findCommand('cursor',env,platform);
  const clineExe=findCommand('cline',env,platform);
  const codexProject=projectPath('.codex','config.toml');
  const claudeProject=projectPath('.mcp.json');
  const cursorProject=projectPath('.cursor','mcp.json');
  const specs=[
    {agent:'codex' as const,executable:codexExe,editor:false,mcp:[path.join(codexHome,'config.toml'),...(codexProject?[codexProject]:[])],hooks:[path.join(codexHome,'config.toml'),...(codexProject?[codexProject]:[])],automation:'toml' as const},
    {agent:'claude' as const,executable:claudeExe,editor:false,mcp:[homePath('.claude.json'),...(claudeProject?[claudeProject]:[])],hooks:[homePath('.claude','settings.json'),...(projectPath('.claude','settings.json')?[projectPath('.claude','settings.json')!]:[])],automation:'json' as const},
    {agent:'cursor' as const,executable:cursorExe,editor:false,mcp:[homePath('.cursor','mcp.json'),...(cursorProject?[cursorProject]:[])],hooks:[],automation:'json' as const},
    {agent:'cline' as const,executable:clineExe,editor:hasClineExtension,mcp:[clineConfig],hooks:[],automation:clineExe?'official-cli' as const:hasClineExtension?'official-ui' as const:'json' as const},
  ];

  return specs.map(spec=>{
    const installed=Boolean(spec.executable)||spec.editor;
    const configurationOnly=spec.mcp.some(fileExists);
    const installationSource=spec.executable?'cli':spec.editor?'editor-extension':configurationOnly?'configuration-only':'not-found';
    let hookConfigured:boolean|null=false;
    if(spec.agent==='codex'){
      hookConfigured=spec.hooks.some(file=>codexHookState(file,fileExists)===true)?true:
        spec.hooks.some(file=>codexHookState(file,fileExists)===null)?null:false;
    }else if(spec.agent==='claude'){
      hookConfigured=spec.hooks.some(file=>claudeHookState(file,fileExists)===true)?true:
        spec.hooks.some(file=>claudeHookState(file,fileExists)===null)?null:false;
    }
    return {
      agent:spec.agent,label:labels[spec.agent],installed,installationSource,executable:spec.executable,
      version:spec.executable?version(spec.executable):null,
      mcp:{supported:true,configuration:spec.mcp,automation:spec.automation},
      hooks:{supported:spec.agent==='codex'||spec.agent==='claude'||(spec.agent==='cline'&&Boolean(clineExe)),configured:hookConfigured,configuration:spec.hooks,activation:'unverified'},
    };
  });
}
