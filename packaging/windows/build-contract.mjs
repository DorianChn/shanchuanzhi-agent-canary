import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const WRAPPER_PATH='security-lab/claude-native-hook.mjs';
const BUILD_USAGE='Usage: node build.mjs PAYLOAD_DIR NSIS_DIR COMMUNITY_ZIP WRAPPER_SOURCE_COMMIT_SHA';

function git(repoRoot,args,encoding='utf8'){
  const result=spawnSync('git',['-C',path.resolve(repoRoot),...args],{encoding,windowsHide:true,maxBuffer:1024*1024});
  if(result.error||result.status!==0)throw Error('WRAPPER_SOURCE_GIT_PROVENANCE_UNAVAILABLE');
  return result.stdout;
}

export function resolveWrapperSourceSHA(repoRoot){
  const changes=git(repoRoot,['status','--porcelain=v1','--untracked-files=all','--',WRAPPER_PATH]).trim();
  if(changes)throw Error('WRAPPER_SOURCE_NOT_COMMITTED');
  const sha=git(repoRoot,['rev-parse','HEAD']).trim().toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(sha))throw Error('WRAPPER_SOURCE_SHA_INVALID');
  const trackedBlob=git(repoRoot,['rev-parse',`${sha}:${WRAPPER_PATH}`]).trim().toLowerCase();
  const workingBlob=git(repoRoot,['hash-object',`--path=${WRAPPER_PATH}`,path.join(repoRoot,WRAPPER_PATH)]).trim().toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(trackedBlob)||workingBlob!==trackedBlob)throw Error('WRAPPER_SOURCE_PROVENANCE_MISMATCH');
  return sha;
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
