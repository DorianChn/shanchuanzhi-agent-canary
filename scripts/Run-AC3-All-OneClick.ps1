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
$previousAgentCanaryHome = $env:AGENT_CANARY_HOME

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
$baselineCanaryHome = Join-Path $reportRoot 'isolated-agent-state/baseline'
New-Item -ItemType Directory -Path $baselineCanaryHome -Force | Out-Null
Write-Host "`n=== M0 baseline and E4 automation ===" -ForegroundColor Cyan
try {
    $env:AGENT_CANARY_HOME = $baselineCanaryHome
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'Run-E4-OneClick.ps1') 2>&1 | Tee-Object -FilePath $baselineLog | Out-Null
    $baselineCode = [int]$LASTEXITCODE
}
finally { $env:AGENT_CANARY_HOME = $previousAgentCanaryHome }
Write-Host "M0/E4 result: $(if($baselineCode -eq 0){'PASS'}else{'FAIL'}); detailed log saved." -ForegroundColor $(if($baselineCode -eq 0){'Green'}else{'Yellow'})
Add-Result -Name 'M0/baseline-and-synthetic-E4' -Status $(if($baselineCode -eq 0){'PASS'}else{'FAIL'}) -Root $mainRoot -Sha ((& $git.Source -C $mainRoot rev-parse HEAD 2>$null | Out-String).Trim()) -Dirty ([bool]((& $git.Source -C $mainRoot status --porcelain | Out-String).Trim())) -Log (Split-Path $baselineLog -Leaf) -Details "exitCode=$baselineCode; see nested E4 report for case-level outcomes."
$nestedE4Json = ''
$e4Result = $null
$reportLine = $null
if (Test-Path -LiteralPath $baselineLog -PathType Leaf) {
    $reportLine = Select-String -LiteralPath $baselineLog -Pattern '^Report:\s+(.+ONE_CLICK_RESULT\.md)\s*$' | Select-Object -Last 1
}
if ($reportLine) {
    try {
        $nestedMd = [System.IO.Path]::GetFullPath($reportLine.Matches[0].Groups[1].Value.Trim())
        $allowedRoot = [System.IO.Path]::GetFullPath((Join-Path $coordinatorRoot 'security-lab/e4-one-click-runs')).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
        if ($nestedMd.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase) -and [System.IO.Path]::GetFileName($nestedMd) -eq 'ONE_CLICK_RESULT.md') {
            $nestedE4Json = [System.IO.Path]::ChangeExtension($nestedMd, '.json')
        }
    }
    catch { Write-Warning 'Nested E4 report path is invalid; its evidence remains NOT_VERIFIED.' }
}
if ($nestedE4Json -and (Test-Path -LiteralPath $nestedE4Json -PathType Leaf)) {
    try {
        $e4Result = Get-Content -LiteralPath $nestedE4Json -Raw | ConvertFrom-Json
        $pythonPath = $e4Result.environment.pythonRuntimePath
        if ($pythonPath -and (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
            $env:CANARY_PYTHON = $pythonPath
            Write-Host "Reusing verified Python runtime: $pythonPath" -ForegroundColor DarkGray
        }
    }
    catch { Write-Warning "Could not reuse E4 Python runtime metadata: $($_.Exception.Message)" }
}
if ($e4Result -and $e4Result.PSObject.Properties['syntheticE4SnapshotEvidenceIssues']) {
    $snapshotIssues = @($e4Result.syntheticE4SnapshotEvidenceIssues | Where-Object { $null -ne $_ })
    $snapshotDetails = if ($snapshotIssues.Count -gt 0) {
        'Target observations NOT_VERIFIED: ' + (($snapshotIssues | ForEach-Object { "$($_.id):$($_.target)" }) -join ', ') + "; nested report=$nestedE4Json"
    } else {
        "Required target snapshot records are present; this does not verify target state or product protection. nested report=$nestedE4Json"
    }
    Add-Result -Name 'M0/E4-snapshot-presence' -Status $(if($snapshotIssues.Count -gt 0){'BLOCKED'}else{'PASS'}) -Root $mainRoot -Sha ((& $git.Source -C $mainRoot rev-parse HEAD 2>$null | Out-String).Trim()) -Dirty ([bool]((& $git.Source -C $mainRoot status --porcelain | Out-String).Trim())) -Log '' -Details $snapshotDetails
}
else {
    Add-Result -Name 'M0/E4-snapshot-presence' -Status 'BLOCKED' -Root $mainRoot -Sha ((& $git.Source -C $mainRoot rev-parse HEAD 2>$null | Out-String).Trim()) -Dirty ([bool]((& $git.Source -C $mainRoot status --porcelain | Out-String).Trim())) -Log '' -Details 'Current nested E4 snapshot metadata is unavailable; target observations are NOT_VERIFIED.'
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
            $isolatedCwdPatterns = @(
                'const\s+temp\s*=\s*fs\.mkdtempSync\(\s*path\.join\(\s*os\.tmpdir\(\)\s*,\s*["'']agent-canary-package-["'']\s*\)\s*\)',
                'function\s+run\s*\(\s*command\s*,\s*args\s*,\s*cwd\s*=\s*root\s*\)\s*\{[\s\S]*?execFileSync\(\s*command\s*,\s*args\s*,\s*\{\s*cwd\s*,',
                'function\s+runNpm\s*\(\s*args\s*,\s*cwd\s*=\s*root\s*\)\s*\{[\s\S]*?return\s+run\(\s*process\.execPath\s*,\s*\[\s*npmCli\s*,\s*\.\.\.args\s*\]\s*,\s*cwd\s*\)',
                'const\s+installDir\s*=\s*path\.join\(\s*temp\s*,\s*["'']install["'']\s*\)',
                'runNpm\(\s*\[\s*["'']install["''][^\]]*["'']--prefix["'']\s*,\s*installDir\s*,[^\]]*packageFile\s*\]\s*,\s*installDir\s*\)'
            )
            $isScopedToTempInstallDir = $true
            foreach ($pattern in $isolatedCwdPatterns) {
                if ($packageChecker -notmatch $pattern) { $isScopedToTempInstallDir = $false; break }
            }
            if (-not $isScopedToTempInstallDir) {
                $details = 'Skipped because the checker does not prove that npm install is explicitly prefixed to its child OS-temporary installDir and runs there through the npm wrapper. cwd alone is insufficient because npm may resolve a user-level project prefix. Require the verified temporary root, cwd propagation, --prefix installDir, and install call before rerunning this check.'
                Add-Result -Name "$module/$stepName" -Status 'BLOCKED' -Root $root -Sha $sha -Dirty $dirty -Log '' -Details $details
                Write-Host "BLOCKED $module $stepName (unsafe install root; see report)" -ForegroundColor Yellow
                continue
            }
        }
        $log = Join-Path $reportRoot "$module-$stepName.log"
        $previousStepCanaryHome = $env:AGENT_CANARY_HOME
        try {
            if ($stepName -eq 'tests') {
                $moduleCanaryHome = Join-Path $reportRoot "isolated-agent-state/$module"
                New-Item -ItemType Directory -Path $moduleCanaryHome -Force | Out-Null
                $env:AGENT_CANARY_HOME = $moduleCanaryHome
            }
            $code = Invoke-LoggedCommand -Name "$module $stepName" -WorkingDirectory $root -Executable $npm.Source -Arguments $args -LogPath $log
        }
        finally { $env:AGENT_CANARY_HOME = $previousStepCanaryHome }
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

# Reproduce direct M1-M8 merge conflicts against the current checked-out
# feature baseline. `merge-tree` writes only an unreachable tree object; it
# does not update any branch, index, worktree, or module-owned file.
$baselineSha = (& $git.Source -C $mainRoot rev-parse HEAD 2>$null | Out-String).Trim()
if (-not $baselineSha) {
    Add-Result -Name 'Git/current-baseline-merge-tree' -Status 'BLOCKED' -Root $mainRoot -Sha '' -Dirty $false -Log '' -Details 'Could not resolve the current feature baseline commit.'
}
else {
    foreach ($module in @('M1','M2','M3','M4','M5','M6','M7','M8')) {
        $moduleRoot = Join-Path $workspaceRoot "agents/$module"
        $moduleSha = (& $git.Source -C $moduleRoot rev-parse HEAD 2>$null | Out-String).Trim()
        $moduleDirty = [bool]((& $git.Source -C $moduleRoot status --porcelain=v1 --untracked-files=all 2>$null | Out-String).Trim())
        if (-not $moduleSha) {
            Add-Result -Name "Git/merge-tree-$module" -Status 'BLOCKED' -Root $moduleRoot -Sha '' -Dirty $moduleDirty -Log '' -Details "Could not resolve the $module source commit."
            continue
        }
        $mergeOutput = @(& $git.Source -C $moduleRoot merge-tree --write-tree --name-only $baselineSha $moduleSha 2>&1 | ForEach-Object { "$($_)" })
        $mergeExitCode = [int]$LASTEXITCODE
        $mergeLines = @($mergeOutput | ForEach-Object { $_.TrimEnd() })
        $conflictFiles = [System.Collections.Generic.List[string]]::new()
        if ($mergeLines.Count -gt 0 -and $mergeLines[0] -match '^[0-9a-f]{40}$') {
            for ($i = 1; $i -lt $mergeLines.Count; $i++) {
                $candidate = $mergeLines[$i].Trim()
                if (-not $candidate) { break }
                $conflictFiles.Add($candidate)
            }
        }
        $mergeStatus = if ($mergeExitCode -eq 0) { 'PASS' } elseif ($conflictFiles.Count -gt 0) { 'FAIL' } else { 'BLOCKED' }
        $mergeDetails = if ($conflictFiles.Count -gt 0) {
            "baseline=$baselineSha; moduleHead=$moduleSha; conflicts=$($conflictFiles -join ',')"
        } elseif ($mergeExitCode -eq 0) {
            "baseline=$baselineSha; moduleHead=$moduleSha; conflicts=none"
        } else {
            "baseline=$baselineSha; moduleHead=$moduleSha; gitExitCode=$mergeExitCode; conflictListUnavailable"
        }
        Add-Result -Name "Git/merge-tree-$module" -Status $mergeStatus -Root $moduleRoot -Sha $moduleSha -Dirty $moduleDirty -Log '' -Details $mergeDetails
    }
}

# Read the latest GitHub PR and CI state for the baseline and every existing
# module branch. This is read-only and records a hosted PASS only when CI checks
# correspond to the exact local HEAD tested above.
$trackedWorktrees = [System.Collections.Generic.List[object]]::new()
$trackedWorktrees.Add([ordered]@{scope='BASELINE';root=$mainRoot})
$trackedWorktrees.Add([ordered]@{scope='M0';root=$coordinatorRoot})
foreach ($module in $modules) {
    $moduleRoot = if ($module -eq 'M9') { Join-Path $workspaceRoot 'integration/M9' } else { Join-Path $workspaceRoot "agents/$module" }
    $trackedWorktrees.Add([ordered]@{scope=$module;root=$moduleRoot})
}
$remotePrStatuses = [System.Collections.Generic.List[object]]::new()
$ghCommand = Get-Command gh.exe -ErrorAction SilentlyContinue
$ghExecutable = if ($ghCommand) { $ghCommand.Source } else { '' }
if (-not $ghExecutable) {
    $ghCandidate = Join-Path $env:ProgramFiles 'GitHub CLI/gh.exe'
    if (Test-Path -LiteralPath $ghCandidate -PathType Leaf) { $ghExecutable = $ghCandidate }
}

if (-not $ghExecutable) {
    Add-Result -Name 'GitHub/PR-CI-preflight' -Status 'BLOCKED' -Root $workspaceRoot -Sha '' -Dirty $false -Log '' -Details 'GitHub CLI is unavailable; hosted PR and CI state was not checked.'
}
else {
    try {
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $prListOutput = & $ghExecutable pr list --repo DorianChn/shanchuanzhi-agent-canary --state all --limit 100 --json number,title,headRefName,headRefOid,state,isDraft,updatedAt,url 2>&1 | Out-String
            $prListExitCode = [int]$LASTEXITCODE
        }
        finally { $ErrorActionPreference = $previousErrorActionPreference }
        if ($prListExitCode -ne 0) { throw 'GitHub PR listing failed.' }
        $parsedPrList = ConvertFrom-Json -InputObject $prListOutput
        $allPrs = if ($parsedPrList -is [System.Array]) { $parsedPrList } else { @($parsedPrList) }

        foreach ($entry in $trackedWorktrees) {
            $scope = $entry.scope
            $root = $entry.root
            $branch = (& $git.Source -C $root branch --show-current 2>$null | Out-String).Trim()
            $localSha = (& $git.Source -C $root rev-parse HEAD 2>$null | Out-String).Trim()
            $dirty = [bool]((& $git.Source -C $root status --porcelain=v1 --untracked-files=all 2>$null | Out-String).Trim())
            $branchPrs = @($allPrs | Where-Object { $_.headRefName -eq $branch } | Sort-Object updatedAt -Descending)
            $openPrs = @($branchPrs | Where-Object { $_.state -eq 'OPEN' })
            $exactHeadPrs = @($branchPrs | Where-Object { $_.headRefOid -eq $localSha })
            $exactOpenPrs = @($openPrs | Where-Object { $_.headRefOid -eq $localSha })
            $selectedPr = if ($exactOpenPrs.Count -gt 0) { $exactOpenPrs[0] }
                elseif ($openPrs.Count -gt 0) { $openPrs[0] }
                elseif ($exactHeadPrs.Count -gt 0) { $exactHeadPrs[0] }
                elseif ($branchPrs.Count -gt 0) { $branchPrs[0] }
                else { $null }
            if (-not $selectedPr) {
                Add-Result -Name "GitHub/$scope-PR-CI" -Status 'SKIPPED' -Root $root -Sha $localSha -Dirty $dirty -Log '' -Details "No GitHub PR was found for local branch $branch."
                continue
            }

            try {
                $previousErrorActionPreference = $ErrorActionPreference
                try {
                    $ErrorActionPreference = 'Continue'
                    $prViewOutput = & $ghExecutable pr view $selectedPr.number --repo DorianChn/shanchuanzhi-agent-canary --json number,title,headRefName,headRefOid,state,isDraft,mergeable,url 2>&1 | Out-String
                    $prViewExitCode = [int]$LASTEXITCODE
                    $checksOutput = & $ghExecutable pr checks $selectedPr.number --repo DorianChn/shanchuanzhi-agent-canary --json name,state,bucket,workflow 2>&1 | Out-String
                    $checksExitCode = [int]$LASTEXITCODE
                }
                finally { $ErrorActionPreference = $previousErrorActionPreference }
                if ($prViewExitCode -ne 0) { throw 'GitHub PR details could not be read.' }
                $remotePr = $prViewOutput | ConvertFrom-Json
                $checks = @()
                if ($checksExitCode -eq 0) {
                    $parsedChecks = ConvertFrom-Json -InputObject $checksOutput
                    $checks = if ($parsedChecks -is [System.Array]) { $parsedChecks } else { @($parsedChecks) }
                }
                elseif ($checksOutput -notmatch 'no checks reported') {
                    throw 'GitHub CI checks could not be read.'
                }

                $failedChecks = @($checks | Where-Object { $_.bucket -eq 'fail' -or $_.state -in @('FAILURE','ERROR','TIMED_OUT','CANCELLED','ACTION_REQUIRED') })
                $pendingChecks = @($checks | Where-Object { $_.bucket -eq 'pending' -or $_.state -in @('PENDING','QUEUED','IN_PROGRESS') })
                $knownChecks = @($checks | Where-Object { $_.bucket -in @('pass','skipping','fail','pending') })
                $unknownCheckCount = $checks.Count - $knownChecks.Count
                $headMatches = $localSha -and $remotePr.headRefOid -and ($localSha -eq $remotePr.headRefOid)
                $status = if ($remotePr.mergeable -eq 'CONFLICTING' -or $failedChecks.Count -gt 0) { 'FAIL' }
                    elseif (-not $headMatches) { 'BLOCKED' }
                    elseif ($dirty) { 'BLOCKED' }
                    elseif ($checks.Count -eq 0) { 'BLOCKED' }
                    elseif ($pendingChecks.Count -gt 0 -or $unknownCheckCount -gt 0) { 'BLOCKED' }
                    else { 'PASS' }
                $failedNames = ($failedChecks | ForEach-Object { $_.name }) -join ','
                $pendingNames = ($pendingChecks | ForEach-Object { $_.name }) -join ','
                $details = "branch=$branch; state=$($remotePr.state); draft=$($remotePr.isDraft); mergeable=$($remotePr.mergeable); localHead=$localSha; remoteHead=$($remotePr.headRefOid); checks=$($checks.Count); failed=$failedNames; pending=$pendingNames; unknown=$unknownCheckCount"
                Add-Result -Name "GitHub/$scope-PR-$($remotePr.number)-CI" -Status $status -Root $root -Sha $remotePr.headRefOid -Dirty $dirty -Log '' -Details $details
                Write-Host "$status GitHub $scope PR #$($remotePr.number) CI ($($checks.Count) checks)" -ForegroundColor $(if($status -eq 'PASS'){'Green'}elseif($status -eq 'FAIL'){'Red'}else{'Yellow'})
                $remotePrStatuses.Add([ordered]@{
                    scope=$scope; number=$remotePr.number; title=$remotePr.title; url=$remotePr.url
                    branch=$branch; state=$remotePr.state; isDraft=$remotePr.isDraft; mergeable=$remotePr.mergeable
                    localHead=$localSha; remoteHead=$remotePr.headRefOid; localDirty=$dirty; status=$status
                    checkCount=$checks.Count; failedChecks=@($failedNames -split ',' | Where-Object { $_ })
                    pendingChecks=@($pendingNames -split ',' | Where-Object { $_ }); unknownCheckCount=$unknownCheckCount
                    checks=@($checks | Select-Object name,state,bucket,workflow)
                })
            }
            catch {
                $errorSummary = ($_.Exception.Message -replace '\s+',' ').Trim()
                if ($errorSummary.Length -gt 180) { $errorSummary = $errorSummary.Substring(0,180) }
                $errorType = $_.Exception.GetType().Name
                Add-Result -Name "GitHub/$scope-PR-$($selectedPr.number)-CI" -Status 'BLOCKED' -Root $root -Sha $localSha -Dirty $dirty -Log '' -Details "Could not read exact-head PR metadata or CI check status ($errorType): $errorSummary"
            }
        }
    }
    catch {
        Add-Result -Name 'GitHub/PR-CI-preflight' -Status 'BLOCKED' -Root $workspaceRoot -Sha '' -Dirty $false -Log '' -Details 'Could not enumerate GitHub PRs; check CLI authentication, network, and repository access.'
    }
}

$env:CANARY_PYTHON = $previousCanaryPython
$env:AGENT_CANARY_HOME = $previousAgentCanaryHome

$failed = @($results | Where-Object { $_.status -in @('FAIL','BLOCKED') })
$result = [ordered]@{
    schema='agent-canary.ac3-all-one-click.v2'
    runId=$runId
    repository='DorianChn/shanchuanzhi-agent-canary'
    modules=@($modules)
    remotePullRequests=@($remotePrStatuses)
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
$lines.Add('This button checks the current local M1-M8 worktrees, M9 integration worktree, M9 source pins, committed M1-M8 merge-tree compatibility against the current feature baseline, M0 baseline, synthetic E4 tests, and read-only GitHub PR/CI state for the exact local branch heads. Merge-tree checks do not update branches or worktrees. Test processes receive isolated AGENT_CANARY_HOME directories inside this run report so synthetic token-store writes do not target the user profile. It does not execute a real model, install in a clean VM, or create independent acceptance evidence. Dirty worktrees are reported and left untouched.')
$lines.Add(''); $lines.Add('## Remaining acceptance gates'); $lines.Add('')
foreach ($gate in $result.remainingAcceptanceGates) { $lines.Add("- $gate") }
$lines -join [Environment]::NewLine | Set-Content -LiteralPath $mdPath -Encoding UTF8
Write-Host "`n=== ALL MODULES RESULT ===" -ForegroundColor Cyan
Write-Host "Automated checks: $($result.automatedChecks)"
Write-Host "Report: $mdPath"
if ($OpenReport) { try { Start-Process -FilePath $mdPath -ErrorAction Stop } catch { Write-Warning $_.Exception.Message } }
if ($failed.Count -gt 0) { exit 1 }
