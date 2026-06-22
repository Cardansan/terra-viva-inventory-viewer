@echo off
setlocal
title Terra Viva - Publicar catalogo
echo Terra Viva - Publicar catalogo
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Run-TerraVivaPublisher.ps1" -Mode publish
echo.
pause
