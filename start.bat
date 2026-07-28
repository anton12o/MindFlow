@echo off
title MindFlow
chcp 65001 >nul 2>&1

:: Detecta Python 3.10+
set PY_CMD=
where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=1,2,3 delims=." %%a in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2^>nul') do (
        if %%a equ 3 if %%b geq 10 set PY_CMD=python
    )
)
if "%PY_CMD%"=="" (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=1,2,3 delims=." %%a in ('py -3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2^>nul') do (
            if %%a equ 3 if %%b geq 10 set PY_CMD=py
        )
    )
)
if "%PY_CMD%"=="" (
    echo [Erro] Python 3.10+ nao encontrado.
    echo Instale em: https://python.org/downloads/
    pause
    exit /b 1
)

echo [MindFlow] Iniciando...
echo.
%PY_CMD% start.py
if %errorlevel% neq 0 (
    echo.
    echo [Erro] MindFlow fechou com codigo %errorlevel%
    pause
)
