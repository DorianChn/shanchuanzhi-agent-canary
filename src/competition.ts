#!/usr/bin/env node
/** Separate competition entry; existing commercial CLI and license checks stay intact. */
import {Command} from 'commander';
import {serve} from './server.js';
import {runSelfTest} from './self-test.js';
import {registerAICommands} from './ai/cli.js';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {detectAgents,previewAgentIntegration,installAgentIntegration,restoreAgentIntegration,type AgentClient} from './agent-integrations.js';
const program=new Command().name('agent-canary-competition').description('Free competition entry: SDK, MCP, self-test, optional AI and risk-policy console');
const installRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadataFile=path.join(installRoot,'FREE_BUILD_VERSION.json');
let metadata:Record<string,unknown>={};
try{const s=fs.lstatSync(metadataFile);if(!s.isFile()||s.isSymbolicLink()||s.size>16000)throw Error('BUILD_METADATA_UNSAFE');metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8'));if(!metadata||Array.isArray(metadata)||typeof metadata!=='object')throw Error('BUILD_METADATA_INVALID');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
const packageVersion=JSON.parse(fs.readFileSync(path.join(installRoot,'package.json'),'utf8')).version as string;
const productVersion=typeof metadata.candidateId==='string'?'3.0.0-'+metadata.candidateId:'3.0.0-development';
const identity={product:'Agent Canary',productVersion,packageVersion,sourceSHA:metadata.sourceSHA??null,runtimeBaselineSHA:'99660b36db9d5b1121eea6fe06b026c5f1e36bcf',securityRuntimeModified:metadata.securityRuntimeModified??null,globalProtection:false};
program.version(productVersion);
program.command('build-info').description('Product/build identity; installed CLI does not imply global protection').action(()=>console.log(JSON.stringify(identity,null,2)));
program.command('doctor').description('Offline health check; does not activate third-party native protection').action(async()=>{const selfTest=await runSelfTest();console.log(JSON.stringify({identity,selfTest,installation:'CLI_STARTED',configuration:'NOT_VERIFIED',nativeProtection:'NOT_VERIFIED',scope:'SDK/Gateway callbacks must be explicitly registered by a trusted host'},null,2));if(!selfTest.passed)process.exitCode=1;});
program.command('serve').option('--stdio','MCP stdio transport').action(serve);
program.command('self-test').option('--json').action(async opts=>{const r=await runSelfTest();console.log(opts.json?JSON.stringify(r):JSON.stringify(r,null,2));if(!r.passed)process.exitCode=1;});
program.command('integrate').description('Preview/install one MCP entry; native client tools remain OUT_OF_SCOPE').option('--detect','Only inspect client directory metadata').option('--agent <id>','claude, cursor, cline CLI, codex, custom','custom').option('--project <path>','Explicit trusted project directory').option('--apply','Apply after preview, preserving a private backup').option('--protected-demo','Register virtual guarded MCP callbacks instead of only decoys').option('--restore <receipt>','Restore unchanged config using local install receipt').action(opts=>{
 if(opts.detect){console.log(JSON.stringify(detectAgents(),null,2));return;}
 if(opts.restore){const s=fs.statSync(opts.restore);if(s.size>16_000)throw Error('INTEGRATION_RECEIPT_TOO_LARGE');console.log(JSON.stringify(restoreAgentIntegration(JSON.parse(fs.readFileSync(opts.restore,'utf8')))));return;}
 if(!opts.project)throw Error('INTEGRATION_PROJECT_REQUIRED');const project=path.resolve(opts.project),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const entry={command:process.execPath,args:opts.protectedDemo?[path.join(root,'competition-submission/lab/protected-mcp-demo.mjs')]:[path.join(root,'dist/competition.js'),'serve','--stdio']};if(!fs.existsSync(entry.args[0]))throw Error('INTEGRATION_ENTRY_MISSING');
 const preview=previewAgentIntegration(opts.agent as AgentClient,project,entry);if(!opts.apply){console.log(JSON.stringify(preview,null,2));return;}
 const record=installAgentIntegration(opts.agent as AgentClient,project,entry,preview.baseHash),receipt=record.backupPath+'.receipt.json';fs.writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({...record,receiptPath:receipt},null,2));
});
registerAICommands(program);await program.parseAsync();
