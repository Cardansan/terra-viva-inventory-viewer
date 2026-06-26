@echo off
setlocal
title Terra Viva - Iniciar escucha automatica
echo Terra Viva - Iniciar escucha automatica
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Start-TerraVivaDriveWorkerBackground.ps1"
echo.
pause
