import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';
const root=await fs.realpath(path.resolve(process.argv[2]||'.')),base=path.join(root,'contributor-review');
const metadata=JSON.parse(await fs.readFile(path.join(base,'TYPE_COMPANION_MANIFEST.json'),'utf8'));
async function shaInside(base,name){const file=path.resolve(base,name);if(!file.startsWith(base+path.sep))throw Error('COMPANION_PATH_INVALID');const st=await fs.lstat(file);if(!st.isFile()||st.isSymbolicLink()||await fs.realpath(file)!==file)throw Error('COMPANION_LINK_OR_TYPE_INVALID');return createHash('sha256').update(await fs.readFile(file)).digest('hex');}
const sdkMatch=await shaInside(root,'dist/sdk.js')===metadata.sdkJsSHA256,typeMismatches=[],inputMismatches=[];
for(const [name,expected]of Object.entries(metadata.files))if(await shaInside(base,name)!==expected)typeMismatches.push(name);
for(const [name,expected]of Object.entries(metadata.bridgeFiles??{}))if(await shaInside(base,name)!==expected)typeMismatches.push(name);
for(const [name,expected]of Object.entries(metadata.communityInputs))if(await shaInside(root,name)!==expected)inputMismatches.push(name);
const ok=sdkMatch&&!typeMismatches.length&&!inputMismatches.length;
console.log(JSON.stringify({status:ok?'VERIFIED_EXACT_TYPE_COMPANION':'FAILED',sdkMatch,typeFiles:Object.keys(metadata.files).length,inputFiles:Object.keys(metadata.communityInputs).length,bridgeFiles:Object.keys(metadata.bridgeFiles??{}).length,typeMismatches,inputMismatches,scope:metadata.scope}));
if(!ok)process.exitCode=1;
