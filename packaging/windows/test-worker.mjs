import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {redact,inspectPayload,readInstallerReceipt,finalizeAutoE4Artifacts} from './worker.mjs';
import {createAutoE4Run,writeAutoE4Artifacts} from './auto-e4.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fixtureRoots=new Set();
test.afterEach(()=>{for(const root of fixtureRoots){fs.rmSync(root,{recursive:true,force:true});fixtureRoots.delete(root);}});
function fixture(file='data.txt'){const root=fs.mkdtempSync(path.join(os.tmpdir(),'ac-desktop-test-'));fixtureRoots.add(root);fs.writeFileSync(path.join(root,'data.txt'),'fixture');const m={schemaVersion:1,files:[{path:file,size:7,sha256:sha('fixture')}]};const raw=JSON.stringify(m);fs.writeFileSync(path.join(root,'PAYLOAD_MANIFEST.json'),raw);return {root,anchor:sha(raw)};}
function workerModuleClosure(entry,seen=new Set()){const sourcePath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),entry);if(seen.has(sourcePath))return seen;seen.add(sourcePath);const source=fs.readFileSync(sourcePath,'utf8');for(const[,specifier]of source.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+\.mjs)['"]/g)){const dependency=path.resolve(path.dirname(sourcePath),specifier);if(dependency.startsWith(path.dirname(fileURLToPath(import.meta.url))+path.sep))workerModuleClosure(path.relative(path.dirname(fileURLToPath(import.meta.url)),dependency),seen);}return seen;}
test('Windows payload build copies every local worker module dependency',()=>{const build=fs.readFileSync(new URL('./build.mjs',import.meta.url),'utf8');const copyList=build.match(/for\s*\(const\s+f\s+of\s+\[([^\]]+)\]\)/s)?.[1];assert.ok(copyList,'build.mjs must declare the packaged worker source list');const copied=new Set([...copyList.matchAll(/['"]([^'"]+)['"]/g)].map(match=>match[1]));const windowsDir=path.dirname(fileURLToPath(import.meta.url));const required=[...workerModuleClosure('worker.mjs')].map(file=>path.relative(windowsDir,file));assert.deepEqual(required.filter(file=>!copied.has(file)),[]);});
function recordInstallFixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'ac-desktop-record-install-'));fixtureRoots.add(root);const names=['worker.mjs','auto-e4.mjs','e4-hook-faults.mjs','durable-files.mjs'];for(const name of names)fs.copyFileSync(new URL('./'+name,import.meta.url),path.join(root,name));fs.writeFileSync(path.join(root,'data.txt'),'synthetic payload');fs.writeFileSync(path.join(root,'VERSION.json'),JSON.stringify({desktopVersion:'3.0.0-test'}));fs.writeFileSync(path.join(root,'setup.exe'),'synthetic setup bytes');const files=[...names,'data.txt','VERSION.json'].map(name=>{const bytes=fs.readFileSync(path.join(root,name));return{path:name,size:bytes.length,sha256:sha(bytes)};});const raw=JSON.stringify({schemaVersion:1,files});fs.writeFileSync(path.join(root,'PAYLOAD_MANIFEST.json'),raw);return{root,anchor:sha(raw),worker:path.join(root,'worker.mjs'),setup:path.join(root,'setup.exe'),dataDir:path.join(root,'app-data')};}
function runRecordInstall(fixture,{marker,alternateMarkerPath}={}){const env={...process.env};delete env.AGENT_CANARY_M7_PHASE_MARKER;delete env.AGENT_CANARY_M7_PHASE_MARKER_PATH;if(marker!==undefined)env.AGENT_CANARY_M7_PHASE_MARKER=marker;if(alternateMarkerPath)env.AGENT_CANARY_M7_PHASE_MARKER_PATH=alternateMarkerPath;return spawnSync(process.execPath,[fixture.worker,'record-install',fixture.dataDir,'unspecified',fixture.anchor,fixture.setup],{encoding:'utf8',windowsHide:true,timeout:10000,env});}
test('valid payload hashes actual bytes',()=>{const{root,anchor}=fixture();assert.equal(inspectPayload(root,anchor).files.length,1);});
test('tampered payload rejected',()=>{const{root,anchor}=fixture();fs.writeFileSync(path.join(root,'data.txt'),'changed');assert.throws(()=>inspectPayload(root,anchor),/MISMATCH/);});
test('manifest tampering rejected against compiled anchor',()=>{const{root,anchor}=fixture();fs.appendFileSync(path.join(root,'PAYLOAD_MANIFEST.json'),' ');assert.throws(()=>inspectPayload(root,anchor),/DIGEST_MISMATCH/);});
test('missing anchor rejected',()=>{const{root}=fixture();assert.throws(()=>inspectPayload(root,''),/ANCHOR/);});
for(const p of ['../outside','C:/secret','/root','a\\b','a//b','./data.txt','a/../b'])test('unsafe manifest path rejected '+p,()=>{const{root,anchor}=fixture(p);assert.throws(()=>inspectPayload(root,anchor),/PATH_REJECTED/);});
test('secret keys recursively redacted without altering SHA',()=>{const h=sha('fixture');assert.deepEqual(redact({token:'synthetic',nested:[{apiKey:'fake',sha256:h}]}),{token:'[REDACTED]',nested:[{apiKey:'[REDACTED]',sha256:h}]});});
test('Windows username and absolute paths redacted',()=>{const v=redact('C:\\Users\\ExampleUser\\report.txt');assert(!v.includes('ExampleUser'));assert(!v.includes('C:'));});
test('cloud-looking keys and bearer credentials redacted',()=>{const v=redact('sk-fakeabcdefghijklmnop Bearer not.a.real.token password=synthetic');assert(!v.includes('fakeabcdefghijklmnop'));assert(!v.includes('not.a.real.token'));assert(!v.includes('synthetic'));});
test('known roots replaced before generic path redaction',()=>{assert.equal(redact('C:/Temp/demo.txt',[['C:/Temp','<TEMP>']]),'<TEMP>/demo.txt');});
test('symbolic link payload is rejected',{skip:process.platform==='win32'?'Windows symlink privilege not assumed; junction exercised separately':false},()=>{const{root,anchor}=fixture();fs.renameSync(path.join(root,'data.txt'),path.join(root,'other.txt'));fs.symlinkSync('other.txt',path.join(root,'data.txt'));assert.throws(()=>inspectPayload(root,anchor),/SYMLINK/);});

test('receipt objects cannot masquerade as installer SHA evidence',()=>{const {root}=fixture();fs.writeFileSync(path.join(root,'INSTALL_RECEIPT.json'),JSON.stringify({installerSHA256:{secret:'synthetic'}}));assert.equal(readInstallerReceipt(root).status,'NOT_VERIFIED_INVALID_OR_UNREADABLE_RECEIPT');});
test('oversized receipt is bounded and never trusted',()=>{const {root}=fixture();fs.writeFileSync(path.join(root,'INSTALL_RECEIPT.json'),' '.repeat(5000));assert.equal(readInstallerReceipt(root).installerSHA256,null);});
test('missing receipt is explicitly unverified',()=>{const {root}=fixture();assert.equal(readInstallerReceipt(root).status,'NOT_VERIFIED_PORTABLE_OR_MISSING_RECEIPT');});
test('record-install keeps normal behavior when M7 phase telemetry is disabled',()=>{const f=recordInstallFixture();const r=runRecordInstall(f);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).status,'VERIFIED');assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'INSTALL_RECEIPT.json'),'utf8')).installerSHA256,sha('synthetic setup bytes'));assert.equal(fs.existsSync(path.join(f.root,'.m7-installer-lifecycle-phase')),false);});
test('record-install emits only the final fixed marker when the exact M7 toggle is enabled',()=>{const f=recordInstallFixture(),alternate=path.join(f.root,'caller-selected-marker.txt');fs.writeFileSync(path.join(f.root,'.m7-installer-lifecycle-phase'),'RECORD_INSTALL_STARTED\n');const r=runRecordInstall(f,{marker:'1',alternateMarkerPath:alternate});assert.equal(r.status,0,r.stderr);assert.equal(fs.readFileSync(path.join(f.root,'.m7-installer-lifecycle-phase'),'utf8'),'RECEIPT_ATOMIC_WRITE_COMPLETE\n');assert.equal(fs.existsSync(alternate),false);assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'INSTALL_RECEIPT.json'),'utf8')).installerSHA256,sha('synthetic setup bytes'));});
test('record-install does not enable M7 phase telemetry for non-exact toggle values',()=>{const f=recordInstallFixture();const r=runRecordInstall(f,{marker:'true'});assert.equal(r.status,0,r.stderr);assert.equal(fs.existsSync(path.join(f.root,'.m7-installer-lifecycle-phase')),false);});

test('Auto E4 bundle failure persists a blocked final report without weakening run finalization',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'ac-e4-bundle-failure-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir:data});
  try{
    await run.stage('materials',async()=>({status:'PASS',detail:{summary:'fixture report created'}}));
    const report=run.finish();
    const {artifacts,bundle}=finalizeAutoE4Artifacts(run,()=>{throw Error('EVIDENCE_BUNDLE_CREATE_FAILED');});
    assert.equal(bundle,null);
    assert.equal(report.technicalResult,'BLOCKED');
    assert.equal(report.stages.find(stage=>stage.id==='materials').status,'BLOCKED');
    assert.equal(report.coverage.blocked,1);
    const persisted=JSON.parse(fs.readFileSync(artifacts.jsonFile,'utf8'));
    assert.equal(persisted.technicalResult,'BLOCKED');
    assert.equal(persisted.stages.find(stage=>stage.id==='materials').status,'BLOCKED');
    assert.equal(path.dirname(artifacts.jsonFile),path.join(run.runDir,'evidence'));
    assert.equal(fs.existsSync(path.join(run.runDir,'AUTO_E4_REPORT.json')),false);
    const eventFile=path.join(path.dirname(artifacts.jsonFile),'events.jsonl');
    const events=fs.readFileSync(eventFile,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
    assert.equal(events.at(-1).status,'BLOCKED');
    const index=JSON.parse(fs.readFileSync(artifacts.indexFile,'utf8'));
    assert.equal(index.artifacts.find(item=>item.name==='events.jsonl').sha256,sha(fs.readFileSync(eventFile)));
    assert.throws(()=>run.record({type:'progress',stageId:'materials',status:'LATE'}),/AUTO_E4_RUN_FINISHED/);
    assert.throws(()=>writeAutoE4Artifacts(report,path.dirname(artifacts.jsonFile)),/AUTO_E4_ARTIFACT_ALREADY_EXISTS/);
  }finally{run.release();}
});

test('Auto E4 bundle failure sanitizes local paths in every persisted artifact',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'ac-e4-bundle-redaction-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir:data,sanitize:value=>redact(value)});
  const marker='E4_BUNDLE_FAILURE_LOCAL_PATH_MARKER';
  const localPath=`C:\\Users\\fixture\\${marker}\\sidecar.json`;
  const reason=`EACCES: permission denied, open '${localPath}'`;
  try{
    await run.stage('materials',async()=>({status:'PASS',detail:{summary:'fixture report created'}}));
    run.finish();
    const {artifacts,bundle}=finalizeAutoE4Artifacts(run,()=>{throw Error(reason);});
    assert.equal(bundle,null);

    const json=fs.readFileSync(artifacts.jsonFile,'utf8');
    const markdown=fs.readFileSync(artifacts.mdFile,'utf8');
    const eventText=fs.readFileSync(path.join(path.dirname(artifacts.jsonFile),'events.jsonl'),'utf8');
    for(const persisted of [json,markdown,eventText]){
      assert(!persisted.includes(localPath));
      assert(!persisted.includes(marker));
    }

    const report=JSON.parse(json);
    const stage=report.stages.find(item=>item.id==='materials');
    assert.equal(stage.status,'BLOCKED');
    assert.match(stage.detail.reason,/EACCES: permission denied/);
    assert(stage.detail.reason.includes('[ABSOLUTE_PATH_REDACTED]'));
    const events=eventText.trim().split(/\r?\n/).map(line=>JSON.parse(line));
    assert.equal(events.at(-1).detail.reason,stage.detail.reason);
    assert.match(events.at(-1).detail.reason,/EACCES: permission denied/);
    const index=JSON.parse(fs.readFileSync(artifacts.indexFile,'utf8'));
    for(const file of [artifacts.jsonFile,artifacts.mdFile,path.join(path.dirname(artifacts.jsonFile),'events.jsonl')]){
      const bytes=fs.readFileSync(file);
      const entry=index.artifacts.find(item=>item.name===path.basename(file));
      assert.equal(entry.bytes,bytes.length);
      assert.equal(entry.sha256,sha(bytes));
    }
  }finally{run.release();}
});
