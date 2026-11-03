import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

test('fixed-target MCP child process returns only registered file content and denies a live parent alias swap',async t=>{
  const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-protected-mcp-'));
  const notes=path.join(workspace,'notes'),outside=fs.mkdtempSync(path.join(os.tmpdir(),'agent-canary-protected-mcp-outside-'));
  const notesHeld=path.join(workspace,'notes-held'),target=path.join(notes,'brief.txt'),outsideTarget=path.join(outside,'brief.txt');
  const safeContent='MCP_SAFE_REGISTERED_TARGET_CONTENT',secondContent='MCP_SECOND_REGISTERED_TARGET_CONTENT',outsideContent='MCP_OUTSIDE_ALIAS_SECRET_MUST_NOT_ESCAPE';
  fs.mkdirSync(notes);fs.writeFileSync(target,safeContent);fs.writeFileSync(path.join(notes,'context.txt'),secondContent);fs.writeFileSync(outsideTarget,outsideContent);
  const transport=new StdioClientTransport({
    command:process.execPath,
    args:[path.resolve('dist/competition.js'),'serve-protected','--workspace-root',workspace,'--path','notes/brief.txt','--path','notes/context.txt'],
    cwd:process.cwd(),stderr:'pipe',
  });
  const client=new Client({name:'agent-canary-protected-mcp-test',version:'1.0.0'});
  let stderr='',parentMoved=false;transport.stderr?.on('data',(chunk:Buffer)=>{stderr+=chunk.toString('utf8');});
  try{
    await client.connect(transport);
    const listed=await client.listTools(),reader=listed.tools.find(tool=>tool.name==='read_file');
    assert.ok(reader,'the real MCP child process must expose the configured read tool');
    assert.deepEqual((reader.inputSchema as any).properties.path.enum,['notes/brief.txt','notes/context.txt']);
    assert.equal(listed.tools.some(tool=>tool.name==='write_file'),false,'the protected MCP process exposes no write tool');

    const positive=await client.callTool({name:'read_file',arguments:{path:'notes/brief.txt'}});
    assert.equal(positive.isError,undefined);
    assert.ok(JSON.stringify(positive).includes(safeContent));
    assert.equal(JSON.stringify(positive).includes(outsideContent),false);
    const second=await client.callTool({name:'read_file',arguments:{path:'notes/context.txt'}});
    assert.equal(second.isError,undefined);
    assert.ok(JSON.stringify(second).includes(secondContent));

    const traversal=await client.callTool({name:'read_file',arguments:{path:'../brief.txt'}});
    assert.equal(traversal.isError,true,'M1/M2/M5 must deny a model-supplied path outside the registered allowlist');
    assert.equal(JSON.stringify(traversal).includes(outsideContent),false);

    try{fs.renameSync(notes,notesHeld);parentMoved=true;}
    catch(error){
      const code=(error as NodeJS.ErrnoException).code;
      assert.equal(process.platform,'win32','only the Windows host may prevent replacement through its live file handle');
      assert.ok(code==='EPERM'||code==='EACCES'||code==='EBUSY',`unexpected parent replacement error: ${code}; ${stderr.slice(-1000)}`);
    }
    let replacementOutcome:string;
    if(parentMoved){
      fs.symlinkSync(outside,notes,'dir');
      const alias=await client.callTool({name:'read_file',arguments:{path:'notes/brief.txt'}});
      assert.equal(alias.isError,true,'the live MCP route must deny a workspace parent replaced by an external junction/symlink');
      assert.equal(JSON.stringify(alias).includes(outsideContent),false);
      replacementOutcome='filesystem replacement succeeded; the live MCP route denied it without returning the outside canary';
    }else{
      const stillBound=await client.callTool({name:'read_file',arguments:{path:'notes/brief.txt'}});
      assert.equal(stillBound.isError,undefined,'when Windows prevents the directory rename, the held target remains readable');
      assert.ok(JSON.stringify(stillBound).includes(safeContent));
      assert.equal(JSON.stringify(stillBound).includes(outsideContent),false);
      replacementOutcome='Windows denied parent rename while the target handle was live; the MCP route still returned only the registered file';
    }
    t.diagnostic(replacementOutcome);
  }finally{
    await client.close().catch(()=>{});
    if(parentMoved){
      try{if(fs.lstatSync(notes).isSymbolicLink())fs.unlinkSync(notes);}catch{}
      try{if(fs.existsSync(notesHeld)&&!fs.existsSync(notes))fs.renameSync(notesHeld,notes);}catch{}
    }
    fs.rmSync(workspace,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});
  }
});
