@echo off
setlocal
title Terra Viva - Detener escucha automatica
echo Terra Viva - Detener escucha automatica
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Stop-TerraVivaDriveWorkerBackground.ps1"
echo.
pause
