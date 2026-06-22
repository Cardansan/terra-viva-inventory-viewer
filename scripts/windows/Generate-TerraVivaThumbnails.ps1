param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath
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

function To-Timestamp([int]$Seconds) {
  $hours = [int][Math]::Floor($Seconds / 3600)
  $minutes = [int][Math]::Floor(($Seconds % 3600) / 60)
  $secs = $Seconds % 60
  return "{0:D2}:{1:D2}:{2:D2}" -f $hours, $minutes, $secs
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$configPath = Join-Path $repoRoot "terra-viva.publisher.local.json"
$resolvedManifestPath = Resolve-OptionalPath $ManifestPath $repoRoot

if (-not (Test-Path $resolvedManifestPath)) {
  throw "No encontre el manifest de thumbnails: $resolvedManifestPath"
}

$config = Get-Content -Raw -Path $configPath | ConvertFrom-Json
$ffmpegPath = Resolve-OptionalPath (Get-ConfigValue $config "ffmpegPath") $repoRoot

if (-not $ffmpegPath -or -not (Test-Path $ffmpegPath)) {
  $command = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($command) {
    $ffmpegPath = $command.Source
  }
}

if (-not $ffmpegPath -or -not (Test-Path $ffmpegPath)) {
  throw "No encontre ffmpeg para generar miniaturas."
}

$manifest = Get-Content -Raw -Encoding UTF8 -Path $resolvedManifestPath | ConvertFrom-Json

if (-not $manifest.thumbnails -or $manifest.thumbnails.Count -eq 0) {
  throw "El manifest no contiene thumbnails por generar."
}

$outputDir = Resolve-OptionalPath $manifest.outputDir $repoRoot
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Step "Generando thumbnails reales con ffmpeg"
Write-Host "ffmpeg: $ffmpegPath"
Write-Host "Salida: $outputDir"
Write-Host "Total: $($manifest.thumbnails.Count)"

foreach ($thumb in $manifest.thumbnails) {
  $videoPath = Resolve-OptionalPath $thumb.videoPath $repoRoot
  $outputPath = Resolve-OptionalPath $thumb.outputPath $repoRoot

  if (-not (Test-Path $videoPath)) {
    throw "No encontre el video local para $($thumb.momentId): $videoPath"
  }

  Write-Host ("  - Arbol {0:D2} @ {1}" -f [int]$thumb.treeNumber, (To-Timestamp ([int]$thumb.timestampSeconds)))

  & $ffmpegPath -v error -y -ss (To-Timestamp ([int]$thumb.timestampSeconds)) -i $videoPath -frames:v 1 -update 1 -q:v 2 $outputPath 1>$null 2>$null

  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg fallo al generar $outputPath"
  }

  if (-not (Test-Path $outputPath)) {
    throw "La miniatura no se escribio: $outputPath"
  }
}

Write-Step "Miniaturas generadas"
Write-Host "Manifest: $resolvedManifestPath"
