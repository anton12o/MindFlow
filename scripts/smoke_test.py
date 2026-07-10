"""Smoke test do backend MindFlow via REST.

Uso:
    python scripts/smoke_test.py                          # usa porta 8000
    python scripts/smoke_test.py --port 8765               # porta customizada

Inicia servidor com banco :memory:, executa verificacoes,
encerra servidor. Exit code 0 se tudo ok, 1 se falhou.
"""
import os
import sys
import time
import json
import urllib.request
import urllib.error
import subprocess
import tempfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND = os.path.join(ROOT, "backend")
PASS = 0
FAIL = 1


def find_free_port(start=9000, end=9100):
    for port in range(start, end):
        import socket as _sock
        with _sock.socket(_sock.AF_INET, _sock.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return 9999

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass


def log_ok(msg):
    print(f"  OK  {msg}", flush=True)


def log_fail(msg):
    print(f"  FAIL {msg}", flush=True)


def request(method, path, body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode()
            status = resp.status
            return status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        return 0, str(e)


def test_health():
    status, data = request("GET", "/api/health")
    if status == 200:
        log_ok("GET /api/health -> 200")
        return PASS
    log_fail(f"GET /api/health -> {status}")
    return FAIL


def test_create_nota():
    status, data = request("POST", "/api/notas", {"titulo": "Teste smoke", "conteudo": "teste"})
    if status == 200 and data and data.get("id"):
        log_ok(f"POST /api/notas -> 200, id={data['id']}")
        return PASS, data["id"]
    log_fail(f"POST /api/notas -> {status}")
    return FAIL, None


def test_list_notas():
    status, data = request("GET", "/api/notas")
    if status == 200 and isinstance(data, list):
        log_ok(f"GET /api/notas -> 200, {len(data)} notas")
        return PASS
    log_fail(f"GET /api/notas -> {status}")
    return FAIL


def test_search():
    status, data = request("GET", "/api/search?q=teste")
    if status == 200:
        log_ok("GET /api/search?q=teste -> 200")
        return PASS
    log_fail(f"GET /api/search?q=teste -> {status}")
    return FAIL


def test_create_habito():
    status, data = request("POST", "/api/habitos", {"nome": "Teste", "tipo": "binario"})
    if status == 200 and data and data.get("id"):
        log_ok(f"POST /api/habitos -> 200, id={data['id']}")
        return PASS, data["id"]
    log_fail(f"POST /api/habitos -> {status}")
    return FAIL, None


def test_get_tipos():
    status, data = request("GET", "/api/tipos")
    if status == 200:
        log_ok("GET /api/tipos -> 200")
        return PASS
    log_fail(f"GET /api/tipos -> {status}")
    return FAIL


def test_nota_404():
    status, _ = request("GET", "/api/notas/99999")
    if status == 404:
        log_ok("GET /api/notas/99999 -> 404 (esperado)")
        return PASS
    log_fail(f"GET /api/notas/99999 -> {status} (esperava 404)")
    return FAIL


def test_flashcard_fk_404():
    status, _ = request("POST", "/api/flashcards/99999/review", {"qualidade": 3})
    if status == 404:
        log_ok("POST /api/flashcards/99999/review -> 404 (FK esperado)")
        return PASS
    log_fail(f"POST /api/flashcards/99999/review -> {status} (esperava 404)")
    return FAIL


def start_server():
    """Inicia servidor com banco SQLite vazio (Alembic cria as tabelas)."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    # Banco vazio — Alembic vai criar tabelas via run_migrations()

    env = os.environ.copy()
    env["MFLOW_DB_PATH"] = db_path

    # Tenta usar python do venv se existir
    venv_python = os.path.join(ROOT, "venv", "Scripts", "python.exe")
    python_exe = venv_python if os.path.exists(venv_python) else sys.executable

    err_fd, err_path = tempfile.mkstemp(suffix=".log")
    os.close(err_fd)
    err_file = open(err_path, "w")

    proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "main:app",
         "--host", "127.0.0.1", "--port", str(PORT),
         "--log-level", "error"],
        cwd=BACKEND,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=err_file,
    )
    err_file.close()

    time.sleep(5)
    return proc, db_path, err_path


def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            pass
    import argparse
    parser = argparse.ArgumentParser(description="Smoke test do backend MindFlow")
    parser.add_argument("--port", type=int, default=0,
                        help="Porta (0 = auto, padrao)")
    args = parser.parse_args()

    global PORT, BASE
    PORT = args.port if args.port != 0 else find_free_port()
    BASE = f"http://localhost:{PORT}"

    print()
    print("=" * 60)
    print("  MindFlow — Smoke Test")
    print("=" * 60)
    print()

    print("  Iniciando servidor com banco :memory:...", end=" ", flush=True)
    proc, db_path, err_path = start_server()
    print("OK")

    if proc.poll() is not None:
        print("  FAIL Servidor nao iniciou.")
        try:
            with open(err_path, encoding="utf-8", errors="replace") as f:
                err = f.read().strip()
            if err:
                sanitized = err[:2000].encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
                print(f"  stderr: {sanitized}")
        except OSError:
            pass
        return FAIL

    tests = [
        ("health", test_health),
        ("criar nota", test_create_nota),
        ("listar notas", test_list_notas),
        ("busca", test_search),
        ("criar habito", test_create_habito),
        ("tipos", test_get_tipos),
        ("nota 404", test_nota_404),
        ("flashcard FK 404", test_flashcard_fk_404),
    ]

    passed = 0
    failed = 0

    for name, fn in tests:
        result = fn()
        if result == PASS or (isinstance(result, tuple) and result[0] == PASS):
            passed += 1
        else:
            failed += 1

    proc.terminate()
    proc.wait()
    for p in [db_path, err_path]:
        try:
            os.remove(p)
        except OSError:
            pass

    print()
    print(f"  Resultado: {passed} passaram, {failed} falharam")
    print()

    if failed == 0:
        print("  Smoke test concluido com sucesso!")
        print()
        return PASS
    else:
        print(f"  {failed} teste(s) falharam.")
        print()
        return FAIL


if __name__ == "__main__":
    sys.exit(main())
