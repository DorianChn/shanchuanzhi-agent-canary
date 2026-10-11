#!/usr/bin/env node
/** Separate competition entry; existing commercial CLI and license checks stay intact. */
import {Command} from 'commander';
import {serve} from './server.js';
import {runSelfTest} from './self-test.js';
import {registerAICommands} from './ai/cli.js';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {detectAgents,previewAgentIntegration,installAgentIntegration,restoreAgentIntegration,type AgentClient} from './agent-integrations.js';
const program=new Command().name('agent-canary-competition').description('Free competition entry: SDK, MCP, self-test, optional AI and risk-policy console');
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
