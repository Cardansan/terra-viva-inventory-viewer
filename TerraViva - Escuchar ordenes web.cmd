@echo off
setlocal
title Terra Viva - Escuchar ordenes web
echo Terra Viva - Escuchar ordenes web
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Watch-TerraVivaDriveOrders.ps1"
echo.
pause
