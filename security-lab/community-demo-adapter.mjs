import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const EXPECTED_M8_DEMO_BLOB = 'bd2cd0512002e0a3f80a523e31d7e0ec679915f7';
export const EXPECTED_COMMUNITY_DEMO_BLOB = '18ed69d920f6eaa3b977e69bc1c64dbeac98a46f';
export const COMMUNITY_DEMO_ADAPTATION = 'READ_ONLY_POSITIVE_CONTROL_AND_QUARANTINE_SEMANTICS_V1';

function gitBlobSha(data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function replaceExactlyOnce(source, before, after, marker) {
  const pieces = source.split(before);
  if (pieces.length !== 2) throw new Error(`COMMUNITY_DEMO_ADAPTATION_SOURCE_MISMATCH_${marker}`);
  return pieces[0] + after + pieces[1];
}

export function adaptCommunityOfflineDemo(input) {
  const inputBytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const originalBlob = gitBlobSha(inputBytes);
  if (originalBlob !== EXPECTED_M8_DEMO_BLOB) throw new Error('COMMUNITY_DEMO_SOURCE_BLOB_MISMATCH');
  let source = inputBytes.toString('utf8');
  if (!Buffer.from(source, 'utf8').equals(inputBytes)) throw new Error('COMMUNITY_DEMO_SOURCE_UTF8_INVALID');

  source = replaceExactlyOnce(source,
    "{path:'result.txt',writable:true}",
    "{path:'result.txt'}",
    'REGISTERED_FILE_CAPABILITY');
  source = replaceExactlyOnce(source,
    "const beforeWrite=fs.readFileSync(path.join(fixture,'result.txt'));",
    "const beforeWrite=fs.readFileSync(path.join(fixture,'result.txt'));const normalRead=await runtime.agent.dispatch({name:'read_file',args:{path:'result.txt'}});assert.equal(normalRead.content,'BEFORE');report.cases.push({id:'F_NORMAL_READ',status:'VERIFIED',actualReadValue:normalRead.content});",
    'NORMAL_CONTROL');
  source = replaceExactlyOnce(source,
    "await assert.rejects(runtime.agent.dispatch({name:'write_file',args:{path:'result.txt',content:'FORBIDDEN_AFTER_TRIP'}}),/guard_quarantined/);",
    "await assert.rejects(runtime.agent.dispatch({name:'read_file',args:{path:'result.txt'}}),/guard_quarantined/);",
    'POST_TRIP_READ');
  source = replaceExactlyOnce(source,
    'postTripWriteOccurred:false,',
    'postTripReadReturnedTargetContent:false,postTripFileChanged:false,',
    'POST_TRIP_STATE');

  const bytes = Buffer.from(source, 'utf8');
  const adaptedBlob = gitBlobSha(bytes);
  if (adaptedBlob !== EXPECTED_COMMUNITY_DEMO_BLOB) throw new Error('COMMUNITY_DEMO_ADAPTED_BLOB_MISMATCH');
  return {
    bytes,
    originalBlob,
    adaptedBlob,
    adaptation: COMMUNITY_DEMO_ADAPTATION,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) throw new Error('USAGE: community-demo-adapter.mjs <pinned-source> <adapted-output>');
  const result = adaptCommunityOfflineDemo(fs.readFileSync(inputPath));
  fs.writeFileSync(outputPath, result.bytes, {flag: 'wx'});
  process.stdout.write(JSON.stringify({
    originalBlob: result.originalBlob,
    adaptedBlob: result.adaptedBlob,
    adaptation: result.adaptation,
  }) + '\n');
}
