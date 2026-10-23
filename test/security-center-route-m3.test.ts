import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAgentGuard, createContainmentStateStore } from '../src/containment.js';
import { EvidenceRecorder } from '../src/runtime/evidence.js';
import { createTrustedExecutionGateway } from '../src/sdk.js';
import { createProtectedHostAdapter } from '../src/codex-connection-mcp.js';
import { isValidSecurityCenterStatusPayload } from '../src/ai/security-center-adapter.js';

const previousAgentCanaryHome = process.env.AGENT_CANARY_HOME;
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'canary-security-center-route-'));
process.env.AGENT_CANARY_HOME = testHome;
const currentPackage = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { exports?: Record<string, unknown> };
const hasPublicM2GatewayAdapter = Object.hasOwn(currentPackage.exports ?? {}, './gateway-adapter');
const hasPublicM5PolicyRouter = Object.hasOwn(currentPackage.exports ?? {}, './policy-router');
after(() => {
  if (previousAgentCanaryHome === undefined) delete process.env.AGENT_CANARY_HOME;
  else process.env.AGENT_CANARY_HOME = previousAgentCanaryHome;
  fs.rmSync(testHome, { recursive: true, force: true });
});
const { startAIConsole } = await import('../src/ai/console.js');
const { decideAgentHook } = await import('../src/agent-hook.js');

test('M3 integration keeps an explicit positive control for a registered held-file Gateway read', async () => {
  const workspace = fs.mkdtempSync(path.join(testHome, 'held-file-positive-'));
  fs.writeFileSync(path.join(workspace, 'normal.txt'), 'SUPPORTED_HELD_FILE_FIXTURE');
  const evidence = new EvidenceRecorder();
  const runtime = createTrustedExecutionGateway({
    agentId: 'm3-hook-positive',
    guard: createAgentGuard({ alert: false }),
    workspaceRoot: workspace,
    files: [{ path: 'normal.txt' }],
    evidence,
  });
  try {
    assert.deepEqual(
      await runtime.agent.dispatch({ name: 'read_file', args: { path: 'normal.txt' } }),
      { content: 'SUPPORTED_HELD_FILE_FIXTURE' },
    );
    assert.equal(evidence.snapshot().at(-1)?.decision, 'ALLOW');
  } finally {
    await runtime.close();
  }
});

test('M3 integration observes shared quarantine once when a retry guard reads the owner store', () => {
  const stateStore = createContainmentStateStore();
  const eventsFile = path.join(testHome, 'shared-notification-events.jsonl');
  const first = createAgentGuard({
    sessionId: 'shared-notify-first-session',
    principalId: 'shared-notify-principal',
    stateStore,
    eventsFile,
    alert: false,
  });
  const retried = createAgentGuard({
    sessionId: 'shared-notify-retry-session',
    principalId: 'shared-notify-principal',
    stateStore,
    eventsFile,
    alert: false,
  });
  const notifications: string[] = [];
  retried.subscribeQuarantine(() => notifications.push(retried.state));

  first.trip({ reason: 'shared_synthetic_trip' });
  assert.deepEqual(notifications, [], 'the shared store has no push channel; observation happens synchronously on the retry guard');
  assert.equal(retried.state, 'QUARANTINED');
  assert.deepEqual(notifications, ['QUARANTINED']);
  assert.equal(retried.state, 'QUARANTINED');
  assert.deepEqual(notifications, ['QUARANTINED'], 'the local quarantine latch prevents duplicate notifications');
});

test('M3 hook integration denies native unpinned reads for both supported protocols', async () => {
  const workspace = fs.mkdtempSync(path.join(testHome, 'native-unpinned-read-'));
  fs.writeFileSync(path.join(workspace, 'normal.txt'), 'NORMAL_FIXTURE');
  const claude = await decideAgentHook('claude', workspace, path.join(testHome, 'unpinned-claude-state'), {
    session_id: 'm3-unpinned-claude',
    tool_name: 'Read',
    tool_input: { file_path: 'normal.txt' },
  }) as any;
  assert.equal(claude.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(claude.hookSpecificOutput.permissionDecisionReason, 'Agent Canary: native_file_execution_not_pinned');

  const cursor = await decideAgentHook('cursor', workspace, path.join(testHome, 'unpinned-cursor-state'), {
    conversation_id: 'm3-unpinned-cursor',
    tool_name: 'Read',
    tool_input: { file_path: 'normal.txt' },
  }) as any;
  assert.equal(cursor.permission, 'deny');
  assert.equal(cursor.user_message, 'Agent Canary: native_file_execution_not_pinned');
});

test('M3 native Hook copy logs only allowlisted metadata when inputs and reasons contain canaries', () => {
  const wrapper = path.resolve('security-lab/claude-native-hook.mjs');
  const modulePath = path.join(testHome, 'm3-allowlisted-hook-module.mjs');
  const log = path.join(testHome, 'm3-allowlisted-hook.jsonl');
  const inputCanary = 'M3_SYNTHETIC_RAW_INPUT_CANARY_7f39';
  const reasonCanary = 'M3_SYNTHETIC_REASON_CANARY_12ac';
  const privateCallerPathCanary = path.join(testHome, 'M3_SYNTHETIC_PRIVATE_CALLER_PATH_CANARY_91dd');
  fs.writeFileSync(
    modulePath,
    `export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'allow',permissionDecisionReason:${JSON.stringify(reasonCanary)}}}}\n`,
  );
  const result = spawnSync(
    process.execPath,
    [wrapper, modulePath, testHome, path.join(testHome, 'm3-allowlisted-state'), log],
    {
      input: JSON.stringify({
        session_id: 'm3-allowlist-fixture',
        tool_name: 'Read',
        tool_input: { file_path: privateCallerPathCanary, marker: inputCanary },
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.permissionDecision, 'allow');
  assert.equal(output.hookSpecificOutput.permissionDecisionReason, reasonCanary);
  assert.equal(result.stdout.includes(privateCallerPathCanary), false);

  const lines = fs.readFileSync(log, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(record).sort(), ['hookEventName', 'permissionDecision', 'timestamp']);
  assert.equal(record.hookEventName, 'PreToolUse');
  assert.equal(record.permissionDecision, 'allow');
  assert.equal(record.timestamp, new Date(record.timestamp).toISOString());
  for (const canary of [inputCanary, reasonCanary, privateCallerPathCanary]) {
    assert.equal(lines[0].includes(canary), false, `native hook log persisted ${canary}`);
  }
});

test('M3 quarantine regression confirms trip state and repeated state reads do not notify twice', () => {
  const guard = createAgentGuard({
    sessionId: 'm3-synchronous-quarantine-regression',
    eventsFile: path.join(testHome, 'm3-synchronous-quarantine.jsonl'),
    alert: false,
  });
  const notifications: string[] = [];
  guard.subscribeQuarantine(() => notifications.push(guard.state));

  const trip = guard.trip({ reason: 'm3_synthetic_external_trip' });
  assert.equal(trip.state, 'QUARANTINED');
  assert.equal(guard.state, 'QUARANTINED');
  assert.deepEqual(notifications, ['QUARANTINED']);
  assert.equal(guard.state, 'QUARANTINED');
  assert.deepEqual(notifications, ['QUARANTINED']);

  let lateNotifications = 0;
  const unsubscribeLate = guard.subscribeQuarantine(() => { lateNotifications += 1; });
  assert.equal(lateNotifications, 1);
  assert.equal(guard.state, 'QUARANTINED');
  assert.equal(lateNotifications, 1, 're-reading a latched state does not send a duplicate notification');
  guard.reset({ acknowledgedBy: 'M3 regression fixture' });
  guard.trip({ reason: 'm3_synthetic_second_trip' });
  assert.equal(lateNotifications, 2);
  unsubscribeLate();
});

test('protected host adapter rejects an incompatible M1 gateway before M2/M5 side effects', async () => {
  const calls = { m2FacadeLoads: 0, m5RouterCreations: 0, gatewayDispatches: 0 };
  const incompatibleGateway = Object.freeze({
    agent: Object.freeze({
      async dispatch() {
        calls.gatewayDispatches++;
        throw new Error('legacy path dispatch must not be used');
      },
    }),
  });
  const guard = createAgentGuard({ sessionId: 'm3-incompatible-gateway-fixture', alert: false });

  const host = await createProtectedHostAdapter(
    incompatibleGateway,
    guard,
    os.tmpdir(),
    {
      loadM2Facade: async () => {
        calls.m2FacadeLoads++;
        return { createSecurityGatewayHostAdapter: () => { throw new Error('M2 must not be reached'); } };
      },
      createSecurityToolRouter: (() => {
        calls.m5RouterCreations++;
        throw new Error('M5 must not be reached');
      }) as never,
    },
  );

  assert.equal(host.status, 'UNKNOWN');
  assert.equal(host.reason, 'M1_HELD_FILE_CAPABILITY_UNAVAILABLE');
  assert.equal(host.dispatch, undefined);
  assert.equal(host.m5Callbacks(), 0);
  assert.deepEqual(calls, { m2FacadeLoads: 0, m5RouterCreations: 0, gatewayDispatches: 0 });
});

async function csrfFor(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const csrf = html.match(/const csrf='([a-f0-9]+)'/)?.[1];
  assert.ok(csrf);
  return csrf;
}

test('security-center route defaults to UNKNOWN behind the console CSRF boundary', async () => {
  const console = await startAIConsole({ port: 0 });
  try {
    assert.equal((await fetch(console.url + '/api/security-center')).status, 403);
    const csrf = await csrfFor(console.url);
    let response = await fetch(console.url + '/api/security-center', {
      headers: { 'x-canary-csrf': csrf },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
      protectionStatus: 'UNKNOWN',
      gateway: { protectionStatus: 'UNKNOWN', connectionStatus: 'UNKNOWN' },
      hook: { protectionStatus: 'UNKNOWN' },
      canaryIsolation: { protectionStatus: 'UNKNOWN' },
      policy: { protectionStatus: 'UNKNOWN' },
    });
  } finally {
    await console.close();
  }
});

test('security-center status reads only an injected M2 snapshot after CSRF and never starts protected execution', async () => {
  let providerCalls = 0;
  let protectedReadLoads = 0;
  const privatePath = 'C:\\Users\\alice\\workspace\\private.txt';
  const privateSecret = 'status_provider_private_token';
  const console = await startAIConsole({
    port: 0,
    securityCenterStatusProvider: async (...args: unknown[]) => {
      providerCalls += 1;
      assert.deepEqual(args, [], 'the snapshot provider receives no request-controlled parameters');
      return {
        protectionStatus: 'PARTIALLY_PROTECTED',
        gateway: { protectionStatus: 'PROTECTED', connectionStatus: 'CONNECTED', path: privatePath },
        policy: { protectionStatus: 'PROTECTED', name: 'M2_FIXED_FILE_READS', token: privateSecret },
        privatePath,
        privateSecret,
      };
    },
    securityCenterProtectedReadDependencies: async () => {
      protectedReadLoads += 1;
      throw new Error('status route must not load protected-read dependencies');
    },
  });
  try {
    let response = await fetch(console.url + '/api/security-center');
    assert.equal(response.status, 403);
    assert.equal(providerCalls, 0, 'missing CSRF must stop before reading the M2 snapshot');

    const csrf = await csrfFor(console.url);
    response = await fetch(console.url + '/api/security-center', {
      headers: { 'x-canary-csrf': 'invalid-csrf' },
    });
    assert.equal(response.status, 403);
    assert.equal(providerCalls, 0, 'invalid CSRF must stop before reading the M2 snapshot');
    response = await fetch(console.url + '/api/security-center', {
      headers: { 'x-canary-csrf': csrf, origin: 'https://attacker.invalid' },
    });
    assert.equal(response.status, 403);
    assert.equal(providerCalls, 0, 'cross-origin reads must stop before reading the M2 snapshot');
    response = await fetch(console.url + '/api/security-center?path=' + encodeURIComponent(privatePath), {
      headers: { 'x-canary-csrf': csrf },
    });
    assert.equal(response.status, 404, 'the exact status route accepts no path/query parameters');
    assert.equal(providerCalls, 0);
    assert.equal((await response.text()).includes(privatePath), false);

    response = await fetch(console.url + '/api/security-center', {
      headers: { 'x-canary-csrf': csrf },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.protectionStatus, 'PARTIALLY_PROTECTED');
    assert.deepEqual(body.hook, { protectionStatus: 'UNKNOWN' });
    assert.deepEqual(body.canaryIsolation, { protectionStatus: 'UNKNOWN' });
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes(privatePath), false);
    assert.equal(serialized.includes(privateSecret), false);
    assert.equal(providerCalls, 1);
    assert.equal(protectedReadLoads, 0, 'status reads must not construct a Gateway or invoke protected-read callbacks');
  } finally {
    await console.close();
  }
});

test('security-center route preserves scoped provider status and filters unsafe or unsupported fields', async () => {
  const privatePath = 'C:\\Users\\alice\\workspace\\secret.txt';
  const privateToken = 'cnry_private_test_token';
  const privateArguments = JSON.stringify({ tool: 'read_file', path: privatePath });
  const privateContents = 'private workspace file contents';
  const providerSnapshot = {
    protectionStatus: 'PARTIALLY_PROTECTED',
    gateway: { protectionStatus: 'PROTECTED', connectionStatus: 'CONNECTED', path: privatePath, arguments: privateArguments },
    hook: { protectionStatus: 'PROTECTED' },
    canaryIsolation: { protectionStatus: 'PROTECTED' },
    policy: { protectionStatus: 'PROTECTED', name: 'M2 fixed file reads / M5 OBSERVE', token: privateToken, fileContents: privateContents },
    protectedToolCount: 1,
    unprotectedExecutionPaths: ['NATIVE_SHELL', privatePath, '/home/alice/.ssh/id_rsa', '--token=' + privateToken, 'TOKEN_SECRET'],
    agents: [
      { agent: 'codex', detected: true, connectionStatus: 'CONNECTED', protectionStatus: 'PROTECTED', path: privatePath },
      { agent: 'claude', connectionStatus: 'CONNECTED', protectionStatus: 'PROTECTED' },
      { agent: 'cursor', detected: null, connectionStatus: 'CONNECTED', protectionStatus: 'PROTECTED' },
      { agent: 'user-supplied-name', detected: true, connectionStatus: 'CONNECTED', protectionStatus: 'PROTECTED' },
    ],
    coverage: 'M2_FIXED_FILE_READS_ONLY',
    privatePath,
    privateToken,
    privateArguments,
    privateContents,
  };
  const expected = {
    protectionStatus: 'PARTIALLY_PROTECTED',
    gateway: { protectionStatus: 'PROTECTED', connectionStatus: 'CONNECTED' },
    hook: { protectionStatus: 'UNKNOWN' },
    canaryIsolation: { protectionStatus: 'UNKNOWN' },
    policy: { protectionStatus: 'PROTECTED', name: 'M2_FIXED_FILE_READS' },
    protectedToolCount: 1,
    unprotectedExecutionPaths: ['NATIVE_SHELL'],
    agents: [
      { agent: 'codex', detected: true, connectionStatus: 'UNKNOWN', protectionStatus: 'UNKNOWN' },
      { agent: 'claude', connectionStatus: 'UNKNOWN', protectionStatus: 'UNKNOWN' },
      { agent: 'cursor', connectionStatus: 'UNKNOWN', protectionStatus: 'UNKNOWN' },
    ],
  };
  let providerCalls = 0;
  const console = await startAIConsole({
    port: 0,
    securityCenterStatusProvider: async () => {
      providerCalls += 1;
      return providerSnapshot;
    },
  });
  try {
    const csrf = await csrfFor(console.url);
    let response = await fetch(console.url + '/api/security-center', {
      headers: { 'x-canary-csrf': csrf },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, expected);
    assert.equal(isValidSecurityCenterStatusPayload(body), true, 'M3 must omit unsupported detected values so the M4 consumer accepts the snapshot');
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes(privatePath), false);
    assert.equal(serialized.includes(privateToken), false);
    assert.equal(serialized.includes(privateArguments), false);
    assert.equal(serialized.includes(privateContents), false);
    assert.equal(providerCalls, 1);
    response = await fetch(console.url + '/api/security-center', {
      method: 'POST',
      headers: { 'x-canary-csrf': csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ protectionStatus: 'PROTECTED' }),
    });
    assert.equal(response.status, 404);
    assert.equal(providerCalls, 1, 'non-GET requests must not read or mutate the status provider');
  } finally {
    await console.close();
  }
});

test('security-center route keeps missing, invalid, or failed provider data UNKNOWN', async () => {
  for (const provider of [
    async () => { throw new Error('private provider failure'); },
    async () => undefined,
    async () => ({ protectionStatus: 'PROTECTED', gateway: { protectionStatus: 'bad-status' } }),
  ]) {
    const console = await startAIConsole({ port: 0, securityCenterStatusProvider: provider });
    try {
      const csrf = await csrfFor(console.url);
      const response = await fetch(console.url + '/api/security-center', {
        headers: { 'x-canary-csrf': csrf },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        protectionStatus: 'UNKNOWN',
        gateway: { protectionStatus: 'UNKNOWN', connectionStatus: 'UNKNOWN' },
        hook: { protectionStatus: 'UNKNOWN' },
        canaryIsolation: { protectionStatus: 'UNKNOWN' },
        policy: { protectionStatus: 'UNKNOWN' },
      });
    } finally {
      await console.close();
    }
  }
});

test('security-center route ignores provider getters and does not overstate configuration detection', async () => {
  let getterReads = 0;
  const snapshot = {};
  Object.defineProperty(snapshot, 'protectionStatus', {
    enumerable: true,
    get() { getterReads += 1; return 'PROTECTED'; },
  });
  Object.defineProperty(snapshot, 'agents', {
    enumerable: true,
    get() { getterReads += 1; return [{ agent: 'codex', detected: true, protectionStatus: 'PROTECTED' }]; },
  });
  const console = await startAIConsole({ port: 0, securityCenterStatusProvider: async () => snapshot });
  try {
    const csrf = await csrfFor(console.url);
    const response = await fetch(console.url + '/api/security-center', { headers: { 'x-canary-csrf': csrf } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      protectionStatus: 'UNKNOWN',
      gateway: { protectionStatus: 'UNKNOWN', connectionStatus: 'UNKNOWN' },
      hook: { protectionStatus: 'UNKNOWN' },
      canaryIsolation: { protectionStatus: 'UNKNOWN' },
      policy: { protectionStatus: 'UNKNOWN' },
    });
    assert.equal(getterReads, 0);
  } finally {
    await console.close();
  }
});

function fakeProtectedReadDependencies(mode:'allow'|'deny'|'unknown'|'wrong'='allow',missingM2=false,missingEvidence=false){
  const state:{dependencyLoads:number;gatewayCreates:number;gatewayCloses:number;routerCallbacks:number;gatewayEvidence:number;workspaceRoot?:string;fixedFiles?:unknown;routeArguments?:unknown}={dependencyLoads:0,gatewayCreates:0,gatewayCloses:0,routerCallbacks:0,gatewayEvidence:0};
  const capability=Object.freeze(Object.create(null));
  const loader=async()=>{
    state.dependencyLoads++;
    return{
      createGuard:(options:{sessionId:string;alert:boolean})=>createAgentGuard(options),
      createEvidenceRecorder:()=>new EvidenceRecorder(),
      createGateway(options:{workspaceRoot:string;files:readonly {path:string}[]}){
        state.gatewayCreates++;
        state.workspaceRoot=options.workspaceRoot;
        state.fixedFiles=options.files;
        const registeredPath=path.join(options.workspaceRoot,'agent-canary-public.txt');
        const registeredStat=fs.lstatSync(registeredPath);
        return{
          bindFileReadCapability(binding:unknown){assert.deepEqual(binding,{toolName:'protected_read',operation:'file-read',path:'agent-canary-public.txt',pathArg:'path'});return capability;},
          verifyFileReadCapability(value:unknown,call:unknown,operation:string){
            if(value!==capability||operation!=='file-read'||JSON.stringify(call)!==JSON.stringify({name:'protected_read',args:{path:'agent-canary-public.txt'}}))return false;
            try{const current=fs.lstatSync(registeredPath);return current.isFile()&&!current.isSymbolicLink()&&current.dev===registeredStat.dev&&current.ino===registeredStat.ino;}catch{return false;}
          },
          async readFileWithCapability(value:unknown,call:unknown,operation:string){
            assert.equal(value,capability);assert.equal(operation,'file-read');state.routeArguments=call;
            if(mode==='deny')throw Object.assign(new Error('private path and marker must not escape'),{decision:{action:'DENY',reason:'private detail'}});
            if(mode==='unknown')throw new Error('unclassified private failure');
            state.gatewayEvidence++;
            if(mode==='wrong')return{content:'UNEXPECTED_PRIVATE_RESULT'};
            return{content:'AGENT_CANARY_CONSOLE_PROTECTED_READ_OK'};
          },
          ...(missingEvidence?{}:{evidence(){return Array.from({length:state.gatewayEvidence},()=>({kind:'fixed-read-fixture'}));}}),
          async close(){state.gatewayCloses++;},
        };
      },
      loadM2Facade:async()=>{
        if(missingM2)throw new Error('private M2 dependency failure');
        return{createSecurityGatewayHostAdapter(options:Record<string,any>){
        const router=options.createSecurityToolRouter({
          ...options.routerOptions,
          tools:{protected_read:{operation:'file-read',pathArg:'path'}},
          fileReadCapability:{resolve:(call:unknown)=>options.gateway.verifyFileReadCapability(capability,call,'file-read')?capability:undefined,verify:(value:unknown,call:unknown)=>value===capability&&options.gateway.verifyFileReadCapability(value,call,'file-read')},
          executeRealTool:async(call:unknown,context:{signal:AbortSignal})=>{
            assert.equal(context.signal.aborted,false);
            state.routerCallbacks++;
            return gateway.readFileWithCapability(capability,call,'file-read');
          },
        });
        return{dispatch:(call:unknown)=>{
          const candidate=(call as any)?.args?.path;
          if(candidate!=='agent-canary-public.txt')throw new TypeError('M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED');
          if(!options.gateway.verifyFileReadCapability(capability,call,'file-read'))throw new TypeError('M2_SECURITY_GATEWAY_CAPABILITY_INVALID');
          return router.dispatch(call);
        }};
      }};
      },
      createSecurityToolRouter(options:Record<string,any>){
        const gateway=options.executeRealTool;
        return{
          async dispatch(call:unknown){return gateway(call,{signal:new AbortController().signal,fileReadCapability:capability});},
          pendingApprovals(){return[];},
          inspectPolicy(){return{action:'ALLOW',mode:'OBSERVE'};},
        };
      },
    };
  };
  let gateway:ReturnType<Awaited<ReturnType<typeof loader>>['createGateway']>|undefined;
  // Capture the created fake so the assertions can verify its lifecycle.
  const wrapped=async()=>{
    const dependencies=await loader();
    const createGateway=dependencies.createGateway;
    return{...dependencies,createGateway:(options:Parameters<typeof createGateway>[0])=>gateway=createGateway(options)};
  };
  return{loader:wrapped,state,get gateway(){return gateway;}};
}

test('protected-read action validates CSRF, operator, and empty body before loading any probe dependencies', async () => {
  const dependencies=fakeProtectedReadDependencies();
  const console=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:dependencies.loader});
  try{
    const csrf=await csrfFor(console.url);
    const send=(headers:Record<string,string>,body='{}')=>fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,...headers},body});
    let response=await fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,403);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'REQUEST_AUTH_REQUIRED',markerMatched:false});
    response=await send({'x-canary-operator-code':'wrong'});
    assert.equal(response.status,403);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'REQUEST_AUTH_REQUIRED',markerMatched:false});
    response=await send({'x-canary-operator-code':'OPERATOR_FIXTURE'},JSON.stringify({path:'../../secret'}));
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'REQUEST_INVALID',markerMatched:false});
    assert.equal(dependencies.state.dependencyLoads,0);
    assert.equal(dependencies.state.gatewayCreates,0);
  }finally{await console.close();}

  const unconfigured=await startAIConsole({port:0,securityCenterProtectedReadDependencies:dependencies.loader});
  try{
    const csrf=await csrfFor(unconfigured.url);
    const response=await fetch(unconfigured.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,403);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'REQUEST_AUTH_REQUIRED',markerMatched:false});
    assert.equal(dependencies.state.dependencyLoads,0,'an unset operator capability must stop before dependency loading');
  }finally{await unconfigured.close();}
});

test('protected-read action reports PASS only after the fixed positive, alias deny, and replacement deny controls', async () => {
  const dependencies=fakeProtectedReadDependencies();
  const console=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:dependencies.loader});
  try{
    const csrf=await csrfFor(console.url);
    const response=await fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.deepEqual(body,{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'PASS',reason:'FIXED_PROBE_CONTROLS_PASSED',markerMatched:true});
    const serialized=JSON.stringify(body);
    assert.equal(serialized.includes('AGENT_CANARY_CONSOLE_PROTECTED_READ_OK'),false);
    assert.equal(serialized.includes(dependencies.state.workspaceRoot??''),false);
    assert.deepEqual(dependencies.state.fixedFiles,[{path:'agent-canary-public.txt'}]);
    assert.deepEqual(dependencies.state.routeArguments,{name:'protected_read',args:{path:'agent-canary-public.txt'}});
    assert.equal(dependencies.state.routerCallbacks,1,'only the fixed positive control may reach M5');
    assert.equal(dependencies.state.gatewayEvidence,1,'alias and same-path replacement denials must not add M1 read evidence');
    assert.equal(dependencies.state.gatewayCloses,1);
    assert.equal(fs.existsSync(dependencies.state.workspaceRoot??''),false,'the exact temporary probe directory is removed after the held Gateway closes');
  }finally{await console.close();}
});

test('protected-read action stays UNKNOWN before owner composition when the M1 evidence surface is absent',async()=>{
  const dependencies=fakeProtectedReadDependencies('allow',false,true);
  const console=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:dependencies.loader});
  try{
    const csrf=await csrfFor(console.url);
    const response=await fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'OWNER_ROUTE_NOT_CONFIRMED',markerMatched:false});
    assert.equal(dependencies.state.routerCallbacks,0,'M3 must stop before composing or dispatching without the M1 evidence API');
    assert.equal(dependencies.state.gatewayEvidence,0);
    assert.equal(dependencies.state.gatewayCloses,1);
    assert.equal(fs.existsSync(dependencies.state.workspaceRoot??''),false);
  }finally{await console.close();}
});

test('protected-read action distinguishes explicit owner denial from unknown dispatch failures', async () => {
  for(const [mode,status,reason] of [['deny','DENY','OWNER_POLICY_DENIED'],['unknown','UNKNOWN','OWNER_DISPATCH_FAILED']] as const){
    const dependencies=fakeProtectedReadDependencies(mode);
    const console=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:dependencies.loader});
    try{
      const csrf=await csrfFor(console.url);
      const response=await fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status,reason,markerMatched:false});
      assert.equal(dependencies.state.gatewayCloses,1);
      assert.equal(fs.existsSync(dependencies.state.workspaceRoot??''),false);
    }finally{await console.close();}
  }
});

test('protected-read action treats unexpected markers as UNKNOWN and missing composition fails before probe setup', async (t) => {
  const injected=fakeProtectedReadDependencies('wrong');
  const console=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:injected.loader});
  try{
    const csrf=await csrfFor(console.url);
    const response=await fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'INTEGRITY_MISMATCH',markerMatched:false});
  }finally{await console.close();}

  const prefix='agent-canary-console-probe-';
  if(!hasPublicM2GatewayAdapter||!hasPublicM5PolicyRouter){
    const before=new Set(fs.readdirSync(os.tmpdir()).filter(name=>name.startsWith(prefix)));
    // The legacy M3 SDK has a router export, but it is not the M5 owner export.
    // The ordinary CLI bootstrap must require M5's additive public subpath.
    const sdk=await import('@dorianchn/agent-canary/sdk');
    assert.equal(typeof sdk.createSecurityToolRouter,'function');
    // This is the same startAIConsole call used by `ai console`; absent M5/M2
    // public subpaths must return UNKNOWN before a temp file, Gateway, router,
    // or callback is created.
    const probeDirectoryCreate=t.mock.method(fs,'mkdtempSync');
    const defaultConsole=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE'});
    try{
      const csrf=await csrfFor(defaultConsole.url);
      const response=await fetch(defaultConsole.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'OWNER_ADAPTER_UNAVAILABLE',markerMatched:false});
      const probeDirectoryCalls=probeDirectoryCreate.mock.calls.filter(call=>String(call.arguments[0]).includes(prefix));
      assert.equal(probeDirectoryCalls.length,0,'missing public owner exports must be rejected before the probe filesystem side effect; Gateway/router/callback construction is downstream of this directory');
      const after=fs.readdirSync(os.tmpdir()).filter(name=>name.startsWith(prefix));
      assert.deepEqual(after.filter(name=>!before.has(name)),[],'an M3-only default must not construct a Gateway or probe directory when either owner public subpath is unavailable');
    }finally{await defaultConsole.close();}
  }

  const incomplete=fakeProtectedReadDependencies('allow',true);
  const beforeIncomplete=new Set(fs.readdirSync(os.tmpdir()).filter(name=>name.startsWith(prefix)));
  const incompleteConsole=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:incomplete.loader});
  try{
    const csrf=await csrfFor(incompleteConsole.url);
    const response=await fetch(incompleteConsole.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'OWNER_ADAPTER_UNAVAILABLE',markerMatched:false});
    assert.equal(incomplete.state.gatewayCreates,0);
    assert.equal(incomplete.state.routerCallbacks,0);
    const afterIncomplete=fs.readdirSync(os.tmpdir()).filter(name=>name.startsWith(prefix));
    assert.deepEqual(afterIncomplete.filter(name=>!beforeIncomplete.has(name)),[],'an unavailable M2 composition must fail before any probe filesystem, Gateway, or router callback');
  }finally{await incompleteConsole.close();}
});
