@echo off
setlocal
rem Resolve already-installed local runtimes for desktop launches whose PATH
rem does not include Node/npm or the GitHub Desktop Git distribution.
if exist "%LOCALAPPDATA%\hermes\node\node.exe" (
  where node.exe >nul 2>&1
  if errorlevel 1 set "PATH=%LOCALAPPDATA%\hermes\node;%PATH%"
  where npm.cmd >nul 2>&1
  if errorlevel 1 set "PATH=%LOCALAPPDATA%\hermes\node;%PATH%"
)
where git.exe >nul 2>&1
if errorlevel 1 for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do if exist "%%~D\resources\app\git\cmd\git.exe" set "PATH=%%~D\resources\app\git\cmd;%PATH%"
if exist "%~dp0..\..\main\package.json" if exist "%~dp0..\..\agents\M1\package.json" (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Run-AC3-All-OneClick.ps1" -OpenReport
) else (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Run-E4-OneClick.ps1" -OpenReport
)
set "TEST_EXIT=%ERRORLEVEL%"
if not "%TEST_EXIT%"=="0" echo Automated checks finished with failures; see the report opened by the test runner.
exit /b %TEST_EXIT%
