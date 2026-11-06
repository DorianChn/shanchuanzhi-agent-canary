[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [string]$WorkspaceRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath $WorkspaceRoot).Path
$pluginsRootInput = Join-Path $workspace '.cline\plugins'
if (-not (Test-Path -LiteralPath $pluginsRootInput)) {
    Write-Output 'No project-scoped Agent Canary Cline integration is installed.'
    return
}
$pluginsRoot = (Resolve-Path -LiteralPath $pluginsRootInput).Path
$targets = @(
    @{ Path = Join-Path $pluginsRoot 'agent-canary'; Name = '@dorianchn/agent-canary-cline' },
    @{ Path = Join-Path $pluginsRoot 'filesystem-mcp'; Name = '@dorianchn/agent-canary-filesystem-mcp' }
)
foreach ($target in $targets) {
    if (-not (Test-Path -LiteralPath $target.Path)) { continue }
    $resolved = (Resolve-Path -LiteralPath $target.Path).Path
    $prefix = $pluginsRoot.TrimEnd('\') + '\'
    if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Refusing path outside .cline/plugins: $resolved" }
    $manifestPath = Join-Path $resolved 'package.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Refusing to remove a directory without a package manifest: $resolved" }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.name -ne $target.Name) { throw "Refusing to remove a package with unexpected name at $resolved" }
    if ($PSCmdlet.ShouldProcess($resolved, 'Remove the Agent Canary Cline integration copy')) {
        Remove-Item -LiteralPath $resolved -Recurse
    }
}
