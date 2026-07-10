import re
import sys

TIPOS = {
    "fix", "feat", "refactor", "docs", "build", "release", "test", "chore",
}

MAX_CHARS = 80

def main():
    msg_path = sys.argv[1]
    with open(msg_path, encoding="utf-8-sig") as f:
        msg = f.read().strip()

    if not msg:
        print("ERRO: Mensagem de commit vazia.", file=sys.stderr)
        sys.exit(1)

    if len(msg) > MAX_CHARS:
        print(f"ERRO: Mensagem muito longa ({len(msg)} caracteres, max {MAX_CHARS}).", file=sys.stderr)
        sys.exit(1)

    # first line only for type validation
    primeira = msg.split("\n")[0]
    padrao = rf"^({'|'.join(TIPOS)})(\(.+\))?: .+"
    if not re.match(padrao, primeira):
        tipos_str = ", ".join(sorted(TIPOS))
        print(f"ERRO: Mensagem nao segue o padrao 'tipo: descricao'.", file=sys.stderr)
        print(f"Tipos validos: {tipos_str}", file=sys.stderr)
        print(f"Exemplo: fix: corrige validacao de data no DELETE /sessoes", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
