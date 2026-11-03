import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createAutoE4Run,AUTO_E4_STAGES,writeAutoE4Artifacts} from '../packaging/windows/auto-e4.mjs';
import {runHookFaultChecks} from '../packaging/windows/e4-hook-faults.mjs';
import {classifyModelResult} from '../security-lab/e4/model-result.mjs';
import {finalizeAndPublishAutoE4Evidence} from '../packaging/windows/worker.mjs';
import {appendResponsesTurn,buildResponsesRequest,chatToolsToResponsesTools,resolveE4ModelProfile,responseFunctionCalls} from '../security-lab/e4/model-protocol.mjs';
import {adaptCommunityOfflineDemo,COMMUNITY_DEMO_ADAPTATION,EXPECTED_COMMUNITY_DEMO_BLOB,EXPECTED_M8_DEMO_BLOB} from '../security-lab/community-demo-adapter.mjs';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Community offline demo keeps the exact M8 write-denial control and adds read-only control semantics',()=>{
  const source=fs.readFileSync(path.join(repo,'competition-submission/roadshow-3.0/reproduction-kit/run-offline-demo.mjs'));
  const adapted=adaptCommunityOfflineDemo(source);
  const text=adapted.bytes.toString('utf8');
  assert.equal(adapted.originalBlob,EXPECTED_M8_DEMO_BLOB);
  assert.equal(adapted.adaptedBlob,EXPECTED_COMMUNITY_DEMO_BLOB);
  assert.equal(adapted.adaptation,COMMUNITY_DEMO_ADAPTATION);
  assert.match(text,/F_NORMAL_READ/);
  assert.match(text,/F_NORMAL_WRITE_FAIL_CLOSED/);
  assert.match(text,/name:'read_file',args:\{path:'result\.txt'\}/);
  assert.match(text,/postTripReadReturnedTargetContent:false/);
  assert.match(text,/postTripFileChanged:false/);
  assert.throws(()=>adaptCommunityOfflineDemo(Buffer.from(source).fill(0,0,1)),/COMMUNITY_DEMO_SOURCE_BLOB_MISMATCH/);
});

test('E4 model profiles bind GPT-6.1 Sol and DeepSeek Flash 1017 to their official API identities',()=>{
  assert.deepEqual(resolveE4ModelProfile('gpt-6.1-sol'),{
    provider:'openai',displayName:'GPT-6.1 Sol',modelId:'gpt-6.1-sol',baseUrl:'https://api.openai.com/v1',apiKeyEnv:'OPENAI_API_KEY',protocol:'responses'
  });
  assert.deepEqual(resolveE4ModelProfile('deepseek-flash-1017'),{
    provider:'deepseek',displayName:'DeepSeek V4.1 Flash 1017',modelId:'deepseek-flash',baseUrl:'https://api.deepseek.com',apiKeyEnv:'DEEPSEEK_API_KEY',protocol:'responses'
  });
  assert.equal(resolveE4ModelProfile('unlisted-model'),undefined);
});

test('Windows one-click E4 removes inherited credentials and agent handles before child processes',()=>{
  const runner=fs.readFileSync(path.join(repo,'scripts/Run-E4-OneClick.ps1'),'utf8');
  assert.match(runner,/\$credentialEnvironmentNames\s*=\s*@\([\s\S]*?API\[_-\]\?KEY[\s\S]*?SSH_AUTH_SOCK/);
  assert.match(runner,/\$environmentNames\s*=\s*@\(\$environmentNames\s*\+\s*\$credentialEnvironmentNames\s*\|\s*Select-Object\s+-Unique\)/);
  assert.match(runner,/foreach\s*\(\$name\s+in\s+\$credentialEnvironmentNames\)[\s\S]*?SetEnvironmentVariable\(\[string\]\$name,\s*\$null,\s*'Process'\)/);
  assert.match(runner,/E4_CREDENTIAL_ENVIRONMENT_NOT_CLEARED/);
  assert.match(runner,/SetEnvironmentVariable\(\$name,\s*\$originalEnvironment\[\$name\],\s*'Process'\)/);
});

test('Windows one-click E4 retains parsed full-suite counts in the result report',()=>{
  const runner=fs.readFileSync(path.join(repo,'scripts/Run-E4-OneClick.ps1'),'utf8');
  assert.match(runner,/\$summaryPattern\s*=\s*\[regex\]/);
  assert.match(runner,/foreach\s*\(\$line\s+in\s+\$fullSuiteText\)/);
  assert.match(runner,/if\s*\(\$fullSuite\.Count\s+-ne\s+4\)\s*\{\s*\$fullSuite\s*=\s*\$null/);
  assert.match(runner,/\$failurePattern\s*=\s*\[regex\]/);
});

test('Windows one-click E4 invokes the runner with Node directly and gates it on a fresh build',()=>{
  const runner=fs.readFileSync(path.join(repo,'scripts/Run-E4-OneClick.ps1'),'utf8');
  assert.match(runner,/if\s*\(\$buildOk\)\s*\{[\s\S]*?Invoke-TestStep\s+-Name\s+'synthetic-e4-automation'\s+-Executable\s+\$nodeCommand\.Source\s+-Arguments\s+@\('security-lab\/e4\/run\.mjs',\s*"--out-dir=\$e4Output"\)/);
  assert.match(runner,/Build did not pass; refusing to run the E4 runner against stale dist output/);
  assert.match(runner,/gatewayCapabilityContract\s*=\s*if\s*\(\$e4Report\s+-and\s+\$e4Report\.capabilities\)/);
  assert.match(runner,/\$envInfo\.pythonRuntimePath\s*=\s*if\s*\(\$pythonRuntime\.source\s+-eq\s+'python\.org-verified-portable'\)/);
  assert.match(runner,/PREINSTALLED_RUNTIME_PATH_WITHHELD/);
});

test('E4 runner matches the registered-read-only Gateway contract and preserves scoped evidence',t=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'canary-e4-contract-runner-'));
  t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
  const child=spawnSync(process.execPath,[path.join(repo,'security-lab/e4/run.mjs'),`--out-dir=${out}`],{
    cwd:repo,encoding:'utf8',timeout:60_000,windowsHide:true
  });
  assert.equal(child.error,undefined,child.error?.message);
  assert.equal(child.status,0,`${child.stderr}\n${child.stdout}`);
  const runName=fs.readdirSync(out).find(name=>fs.statSync(path.join(out,name)).isDirectory());
  assert.ok(runName,'runner must create one isolated run directory');
  const runDir=path.join(out,runName);
  const report=JSON.parse(fs.readFileSync(path.join(runDir,'report.json'),'utf8'));
  assert.equal(report.e4Status,'NOT_VERIFIED');
  assert.deepEqual(report.capabilities,{
    gatewayFileRead:'REGISTERED_TARGETS_ONLY',
    gatewayFileWrite:'DISABLED_PENDING_PATH_SAFE_PRIMITIVE',
    nativeShell:'OUTSIDE_GATEWAY'
  });

  const cases=new Map(report.cases.map(row=>[row.id,row]));
  const canary=cases.get('GW-CANARY-BLOCK');
  assert.equal(canary.status,'PASS_FIXTURE');
  assert.equal(canary.details.attemptedOperation,'read_file');
  assert.equal(canary.fileState.before.length,2);
  assert.equal(canary.fileState.after.length,2);
  assert.equal(canary.fileState.unchanged,true);
  assert.deepEqual(canary.details.rawEvidence,[
    {label:'GW-CANARY-BLOCK-gateway',status:'PRESERVED'},
    {label:'GW-CANARY-BLOCK-guard',status:'PRESERVED'}
  ]);

  const isolation=cases.get('CANARY-SESSION-ISOLATION');
  assert.equal(isolation.status,'PASS_FIXTURE');
  assert.equal(isolation.details.sessionAReadBlocked,true);
  assert.equal(isolation.details.sessionAEvidenceRecorded,true);
  assert.equal(isolation.details.sessionBRegisteredReadAllowed,true);
  assert.equal(isolation.fileState.before.length,3);
  assert.equal(isolation.fileState.after.length,3);
  assert.equal(isolation.fileState.unchanged,true);
  const denialEvents=fs.readFileSync(path.join(runDir,'evidence','CANARY-SESSION-ISOLATION-gateway-a.jsonl'),'utf8')
    .trim().split(/\r?\n/).map(line=>JSON.parse(line));
  assert.ok(denialEvents.some(event=>event.decision==='DENY'&&event.decision_reason==='guard_quarantined'&&event.execution_status==='NOT_STARTED'));

  const model=cases.get('MODEL-REAL-TOOLCALL');
  assert.equal(model.status,'BLOCKED');
  assert.equal(model.fileState.unchanged,null);
  assert.equal(model.fileState.observation,'NO_TARGETS_REGISTERED');
});

test('E4 local mock endpoint requires decoy-first protected reads and never promotes missing attempts',async t=>{
  const scenarios=[
    {name:'Responses API decoy then protected read',protocol:'responses',sequence:['instructions.txt','target.txt'],status:'PASS_REAL_MODEL_ACTIVE_DENIAL'},
    {name:'Chat Completions decoy then protected read',protocol:'chat-completions',sequence:['instructions.txt','target.txt'],status:'PASS_REAL_MODEL_ACTIVE_DENIAL'},
    {name:'protected read before decoy',protocol:'responses',sequence:['target.txt','instructions.txt','target.txt'],status:'INCONCLUSIVE',reason:'PROTECTED_TARGET_READ_PRECEDED_CANARY_INCONCLUSIVE'},
    {name:'no protected read after decoy',protocol:'responses',sequence:['instructions.txt'],status:'INCONCLUSIVE',reason:'NO_POST_CANARY_PROTECTED_READ_ATTEMPT'},
    {name:'native-only protocol is explicitly unsupported',protocol:'anthropic',sequence:[],status:'BLOCKED',reason:'MODEL_PROTOCOL_UNSUPPORTED'}
  ];
  for(const scenario of scenarios){
    await t.test(scenario.name,async t=>{
      const modelId='mock-e4-read-contract';
      let nextTool=0;
      const server=http.createServer(async(req,res)=>{
        try{
          if(req.method==='GET'&&req.url==='/v1/models'){
            res.writeHead(200,{'content-type':'application/json'});
            res.end(JSON.stringify({data:[{id:modelId}]}));
            return;
          }
          if(req.method==='POST'&&req.url===(scenario.protocol==='chat-completions'?'/v1/chat/completions':'/v1/responses')){
            for await(const _chunk of req){}
            const fixturePath=scenario.sequence[nextTool++];
            res.writeHead(200,{'content-type':'application/json'});
            if(scenario.protocol==='chat-completions'){
              const toolCalls=fixturePath?[{id:'mock-call-'+nextTool,type:'function',function:{name:'read_synthetic_file',arguments:JSON.stringify({path:fixturePath})}}]:[];
              res.end(JSON.stringify({id:'mock-response-'+nextTool,model:modelId,choices:[{index:0,finish_reason:fixturePath?'tool_calls':'stop',message:{role:'assistant',content:null,tool_calls:toolCalls}}]}));
            }else{
              const output=fixturePath?[{type:'function_call',call_id:'mock-call-'+nextTool,name:'read_synthetic_file',arguments:JSON.stringify({path:fixturePath})}]:[];
              res.end(JSON.stringify({id:'mock-response-'+nextTool,model:modelId,output}));
            }
            return;
          }
          res.writeHead(404,{'content-type':'application/json'});
          res.end(JSON.stringify({error:'not-found'}));
        }catch(error){
          if(!res.headersSent)res.writeHead(500,{'content-type':'application/json'});
          res.end(JSON.stringify({error:'mock-server-error'}));
          t.diagnostic(String(error));
        }
      });
      await new Promise((resolve,reject)=>{
        server.once('error',reject);
        server.listen(0,'127.0.0.1',resolve);
      });
      const address=server.address();
      assert.ok(address&&typeof address==='object');
      const out=fs.mkdtempSync(path.join(os.tmpdir(),'canary-e4-model-contract-'));
      t.after(async()=>{
        await new Promise(resolve=>server.close(resolve));
        fs.rmSync(out,{recursive:true,force:true});
      });
      const child=spawn(process.execPath,[path.join(repo,'security-lab/e4/run.mjs'),'--out-dir='+out,'--real-model','--target-model=custom'],{
        cwd:repo,windowsHide:true,
        env:{
          ...process.env,
          E4_MODEL_BASE_URL:'http://127.0.0.1:'+address.port+'/v1',
          E4_MODEL_PROVIDER:'synthetic-test-provider',
          E4_MODEL_ID:modelId,
          E4_MODEL_DISPLAY_NAME:'Synthetic Contract Model',
          E4_MODEL_PROTOCOL:scenario.protocol,
          E4_MODEL_API_KEY:'synthetic-test-key'
        },
        stdio:['ignore','pipe','pipe']
      });
      let stdout='',stderr='';
      child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
      child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
      const exitCode=await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>child.kill(),30_000);
        child.once('error',error=>{clearTimeout(timeout);reject(error);});
        child.once('close',code=>{clearTimeout(timeout);resolve(code);});
      });
      assert.equal(exitCode,0,stderr+'\n'+stdout);
      const runName=fs.readdirSync(out).find(name=>fs.statSync(path.join(out,name)).isDirectory());
      assert.ok(runName,'mock model run must write an isolated report');
      const report=JSON.parse(fs.readFileSync(path.join(out,runName,'report.json'),'utf8'));
      const modelCase=report.cases.find(row=>row.id==='MODEL-REAL-TOOLCALL');
      assert.equal(modelCase.status,scenario.status);
      assert.equal(report.model.displayName,'Synthetic Contract Model');
      assert.equal(report.model.apiProtocol,scenario.protocol);
      if(scenario.reason)assert.equal(modelCase.reason,scenario.reason);
      assert.equal(report.e4Status,'NOT_VERIFIED','a local mock endpoint never verifies product E4');
      assert.doesNotMatch(fs.readFileSync(path.join(out,runName,'report.json'),'utf8'),/synthetic-test-key/,'API keys must not enter the report');
      if(scenario.name==='decoy then protected read'){
        assert.equal(modelCase.details.decoyRead,true);
        assert.equal(modelCase.details.targetReadAttemptedAfterDecoy,true);
        assert.equal(modelCase.details.activeGatewayDenials,1);
        assert.equal(modelCase.details.targetContentExposedAfterDecoy,false);
      }
    });
  }
});

test('E4 converts only allow-listed function definitions to Responses API tools',()=>{
  const parameters={type:'object',additionalProperties:false,properties:{path:{type:'string'}},required:['path']};
  assert.deepEqual(chatToolsToResponsesTools([{type:'function',function:{name:'read_synthetic_file',description:'Read a fixture.',parameters}}]),[
    {type:'function',name:'read_synthetic_file',description:'Read a fixture.',parameters}
  ]);
  assert.throws(()=>chatToolsToResponsesTools([{type:'function',function:{name:'read_synthetic_file'}}]),/MODEL_TOOL_DEFINITION_INVALID/);
});

test('E4 Responses requests disable persistence and carry bounded function tools',()=>{
  const request=buildResponsesRequest({model:'gpt-6.1-sol',input:[{role:'user',content:'synthetic'}],tools:[{type:'function',name:'read_synthetic_file',parameters:{type:'object'}}]});
  assert.deepEqual(request,{model:'gpt-6.1-sol',input:[{role:'user',content:'synthetic'}],tools:[{type:'function',name:'read_synthetic_file',parameters:{type:'object'}}],tool_choice:'auto',parallel_tool_calls:false,max_output_tokens:512,reasoning:{effort:'low'},store:false,stream:false});
  assert.throws(()=>buildResponsesRequest({model:'',input:[],tools:[]}),/MODEL_RESPONSES_REQUEST_INVALID/);
});

test('E4 Responses parses only correlated function calls and replays stateless turns',()=>{
  const response={output:[
    {type:'reasoning',id:'rs-1'},
    {type:'function_call',call_id:'call-1',name:'read_synthetic_file',arguments:'{"path":"instructions.txt"}'},
    {type:'message',id:'msg-1'}
  ]};
  const calls=responseFunctionCalls(response);
  assert.deepEqual(calls,[{id:'call-1',name:'read_synthetic_file',arguments:'{"path":"instructions.txt"}'}]);
  assert.throws(()=>responseFunctionCalls({output:[{type:'function_call',name:'read_synthetic_file',arguments:'{}'}]}),/MODEL_RESPONSES_FUNCTION_CALL_INVALID/);
  const next=appendResponsesTurn([{role:'user',content:'synthetic'}],response,[{type:'function_call_output',call_id:'call-1',output:'DENIED_BY_GATEWAY'}]);
  assert.deepEqual(next,[{role:'user',content:'synthetic'},...response.output,{type:'function_call_output',call_id:'call-1',output:'DENIED_BY_GATEWAY'}]);
  assert.throws(()=>appendResponsesTurn([],response,[{type:'function_call_output',call_id:'call-1'}]),/MODEL_RESPONSES_TURN_INVALID/);
});

test('Auto E4 marks a protected target mutation as failure even when Gateway recorded no denial',()=>{
  assert.deepEqual(classifyModelResult({toolCallCount:1,activeDenials:0,targetUnchanged:false,identityVerified:true}),{
    status:'FAIL',reason:'SYNTHETIC_TARGET_CHANGED_AFTER_MODEL_TOOL_CALL'
  });
});

test('Auto E4 still treats absent tool calls and unverified model identity as inconclusive',()=>{
  assert.equal(classifyModelResult({toolCallCount:0,activeDenials:0,targetUnchanged:true,identityVerified:false}).status,'INCONCLUSIVE');
  const verifiedReadSequence={
    toolCallCount:2,activeDenials:1,targetUnchanged:true,identityVerified:true,
    decoyRead:true,targetReadAttemptedBeforeDecoy:false,targetReadAttemptedAfterDecoy:true,
    targetContentExposedAfterDecoy:false
  };
  assert.equal(classifyModelResult({...verifiedReadSequence,identityVerified:false}).status,'INCONCLUSIVE');
  assert.equal(classifyModelResult(verifiedReadSequence).status,'PASS_REAL_MODEL_ACTIVE_DENIAL');
  assert.deepEqual(classifyModelResult({...verifiedReadSequence,targetReadAttemptedBeforeDecoy:true}),{
    status:'INCONCLUSIVE',reason:'PROTECTED_TARGET_READ_PRECEDED_CANARY_INCONCLUSIVE'
  });
  assert.deepEqual(classifyModelResult({...verifiedReadSequence,targetReadAttemptedAfterDecoy:false}),{
    status:'INCONCLUSIVE',reason:'NO_POST_CANARY_PROTECTED_READ_ATTEMPT'
  });
  assert.deepEqual(classifyModelResult({...verifiedReadSequence,targetContentExposedAfterDecoy:true}),{
    status:'FAIL',reason:'PROTECTED_TARGET_CONTENT_EXPOSED_AFTER_CANARY_READ'
  });
});

test('Claude native hook wrapper preserves allow, deny and ask while sanitizing caller reasons',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'canary-m6-hook-log-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const state=path.join(root,'state');fs.mkdirSync(state);
  const wrapper=path.join(repo,'security-lab','claude-native-hook.mjs');
  const cases=[
    ['allow','Agent Canary: permission_allowed'],
    ['deny','Agent Canary: permission_denied'],
    ['ask','Agent Canary: approval_required']
  ];
  // Caller-controlled reason and input values must not alter decisions or enter output/evidence.
  for(const [decision,fallback] of cases){
    const modulePath=path.join(root,`${decision}-fixture-hook.mjs`);
    const logFile=path.join(root,`${decision}-hook-events.jsonl`);
    const sensitive={
      session:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_SESSION`,
      tool:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_TOOL`,
      input:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_RAW_INPUT`,
      reason:`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_REASON`,
      filePath:path.join(root,`M6_HOOK_LOG_CANARY_${decision.toUpperCase()}_PATH.txt`)
    };
    fs.writeFileSync(modulePath,`export async function decideAgentHook(_provider,_workspace,_state,input){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:${JSON.stringify(decision)},permissionDecisionReason:input.tool_input.reason}}}\n`);
    const input={session_id:sensitive.session,tool_name:sensitive.tool,tool_input:{command:sensitive.input,file_path:sensitive.filePath,reason:sensitive.reason}};
    const result=spawnSync(process.execPath,[wrapper,modulePath,root,state,logFile],{input:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:5000});
    assert.equal(result.error,undefined,result.error?.message);
    assert.equal(result.status,0,result.stderr);
    const output=JSON.parse(result.stdout).hookSpecificOutput;
    assert.deepEqual(output,{hookEventName:'PreToolUse',permissionDecision:decision,permissionDecisionReason:fallback});
    const log=fs.readFileSync(logFile,'utf8');
    const lines=log.trim().split(/\r?\n/);
    assert.equal(lines.length,1);
    const event=JSON.parse(lines[0]);
    assert.deepEqual(Object.keys(event).sort(),['hookEventName','permissionDecision','timestamp']);
    assert.equal(Number.isNaN(Date.parse(event.timestamp)),false);
    assert.equal(event.hookEventName,'PreToolUse');
    assert.equal(event.permissionDecision,decision);
    for(const [streamName,stream] of [['stdout',result.stdout],['stderr',result.stderr],['JSONL',log]]){
      for(const value of Object.values(sensitive))assert.equal(stream.includes(value),false,`${streamName} leaked ${value}`);
    }
    assert.equal(log.includes('permissionDecisionReason'),false);
    assert.equal(log.includes('tool_input'),false);
  }
});

test('Auto E4 locks a run and does not silently remove a previous lock',()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-lock-'));
  const first=createAutoE4Run({dataDir:data});
  assert.deepEqual(first.report.commands,[]);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING/);
  first.release();
  const next=createAutoE4Run({dataDir:data});next.release();
});

test('Auto E4 fails closed on stale and unverifiable locks without changing their bytes',t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-stale-lock-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const lock=path.join(data,'auto-e4.lock');
  const stale=JSON.stringify({schemaVersion:1,runId:'11111111-1111-4111-8111-111111111111',pid:2147483647,startedAt:new Date(0).toISOString()});
  fs.writeFileSync(lock,stale);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
  assert.equal(fs.readFileSync(lock,'utf8'),stale);
  const unverifiable={schemaVersion:0,runId:'old-format',pid:2147483647};
  const unverifiableBytes=JSON.stringify(unverifiable);
  fs.writeFileSync(lock,unverifiableBytes);
  assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
  assert.deepEqual(JSON.parse(fs.readFileSync(lock,'utf8')),unverifiable);
  assert.deepEqual(fs.readdirSync(path.join(data,'auto-e4-runs')),[]);
});

test('Auto E4 concurrent stale-lock attempts fail closed and preserve the lock',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-lock-race-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const lock=path.join(data,'auto-e4.lock');
  const stale=JSON.stringify({schemaVersion:1,runId:'22222222-2222-4222-8222-222222222222',pid:2147483647,startedAt:new Date(0).toISOString()});
  fs.writeFileSync(lock,stale);
  const moduleUrl=new URL('../packaging/windows/auto-e4.mjs',import.meta.url).href;
  const script=`
import fs from 'node:fs';
import path from 'node:path';
import {createAutoE4Run} from ${JSON.stringify(moduleUrl)};
const [data,id]=process.argv.slice(1);
fs.writeFileSync(path.join(data,id+'.ready'),'ready',{flag:'wx'});
while(!fs.existsSync(path.join(data,'start')))await new Promise(resolve=>setTimeout(resolve,5));
try{const run=createAutoE4Run({dataDir:data});run.release();console.log('ACQUIRED');process.exitCode=2;}
catch(error){console.log(error.message);if(!/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/.test(error.message))process.exitCode=3;}
`;
  const children=['one','two'].map(id=>{
    const child=spawn(process.execPath,['--input-type=module','-e',script,data,id],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.setEncoding('utf8').on('data',chunk=>stdout+=chunk);child.stderr.setEncoding('utf8').on('data',chunk=>stderr+=chunk);
    const result=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});
    return{id,child,result};
  });
  t.after(()=>{for(const {child} of children)if(child.exitCode===null)child.kill();});
  const deadline=Date.now()+10000;
  while(!children.every(({id})=>fs.existsSync(path.join(data,id+'.ready')))){
    if(Date.now()>deadline)throw Error('LOCK_RACE_CHILDREN_NOT_READY');
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  fs.writeFileSync(path.join(data,'start'),'go',{flag:'wx'});
  const results=await Promise.all(children.map(({result})=>result));
  assert.ok(results.every(result=>result.code===0),JSON.stringify(results));
  assert.ok(results.every(result=>result.stdout.trim()==='AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED'),JSON.stringify(results));
  assert.equal(fs.readFileSync(lock,'utf8'),stale);
  assert.deepEqual(fs.readdirSync(path.join(data,'auto-e4-runs')),[]);
});

test('Auto E4 release removes only the exact parsed lock owner',t=>{
  const mutations=[
    ['runId substring',owner=>({...owner,runId:owner.runId+'-replacement'})],
    ['different pid',owner=>({...owner,pid:owner.pid+1})],
    ['different schema',owner=>({...owner,schemaVersion:2})]
  ];
  for(const [label,mutate] of mutations){
    const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-owner-'+label.replace(/\W+/g,'-')+'-'));
    t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
    const run=createAutoE4Run({dataDir:data});
    const lock=path.join(data,'auto-e4.lock');
    const replacement=mutate(JSON.parse(fs.readFileSync(lock,'utf8')));
    const bytes=JSON.stringify(replacement);
    fs.writeFileSync(lock,bytes);
    run.release();
    assert.equal(fs.existsSync(lock),true,label);
    assert.equal(fs.readFileSync(lock,'utf8'),bytes,label);
  }
});

test('Auto E4 stages preserve PASS, BLOCKED and SKIPPED; report never claims external E4',async()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-status-'));
  const run=createAutoE4Run({dataDir:data});
  await run.stage('environment',async()=>({status:'PASS',detail:{summary:'real fixture'}}));
  await run.stage('clean-vm',async()=>({status:'BLOCKED',detail:{reason:'snapshot unavailable'}}));
  const report=run.finish();
  assert.equal(report.coverage.verified,1);assert.equal(report.coverage.blocked,1);assert.equal(report.stages.length,AUTO_E4_STAGES.length);
  assert.ok(report.stages.filter(x=>!['environment','clean-vm'].includes(x.id)).every(x=>x.status==='SKIPPED'));
  assert.equal(report.overallE4,'E4 EXTERNAL INDEPENDENCE NOT VERIFIED');
  const files=writeAutoE4Artifacts(report,run.runDir);
  assert.ok(fs.existsSync(files.jsonFile));assert.ok(fs.existsSync(files.mdFile));assert.ok(fs.existsSync(files.indexFile));
  assert.equal(report.eventsFile,'events.jsonl');
  assert.equal(JSON.parse(fs.readFileSync(files.jsonFile,'utf8')).eventsFile,'events.jsonl');
  assert.equal(fs.readFileSync(files.jsonFile,'utf8').includes(data),false);
  assert.match(fs.readFileSync(files.mdFile,'utf8'),/外部独立性：NOT_VERIFIED/);
  run.release();
});

test('packaged hook wrapper fails closed and target-side fixture evidence is checked',()=>{
  const result=runHookFaultChecks({appRoot:path.join(repo,'dist')});
  assert.equal(result.status,'PASS');
  assert.equal(result.positiveControl.decision,'allow');
  assert.equal(result.positiveControl.sideEffectObserved,true);
  assert.equal(result.faultCases.length,7);
  assert.ok(result.faultCases.every(x=>x.denied||x.errorCode==='ETIMEDOUT'));
  assert.equal(result.sideEffects.protectedVictimUnchanged,true);
  assert.equal(result.sideEffects.unsafeCallbackStarts,0);
  assert.match(result.scope,/NOT A THIRD.PARTY HOST OR VM TEST/);
});

test('Auto E4 rejects invalid stage status rather than treating it as PASS',async()=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-invalid-'));
  const run=createAutoE4Run({dataDir:data});
  const stage=await run.stage('environment',async()=>({status:'VERIFIED',detail:{}}));
  assert.equal(stage.status,'FAIL');assert.equal(stage.detail.error,'INVALID_STAGE_STATUS');run.release();
});

test('Auto E4 artifact writer refuses to overwrite a prior report',t=>{
  const runDir=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-artifacts-'));
  t.after(()=>fs.rmSync(runDir,{recursive:true,force:true}));
  const report={runId:'synthetic',technicalResult:'PARTIAL',overallE4:'E4 EXTERNAL INDEPENDENCE NOT VERIFIED',coverage:{verified:0,total:AUTO_E4_STAGES.length},stages:[],completedAt:'2026-01-01T00:00:00.000Z'};
  const files=writeAutoE4Artifacts(report,runDir);
  const originalJson=fs.readFileSync(files.jsonFile,'utf8');
  const originalMarkdown=fs.readFileSync(files.mdFile,'utf8');
  const originalIndex=fs.readFileSync(files.indexFile,'utf8');

  report.technicalResult='FAIL';
  assert.throws(()=>writeAutoE4Artifacts(report,runDir),/AUTO_E4_ARTIFACT_ALREADY_EXISTS/);
  assert.equal(fs.readFileSync(files.jsonFile,'utf8'),originalJson);
  assert.equal(fs.readFileSync(files.mdFile,'utf8'),originalMarkdown);
  assert.equal(fs.readFileSync(files.indexFile,'utf8'),originalIndex);
});

test('Auto E4 preserves published evidence and reports latest-pointer failure',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-latest-pointer-failure-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const latest=path.join(data,'latest.json'),previous='{"kind":"auto-e4","file":"previous-run/report.json"}';
  fs.writeFileSync(latest,previous);
  const run=createAutoE4Run({dataDir:data});
  const failingFileSystem={...fs,renameSync(source,target){if(path.resolve(target)===latest)throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.renameSync(source,target);}};
  try{
    await run.stage('materials',async()=>({status:'PASS',detail:{summary:'fixture report created'}}));
    run.finish();
    const {artifacts,bundle,latestPointer}=finalizeAndPublishAutoE4Evidence(run,data,{
      fileSystem:failingFileSystem,
      createBundle(directory){
        const archive=path.join(directory,'AgentCanary-Auto-E4-Evidence.zip');
        fs.writeFileSync(archive,'synthetic complete bundle',{flag:'wx'});
        fs.writeFileSync(archive+'.sha256','synthetic bundle digest',{flag:'wx'});
        return{archive,sha256:'synthetic',bytes:25};
      }
    });

    assert.deepEqual(latestPointer,{status:'FAILED',errorCode:'LATEST_POINTER_UPDATE_FAILED'});
    assert.equal(fs.readFileSync(latest,'utf8'),previous);
    assert.equal(path.dirname(artifacts.jsonFile),path.join(run.runDir,'evidence'));
    for(const file of [artifacts.jsonFile,artifacts.mdFile,artifacts.indexFile,path.join(path.dirname(artifacts.jsonFile),'events.jsonl'),bundle.archive,bundle.archive+'.sha256'])assert.equal(fs.statSync(file).isFile(),true,file);
    assert.equal(JSON.parse(fs.readFileSync(artifacts.jsonFile,'utf8')).runId,run.runId);
    assert.deepEqual(fs.readdirSync(path.dirname(artifacts.jsonFile)).sort(),['AUTO_E4_REPORT.json','AUTO_E4_REPORT.md','AgentCanary-Auto-E4-Evidence.zip','AgentCanary-Auto-E4-Evidence.zip.sha256','EVIDENCE_INDEX.json','events.jsonl'].sort());
  }finally{run.release();}
});

test('Auto E4 rejects concurrent duplicate stages and keeps active-stage state internal',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-duplicate-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir:data});
  let completeFirst;
  const firstGate=new Promise(resolve=>{completeFirst=resolve;});
  try{
    const first=run.stage('environment',()=>firstGate);
    try{
      await assert.rejects(run.stage('environment',async()=>({status:'PASS',detail:{summary:'duplicate'}})),/DUPLICATE_AUTO_E4_STAGE/);
      run.report.stages.push({id:'environment',status:'PASS',durationMs:0,detail:{summary:'synthetic projection only'}});
      try{
        assert.throws(()=>run.finish(),/AUTO_E4_STAGE_IN_PROGRESS/);
      }finally{
        run.report.stages.pop();
      }
    }finally{
      completeFirst({status:'PASS',detail:{summary:'first attempt'}});
    }
    await first;
    const report=run.finish();
    assert.equal(report.stages.filter(stage=>stage.id==='environment').length,1);
    assert.equal(report.coverage.verified,1);
    assert.equal(report.coverage.total,AUTO_E4_STAGES.length);
  }finally{
    run.release();
  }
});

test('Auto E4 release preserves the lock while a stage is active',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-active-release-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const first=createAutoE4Run({dataDir:data});
  const lock=path.join(data,'auto-e4.lock');
  let resolveStage;
  const pendingStageResult=new Promise(resolve=>{resolveStage=resolve;});
  const pendingStage=first.stage('environment',()=>pendingStageResult);
  let second;
  try{
    assert.throws(()=>first.release(),/AUTO_E4_STAGE_IN_PROGRESS/);
    assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).runId,first.runId);
    assert.throws(()=>createAutoE4Run({dataDir:data}),/AUTO_E4_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
    assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).runId,first.runId);

    resolveStage({status:'PASS',detail:{summary:'pending stage settled'}});
    const stage=await pendingStage;
    assert.equal(stage.status,'PASS');
    const report=first.finish();
    assert.equal(report.coverage.verified,1);
    first.release();
    first.release();
    assert.equal(fs.existsSync(lock),false);

    second=createAutoE4Run({dataDir:data});
    assert.notEqual(second.runId,first.runId);
  }finally{
    resolveStage({status:'PASS',detail:{summary:'cleanup settlement'}});
    await pendingStage;
    if(!first.report.completedAt)first.finish();
    first.release();
    if(second){
      if(!second.report.completedAt)second.finish();
      second.release();
    }
  }
});

test('Auto E4 finalization prevents later stages or event mutation',async t=>{
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'canary-auto-e4-finished-'));
  t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
  const run=createAutoE4Run({dataDir:data});
  try{
    const report=run.finish();
    const completedAt=report.completedAt;
    await assert.rejects(run.stage('environment',async()=>({status:'PASS'})),/AUTO_E4_RUN_FINISHED/);
    assert.throws(()=>run.record({type:'late-event'}),/AUTO_E4_RUN_FINISHED/);
    assert.equal(run.finish(),report);
    assert.equal(report.completedAt,completedAt);
    assert.equal(report.stages.length,AUTO_E4_STAGES.length);
    assert.equal(new Set(report.stages.map(stage=>stage.id)).size,AUTO_E4_STAGES.length);
  }finally{
    run.release();
  }
});

test('E4 runner retains named target snapshots and raw gateway evidence; missing observations stay UNKNOWN', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-m6-e4-evidence-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const inheritedHome = path.join(temp, 'inherited-canary-home');
  const outputRoot = path.join(temp, 'runs');
  fs.mkdirSync(inheritedHome, { recursive: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const tokenState = path.join(inheritedHome, 'tokens.json');
  const originalTokenState = JSON.stringify([{ token: 'cnry_M6_SYNTHETIC_SENTINEL' }]) + '\n';
  fs.writeFileSync(tokenState, originalTokenState, { flag: 'wx' });

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    AGENT_CANARY_HOME: inheritedHome
  };
  for (const key of Object.keys(env)) if (key.startsWith('E4_MODEL_')) delete env[key];
  const result = spawnSync(process.execPath, [path.join(repo, 'security-lab', 'e4', 'run.mjs'), `--out-dir=${outputRoot}`], {
    cwd: repo, env, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `local fixture run must finish without claiming product E4; stdout=${result.stdout}\nstderr=${result.stderr}`);
  const summary = JSON.parse(result.stdout.trim());
  assert.equal(summary.evidenceScope, 'BUNDLE_INTEGRITY_ONLY');
  assert.equal(summary.productE4Accepted, false);
  assert.equal(fs.readFileSync(tokenState, 'utf8'), originalTokenState);
  assert.deepEqual(fs.readdirSync(inheritedHome), ['tokens.json']);

  const runDirs = fs.readdirSync(outputRoot).map(name => path.join(outputRoot, name));
  assert.equal(runDirs.length, 1);
  const runDir = runDirs[0];
  const report = JSON.parse(fs.readFileSync(path.join(runDir, 'report.json'), 'utf8'));
  assert.equal(report.e4Status, 'NOT_VERIFIED');
  assert.equal(report.overall, 'AUTHOR_AUTOMATION_COMPLETE_E4_STILL_NOT_VERIFIED');
  assert.equal(report.artifact.status, 'NOT_SUPPLIED');

  const expectedCases = new Map([
    ['GW-CANARY-BLOCK', ['gateway-canary/instructions.txt', 'gateway-canary/target.txt']],
    ['CANARY-SESSION-ISOLATION', ['session-isolation/session-a-decoy.txt', 'session-isolation/session-a-target.txt', 'session-isolation/session-b-target.txt']]
  ]);
  for (const [id, paths] of expectedCases) {
    const row = report.cases.find(item => item.id === id);
    assert.equal(row.status, 'PASS_FIXTURE', id);
    assert.equal(row.reason, id === 'GW-CANARY-BLOCK' ? 'ACTIVE_GATEWAY_DENIAL_AND_TARGET_UNCHANGED' : 'SESSION_STATES_AND_TARGETS_REMAIN_ISOLATED', id);
    assert.equal(row.fileState.status, 'OBSERVED', id);
    assert.equal(row.fileState.unchanged, true, id);
    assert.deepEqual(row.fileState.before.map(item => item.path), paths, id);
    assert.deepEqual(row.fileState.after.map(item => item.path), paths, id);
    assert.ok(row.fileState.before.every(item => typeof item.sha256 === 'string'), id);
    assert.ok(row.fileState.after.every(item => typeof item.sha256 === 'string'), id);
  }

  const noTarget = report.cases.find(item => item.id === 'ARTIFACT-VM-BINDING');
  assert.equal(noTarget.fileState.status, 'UNKNOWN');
  assert.equal(noTarget.fileState.reason, 'NO_TARGETS_REGISTERED');
  assert.equal(noTarget.fileState.before, null);
  assert.equal(noTarget.fileState.after, null);
  assert.equal(noTarget.fileState.unchanged, null);

  const rawLog = fs.readFileSync(path.join(runDir, 'raw.log'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
  for (const id of expectedCases.keys()) {
    assert.ok(rawLog.some(event => event.event === 'target-snapshot-before' && event.id === id && event.status === 'OBSERVED'), `${id} before log`);
    assert.ok(rawLog.some(event => event.event === 'target-snapshot-after' && event.id === id && event.status === 'OBSERVED' && event.unchanged === true), `${id} after log`);
    assert.ok(rawLog.some(event => event.event === 'case-complete' && event.id === id && event.status === 'PASS_FIXTURE'), `${id} completion log`);
  }
  const expectedStreams = [
    ['GW-CANARY-BLOCK', 'GW-CANARY-BLOCK-gateway'], ['GW-CANARY-BLOCK', 'GW-CANARY-BLOCK-guard'],
    ['CANARY-SESSION-ISOLATION', 'CANARY-SESSION-ISOLATION-gateway-a'], ['CANARY-SESSION-ISOLATION', 'CANARY-SESSION-ISOLATION-gateway-b'],
    ['CANARY-SESSION-ISOLATION', 'CANARY-SESSION-ISOLATION-guard-a'], ['CANARY-SESSION-ISOLATION', 'CANARY-SESSION-ISOLATION-guard-b']
  ];
  const evidenceDir = path.join(runDir, 'evidence');
  for (const [caseId, label] of expectedStreams) {
    const stream = rawLog.find(event => event.event === 'case-evidence-stream' && event.caseId === caseId && event.label === label);
    assert.ok(stream, `${caseId}/${label} stream record`);
    if (stream.status === 'PRESENT') {
      assert.ok(stream.bytes > 0);
      assert.equal(stream.archived, true);
      assert.ok(fs.statSync(path.join(evidenceDir, `${label}.jsonl`)).size > 0, label);
    } else if (stream.status === 'EMPTY') {
      assert.equal(stream.bytes, 0);
      assert.equal(stream.archived, true);
      assert.equal(fs.statSync(path.join(evidenceDir, `${label}.jsonl`)).size, 0, label);
    } else {
      assert.equal(stream.status, 'UNKNOWN');
      assert.equal(stream.bytes, null);
      assert.equal(stream.archived, false);
    }
  }
  assert.ok(expectedStreams.filter(([caseId]) => caseId === 'GW-CANARY-BLOCK').some(([caseId, label]) => rawLog.some(event => event.event === 'case-evidence-stream' && event.caseId === caseId && event.label === label && event.status === 'PRESENT')));
  assert.ok(expectedStreams.filter(([caseId]) => caseId === 'CANARY-SESSION-ISOLATION').some(([caseId, label]) => rawLog.some(event => event.event === 'case-evidence-stream' && event.caseId === caseId && event.label === label && event.status === 'PRESENT')));
  const bundle = JSON.parse(fs.readFileSync(path.join(runDir, 'bundle.json'), 'utf8'));
  assert.equal(bundle.manifest.valid, true);
  assert.equal(bundle.e4Status, 'NOT_VERIFIED');
});
