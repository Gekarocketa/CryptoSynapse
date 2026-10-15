@echo off
cd /d "%~dp0backend"
echo Running CryptoSynapse Backend Tests...
echo.
call npm test
echo.
pause
