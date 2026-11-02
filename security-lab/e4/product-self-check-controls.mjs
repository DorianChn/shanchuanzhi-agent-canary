import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {digest,assertOutputOutsideInput} from './product-self-check.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const verifier=path.join(here,'verify-bundle.mjs');
const files=['evidence.zip','bundle.json','bundle.sha256','SHA256SUMS.txt','report.json','report.md','raw.log'];
export function verifyBundleControls(bundleDir, outputDir) {
  const source=path.resolve(bundleDir), output=path.resolve(outputDir);
  if(fs.existsSync(output)) throw Error('CONTROL_OUTPUT_ALREADY_EXISTS');
  assertOutputOutsideInput(source,output,'CONTROL_OUTPUT_INSIDE_BUNDLE');
  if(fs.lstatSync(source).isSymbolicLink() || !fs.lstatSync(source).isDirectory()) throw Error('CONTROL_SOURCE_INVALID');
  const original=new Map();
  for(const name of files) {
    const file=path.join(source,name), stat=fs.lstatSync(file);
    if(stat.isSymbolicLink() || !stat.isFile() || stat.size>64*1024*1024) throw Error('CONTROL_SOURCE_INVALID');
    original.set(name,fs.readFileSync(file));
  }
  fs.mkdirSync(output,{recursive:true});
  const rows=[];
  const scrub=value=>String(value??'').split(os.homedir()).join('<USER_HOME>').split(path.resolve(here,'../..')).join('<M6>');
  function run(id, dir, expectedError=null) {
    const child=spawnSync(process.execPath,[verifier,dir],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:4*1024*1024});
    let parsed=null, failure=null;
    if(child.error || child.signal) failure=`CONTROL_INCOMPLETE:${id}:${child.error?.code??child.signal}`;
    else if(expectedError) {
      if(child.status===0 || !(child.stderr??'').includes(expectedError)) failure=`CONTROL_UNEXPECTED_ACCEPTANCE_OR_ERROR:${id}`;
    } else if(child.status!==0) failure=`CONTROL_POSITIVE_FAILED:${id}`;
    else {
      try {parsed=JSON.parse(child.stdout);} catch {failure='CONTROL_POSITIVE_INVALID_JSON';}
      if(parsed && (parsed.bundleIntegrityVerified!==true || parsed.productE4Accepted!==false || parsed.e4Status!=='NOT_VERIFIED')) failure='CONTROL_POSITIVE_PROMOTED_VERDICT';
    }
    const row={id,verificationLevel:'SELF_CHECK',expectedBehaviorObserved:failure===null,command:['node','security-lab/e4/verify-bundle.mjs',`<CONTROL>/${id}`],
      exitCode:child.status,error:child.error?.code??null,signal:child.signal,stdout:scrub(child.stdout),stderr:scrub(child.stderr),expectedError,failure};
    if(parsed) row.verifierResult=parsed;
    rows.push(row);
    fs.writeFileSync(path.join(output,id+'.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});
    fs.appendFileSync(path.join(output,'raw.log'),JSON.stringify(row)+'\n');
    if(failure) throw Error(failure);
  }
  function copy(id) {
    const dir=path.join(output,id);fs.mkdirSync(dir);
    for(const [name,bytes] of original) fs.writeFileSync(path.join(dir,name),bytes,{flag:'wx'});
    return dir;
  }
  run('positive',copy('positive'));
  for(const name of ['SHA256SUMS.txt','report.json','report.md','raw.log']) {
    const id='mismatch-'+name.replaceAll('.','-'),dir=copy(id);
    fs.appendFileSync(path.join(dir,name),'SYNTHETIC_MISMATCH_CONTROL');
    run(id,dir,`E4_EXTERNAL_COPY_MISMATCH:${name}`);
    if(digest(fs.readFileSync(path.join(dir,'evidence.zip')))!==digest(original.get('evidence.zip'))) throw Error('CONTROL_ARCHIVE_CHANGED');
  }
  const truncated=copy('truncated-zip'), bytes=original.get('evidence.zip').subarray(0,-22), hash=digest(bytes);
  fs.writeFileSync(path.join(truncated,'evidence.zip'),bytes);
  fs.writeFileSync(path.join(truncated,'bundle.sha256'),`${hash}  evidence.zip\n`);
  const metadata=JSON.parse(original.get('bundle.json'));metadata.sha256=hash;metadata.size=bytes.length;
  fs.writeFileSync(path.join(truncated,'bundle.json'),JSON.stringify(metadata));
  run('truncated-zip',truncated,'ZIP_EOCD_MISSING');
  for(const [name,bytes] of original) if(!fs.readFileSync(path.join(source,name)).equals(bytes)) throw Error('CONTROL_SOURCE_CHANGED');
  const result={verificationLevel:'SELF_CHECK',productE4Accepted:false,e4Status:'NOT_VERIFIED',originalArchiveSha256:digest(original.get('evidence.zip')),
    sourceUnchanged:true,controls:rows};
  fs.writeFileSync(path.join(output,'controls.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return result;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    if(process.argv.length!==4) throw Error('CONTROL_USAGE_BUNDLE_DIR_OUTPUT_DIR');
    const result=verifyBundleControls(process.argv[2],process.argv[3]);
    console.log(JSON.stringify({verificationLevel:result.verificationLevel,productE4Accepted:result.productE4Accepted,
      sourceUnchanged:result.sourceUnchanged,controls:result.controls.map(({id,exitCode,expectedBehaviorObserved})=>({id,exitCode,expectedBehaviorObserved}))},null,2));
  } catch(error) {console.error(JSON.stringify({verificationLevel:'SELF_CHECK',error:error.message}));process.exitCode=1;}
}
