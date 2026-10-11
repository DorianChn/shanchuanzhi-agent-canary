import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const npmCli=process.env.npm_execpath || path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
if(!fs.existsSync(npmCli))throw new Error('Set npm_execpath to installed npm CLI JS entrypoint.');
const prefix=process.argv.includes("--v2")?"v2":process.argv.includes('--round4')?'round4':'ai';
const output=path.join(root,'competition-submission/evidence/'+prefix+'-final-verification.json');
const results={startedAt:new Date().toISOString(),platform:process.platform,node:process.version,commands:[]};
const commands=[['root',['ci']],['root',['run','build']],['root',['test']],['root',['run','pack:check']],['root',['run','verify']],['root',['audit','--json']],['sponsor',['ci']],['sponsor',['test']],['sponsor',['run','smoke']],['sponsor',['audit','--json']]];
for(const [scope,args] of commands){
  const cwd=scope==='root'?root:path.join(root,'sponsor');
  const start=Date.now();const r=spawnSync(process.execPath,[npmCli,...args],{cwd,encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024,timeout:300000});
  const log=(r.stdout||'')+(r.stderr||'');const filename=prefix+'-verify-'+scope+'-'+args.join('-').replace(/[^a-z-]/g,'')+'.txt';
  fs.writeFileSync(path.join(path.dirname(output),filename),log);
  const counts={};for(const key of ['tests','pass','fail','skipped','cancelled']){const m=log.match(new RegExp('# '+key+' (\\d+)'));if(m)counts[key]=Number(m[1]);}
  results.commands.push({scope,command:'npm '+args.join(' '),exitCode:r.status,error:r.error?.code??null,durationMs:Date.now()-start,log:filename,counts});
  fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.commands.at(-1)));
}
results.completedAt=new Date().toISOString();results.passed=results.commands.every(c=>c.exitCode===0);fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');if(!results.passed)process.exitCode=1;
