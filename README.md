# MindFlow 🧠

**Seu segundo cérebro local-first, open-source e keyboard-driven.**

MindFlow é um aplicativo de produtividade pessoal que combina notas, tarefas, hábitos, pomodoro e flashcards em um só lugar — com tudo armazenado localmente no seu computador.

> Inspirado por Anytype, Obsidian e TickTick.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 📥 **Inbox** | Captura rápida com Ctrl+I — solte ideias sem interromper o fluxo |
| ○ **Rotina** | Blocos de tempo + tarefas diárias + calendário semanal |
| ☰ **Hábitos** | Rastreamento binário ou quantitativo com streaks |
| ◷ **Pomodoro** | Timer foco/descanso com nota de resumo automática |
| ◇ **Ideias** | Editor Markdown, [[wikilinks]], backlinks, propriedades dinâmicas |
| ⚡ **Flashcards** | Repetição espaçada (SM-2) para revisão ativa |
| ⚙ **Tipos** | Sistema de tipos customizável (inspirado no Anytype) |
| ⊞ **Consultas** | Visualizações dinâmicas com filtros e edição em massa |

### Diferenciais

- **Local-first**: tudo em SQLite local. Sem nuvem, sem depender de terceiros.
- **Keyboard-driven**: Ctrl+K (paleta), Ctrl+I (captura), `/` (comandos no editor)
- **Backlinks**: `[[wikilinks]]` conectam suas notas automaticamente
- **Grafo de conhecimento**: visualização interativa das conexões entre notas
- **Tema claro/escuro**: toggle na sidebar
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
| `GET` | `/api/notas?q=busca` | Lista notas (com busca full-text) |
| `POST` | `/api/notas` | Cria nota |
| `GET` | `/api/notas/{id}/conexoes` | Backlinks de uma nota |
| `GET` | `/api/notas/grafo` | Dados do grafo de conhecimento |
| `POST` | `/api/flashcards/{id}/review?qualidade=3` | Revisar flashcard (SM-2) |
| `GET` | `/api/tipos` | Lista tipos de objeto |
| `POST` | `/api/queries/{id}/executar` | Executa uma consulta salva |
| `PATCH` | `/api/queries/{id}/batch` | Edição em massa |
| `GET` | `/api/logs` | Listar logs de erro |
| `GET` | `/api/export` | Exportar todas as tabelas em JSON |

---

## 📄 Licença

MIT

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.
