import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const ownRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=process.argv.indexOf('--package-root');
const packageRoot=index<0?ownRoot:path.resolve(process.argv[index+1]);
const pkg=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
if(!fs.existsSync(path.join(packageRoot,'dist/sdk.d.ts')))throw Error('PUBLIC_SDK_DECLARATION_MISSING');
const exp=pkg.exports?.['./sdk'];
if(!exp||exp.types!=='./dist/sdk.d.ts'||exp.import!=='./dist/sdk.js')throw Error('PUBLIC_SDK_TYPED_EXPORT_MISMATCH');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'Canary SDK 类型 中文 空格 '));
// A separate consumer package; it can only resolve the actual target package and its declarations.
fs.writeFileSync(path.join(scratch,'package.json'),JSON.stringify({private:true,type:'module'}));
const parts=pkg.name.split('/'),link=path.join(scratch,'node_modules',...parts);
fs.mkdirSync(path.dirname(link),{recursive:true});fs.symlinkSync(packageRoot,link,'junction');
const consumer=path.join(scratch,'consumer.mts');
fs.writeFileSync(consumer,[
 'import {createTrustedExecutionGateway,type GatewayOptions} from '+JSON.stringify(pkg.name+'/sdk')+';',
 'type Extension=NonNullable<GatewayOptions["mcpTools"]>[string];',
 'const fixture={risk:"READ_ONLY",approvalRequired:false,execute:async (_a:Record<string,unknown>,s:AbortSignal)=>({ok:!s.aborted})} satisfies Extension;',
 'void fixture;',
 'declare const runtime:ReturnType<typeof createTrustedExecutionGateway>;',
 'runtime.agent.dispatch({name:"mcp_tool",args:{tool:"fixture_status",arguments:{}}});',
 '// @ts-expect-error Approval belongs to the operator, never to the Agent.',
 'runtime.agent.approve("forged");',
 '// @ts-expect-error The Agent does not expose reset authority.',
 'runtime.agent.reset();',
].join('\n')+'\n');
const compiler=path.join(ownRoot,'node_modules/typescript/bin/tsc');
execFileSync(process.execPath,[compiler,'--noEmit','--strict','--skipLibCheck','false','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--typeRoots',path.join(ownRoot,'node_modules/@types'),consumer],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
console.log(JSON.stringify({status:'VERIFIED',package:pkg.name,version:pkg.version,consumerDirectory:scratch,checks:['conditional SDK import','transitive declarations','READ_ONLY descriptor','Agent cannot approve','Agent cannot reset'],scope:'compile-time contract; not runtime security proof'}));
