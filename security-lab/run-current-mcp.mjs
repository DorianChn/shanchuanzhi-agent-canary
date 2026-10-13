import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),home=fs.mkdtempSync(path.join(os.tmpdir(),'canary-v2-mcp-proof-'));
const client=new Client({name:'agent-canary-integration-verifier',version:'2.0'},{capabilities:{}});
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'competition-submission/lab/protected-mcp-demo.mjs')],env:{...process.env,AGENT_CANARY_HOME:home},stderr:'pipe'});
const evidence={mode:'ACTUAL_MCP_STDIO_WITH_VIRTUAL_CALLBACKS',scope:'Custom MCP host callbacks; native Claude/Cursor/Cline/Codex tools NOT VERIFIED',steps:[]};
try{await client.connect(transport);const list=await client.listTools();if(list.tools.length!==15)throw Error('EXPECTED_12_DECOYS_PLUS_3_HOST_TOOLS');evidence.tools=list.tools.map(t=>t.name);
 for(const [name,args,expected]of [['public_read',{},false],['virtual_http',{url:'https://synthetic.invalid',body:'api_key=NOT_A_REAL_CREDENTIAL'},true],['virtual_write',{path:'note.txt'},true],['canary_read_secrets',{},false],['public_read',{},true]]){const result=await client.callTool({name,arguments:args});evidence.steps.push({name,result});if(Boolean(result.isError)!==expected)throw Error('MCP_CALLBACK_BOUNDARY_MISMATCH');}
 const normal=JSON.parse(evidence.steps[0].result.content[0].text);if(normal.result.callbacks!==1)throw Error('CALLBACK_COUNT_BAD');evidence.status='VERIFIED_PROTECTED';evidence.coverage='Only three listed synthetic host callbacks within this MCP process';
}catch(e){evidence.status='FAILED';evidence.error=String(e);process.exitCode=1;}finally{await client.close();fs.writeFileSync(path.join(process.env.PRODUCT_AUDIT_OUT,'mcp-current.json'),JSON.stringify(evidence,null,2)+'\n');}
console.log(JSON.stringify({status:evidence.status,tools:evidence.tools?.length,steps:evidence.steps.length}));
