@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0documentos-runtime.ps1" install
if errorlevel 1 (
  echo.
  echo [ERROR] La instalación no quedó en marcha.
  pause
  exit /b 1
)
echo.
echo [ÉXITO] La aplicación está en http://localhost:4173
pause
exit /b 0
