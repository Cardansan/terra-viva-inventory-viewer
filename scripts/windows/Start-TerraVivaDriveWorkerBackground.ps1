Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$pidDir = Join-Path $repoRoot ".tmp"
$logDir = Join-Path $repoRoot ".tools\logs"
$pidPath = Join-Path $pidDir "terra-viva-drive-worker.pid"
$outLogPath = Join-Path $logDir "drive-worker-background.out.log"
$errLogPath = Join-Path $logDir "drive-worker-background.err.log"
$watcherScriptPath = Join-Path $repoRoot "scripts\windows\Watch-TerraVivaDriveOrders.ps1"

New-Item -ItemType Directory -Path $pidDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

if (Test-Path $pidPath) {
  $existingPid = (Get-Content -Raw -Path $pidPath).Trim()

  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue

    if ($existingProcess) {
      Write-Host "La escucha automatica ya esta corriendo con PID $existingPid." -ForegroundColor Yellow
      Write-Host "Log: $outLogPath"
      return
    }
  }
}

$process = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList "-ExecutionPolicy Bypass -File `"$watcherScriptPath`"" `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLogPath `
  -RedirectStandardError $errLogPath `
  -PassThru

Set-Content -Path $pidPath -Value $process.Id -NoNewline

Write-Host "La escucha automatica ya quedo iniciada." -ForegroundColor Green
Write-Host "PID: $($process.Id)"
Write-Host "Salida: $outLogPath"
Write-Host "Errores: $errLogPath"
