#!/usr/bin/env node
/** Separate competition entry; existing commercial CLI and license checks stay intact. */
import {Command} from 'commander';
import {serve} from './server.js';
import {runSelfTest} from './self-test.js';
import {registerAICommands} from './ai/cli.js';
const program=new Command().name('agent-canary-competition').description('Free competition entry: SDK, MCP, self-test, optional AI and risk-policy console');
program.command('serve').option('--stdio','MCP stdio transport').action(serve);
program.command('self-test').option('--json').action(async opts=>{const r=await runSelfTest();console.log(opts.json?JSON.stringify(r):JSON.stringify(r,null,2));if(!r.passed)process.exitCode=1;});
registerAICommands(program);await program.parseAsync();
