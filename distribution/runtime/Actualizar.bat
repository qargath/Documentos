@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0documentos-runtime.ps1" update
set "CODE=%ERRORLEVEL%"
if "%CODE%"=="10" (
  echo.
  echo [ÉXITO] Ya está la versión estable más reciente.
  pause
  exit /b 0
)
if not "%CODE%"=="0" (
  echo.
  echo [ERROR] La actualización no se aplicó. La aplicación sigue como estaba.
  pause
  exit /b %CODE%
)
echo.
echo [ÉXITO] Los archivos quedaron preparados. La aplicación sigue en marcha.
echo Para usar la versión nueva, ejecuta restart.bat.
pause
exit /b 0
