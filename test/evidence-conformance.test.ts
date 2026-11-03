import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {EvidenceRecorder,validateEvidence,verifyEvidenceChain} from '../src/runtime/evidence.js';

const schema = JSON.parse(fs.readFileSync(new URL('../security-lab/evidence.schema.json', import.meta.url), 'utf8'));
const vectors = JSON.parse(fs.readFileSync(new URL('./evidence-vectors.json', import.meta.url), 'utf8'));

test('OSEP identifier references resolve, including request_id', () => {
  assert.deepEqual(schema.properties.request_id, {$ref:'#/$defs/identifier'});
  function visit(value:any) {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value) {
      assert.match(value.$ref, /^#\/\$defs\//);
      assert.ok(schema.$defs[value.$ref.slice('#/$defs/'.length)]);
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(schema);
});

for (const v of vectors.cases) test('OSEP strict field conformance: '+v.id, () => {
  assert.equal(validateEvidence({...vectors.base,[v.field]:v.value}), v.valid);
});

// Selective cross-review adoption: locked SDK's validator, no new dependency.
const sdkRequire = createRequire(import.meta.resolve('@modelcontextprotocol/sdk/validation/ajv'));
const Ajv2020 = sdkRequire('ajv/dist/2020.js').default;
const addFormats = sdkRequire('ajv-formats');
function standardValidator(value:unknown, strict = true) {
  const ajv = new Ajv2020({strict,allErrors:true,validateFormats:true});
  addFormats(ajv);
  return ajv.compile(value);
}
test('strict AJV2020 and enabled formats match all runtime field vectors', () => {
  const validate = standardValidator(schema);
  for (const v of vectors.cases) assert.equal(validate({...vectors.base,[v.field]:v.value}),v.valid,v.id);
});
test('historical missing reference affects consumers, not gateway authorization', () => {
  const broken = structuredClone(schema);
  broken.properties.request_id = {'':'#//identifier'};
  assert.throws(()=>standardValidator(broken),/unknown keyword/);
  const permissive = standardValidator(broken,false);
  const malformed = {...vectors.base,request_id:{untrusted:true}};
  assert.equal(permissive(malformed),true);
  assert.equal(validateEvidence(malformed),false);
  assert.equal(standardValidator(schema)(malformed),false);
});
test('actual Recorder intent/outcome export passes strict standard schema and chain', () => {
  const recorder = new EvidenceRecorder();
  const {schema_version,evidence_id,timestamp,previous_event_digest,event_digest,...request} = vectors.base;
  recorder.record({...request,decision:'ALLOW',execution_status:'RUNNING',side_effect_verification:'NOT_STARTED'});
  recorder.record({...request,decision:'ALLOW',execution_status:'SUCCEEDED',side_effect_verification:'NOT_VERIFIED'});
  const exported = JSON.parse(JSON.stringify(recorder.snapshot()));
  assert.equal(exported.length,2);
  const validate = standardValidator(schema);
  assert.ok(exported.every((event:unknown)=>validate(event)&&validateEvidence(event)));
  assert.equal(exported[0].request_id,exported[1].request_id);
  assert.equal(verifyEvidenceChain(exported,exported[1].event_digest).valid,true);
});
