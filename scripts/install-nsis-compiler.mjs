import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.platform!=='win32')throw Error('NSIS_COMPILER_INSTALL_REQUIRES_WINDOWS');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const provenance=JSON.parse(fs.readFileSync(path.join(repo,'packaging/windows/TOOLCHAIN_PROVENANCE.json'),'utf8')).nsis;
const root=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'Agent Canary NSIS-'));
const nsis=path.join(root,'nsis'),setup=path.join(root,'nsis-setup.exe');
fs.mkdirSync(nsis);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
try{
const response=await fetch(provenance.source,{signal:AbortSignal.timeout(120000)});
if(!response.ok)throw Error('NSIS_DOWNLOAD_HTTP_'+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(sha(bytes)!==provenance.sha256)throw Error('NSIS_SETUP_CHECKSUM_MISMATCH');
fs.writeFileSync(setup,bytes,{flag:'wx'});
// NSIS requires /D to be the final unquoted argument, including paths with spaces.
const installed=spawnSync(setup,['/S',`/D=${nsis}`],{encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true,timeout:120000,maxBuffer:1024*1024});
if(installed.error||installed.status!==0)throw Error('NSIS_INSTALL_FAILED: '+(installed.error?.message??installed.stderr??installed.status));
const makensis=path.join(nsis,'makensis.exe');
if(!fs.existsSync(makensis))throw Error('NSIS_COMPILER_MISSING');
const versionCheck=spawnSync(makensis,['/VERSION'],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:1024*1024});
const compilerVersion=`${versionCheck.stdout??''}${versionCheck.stderr??''}`.trim();
if(versionCheck.error||versionCheck.status!==0||!compilerVersion.includes(provenance.version))throw Error('NSIS_COMPILER_VERSION_MISMATCH: '+(versionCheck.error?.message??compilerVersion));
const compilerSHA256=sha(fs.readFileSync(makensis));
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`NSIS_COMPILER_PATH=${makensis}\n`,'utf8');
process.stdout.write(JSON.stringify({status:'NSIS_COMPILER_READY',expectedVersion:provenance.version,makensisVersion:compilerVersion,makensisSHA256:compilerSHA256,setupSHA256:sha(bytes),compilerPath:makensis})+'\n');
}catch(error){
  try{fs.rmSync(root,{recursive:true,force:true});}catch{}
  throw error;
}
