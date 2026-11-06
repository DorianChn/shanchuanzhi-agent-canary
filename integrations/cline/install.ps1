param(
    [string]$WorkspaceRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath $WorkspaceRoot).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$product = Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json
if ($product.name -ne '@dorianchn/agent-canary') {
    throw 'Run this installer with the Agent Canary repository as WorkspaceRoot; the local package dependency is intentionally not guessed.'
}

$pluginsRoot = Join-Path $workspace '.cline\plugins'
$clineTarget = Join-Path $pluginsRoot 'agent-canary'
$filesystemTarget = Join-Path $pluginsRoot 'filesystem-mcp'
if (Test-Path -LiteralPath $clineTarget) { throw "Refusing to overwrite existing plugin path: $clineTarget" }
if (Test-Path -LiteralPath $filesystemTarget) { throw "Refusing to overwrite existing adapter path: $filesystemTarget" }

New-Item -ItemType Directory -Path $pluginsRoot -Force | Out-Null
foreach ($package in @(
    @{ Source = (Join-Path $repoRoot 'integrations\cline'); Destination = $clineTarget },
    @{ Source = (Join-Path $repoRoot 'integrations\filesystem-mcp'); Destination = $filesystemTarget }
)) {
    New-Item -ItemType Directory -Path $package.Destination | Out-Null
    Get-ChildItem -LiteralPath $package.Source -Force |
        Where-Object { $_.Name -ne 'node_modules' } |
        Copy-Item -Destination $package.Destination -Recurse
}

# The source checkout resolves the local Agent Canary dependency two levels up.
# Inside a project's .cline/plugins tree the product root is three levels up.
npm pkg set 'dependencies.@dorianchn/agent-canary=file:../../..' --prefix $filesystemTarget
if ($LASTEXITCODE -ne 0) { throw 'Could not bind the adapter to the local Agent Canary checkout.' }

npm install --prefix $filesystemTarget --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Filesystem MCP dependency installation failed.' }
npm install --prefix $clineTarget --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Cline plugin dependency installation failed.' }

Write-Output "Installed the project-scoped Cline plugin at $clineTarget"
Write-Output "Installed the protected MCP adapter at $filesystemTarget"
Write-Output "Cline Core SDK plugin entry: $(Join-Path $clineTarget 'src\plugin.js')"
Write-Output 'Add the absolute entry path above to AgentConfig.pluginPaths in the Cline Core host configuration.'
Write-Output 'The plugin starts its own read-only upstream Filesystem MCP process. Remove any direct unprotected filesystem MCP entry from Cline settings before use.'
Write-Output 'Set AGENT_CANARY_ALLOWED_FILES and AGENT_CANARY_ALLOWED_DIRECTORIES in the Cline launch environment before starting a session.'
