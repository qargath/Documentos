# Lista cerrada: debe coincidir con scripts/release_lib.py
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('install', 'update', 'restart')]
  [string]$Command
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { $PSNativeCommandUseErrorActionPreference = $false } catch { }

$script:Repo = 'qargath/Documentos'
$script:Allow = @(
  '.env.example',
  'VERSION',
  'compose.yaml',
  'install.bat',
  'Actualizar.bat',
  'restart.bat',
  'documentos-runtime.ps1'
)

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) { continue }
    $eq = $trimmed.IndexOf('=')
    if ($eq -lt 1) { continue }
    $key = $trimmed.Substring(0, $eq).Trim()
    $value = $trimmed.Substring($eq + 1).Trim()
    $map[$key] = $value
  }
  return $map
}

function Get-LocalEnv {
  return Read-DotEnv (Join-Path $PSScriptRoot '.env')
}

function ConvertTo-ReleaseVersion {
  param([string]$Text)
  if ($Text -notmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') {
    throw 'La versión no es MAJOR.MINOR.PATCH.'
  }
  return $Text
}

function Compare-ReleaseVersion {
  param([string]$Left, [string]$Right)
  return ([version]$Left).CompareTo([version]$Right)
}

function Get-StableRelease {
  param([string]$Token)
  $headers = @{
    'User-Agent' = 'Documentos'
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$script:Repo/releases/latest" -Headers $headers
  } catch {
    throw 'No se pudo consultar la versión estable. Si el repositorio es privado, completa GITHUB_TOKEN en .env.'
  }
  if ($release.draft -or $release.prerelease) { throw 'La respuesta no es una versión estable.' }
  $tag = [string]$release.tag_name
  if (-not $tag.StartsWith('v')) { throw 'La etiqueta de la versión no es válida.' }
  $version = ConvertTo-ReleaseVersion $tag.Substring(1)
  if ($tag -ne "v$version") { throw 'La etiqueta no coincide con la versión.' }
  return $release
}

function Save-ReleaseAsset {
  param($Asset, [string]$Destination, [string]$Token)
  $headers = @{ 'User-Agent' = 'Documentos'; Accept = 'application/octet-stream' }
  $url = [string]$Asset.browser_download_url
  if ($Token) {
    $headers.Authorization = "Bearer $Token"
    $url = [string]$Asset.url
  }
  Invoke-WebRequest -Uri $url -Headers $headers -OutFile $Destination | Out-Null
}

function Assert-Checksum {
  param([string]$ZipPath, [string]$ChecksumPath)
  $expected = ((Get-Content -Raw -LiteralPath $ChecksumPath).Trim() -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  if ($expected -ne $actual) { throw 'El checksum del paquete no coincide. No se cambió la instalación.' }
}

function Expand-RuntimeZip {
  param([string]$ZipPath, [string]$Destination)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($name in $names) {
      if ($name.EndsWith('/') -or $name.Contains('..') -or $name.Contains(':') -or $name.StartsWith('/')) {
        throw 'El paquete trae una ruta no permitida.'
      }
      if ($script:Allow -notcontains $name) { throw 'El paquete trae un archivo que no está permitido.' }
    }
    foreach ($required in $script:Allow) {
      if ($names -notcontains $required) { throw 'Al paquete le falta un archivo operativo.' }
    }
    if ($names.Count -ne $script:Allow.Count) { throw 'La lista de archivos del paquete no coincide.' }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    foreach ($entry in $archive.Entries) {
      $target = Join-Path $Destination ($entry.FullName.Replace('/', '\'))
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    }
  } finally {
    $archive.Dispose()
  }
}

function Install-RuntimeFiles {
  param([string]$SourceDir)
  $backup = Join-Path $PSScriptRoot '.actualizacion-respaldo'
  if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
  New-Item -ItemType Directory -Path $backup | Out-Null
  $copied = @()
  try {
    foreach ($name in $script:Allow) {
      $current = Join-Path $PSScriptRoot $name
      if (Test-Path -LiteralPath $current) {
        Copy-Item -LiteralPath $current -Destination (Join-Path $backup $name) -Force
        $copied += $name
      }
    }
    foreach ($name in $script:Allow) {
      Copy-Item -LiteralPath (Join-Path $SourceDir $name) -Destination (Join-Path $PSScriptRoot $name) -Force
    }
  } catch {
    foreach ($name in $copied) {
      Copy-Item -LiteralPath (Join-Path $backup $name) -Destination (Join-Path $PSScriptRoot $name) -Force
    }
    throw 'No se pudo reemplazar los archivos. Se restauró la copia anterior.'
  } finally {
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
  }
}

function Assert-DockerReady {
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker no está en marcha. Ábrelo y vuelve a intentarlo.' }
  & docker compose version *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose no está disponible.' }
}

function Invoke-RegistryLogin {
  $envMap = Get-LocalEnv
  $user = [string]$envMap['GHCR_USERNAME']
  $secret = [string]$envMap['GHCR_TOKEN']
  if (-not $user -or -not $secret) { return }
  $secret | & docker login ghcr.io --username $user --password-stdin
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo entrar al registro de imágenes.' }
}

function Update-App {
  $local = ConvertTo-ReleaseVersion ((Get-Content -Raw (Join-Path $PSScriptRoot 'VERSION')).Trim())
  $envMap = Get-LocalEnv
  $token = [string]$envMap['GITHUB_TOKEN']
  $release = Get-StableRelease $token
  $remote = $release.tag_name.Substring(1)
  $order = Compare-ReleaseVersion $local $remote
  if ($order -eq 0) { exit 10 }
  if ($order -gt 0) { throw 'Esta carpeta está en una versión posterior a la estable. No se hizo ningún cambio.' }
  $zipName = "documentos-runtime-$remote.zip"
  $shaName = "$zipName.sha256"
  $zipAsset = $release.assets | Where-Object { $_.name -eq $zipName } | Select-Object -First 1
  $shaAsset = $release.assets | Where-Object { $_.name -eq $shaName } | Select-Object -First 1
  if (-not $zipAsset -or -not $shaAsset) { throw 'La versión estable no incluye el paquete y su checksum.' }
  $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("documentos-" + [guid]::NewGuid().ToString('n'))
  New-Item -ItemType Directory -Path $temp | Out-Null
  try {
    $zipPath = Join-Path $temp $zipName
    $shaPath = Join-Path $temp $shaName
    Save-ReleaseAsset $zipAsset $zipPath $token
    Save-ReleaseAsset $shaAsset $shaPath $token
    Assert-Checksum $zipPath $shaPath
    $extract = Join-Path $temp 'paquete'
    Expand-RuntimeZip $zipPath $extract
    $inner = (Get-Content -Raw (Join-Path $extract 'VERSION')).Trim()
    if ($inner -ne $remote) { throw 'El VERSION del paquete no coincide con la Release.' }
    Install-RuntimeFiles $extract
  } finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
  }
  Write-Host "Quedó preparada la versión $remote. Lo que estaba en marcha sigue igual."
}

function Restart-App {
  Assert-DockerReady
  Push-Location $PSScriptRoot
  try {
    & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'compose.yaml no es válido.' }
    Invoke-RegistryLogin
    & docker compose pull
    if ($LASTEXITCODE -ne 0) {
      throw 'No se pudieron descargar las imágenes. Lo que ya estaba en marcha quedó igual.'
    }
    & docker compose up -d --wait --remove-orphans
    if ($LASTEXITCODE -ne 0) {
      & docker compose ps
      & docker compose logs --tail 80
      throw 'Las imágenes se descargaron, pero el arranque falló. No se intentó volver a una versión anterior.'
    }
  } finally {
    Pop-Location
  }
  Write-Host 'La aplicación está en http://localhost:4173'
}

function Install-App {
  $example = Join-Path $PSScriptRoot '.env.example'
  $envFile = Join-Path $PSScriptRoot '.env'
  if (-not (Test-Path -LiteralPath $envFile) -and (Test-Path -LiteralPath $example)) {
    Copy-Item -LiteralPath $example -Destination $envFile
    Write-Host 'Se creó .env a partir del ejemplo. Si la imagen es privada, completa el acceso al registro.'
  }
  Restart-App
}

switch ($Command) {
  'install' { Install-App }
  'update' { Update-App }
  'restart' { Restart-App }
}
