# ADR-003: Monolito com start.py

**Status:** Aceito

**Contexto:** MindFlow tem backend (FastAPI + SQLite) e frontend (Vite + React).
Precisávamos de uma forma simples de iniciar tudo: instalar deps, buildar o
frontend, subir o servidor e abrir o navegador. Opções: Docker, scripts
separados, ou um script único.

**Decisão:** `start.py` — script único que:
1. Instala dependências Python (pip install -r requirements.txt)
2. Instala dependências Node (npm install)
3. Builda o frontend (tsc + vite build)
4. Sobe uvicorn servindo o frontend como static file
5. Abre o navegador em `localhost:8000`

**Consequências:**
- + Deploy = `python start.py` (ou `MindFlow.bat` no Windows)
- + Sem Docker, sem docker-compose, sem configurar proxy reverso
- + Fallback automático de porta (8000, 8001, 8002...)
- + `--port` explícito quando necessário
- - `start.py` tem 344 linhas — faz administração do sistema (venv, git hooks)
  além de subir o app. Se crescer demais, extrair para módulos separados.
- - Windows: execution policy bloqueia `.ps1`, usar `.bat` como bootstrap.
