import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {walkPayloadDirectories,walkPayloadFiles} from '../packaging/windows/payload-walk.mjs';
import {renderInstallerScript} from '../packaging/windows/render-installer.mjs';
import {inspectInstallerCompileOutput} from '../packaging/windows/installer-compile-evidence.mjs';

if(process.platform!=='win32')throw Error('INSTALLER_COMPILER_CHECK_REQUIRES_WINDOWS');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const provenance=JSON.parse(fs.readFileSync(path.join(repo,'packaging/windows/TOOLCHAIN_PROVENANCE.json'),'utf8')).nsis;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const makensis=process.env.NSIS_COMPILER_PATH;
if(!makensis||!fs.existsSync(makensis))throw Error('NSIS_COMPILER_MISSING');
const versionCheck=spawnSync(makensis,['/VERSION'],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:1024*1024});
const compilerVersion=`${versionCheck.stdout??''}${versionCheck.stderr??''}`.trim();
if(versionCheck.error||versionCheck.status!==0||!compilerVersion.includes(provenance.version))throw Error('NSIS_COMPILER_VERSION_MISMATCH: '+(versionCheck.error?.message??compilerVersion));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'Agent Canary 编译验收-'));
try{
  const payload=path.join(root,'payload');fs.mkdirSync(path.join(payload,'runtime'),{recursive:true});fs.mkdirSync(path.join(payload,'app'),{recursive:true});
  fs.writeFileSync(path.join(payload,'runtime','node.exe'),'isolated compile fixture');
  fs.writeFileSync(path.join(payload,'app','LICENSE'),'Synthetic compiler fixture license.');
  fs.writeFileSync(path.join(payload,'worker.mjs'),'/* compile-only fixture */');
  const output=path.join(root,'Agent Canary 编译验收 Setup.exe');
  const rendered=renderInstallerScript({
    source:fs.readFileSync(path.join(repo,'packaging/windows/installer.nsi.in'),'utf8'),
    output,payload,license:path.join(payload,'app','LICENSE'),anchor:'a'.repeat(64),candidateNumber:'999',
    ownedFiles:walkPayloadFiles(payload),directories:walkPayloadDirectories(payload)
  });
  const script=path.join(root,'installer.nsi');fs.writeFileSync(script,rendered,{flag:'wx'});
  const compiled=spawnSync(makensis,['/V2',script],{cwd:root,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:2*1024*1024});
  const outputEvidence=inspectInstallerCompileOutput(output);
  if(compiled.error||compiled.status!==0||!outputEvidence.outputValid)throw Error('NSIS_TEMPLATE_COMPILE_FAILED: '+JSON.stringify({exitCode:compiled.status,...outputEvidence,error:compiled.error?.message??null,stdout:compiled.stdout,stderr:compiled.stderr}));
  const result={status:'COMPILED_ONLY_INSTALL_NOT_RUN',expectedNSISVersion:provenance.version,makensisVersion:compilerVersion,makensisSHA256:sha(fs.readFileSync(makensis)),compileExitCode:compiled.status,...outputEvidence,installerSHA256:sha(fs.readFileSync(output)),templateSHA256:sha(Buffer.from(rendered,'utf8')),fixture:{pathIncludesUnicodeAndSpaces:true,syntheticPayload:true},installerExecuted:false};
  process.stdout.write(JSON.stringify(result)+'\n');
}finally{fs.rmSync(root,{recursive:true,force:true});}
