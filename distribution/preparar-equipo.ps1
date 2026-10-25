$ErrorActionPreference = 'Stop'
try { $PSNativeCommandUseErrorActionPreference = $false } catch { }

function Test-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  & docker info *> $null
  return $LASTEXITCODE -eq 0
}

if (Test-DockerReady) {
  Write-Host 'Docker ya está listo.'
  exit 0
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host 'Docker está instalado, pero no responde. Abre Docker Desktop y espera a que quede en marcha.'
  exit 1
}

Write-Host 'Este equipo todavía no tiene Docker Desktop.'
Write-Host 'El instalador también puede pedir el componente de Windows que Docker usa para los contenedores. Si lo pide, acéptalo y reinicia.'
$answer = Read-Host 'Instalar Docker Desktop ahora? Escribe s para continuar'
if ($answer -notin @('s', 'S', 'si', 'Si')) {
  Write-Host 'No se instaló nada.'
  exit 1
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'winget no está disponible. Instala Docker Desktop y vuelve a ejecutar este preparador.'
}

& winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop no se pudo instalar.' }
Write-Host 'Docker Desktop quedó instalado. Ábrelo, espera a que arranque y después ejecuta el preinstalador.'
