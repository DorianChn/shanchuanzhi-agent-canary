import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectProductArtifact,createProductSelfCheck,digest} from './product-self-check.mjs';
import {verifyBundleControls} from './product-self-check-controls.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'m6-product-self-check-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const artifactDir=path.join(root,'artifact'); fs.mkdirSync(path.join(artifactDir,'extracted-hook'),{recursive:true});
  const head='1'.repeat(40), installer=Buffer.from('SYNTHETIC_NON_EXECUTABLE_SETUP'), hook=Buffer.from('throw Error("ARTIFACT_MUST_NEVER_EXECUTE");');
  const harness=Buffer.from('throw Error("HARNESS_MUST_NEVER_EXECUTE");');
  const hookBlob=createHash('sha1').update(Buffer.from(`blob ${hook.length}\0`)).update(hook).digest('hex');
  const source={'dist/sdk.js':digest(Buffer.from('synthetic'))};
  const payload={files:[{path:'app/dist/sdk.js',size:9,sha256:source['dist/sdk.js']},{path:'claude-native-hook.mjs',size:hook.length,sha256:digest(hook)}]};
  const json=value=>Buffer.from(JSON.stringify(value)+'\n');
  const sourceBytes=json(source), payloadBytes=json(payload);
  const version={wrapperSourceSHA:head,communityRepairSHA:head,wrapperSourceBlobSHA:hookBlob,wrapperSourceContentSHA256:digest(hook),communityZIP_SHA256:'2'.repeat(64),communityVersion:'SYNTHETIC'};
  const build={sourceSHA:head,workflowRunId:'123',installerSHA256:digest(installer),installerBytes:installer.length,installerExecuted:false,
    payloadManifestSHA256:digest(payloadBytes),extractedPayloadManifestSHA256:digest(payloadBytes),communityZipSHA256:version.communityZIP_SHA256,canonicalHookBlobSHA:hookBlob,
    hook:{sourceBlobSHA:hookBlob,setupExtractedBlobSHA:hookBlob,sha256:digest(hook),sourceSHA256:digest(hook),setupExtractedHarnessSHA256:digest(harness)}};
  const files=new Map([
    ['AgentCanary-Community-Setup.exe',installer],['BUILD_REPORT.json',json(build)],
    ['BUILD_RESULT.json',json({version,installerSHA256:digest(installer),installerBytes:installer.length,manifestSHA256:digest(payloadBytes)})],
    ['COMMUNITY_BUILD_REPORT.json',json({sourceSHA:head,m8PRHeadSHA:head,sourceManifestSHA256:digest(sourceBytes),sourceZipSHA256:version.communityZIP_SHA256})],
    ['VERSION.json',json(version)],['SOURCE_MANIFEST.json',sourceBytes],['PAYLOAD_MANIFEST.json',payloadBytes],
    ['CANARY_RESULT.json',json({sourceSHA:head,workflowRunId:'123',installerSHA256:digest(installer),extractedHookSourceBlobSHA:hookBlob,extractedHookSHA256:digest(hook),status:'PASS',scope:'SYNTHETIC'})],
    ['extracted-hook/claude-native-hook.mjs',hook],['extracted-hook/e4-hook-faults.mjs',harness],['installer-lifecycle-smoke.ps1',Buffer.from('throw "DO_NOT_RUN"')]
  ]);
  function save() {
    for(const [name,data] of files) fs.writeFileSync(path.join(artifactDir,name),data);
    fs.writeFileSync(path.join(artifactDir,'SHA256SUMS.txt'),[...files].map(([name,data])=>`${digest(data)}  ${name}`).join('\n')+'\n');
  }
  save();
  return {root,files,save,options:{artifactDir,expectedHead:head,expectedInstallerSha256:digest(installer),expectedHookBlob:hookBlob,producerRunId:'123',producerArtifactId:'456',outputDir:path.join(root,'bundle')}};
}

test('product SELF_CHECK produces a verifier-compatible bundle without executing artifact code',t=>{
  const {options}=fixture(t);
  const before=inspectProductArtifact(options).inventory;
  const result=createProductSelfCheck(options);
  assert.equal(result.e4Status,'NOT_VERIFIED'); assert.equal(result.productE4Accepted,false);
  assert.deepEqual(inspectProductArtifact(options).inventory,before);
  const report=JSON.parse(fs.readFileSync(path.join(options.outputDir,'report.json')));
  assert.equal(report.verificationLevel,'SELF_CHECK');
  assert.ok(report.cases.every(row=>row.status==='NOT_VERIFIED'));
  assert.equal(report.artifact.executedByRunner,false);
  const child=spawnSync(process.execPath,[path.join(here,'verify-bundle.mjs'),options.outputDir],{encoding:'utf8',timeout:15000});
  assert.equal(child.status,0,child.stderr);
  assert.equal(JSON.parse(child.stdout).bundleIntegrityVerified,true);
  assert.equal(JSON.parse(child.stdout).productE4Accepted,false);
  assert.throws(()=>createProductSelfCheck(options),/OUTPUT_ALREADY_EXISTS/);
});
test('product intake rejects expected-head mismatch before creating output',t=>{
  const {options}=fixture(t);
  assert.throws(()=>createProductSelfCheck({...options,expectedHead:'9'.repeat(40)}),/EXPECTED_HEAD_MISMATCH/);
  assert.equal(fs.existsSync(options.outputDir),false);
});
test('product intake rejects truncated installer bytes',t=>{
  const {options}=fixture(t);
  const file=path.join(options.artifactDir,'AgentCanary-Community-Setup.exe');
  fs.writeFileSync(file,fs.readFileSync(file).subarray(0,4));
  assert.throws(()=>createProductSelfCheck(options),/PRODUCT_HASH_MISMATCH/);
  assert.equal(fs.existsSync(options.outputDir),false);
});
test('self-consistent replacement cannot override pinned installer hash',t=>{
  const f=fixture(t); f.files.set('AgentCanary-Community-Setup.exe',Buffer.from('REPLACEMENT')); f.save();
  assert.throws(()=>createProductSelfCheck(f.options),/INSTALLER_BINDING_MISMATCH/);
});
test('product intake rejects report provenance drift even with refreshed checksums',t=>{
  const f=fixture(t), report=JSON.parse(f.files.get('BUILD_REPORT.json')); report.workflowRunId='999';
  f.files.set('BUILD_REPORT.json',Buffer.from(JSON.stringify(report))); f.save();
  assert.throws(()=>createProductSelfCheck(f.options),/RUN_BINDING_MISMATCH/);
});
test('product intake rejects checksum path traversal',t=>{
  const {options}=fixture(t);
  fs.appendFileSync(path.join(options.artifactDir,'SHA256SUMS.txt'),`${'0'.repeat(64)}  ../escape\n`);
  assert.throws(()=>createProductSelfCheck(options),/CHECKSUM_MANIFEST_INVALID/);
});
test('product intake rejects unlisted data',t=>{
  const {options}=fixture(t);
  fs.writeFileSync(path.join(options.artifactDir,'unlisted.txt'),'SYNTHETIC');
  assert.throws(()=>createProductSelfCheck(options),/PRODUCT_UNLISTED_FILE/);
});
test('product intake rejects a junction used as artifact root',t=>{
  const {root,options}=fixture(t), alias=path.join(root,'alias');
  fs.symlinkSync(options.artifactDir,alias,'junction');
  assert.throws(()=>createProductSelfCheck({...options,artifactDir:alias}),/PRODUCT_DIRECTORY_INVALID/);
});
test('product intake rejects canonical Hook blob mismatch',t=>{
  const {options}=fixture(t);
  assert.throws(()=>createProductSelfCheck({...options,expectedHookBlob:'0'.repeat(40)}),/PRODUCT_HOOK_BLOB_MISMATCH/);
});
test('product intake rejects writes inside input artifact directory',t=>{
  const {options}=fixture(t);
  assert.throws(()=>createProductSelfCheck({...options,outputDir:path.join(options.artifactDir,'output')}),/OUTPUT_INSIDE_INPUT/);
});
test('disposable verifier controls reject all four external mismatches and ZIP truncation',t=>{
  const {root,options}=fixture(t);
  createProductSelfCheck(options);
  const result=verifyBundleControls(options.outputDir,path.join(root,'controls'));
  assert.equal(result.controls.length,6);
  assert.ok(result.controls.every(row=>row.expectedBehaviorObserved));
  assert.equal(result.controls[0].exitCode,0);
  assert.ok(result.controls.slice(1).every(row=>row.exitCode!==0));
  assert.equal(result.sourceUnchanged,true);
  assert.equal(result.productE4Accepted,false);
});
test('failed positive control retains actual subprocess output before rejecting',t=>{
  const {root,options}=fixture(t);
  createProductSelfCheck(options);
  fs.appendFileSync(path.join(options.outputDir,'raw.log'),'SYNTHETIC_CORRUPTION');
  const controls=path.join(root,'failed-controls');
  assert.throws(()=>verifyBundleControls(options.outputDir,controls),/CONTROL_POSITIVE_FAILED/);
  const row=JSON.parse(fs.readFileSync(path.join(controls,'positive.json')));
  assert.equal(row.expectedBehaviorObserved,false);
  assert.notEqual(row.exitCode,0);
  assert.match(row.stderr,/E4_EXTERNAL_COPY_MISMATCH:raw.log/);
  assert.match(fs.readFileSync(path.join(controls,'raw.log'),'utf8'),/CONTROL_POSITIVE_FAILED/);
});
