import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createZip} from './zip.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const setup = 'AgentCanary-Community-Setup.exe';
const required = [setup, 'BUILD_REPORT.json', 'BUILD_RESULT.json', 'COMMUNITY_BUILD_REPORT.json',
  'VERSION.json', 'SOURCE_MANIFEST.json', 'PAYLOAD_MANIFEST.json', 'CANARY_RESULT.json',
  'extracted-hook/claude-native-hook.mjs', 'extracted-hook/e4-hook-faults.mjs', 'installer-lifecycle-smoke.ps1'];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const safe = name => typeof name === 'string' && name.length > 0 && !/[\\:\0]/.test(name) &&
  !name.startsWith('/') && name.split('/').every(part => part && part !== '.' && part !== '..');
const check = (condition, code) => { if (!condition) throw Error(code); };
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const gitSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

export function assertOutputOutsideInput(inputDir, outputDir, errorCode) {
  const input = fs.realpathSync(inputDir);
  let ancestor = path.resolve(outputDir);
  const suffix = [];
  // The output need not exist. Resolve its nearest existing ancestor so a
  // junction in either path cannot disguise a write back into the input.
  for (;;) {
    try {
      const output = path.resolve(fs.realpathSync(ancestor), ...suffix);
      const relative = path.relative(input, output);
      check(relative.startsWith('..' + path.sep) || path.isAbsolute(relative), errorCode);
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      suffix.unshift(path.basename(ancestor));
      ancestor = parent;
    }
  }
}

function read(root, name) {
  check(safe(name), 'PRODUCT_UNSAFE_PATH');
  let file = root;
  for (const part of name.split('/')) {
    file = path.join(file, part);
    check(!fs.lstatSync(file).isSymbolicLink(), 'PRODUCT_SYMLINK_REJECTED');
  }
  const stat = fs.lstatSync(file);
  check(stat.isFile() && stat.size > 0 && stat.size <= (name === setup ? 512 * 1024 * 1024 : 4 * 1024 * 1024), 'PRODUCT_FILE_SIZE_OR_TYPE');
  return fs.readFileSync(file);
}

// Data intake only. No imported module or executable comes from the artifact.
export function inspectProductArtifact({artifactDir, expectedHead, expectedInstallerSha256, expectedHookBlob, producerRunId, producerArtifactId}) {
  check(gitSha(expectedHead) && sha(expectedInstallerSha256) && gitSha(expectedHookBlob), 'PRODUCT_EXPECTATION_INVALID');
  check(/^\d+$/.test(producerRunId ?? '') && /^\d+$/.test(producerArtifactId ?? ''), 'PRODUCT_PRODUCER_ID_INVALID');
  const root = path.resolve(artifactDir);
  check(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), 'PRODUCT_DIRECTORY_INVALID');
  const manifest = read(root, 'SHA256SUMS.txt');
  const checksums = new Map();
  for (const line of manifest.toString('utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    check(match && safe(match[2]) && !checksums.has(match[2]), 'PRODUCT_CHECKSUM_MANIFEST_INVALID');
    checksums.set(match[2], match[1]);
  }
  check(checksums.size === required.length && required.every(name => checksums.has(name)), 'PRODUCT_CHECKSUM_INVENTORY_INVALID');
  const actual = [];
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const name = prefix + entry.name;
      check(safe(name) && !entry.isSymbolicLink(), 'PRODUCT_SYMLINK_OR_PATH_REJECTED');
      if (entry.isDirectory()) walk(path.join(dir, entry.name), name + '/');
      else { check(entry.isFile(), 'PRODUCT_SPECIAL_FILE_REJECTED'); actual.push(name); }
    }
  }
  walk(root);
  check(actual.length === required.length + 1 && actual.every(name => name === 'SHA256SUMS.txt' || checksums.has(name)), 'PRODUCT_UNLISTED_FILE');
  const bytes = new Map([['SHA256SUMS.txt', manifest]]);
  for (const name of required) {
    const data = read(root, name);
    check(digest(data) === checksums.get(name), `PRODUCT_HASH_MISMATCH:${name}`);
    bytes.set(name, data);
  }
  const json = name => JSON.parse(bytes.get(name).toString('utf8'));
  const build = json('BUILD_REPORT.json'), result = json('BUILD_RESULT.json');
  const community = json('COMMUNITY_BUILD_REPORT.json'), version = json('VERSION.json'), canary = json('CANARY_RESULT.json');
  check([build.sourceSHA, community.sourceSHA, community.m8PRHeadSHA, version.wrapperSourceSHA,
    version.communityRepairSHA, result.version?.wrapperSourceSHA, canary.sourceSHA].every(value => value === expectedHead), 'PRODUCT_EXPECTED_HEAD_MISMATCH');
  check(build.workflowRunId === producerRunId && canary.workflowRunId === producerRunId, 'PRODUCT_RUN_BINDING_MISMATCH');
  const installerHash = digest(bytes.get(setup)), installerSize = bytes.get(setup).length;
  check(installerHash === expectedInstallerSha256 && [build.installerSHA256, result.installerSHA256, canary.installerSHA256].every(value => value === installerHash), 'PRODUCT_INSTALLER_BINDING_MISMATCH');
  check(build.installerBytes === installerSize && result.installerBytes === installerSize, 'PRODUCT_INSTALLER_SIZE_MISMATCH');
  check(build.installerExecuted === false, 'PRODUCT_UNEXPECTED_EXECUTION_CLAIM');
  check([build.payloadManifestSHA256, build.extractedPayloadManifestSHA256, result.manifestSHA256].every(value => value === digest(bytes.get('PAYLOAD_MANIFEST.json'))), 'PRODUCT_PAYLOAD_MANIFEST_BINDING_MISMATCH');
  check(community.sourceManifestSHA256 === digest(bytes.get('SOURCE_MANIFEST.json')), 'PRODUCT_SOURCE_MANIFEST_BINDING_MISMATCH');
  check(sha(community.sourceZipSHA256) && [build.communityZipSHA256, version.communityZIP_SHA256].every(value => value === community.sourceZipSHA256), 'PRODUCT_SOURCE_ZIP_BINDING_MISMATCH');
  const hook = bytes.get('extracted-hook/claude-native-hook.mjs');
  const hookBlob = createHash('sha1').update(Buffer.from(`blob ${hook.length}\0`)).update(hook).digest('hex');
  check(hookBlob === expectedHookBlob && [build.canonicalHookBlobSHA, build.hook?.sourceBlobSHA, build.hook?.setupExtractedBlobSHA,
    version.wrapperSourceBlobSHA, canary.extractedHookSourceBlobSHA].every(value => value === hookBlob), 'PRODUCT_HOOK_BLOB_MISMATCH');
  check([build.hook?.sha256, build.hook?.sourceSHA256, version.wrapperSourceContentSHA256, canary.extractedHookSHA256].every(value => value === digest(hook)), 'PRODUCT_HOOK_HASH_MISMATCH');
  check(build.hook?.setupExtractedHarnessSHA256 === digest(bytes.get('extracted-hook/e4-hook-faults.mjs')), 'PRODUCT_HARNESS_HASH_MISMATCH');
  const payload = json('PAYLOAD_MANIFEST.json'), sources = json('SOURCE_MANIFEST.json');
  check(Array.isArray(payload.files) && payload.files.length > 0 && payload.files.length < 20000, 'PRODUCT_PAYLOAD_SCHEMA_INVALID');
  const entries = new Map();
  for (const entry of payload.files) {
    check(safe(entry.path) && !entries.has(entry.path) && sha(entry.sha256) && Number.isSafeInteger(entry.size) && entry.size >= 0, 'PRODUCT_PAYLOAD_SCHEMA_INVALID');
    entries.set(entry.path, entry);
  }
  check(sources && typeof sources === 'object' && !Array.isArray(sources) && Object.keys(sources).length > 0, 'PRODUCT_SOURCE_SCHEMA_INVALID');
  for (const [name, hash] of Object.entries(sources)) check(safe(name) && sha(hash) && entries.get('app/' + name)?.sha256 === hash, 'PRODUCT_SOURCE_PAYLOAD_MISMATCH');
  check(entries.get('claude-native-hook.mjs')?.sha256 === digest(hook), 'PRODUCT_HOOK_PAYLOAD_MISMATCH');
  const inventory = [...bytes].map(([name, data]) => ({name, size: data.length, sha256: digest(data)})).sort((a,b) => a.name.localeCompare(b.name));
  return {bytes, inventory, provenance: {expectedHead, producerRunId, producerArtifactId,
    producerIdentityStatus: 'COORDINATOR_SUPPLIED_IDS_REPORT_CLAIMS_NOT_AUTHENTICATED',
    expectedInstallerHashSource: 'PINNED_FROM_LOCAL_BUILD_METADATA_NOT_INDEPENDENT_ATTESTATION',
    productVersion: version.communityVersion, installer: {fileName: setup, size: installerSize, sha256: installerHash},
    hookBlob, hookSha256: digest(hook), sourceZipSha256Claim: community.sourceZipSHA256,
    payloadEntries: entries.size, sourceEntries: Object.keys(sources).length,
    producerCanaryClaim: canary.status, producerCanaryScope: canary.scope,
    payloadBytesReverified: false, installerExecutedBySelfCheck: false}};
}

function gitValue(...args) {
  try { return execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8', windowsHide: true, stdio: ['ignore','pipe','ignore']}).trim(); }
  catch { return null; }
}

export function createProductSelfCheck(options) {
  const input = inspectProductArtifact(options);
  const output = path.resolve(options.outputDir);
  check(!fs.existsSync(output), 'PRODUCT_OUTPUT_ALREADY_EXISTS');
  assertOutputOutsideInput(options.artifactDir, output, 'PRODUCT_OUTPUT_INSIDE_INPUT');
  fs.mkdirSync(output, {recursive: true});
  const startedAt = new Date().toISOString();
  const after = inspectProductArtifact(options);
  check(JSON.stringify(input.inventory) === JSON.stringify(after.inventory), 'PRODUCT_CHANGED_DURING_SELF_CHECK');
  const cases = ['GW-ALLOW-CONTROL','GW-CANARY-BLOCK','CANARY-SESSION-ISOLATION','GW-FAULT-EXECUTOR','GW-FAULT-CLOSED',
    'HOOK-FAULT-STATESTORE','SHELL-BOUNDARY-BYPASS','ARTIFACT-VM-BINDING','APP-01','MODEL-REAL-TOOLCALL'].map(id => ({
    id, status: 'NOT_VERIFIED', reason: 'PRODUCT_NOT_EXECUTED_DEVELOPER_SELF_CHECK_ONLY',
    details: id === 'SHELL-BOUNDARY-BYPASS' ? {countsAsGatewayPass: false, countsAsGatewayFail: false} : {}
  }));
  const report = {schema: 'agent-canary.e4-automation-run.v1', verificationLevel: 'SELF_CHECK', operatorRole: 'author',
    classification: 'AUTHOR_AUTOMATION_RUN_NOT_E4', e4Status: 'NOT_VERIFIED', overall: 'BLOCKED_EXTERNAL_OPERATOR_AND_PRODUCT_LIFECYCLE_REQUIRED',
    productE4Accepted: false, startedAt, completedAt: new Date().toISOString(),
    source: {commit: options.expectedHead, tree: null, treeStatus: 'NOT_SUPPLIED_BY_PRODUCT_ARTIFACT'},
    verifier: {commit: gitValue('rev-parse','HEAD'), tree: gitValue('rev-parse','HEAD^{tree}'), dirty: gitValue('status','--porcelain') !== '',
      sourceHashes: Object.fromEntries(['product-self-check.mjs','verify-bundle.mjs','zip.mjs'].map(name => [name,digest(fs.readFileSync(path.join(here,name)))]))},
    artifact: {...input.provenance.installer, executedByRunner: false, status: 'HASH_ONLY_NOT_EXECUTED'},
    provenance: input.provenance, selfCheck: {status: 'SELF_CHECK', checksumsMatch: true, expectedHeadMatches: true,
      inputUnchanged: true, before: input.inventory, after: after.inventory}, cases,
    remainingGate: 'Independent operator must execute the exact installer in a clean disposable Windows environment, retain lifecycle/model/tool side-effect evidence, run positive and four external-copy mismatch controls, and obtain a distinct reviewer signed receipt and out-of-band identity/key review.'};
  const markdown = `# Developer SELF_CHECK — Issue #57\n\nE4: NOT_VERIFIED\nProduct acceptance: BLOCKED\n\nProducer commit: ${options.expectedHead}\nWorkflow run: ${options.producerRunId}\nArtifact ID (coordinator supplied): ${options.producerArtifactId}\nInstaller SHA-256: ${report.artifact.sha256}\nInstaller bytes: ${report.artifact.size}\n\nOnly listed bytes, hashes, expected source head, and report cross-bindings were inspected. Producer reports are untrusted claims; full payload bytes and source tree are unavailable. No artifact code was executed. All ten product E4 cases remain NOT_VERIFIED.\n\n${report.remainingGate}\n`;
  const raw = JSON.stringify({event:'product-artifact-intake',verificationLevel:'SELF_CHECK',...input.provenance}) + '\n' +
    JSON.stringify({event:'input-state-check',verificationLevel:'SELF_CHECK',before:input.inventory,after:after.inventory,unchanged:true}) + '\n';
  const payload = [['report.json',Buffer.from(JSON.stringify(report,null,2)+'\n')],['report.md',Buffer.from(markdown)],['raw.log',Buffer.from(raw)],
    ...[...input.bytes].filter(([name]) => name.endsWith('.json') || name === 'SHA256SUMS.txt').map(([name,data]) => ['evidence/product/'+name,data])];
  const manifest = Buffer.from(payload.map(([name,data]) => `${digest(data)}  ${name}`).join('\n')+'\n');
  const entries = [...payload,['SHA256SUMS.txt',manifest]];
  for (const [name,data] of entries) { const file=path.join(output,name); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,data,{flag:'wx'}); }
  createZip(entries.map(([name,data]) => ({name,data})),path.join(output,'evidence.zip'));
  const archive = fs.readFileSync(path.join(output,'evidence.zip'));
  fs.writeFileSync(path.join(output,'bundle.sha256'),`${digest(archive)}  evidence.zip\n`,{flag:'wx'});
  fs.writeFileSync(path.join(output,'bundle.json'),JSON.stringify({schema:'agent-canary.e4-bundle.v1',archive:'evidence.zip',sha256:digest(archive),size:archive.length,
    entries:entries.length,manifest:{entries:payload.length,valid:true},verification:'LOCAL_ZIP_CRC_AND_SHA256_MANIFEST_VERIFIED',e4Status:'NOT_VERIFIED',classification:report.classification,verificationLevel:'SELF_CHECK'},null,2)+'\n',{flag:'wx'});
  return {verificationLevel:'SELF_CHECK',productE4Accepted:false,e4Status:'NOT_VERIFIED',outputDir:output,archiveSha256:digest(archive),artifact:report.artifact};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const names = {'artifact-dir':'artifactDir','expected-head':'expectedHead','expected-installer-sha256':'expectedInstallerSha256',
      'expected-hook-blob':'expectedHookBlob','producer-run-id':'producerRunId','producer-artifact-id':'producerArtifactId','output-dir':'outputDir'};
    const options = {};
    for (let i=2;i<process.argv.length;i+=2) {
      const key=names[process.argv[i]?.slice(2)], value=process.argv[i+1];
      check(process.argv[i]?.startsWith('--') && key && value && !value.startsWith('--') && options[key]===undefined,'PRODUCT_OPTION_INVALID');
      options[key]=value;
    }
    check(Object.keys(options).length===Object.keys(names).length,'PRODUCT_OPTIONS_REQUIRED');
    console.log(JSON.stringify(createProductSelfCheck(options),null,2));
  } catch(error) { console.error(JSON.stringify({verificationLevel:'SELF_CHECK',productE4Accepted:false,error:error.message})); process.exitCode=1; }
}
