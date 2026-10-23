import fs from 'node:fs';
import path from 'node:path';
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readZip } from './zip.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const cli = process.argv.slice(2);
let supplied = null;
let independentReceiptPath = null;
let reviewerPublicKeyPath = null;
for (let index = 0; index < cli.length; index += 1) {
  const argument = cli[index];
  if (argument === '--independent-receipt' || argument === '--reviewer-public-key') {
    const value = cli[index + 1];
    if (!value || value.startsWith('--')) throw new Error('E4_VERIFY_OPTION_VALUE_MISSING');
    if (argument === '--independent-receipt') {
      if (independentReceiptPath) throw new Error('E4_VERIFY_OPTION_DUPLICATE');
      independentReceiptPath = path.resolve(value);
    } else {
      if (reviewerPublicKeyPath) throw new Error('E4_VERIFY_OPTION_DUPLICATE');
      reviewerPublicKeyPath = path.resolve(value);
    }
    index += 1;
    continue;
  }
  if (argument.startsWith('--')) throw new Error('E4_VERIFY_OPTION_UNKNOWN');
  if (supplied) throw new Error('E4_VERIFY_RUN_DIRECTORY_DUPLICATE');
  supplied = path.resolve(argument);
}
const runsRoot = path.join(repoRoot, 'security-lab', 'e4-runs');
const runNames = fs.existsSync(runsRoot) ? fs.readdirSync(runsRoot, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort() : [];
const runDir = supplied ?? (runNames.length ? path.join(runsRoot, runNames.at(-1)) : null);
let runDirStat;
try { runDirStat = runDir ? fs.lstatSync(runDir) : null; }
catch { throw new Error('E4_RUN_DIRECTORY_NOT_FOUND'); }
if (runDirStat?.isSymbolicLink()) throw new Error('E4_RUN_DIRECTORY_SYMLINK');
if (!runDirStat?.isDirectory()) throw new Error('E4_RUN_DIRECTORY_NOT_FOUND');

const sha256 = data => createHash('sha256').update(data).digest('hex');

function readExternalInput(filePath, errorCode) {
  if (!filePath) return null;
  let stat;
  try { stat = fs.lstatSync(filePath); }
  catch { throw new Error(errorCode); }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 256 * 1024) throw new Error(errorCode);
  try { return fs.readFileSync(filePath); }
  catch { throw new Error(errorCode); }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function requireObjectKeys(value, keys, errorCode) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(errorCode);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(errorCode);
}

function requireSha256(value, errorCode) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error(errorCode);
}

function verifyIndependentReceipt(report, archiveHash) {
  const base = {
    status: 'NOT_VERIFIED',
    receiptStatus: independentReceiptPath ? 'NOT_VERIFIED' : 'MISSING',
    signatureStatus: 'NOT_VERIFIED',
    operatorRole: 'NOT_VERIFIED',
    reviewerRole: 'NOT_VERIFIED',
    roleSeparation: 'NOT_VERIFIED',
    cleanEnvironment: 'NOT_VERIFIED',
    checkClaims: null,
    reasons: []
  };

  if (!independentReceiptPath) {
    base.reasons.push('INDEPENDENT_REVIEW_RECEIPT_MISSING', 'CLEAN_ENVIRONMENT_RECEIPT_MISSING');
    if (reviewerPublicKeyPath) base.reasons.push('RECEIPT_SIGNATURE_NOT_CHECKED');
    else base.reasons.push('REVIEWER_PUBLIC_KEY_NOT_SUPPLIED');
    base.reasons.push('REVIEWER_IDENTITY_AND_INDEPENDENCE_REQUIRE_OUT_OF_BAND_REVIEW');
    return base;
  }

  let receipt;
  try { receipt = JSON.parse(readExternalInput(independentReceiptPath, 'E4_INDEPENDENT_RECEIPT_INVALID').toString('utf8')); }
  catch (error) {
    if (error.message.startsWith('E4_')) throw error;
    throw new Error('E4_INDEPENDENT_RECEIPT_INVALID');
  }
  const invalid = () => { throw new Error('E4_INDEPENDENT_RECEIPT_INVALID'); };
  requireObjectKeys(receipt, ['schema', 'run', 'operator', 'reviewer', 'environment', 'checks', 'signature'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  if (receipt.schema !== 'agent-canary.e4-independent-review-receipt.v1') invalid();
  requireObjectKeys(receipt.run, ['archiveSha256', 'sourceCommit', 'sourceTree', 'artifactSha256'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireObjectKeys(receipt.operator, ['id', 'role'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireObjectKeys(receipt.reviewer, ['id', 'role', 'relationshipCheck'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireObjectKeys(receipt.environment, ['provider', 'windowsBuild', 'imageSha256', 'snapshotId', 'checkoutCommit', 'checkoutTree', 'cleanCheckout', 'cleanEnvironment'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireObjectKeys(receipt.checks, ['productExecution', 'verifierPositive', 'externalCopyMismatches', 'archiveUnchanged'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireObjectKeys(receipt.checks.externalCopyMismatches, ['SHA256SUMS.txt', 'report.json', 'report.md', 'raw.log'], 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireObjectKeys(receipt.signature, ['algorithm', 'keyId', 'value'], 'E4_INDEPENDENT_RECEIPT_INVALID');

  if (
    typeof report.source?.commit !== 'string' || !/^[a-f0-9]{40}$/.test(report.source.commit) ||
    typeof report.source?.tree !== 'string' || !/^[a-f0-9]{40}$/.test(report.source.tree) ||
    typeof report.artifact?.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(report.artifact.sha256)
  ) throw new Error('E4_RECEIPT_PRODUCT_PROVENANCE_MISSING');
  requireSha256(receipt.run.archiveSha256, 'E4_INDEPENDENT_RECEIPT_INVALID');
  requireSha256(receipt.run.artifactSha256, 'E4_INDEPENDENT_RECEIPT_INVALID');
  if (
    receipt.run.archiveSha256 !== archiveHash ||
    receipt.run.sourceCommit !== report.source.commit || receipt.run.sourceTree !== report.source.tree ||
    receipt.run.artifactSha256 !== report.artifact.sha256
  ) throw new Error('E4_INDEPENDENT_RECEIPT_BINDING_MISMATCH');

  if (
    typeof receipt.operator.id !== 'string' || !receipt.operator.id.trim() ||
    receipt.operator.role !== 'independent-operator' ||
    typeof receipt.reviewer.id !== 'string' || !receipt.reviewer.id.trim() ||
    receipt.reviewer.role !== 'independent-reviewer' ||
    receipt.operator.id === receipt.reviewer.id ||
    receipt.reviewer.relationshipCheck !== 'not-artifact-author-or-operator'
  ) throw new Error('E4_INDEPENDENT_RECEIPT_ROLE_SEPARATION_INVALID');

  if (
    typeof receipt.environment.provider !== 'string' || !receipt.environment.provider.trim() ||
    typeof receipt.environment.windowsBuild !== 'string' || !receipt.environment.windowsBuild.trim() ||
    typeof receipt.environment.snapshotId !== 'string' || !receipt.environment.snapshotId.trim() ||
    receipt.environment.cleanCheckout !== true || receipt.environment.cleanEnvironment !== true ||
    receipt.environment.checkoutCommit !== report.source.commit || receipt.environment.checkoutTree !== report.source.tree
  ) throw new Error('E4_INDEPENDENT_RECEIPT_ENVIRONMENT_INVALID');
  requireSha256(receipt.environment.imageSha256, 'E4_INDEPENDENT_RECEIPT_ENVIRONMENT_INVALID');

  const checkStatuses = [
    receipt.checks.productExecution,
    receipt.checks.verifierPositive,
    ...Object.values(receipt.checks.externalCopyMismatches),
    receipt.checks.archiveUnchanged
  ];
  if (checkStatuses.some(status => !['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN'].includes(status))) invalid();
  if (!['Ed25519'].includes(receipt.signature.algorithm)) throw new Error('E4_INDEPENDENT_RECEIPT_SIGNATURE_INVALID');
  requireSha256(receipt.signature.keyId, 'E4_INDEPENDENT_RECEIPT_SIGNATURE_INVALID');
  if (typeof receipt.signature.value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(receipt.signature.value)) {
    throw new Error('E4_INDEPENDENT_RECEIPT_SIGNATURE_INVALID');
  }

  base.receiptStatus = 'STRUCTURE_VALID_AND_BOUND_TO_BUNDLE';
  base.operatorRole = 'CLAIMED_INDEPENDENT_OPERATOR';
  base.reviewerRole = 'CLAIMED_INDEPENDENT_REVIEWER';
  base.roleSeparation = 'CLAIMED_DISTINCT_IDENTITIES';
  base.cleanEnvironment = 'CLAIMED_CLEAN_WINDOWS_ENVIRONMENT';
  base.checkClaims = receipt.checks;
  base.reasons.push('REVIEWER_IDENTITY_AND_INDEPENDENCE_REQUIRE_OUT_OF_BAND_REVIEW');

  if (!reviewerPublicKeyPath) {
    base.reasons.push('REVIEWER_PUBLIC_KEY_NOT_SUPPLIED');
    return base;
  }

  let publicKey;
  try { publicKey = createPublicKey(readExternalInput(reviewerPublicKeyPath, 'E4_REVIEWER_PUBLIC_KEY_INVALID')); }
  catch (error) {
    if (error.message.startsWith('E4_')) throw error;
    throw new Error('E4_REVIEWER_PUBLIC_KEY_INVALID');
  }
  if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('E4_REVIEWER_PUBLIC_KEY_INVALID');
  const actualKeyId = sha256(publicKey.export({ type: 'spki', format: 'der' }));
  if (actualKeyId !== receipt.signature.keyId) throw new Error('E4_INDEPENDENT_RECEIPT_KEY_ID_MISMATCH');
  const unsignedReceipt = { ...receipt };
  delete unsignedReceipt.signature;
  let signature;
  try { signature = Buffer.from(receipt.signature.value, 'base64'); }
  catch { throw new Error('E4_INDEPENDENT_RECEIPT_SIGNATURE_INVALID'); }
  if (signature.length !== 64 || !verifySignature(null, Buffer.from(canonicalJson(unsignedReceipt)), publicKey, signature)) {
    throw new Error('E4_INDEPENDENT_RECEIPT_SIGNATURE_INVALID');
  }
  base.signatureStatus = 'VALID_AGAINST_SUPPLIED_KEY';
  base.reasons.push('SUPPLIED_KEY_IDENTITY_IS_NOT_AN_EXTERNAL_TRUST_ANCHOR');
  return base;
}

function readRunFile(name, { required = true, externalCopy = false } = {}) {
  const segments = name.split('/');
  let current = runDir;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (!required && error.code === 'ENOENT') return null;
      const code = externalCopy
        ? (required ? 'E4_EXTERNAL_COPY_MISSING' : 'E4_EXTERNAL_COPY_MISMATCH')
        : 'E4_BUNDLE_FILE_MISSING';
      throw new Error(`${code}:${name}`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`${externalCopy ? 'E4_EXTERNAL_COPY_SYMLINK' : 'E4_BUNDLE_PATH_SYMLINK'}:${name}`);
    }
    if (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`${externalCopy ? 'E4_EXTERNAL_COPY_MISMATCH' : 'E4_BUNDLE_PATH_INVALID'}:${name}`);
    }
  }
  try { return fs.readFileSync(current); }
  catch {
    throw new Error(`${required ? 'E4_EXTERNAL_COPY_MISSING' : 'E4_EXTERNAL_COPY_MISMATCH'}:${name}`);
  }
}

const archive = readRunFile('evidence.zip');
const archiveHash = sha256(archive);
const shaLine = readRunFile('bundle.sha256').toString('utf8').trim();
if (shaLine !== `${archiveHash}  evidence.zip`) throw new Error('E4_OUTER_ZIP_SHA256_MISMATCH');
const metadata = JSON.parse(readRunFile('bundle.json').toString('utf8'));
if (metadata.sha256 !== archiveHash || metadata.e4Status !== 'NOT_VERIFIED') throw new Error('E4_BUNDLE_METADATA_MISMATCH_OR_PROMOTED');

// Parse the exact byte snapshot whose outer digest was checked above; reopening
// the path here would permit a concurrent replacement between hashing and parsing.
const files = readZip(archive);
for (const name of files.keys()) {
  const segments = name.split('/');
  if (
    !name || name.startsWith('/') || name.includes('\\') || name.includes('\0') || /^[a-zA-Z]:/.test(name) ||
    segments.some(segment => !segment || segment === '.' || segment === '..' || segment.includes(':'))
  ) throw new Error(`E4_UNSAFE_ARCHIVE_PATH:${name}`);
}
const manifestBytes = files.get('SHA256SUMS.txt');
if (!manifestBytes) throw new Error('E4_INNER_MANIFEST_MISSING');
const expected = new Map();
for (const line of manifestBytes.toString('utf8').split(/\r?\n/).filter(Boolean)) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!match || expected.has(match[2])) throw new Error('E4_INNER_MANIFEST_INVALID');
  expected.set(match[2], match[1]);
}
const payloadNames = [...files.keys()].filter(name => name !== 'SHA256SUMS.txt');
if (payloadNames.length !== expected.size) throw new Error('E4_INNER_FILE_COUNT_MISMATCH');
for (const name of payloadNames) if (sha256(files.get(name)) !== expected.get(name)) throw new Error(`E4_INNER_HASH_MISMATCH:${name}`);

const reportBytes = files.get('report.json');
const markdown = files.get('report.md');
const rawLog = files.get('raw.log');
if (!reportBytes || !markdown || !rawLog) throw new Error('E4_REPORT_COMPONENT_MISSING');
for (const name of ['SHA256SUMS.txt', 'report.json', 'report.md', 'raw.log']) {
  const archived = files.get(name);
  if (!archived) throw new Error(`E4_EXTERNAL_COPY_MISSING_FROM_ARCHIVE:${name}`);
  const external = readRunFile(name, { externalCopy: true });
  if (!external.equals(archived)) throw new Error(`E4_EXTERNAL_COPY_MISMATCH:${name}`);
}
const report = JSON.parse(reportBytes.toString('utf8'));
if (
  report.e4Status !== 'NOT_VERIFIED' ||
  report.overall.includes('PASS') ||
  !['AUTHOR_AUTOMATION_RUN_NOT_E4', 'EXTERNAL_CLAIM_NOT_INDEPENDENTLY_VERIFIED'].includes(report.classification)
) throw new Error('E4_AUTOMATION_MUST_NOT_PROMOTE_VERDICT');
if (
  metadata.schema !== 'agent-canary.e4-bundle.v1' ||
  metadata.archive !== 'evidence.zip' ||
  metadata.size !== archive.length ||
  metadata.entries !== files.size ||
  metadata.manifest?.valid !== true ||
  metadata.manifest?.entries !== expected.size ||
  metadata.verification !== 'LOCAL_ZIP_CRC_AND_SHA256_MANIFEST_VERIFIED' ||
  metadata.classification !== report.classification
) throw new Error('E4_BUNDLE_METADATA_MISMATCH_OR_PROMOTED');

// The ZIP is authoritative, but when generated evidence sidecars are present,
// reject a folder whose visible JSONL copy has drifted from the verified ZIP.
for (const name of payloadNames.filter(item => item.startsWith('evidence/'))) {
  const external = readRunFile(name, { required: false, externalCopy: true });
  if (external === null) continue;
  if (!external.equals(files.get(name))) throw new Error(`E4_EXTERNAL_COPY_MISMATCH:${name}`);
}
if (!Array.isArray(report.cases)) throw new Error('E4_MATRIX_CASES_INVALID');
const caseIds = new Set();
for (const row of report.cases) {
  if (!row || typeof row.id !== 'string' || !row.id.trim()) throw new Error('E4_MATRIX_CASES_INVALID');
  if (caseIds.has(row.id)) throw new Error(`E4_MATRIX_CASE_DUPLICATE:${row.id}`);
  caseIds.add(row.id);
}
const requiredCases = ['GW-ALLOW-CONTROL', 'GW-CANARY-BLOCK', 'CANARY-SESSION-ISOLATION', 'GW-FAULT-EXECUTOR', 'GW-FAULT-CLOSED', 'HOOK-FAULT-STATESTORE', 'SHELL-BOUNDARY-BYPASS', 'ARTIFACT-VM-BINDING', 'APP-01', 'MODEL-REAL-TOOLCALL'];
for (const id of requiredCases) if (!caseIds.has(id)) throw new Error(`E4_MATRIX_CASE_MISSING:${id}`);
const shell = report.cases.find(row => row.id === 'SHELL-BOUNDARY-BYPASS');
if (shell.status === 'PASS' || shell.details.countsAsGatewayPass !== false || shell.details.countsAsGatewayFail !== false) throw new Error('E4_SHELL_BOUNDARY_CLASSIFICATION_INVALID');
const modelCase = report.cases.find(row => row.id === 'MODEL-REAL-TOOLCALL');
if (modelCase.reason?.includes('MODEL_REFUSAL') && modelCase.status.startsWith('PASS')) throw new Error('E4_MODEL_REFUSAL_MUST_NOT_COUNT_AS_GATEWAY_DENIAL');
const independentReceipt = verifyIndependentReceipt(report, archiveHash);

process.stdout.write(JSON.stringify({
  bundleIntegrityVerified: true,
  evidenceScope: 'BUNDLE_INTEGRITY_ONLY',
  productE4Accepted: false,
  e4Status: report.e4Status,
  classification: report.classification,
  archiveSha256: archiveHash,
  entries: files.size,
  payloadFiles: payloadNames.length,
  provenance: {
    sourceCommit: report.source?.commit ?? null,
    sourceTree: report.source?.tree ?? null,
    reportedArtifactSha256: report.artifact?.sha256 ?? null,
    productArtifactBytesReverified: false
  },
  independentReceipt,
  sourceCommit: report.source.commit,
  shellStatus: shell.status,
  modelStatus: modelCase.status
}) + '\n');
