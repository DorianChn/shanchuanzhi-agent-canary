import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const WRAPPER_PATH='packaging/windows/claude-native-hook.mjs';
export const M1_CANONICAL_WRAPPER_BLOB_SHA='b7ed4aba70a597f4f63a05decc6de1b32f67372e';
export const M1_CANONICAL_WRAPPER_SHA256='ff0bfef67e92c9ee387f78dd617408b63db6a9646566e16ca0f8e02c842c511d';
const BUILD_USAGE='Usage: node build.mjs PAYLOAD_DIR NSIS_DIR COMMUNITY_ZIP WRAPPER_SOURCE_COMMIT_SHA';

function git(repoRoot,args,encoding='utf8'){
  const result=spawnSync('git',['-C',path.resolve(repoRoot),...args],{encoding,windowsHide:true,maxBuffer:1024*1024});
  if(result.error||result.status!==0)throw Error('WRAPPER_SOURCE_GIT_PROVENANCE_UNAVAILABLE');
  return result.stdout;
}

function normalizeWindowsLineEndings(bytes){
  const normalized=[];
  for(let index=0;index<bytes.length;index++){
    const byte=bytes[index];
    if(byte===0x0d){
      if(bytes[index+1]!==0x0a)throw Error('WRAPPER_SOURCE_PROVENANCE_MISMATCH');
      normalized.push(0x0a);
      index++;
    }else normalized.push(byte);
  }
  return Buffer.from(normalized);
}

function gitBlobSHA(bytes){
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function resolveWrapperSourceSHA(repoRoot){
  const sourcePath=path.join(repoRoot,WRAPPER_PATH),sourceInfo=fs.lstatSync(sourcePath);
  if(!sourceInfo.isFile()||sourceInfo.isSymbolicLink())throw Error('WRAPPER_SOURCE_NOT_REGULAR_FILE');
  const sha=git(repoRoot,['rev-parse','HEAD']).trim().toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(sha))throw Error('WRAPPER_SOURCE_SHA_INVALID');
  const trackedBlob=git(repoRoot,['rev-parse',`${sha}:${WRAPPER_PATH}`]).trim().toLowerCase();
  const workingBlob=gitBlobSHA(normalizeWindowsLineEndings(fs.readFileSync(sourcePath)));
  if(!/^[a-f0-9]{40}$/.test(trackedBlob)||trackedBlob!==M1_CANONICAL_WRAPPER_BLOB_SHA||workingBlob!==trackedBlob)throw Error('WRAPPER_SOURCE_PROVENANCE_MISMATCH');
  return sha;
}

export function readCommittedWrapperSource(repoRoot){
  const sha=resolveWrapperSourceSHA(repoRoot);
  const bytes=git(repoRoot,['cat-file','blob',`${sha}:${WRAPPER_PATH}`],null);
  if(!Buffer.isBuffer(bytes))throw Error('WRAPPER_SOURCE_GIT_PROVENANCE_UNAVAILABLE');
  if(bytes.includes(Buffer.from('\r\n')))throw Error('WRAPPER_SOURCE_NOT_LF');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(sha256!==M1_CANONICAL_WRAPPER_SHA256)throw Error('WRAPPER_SOURCE_SHA256_MISMATCH');
  return{sha,blobSha:M1_CANONICAL_WRAPPER_BLOB_SHA,sha256,bytes};
}

export function writePackagedWrapperSource(repoRoot,destination,expectedSHA){
  if(typeof destination!=='string'||!destination||typeof expectedSHA!=='string')throw Error('PACKAGED_WRAPPER_ARGUMENT_INVALID');
  const source=readCommittedWrapperSource(repoRoot);
  if(expectedSHA!==source.sha)throw Error('WRAPPER_SOURCE_SHA_MISMATCH');
  try{
    const existing=fs.lstatSync(destination);
    if(existing.isSymbolicLink()||!existing.isFile())throw Error('PACKAGED_WRAPPER_NOT_REGULAR_FILE');
  }catch(error){
    if(error.code!=='ENOENT')throw error;
  }
  fs.writeFileSync(destination,source.bytes);
  const packaged=fs.readFileSync(destination);
  if(!packaged.equals(source.bytes))throw Error('PACKAGED_WRAPPER_PROVENANCE_MISMATCH');
  const sha256=createHash('sha256').update(packaged).digest('hex');
  if(sha256!==source.sha256)throw Error('PACKAGED_WRAPPER_SHA256_MISMATCH');
  return{sha:source.sha,blobSha:source.blobSha,sha256,bytes:packaged};
}

export function parseWindowsBuildArgs(args,{platform=process.platform}={}){
  if(!Array.isArray(args)||args.length!==4||args.some(value=>typeof value!=='string'||!value)||!/^[a-f0-9]{40}$/.test(args[3])||platform!=='win32')throw Error(BUILD_USAGE);
  return args;
}

export function createWindowsBuildInvocation({repoRoot,buildScript,payloadDir,nsisDir,communityZip,nodeCommand='node'}={}){
  for(const value of [repoRoot,buildScript,payloadDir,nsisDir,communityZip])if(typeof value!=='string'||!value)throw Error('WINDOWS_BUILD_ARGUMENT_REQUIRED');
  const zipInfo=fs.lstatSync(communityZip);
  if(!zipInfo.isFile()||zipInfo.isSymbolicLink())throw Error('COMMUNITY_ZIP_NOT_REGULAR_FILE');
  const wrapperSourceSHA=resolveWrapperSourceSHA(repoRoot);
  const buildArgs=[payloadDir,nsisDir,communityZip,wrapperSourceSHA];
  const args=[path.resolve(buildScript),...buildArgs];
  const quote=value=>'"'+String(value).replaceAll('"','\\"')+'"';
  return{
    wrapperSourceSHA,
    communityZip:path.resolve(communityZip),
    communityZIP_SHA256:createHash('sha256').update(fs.readFileSync(communityZip)).digest('hex'),
    buildArgs,
    args,
    command:`${nodeCommand} ${args.map(quote).join(' ')}`
  };
}
