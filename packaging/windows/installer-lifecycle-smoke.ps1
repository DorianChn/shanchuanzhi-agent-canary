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
  sourceSHA = $ExpectedSourceSHA
  installerSHA256 = $null
  candidateId = $null
  launcherSHA256 = $null
  installPath = $null
  runner = $null
  failure = $null
  cleanupAfterFailure = $null
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
$installerPath = $null
$uninstalled = $false
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

function Invoke-Nsis([string]$Executable, [string]$RawArguments, [int]$TimeoutMs = 180000, [switch]$RecordSetupProcess) {
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $Executable
  # NSIS requires /D= and _?= paths to be unquoted and last. Keep Arguments raw.
  $startInfo.Arguments = $RawArguments
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
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

function Resolve-ContainedPath([string]$Root, [string]$RelativePath) {
  Assert-Condition (-not [IO.Path]::IsPathRooted($RelativePath)) 'MANIFEST_PATH_ROOTED'
  Assert-Condition ($RelativePath -notmatch '(^|[\\/])\.\.([\\/]|$)|:|\\|//') 'MANIFEST_PATH_UNSAFE'
  $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
  $pathFull = [IO.Path]::GetFullPath([IO.Path]::Combine($Root, $RelativePath.Replace('/', [IO.Path]::DirectorySeparatorChar)))
  Assert-Condition ($pathFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) 'MANIFEST_PATH_ESCAPES_INSTALL_ROOT'
  return $pathFull
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
  Assert-Condition ($buildReport.status -eq 'SETUP_EXTRACTED_HOOK_CANARY_EXECUTED_INSTALLER_NOT_RUN') 'BUILD_REPORT_STATUS_INVALID'
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

  $installResult = Invoke-Nsis $installerPath "/S /D=$installRoot" -RecordSetupProcess
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
  $uninstallResult = Invoke-Nsis $uninstallerPath "/S _?=$installRoot"
  Assert-Condition ($uninstallResult.exitCode -eq 0) 'UNINSTALLER_EXIT_NOT_ZERO'
  $uninstalled = $true

  $ownedRootFiles = @('AgentCanary.exe', 'INSTALL_RECEIPT.json', 'Uninstall.exe')
  $remainingOwned = @($ownedRootFiles | Where-Object { Test-Path -LiteralPath (Join-Path $installRoot $_) })
  foreach ($entry in $manifest.files) {
    $ownedPath = Resolve-ContainedPath $installRoot ([string]$entry.path)
    if (Test-Path -LiteralPath $ownedPath) { $remainingOwned += [string]$entry.path }
  }
  Assert-Condition ($remainingOwned.Count -eq 0) 'OWNED_INSTALL_FILES_REMAIN_AFTER_UNINSTALL'
  Assert-Condition ($null -eq (Get-RegistryInstallLocation $registryKey)) 'REGISTRY_KEY_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (-not (Test-Path -LiteralPath $startMenuShortcut)) 'START_MENU_SHORTCUT_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (-not (Test-Path -LiteralPath $startMenuFolder)) 'START_MENU_FOLDER_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (-not (Test-Path -LiteralPath $desktopShortcut)) 'DESKTOP_SHORTCUT_REMAINS_AFTER_UNINSTALL'
  Assert-Condition (Test-Path -LiteralPath $sentinelPath -PathType Leaf) 'UNKNOWN_FILE_NOT_PRESERVED'
  $remainingRootEntries = @(Get-ChildItem -LiteralPath $installRoot -Force | Select-Object -ExpandProperty Name)
  Assert-Condition ($remainingRootEntries.Count -eq 1 -and $remainingRootEntries[0] -eq 'M7-unknown-file-preservation-sentinel.txt') 'UNINSTALL_ROOT_CONTENTS_UNEXPECTED'
  Add-Check 'silent-uninstall' 'PASS' @{ exitCode = $uninstallResult.exitCode; durationMs = $uninstallResult.durationMs; ownedFilesRemoved = $true; registryAndShortcutsRemoved = $true; unknownSentinelPreserved = $true }
  $result.status = 'PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL'
} catch {
  $fatalError = [string]$_.Exception.Message
  if ($sandboxRoot) { $fatalError = $fatalError.Replace($sandboxRoot, '<RUNNER_TEMP>/sandbox') }
  if ($ArtifactRoot) { $fatalError = $fatalError.Replace([IO.Path]::GetFullPath($ArtifactRoot), '<RUNNER_TEMP>/artifact') }
  $result.status = 'FAIL'
  $result.failure = $fatalError
  Add-Check 'installer-lifecycle' 'FAIL' @{ reason = $fatalError }
} finally {
  if (-not $uninstalled -and $installRoot -and $installerPath -and (Test-Path -LiteralPath $installRoot -PathType Container)) {
    try {
      $sandboxPrefix = [IO.Path]::GetFullPath($sandboxRoot).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
      $installFull = [IO.Path]::GetFullPath($installRoot)
      Assert-Condition ($installFull.StartsWith($sandboxPrefix, [StringComparison]::OrdinalIgnoreCase)) 'FAILURE_CLEANUP_TARGET_OUTSIDE_SANDBOX'
      $uninstallerPath = Join-Path $installFull 'Uninstall.exe'
      if (Test-Path -LiteralPath $uninstallerPath -PathType Leaf) {
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
  $result.completedAt = [DateTime]::UtcNow.ToString('o')
  $evidenceDirectory = Split-Path -Parent $EvidencePath
  New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
  $json = $result | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText($EvidencePath, $json + "`n", [Text.UTF8Encoding]::new($false))
  Write-Output "M7_INSTALLER_LIFECYCLE_STATUS=$($result.status) SOURCE_SHA=$ExpectedSourceSHA INSTALLER_SHA256=$($result.installerSHA256)"
}

if ($result.status -ne 'PASS_BOUNDED_GITHUB_HOSTED_INSTALL_UNINSTALL') { exit 1 }
