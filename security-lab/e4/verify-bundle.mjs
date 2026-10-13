import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readZip } from './zip.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const supplied = process.argv[2] ? path.resolve(process.argv[2]) : null;
const runsRoot = path.join(repoRoot, 'security-lab', 'e4-runs');
const runNames = fs.existsSync(runsRoot) ? fs.readdirSync(runsRoot, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort() : [];
const runDir = supplied ?? (runNames.length ? path.join(runsRoot, runNames.at(-1)) : null);
if (!runDir || !fs.statSync(runDir).isDirectory()) throw new Error('E4_RUN_DIRECTORY_NOT_FOUND');

const archivePath = path.join(runDir, 'evidence.zip');
const shaPath = path.join(runDir, 'bundle.sha256');
const metaPath = path.join(runDir, 'bundle.json');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const archive = fs.readFileSync(archivePath);
const archiveHash = sha256(archive);
const shaLine = fs.readFileSync(shaPath, 'utf8').trim();
if (shaLine !== `${archiveHash}  evidence.zip`) throw new Error('E4_OUTER_ZIP_SHA256_MISMATCH');
const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
if (metadata.sha256 !== archiveHash || metadata.e4Status !== 'NOT_VERIFIED') throw new Error('E4_BUNDLE_METADATA_MISMATCH_OR_PROMOTED');

const files = readZip(archivePath);
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
  let external;
  try { external = fs.readFileSync(path.join(runDir, name)); }
  catch { throw new Error(`E4_EXTERNAL_COPY_MISSING:${name}`); }
  if (!external.equals(archived)) throw new Error(`E4_EXTERNAL_COPY_MISMATCH:${name}`);
}
const report = JSON.parse(reportBytes.toString('utf8'));
if (report.e4Status !== 'NOT_VERIFIED' || report.overall.includes('PASS')) throw new Error('E4_AUTOMATION_MUST_NOT_PROMOTE_VERDICT');
const requiredCases = ['GW-ALLOW-CONTROL', 'GW-CANARY-BLOCK', 'CANARY-SESSION-ISOLATION', 'GW-FAULT-EXECUTOR', 'GW-FAULT-CLOSED', 'HOOK-FAULT-STATESTORE', 'SHELL-BOUNDARY-BYPASS', 'ARTIFACT-VM-BINDING', 'APP-01', 'MODEL-REAL-TOOLCALL'];
for (const id of requiredCases) if (!report.cases.some(row => row.id === id)) throw new Error(`E4_MATRIX_CASE_MISSING:${id}`);
const shell = report.cases.find(row => row.id === 'SHELL-BOUNDARY-BYPASS');
if (shell.status === 'PASS' || shell.details.countsAsGatewayPass !== false || shell.details.countsAsGatewayFail !== false) throw new Error('E4_SHELL_BOUNDARY_CLASSIFICATION_INVALID');
const modelCase = report.cases.find(row => row.id === 'MODEL-REAL-TOOLCALL');
if (modelCase.reason?.includes('MODEL_REFUSAL') && modelCase.status.startsWith('PASS')) throw new Error('E4_MODEL_REFUSAL_MUST_NOT_COUNT_AS_GATEWAY_DENIAL');

process.stdout.write(JSON.stringify({ valid: true, e4Status: report.e4Status, classification: report.classification, archiveSha256: archiveHash, entries: files.size, payloadFiles: payloadNames.length, sourceCommit: report.source.commit, shellStatus: shell.status, modelStatus: modelCase.status }) + '\n');
