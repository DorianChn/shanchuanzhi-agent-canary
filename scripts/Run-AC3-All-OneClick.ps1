[CmdletBinding()]
param([switch]$OpenReport)

$ErrorActionPreference = 'Stop'
$scriptRoot = $PSScriptRoot
$coordinatorRoot = Split-Path $scriptRoot -Parent
$workspaceRoot = Split-Path $coordinatorRoot -Parent
$mainRoot = Join-Path $workspaceRoot 'main'
$node = Get-Command node.exe -ErrorAction Stop
$npm = Get-Command npm.cmd -ErrorAction Stop
$git = Get-Command git.exe -ErrorAction Stop
$runId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')
$reportRoot = Join-Path $coordinatorRoot "security-lab/e4-one-click-runs/$runId/full-matrix"
New-Item -ItemType Directory -Path $reportRoot -Force | Out-Null
$results = [System.Collections.Generic.List[object]]::new()
$modules = @('M1','M2','M3','M4','M5','M6','M7','M8','M9')
$previousCanaryPython = $env:CANARY_PYTHON

function Add-Result {
    param([string]$Name,[string]$Status,[string]$Root,[string]$Sha,[bool]$Dirty,[string]$Log,[string]$Details)
    $results.Add([ordered]@{name=$Name;status=$Status;root=$Root;sha=$Sha;dirtyAtStart=$Dirty;log=$Log;details=$Details})
}

function Invoke-LoggedCommand {
    param([string]$Name,[string]$WorkingDirectory,[string]$Executable,[string[]]$Arguments,[string]$LogPath)
    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $Executable @Arguments 2>&1 | Tee-Object -FilePath $LogPath | Out-Null
        $code = [int]$LASTEXITCODE
        Write-Host "$(if($code -eq 0){'PASS'}else{'FAIL'}) $Name (log: $(Split-Path $LogPath -Leaf))" -ForegroundColor $(if($code -eq 0){'Green'}else{'Yellow'})
        return $code
    }
    finally { $ErrorActionPreference = $previousErrorActionPreference; Pop-Location }
}

# Run the existing E4 bootstrap first so its verified portable Python runtime
# can be reused by every Windows packaging regression in the module worktrees.
$baselineLog = Join-Path $reportRoot 'baseline-e4-one-click.log'
Write-Host "`n=== M0 baseline and E4 automation ===" -ForegroundColor Cyan
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'Run-E4-OneClick.ps1') 2>&1 | Tee-Object -FilePath $baselineLog | Out-Null
$baselineCode = [int]$LASTEXITCODE
Write-Host "M0/E4 result: $(if($baselineCode -eq 0){'PASS'}else{'FAIL'}); detailed log saved." -ForegroundColor $(if($baselineCode -eq 0){'Green'}else{'Yellow'})
Add-Result -Name 'M0/baseline-and-synthetic-E4' -Status $(if($baselineCode -eq 0){'PASS'}else{'FAIL'}) -Root $mainRoot -Sha ((& $git.Source -C $mainRoot rev-parse HEAD 2>$null | Out-String).Trim()) -Dirty ([bool]((& $git.Source -C $mainRoot status --porcelain | Out-String).Trim())) -Log (Split-Path $baselineLog -Leaf) -Details "exitCode=$baselineCode; see nested E4 report for case-level outcomes."
$latestE4JsonFile = Get-ChildItem -LiteralPath (Join-Path $coordinatorRoot 'security-lab/e4-one-click-runs') -Filter 'ONE_CLICK_RESULT.json' -File -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$latestE4Json = if ($latestE4JsonFile) { $latestE4JsonFile.FullName } else { '' }
if ($latestE4Json -and (Test-Path -LiteralPath $latestE4Json -PathType Leaf)) {
    try {
        $e4Result = Get-Content -LiteralPath $latestE4Json -Raw | ConvertFrom-Json
        $pythonPath = $e4Result.environment.pythonRuntimePath
        if ($pythonPath -and (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
            $env:CANARY_PYTHON = $pythonPath
            Write-Host "Reusing verified Python runtime: $pythonPath" -ForegroundColor DarkGray
        }
    }
    catch { Write-Warning "Could not reuse E4 Python runtime metadata: $($_.Exception.Message)" }
}

foreach ($module in $modules) {
    $root = if ($module -eq 'M9') { Join-Path $workspaceRoot 'integration/M9' } else { Join-Path $workspaceRoot "agents/$module" }
    $packagePath = Join-Path $root 'package.json'
    if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
        Add-Result -Name "$module/preflight" -Status 'BLOCKED' -Root $root -Sha '' -Dirty $false -Log '' -Details 'Module worktree or package.json is missing.'
        continue
    }
    $sha = (& $git.Source -C $root rev-parse HEAD 2>$null | Out-String).Trim()
    $dirty = [bool]((& $git.Source -C $root status --porcelain=v1 --untracked-files=all 2>$null | Out-String).Trim())
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    if ($package.name -ne '@dorianchn/agent-canary') {
        Add-Result -Name "$module/preflight" -Status 'FAIL' -Root $root -Sha $sha -Dirty $dirty -Log '' -Details 'Unexpected package identity.'
        continue
    }
    $nodeModules = Join-Path $root 'node_modules'
    $lock = Join-Path $root 'package-lock.json'
    if (-not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
        if (-not (Test-Path -LiteralPath $lock -PathType Leaf)) {
            Add-Result -Name "$module/dependency-install" -Status 'BLOCKED' -Root $root -Sha $sha -Dirty $dirty -Log '' -Details 'Pinned package-lock.json is missing; refusing an unpinned install.'
            continue
        }
        $log = Join-Path $reportRoot "$module-dependency-install.log"
        $code = Invoke-LoggedCommand -Name "$module dependency install" -WorkingDirectory $root -Executable $npm.Source -Arguments @('ci','--no-audit','--no-fund') -LogPath $log
        Add-Result -Name "$module/dependency-install" -Status $(if($code -eq 0){'PASS'}else{'FAIL'}) -Root $root -Sha $sha -Dirty $dirty -Log (Split-Path $log -Leaf) -Details "exitCode=$code"
        if ($code -ne 0) { continue }
    }
    else {
        Add-Result -Name "$module/dependency-install" -Status 'SKIPPED' -Root $root -Sha $sha -Dirty $dirty -Log '' -Details 'Existing node_modules; no install performed.'
    }
    foreach ($step in @(@('build','run','build'),@('tests','test'),@('package-check','run','pack:check'))) {
        $stepName = $step[0]
        $args = if ($stepName -eq 'build') { @('run','build') } elseif ($stepName -eq 'tests') { @('test') } else { @('run','pack:check') }
        if ($stepName -eq 'package-check' -and -not $package.scripts.'pack:check') {
            Add-Result -Name "$module/$stepName" -Status 'BLOCKED' -Root $root -Sha $sha -Dirty $dirty -Log '' -Details 'package.json has no pack:check script.'
            continue
        }
        if ($module -eq 'M5' -and $stepName -eq 'package-check') {
            $packageCheckerPath = Join-Path $root 'scripts/check-package.mjs'
            $packageChecker = if (Test-Path -LiteralPath $packageCheckerPath -PathType Leaf) { Get-Content -LiteralPath $packageCheckerPath -Raw } else { '' }
            $isolatedPrefixPattern = 'runNpm\s*\(\s*\[\s*["'']install["'']\s*,\s*["'']--prefix["'']\s*,\s*installDir\b'
            if ($packageChecker -notmatch $isolatedPrefixPattern) {
                $details = 'Skipped to prevent pack:check npm install from resolving outside its temporary installDir. The current safety gate requires an explicit --prefix installDir in scripts/check-package.mjs before rerunning this check.'
                Add-Result -Name "$module/$stepName" -Status 'BLOCKED' -Root $root -Sha $sha -Dirty $dirty -Log '' -Details $details
                Write-Host "BLOCKED $module $stepName (unsafe install root; see report)" -ForegroundColor Yellow
                continue
            }
        }
        $log = Join-Path $reportRoot "$module-$stepName.log"
        $code = Invoke-LoggedCommand -Name "$module $stepName" -WorkingDirectory $root -Executable $npm.Source -Arguments $args -LogPath $log
        Add-Result -Name "$module/$stepName" -Status $(if($code -eq 0){'PASS'}else{'FAIL'}) -Root $root -Sha $sha -Dirty $dirty -Log (Split-Path $log -Leaf) -Details "exitCode=$code"
    }
}

# Validate that the M9 manifest is structurally sound and still pins the exact
# local M1-M8 worktree heads used by this one-click run.
$m9Root = Join-Path $workspaceRoot 'integration/M9'
$manifestPath = Join-Path $m9Root 'docs/3.0/M9_EXACT_SOURCE_REFS.json'
$validatorPath = Join-Path $scriptRoot 'validate-m9-exact-source-manifest.mjs'
if ((Test-Path -LiteralPath $manifestPath -PathType Leaf) -and (Test-Path -LiteralPath $validatorPath -PathType Leaf)) {
    $log = Join-Path $reportRoot 'M9-manifest-structure.log'
    $previousExpectedM9Sha = $env:EXPECTED_M9_SHA
    $env:EXPECTED_M9_SHA = (& $git.Source -C $m9Root rev-parse HEAD).Trim()
    $code = Invoke-LoggedCommand -Name 'M9 manifest structure' -WorkingDirectory $m9Root -Executable $node.Source -Arguments @($validatorPath,$manifestPath) -LogPath $log
    $env:EXPECTED_M9_SHA = $previousExpectedM9Sha
    Add-Result -Name 'M9/manifest-structure' -Status $(if($code -eq 0){'PASS'}else{'FAIL'}) -Root $m9Root -Sha ((& $git.Source -C $m9Root rev-parse HEAD).Trim()) -Dirty ([bool]((& $git.Source -C $m9Root status --porcelain | Out-String).Trim())) -Log (Split-Path $log -Leaf) -Details "exitCode=$code"
    if ($code -eq 0) {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        foreach ($module in @('M1','M2','M3','M4','M5','M6','M7','M8')) {
            $moduleRoot = Join-Path $workspaceRoot "agents/$module"
            $head = (& $git.Source -C $moduleRoot rev-parse HEAD 2>$null | Out-String).Trim()
            $pinned = $manifest.modules.$module.sha
            $status = if ($head -and $head -eq $pinned) { 'PASS' } else { 'FAIL' }
            Add-Result -Name "M9/pin-$module" -Status $status -Root $moduleRoot -Sha $head -Dirty ([bool]((& $git.Source -C $moduleRoot status --porcelain | Out-String).Trim())) -Log '' -Details "manifest=$pinned; localHead=$head"
        }
    }
}
else {
    Add-Result -Name 'M9/manifest-structure' -Status 'BLOCKED' -Root $m9Root -Sha '' -Dirty $false -Log '' -Details 'M9 exact-source manifest or validator is missing.'
}

$env:CANARY_PYTHON = $previousCanaryPython

$failed = @($results | Where-Object { $_.status -in @('FAIL','BLOCKED') })
$result = [ordered]@{
    schema='agent-canary.ac3-all-one-click.v1'
    runId=$runId
    repository='DorianChn/shanchuanzhi-agent-canary'
    modules=@($modules)
    automatedChecks=if($failed.Count -eq 0){'PASS'}else{'FAIL'}
    resultCount=$results.Count
    nonPassingCount=$failed.Count
    results=@($results)
    productE4='NOT_VERIFIED'
    externalIndependence='NOT_VERIFIED'
    remainingAcceptanceGates=@(
        'A clean isolated Windows VM and matched installer lifecycle receipt are required for installed-product acceptance.',
        'A configured real model and observed real tool call are required for MODEL-REAL-TOOLCALL.',
        'An independent operator and reviewer must provide their own signed acceptance receipt.'
    )
    reportDirectory=$reportRoot
    completedAtUtc=[DateTime]::UtcNow.ToString('o')
}
$jsonPath = Join-Path $reportRoot 'AC3_ALL_ONE_CLICK_RESULT.json'
$mdPath = Join-Path $reportRoot 'AC3_ALL_ONE_CLICK_RESULT.md'
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Agent Canary M0-M9 One-Click Test Results'); $lines.Add('')
$lines.Add("- Automated checks: **$($result.automatedChecks)**")
$lines.Add("- Non-passing checks: **$($result.nonPassingCount)** / $($result.resultCount)")
$lines.Add('- Product E4: **NOT_VERIFIED**')
$lines.Add('- Independent review: **NOT_VERIFIED**')
$lines.Add("- Report directory: $reportRoot"); $lines.Add('')
$lines.Add('## Results'); $lines.Add('')
foreach ($row in $results) { $tail = if($row.details){" — $($row.details)"}else{''}; $logPart = if($row.log){" (log: $($row.log))"}else{''}; $lines.Add("- **$($row.status)** $($row.name)$tail$logPart") }
$lines.Add(''); $lines.Add('## Acceptance boundary'); $lines.Add('')
$lines.Add('This button checks the current local M1-M8 worktrees, M9 integration worktree, M9 source pins, M0 baseline, and synthetic E4 tests. It does not execute a real model, install in a clean VM, or create independent acceptance evidence. Dirty worktrees are reported and left untouched.')
$lines.Add(''); $lines.Add('## Remaining acceptance gates'); $lines.Add('')
foreach ($gate in $result.remainingAcceptanceGates) { $lines.Add("- $gate") }
$lines -join [Environment]::NewLine | Set-Content -LiteralPath $mdPath -Encoding UTF8
Write-Host "`n=== ALL MODULES RESULT ===" -ForegroundColor Cyan
Write-Host "Automated checks: $($result.automatedChecks)"
Write-Host "Report: $mdPath"
if ($OpenReport) { try { Start-Process -FilePath $mdPath -ErrorAction Stop } catch { Write-Warning $_.Exception.Message } }
if ($failed.Count -gt 0) { exit 1 }
