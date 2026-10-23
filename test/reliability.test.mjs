import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {writeFileAtomically} from '../packaging/windows/durable-files.mjs';
import {inspectInstallerCompileOutput} from '../packaging/windows/installer-compile-evidence.mjs';
import {loadState,saveReport} from '../packaging/windows/worker.mjs';

// macOS can expose the temp tree through /var -> /private/var; keep fixtures canonical
// so worker.mjs continues to exercise its production symlink rejection unchanged.
function makeCanonicalTempRoot(prefix){
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),prefix)));
}

const home=makeCanonicalTempRoot('agent-canary-reliability-home-');
process.env.AGENT_CANARY_HOME=path.join(home,'guard-home');
const {createAgentGuard,createTrustedExecutionGateway,EvidenceRecorder,verifyEvidenceChain}=await import('../src/sdk.js');

test('NSIS bootstrap keeps the spaced Unicode install path as the final unquoted argument',()=>{
  const source=fs.readFileSync(new URL('../scripts/install-nsis-compiler.mjs',import.meta.url),'utf8');
  const delimiter=String.fromCharCode(96);
  const dArgument=delimiter+'/D=${nsis}'+delimiter;
  const expected="spawnSync(setup,['/S',"+dArgument+"],{encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true";
  assert.ok(source.includes(expected),'NSIS /D must remain unquoted and last while Node passes Windows arguments verbatim');
});
test('NSIS compile acceptance keeps its Windows, compiler, and template failure gates',()=>{
  const source=fs.readFileSync(new URL('../scripts/verify-installer-template.mjs',import.meta.url),'utf8');
  const installer=fs.readFileSync(new URL('../scripts/install-nsis-compiler.mjs',import.meta.url),'utf8');
  assert.ok(source.includes("if(process.platform!=='win32')throw Error('INSTALLER_COMPILER_CHECK_REQUIRES_WINDOWS');"),'compiler acceptance must stay Windows-only');
  assert.ok(source.includes("if(!makensis||!fs.existsSync(makensis))throw Error('NSIS_COMPILER_MISSING');"),'a missing compiler must fail the check');
  assert.ok(installer.includes("if(!fs.existsSync(makensis))throw Error('NSIS_COMPILER_MISSING');"),'compiler installation must fail when makensis is absent');
  assert.ok(installer.includes("if(sha(bytes)!==provenance.sha256)throw Error('NSIS_SETUP_CHECKSUM_MISMATCH');"),'the runner must verify the pinned NSIS setup before executing it');
  assert.ok(installer.includes("if(versionCheck.error||versionCheck.status!==0||!compilerVersion.includes(provenance.version))throw Error('NSIS_COMPILER_VERSION_MISMATCH:"),'an unexpected or unqueryable compiler version must fail');
  assert.ok(installer.includes("status:'NSIS_COMPILER_READY',expectedVersion:provenance.version,makensisVersion:compilerVersion"),'the runner must record the executable compiler version');
  assert.ok(source.includes("if(versionCheck.error||versionCheck.status!==0||!compilerVersion.includes(provenance.version))throw Error('NSIS_COMPILER_VERSION_MISMATCH:"),'compile acceptance must reject an unexpected compiler version');
  assert.ok(source.includes("expectedNSISVersion:provenance.version,makensisVersion:compilerVersion"),'compile result must record the expected and observed compiler versions');
  assert.ok(source.includes('const outputEvidence=inspectInstallerCompileOutput(output);'),'compile acceptance must inspect the emitted installer artifact');
  assert.ok(source.includes('!outputEvidence.outputValid'),'compiler output must be a non-empty regular file');
  assert.ok(source.includes('...outputEvidence'),'successful compiler output must record its checked artifact evidence');
});
test('NSIS compile evidence rejects missing, empty, and non-regular outputs',()=>{
  const root=makeCanonicalTempRoot('agent-canary-installer-compile-evidence-');
  try {
    const missing=inspectInstallerCompileOutput(path.join(root,'missing.exe'));
    assert.equal(missing.outputExists,false);
    assert.equal(missing.outputValid,false);
    assert.equal(missing.inspectionErrorCode,'ENOENT');

    const empty=path.join(root,'empty.exe');
    fs.writeFileSync(empty,'');
    assert.deepEqual(inspectInstallerCompileOutput(empty),{
      outputExists:true,outputBytes:0,outputValid:false,inspectionErrorCode:null,
    });

    const valid=path.join(root,'valid.exe');
    fs.writeFileSync(valid,'synthetic compiled artifact');
    assert.deepEqual(inspectInstallerCompileOutput(valid),{
      outputExists:true,outputBytes:27,outputValid:true,inspectionErrorCode:null,
    });

    const symbolicLinkStat={size:27,isFile:()=>false,isSymbolicLink:()=>true};
    assert.deepEqual(inspectInstallerCompileOutput(valid,{lstatSync:()=>symbolicLinkStat}),{
      outputExists:true,outputBytes:27,outputValid:false,inspectionErrorCode:null,
    });

    const linked=path.join(root,'linked.exe');
    try {
      fs.symlinkSync(valid,linked,'file');
      assert.equal(inspectInstallerCompileOutput(linked).outputValid,false);
    } catch (error) {
      if (!['EPERM','EACCES','ENOTSUP'].includes(error?.code)) throw error;
    }
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});
test('Windows community workflow installs and compiles with NSIS only on Windows',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/windows-community.yml',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.ok(workflow.includes("name: Install pinned NSIS compiler on Windows\n        if: runner.os == 'Windows'\n        run: node scripts/install-nsis-compiler.mjs"),'the Windows runner must provision the pinned compiler');
  assert.ok(workflow.includes("name: Compile installer template on Windows\n        if: runner.os == 'Windows'\n        run: node scripts/verify-installer-template.mjs"),'Ubuntu must not run Windows-only compiler acceptance');
  assert.ok(workflow.indexOf('run: node scripts/verify-installer-template.mjs')<workflow.indexOf('- run: npm ci --no-audit --no-fund'),'compiler evidence should run before unrelated tests can fail-fast the Windows job');
  assert.ok(workflow.includes('fail-fast: false'),'all OS matrix results should finish after one platform fails');
});
test('Windows lifecycle smoke is isolated, same-run, checksum-bound, and limited to install/uninstall',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/windows-community.yml',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const lifecycleJob=workflow.slice(workflow.indexOf('  windows-community-installer-lifecycle:'));
  const lifecycleJobEnv=lifecycleJob.slice(lifecycleJob.indexOf('    env:\n'),lifecycleJob.indexOf('    steps:\n'));
  const buildJob=workflow.slice(workflow.indexOf('  windows-community-build-evidence:'),workflow.indexOf('  windows-community-installer-lifecycle:'));
  const smoke=fs.readFileSync(new URL('../packaging/windows/installer-lifecycle-smoke.ps1',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const installer=fs.readFileSync(new URL('../packaging/windows/installer.nsi.in',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const worker=fs.readFileSync(new URL('../packaging/windows/worker.mjs',import.meta.url),'utf8');
  assert.ok(lifecycleJob.includes('needs: windows-community-build-evidence'),'lifecycle must consume the package from this workflow run');
  assert.ok(lifecycleJob.includes('runs-on: windows-latest'),'lifecycle must run on a fresh hosted Windows VM');
  assert.ok(lifecycleJob.includes('permissions: {}'),'untrusted package execution must have no repository permissions');
  assert.doesNotMatch(lifecycleJobEnv, /\$\{\{\s*runner\.temp\s*\}\}/, 'runner.temp is unavailable in job-level env');
  assert.ok(lifecycleJob.includes('$env:RUNNER_TEMP'), 'runtime paths must use the runner temp environment inside the step');
  assert.ok(lifecycleJob.includes('actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c'),'artifact download must be SHA pinned');
  assert.doesNotMatch(lifecycleJob,/actions\/checkout/,'the lifecycle job must not check out source');
  assert.ok(buildJob.includes('installer-lifecycle-smoke.ps1'),'the verifier must come from the exact build source artifact');
  assert.ok(buildJob.includes('candidateId = [string]$buildResult.version.candidateId'),'build evidence must bind installer identity');
  assert.ok(buildJob.includes('launcherSHA256 = [string]$buildResult.launcherSHA256'),'build evidence must bind the launcher identity');
  assert.ok(buildJob.includes("'installer-lifecycle-smoke.ps1'"),'the verifier itself must be checksum-covered');
  assert.ok(smoke.includes("$env:RUNNER_ENVIRONMENT -eq 'github-hosted'"),'local and self-hosted execution must fail closed');
  assert.ok(smoke.includes("Assert-Condition (-not [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) 'RUNNER_TEMP_MISSING'"),'required environment paths must be converted to boolean predicates before assertion binding');
  assert.ok(smoke.includes('BUILD_REPORT_SOURCE_SHA_MISMATCH'),'the report source SHA must match the expected workflow SHA');
  assert.ok(smoke.includes('BUILD_REPORT_INSTALLER_SHA256_MISMATCH'),'the setup hash must match the exact build report');
  assert.ok(smoke.includes('SHA256SUMS_INSTALLER_MISMATCH'),'the setup hash must match SHA256SUMS');
  const processStart=smoke.indexOf('if (-not $process.Start())');
  const processStartedRecord=smoke.indexOf('$result.installerProcessStarted = $true',processStart);
  const processWait=smoke.indexOf('if (-not $process.WaitForExit($TimeoutMs))',processStart);
  assert.ok(processStart>=0&&processStart<processStartedRecord&&processStartedRecord<processWait,'timeout evidence must record a started setup process before waiting');
  assert.ok(smoke.includes('$result.installerProcessCompleted = $true')&&smoke.includes('$result.installerExitCode = $process.ExitCode'),'process completion and exit code must only be recorded after wait succeeds');
  assert.ok(smoke.includes('Invoke-Nsis $installerPath "/S /D=$installRoot" -RecordSetupProcess -EnablePhaseMarkers'),'primary setup execution must populate process evidence and enable bounded phase markers');
  assert.ok(smoke.includes("$startInfo.EnvironmentVariables['AGENT_CANARY_M7_PHASE_MARKER'] = '1'")&&smoke.includes("$result.installerPhase = if ($phaseValue -in $knownPhases)"),'the smoke result must read a bounded lifecycle phase marker from the exact setup process');
  const workerPhases=['WORKER_ENTRY','MANIFEST_INSPECT_STARTED','MANIFEST_INSPECT_COMPLETE','INSTALLER_VALIDATION_STARTED','INSTALLER_VALIDATION_COMPLETE','INSTALLER_HASH_STARTED','INSTALLER_HASH_COMPLETE','RECEIPT_ATOMIC_WRITE_STARTED','RECEIPT_ATOMIC_WRITE_COMPLETE'];
  const workerMain=worker.slice(worker.indexOf('export async function main(){'));
  const workerPhasePositions=workerPhases.map(phase=>workerMain.indexOf("writeM7LifecyclePhase('"+phase+"')"));
  assert.ok(worker.includes("process.env.AGENT_CANARY_M7_PHASE_MARKER!=='1'")&&worker.includes("path.join(ROOT,'.m7-installer-lifecycle-phase')")&&!worker.includes('AGENT_CANARY_M7_PHASE_MARKER_PATH'),'worker telemetry must require the exact M7 toggle and use a fixed install-root marker');
  assert.ok(workerPhasePositions.every((position,index)=>position>=0&&(index===0||position>workerPhasePositions[index-1])),'worker subphase markers must bracket manifest inspection, setup hashing, and receipt writing in order');
  assert.ok(workerPhases.every(phase=>smoke.includes("'"+phase+"'") )&&smoke.includes('$phaseItem.Length -gt 64'),'the smoke must accept only the finite worker phase set and bound marker reads');
  const phaseMarkers=[
    'StrCpy $M7LifecyclePhase "FILE_COPY_STARTED"',
    'StrCpy $M7LifecyclePhase "FILE_COPY_COMPLETE"',
    'StrCpy $M7LifecyclePhase "RECORD_INSTALL_STARTED"',
    'nsExec::ExecToStack',
    'StrCpy $M7LifecyclePhase "RECORD_INSTALL_COMPLETE"',
    'WriteUninstaller',
    'StrCpy $M7LifecyclePhase "INSTALL_REGISTERED"'
  ].map(marker=>installer.indexOf(marker));
  assert.ok(installer.includes('StrCmp $M7LifecycleMarkerEnabled "1" 0 m7_lifecycle_marker_disabled')&&installer.includes('StrCpy $M7LifecycleMarkerPath "$INSTDIR\\.m7-installer-lifecycle-phase"'),'phase logging must write only to a fixed file inside the selected install directory when the hosted smoke opts in');
  assert.ok(installer.includes('IfErrors 0 +2')&&installer.includes('SetErrors'),'phase logging must preserve the NSIS error flag used by installation failure handling');
  assert.ok(smoke.includes("Join-Path $installRoot '.m7-installer-lifecycle-phase'")&&smoke.includes('Remove-Item -LiteralPath $phaseMarkerPath -Force'),'the smoke must read and remove its marker within the disposable install target');
  assert.ok(phaseMarkers.every((position,index)=>position>=0&&(index===0||position>phaseMarkers[index-1])),'NSIS phase markers must bracket file copy, receipt recording, and registration in order');
  assert.ok(smoke.includes('if (-not $process.WaitForExit($TimeoutMs))')&&smoke.includes('$process.Kill($true)')&&smoke.includes("throw 'NSIS_PROCESS_TIMEOUT'"),'diagnostics must preserve the bounded timeout, kill, and failure behavior');
  assert.ok(smoke.includes('INSTALLED_LAUNCHER_SHA256_MISMATCH'),'the installed launcher must match the build report');
  assert.ok(smoke.includes('"/S /D=$installRoot"'),'install must be silent and confined to the runner temp directory');
  assert.ok(smoke.includes('"/S _?=$installRoot"'),'uninstall must be silent and bound to the exact target');
  assert.ok(smoke.includes('UNKNOWN_FILE_NOT_PRESERVED'),'uninstall must preserve an unknown-file sentinel');
  assert.ok(smoke.includes("cancelRollback = 'NOT_TESTED'")&&smoke.includes("efs = 'NOT_TESTED'"),'the result must retain explicit non-claims');
});
test('atomic replacement preserves the old file when a disk-full write fails',()=>{
  const root=makeCanonicalTempRoot('agent-canary-atomic-write-');
  const target=path.join(root,'latest.json');
  fs.writeFileSync(target,'previous-complete-value');
  const diskFull=Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});
  const failingFileSystem={...fs,writeFileSync(){throw diskFull;}};
  try{
    assert.throws(()=>writeFileAtomically(target,'new-value',{replace:true,fileSystem:failingFileSystem}),error=>error.code==='ENOSPC');
    assert.equal(fs.readFileSync(target,'utf8'),'previous-complete-value');
    assert.deepEqual(fs.readdirSync(root),['latest.json']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('corrupt session state is preserved and a fresh session is atomically created',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-recovery-');
  const sessionFile=path.join(root,'session.json'),corrupt='{not-json';
  fs.writeFileSync(sessionFile,corrupt);
  try{
    const state=loadState(root);
    assert.match(state.sessionId,/^[a-f0-9-]{36}$/);
    assert.equal(JSON.parse(fs.readFileSync(sessionFile,'utf8')).sessionId,state.sessionId);
    const backups=fs.readdirSync(root).filter(name=>name.startsWith('session.json.corrupt.'));
    assert.equal(backups.length,1);
    assert.equal(fs.readFileSync(path.join(root,backups[0]),'utf8'),corrupt);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('session backup failure fails closed without replacing corrupt state',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-backup-fault-');
  const sessionFile=path.join(root,'session.json'),corrupt='{bad-session';
  fs.writeFileSync(sessionFile,corrupt);
  const fileSystem={...fs,renameSync(source,target){if(source===sessionFile)throw Object.assign(new Error('synthetic rename failure'),{code:'EACCES'});return fs.renameSync(source,target);}};
  try{
    assert.throws(()=>loadState(root,{fileSystem}),/SESSION_STATE_BACKUP_FAILED/);
    assert.equal(fs.readFileSync(sessionFile,'utf8'),corrupt);
    assert.deepEqual(fs.readdirSync(root),['session.json']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('failed fresh-session creation leaves the corrupt backup intact and no partial state',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-recovery-fault-');
  const sessionFile=path.join(root,'session.json'),corrupt='{bad-session';
  fs.writeFileSync(sessionFile,corrupt);
  const fileSystem={...fs,openSync(file,...args){if(path.basename(file).startsWith('.session.json.')&&file.endsWith('.tmp'))throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.openSync(file,...args);}};
  try{
    assert.throws(()=>loadState(root,{fileSystem}),/SESSION_STATE_RECOVERY_FAILED/);
    assert.equal(fs.existsSync(sessionFile),false);
    const backups=fs.readdirSync(root).filter(name=>name.startsWith('session.json.corrupt.'));
    assert.equal(backups.length,1);
    assert.equal(fs.readFileSync(path.join(root,backups[0]),'utf8'),corrupt);
    assert.deepEqual(fs.readdirSync(root),backups);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('oversized session state is backed up byte-for-byte before recovery',()=>{
  const root=makeCanonicalTempRoot('agent-canary-session-oversized-');
  const sessionFile=path.join(root,'session.json'),corrupt='x'.repeat(4097);
  fs.writeFileSync(sessionFile,corrupt);
  try{
    const state=loadState(root);
    assert.match(state.sessionId,/^[a-f0-9-]{36}$/);
    const backups=fs.readdirSync(root).filter(name=>name.startsWith('session.json.corrupt.'));
    assert.equal(backups.length,1);
    assert.equal(fs.readFileSync(path.join(root,backups[0]),'utf8'),corrupt);
    assert.equal(JSON.parse(fs.readFileSync(sessionFile,'utf8')).sessionId,state.sessionId);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('session-state symlink is rejected without modifying its target',t=>{
  const root=makeCanonicalTempRoot('agent-canary-session-symlink-');
  const target=path.join(root,'target.json'),sessionFile=path.join(root,'session.json'),content='{"sessionId":"synthetic"}';
  fs.writeFileSync(target,content);
  try{fs.symlinkSync(target,sessionFile,'file');}catch{fs.rmSync(root,{recursive:true,force:true});t.skip('File symlink creation is unavailable in this environment');return;}
  try{
    assert.throws(()=>loadState(root),/SESSION_STATE_UNSAFE/);
    assert.equal(fs.readFileSync(target,'utf8'),content);
    assert.equal(fs.lstatSync(sessionFile).isSymbolicLink(),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('report publication atomically advances latest while rejecting unsafe report ids',()=>{
  const root=makeCanonicalTempRoot('agent-canary-report-write-');
  const latest=path.join(root,'latest.json');fs.writeFileSync(latest,'previous-pointer');
  const report={runId:randomUUID(),status:'VERIFIED_BOUNDED_CHECKS'};
  try{
    const file=saveReport(report,root);
    assert.deepEqual(JSON.parse(fs.readFileSync(latest,'utf8')),{file});
    assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).runId,report.runId);
    assert.throws(()=>saveReport({runId:'../outside'},root),/REPORT_ID_INVALID/);
    assert.equal(fs.existsSync(path.join(root,'outside.json')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('failed latest-pointer replacement preserves the previous report pointer',()=>{
  const root=makeCanonicalTempRoot('agent-canary-report-pointer-fault-');
  const latest=path.join(root,'latest.json'),previous='{"file":"previous-report.json"}';
  fs.writeFileSync(latest,previous);
  const fileSystem={...fs,renameSync(source,target){if(target===latest)throw Object.assign(new Error('synthetic disk full'),{code:'ENOSPC'});return fs.renameSync(source,target);}};
  const report={runId:randomUUID(),status:'VERIFIED_BOUNDED_CHECKS'};
  try{
    assert.throws(()=>saveReport(report,root,{fileSystem}),error=>error.code==='ENOSPC');
    assert.equal(fs.readFileSync(latest,'utf8'),previous);
    const reports=fs.readdirSync(path.join(root,'reports'));
    assert.deepEqual(reports,[report.runId+'.json']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root,'reports',reports[0]),'utf8')).runId,report.runId);
    assert.deepEqual(fs.readdirSync(root).sort(),['latest.json','reports']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('gateway evidence persists and the chain rejects tampering after accepted local work',async()=>{
  const root=makeCanonicalTempRoot('agent-canary-evidence-persist-');
  const evidenceFile=path.join(root,'evidence.jsonl');
  const guard=createAgentGuard({alert:false,eventsFile:path.join(root,'guard.jsonl')});
  const evidence=new EvidenceRecorder(128,evidenceFile);
  const gateway=createTrustedExecutionGateway({
    agentId:'reliability-evidence',guard,workspaceRoot:root,files:[],evidence,
    mcpTools:{inspect:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>({ok:true})}}
  });
  let gatewayClosed=false,evidenceClosed=false;
  try{
    assert.deepEqual(await gateway.agent.dispatch({name:'mcp_tool',args:{tool:'inspect',arguments:{}}}),{ok:true});
    assert.equal(verifyEvidenceChain(gateway.evidence()).valid,true);
    await gateway.close();gatewayClosed=true;
    evidence.close();evidenceClosed=true;
    const persisted=fs.readFileSync(evidenceFile,'utf8').trim().split(/\r?\n/).map(line=>JSON.parse(line));
    assert.equal(verifyEvidenceChain(persisted).valid,true);
    const corrupted=persisted.map(event=>({...event}));corrupted[0].decision_reason='tampered-after-write';
    assert.equal(verifyEvidenceChain(corrupted).valid,false);
  }finally{
    if(!gatewayClosed)await gateway.close().catch(()=>{});
    if(!evidenceClosed)evidence.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('gateway bounds concurrent pending dispatches and drains the accepted queue',async()=>{
  const root=makeCanonicalTempRoot('agent-canary-queue-bound-');
  const guard=createAgentGuard({alert:false}),evidence=new EvidenceRecorder(4096);
  let release,executed=0;
  const hold=new Promise(resolve=>{release=resolve;});
  const gateway=createTrustedExecutionGateway({agentId:'reliability-queue',guard,workspaceRoot:root,files:[],evidence,mcpTools:{slow:{risk:'READ_ONLY',approvalRequired:false,execute:async()=>{executed++;await hold;return{ok:true};}}}});
  try{
    const tasks=Array.from({length:65},(_,sequence)=>gateway.agent.dispatch({name:'mcp_tool',args:{tool:'slow',arguments:{sequence}}}));
    release();
    const outcomes=await Promise.allSettled(tasks);
    assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,64);
    assert.equal(outcomes.filter(outcome=>outcome.status==='rejected').length,1);
    assert.equal(executed,64);
    assert.equal(verifyEvidenceChain(gateway.evidence()).valid,true);
  }finally{release();await gateway.close();fs.rmSync(root,{recursive:true,force:true});}
});
