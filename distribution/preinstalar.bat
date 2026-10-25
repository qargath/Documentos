@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0preinstalar.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] No se preparó la carpeta.
  pause
  exit /b 1
)
echo.
pause
exit /b 0
