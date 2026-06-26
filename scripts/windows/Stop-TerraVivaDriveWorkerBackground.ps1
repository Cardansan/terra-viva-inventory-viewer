Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$pidPath = Join-Path $repoRoot ".tmp\terra-viva-drive-worker.pid"

if (-not (Test-Path $pidPath)) {
  Write-Host "No habia un PID guardado para la escucha automatica." -ForegroundColor Yellow
  return
}

$storedPid = (Get-Content -Raw -Path $pidPath).Trim()

if (-not $storedPid) {
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
  Write-Host "No habia un PID valido para detener." -ForegroundColor Yellow
  return
}

$process = Get-Process -Id $storedPid -ErrorAction SilentlyContinue

if ($process) {
  Stop-Process -Id $storedPid -Force
  Write-Host "La escucha automatica se detuvo correctamente." -ForegroundColor Green
} else {
  Write-Host "El proceso guardado ya no estaba corriendo." -ForegroundColor Yellow
}

Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
