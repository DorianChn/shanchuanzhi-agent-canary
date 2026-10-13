[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$NodeExecutable,
    [Parameter(Mandatory = $true)][string]$EvidencePath
)
$ErrorActionPreference = 'Stop'
$scriptDir = [System.IO.Path]::GetFullPath($PSScriptRoot)
$nodeFull = [System.IO.Path]::GetFullPath($NodeExecutable)
$evidenceFull = [System.IO.Path]::GetFullPath($EvidencePath)
if ([System.IO.Path]::GetDirectoryName($evidenceFull) -ne $scriptDir) { throw 'EvidencePath must be directly inside the script directory.' }
if (-not (Test-Path -LiteralPath $nodeFull -PathType Leaf)) { throw 'NodeExecutable does not exist.' }
Add-Type -Path (Join-Path $scriptDir 'AppContainerLauncher.cs')

$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempRoot = Join-Path $tempBase ('AgentCanary-M2-' + [guid]::NewGuid().ToString('N'))
$workspace = Join-Path $tempRoot 'workspace'
$protectedFile = Join-Path $tempRoot 'protected.txt'
$profileName = 'AgentCanary-M2-' + [guid]::NewGuid().ToString('N')
$sid = [IntPtr]::Zero
$listener = $null
$evidence = [ordered]@{
    schema = 'agent-canary.m2.windows-isolation.v2'
    host = [ordered]@{ osVersion = [Environment]::OSVersion.Version.ToString(); powershellVersion = $PSVersionTable.PSVersion.ToString(); architecture = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() }
    profileCreated = $false
    appContainerSid = $null
    workspaceAclVerified = $false
    appContainerTokenConfirmed = $false
    integrityLevelSid = $null
    integrityLevelRid = $null
    lowIntegrityConfirmed = $false
    protectedFileHashBefore = $null
    protectedFileHashAfter = $null
    protectedWriteStatus = 'NOT_TESTED'
    protectedRelativeWriteStatus = 'NOT_TESTED'
    protectedRelativePath = '..\protected.txt'
    protectedWriteBlocked = $false
    timeoutResult = 'NOT_TESTED'
    timeoutParentPid = $null
    timeoutChildPid = $null
    timeoutParentStopped = $false
    timeoutChildStopped = $false
    launchFailureHandled = $false
    launchFailureType = $null
    launchFailureNativeErrorCode = $null
    launchFailureProcessId = $null
    normalProgrammingTask = 'NOT_TESTED'
    nodeScriptFileEntryPoint = 'NOT_TESTED'
    networkBaseline = 'NOT_TESTED'
    networkResult = 'NOT_TESTED'
    networkBlocked = $false
    networkListenerPendingAfterTest = $null
    jobObjectChildResult = 'NOT_TESTED'
    nodeVersion = $null
    setupMilliseconds = $null
    nodeCopyMilliseconds = $null
    timingSamples = 0
    directLaunchAverageMilliseconds = $null
    directLaunchMedianMilliseconds = $null
    appContainerLaunchAverageMilliseconds = $null
    appContainerLaunchMedianMilliseconds = $null
    launchOverheadAverageMilliseconds = $null
    launchOverheadMedianMilliseconds = $null
    failure = $null
    cleanupErrors = @()
}

try {
    New-Item -ItemType Directory -Path $workspace -Force | Out-Null
    [System.IO.File]::WriteAllText($protectedFile, 'PROTECTED_SENTINEL')
    $setupTimer = [System.Diagnostics.Stopwatch]::StartNew()
    $sid = [AppContainerLauncher]::CreateProfile($profileName)
    $evidence.profileCreated = $true
    $sidString = [AppContainerLauncher]::SidToString($sid)
    $evidence.appContainerSid = $sidString
    $sidObject = [System.Security.Principal.SecurityIdentifier]::new($sidString)
    $rootAcl = Get-Acl -LiteralPath $tempRoot
    [void]$rootAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(
        $sidObject,
        [System.Security.AccessControl.FileSystemRights]::Traverse,
        [System.Security.AccessControl.AccessControlType]::Allow
    ))
    Set-Acl -LiteralPath $tempRoot -AclObject $rootAcl
    $workspaceAcl = Get-Acl -LiteralPath $workspace
    $inherit = [System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit
    [void]$workspaceAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(
        $sidObject,
        [System.Security.AccessControl.FileSystemRights]::Modify,
        $inherit,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    ))
    Set-Acl -LiteralPath $workspace -AclObject $workspaceAcl
    $verified = Get-Acl -LiteralPath $workspace
    $evidence.workspaceAclVerified = @($verified.Access | Where-Object {
        $_.IdentityReference.Value -eq $sidString -and $_.FileSystemRights.ToString().Contains('Modify')
    }).Count -gt 0
    if (-not $evidence.workspaceAclVerified) { throw 'AppContainer workspace Modify ACL was not present.' }
    $setupTimer.Stop()
    $evidence.setupMilliseconds = [math]::Round($setupTimer.Elapsed.TotalMilliseconds, 2)

    $sandboxNode = Join-Path $workspace 'node.exe'
    $copyTimer = [System.Diagnostics.Stopwatch]::StartNew()
    Copy-Item -LiteralPath $nodeFull -Destination $sandboxNode
    $copyTimer.Stop()
    $evidence.nodeCopyMilliseconds = [math]::Round($copyTimer.Elapsed.TotalMilliseconds, 2)

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    $baselineClient = [System.Net.Sockets.TcpClient]::new()
    $baselineClient.Connect([System.Net.IPAddress]::Loopback, $port)
    $baselineAccepted = $listener.AcceptTcpClient()
    $baselineAccepted.Close()
    $baselineClient.Close()
    $evidence.networkBaseline = 'HOST_LOOPBACK_CONNECT_OK'

    $programCode = @'
const fs=require('fs'),net=require('net'),childProcess=require('child_process'),path=require('path');fs.writeFileSync('program-output.txt',[1,2,3].map(n=>n*n).join(','));fs.writeFileSync('node-version.txt',process.version);try{fs.writeFileSync(process.argv[1],'MUTATED_BY_APPCONTAINER');fs.writeFileSync('protected-write-status.txt','WRITABLE')}catch(e){fs.writeFileSync('protected-write-status.txt','DENIED:'+(e.code||e.name))}try{fs.writeFileSync(path.resolve('..','protected.txt'),'MUTATED_BY_RELATIVE_PATH');fs.writeFileSync('protected-relative-write-status.txt','WRITABLE')}catch(e){fs.writeFileSync('protected-relative-write-status.txt','DENIED:'+(e.code||e.name))}let s=net.createConnection({host:'127.0.0.1',port:Number(process.argv[2])});let t=setTimeout(()=>{s.destroy();fs.writeFileSync('network-status.txt','TIMEOUT')},2000);s.once('connect',()=>{clearTimeout(t);s.destroy();fs.writeFileSync('network-status.txt','CONNECTED')});s.once('error',e=>{clearTimeout(t);fs.writeFileSync('network-status.txt','ERROR:'+(e.code||e.name))});try{let c=childProcess.spawn(path.win32.join(process.env.SystemRoot,'System32','timeout.exe'),['/t','30','/nobreak'],{stdio:'ignore',windowsHide:true});if(c.pid)fs.writeFileSync('child-pid.txt',String(c.pid));c.once('error',e=>fs.writeFileSync('child-error.txt',e.code||e.name));c.unref()}catch(e){fs.writeFileSync('child-error.txt',e.code||e.name)}
'@
    $windowsRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::Windows)
    $appContainerData = [AppContainerLauncher]::GetDataPath($sid)
    $appContainerTemp = Join-Path $appContainerData 'Temp'
    New-Item -ItemType Directory -Path $appContainerTemp -Force | Out-Null
    $environment = @(
        ('LOCALAPPDATA=' + $appContainerData),
        ('PATH=' + $workspace + ';' + (Join-Path $windowsRoot 'System32')),
        ('SystemRoot=' + $windowsRoot),
        ('TEMP=' + $appContainerTemp),
        ('TMP=' + $appContainerTemp),
        ('WINDIR=' + $windowsRoot)
    ) | Sort-Object { $_.Split('=', 2)[0] }
    $evidence.protectedFileHashBefore = (Get-FileHash -LiteralPath $protectedFile -Algorithm SHA256).Hash
    $run = [AppContainerLauncher]::Run($sid, $sandboxNode, @('-e', $programCode, $protectedFile, [string]$port), $workspace, $environment, 15000)
    $evidence.appContainerTokenConfirmed = $run.IsAppContainer
    $evidence.integrityLevelSid = $run.IntegrityLevelSid
    $evidence.integrityLevelRid = $run.IntegrityLevelRid
    $evidence.lowIntegrityConfirmed = $run.IsLowIntegrity
    if ($run.TimedOut) { throw 'AppContainer Node task timed out.' }
    if ($run.ExitCode -ne 0) { throw ('AppContainer Node task exited with code ' + $run.ExitCode) }
    if (-not $run.IsAppContainer) { throw 'TokenIsAppContainer was not confirmed.' }
    if (-not $run.IsLowIntegrity) { throw 'The process did not have a low integrity token.' }

    $evidence.normalProgrammingTask = if ([System.IO.File]::ReadAllText((Join-Path $workspace 'program-output.txt')) -eq '1,4,9') { 'PASS' } else { 'FAIL' }
    $evidence.nodeVersion = [System.IO.File]::ReadAllText((Join-Path $workspace 'node-version.txt')).Trim()
    $entryScript = Join-Path $workspace 'entrypoint-test.js'
    [System.IO.File]::WriteAllText($entryScript, 'process.exit(0);', [System.Text.UTF8Encoding]::new())
    $entryRun = [AppContainerLauncher]::Run($sid, $sandboxNode, @('entrypoint-test.js'), $workspace, $environment, 10000)
    $evidence.nodeScriptFileEntryPoint = if ($entryRun.TimedOut) { 'TIMEOUT' } elseif ($entryRun.ExitCode -eq 0) { 'PASS' } else { 'FAIL_EXIT_CODE_' + $entryRun.ExitCode }
    $evidence.protectedWriteStatus = [System.IO.File]::ReadAllText((Join-Path $workspace 'protected-write-status.txt')).Trim()
    $evidence.protectedRelativeWriteStatus = [System.IO.File]::ReadAllText((Join-Path $workspace 'protected-relative-write-status.txt')).Trim()
    $evidence.protectedFileHashAfter = (Get-FileHash -LiteralPath $protectedFile -Algorithm SHA256).Hash
    $absoluteWriteBlocked = $evidence.protectedWriteStatus.StartsWith('DENIED:')
    $relativeWriteBlocked = $evidence.protectedRelativeWriteStatus.StartsWith('DENIED:')
    $evidence.protectedWriteBlocked = $absoluteWriteBlocked -and $relativeWriteBlocked -and ($evidence.protectedFileHashBefore -eq $evidence.protectedFileHashAfter)
    $evidence.networkResult = [System.IO.File]::ReadAllText((Join-Path $workspace 'network-status.txt')).Trim()
    $evidence.networkListenerPendingAfterTest = $listener.Pending()
    $evidence.networkBlocked = -not $evidence.networkListenerPendingAfterTest

    $pidFile = Join-Path $workspace 'child-pid.txt'
    if (Test-Path -LiteralPath $pidFile) {
        $childPid = [int][System.IO.File]::ReadAllText($pidFile).Trim()
        $childRunning = $false
        for ($i = 0; $i -lt 20; $i++) {
            try { Get-Process -Id $childPid -ErrorAction Stop | Out-Null; $childRunning = $true }
            catch { $childRunning = $false }
            if (-not $childRunning) { break }
            Start-Sleep -Milliseconds 50
        }
        $evidence.jobObjectChildResult = if ($childRunning) { 'CHILD_STILL_RUNNING' } else { 'CHILD_TERMINATED_ON_JOB_CLOSE' }
    } elseif (Test-Path -LiteralPath (Join-Path $workspace 'child-error.txt')) {
        $evidence.jobObjectChildResult = 'CHILD_SPAWN_DENIED'
    } else { $evidence.jobObjectChildResult = 'CHILD_NOT_STARTED' }

    $timeoutCode = @'
const fs=require('fs'),childProcess=require('child_process'),path=require('path');const child=childProcess.spawn(path.win32.join(process.env.SystemRoot,'System32','timeout.exe'),['/t','30','/nobreak'],{stdio:'ignore',windowsHide:true});if(child.pid)fs.writeFileSync('timeout-child-pid.txt',String(child.pid));child.once('error',e=>fs.writeFileSync('timeout-child-error.txt',e.code||e.name));setInterval(()=>{},1000);
'@
    $timeoutRun = [AppContainerLauncher]::Run($sid, $sandboxNode, @('-e', $timeoutCode), $workspace, $environment, 1500)
    $evidence.timeoutParentPid = $timeoutRun.ProcessId
    if ($timeoutRun.TimedOut -and $timeoutRun.ExitCode -eq 124) {
        for ($i = 0; $i -lt 80; $i++) {
            try { Get-Process -Id $timeoutRun.ProcessId -ErrorAction Stop | Out-Null; $evidence.timeoutParentStopped = $false }
            catch { $evidence.timeoutParentStopped = $true }
            $timeoutChildPidFile = Join-Path $workspace 'timeout-child-pid.txt'
            if (Test-Path -LiteralPath $timeoutChildPidFile) {
                $evidence.timeoutChildPid = [int][System.IO.File]::ReadAllText($timeoutChildPidFile).Trim()
                try { Get-Process -Id $evidence.timeoutChildPid -ErrorAction Stop | Out-Null; $evidence.timeoutChildStopped = $false }
                catch { $evidence.timeoutChildStopped = $true }
            }
            if ($evidence.timeoutParentStopped -and $evidence.timeoutChildStopped) { break }
            Start-Sleep -Milliseconds 50
        }
        $evidence.timeoutResult = if ($evidence.timeoutParentStopped -and $evidence.timeoutChildStopped -and $evidence.timeoutChildPid) { 'PASS_PARENT_AND_JOB_CHILD_TERMINATED' } else { 'FAIL_PROCESS_TREE_REMAINS' }
    } else {
        $evidence.timeoutResult = if (Test-Path -LiteralPath (Join-Path $workspace 'timeout-child-error.txt')) { 'FAIL_CHILD_SPAWN_DENIED' } else { 'FAIL_TIMEOUT_NOT_REPORTED' }
    }

    $missingExecutable = Join-Path $tempRoot ('missing-' + [guid]::NewGuid().ToString('N') + '.exe')
    try {
        $unexpectedRun = [AppContainerLauncher]::Run($sid, $missingExecutable, @(), $workspace, $environment, 2000)
        $evidence.launchFailureProcessId = $unexpectedRun.ProcessId
        $evidence.launchFailureType = 'UNEXPECTED_PROCESS_CREATED'
    } catch [System.ComponentModel.Win32Exception] {
        $evidence.launchFailureHandled = $true
        $evidence.launchFailureType = $_.Exception.GetType().FullName
        $evidence.launchFailureNativeErrorCode = $_.Exception.NativeErrorCode
        $evidence.launchFailureProcessId = 0
    }

    function Measure-DirectNode([string]$Executable, [string]$WorkingDirectory, [string[]]$EnvironmentLines) {
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        $timedRun = [AppContainerLauncher]::RunJobBaseline($Executable, @('--version'), $WorkingDirectory, $EnvironmentLines, 10000)
        $timer.Stop()
        if ($timedRun.TimedOut -or $timedRun.ExitCode -ne 0 -or $timedRun.IsAppContainer) {
            throw 'Direct Job Object baseline launch failed.'
        }
        return $timer.Elapsed.TotalMilliseconds
    }
    function Measure-AppContainerNode([IntPtr]$ContainerSid, [string]$Executable, [string]$WorkingDirectory, [string[]]$EnvironmentLines) {
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        $timedRun = [AppContainerLauncher]::Run($ContainerSid, $Executable, @('--version'), $WorkingDirectory, $EnvironmentLines, 10000)
        $timer.Stop()
        if ($timedRun.TimedOut -or $timedRun.ExitCode -ne 0 -or -not $timedRun.IsAppContainer) {
            throw 'AppContainer Node timing launch failed.'
        }
        return $timer.Elapsed.TotalMilliseconds
    }

    [void](Measure-DirectNode $sandboxNode $workspace $environment)
    [void](Measure-AppContainerNode $sid $sandboxNode $workspace $environment)
    $directTimes = [System.Collections.Generic.List[double]]::new()
    $sandboxTimes = [System.Collections.Generic.List[double]]::new()
    for ($i = 0; $i -lt 30; $i++) {
        if (($i % 2) -eq 0) {
            $directTimes.Add((Measure-DirectNode $sandboxNode $workspace $environment))
            $sandboxTimes.Add((Measure-AppContainerNode $sid $sandboxNode $workspace $environment))
        } else {
            $sandboxTimes.Add((Measure-AppContainerNode $sid $sandboxNode $workspace $environment))
            $directTimes.Add((Measure-DirectNode $sandboxNode $workspace $environment))
        }
    }
    $directSorted = @($directTimes | Sort-Object)
    $sandboxSorted = @($sandboxTimes | Sort-Object)
    $evidence.timingSamples = 30
    $evidence.directLaunchAverageMilliseconds = [math]::Round((($directTimes | Measure-Object -Average).Average), 2)
    $evidence.appContainerLaunchAverageMilliseconds = [math]::Round((($sandboxTimes | Measure-Object -Average).Average), 2)
    $evidence.directLaunchMedianMilliseconds = [math]::Round((($directSorted[14] + $directSorted[15]) / 2), 2)
    $evidence.appContainerLaunchMedianMilliseconds = [math]::Round((($sandboxSorted[14] + $sandboxSorted[15]) / 2), 2)
    $evidence.launchOverheadAverageMilliseconds = [math]::Round(($evidence.appContainerLaunchAverageMilliseconds - $evidence.directLaunchAverageMilliseconds), 2)
    $evidence.launchOverheadMedianMilliseconds = [math]::Round(($evidence.appContainerLaunchMedianMilliseconds - $evidence.directLaunchMedianMilliseconds), 2)
    if ($evidence.normalProgrammingTask -ne 'PASS') { throw 'Normal programming task output mismatch.' }
} catch {
    $evidence.failure = $_.Exception.Message
} finally {
    if ($listener) { try { $listener.Stop() } catch { $evidence.cleanupErrors += ('listener: ' + $_.Exception.Message) } }
    if ($sid -ne [IntPtr]::Zero) {
        try {
            [AppContainerLauncher]::ReleaseSid($sid)
            $sid = [IntPtr]::Zero
            $hr = [AppContainerLauncher]::DeleteProfile($profileName)
            $evidence.profileDeleted = $hr -ge 0
            if ($hr -lt 0) { $evidence.cleanupErrors += ('DeleteAppContainerProfile HRESULT 0x{0:X8}' -f ([uint32]$hr)) }
        } catch { $evidence.cleanupErrors += ('profile: ' + $_.Exception.Message) }
    }
    $tempCanonical = [System.IO.Path]::GetFullPath($tempRoot)
    $allowedPrefix = Join-Path $tempBase 'AgentCanary-M2-'
    $item = Get-Item -LiteralPath $tempCanonical -ErrorAction SilentlyContinue
    if ($item -and $tempCanonical.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase) -and
        $item.Name -match '^AgentCanary-M2-[0-9a-f]{32}$' -and
        -not ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        try { Remove-Item -LiteralPath $tempCanonical -Recurse -Force; $evidence.tempRootRemoved = -not (Test-Path -LiteralPath $tempCanonical) }
        catch { $evidence.cleanupErrors += ('temp cleanup: ' + $_.Exception.Message) }
    }
    $evidenceJson = ($evidence | ConvertTo-Json -Depth 8).Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($evidenceFull, $evidenceJson, [System.Text.UTF8Encoding]::new())
}
if ($evidence.failure -or -not $evidence.protectedWriteBlocked -or -not $evidence.workspaceAclVerified -or
    -not $evidence.normalProgrammingTask.Equals('PASS') -or -not $evidence.appContainerTokenConfirmed -or -not $evidence.lowIntegrityConfirmed -or
    -not $evidence.timeoutResult.Equals('PASS_PARENT_AND_JOB_CHILD_TERMINATED') -or -not $evidence.launchFailureHandled -or
    -not $evidence.profileDeleted -or -not $evidence.tempRootRemoved -or $evidence.cleanupErrors.Count -gt 0) {
    throw ('Isolation prototype test failed; inspect evidence: ' + $evidenceFull)
}
Write-Output ($evidence | ConvertTo-Json -Depth 8)
