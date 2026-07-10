#!/usr/bin/env python3
"""Gera MindFlow.exe com PyInstaller.

Uso: python build_exe.py

Pré-requisitos:
  - Frontend buildado (npm run build em frontend/)
  - PyInstaller instalado (pip install pyinstaller)
  - assets/mindflow.ico existente

Saída: dist/MindFlow.exe
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent
FRONTEND = ROOT / "frontend"
FRONTEND_DIST = FRONTEND / "dist"
BACKEND = ROOT / "backend"
ICON = ROOT / "assets" / "mindflow.ico"
DIST_DIR = ROOT / "dist"


def clean_pycache():
    """Remove todos os __pycache__/ antes do build."""
    for pcache in list(ROOT.rglob("__pycache__")):
        if pcache.is_dir():
            shutil.rmtree(str(pcache), ignore_errors=True)
            print(f" → Limpo: {pcache.relative_to(ROOT)}")


def main():
    try:
        subprocess.run([sys.executable, "-m", "PyInstaller", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(" ✗ PyInstaller não encontrado. Instale com: pip install pyinstaller")
        sys.exit(1)

    if not (FRONTEND_DIST / "index.html").exists():
        print(" ✗ Frontend não buildado. Execute em frontend/: npm run build")
        sys.exit(1)

    if not ICON.exists():
        print(" ✗ assets/mindflow.ico não encontrado")
        sys.exit(1)

    for p in [ROOT / "build", DIST_DIR]:
        if p.exists():
            shutil.rmtree(str(p), ignore_errors=True)
            print(f" → Limpo: {p.name}/")

    clean_pycache()

    print(" ↻ Buildando MindFlow.exe...")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name", "MindFlow",
        "--icon", str(ICON),
        # Frontend dist (servido por main.py no caminho frontend/dist/)
        "--add-data", f"{FRONTEND_DIST}{os.pathsep}frontend/dist",
        # Backend completo (código + módulos)
        "--add-data", f"{BACKEND}{os.pathsep}backend",
        # Ícone (para atalho desktop)
        "--add-data", f"{ICON.parent}{os.pathsep}assets",
        # Alembic: ini + migrations na raiz do _MEIPASS
        "--add-data", f"{BACKEND / 'alembic.ini'}{os.pathsep}.",
        "--add-data", f"{BACKEND / 'migrations'}{os.pathsep}migrations",
        # Hidden imports (PyInstaller não descobre via string "main:app")
        "--hidden-import", "main",
        "--hidden-import", "uvicorn",
        "--hidden-import", "alembic",
        # Coletores para frameworks com muitos sub-módulos
        "--collect-all", "sqlmodel",
        "--collect-all", "fastapi",
        "--clean",
        "--noconfirm",
        "start.py",
    ]

    result = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    if result.returncode != 0:
        print(f" ✗ Build falhou:\n{result.stderr[-2000:]}")
        sys.exit(1)

    exe_path = DIST_DIR / "MindFlow.exe"
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f" ✓ MindFlow.exe gerado ({size_mb:.1f} MB)")
        print(f"   → {exe_path}")
    else:
        print(" ✗ MindFlow.exe não encontrado após build")
        sys.exit(1)


if __name__ == "__main__":
    main()
