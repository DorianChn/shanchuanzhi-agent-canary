param(
  [Parameter(Mandatory = $true)][string]$ArtifactRoot,
  [Parameter(Mandatory = $true)][string]$ExpectedSourceSHA,
  [Parameter(Mandatory = $true)][string]$EvidencePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$result = [ordered]@{
  schemaVersion = 1
  status = 'NOT_RUN'
  installerExecuted = $false
  installerProcessStarted = $false
  installerProcessCompleted = $false
  installerExitCode = $null
  installerPhase = $null
  sourceSHA = $ExpectedSourceSHA
  installerSHA256 = $null
  candidateId = $null
  launcherSHA256 = $null
  installPath = $null
  runner = $null
  failure = $null
  cleanupAfterFailure = $null
  uninstallCompletion = $null
  completedAt = $null
  checks = [System.Collections.Generic.List[object]]::new()
  lifecycleLimits = @{
    cleanGitHubHostedWindowsVM = $true
    windows11Client = 'NOT_VERIFIED'
    ordinaryUserToken = 'NOT_VERIFIED'
    cancelRollback = 'NOT_TESTED'
    upgrade = 'NOT_TESTED_IN_PLACE_UPGRADE_NOT_IMPLEMENTED'
    efs = 'NOT_TESTED'
    realModelOrNativeAgent = 'NOT_TESTED'
  }
}

$sandboxRoot = $null
$installRoot = $null
$phaseMarkerPath = $null
$installerPath = $null
$uninstalled = $false
$uninstallAttempted = $false
$fatalError = $null

function Assert-Condition([bool]$Condition, [string]$Code) {
  if (-not $Condition) { throw $Code }
}

function Add-Check([string]$Id, [string]$Status, [hashtable]$Detail = @{}) {
  $result.checks.Add([ordered]@{ id = $Id; status = $Status; detail = $Detail })
}

function Get-Sha256([string]$Path) {
  (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-RegularFile([string]$Path) {
  $item = Get-Item -LiteralPath $Path -ErrorAction Stop
  Assert-Condition (-not $item.PSIsContainer) 'EXPECTED_REGULAR_FILE'
  Assert-Condition (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'REPARSE_FILE_REJECTED'
  return $item
}

function Invoke-Nsis([string]$Executable, [string]$RawArguments, [int]$TimeoutMs = 180000, [switch]$RecordSetupProcess, [switch]$EnablePhaseMarkers) {
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $Executable
  # NSIS requires /D= and _?= paths to be unquoted and last. Keep Arguments raw.
  $startInfo.Arguments = $RawArguments
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
  if ($EnablePhaseMarkers) {
    $startInfo.EnvironmentVariables['AGENT_CANARY_M7_PHASE_MARKER'] = '1'
  }
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $clock = [Diagnostics.Stopwatch]::StartNew()
  try {
    if (-not $process.Start()) { throw 'NSIS_PROCESS_START_FAILED' }
    if ($RecordSetupProcess) {
      $result.installerProcessStarted = $true
    }
    if (-not $process.WaitForExit($TimeoutMs)) {
      try { $process.Kill($true) } catch {}
      throw 'NSIS_PROCESS_TIMEOUT'
    }
    if ($RecordSetupProcess) {
      $result.installerProcessCompleted = $true
      $result.installerExitCode = $process.ExitCode
    }
    return [ordered]@{ exitCode = $process.ExitCode; durationMs = $clock.ElapsedMilliseconds }
  } finally {
    $clock.Stop()
    $process.Dispose()
  }
}

function Get-RegistryInstallLocation([string]$KeyPath) {
  if (-not (Test-Path -LiteralPath $KeyPath)) { return $null }
  return [string](Get-ItemProperty -LiteralPath $KeyPath -Name InstallLocation -ErrorAction Stop).InstallLocation
}

function Read-InstallerPhase {
  if (-not $phaseMarkerPath -or -not (Test-Path -LiteralPath $phaseMarkerPath -PathType Leaf)) { return }
  $installPrefix = [IO.Path]::GetFullPath($installRoot).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
  $markerFull = [IO.Path]::GetFullPath($phaseMarkerPath)
  if (-not $markerFull.StartsWith($installPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    $result.installerPhase = 'UNREADABLE_MARKER'
    return
  }
  try {
    $phaseItem = Assert-RegularFile $phaseMarkerPath
    if ($phaseItem.Length -gt 64) {
      $result.installerPhase = 'INVALID_MARKER'
      return
    }
    $phaseValue = [IO.File]::ReadAllText($phaseMarkerPath).Trim()
    $knownPhases = @(
      'FILE_COPY_STARTED', 'FILE_COPY_COMPLETE', 'RECORD_INSTALL_STARTED', 'RECORD_INSTALL_COMPLETE', 'INSTALL_REGISTERED',
      'WORKER_ENTRY', 'MANIFEST_INSPECT_STARTED', 'MANIFEST_INSPECT_COMPLETE',
      'INSTALLER_VALIDATION_STARTED', 'INSTALLER_VALIDATION_COMPLETE',
      'INSTALLER_HASH_STARTED', 'INSTALLER_HASH_COMPLETE',
      'RECEIPT_ATOMIC_WRITE_STARTED', 'RECEIPT_ATOMIC_WRITE_COMPLETE'
    )
    $result.installerPhase = if ($phaseValue -in $knownPhases) { $phaseValue } else { 'INVALID_MARKER' }
  } catch {
    $result.installerPhase = 'UNREADABLE_MARKER'
  } finally {
    Remove-Item -LiteralPath $phaseMarkerPath -Force -ErrorAction SilentlyContinue
  }
}

function Resolve-ContainedPath([string]$Root, [string]$RelativePath) {
  Assert-Condition (-not [IO.Path]::IsPathRooted($RelativePath)) 'MANIFEST_PATH_ROOTED'
  Assert-Condition ($RelativePath -notmatch '(^|[\\/])\.\.([\\/]|$)|:|\\|//') 'MANIFEST_PATH_UNSAFE'
  $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
  $pathFull = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, $RelativePath.Replace('/', [IO.Path]::DirectorySeparatorChar)))
  Assert-Condition ($pathFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) 'MANIFEST_PATH_ESCAPES_INSTALL_ROOT'
  return $pathFull
}

function Wait-ForUninstallCompletion([string]$UninstallerPath, [string]$RegistryKey, [string]$StartMenuShortcut, [string]$StartMenuFolder, [string]$DesktopShortcut, [int]$TimeoutMs = 30000) {
  # A normal NSIS invocation can return after starting its TEMP copy; wait for the copy's terminal effects before assertions.
  $clock = [Diagnostics.Stopwatch]::StartNew()
  try {
    while ($true) {
      $signals = [ordered]@{
        uninstallerRemoved = -not (Test-Path -LiteralPath $UninstallerPath)
        registryRemoved = $null -eq (Get-RegistryInstallLocation $RegistryKey)
        startMenuShortcutRemoved = -not (Test-Path -LiteralPath $StartMenuShortcut)
        startMenuFolderRemoved = -not (Test-Path -LiteralPath $StartMenuFolder)
        desktopShortcutRemoved = -not (Test-Path -LiteralPath $DesktopShortcut)
      }
      if ($signals.uninstallerRemoved -and $signals.registryRemoved -and $signals.startMenuShortcutRemoved -and $signals.startMenuFolderRemoved -and $signals.desktopShortcutRemoved) {
        return [ordered]@{ completed = $true; durationMs = $clock.ElapsedMilliseconds; signals = $signals }
      }
      if ($clock.ElapsedMilliseconds -ge $TimeoutMs) {
        return [ordered]@{ completed = $false; durationMs = $clock.ElapsedMilliseconds; signals = $signals }
      }
      Start-Sleep -Milliseconds 100
    }
  } finally {
    $clock.Stop()
  }
}

function Get-GitBlobSha1([string]$Path) {
  $bytes = [IO.File]::ReadAllBytes($Path)
  $header = [Text.Encoding]::ASCII.GetBytes(("blob {0}`0" -f $bytes.Length))
  $blob = [byte[]]::new($header.Length + $bytes.Length)
  [Array]::Copy($header, 0, $blob, 0, $header.Length)
  [Array]::Copy($bytes, 0, $blob, $header.Length, $bytes.Length)
  $sha1 = [Security.Cryptography.SHA1]::Create()
  try { [Convert]::ToHexString($sha1.ComputeHash($blob)).ToLowerInvariant() }
  finally { $sha1.Dispose() }
}

function Test-SyntheticCanariesAbsent([string]$Text, [string[]]$Canaries) {
  foreach ($canary in $Canaries) {
    if ($Text.Contains($canary, [StringComparison]::Ordinal)) { return $false }
  }
  return $true
}

function New-IsolatedNodeStartInfo([string]$NodePath, [string]$TempRoot) {
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $NodePath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.EnvironmentVariables.Clear()
  $systemRoot = if ($env:SystemRoot) { $env:SystemRoot } else { 'C:\Windows' }
  $startInfo.EnvironmentVariables['SystemRoot'] = $systemRoot
  $startInfo.EnvironmentVariables['WINDIR'] = $systemRoot
  $startInfo.EnvironmentVariables['PATH'] = (Split-Path -Parent $NodePath) + ';' + (Join-Path $systemRoot 'System32')
  $startInfo.EnvironmentVariables['TEMP'] = $TempRoot
  $startInfo.EnvironmentVariables['TMP'] = $TempRoot
  return $startInfo
}

function Invoke-InstalledHookDecisionCase([string]$NodePath, [string]$HookPath, [string]$WorkspaceRoot, [string]$StateDirectory, [string]$FixtureRoot, [string]$Decision, [int]$TimeoutMs = 5000) {
  Assert-Condition ($Decision -in @('allow', 'deny', 'ask')) 'INSTALLED_HOOK_DECISION_INVALID'
  $caseRoot = Join-Path $FixtureRoot ("decision-$Decision")
  Assert-Condition (-not (Test-Path -LiteralPath $caseRoot)) 'INSTALLED_HOOK_CASE_ALREADY_EXISTS'
  New-Item -ItemType Directory -Path $caseRoot | Out-Null
  $modulePath = Join-Path $caseRoot 'synthetic-decision.mjs'
  $logPath = Join-Path $caseRoot 'hook-events.jsonl'
  $callerCanary = 'SYNTHETIC_M7_INSTALLED_HOOK_CALLER_SENTINEL'
  $reasonCanary = 'SYNTHETIC_M7_INSTALLED_HOOK_REASON_SENTINEL'
  $pathCanary = 'C:/synthetic/m7-caller/private.txt'
  $tokenCanary = 'cnry_SYNTHETIC_M7_INSTALLED_HOOK_TOKEN_SENTINEL'
  $canaries = @($callerCanary, $reasonCanary, $pathCanary, $tokenCanary)
  $moduleSource = "export async function decideAgentHook(){return {hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'$Decision',permissionDecisionReason:'$reasonCanary'}}}`n"
  [IO.File]::WriteAllText($modulePath, $moduleSource, [Text.UTF8Encoding]::new($false))
  $inputJson = [ordered]@{
    session_id = 'synthetic-m7-installed-hook-canary'
    tool_name = 'Bash'
    tool_input = [ordered]@{
      command = 'synthetic decision canary'
      callerMarker = $callerCanary
      privatePath = $pathCanary
      api_key = $tokenCanary
    }
  } | ConvertTo-Json -Depth 5 -Compress

  $startInfo = New-IsolatedNodeStartInfo $NodePath $caseRoot
  foreach ($argument in @($HookPath, $modulePath, $WorkspaceRoot, $StateDirectory, $logPath)) { $startInfo.ArgumentList.Add($argument) }
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $processStarted = $false
  try {
    if (-not $process.Start()) { throw 'INSTALLED_HOOK_DECISION_START_FAILED' }
    $processStarted = $true
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.WriteLine($inputJson)
    $process.StandardInput.Close()
    if (-not $process.WaitForExit($TimeoutMs)) {
      try { $process.Kill($true) } catch {}
      try { $process.WaitForExit() } catch {}
      throw 'INSTALLED_HOOK_DECISION_TIMEOUT'
    }
    $process.WaitForExit()
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $exitCode = $process.ExitCode
  } finally {
    if ($processStarted -and -not $process.HasExited) { try { $process.Kill($true); $process.WaitForExit() } catch {} }
    $process.Dispose()
  }

  $stdoutBytes = [Text.Encoding]::UTF8.GetByteCount($stdout)
  $stderrBytes = [Text.Encoding]::UTF8.GetByteCount($stderr)
  Assert-Condition ($exitCode -eq 0) 'INSTALLED_HOOK_DECISION_EXIT_NOT_ZERO'
  Assert-Condition ($stdoutBytes -le 8192 -and $stderrBytes -le 8192) 'INSTALLED_HOOK_DECISION_OUTPUT_TOO_LARGE'
  $stdoutLines = @($stdout -split '\r?\n' | Where-Object { $_ -ne '' })
  Assert-Condition ($stdoutLines.Count -eq 1) 'INSTALLED_HOOK_DECISION_STDOUT_INVALID'
  $decisionOutput = $stdoutLines[0] | ConvertFrom-Json -ErrorAction Stop
  $hookOutput = $decisionOutput.hookSpecificOutput
  Assert-Condition ($hookOutput.hookEventName -eq 'PreToolUse' -and $hookOutput.permissionDecision -eq $Decision) 'INSTALLED_HOOK_DECISION_MISMATCH'
  $expectedReason = switch ($Decision) {
    'allow' { 'Agent Canary: permission_allowed' }
    'deny' { 'Agent Canary: permission_denied' }
    'ask' { 'Agent Canary: approval_required' }
  }
  $stdoutCanariesAbsent = Test-SyntheticCanariesAbsent $stdout $canaries
  $stderrCanariesAbsent = Test-SyntheticCanariesAbsent $stderr $canaries
  Assert-Condition $stdoutCanariesAbsent 'INSTALLED_HOOK_STDOUT_CANARY_LEAK'
  Assert-Condition $stderrCanariesAbsent 'INSTALLED_HOOK_STDERR_CANARY_LEAK'
  Assert-Condition ($hookOutput.permissionDecisionReason -ceq $expectedReason) 'INSTALLED_HOOK_REASON_NOT_SANITIZED'

  [void](Assert-RegularFile $logPath)
  $logRaw = [IO.File]::ReadAllText($logPath)
  $jsonlCanariesAbsent = Test-SyntheticCanariesAbsent $logRaw $canaries
  Assert-Condition $jsonlCanariesAbsent 'INSTALLED_HOOK_JSONL_CANARY_LEAK'
  $logLines = @($logRaw -split '\r?\n' | Where-Object { $_ -ne '' })
  Assert-Condition ($logLines.Count -eq 1) 'INSTALLED_HOOK_JSONL_RECORD_COUNT_INVALID'
  $logRecord = $logLines[0] | ConvertFrom-Json -ErrorAction Stop
  $recordKeys = (@($logRecord.PSObject.Properties.Name | Sort-Object) -join ',')
  Assert-Condition ($recordKeys -eq 'hookEventName,permissionDecision,timestamp' -and $logRecord.hookEventName -eq 'PreToolUse' -and $logRecord.permissionDecision -eq $Decision) 'INSTALLED_HOOK_JSONL_SCHEMA_INVALID'
  $parsedTimestamp = $null
  try { $parsedTimestamp = [DateTimeOffset]::Parse([string]$logRecord.timestamp) } catch {}
  Assert-Condition ($null -ne $parsedTimestamp) 'INSTALLED_HOOK_JSONL_TIMESTAMP_INVALID'

  return @{
    decision = $Decision
    exitCode = $exitCode
    stdoutBytes = $stdoutBytes
    stderrBytes = $stderrBytes
    stdoutCanariesAbsent = $stdoutCanariesAbsent
    stderrCanariesAbsent = $stderrCanariesAbsent
    jsonlRecords = $logLines.Count
    jsonlCanariesAbsent = $jsonlCanariesAbsent
    reasonSanitized = $true
  }
}

function Invoke-InstalledHookCanaries([string]$NodePath, [string]$HookPath, [string]$HarnessPath, [string]$InstallRoot, [string]$SandboxRoot) {
  $canonicalHookBlob = 'b7ed4aba70a597f4f63a05decc6de1b32f67372e'
  $canonicalHookSha256 = 'ff0bfef67e92c9ee387f78dd617408b63db6a9646566e16ca0f8e02c842c511d'
  $expectedNodePath = [IO.Path]::GetFullPath((Join-Path (Join-Path $InstallRoot 'runtime') 'node.exe'))
  $expectedHookPath = [IO.Path]::GetFullPath((Join-Path $InstallRoot 'claude-native-hook.mjs'))
  $expectedHarnessPath = [IO.Path]::GetFullPath((Join-Path $InstallRoot 'e4-hook-faults.mjs'))
  $nodeFull = [IO.Path]::GetFullPath($NodePath)
  $hookFull = [IO.Path]::GetFullPath($HookPath)
  $harnessFull = [IO.Path]::GetFullPath($HarnessPath)
  Assert-Condition ([StringComparer]::OrdinalIgnoreCase.Equals($nodeFull, $expectedNodePath)) 'INSTALLED_HOOK_NODE_PATH_MISMATCH'
  Assert-Condition ([StringComparer]::OrdinalIgnoreCase.Equals($hookFull, $expectedHookPath)) 'INSTALLED_HOOK_PATH_MISMATCH'
  Assert-Condition ([StringComparer]::OrdinalIgnoreCase.Equals($harnessFull, $expectedHarnessPath)) 'INSTALLED_HOOK_HARNESS_PATH_MISMATCH'
  [void](Assert-RegularFile $NodePath)
  [void](Assert-RegularFile $hookFull)
  [void](Assert-RegularFile $harnessFull)
  $hookSha256 = Get-Sha256 $hookFull
  $hookBlobSha = Get-GitBlobSha1 $hookFull
  Assert-Condition ($hookSha256 -eq $canonicalHookSha256 -and $hookBlobSha -eq $canonicalHookBlob) 'INSTALLED_HOOK_CANONICAL_BLOB_MISMATCH'

  $fixtureRoot = Join-Path $SandboxRoot 'installed-hook-canaries'
  Assert-Condition (-not (Test-Path -LiteralPath $fixtureRoot)) 'INSTALLED_HOOK_FIXTURE_ROOT_ALREADY_EXISTS'
  New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
  try {
    $harnessUriLiteral = ConvertTo-Json -InputObject ([Uri]::new($harnessFull).AbsoluteUri) -Compress
    $installRootLiteral = ConvertTo-Json -InputObject $InstallRoot -Compress
    $fixtureRootLiteral = ConvertTo-Json -InputObject $fixtureRoot -Compress
    $harnessScript = "import {runHookFaultChecks} from $harnessUriLiteral; const report=runHookFaultChecks({appRoot:$installRootLiteral,fixturesRoot:$fixtureRootLiteral}); process.stdout.write(JSON.stringify(report)+'\n'); if(report.status!=='PASS')process.exitCode=1;"
    $harnessStartInfo = New-IsolatedNodeStartInfo $NodePath $fixtureRoot
    $harnessStartInfo.ArgumentList.Add('--input-type=module')
    $harnessStartInfo.ArgumentList.Add('-e')
    $harnessStartInfo.ArgumentList.Add($harnessScript)
    $harnessProcess = [Diagnostics.Process]::new()
    $harnessProcess.StartInfo = $harnessStartInfo
    $harnessProcessStarted = $false
    try {
      if (-not $harnessProcess.Start()) { throw 'INSTALLED_HOOK_HARNESS_START_FAILED' }
      $harnessProcessStarted = $true
      $harnessProcess.StandardInput.Close()
      $harnessStdoutTask = $harnessProcess.StandardOutput.ReadToEndAsync()
      $harnessStderrTask = $harnessProcess.StandardError.ReadToEndAsync()
      if (-not $harnessProcess.WaitForExit(90000)) {
        try { $harnessProcess.Kill($true) } catch {}
        try { $harnessProcess.WaitForExit() } catch {}
        throw 'INSTALLED_HOOK_HARNESS_TIMEOUT'
      }
      $harnessProcess.WaitForExit()
      $harnessStdout = $harnessStdoutTask.GetAwaiter().GetResult()
      $harnessStderr = $harnessStderrTask.GetAwaiter().GetResult()
      $harnessExitCode = $harnessProcess.ExitCode
    } finally {
      if ($harnessProcessStarted -and -not $harnessProcess.HasExited) { try { $harnessProcess.Kill($true); $harnessProcess.WaitForExit() } catch {} }
      $harnessProcess.Dispose()
    }
    $harnessBytes = [Text.Encoding]::UTF8.GetByteCount($harnessStdout)
    $harnessStderrBytes = [Text.Encoding]::UTF8.GetByteCount($harnessStderr)
    Assert-Condition ($harnessExitCode -eq 0 -and $harnessStderrBytes -eq 0) 'INSTALLED_HOOK_HARNESS_PROCESS_FAILED'
    Assert-Condition ($harnessBytes -le 32768) 'INSTALLED_HOOK_HARNESS_OUTPUT_TOO_LARGE'
    $harnessLines = @($harnessStdout -split '\r?\n' | Where-Object { $_ -ne '' })
    Assert-Condition ($harnessLines.Count -eq 1) 'INSTALLED_HOOK_HARNESS_OUTPUT_INVALID'
    $harnessReport = $harnessLines[0] | ConvertFrom-Json -ErrorAction Stop
    Assert-Condition ($harnessReport.status -eq 'PASS') 'INSTALLED_HOOK_HARNESS_FAILED'
    Assert-Condition ($harnessReport.positiveControl.decision -eq 'allow' -and $harnessReport.positiveControl.logContractSatisfied -eq $true -and $harnessReport.positiveControl.sideEffectObserved -eq $true) 'INSTALLED_HOOK_HARNESS_ALLOW_CONTROL_FAILED'
    Assert-Condition ($harnessReport.sideEffects.protectedVictimUnchanged -eq $true -and $harnessReport.sideEffects.unsafeCallbackStarts -eq 0) 'INSTALLED_HOOK_HARNESS_FAIL_CLOSED_FAILED'
    $faultCases = @($harnessReport.faultCases)
    Assert-Condition ($faultCases.Count -eq 7) 'INSTALLED_HOOK_HARNESS_CASE_COUNT_INVALID'
    Assert-Condition (@($faultCases | Where-Object { $_.denied -eq $true -or $_.errorCode -eq 'ETIMEDOUT' }).Count -eq 7) 'INSTALLED_HOOK_HARNESS_FAULT_NOT_FAIL_CLOSED'
    Assert-Condition ($harnessReport.logAudit.status -eq 'PASS' -and $harnessReport.logAudit.callerInputCanaryAbsent -eq $true -and @($faultCases | Where-Object { $_.logAudit.status -ne 'PASS' -or $_.logAudit.canariesAbsent -ne $true }).Count -eq 0) 'INSTALLED_HOOK_HARNESS_JSONL_REDACTION_FAILED'

    $canaries = @(
      'SYNTHETIC_M7_INSTALLED_HOOK_CALLER_SENTINEL', 'SYNTHETIC_M7_INSTALLED_HOOK_REASON_SENTINEL',
      'C:/synthetic/m7-caller/private.txt', 'cnry_SYNTHETIC_M7_INSTALLED_HOOK_TOKEN_SENTINEL',
      'SYNTHETIC_E4_HOOK_ARGUMENT_MARKER', 'SYNTHETIC_E4_HOOK_REASON_MARKER',
      'C:/synthetic/caller/private.txt', 'M8_SYNTHETIC_INPUT_CANARY_NOT_SECRET', 'M8_SYNTHETIC_REASON_CANARY_NOT_SECRET', 'write victim'
    )
    $harnessReportCanariesAbsent = Test-SyntheticCanariesAbsent $harnessStdout $canaries
    $harnessCapturedStderr = @($harnessStderr, [string]$harnessReport.positiveControl.stderr) + @($faultCases | ForEach-Object { [string]$_.stderr })
    $harnessStderrCanariesAbsent = Test-SyntheticCanariesAbsent ($harnessCapturedStderr -join "`n") $canaries
    Assert-Condition $harnessReportCanariesAbsent 'INSTALLED_HOOK_HARNESS_REPORT_CANARY_LEAK'
    Assert-Condition $harnessStderrCanariesAbsent 'INSTALLED_HOOK_HARNESS_STDERR_CANARY_LEAK'

    $stateDirectory = Join-Path $fixtureRoot 'decision-state'
    New-Item -ItemType Directory -Path $stateDirectory | Out-Null
    $decisionRoot = Join-Path $fixtureRoot 'decision-cases'
    New-Item -ItemType Directory -Path $decisionRoot | Out-Null
    $decisionCases = @(
      (Invoke-InstalledHookDecisionCase $NodePath $hookFull $SandboxRoot $stateDirectory $decisionRoot 'allow'),
      (Invoke-InstalledHookDecisionCase $NodePath $hookFull $SandboxRoot $stateDirectory $decisionRoot 'deny'),
      (Invoke-InstalledHookDecisionCase $NodePath $hookFull $SandboxRoot $stateDirectory $decisionRoot 'ask')
    )
    Assert-Condition ($decisionCases.Count -eq 3 -and (@($decisionCases | Select-Object -ExpandProperty decision | Sort-Object) -join ',') -eq 'allow,ask,deny') 'INSTALLED_HOOK_ALLOW_DENY_ASK_CASES_INCOMPLETE'
    Assert-Condition (@($decisionCases | Where-Object { -not $_.stdoutCanariesAbsent -or -not $_.stderrCanariesAbsent -or -not $_.jsonlCanariesAbsent -or -not $_.reasonSanitized }).Count -eq 0) 'INSTALLED_HOOK_DIRECT_REDACTION_FAILED'
    Assert-Condition ((Get-Sha256 $hookFull) -eq $hookSha256 -and (Get-GitBlobSha1 $hookFull) -eq $hookBlobSha) 'INSTALLED_HOOK_CHANGED_DURING_CANARY'

    return @{
      installedHookSHA256 = $hookSha256
      installedHookBlobSHA = $hookBlobSha
      harnessStatus = [string]$harnessReport.status
      scope = 'INSTALLED_HOOK_BYTES_WITH_SYNTHETIC_HOST_FIXTURE; NATIVE_AGENT_ROUTING_NOT_VERIFIED'
      harnessCaseCount = 1 + $faultCases.Count
      failClosedCaseCount = $faultCases.Count
      allowDenyAskCaseCount = $decisionCases.Count
      totalCaseCount = 1 + $faultCases.Count + $decisionCases.Count
      decisionsVerified = @($decisionCases | Select-Object -ExpandProperty decision)
      stdoutBytes = ($decisionCases | Measure-Object -Property stdoutBytes -Sum).Sum
      stderrBytes = ($decisionCases | Measure-Object -Property stderrBytes -Sum).Sum
      harnessReportBytes = $harnessBytes
      stdoutCanariesAbsent = $true
      stderrCanariesAbsent = $true
      jsonlRecords = [int]$harnessReport.logAudit.records + ($decisionCases | Measure-Object -Property jsonlRecords -Sum).Sum
      jsonlCanariesAbsent = $true
      reasonSanitized = $true
    }
  } finally {
    $sandboxPrefix = [IO.Path]::GetFullPath($SandboxRoot).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
    $fixtureFull = [IO.Path]::GetFullPath($fixtureRoot)
    Assert-Condition ($fixtureFull.StartsWith($sandboxPrefix, [StringComparison]::OrdinalIgnoreCase)) 'HOOK_CANARY_CLEANUP_TARGET_OUTSIDE_SANDBOX'
    if (Test-Path -LiteralPath $fixtureFull) { Remove-Item -LiteralPath $fixtureFull -Recurse -Force -ErrorAction Stop }
    Assert-Condition (-not (Test-Path -LiteralPath $fixtureFull)) 'HOOK_CANARY_FIXTURE_CLEANUP_FAILED'
  }
}

try {
  Assert-Condition ($env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted') 'GITHUB_HOSTED_RUNNER_REQUIRED'
  Assert-Condition ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT -and [Environment]::Is64BitOperatingSystem) 'WINDOWS_X64_REQUIRED'
  Assert-Condition ($ExpectedSourceSHA -match '^[a-f0-9]{40}$') 'EXPECTED_SOURCE_SHA_INVALID'
  Assert-Condition (-not [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) 'RUNNER_TEMP_MISSING'

  $runnerTemp = [IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
  $artifactFull = [IO.Path]::GetFullPath($ArtifactRoot)
  Assert-Condition ($artifactFull.StartsWith($runnerTemp, [StringComparison]::OrdinalIgnoreCase)) 'ARTIFACT_OUTSIDE_RUNNER_TEMP'
  $artifactDirectory = Assert-RegularFile (Join-Path $artifactFull 'BUILD_REPORT.json')
  Assert-Condition ($artifactDirectory.DirectoryName -eq $artifactFull.TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar))) 'ARTIFACT_ROOT_INVALID'

  $expectedArtifactPaths = @(
    'AgentCanary-Community-Setup.exe',
    'BUILD_REPORT.json',
    'BUILD_RESULT.json',
    'COMMUNITY_BUILD_REPORT.json',
    'VERSION.json',
    'SOURCE_MANIFEST.json',
    'PAYLOAD_MANIFEST.json',
    'CANARY_RESULT.json',
    'extracted-hook/claude-native-hook.mjs',
    'extracted-hook/e4-hook-faults.mjs',
    'installer-lifecycle-smoke.ps1'
  )
  $sumPath = Join-Path $artifactFull 'SHA256SUMS.txt'
  $sumItem = Assert-RegularFile $sumPath
  $sumLines = [IO.File]::ReadAllLines($sumPath) | Where-Object { $_ -ne '' }
  $verifiedEntries = [System.Collections.Generic.Dictionary[string,string]]::new([StringComparer]::Ordinal)
  foreach ($line in $sumLines) {
    if ($line -notmatch '^([a-f0-9]{64})  ([^\r\n]+)$') { throw 'SHA256SUMS_LINE_INVALID' }
    $hash = $Matches[1]
    $relative = $Matches[2]
    if ($verifiedEntries.ContainsKey($relative)) { throw 'SHA256SUMS_PATH_DUPLICATE' }
    if ($relative -notin $expectedArtifactPaths) { throw 'SHA256SUMS_PATH_UNEXPECTED' }
    $path = Resolve-ContainedPath $artifactFull $relative
    $item = Assert-RegularFile $path
    if ((Get-Sha256 $path) -ne $hash) { throw "ARTIFACT_SHA256_MISMATCH:$relative" }
    $verifiedEntries.Add($relative, $hash)
  }
  Assert-Condition ($verifiedEntries.Count -eq $expectedArtifactPaths.Count) 'SHA256SUMS_SET_INCOMPLETE'
  foreach ($relative in $expectedArtifactPaths) {
    Assert-Condition ($verifiedEntries.ContainsKey($relative)) 'SHA256SUMS_ENTRY_MISSING'
  }

  $buildReport = Get-Content -LiteralPath (Join-Path $artifactFull 'BUILD_REPORT.json') -Raw | ConvertFrom-Json
  $manifestPath = Join-Path $artifactFull 'PAYLOAD_MANIFEST.json'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  Assert-Condition ($buildReport.sourceSHA -eq $ExpectedSourceSHA) 'BUILD_REPORT_SOURCE_SHA_MISMATCH'
  Assert-Condition ($buildReport.installerExecuted -eq $false) 'STATIC_BUILD_REPORT_SHOULD_NOT_CLAIM_INSTALL'
  Assert-Condition ($buildReport.status -eq 'BUILT_NOT_INSTALLED; PACKAGED_HOOK_CANARY_EXECUTED') 'BUILD_REPORT_STATUS_INVALID'
  Assert-Condition ($buildReport.candidateId -match '^competition-candidate\.([1-9][0-9]*)$') 'BUILD_REPORT_CANDIDATE_INVALID'
  $candidateNumber = $Matches[1]
  Assert-Condition ($buildReport.packageVersion -eq $manifest.version) 'PACKAGE_VERSION_MISMATCH'
  Assert-Condition ((Get-Sha256 $manifestPath) -eq $buildReport.payloadManifestSHA256) 'PAYLOAD_MANIFEST_SHA256_MISMATCH'
  Assert-Condition ($buildReport.launcherSHA256 -match '^[a-f0-9]{64}$') 'BUILD_REPORT_LAUNCHER_SHA256_INVALID'

  $installerRelative = 'AgentCanary-Community-Setup.exe'
  $installerPath = Join-Path $artifactFull $installerRelative
  $installerItem = Assert-RegularFile $installerPath
  $installerSha256 = Get-Sha256 $installerPath
  Assert-Condition ($installerSha256 -eq $buildReport.installerSHA256) 'BUILD_REPORT_INSTALLER_SHA256_MISMATCH'
  Assert-Condition ($installerSha256 -eq $verifiedEntries[$installerRelative]) 'SHA256SUMS_INSTALLER_MISMATCH'
  Assert-Condition ([long]$installerItem.Length -eq [long]$buildReport.installerBytes) 'BUILD_REPORT_INSTALLER_SIZE_MISMATCH'

  $result.sourceSHA = $ExpectedSourceSHA
  $result.installerSHA256 = $installerSha256
  $result.candidateId = [string]$buildReport.candidateId
  $result.launcherSHA256 = [string]$buildReport.launcherSHA256
  $result.runner = [ordered]@{
    environment = $env:RUNNER_ENVIRONMENT
    osCaption = [string](Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').ProductName
    osBuild = [string](Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').CurrentBuildNumber
    powershell = [string]$PSVersionTable.PSVersion
    executionContext = 'GitHub-hosted runner account; standard-user token not asserted'
  }
  Add-Check 'artifact-provenance' 'PASS' @{ sourceSHA = $ExpectedSourceSHA; installerSHA256 = $installerSha256; candidateId = [string]$buildReport.candidateId; checksummedFiles = $verifiedEntries.Count }

  $sandboxRoot = Join-Path $runnerTemp "Agent Canary 验收 $([Guid]::NewGuid().ToString('N'))"
  Assert-Condition (-not (Test-Path -LiteralPath $sandboxRoot)) 'SANDBOX_ALREADY_EXISTS'
  New-Item -ItemType Directory -Path $sandboxRoot | Out-Null
  $installRoot = Join-Path $sandboxRoot 'Agent Canary 安装目录'
  $phaseMarkerPath = Join-Path $installRoot '.m7-installer-lifecycle-phase'
  $duplicateRoot = Join-Path $sandboxRoot 'duplicate target'
  $registryKey = "Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\AgentCanaryCommunityCandidate$candidateNumber"
  $programsRoot = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  $startMenuFolder = Join-Path $programsRoot "Agent Canary Community candidate.$candidateNumber"
  $startMenuShortcut = Join-Path $startMenuFolder 'Agent Canary.lnk'
  $desktopRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
  $desktopShortcut = Join-Path $desktopRoot "Agent Canary Community candidate.$candidateNumber.lnk"

  Assert-Condition (-not (Test-Path -LiteralPath $installRoot)) 'INSTALL_TARGET_NOT_EMPTY_AT_START'
  Assert-Condition (-not (Test-Path -LiteralPath $registryKey)) 'CANDIDATE_ALREADY_REGISTERED_AT_START'
  Assert-Condition (-not (Test-Path -LiteralPath $startMenuFolder)) 'START_MENU_TARGET_NOT_CLEAN'
  Assert-Condition (-not (Test-Path -LiteralPath $desktopShortcut)) 'DESKTOP_SHORTCUT_ALREADY_EXISTS'

  $installResult = Invoke-Nsis $installerPath "/S /D=$installRoot" -RecordSetupProcess -EnablePhaseMarkers
  Read-InstallerPhase
  Assert-Condition ($installResult.exitCode -eq 0) 'INSTALLER_EXIT_NOT_ZERO'
  $result.installerExecuted = $true
  $result.installPath = '<RUNNER_TEMP>/Agent Canary 安装目录'

  $manifestFileCount = 0
  foreach ($entry in $manifest.files) {
    $relative = [string]$entry.path
    $path = Resolve-ContainedPath $installRoot $relative
    $item = Assert-RegularFile $path
    Assert-Condition ([long]$item.Length -eq [long]$entry.size) 'INSTALLED_FILE_SIZE_MISMATCH'
    Assert-Condition ((Get-Sha256 $path) -eq [string]$entry.sha256) 'INSTALLED_FILE_SHA256_MISMATCH'
    $manifestFileCount++
  }
  $launcherPath = Join-Path $installRoot 'AgentCanary.exe'
  Assert-Condition ((Get-Sha256 $launcherPath) -eq [string]$buildReport.launcherSHA256) 'INSTALLED_LAUNCHER_SHA256_MISMATCH'
  $receiptPath = Join-Path $installRoot 'INSTALL_RECEIPT.json'
  $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
  Assert-Condition ($receipt.installerSHA256 -eq $installerSha256) 'INSTALL_RECEIPT_SHA256_MISMATCH'
  Assert-Condition ((Get-RegistryInstallLocation $registryKey) -eq $installRoot) 'REGISTRY_INSTALL_LOCATION_MISMATCH'
  Assert-Condition (Test-Path -LiteralPath $startMenuShortcut -PathType Leaf) 'START_MENU_SHORTCUT_MISSING'
  Assert-Condition (Test-Path -LiteralPath $desktopShortcut -PathType Leaf) 'DESKTOP_SHORTCUT_MISSING'
  Add-Check 'silent-install' 'PASS' @{ exitCode = $installResult.exitCode; durationMs = $installResult.durationMs; manifestFilesVerified = $manifestFileCount; registryAndShortcutsVerified = $true; pathContainsSpacesAndUnicode = $true }

  $installedNodePath = Join-Path (Join-Path $installRoot 'runtime') 'node.exe'
  $installedHookPath = Join-Path $installRoot 'claude-native-hook.mjs'
  $installedHarnessPath = Join-Path $installRoot 'e4-hook-faults.mjs'
  try {
    [void](Assert-RegularFile $installedHookPath)
    $installedHookSha256 = Get-Sha256 $installedHookPath
    $installedHookBlobSha = Get-GitBlobSha1 $installedHookPath
    $installedHookIdentityStatus = if ($installedHookSha256 -eq 'ff0bfef67e92c9ee387f78dd617408b63db6a9646566e16ca0f8e02c842c511d' -and $installedHookBlobSha -eq 'b7ed4aba70a597f4f63a05decc6de1b32f67372e') { 'PASS' } else { 'FAIL' }
    Add-Check 'installed-hook-identity' $installedHookIdentityStatus @{ sha256 = $installedHookSha256; blobSHA = $installedHookBlobSha; path = '<INSTALL_ROOT>/claude-native-hook.mjs' }
    Assert-Condition ($installedHookIdentityStatus -eq 'PASS') 'INSTALLED_HOOK_CANONICAL_BLOB_MISMATCH'
    $installedHookCanary = Invoke-InstalledHookCanaries $installedNodePath $installedHookPath $installedHarnessPath $installRoot $sandboxRoot
    Add-Check 'installed-hook-canary' 'PASS' $installedHookCanary
  } catch {
    $hookCanaryFailure = [string]$_.Exception.Message
    if ($sandboxRoot) { $hookCanaryFailure = $hookCanaryFailure.Replace($sandboxRoot, '<RUNNER_TEMP>/sandbox') }
    if ($ArtifactRoot) { $hookCanaryFailure = $hookCanaryFailure.Replace([IO.Path]::GetFullPath($ArtifactRoot), '<RUNNER_TEMP>/artifact') }
    Add-Check 'installed-hook-canary' 'FAIL' @{ reason = $hookCanaryFailure }
    throw
  }

  $duplicateResult = Invoke-Nsis $installerPath "/S /D=$duplicateRoot"
  Assert-Condition ((Get-RegistryInstallLocation $registryKey) -eq $installRoot) 'DUPLICATE_INSTALL_REPLACED_REGISTRY'
  if (Test-Path -LiteralPath $duplicateRoot) {
    Assert-Condition (@(Get-ChildItem -LiteralPath $duplicateRoot -Force).Count -eq 0) 'DUPLICATE_INSTALL_WROTE_FILES'
  }
  Add-Check 'duplicate-candidate-refusal' 'PASS' @{ processExitCode = $duplicateResult.exitCode; originalInstallRetained = $true; secondTargetRemainedEmpty = $true }

  $sentinelPath = Join-Path $installRoot 'M7-unknown-file-preservation-sentinel.txt'
  [IO.File]::WriteAllText($sentinelPath, 'synthetic M7 uninstall preservation sentinel')
  $uninstallerPath = Join-Path $installRoot 'Uninstall.exe'
  Assert-Condition ((Assert-RegularFile $uninstallerPath).Length -gt 0) 'UNINSTALLER_MISSING_BEFORE_UNINSTALL'
  $uninstallAttempted = $true
  $uninstallResult = Invoke-Nsis $uninstallerPath '/S'
  Assert-Condition ($uninstallResult.exitCode -eq 0) 'UNINSTALLER_EXIT_NOT_ZERO'
  $result.uninstallCompletion = Wait-ForUninstallCompletion $uninstallerPath $registryKey $startMenuShortcut $startMenuFolder $desktopShortcut -TimeoutMs 30000
  Assert-Condition ($result.uninstallCompletion.completed) 'UNINSTALL_COMPLETION_TIMEOUT'
  $uninstalled = $true

  $ownedRootFiles = @('AgentCanary.exe', 'INSTALL_RECEIPT.json', 'Uninstall.exe')
  $remainingOwned = @($ownedRootFiles | Where-Object { Test-Path -LiteralPath (Join-Path $installRoot $_) })
  foreach ($entry in $manifest.files) {
    $ownedPath = Resolve-ContainedPath $installRoot ([string]$entry.path)
    if (Test-Path -LiteralPath $ownedPath) { $remainingOwned += [string]$entry.path }
  }
  $residueLimit = 64
  $result.uninstallResidue = [ordered]@{
    count = $remainingOwned.Count
    relativePaths = @($remainingOwned | Select-Object -First $residueLimit)
    truncated = ($remainingOwned.Count -gt $residueLimit)
  }
  Assert-Condition ($remainingOwned.Count -eq 0) 'OWNED_INSTALL_FILES_REMAIN_AFTER_UNINSTALL'
  Assert-Condition ($null -eq (Get-RegistryInstallLocation $registryKey)) 'REGISTRY_KEY_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (-not (Test-Path -LiteralPath $startMenuShortcut)) 'START_MENU_SHORTCUT_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (-not (Test-Path -LiteralPath $startMenuFolder)) 'START_MENU_FOLDER_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (-not (Test-Path -LiteralPath $desktopShortcut)) 'DESKTOP_SHORTCUT_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (Test-Path -LiteralPath $sentinelPath -PathType Leaf) 'UNKNOWN_FILE_NOT_PRESERVED'
  $remainingRootEntries = @(Get-ChildItem -LiteralPath $installRoot -Force | Select-Object -ExpandProperty Name)
  Assert-Condition ($remainingRootEntries.Count -eq 1 -and $remainingRootEntries[0] -eq 'M7-unknown-file-preservation-sentinel.txt') 'UNINSTALL_ROOT_CONTENTS_UNEXPECTED'
  Add-Check 'silent-uninstall' 'PASS' @{ exitCode = $uninstallResult.exitCode; durationMs = $uninstallResult.durationMs; completionWaitMs = $result.uninstallCompletion.durationMs; ownedFilesRemoved = $true; registryAndShortcutsRemoved = $true; unknownSentinelPreserved = $true }
  $result.status = 'PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL'
} catch {
  $fatalError = [string]$_.Exception.Message
  if ($sandboxRoot) { $fatalError = $fatalError.Replace($sandboxRoot, '<RUNNER_TEMP>/sandbox') }
  if ($ArtifactRoot) { $fatalError = $fatalError.Replace([IO.Path]::GetFullPath($ArtifactRoot), '<RUNNER_TEMP>/artifact') }
  $result.status = 'FAIL'
  $result.failure = $fatalError
  Add-Check 'installer-lifecycle' 'FAIL' @{ reason = $fatalError }
} finally {
  if (-not $uninstalled -and -not $uninstallAttempted -and $installRoot -and $installerPath -and (Test-Path -LiteralPath $installRoot -PathType Container)) {
    try {
      $sandboxPrefix = [IO.Path]::GetFullPath($sandboxRoot).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
      $installFull = [IO.Path]::GetFullPath($installRoot)
      Assert-Condition ($installFull.StartsWith($sandboxPrefix, [StringComparison]::OrdinalIgnoreCase)) 'FAILURE_CLEANUP_TARGET_OUTSIDE_SANDBOX'
      $uninstallerPath = Join-Path $installFull 'Uninstall.exe'
      if (Test-Path -LiteralPath $uninstallerPath -PathType Leaf) {
        # Failure-only cleanup is synchronous and is not the ordinary-user lifecycle path under test.
        $cleanup = Invoke-Nsis $uninstallerPath "/S _?=$installRoot"
        $result.cleanupAfterFailure = @{ attempted = $true; exitCode = $cleanup.exitCode }
      } else {
        $result.cleanupAfterFailure = @{ attempted = $false; reason = 'UNINSTALLER_NOT_PRESENT' }
      }
    } catch {
      $cleanupReason = [string]$_.Exception.Message
      if ($sandboxRoot) { $cleanupReason = $cleanupReason.Replace($sandboxRoot, '<RUNNER_TEMP>/sandbox') }
      $result.cleanupAfterFailure = @{ attempted = $true; status = 'FAILED'; reason = $cleanupReason }
    }
  }
  Read-InstallerPhase
  $result.completedAt = [DateTime]::UtcNow.ToString('o')
  $evidenceDirectory = Split-Path -Parent $EvidencePath
  New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
  $json = $result | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText($EvidencePath, $json + "`n", [Text.UTF8Encoding]::new($false))
  Write-Output "M7_INSTALLER_LIFECYCLE_STATUS=$($result.status) SOURCE_SHA=$ExpectedSourceSHA INSTALLER_SHA256=$($result.installerSHA256)"
}

if ($result.status -ne 'PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL') { exit 1 }
