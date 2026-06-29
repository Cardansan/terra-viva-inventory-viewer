Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$pidPath = Join-Path $repoRoot ".tmp\terra-viva-drive-worker.pid"

function Stop-RelatedWorkerProcesses {
  $relatedProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -in @("node.exe", "powershell.exe") -and
    $_.CommandLine -and (
      $_.CommandLine.Contains("scripts/process-drive-orders.mjs") -or
      $_.CommandLine.Contains("Watch-TerraVivaDriveOrders.ps1")
    )
  }

  foreach ($relatedProcess in $relatedProcesses) {
    Stop-Process -Id $relatedProcess.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path $pidPath)) {
  Stop-RelatedWorkerProcesses
  Write-Host "No habia un PID guardado para la escucha automatica." -ForegroundColor Yellow
  return
}

$storedPid = (Get-Content -Raw -Path $pidPath).Trim()

if (-not $storedPid) {
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
  Stop-RelatedWorkerProcesses
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

Stop-RelatedWorkerProcesses

Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
