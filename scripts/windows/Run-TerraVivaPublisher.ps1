param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("draft", "publish")]
  [string]$Mode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

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

Write-Host "Terra Viva publisher launcher" -ForegroundColor Green
Write-Host "Modo: $Mode"
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
$usePlaceholderMedia = [bool](Get-ConfigValue $config "usePlaceholderMedia")
$catalogInputFile = Get-ConfigValue $config "catalogInputFile"
$defaultApprovalArtifact = "catalog-approvals/current-approved-catalog.json"
$runId = (Get-Date).ToString("yyyy-MM-ddTHH-mm-ss-fffffffK").Replace(":", "-")

if (-not $driveFolderId -and -not $usePlaceholderMedia) {
  throw "Falta driveFolderId en terra-viva.publisher.local.json. Todavia no hemos conectado Drive automaticamente."
}

if ($Mode -eq "publish") {
  Write-Step "Preparando aprobacion guardada"
  & $nodePath "scripts/stage-approved-catalog.mjs"

  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo preparar la aprobacion para publicar."
  }

  $catalogInputFile = $defaultApprovalArtifact
  $catalogInputPath = Resolve-OptionalPath $catalogInputFile $repoRoot
  if (-not (Test-Path $catalogInputPath)) {
    throw "No encontre el catalogo aprobado preparado en: $catalogInputPath"
  }
}

$args = @(
  "scripts/publish-catalog.mjs",
  "--dry-run",
  "false",
  "--verbose",
  "true",
  "--run-id",
  $runId,
  "--thumbnail-mode",
  "manifest"
)
if ($Mode -eq "draft") {
  $args += @("--workflow", "draft")
} else {
  $args += @("--catalog-input-file", $catalogInputFile)
}

Write-Step "Configuracion validada"
Write-Host "Node: $nodePath"
Write-Host ("Drive folder: " + ($(if ($driveFolderId) { $driveFolderId } else { "placeholder" })))
Write-Host ("Catalogo aprobado: " + ($(if ($catalogInputFile) { $catalogInputFile } else { "no especificado" })))

Push-Location $repoRoot
try {
  Write-Step "Ejecutando publicador"
  & $nodePath @args

  if ($LASTEXITCODE -ne 0) {
    throw "El publicador termino con codigo $LASTEXITCODE."
  }

  if (-not $usePlaceholderMedia) {
    $manifestPath = Join-Path $repoRoot ".tools\publisher-runtime\$((Get-Date).ToString('yyyy-MM-dd'))\$Mode\$runId\thumbnail-manifest.json"

    if (Test-Path $manifestPath) {
      Write-Step "Generando thumbnails reales"
      powershell -ExecutionPolicy Bypass -File ".\scripts\windows\Generate-TerraVivaThumbnails.ps1" -ManifestPath $manifestPath

      if ($LASTEXITCODE -ne 0) {
        throw "La generacion de thumbnails termino con codigo $LASTEXITCODE."
      }
    }
  }

  Write-Step "Proceso terminado"
  Write-Host "Todo termino sin errores." -ForegroundColor Green
} finally {
  Pop-Location
}
