@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Run-E4-OneClick.ps1" -OpenReport
exit /b %ERRORLEVEL%
