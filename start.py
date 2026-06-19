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
import socket
from pathlib import Path

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
FRONTEND_DIST = os.path.join(FRONTEND, "dist")
VERSION = "1.2.12"
VENV_DIR = Path(ROOT) / "venv"


def check_python():
    if sys.version_info < (3, 12):
        print(f" ✗ Python 3.12+ necessario (atual: {sys.version_info.major}.{sys.version_info.minor})")
        sys.exit(1)
    print(f" ✓ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")


def install_backend_deps():
    print(" ↻ Instalando dependencias...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
        cwd=BACKEND, capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f" ✗ Falha ao instalar dependencias do backend:\n{result.stderr}")
        sys.exit(1)
    print(" ✓ Dependencias do backend instaladas")


def ensure_pre_commit():
    git_hooks = Path(ROOT) / ".git" / "hooks" / "pre-commit"
    if git_hooks.exists():
        return
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(" ⚠ Git nao encontrado — hooks pre-commit ignorados.")
        print(" ⚠ Instale git para ativar verificacao automatica.")
        return
    try:
        subprocess.run([sys.executable, "-m", "pre_commit", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "pre-commit"],
            capture_output=True, check=True,
        )
    try:
        subprocess.run([sys.executable, "-m", "pre_commit", "install"], cwd=ROOT, capture_output=True, check=True)
        print(" ✓ Pre-commit hooks configurados")
    except subprocess.CalledProcessError:
        print(" ⚠ Falha ao configurar hooks pre-commit — ignorando.")


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
        print(" ✗ npm (Node.js) nao encontrado.")
        print("")
        print("  O frontend precisa de Node.js 18+ para o primeiro build.")
        print("  Baixe em: https://nodejs.org/ (escolha a versao LTS)")
        print("")
        print("  Apos instalar, execute manualmente:")
        print("    cd frontend")
        print("    npm install")
        print("    npm run build")
        print("")
        print("  Em seguida, rode start.py novamente.")
        sys.exit(1)

    if not os.path.exists(node_modules):
        print(" ↻ node_modules nao encontrado — executando npm install...")
        result = subprocess.run([npm, "install"], cwd=FRONTEND, capture_output=True, text=True)
        if result.returncode != 0:
            print(f" ✗ npm install falhou:\n{result.stderr}")
            sys.exit(1)
        print(" ✓ npm install concluido")

    if precisa_rebuildar():
        print(" ↻ Codigo fonte modificado — rebuildando...")
        result = subprocess.run([npm, "run", "build"], cwd=FRONTEND, capture_output=True, text=True)
        if result.returncode != 0:
            print(f" ✗ npm run build falhou:\n{result.stderr}")
            sys.exit(1)
        print(" ✓ Frontend buildado")
    else:
        print(" ✓ Frontend ja atualizado")


def check_cloud_sync():
    """Desativa WAL mode se o banco estiver dentro de pasta sincronizada (WAL + cloud = corrupção)."""
    src = os.path.join(BACKEND, "mindflow.db")
    abspath = os.path.abspath(src).lower()
    keywords = ["onedrive", "dropbox", "icloud", "syncthing", "google drive", "box sync"]
    for kw in keywords:
        if kw in abspath:
            print(f" ⚠ AVISO: O banco SQLite está em {kw.title()} ({abspath})")
            print(" ⚠ WAL mode + sincronização de nuvem pode CORROMPER o banco.")
            print(" ⚠ Desativando WAL mode — usando journal_mode=DELETE para segurança.")
            os.environ["MFLOW_JOURNAL_MODE"] = "DELETE"
            return


def ensure_venv():
    """Cria e ativa ambiente virtual se não estiver dentro de um."""
    if sys.prefix != sys.base_prefix:
        return

    if not VENV_DIR.exists():
        print(" ↻ Criando ambiente virtual...")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)
        print(f" ↻ venv criado em {VENV_DIR}")

    venv_python = VENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")

    marker = VENV_DIR / ".mindflow_installed"
    if not marker.exists():
        print(" ↻ Instalando dependencias...")
        subprocess.run(
            [str(venv_python), "-m", "pip", "install", "-r", "requirements.txt"],
            cwd=BACKEND, check=True,
        )

    print(" ↻ Ativando ambiente virtual...")
    result = subprocess.run([str(venv_python)] + sys.argv, cwd=ROOT)
    sys.exit(result.returncode)


def cold_backup():
    """Copia mindflow.db para backups/ antes de iniciar o servidor."""
    import glob, sqlite3
    src = os.path.join(BACKEND, "mindflow.db")
    if not os.path.exists(src):
        return
    dst_dir = os.path.join(BACKEND, "data", "backups")
    os.makedirs(dst_dir, exist_ok=True)
    try:
        backups = sorted(glob.glob(os.path.join(dst_dir, "mindflow-*.db")))
        while len(backups) > 6:
            os.remove(backups.pop(0))
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        dst = os.path.join(dst_dir, f"mindflow-{now}.db")
        with sqlite3.connect(src) as src_conn:
            with sqlite3.connect(dst) as dst_conn:
                src_conn.backup(dst_conn, pages=1000)
        print(f" ✓ Cópia salva em data/backups/mindflow-{now}.db")
    except Exception as e:
        print(f" ⚠ Aviso: não foi possível fazer backup ({e})")


def resolve_port(requested: int, explicit: bool = False) -> int:
    """Retorna a primeira porta disponível a partir de requested.
    Se explicit=True e a porta estiver ocupada, aborta com erro."""
    port = requested
    for _ in range(100):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            if result != 0:
                return port
        except OSError:
            return port
        if explicit:
            print(f" ✗ Porta {port} ja esta em uso. Use --port <NUM> para escolher outra.")
            sys.exit(1)
        print(f" ⚠ Porta {port} ocupada, tentando {port + 1}...")
        port += 1
    print(f" ✗ Nenhuma porta disponivel apos 100 tentativas.")
    sys.exit(1)


def start_server(port: int):
    print(f" ↻ Iniciando MindFlow em http://localhost:{port}")
    print(" ↻ Pressione Ctrl+C para parar...\n")

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(port)],
        cwd=BACKEND,
    )

    time.sleep(2)

    if proc.poll() is not None:
        print(f" ✗ Servidor nao iniciou. Verifique se a porta {port} esta livre.")
        sys.exit(1)

    return proc


def open_browser(port: int):
    webbrowser.open(f"http://localhost:{port}")
    print(f" ✓ Navegador aberto em http://localhost:{port}")


def do_backup(port: int = 8000):
    """Exporta dados via API e salva como JSON."""
    import json, urllib.request
    print(" ↻ Exportando dados...")
    try:
        proc = start_server(port)
        time.sleep(2)
        if proc.poll() is not None:
            print(" ✗ Servidor nao iniciou para backup.")
            return
        req = urllib.request.Request(f"http://localhost:{port}/api/export")
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        path = os.path.join(ROOT, f"mindflow-backup-{now}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f" ✓ Backup salvo em: {path}")
        print(f" ✓ Total: {sum(len(v) for v in data.values() if isinstance(v, list))} registros em {sum(1 for v in data.values() if isinstance(v, list))} tabelas")
    except Exception as e:
        print(f" ✗ Backup falhou: {e}")
    finally:
        proc.terminate()
        proc.wait()

def print_banner():
    slogan = "Seu segundo cérebro local-first, open-source e keyboard-driven"
    w = len(slogan) + 4
    version_line = f"MindFlow v{VERSION}"
    left_pad = (w - len(version_line)) // 2
    right_pad = w - len(version_line) - left_pad
    print("╔" + "═" * w + "╗")
    print("║" + " " * left_pad + version_line + " " * right_pad + "║")
    print("║  " + slogan + "  ║")
    print("╚" + "═" * w + "╝")
    print()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="MindFlow — Seu segundo cérebro local-first, open-source e keyboard-driven")
    parser.add_argument("--backup", action="store_true", help="Exportar dados para JSON e sair (backup a frio)")
    parser.add_argument("--port", type=int, default=8000, help="Porta do servidor (padrao: 8000)")
    args = parser.parse_args()
    explicit_port = any(a.startswith('--port') for a in sys.argv[1:])

    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8')

    if args.backup:
        ensure_venv()
        check_python()
        install_backend_deps()
        port = resolve_port(args.port, explicit_port)
        do_backup(port)
        return

    ensure_venv()

    print_banner()

    print("═" * 60)
    print("  Fase 1/3: Ambiente")
    print("═" * 60)
    check_python()
    port = resolve_port(args.port, explicit_port)
    if port != args.port:
        print(f" ⚠ Usando porta {port} (a {args.port} estava ocupada)")
    print()

    print("═" * 60)
    print("  Fase 2/3: Dependências e Build")
    print("═" * 60)
    install_backend_deps()
    ensure_pre_commit()
    ensure_frontend()
    check_cloud_sync()
    cold_backup()
    print()

    print("═" * 60)
    print("  Fase 3/3: Servidor")
    print("═" * 60)
    proc = start_server(port)
    open_browser(port)
    print()

    db_path = os.path.join(BACKEND, "mindflow.db")
    print(f" ✓ Banco: {db_path}")
    print(f" ✓ Modo: Producao (porta {port})")
    print(" ✓ Dica: Ctrl+I captura ideias, Ctrl+K abre comandos")
    print(" ✓ Pressione Ctrl+C para encerrar")

    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait()
    finally:
        print("\n ✓ Servidor encerrado com seguranca")
        print("   Ate logo!")


if __name__ == "__main__":
    main()
