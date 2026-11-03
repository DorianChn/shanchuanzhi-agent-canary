import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAgentGuard} from '../src/containment.js';
import {createSecurityToolRouter} from '../src/security-router.js';

function makeRouter(root:string,onRead:(call:{name:string;args:Record<string,unknown>})=>string,verifyRealPaths=true){
  const guard=createAgentGuard({alert:false});
  return createSecurityToolRouter({
    guard,
    mode:'OBSERVE',
    verifyRealPaths,
    workspaceRoot:root,
    tools:{read_file:{operation:'file-read'}},
    executeRealTool:onRead,
  });
}

test('OBSERVE permits an explicitly virtual callback when real-path checks are disabled',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-safe-'));
  let callbacks=0;
  try{
    const router=makeRouter(root,()=>{callbacks++;return 'VIRTUAL_PUBLIC_FIXTURE';},false);
    assert.equal(await router.dispatch({name:'read_file',args:{path:'public.txt'}}),'VIRTUAL_PUBLIC_FIXTURE');
    assert.equal(callbacks,1);
    assert.deepEqual(router.pendingApprovals(),[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('OBSERVE denies a real file callback without an M1-bound Gateway even for a safe path',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-unpinned-safe-'));
  let callbacks=0;
  try{
    fs.writeFileSync(path.join(root,'public.txt'),'PUBLIC_FIXTURE');
    const router=makeRouter(root,call=>{callbacks++;return fs.readFileSync(path.join(root,String(call.args.path)),'utf8');});
    await assert.rejects(router.dispatch({name:'read_file',args:{path:'public.txt'}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(root,'public.txt'),'utf8'),'PUBLIC_FIXTURE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('OBSERVE denies unpinned writes, deletes, declared path callbacks, and unregistered tools',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-unpinned-operations-'));
  let callbacks=0;
  try{
    fs.writeFileSync(path.join(root,'public.txt'),'PUBLIC_FIXTURE');
    const router=createSecurityToolRouter({
      guard:createAgentGuard({alert:false}),mode:'OBSERVE',workspaceRoot:root,
      tools:{write_file:{operation:'file-write'},delete_file:{operation:'delete'},read_secret:{operation:'sensitive-read',pathArg:'resource'}},
      executeRealTool:()=>{callbacks++;return 'MUST_NOT_RUN';},
    });
    await assert.rejects(router.dispatch({name:'write_file',args:{path:'public.txt',content:'CHANGED'}}));
    await assert.rejects(router.dispatch({name:'delete_file',args:{path:'public.txt'}}));
    await assert.rejects(router.dispatch({name:'read_secret',args:{resource:'public.txt'}}));
    await assert.rejects(router.dispatch({name:'unregistered_reader',args:{path:'public.txt'}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(root,'public.txt'),'utf8'),'PUBLIC_FIXTURE');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('OBSERVE does not hand a checked path to an unpinned callback that can replace it before opening',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-unpinned-race-root-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-unpinned-race-outside-'));
  const publicDir=path.join(root,'public'),heldDir=path.join(root,'public.held');
  let callbacks=0,aliasInstalled=false,moved=false;
  try{
    fs.mkdirSync(publicDir);
    fs.writeFileSync(path.join(publicDir,'fixture.txt'),'PUBLIC_FIXTURE');
    fs.writeFileSync(path.join(outside,'fixture.txt'),'OUTSIDE_SENTINEL');
    const router=createSecurityToolRouter({
      guard:createAgentGuard({alert:false}),mode:'OBSERVE',workspaceRoot:root,verifyRealPaths:true,
      tools:{read_file:{operation:'file-read'}},
      executeRealTool:call=>{
        callbacks++;
        fs.renameSync(publicDir,heldDir);moved=true;
        fs.symlinkSync(outside,publicDir,process.platform==='win32'?'junction':'dir');aliasInstalled=true;
        return fs.readFileSync(path.join(root,String(call.args.path)),'utf8');
      },
    });
    await assert.rejects(router.dispatch({name:'read_file',args:{path:'public/fixture.txt'}}));
    assert.equal(callbacks,0);
    assert.equal(fs.readFileSync(path.join(outside,'fixture.txt'),'utf8'),'OUTSIDE_SENTINEL');
    assert.equal(fs.readFileSync(path.join(publicDir,'fixture.txt'),'utf8'),'PUBLIC_FIXTURE');
  }finally{
    if(aliasInstalled){try{if(process.platform==='win32')fs.rmdirSync(publicDir);else fs.unlinkSync(publicDir);}catch{}if(moved&&!fs.existsSync(publicDir))try{fs.renameSync(heldDir,publicDir);}catch{}}
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('OBSERVE enables real-path alias checks by default before callback dispatch',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-default-path-check-'));
  let callbacks=0;
  try{
    const secrets=path.join(root,'secrets');fs.mkdirSync(secrets);
    fs.writeFileSync(path.join(secrets,'fixture.txt'),'SYNTHETIC_SECRET_SENTINEL');
    fs.symlinkSync(secrets,path.join(root,'public'),process.platform==='win32'?'junction':'dir');
    const router=createSecurityToolRouter({
      guard:createAgentGuard({alert:false}),mode:'OBSERVE',workspaceRoot:root,
      tools:{read_file:{operation:'file-read'}},
      executeRealTool:()=>{callbacks++;return 'SHOULD_NOT_RUN';},
    });
    await assert.rejects(router.dispatch({name:'read_file',args:{path:'public/fixture.txt'}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(secrets,'fixture.txt'),'utf8'),'SYNTHETIC_SECRET_SENTINEL');
  }finally{
    const alias=path.join(root,'public');
    try{const s=fs.lstatSync(alias);if(s.isSymbolicLink()){if(process.platform==='win32')fs.rmdirSync(alias);else fs.unlinkSync(alias);}}catch{}
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('OBSERVE checks explicit pathArg aliases even when the tool is labeled sensitive-read',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-sensitive-read-patharg-'));
  let callbacks=0;
  try{
    const secrets=path.join(root,'secrets');fs.mkdirSync(secrets);
    fs.writeFileSync(path.join(secrets,'fixture.txt'),'SYNTHETIC_SECRET_SENTINEL');
    fs.symlinkSync(secrets,path.join(root,'public'),process.platform==='win32'?'junction':'dir');
    const router=createSecurityToolRouter({
      guard:createAgentGuard({alert:false}),mode:'OBSERVE',workspaceRoot:root,
      tools:{read_secret:{operation:'sensitive-read',pathArg:'resource'}},
      executeRealTool:()=>{callbacks++;return 'SHOULD_NOT_RUN';},
    });
    await assert.rejects(router.dispatch({name:'read_secret',args:{resource:'public/fixture.txt'}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(secrets,'fixture.txt'),'utf8'),'SYNTHETIC_SECRET_SENTINEL');
  }finally{
    const alias=path.join(root,'public');
    try{const s=fs.lstatSync(alias);if(s.isSymbolicLink()){if(process.platform==='win32')fs.rmdirSync(alias);else fs.unlinkSync(alias);}}catch{}
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('OBSERVE denies an in-workspace junction alias to a sensitive file before approval or callback',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-sensitive-alias-'));
  let callbacks=0;
  try{
    const secrets=path.join(root,'secrets');
    fs.mkdirSync(secrets);
    fs.writeFileSync(path.join(secrets,'fixture.txt'),'SYNTHETIC_SECRET_SENTINEL');
    fs.symlinkSync(secrets,path.join(root,'public'),process.platform==='win32'?'junction':'dir');
    const router=makeRouter(root,call=>{callbacks++;return fs.readFileSync(path.join(root,String(call.args.path)),'utf8');});
    await assert.rejects(router.dispatch({name:'read_file',args:{path:'public/fixture.txt'}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(secrets,'fixture.txt'),'utf8'),'SYNTHETIC_SECRET_SENTINEL');
  }finally{
    const alias=path.join(root,'public');
    try{const s=fs.lstatSync(alias);if(s.isSymbolicLink()){if(process.platform==='win32')fs.rmdirSync(alias);else fs.unlinkSync(alias);}}catch{}
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('OBSERVE denies a workspace junction to an outside file before callback',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-outside-root-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-outside-target-'));
  let callbacks=0;
  try{
    fs.writeFileSync(path.join(outside,'fixture.txt'),'OUTSIDE_SENTINEL');
    fs.symlinkSync(outside,path.join(root,'public'),process.platform==='win32'?'junction':'dir');
    const router=makeRouter(root,call=>{callbacks++;return fs.readFileSync(path.join(root,String(call.args.path)),'utf8');});
    await assert.rejects(router.dispatch({name:'read_file',args:{path:'public/fixture.txt'}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(outside,'fixture.txt'),'utf8'),'OUTSIDE_SENTINEL');
  }finally{
    const alias=path.join(root,'public');
    try{const s=fs.lstatSync(alias);if(s.isSymbolicLink()){if(process.platform==='win32')fs.rmdirSync(alias);else fs.unlinkSync(alias);}}catch{}
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('OBSERVE denies sensitive paths and normalization aliases before approval or callback',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-normalization-'));
  let callbacks=0;
  try{
    const secrets=path.join(root,'secrets');fs.mkdirSync(secrets);
    fs.writeFileSync(path.join(secrets,'fixture.txt'),'SYNTHETIC_SECRET_SENTINEL');
    fs.writeFileSync(path.join(root,'public.txt'),'PUBLIC_FIXTURE');
    const router=makeRouter(root,call=>{callbacks++;return fs.readFileSync(path.join(root,String(call.args.path)),'utf8');});
    for(const target of ['secrets/fixture.txt','public.txt/../secrets/fixture.txt','./public.txt'])
      await assert.rejects(router.dispatch({name:'read_file',args:{path:target}}));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(path.join(secrets,'fixture.txt'),'utf8'),'SYNTHETIC_SECRET_SENTINEL');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('OBSERVE denies a hard-link alias before approval or callback',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-observe-hardlink-'));
  let callbacks=0;
  try{
    const source=path.join(root,'source.txt'),alias=path.join(root,'public.txt');
    fs.writeFileSync(source,'SYNTHETIC_SECRET_SENTINEL');
    try{fs.linkSync(source,alias);}catch{t.skip('Hard links are unavailable on this filesystem');return;}
    const router=makeRouter(root,call=>{callbacks++;return fs.readFileSync(path.join(root,String(call.args.path)),'utf8');});
    await assert.rejects(router.dispatch({name:'read_file',args:{path:'public.txt'} }));
    assert.equal(callbacks,0);
    assert.deepEqual(router.pendingApprovals(),[]);
    assert.equal(fs.readFileSync(source,'utf8'),'SYNTHETIC_SECRET_SENTINEL');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
