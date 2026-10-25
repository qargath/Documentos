@echo off
chcp 65001 >nul
setlocal EnableExtensions DisableDelayedExpansion

rem Crea y envia solo el tag vX.Y.Z. La Release la construye GitHub Actions.
rem El PAT se lee desde .env y no se imprime.

set "ENV_FILE=%~dp0.env"
call :load_env
set "ENV_LOAD_RESULT=%ERRORLEVEL%"

if not "%~1"=="" goto :askpass

if not "%ENV_LOAD_RESULT%"=="0" (
    set "FAIL_REASON=No existe el archivo .env junto a este script."
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

set "VERSION="
for /f "usebackq delims=" %%V in ("%~dp0VERSION") do (
    if not defined VERSION set "VERSION=%%V"
)
if not defined VERSION (
    set "FAIL_REASON=No se pudo leer VERSION."
    goto :fail
)

echo(%VERSION%| %SystemRoot%\System32\findstr.exe /R /X "[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul
if errorlevel 1 (
    set "FAIL_REASON=VERSION debe ser MAJOR.MINOR.PATCH, sin la letra v."
    goto :fail
)

for /f "tokens=1-3 delims=." %%A in ("%VERSION%") do (
    set "MAJOR=%%A"
    set "MINOR=%%B"
    set "PATCH=%%C"
)
if not "%MAJOR%"=="0" if "%MAJOR:~0,1%"=="0" goto :bad_version
if not "%MINOR%"=="0" if "%MINOR:~0,1%"=="0" goto :bad_version
if not "%PATCH%"=="0" if "%PATCH:~0,1%"=="0" goto :bad_version
goto :version_ok
:bad_version
set "FAIL_REASON=VERSION debe ser MAJOR.MINOR.PATCH, sin ceros a la izquierda."
goto :fail
:version_ok

set "BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if /I not "%BRANCH%"=="main" (
    set "FAIL_REASON=Hay que estar en la rama main."
    goto :fail
)

set "DIRTY="
for /f "delims=" %%S in ('git status --porcelain') do set "DIRTY=1"
if defined DIRTY (
    set "FAIL_REASON=Hay cambios sin publicar. Súbelos a main antes de crear la etiqueta."
    goto :fail
)

git diff --check
if errorlevel 1 (
    set "FAIL_REASON=git diff --check encontró problemas. No se creó la etiqueta."
    goto :fail
)

set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=never"
set "GIT_ASKPASS=%~f0"
set "SSH_ASKPASS=%~f0"

set "HEAD_SHA="
for /f %%H in ('git rev-parse HEAD') do set "HEAD_SHA=%%H"

set "REMOTE_LIST=%TEMP%\documentos-remote-%RANDOM%.txt"
git -c credential.helper= -c credential.username=x-access-token -c core.askPass="%~f0" ls-remote "%GITHUB_REPO%" refs/heads/main "refs/tags/v%VERSION%" > "%REMOTE_LIST%"
if errorlevel 1 (
    set "FAIL_REASON=No se pudo leer main ni las etiquetas del remoto."
    goto :fail
)

set "REMOTE_MAIN="
set "REMOTE_TAG="
for /f "usebackq tokens=1,2" %%A in ("%REMOTE_LIST%") do (
    if "%%B"=="refs/heads/main" set "REMOTE_MAIN=%%A"
    if "%%B"=="refs/tags/v%VERSION%" set "REMOTE_TAG=1"
)
del /q "%REMOTE_LIST%" >nul 2>&1

if not defined REMOTE_MAIN (
    set "FAIL_REASON=La rama main todavía no está en el remoto. Primero usa gitpush.bat."
    goto :fail
)

if /I not "%HEAD_SHA%"=="%REMOTE_MAIN%" (
    set "FAIL_REASON=El commit local no es el de main en el remoto. Sube o baja cambios antes de etiquetar."
    goto :fail
)

if defined REMOTE_TAG (
    set "FAIL_REASON=La etiqueta v%VERSION% ya existe en el remoto. No se reemplaza."
    goto :fail
)

git show-ref --verify --quiet "refs/tags/v%VERSION%"
if not errorlevel 1 (
    set "FAIL_REASON=La etiqueta v%VERSION% ya existe en este equipo."
    goto :fail
)

git tag -a "v%VERSION%" -m "Documentos %VERSION%"
if errorlevel 1 (
    set "FAIL_REASON=No se pudo crear la etiqueta local."
    goto :fail
)

echo.
echo Enviando solo la etiqueta v%VERSION%...
git -c credential.helper= -c credential.username=x-access-token -c core.askPass="%~f0" -c http.extraHeader= push "%GITHUB_REPO%" "refs/tags/v%VERSION%"
if errorlevel 1 (
    git tag -d "v%VERSION%" >nul 2>&1
    set "FAIL_REASON=La etiqueta no se pudo publicar. Se quitó la copia local. No se creó una Release."
    goto :fail
)

echo.
echo [ÉXITO] Quedó publicada la etiqueta v%VERSION%.
echo GitHub Actions valida, construye y publica la Release. Este script no reinicia ningún equipo.
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
if exist "%REMOTE_LIST%" del /q "%REMOTE_LIST%" >nul 2>&1
if defined DID_PUSHD popd
pause
exit /b 1
