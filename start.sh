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
  if ! sudo -n apt-get update -qq 2>/dev/null; then
    echo ""
    warn "Instalacao automatica requer sudo sem senha."
    echo "  Rode manualmente: sudo apt install $pkg"
    echo "  Depois execute ./start.sh novamente."
    return 1
  fi
  case "$DISTRO" in
    ubuntu|debian|pop|mint|zorin)
      sudo -n apt-get install -y -qq "$pkg" 2>/dev/null
      return $?
      ;;
    fedora|centos|rhel)
      sudo -n dnf install -y "$pkg" 2>/dev/null
      return $?
      ;;
    arch|manjaro|endeavour)
      sudo -n pacman -S --noconfirm "$pkg" 2>/dev/null
      return $?
      ;;
    opensuse*|suse)
      sudo -n zypper install -y "$pkg" 2>/dev/null
      return $?
      ;;
    *)
      fail "Nao sei instalar $pkg no $DISTRO. Instale manualmente e tente de novo."
      ;;
  esac
}

# ── Python ──────────────────────────────────────────────────
PYTHON=""
for cmd in python3 python3.12 python3.11 python3.10; do
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
  for cmd in python3 python3.12 python3.11 python3.10; do
    if command -v "$cmd" >/dev/null 2>&1; then
      PYTHON="$cmd"
      break
    fi
  done
  [ -z "$PYTHON" ] && fail "Python 3.10+ necessario. Instale manualmente."
  PY_VER=$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
fi

# ── python3-venv ────────────────────────────────────────────
VENV_PKG="python3-venv"
PY_VER=$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
if ! "$PYTHON" -c "import venv" 2>/dev/null; then
  auto_install "$VENV_PKG" || auto_install "$VENV_PKG" || \
    fail "$VENV_PKG necessario. Rode: sudo apt install $VENV_PKG"
fi
# ensurepip pode vir em pacote separado (Debian/Ubuntu)
if ! "$PYTHON" -c "import ensurepip" 2>/dev/null; then
  VENV_VER="${VENV_PKG}-${PY_VER}"
  info "ensurepip nao disponivel — tentando $VENV_VER..."
  auto_install "$VENV_VER" || auto_install "$VENV_VER" || \
    fail "Rode: sudo apt install ${VENV_VER}"
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
      if ! sudo -n apt-get install -y -qq nodejs 2>/dev/null; then
        echo ""
        info "Node.js pode ser instalado manualmente:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash"
        echo "  sudo apt install -y nodejs"
        echo "  Depois execute ./start.sh novamente."
      fi
      ;;
    fedora|centos|rhel)
      auto_install nodejs
      ;;
    arch|manjaro|endeavour)
      auto_install nodejs
      ;;
    *)
      fail "Instale Node.js 18+ manualmente: https://nodejs.org"
      echo "  Depois execute ./start.sh novamente."
      ;;
  esac
  if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -ge 18 ]; then
      NODE_CMD="node"
    fi
  fi
  if [ -z "$NODE_CMD" ]; then
    warn "Node.js 18+ ainda nao disponivel."
    echo "  Instale manualmente e execute ./start.sh novamente."
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
