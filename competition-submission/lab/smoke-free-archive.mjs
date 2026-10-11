import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'free-zip-smoke-'));
const zip=path.join(root,'competition-submission/Agent_Canary_Competition_V1.zip');
const python=process.env.PYTHON_PATH||'python.exe';
execFileSync(python,['-c',"import sys,zipfile,pathlib;z=zipfile.ZipFile(sys.argv[1]);assert all(not pathlib.PurePosixPath(n).is_absolute() and '..' not in pathlib.PurePosixPath(n).parts and n.startswith('agent-canary-competition/') for n in z.namelist());z.extractall(sys.argv[2])",zip,temp],{windowsHide:true});
const cwd=path.join(temp,'agent-canary-competition'),env={...process.env,AGENT_CANARY_HOME:path.join(temp,'data')};
const npm=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const run=args=>execFileSync(process.execPath,args,{cwd,env,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
run([npm,'ci','--ignore-scripts','--no-audit','--no-fund']);run(['node_modules/typescript/bin/tsc']);const selfTest=JSON.parse(run(['dist/competition.js','self-test','--json']));if(!selfTest.passed)throw Error('Archive self-test failed');
const client=new Client({name:'free-competition-archive-smoke',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:[path.join(cwd,'dist/competition.js'),'serve','--stdio'],cwd,env,stderr:'pipe'});
let tools;
try{await client.connect(transport);tools=(await client.listTools()).tools;if(tools.length!==12||tools.some(t=>!t.name.startsWith('canary_')))throw Error('MCP tool boundary incorrect');}finally{await client.close();await transport.close();}
const p=path.join(root,'competition-submission/evidence/round4-free-archive.json'),record=JSON.parse(fs.readFileSync(p,'utf8'));
record.extractedArchiveInstallBuildSelfTest='VERIFIED';record.mcpStdioInterop={status:'VERIFIED',listedDecoyTools:tools.length,client:'official MCP SDK Client over child stdio',effects:'none; tools/list only'};
fs.writeFileSync(p,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({extractedArchiveInstallBuildSelfTest:'VERIFIED',mcpTools:tools.length}));
