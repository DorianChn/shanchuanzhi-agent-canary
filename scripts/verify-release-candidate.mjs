/** Downloaded public ZIP acceptance. Only temporary fixtures and loopback services. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash,randomBytes} from 'node:crypto';import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const npmCli=process.argv.find(x=>x.startsWith('--npm-cli='))?.slice(10);if(!npmCli)throw Error('Pass --npm-cli=<npm CLI entrypoint>');
const tag='v2.0.0-competition-preview.1',stamp=new Date().toISOString().replace(/[:.]/g,'-');
const reused=process.argv.find(x=>x.startsWith('--downloads='))?.slice(12);
const packageOnly=process.argv.includes('--package-only');
const evidence=path.join(repoRoot,'competition-submission/evidence','release-install-'+stamp),sandbox=reused?path.resolve(reused):fs.mkdtempSync(path.join(os.tmpdir(),'Agent Canary 中文 安装 '));
if(reused){const relative=path.relative(fs.realpathSync(os.tmpdir()),fs.realpathSync(sandbox));if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||!path.basename(sandbox).startsWith('Agent Canary 中文 安装 '))throw Error('REUSED_DOWNLOAD_DIRECTORY_UNSAFE');}
fs.mkdirSync(evidence,{recursive:true});process.env.AGENT_CANARY_HOME=path.join(sandbox,'仅测试 状态');fs.mkdirSync(process.env.AGENT_CANARY_HOME,{recursive:true});process.env.AGENT_CANARY_ALERT='false';
const report={date:new Date().toISOString(),tag,platform:process.platform,node:process.version,os:os.version(),temporaryChineseAndSpacePath:true,cleanOS:false,assets:[],steps:[],agents:[]};
const save=()=>fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(report,null,2)+'\n');
const releaseResponse=await fetch('https://api.github.com/repos/DorianChn/shanchuanzhi-agent-canary/releases/tags/'+tag,{signal:AbortSignal.timeout(30_000)});assert.equal(releaseResponse.status,200);
const release=await releaseResponse.json();assert.equal(release.draft,false);assert.equal(release.prerelease,true);assert.equal(release.assets.length,7);
report.target=release.target_commitish;
for(const item of release.assets){
 assert.equal(path.basename(item.name),item.name);let source=item.browser_download_url,bytes;
 const cached=path.join(sandbox,item.name);
 const cacheVerified=fs.existsSync(cached)&&'sha256:'+createHash('sha256').update(fs.readFileSync(cached)).digest('hex')===item.digest;
 if(packageOnly&&item.name!=='Agent_Canary_Competition_2_0.zip'&&!cacheVerified){report.assets.push({name:item.name,status:'NOT VERIFIED',reason:'Missing or incomplete download; prior timeout is preserved'});save();continue;}
 if(reused&&fs.existsSync(cached)&&'sha256:'+createHash('sha256').update(fs.readFileSync(cached)).digest('hex')===item.digest){bytes=fs.readFileSync(cached);source='CURRENT_TURN_PRIOR_VERIFIED_DOWNLOAD';}
 else{
  // Direct Release MP4 previously timed out; use the immutable public mirror and still verify the Release digest.
  if(reused&&item.name==='Agent_Canary_2_0_Demo.mp4')source='https://raw.githubusercontent.com/DorianChn/shanchuanzhi-agent-canary/0255c153da943c07fbb37d7bf2c10b140e81f1e6/competition-submission/Agent_Canary_2_0_Demo.mp4';
  const r=await fetch(source,{signal:AbortSignal.timeout(180_000)});assert.equal(r.status,200);bytes=Buffer.from(await r.arrayBuffer());
 }
 const sha=createHash('sha256').update(bytes).digest('hex');assert.equal(item.digest,'sha256:'+sha);assert.equal(item.size,bytes.length);
 fs.writeFileSync(cached,bytes);report.assets.push({name:item.name,sha256:sha,bytes:bytes.length,status:'VERIFIED',url:item.browser_download_url,downloadSource:source});save();console.log(JSON.stringify({asset:item.name,status:'VERIFIED',source}));
}
if(!packageOnly)for(const line of fs.readFileSync(path.join(sandbox,'SHA256SUMS.txt'),'utf8').trim().split('\n')){const [digest,name]=line.split('  ');assert.equal(createHash('sha256').update(fs.readFileSync(path.join(sandbox,name))).digest('hex'),digest);}
const zip=path.join(sandbox,'Agent_Canary_Competition_2_0.zip');
const tar=process.platform==='win32'?path.join(process.env.SystemRoot,'System32','tar.exe'):'tar';
const entries=execFileSync(tar,['-tf',zip],{encoding:'utf8'}).trim().split(/\r?\n/);assert.ok(entries.length>50);
for(const name of entries){assert.ok(name.startsWith('agent-canary-competition/'));assert.ok(!name.split(/[\\/]/).includes('..'));assert.ok(!/\.(?:pem|key)$|(?:^|\/)(?:node_modules|sponsor|data|\.env)(?:\/|$)|(?:src|dist)\/(?:license|dashboard|export)\.(?:ts|js)$|(?:src|dist)\/eval\//.test(name));}
assert.ok(!/^[lh]/m.test(execFileSync(tar,['-tvf',zip],{encoding:'utf8'})));
execFileSync(tar,['-xf',zip,'-C',sandbox],{windowsHide:true});const root=path.join(sandbox,'agent-canary-competition'),cli=path.join(root,'dist/competition.js');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'))).private,true);assert.ok(fs.existsSync(path.join(root,'LICENSE')));assert.ok(fs.existsSync(path.join(root,'THIRD_PARTY_NOTICES.md')));
report.archive={entries:entries.length,commercialFilesExcluded:true,checksumManifest:packageOnly?'NOT VERIFIED':'VERIFIED'};
const childEnv={...process.env};for(const key of Object.keys(childEnv))if(/API_KEY|SECRET|TOKEN|PASSWORD|WECHAT_|ALIPAY_|EPAY_|VMQ_/i.test(key))delete childEnv[key];
async function run(id,args){const log=fs.createWriteStream(path.join(evidence,id+'.log')),started=Date.now();const code=await new Promise(resolve=>{const child=spawn(process.execPath,[npmCli,...args],{cwd:root,env:childEnv,windowsHide:true});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',()=>resolve(-1));child.on('close',resolve)});await new Promise(resolve=>log.end(resolve));report.steps.push({id,exitCode:code,status:code===0?'VERIFIED':'FAILED',durationMs:Date.now()-started});save();assert.equal(code,0,id);}
await run('downloaded-npm-ci',['ci']);await run('downloaded-build',['run','build']);await run('downloaded-self-test',['test']);await run('downloaded-audit',['audit','--json']);
const sdk=await import(pathToFileURL(path.join(root,'dist/sdk.js')).href);
const provider=sdk.createAIProvider({id:'ollama-readiness',kind:'local',protocol:'ollama',baseUrl:'http://127.0.0.1:11434',model:'qwen3.5-9b-local:latest',timeoutMs:3000});
const connection=await provider.testConnection();report.ollama={...connection,inference:'NOT MEASURED HERE: separate real-model run',actualServiceRequired:true};save();
for(const agent of ['claude','cursor','cline','codex','custom']){
 const project=path.join(sandbox,agent+' 配置 空格 '+stamp);fs.mkdirSync(project);
 const entry={command:process.execPath,args:[cli,'serve','--stdio']},preview=sdk.previewAgentIntegration(agent,project,entry),installed=sdk.installAgentIntegration(agent,project,entry,preview.baseHash);
 const client=new Client({name:'candidate-config-fixture',version:'2.0'}),transport=new StdioClientTransport({command:entry.command,args:entry.args,env:childEnv,stderr:'pipe'});
 let toolCount;try{await client.connect(transport);toolCount=(await client.listTools()).tools.length;assert.equal(toolCount,12);}finally{await client.close();}
 assert.equal(sdk.restoreAgentIntegration(installed).status,'RESTORED');assert.equal(fs.existsSync(installed.configPath),false);
 report.agents.push({agent,configuration:installed.status,configuredStdioHandshake:'VERIFIED',tools:toolCount,restore:'VERIFIED',desktopApplicationActivation:'NOT VERIFIED',nativeToolGuard:'OUT_OF_SCOPE',scope:'Synthetic project configuration; never touched real editor configuration'});save();
}
const guard=sdk.createAgentGuard({alert:false}),router=sdk.createSecurityToolRouter({guard,workspaceRoot:root,tools:{read:{operation:'file-read'},shell:{operation:'shell'},http:{operation:'http'}},verifyRealPaths:true,executeRealTool:()=>({callbacks:++calls,virtual:true})});let calls=0;
await router.dispatch({name:'read',args:{path:'README.md'}});assert.equal(calls,1);await assert.rejects(router.dispatch({name:'shell',args:{command:'rm -rf /'}}));assert.equal(calls,1);await router.dispatch({name:'canary_read_secrets'});assert.equal(guard.state,'QUARANTINED');await assert.rejects(router.dispatch({name:'read',args:{path:'README.md'}}));assert.equal(calls,1);
report.guard={normalReadExecuted:true,firstDestructiveCallDenied:true,quarantined:true,callbackCountAfterQuarantine:1,virtualCallbacksOnly:true};
const offline=sdk.createAIProvider({id:'offline-fixture',kind:'local',protocol:'ollama',baseUrl:'http://127.0.0.1:1',model:'probe',timeoutMs:500});const down=await offline.testConnection();assert.equal(down.ok,false);
const offlineGuard=sdk.createAgentGuard({alert:false}),offlineRouter=sdk.createSecurityToolRouter({guard:offlineGuard,workspaceRoot:root,tools:{read:{operation:'file-read'},write:{operation:'file-write'}},provider:offline,executeRealTool:()=>++offlineCalls});let offlineCalls=0;
await offlineRouter.dispatch({name:'read',args:{path:'README.md'}});await assert.rejects(offlineRouter.dispatch({name:'write',args:{path:'demo.txt'}}));assert.equal(offlineCalls,1);
report.modelDisconnected={knownUnavailableLoopbackEndpoint:true,basicReadExecuted:true,ambiguousWriteNotExecuted:true,actualOllamaServiceStopped:false};save();
const {startAIConsole}=await import(pathToFileURL(path.join(root,'dist/ai/console.js')).href),operator=randomBytes(24).toString('hex'),app=await startAIConsole({port:0,operatorApprovalCode:operator,eventsFile:path.join(process.env.AGENT_CANARY_HOME,'console.jsonl')});
try{
 const html=await(await fetch(app.url)).text();assert.ok(!html.includes(operator));assert.ok(html.includes('Agent Canary'));
 const csrf=html.match(/const csrf='([^']+)'/)[1],post=(route,body)=>fetch(app.url+'/api/'+route,{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf},body:JSON.stringify(body)});
 const savedResponse=await fetch(app.url+'/api/v2',{headers:{'x-canary-csrf':csrf}}),saved=await savedResponse.json();report.consoleProbe={savedStatus:savedResponse.status,savedResult:saved.totalTrials??saved};save();assert.equal(saved.totalTrials,168);
 const requested=await(await post('policy/action',{action:'write'})).json(),requestId=requested.pending[0].requestId;
 const forged=await post('policy/approve',{requestId,confirm:true,operatorCode:'FORGED',approvedBy:'human'});assert.equal(forged.status,403);
 const accepted=await(await post('policy/approve',{requestId,confirm:true,operatorCode:operator})).json();assert.equal(accepted.status,'EXECUTED');assert.equal((await post('policy/approve',{requestId,confirm:true,operatorCode:operator})).status,400);
 const probe=await(await post('agents/probe',{})).json();assert.equal(probe.status,'VERIFIED_PROTECTED');assert.equal(probe.tools,15);
 await post('policy/action',{action:'decoy'});const denied=await(await post('policy/action',{action:'read'})).json();assert.equal(denied.status,'BLOCKED_BY_GUARD');
 report.console={launchedFromDownloadedZIP:true,bind:'loopback',savedExperiments:168,operatorSecretNotInHTML:true,forgedApprovalDenied:true,oneShotApproval:true,mcpVirtualCallbacksProtected:true,quarantineDeniesLaterRead:true};
}finally{await app.close();}
report.completedAt=new Date().toISOString();report.status='VERIFIED_WITH_LIMITS';report.limits=['Not a fresh Windows installation','Only this process Node version tested locally','Real desktop clients were not activated','Firewall settings not changed','No production credentials or cloud requests'];save();console.log(JSON.stringify({evidence,status:report.status,steps:report.steps,agents:report.agents.length}));
