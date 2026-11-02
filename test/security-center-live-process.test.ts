import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repositoryRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const aliasBlockedCodes=new Set(['EPERM','EACCES','EBUSY']);
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');

test('live CLI process keeps configured target reads safe through parent-junction replacement',{
  timeout:20_000,
},async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-live-cli-workspace-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'canary-live-cli-outside-'));
  const privateHome=fs.mkdtempSync(path.join(os.tmpdir(),'canary-live-cli-home-'));
  const privateTemp=path.join(privateHome,'tmp');fs.mkdirSync(privateTemp);
  const notes=path.join(root,'notes'),heldNotes=path.join(root,'notes.held');
  const publicFixture='PUBLIC_LIVE_CLI_FIXTURE',outsideSentinel='OUTSIDE_LIVE_CLI_SENTINEL';
  const outsidePath=path.join(outside,'brief.txt');
  fs.mkdirSync(notes);fs.writeFileSync(path.join(notes,'brief.txt'),publicFixture);fs.writeFileSync(outsidePath,outsideSentinel);
  const outsideHash=digest(fs.readFileSync(outsidePath));
  const operatorCode=randomUUID();
  let child:ChildProcess|undefined,aliasInstalled=false,directoryMoved=false,replacementBlockedCode:string|undefined;
  let childOutput='',childError='';

  const stopChild=async()=>{
    if(!child||child.exitCode!==null)return;
    const stopped=new Promise<void>(resolve=>{
      const timer=setTimeout(resolve,3000);
      child!.once('exit',()=>{clearTimeout(timer);resolve();});
    });
    child.kill();await stopped;
  };

  try{
    const childEnv:NodeJS.ProcessEnv={
      AGENT_CANARY_HOME:privateHome,
      AGENT_CANARY_OPERATOR_CODE:operatorCode,
      HOME:privateHome,
      USERPROFILE:privateHome,
      TEMP:privateTemp,
      TMP:privateTemp,
    };
    for(const name of ['PATH','PATHEXT','SystemRoot','WINDIR'])if(process.env[name])childEnv[name]=process.env[name];
    child=spawn(process.execPath,[
      '--import','tsx',path.join(repositoryRoot,'src','competition.ts'),'ai','console',
      '--port','0','--workspace-root',root,'--protected-target','brief=notes/brief.txt',
    ],{cwd:repositoryRoot,env:childEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});

    const serverUrl=await new Promise<string>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('LIVE_CONSOLE_START_TIMEOUT: '+childOutput+childError)),10_000);
      child!.stdout?.on('data',chunk=>{
        childOutput+=chunk.toString();
        const match=/Agent Canary 中文控制台:\s*(http:\/\/127\.0\.0\.1:\d+)/.exec(childOutput);
        if(match){clearTimeout(timer);resolve(match[1]);}
      });
      child!.stderr?.on('data',chunk=>{childError+=chunk.toString();});
      child!.once('error',error=>{clearTimeout(timer);reject(error);});
      child!.once('exit',code=>{
        if(!/Agent Canary 中文控制台:/.test(childOutput)){
          clearTimeout(timer);reject(Error(`LIVE_CONSOLE_EXITED_BEFORE_READY:${code}:${childOutput}${childError}`));
        }
      });
    });
    const page=await fetch(serverUrl);
    assert.equal(page.status,200);
    const csrf=(await page.text()).match(/const csrf='([a-f0-9]+)'/)?.[1];
    assert(csrf,'live CLI page must provide its CSRF token');

    const readStatus=async()=>{
      const response=await fetch(serverUrl+'/api/security-center/target-read',{
        method:'POST',
        headers:{
          'content-type':'application/json',
          'x-canary-csrf':csrf,
          'x-canary-operator-code':operatorCode,
          origin:serverUrl,
        },
        body:JSON.stringify({targetId:'brief'}),
      });
      return {statusCode:response.status,body:await response.json() as Record<string,unknown>};
    };

    const positive=await readStatus();
    assert.equal(positive.statusCode,200);
    assert.deepEqual(positive.body,{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});
    assert.equal(JSON.stringify(positive.body).includes(publicFixture),false);

    let replacementBlockedByOs=false;
    try{
      fs.renameSync(notes,heldNotes);directoryMoved=true;
    }catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      if(!aliasBlockedCodes.has(String(code)))throw error;
      replacementBlockedByOs=true;replacementBlockedCode=String(code);
    }
    if(!replacementBlockedByOs){
      fs.symlinkSync(outside,notes,process.platform==='win32'?'junction':'dir');
      aliasInstalled=true;
    }
    t.diagnostic(aliasInstalled
      ?'parent rename and junction replacement succeeded; the live route must deny the held target'
      :`the filesystem denied parent rename with ${replacementBlockedCode}; the live route must keep returning status only`);

    const negative=await readStatus();
    assert.equal(negative.statusCode,200);
    assert.deepEqual(negative.body,{
      scope:'M3_CONFIGURED_TARGET_READ',
      status:aliasInstalled?'DENY':'ALLOW',
    });
    assert.equal(JSON.stringify(negative.body).includes(publicFixture),false);
    assert.equal(JSON.stringify(negative.body).includes(outsideSentinel),false);
    assert.equal(digest(fs.readFileSync(outsidePath)),outsideHash);
    assert.equal(fs.readFileSync(path.join(aliasInstalled?heldNotes:notes,'brief.txt'),'utf8'),publicFixture);
  }finally{
    await stopChild();
    if(aliasInstalled){
      try{if(process.platform==='win32')fs.rmdirSync(notes);else fs.unlinkSync(notes);}catch{}
    }
    if(directoryMoved&&!fs.existsSync(notes))try{fs.renameSync(heldNotes,notes);}catch{}
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
    fs.rmSync(privateHome,{recursive:true,force:true});
  }
});
