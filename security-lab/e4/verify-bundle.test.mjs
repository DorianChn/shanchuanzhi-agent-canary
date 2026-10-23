import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, generateKeyPairSync, sign as signBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createZip } from './zip.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const verifier = path.join(scriptDir, 'verify-bundle.mjs');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const canonicalJson = value => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
    : JSON.stringify(value);

function createValidRun(runDir, {classification = 'AUTHOR_AUTOMATION_RUN_NOT_E4', extraPayload = [], reportOverrides = {}, evidenceData = '{"event":"synthetic-evidence"}\n', duplicateCaseId = null} = {}) {
  fs.mkdirSync(runDir, { recursive: true });
  const cases = [
    'GW-ALLOW-CONTROL', 'GW-CANARY-BLOCK', 'CANARY-SESSION-ISOLATION',
    'GW-FAULT-EXECUTOR', 'GW-FAULT-CLOSED', 'HOOK-FAULT-STATESTORE',
    'SHELL-BOUNDARY-BYPASS', 'ARTIFACT-VM-BINDING', 'APP-01', 'MODEL-REAL-TOOLCALL'
  ].map(id => id === 'SHELL-BOUNDARY-BYPASS'
    ? { id, status: 'OBSERVED_BYPASS', details: { countsAsGatewayPass: false, countsAsGatewayFail: false } }
    : id === 'MODEL-REAL-TOOLCALL'
      ? { id, status: 'BLOCKED', reason: 'REAL_MODEL_FLAG_NOT_SET' }
      : { id, status: 'PASS_FIXTURE', reason: 'SYNTHETIC_FIXTURE' });
  if (duplicateCaseId) {
    const duplicate = cases.find(row => row.id === duplicateCaseId);
    if (!duplicate) throw new Error(`unknown synthetic matrix case: ${duplicateCaseId}`);
    cases.push({ ...duplicate });
  }
  const report = {
    e4Status: 'NOT_VERIFIED',
    overall: 'AUTHOR_AUTOMATION_COMPLETE_E4_STILL_NOT_VERIFIED',
    classification,
    operatorRole: 'author',
    source: { commit: '1'.repeat(40) },
    cases,
    ...reportOverrides
  };
  const payload = [
    ['report.json', Buffer.from(`${JSON.stringify(report, null, 2)}\n`)],
    ['report.md', Buffer.from('# Synthetic verification fixture\n')],
    ['raw.log', Buffer.from('{"event":"synthetic"}\n')],
    ['evidence/synthetic.jsonl', Buffer.from(evidenceData)],
    ...extraPayload.map(([name, data]) => [name, Buffer.from(data)])
  ];
  const manifest = Buffer.from(`${payload.map(([name, data]) => `${sha256(data)}  ${name}`).join('\n')}\n`);
  const entries = [...payload, ['SHA256SUMS.txt', manifest]].map(([name, data]) => ({ name, data }));
  const archivePath = path.join(runDir, 'evidence.zip');
  createZip(entries, archivePath);
  for (const [name, data] of [...payload, ['SHA256SUMS.txt', manifest]]) {
    const file = path.join(runDir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  }
  const archiveHash = sha256(fs.readFileSync(archivePath));
  fs.writeFileSync(path.join(runDir, 'bundle.sha256'), `${archiveHash}  evidence.zip\n`);
  fs.writeFileSync(path.join(runDir, 'bundle.json'), JSON.stringify({
    schema: 'agent-canary.e4-bundle.v1',
    archive: 'evidence.zip',
    sha256: archiveHash,
    size: fs.statSync(archivePath).size,
    entries: entries.length,
    manifest: { entries: payload.length, valid: true },
    verification: 'LOCAL_ZIP_CRC_AND_SHA256_MANIFEST_VERIFIED',
    e4Status: 'NOT_VERIFIED',
    classification: report.classification
  }));
}

function runVerifier(runDir, {preload, env = process.env, independentReceipt, reviewerPublicKey} = {}) {
  const args = preload ? ['--import', pathToFileURL(preload).href, verifier, runDir] : [verifier, runDir];
  if (independentReceipt) args.push('--independent-receipt', independentReceipt);
  if (reviewerPublicKey) args.push('--reviewer-public-key', reviewerPublicKey);
  return spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, env });
}

function writeSignedIndependentReceipt(runDir, {operatorId = 'operator-1', reviewerId = 'reviewer-1', archiveSha256, artifactSha256, receiptMutation, signatureMutation} = {}) {
  const report = JSON.parse(fs.readFileSync(path.join(runDir, 'report.json'), 'utf8'));
  const archiveHash = archiveSha256 ?? sha256(fs.readFileSync(path.join(runDir, 'evidence.zip')));
  const artifactHash = artifactSha256 ?? report.artifact.sha256;
  const receipt = {
    schema: 'agent-canary.e4-independent-review-receipt.v1',
    run: {
      archiveSha256: archiveHash,
      sourceCommit: report.source.commit,
      sourceTree: report.source.tree,
      producerRunId: 'synthetic-actions-run-123',
      productVersion: 'synthetic-test-version',
      artifactFileName: report.artifact.fileName,
      artifactSize: report.artifact.size,
      artifactSha256: artifactHash,
      startedAt: '2026-10-23T04:00:00.000Z',
      completedAt: '2026-10-23T04:01:00.000Z',
      result: 'PASS'
    },
    operator: {id: operatorId, role: 'independent-operator', identitySource: 'https://example.invalid/operator'},
    reviewer: {id: reviewerId, role: 'independent-reviewer', relationshipCheck: 'not-artifact-author-or-operator', identitySource: 'https://example.invalid/reviewer'},
    environment: {
      provider: 'synthetic-test-provider',
      windowsBuild: 'synthetic-test-build',
      imageSha256: '4'.repeat(64),
      snapshotId: 'synthetic-clean-snapshot',
      checkoutCommit: report.source.commit,
      checkoutTree: report.source.tree,
      cleanCheckout: true,
      cleanEnvironment: true
    },
    checks: {
      productExecution: 'PASS',
      verifierPositive: 'PASS',
      externalCopyMismatches: {
        'SHA256SUMS.txt': 'PASS',
        'report.json': 'PASS',
        'report.md': 'PASS',
        'raw.log': 'PASS'
      },
      archiveUnchanged: 'PASS'
    }
  };
  receiptMutation?.(receipt);
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  const keyId = sha256(publicKey.export({type: 'spki', format: 'der'}));
  receipt.signature = {
    algorithm: 'Ed25519',
    keyId,
    keySource: 'https://example.invalid/reviewer-key',
    value: signBytes(null, Buffer.from(canonicalJson(receipt)), privateKey).toString('base64')
  };
  if (signatureMutation) signatureMutation(receipt);
  const receiptPath = path.join(runDir, 'independent-review-receipt.json');
  const reviewerPublicKeyPath = path.join(runDir, 'reviewer-public-key.pem');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  fs.writeFileSync(reviewerPublicKeyPath, publicKey.export({type: 'spki', format: 'pem'}));
  return {receiptPath, reviewerPublicKeyPath};
}

test('missing independent receipt and product provenance remain machine-readable NOT_VERIFIED', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir, {
    reportOverrides: {
      source: {},
      artifact: undefined,
      independentVerifier: undefined,
      evidenceRetention: undefined
    }
  });

  const result = runVerifier(runDir);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.bundleIntegrityVerified, true);
  assert.equal(summary.evidenceScope, 'BUNDLE_INTEGRITY_ONLY');
  assert.equal(summary.productE4Accepted, false);
  assert.equal(summary.e4Status, 'NOT_VERIFIED');
  assert.equal(summary.sourceCommit, undefined);
  assert.equal(Object.hasOwn(summary, 'valid'), false);
  assert.equal(summary.independentReceipt.status, 'NOT_VERIFIED');
  assert.equal(summary.independentReceipt.receiptStatus, 'MISSING');
  assert.ok(summary.independentReceipt.reasons.includes('INDEPENDENT_REVIEW_RECEIPT_MISSING'));
  assert.ok(summary.independentReceipt.reasons.includes('CLEAN_ENVIRONMENT_RECEIPT_MISSING'));
  assert.equal(summary.provenance.productArtifactBytesReverified, false);
});

test('a bundle with reported product hashes but no independent operator or clean-environment receipt stays NOT_VERIFIED', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });

  const result = runVerifier(runDir);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.provenance.reportedArtifactSha256, '3'.repeat(64));
  assert.equal(summary.independentReceipt.status, 'NOT_VERIFIED');
  assert.equal(summary.independentReceipt.receiptStatus, 'MISSING');
  assert.equal(summary.independentReceipt.operatorRole, 'NOT_VERIFIED');
  assert.equal(summary.independentReceipt.cleanEnvironment, 'NOT_VERIFIED');
  assert.ok(summary.independentReceipt.reasons.includes('INDEPENDENT_REVIEW_RECEIPT_MISSING'));
  assert.ok(summary.independentReceipt.reasons.includes('CLEAN_ENVIRONMENT_RECEIPT_MISSING'));
  assert.equal(summary.productE4Accepted, false);
  assert.equal(summary.e4Status, 'NOT_VERIFIED');
});

test('a signed, hash-bound independent receipt is reported without promoting E4 or identity', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir);

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.bundleIntegrityVerified, true);
  assert.equal(summary.independentReceipt.status, 'NOT_VERIFIED');
  assert.equal(summary.independentReceipt.receiptStatus, 'STRUCTURE_VALID_AND_BOUND_TO_BUNDLE');
  assert.equal(summary.independentReceipt.signatureStatus, 'VALID_AGAINST_SUPPLIED_KEY');
  assert.equal(summary.independentReceipt.operatorRole, 'CLAIMED_INDEPENDENT_OPERATOR');
  assert.equal(summary.independentReceipt.reviewerRole, 'CLAIMED_INDEPENDENT_REVIEWER');
  assert.equal(summary.independentReceipt.roleSeparation, 'CLAIMED_DISTINCT_IDENTITIES');
  assert.equal(summary.independentReceipt.cleanEnvironment, 'CLAIMED_CLEAN_WINDOWS_ENVIRONMENT');
  assert.equal(summary.independentReceipt.runClaim.producerRunId, 'synthetic-actions-run-123');
  assert.equal(summary.independentReceipt.runClaim.completedAt, '2026-10-23T04:01:00.000Z');
  assert.equal(summary.independentReceipt.identitySources.reviewerKey, 'https://example.invalid/reviewer-key');
  assert.equal(summary.independentReceipt.checkClaims.externalCopyMismatches['raw.log'], 'PASS');
  assert.equal(summary.independentReceipt.checkClaims.productExecution, 'PASS');
  assert.equal(summary.independentReceipt.productE4Accepted, undefined);
  assert.equal(summary.productE4Accepted, false);
  assert.equal(summary.e4Status, 'NOT_VERIFIED');
  assert.equal(summary.provenance.sourceCommit, '1'.repeat(40));
  assert.equal(summary.provenance.sourceTree, '2'.repeat(40));
  assert.equal(summary.provenance.reportedArtifactSha256, '3'.repeat(64));
  assert.equal(summary.provenance.productArtifactBytesReverified, false);
});

test('E4 verifier rejects a receipt with a forged signature', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir, {
    signatureMutation: receipt => { receipt.signature.value = Buffer.alloc(64).toString('base64'); }
  });

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_INDEPENDENT_RECEIPT_SIGNATURE_INVALID/);
});

test('E4 verifier rejects a cryptographically valid receipt whose operator and reviewer are the same identity', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir, {reviewerId: 'operator-1'});

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_INDEPENDENT_RECEIPT_ROLE_SEPARATION_INVALID/);
});

test('E4 verifier rejects a signed receipt bound to a different artifact digest', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir, {artifactSha256: '5'.repeat(64)});

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_INDEPENDENT_RECEIPT_BINDING_MISMATCH/);
});

test('E4 verifier rejects a signed receipt bound to a different product artifact size', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir, {
    receiptMutation: receipt => { receipt.run.artifactSize += 1; }
  });

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_INDEPENDENT_RECEIPT_BINDING_MISMATCH/);
});

test('E4 verifier rejects signed receipt timestamps that are invalid or reversed', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir, {
    receiptMutation: receipt => { receipt.run.completedAt = '2026-10-22T03:00:00.000Z'; }
  });

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_INDEPENDENT_RECEIPT_RUN_INVALID/);
});

test('E4 verifier rejects a signed PASS run result when a required check is not PASS', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-receipt-'));
  t.after(() => fs.rmSync(runDir, {recursive: true, force: true}));
  createValidRun(runDir, {
    reportOverrides: {
      source: {commit: '1'.repeat(40), tree: '2'.repeat(40)},
      artifact: {fileName: 'setup.exe', size: 123, sha256: '3'.repeat(64), executedByRunner: false, status: 'HASHED_NOT_EXECUTED'}
    }
  });
  const {receiptPath, reviewerPublicKeyPath} = writeSignedIndependentReceipt(runDir, {
    receiptMutation: receipt => { receipt.checks.productExecution = 'BLOCKED'; }
  });

  const result = runVerifier(runDir, {independentReceipt: receiptPath, reviewerPublicKey: reviewerPublicKeyPath});
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_INDEPENDENT_RECEIPT_RESULT_INCONSISTENT/);
});

test('E4 verifier rejects duplicate case ids rather than returning an ambiguous matrix summary', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir, {duplicateCaseId: 'MODEL-REAL-TOOLCALL'});

  const result = runVerifier(runDir);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_MATRIX_CASE_DUPLICATE:MODEL-REAL-TOOLCALL/);
});

for (const [label, cases] of [['non-array case list', null], ['case row without an id', [{}]]]) {
  test(`E4 verifier rejects a malformed ${label}`, t => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
    t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
    createValidRun(runDir, {reportOverrides: {cases}});

    const result = runVerifier(runDir);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /E4_MATRIX_CASES_INVALID/);
  });
}

test('E4 verifier rejects an archive swapped after its outer hash is read', t => {
  const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-swap-'));
  t.after(() => fs.rmSync(parentDir, { recursive: true, force: true }));
  const runDir = path.join(parentDir, 'run');
  const replacementDir = path.join(parentDir, 'replacement');
  createValidRun(runDir);
  createValidRun(replacementDir, {evidenceData: '{"event":"swapped-evidence"}\n'});
  assert.notEqual(
    sha256(fs.readFileSync(path.join(runDir, 'evidence.zip'))),
    sha256(fs.readFileSync(path.join(replacementDir, 'evidence.zip')))
  );

  const preload = path.join(parentDir, 'swap-after-first-archive-read.mjs');
  fs.writeFileSync(preload, `
    import fs from 'node:fs';
    import path from 'node:path';
    const runDir = path.resolve(process.env.AC_E4_SWAP_RUN);
    const replacementDir = path.resolve(process.env.AC_E4_REPLACEMENT_RUN);
    const archivePath = path.join(runDir, 'evidence.zip');
    const originalReadFileSync = fs.readFileSync.bind(fs);
    let swapped = false;
    fs.readFileSync = (file, ...args) => {
      const data = originalReadFileSync(file, ...args);
      if (!swapped && typeof file === 'string' && path.resolve(file) === archivePath) {
        swapped = true;
        for (const name of ['evidence.zip', 'SHA256SUMS.txt', 'report.json', 'report.md', 'raw.log', 'evidence']) {
          const target = path.join(runDir, name);
          fs.rmSync(target, { recursive: true, force: true });
          fs.cpSync(path.join(replacementDir, name), target, { recursive: true });
        }
      }
      return data;
    };
  `);

  const result = runVerifier(runDir, {
    preload,
    env: {...process.env, AC_E4_SWAP_RUN: runDir, AC_E4_REPLACEMENT_RUN: replacementDir}
  });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /E4_EXTERNAL_COPY_MISMATCH:SHA256SUMS\.txt/);
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function rewriteZipMemberName(runDir, safeName, unsafeName) {
  const from = Buffer.from(safeName);
  const to = Buffer.from(unsafeName);
  assert.equal(from.length, to.length, 'test archive path rewrite must preserve ZIP offsets');

  const archivePath = path.join(runDir, 'evidence.zip');
  const archive = fs.readFileSync(archivePath);
  let replacements = 0;
  for (let index = 0; (index = archive.indexOf(from, index)) !== -1; index += to.length) {
    to.copy(archive, index);
    replacements += 1;
  }
  assert.ok(replacements >= 3, 'ZIP member name and its manifest entry should both be rewritten');

  // Recompute the stored SHA256SUMS.txt member CRC after its manifest text was rewritten.
  for (let offset = 0; offset + 4 <= archive.length;) {
    const signature = archive.readUInt32LE(offset);
    if (signature === 0x04034b50) {
      const nameLength = archive.readUInt16LE(offset + 26);
      const extraLength = archive.readUInt16LE(offset + 28);
      const compressedSize = archive.readUInt32LE(offset + 18);
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      const name = archive.subarray(nameStart, nameStart + nameLength).toString('utf8');
      if (name === 'SHA256SUMS.txt') {
        assert.equal(archive.readUInt16LE(offset + 8), 0, 'manifest fixture should use stored ZIP data');
        archive.writeUInt32LE(crc32(archive.subarray(dataStart, dataStart + compressedSize)), offset + 14);
      }
      offset = dataStart + compressedSize;
      continue;
    }
    if (signature === 0x02014b50) {
      const nameLength = archive.readUInt16LE(offset + 28);
      const extraLength = archive.readUInt16LE(offset + 30);
      const commentLength = archive.readUInt16LE(offset + 32);
      const nameStart = offset + 46;
      const name = archive.subarray(nameStart, nameStart + nameLength).toString('utf8');
      if (name === 'SHA256SUMS.txt') {
        const localOffset = archive.readUInt32LE(offset + 42);
        const localNameLength = archive.readUInt16LE(localOffset + 26);
        const localExtraLength = archive.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const size = archive.readUInt32LE(localOffset + 18);
        archive.writeUInt32LE(crc32(archive.subarray(dataStart, dataStart + size)), offset + 16);
      }
      offset += 46 + nameLength + extraLength + commentLength;
      continue;
    }
    if (signature === 0x06054b50) break;
    offset += 1;
  }

  fs.writeFileSync(archivePath, archive);
  const manifestPath = path.join(runDir, 'SHA256SUMS.txt');
  const externalManifest = fs.readFileSync(manifestPath);
  let manifestIndex = 0;
  while ((manifestIndex = externalManifest.indexOf(from, manifestIndex)) !== -1) {
    to.copy(externalManifest, manifestIndex);
    manifestIndex += to.length;
  }
  fs.writeFileSync(manifestPath, externalManifest);

  const archiveHash = sha256(archive);
  fs.writeFileSync(path.join(runDir, 'bundle.sha256'), `${archiveHash}  evidence.zip\n`);
  const metadataPath = path.join(runDir, 'bundle.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  metadata.sha256 = archiveHash;
  metadata.size = archive.length;
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));
}

for (const name of ['SHA256SUMS.txt', 'report.json', 'report.md', 'raw.log']) {
  test(`E4 verifier rejects an external ${name} copy that differs from the ZIP`, t => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
    t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
    createValidRun(runDir);

    const valid = runVerifier(runDir);
    assert.equal(valid.status, 0, valid.stderr);

    const archivePath = path.join(runDir, 'evidence.zip');
    const archivedSourceBefore = fs.readFileSync(archivePath);
    fs.appendFileSync(path.join(runDir, name), 'tampered external copy\n');
    const invalid = runVerifier(runDir);
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.match(invalid.stderr, new RegExp(`E4_EXTERNAL_COPY_MISMATCH:${name.replaceAll('.', '\\.')}`));
    assert.deepEqual(fs.readFileSync(archivePath), archivedSourceBefore, 'rejecting an external copy mismatch must leave the archived source byte-identical');
  });
}

test('E4 verifier rejects an external evidence JSONL copy that differs from the ZIP', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir);

  const valid = runVerifier(runDir);
  assert.equal(valid.status, 0, valid.stderr);

  fs.appendFileSync(path.join(runDir, 'evidence', 'synthetic.jsonl'), 'tampered external copy\n');
  const invalid = runVerifier(runDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_EXTERNAL_COPY_MISMATCH:evidence\/synthetic\.jsonl/);
});

test('E4 verifier rejects ZIP member paths that traverse outside the bundle', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir, {extraPayload: [['evidence/abcde/x.jsonl', '{"event":"synthetic-traversal"}\n']]});
  rewriteZipMemberName(runDir, 'evidence/abcde/x.jsonl', 'evidence/../../x.jsonl');

  const invalid = runVerifier(runDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_UNSAFE_ARCHIVE_PATH|ZIP_UNSAFE_ENTRY_NAME/);
});

test('E4 verifier rejects an external evidence directory junction even when its target bytes match the ZIP', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir);

  const evidencePath = path.join(runDir, 'evidence');
  const externalTarget = path.join(path.dirname(runDir), `${path.basename(runDir)}-external-evidence`);
  t.after(() => fs.rmSync(externalTarget, { recursive: true, force: true }));
  const originalEvidence = path.join(evidencePath, 'synthetic.jsonl');
  const matchingBytes = fs.readFileSync(originalEvidence);
  fs.rmSync(evidencePath, { recursive: true, force: true });
  fs.mkdirSync(externalTarget, { recursive: true });
  fs.writeFileSync(path.join(externalTarget, 'synthetic.jsonl'), matchingBytes);
  try {
    fs.symlinkSync(externalTarget, evidencePath, 'junction');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN'].includes(error.code)) {
      t.skip(`directory junctions unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const invalid = runVerifier(runDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_EXTERNAL_COPY_SYMLINK:evidence/);
});

test('E4 verifier rejects a symlink used as the run directory', t => {
  const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(parentDir, { recursive: true, force: true }));
  const realRunDir = path.join(parentDir, 'real-run');
  const linkedRunDir = path.join(parentDir, 'linked-run');
  createValidRun(realRunDir);
  try {
    fs.symlinkSync(realRunDir, linkedRunDir, 'junction');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN'].includes(error.code)) {
      t.skip(`directory junctions unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const invalid = runVerifier(linkedRunDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_RUN_DIRECTORY_SYMLINK/);
});

for (const [label, mutate] of [
  ['schema', metadata => { metadata.schema = 'agent-canary.invalid'; }],
  ['archive name', metadata => { metadata.archive = 'other.zip'; }],
  ['archive size', metadata => { metadata.size += 1; }],
  ['archive entry count', metadata => { metadata.entries += 1; }],
  ['inner manifest summary', metadata => { metadata.manifest.entries += 1; }],
  ['classification', metadata => { metadata.classification = 'E4_VERIFIED'; }],
  ['verification claim', metadata => { metadata.verification = 'UNVERIFIED'; }]
]) {
  test(`E4 verifier rejects contradictory bundle.json ${label}`, t => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
    t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
    createValidRun(runDir);

    const metadataPath = path.join(runDir, 'bundle.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    mutate(metadata);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    const invalid = runVerifier(runDir);
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.match(invalid.stderr, /E4_BUNDLE_METADATA_MISMATCH_OR_PROMOTED/);
  });
}

test('E4 verifier rejects a promoted classification when report and bundle metadata agree', t => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-canary-e4-verifier-'));
  t.after(() => fs.rmSync(runDir, { recursive: true, force: true }));
  createValidRun(runDir, {classification: 'E4_VERIFIED'});

  const invalid = runVerifier(runDir);
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /E4_AUTOMATION_MUST_NOT_PROMOTE_VERDICT/);
});
