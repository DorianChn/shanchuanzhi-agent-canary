/** Build-only prerequisites: Node, npm, Python zipfile, portable official NSIS.
 * None is needed on the end user's machine except Windows 11 built-in .NET. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createWindowsBuildInvocation} from './build-contract.mjs';
const src=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(src,'../..');
const [destination,python,npm,communityPath,communitySHA]=process.argv.slice(2);if(!destination||!python||!npm||!communityPath||!/^[a-f0-9]{64}$/.test(communitySHA||'')||process.platform!=='win32')throw Error('node prepare.mjs EMPTY_BUILD_DIRECTORY PYTHON_EXE NPM_CLI_JS COMMUNITY_ZIP SHA256');
const out=path.resolve(destination);if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('NONEMPTY_BUILD_DIRECTORY_REFUSED');fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function download(url,file,expected){const r=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('DOWNLOAD_HTTP_'+r.status);const bytes=Buffer.from(await r.arrayBuffer());if(sha(bytes)!==expected)throw Error('DOWNLOAD_CHECKSUM_MISMATCH');fs.writeFileSync(file,bytes);}
const community=path.resolve(communityPath),communityStat=fs.lstatSync(community);if(communityStat.isSymbolicLink()||!communityStat.isFile())throw Error('COMMUNITY_ARTIFACT_NOT_REGULAR_FILE');const zip=path.join(out,'community.zip'),communityBytes=fs.readFileSync(community);if(sha(communityBytes)!==communitySHA)throw Error('COMMUNITY_CHECKSUM_MISMATCH');fs.writeFileSync(zip,communityBytes,{flag:'wx'});
const r=spawnSync(python,['-c','import zipfile,sys,pathlib; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert all(not pathlib.PurePosixPath(n).is_absolute() and ".." not in pathlib.PurePosixPath(n).parts and "\\\\" not in n and ":" not in n for n in z.namelist()); z.extractall(sys.argv[2])',zip,path.join(out,'unpacked')],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error('ZIP_EXTRACTION_FAILED');
const payload=path.join(out,'payload');fs.mkdirSync(payload);fs.renameSync(path.join(out,'unpacked/agent-canary-community-3'),path.join(payload,'app'));fs.mkdirSync(path.join(payload,'runtime'));
await download('https://nodejs.org/dist/v22.23.1/win-x64/node.exe',path.join(payload,'runtime/node.exe'),'f8d162c0641dcee512132f3bcf8a68169c7ecb852efd8e1a46c9fec5a0f469ed');
await download('https://raw.githubusercontent.com/nodejs/node/v22.23.1/LICENSE',path.join(payload,'runtime/NODE_LICENSE'),'c738ae413cf561f174e34f6961f8ca458aae2369a73640dda6234c629b98bcc4');
const install=spawnSync(process.execPath,[npm,'ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:path.join(payload,'app'),encoding:'utf8',windowsHide:true,timeout:240000});if(install.status!==0)throw Error('PRODUCTION_DEPENDENCIES_FAILED');
const invocation=createWindowsBuildInvocation({repoRoot,buildScript:path.join(src,'build.mjs'),payloadDir:payload,nsisDir:'PATH_TO_VERIFIED_PORTABLE_NSIS_3_13',communityZip:zip});
console.log(JSON.stringify({payload,communityZip:zip,next:invocation.command,wrapperSourceSHA:invocation.wrapperSourceSHA,communityZIP_SHA256:invocation.communityZIP_SHA256,note:'The build command is pinned to the committed wrapper source in this checkout; replace only the NSIS directory placeholder.',toolingOnly:true}));
