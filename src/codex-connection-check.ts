import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {detectAgentHosts} from './agent-host-detection.js';

const toolPrefix='mcp__agent_canary_m3__';
const quoteToml=(value:string)=>JSON.stringify(value);
function parseLines(file:string):Record<string,unknown>[]{
  if(!fs.existsSync(file))return [];
  return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
}
function safeDiagnostic(value:string){
  return value.replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi,'$1[redacted]')
    .replace(/(api[_-]?key|token|secret|password)(["'\s:=]+)[^\s,"'}]+/gi,'$1$2[redacted]')
    .replace(/\b(?:sk|sess|gh[pousr]_[A-Za-z0-9_]{12,})[A-Za-z0-9._-]*/g,'[redacted]').slice(-1800);
}

/** Internal pure status/limits mapper; not a package-level host-protection API. */
export type CodexConnectionStatus =
  | 'GATEWAY_AND_HOOK_CONFIRMED'
  | 'GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE'
  | 'CONNECTION_FAILED';

export function assessCodexConnection(connectionPassed:boolean,hookConfirmed:boolean){
  const status:CodexConnectionStatus=!connectionPassed
    ?'CONNECTION_FAILED'
    :hookConfirmed?'GATEWAY_AND_HOOK_CONFIRMED':'GATEWAY_CONFIRMED_HOOK_NOT_EFFECTIVE';
  return {
    status,
    protectedHost:{status:'UNKNOWN' as const,reason:'FIRST_PARTY_PROTECTED_READ_NOT_CHECKED'},
    limits:[
      'This isolated self-test does not verify the installed project config or native Codex tools.',
      'The synthetic PreToolUse probe covers only this test MCP call path and does not establish coverage for native tools or other host calls.',
      'The temporary protected-file probe is reported separately and does not establish coverage for the user workspace or native Codex tools.',
    ],
  };
}

export function assessProtectedHostProbe(events:Record<string,unknown>[]){
  const passed=events.some(event=>event.kind==='protected-host'&&event.status==='ALLOW'&&event.markerMatched===true&&event.m5Callbacks===1);
  if(passed)return{status:'FIXED_TEMP_FILE_READ_CONFIRMED' as const,reason:'HELD_FILE_POSITIVE_CONTROL'};
  const blocked=events.find(event=>event.kind==='protected-host');
  return{status:'UNKNOWN' as const,reason:typeof blocked?.reason==='string'?blocked.reason:'PROTECTED_HOST_PROBE_NOT_OBSERVED'};
}

/** Use the installed Codex CLI with a temporary MCP config; never edits the user's Codex config. */
export function runCodexConnectionCheck(){
  const host=detectAgentHosts().find(candidate=>candidate.agent==='codex');
  if(!host?.executable)throw Error('CONNECTION_CODEX_NOT_INSTALLED');
  if(process.platform==='win32'&&!/\.exe$/i.test(host.executable))throw Error('CONNECTION_CODEX_WRAPPER_UNSUPPORTED');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const serverScript=path.join(root,'dist','codex-connection-mcp.js');
  if(!fs.existsSync(serverScript))throw Error('CONNECTION_CHECK_BUILD_REQUIRED');

  const tempRoot=fs.realpathSync(os.tmpdir());
  const tempDirectory=fs.mkdtempSync(path.join(tempRoot,'agent-canary-codex-check-'));
  const traceFile=path.join(tempDirectory,'gateway.jsonl');
  const hookLog=path.join(tempDirectory,'hook.jsonl');
  const hookScript=path.join(tempDirectory,'codex-hook-probe.mjs');
  fs.writeFileSync(traceFile,'',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(tempDirectory,'agent-canary-public.txt'),'AGENT_CANARY_PROTECTED_FILE_READ_OK',{flag:'wx',mode:0o600});
  fs.writeFileSync(hookLog,'',{flag:'wx',mode:0o600});
  const expectedHookTool=toolPrefix+'hook_probe';
  const hookProgram=`import fs from 'node:fs';\n`+
    `let source=''; for await (const part of process.stdin) source+=part;\n`+
    `const input=JSON.parse(source); const name=String(input.tool_name||'');\n`+
    `const denied=name===${JSON.stringify(expectedHookTool)};\n`+
    `fs.appendFileSync(${JSON.stringify(hookLog)},JSON.stringify({tool_name:name,decision:denied?'deny':'allow'})+'\\n');\n`+
    `process.stdout.write(JSON.stringify(denied?{hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'M3_HOOK_PROBE_DENIED'}}:{}));\n`;
  fs.writeFileSync(hookScript,hookProgram,{flag:'wx',mode:0o600});

  try{
    const hookCommand=`"${process.execPath}" "${hookScript}"`;
    const hookConfig=`[{matcher=${quoteToml('^'+expectedHookTool+'$')},hooks=[{type="command",command=${quoteToml(hookCommand)},command_windows=${quoteToml(hookCommand)}}]}]`;
    const args=[
      '--enable','hooks','--ask-for-approval','never','exec','--ephemeral','--ignore-user-config','--ignore-rules','--skip-git-repo-check','--json',
      '--sandbox','read-only','--cd',tempDirectory,
      '-c',`mcp_servers.agent_canary_m3.command=${quoteToml(process.execPath)}`,
      '-c',`mcp_servers.agent_canary_m3.args=${JSON.stringify([serverScript])}`,
      '-c',`mcp_servers.agent_canary_m3.env.AGENT_CANARY_CONNECTION_TRACE=${quoteToml(traceFile)}`,
      '-c',`mcp_servers.agent_canary_m3.default_tools_approval_mode="approve"`,
      '-c',`features.hooks=true`,
      '-c',`hooks.PreToolUse=${hookConfig}`,
      'Call the MCP tool protected_read exactly once with path agent-canary-public.txt, then call public_read exactly once, then call hook_probe exactly once. Use no other tools. Afterward state whether each call returned or was blocked.'
    ];
    const result=spawnSync(host.executable,args,{cwd:tempDirectory,env:{...process.env,AGENT_CANARY_CONNECTION_TRACE:traceFile},encoding:'utf8',timeout:150_000,maxBuffer:2_000_000,windowsHide:true});
    if(result.error)throw Error((result.error as NodeJS.ErrnoException).code==='ETIMEDOUT'?'CONNECTION_CODEX_TIMEOUT':'CONNECTION_CODEX_START_FAILED');
    if(process.env.AGENT_CANARY_DEBUG==='1')process.stderr.write(safeDiagnostic(`exit=${result.status}\n${result.stderr||''}\n${result.stdout||''}`)+'\n');
    if(result.status!==0){
      throw Error('CONNECTION_CODEX_RUN_FAILED');
    }

    const gateway=parseLines(traceFile).filter(event=>event.kind==='gateway');
    const protectedEvents=parseLines(traceFile).filter(event=>event.kind==='protected-host');
    const hook=parseLines(hookLog);
    const allowed=gateway.filter(event=>event.tool==='public_read'&&Array.isArray(event.events)&&event.events.some((record:any)=>record.decision==='ALLOW'));
    const deniedHook=hook.filter(event=>event.tool_name===expectedHookTool&&event.decision==='deny');
    const probeReachedGateway=gateway.some(event=>event.tool==='hook_probe');
    const markerSeen=(result.stdout||'').includes('M3_HOOK_PROBE_DENIED');
    const connectionPassed=result.status===0&&allowed.length===1;
    const hookConfirmed=deniedHook.length===1&&!probeReachedGateway&&markerSeen;
    const assessment=assessCodexConnection(connectionPassed,hookConfirmed);
    const protectedHost=assessProtectedHostProbe(protectedEvents);
    return {
      agent:'codex',version:host.version,passed:connectionPassed,
      status:assessment.status,
      protectedHost,
      checks:{codexProcess:result.status===0,gatewayBackedMcpCall:allowed.length===1,preToolUseHookFired:deniedHook.length===1,hookDeniedBeforeGateway:deniedHook.length===1&&!probeReachedGateway,hookDenialObserved:markerSeen,hookProbeReachedGateway:probeReachedGateway},
      evidence:{gatewayCallbacks:gateway.map(event=>event.tool),protectedHost:protectedEvents.map(event=>({status:event.status,reason:event.reason,m5Callbacks:event.m5Callbacks,markerMatched:event.markerMatched})),hookToolNames:hook.map(event=>event.tool_name).filter(Boolean)},
      persistentConfigModified:false,temporaryMcpApproval:'approve for fixed read-only connection-check tools only',nativeToolsProtection:'OUT_OF_SCOPE',
      limits:assessment.limits,
    };
  }finally{
    const realDirectory=fs.realpathSync(tempDirectory),relative=path.relative(tempRoot,realDirectory);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||path.basename(realDirectory)!==path.basename(tempDirectory))throw Error('CONNECTION_CHECK_TEMP_PATH_UNSAFE');
    fs.rmSync(realDirectory,{recursive:true,force:true});
  }
}
