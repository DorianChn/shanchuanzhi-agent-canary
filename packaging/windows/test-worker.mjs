import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {redact,inspectPayload,readInstallerReceipt,finalizeAutoE4Artifacts} from './worker.mjs';
import {createAutoE4Run,writeAutoE4Artifacts} from './auto-e4.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function fixture(file='data.txt'){const root=fs.mkdtempSync(path.join(os.tmpdir(),'ac-desktop-test-'));fs.writeFileSync(path.join(root,'data.txt'),'fixture');const m={schemaVersion:1,files:[{path:file,size:7,sha256:sha('fixture')}]};const raw=JSON.stringify(m);fs.writeFileSync(path.join(root,'PAYLOAD_MANIFEST.json'),raw);return {root,anchor:sha(raw)};}
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
    const events=fs.readFileSync(path.join(run.runDir,'events.jsonl'),'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
    assert.equal(events.at(-1).status,'BLOCKED');
    const index=JSON.parse(fs.readFileSync(artifacts.indexFile,'utf8'));
    assert.equal(index.artifacts.find(item=>item.name==='events.jsonl').sha256,sha(fs.readFileSync(path.join(run.runDir,'events.jsonl'))));
    assert.throws(()=>run.record({type:'progress',stageId:'materials',status:'LATE'}),/AUTO_E4_RUN_FINISHED/);
    assert.throws(()=>writeAutoE4Artifacts(report,run.runDir),/AUTO_E4_ARTIFACT_ALREADY_EXISTS/);
  }finally{run.release();}
});
