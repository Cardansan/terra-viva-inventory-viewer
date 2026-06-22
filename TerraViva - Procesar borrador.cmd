@echo off
setlocal
title Terra Viva - Procesar borrador
echo Terra Viva - Procesar borrador
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Run-TerraVivaPublisher.ps1" -Mode draft
echo.
pause
