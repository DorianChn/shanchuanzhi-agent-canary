import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {walkPayloadDirectories,walkPayloadFiles} from '../packaging/windows/payload-walk.mjs';
import {renderInstallerScript} from '../packaging/windows/render-installer.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('payload inventory includes empty directories so NSIS can remove them non-recursively',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-payload-layout-'));
  try{
    fs.mkdirSync(path.join(root,'app','node_modules','@empty'),{recursive:true});
    fs.mkdirSync(path.join(root,'empty-sibling'));
    fs.writeFileSync(path.join(root,'root.txt'),'synthetic');
    assert.deepEqual(walkPayloadDirectories(root),[
      'app','app/node_modules','app/node_modules/@empty','empty-sibling'
    ]);
    assert.deepEqual(walkPayloadFiles(root),['root.txt']);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('payload inventory rejects symbolic links',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-payload-link-'));
  try{
    const target=path.join(root,'target');
    const link=path.join(root,'link');
    fs.writeFileSync(target,'synthetic');
    try{fs.symlinkSync(target,link,'file');}
    catch{t.skip('Windows symbolic-link privilege is not assumed');return;}
    assert.throws(()=>walkPayloadFiles(root),/SYMLINK_IN_PAYLOAD/);
    assert.throws(()=>walkPayloadDirectories(root),/SYMLINK_IN_PAYLOAD/);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('NSIS defaults away from EFS paths and rejects encrypted custom targets without recursive deletion',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/installer.nsi.in'),'utf8');
  assert.match(source,/GetFileAttributesW\(w "\$LOCALAPPDATA"\)/);
  assert.match(source,/\$PROFILE\\Agent Canary Community\\Community-candidate\.3/);
  assert.match(source,/IntOp \$1 \$0 & 0x4000/);
  assert.match(source,/IfSilent efs_notice_done[\s\S]*?MessageBox MB_ICONEXCLAMATION\|MB_OK[\s\S]*?efs_notice_done:/);
  assert.match(source,/EFS-encrypted install paths are not supported/);
  assert.match(source,/RequestExecutionLevel user/);
  assert.match(source,/HKCU/);
  assert.doesNotMatch(source,/RMDir\s+\/r/i);
});

test('rendered installer keeps Unicode and spaced paths and emits exact rollback cleanup',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/installer.nsi.in'),'utf8');
  const rendered=renderInstallerScript({
    source,
    output:path.join(os.tmpdir(),'Agent Canary 安装','AgentCanary-Community-Setup.exe'),
    payload:path.join(os.tmpdir(),'Agent Canary 安装','payload'),
    license:path.join(os.tmpdir(),'Agent Canary 安装','payload','app','LICENSE'),
    anchor:'a'.repeat(64),candidateNumber:'4',
    ownedFiles:['AgentCanary.exe','app/dist/competition.js'],directories:['app','app/dist']
  });
  assert.equal(rendered.charCodeAt(0),0xfeff);
  assert.match(rendered,/Agent Canary 安装/);
  assert.match(rendered,/Agent Canary Community candidate\.4/);
  assert.match(rendered,/RequestExecutionLevel user/);
  assert.match(rendered,/Function \.onInstFailed[\s\S]*?Call RollbackInstall/);
  assert.match(rendered,/Function \.onUserAbort[\s\S]*?Call RollbackInstall/);
  assert.match(rendered,/Function RollbackInstall[\s\S]*?GetFileAttributesW[\s\S]*?rollback_incomplete/);
  assert.match(rendered,/GetFileAttributesW\(w "\$SMPROGRAMS\\Agent Canary Community candidate\.4"\)/);
  assert.match(rendered,/Delete "\$INSTDIR\\app\\dist\\competition\.js"/);
  assert.match(rendered,/RMDir "\$INSTDIR\\app\\dist"/);
  assert.match(rendered,/IfErrors install_failed/);
  assert.doesNotMatch(rendered,/__[A-Z_]+__/);
  assert.doesNotMatch(rendered,/RMDir\s+\/r/i);
});

test('Windows build requires a caller-pinned Community ZIP instead of a stale implicit artifact',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/prepare.mjs'),'utf8');
  assert.match(source,/!communityPath/);
  assert.match(source,/COMMUNITY_ZIP SHA256/);
  assert.match(source,/COMMUNITY_CHECKSUM_MISMATCH/);
  assert.doesNotMatch(source,/competition-candidate\.2/);
});

test('Windows launcher exposes one non-reentrant Auto E4 action with streamed, explicitly bounded results',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/Launcher.cs'),'utf8');
  const worker=fs.readFileSync(path.join(repo,'packaging/windows/worker.mjs'),'utf8');
  const autoE4=fs.readFileSync(path.join(repo,'packaging/windows/auto-e4.mjs'),'utf8');
  assert.match(source,/autoE4\.Text=T\("自动 E4","Auto E4"\)/);
  assert.match(source,/autoE4\.Click\+=async\(s,e\)=>await Execute\("auto-e4"\)/);
  assert.match(source,/if\(busy\)return/);
  assert.match(source,/RunAutoE4\(selected,msg=>/);
  assert.match(source,/BeginInvoke\(\(Action\)\(\(\)=>UpdateE4Progress/);
  assert.match(source,/overallE4/);
  assert.match(autoE4,/E4 EXTERNAL INDEPENDENCE NOT VERIFIED/);
  assert.match(worker,/CLEAN_WINDOWS_VM_NOT_VERIFIED/);
  assert.match(worker,/modelCallMade:false/);
  assert.match(worker,/snapshotRestorePerformed:false/);
});

test('WinForms launcher compiles with the in-box .NET Framework compiler on Windows',t=>{
  if(process.platform!=='win32'){t.skip('Windows desktop compiler is only available on Windows');return;}
  const compiler=path.join(process.env.WINDIR??'C:/Windows','Microsoft.NET','Framework64','v4.0.30319','csc.exe');
  if(!fs.existsSync(compiler)){t.skip('In-box .NET Framework compiler is unavailable');return;}
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-launcher-compile-'));
  try{
    const source=fs.readFileSync(path.join(repo,'packaging/windows/Launcher.cs'),'utf8').replace('__MANIFEST_SHA__','a'.repeat(64));
    const generated=path.join(temp,'Launcher.generated.cs'),output=path.join(temp,'AgentCanary.exe');
    fs.writeFileSync(generated,source,{flag:'wx'});
    const result=spawnSync(compiler,['/nologo','/target:winexe','/platform:x64','/optimize+','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll','/win32manifest:'+path.join(repo,'packaging/windows/app.manifest'),'/out:'+output,generated],{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:1024*1024});
    assert.equal(result.error,undefined,result.error?.message);
    assert.equal(result.status,0,(result.stdout??'')+'\n'+(result.stderr??''));
    assert.ok(fs.statSync(output).size>0);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
