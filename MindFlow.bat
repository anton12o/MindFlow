@echo off
title MindFlow Launcher
setlocal

:: Se ja estamos dentro do repositorio, pula setup (seguro para missclick)
if exist "%~dp0start.py" (
    cd /d "%~dp0"
    if not exist "venv" python -m venv venv
    .\venv\Scripts\python start.py
    pause
    exit /b
)

set "REPO_DIR=%~dp0MindFlow"

echo [MindFlow] Verificando ambiente...

:: 1. Verificar Git
where git >nul 2>&1
if errorlevel 1 (
    echo [MindFlow] Git nao encontrado.
    echo Por favor, instale em: https://git-scm.com/downloads
    pause & exit /b
)

:: 2. Verificar Python
where python >nul 2>&1
if errorlevel 1 (
    echo [MindFlow] Python nao encontrado.
    echo Por favor, instale em: https://www.python.org/downloads/
    echo Lembre-se de marcar "Add Python to PATH".
    pause & exit /b
)

:: 3. Clone inicial (se necessario)
if not exist "%REPO_DIR%" (
    echo [MindFlow] Baixando o repositorio pela primeira vez...
    git clone https://github.com/anton12o/MindFlow.git "%REPO_DIR%"
    if errorlevel 1 (
        echo [MindFlow] Erro ao baixar o repositorio. Verifique sua conexao.
        pause & exit /b
    )
    echo [OK] Repositorio baixado
)

cd /d "%REPO_DIR%"

:: 4. Configurar Ambiente Virtual (venv)
if not exist "venv" (
    echo [MindFlow] Configurando ambiente isolado...
    python -m venv venv
    if errorlevel 1 (
        echo [MindFlow] Erro ao criar ambiente virtual.
        pause & exit /b
    )
    echo [MindFlow] Instalando dependencias do backend...
    .\venv\Scripts\python -m pip install --upgrade pip >nul 2>&1
    .\venv\Scripts\python -m pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [MindFlow] Erro ao instalar dependencias.
        pause & exit /b
    )
    echo [OK] Ambiente configurado
)

:: 5. Iniciar o App
echo [MindFlow] Iniciando...
echo.
.\venv\Scripts\python start.py
pause