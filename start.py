#!/usr/bin/env python3
"""MindFlow — Inicialização única.

Uso: python start.py

Instala dependências, builda o frontend (se necessário),
inicia o servidor e abre o navegador automaticamente.
"""

import os
import sys
import subprocess
import webbrowser
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
FRONTEND_DIST = os.path.join(FRONTEND, "dist")


def check_python():
    if sys.version_info < (3, 12):
        print(f"[ERROR] Python 3.12+ necessario (atual: {sys.version_info.major}.{sys.version_info.minor})")
        sys.exit(1)
    print(f"[OK] Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")


def install_backend_deps():
    print("[Backend] Instalando dependencias...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
        cwd=BACKEND, capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"[ERROR] Falha ao instalar dependencias do backend:\n{result.stderr}")
        sys.exit(1)
    print("[OK] Dependencias do backend instaladas")


def ensure_frontend():
    node_modules = os.path.join(FRONTEND, "node_modules")

    if not os.path.exists(node_modules):
        print("[Frontend] node_modules nao encontrado — executando npm install...")
        try:
            subprocess.run(["npm", "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("[ERROR] npm nao encontrado. Instale Node.js 18+ ou execute manualmente:")
            print("  cd frontend && npm install && npm run build")
            sys.exit(1)

        result = subprocess.run(["npm", "install"], cwd=FRONTEND, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[ERROR] npm install falhou:\n{result.stderr}")
            sys.exit(1)
        print("[OK] npm install concluido")

    if not os.path.exists(FRONTEND_DIST):
        print("[Frontend] Build nao encontrado — executando npm run build...")
        result = subprocess.run(["npm", "run", "build"], cwd=FRONTEND, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[ERROR] npm run build falhou:\n{result.stderr}")
            sys.exit(1)
        print("[OK] Frontend buildado")
    else:
        print("[OK] Frontend ja buildado")


def start_server():
    print("[Server] Iniciando MindFlow em http://localhost:8000")
    print("[Server] Pressione Ctrl+C para parar...\n")

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND,
    )

    time.sleep(2)

    if proc.poll() is not None:
        print("[ERROR] Servidor nao iniciou. Verifique se a porta 8000 esta livre.")
        sys.exit(1)

    return proc


def open_browser():
    webbrowser.open("http://localhost:8000")
    print("[Browser] Navegador aberto em http://localhost:8000")


def main():
    print("=" * 50)
    print("  MindFlow — Inicializando...")
    print("=" * 50)
    print()

    check_python()
    install_backend_deps()
    ensure_frontend()
    proc = start_server()
    open_browser()

    try:
        proc.wait()
    except KeyboardInterrupt:
        print("\n[Server] Parando...")
        proc.terminate()
        proc.wait()
        print("[OK] MindFlow parado")


if __name__ == "__main__":
    main()
