@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Run-AC3-All-OneClick.ps1" -OpenReport
exit /b %ERRORLEVEL%
