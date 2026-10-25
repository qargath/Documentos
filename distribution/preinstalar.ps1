param(
  [string]$Destino,
  [string]$Token
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Repo = 'qargath/Documentos'
$Allow = @(
  '.env.example',
  'VERSION',
  'compose.yaml',
  'install.bat',
  'Actualizar.bat',
  'restart.bat',
  'documentos-runtime.ps1'
)

if (-not $Destino) {
  $sugerido = Join-Path $env:LOCALAPPDATA 'Documentos'
  $escrito = Read-Host "Carpeta de instalación [$sugerido]"
  if ($escrito) { $Destino = $escrito } else { $Destino = $sugerido }
}

if (Test-Path -LiteralPath (Join-Path $Destino 'VERSION')) {
  throw 'Esa carpeta ya tiene una instalación. Ábrela y ejecuta Actualizar.bat.'
}

function ConvertTo-ReleaseVersion {
  param([string]$Text)
  if ($Text -notmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') {
    throw 'La versión no es MAJOR.MINOR.PATCH.'
  }
  return $Text
}

function Read-Secret {
  $secure = Read-Host 'Token de lectura de GitHub' -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-StableRelease {
  param([string]$Auth)
  $headers = @{
    'User-Agent' = 'Documentos'
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  if ($Auth) { $headers.Authorization = "Bearer $Auth" }
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers
  if ($release.draft -or $release.prerelease) { throw 'La respuesta no es una versión estable.' }
  $tag = [string]$release.tag_name
  $version = ConvertTo-ReleaseVersion $tag.Substring(1)
  if ($tag -ne "v$version") { throw 'La etiqueta no coincide con la versión.' }
  return $release
}

if (-not $Token) {
  try {
    $release = Get-StableRelease ''
  } catch {
    Write-Host 'No se pudo leer la versión pública. Si el repositorio es privado, hace falta un token de lectura.'
    $Token = Read-Secret
    $release = Get-StableRelease $Token
  }
} else {
  $release = Get-StableRelease $Token
}

$remote = $release.tag_name.Substring(1)
$zipName = "documentos-runtime-$remote.zip"
$shaName = "$zipName.sha256"
$zipAsset = $release.assets | Where-Object { $_.name -eq $zipName } | Select-Object -First 1
$shaAsset = $release.assets | Where-Object { $_.name -eq $shaName } | Select-Object -First 1
if (-not $zipAsset -or -not $shaAsset) { throw 'La versión estable no incluye el paquete y su checksum.' }

$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("documentos-" + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $temp | Out-Null
try {
  $headers = @{ 'User-Agent' = 'Documentos'; Accept = 'application/octet-stream' }
  $zipUrl = [string]$zipAsset.browser_download_url
  $shaUrl = [string]$shaAsset.browser_download_url
  if ($Token) {
    $headers.Authorization = "Bearer $Token"
    $zipUrl = [string]$zipAsset.url
    $shaUrl = [string]$shaAsset.url
  }
  $zipPath = Join-Path $temp $zipName
  $shaPath = Join-Path $temp $shaName
  Invoke-WebRequest -Uri $zipUrl -Headers $headers -OutFile $zipPath | Out-Null
  Invoke-WebRequest -Uri $shaUrl -Headers $headers -OutFile $shaPath | Out-Null
  $expected = ((Get-Content -Raw -LiteralPath $shaPath).Trim() -split '\s+')[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
  if ($expected -ne $actual) { throw 'El checksum del paquete no coincide.' }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($name in $names) {
      if ($name.EndsWith('/') -or $name.Contains('..') -or $name.Contains(':') -or $name.StartsWith('/')) {
        throw 'El paquete trae una ruta no permitida.'
      }
      if ($Allow -notcontains $name) { throw 'El paquete trae un archivo que no está permitido.' }
    }
    foreach ($required in $Allow) {
      if ($names -notcontains $required) { throw 'Al paquete le falta un archivo operativo.' }
    }
    New-Item -ItemType Directory -Force -Path $Destino | Out-Null
    foreach ($entry in $archive.Entries) {
      $target = Join-Path $Destino ($entry.FullName.Replace('/', '\'))
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}

$packed = (Get-Content -Raw -LiteralPath (Join-Path $Destino 'VERSION')).Trim()
if ($packed -ne $remote) { throw 'El VERSION del paquete no coincide con la Release.' }
$envFile = Join-Path $Destino '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
  Copy-Item -LiteralPath (Join-Path $Destino '.env.example') -Destination $envFile
}
Write-Host "Quedó instalada la versión $remote en $Destino"
Write-Host 'Si la imagen es privada, completa .env y después ejecuta install.bat en esa carpeta.'
