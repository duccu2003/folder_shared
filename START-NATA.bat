@echo off
chcp 65001 >nul
title NATA File Portal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-nata.ps1"
if errorlevel 1 (
  echo.
  echo Có lỗi xảy ra. Xem thông báo phía trên.
  pause
)
