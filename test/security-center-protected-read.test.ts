import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.AGENT_CANARY_HOME=fs.mkdtempSync(path.join(os.tmpdir(),'canary-protected-console-home-'));
const {startAIConsole}=await import('../src/ai/console.js');
const operatorCode='FIXTURE_OPERATOR_ONLY';

async function start(root:string,targetPath:string){
  return startAIConsole({
    port:0,operatorApprovalCode:operatorCode,securityCenterWorkspaceRoot:root,
    securityCenterProtectedTargets:[{id:'docs',path:targetPath}],
  });
}

async function postTargetBody(consoleServer:Awaited<ReturnType<typeof startAIConsole>>,body:unknown,operator=operatorCode){
  const html=await(await fetch(consoleServer.url)).text();
  const csrf=html.match(/const csrf='([a-f0-9]+)'/)?.[1];assert(csrf);
  return fetch(consoleServer.url+'/api/security-center/target-read',{
    method:'POST',
    headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':operator},
    body:JSON.stringify(body),
  });
}
const postTargetRead=(consoleServer:Awaited<ReturnType<typeof startAIConsole>>,targetId:unknown,operator=operatorCode)=>postTargetBody(consoleServer,{targetId},operator);

const sha=(value:string)=>createHash('sha256').update(value).digest('hex');

test('first-party target-ID read returns status only after M5 OBSERVE, fixed M2 binding, and held M1 read',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-protected-console-positive-'));
  let consoleServer:Awaited<ReturnType<typeof startAIConsole>>|undefined;
  try{
    const fixture='PROTECTED_CONSOLE_PUBLIC_FIXTURE';
    fs.writeFileSync(path.join(root,'public.txt'),fixture);
    consoleServer=await start(root,'public.txt');
    const response=await postTargetRead(consoleServer,'docs');
    assert.equal(response.status,200);
    const body=await response.json() as Record<string,unknown>;
    assert.deepEqual(body,{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});
    assert.equal(JSON.stringify(body).includes(fixture),false);
    assert.equal(fs.readFileSync(path.join(root,'public.txt'),'utf8'),fixture);
    const denied=await postTargetRead(consoleServer,'docs','WRONG_OPERATOR');
    assert.equal(denied.status,403);
    assert.deepEqual(await denied.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    const unknown=await postTargetRead(consoleServer,'unregistered');
    assert.deepEqual(await unknown.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    const injected=await postTargetBody(consoleServer,{targetId:'docs',path:'secrets/fixture.txt'});
    assert.equal(injected.status,400);
    assert.deepEqual(await injected.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
  }finally{
    await consoleServer?.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('first-party target-ID read cannot follow a replaced parent junction to an outside file',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-protected-console-race-root-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'canary-protected-console-race-outside-'));
  const notes=path.join(root,'notes'),held=path.join(root,'notes.held');
  let consoleServer:Awaited<ReturnType<typeof startAIConsole>>|undefined,aliasInstalled=false,moved=false;
  try{
    fs.mkdirSync(notes);
    const publicFixture='PUBLIC_HELD_TARGET_FIXTURE',outsideSentinel='OUTSIDE_ALIAS_SENTINEL';
    fs.writeFileSync(path.join(notes,'public.txt'),publicFixture);
    fs.writeFileSync(path.join(outside,'public.txt'),outsideSentinel);
    const publicHash=sha(publicFixture),outsideHash=sha(outsideSentinel);
    consoleServer=await start(root,'notes/public.txt');
    try{
      fs.renameSync(notes,held);moved=true;
      fs.symlinkSync(outside,notes,process.platform==='win32'?'junction':'dir');
      aliasInstalled=true;
    }catch{
      if(moved&&!fs.existsSync(notes))fs.renameSync(held,notes);
      moved=false;
    }
    const response=await postTargetRead(consoleServer,'docs');
    const body=await response.json() as Record<string,unknown>;
    assert.deepEqual(body,{scope:'M3_CONFIGURED_TARGET_READ',status:aliasInstalled?'DENY':'ALLOW'});
    assert.equal(JSON.stringify(body).includes(outsideSentinel),false);
    assert.equal(sha(fs.readFileSync(path.join(outside,'public.txt'),'utf8')),outsideHash);
    assert.equal(sha(fs.readFileSync(path.join(aliasInstalled?held:notes,'public.txt'),'utf8')),publicHash);
  }finally{
    await consoleServer?.close();
    if(aliasInstalled){try{if(process.platform==='win32')fs.rmdirSync(notes);else fs.unlinkSync(notes);}catch{}if(moved&&!fs.existsSync(notes))try{fs.renameSync(held,notes);}catch{}}
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('configured symlink targets are rejected before the protected console starts',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-protected-console-alias-config-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'canary-protected-console-alias-target-'));
  try{
    fs.writeFileSync(path.join(outside,'fixture.txt'),'ALIAS_TARGET_SENTINEL');
    fs.symlinkSync(outside,path.join(root,'alias'),process.platform==='win32'?'junction':'dir');
    await assert.rejects(start(root,'alias/fixture.txt'));
  }finally{
    const alias=path.join(root,'alias');
    try{const s=fs.lstatSync(alias);if(s.isSymbolicLink()){if(process.platform==='win32')fs.rmdirSync(alias);else fs.unlinkSync(alias);}}catch{}
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});
