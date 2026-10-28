import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAgentGuard, createContainmentStateStore } from '../src/containment.js';
import { EvidenceRecorder } from '../src/runtime/evidence.js';
import { createTrustedExecutionGateway } from '../src/sdk.js';
import { createProtectedHostAdapter } from '../src/codex-connection-mcp.js';
import {createSecurityToolRouter} from '../src/security-router.js';
import {createSecurityGatewayHostAdapter} from '../execution-isolation/gateway-adapter/gateway-adapter.mjs';
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
  assert.equal(output.hookSpecificOutput.permissionDecisionReason, 'Agent Canary: permission_allowed');
  for (const canary of [inputCanary, reasonCanary, privateCallerPathCanary]) {
    assert.equal(result.stdout.includes(canary), false, `native hook stdout exposed ${canary}`);
    assert.equal(result.stderr.includes(canary), false, `native hook stderr exposed ${canary}`);
  }

  const jsonl = fs.readFileSync(log, 'utf8');
  const lines = jsonl.trim().split('\n');
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(record).sort(), ['hookEventName', 'permissionDecision', 'timestamp']);
  assert.equal(record.hookEventName, 'PreToolUse');
  assert.equal(record.permissionDecision, 'allow');
  assert.equal(record.timestamp, new Date(record.timestamp).toISOString());
  for (const canary of [inputCanary, reasonCanary, privateCallerPathCanary]) {
    assert.equal(jsonl.includes(canary), false, `native hook JSONL persisted ${canary}`);
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
    coverage: 'M2_FIXED_FILE_READS_ONLY',
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
    async () => ({ protectionStatus: 'UNKNOWN', coverage: 'ALL_TOOLS', privatePath: 'C:\\Users\\alice\\secret.txt' }),
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
  const state:{dependencyLoads:number;gatewayCreates:number;gatewayCloses:number;routerCallbacks:number;heldReadCallbacks:number;gatewayEvidence:number;unregisteredPaths:string[];workspaceRoot?:string;fixedFiles?:unknown;routeArguments?:unknown}={dependencyLoads:0,gatewayCreates:0,gatewayCloses:0,routerCallbacks:0,heldReadCallbacks:0,gatewayEvidence:0,unregisteredPaths:[]};
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
        const provider=Object.freeze({
          resolve:(call:unknown)=>options.gateway.verifyFileReadCapability(capability,call,'file-read')?capability:undefined,
          verify:(value:unknown,call:unknown,operation:string)=>value===capability&&operation==='file-read'&&options.gateway.verifyFileReadCapability(value,call,operation),
          async readFileWithCapability(value:unknown,call:unknown,signal?:AbortSignal){
            assert.equal(value,capability);assert.equal(signal?.aborted,false);state.heldReadCallbacks++;
            return options.gateway.readFileWithCapability(value,call,'file-read',signal);
          },
        });
        const router=options.createSecurityToolRouter({
          ...options.routerOptions,
          tools:{protected_read:{operation:'file-read',pathArg:'path'}},
          fileReadCapability:provider,
          executeRealTool:async()=>{
            state.routerCallbacks++;
            throw new Error('strict held reads must not use the generic path callback');
          },
        });
        return{dispatch:(call:unknown)=>{
          const candidate=(call as any)?.args?.path;
          if(candidate!=='agent-canary-public.txt'){state.unregisteredPaths.push(typeof candidate==='string'?candidate:'<non-string>');throw new TypeError('M2_SECURITY_GATEWAY_PATH_NOT_REGISTERED');}
          if(!options.gateway.verifyFileReadCapability(capability,call,'file-read'))throw new TypeError('M2_SECURITY_GATEWAY_CAPABILITY_INVALID');
          return router.dispatch(call);
        }};
      }};
      },
      createSecurityToolRouter(options:Record<string,any>){
        const provider=options.fileReadCapability;
        return{
          async dispatch(call:unknown){
            const resolved=provider.resolve(call);
            if(!resolved||provider.verify(resolved,call,'file-read')!==true)throw new TypeError('M5_HELD_FILE_CAPABILITY_INVALID');
            return provider.readFileWithCapability(resolved,call,new AbortController().signal);
          },
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
    assert.equal(dependencies.state.unregisteredPaths.length,2,'the lexical alias and physical junction alias must both be rejected by the fixed M2 map');
    assert.equal(dependencies.state.unregisteredPaths[0],'./agent-canary-public.txt');
    assert.ok(dependencies.state.unregisteredPaths[1].startsWith('..'+path.sep));
    assert.ok(dependencies.state.unregisteredPaths[1].includes('agent-canary-console-probe-alias-'));
    assert.equal(dependencies.state.heldReadCallbacks,1,'only the fixed positive control may reach the M2 held-read provider');
    assert.equal(dependencies.state.routerCallbacks,0,'strict file reads must bypass the generic path-only callback');
    assert.equal(dependencies.state.gatewayEvidence,1,'alias and same-path replacement denials must not add M1 read evidence');
    assert.equal(dependencies.state.gatewayCloses,1);
    assert.equal(fs.existsSync(dependencies.state.workspaceRoot??''),false,'the exact temporary probe directory is removed after the held Gateway closes');
  }finally{await console.close();}
});

test('default first-party Console CLI reads through the M2 held-file capability and M5 router',async(t)=>{
  const prefix='agent-canary-console-probe-';
  assert.equal(hasPublicM2GatewayAdapter,true,'the M2 facade must be resolved through its public package entry');
  assert.equal(hasPublicM5PolicyRouter,true,'the M5 router must be resolved through its public package entry');
  const [sdk,adapter,policy]=await Promise.all([
    import('@dorianchn/agent-canary/sdk'),
    import('@dorianchn/agent-canary/gateway-adapter'),
    import('@dorianchn/agent-canary/policy-router'),
  ]);
  assert.equal(typeof sdk.createTrustedExecutionGateway,'function');
  assert.equal(typeof adapter.createSecurityGatewayHostAdapter,'function');
  assert.equal(typeof policy.createSecurityToolRouter,'function');
  const childTempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'canary-console-cli-temp-'));
  const before=new Set(fs.readdirSync(childTempRoot).filter(name=>name.startsWith(prefix)));
  const child=spawn(process.execPath,[path.resolve('dist/index.js'),'ai','console','--port','0'],{
    cwd:process.cwd(),
    env:{...process.env,AGENT_CANARY_OPERATOR_CODE:'OPERATOR_FIXTURE',AGENT_CANARY_HOME:path.join(childTempRoot,'home'),TMP:childTempRoot,TEMP:childTempRoot,TMPDIR:childTempRoot},
    stdio:['ignore','pipe','pipe'],
    windowsHide:true,
  });
  let stdout='',stderr='';
  child.stdout.setEncoding('utf8').on('data',(chunk:string)=>stdout+=chunk);
  child.stderr.setEncoding('utf8').on('data',(chunk:string)=>stderr+=chunk);
  const closed=new Promise<{code:number|null;signal:NodeJS.Signals|null}>(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
  t.after(async()=>{
    if(child.exitCode===null&&child.signalCode===null)child.kill();
    await Promise.race([closed,new Promise(resolve=>setTimeout(resolve,5_000))]);
    fs.rmSync(childTempRoot,{recursive:true,force:true});
  });
  const consoleUrl=await new Promise<string>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('default Console CLI did not report its loopback URL: '+stderr.slice(-1000))),10_000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('close',exit=>{clearTimeout(timer);reject(new Error('default Console CLI exited before startup: '+JSON.stringify(exit)+' '+stderr.slice(-1000)));});
    child.stdout.on('data',()=>{
      const match=stdout.match(/Agent Canary 中文控制台: (http:\/\/127\.0\.0\.1:\d+)/);
      if(match){clearTimeout(timer);resolve(match[1]);}
    });
  });
  try{
    const csrf=await csrfFor(consoleUrl);
    const response=await fetch(consoleUrl+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'PASS',reason:'FIXED_PROBE_CONTROLS_PASSED',markerMatched:true},'PASS requires the M1 held-file positive read plus alias and same-path replacement denials through M2/M5');
  }finally{
    if(child.exitCode===null&&child.signalCode===null)child.kill();
    await Promise.race([closed,new Promise(resolve=>setTimeout(resolve,5_000))]);
  }
  const after=fs.readdirSync(childTempRoot).filter(name=>name.startsWith(prefix));
  assert.deepEqual(after.filter(name=>!before.has(name)),[],'the first-party fixed probe and its junction alias must be cleaned up');
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

function actualM1M2M5TargetDependencies(){
  let gateway:ReturnType<typeof createTrustedExecutionGateway>|undefined;
  let router:{pendingApprovals:()=>unknown[]}|undefined;
  let heldReadCallbacks=0;
  let genericCallbacks=0;
  let capabilityAvailable=true;
  let routerSettings:unknown;
  const heldReads:{name:string;path:string;result:unknown}[]=[];
  const loader=async()=>{
    const [sdk,adapter,policy]=await Promise.all([
      import('@dorianchn/agent-canary/sdk'),
      import('@dorianchn/agent-canary/gateway-adapter'),
      import('@dorianchn/agent-canary/policy-router'),
    ]);
    return{
      createGuard:(options:{sessionId?:string;alert?:boolean})=>sdk.createAgentGuard(options),
      createEvidenceRecorder:()=>new sdk.EvidenceRecorder(),
      createGateway:(options:Parameters<typeof createTrustedExecutionGateway>[0])=>gateway=sdk.createTrustedExecutionGateway(options),
      loadM2Facade:async()=>adapter,
      createSecurityToolRouter:(options:any)=>{
        routerSettings={workspaceRoot:options.workspaceRoot,mode:options.mode,verifyRealPaths:options.verifyRealPaths};
        const provider=options.fileReadCapability;
        const monitoredProvider={
          resolve:(call:any)=>capabilityAvailable?provider.resolve(call):undefined,
          verify:(capability:any,call:any,operation:any)=>provider.verify(capability,call,operation),
          readFileWithCapability:async(capability:any,call:any,signal?:AbortSignal)=>{
            heldReadCallbacks++;
            const result=await provider.readFileWithCapability(capability,call,signal);
            heldReads.push({name:call.name,path:call.args.path,result});
            return result;
          },
        };
        router=policy.createSecurityToolRouter({
          ...options,fileReadCapability:monitoredProvider,
          executeRealTool:(...args:any[])=>{genericCallbacks++;return options.executeRealTool(...args);},
        });
        return router;
      },
    };
  };
  return{
    loader,removeResolvedCapability:()=>{capabilityAvailable=false;},
    get gateway(){return gateway;},get heldReadCallbacks(){return heldReadCallbacks;},
    get genericCallbacks(){return genericCallbacks;},
    get heldReads(){return heldReads;},get routerSettings(){return routerSettings;},
    get pendingApprovals(){return router?.pendingApprovals().length??0;},
  };
}

async function postConfiguredTargetRead(url:string,csrf:string,body:unknown){
  return fetch(url+'/api/security-center/target-read',{
    method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},
    body:JSON.stringify(body),
  });
}

async function getConfiguredTargetReadiness(url:string,csrf:string){
  return fetch(url+'/api/security-center/configured-target-readiness',{
    headers:{'x-canary-csrf':csrf},
  });
}

async function assertConfiguredTargetReadiness(response:Response,expected:Record<string,unknown>){
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();
  assert.deepEqual(Object.keys(body).sort(),[
    'actionReadiness','bindingStatus','configurationStatus','generatedAt','operatorAuthStatus','schemaVersion','scope','targets',
  ]);
  assert.equal(body.schemaVersion,1);
  const generatedAt=Date.parse(body.generatedAt);
  assert.ok(Number.isFinite(generatedAt));
  assert.ok(Date.now()-generatedAt<=15_000,'fresh response timestamps are at most 15 seconds old');
  assert.ok(Date.now()-generatedAt>=-5_000,'response timestamp is not materially in the future');
  const{schemaVersion:_schemaVersion,generatedAt:_generatedAt,...payload}=body;
  assert.deepEqual(payload,expected);
  return body;
}

test('configured product target uses M1 held identity, M2 adapter, and M5 OBSERVE with target-ID-only responses',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-positive-'));
  fs.mkdirSync(path.join(workspace,'notes'));
  const targetPath=path.join(workspace,'notes','summary.txt'),original='PRIVATE_TARGET_CONTENT_MUST_NOT_ESCAPE';
  fs.writeFileSync(targetPath,original);
  const dependencies=actualM1M2M5TargetDependencies();
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],securityCenterTargetDependencies:dependencies.loader as never,
  });
  try{
    const csrf=await csrfFor(console.url),gateway=dependencies.gateway;
    assert.ok(gateway,'the CLI startup dependency seam should construct M1 before accepting requests');
    const evidenceBefore=gateway.evidence().length;
    const readiness=await getConfiguredTargetReadiness(console.url,csrf);
    const readinessBody=await assertConfiguredTargetReadiness(readiness,{
      scope:'M3_CONFIGURED_TARGET_READINESS',configurationStatus:'CONFIGURED',bindingStatus:'BOUND',
      actionReadiness:'READY',operatorAuthStatus:'CONFIGURED',targets:[{targetId:'summary',bindingStatus:'BOUND'}],
    });
    const readinessJson=JSON.stringify(readinessBody);
    for(const secret of [targetPath,original,'OPERATOR_FIXTURE','m3-target-summary','notes/summary.txt'])assert.equal(readinessJson.includes(secret),false);
    assert.equal(dependencies.heldReadCallbacks,0,'readiness inspection must not execute a configured target');
    assert.equal(gateway.evidence().length,evidenceBefore,'readiness inspection must not append execution evidence');
    for(const request of [{path:'notes/summary.txt'},{targetId:'not-configured'},{targetId:'summary',path:'notes/summary.txt'}]){
      const response=await postConfiguredTargetRead(console.url,csrf,request);
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    }
    assert.equal(dependencies.heldReadCallbacks,0,'path-only, extra-path, and unconfigured requests must stop before M5');
    assert.equal(gateway.evidence().length,evidenceBefore,'invalid requests must not append M1 evidence');
    assert.equal(dependencies.pendingApprovals,0,'OBSERVE must not create approvals');

    const positive=await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'});
    assert.equal(positive.status,200);
    const positiveBody=await positive.json();
    assert.deepEqual(positiveBody,{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});
    assert.equal(JSON.stringify(positiveBody).includes(original),false);
    assert.equal(JSON.stringify(positiveBody).includes(targetPath),false);
    assert.equal(dependencies.heldReadCallbacks,1);
    const evidenceAfterPositive=gateway.evidence();
    assert.ok(evidenceAfterPositive.length>evidenceBefore);
    assert.ok(evidenceAfterPositive.some(event=>event.decision==='ALLOW'));
    assert.equal(dependencies.pendingApprovals,0);

    const heldPath=targetPath+'.held',replacement='REPLACEMENT_CONTENT_MUST_NOT_ESCAPE';
    fs.renameSync(targetPath,heldPath);
    fs.writeFileSync(targetPath,replacement);
    const replacementEvidence=gateway.evidence().length,callbacksBefore=dependencies.heldReadCallbacks;
    const deniedReplacement=await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'});
    assert.deepEqual(await deniedReplacement.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    assert.equal(dependencies.heldReadCallbacks,callbacksBefore,'M2 must reject the replaced M1 identity before M5 read callback');
    assert.equal(gateway.evidence().length,replacementEvidence,'replacement rejection must add no M1 read evidence');
    assert.equal(dependencies.pendingApprovals,0);
    assert.equal(fs.readFileSync(targetPath,'utf8'),replacement);
    assert.equal(fs.readFileSync(heldPath,'utf8'),original);
    assert.equal(dependencies.genericCallbacks,0);
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured sensitive and symlink targets fail closed before M5 callbacks or M1 read evidence',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-denials-'));
  fs.mkdirSync(path.join(workspace,'.ssh'));
  fs.writeFileSync(path.join(workspace,'.ssh','id_rsa'),'SENSITIVE_ALIAS_FIXTURE');
  fs.mkdirSync(path.join(workspace,'real'));
  fs.writeFileSync(path.join(workspace,'real','notes.txt'),'SAFE_TARGET_FIXTURE');
  fs.symlinkSync(path.join(workspace,'real'),path.join(workspace,'alias'),process.platform==='win32'?'junction':'dir');
  fs.symlinkSync(path.join(workspace,'.ssh'),path.join(workspace,'sensitive-alias'),process.platform==='win32'?'junction':'dir');
  const dependencies=actualM1M2M5TargetDependencies();
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[{id:'credentials',path:'.ssh/id_rsa'},{id:'linked',path:'alias/notes.txt'},{id:'linked-credentials',path:'sensitive-alias/id_rsa'}],
    securityCenterTargetDependencies:dependencies.loader as never,
  });
  try{
    const csrf=await csrfFor(console.url);
    const readiness=await getConfiguredTargetReadiness(console.url,csrf);
    await assertConfiguredTargetReadiness(readiness,{
      scope:'M3_CONFIGURED_TARGET_READINESS',configurationStatus:'CONFIGURED',bindingStatus:'BLOCKED',
      actionReadiness:'BLOCKED',operatorAuthStatus:'CONFIGURED',targets:[
        {targetId:'credentials',bindingStatus:'BLOCKED'},
        {targetId:'linked',bindingStatus:'BLOCKED'},
        {targetId:'linked-credentials',bindingStatus:'BLOCKED'},
      ],
    });
    for(const targetId of ['credentials','linked','linked-credentials']){
      const response=await postConfiguredTargetRead(console.url,csrf,{targetId});
      assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    }
    assert.equal(dependencies.heldReadCallbacks,0);
    assert.equal(dependencies.gateway?.evidence().length,0);
    assert.equal(dependencies.pendingApprovals,0);
    assert.equal(dependencies.genericCallbacks,0);
    assert.equal(fs.readFileSync(path.join(workspace,'.ssh','id_rsa'),'utf8'),'SENSITIVE_ALIAS_FIXTURE');
    assert.equal(fs.readFileSync(path.join(workspace,'real','notes.txt'),'utf8'),'SAFE_TARGET_FIXTURE');
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured-target readiness reports unavailable without configuration and never invents readiness',async()=>{
  const console=await startAIConsole({port:0});
  try{
    const response=await getConfiguredTargetReadiness(console.url,await csrfFor(console.url));
    await assertConfiguredTargetReadiness(response,{
      scope:'M3_CONFIGURED_TARGET_READINESS',configurationStatus:'NOT_CONFIGURED',bindingStatus:'UNAVAILABLE',
      actionReadiness:'UNAVAILABLE',operatorAuthStatus:'NOT_CONFIGURED',targets:[],
    });
  }finally{await console.close();}
});

test('configured-target readiness preserves UNKNOWN for malformed configuration',async()=>{
  const console=await startAIConsole({port:0,securityCenterProtectedTargets:'malformed' as never});
  try{
    const response=await getConfiguredTargetReadiness(console.url,await csrfFor(console.url));
    await assertConfiguredTargetReadiness(response,{
      scope:'M3_CONFIGURED_TARGET_READINESS',configurationStatus:'UNKNOWN',bindingStatus:'UNKNOWN',
      actionReadiness:'UNKNOWN',operatorAuthStatus:'NOT_CONFIGURED',targets:[],
    });
  }finally{await console.close();}
});

test('configured-target readiness exposes only aggregate readiness when a binding lacks operator auth',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-auth-readiness-'));
  fs.writeFileSync(path.join(workspace,'safe.txt'),'AUTH_READINESS_FIXTURE');
  const dependencies=actualM1M2M5TargetDependencies();
  const console=await startAIConsole({
    port:0,securityCenterWorkspaceRoot:workspace,securityCenterProtectedTargets:[{id:'safe',path:'safe.txt'}],
    securityCenterTargetDependencies:dependencies.loader as never,
  });
  try{
    const readiness=await getConfiguredTargetReadiness(console.url,await csrfFor(console.url));
    await assertConfiguredTargetReadiness(readiness,{
      scope:'M3_CONFIGURED_TARGET_READINESS',configurationStatus:'CONFIGURED',bindingStatus:'BOUND',
      actionReadiness:'BLOCKED',operatorAuthStatus:'NOT_CONFIGURED',targets:[{targetId:'safe',bindingStatus:'BOUND'}],
    });
    assert.equal(dependencies.heldReadCallbacks,0);
    assert.equal(dependencies.gateway?.evidence().length,0);
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured target IDs retain their exact startup bindings without running the marker probe',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-bindings-'));
  fs.writeFileSync(path.join(workspace,'first.txt'),'PRIVATE_FIRST_TARGET');
  fs.writeFileSync(path.join(workspace,'second.txt'),'PRIVATE_SECOND_TARGET');
  const targets=[{id:'first',path:'first.txt'},{id:'second',path:'second.txt'}];
  const dependencies=actualM1M2M5TargetDependencies();
  let markerProbeLoads=0;
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:targets,securityCenterTargetDependencies:dependencies.loader as never,
    securityCenterProtectedReadDependencies:async()=>{markerProbeLoads++;throw new Error('marker probe must stay separate');},
  });
  try{
    targets[0].path='second.txt';
    targets.push({id:'late',path:'second.txt'});
    const csrf=await csrfFor(console.url),gateway=dependencies.gateway;
    assert.ok(gateway);
    assert.deepEqual(dependencies.routerSettings,{workspaceRoot:fs.realpathSync.native(workspace),mode:'OBSERVE',verifyRealPaths:true});
    for(const targetId of ['first','second']){
      const response=await postConfiguredTargetRead(console.url,csrf,{targetId});
      assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});
    }
    assert.deepEqual(dependencies.heldReads,[
      {name:'m3-target-first',path:'first.txt',result:{content:'PRIVATE_FIRST_TARGET'}},
      {name:'m3-target-second',path:'second.txt',result:{content:'PRIVATE_SECOND_TARGET'}},
    ],'each M5 read must retain its exact host-generated tool/path and M1 held-file result');
    const beforeUnknown=gateway.evidence().length;
    const unknown=await postConfiguredTargetRead(console.url,csrf,{targetId:'late'});
    assert.deepEqual(await unknown.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    assert.equal(dependencies.heldReadCallbacks,2);
    assert.equal(gateway.evidence().length,beforeUnknown);
    assert.equal(dependencies.pendingApprovals,0);
    assert.equal(markerProbeLoads,0);
    assert.equal(dependencies.genericCallbacks,0,'configured held reads must never enter the generic executor');
    assert.equal(fs.readFileSync(path.join(workspace,'first.txt'),'utf8'),'PRIVATE_FIRST_TARGET');
    assert.equal(fs.readFileSync(path.join(workspace,'second.txt'),'utf8'),'PRIVATE_SECOND_TARGET');
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured duplicate and invalid mappings deny without callbacks or read evidence',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-mappings-'));
  const files=['valid.txt','first.txt','second.txt','shared.txt'];
  for(const file of files)fs.writeFileSync(path.join(workspace,file),'UNCHANGED_'+file);
  const dependencies=actualM1M2M5TargetDependencies();
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[
      {id:'valid',path:'valid.txt'},
      {id:'duplicate',path:'first.txt'},{id:'duplicate',path:'second.txt'},
      {id:'same-a',path:'shared.txt'},{id:'same-b',path:'shared.txt'},
      {id:'lexical-alias',path:'./valid.txt'},{id:'traversal',path:'../outside.txt'},
      {id:'absolute',path:path.join(workspace,'valid.txt')},
    ],securityCenterTargetDependencies:dependencies.loader as never,
  });
  try{
    const csrf=await csrfFor(console.url),gateway=dependencies.gateway;
    assert.ok(gateway,'the unrelated valid binding must still construct the owner chain');
    for(const targetId of ['duplicate','same-a','same-b','lexical-alias','traversal','absolute','unknown']){
      const response=await postConfiguredTargetRead(console.url,csrf,{targetId});
      assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'},targetId);
    }
    assert.equal(dependencies.heldReadCallbacks,0);
    assert.equal(gateway.evidence().length,0);
    assert.equal(dependencies.pendingApprovals,0);
    assert.equal(dependencies.genericCallbacks,0);
    for(const file of files)assert.equal(fs.readFileSync(path.join(workspace,file),'utf8'),'UNCHANGED_'+file);
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured reads deny missing per-call and stale M1 capabilities before the held-read callback',async()=>{
  for(const mode of ['missing','stale'] as const){
    const workspace=fs.mkdtempSync(path.join(testHome,`configured-capability-${mode}-`));
    fs.writeFileSync(path.join(workspace,'safe.txt'),'UNCHANGED_CAPABILITY_FIXTURE');
    const dependencies=actualM1M2M5TargetDependencies();
    const console=await startAIConsole({
      port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
      securityCenterProtectedTargets:[{id:'safe',path:'safe.txt'}],securityCenterTargetDependencies:dependencies.loader as never,
    });
    try{
      const csrf=await csrfFor(console.url),gateway=dependencies.gateway;
      assert.ok(gateway);
      // Missing is an injected resolver fault at M3's trusted test seam; stale
      // uses the real M1 lifecycle to invalidate the already-bound capability.
      if(mode==='missing')dependencies.removeResolvedCapability();else await gateway.close();
      const evidenceBefore=gateway.evidence().length;
      const response=await postConfiguredTargetRead(console.url,csrf,{targetId:'safe'});
      assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'},mode);
      assert.equal(dependencies.heldReadCallbacks,0,mode);
      assert.equal(gateway.evidence().length,evidenceBefore,mode);
      assert.equal(dependencies.pendingApprovals,0,mode);
      assert.equal(dependencies.genericCallbacks,0,mode);
      assert.equal(fs.readFileSync(path.join(workspace,'safe.txt'),'utf8'),'UNCHANGED_CAPABILITY_FIXTURE');
    }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
  }
});

test('configured reads keep unavailable owner dependencies UNKNOWN with a sanitized response',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-missing-owner-'));
  fs.writeFileSync(path.join(workspace,'safe.txt'),'PRIVATE_CONFIGURED_OWNER_CONTENT');
  let ownerLoads=0,probeLoads=0;
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[{id:'safe',path:'safe.txt'}],
    securityCenterTargetDependencies:async()=>{ownerLoads++;throw new Error('PRIVATE_OWNER_DEPENDENCY_FAILURE '+workspace);},
    securityCenterProtectedReadDependencies:async()=>{probeLoads++;throw new Error('marker probe must stay separate');},
  });
  try{
    const response=await postConfiguredTargetRead(console.url,await csrfFor(console.url),{targetId:'safe'});
    assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'UNKNOWN'});
    assert.equal(ownerLoads,1);
    assert.equal(probeLoads,0);
    assert.equal(fs.readFileSync(path.join(workspace,'safe.txt'),'utf8'),'PRIVATE_CONFIGURED_OWNER_CONTENT');
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured route authentication and JSON failures return only DENY before protected dispatch',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-auth-'));
  fs.writeFileSync(path.join(workspace,'safe.txt'),'UNCHANGED_AUTH_FIXTURE');
  const dependencies=actualM1M2M5TargetDependencies();
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[{id:'safe',path:'safe.txt'}],securityCenterTargetDependencies:dependencies.loader as never,
  });
  try{
    const csrf=await csrfFor(console.url),gateway=dependencies.gateway;
    assert.ok(gateway);
    const cases:{label:string;headers?:Record<string,string>;body?:string;status:number}[]=[
      {label:'csrf',headers:{'x-canary-csrf':''},status:403},
      {label:'missing operator',headers:{'x-canary-operator-code':''},status:403},
      {label:'wrong operator',headers:{'x-canary-operator-code':'WRONG_PRIVATE_OPERATOR'},status:403},
      {label:'origin',headers:{origin:'http://untrusted.invalid'},status:403},
      {label:'host',headers:{host:'untrusted.invalid'},status:403},
      {label:'cross-site',headers:{'sec-fetch-site':'cross-site'},status:403},
      {label:'content type',headers:{'content-type':'text/plain'},status:415},
      {label:'malformed JSON',body:'{',status:400},
      {label:'oversized JSON',body:' '.repeat(32_001),status:413},
    ];
    for(const entry of cases){
      // fetch may rewrite Host; send the adversarial headers on the wire.
      const response=await new Promise<{status:number;body:string}>((resolve,reject)=>{
        const request=httpRequest(console.url+'/api/security-center/target-read',{
          method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE',...entry.headers},
        },response=>{
          let body='';
          response.setEncoding('utf8').on('data',(chunk:string)=>body+=chunk);
          response.once('error',reject);
          response.once('end',()=>resolve({status:response.statusCode??0,body}));
        });
        request.once('error',reject);
        request.end(entry.body??JSON.stringify({targetId:'safe'}));
      });
      assert.equal(response.status,entry.status,entry.label);
      assert.deepEqual(JSON.parse(response.body),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'},entry.label);
    }
    assert.equal(dependencies.heldReadCallbacks,0);
    assert.equal(gateway.evidence().length,0);
    assert.equal(dependencies.pendingApprovals,0);
    assert.equal(dependencies.genericCallbacks,0);
    assert.equal(fs.readFileSync(path.join(workspace,'safe.txt'),'utf8'),'UNCHANGED_AUTH_FIXTURE');
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('normal ai console CLI binds configured targets at process startup',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-cli-'));
  fs.mkdirSync(path.join(workspace,'notes'));
  fs.writeFileSync(path.join(workspace,'notes','brief.txt'),'CLI_TARGET_PRIVATE_CONTENT');
  const child=spawn(process.execPath,[
    path.resolve('dist/index.js'),'ai','console','--port','0','--workspace-root',workspace,'--protected-target','brief=notes/brief.txt',
  ],{
    cwd:process.cwd(),env:{...process.env,AGENT_CANARY_OPERATOR_CODE:'OPERATOR_FIXTURE'},
    stdio:['ignore','pipe','pipe'],windowsHide:true,
  });
  let stdout='',stderr='';
  child.stdout?.on('data',(chunk:Buffer)=>{stdout+=chunk.toString('utf8');});
  child.stderr?.on('data',(chunk:Buffer)=>{stderr+=chunk.toString('utf8');});
  try{
    const url=await new Promise<string>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('CLI_START_TIMEOUT '+stderr.slice(-1000))),15_000);
      const inspect=()=>{
        const match=stdout.match(/Agent Canary 中文控制台: (http:\/\/127\.0\.0\.1:\d+)/);
        if(match){clearTimeout(timer);resolve(match[1]);}
      };
      child.stdout?.on('data',inspect);
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('exit',code=>{clearTimeout(timer);reject(new Error(`CLI_EXIT_${code} ${stderr.slice(-1000)}`));});
      inspect();
    });
    const csrf=await csrfFor(url);
    const response=await postConfiguredTargetRead(url,csrf,{targetId:'brief'});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.deepEqual(body,{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});
    assert.equal(JSON.stringify(body).includes('CLI_TARGET_PRIVATE_CONTENT'),false);
  }finally{
    if(child.exitCode===null&&child.signalCode===null){
      child.kill();
      await new Promise<void>(resolve=>child.once('exit',()=>resolve()));
    }
    fs.rmSync(workspace,{recursive:true,force:true});
  }
});
