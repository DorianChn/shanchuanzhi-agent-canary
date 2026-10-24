import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {walkPayloadDirectories,walkPayloadFiles} from '../packaging/windows/payload-walk.mjs';
import {renderInstallerScript} from '../packaging/windows/render-installer.mjs';
import {communityRuntimeFiles,validateCommunityRuntime} from '../packaging/windows/runtime-contract.mjs';
import {createWindowsBuildInvocation,M1_CANONICAL_WRAPPER_BLOB_SHA,M1_CANONICAL_WRAPPER_SHA256,parseWindowsBuildArgs,readCommittedWrapperSource,resolveWrapperSourceSHA,writePackagedWrapperSource} from '../packaging/windows/build-contract.mjs';
import {isPublicPackageFile,reviewedGatewayAdapterPackageFiles,validateGatewayAdapterPackage} from '../scripts/package-file-policy.mjs';

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

test('Windows Community packaging requires the exact 37 runtime files and SDK declaration',()=>{
  const build=fs.readFileSync(path.join(repo,'packaging/windows/build.mjs'),'utf8');
  const worker=fs.readFileSync(path.join(repo,'packaging/windows/worker.mjs'),'utf8');
  assert.equal(communityRuntimeFiles.length,37);
  assert.equal(new Set(communityRuntimeFiles).size,communityRuntimeFiles.length);
  assert.deepEqual(validateCommunityRuntime([...communityRuntimeFiles].reverse(),true),communityRuntimeFiles);
  assert.throws(()=>validateCommunityRuntime(communityRuntimeFiles.slice(1),true),/COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/);
  assert.throws(()=>validateCommunityRuntime([...communityRuntimeFiles,'unexpected.js'],true),/COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/);
  assert.throws(()=>validateCommunityRuntime(communityRuntimeFiles,false),/COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/);
  assert.match(build,/validateCommunityRuntime\(walk\(path\.join\(root,'app\/dist'\)\)/);
  assert.match(build,/app\/dist\/sdk\.d\.ts/);
  assert.match(worker,/runtimeFiles:Array\.isArray\(version\.coreRuntimeHashes\)\?version\.coreRuntimeHashes\.length:0/);
});

test('Windows build reaches Node integrity only after the exact Community runtime and SDK checks pass',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'canary-community-runtime-contract-'));
  const payload=path.join(temp,'payload'),app=path.join(payload,'app'),dist=path.join(app,'dist');
  const nsis=path.join(temp,'nsis');
  try{
    fs.mkdirSync(dist,{recursive:true});
    for(const file of communityRuntimeFiles){
      const target=path.join(dist,...file.split('/'));
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,'synthetic runtime');
    }
    fs.writeFileSync(path.join(dist,'sdk.d.ts'),'export {}\n');
    fs.mkdirSync(path.join(payload,'runtime'),{recursive:true});
    fs.writeFileSync(path.join(payload,'runtime','node.exe'),'synthetic node');
    fs.writeFileSync(path.join(app,'FREE_BUILD_VERSION.json'),JSON.stringify({candidateId:'competition-candidate.2',runtimeBaselineSHA:'99660b36db9d5b1121eea6fe06b026c5f1e36bcf',sourceSHA:'synthetic-source',securityRuntimeModified:true}));
    fs.writeFileSync(path.join(app,'package.json'),JSON.stringify({version:'3.0.0-competition-candidate.2'}));
    fs.mkdirSync(nsis);
    fs.writeFileSync(path.join(nsis,'COPYING'),'synthetic NSIS license');
    const communityZip=path.join(temp,'community.zip');
    fs.writeFileSync(communityZip,'synthetic community ZIP');
    const sourceSHA=spawnSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true});
    assert.equal(sourceSHA.status,0,(sourceSHA.stderr??'').toString());
    const build=spawnSync(process.execPath,[path.join(repo,'packaging/windows/build.mjs'),payload,nsis,communityZip,sourceSHA.stdout.trim()],{encoding:'utf8',windowsHide:true});
    assert.notEqual(build.status,0,'synthetic Node bytes must fail the later pinned-runtime integrity check');
    assert.match((build.stdout??'')+(build.stderr??''),/NODE_CHECKSUM_MISMATCH/);
    assert.doesNotMatch((build.stdout??'')+(build.stderr??''),/COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('package allowlist admits only the reviewed M2 gateway facade',()=>{
  for(const file of reviewedGatewayAdapterPackageFiles)assert.equal(isPublicPackageFile(file),true);
  for(const file of [
    'execution-isolation/gateway-adapter/security-gateway-adapter.mjs',
    'execution-isolation/gateway-adapter/extra.mjs',
    'execution-isolation/gateway-adapter/test-secret.mjs',
    'execution-isolation/other-module/runtime.mjs',
    'sponsor/private.mjs',
    'src/runtime/internal.mjs',
  ])assert.equal(isPublicPackageFile(file),false,file);
  assert.deepEqual(reviewedGatewayAdapterPackageFiles,[
    'execution-isolation/gateway-adapter/gateway-adapter.mjs',
  ]);
});

test('package checker accepts only the reviewed gateway facade and exact export target',()=>{
  const manifest={exports:{'./sdk':'./dist/sdk.js','./gateway-adapter':'./execution-isolation/gateway-adapter/gateway-adapter.mjs'}};
  validateGatewayAdapterPackage(manifest,[...reviewedGatewayAdapterPackageFiles]);
  validateGatewayAdapterPackage({exports:{'./sdk':'./dist/sdk.js'}},[]);
  assert.throws(()=>validateGatewayAdapterPackage({exports:{'./sdk':'./dist/sdk.js'}},[...reviewedGatewayAdapterPackageFiles]),/require the reviewed export/);
  assert.throws(()=>validateGatewayAdapterPackage(manifest,[]),/missing .*gateway-adapter\.mjs/);
  assert.throws(()=>validateGatewayAdapterPackage(manifest,[...reviewedGatewayAdapterPackageFiles,'execution-isolation/gateway-adapter/security-gateway-adapter.mjs']),/unexpected gateway adapter package file/);
  assert.throws(()=>validateGatewayAdapterPackage(manifest,[...reviewedGatewayAdapterPackageFiles,'execution-isolation/gateway-adapter/extra.mjs']),/unexpected gateway adapter package file/);
  assert.throws(()=>validateGatewayAdapterPackage({exports:{...manifest.exports,'./security-gateway-adapter':'./execution-isolation/gateway-adapter/security-gateway-adapter.mjs'}},[...reviewedGatewayAdapterPackageFiles]),/internals exposed/);
  assert.throws(()=>validateGatewayAdapterPackage({exports:{'./gateway-adapter':'./execution-isolation/gateway-adapter/security-gateway-adapter.mjs'}},[...reviewedGatewayAdapterPackageFiles]),/must target only the strict facade/);
});

test('M7 reusable package smoke pins and applies its checker to the caller candidate',()=>{
  const workflow=fs.readFileSync(path.join(repo,'.github/workflows/m7-package-smoke.yml'),'utf8');
  const checker=fs.readFileSync(path.join(repo,'scripts/check-package.mjs'),'utf8');
  assert.match(workflow,/workflow_call:/);
  assert.match(workflow,/policy-ref:[\s\S]*?required: true[\s\S]*?type: string/);
  assert.match(workflow,/github\.event\.pull_request\.head\.sha \|\| github\.sha/);
  assert.match(workflow,/ref: \$\{\{ inputs\.policy-ref \}\}/);
  assert.match(workflow,/POLICY_REF[\s\S]*?\[\[:xdigit:\]\]\{40\}/);
  assert.match(workflow,/permissions:\s+contents: read/);
  assert.equal((workflow.match(/persist-credentials: false/g)??[]).length,2);
  assert.match(workflow,/npm run pack:check -- --package-root "\$PACKAGE_ROOT"/);
  assert.match(checker,/process\.argv\.indexOf\("--package-root"\)/);
  assert.match(checker,/path\.join\(policyRoot, 'scripts', 'check-sdk-types\.mjs'\)/);
  assert.doesNotMatch(workflow,/execution-isolation\/\*\*/);
});

test('Community source build transfers the patched dependency tree and keeps candidate metadata and audit policy',()=>{
  const source=fs.readFileSync(path.join(repo,'security-lab/build-community.py'),'utf8');
  const pkg=JSON.parse(fs.readFileSync(path.join(repo,'package.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(path.join(repo,'package-lock.json'),'utf8'));
  const lockRoot=lock.packages[''];
  for(const requiredSource of ['src/agent-host-detection.ts','src/codex-connection-check.ts','src/agent-integrations.ts','src/codex-connection-mcp.ts','src/containment.ts','src/ai/security-center-adapter.ts','security-lab/claude-native-hook.mjs']){
    assert.ok(source.includes(`'${requiredSource}'`),`candidate source allowlist must include ${requiredSource}`);
  }
  assert.match(source,/lock=json\.loads\(\(root\/'package-lock\.json'\)\.read_text\(encoding='utf-8'\)\)/);
  assert.match(source,/lock_root=lock\.get\('packages',\{\}\)\.get\('',\{\}\)/);
  assert.match(source,/lock\['version'\]=pkg\['version'\];lock_root\['version'\]=pkg\['version'\]/);
  assert.match(source,/pkg\['version'\]='3\.0\.0-'\+a\.candidate_id/);
  assert.match(source,/version=\{'product':.*?'candidateId':a\.candidate_id/s);
  assert.match(source,/if lock_root\.get\(field,\{\}\)!=pkg\.get\(field,\{\}\)/);
  for(const field of ['dependencies','devDependencies','optionalDependencies']){
    assert.deepEqual(lockRoot[field]??{},pkg[field]??{},`root lock ${field} must match the candidate manifest`);
  }
  assert.equal(lock.packages['node_modules/body-parser'].version,'2.4.0');
  assert.equal(lock.packages['node_modules/ip-address'].version,'10.7.4');
  assert.equal(lock.packages['node_modules/zod'].version,'4.6.7');
  assert.equal(lock.packages['node_modules/hono'].version,'4.13.13');
  assert.equal(lock.packages['node_modules/fast-uri'].version,'3.1.9');
  assert.match(source,/\['audit','--json'\]/);
  assert.doesNotMatch(source,/\['audit','--json','--audit-level'/);
  assert.match(source,/failed_steps=\[\(name,result\['exitCode'\]\) for name,result in logs\.items\(\) if result\['exitCode'\]!=0\]/);
  assert.match(source,/print\(f'Community validation failed at: \{details\}',file=sys\.stderr\)/);
  assert.match(source,/print\(f'Community validation log: \{logfile\.relative_to\(root\)\}',file=sys\.stderr\)/);
});

test('Community candidate pins the Hook Git blob when a Windows worktree has CRLF',()=>{
  const builder=fs.readFileSync(path.join(repo,'security-lab/build-community.py'),'utf8');
  assert.match(builder,/hook_blob_ref=f'\{a\.sha\}:\{community_hook_relative\}'/);
  assert.match(builder,/subprocess\.run\(\['git','-C',str\(root\),'cat-file','blob',hook_blob_sha\]/);
  assert.match(builder,/if relative==community_hook_relative:continue/);
  assert.match(builder,/community_hook_path\.write_bytes\(hook_blob\)/);
  assert.match(builder,/git_blob_sha\(candidate_hook\)!=hook_blob_sha/);

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-community-hook-blob-'));
  const sourcePath='security-lab/claude-native-hook.mjs';
  const canonical=readCommittedWrapperSource(repo);
  const runGit=(...args)=>{
    const result=spawnSync('git',['-C',temp,...args],{encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,(result.stdout??'')+'\n'+(result.stderr??''));
    return result.stdout.trim();
  };
  try{
    const worktreePath=path.join(temp,sourcePath);
    fs.mkdirSync(path.dirname(worktreePath),{recursive:true});
    fs.writeFileSync(worktreePath,canonical.bytes);
    fs.writeFileSync(path.join(temp,'.gitattributes'),`${sourcePath} text eol=lf\n`);
    runGit('init','--quiet');
    runGit('config','core.autocrlf','true');
    runGit('config','user.name','Canary contract test');
    runGit('config','user.email','canary-contract-test@example.invalid');
    runGit('add','--','.gitattributes',sourcePath);
    runGit('commit','--quiet','-m','test pinned Community Hook blob');
    const sourceCommit=runGit('rev-parse','HEAD');
    assert.equal(runGit('rev-parse',`${sourceCommit}:${sourcePath}`),M1_CANONICAL_WRAPPER_BLOB_SHA);

    const crlfWorktree=Buffer.from(canonical.bytes.toString('utf8').replace(/\n/g,'\r\n'),'utf8');
    fs.writeFileSync(worktreePath,crlfWorktree);
    assert.deepEqual(fs.readFileSync(worktreePath),crlfWorktree);
    assert.notDeepEqual(fs.readFileSync(worktreePath),canonical.bytes,'the synthetic Windows worktree must differ from canonical LF bytes');

    const pinned=spawnSync('git',['-C',temp,'cat-file','blob',`${sourceCommit}:${sourcePath}`],{windowsHide:true});
    assert.equal(pinned.status,0,(pinned.stderr??'').toString());
    const candidatePath=path.join(temp,'candidate',sourcePath);
    fs.mkdirSync(path.dirname(candidatePath),{recursive:true});
    fs.writeFileSync(candidatePath,pinned.stdout);
    const candidate=fs.readFileSync(candidatePath);
    const candidateBlob=createHash('sha1').update(`blob ${candidate.length}\0`).update(candidate).digest('hex');
    assert.deepEqual(candidate,canonical.bytes);
    assert.equal(candidateBlob,M1_CANONICAL_WRAPPER_BLOB_SHA);
    assert.equal(createHash('sha256').update(candidate).digest('hex'),M1_CANONICAL_WRAPPER_SHA256);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Community candidate stages the exact M8 offline-demo Git blob and provenance',()=>{
  const builder=fs.readFileSync(path.join(repo,'security-lab/build-community.py'),'utf8');
  const workflow=fs.readFileSync(path.join(repo,'.github/workflows/windows-community.yml'),'utf8');
  const m8SourceSHA='90fcde07775d4109f6e1b1b4b52d1975723dd979';
  const m8DemoBlob='3428f297c28845ae054c0ca63aa6c5c4d7ef785f';
  const m8DemoPath='competition-submission/roadshow-3.0/reproduction-kit/run-offline-demo.mjs';
  assert.match(builder,/p\.add_argument\('--m8-source-sha',required=True\)/);
  assert.match(builder,/expected_m8_source_sha='90fcde07775d4109f6e1b1b4b52d1975723dd979'/);
  assert.match(builder,/expected_m8_demo_blob='3428f297c28845ae054c0ca63aa6c5c4d7ef785f'/);
  assert.match(builder,/m8_demo_ref=f'\{a\.m8_source_sha\}:\{m8_demo_relative\}'/);
  assert.match(builder,/community_demo_path\.write_bytes\(m8_demo_bytes\)/);
  assert.match(builder,/if candidate_m8_demo!=m8_demo_bytes[\s\S]*?expected_m8_demo_blob/);
  assert.match(builder,/m8SourceSHA':a\.m8_source_sha[\s\S]*?'m8SourceBlob':expected_m8_demo_blob/);
  assert.match(workflow,/M8_SOURCE_SHA: 90fcde07775d4109f6e1b1b4b52d1975723dd979/);
  assert.match(workflow,/refs\/pull\/40\/head/);
  assert.match(workflow,/--m8-source-sha \$env:M8_SOURCE_SHA/);
  assert.match(workflow,/communityBuildSummary\.m8SourceBlob -ne '3428f297c28845ae054c0ca63aa6c5c4d7ef785f'/);

  const sourceRepo=spawnSync('git',['-C',repo,'remote','get-url','origin'],{encoding:'utf8',windowsHide:true});
  assert.equal(sourceRepo.status,0,(sourceRepo.stderr??'').toString());
  const sourceFetchTemp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-m8-source-fetch-'));
  let m8Demo;
  try{
    const runGit=(...args)=>spawnSync('git',['-C',sourceFetchTemp,...args],{encoding:'utf8',windowsHide:true});
    let gitResult=runGit('init','--quiet');
    assert.equal(gitResult.status,0,(gitResult.stderr??'').toString());
    gitResult=runGit('remote','add','origin',sourceRepo.stdout.trim());
    assert.equal(gitResult.status,0,(gitResult.stderr??'').toString());
    gitResult=runGit('fetch','--no-tags','--depth=1','origin','refs/pull/40/head');
    assert.equal(gitResult.status,0,(gitResult.stderr??'').toString());
    gitResult=runGit('rev-parse','FETCH_HEAD');
    assert.equal(gitResult.status,0,(gitResult.stderr??'').toString());
    assert.equal(gitResult.stdout.trim(),m8SourceSHA,'the fetched M8 PR ref must still match the exact pinned source SHA');
    m8Demo=spawnSync('git',['-C',sourceFetchTemp,'cat-file','blob',`${m8SourceSHA}:${m8DemoPath}`],{windowsHide:true});
    assert.equal(m8Demo.status,0,(m8Demo.stderr??'').toString());
  }finally{fs.rmSync(sourceFetchTemp,{recursive:true,force:true});}
  const expectedBlob=createHash('sha1').update(`blob ${m8Demo.stdout.length}\0`).update(m8Demo.stdout).digest('hex');
  assert.equal(expectedBlob,m8DemoBlob);
  const expectedText=m8Demo.stdout.toString('utf8');
  assert.match(expectedText,/GATEWAY_EXECUTION_FAILED_EFFECTS_NOT_ROLLED_BACK/);
  assert.match(expectedText,/g\.state,'QUARANTINED'/);
  assert.match(expectedText,/guard_quarantined/);
  assert.match(expectedText,/NORMAL_OK/);

  const pythonCandidates=[process.env.CANARY_PYTHON,...(process.platform==='win32'?['python.exe','python']:['python3','python'])].filter(Boolean);
  let pythonCommand;
  for(const candidate of pythonCandidates){
    const probe=spawnSync(candidate,['--version'],{encoding:'utf8',windowsHide:true});
    if(probe.status===0){pythonCommand=candidate;break;}
  }
  assert.ok(pythonCommand,'the Community builder regression requires the same Python runtime as the build job');

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-community-m8-pin-'));
  const fakeNpm=path.join(temp,'fake-npm-cli.cjs');
  const outputName=`.test-community-m8-${process.pid}-${Date.now()}`;
  const outputDir=path.join(repo,'competition-submission',outputName);
  const sourceSHA=spawnSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true});
  assert.equal(sourceSHA.status,0,(sourceSHA.stderr??'').toString());
  fs.writeFileSync(fakeNpm,"if (process.argv[2] === 'run' && process.argv[3] === 'build') { require('node:fs').mkdirSync('dist', { recursive: true }); require('node:fs').writeFileSync('dist/sdk.d.ts', 'export {};\\n'); }\n");
  let stageDir;
  try{
    const unpinned=spawnSync(pythonCommand,[
      'security-lab/build-community.py','--node',process.execPath,'--npm-cli',fakeNpm,
      '--sha',sourceSHA.stdout.trim(),'--m8-source-sha','0'.repeat(40),
      '--candidate-id','m8-pin-test','--output-dir',outputDir,
    ],{cwd:repo,encoding:'utf8',windowsHide:true});
    assert.notEqual(unpinned.status,0,'the builder must reject noncanonical M8 source commits');
    assert.match(unpinned.stderr,/Pinned M8 source SHA mismatch/);
    assert.equal(fs.existsSync(outputDir),false,'a rejected M8 pin must not create candidate outputs');
    const build=spawnSync(pythonCommand,[
      'security-lab/build-community.py','--node',process.execPath,'--npm-cli',fakeNpm,
      '--sha',sourceSHA.stdout.trim(),'--m8-source-sha',m8SourceSHA,
      '--candidate-id','m8-pin-test','--output-dir',outputDir,
    ],{cwd:repo,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
    assert.equal(build.status,0,(build.stdout??'')+'\n'+(build.stderr??''));
    const summary=JSON.parse(build.stdout.trim());
    assert.equal(summary.m8SourceSHA,m8SourceSHA);
    assert.equal(summary.m8SourceBlob,m8DemoBlob);
    const rawReport=JSON.parse(fs.readFileSync(path.join(outputDir,`community-build-${sourceSHA.stdout.trim().slice(0,8)}.json`),'utf8'));
    assert.equal(rawReport.version.m8SourceSHA,m8SourceSHA);
    assert.equal(rawReport.version.m8SourcePath,m8DemoPath);
    assert.equal(rawReport.version.m8SourceBlob,m8DemoBlob);
    stageDir=rawReport.temporaryBuild;
    const staged=fs.readFileSync(path.join(stageDir,'reproduction-kit/run-offline-demo.mjs'));
    assert.deepEqual(staged,m8Demo.stdout,'the actual staged candidate must contain the exact M8 Git blob');
    const zipMember='agent-canary-community-3/reproduction-kit/run-offline-demo.mjs';
    const zipped=spawnSync(pythonCommand,['-c',"import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))",summary.file,zipMember],{windowsHide:true,maxBuffer:2*1024*1024});
    assert.equal(zipped.status,0,(zipped.stderr??'').toString());
    assert.deepEqual(zipped.stdout,m8Demo.stdout,'the published candidate ZIP must preserve the exact M8 Git blob');
  }finally{
    fs.rmSync(outputDir,{recursive:true,force:true});
    if(stageDir&&fs.existsSync(stageDir))fs.rmSync(path.dirname(stageDir),{recursive:true,force:true});
    fs.rmSync(temp,{recursive:true,force:true});
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

test('silent receipt failure chooses a safe default then still rolls back and aborts',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/installer.nsi.in'),'utf8');
  const branch=source.match(/\$\{If\} \$0 != 0([\s\S]*?)\$\{EndIf\}/)?.[1];
  assert.ok(branch,'record-install failure branch must remain explicit');
  assert.match(branch,/MessageBox MB_ICONSTOP "Integrity receipt failed[^"]*" \/SD IDOK/);
  assert.match(branch,/Call RollbackInstall\s+Abort/);
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
  assert.match(rendered,/!define MUI_ABORTWARNING\s+!define MUI_CUSTOMFUNCTION_ABORT AgentCanaryAbortCleanup[\s\S]*?!insertmacro MUI_LANGUAGE/);
  assert.match(rendered,/Function AgentCanaryAbortCleanup\s+Call RollbackInstall\s+FunctionEnd/);
  assert.doesNotMatch(rendered,/Function \.onUserAbort\b/);
  assert.match(rendered,/Function RollbackInstall[\s\S]*?GetFileAttributesW[\s\S]*?rollback_incomplete/);
  assert.match(rendered,/GetFileAttributesW\(w "\$SMPROGRAMS\\Agent Canary Community candidate\.4"\)/);
  assert.match(rendered,/Delete "\$INSTDIR\\app\\dist\\competition\.js"/);
  assert.match(rendered,/RMDir "\$INSTDIR\\app\\dist"/);
  assert.match(rendered,/IfErrors install_failed/);
  assert.doesNotMatch(rendered,/__[A-Z_]+__/);
  assert.doesNotMatch(rendered,/RMDir\s+\/r/i);
});

test('rollback and uninstall leave the install tree before non-recursive directory cleanup',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/installer.nsi.in'),'utf8');
  const rendered=renderInstallerScript({
    source,
    output:path.join(os.tmpdir(),'Agent Canary Setup.exe'),
    payload:path.join(os.tmpdir(),'Agent Canary payload'),
    license:path.join(os.tmpdir(),'Agent Canary payload','app','LICENSE'),
    anchor:'b'.repeat(64),candidateNumber:'5',
    ownedFiles:['AgentCanary.exe','app/runtime/node.exe'],directories:['app','app/runtime']
  });
  const rollback=rendered.slice(rendered.indexOf('Function RollbackInstall'),rendered.indexOf('FunctionEnd',rendered.indexOf('Function RollbackInstall')));
  const uninstall=rendered.slice(rendered.indexOf('Section "Uninstall"'));
  assert.match(rollback,/SetOutPath "\$TEMP"[\s\S]*?Delete "\$INSTDIR\\Uninstall\.exe"\s+RMDir "\$INSTDIR\\app\\runtime"[\s\S]*?RMDir "\$INSTDIR"/);
  assert.match(uninstall,/ClearErrors\s+SetOutPath "\$TEMP"[\s\S]*?Delete "\$INSTDIR\\app\\runtime\\node\.exe"\s+RMDir "\$INSTDIR\\app\\runtime"[\s\S]*?IfErrors uninstall_incomplete[\s\S]*?Delete "\$INSTDIR\\Uninstall\.exe"[\s\S]*?DeleteRegKey HKCU[\s\S]*?RMDir "\$INSTDIR"/);
  assert.match(rollback,/IfErrors rollback_incomplete rollback_done/);
  assert.match(uninstall,/Uninstall was incomplete[\s\S]*?Resolve the access or retained-file issue and retry/);
  assert.match(uninstall,/Never recursively delete installation directory/);
  assert.doesNotMatch(rendered,/RMDir\s+\/r/i);
});

test('installer renderer rejects traversal in every cleanup manifest path',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/installer.nsi.in'),'utf8');
  const base={
    source,output:path.join(os.tmpdir(),'setup.exe'),payload:path.join(os.tmpdir(),'payload'),
    license:path.join(os.tmpdir(),'payload','LICENSE'),anchor:'c'.repeat(64),candidateNumber:'6'
  };
  for(const ownedFiles of [['../outside'],['C:/outside'],['nested\\outside']]){
    assert.throws(()=>renderInstallerScript({...base,ownedFiles,directories:[]}),/INSTALLER_PAYLOAD_PATH_INVALID/);
  }
  for(const directories of [['..'],['nested//child'],['/outside']]){
    assert.throws(()=>renderInstallerScript({...base,ownedFiles:[],directories}),/INSTALLER_PAYLOAD_PATH_INVALID/);
  }
});

test('Windows build requires a caller-pinned Community ZIP instead of a stale implicit artifact',()=>{
  const source=fs.readFileSync(path.join(repo,'packaging/windows/prepare.mjs'),'utf8');
  assert.match(source,/!communityPath/);
  assert.match(source,/COMMUNITY_ZIP SHA256/);
  assert.match(source,/COMMUNITY_CHECKSUM_MISMATCH/);
  assert.doesNotMatch(source,/competition-candidate\.2/);
});

test('prepare output and build instructions pass the pinned ZIP and required source commit SHA',()=>{
  const prepare=fs.readFileSync(path.join(repo,'packaging/windows/prepare.mjs'),'utf8');
  const build=fs.readFileSync(path.join(repo,'packaging/windows/build.mjs'),'utf8');
  const readme=fs.readFileSync(path.join(repo,'packaging/windows/README.md'),'utf8');
  assert.match(build,/parseWindowsBuildArgs\(process\.argv\.slice\(2\)\)/);
  assert.match(prepare,/createWindowsBuildInvocation\(/);
  assert.match(prepare,/next:invocation\.command/);
  assert.match(prepare,/wrapperSourceSHA:invocation\.wrapperSourceSHA/);
  assert.match(readme,/prepare\.mjs` 输出的 `next` 命令调用 `build\.mjs`/);
});

test('Windows build contract accepts only a pinned Windows invocation',()=>{
  const args=['payload','nsis','community.zip','a'.repeat(40)];
  assert.deepEqual(parseWindowsBuildArgs(args,{platform:'win32'}),args);
  assert.throws(()=>parseWindowsBuildArgs(args,{platform:'linux'}),/Usage: node build\.mjs/);
  assert.throws(()=>parseWindowsBuildArgs([...args.slice(0,3),'A'.repeat(40)],{platform:'win32'}),/Usage: node build\.mjs/);
  assert.throws(()=>parseWindowsBuildArgs(args.slice(0,3),{platform:'win32'}),/Usage: node build\.mjs/);
});

test('prepare emits a build command pinned to the exact committed wrapper source and ZIP',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-build-contract-'));
  try{
    const communityZip=path.join(temp,'community.zip');
    fs.writeFileSync(communityZip,'synthetic community package');
    const invocation=createWindowsBuildInvocation({
      repoRoot:repo,
      buildScript:path.join(repo,'packaging/windows/build.mjs'),
      payloadDir:path.join(temp,'payload'),
      nsisDir:'PATH_TO_VERIFIED_PORTABLE_NSIS_3_13',
      communityZip
    });
    assert.equal(invocation.wrapperSourceSHA,resolveWrapperSourceSHA(repo));
    assert.equal(invocation.wrapperSourcePath,'packaging/windows/claude-native-hook.mjs');
    assert.equal(invocation.buildArgs[3],invocation.wrapperSourceSHA);
    assert.equal(invocation.communityZIP_SHA256,createHash('sha256').update('synthetic community package').digest('hex'));
    assert.ok(invocation.command.includes(invocation.wrapperSourceSHA));
    const source=fs.readFileSync(path.join(repo,'packaging/windows/prepare.mjs'),'utf8');
    assert.match(source,/createWindowsBuildInvocation/);
    assert.match(source,/wrapperSourceSHA:invocation\.wrapperSourceSHA/);
    const build=fs.readFileSync(path.join(repo,'packaging/windows/build.mjs'),'utf8');
    assert.match(build,/writePackagedWrapperSource\(repoRoot,path\.join\(root,'claude-native-hook\.mjs'\),wrapperSHA\)/);
    const wrapper=readCommittedWrapperSource(repo);
    assert.equal(wrapper.sha,invocation.wrapperSourceSHA);
    assert.equal(wrapper.blobSha,M1_CANONICAL_WRAPPER_BLOB_SHA);
    assert.equal(wrapper.sha256,M1_CANONICAL_WRAPPER_SHA256);
    assert.equal(wrapper.bytes.includes(Buffer.from('\r\n')),false);
    const packagedPath=path.join(temp,'payload','claude-native-hook.mjs');
    fs.mkdirSync(path.dirname(packagedPath),{recursive:true});
    const packaged=writePackagedWrapperSource(repo,packagedPath,invocation.wrapperSourceSHA);
    assert.deepEqual(fs.readFileSync(packagedPath),wrapper.bytes);
    assert.deepEqual(packaged.bytes,wrapper.bytes);
    assert.equal(packaged.sha256,M1_CANONICAL_WRAPPER_SHA256);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Windows artifact evidence binds the exact Hook SHA through build report, manifest, and Setup extraction',()=>{
  const wrapper=readCommittedWrapperSource(repo);
  assert.equal(wrapper.blobSha,M1_CANONICAL_WRAPPER_BLOB_SHA);
  assert.equal(wrapper.sha256,M1_CANONICAL_WRAPPER_SHA256);
  const m9HookPath='security-lab/claude-native-hook.mjs';
  const m9HookBlob=spawnSync('git',['-C',repo,'rev-parse',`HEAD:${m9HookPath}`],{encoding:'utf8',windowsHide:true});
  assert.equal(m9HookBlob.status,0,(m9HookBlob.stdout??'')+'\n'+(m9HookBlob.stderr??''));
  assert.equal(m9HookBlob.stdout.trim(),wrapper.blobSha,'M9 exact-source parity reads this M7 Hook path; it must match the installer payload source');
  const m9HookBytes=spawnSync('git',['-C',repo,'cat-file','blob',`HEAD:${m9HookPath}`],{windowsHide:true});
  assert.equal(m9HookBytes.status,0,(m9HookBytes.stderr??'').toString());
  assert.deepEqual(m9HookBytes.stdout,wrapper.bytes,'M9 checked Hook Git blob must be byte-identical to the committed installer Hook');
  const packageHookPath='packaging/windows/claude-native-hook.mjs';
  const packageHookEol=spawnSync('git',['-C',repo,'check-attr','eol','--',packageHookPath],{encoding:'utf8',windowsHide:true});
  assert.equal(packageHookEol.status,0,(packageHookEol.stdout??'')+'\n'+(packageHookEol.stderr??''));
  assert.equal(packageHookEol.stdout.trim(),`${packageHookPath}: eol: lf`);
  const windowsCheckoutHook=spawnSync('git',['-C',repo,'-c','core.autocrlf=true','cat-file','--filters',`--path=${packageHookPath}`,`HEAD:${packageHookPath}`],{windowsHide:true});
  assert.equal(windowsCheckoutHook.status,0,(windowsCheckoutHook.stderr??'').toString());
  assert.equal(windowsCheckoutHook.stdout.includes(Buffer.from('\r\n')),false,'Windows checkout filters must preserve the canonical LF Hook bytes');
  assert.equal(createHash('sha256').update(windowsCheckoutHook.stdout).digest('hex'),wrapper.sha256);
  const windowsCheckoutBlob=spawnSync('git',['-C',repo,'hash-object','--stdin'],{input:windowsCheckoutHook.stdout,encoding:'utf8',windowsHide:true});
  assert.equal(windowsCheckoutBlob.status,0,(windowsCheckoutBlob.stdout??'')+'\n'+(windowsCheckoutBlob.stderr??''));
  assert.equal(windowsCheckoutBlob.stdout.trim(),wrapper.blobSha);
  const build=fs.readFileSync(path.join(repo,'packaging/windows/build.mjs'),'utf8');
  assert.match(build,/wrapperSourceContentSHA256:packagedHookSource\.sha256/);
  const workflow=fs.readFileSync(path.join(repo,'.github/workflows/windows-community.yml'),'utf8').replace(/\r\n/g,'\n');
  assert.ok(workflow.includes("if ($buildResult.version.wrapperSourceContentSHA256 -ne $packagedHookSha256) { throw 'BUILD_REPORT_HOOK_SHA256_MISMATCH' }"));
  assert.ok(workflow.includes("if ($packagedHookSha256 -ne $extractedHookSha256 -or $extractedHookSha256 -ne $hookEntries[0].sha256) { throw 'SETUP_EXTRACTED_HOOK_HASH_MISMATCH' }"));
  assert.ok(workflow.includes("if ($installerSha256 -ne $buildResult.installerSHA256) { throw 'INSTALLER_SHA256_MISMATCH' }"));
  assert.ok(workflow.includes("if ($payloadManifestSha256 -ne $buildResult.manifestSHA256) { throw 'PAYLOAD_MANIFEST_SHA256_MISMATCH' }"));
});

test('wrapper source API accepts only the M7 and M8 canonical paths',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-wrapper-source-paths-'));
  const allowedPaths=['packaging/windows/claude-native-hook.mjs','security-lab/claude-native-hook.mjs'];
  const runGit=(...args)=>{
    const result=spawnSync('git',['-C',temp,...args],{encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,(result.stdout??'')+'\n'+(result.stderr??''));
    return result.stdout.trim();
  };
  try{
    for(const sourcePath of allowedPaths){
      const candidate=path.join(temp,sourcePath);
      fs.mkdirSync(path.dirname(candidate),{recursive:true});
      fs.copyFileSync(path.join(repo,allowedPaths[0]),candidate);
    }
    fs.writeFileSync(path.join(temp,'.gitattributes'),`${allowedPaths.map(sourcePath=>`${sourcePath} text eol=lf`).join('\n')}\n`);
    runGit('init','--quiet');
    runGit('config','core.autocrlf','true');
    runGit('config','user.name','Canary contract test');
    runGit('config','user.email','canary-contract-test@example.invalid');
    runGit('add','--','.gitattributes',...allowedPaths);
    runGit('commit','--quiet','-m','test canonical wrapper source paths');
    const head=runGit('rev-parse','HEAD');
    const communityZip=path.join(temp,'community.zip');
    fs.writeFileSync(communityZip,'synthetic community package');
    for(const sourcePath of allowedPaths){
      const invocation=createWindowsBuildInvocation({
        repoRoot:temp,
        buildScript:path.join(repo,'packaging/windows/build.mjs'),
        payloadDir:path.join(temp,'payload'),
        nsisDir:'PATH_TO_VERIFIED_PORTABLE_NSIS_3_13',
        communityZip,
        sourcePath
      });
      assert.equal(invocation.wrapperSourceSHA,head);
      assert.equal(invocation.wrapperSourcePath,sourcePath);
      assert.equal(resolveWrapperSourceSHA(temp,{sourcePath:invocation.wrapperSourcePath}),head);
      const committed=readCommittedWrapperSource(temp,{sourcePath:invocation.wrapperSourcePath});
      assert.equal(committed.blobSha,M1_CANONICAL_WRAPPER_BLOB_SHA);
      assert.equal(committed.sha256,M1_CANONICAL_WRAPPER_SHA256);
      const destination=path.join(temp,'packaged',sourcePath.split('/').at(-1));
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      const packaged=writePackagedWrapperSource(temp,destination,invocation.wrapperSourceSHA,{sourcePath:invocation.wrapperSourcePath});
      assert.deepEqual(fs.readFileSync(destination),committed.bytes,`${sourcePath} must package exact committed bytes`);
      assert.deepEqual(packaged.bytes,committed.bytes);
    }
    const unexpectedPath='../security-lab/claude-native-hook.mjs';
    assert.throws(()=>resolveWrapperSourceSHA(temp,{sourcePath:unexpectedPath}),/WRAPPER_SOURCE_PATH_NOT_ALLOWED/);
    assert.throws(()=>readCommittedWrapperSource(temp,{sourcePath:unexpectedPath}),/WRAPPER_SOURCE_PATH_NOT_ALLOWED/);
    assert.throws(()=>writePackagedWrapperSource(temp,path.join(temp,'rejected.mjs'),head,{sourcePath:unexpectedPath}),/WRAPPER_SOURCE_PATH_NOT_ALLOWED/);
    assert.throws(()=>createWindowsBuildInvocation({
      repoRoot:temp,
      buildScript:path.join(repo,'packaging/windows/build.mjs'),
      payloadDir:path.join(temp,'payload'),
      nsisDir:'PATH_TO_VERIFIED_PORTABLE_NSIS_3_13',
      communityZip,
      sourcePath:unexpectedPath
    }),/WRAPPER_SOURCE_PATH_NOT_ALLOWED/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('wrapper provenance refuses a Hook file changed after its source commit',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-wrapper-provenance-'));
  const wrapper=path.join(temp,'packaging','windows','claude-native-hook.mjs');
  const runGit=(...args)=>{
    const result=spawnSync('git',['-C',temp,...args],{encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,(result.stdout??'')+'\n'+(result.stderr??''));
    return result.stdout.trim();
  };
  try{
    fs.mkdirSync(path.dirname(wrapper),{recursive:true});
    fs.copyFileSync(path.join(repo,'packaging/windows/claude-native-hook.mjs'),wrapper);
    fs.writeFileSync(path.join(temp,'.gitattributes'),'packaging/windows/claude-native-hook.mjs text eol=lf\n');
    runGit('init','--quiet');
    runGit('config','core.autocrlf','true');
    runGit('config','user.name','Canary contract test');
    runGit('config','user.email','canary-contract-test@example.invalid');
    runGit('add','--','.gitattributes','packaging/windows/claude-native-hook.mjs');
    runGit('commit','--quiet','-m','test wrapper provenance');
    assert.equal(runGit('rev-parse','HEAD:packaging/windows/claude-native-hook.mjs'),M1_CANONICAL_WRAPPER_BLOB_SHA);
    assert.equal(resolveWrapperSourceSHA(temp),runGit('rev-parse','HEAD'));
    fs.writeFileSync(wrapper,fs.readFileSync(wrapper).toString('utf8').replace(/\r?\n/g,'\r\n'));
    const committed=readCommittedWrapperSource(temp),packaged=path.join(temp,'packaged','claude-native-hook.mjs');
    fs.mkdirSync(path.dirname(packaged),{recursive:true});
    assert.equal(committed.blobSha,M1_CANONICAL_WRAPPER_BLOB_SHA);
    assert.notDeepEqual(fs.readFileSync(wrapper),committed.bytes,'the synthetic Windows worktree uses CRLF while the tracked blob uses LF');
    assert.deepEqual(writePackagedWrapperSource(temp,packaged,committed.sha).bytes,committed.bytes);
    assert.deepEqual(fs.readFileSync(packaged),committed.bytes,'packaged bytes must exactly match the Git blob');
    fs.appendFileSync(wrapper,'// changed after commit\n');
    assert.throws(()=>resolveWrapperSourceSHA(temp),/WRAPPER_SOURCE_PROVENANCE_MISMATCH/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Windows payload E4 checks the co-located privacy-safe hook wrapper',async()=>{
  const payload=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-packaged-hook-'));
  try{
    const build=fs.readFileSync(path.join(repo,'packaging/windows/build.mjs'),'utf8');
    assert.ok(build.includes("'e4-hook-faults.mjs'"),'Windows build must include the E4 hook-fault harness');
    assert.match(build,/writePackagedWrapperSource\(repoRoot,path\.join\(root,'claude-native-hook\.mjs'\),wrapperSHA\)/,'Windows build must package exact committed wrapper bytes next to the harness');
    const packagedHook=path.join(payload,'claude-native-hook.mjs');
    const packagedE4=path.join(payload,'e4-hook-faults.mjs');
    const wrapperSource=readCommittedWrapperSource(repo);
    assert.equal(wrapperSource.blobSha,M1_CANONICAL_WRAPPER_BLOB_SHA);
    writePackagedWrapperSource(repo,packagedHook,wrapperSource.sha);
    assert.deepEqual(fs.readFileSync(packagedHook),wrapperSource.bytes,'packaged hook bytes must be the exact LF Git blob');
    fs.copyFileSync(path.join(repo,'packaging/windows/e4-hook-faults.mjs'),packagedE4);
    const {runHookFaultChecks}=await import(`${pathToFileURL(packagedE4).href}?packaged=${Date.now()}`);
    const result=runHookFaultChecks({appRoot:path.join(payload,'app','dist'),fixturesRoot:payload});
    assert.equal(result.status,'PASS');
    assert.equal(result.positiveControl.logContractSatisfied,true);
    assert.equal(result.positiveControl.logAudit.status,'PASS');
    assert.equal(result.positiveControl.logAudit.records,1);
    assert.equal(result.logAudit.status,'PASS');
    assert.equal(result.logAudit.records,1);
    assert.equal(result.logAudit.callerInputCanaryAbsent,true);
    assert.ok(result.faultCases.every(fault=>fault.logAudit.status==='PASS'));
    assert.equal(result.positiveControl.decision,'allow');
    assert.equal(result.sideEffects.protectedVictimUnchanged,true);
    const log=fs.readFileSync(path.join(result.root,'positive-control.jsonl'),'utf8').trim().split(/\r?\n/);
    assert.equal(log.length,1,'packaged hook must emit one positive-control decision record');
    const record=JSON.parse(log[0]);
    assert.deepEqual(Object.keys(record).sort(),['hookEventName','permissionDecision','timestamp']);
    assert.equal(record.hookEventName,'PreToolUse');
    assert.ok(['allow','deny','ask'].includes(record.permissionDecision));
    assert.equal(record.permissionDecision,'allow');
    assert.equal(new Date(record.timestamp).toISOString(),record.timestamp,'timestamp must use canonical ISO format');
    for(const marker of ['SYNTHETIC_E4_HOOK_ARGUMENT_MARKER','SYNTHETIC_E4_HOOK_REASON_MARKER','C:/synthetic/caller/private.txt','write victim']){
      assert.equal(log[0].includes(marker),false,`packaged decision log leaked ${marker}`);
    }
  }finally{fs.rmSync(payload,{recursive:true,force:true});}
});

test('M1 canonical installer Hook redacts caller sentinels from stdout, stderr, and JSONL without changing decisions',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-hook-reason-redaction-'));
  try{
    const hook=path.join(root,'claude-native-hook.mjs');
    const hookSource=readCommittedWrapperSource(repo);
    assert.equal(hookSource.blobSha,M1_CANONICAL_WRAPPER_BLOB_SHA);
    writePackagedWrapperSource(repo,hook,hookSource.sha);
    const state=path.join(root,'state');fs.mkdirSync(state);
    const callerInputSentinel='M7_SYNTHETIC_CALLER_INPUT_SENTINEL';
    const callerReasonSentinel='M7_SYNTHETIC_CALLER_REASON_SENTINEL';
    const inputSentinels=[callerInputSentinel,'C:/synthetic/caller/private.txt'];
    const input={session_id:callerInputSentinel,tool_name:'Read',tool_input:{file_path:inputSentinels[1],note:callerInputSentinel}};
    const fallbacks={allow:'Agent Canary: permission_allowed',deny:'Agent Canary: permission_denied',ask:'Agent Canary: approval_required'};
    const invoke=(name,moduleSource)=>{
      const modulePath=path.join(root,`${name}.mjs`),logPath=path.join(root,`${name}.jsonl`);
      fs.writeFileSync(modulePath,moduleSource,{flag:'wx'});
      const result=spawnSync(process.execPath,[hook,modulePath,root,state,logPath],{input:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:128*1024});
      assert.equal(result.error?.code??null,null,`${name} process should finish within its bounded timeout`);
      assert.equal(result.status,0,`${name} process should return the established hook protocol status`);
      for(const marker of inputSentinels){
        assert.equal((result.stdout??'').includes(marker),false,`${name} stdout leaked a caller canary`);
        assert.equal((result.stderr??'').includes(marker),false,`${name} stderr leaked a caller canary`);
      }
      return{result,logPath};
    };
    for(const decision of ['allow','deny','ask']){
      const reason=`caller supplied ${callerReasonSentinel}`;
      const fixture=`export async function decideAgentHook(){return ${JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:decision,permissionDecisionReason:reason}})}}\n`;
      const {result,logPath}=invoke(`decision-${decision}`,fixture);
      const stdoutDecision=JSON.parse(result.stdout).hookSpecificOutput;
      assert.equal(stdoutDecision.permissionDecision,decision);
      assert.equal(stdoutDecision.permissionDecisionReason,fallbacks[decision]);
      assert.equal((result.stdout??'').includes(callerReasonSentinel),false,`${decision} stdout leaked a caller-controlled reason`);
      assert.equal((result.stderr??'').includes(callerReasonSentinel),false,`${decision} stderr leaked a caller-controlled reason`);
      const lines=fs.readFileSync(logPath,'utf8').trim().split(/\r?\n/);
      assert.equal(lines.length,1);
      const record=JSON.parse(lines[0]);
      assert.deepEqual(Object.keys(record).sort(),['hookEventName','permissionDecision','timestamp']);
      assert.equal(record.permissionDecision,decision);
      assert.equal(lines[0].includes(callerReasonSentinel),false,`${decision} JSONL leaked a caller-controlled reason`);
      for(const marker of inputSentinels){
        assert.equal(lines[0].includes(marker),false,`${decision} JSONL leaked a caller canary`);
        assert.equal((result.stdout??'').includes(marker),false,`${decision} stdout leaked a caller canary`);
      }
    }
    const safeReason='Agent Canary: unregistered_tool';
    const safeFixture=`export async function decideAgentHook(){return ${JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:safeReason}})}}\n`;
    const safeResult=invoke('safe-reason',safeFixture).result;
    assert.equal(JSON.parse(safeResult.stdout).hookSpecificOutput.permissionDecision,'deny');
    assert.equal(JSON.parse(safeResult.stdout).hookSpecificOutput.permissionDecisionReason,safeReason,'reviewed safe reason must remain stable');

    const errorSentinel='M7_SYNTHETIC_THROW_REASON_SENTINEL';
    const failed=invoke('throwing-hook',`export async function decideAgentHook(){throw new Error(${JSON.stringify(errorSentinel)})}\n`);
    const failedDecision=JSON.parse(failed.result.stdout).hookSpecificOutput;
    assert.equal(failedDecision.permissionDecision,'deny');
    assert.equal(failedDecision.permissionDecisionReason,'LAB_HOOK_ERROR_FAIL_CLOSED');
    assert.equal(fs.existsSync(failed.logPath),false,'a rejected hook must not persist a partial record');
    for(const marker of [...inputSentinels,errorSentinel]){
      assert.equal((failed.result.stdout??'').includes(marker),false,'fail-closed stdout leaked a caller canary');
      assert.equal((failed.result.stderr??'').includes(marker),false,'fail-closed stderr leaked a caller canary');
    }

    const timeoutMarker='M7_SYNTHETIC_TIMEOUT_REASON_SENTINEL';
    const timeoutModule=`const privateFixture=${JSON.stringify(timeoutMarker)}; export async function decideAgentHook(){void privateFixture;return await new Promise(()=>{})}\n`;
    const timedOut=invoke('timeout-hook',timeoutModule);
    const timeoutDecision=JSON.parse(timedOut.result.stdout).hookSpecificOutput;
    assert.equal(timeoutDecision.permissionDecision,'deny');
    assert.equal(timeoutDecision.permissionDecisionReason,'LAB_HOOK_ERROR_FAIL_CLOSED');
    assert.equal(fs.existsSync(timedOut.logPath),false,'a timed-out hook must not persist a partial record');
    for(const marker of [...inputSentinels,timeoutMarker]){
      assert.equal((timedOut.result.stdout??'').includes(marker),false,'timeout stdout leaked a caller canary');
      assert.equal((timedOut.result.stderr??'').includes(marker),false,'timeout stderr leaked a caller canary');
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
