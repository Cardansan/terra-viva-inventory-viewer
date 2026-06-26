Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-OptionalPath([string]$Candidate, [string]$BasePath) {
  if ([string]::IsNullOrWhiteSpace($Candidate)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($Candidate)) {
    return $Candidate
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Candidate))
}

function Get-ConfigValue($Config, [string]$Name) {
  $property = $Config.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $null
  }

  return $property.Value
}

function Find-NodePath([object]$Config, [string]$RepoRoot) {
  $configured = Resolve-OptionalPath (Get-ConfigValue $Config "nodePath") $RepoRoot
  if ($configured -and (Test-Path $configured)) {
    return $configured
  }

  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $fallbacks = @(
    "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
    "C:\Program Files\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
  )

  foreach ($candidate in $fallbacks) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "No encontre Node.js. Instala Node 20 o configura 'nodePath' en terra-viva.publisher.local.json."
}

function Add-DirectoryToPath([string]$PathToAdd) {
  if ([string]::IsNullOrWhiteSpace($PathToAdd)) {
    return
  }

  if (-not (Test-Path $PathToAdd)) {
    return
  }

  if (-not ($env:PATH -split ";" | Where-Object { $_ -eq $PathToAdd })) {
    $env:PATH = "$PathToAdd;$env:PATH"
  }
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$configPath = Join-Path $repoRoot "terra-viva.publisher.local.json"
$exampleConfigPath = Join-Path $repoRoot "terra-viva.publisher.example.json"

Write-Host "Terra Viva - Escuchar ordenes web" -ForegroundColor Green
Write-Host "Repo: $repoRoot"

if (-not (Test-Path $configPath)) {
  throw "Falta terra-viva.publisher.local.json. Copia $exampleConfigPath y llena la configuracion local."
}

$config = Get-Content -Raw -Path $configPath | ConvertFrom-Json
$ffmpegPath = Get-ConfigValue $config "ffmpegPath"
if ($ffmpegPath) {
  $ffmpegDir = Split-Path -Parent (Resolve-OptionalPath $ffmpegPath $repoRoot)
  Add-DirectoryToPath $ffmpegDir
}

$googleDriveAccessToken = Get-ConfigValue $config "googleDriveAccessToken"
if ($googleDriveAccessToken -and -not $env:GOOGLE_DRIVE_ACCESS_TOKEN) {
  $env:GOOGLE_DRIVE_ACCESS_TOKEN = $googleDriveAccessToken
}

$nodePath = Find-NodePath $config $repoRoot
$nodeDir = Split-Path -Parent $nodePath
Add-DirectoryToPath $nodeDir

$driveFolderId = Get-ConfigValue $config "driveFolderId"
if (-not $driveFolderId) {
  throw "Falta driveFolderId en terra-viva.publisher.local.json."
}

$pollIntervalSeconds = Get-ConfigValue $config "orderPollIntervalSeconds"
if (-not $pollIntervalSeconds) {
  $pollIntervalSeconds = 20
}

Push-Location $repoRoot
try {
  Write-Host ""
  Write-Host "Escuchando cola web cada $pollIntervalSeconds segundos..." -ForegroundColor Cyan
  & $nodePath "scripts/process-drive-orders.mjs" "--once" "false" "--poll-interval-seconds" "$pollIntervalSeconds"

  if ($LASTEXITCODE -ne 0) {
    throw "El worker de ordenes termino con codigo $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
