@echo off
chcp 65001 >nul
title CryptoSynapse Stopper
cd /d "%~dp0"

echo =======================================================
echo          Остановка сервисов CryptoSynapse
echo =======================================================
echo.

rem 1. Остановка Frontend (порт 5173 и окно CryptoSynapse Frontend)
echo [1/3] Остановка Frontend (порт 5173)...
taskkill /FI "WINDOWTITLE eq CryptoSynapse Frontend*" /T /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr :5173 ^| findstr LISTENING') do (
    if "%%a" neq "0" taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Frontend остановлен.

rem 2. Остановка Backend (порт 5001 и окно CryptoSynapse Backend)
echo [2/3] Остановка Backend (порт 5001)...
taskkill /FI "WINDOWTITLE eq CryptoSynapse Backend*" /T /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr :5001 ^| findstr LISTENING') do (
    if "%%a" neq "0" taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Backend остановлен.

rem 3. Остановка базы данных (Docker контейнер)
echo [3/3] Остановка контейнера PostgreSQL (Docker)...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker compose stop >nul 2>&1 || docker-compose stop >nul 2>&1 || docker stop cryptosynapse-postgres >nul 2>&1
)
echo [OK] База данных остановлена.

echo.
echo =======================================================
echo    Все компоненты CryptoSynapse успешно остановлены!
echo =======================================================
echo.

echo Окно закроется через несколько секунд...
ping -n 4 127.0.0.1 >nul
exit /b 0