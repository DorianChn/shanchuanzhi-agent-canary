[CmdletBinding()]
param([string]$ProjectRoot, [switch]$OpenReport)

$ErrorActionPreference = 'Stop'
$runnerRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $ProjectRoot) {
    $localMain = Join-Path (Split-Path $runnerRoot -Parent) 'main'
    if (Test-Path -LiteralPath (Join-Path $localMain 'package.json') -PathType Leaf) { $ProjectRoot = $localMain }
    else { $ProjectRoot = $runnerRoot }
}
$repoRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
$packagePath = Join-Path $repoRoot 'package.json'
$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
if ($package.name -ne '@dorianchn/agent-canary') {
    throw 'This runner must be placed in the Agent Canary repository.'
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand -or -not $npmCommand -or -not $gitCommand) {
    throw 'Install Node.js 20+ and Git, then click this file again.'
}
$nodeVersionText = (& $nodeCommand.Source --version).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersionText -notmatch '^v?(\d+)\.') {
    throw "Could not read Node.js version: $nodeVersionText"
}
$nodeMajor = [int]$Matches[1]
if ($nodeMajor -lt 20) { throw "Node.js 20+ is required; found $nodeVersionText" }

$runId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$outputRoot = Join-Path $runnerRoot "security-lab/e4-one-click-runs/$runId"
New-Item -ItemType Directory -Path $outputRoot -ErrorAction Stop | Out-Null
$steps = [System.Collections.Generic.List[object]]::new()
$envInfo = [ordered]@{
    startedAtUtc = [DateTime]::UtcNow.ToString('o')
    repository = 'DorianChn/shanchuanzhi-agent-canary'
    projectRoot = $repoRoot
    sourceCommit = (& $gitCommand.Source -C $repoRoot rev-parse HEAD 2>$null).Trim()
    sourceTree = (& $gitCommand.Source -C $repoRoot rev-parse 'HEAD^{tree}' 2>$null).Trim()
    sourceDirtyAtStart = [bool]((& $gitCommand.Source -C $repoRoot status --porcelain=v1 --untracked-files=all 2>$null | Out-String).Trim())
    operatingSystem = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
    architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    nodeVersion = $nodeVersionText
    npmVersion = (& $npmCommand.Source --version).Trim()
    pythonVersion = $null
    pythonRuntimeSource = $null
    pythonRuntimeSha256 = $null
    realModelRequested = $false
    installerExecuted = $false
    environmentIsolation = 'Temporary user profile, temp directory, npm cache/config, and Git config; removed after the run.'
}

# Keep test fixtures, npm caches, Git configuration, and portable runtimes out
# of the real user's profile. Every child process inherits this isolated env.
$originalTempRoot = if ($env:TEMP) { $env:TEMP } else { [System.IO.Path]::GetTempPath() }
$originalTempFullPath = [System.IO.Path]::GetFullPath($originalTempRoot).TrimEnd('\')
$isolatedRootName = "agent-canary-e4-$runId"
$isolatedRoot = Join-Path $originalTempFullPath $isolatedRootName
$isolatedHome = Join-Path $isolatedRoot 'home'
$isolatedAppData = Join-Path $isolatedRoot 'appdata'
$isolatedLocalAppData = Join-Path $isolatedRoot 'localappdata'
$isolatedTemp = Join-Path $isolatedRoot 'temp'
$isolatedNpm = Join-Path $isolatedRoot 'npm'
$isolatedGit = Join-Path $isolatedRoot 'git'
foreach ($directory in @($isolatedHome,$isolatedAppData,$isolatedLocalAppData,$isolatedTemp,$isolatedNpm,$isolatedGit)) {
    New-Item -ItemType Directory -Path $directory -Force -ErrorAction Stop | Out-Null
}
$isolatedGitConfig = Join-Path $isolatedGit 'config'
[System.IO.File]::WriteAllText($isolatedGitConfig, '', [System.Text.UTF8Encoding]::new($false))
$gitDirectory = Split-Path -Parent $gitCommand.Source
$homeDrive = [System.IO.Path]::GetPathRoot($isolatedHome).TrimEnd('\')
$homePath = $isolatedHome.Substring($homeDrive.Length)
$pathBeforeIsolation = $env:PATH
$environmentNames = @(
    'USERPROFILE','HOME','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','TEMP','TMP',
    'XDG_CONFIG_HOME','XDG_CACHE_HOME','AGENT_CANARY_HOME','CODEX_HOME',
    'npm_config_cache','npm_config_userconfig','npm_config_globalconfig','npm_config_prefix','npm_config_update_notifier',
    'GIT_CONFIG_GLOBAL','AGENT_CANARY_GIT_EXE','NODE_OPTIONS','PATH'
)
$credentialEnvironmentNames = @(
    Get-ChildItem Env: | Where-Object {
        $_.Name -match '(?i)(API[_-]?KEY|ACCESS[_-]?KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE[_-]?KEY|(?:^|_)AUTH(?:_|$)|GIT_ASKPASS|SSH_AUTH_SOCK|SSH_AGENT_PID)'
    } | ForEach-Object { $_.Name }
)
$environmentNames = @($environmentNames + $credentialEnvironmentNames | Select-Object -Unique)
$originalEnvironment = @{}
foreach ($name in $environmentNames) { $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$previousModelEnvironment = @{}
Get-ChildItem Env: | Where-Object { $_.Name -like 'E4_MODEL_*' } | ForEach-Object {
    $previousModelEnvironment[$_.Name] = $_.Value
}
$environmentOverrides = [ordered]@{
    USERPROFILE = $isolatedHome
    HOME = $isolatedHome
    HOMEDRIVE = $homeDrive
    HOMEPATH = $homePath
    APPDATA = $isolatedAppData
    LOCALAPPDATA = $isolatedLocalAppData
    TEMP = $isolatedTemp
    TMP = $isolatedTemp
    XDG_CONFIG_HOME = (Join-Path $isolatedHome '.config')
    XDG_CACHE_HOME = (Join-Path $isolatedHome '.cache')
    AGENT_CANARY_HOME = (Join-Path $isolatedHome '.agent-canary')
    CODEX_HOME = (Join-Path $isolatedHome '.codex')
    npm_config_cache = (Join-Path $isolatedNpm 'cache')
    npm_config_userconfig = (Join-Path $isolatedNpm 'user.npmrc')
    npm_config_globalconfig = (Join-Path $isolatedNpm 'global.npmrc')
    npm_config_prefix = (Join-Path $isolatedNpm 'global')
    npm_config_update_notifier = 'false'
    GIT_CONFIG_GLOBAL = $isolatedGitConfig
    AGENT_CANARY_GIT_EXE = $gitCommand.Source
    # Keep inherited Node hooks out of the run; do not spoof process identity.
    NODE_OPTIONS = $null
    PATH = "$gitDirectory;$pathBeforeIsolation"
}
foreach ($setting in $environmentOverrides.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($setting.Key, $setting.Value, 'Process')
}
foreach ($name in @($previousModelEnvironment.Keys)) {
    [Environment]::SetEnvironmentVariable([string]$name, $null, 'Process')
}
foreach ($name in $credentialEnvironmentNames) {
    [Environment]::SetEnvironmentVariable([string]$name, $null, 'Process')
}

function Invoke-TestStep {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments
    )
    $logPath = Join-Path $outputRoot "$Name.log"
    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    $start = [DateTime]::UtcNow
    Push-Location $repoRoot
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # npm can emit normal notices on stderr. Windows PowerShell may wrap
        # those as ErrorRecords, so keep logging them without aborting the run.
        $ErrorActionPreference = 'Continue'
        & $Executable @Arguments 2>&1 | Tee-Object -FilePath $logPath | Out-Host
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
        Pop-Location
    }
    $row = [ordered]@{
        name = $Name
        exitCode = $exitCode
        status = if ($exitCode -eq 0) { 'PASS' } else { 'FAIL' }
        startedAtUtc = $start.ToString('o')
        completedAtUtc = [DateTime]::UtcNow.ToString('o')
        log = [System.IO.Path]::GetFileName($logPath)
    }
    $steps.Add($row)
    return ($exitCode -eq 0)
}

function Find-UsablePython {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if ($env:CANARY_PYTHON) { $candidates.Add($env:CANARY_PYTHON) }
    foreach ($name in @('python.exe', 'python3.exe', 'python', 'python3')) {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command -and $command.Source -and -not $candidates.Contains($command.Source)) { $candidates.Add($command.Source) }
    }
    foreach ($candidate in $candidates) {
        try {
            $versionText = (& $candidate --version 2>&1 | Out-String).Trim()
            if ($LASTEXITCODE -eq 0 -and $versionText -match '^Python\s+\d+\.\d+\.\d+') {
                return [ordered]@{ path=$candidate; version=$versionText; source='preinstalled'; sha256=$null }
            }
        }
        catch { }
    }
    return $null
}

function Install-VerifiedPortablePython {
    $architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    $package = switch ($architecture) {
        'X64'   { @{ file='python-3.13.17-embed-amd64.zip'; sha256='9e35319bffedab8b36ad44d8f377cb4f1733bcec257a0b6d04d94f01486ddb38' } }
        'X86'   { @{ file='python-3.13.17-embed-win32.zip'; sha256='4afd37bc88ed1391209a4c58deb902cd0741a476692412b23d340aff6e9285e7' } }
        'Arm64' { @{ file='python-3.13.17-embed-arm64.zip'; sha256='7b58787a047b400edbfcb539aa3cdb4e2ed77bf0f22cae42b7c01cedd7dd6614' } }
        default { throw "No pinned portable Python package is configured for Windows architecture $architecture." }
    }
    $downloadPath = Join-Path $isolatedRoot $package.file
    $runtimeDirectory = Join-Path $isolatedRoot 'python-portable'
    $uri = "https://www.python.org/ftp/python/3.13.17/$($package.file)"
    Write-Host "No usable Python runtime found; downloading the official portable Python package for $architecture." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $uri -OutFile $downloadPath -UseBasicParsing
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $archiveStream = [System.IO.File]::OpenRead($downloadPath)
        try { $hashBytes = $sha256.ComputeHash($archiveStream) }
        finally { $archiveStream.Dispose() }
    }
    finally { $sha256.Dispose() }
    $actualHash = [System.BitConverter]::ToString($hashBytes).Replace('-', '').ToLowerInvariant()
    if ($actualHash -ne $package.sha256) { throw "Portable Python SHA-256 mismatch: expected $($package.sha256), received $actualHash." }
    Expand-Archive -LiteralPath $downloadPath -DestinationPath $runtimeDirectory -ErrorAction Stop
    $pythonPath = Join-Path $runtimeDirectory 'python.exe'
    if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) { throw 'Verified portable Python archive did not contain python.exe.' }
    $versionText = (& $pythonPath --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $versionText -ne 'Python 3.13.17') { throw "Portable Python version check failed: $versionText" }
    return [ordered]@{ path=$pythonPath; version=$versionText; source='python.org-verified-portable'; sha256=$actualHash }
}

$overallExit = 0
try {
    $remainingCredentialNames = @($credentialEnvironmentNames | Where-Object {
        $null -ne [Environment]::GetEnvironmentVariable([string]$_.ToString(), 'Process')
    })
    if ($remainingCredentialNames.Count -gt 0) {
        $steps.Add([ordered]@{ name='credential-environment-isolation'; status='FAIL'; reason='Inherited credential variables could not be removed before child processes started.' })
        throw 'E4_CREDENTIAL_ENVIRONMENT_NOT_CLEARED'
    }
    $envInfo.credentialEnvironmentIsolation = 'PASS'
    $steps.Add([ordered]@{ name='credential-environment-isolation'; status='PASS'; reason='Inherited credential and agent variables were removed from child processes and will be restored for the parent process.' })

    $pythonRuntime = Find-UsablePython
    if ($pythonRuntime) {
        $steps.Add([ordered]@{ name='python-runtime'; status='PASS'; reason="Using $($pythonRuntime.version) from preinstalled runtime." })
    }
    elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {
        try {
            $pythonRuntime = Install-VerifiedPortablePython
            $steps.Add([ordered]@{ name='python-runtime'; status='PASS'; reason='Downloaded the official Python.org embeddable runtime and verified its pinned SHA-256 before execution.' })
        }
        catch {
            $steps.Add([ordered]@{ name='python-runtime'; status='FAIL'; reason=$_.Exception.Message })
            $overallExit = 1
        }
    }
    else {
        $steps.Add([ordered]@{ name='python-runtime'; status='FAIL'; reason='No usable Python runtime found; automatic portable bootstrap is supported only on Windows.' })
        $overallExit = 1
    }
    if ($pythonRuntime) {
        $envInfo.pythonVersion = $pythonRuntime.version
        $envInfo.pythonRuntimeSource = $pythonRuntime.source
        $envInfo.pythonRuntimeSha256 = $pythonRuntime.sha256
        $envInfo.pythonRuntimePath = if ($pythonRuntime.source -eq 'python.org-verified-portable') {
            'TEMPORARY_RUNTIME_REMOVED_AFTER_RUN'
        }
        else {
            'PREINSTALLED_RUNTIME_PATH_WITHHELD'
        }
        $previousCanaryPython = $env:CANARY_PYTHON
        $env:CANARY_PYTHON = $pythonRuntime.path
    }

    $lockPath = Join-Path $repoRoot 'package-lock.json'
    if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf)) {
        throw 'package-lock.json is missing; refusing an unpinned dependency install.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules') -PathType Container)) {
        if (-not (Invoke-TestStep -Name 'dependency-install' -Executable $npmCommand.Source -Arguments @('ci','--no-audit','--no-fund'))) { throw 'DEPENDENCY_INSTALL_FAILED' }
    }
    else {
        $steps.Add([ordered]@{ name='dependency-install'; status='SKIPPED'; reason='node_modules already exists; no packages were installed.' })
    }

    # Run each verification stage separately so a failing test suite does not
    # short-circuit the package-content check (as `npm run verify` would).
    $buildOk = Invoke-TestStep -Name 'project-build' -Executable $npmCommand.Source -Arguments @('run','build')
    if (-not $buildOk) { $overallExit = 1 }

    $suiteOk = Invoke-TestStep -Name 'full-project-tests' -Executable $npmCommand.Source -Arguments @('test')
    if (-not $suiteOk) { $overallExit = 1 }

    $packageOk = Invoke-TestStep -Name 'package-content-check' -Executable $npmCommand.Source -Arguments @('run','pack:check')
    if (-not $packageOk) { $overallExit = 1 }

    $focusedOk = Invoke-TestStep -Name 'e4-bundle-and-self-check-tests' -Executable $nodeCommand.Source -Arguments @('--test','security-lab/e4/product-self-check.test.mjs','security-lab/e4/verify-bundle.test.mjs')
    if (-not $focusedOk) { $overallExit = 1 }

    $e4Output = Join-Path $outputRoot 'e4'
    $previousAgentCanaryGitExe = [Environment]::GetEnvironmentVariable('AGENT_CANARY_GIT_EXE', 'Process')
    try {
        # Pass the same Git executable already validated by this Windows runner.
        # Some embedded Node environments cannot spawn the PATH-resolved `git` shim.
        [Environment]::SetEnvironmentVariable('AGENT_CANARY_GIT_EXE', $gitCommand.Source, 'Process')
        if ($buildOk) {
            # Invoke Node directly: npm.cmd/cmd can rewrite a space-containing
            # absolute --out-dir argument before the runner receives it.
            $e4Ok = Invoke-TestStep -Name 'synthetic-e4-automation' -Executable $nodeCommand.Source -Arguments @('security-lab/e4/run.mjs',"--out-dir=$e4Output")
        }
        else {
            $steps.Add([ordered]@{ name='synthetic-e4-automation'; status='SKIPPED'; reason='Build did not pass; refusing to run the E4 runner against stale dist output.' })
            $e4Ok = $false
        }
    }
    finally {
        [Environment]::SetEnvironmentVariable('AGENT_CANARY_GIT_EXE', $previousAgentCanaryGitExe, 'Process')
    }
    if (-not $e4Ok) { $overallExit = 1 }
    $runDirectory = Get-ChildItem -LiteralPath $e4Output -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if ($runDirectory) {
        $verifyBundleOk = Invoke-TestStep -Name 'generated-evidence-bundle-verification' -Executable $nodeCommand.Source -Arguments @('security-lab/e4/verify-bundle.mjs',$runDirectory.FullName)
        if (-not $verifyBundleOk) { $overallExit = 1 }
    }
    else {
        $steps.Add([ordered]@{ name='generated-evidence-bundle-verification'; status='BLOCKED'; reason='No E4 run directory was generated.' })
        $overallExit = 1
    }
}
catch {
    $overallExit = 1
    $steps.Add([ordered]@{ name='runner'; status='FAIL'; reason=$_.Exception.Message })
    Write-Host "RUNNER ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    if ($pythonRuntime) { $env:CANARY_PYTHON = $previousCanaryPython }
    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable($name, $originalEnvironment[$name], 'Process')
    }
    foreach ($name in @($previousModelEnvironment.Keys)) {
        [Environment]::SetEnvironmentVariable([string]$name, [string]$previousModelEnvironment[$name], 'Process')
    }
    try {
        $resolvedIsolationRoot = [System.IO.Path]::GetFullPath($isolatedRoot).TrimEnd('\')
        $expectedIsolationRoot = Join-Path $originalTempFullPath $isolatedRootName
        if (-not [string]::Equals($resolvedIsolationRoot, [System.IO.Path]::GetFullPath($expectedIsolationRoot).TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Isolation cleanup path did not match the unique run directory.'
        }
        if (Test-Path -LiteralPath $resolvedIsolationRoot) {
            Remove-Item -LiteralPath $resolvedIsolationRoot -Recurse -Force -ErrorAction Stop
        }
        if (Test-Path -LiteralPath $resolvedIsolationRoot) { throw 'The isolated runtime directory still exists after cleanup.' }
        $envInfo.isolatedRuntimeCleanup = 'PASS'
        $steps.Add([ordered]@{ name='isolated-runtime-cleanup'; status='PASS'; reason="Removed only this run's temporary runtime and test profile." })
    }
    catch {
        $envInfo.isolatedRuntimeCleanup = 'FAIL'
        $steps.Add([ordered]@{ name='isolated-runtime-cleanup'; status='FAIL'; reason=$_.Exception.Message })
    }
}

$failedSteps = @($steps | Where-Object { $_.status -in @('FAIL','BLOCKED') })
$overallExit = if ($failedSteps.Count -gt 0) { 1 } else { 0 }
$fullSuite = $null
$fullSuiteFindings = @()
$fullSuiteLog = Join-Path $outputRoot 'full-project-tests.log'
if (Test-Path -LiteralPath $fullSuiteLog -PathType Leaf) {
    $fullSuiteText = Get-Content -LiteralPath $fullSuiteLog
    $fullSuite = [ordered]@{}
    # Node's default test reporter changed from TAP's `# tests 12` lines
    # to spec output such as `ℹ tests 12`; accept both formats.
    $summaryPattern = [regex]'^(?:#\s*|ℹ\s*)(tests|pass|fail|skipped)\s+(\d+)$'
    foreach ($line in $fullSuiteText) {
        $match = $summaryPattern.Match([string]$line)
        if ($match.Success) { $fullSuite[$match.Groups[1].Value] = [int]$match.Groups[2].Value }
    }
    if ($fullSuite.Count -ne 4) { $fullSuite = $null }
    $failurePattern = [regex]'^(?:not ok \d+ - |✖ )|^\s+(?:error|Error|AssertionError): |requires the same Python runtime'
    $fullSuiteFindings = @($fullSuiteText | Where-Object { $failurePattern.IsMatch([string]$_) } | Select-Object -First 12)
}
$e4ReportPath = Get-ChildItem -LiteralPath (Join-Path $outputRoot 'e4') -Filter 'report.json' -File -Recurse -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
$e4Report = if ($e4ReportPath) { Get-Content -LiteralPath $e4ReportPath.FullName -Raw | ConvertFrom-Json } else { $null }
$gatewayCapabilityContract = if ($e4Report -and $e4Report.capabilities) { $e4Report.capabilities } else { [ordered]@{ gatewayFileRead='UNKNOWN'; gatewayFileWrite='UNKNOWN'; nativeShell='UNKNOWN' } }
$e4Failures = if ($e4Report) { @($e4Report.cases | Where-Object { $_.status -eq 'FAIL' } | ForEach-Object { [ordered]@{ id=$_.id; status=$_.status; reason=$_.reason } }) } else { @() }
$e4Blocked = if ($e4Report) { @($e4Report.cases | Where-Object { $_.status -eq 'BLOCKED' } | ForEach-Object { [ordered]@{ id=$_.id; reason=$_.reason } }) } else { @() }
$result = [ordered]@{
    schema = 'agent-canary.e4-one-click.v1'
    runId = $runId
    environment = $envInfo
    steps = @($steps)
    fullProjectTestSummary = $fullSuite
    fullProjectFailureLines = $fullSuiteFindings
    gatewayCapabilityContract = $gatewayCapabilityContract
    syntheticE4Failures = $e4Failures
    syntheticE4BlockedCases = $e4Blocked
    automatedChecks = if ($overallExit -eq 0) { 'PASS' } else { 'FAIL' }
    e4Status = 'NOT_VERIFIED'
    productE4Accepted = $false
    externalIndependence = 'NOT_VERIFIED'
    modelTest = 'NOT_RUN'
    installerAndVmLifecycle = 'NOT_RUN'
    remainingAcceptanceGates = @(
        'A clean isolated Windows VM and matched installer lifecycle receipt are required for installed-product acceptance.',
        'MODEL-REAL-TOOLCALL requires a verified configured model, a decoy read followed by a protected read denied without returning target content, and unchanged target state.',
        'An independent operator and reviewer must provide their own signed acceptance receipt.'
    )
    nonPassingStepCount = $failedSteps.Count
    completedAtUtc = [DateTime]::UtcNow.ToString('o')
    reportDirectory = $outputRoot
    boundary = 'This one-click run executes repository tests and synthetic local fixtures. It does not call a real model, execute the installer, operate a VM, or create independent operator/reviewer evidence.'
}
$jsonPath = Join-Path $outputRoot 'ONE_CLICK_RESULT.json'
$mdPath = Join-Path $outputRoot 'ONE_CLICK_RESULT.md'
$result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$mdLines = [System.Collections.Generic.List[string]]::new()
$mdLines.Add('# Agent Canary E4 One-Click Automated Test Results')
$mdLines.Add('')
$mdLines.Add("- Automated checks: **$($result.automatedChecks)**")
$mdLines.Add('- Product E4: **NOT_VERIFIED**')
$mdLines.Add('- Independent review: **NOT_VERIFIED**')
$mdLines.Add("- Source commit: $($envInfo.sourceCommit)")
$mdLines.Add("- Report directory: $outputRoot")
$mdLines.Add("- Gateway read capability: $($gatewayCapabilityContract.gatewayFileRead)")
$mdLines.Add("- Gateway write capability: $($gatewayCapabilityContract.gatewayFileWrite)")
$mdLines.Add("- Native Shell boundary: $($gatewayCapabilityContract.nativeShell)")
$mdLines.Add('')
$mdLines.Add('## Automated steps')
$mdLines.Add('')
foreach ($step in $steps) { $mdLines.Add("- **$($step.status)** $($step.name)") }
$mdLines.Add('')
$mdLines.Add('## Failure details')
$mdLines.Add('')
if ($fullSuite) { $mdLines.Add("- Full suite: $($fullSuite.pass)/$($fullSuite.tests) passed; failed=$($fullSuite.fail); skipped=$($fullSuite.skipped).") }
foreach ($line in $fullSuiteFindings) { $mdLines.Add("- Full-suite output: $line") }
foreach ($case in $e4Failures) { $mdLines.Add("- Synthetic E4 FAIL: $($case.id): $($case.reason)") }
foreach ($case in $e4Blocked) { $mdLines.Add("- Synthetic E4 BLOCKED: $($case.id): $($case.reason)") }
if ($fullSuiteFindings.Count -eq 0 -and $e4Failures.Count -eq 0 -and $e4Blocked.Count -eq 0) { $mdLines.Add('No automated test failures or blocked synthetic cases were reported.') }
$mdLines.Add('')
$mdLines.Add('## Acceptance boundary')
$mdLines.Add('')
$mdLines.Add('This run covers the project build, full source test suite, package-content check, E4 evidence/self-check tests, synthetic scenarios, and generated bundle verification. Test profiles, npm caches, Git configuration, temporary files, and any official Python.org embeddable package are placed in a unique temporary runtime directory and removed after the run. A portable Python package is used only after its pinned SHA-256 passes; Python is not installed system-wide. Independent stages continue after failures so later automated checks still produce results. It does not call a real model, execute the installer, or operate a VM. Installed product lifecycle and independent review still require a separate operator in a clean isolated environment.')
$mdLines.Add('')
$mdLines.Add('## Remaining acceptance gates')
$mdLines.Add('')
foreach ($gate in $result.remainingAcceptanceGates) { $mdLines.Add("- $gate") }
$md = $mdLines -join [Environment]::NewLine
$md | Set-Content -LiteralPath $mdPath -Encoding UTF8

Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
Write-Host "Automated checks: $($result.automatedChecks)"
Write-Host 'Product E4: NOT_VERIFIED (independent installed-product acceptance is still required)'
Write-Host "Report: $mdPath"
if ($OpenReport) {
    try { Start-Process -FilePath $mdPath -ErrorAction Stop }
    catch { Write-Warning "Could not open the report automatically: $($_.Exception.Message)" }
}
if ($overallExit -ne 0) { exit 1 }
