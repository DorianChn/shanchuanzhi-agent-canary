import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {walkPayloadDirectories,walkPayloadFiles} from '../packaging/windows/payload-walk.mjs';
import {createWindowsBuildInvocation,parseWindowsBuildArgs,resolveWrapperSourceSHA} from '../packaging/windows/build-contract.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('prepare build command carries the same Community ZIP and exact Hook source commit in documented argument order',()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'canary-build-command-'));
  try{
    const payload=path.join(out,'payload');
    const communityZip=path.join(out,'community.zip');
    fs.mkdirSync(payload);
    fs.writeFileSync(communityZip,'SYNTHETIC_COMMUNITY_ZIP');
    const invocation=createWindowsBuildInvocation({
      repoRoot:repo,
      buildScript:path.join(repo,'packaging/windows/build.mjs'),
      payloadDir:payload,
      nsisDir:'PATH_TO_VERIFIED_PORTABLE_NSIS_3_13',
      communityZip
    });
    const wrapperSourceSHA=resolveWrapperSourceSHA(repo);
    assert.match(wrapperSourceSHA,/^[a-f0-9]{40}$/);
    assert.equal(invocation.wrapperSourceSHA,wrapperSourceSHA);
    assert.equal(invocation.communityZip,path.resolve(communityZip));
    assert.equal(invocation.communityZIP_SHA256,createHash('sha256').update(fs.readFileSync(communityZip)).digest('hex'));
    assert.deepEqual(invocation.buildArgs,[payload,'PATH_TO_VERIFIED_PORTABLE_NSIS_3_13',communityZip,wrapperSourceSHA]);
    assert.deepEqual(parseWindowsBuildArgs(invocation.buildArgs,{platform:'win32'}),invocation.buildArgs);
    assert.throws(()=>parseWindowsBuildArgs([...invocation.buildArgs,'unexpected'],{platform:'win32'}),/Usage: node build\.mjs/);
    assert.throws(()=>parseWindowsBuildArgs([...invocation.buildArgs.slice(0,3),'a'.repeat(39)],{platform:'win32'}),/Usage: node build\.mjs/);
    assert.equal(invocation.args.length,5);
    assert.ok(invocation.command.includes('"'+path.resolve(communityZip)+'"'));
    assert.ok(invocation.command.endsWith('"'+wrapperSourceSHA+'"'));
    const prepareSource=fs.readFileSync(path.join(repo,'packaging/windows/prepare.mjs'),'utf8');
    const buildSource=fs.readFileSync(path.join(repo,'packaging/windows/build.mjs'),'utf8');
    assert.match(prepareSource,/createWindowsBuildInvocation\(/);
    assert.match(prepareSource,/communityZip:zip/);
    assert.match(prepareSource,/communityZIP_SHA256:invocation\.communityZIP_SHA256/);
    assert.match(prepareSource,/wrapperSourceSHA:invocation\.wrapperSourceSHA/);
    assert.match(prepareSource,/next:invocation\.command/);
    assert.match(buildSource,/parseWindowsBuildArgs\(process\.argv\.slice\(2\)\)/);
    assert.match(buildSource,/resolveWrapperSourceSHA\(repoRoot\)!==wrapperSHA/);
    assert.match(buildSource,/communityZIP_SHA256:hash\(path\.resolve\(zipArg\)\)/);
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});

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
  assert.doesNotMatch(source,/RMDir\s+\/r/i);
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
