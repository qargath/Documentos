@echo off
chcp 65001 >nul
setlocal EnableExtensions DisableDelayedExpansion

set "ENV_FILE=%~dp0.env"
call :load_env
set "ENV_LOAD_RESULT=%ERRORLEVEL%"

rem Git invoca este mismo archivo como GIT_ASKPASS y entrega el texto del prompt como argumento.
if not "%~1"=="" goto :askpass

if not "%ENV_LOAD_RESULT%"=="0" (
    set "FAIL_REASON=No existe el archivo .env junto a gitpull.bat."
    goto :fail
)

if not defined GITHUB_PAT (
    set "FAIL_REASON=GITHUB_PAT está vacío en .env. No se intentó conectar con GitHub."
    goto :fail
)

if not defined GITHUB_REPO (
    set "FAIL_REASON=GITHUB_REPO está vacío en .env. Agrega la URL HTTPS del repositorio."
    goto :fail
)

echo(%GITHUB_REPO%| %SystemRoot%\System32\findstr.exe /B /I /C:"https://github.com/" >nul
if errorlevel 1 (
    set "FAIL_REASON=GITHUB_REPO debe ser una URL HTTPS de github.com sin credenciales incrustadas."
    goto :fail
)

if not defined GITHUB_BRANCH set "GITHUB_BRANCH=main"

where git >nul 2>&1
if errorlevel 1 (
    set "FAIL_REASON=Git no está instalado o no está disponible en PATH."
    goto :fail
)

pushd "%~dp0"
if errorlevel 1 (
    set "FAIL_REASON=No fue posible acceder a la carpeta del proyecto."
    goto :fail
)
set "DID_PUSHD=1"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    set "FAIL_REASON=La carpeta del script no pertenece a un repositorio Git."
    goto :fail
)

set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=never"
set "GIT_ASKPASS=%~f0"
set "SSH_ASKPASS=%~f0"

echo.
echo Descargando %GITHUB_BRANCH% mediante el PAT de .env...
git -c credential.helper= -c credential.username=x-access-token -c core.askPass="%~f0" -c http.extraHeader= pull --ff-only "%GITHUB_REPO%" "%GITHUB_BRANCH%"
if errorlevel 1 (
    set "FAIL_REASON=El pull falló. Revisa el mensaje de Git mostrado arriba: el PAT puede ser inválido, no tener permisos, la URL puede ser incorrecta, pueden existir cambios incompatibles o el remoto puede no contener la rama."
    goto :fail
)

echo.
echo [ÉXITO] Pull completado desde %GITHUB_REPO% sobre la rama %GITHUB_BRANCH%.
if defined DID_PUSHD popd
pause
exit /b 0

:askpass
if not "%ENV_LOAD_RESULT%"=="0" exit /b 1
set "ASKPASS_PROMPT=%~1"
echo(%ASKPASS_PROMPT%| %SystemRoot%\System32\findstr.exe /I /C:"username" >nul
if errorlevel 1 goto :askpass_password
echo(x-access-token
exit /b 0

:askpass_password
if not defined GITHUB_PAT exit /b 1
echo(%GITHUB_PAT%
exit /b 0

:load_env
if not exist "%ENV_FILE%" exit /b 1
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if /I "%%A"=="GITHUB_PAT" set "GITHUB_PAT=%%B"
    if /I "%%A"=="GITHUB_REPO" set "GITHUB_REPO=%%B"
    if /I "%%A"=="GITHUB_BRANCH" set "GITHUB_BRANCH=%%B"
)
exit /b 0

:fail
echo.
echo [ERROR] %FAIL_REASON%
echo No se utilizó ningún método alternativo de autenticación.
echo.
if defined DID_PUSHD popd
pause
exit /b 1
