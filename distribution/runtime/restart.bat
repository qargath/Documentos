@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0documentos-runtime.ps1" restart
if errorlevel 1 (
  echo.
  echo [ERROR] No se aplicaron las imágenes.
  pause
  exit /b 1
)
echo.
echo [ÉXITO] La aplicación está en http://localhost:4173
pause
exit /b 0
