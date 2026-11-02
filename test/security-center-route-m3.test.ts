import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAgentGuard, createContainmentStateStore } from '../src/containment.js';
import { EvidenceRecorder } from '../src/runtime/evidence.js';
import { createTrustedExecutionGateway } from '../src/sdk.js';
import { createProtectedHostAdapter } from '../src/codex-connection-mcp.js';
import {createSecurityToolRouter} from '../src/security-router.js';
import {createSecurityGatewayHostAdapter} from '../execution-isolation/gateway-adapter/gateway-adapter.mjs';
import { adaptConfiguredTargetReadiness, isValidSecurityCenterStatusPayload } from '../src/ai/security-center-adapter.js';

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
  const loader=async()=>({
    createGuard:(options:{sessionId?:string;alert?:boolean})=>createAgentGuard(options),
    createEvidenceRecorder:()=>new EvidenceRecorder(),
    createGateway:(options:Parameters<typeof createTrustedExecutionGateway>[0])=>gateway=createTrustedExecutionGateway(options),
    loadM2Facade:async()=>({createSecurityGatewayHostAdapter}),
    createSecurityToolRouter:(options:any)=>{
      const provider=options.fileReadCapability;
      const monitoredProvider={
        resolve:(call:any)=>provider.resolve(call),
        verify:(capability:any,call:any,operation:any)=>provider.verify(capability,call,operation),
        readFileWithCapability:(capability:any,call:any,signal?:AbortSignal)=>{
          heldReadCallbacks++;
          return provider.readFileWithCapability(capability,call,signal);
        },
      };
      router=createSecurityToolRouter({...options,eventsFile:path.join(testHome,'target-policy-events.jsonl'),fileReadCapability:monitoredProvider});
      return router;
    },
  });
  return{loader,get gateway(){return gateway;},get heldReadCallbacks(){return heldReadCallbacks;},get pendingApprovals(){return router?.pendingApprovals().length??0;}};
}

async function postConfiguredTargetRead(url:string,csrf:string,body:unknown){
  return fetch(url+'/api/security-center/target-read',{
    method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},
    body:JSON.stringify(body),
  });
}

test('configured-target Console uses the built M1/M2/M5 package exports and denies replacement',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'default-package-target-read-'));
  const notes=path.join(workspace,'notes');fs.mkdirSync(notes);
  const target=path.join(notes,'summary.txt'),held=target+'.held',replacement=path.join(notes,'replacement.txt');
  fs.writeFileSync(target,'DEFAULT_PACKAGE_HELD_TARGET');
  fs.writeFileSync(replacement,'UNREGISTERED_REPLACEMENT_MUST_NOT_READ');
  const console=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],
  });
  try{
    const csrf=await csrfFor(console.url);
    const readiness=await fetch(console.url+'/api/security-center/configured-target-readiness',{headers:{'x-canary-csrf':csrf}});
    assert.equal(readiness.status,200);
    const state=await readiness.json();
    assert.equal(state.configurationStatus,'CONFIGURED');
    assert.equal(state.bindingStatus,'BOUND');
    assert.equal(state.actionReadiness,'READY');
    assert.deepEqual(await (await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'})).json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});

    fs.renameSync(target,held);fs.renameSync(replacement,target);
    assert.deepEqual(await (await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'})).json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    assert.equal(fs.readFileSync(target,'utf8'),'UNREGISTERED_REPLACEMENT_MUST_NOT_READ');
    assert.equal(fs.readFileSync(held,'utf8'),'DEFAULT_PACKAGE_HELD_TARGET');
  }finally{await console.close();}
});

test('configured-target readiness returns only fresh fixed labels and fails closed when unconfigured',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-readiness-'));
  fs.mkdirSync(path.join(workspace,'notes'));
  const privatePath=path.join(workspace,'notes','summary.txt'),privateContent='READINESS_PRIVATE_CONTENT';
  fs.writeFileSync(privatePath,privateContent);
  const dependencies=actualM1M2M5TargetDependencies();
  const configured=await startAIConsole({
    port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
    securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],securityCenterTargetDependencies:dependencies.loader as never,
  });
  try{
    const csrf=await csrfFor(configured.url);
    const response=await fetch(configured.url+'/api/security-center/configured-target-readiness',{headers:{'x-canary-csrf':csrf}});
    assert.equal(response.status,200);
    const readiness=await response.json();
    assert.deepEqual(Object.keys(readiness).sort(),['scope','schemaVersion','generatedAt','configurationStatus','bindingStatus','actionReadiness','operatorAuthStatus','targets'].sort());
    assert.equal(readiness.scope,'M3_CONFIGURED_TARGET_READINESS');
    assert.equal(readiness.schemaVersion,1);assert.equal(readiness.configurationStatus,'CONFIGURED');
    assert.equal(readiness.bindingStatus,'BOUND');assert.equal(readiness.actionReadiness,'READY');
    assert.equal(readiness.operatorAuthStatus,'CONFIGURED');
    assert.deepEqual(readiness.targets,[{targetId:'summary',bindingStatus:'BOUND'}]);
    assert.equal(adaptConfiguredTargetReadiness(readiness).valid,true);
    const serialized=JSON.stringify(readiness);
    for(const secret of [privatePath,privateContent,'OPERATOR_FIXTURE'])assert.equal(serialized.includes(secret),false);
    const missingCsrf=await fetch(configured.url+'/api/security-center/configured-target-readiness');
    assert.equal(missingCsrf.status,403);
    const wrongMethod=await fetch(configured.url+'/api/security-center/configured-target-readiness',{method:'POST',headers:{'x-canary-csrf':csrf,'content-type':'application/json'},body:'{}'});
    assert.equal(wrongMethod.status,405);
  }finally{await configured.close();fs.rmSync(workspace,{recursive:true,force:true});}

  const unconfigured=await startAIConsole({port:0});
  try{
    const csrf=await csrfFor(unconfigured.url);
    const response=await fetch(unconfigured.url+'/api/security-center/configured-target-readiness',{headers:{'x-canary-csrf':csrf}});
    const readiness=await response.json();
    assert.deepEqual({configurationStatus:readiness.configurationStatus,bindingStatus:readiness.bindingStatus,actionReadiness:readiness.actionReadiness,operatorAuthStatus:readiness.operatorAuthStatus,targets:readiness.targets},{configurationStatus:'NOT_CONFIGURED',bindingStatus:'UNAVAILABLE',actionReadiness:'UNAVAILABLE',operatorAuthStatus:'NOT_CONFIGURED',targets:[]});
    assert.equal(adaptConfiguredTargetReadiness(readiness).valid,true);
  }finally{await unconfigured.close();}
});

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
  }finally{await console.close();fs.rmSync(workspace,{recursive:true,force:true});}
});

test('configured-target Console rejects a relocated workspace junction even when the selected file identity is unchanged',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-root-junction-'));
  const notes=path.join(workspace,'notes'),relocated=workspace+'-relocated';fs.mkdirSync(notes);
  const targetPath=path.join(notes,'summary.txt');fs.writeFileSync(targetPath,'AUTHORIZED_ROOT_BOUND_FIXTURE');
  const selectedFileIdentity=fs.lstatSync(targetPath,{bigint:true});
  const dependencies=actualM1M2M5TargetDependencies(),baseLoader=dependencies.loader,originalOpenSync=fs.openSync;
  let relocatedTargetOpenCalls=0,console:Awaited<ReturnType<typeof startAIConsole>>|undefined;
  const loader=async()=>{
    const loaded=await baseLoader();
    fs.renameSync(workspace,relocated);
    fs.symlinkSync(relocated,workspace,process.platform==='win32'?'junction':'dir');
    (fs as any).openSync=(candidate:any,...args:any[])=>{
      if(path.resolve(String(candidate))===path.resolve(path.join(relocated,'notes','summary.txt')))relocatedTargetOpenCalls++;
      return(originalOpenSync as any)(candidate,...args);
    };
    return loaded;
  };
  try{
    console=await startAIConsole({
      port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
      securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],securityCenterTargetDependencies:loader as never,
    });
    (fs as any).openSync=originalOpenSync;
    const csrf=await csrfFor(console.url);
    const readiness=await (await fetch(console.url+'/api/security-center/configured-target-readiness',{headers:{'x-canary-csrf':csrf}})).json();
    assert.equal(readiness.configurationStatus,'CONFIGURED');
    assert.equal(readiness.bindingStatus,'BLOCKED');
    assert.equal(readiness.actionReadiness,'BLOCKED');
    const response=await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'});
    assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'UNKNOWN'});
    assert.equal(relocatedTargetOpenCalls,0,'M1 rejects the changed canonical root before opening the selected file');
    assert.equal(dependencies.heldReadCallbacks,0,'the root alias never reaches M5');
    assert.equal(dependencies.pendingApprovals,0);
    const relocatedStat=fs.lstatSync(path.join(relocated,'notes','summary.txt'),{bigint:true});
    assert.deepEqual({dev:relocatedStat.dev,ino:relocatedStat.ino,birthtimeNs:relocatedStat.birthtimeNs,ctimeNs:relocatedStat.ctimeNs,mtimeNs:relocatedStat.mtimeNs,size:relocatedStat.size},
      {dev:selectedFileIdentity.dev,ino:selectedFileIdentity.ino,birthtimeNs:selectedFileIdentity.birthtimeNs,ctimeNs:selectedFileIdentity.ctimeNs,mtimeNs:selectedFileIdentity.mtimeNs,size:selectedFileIdentity.size},
      'the negative control preserves the exact file identity so only the root binding rejects it');
  }finally{
    (fs as any).openSync=originalOpenSync;
    await console?.close();
    try{fs.rmSync(workspace,{recursive:true,force:true});}catch{}
    fs.rmSync(relocated,{recursive:true,force:true});
  }
});

test('configured-target Console denies a replacement between its identity check and M1 registration',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-registration-race-'));
  const notes=path.join(workspace,'notes');fs.mkdirSync(notes);
  const targetPath=path.join(notes,'summary.txt'),heldPath=path.join(notes,'summary-held.txt'),original='AUTHORIZED_CONFIGURED_TARGET',replacement='UNAUTHORIZED_REPLACEMENT_MUST_NOT_BE_BOUND';
  fs.writeFileSync(targetPath,original);
  const dependencies=actualM1M2M5TargetDependencies(),baseLoader=dependencies.loader;
  const originalOpenSync=fs.openSync;let targetOpenCalls=0,console:Awaited<ReturnType<typeof startAIConsole>>|undefined;
  const loader=async()=>{
    const loaded=await baseLoader();
    // This runs after the Console captures the target identity but before M1 registers it.
    fs.renameSync(targetPath,heldPath);fs.writeFileSync(targetPath,replacement);
    (fs as any).openSync=(candidate:any,...args:any[])=>{
      if(path.resolve(String(candidate))===path.resolve(targetPath))targetOpenCalls++;
      return(originalOpenSync as any)(candidate,...args);
    };
    return loaded;
  };
  try{
    console=await startAIConsole({
      port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
      securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],securityCenterTargetDependencies:loader as never,
    });
    (fs as any).openSync=originalOpenSync;
    const csrf=await csrfFor(console.url),response=await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'});
    assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'UNKNOWN'});
    assert.equal(targetOpenCalls,0,'M1 rejects the stale expected identity before opening the replacement path');
    assert.equal(dependencies.heldReadCallbacks,0,'the replaced path never reaches the M5 callback');
    assert.equal(dependencies.pendingApprovals,0);
    assert.equal(fs.readFileSync(heldPath,'utf8'),original);
    assert.equal(fs.readFileSync(targetPath,'utf8'),replacement);
  }finally{
    (fs as any).openSync=originalOpenSync;
    await console?.close();fs.rmSync(workspace,{recursive:true,force:true});
  }
});

test('built-package Console rejects an external junction swap to a protected hardlink before content reads',{skip:process.platform!=='win32'},async()=>{
  const workspace=fs.realpathSync.native(fs.mkdtempSync(path.join(testHome,'configured-target-external-junction-open-')));
  const notesPath=path.join(workspace,'notes'),movedNotes=path.join(workspace,'notes-held'),outside=fs.mkdtempSync(path.join(testHome,'configured-target-external-junction-outside-'));
  const targetPath=path.join(notesPath,'summary.txt'),outsideNotes=path.join(outside,'notes'),outsideTarget=path.join(outsideNotes,'summary.txt'),protectedTarget=path.join(outside,'.ssh','id_rsa');
  fs.mkdirSync(path.dirname(targetPath),{recursive:true});fs.mkdirSync(path.dirname(outsideTarget),{recursive:true});fs.mkdirSync(path.dirname(protectedTarget),{recursive:true});
  const original='AUTHORIZED_SUMMARY_FIXTURE',secret='PROTECTED_SSH_KEY_CANARY_MUST_NOT_ESCAPE';
  fs.writeFileSync(targetPath,original);fs.writeFileSync(protectedTarget,secret);fs.linkSync(protectedTarget,outsideTarget);
  const protectedHash=createHash('sha256').update(fs.readFileSync(protectedTarget)).digest('hex');
  const originalLstatSync=fs.lstatSync,originalOpenSync=fs.openSync,originalReadSync=fs.readSync;
  let junctionInstalled=false,notesRestored=false,targetLstatCalls=0,targetOpenCalls=0,targetFd:number|undefined,targetReadCalls=0,swapError='';
  let console:Awaited<ReturnType<typeof startAIConsole>>|undefined;
  const swapScript="const fs=require('node:fs');const [mode,notes,moved,outsideNotes]=process.argv.slice(1);if(mode==='install'){fs.renameSync(notes,moved);fs.symlinkSync(outsideNotes,notes,'junction');process.stdout.write('JUNCTION_INSTALLED');}else if(mode==='restore'){fs.rmdirSync(notes);fs.renameSync(moved,notes);process.stdout.write('JUNCTION_RESTORED');}else process.exit(2);";
  try{
    assert.equal(hasPublicM2GatewayAdapter,true,'the Console must resolve the built M2 package entry');
    assert.equal(hasPublicM5PolicyRouter,true,'the Console must resolve the built M5 package entry');
    (fs as any).lstatSync=(candidate:any,...args:any[])=>{
      const stat=(originalLstatSync as any)(candidate,...args);
      if(path.resolve(String(candidate))===path.resolve(targetPath)&&++targetLstatCalls===2){
        try{
          const result=execFileSync(process.execPath,['-e',swapScript,'install',notesPath,movedNotes,outsideNotes],{encoding:'utf8',windowsHide:true});
          assert.equal(result,'JUNCTION_INSTALLED','an independent process must install the child junction after Gateway lstat');
          junctionInstalled=true;
        }catch(error){swapError=String(error);throw error;}
      }
      return stat;
    };
    (fs as any).openSync=(candidate:any,...args:any[])=>{
      const fd=(originalOpenSync as any)(candidate,...args);
      if(path.resolve(String(candidate))===path.resolve(targetPath)){targetOpenCalls++;targetFd=fd;}
      return fd;
    };
    (fs as any).readSync=(fd:number,...args:any[])=>{if(fd===targetFd)targetReadCalls++;return(originalReadSync as any)(fd,...args);};
    console=await startAIConsole({
      port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
      securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],
    });
    (fs as any).lstatSync=originalLstatSync;(fs as any).openSync=originalOpenSync;(fs as any).readSync=originalReadSync;
    if(junctionInstalled){
      const restored=execFileSync(process.execPath,['-e',swapScript,'restore',notesPath,movedNotes,outsideNotes],{encoding:'utf8',windowsHide:true});
      notesRestored=restored==='JUNCTION_RESTORED'&&fs.existsSync(targetPath)&&!fs.existsSync(movedNotes);
    }
    const outsideIdentity=fs.statSync(outsideTarget,{bigint:true});
    assert.equal(junctionInstalled,true,`the external junction must be installed after M1 lstat; targetLstatCalls=${targetLstatCalls}, swapError=${swapError}`);
    assert.equal(notesRestored,true,'the independent process must restore the original parent directory after no-follow rejection');
    assert.equal(targetOpenCalls,0,'M1 rejects the junction before attempting a path-based file open');
    assert.equal(outsideIdentity.nlink,2n,'the external fixture is a protected hard link before the attempted read');
    assert.equal(targetReadCalls,0,'M1 reads no content from the external hard-link target');
    const csrf=await csrfFor(console.url),response=await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'}),body=await response.json();
    assert.equal(response.status,200);
    assert.deepEqual(body,{scope:'M3_CONFIGURED_TARGET_READ',status:'UNKNOWN'});
    assert.equal(JSON.stringify(body).includes(original),false);
    assert.equal(JSON.stringify(body).includes(secret),false);
    assert.equal(JSON.stringify(body).includes(targetPath),false);
    assert.equal(fs.readFileSync(targetPath,'utf8'),original);
    assert.equal(fs.readFileSync(outsideTarget,'utf8'),secret);
    assert.equal(fs.readFileSync(protectedTarget,'utf8'),secret);
    assert.equal(createHash('sha256').update(fs.readFileSync(protectedTarget)).digest('hex'),protectedHash);
  }finally{
    (fs as any).lstatSync=originalLstatSync;(fs as any).openSync=originalOpenSync;(fs as any).readSync=originalReadSync;
    if(fs.existsSync(notesPath)){
      try{if(fs.lstatSync(notesPath).isSymbolicLink())fs.rmdirSync(notesPath);}catch{}
    }
    if(fs.existsSync(movedNotes)&&!fs.existsSync(notesPath))fs.renameSync(movedNotes,notesPath);
    await console?.close();fs.rmSync(workspace,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('built-package Console route never redirects a held read during a protected-key transient alias swap',async()=>{
  const workspace=fs.realpathSync.native(fs.mkdtempSync(path.join(testHome,'configured-target-transient-alias-')));
  const notes=path.join(workspace,'notes'),heldNotes=path.join(workspace,'notes-held'),outside=fs.mkdtempSync(path.join(testHome,'configured-target-transient-outside-'));
  fs.mkdirSync(notes);const targetPath=path.join(notes,'summary.txt'),heldTarget=path.join(notes,'summary-held.txt'),external=path.join(outside,'.ssh','id_rsa');
  const original='AUTHORIZED_SUMMARY_FIXTURE',secret='SYNTHETIC_PROTECTED_SSH_KEY_MUST_NOT_ESCAPE',externalBefore=Buffer.from(secret);
  fs.writeFileSync(targetPath,original);fs.mkdirSync(path.dirname(external),{recursive:true});fs.writeFileSync(external,secret);
  const originalOpenSync=fs.openSync,originalReadSync=fs.readSync;
  let registeredFd:number|undefined,observedReadFd:number|undefined,aliasInstalled=false,restored=false,readText='',readIntercepts=0,swapError='',console:Awaited<ReturnType<typeof startAIConsole>>|undefined;
  const externalSwapScript="const fs=require('node:fs');const [mode,target,held,external]=process.argv.slice(1);if(mode==='install'){fs.renameSync(target,held);fs.linkSync(external,target);process.stdout.write('ALIAS_INSTALLED');}else if(mode==='restore'){fs.unlinkSync(target);fs.renameSync(held,target);process.stdout.write('ALIAS_RESTORED');}else process.exit(2);";
  try{
    assert.equal(hasPublicM2GatewayAdapter,true,'the built Console must resolve the M2 package entry');
    assert.equal(hasPublicM5PolicyRouter,true,'the built Console must resolve the M5 package entry');
    (fs as any).openSync=(candidate:any,...args:any[])=>{const fd=originalOpenSync(candidate,...args);if(path.resolve(String(candidate))===path.resolve(targetPath)&&registeredFd===undefined)registeredFd=fd;return fd;};
    console=await startAIConsole({
      port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
      securityCenterProtectedTargets:[{id:'summary',path:'notes/summary.txt'}],
    });
    (fs as any).openSync=originalOpenSync;
    const csrf=await csrfFor(console.url);
    (fs as any).readSync=(fd:number,...args:any[])=>{
      readIntercepts++;
      if(!aliasInstalled){
        let moved=false,alias=false;
        try{
          if(process.platform==='win32'){
            let result='';
            try{result=execFileSync(process.execPath,['-e',externalSwapScript,'install',targetPath,heldTarget,external],{encoding:'utf8',windowsHide:true});}
            catch(error){swapError=String(error);throw error;}
            assert.equal(result,'ALIAS_INSTALLED','a separate OS process must install the transient NTFS hard-link alias');
            aliasInstalled=true;
          }else{
            aliasInstalled=true;
            fs.renameSync(notes,heldNotes);moved=true;fs.symlinkSync(outside,notes,'dir');alias=true;
          }
          const count=(originalReadSync as any)(fd,...args);observedReadFd=fd;
          if(count>0&&Buffer.isBuffer(args[0])&&typeof args[1]==='number')readText+=args[0].subarray(args[1],args[1]+count).toString('utf8');
          return count;
        }finally{
          if(process.platform==='win32'){
            if(aliasInstalled){
              const result=execFileSync(process.execPath,['-e',externalSwapScript,'restore',targetPath,heldTarget,external],{encoding:'utf8',windowsHide:true});
              restored=result==='ALIAS_RESTORED'&&fs.existsSync(targetPath)&&!fs.existsSync(heldTarget);
            }
          }else{
            if(alias)try{fs.unlinkSync(notes);}catch{}
            if(moved&&fs.existsSync(heldNotes)&&!fs.existsSync(notes))fs.renameSync(heldNotes,notes);
            restored=fs.existsSync(notes)&&!fs.existsSync(heldNotes);
          }
        }
      }
      observedReadFd=fd;const count=(originalReadSync as any)(fd,...args);
      if(count>0&&Buffer.isBuffer(args[0])&&typeof args[1]==='number')readText+=args[0].subarray(args[1],args[1]+count).toString('utf8');
      return count;
    };
    const response=await postConfiguredTargetRead(console.url,csrf,{targetId:'summary'}),body=await response.json();
    assert.equal(response.status,200);
    assert.deepEqual(body,{scope:'M3_CONFIGURED_TARGET_READ',status:process.platform==='win32'?'UNKNOWN':'ALLOW'});
    assert.equal(aliasInstalled,true,`the alias must be installed during the built M1/M2/M5 route read; intercepts=${readIntercepts}, body=${JSON.stringify(body)}, swapError=${swapError}`);
    assert.equal(restored,true,'the original target path must be restored before the Gateway post-read check');
    assert.equal(observedReadFd,registeredFd,'the Console route reads only through the M1 descriptor retained at startup');
    assert.equal(readText,original,'the route never reads bytes from the transient external alias');
    assert.equal(readIntercepts,1,'the configured package route must read the registered fixture through one held-descriptor operation');
    assert.equal(JSON.stringify(body).includes(secret),false);
    assert.equal(JSON.stringify(body).includes(original),false);
    assert.equal(JSON.stringify(body).includes(targetPath),false);
    assert.deepEqual(fs.readFileSync(external),externalBefore);
    assert.deepEqual(fs.readFileSync(targetPath,'utf8'),original);
  }finally{
    (fs as any).openSync=originalOpenSync;(fs as any).readSync=originalReadSync;
    if(process.platform==='win32'&&fs.existsSync(heldTarget)){
      try{if(fs.existsSync(targetPath))fs.unlinkSync(targetPath);fs.renameSync(heldTarget,targetPath);}catch{}
    }
    if(console)await console.close();
    fs.rmSync(workspace,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});
  }
});

test('configured sensitive, symlink, and hard-link aliases fail before M1 opens or M5 callbacks',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-denials-'));
  const outside=fs.mkdtempSync(path.join(testHome,'configured-target-outside-'));
  const protectedTargets=[
    {id:'env',path:'.env'},
    {id:'ssh-private-key',path:'.ssh/id_rsa'},
    {id:'aws-credentials',path:'.aws/credentials'},
    {id:'azure-tokens',path:'.azure/accessTokens.json'},
    {id:'kube-config',path:'.kube/config'},
    {id:'docker-config',path:'.docker/config.json'},
    {id:'gnupg-private-key',path:'.gnupg/private-keys-v1.d/key'},
    {id:'server-key',path:'tls/server.key'},
    {id:'public-pem',path:'certificates/signing.pem'},
    {id:'client-p12',path:'keystores/client.p12'},
    {id:'client-pfx',path:'keystores/client.pfx'},
    {id:'ssh-ppk',path:'ssh/workstation.ppk'},
    {id:'java-keystore',path:'stores/keys.jks'},
    {id:'java-encrypted-keystore',path:'stores/secrets.jceks'},
    {id:'app-keystore',path:'stores/app.keystore'},
    {id:'keepass-database',path:'stores/passwords.kdbx'},
    {id:'credential-database',path:'stores/passwords.kdb'},
    {id:'kerberos-keytab',path:'krb5/user.keytab'},
    {id:'openvpn-config',path:'vpn/client.ovpn'},
    {id:'service-account',path:'service-account-credentials.json'},
    {id:'ssh-security-key',path:'id_ecdsa_sk'},
  ] as const;
  for(const {path:relative} of protectedTargets){const target=path.join(workspace,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'SENSITIVE_EXTENSION_FIXTURE_'+relative);}
  const protectedHashes=new Map(protectedTargets.map(({path:relative})=>[relative,createHash('sha256').update(fs.readFileSync(path.join(workspace,relative))).digest('hex')]));
  fs.writeFileSync(path.join(outside,'outside.txt'),'OUTSIDE_FIXTURE');
  const outsideProtectedPath=path.join(outside,'.ssh','id_rsa'),hardlinkAliasPath=path.join(workspace,'notes','credential-copy.txt');
  fs.mkdirSync(path.dirname(outsideProtectedPath),{recursive:true});fs.mkdirSync(path.dirname(hardlinkAliasPath),{recursive:true});
  fs.writeFileSync(outsideProtectedPath,'OUTSIDE_PROTECTED_HARDLINK_FIXTURE');fs.linkSync(outsideProtectedPath,hardlinkAliasPath);
  const outsideProtectedHash=createHash('sha256').update(fs.readFileSync(outsideProtectedPath)).digest('hex');
  fs.mkdirSync(path.join(workspace,'real'));
  fs.writeFileSync(path.join(workspace,'real','notes.txt'),'SAFE_TARGET_FIXTURE');
  fs.symlinkSync(path.join(workspace,'real'),path.join(workspace,'alias'),process.platform==='win32'?'junction':'dir');
  fs.symlinkSync(path.join(workspace,'.ssh'),path.join(workspace,'secret-alias'),process.platform==='win32'?'junction':'dir');
  fs.symlinkSync(outside,path.join(workspace,'outside-alias'),process.platform==='win32'?'junction':'dir');
  const dependencies=actualM1M2M5TargetDependencies();
  const protectedAbsolutePaths=new Set([...protectedTargets.map(({path:relative})=>path.resolve(workspace,relative)),path.resolve(hardlinkAliasPath)]),originalOpenSync=fs.openSync,originalReadSync=fs.readSync;
  let protectedOpenCalls=0,protectedReadCalls=0,console:Awaited<ReturnType<typeof startAIConsole>>|undefined;
  (fs as any).openSync=(candidate:any,...args:any[])=>{if(protectedAbsolutePaths.has(path.resolve(String(candidate))))protectedOpenCalls++;return(originalOpenSync as any)(candidate,...args);};
  (fs as any).readSync=(...args:any[])=>{protectedReadCalls++;return(originalReadSync as any)(...args);};
  try{
    console=await startAIConsole({
      port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterWorkspaceRoot:workspace,
       securityCenterProtectedTargets:[{id:'safe',path:'real/notes.txt'},...protectedTargets,{id:'linked',path:'alias/notes.txt'},{id:'secret-alias',path:'secret-alias/id_rsa'},{id:'outside-alias',path:'outside-alias/outside.txt'},{id:'hardlink-alias',path:'notes/credential-copy.txt'}],
      securityCenterTargetDependencies:dependencies.loader as never,
    });
    const csrf=await csrfFor(console.url);
    assert.deepEqual(await (await postConfiguredTargetRead(console.url,csrf,{targetId:'safe'})).json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'ALLOW'});
    assert.equal(dependencies.heldReadCallbacks,1);
    const evidenceAfterSafe=dependencies.gateway!.evidence().length;
    assert.ok(evidenceAfterSafe>0);
    const protectedReadCountAfterSafe=protectedReadCalls;
     for(const targetId of [...protectedTargets.map(target=>target.id),'linked','secret-alias','outside-alias','hardlink-alias']){
      const response=await postConfiguredTargetRead(console.url,csrf,{targetId});
      assert.deepEqual(await response.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    }
    assert.equal(dependencies.heldReadCallbacks,1);
    assert.equal(dependencies.gateway?.evidence().length,evidenceAfterSafe);
    assert.equal(dependencies.pendingApprovals,0);
     assert.equal(protectedOpenCalls,0,'M1/M2/M5 configured-target routing never opens any configured sensitive credential target');
     assert.equal(protectedReadCalls,protectedReadCountAfterSafe,'denied sensitive targets never read content');
     for(const {path:relative} of protectedTargets)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(workspace,relative))).digest('hex'),protectedHashes.get(relative));
    assert.equal(fs.readFileSync(path.join(outside,'outside.txt'),'utf8'),'OUTSIDE_FIXTURE');
    assert.equal(fs.statSync(hardlinkAliasPath).nlink,2);
    assert.equal(createHash('sha256').update(fs.readFileSync(outsideProtectedPath)).digest('hex'),outsideProtectedHash);
  }finally{(fs as any).openSync=originalOpenSync;(fs as any).readSync=originalReadSync;await console?.close();fs.rmSync(workspace,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});}
});

test('normal ai console CLI binds configured targets at process startup',async()=>{
  const workspace=fs.mkdtempSync(path.join(testHome,'configured-target-cli-'));
  const outside=fs.mkdtempSync(path.join(testHome,'configured-target-cli-outside-'));
  fs.mkdirSync(path.join(workspace,'notes'));
  const targetPath=path.join(workspace,'notes','brief.txt');
  const heldTargetPath=targetPath+'.held';
  const original='CLI_TARGET_PRIVATE_CONTENT',outsideCanary='CLI_OUTSIDE_JUNCTION_CANARY';
  fs.writeFileSync(targetPath,original);
  fs.writeFileSync(path.join(outside,'brief.txt'),outsideCanary);
  fs.symlinkSync(outside,path.join(workspace,'linked'),process.platform==='win32'?'junction':'dir');
  const child=spawn(process.execPath,[
    path.resolve('dist/index.js'),'ai','console','--port','0','--workspace-root',workspace,
    '--protected-target','brief=notes/brief.txt','--protected-target','linked=linked/brief.txt',
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
    assert.equal(JSON.stringify(body).includes(original),false);

    const notesDirectory=path.join(workspace,'notes');
    const heldNotesDirectory=path.join(workspace,'notes-held');
    if(process.platform==='win32'){
      assert.throws(
        ()=>fs.renameSync(notesDirectory,heldNotesDirectory),
        (error:NodeJS.ErrnoException)=>error.code==='EPERM'||error.code==='EACCES',
        'the normal CLI must keep its bound parent directory from being replaced while the M1 handle is live',
      );
    }else{
      fs.renameSync(notesDirectory,heldNotesDirectory);
      try{
        fs.symlinkSync(outside,notesDirectory,'dir');
        const parentAlias=await postConfiguredTargetRead(url,csrf,{targetId:'brief'});
        assert.deepEqual(await parentAlias.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
        assert.equal(fs.readFileSync(path.join(outside,'brief.txt'),'utf8'),outsideCanary);
      }finally{
        try{if(fs.lstatSync(notesDirectory).isSymbolicLink())fs.unlinkSync(notesDirectory);}catch{}
        if(fs.existsSync(heldNotesDirectory)&&!fs.existsSync(notesDirectory))fs.renameSync(heldNotesDirectory,notesDirectory);
      }
    }
    assert.equal(fs.readFileSync(targetPath,'utf8'),original);
    assert.equal(fs.readFileSync(path.join(outside,'brief.txt'),'utf8'),outsideCanary);

    const junctionAlias=await postConfiguredTargetRead(url,csrf,{targetId:'linked'});
    assert.deepEqual(await junctionAlias.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});

    const extraPath=await postConfiguredTargetRead(url,csrf,{targetId:'brief',path:'notes/brief.txt'});
    assert.deepEqual(await extraPath.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});

    fs.renameSync(targetPath,heldTargetPath);
    fs.linkSync(path.join(outside,'brief.txt'),targetPath);
    assert.equal(fs.statSync(targetPath).nlink,2,'the replacement path must be a hard-link alias');
    const replaced=await postConfiguredTargetRead(url,csrf,{targetId:'brief'});
    assert.deepEqual(await replaced.json(),{scope:'M3_CONFIGURED_TARGET_READ',status:'DENY'});
    assert.equal(fs.readFileSync(heldTargetPath,'utf8'),original);
    assert.equal(fs.readFileSync(targetPath,'utf8'),outsideCanary);
    assert.equal(fs.readFileSync(path.join(outside,'brief.txt'),'utf8'),outsideCanary);
    assert.equal(JSON.stringify(body).includes(outsideCanary),false);
  }finally{
    if(child.exitCode===null&&child.signalCode===null){
      child.kill();
      await new Promise<void>(resolve=>child.once('exit',()=>resolve()));
    }
    fs.rmSync(workspace,{recursive:true,force:true});
    fs.rmSync(outside,{recursive:true,force:true});
  }
});
