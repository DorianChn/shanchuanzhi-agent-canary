import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateEvidence} from '../src/runtime/evidence.js';

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
