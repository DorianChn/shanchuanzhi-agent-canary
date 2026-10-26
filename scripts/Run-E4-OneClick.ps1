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
    $downloadPath = Join-Path $outputRoot $package.file
    $runtimeDirectory = Join-Path $outputRoot 'python-portable'
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
        $envInfo.pythonRuntimePath = $pythonRuntime.path
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
    $e4Ok = Invoke-TestStep -Name 'synthetic-e4-automation' -Executable $npmCommand.Source -Arguments @('run','e4:auto','--',"--out-dir=$e4Output")
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
}

$failedSteps = @($steps | Where-Object { $_.status -in @('FAIL','BLOCKED') })
$overallExit = if ($failedSteps.Count -gt 0) { 1 } else { 0 }
$fullSuite = $null
$fullSuiteFindings = @()
$fullSuiteLog = Join-Path $outputRoot 'full-project-tests.log'
if (Test-Path -LiteralPath $fullSuiteLog -PathType Leaf) {
    $fullSuiteText = Get-Content -LiteralPath $fullSuiteLog
    $fullSuite = [ordered]@{}
    foreach ($key in @('tests','pass','fail','skipped')) {
        $match = $fullSuiteText | Select-String -Pattern "^# $key (\d+)$" | Select-Object -Last 1
        if ($match) { $fullSuite[$key] = [int]$match.Matches[0].Groups[1].Value }
    }
    $fullSuiteFindings = @($fullSuiteText | Select-String -Pattern "^not ok \d+ - |^  error: |requires the same Python runtime" | ForEach-Object { $_.Line } | Select-Object -First 12)
}
$e4ReportPath = Get-ChildItem -LiteralPath (Join-Path $outputRoot 'e4') -Filter 'report.json' -File -Recurse -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
$e4Report = if ($e4ReportPath) { Get-Content -LiteralPath $e4ReportPath.FullName -Raw | ConvertFrom-Json } else { $null }
$e4Failures = if ($e4Report) { @($e4Report.cases | Where-Object { $_.status -eq 'FAIL' } | ForEach-Object { [ordered]@{ id=$_.id; status=$_.status; reason=$_.reason } }) } else { @() }
$e4Blocked = if ($e4Report) { @($e4Report.cases | Where-Object { $_.status -eq 'BLOCKED' } | ForEach-Object { [ordered]@{ id=$_.id; reason=$_.reason } }) } else { @() }
$result = [ordered]@{
    schema = 'agent-canary.e4-one-click.v1'
    runId = $runId
    environment = $envInfo
    steps = @($steps)
    fullProjectTestSummary = $fullSuite
    fullProjectFailureLines = $fullSuiteFindings
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
        'A configured real model and observed real tool call are required for MODEL-REAL-TOOLCALL.',
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
$mdLines.Add('This run covers the project build, full source test suite, package-content check, E4 evidence/self-check tests, synthetic scenarios, and generated bundle verification. If Windows has no usable Python runtime, the runner downloads the official Python.org embeddable package into this report directory and checks its pinned SHA-256 before use; it does not install Python system-wide. Independent stages continue after failures so later automated checks still produce results. It does not call a real model, execute the installer, or operate a VM. Installed product lifecycle and independent review still require a separate operator in a clean isolated environment.')
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
