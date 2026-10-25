@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0preparar-equipo.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Este equipo todavía no puede ejecutar la aplicación.
  pause
  exit /b 1
)
echo.
pause
exit /b 0
