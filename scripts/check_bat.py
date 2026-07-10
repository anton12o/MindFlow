"""Valida scripts .bat do MindFlow."""
import os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
FILES = ["start.bat", "MindFlow.bat"]
EXIT_CODE = 0

print()
print("[check_bat] Validando scripts .bat do projeto...")
print()

for f in FILES:
    path = os.path.join(ROOT, f)
    if not os.path.exists(path):
        print(f"[check_bat]  !  {f} — arquivo nao encontrado")
        EXIT_CODE = 1
        continue

    with open(path, encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()

    troubles = []
    in_block = False

    for i, line in enumerate(lines, 1):
        raw = line.rstrip("\n\r")
        stripped = raw.strip()
        if not stripped or stripped.startswith("::"):
            continue

        # detecta abertura de bloco if ( ... )
        if re.search(r"\bif\b.*\(", stripped, re.I):
            in_block = True

        # echo com parenteses literal tipo (Node.js) dentro de bloco if
        if in_block and re.match(r"echo\b", stripped, re.I):
            # procura parenteses com conteudo alfanumerico simples
            if re.search(r"\([A-Za-z0-9._-]+\)", stripped):
                troubles.append((i, "echo com parenteses em bloco if (causa 'nao foi esperado')"))

        # pause && exit na mesma linha
        if re.search(r"pause\s*&&\s*exit\b", stripped, re.I):
            troubles.append((i, "pause && exit na mesma linha"))

        # exit /b sem codigo (so whitespace depois)
        if re.search(r"exit /b\s*$", stripped, re.I):
            troubles.append((i, "exit /b sem codigo de erro"))

        # fecha bloco
        if stripped.endswith(")"):
            in_block = False

    if troubles:
        for lineno, msg in troubles:
            print(f"[check_bat] ~ {f}:{lineno} {msg}")
        EXIT_CODE = 1
    else:
        print(f"[check_bat]  v {f} ok")

print()
if EXIT_CODE == 0:
    print("[check_bat]  v Todos os scripts .bat parecem ok.")
else:
    print("[check_bat]  ! Foram encontrados problemas nos .bat.")
    print("[check_bat]    Corrija e rode novamente.")

sys.exit(EXIT_CODE)
