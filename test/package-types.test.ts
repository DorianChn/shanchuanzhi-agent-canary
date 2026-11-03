import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('build emits SDK and transitive declarations',()=>{
 const config=JSON.parse(fs.readFileSync('tsconfig.json','utf8'));
 assert.equal(config.compilerOptions.declaration,true);
 assert.ok(fs.existsSync('dist/sdk.d.ts'),'dist/sdk.d.ts missing');
 assert.ok(fs.existsSync('dist/runtime/gateway.d.ts'),'transitive gateway types missing');
});
test('SDK conditional export publishes the matching types first',()=>{
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 assert.deepEqual(pkg.exports['./sdk'],{types:'./dist/sdk.d.ts',import:'./dist/sdk.js',default:'./dist/sdk.js'});
});
test('Community builder retains public declarations and a typed consumer gate',()=>{
 const source=fs.readFileSync('security-lab/build-community.py','utf8');
 assert.match(source,/check-sdk-types\.mjs/);
 assert.match(source,/sdk\.d\.ts/);
 assert.match(source,/tsconfig\.json/);
});
