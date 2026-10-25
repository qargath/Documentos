@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Reconstruyendo la aplicación local. Esto no descarga una versión publicada.
docker compose up --build -d --wait
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo reconstruir el Compose local.
  pause
  exit /b 1
)
echo.
echo [ÉXITO] La aplicación local está en http://localhost:4173
pause
exit /b 0
