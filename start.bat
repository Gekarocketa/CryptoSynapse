@echo off
chcp 65001 >nul
title CryptoSynapse Launcher
cd /d "%~dp0"

echo =======================================================
echo              CryptoSynapse - Запуск проекта
echo =======================================================
echo.

rem 1. Проверка наличия Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден в системе!
    echo Пожалуйста, установите Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

rem 2. Проверка файла конфигурации backend\.env
if not exist "backend\.env" (
    echo [+] Создание файла backend\.env из .env.example...
    copy "backend\.env.example" "backend\.env" >nul
    echo [OK] Файл backend\.env успешно создан.
)

rem 3. Запуск базы данных PostgreSQL
echo [+] Проверка Docker и базы данных PostgreSQL...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo [+] Запуск PostgreSQL в Docker Compose...
        docker compose up -d >nul 2>&1 || docker-compose up -d >nul 2>&1
        echo [OK] Контейнер PostgreSQL запущен.
        ping -n 3 127.0.0.1 >nul
    ) else (
        echo [!] Docker Desktop не запущен. Если используется внешний PostgreSQL на порту 5432 - продолжаем.
    )
) else (
    echo [!] Docker не найден. Убедитесь, что PostgreSQL доступен на localhost:5432.
)

rem 4. Проверка зависимостей бэкенда
if not exist "backend\node_modules" (
    echo [+] Установка зависимостей бэкенда...
    call npm --prefix backend install
)

rem 5. Генерация Prisma Client и синхронизация схемы БД
if not exist "backend\node_modules\@prisma\client" (
    echo [+] Генерация Prisma Client...
    call npm --prefix backend run prisma:generate
)

echo [+] Проверка схемы базы данных...
cd /d "%~dp0backend"
call npx prisma db push --skip-generate >nul 2>&1
cd /d "%~dp0"

rem 6. Проверка зависимостей фронтенда
if not exist "frontend\node_modules" (
    echo [+] Установка зависимостей фронтенда...
    call npm --prefix frontend install
)

rem 7. Запуск Backend (порт 5001) в отдельном окне
echo [+] Запуск Backend сервера на порту 5001...
start "CryptoSynapse Backend" /d "%~dp0backend" cmd /k "title CryptoSynapse Backend && npm run dev"

rem 8. Запуск Frontend клиента (порт 5173) в отдельном окне
echo [+] Запуск Frontend клиента на порту 5173...
start "CryptoSynapse Frontend" /d "%~dp0frontend" cmd /k "title CryptoSynapse Frontend && npm run dev"

rem 9. Ожидание запуска и открытие браузера
ping -n 4 127.0.0.1 >nul

echo.
echo =======================================================
echo          CryptoSynapse успешно запущен!
echo =======================================================
echo  - Frontend:   http://localhost:5173
echo  - Backend:    http://localhost:5001
echo  - API Health: http://localhost:5001/api/health
echo =======================================================
echo  Для остановки всех компонентов запустите stop.bat
echo =======================================================
echo.

start http://localhost:5173

exit /b 0