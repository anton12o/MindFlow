#!/usr/bin/env bash
set -euo pipefail

C_g="\033[32m" C_r="\033[31m" C_y="\033[33m" C_b="\033[1m" C_n="\033[0m"
ok()    { echo -e " ${C_g}✓${C_n} $1"; }
fail()  { echo -e " ${C_r}✗${C_n} $1"; exit 1; }
warn()  { echo -e " ${C_y}⚠${C_n} $1"; }
info()  { echo -e " ${C_b}▶${C_n} $1"; }

trap 'echo; ok "MindFlow encerrado. Até logo!"' EXIT INT TERM

DISTRO=""
if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO="$ID"
fi

auto_install() {
  local pkg="$1"
  info "Precisa de ${C_b}$pkg${C_n} — tentando instalar..."
  case "$DISTRO" in
    ubuntu|debian|pop|mint|zorin)
      sudo apt-get update -qq && sudo apt-get install -y -qq "$pkg" 2>/dev/null
      ;;
    fedora|centos|rhel)
      sudo dnf install -y "$pkg" 2>/dev/null
      ;;
    arch|manjaro|endeavour)
      sudo pacman -S --noconfirm "$pkg" 2>/dev/null
      ;;
    opensuse*|suse)
      sudo zypper install -y "$pkg" 2>/dev/null
      ;;
    *)
      fail "Nao sei instalar $pkg no $DISTRO. Instale manualmente e tente de novo."
      ;;
  esac
}

# ── Python ──────────────────────────────────────────────────
PYTHON=""
for cmd in python3.12 python3.11 python3.10 python3; do
  if command -v "$cmd" >/dev/null 2>&1; then
    PY_VER=$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    if [ "$(echo "$PY_VER" | cut -d. -f1)" -ge 3 ] && [ "$(echo "$PY_VER" | cut -d. -f2)" -ge 10 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  warn "Python 3.10+ nao encontrado"
  auto_install python3
  for cmd in python3.12 python3.11 python3.10 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
      PYTHON="$cmd"
      break
    fi
  done
  [ -z "$PYTHON" ] && fail "Python 3.10+ necessario. Instale manualmente."
  PY_VER=$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
fi

# ── python3-venv ────────────────────────────────────────────
if ! "$PYTHON" -c "import venv" 2>/dev/null; then
  auto_install python3-venv || auto_install python3-venv || \
    fail "python3-venv necessario. Rode: sudo apt install python3-venv"
fi

# ── Node.js ─────────────────────────────────────────────────
NODE_CMD=""
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  [ "$NODE_VER" -ge 18 ] && NODE_CMD="node"
fi

if [ -z "$NODE_CMD" ]; then
  warn "Node.js 18+ nao encontrado"
  case "$DISTRO" in
    ubuntu|debian|pop|mint|zorin)
      info "Instalando via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null
      sudo apt-get install -y -qq nodejs 2>/dev/null
      ;;
    fedora|centos|rhel)
      auto_install nodejs
      ;;
    arch|manjaro|endeavour)
      auto_install nodejs
      ;;
    *)
      fail "Instale Node.js 18+ manualmente: https://nodejs.org"
      ;;
  esac
  if command -v node >/dev/null 2>&1; then
    NODE_CMD="node"
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  fi
fi

# ── Ambiente otimizado para PC fraco ────────────────────────
export PYTHONDONTWRITEBYTECODE=1
export PYTHONOPTIMIZE=1
export NODE_OPTIONS="--max-old-space-size=512"

# ── Modo --update ───────────────────────────────────────────
if [ "${1:-}" = "--update" ]; then
  info "Atualizacao..."
  if command -v git >/dev/null 2>&1 && [ -d .git ]; then
    git pull --ff-only 2>&1 || warn "git pull falhou"
  fi
  cd "$(dirname "$0")"
  "$PYTHON" -m pip install -r backend/requirements.txt -q 2>/dev/null || true
  cd frontend
  npm install --silent 2>/dev/null && npm run build 2>&1 || fail "Build do frontend falhou"
  cd ..
  echo ""
fi

# ── Startup ── delega pro start.py ──────────────────────────
cd "$(dirname "$0")"
ok "Python $PY_VER ($PYTHON), Node $(node -v 2>/dev/null || echo '---')"
[ "${1:-}" != "--update" ] && info "Para atualizar: $0 --update"
echo

exec "$PYTHON" start.py --no-update 2>&1
