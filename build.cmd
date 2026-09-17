@echo off
setlocal
cd /d "%~dp0"
if not exist out mkdir out
cl /nologo /W4 /O2 /std:c11 /utf-8 prototype\portal.c /Foout\portal.obj /Feout\SkyPortal-Probe.exe user32.lib shlwapi.lib advapi32.lib shell32.lib
exit /b %errorlevel%
