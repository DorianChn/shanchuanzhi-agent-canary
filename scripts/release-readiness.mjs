/** Reproducible local checks. Never starts the production sponsor server. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn,execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),out=path.join(root,'competition-submission/evidence/readiness-'+stamp);
fs.mkdirSync(out,{recursive:true});const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'canary-readiness-'));
const npmCli=process.argv.find(a=>a.startsWith('--npm-cli='))?.slice(10)??process.env.READINESS_NPM_CLI;if(!npmCli||!fs.existsSync(npmCli))throw Error('Pass --npm-cli=<installed npm CLI entrypoint>.');
const baseSha=process.argv.find(a=>a.startsWith('--sha='))?.slice(6)??'NOT_VERIFIED';
let elevated='NOT_VERIFIED';if(process.platform==='win32'){try{elevated=/S-1-16-(12288|16384|20480)/.test(execFileSync('whoami.exe',['/groups'],{encoding:'utf8'}));}catch{}}
const result={startedAt:new Date().toISOString(),baseSha,environment:{platform:process.platform,node:process.version,os:os.version(),release:os.release(),arch:process.arch,elevated,cleanOS:false},steps:[]};
const env={...process.env,AGENT_CANARY_HOME:sandbox,AGENT_CANARY_ALERT:'false'};
// Synthetic tests must not inherit payment/AI secrets. Preserve only harmless OS variables otherwise.
for(const key of Object.keys(env))if(/(?:API_KEY|SECRET|TOKEN|PASSWORD|WECHAT_|ALIPAY_|EPAY_|VMQ_)/i.test(key))delete env[key];
const commands=[['root-ci',root,['ci']],['root-build',root,['run','build']],['root-tests',root,['test']],['root-pack',root,['run','pack:check']],['root-verify',root,['run','verify']],['root-audit',root,['audit','--json']],['sponsor-ci',path.join(root,'sponsor'),['ci']],['sponsor-tests',path.join(root,'sponsor'),['test']],['sponsor-smoke',path.join(root,'sponsor'),['run','smoke']],['sponsor-audit',path.join(root,'sponsor'),['audit','--json']]];
for(const [id,cwd,args] of commands){
 const start=Date.now(),file=path.join(out,id+'.log'),stream=fs.createWriteStream(file);
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,[npmCli,...args],{cwd,env,windowsHide:true});child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',e=>{stream.write(String(e));resolve(-1)});child.on('close',resolve);});
 await new Promise(resolve=>stream.end(resolve));const log=fs.readFileSync(file,'utf8'),counts={};
 for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const matches=[...log.matchAll(new RegExp('^# '+key+' ([0-9]+)$','gm'))];if(matches.length)counts[key]=Number(matches.at(-1)[1]);}
 let audit;if(id.endsWith('audit')){try{audit=JSON.parse(log).metadata?.vulnerabilities;}catch{audit='NOT_VERIFIED';}}
 const step={id,command:'node npm-cli.js '+args.join(' '),cwd:path.relative(root,cwd)||'.',exitCode:code,status:code===0?'VERIFIED':'FAILED',durationMs:Date.now()-start,log:path.relative(root,file).replaceAll('\\','/'),...(Object.keys(counts).length?{counts}:{}),...(audit?{audit}:{})};
 result.steps.push(step);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(step));
}
result.completedAt=new Date().toISOString();result.uniqueTests=result.steps.filter(x=>['root-tests','sponsor-tests'].includes(x.id)).reduce((a,x)=>{for(const k of ['tests','pass','fail','skipped'])a[k]=(a[k]??0)+(x.counts?.[k]??0);return a;},{});
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({evidence:out,uniqueTests:result.uniqueTests,failedSteps:result.steps.filter(x=>x.status==='FAILED').map(x=>x.id)}));
process.exitCode=result.steps.some(x=>x.status==='FAILED')?1:0;
