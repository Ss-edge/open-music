@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0release\3.3.5\win-unpacked\Open Music.exe" (
  start "" "%~dp0release\3.3.5\win-unpacked\Open Music.exe"
  exit /b
)
if exist "%~dp0dist\main\index.js" (
  start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0dist\main\index.js"
  exit /b
)
call yarn dev
