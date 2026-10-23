import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
    agents: [{ agent: 'codex', detected: true, connectionStatus: 'UNKNOWN', protectionStatus: 'UNKNOWN' }],
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

function fakeProtectedReadDependencies(mode:'allow'|'deny'|'unknown'|'wrong'='allow',missingM2=false){
  const state:{dependencyLoads:number;gatewayCreates:number;gatewayCloses:number;routerCallbacks:number;workspaceRoot?:string;fixedFiles?:unknown;routeArguments?:unknown}={dependencyLoads:0,gatewayCreates:0,gatewayCloses:0,routerCallbacks:0};
  const capability=Object.freeze(Object.create(null));
  const loader=async()=>{
    state.dependencyLoads++;
    return{
      createGateway(options:{workspaceRoot:string;files:readonly {path:string}[]}){
        state.gatewayCreates++;
        state.workspaceRoot=options.workspaceRoot;
        state.fixedFiles=options.files;
        return{
          bindFileReadCapability(binding:unknown){assert.deepEqual(binding,{toolName:'protected_read',operation:'file-read',path:'agent-canary-public.txt',pathArg:'path'});return capability;},
          verifyFileReadCapability(value:unknown,call:unknown,operation:string){return value===capability&&operation==='file-read'&&JSON.stringify(call)===JSON.stringify({name:'protected_read',args:{path:'agent-canary-public.txt'}});},
          async readFileWithCapability(value:unknown,call:unknown,operation:string){
            assert.equal(value,capability);assert.equal(operation,'file-read');state.routeArguments=call;
            if(mode==='deny')throw Object.assign(new Error('private path and marker must not escape'),{decision:{action:'DENY',reason:'private detail'}});
            if(mode==='unknown')throw new Error('unclassified private failure');
            if(mode==='wrong')return{content:'UNEXPECTED_PRIVATE_RESULT'};
            return{content:'AGENT_CANARY_CONSOLE_PROTECTED_READ_OK'};
          },
          async close(){state.gatewayCloses++;},
        };
      },
      loadM2Facade:async()=>{
        if(missingM2)throw new Error('private M2 dependency failure');
        return{createSecurityGatewayHostAdapter(options:Record<string,any>){
        const router=options.createSecurityToolRouter({
          ...options.routerOptions,
          tools:{protected_read:{operation:'file-read',pathArg:'path'}},
          fileReadCapability:{resolve:()=>capability,verify:()=>true},
          executeRealTool:async(call:unknown,context:{signal:AbortSignal})=>{
            assert.equal(context.signal.aborted,false);
            state.routerCallbacks++;
            return gateway.readFileWithCapability(capability,call,'file-read');
          },
        });
        return{dispatch:(call:unknown)=>router.dispatch(call)};
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

test('protected-read action uses one fixed probe and exposes only the sanitized positive result', async () => {
  const dependencies=fakeProtectedReadDependencies();
  const console=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE',securityCenterProtectedReadDependencies:dependencies.loader});
  try{
    const csrf=await csrfFor(console.url);
    const response=await fetch(console.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.deepEqual(body,{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'ALLOW',reason:'HELD_FILE_POSITIVE_CONTROL',markerMatched:true});
    const serialized=JSON.stringify(body);
    assert.equal(serialized.includes('AGENT_CANARY_CONSOLE_PROTECTED_READ_OK'),false);
    assert.equal(serialized.includes(dependencies.state.workspaceRoot??''),false);
    assert.deepEqual(dependencies.state.fixedFiles,[{path:'agent-canary-public.txt'}]);
    assert.deepEqual(dependencies.state.routeArguments,{name:'protected_read',args:{path:'agent-canary-public.txt'}});
    assert.equal(dependencies.state.routerCallbacks,1);
    assert.equal(dependencies.state.gatewayCloses,1);
    assert.equal(fs.existsSync(dependencies.state.workspaceRoot??''),false,'the exact temporary probe directory is removed after the held Gateway closes');
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

test('protected-read action treats unexpected markers as UNKNOWN and missing composition fails before probe setup', async () => {
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
    const defaultConsole=await startAIConsole({port:0,operatorApprovalCode:'OPERATOR_FIXTURE'});
    try{
      const csrf=await csrfFor(defaultConsole.url);
      const response=await fetch(defaultConsole.url+'/api/security-center/protected-read',{method:'POST',headers:{'content-type':'application/json','x-canary-csrf':csrf,'x-canary-operator-code':'OPERATOR_FIXTURE'},body:'{}'});
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{scope:'M3_FIXED_TEMP_PROBE_ONLY',status:'UNKNOWN',reason:'OWNER_ADAPTER_UNAVAILABLE',markerMatched:false});
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
