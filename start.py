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
from pathlib import Path

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


def ensure_pre_commit():
    git_hooks = Path(ROOT) / ".git" / "hooks" / "pre-commit"
    if git_hooks.exists():
        return
    try:
        subprocess.run([sys.executable, "-m", "pre_commit", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "pre-commit"],
            capture_output=True, check=True,
        )
    subprocess.run([sys.executable, "-m", "pre_commit", "install"], cwd=ROOT, capture_output=True, check=True)
    print("[OK] Pre-commit hooks configurados")


def precisa_rebuildar() -> bool:
    dist_index = Path(FRONTEND_DIST) / "index.html"
    if not dist_index.exists():
        return True
    dist_mtime = dist_index.stat().st_mtime
    src_dir = Path(FRONTEND) / "src"
    if src_dir.exists():
        for f in src_dir.rglob("*"):
            if f.is_file() and f.stat().st_mtime > dist_mtime:
                return True
    # Also check sw.js and vite.config.ts for changes
    for extra in ["public/sw.js", "vite.config.ts", "index.html"]:
        p = Path(FRONTEND) / extra
        if p.exists() and p.stat().st_mtime > dist_mtime:
            return True
    return False


def _npm_cmd():
    """Retorna 'npm.cmd' no Windows, 'npm' nos demais SOs."""
    return "npm.cmd" if os.name == "nt" else "npm"


def ensure_frontend():
    node_modules = os.path.join(FRONTEND, "node_modules")
    npm = _npm_cmd()

    # Verifica se npm existe (independente de node_modules)
    try:
        subprocess.run([npm, "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[ERROR] npm nao encontrado. Instale Node.js 18+ ou execute manualmente:")
        print("  cd frontend && npm install && npm run build")
        sys.exit(1)

    if not os.path.exists(node_modules):
        print("[Frontend] node_modules nao encontrado — executando npm install...")
        result = subprocess.run([npm, "install"], cwd=FRONTEND, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[ERROR] npm install falhou:\n{result.stderr}")
            sys.exit(1)
        print("[OK] npm install concluido")

    if precisa_rebuildar():
        print("[Frontend] Codigo fonte modificado — rebuildando...")
        result = subprocess.run([npm, "run", "build"], cwd=FRONTEND, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[ERROR] npm run build falhou:\n{result.stderr}")
            sys.exit(1)
        print("[OK] Frontend buildado")
    else:
        print("[OK] Frontend ja atualizado")


def cold_backup():
    """Copia mindflow.db para backups/ antes de iniciar o servidor."""
    import glob, shutil
    src = os.path.join(BACKEND, "data", "mindflow.db")
    if not os.path.exists(src):
        return
    dst_dir = os.path.join(BACKEND, "data", "backups")
    os.makedirs(dst_dir, exist_ok=True)
    try:
        backups = sorted(glob.glob(os.path.join(dst_dir, "mindflow-*.db")))
        while len(backups) > 6:
            os.remove(backups.pop(0))
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        shutil.copy2(src, os.path.join(dst_dir, f"mindflow-{now}.db"))
        print(f"[Backup] Cópia salva em data/backups/mindflow-{now}.db")
    except Exception as e:
        print(f"[Backup] Aviso: não foi possível fazer backup ({e})")


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


def do_backup():
    """Exporta dados via API e salva como JSON."""
    import json, urllib.request
    print("[Backup] Exportando dados...")
    try:
        proc = start_server()
        time.sleep(2)
        if proc.poll() is not None:
            print("[ERROR] Servidor nao iniciou para backup.")
            return
        req = urllib.request.Request("http://localhost:8000/api/export")
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        path = os.path.join(ROOT, f"mindflow-backup-{now}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Backup salvo em: {path}")
        print(f"[OK] Total: {sum(len(v) for v in data.values() if isinstance(v, list))} registros em {sum(1 for v in data.values() if isinstance(v, list))} tabelas")
    except Exception as e:
        print(f"[ERROR] Backup falhou: {e}")
    finally:
        proc.terminate()
        proc.wait()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="MindFlow — Gerenciador de produtividade pessoal")
    parser.add_argument("--backup", action="store_true", help="Exportar dados para JSON e sair (backup a frio)")
    args = parser.parse_args()

    if args.backup:
        check_python()
        install_backend_deps()
        do_backup()
        return

    print("=" * 50)
    print("  MindFlow — Inicializando...")
    print("=" * 50)
    print()

    check_python()
    install_backend_deps()
    ensure_pre_commit()
    ensure_frontend()
    cold_backup()
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
