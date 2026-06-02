@echo off
setlocal

set "APP_DIR=%~dp0"
set "PORT=4173"
set "URL=http://127.0.0.1:%PORT%"

cd /d "%APP_DIR%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non e stato trovato.
  echo Installa Node.js oppure aggiungilo al PATH di Windows.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=%PORT%; $isOpen=Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet; if (-not $isOpen) { Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory '%APP_DIR%' -WindowStyle Hidden; Start-Sleep -Milliseconds 900 }"

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if exist "%EDGE%" (
  start "LATCO" "%EDGE%" --app="%URL%"
  exit /b 0
)

if exist "%CHROME%" (
  start "LATCO" "%CHROME%" --app="%URL%"
  exit /b 0
)

start "LATCO" "%URL%"
