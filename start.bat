@echo off
echo Starting MindFlow...
echo.

echo [Backend] Starting FastAPI on http://localhost:8000
start "MindFlow-Backend" cmd /c "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [Frontend] Starting Vite on http://localhost:5173
start "MindFlow-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo MindFlow rodando!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo Aperte qualquer tecla para parar tudo...
pause

taskkill /fi "WINDOWTITLE eq MindFlow-Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq MindFlow-Frontend" /f >nul 2>&1
