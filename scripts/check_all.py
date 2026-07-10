"""Runner consolidado: executa verificacoes em ordem e para no primeiro erro.

Uso:
    python scripts/check_all.py              # executa todas as etapas
    python scripts/check_all.py --skip-lint  # pula lint (debug rapido)
    python scripts/check_all.py --skip-build # pula build final

Saida: mostra contexto do erro (arquivo:linha) quando falha.
Exit code: 0 se tudo passou, 1 se alguma etapa falhou.
"""
import os
import sys
import subprocess
import re

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")
PASS = 0
FAIL = 1

steps = []

def step(nome, cwd, cmd, skip_if=None, parse_error=None):
    steps.append((nome, cwd, cmd, skip_if, parse_error))


# ---- Definicao das etapas (ordem importa) ----
step("ruff (backend lint)", BACKEND, ["python", "-m", "ruff", "check", "."])
step("pytest (backend)", BACKEND, ["python", "-m", "pytest", "-q"])
step("tsc --noEmit (frontend typecheck)", FRONTEND,
     ["node", "node_modules/typescript/bin/tsc", "--noEmit"],
     parse_error=r"(?P<file>.+?)\((?P<line>\d+),(?P<col>\d+)\):\s+error\s+(?P<code>\w+\d+):\s+(?P<msg>.+)")
step("vitest (frontend tests)", FRONTEND,
     ["npx", "vitest", "run"],
     parse_error=r"FAIL\s+(?P<file>.+?\.test\.[jt]sx?)\s+>\s+(?P<msg>.+)")
step("vite build (frontend build)", FRONTEND,
     ["node", "node_modules/typescript/bin/tsc", "-b"],
     parse_error=r"(?P<file>.+?)\((?P<line>\d+),(?P<col>\d+)\):\s+error\s+(?P<code>\w+\d+):\s+(?P<msg>.+)")


def parse_ts_error(line, pattern):
    m = re.match(pattern, line)
    if not m:
        return None
    groups = m.groupdict()
    file = groups.get("file", "")
    line_no = groups.get("line", "")
    col = groups.get("col", "")
    code = groups.get("code", "")
    msg = groups.get("msg", "")
    full_path = os.path.join(FRONTEND, file) if not os.path.isabs(file) else file
    return full_path, line_no, col, code, msg


def show_context(full_path, line_no_str):
    try:
        line_no = int(line_no_str)
        with open(full_path, encoding="utf-8") as f:
            lines = f.readlines()
        start = max(0, line_no - 4)
        end = min(len(lines), line_no + 3)
        print()
        print(f"  {full_path}:{line_no}")
        print()
        for i in range(start, end):
            prefix = ">>" if i + 1 == line_no else "  "
            print(f"  {prefix} {i+1}: {lines[i].rstrip()}")
        print()
    except (OSError, ValueError):
        pass


def main():
    args = set(sys.argv[1:])
    skip_lint = "--skip-lint" in args
    skip_build = "--skip-build" in args
    skip_tests = "--skip-tests" in args

    print()
    print("=" * 60)
    print("  MindFlow — Consolidated Check Runner")
    print("=" * 60)
    print()

    for nome, cwd, cmd, skip_if, parse_error in steps:
        if skip_if == "linte" and skip_lint:
            print(f"[skip] {nome}")
            continue
        if skip_if == "build" and skip_build:
            print(f"[skip] {nome}")
            continue
        if skip_if == "test" and skip_tests:
            print(f"[skip] {nome}")
            continue

        print(f"[check] {nome}...", end=" ", flush=True)

        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            shell=(os.name == "nt"),
        )

        if result.returncode == 0:
            print("OK")
            continue

        print("FALHOU")
        print()
        print(f"  {'=' * 56}")
        print(f"  Saida (stderr):")
        print(f"  {'=' * 56}")

        stderr_lines = result.stderr.strip().split("\n") if result.stderr else []
        stdout_lines = result.stdout.strip().split("\n") if result.stdout else []
        all_lines = stderr_lines + stdout_lines

        for line in all_lines[:60]:
            print(f"  {line.rstrip()}")

        if len(all_lines) > 60:
            print(f"  ... (mais {len(all_lines) - 60} linhas truncadas)")

        # Parse de erro (mostra contexto ao redor)
        if parse_error:
            for line in all_lines:
                parsed = parse_ts_error(line, parse_error)
                if parsed:
                    full_path, line_no, col, code, msg = parsed
                    if os.path.exists(full_path):
                        show_context(full_path, line_no)
                        break

        print()
        print(f"[FALHA] {nome} — abortando.")
        print("  Para pular esta etapa:")
        if "lint" in nome.lower():
            print("    python scripts/check_all.py --skip-lint")
        elif "test" in nome.lower():
            print("    python scripts/check_all.py --skip-tests")
        elif "build" in nome.lower():
            print("    python scripts/check_all.py --skip-build")
        sys.exit(FAIL)

    print()
    print("=" * 60)
    print("  Todas as verificacoes passaram!")
    print("=" * 60)
    print()
    sys.exit(PASS)


if __name__ == "__main__":
    main()
