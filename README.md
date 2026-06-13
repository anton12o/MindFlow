# MindFlow 🧠

[![CI](https://github.com/anton12o/MindFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/anton12o/MindFlow/actions/workflows/ci.yml)

**Seu segundo cérebro local-first, open-source e keyboard-driven.**

MindFlow é um aplicativo de produtividade pessoal que combina notas, tarefas, hábitos, pomodoro e flashcards em um só lugar — com tudo armazenado localmente no seu computador.

> Inspirado por Anytype, Obsidian e TickTick.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 📥 **Inbox** | Captura rápida com Ctrl+I — solte ideias sem interromper o fluxo |
| ○ **Rotina** | Blocos de tempo + tarefas diárias + calendário semanal com drag-and-drop |
| ☰ **Hábitos** | Rastreamento binário ou quantitativo com streaks + calendário mensal |
| ◷ **Pomodoro** | Timer personalizável (foco/pausa curta/pausa longa), ciclo automático, nota de resumo |
| ◇ **Ideias** | Editor Markdown, [[wikilinks]], backlinks, autocomplete, tooltip preview, grafo interativo |
| ⚡ **Flashcards** | Repetição espaçada (SM-2) para revisão ativa |
| ◇ **Análise** | Calendário heatmap com streak de notas |
| ⚙ **Tipos** | Sistema de tipos customizável (inspirado no Anytype) |
| ⊞ **Consultas** | Visualizações dinâmicas (grid, kanban, lista, galeria, formulário, calendário, gantt) |
| ⇆ **Import/Export** | Export completo em JSON com todas as tabelas + import com upsert e rollback |
| 📦 **PWA** | Instalável como aplicativo nativo, atalhos na tela inicial, cache offline de assets |

### Diferenciais

- **Local-first**: tudo em SQLite local. Sem nuvem, sem depender de terceiros.
- **Keyboard-driven**: Ctrl+K (paleta), Ctrl+I (captura), `/` (comandos no editor)
- **Backlinks**: `[[wikilinks]]` conectam suas notas automaticamente
- **Grafo de conhecimento**: visualização interativa das conexões entre notas (d3-force)
- **PWA**: instalável como aplicativo nativo com atalhos Inbox/Pomodoro
- **Tema claro/escuro**: toggle na sidebar
- **Timer personalizável**: configure durações de foco, pausa curta e pausa longa
- **Templates**: crie notas a partir de modelos pré-definidos
- **Propriedades JSON**: dados estruturados dentro de notas e tarefas
- **Sistema de logs**: erros do frontend capturados e persistidos no backend
- **CI/CD integrado**: GitHub Actions (lint, testes, build, release automático)

---

## 🚀 Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Vite + React 19 + TypeScript + Tailwind CSS |
| **Backend** | Python + FastAPI + SQLModel |
| **Banco** | SQLite |
| **Editor** | CodeMirror 6 (Markdown + Python + JS + SQL) |
| **Grafo** | d3-force |
| **Cache** | TanStack React Query |

---

## 📦 Pré-requisitos

- **Python** 3.12+
- **Node.js** 18+ e npm (apenas para o primeiro build do frontend)

## 🛠️ Instalação e Execução

### 1. Clone e entre no repositório

```bash
git clone https://github.com/SEU_USUARIO/mindflow.git
cd mindflow
```

### 2. Inicie com um comando

```bash
python start.py
```

O script instala as dependências do backend, builda o frontend (se necessário),
sobe o servidor em **http://localhost:8000** e abre o navegador automaticamente.

> Após o primeiro build, Node.js não é mais necessário para rodar o app.
> Para desenvolvimento, continue usando `npm run dev` no frontend.

### Alternativa: iniciar manualmente

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend (apenas para desenvolvimento)
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173** (dev) ou **http://localhost:8000** (produção).

---

## ⌨️ Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+K` | Abrir paleta de comandos |
| `Ctrl+I` | Captura rápida (Inbox) |
| `/` | Menu de comandos no editor |
| `[[título]]` | Criar wikilink para outra nota |

---

## 🗂️ Estrutura

```
mindflow/
├── backend/
│   ├── main.py              # Servidor FastAPI + startup
│   ├── models.py            # Modelos SQLModel (tabelas)
│   ├── database.py          # Conexão SQLite e migração
│   ├── routers/
│   │   ├── inbox.py         # Endpoints do Inbox
│   │   ├── habitos.py       # Endpoints de Hábitos
│   │   ├── rotina.py        # Endpoints de Rotina
│   │   ├── pomodoro.py      # Endpoints de Pomodoro
│   │   ├── notas.py         # Endpoints de Notas + wikilinks + grafo
│   │   ├── flashcards.py    # Endpoints de Flashcards (SM-2)
│   │   ├── tipos.py         # Endpoints de Tipos de Objeto
│   │   ├── queries.py       # Endpoints de Consultas Dinâmicas
│   │   ├── logs.py          # Endpoints de Logs de Erro
│   │   ├── export.py        # Export completo em JSON
│   │   └── import_data.py   # Import de dados via upload
│   ├── logging_config.py    # RotatingFileHandler para logs
│   ├── pytest.ini           # Configuração de testes
│   ├── requirements-dev.txt # Dependências de desenvolvimento
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Roteamento + tema + atalhos globais
│   │   ├── api/             # Cliente HTTP (fetch) para cada módulo
│   │   ├── pages/           # Páginas (Dashboard, Rotina, Ideias, etc.)
│   │   ├── components/      # Componentes (Sidebar, Grafo, Editor, etc.)
│   │   ├── store/           # Contextos (ThemeContext)
│   │   └── types/           # Interfaces TypeScript
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🧪 APIs (exemplos)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status do servidor |
| `GET` | `/api/notas?q=busca` | Lista notas (busca full-text com FTS5) |
| `POST` | `/api/notas` | Cria nota |
| `PATCH` | `/api/notas/{id}/favoritar` | Alternar favorito da nota |
| `GET` | `/api/notas/{id}/export/md` | Exportar nota como Markdown com frontmatter YAML |
| `GET` | `/api/notas/{id}/conexoes` | Backlinks de uma nota |
| `GET` | `/api/notas/grafo` | Dados do grafo de conhecimento |
| `POST` | `/api/flashcards/{id}/review` | Revisar flashcard (algoritmo SM-2) |
| `GET` | `/api/tipos` | Lista tipos de objeto |
| `POST` | `/api/queries/{id}/executar` | Executa uma consulta salva |
| `GET` | `/api/export` | Exportar todas as tabelas em JSON |
| `POST` | `/api/import` | Importar dados de um backup JSON (multipart upload) |
| `GET` | `/api/logs` | Listar logs de erro |

---

## 📄 Licença

MIT

---

## 🧪 Testes

```bash
# Backend (pytest)
cd backend && python -m pytest tests/ -q

# Lint (ruff)
cd backend && python -m ruff check .

# TypeScript (frontend)
cd frontend && npx tsc --noEmit
```

## 🛠️ Desenvolvimento

```bash
pip install pre-commit && pre-commit install  # hooks: ruff (lint) + pytest (testes)
python start.py                                # sobe o app completo
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

Antes de enviar um PR, certifique-se de que:
1. `ruff` não aponta erros no backend
2. `pytest` passa 60/60 testes
3. `tsc --noEmit` não aponta erros no frontend
4. `vite build` completa sem erros
