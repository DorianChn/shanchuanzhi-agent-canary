import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const src=path.dirname(fileURLToPath(import.meta.url));
const [payloadArg,nsisArg,zipArg,wrapperSHA]=process.argv.slice(2);
if(!payloadArg||!nsisArg||!zipArg||!/^[a-f0-9]{40}$/.test(wrapperSHA||'')||process.platform!=='win32')throw Error('Usage: node build.mjs PAYLOAD_DIR NSIS_DIR');
const root=path.resolve(payloadArg),nsis=path.resolve(nsisArg),output=path.dirname(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function walk(d,prefix=''){return fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{const p=prefix+e.name;if(e.isSymbolicLink())throw Error('SYMLINK_IN_PAYLOAD');return e.isDirectory()?walk(path.join(d,e.name),p+'/'):[p];});}
for(const f of ['worker.mjs','verification.mjs'])fs.copyFileSync(path.join(src,f),path.join(root,f));
fs.copyFileSync(path.join(src,'THIRD_PARTY_NOTICES.md'),path.join(root,'THIRD_PARTY_NOTICES.md'));
fs.copyFileSync(path.join(nsis,'COPYING'),path.join(root,'NSIS_COPYING'));
const runtime=walk(path.join(root,'app/dist')).filter(p=>p.endsWith('.js')).map(p=>({path:p,sha256:hash(path.join(root,'app/dist',p))}));
if(runtime.length!==33||!fs.existsSync(path.join(root,'app/dist/sdk.d.ts')))throw Error('COMMUNITY_RUNTIME_OR_TYPES_INCOMPLETE');
const meta=JSON.parse(fs.readFileSync(path.join(root,'app/FREE_BUILD_VERSION.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'app/package.json'),'utf8'));
if(meta.candidateId!=='competition-candidate.4')throw Error('UNEXPECTED_CANDIDATE');
const version={wrapperSourceSHA:wrapperSHA,desktopVersion:pkg.version,communityVersion:pkg.version,runtimeBaselineSHA:meta.runtimeBaselineSHA,communityRepairSHA:meta.sourceSHA,securityRuntimeModified:meta.securityRuntimeModified,communityZIP_SHA256:hash(path.resolve(zipArg)),nodeVersion:'22.23.1',nodeSHA256:'f8d162c0641dcee512132f3bcf8a68169c7ecb852efd8e1a46c9fec5a0f469ed',signature:'UNSIGNED',coreRuntimeHashes:runtime};
if(hash(path.join(root,'runtime/node.exe'))!==version.nodeSHA256)throw Error('NODE_CHECKSUM_MISMATCH');
fs.writeFileSync(path.join(root,'VERSION.json'),JSON.stringify(version,null,2));
const excluded=new Set(['AgentCanary.exe','PAYLOAD_MANIFEST.json','INSTALL_RECEIPT.json','Uninstall.exe']);
const manifest={schemaVersion:1,version:version.desktopVersion,files:walk(root).filter(p=>!excluded.has(p)).map(p=>({path:p,size:fs.statSync(path.join(root,p)).size,sha256:hash(path.join(root,p))}))};
fs.writeFileSync(path.join(root,'PAYLOAD_MANIFEST.json'),JSON.stringify(manifest,null,2));
const anchor=hash(path.join(root,'PAYLOAD_MANIFEST.json'));
const generated=path.join(output,'Launcher.generated.cs');fs.writeFileSync(generated,fs.readFileSync(path.join(src,'Launcher.cs'),'utf8').replace('__MANIFEST_SHA__',anchor).replaceAll('3.0.0.3','3.0.0.4'));
function run(exe,args){const r=spawnSync(exe,args,{cwd:output,encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:5*1024*1024});fs.appendFileSync(path.join(output,'build.log'),JSON.stringify({exe:path.basename(exe),args,exit:r.status,stdout:r.stdout,stderr:r.stderr})+'\n');if(r.status!==0)throw Error('BUILD_FAILED: '+r.stdout+r.stderr);}
run(path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:winexe','/platform:x64','/optimize+','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll','/win32manifest:'+path.join(src,'app.manifest'),'/out:'+path.join(root,'AgentCanary.exe'),generated]);
const owned=walk(root),dirs=new Set();for(const p of owned){let d=path.posix.dirname(p);while(d!=='.'){dirs.add(d);d=path.posix.dirname(d);}}
const esc=s=>s.replaceAll('$','$$');
let nsi=fs.readFileSync(path.join(src,'installer.nsi.in'),'utf8').replaceAll('candidate.3','candidate.4').replaceAll('Candidate3','Candidate4').replaceAll('Agent Canary Community.lnk','Agent Canary Community candidate.4.lnk');
nsi=nsi.replaceAll("$SMPROGRAMS\\Agent Canary Community","$SMPROGRAMS\\Agent Canary Community candidate.4");
const values={OUTPUT:esc(path.join(output,'AgentCanary-Community-Setup.exe')),PAYLOAD:esc(root),LICENSE:esc(path.join(root,'app/LICENSE')),ANCHOR:anchor,DELETE:owned.map(p=>' Delete "$INSTDIR\\'+p.replaceAll('/','\\')+'"').join('\n'),RMDIR:[...dirs].sort((a,b)=>b.split('/').length-a.split('/').length).map(d=>' RMDir "$INSTDIR\\'+d.replaceAll('/','\\')+'"').join('\n')};
for(const[k,v]of Object.entries(values))nsi=nsi.replaceAll('__'+k+'__',v);
const reparse=[...dirs,''].map(d=>{
 const target='$INSTDIR'+(d?'\\'+d.replaceAll('/','\\'):'');
 return ' System::Call \'kernel32::GetFileAttributesW(w "'+target+'") i.r0\'\n IntOp $1 $0 & 0x400\n ${If} $0 != -1\n ${AndIf} $1 != 0\n  MessageBox MB_ICONSTOP "Redirected directory rejected; no files deleted / 目录被重定向，拒绝卸载删除。"\n  Abort\n ${EndIf}';
}).join('\n');
nsi=nsi.replaceAll('__REPARSE_CHECKS__',reparse);
fs.writeFileSync(path.join(output,'installer.nsi'),'\uFEFF'+nsi);
run(path.join(nsis,'makensis.exe'),['/V3',path.join(output,'installer.nsi')]);
const setup=path.join(output,'AgentCanary-Community-Setup.exe');const result={version,manifestSHA256:anchor,launcherSHA256:hash(path.join(root,'AgentCanary.exe')),installerSHA256:hash(setup),installerBytes:fs.statSync(setup).size,ownedFiles:owned.length,unsigned:true};
fs.writeFileSync(path.join(output,'BUILD_RESULT.json'),JSON.stringify(result,null,2));fs.writeFileSync(setup+'.sha256',result.installerSHA256+'  AgentCanary-Community-Setup.exe\n');console.log(JSON.stringify(result));
