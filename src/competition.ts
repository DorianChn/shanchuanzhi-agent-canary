#!/usr/bin/env node
/** Separate competition entry; existing commercial CLI and license checks stay intact. */
import {Command} from 'commander';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {serve} from './server.js';
import {runSelfTest} from './self-test.js';
import {registerAICommands} from './ai/cli.js';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {detectAgentHosts} from './agent-host-detection.js';
import {runCodexConnectionCheck} from './codex-connection-check.js';
import {previewAgentIntegration,installAgentIntegrationWithReceipt,restoreAgentIntegration,type AgentClient} from './agent-integrations.js';
import os from 'node:os';
import {parse as parseToml} from 'smol-toml';
const program=new Command().name('agent-canary-competition').description('Free competition entry: SDK, MCP, self-test, optional AI and risk-policy console');
const installRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadataFile=path.join(installRoot,'FREE_BUILD_VERSION.json');
let metadata:Record<string,unknown>={};
try{const stat=fs.lstatSync(metadataFile);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16_000)throw Error('BUILD_METADATA_UNSAFE');metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8'));if(!metadata||Array.isArray(metadata)||typeof metadata!=='object')throw Error('BUILD_METADATA_INVALID');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
const packageVersion=JSON.parse(fs.readFileSync(path.join(installRoot,'package.json'),'utf8')).version as string;
const productVersion=typeof metadata.candidateId==='string'?'3.0.0-'+metadata.candidateId:'3.0.0-development';
const identity={product:'Agent Canary',productVersion,packageVersion,sourceSHA:metadata.sourceSHA??null,runtimeBaselineSHA:'99660b36db9d5b1121eea6fe06b026c5f1e36bcf',securityRuntimeModified:metadata.securityRuntimeModified??null,globalProtection:false};
program.version(productVersion);
function reportError(error:unknown){
  const code=error instanceof Error?error.message:'UNKNOWN_ERROR';
  const messages:Record<string,string>={
    INTEGRATION_PROJECT_REQUIRED:'请在项目目录运行，或通过 --project 指定真实存在的项目目录。',
    INTEGRATION_PROJECT_NOT_FOUND:'项目目录不存在；没有创建或修改配置。',
    INTEGRATION_PROJECT_NOT_DIRECTORY:'指定路径不是目录；没有创建或修改配置。',
    INTEGRATION_CONFIG_INVALID:'宿主配置格式不合法；原文件未改动。请先修复格式。',
    INTEGRATION_CONFIG_UNSAFE:'配置不是普通文件、路径是链接或文件过大；原文件未改动。',
    INTEGRATION_TOML_INVALID:'Codex TOML 配置无法解析；原文件未改动。',
    INTEGRATION_JSON_INVALID:'MCP JSON 配置无法解析；原文件未改动。',
    INTEGRATION_EXISTING_ENTRY_REQUIRES_MANUAL_REVIEW:'已存在同名 Agent Canary MCP 项；为避免覆盖，没有修改。请先手动检查该项。',
    INTEGRATION_GLOBAL_ENTRY_CONFLICT:'Codex 用户级配置已有同名 Agent Canary MCP 项；为避免遮蔽或覆盖，没有修改。',
    INTEGRATION_CLINE_PATH_UNSUPPORTED:'旧版 Cline 写入路径与当前官方用户级配置位置不一致；未修改配置。当前接入向导只支持 Codex CLI。',
    ONBOARDING_HOST_NOT_END_TO_END_VERIFIED:'当前向导只对 Codex CLI 做了端到端验证；其他宿主仅列出官方接口，不宣称已兼容。',
    INTEGRATION_CONFIG_CHANGED:'预览后配置已变化；为避免覆盖新内容，请重新运行向导。',
    INTEGRATION_LOCKED:'另一个接入或回滚操作正在进行；请稍后重试。',
    INTEGRATION_PARENT_OUTSIDE_PROJECT:'配置目录经过链接后离开了项目目录；没有写入。',
    INTEGRATION_RECEIPT_INVALID:'回滚收据不完整或损坏；没有改动配置。',
    INTEGRATION_RECEIPT_PATH_INVALID:'回滚收据中的配置路径与宿主位置不匹配；没有改动配置。',
    INTEGRATION_USER_EDITS_PRESERVED_MANUAL_RESTORE_REQUIRED:'检测到接入后有用户修改；回滚已停止以保留这些修改。',
    INTEGRATION_BACKUP_CHANGED:'回滚备份校验失败；没有改动配置。',
    INTEGRATION_BACKUP_MISSING:'找不到回滚备份；没有改动配置。',
    CONNECTION_CODEX_NOT_INSTALLED:'没有检测到 Codex CLI。请安装 Codex CLI 后重试。',
    CONNECTION_CODEX_WRAPPER_UNSUPPORTED:'检测到 Codex 命令包装脚本；当前自检仅安全执行 Codex 原生可执行文件。',
    CONNECTION_CHECK_BUILD_REQUIRED:'缺少连接自检运行文件；请先运行 npm run build。',
    CONNECTION_CODEX_TIMEOUT:'Codex 连接自检超时；请检查登录状态和网络后重试。',
    CONNECTION_CODEX_START_FAILED:'无法启动 Codex CLI；请检查安装和权限。',
    CONNECTION_CODEX_RUN_FAILED:'Codex 自检未能完成；检查 Codex 登录、网络与 Hook 支持后重试。',
    ONBOARDING_HOST_NOT_INSTALLED:'未检测到可运行的 Codex CLI；没有修改配置。',
    ONBOARDING_WRITE_PERMISSION_REQUIRED:'当前账户无法写入目标目录；配置未修改。请检查目录权限。',
    ONBOARDING_NODE_VERSION:'Agent Canary 接入需要 Node.js 20 或更高版本。',
  };
  const osCode=(error as NodeJS.ErrnoException|undefined)?.code;
  const detail=messages[code]??(osCode==='EACCES'||osCode==='EPERM'?'权限不足，无法读写指定配置或备份目录；原配置已保留。':osCode==='ENOTDIR'?'路径中有文件占用了应为目录的位置；没有写入配置。':`操作失败（${code}）。`);
  process.stderr.write(`Agent Canary: ${detail}\n`);
  process.exitCode=1;
}
function codexUserConfigPath(){return path.join(process.env.CODEX_HOME?path.resolve(process.env.CODEX_HOME):path.join(os.homedir(),'.codex'),'config.toml');}
function assertNoGlobalCodexConflict(){
  const config=codexUserConfigPath();
  if(!fs.existsSync(config))return;
  const stat=fs.lstatSync(config);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>256_000)throw Error('INTEGRATION_CONFIG_UNSAFE');
  let document:Record<string,any>;
  try{document=parseToml(fs.readFileSync(config,'utf8')) as Record<string,any>;}catch{throw Error('INTEGRATION_TOML_INVALID');}
  if(document.mcp_servers!==undefined&&(!document.mcp_servers||typeof document.mcp_servers!=='object'||Array.isArray(document.mcp_servers)))throw Error('INTEGRATION_CONFIG_INVALID');
  if(document.mcp_servers&&Object.hasOwn(document.mcp_servers,'agent-canary'))throw Error('INTEGRATION_GLOBAL_ENTRY_CONFLICT');
}
function codexEntry(){
  const server=path.join(installRoot,'dist','competition.js');
  if(!fs.existsSync(server))throw Error('INTEGRATION_ENTRY_MISSING');
  return{command:process.execPath,args:[server,'serve','--stdio']};
}
function safePreview(agent:AgentClient,project:string){
  if(agent==='codex')assertNoGlobalCodexConflict();
  const entry=codexEntry();
  const preview=previewAgentIntegration(agent,project,entry);
  let writable:boolean;
  try{
    let parent=path.dirname(preview.configPath);
    while(!fs.existsSync(parent)){const next=path.dirname(parent);if(next===parent)break;parent=next;}
    fs.accessSync(parent,fs.constants.W_OK);writable=true;
  }catch{writable=false;}
  return{entry,preview,writable,addition:agent==='codex'?`[mcp_servers.agent-canary]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n`:JSON.stringify({mcpServers:{'agent-canary':entry}},null,2)};
}
async function commitIntegration(agent:AgentClient,project:string,entry:{command:string;args:string[]},baseHash:string){
  const record=installAgentIntegrationWithReceipt(agent,project,entry,baseHash);
  const {originalHash,installedHash,originalExisted,status,coverage,receiptPath,configPath}=record;
  return{configPath,receiptPath,originalHash,installedHash,originalExisted,status,coverage};
}

program.command('build-info').description('Product/build identity; installed CLI does not imply global protection').action(()=>console.log(JSON.stringify(identity,null,2)));
program.command('doctor').description('Offline health check; does not activate third-party native protection').action(async()=>{try{const selfTest=await runSelfTest();console.log(JSON.stringify({identity,selfTest,installation:'CLI_STARTED',configuration:'NOT_VERIFIED',nativeProtection:'NOT_VERIFIED',scope:'SDK/Gateway callbacks must be explicitly registered by a trusted host'},null,2));if(!selfTest.passed)process.exitCode=1;}catch(error){reportError(error);}});
program.command('serve').option('--stdio','MCP stdio transport').action(serve);
program.command('self-test').option('--json').action(async opts=>{try{const result=await runSelfTest();console.log(opts.json?JSON.stringify(result):JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}catch(error){reportError(error);}});

program.command('onboard').description('Codex project MCP接入向导：预检、预览、备份、回滚').option('--agent <id>','目前端到端支持的宿主','codex').option('--project <path>','项目目录；默认当前目录').option('--apply','确认并写入预览配置').option('--restore <receipt>','从接入收据回滚未修改的配置').option('--json','输出不含原配置值的JSON').action(async options=>{
  try{
    if(options.restore){
      const receiptStat=fs.lstatSync(options.restore);
      if(!receiptStat.isFile()||receiptStat.isSymbolicLink()||receiptStat.size>16_000)throw Error('INTEGRATION_RECEIPT_INVALID');
      const receipt=JSON.parse(fs.readFileSync(options.restore,'utf8'));
      const result=restoreAgentIntegration(receipt);
      console.log(JSON.stringify(result,null,2));return;
    }
    if(options.agent!=='codex')throw Error('ONBOARDING_HOST_NOT_END_TO_END_VERIFIED');
    if(Number(process.versions.node.split('.')[0])<20)throw Error('ONBOARDING_NODE_VERSION');
    const project=path.resolve(options.project??process.cwd());
    const host=detectAgentHosts({project}).find(candidate=>candidate.agent==='codex')!;
    if(!host.installed||!host.executable)throw Error('ONBOARDING_HOST_NOT_INSTALLED');
    const {entry,preview,writable,addition}=safePreview('codex',project);
    const preflight={agent:'codex',label:host.label,installed:host.installed,executable:host.executable,version:host.version,project,configurationPath:preview.configPath,writeAccess:writable?'AVAILABLE':'DENIED_OR_UNKNOWN',userConfigurationChecked:codexUserConfigPath(),hookState:host.hooks,backup:'将创建位于项目目录之外的用户目录回滚副本；Windows ACL 未验证',status:'PREVIEW_ONLY',gatewayScope:preview.coverage,nativeHostTools:'OUT_OF_SCOPE',hookInstallation:'not installed by this wizard'};
    if(options.json&&!options.apply){console.log(JSON.stringify({preflight,addition,baseHash:preview.baseHash},null,2));}
    else if(!options.json){
      console.log('Agent Canary Codex 首次接入预检');
      console.log(`宿主：${host.label}${host.version?` (${host.version})`:'（版本未确认）'}`);
      console.log(`项目：${project}`);
      console.log(`目标配置：${preview.configPath}`);
      console.log(`用户级配置冲突检查：${codexUserConfigPath()}（仅检查条目名，不显示值）`);
      console.log('将追加以下 MCP 项，不重写 Codex TOML 其他内容：');
      console.log(addition);
      console.log('回滚副本位于用户目录；Windows ACL 未由本工具验证。');
      console.log(`保护范围：${preview.coverage}`);
      console.log('Codex 原生 shell、文件编辑、浏览器及其他 MCP 工具仍为 OUT_OF_SCOPE；此写入本身不代表防护已生效。');
      console.log('Hook：向导不会安装 Hook；运行 connect-check 可单独验证临时 Codex PreToolUse Hook。');
    }
    if(!options.apply&&(options.json||!(stdin.isTTY&&stdout.isTTY))){
      if(!options.json)console.log('当前为非交互模式；确认预览无误后重新运行并添加 --apply。');
      return;
    }
    let apply=Boolean(options.apply);
    if(!options.apply){
      const readline=createInterface({input:stdin,output:stdout});
      try{apply=(await readline.question('只接入以上项目级 MCP 项并创建回滚收据？ [y/N] ')).trim().toLowerCase()==='y';}finally{readline.close();}
    }
    if(!apply){if(!options.json)console.log('未写入任何配置。');return;}
    if(!writable)throw Error('ONBOARDING_WRITE_PERMISSION_REQUIRED');
    const result=await commitIntegration('codex',project,entry,preview.baseHash);
    const completed={...result,configurationWrite:'SUCCEEDED',protectionStatus:'NOT_VERIFIED',nextStep:'重启或刷新 Codex 项目，再运行 agent-canary-competition connect-check'};
    console.log(JSON.stringify(options.json?{preflight,addition,...completed}:completed,null,2));
  }catch(error){reportError(error);}
});

program.command('connect-check').description('真实运行 Codex：验证 MCP 工具经 Trusted Execution Gateway，并验证 PreToolUse Hook').option('--agent <id>','宿主','codex').action(async options=>{
  try{if(options.agent!=='codex')throw Error('ONBOARDING_HOST_NOT_END_TO_END_VERIFIED');const result=runCodexConnectionCheck();console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}catch(error){reportError(error);}
});

program.command('integrate').description('Preview/install one MCP entry; native client tools remain OUT_OF_SCOPE').option('--detect','Only inspect client installation metadata').option('--agent <id>','claude, cursor, cline CLI, codex, custom','custom').option('--project <path>','Explicit trusted project directory').option('--apply','Apply after preview, preserving a private backup').option('--protected-demo','Legacy synthetic guarded MCP demo; no real effects').option('--restore <receipt>','Restore unchanged config using local install receipt').action(async options=>{
  try{
    if(options.detect){console.log(JSON.stringify(detectAgentHosts({project:options.project?path.resolve(options.project):undefined}),null,2));return;}
    if(options.restore){const stat=fs.lstatSync(options.restore);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16_000)throw Error('INTEGRATION_RECEIPT_INVALID');console.log(JSON.stringify(restoreAgentIntegration(JSON.parse(fs.readFileSync(options.restore,'utf8')))));return;}
    if(!options.project)throw Error('INTEGRATION_PROJECT_REQUIRED');
    const project=path.resolve(options.project);
    const agent=options.agent as AgentClient;
    if(agent==='cline')throw Error('INTEGRATION_CLINE_PATH_UNSUPPORTED');
    if(agent==='codex')assertNoGlobalCodexConflict();
    const entry=options.protectedDemo?{command:process.execPath,args:[path.join(installRoot,'competition-submission/lab/protected-mcp-demo.mjs')]}:codexEntry();
    const preview=previewAgentIntegration(agent,project,entry);
    const safe={agent,configPath:preview.configPath,entry:preview.entry,baseHash:preview.baseHash,status:preview.status,coverage:preview.coverage,originalExisted:preview.originalExisted};
    if(!options.apply){console.log(JSON.stringify({...safe,action:'PREVIEW_ONLY'},null,2));return;}
    const result=await commitIntegration(agent,project,entry,preview.baseHash);
    console.log(JSON.stringify({...result,configurationWrite:'SUCCEEDED',protectionStatus:'NOT_VERIFIED'},null,2));
  }catch(error){reportError(error);}
});

registerAICommands(program);
try{await program.parseAsync();}catch(error){reportError(error);}
