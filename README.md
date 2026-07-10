# MindFlow 🧠

[![CI](https://github.com/anton12o/MindFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/anton12o/MindFlow/actions/workflows/ci.yml)

**Seu segundo cérebro local-first.** Notas, tarefas, hábitos, pomodoro, flashcards — tudo offline, tudo seu.

> Inspirado por Anytype, Obsidian e TickTick.

---

## Diferenciais

- **Local-first:** SQLite local. Zero nuvem. Zero dependência externa.
- **Keyboard-driven:** Ctrl+K (paleta), Ctrl+I (captura), `/` (comandos no editor), atalhos customizáveis
- **Wikilinks + Grafo:** `[[links]]` conectam notas automaticamente + grafo interativo Fruchterman–Reingold
- **PWA:** instalável como app nativo com service worker + cache offline
- **Tudo em um:** Dashboard, Rotina, Pomodoro, Notas, Flashcards, Hábitos, Insights, Consultas — integrados

---

## ✨ Funcionalidades

### 📥 Captura & Notas

| Módulo | Descrição |
|--------|-----------|
| **Inbox** | Captura rápida com `Ctrl+I` — solte ideias sem interromper o fluxo |
| **Ideias** | Editor CodeMirror 6 (Markdown), `[[wikilinks]]`, backlinks, autocomplete, tooltip preview, grafo, tags, pastas, abas múltiplas, auto-save, modo leitura |
| **Templates** | Modelos com placeholders (`{{date}}`, `{{title}}`) — locais (localStorage) ou do servidor |
| **Anexos** | Upload de imagens/arquivos com inserção automática de Markdown |
| **RenderConteudo** | Markdown + Mermaid + tabelas inline (`{{tabela\|...}}`) + gráficos SVG (barra/linha/pizza) + LaTeX (KaTeX) |

### ⏱️ Produtividade

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Métricas principais (notas, tarefas, flashcards, sessões), cards de bloco/tarefas/inbox/leitura, diário automático |
| **Rotina** | Blocos de tempo + tarefas diárias + calendário semanal com drag-and-drop + intenção diária |
| **Pomodoro** | Timer personalizável (foco/pausa curta/pausa longa), ciclo automático, modo livre, alarme sonoro 3-beep, nota de resumo, sync entre abas |
| **Hábitos** | Rastreamento binário ou quantitativo com streaks + calendário mensal + registro em lote |

### 🧠 Revisão & Aprendizado

| Módulo | Descrição |
|--------|-----------|
| **Flashcards** | Repetição espaçada (SM-2) para revisão ativa |
| **Revisão** | Revisão periódica (diária/semanal/mensal) com template automático de métricas |
| **Insights** | Calendário heatmap multi-métrica, evolução semanal, gráficos, streak de leitura |
| **Grafo** | Visualização interativa das conexões entre notas (algoritmo Fruchterman–Reingold custom, 120 iterações) |
| **Notas Relacionadas** | Recomendação TF-IDF + overlap de tags no editor |

### 🔧 Infra & Customização

| Módulo | Descrição |
|--------|-----------|
| **Tipos** | Sistema de tipos customizável (inspirado Anytype) com ícones e cores |
| **Consultas** | Visualizações dinâmicas (grid, kanban, lista, galeria, formulário, calendário, gantt) com SQL salvo |
| **Config** | Fonte (família/tamanho), zoom, auto-save, visibilidade de seções da sidebar, atalhos customizáveis, backup/vacuum |
| **Tema** | Claro / escuro / sistema com toggle na sidebar |
| **Propriedades** | Dados estruturados (JSON) dentro de notas |
| **Export/Import** | JSON completo com todas as tabelas + `.mindflow` portátil + CSV + import com upsert e rollback |
| **Filtros Salvos** | Persiste combinações de busca + data + pasta + tags + ordenação |
| **PWA** | Instalável como aplicativo nativo, cache offline de assets, notificação de atualização do Service Worker |

---

## 🚀 Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Vite 8 + React 19 + TypeScript + Tailwind v4 (`@theme`) |
| **Backend** | Python 3.12+ + FastAPI + SQLModel + Alembic |
| **Banco** | SQLite (WAL + FTS5 full-text search) |
| **Editor** | CodeMirror 6 (Markdown + Python + JavaScript + SQL) |
| **Grafo** | Algoritmo custom Fruchterman–Reingold (120 iterações) |
| **Diagramas** | Mermaid + SVG inline (barras/linhas/pizza) |
| **Cache** | TanStack React Query (frontend) + TTLCache (backend) |
| **Sanitização** | DOMPurify |
| **Ícones** | Lucide React |
| **Testes** | Vitest (frontend) + pytest (backend) + Playwright (E2E) |
| **CI/CD** | GitHub Actions (lint + testes + build + release automático) |

---

## 📦 Pré-requisitos

- **Python** 3.12+ (`pip` incluso)
- **Git** 2.x+ (recomendado para auto-update, opcional se baixar o ZIP)
- **Node.js** 18+ e npm (apenas no primeiro build; depois o frontend é servido como estático)

> No Windows, use o **Python Launcher** (`py`) se `python` não estiver no PATH:
> ```powershell
> py -3.12 start.py
> ```

---

## 🛠️ Instalação e Execução

### 1. Clone e entre no repositório

```bash
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow
```

> Sem Git? Baixe o ZIP da [última release](https://github.com/anton12o/MindFlow/releases) e extraia.

### 2. Inicie com um comando (modo produção)

```bash
python start.py
```

O `start.py` faz tudo automaticamente:
1. Cria um ambiente virtual Python isolado (`venv/`)
2. Instala as dependências do backend (`pip install -r requirements.txt`)
3. Builda o frontend (apenas na primeira execução)
4. Roda as migrações do banco via Alembic
5. Sobe o servidor FastAPI
6. Abre o navegador em `http://localhost:8000`

Se a porta 8000 estiver ocupada, tenta 8001, 8002... automaticamente.
Porta personalizada: `python start.py --port 3000`

### 3. Modo desenvolvimento (hot-reload)

```bash
# Terminal 1 — Backend
cd backend
. venv/Scripts/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt   # apenas na primeira vez
alembic upgrade head               # criar/atualizar o banco
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install                        # apenas na primeira vez
npm run dev
```

Acesse **http://localhost:5173** (frontend dev, com hot-reload) ou **http://localhost:8000** (produção).

> Após o primeiro build com `start.py` ou `npm run dev`, Node.js não é mais necessário para rodar o app em produção.
> O frontend compilado fica em `frontend/dist/` e é servido pelo FastAPI.

### Windows — executável portátil

Se preferir um `.exe` sem dependências:

```bash
python build_exe.py    # compila MindFlow.exe (~40 MB) em dist/
# ou baixe o .exe pronto na página de releases
```

---

## ⌨️ Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+K` | Paleta de comandos |
| `Ctrl+I` | Captura rápida (Inbox) |
| `/` (no editor) | Menu de comandos |
| `[[título]]` | Criar wikilink para outra nota |
| `Ctrl+Enter` | Salvar nota |
| `Ctrl+Shift+F` | Modo Foco (zen) |
| Atalhos customizáveis | Config → Atalhos |

---

## 🧪 Testes

```bash
# Backend — pytest (~200 testes, 15 arquivos)
cd backend && python -m pytest -q

# Lint — ruff
cd backend && ruff check .

# Frontend — vitest (356 testes, 35 arquivos)
cd frontend && npx vitest run

# TypeScript
cd frontend && node node_modules/typescript/bin/tsc --noEmit

# Build produção
cd frontend && node node_modules/typescript/bin/tsc -b && npx vite build

# E2E — Playwright (29 testes, 4 specs)
cd frontend && npx playwright test
```

---

## 🗂️ Estrutura

```
mindflow/
├── start.py                 # Entry point único (produção)
├── build_exe.py             # Compila .exe portátil via PyInstaller
├── backend/
│   ├── main.py              # FastAPI + startup/shutdown
│   ├── models.py            # 15+ tabelas SQLModel
│   ├── database.py          # SQLite + WAL + FTS5 + PRAGMA
│   ├── routers/             # 15 routers (~77 endpoints)
│   │   ├── notas.py         # Notas, pastas, tags, templates, wikilinks, grafo
│   │   ├── rotina.py        # Blocos + tarefas + reorder
│   │   ├── habitos.py       # Hábitos + registros + batch
│   │   ├── pomodoro.py      # Sessões + finalizar
│   │   ├── flashcards.py    # CRUD + revisão SM-2
│   │   ├── inbox.py         # CRUD + archive em lote
│   │   ├── tipos.py         # Tipos de objeto
│   │   ├── queries.py       # Consultas dinâmicas + executar
│   │   ├── stats.py         # Dashboard, heatmap, weekly, leitura
│   │   ├── search.py        # Busca global FTS5
│   │   ├── shutdown.py      # Backup, vacuum, shutdown
│   │   ├── export.py        # Export JSON/CSV
│   │   ├── import_data.py   # Import com upsert + rollback
│   │   ├── logs.py          # Logs de erro
│   │   └── common.py        # Helpers compartilhados
│   ├── services/            # 7 serviços
│   │   ├── notes.py         # Wikilinks, resumo, cleanup
│   │   ├── backup.py        # cold_backup thread-safe
│   │   ├── templates.py     # Render com placeholders
│   │   ├── frontmatter.py   # Extrair/injetar YAML
│   │   ├── metadata_index.py# Índice em memória
│   │   ├── spaced_repetition.py  # Algoritmo SM-2
│   │   └── estatisticas.py  # Cálculos de streak
│   ├── migrations/          # 19 migrações Alembic
│   └── tests/               # 15 test files
├── frontend/
│   ├── src/
│   │   ├── pages/           # 12 páginas
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Rotina.tsx   # Blocos + tarefas + intenção
│   │   │   ├── Pomodoro.tsx
│   │   │   ├── Ideias.tsx   # Lista virtual + abas + toolbar
│   │   │   ├── Flashcards.tsx
│   │   │   ├── Habitos.tsx
│   │   │   ├── Revisao.tsx  # Revisão periódica
│   │   │   ├── Insights.tsx # Heatmap + evolução
│   │   │   ├── Consultas.tsx# Grid/kanban/gantt/calendário
│   │   │   ├── Tipos.tsx
│   │   │   ├── Config.tsx   # Fonte, zoom, auto-save, atalhos
│   │   │   └── RevisaoSemanal.tsx
│   │   ├── components/      # 25 componentes
│   │   │   ├── Sidebar.tsx  # Navegação + tema + inbox + redimensionável
│   │   │   ├── IdeiasEditor.tsx  # CodeMirror + auto-save + wikilinks
│   │   │   ├── RenderConteudo.tsx# Markdown + Mermaid + KaTeX + gráficos
│   │   │   ├── GrafoNotas.tsx    # Fruchterman–Reingold custom
│   │   │   ├── PomodoroTimer.tsx # Timer + alarme + estados
│   │   │   ├── CommandPalette.tsx# Ctrl+K
│   │   │   ├── InboxModal.tsx
│   │   │   └── ... (TabBar, TourModal, ConfirmModal, etc.)
│   │   ├── api/             # 17 clientes HTTP
│   │   ├── store/           # 5 stores (tema, pomodoro, notificação, config, atalhos)
│   │   ├── hooks/           # 12 hooks (useDebounce, useFocusTrap, useTabState...)
│   │   └── types/           # Interfaces TypeScript
│   ├── e2e/                 # 4 specs Playwright (29 testes)
│   └── package.json
├── docs/
│   ├── adr/                 # Decisões arquiteturais (SQLModel, local-first, monolito)
│   ├── memoria/             # Estado quente + erros resolvidos
│   ├── session/             # Histórico de sessões
│   └── workflow/            # Kanban + XP Lite
└── scripts/                 # check_all.py, smoke_test.py, validate_bat...
```

---

## 🧪 APIs (selecionadas)

### Notas e Ideias
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/notas?q=...` | Lista notas (busca FTS5, filtro por data/tags/pasta) |
| `POST` | `/api/notas` | Cria nota |
| `GET` | `/api/notas/{id}/conexoes` | Backlinks da nota |
| `GET` | `/api/notas/{id}/relacionadas` | Notas relacionadas (TF-IDF + tags) |
| `GET` | `/api/notas/{id}/export/md` | Export Markdown com frontmatter YAML |
| `GET` | `/api/notas/grafo` | Dados do grafo de conhecimento |
| `POST` | `/api/notas/from-wikilink` | Cria nota a partir de wikilink (com verificação de conflito) |
| `POST` | `/api/notas/batch/delete` | Exclui múltiplas notas |
| `GET/POST/DELETE` | `/api/notas/pastas` | CRUD de pastas |
| `GET/POST/DELETE` | `/api/notas/tags` | CRUD de tags (`/merge` para unificar) |
| `POST` | `/api/notas/templates/{id}/aplicar` | Aplica template com placeholders |

### Rotina, Pomodoro e Hábitos
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET/POST` | `/api/rotina/blocos` | Blocos de tempo do dia |
| `GET/POST` | `/api/rotina/tarefas` | Tarefas do dia |
| `PATCH` | `/api/rotina/tarefas/reorder` | Reordenar tarefas |
| `POST` | `/api/pomodoro/sessoes` | Criar sessão pomodoro |
| `POST` | `/api/habitos/registros/batch` | Registrar múltiplos hábitos de uma vez |

### Flashcards e Revisão
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/flashcards/review` | Flashcards pendentes de revisão (SM-2) |
| `POST` | `/api/flashcards/{id}/review` | Submeter resultado da revisão |

### Dashboard e Estatísticas
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/stats/dashboard` | Métricas do dashboard |
| `GET` | `/api/stats/heatmap` | Dados do calendário heatmap |
| `GET` | `/api/stats/weekly` | Score semanal + comparativo |

### Infra
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/search?q=...` | Busca global (FTS5 — notas, tarefas, flashcards) |
| `POST` | `/api/db/backup` | Cria backup do banco |
| `GET` | `/api/db/backups` | Lista backups disponíveis |
| `POST` | `/api/db/vacuum` | Compacta o banco |
| `GET` | `/api/export` | Export completo em JSON |
| `POST` | `/api/import` | Import com upsert e rollback |
| `POST` | `/api/queries/{id}/executar` | Executa consulta salva |

---

## 📖 Documentação

- [Decisões Arquiteturais (ADR)](docs/adr/) — SQLModel, local-first, monolito com start.py
- [Workflow](docs/workflow/WORKFLOW.md) — Kanban + XP Lite + Lean
- [Contributing](CONTRIBUTING.md)
- [Segurança](SECURITY.md)
- [Licença](LICENSE)

---

## 🛠️ Desenvolvimento

```bash
pip install pre-commit && pre-commit install  # hooks: ruff (lint) + pytest (testes)
python start.py                                # sobe o app completo
```

Antes de enviar um PR, certifique-se de que:

1. `ruff check .` — zero erros no backend
2. `python -m pytest -q` — ~200 testes passando
3. `npx vitest run` — 356 testes passando no frontend
4. `node node_modules/typescript/bin/tsc --noEmit` — zero erros
5. `node node_modules/typescript/bin/tsc -b && npx vite build` — build limpo
6. `npx playwright test` — 29 testes E2E passando

---

## 📄 Licença

MIT
