/** Build an additional free artifact, without changing the regular package or licensing. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-free-artifact-'));
const selected=new Set();
function collect(name){if(selected.has(name))return;const absolute=path.join(root,'src',name);if(!absolute.startsWith(path.join(root,'src')+path.sep)||!name.endsWith('.ts'))throw new Error('FREE_GRAPH_INVALID');
 const source=fs.readFileSync(absolute,'utf8');selected.add(name);
 for(const match of source.matchAll(/(?:from\s*|import\()\s*["'](\.[^"']+)["']/g)){const dependency=path.normalize(path.join(path.dirname(name),match[1])).replace(/\.js$/,'.ts');collect(dependency);}
}
collect('competition.ts');collect('sdk.ts');
if([...selected].some(n=>/^(license|dashboard|export)\.ts$|^eval[\\/]/.test(n)))throw new Error('FREE_GRAPH_CONTAINS_V2');
for(const name of selected){for(const [folder,file]of [['src',name],['dist',name.replace(/\.ts$/,'.js')]]){const target=path.join(dir,folder,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,folder,file),target);}}
for(const name of ['LICENSE','README.md','README.zh-CN.md','package-lock.json','tsconfig.json'])fs.copyFileSync(path.join(root,name),path.join(dir,name));
const original=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const pkg={...original,private:true,description:'Competition-only free artifact; existing paid CLI is not included',bin:{'agent-canary-competition':'dist/competition.js'},scripts:{build:'tsc',test:'node dist/competition.js self-test --json','ai:console':'node dist/competition.js ai console','lab:agent':'node competition-submission/lab/run-agent-eval.mjs --profile=neutral_agent --round4'}};
fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify(pkg,null,2)+'\n');
for(const name of ['run-agent-eval.mjs','scenarios.mjs','round4-scenarios.mjs','build-round4-report.mjs','build-report-data.mjs']){const target=path.join(dir,'competition-submission/lab',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,'competition-submission/lab',name),target);}
for(const name of ['analysis-summary.json','round4-summary.json']){const source=path.join(root,'competition-submission/evidence',name);if(fs.existsSync(source)){const target=path.join(dir,'competition-submission/evidence',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}}
const env={...process.env,AGENT_CANARY_HOME:path.join(dir,'test-home')};
const run=(args)=>execFileSync(process.execPath,args,{cwd:dir,env,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
const npm=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
run([npm,'ci','--ignore-scripts','--no-audit','--no-fund']);run([path.join(dir,'node_modules/typescript/bin/tsc')]);
const selfTest=JSON.parse(run(['dist/competition.js','self-test','--json']));if(!selfTest.passed)throw new Error('FREE_SELF_TEST_FAILED');
const list=[];for(const folder of ['src','dist'])for(const f of selected){const file=folder+'/'+f.replace(/\.ts$/,folder==='dist'?'.js':'.ts');list.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex')});}
fs.writeFileSync(path.join(root,'competition-submission/evidence/round4-free-artifact.json'),JSON.stringify({sourceFiles:selected.size,commercialImplementationFiles:[],selfTest,independentInstallAndBuild:'VERIFIED',regularPackageBoundary:'P1 STILL OPEN; regular package untouched',manifest:list},null,2)+'\n');
// The archive is assembled separately from exactly these public files; no node_modules/test-home.
console.log(JSON.stringify({artifactDirectory:dir,sourceFiles:selected.size,selfTest:selfTest.passed}));
