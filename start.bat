@echo off
title MindFlow
echo Starting MindFlow...
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python nao encontrado! Instale Python 3.12+ e tente novamente.
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js nao encontrado! Instale Node.js 18+ e tente novamente.
    pause
    exit /b 1
)

echo [Backend] Starting FastAPI on http://localhost:8000
start "MindFlow-Backend" cmd /c "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [Frontend] Starting Vite on http://localhost:5173
start "MindFlow-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo [Browser] Abrindo MindFlow...
start http://localhost:5173

echo.
echo MindFlow rodando!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo Aperte qualquer tecla para parar tudo...
pause

taskkill /fi "WINDOWTITLE eq MindFlow-Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq MindFlow-Frontend" /f >nul 2>&1
