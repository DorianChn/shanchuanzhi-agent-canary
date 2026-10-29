import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
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
  assert.ok(workflow.includes("$sourceHookPath = 'packaging/windows/claude-native-hook.mjs'"),'Windows installer provenance must inspect the M7-owned payload source');
  assert.ok(workflow.includes("$reviewedHookBlobShas = @('b7ed4aba70a597f4f63a05decc6de1b32f67372e')"),'only the exact M1 canonical reason-sanitizer Hook blob may pass Windows package provenance');
  assert.ok(workflow.includes("if ($reviewedHookBlobShas -notcontains $sourceHookBlobSha) { throw 'HOOK_NOT_CANONICAL_OWNER_BLOB' }"),'unreviewed Hook blobs must fail closed');
  assert.ok(workflow.includes("if ($buildResult.version.wrapperSourceBlobSHA -ne $canonicalHookBlobSha) { throw 'BUILD_REPORT_HOOK_BLOB_MISMATCH' }"),'the package version record must identify the exact canonical Hook blob');
  assert.ok(workflow.includes('if ($sourceHookBlobSha -ne $packagedHookBlobSha -or $sourceHookBlobSha -ne $extractedHookBlobSha) { throw \'SETUP_EXTRACTED_HOOK_BLOB_MISMATCH\' }'),'packaged and extracted raw bytes must hash to the exact committed Git blob');
  assert.doesNotMatch(workflow,/Get-FileHash -LiteralPath \$sourceHookPath|ReadAllBytes\(\$sourceHookPath\)/,'Windows checkout line-ending conversion must not be mistaken for package provenance');
});
test('installer lifecycle is manual-only and manual runs obey the checkbox',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/windows-community.yml',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const jobOffset=workflow.indexOf('  windows-community-installer-lifecycle:\n');
  assert.ok(jobOffset>=0,'the installer lifecycle job must remain present');
  const condition=workflow.slice(jobOffset).match(/^    if:\s*(.+)$/m)?.[1];
  assert.ok(condition,'the lifecycle job must declare its event policy');
  const runs=(eventName,inputs)=>Boolean(runInNewContext(condition,{
    github:{event_name:eventName},inputs,
  },{timeout:100}));
  for(const inputs of [{},{run_installer_lifecycle:false},{run_installer_lifecycle:true}]){
    assert.equal(runs('pull_request',inputs),false,'pull requests must not start the installer lifecycle');
  }
  assert.equal(runs('workflow_dispatch',{}),false);
  assert.equal(runs('workflow_dispatch',{run_installer_lifecycle:false}),false);
  assert.equal(runs('workflow_dispatch',{run_installer_lifecycle:true}),true);
});
test('Windows lifecycle smoke is isolated, same-run, checksum-bound, and limited to install/uninstall',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/windows-community.yml',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const lifecycleJob=workflow.slice(workflow.indexOf('  windows-community-installer-lifecycle:'));
  const lifecycleJobEnv=lifecycleJob.slice(lifecycleJob.indexOf('    env:\n'),lifecycleJob.indexOf('    steps:\n'));
  const buildJob=workflow.slice(workflow.indexOf('  windows-community-build-evidence:'),workflow.indexOf('  windows-community-installer-lifecycle:'));
  const smoke=fs.readFileSync(new URL('../packaging/windows/installer-lifecycle-smoke.ps1',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const hookHarness=fs.readFileSync(new URL('../packaging/windows/e4-hook-faults.mjs',import.meta.url),'utf8');
  const installer=fs.readFileSync(new URL('../packaging/windows/installer.nsi.in',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const worker=fs.readFileSync(new URL('../packaging/windows/worker.mjs',import.meta.url),'utf8');
  assert.ok(lifecycleJob.includes("    if: github.event_name == 'workflow_dispatch' && inputs.run_installer_lifecycle\n"),'installer lifecycle must remain explicitly manual-only');
  assert.match(lifecycleJob,/    concurrency:\n      group: agent-canary-exclusive-e4\n      cancel-in-progress: false/,'the isolated installer job must share the static non-cancelling exclusive resource key');
  assert.doesNotMatch(buildJob,/^\s+concurrency:/m,'ordinary PR build evidence must not acquire the exclusive VM/model/installer lock');
  const readArtifactPaths=(source,name)=>{
    const match=source.match(new RegExp(`\\$${name}\\s*=\\s*@\\(([\\s\\S]*?)\\)`));
    assert.ok(match,`missing PowerShell artifact path list: ${name}`);
    return Array.from(match[1].matchAll(/'([^']+)'/g),entry=>entry[1]);
  };
  const buildArtifactPaths=readArtifactPaths(buildJob,'artifactPaths');
  const expectedArtifactPaths=readArtifactPaths(smoke,'expectedArtifactPaths');
  assert.equal(new Set(buildArtifactPaths).size,buildArtifactPaths.length,'the workflow artifact manifest must not contain duplicate paths');
  assert.equal(new Set(expectedArtifactPaths).size,expectedArtifactPaths.length,'the verifier artifact allowlist must not contain duplicate paths');
  assert.deepEqual(expectedArtifactPaths,buildArtifactPaths,'the verifier must require exactly the artifact files emitted and checksummed by the workflow');
  for(const marker of [
    "throw 'SHA256SUMS_PATH_DUPLICATE'",
    "throw 'SHA256SUMS_PATH_UNEXPECTED'",
    'ARTIFACT_SHA256_MISMATCH',
    "'SHA256SUMS_SET_INCOMPLETE'",
    "'SHA256SUMS_ENTRY_MISSING'"
  ]) assert.ok(smoke.includes(marker),`checksum verification must fail closed on ${marker}`);
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
  const silentInstallPass=smoke.indexOf("Add-Check 'silent-install' 'PASS'");
  const installedHookCanary=smoke.indexOf('$installedHookCanary = Invoke-InstalledHookCanaries');
  const uninstallAttempt=smoke.indexOf('$uninstallAttempted = $true');
  assert.ok(silentInstallPass>=0&&installedHookCanary>silentInstallPass&&uninstallAttempt>installedHookCanary,'the installed Hook canary must run after the real install and before uninstall begins');
  assert.ok(smoke.includes("$installedHookPath = Join-Path $installRoot 'claude-native-hook.mjs'")&&smoke.includes("$installedHarnessPath = Join-Path $installRoot 'e4-hook-faults.mjs'")&&smoke.includes("Join-Path (Join-Path $installRoot 'runtime') 'node.exe'"),'the Hook, harness, and Node executable must come from the exact installed root');
  assert.ok(smoke.includes("$expectedHookPath = [IO.Path]::GetFullPath((Join-Path $InstallRoot 'claude-native-hook.mjs'))")&&smoke.includes("$expectedHarnessPath = [IO.Path]::GetFullPath((Join-Path $InstallRoot 'e4-hook-faults.mjs'))"),'the canary must reject fixture or artifact paths in place of installed files');
  assert.ok(smoke.includes("$expectedNodePath = [IO.Path]::GetFullPath((Join-Path (Join-Path $InstallRoot 'runtime') 'node.exe'))"),'the canary must use the Node runtime verified inside the installed package');
  assert.ok(smoke.includes("$canonicalHookBlob = 'b7ed4aba70a597f4f63a05decc6de1b32f67372e'")&&smoke.includes("$canonicalHookSha256 = 'ff0bfef67e92c9ee387f78dd617408b63db6a9646566e16ca0f8e02c842c511d'")&&smoke.includes('installedHookBlobSHA = $hookBlobSha'),'the lifecycle result must bind installed Hook Git blob and SHA-256 to the reviewed canonical bytes');
  assert.ok(smoke.includes("Add-Check 'installed-hook-identity' $installedHookIdentityStatus")&&smoke.includes("Add-Check 'installed-hook-canary' 'FAIL'"),'the exact installed Hook identity and any canary failure must be retained in result checks');
  assert.ok(smoke.includes('import {runHookFaultChecks} from $harnessUriLiteral')&&smoke.includes('runHookFaultChecks({appRoot:$installRootLiteral,fixturesRoot:$fixtureRootLiteral})'),'the existing harness API must execute from its installed co-located directory');
  assert.ok(hookHarness.includes("fs.existsSync(path.join(here,'claude-native-hook.mjs'))?path.join(here,'claude-native-hook.mjs')"),'the packaged harness must select the Hook beside its installed module');
  assert.ok(smoke.includes("'allow'),")&&smoke.includes("'deny'),")&&smoke.includes("'ask')")&&smoke.includes("'INSTALLED_HOOK_HARNESS_CASE_COUNT_INVALID'")&&smoke.includes("'INSTALLED_HOOK_HARNESS_FAULT_NOT_FAIL_CLOSED'"),'allow, deny, ask, and all existing fail-closed harness cases must be required');
  assert.ok(smoke.includes('stdoutCanariesAbsent = $true')&&smoke.includes('stderrCanariesAbsent = $true')&&smoke.includes('jsonlCanariesAbsent = $true')&&smoke.includes('reasonSanitized = $true'),'only bounded sentinel-redaction results, not raw canary output, may enter lifecycle evidence');
  assert.ok(smoke.includes("throw 'INSTALLED_HOOK_DECISION_TIMEOUT'")&&smoke.includes("throw 'INSTALLED_HOOK_HARNESS_TIMEOUT'")&&smoke.includes('if (-not $uninstalled -and -not $uninstallAttempted'),'a canary failure must time out boundedly and retain failure cleanup');
  assert.ok(smoke.includes('totalCaseCount = 1 + $faultCases.Count + $decisionCases.Count')&&smoke.includes("Add-Check 'installed-hook-canary' 'FAIL'")&&smoke.includes('HOOK_CANARY_CLEANUP_TARGET_OUTSIDE_SANDBOX'),'bounded case count and explicit failure diagnostics must be recorded, with fixture cleanup confined to the sandbox');
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
  const normalUninstallLine=smoke.split('\n').find(line=>line.includes('$uninstallResult = Invoke-Nsis'))??'';
  assert.match(normalUninstallLine,/Invoke-Nsis \$uninstallerPath '\/S'/,'the tested ordinary-user uninstall must use silent mode');
  assert.doesNotMatch(normalUninstallLine,/_\?=/,'the tested ordinary-user uninstall must allow NSIS to use its temporary copy');
  const uninstallWait=smoke.indexOf('$result.uninstallCompletion = Wait-ForUninstallCompletion');
  const ownedFileAssertion=smoke.indexOf("Assert-Condition ($remainingOwned.Count -eq 0) 'OWNED_INSTALL_FILES_REMAIN_AFTER_UNINSTALL'");
  const postUninstallAssertions=[
    ownedFileAssertion,
    smoke.indexOf("Assert-Condition ($null -eq (Get-RegistryInstallLocation $registryKey)) 'REGISTRY_KEY_REMAINS_AFTER_UNINSTALL'"),
    smoke.indexOf("Assert-Condition (-not (Test-Path -LiteralPath $startMenuShortcut)) 'START_MENU_SHORTCUT_REMAINS_AFTER_UNINSTALL'"),
    smoke.indexOf("Assert-Condition (-not (Test-Path -LiteralPath $startMenuFolder)) 'START_MENU_FOLDER_REMAINS_AFTER_UNINSTALL'"),
    smoke.indexOf("Assert-Condition (-not (Test-Path -LiteralPath $desktopShortcut)) 'DESKTOP_SHORTCUT_REMAINS_AFTER_UNINSTALL'"),
    smoke.indexOf("Assert-Condition (Test-Path -LiteralPath $sentinelPath -PathType Leaf) 'UNKNOWN_FILE_NOT_PRESERVED'"),
  ];
  assert.ok(smoke.includes('function Wait-ForUninstallCompletion')&&smoke.includes('-TimeoutMs 30000')&&smoke.includes("'UNINSTALL_COMPLETION_TIMEOUT'"),'the temp-copy uninstall completion wait must be bounded and fail on timeout');
  assert.ok(normalUninstallLine.length>0&&uninstallWait>smoke.indexOf(normalUninstallLine)&&postUninstallAssertions.every(position=>position>uninstallWait),'the smoke must wait for NSIS temporary-copy completion before checking owned files, registry, shortcuts, and sentinel');
  assert.ok(smoke.includes('$signals.registryRemoved')&&smoke.includes('$signals.startMenuShortcutRemoved')&&smoke.includes('$signals.startMenuFolderRemoved')&&smoke.includes('$signals.desktopShortcutRemoved'),'the bounded wait must observe the completed uninstall side effects before checking them');
  assert.ok(smoke.includes('"/S _?=$installRoot"'),'failure-only cleanup may keep the synchronous NSIS uninstall mode');
  assert.ok(smoke.includes('$uninstallAttempted = $true')&&smoke.includes('-not $uninstallAttempted'),'timeout must not launch a second cleanup uninstaller while the temp copy may still be running');
  const residueCapture=smoke.indexOf('$result.uninstallResidue = [ordered]@{');
  assert.ok(residueCapture>=0&&residueCapture<ownedFileAssertion,'uninstall residue must be captured before the owned-file assertion can fail');
  assert.ok(smoke.includes('$residueLimit = 64')&&smoke.includes('relativePaths = @($remainingOwned | Select-Object -First $residueLimit)')&&smoke.includes('truncated = ($remainingOwned.Count -gt $residueLimit)'),'uninstall residue evidence must be capped and explicitly report truncation');
  assert.ok(smoke.includes('count = $remainingOwned.Count'),'uninstall residue evidence must retain the total count when the path list is capped');
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
