#!/usr/bin/env python3
"""MindFlow — Inicialização única.

Modo dev:   python start.py
Modo .exe:  MindFlow.exe (gerado via build_exe.py)

Instala dependências, builda o frontend (se necessário),
inicia o servidor e abre o navegador automaticamente.
"""

import os
import sys
import subprocess
import webbrowser
import time
import socket
import argparse
import random
from pathlib import Path


def is_bundled():
    return getattr(sys, 'frozen', False)

if is_bundled():
    CODE_ROOT = Path(sys._MEIPASS)
    DATA_ROOT = Path(sys.executable).parent
else:
    CODE_ROOT = Path(__file__).parent
    DATA_ROOT = CODE_ROOT

BACKEND = CODE_ROOT / "backend"
FRONTEND = CODE_ROOT / "frontend"
FRONTEND_DIST = FRONTEND / "dist"
sys.path.insert(0, str(BACKEND))
from _version import VERSION

VENV_DIR = DATA_ROOT / "venv"
DB_PATH = DATA_ROOT / "backend" / "mindflow.db"
BACKUP_DIR = DATA_ROOT / "backend" / "data" / "backups"
LOGS_DIR = DATA_ROOT / "logs"
MIGRATIONS_DIR = BACKEND / "migrations"

_USE_COLOR = sys.stdout.isatty()
if _USE_COLOR and sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.kernel32.SetConsoleMode(ctypes.windll.kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass


class C:
    c = '\033[36m' if _USE_COLOR else ''
    g = '\033[32m' if _USE_COLOR else ''
    y = '\033[33m' if _USE_COLOR else ''
    r = '\033[31m' if _USE_COLOR else ''
    b = '\033[1m' if _USE_COLOR else ''
    n = '\033[0m' if _USE_COLOR else ''


def ok(msg): print(f" {C.g}✓{C.n} {msg}")
def warn(msg): print(f" {C.y}⚠{C.n} {msg}")
def fail(msg): print(f" {C.r}✗{C.n} {msg}")
def info(msg): print(f" {C.c}▶{C.n} {msg}")


def _npm_cmd():
    return "npm.cmd" if os.name == "nt" else "npm"


def save_log(content: str, prefix: str = "error") -> Path:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y-%m-%d_%H-%M-%S")
    p = LOGS_DIR / f"{prefix}-{ts}.log"
    p.write_text(content, encoding="utf-8")
    return p


def render_error(stderr: str):
    lines = [l for l in stderr.split("\n") if l.strip()]
    if not lines:
        return
    head = lines[:3]
    tail = lines[-5:] if len(lines) > 8 else []
    for l in head:
        print(f"   {l}")
    if tail:
        print(f"   ... ({len(lines) - 6} linhas omitidas)")
        for l in tail:
            print(f"   {l}")
    p = save_log(stderr)
    print(f"   Log completo: {p}")


def check_python():
    ok(f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")


def resolve_port(requested: int, explicit: bool = False) -> int:
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
            fail(f"Porta {port} já está em uso. Use --port <NUM> para escolher outra.")
            sys.exit(1)
        warn(f"Porta {port} ocupada, tentando {port + 1}...")
        port += 1
    fail("Nenhuma porta disponível após 100 tentativas.")
    sys.exit(1)


def git_update(enabled: bool = True):
    if not enabled:
        ok("Atualização desabilitada (--no-update)")
        return
    owner_file = DATA_ROOT / "docs" / ".mindflow_owner"
    if owner_file.exists():
        ok("docs/.mindflow_owner encontrado — pulando")
        return
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        warn("Git não encontrado — pulando atualização")
        return
    r = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True, cwd=str(DATA_ROOT))
    if r.stdout.strip() != "main":
        info(f"Branch: {r.stdout.strip()} — só atualiza na main")
        return
    r = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, cwd=str(DATA_ROOT))
    if r.stdout.strip():
        ok("Working tree com alterações — pulando")
        return
    try:
        resposta = input(f" {C.c}▶{C.n} Atualizar do GitHub? (S/n): ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        resposta = "n"
    if resposta not in ("", "s", "sim"):
        ok("Atualização cancelada")
        return
    info("Atualizando...")
    try:
        proc = subprocess.Popen(["git", "pull", "--ff-only"], cwd=str(DATA_ROOT), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = proc.communicate(timeout=30)
        if proc.returncode != 0:
            render_error(stderr)
            warn("Falha ao atualizar")
            return
    except subprocess.TimeoutExpired:
        proc.kill()
        warn("git pull excedeu 30s — pulando")
        return
    ok("Repositório atualizado")


def install_backend_deps():
    if is_bundled():
        return
    info("Instalando dependências...")
    r = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
        cwd=str(BACKEND), capture_output=True, text=True,
    )
    if r.returncode != 0:
        render_error(r.stderr)
        fail("Falha ao instalar dependências do backend")
        sys.exit(1)
    ok("Dependências do backend instaladas")


def ensure_pre_commit():
    if is_bundled():
        return
    git_hooks = DATA_ROOT / ".git" / "hooks" / "pre-commit"
    if git_hooks.exists():
        return
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        warn("Git não encontrado — hooks ignorados")
        return
    try:
        subprocess.run([sys.executable, "-m", "pre_commit", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        subprocess.run([sys.executable, "-m", "pip", "install", "pre-commit"], capture_output=True, check=True)
    try:
        subprocess.run([sys.executable, "-m", "pre_commit", "install"], cwd=str(DATA_ROOT), capture_output=True, check=True)
        ok("Pre-commit hooks configurados")
    except subprocess.CalledProcessError:
        warn("Falha ao configurar hooks")


def alembic_upgrade():
    if is_bundled():
        return  # database.run_migrations() roda durante startup do servidor
    versions_dir = MIGRATIONS_DIR / "versions"
    has_files = versions_dir.exists() and any(versions_dir.iterdir())
    if not has_files:
        ok("Nenhuma migration pendente")
        return
    info("Verificando migrations...")
    alembic_cwd = str(CODE_ROOT) if is_bundled() else str(BACKEND)
    r = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=alembic_cwd, capture_output=True, text=True,
    )
    if r.returncode != 0:
        render_error(r.stderr)
        fail("Migration falhou")
        sys.exit(1)
    ok("Banco atualizado")


def check_node():
    if is_bundled():
        return
    npm = _npm_cmd()
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True, check=True)
        subprocess.run([npm, "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        fail("Node.js 18+ não encontrado")
        print()
        print("  O frontend precisa de Node.js 18+ para o build.")
        print("  Baixe em: https://nodejs.org/ (versão LTS)")
        print()
        print("  Após instalar, execute novamente:")
        print("  → python start.py")
        sys.exit(1)
    ver = r.stdout.strip().lstrip("v")
    ver_parts = [int(x) for x in ver.split(".")[:2]]
    if ver_parts[0] < 18:
        fail(f"Node.js 18+ necessário (atual: v{ver})")
        print("  Baixe a versão LTS em: https://nodejs.org/")
        sys.exit(1)
    ok(f"Node.js v{ver}")


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
    for extra in ["public/sw.js", "vite.config.ts", "index.html"]:
        p = Path(FRONTEND) / extra
        if p.exists() and p.stat().st_mtime > dist_mtime:
            return True
    return False


def ensure_frontend(force=False):
    if is_bundled():
        return
    node_modules = FRONTEND / "node_modules"
    npm = _npm_cmd()
    if not node_modules.exists():
        info("node_modules não encontrado — npm install...")
        r = subprocess.run([npm, "install"], cwd=str(FRONTEND), capture_output=True, text=True)
        if r.returncode != 0:
            render_error(r.stderr)
            fail("npm install falhou")
            sys.exit(1)
        ok("npm install concluído")
    if force or precisa_rebuildar():
        info("Buildando frontend...")
        r = subprocess.run([npm, "run", "build"], cwd=str(FRONTEND), capture_output=True, text=True)
        if r.returncode != 0:
            render_error(r.stderr)
            fail("Build do frontend falhou")
            sys.exit(1)
        ok("Frontend buildado")
    else:
        ok("Frontend já atualizado")


def ensure_venv():
    if is_bundled():
        return
    if sys.prefix != sys.base_prefix:
        return
    if not VENV_DIR.exists():
        info("Criando ambiente virtual...")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True, text=True)
    venv_python = VENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    marker = VENV_DIR / ".mindflow_installed"
    if not marker.exists():
        info("Instalando dependências...")
        r = subprocess.run(
            [str(venv_python), "-m", "pip", "install", "-r", "requirements.txt"],
            cwd=str(BACKEND), capture_output=True, text=True,
        )
        if r.returncode != 0:
            render_error(r.stderr)
            fail("Falha ao instalar dependências")
            sys.exit(1)
        marker.write_text("", encoding="utf-8")
    info("Ativando ambiente virtual...")
    result = subprocess.run([str(venv_python)] + sys.argv, cwd=str(DATA_ROOT), text=True)
    sys.exit(result.returncode)


def check_cloud_sync():
    abspath = os.path.abspath(str(DB_PATH)).lower()
    keywords = ["onedrive", "dropbox", "icloud", "syncthing", "google drive", "box sync"]
    for kw in keywords:
        if kw in abspath:
            warn(f"Banco em pasta {kw.title()} — WAL desativado (evita corrupção)")
            os.environ["MFLOW_JOURNAL_MODE"] = "DELETE"
            return


def cold_backup():
    src = str(DB_PATH)
    if not os.path.exists(src):
        return
    try:
        from services.backup import cold_backup as _do_backup
        _do_backup(DB_PATH, BACKUP_DIR)
        ok(f"Backup salvo em {BACKUP_DIR}")
    except Exception as e:
        warn(f"Backup não realizado ({e})")


def ensure_first_run():
    if not is_bundled() or sys.platform != "win32":
        return
    shortcut = Path(os.environ["USERPROFILE"]) / "Desktop" / "MindFlow.lnk"
    if shortcut.exists():
        return
    exe_path = str(sys.executable)
    ico_path = str(CODE_ROOT / "assets" / "mindflow.ico")
    ps = f'''
$WS = New-Object -ComObject WScript.Shell
$SC = $WS.CreateShortcut("{shortcut}")
$SC.TargetPath = "{exe_path}"
$SC.WorkingDirectory = "{DATA_ROOT}"
$SC.IconLocation = "{ico_path}, 0"
$SC.Save()
'''
    try:
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, check=True, timeout=15)
        ok("Atalho criado na área de trabalho")
    except Exception as e:
        warn(f"Atalho não criado ({e})")


def start_server_dev(host: str, port: int):
    info(f"Servidor MindFlow em http://{host}:{port}")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", host, "--port", str(port), "--no-access-log", "--log-level", "warning"],
        cwd=str(BACKEND),
    )
    time.sleep(2)
    if proc.poll() is not None:
        fail("Servidor não iniciou. Verifique se a porta está livre.")
        sys.exit(1)
    return proc


def start_server_bundled(host: str, port: int):
    info(f"Servidor MindFlow em http://{host}:{port}")
    sys.path.insert(0, str(BACKEND))
    os.chdir(str(BACKEND))
    if is_bundled():
        os.environ["MFLOW_DB_PATH"] = str(DATA_ROOT / "backend" / "mindflow.db")
    import uvicorn
    if is_bundled():
        import main as _main  # noqa: F401 — força PyInstaller a incluir main + dependências
    config = uvicorn.Config("main:app", host=host, port=port, log_level="warning")
    server = uvicorn.Server(config=config)
    _main._uvicorn_server = server
    server.run()
    print(f"\n  {C.g}✓{C.n} Servidor encerrado com segurança. Até logo! \U0001F44B")
    input("   Pressione Enter para fechar... ")


def open_browser(port: int):
    try:
        url = f"http://localhost:{port}"
        webbrowser.open(url)
        ok(f"MindFlow \u2192 {url}")
    except Exception as e:
        warn(f"Não foi possível abrir o navegador ({e})")
        print(f"  Acesse: http://localhost:{port}")


def do_backup(host: str = "0.0.0.0", port: int = 8000):
    import json, urllib.request
    info("Exportando dados...")
    try:
        proc = start_server_dev(host, port)
        time.sleep(2)
        if proc.poll() is not None:
            fail("Servidor não iniciou para backup")
            return
        req = urllib.request.Request(f"http://localhost:{port}/api/export")
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        path = DATA_ROOT / f"mindflow-backup-{now}.json"
        with open(str(path), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        ok(f"Backup salvo em: {path}")
        total = sum(len(v) for v in data.values() if isinstance(v, list))
        tables = sum(1 for v in data.values() if isinstance(v, list))
        print(f"   {total} registros em {tables} tabelas")
    except Exception as e:
        fail(f"Backup falhou: {e}")
    finally:
        proc.terminate()
        proc.wait()


_DICAS = [
    "Ctrl+I captura qualquer ideia rapidamente",
    "Ctrl+K abre a paleta de comandos",
    "[[links]] conectam notas automaticamente",
    "Use tags para organizar por contexto",
    "O Pomodoro ajuda a manter o foco",
    "Dashboard mostra seu progresso do dia",
]


def dica_aleatoria() -> str:
    return random.choice(_DICAS)


def print_banner():
    slogan = "Seu segundo c\u00e9rebro est\u00e1 iniciando\u2026"
    w = max(len(slogan) + 4, 30)
    interior = f"  {C.c}MF{C.n}  {C.b}MindFlow v{VERSION}{C.n}"
    pad = w - len(f"  MF  MindFlow v{VERSION}")
    top = f" {C.c}\u250c{'─' * w}\u2510{C.n}"
    mid1 = f" {C.c}\u2502{C.n}{interior}{' ' * pad}{C.c}\u2502{C.n}"
    mid2 = f" {C.c}\u2502{C.n}  {slogan}  {C.c}\u2502{C.n}"
    bot = f" {C.c}\u2514{'─' * w}\u2518{C.n}"
    print(top)
    print(mid1)
    print(mid2)
    print(bot)
    print()


def main():
    parser = argparse.ArgumentParser(
        description="MindFlow — Seu segundo cérebro local-first, open-source e keyboard-driven"
    )
    parser.add_argument("--backup", action="store_true", help="Exportar dados para JSON e sair")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host do servidor (padrão: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Porta do servidor (padrão: 8000)")
    parser.add_argument("--force-rebuild", action="store_true", help="Forçar rebuild do frontend")
    parser.add_argument("--no-update", action="store_true", help="Pular verificação de atualização GitHub")
    args = parser.parse_args()
    explicit_port = any(a.startswith('--port') for a in sys.argv[1:])
    bundled = is_bundled()

    if sys.platform == "win32" and hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if sys.version_info < (3, 10):
        if bundled:
            fail(f"Python 3.10+ necessário (atual: {sys.version_info.major}.{sys.version_info.minor})")
            sys.exit(1)
        for candidate in [["py", "-3.14"], ["py", "-3.13"], ["py", "-3.12"], ["py", "-3.11"], ["py", "-3.10"], ["py", "-3"]]:
            try:
                r = subprocess.run([*candidate, "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"],
                    capture_output=True, text=True, timeout=5)
                if r.returncode == 0:
                    ver = r.stdout.strip()
                    major, minor = int(ver.split(".")[0]), int(ver.split(".")[1])
                    if (major, minor) >= (3, 10):
                        info(f"Redirecionando para Python {ver} ({candidate[0]} {candidate[1]})...")
                        result = subprocess.run([*candidate, str(Path(__file__).resolve())] + sys.argv[1:], cwd=str(DATA_ROOT), text=True)
                        sys.exit(result.returncode)
            except (subprocess.TimeoutExpired, OSError):
                continue
        fail(f"Python 3.10+ necessário (atual: {sys.version_info.major}.{sys.version_info.minor})")
        print("  Baixe em: https://python.org/downloads/")
        sys.exit(1)

    if not bundled:
        ensure_venv()

    if args.backup:
        if not bundled:
            install_backend_deps()
        port = resolve_port(args.port, explicit_port)
        do_backup(port)
        return

    print_banner()

    print(f"  {C.c}◈{C.n} 1/5 \u00b7 Ambiente")
    check_python()
    port = resolve_port(args.port, explicit_port)
    if port != args.port:
        warn(f"Usando porta {port} (a {args.port} estava ocupada)")
    print()

    if not bundled:
        print(f"  {C.c}◈{C.n} 2/5 \u00b7 Atualização")
        git_update(not args.no_update)
        print()

    print(f"  {C.c}◈{C.n} 3/5 \u00b7 Depend\u00eancias")
    if not bundled:
        install_backend_deps()
        ensure_pre_commit()
    alembic_upgrade()
    if not bundled:
        check_node()
        ensure_frontend(args.force_rebuild)
    print()

    print(f"  {C.c}◈{C.n} 4/5 \u00b7 Preparação")
    check_cloud_sync()
    cold_backup()
    if bundled:
        ensure_first_run()
    print()

    print(f"  {C.c}◈{C.n} 5/5 \u00b7 Servidor")

    if bundled:
        open_browser(port)
        print()
        try:
            db_rel = DB_PATH.relative_to(DATA_ROOT)
        except ValueError:
            db_rel = DB_PATH
        print(f" {C.c}{'─' * 37}{C.n}")
        ok(f"MindFlow v{VERSION} \u2014 no ar!")
        print(f"    \U0001F4CD http://localhost:{port}")
        print(f"    \U0001F4C1 {db_rel}")
        print(f"    \U0001F4A1 {dica_aleatoria()}")
        print(f"    \u2328  Ctrl+C para encerrar")
        print(f" {C.c}{'─' * 37}{C.n}")
        start_server_bundled(args.host, port)
    else:
        proc = start_server_dev(args.host, port)
        open_browser(port)
        print()
        print(f" {C.c}{'─' * 37}{C.n}")
        ok(f"MindFlow v{VERSION} \u2014 no ar!")
        print(f"    \U0001F4CD http://localhost:{port}")
        print(f"    \U0001F4C1 backend/mindflow.db")
        print(f"    \U0001F4A1 {dica_aleatoria()}")
        print(f"    \u2328  Ctrl+C para encerrar")
        print(f" {C.c}{'─' * 37}{C.n}")
        try:
            proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
            proc.wait()
        finally:
            print(f"\n  {C.g}✓{C.n} MindFlow encerrado. Até logo! \U0001F44B")
            input("\n   Pressione Enter para fechar... ")


if __name__ == "__main__":
    erro = False
    try:
        main()
    except SystemExit as e:
        erro = e.code != 0
        if erro:
            print(f"\n  ✗ Erro: código de saída {e.code}")
    except Exception:
        erro = True
        import traceback
        traceback.print_exc()
    if erro and sys.stdin.isatty():
        print("\n  Pressione Enter para fechar...")
        input()
