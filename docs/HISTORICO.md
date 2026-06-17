# MindFlow — Histórico Completo do Projeto

## Sobre o Projeto

MindFlow é um aplicativo de produtividade pessoal **local-first** (sem nuvem, sem autenticação) que
roda inteiramente na máquina do usuário. Combina elementos de Notion (notas + blocos), Anytype
(sistema de tipos de objeto), Roam Research (backlinks / wikilinks) e Anki (flashcards SM-2) em
uma única ferramenta integrada.

**Stack:**
- **Backend:** Python + FastAPI + SQLite (SQLModel)
- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS
- **Gerenciamento de estado:** @tanstack/react-query (cache + mutations + optimistic updates)
- **Editor:** CodeMirror 6 (Markdown com syntax highlight Python/JS/SQL)
- **Grafo:** d3-force (visualização de conhecimento)
- **Timer:** Pomodoro nativo com criação automática de nota resumo

---

## Funcionalidades Completas

### v1.2.10 — Correções de robustez (logs, shutdown, pomodoro)
- **logs.py**: `read_text()` com try/except — log corrompido não quebra mais o modal
- **pomodoro.py**: validação de data em `DELETE /sessoes` — data inválida vira 422 em vez de 500
- **shutdown.py**: `except Exception: pass` → `logger.warning(...)` — WAL falha não é mais engolida

### v1.2.9 — Melhorias de texto/UI nas interfaces
- **EditorMarkdown**: placeholder "Escreva sua nota aqui… Use [[wikilink]] para conectar ideias"
- **InboxModal**: placeholder "O que você quer capturar? (Ctrl+I…)", botão "Salvar" → "Capturar"
- **ErrorBoundary**: mensagem amigável "Não foi possível carregar esta seção"
- **CommandPalette**: mensagens vazias com dica "Tente outro termo."
- **Ideias**: busca "Buscar por conteúdo…", labels "Categoria:"/"Grupo:", favoritos vazio com dica, placeholders com exemplos
- **Hábitos**: placeholder "Meta diária (ex: 8 copos)"
- **HabitoCalendario**: legenda "✅ Check-in / ⬜ Sem registro"
- **Dashboard**: tooltip "Dias consecutivos com check-in" no streak
- **start.py**: dica de atalhos (Ctrl+I/K) na inicialização + finally com despedida amigável

### Infraestrutura
- API REST com FastAPI, 8 routers (inbox, habitos, rotina, pomodoro, notas, flashcards, tipos, queries)
- CRUD completo com 404 real (`HTTPException`) em vez de 200 com `{"ok": false}`
- SQLite com `pool_pre_ping=True` e logging
- Service layer separada (`services/spaced_repetition.py`, `services/notes.py`, `services/estatisticas.py`)
- Cliente HTTP frontend com `AbortController`, timeout 10s, `JSON.parse` manual, erros com contexto (path + method + status)
- React Query com `QueryClientProvider` + `onError` global
- Error Boundary global (class component + `componentDidCatch`)
- React Router com 8 rotas + 404 + deep links
- Tema claro/escuro com toggle na Sidebar + persistência via `localStorage` (com try/catch)
- Variáveis CSS customizadas para theming
- Scrollbar customizada no `index.html`

### Funcionalidades de Produtividade

**1. Captura Rápida (Inbox)**
- Modal ativado por `Ctrl+I`
- Cria itens no inbox com um texto
- Lista itens pendentes com botão de excluir
- Escape fecha o modal, `clearTimeout` no cleanup

**2. Hábitos**
- Cadastro de hábitos (nome, tipo, categoria, meta)
- Tipos: "Sim/Não" (check-in diário) e "Contagem" (minutos, páginas, copos...)
- Check diário com feedback visual animado "Feito ✓" (1.5s)
- Editar hábito inline (nome, tipo, categoria, meta)
- Excluir com confirmação
- `useEffect` + `.catch(console.error)` para carregamento assíncrono
- Labels explicativos nos formulários

**3. Rotina Diária**
- Blocos de tempo com título, hora início/fim, cor, recorrente
- Badge de status: **Agora** (verde), **Concluído** (cinza), **Previsto** (azul)
- Tarefas com toggle pendente/feito, prioridade (alta/normal/baixa)
- Dois modos de visualização: Lista e Semana (CalendárioSemanal)
- **Optimistic update** na criação de tarefas (`onMutate` cancela queries, adiciona otimista, `onError` restaura, `onSettled` invalida)
- Input não limpa antes da mutation completar
- **Editar bloco inline** (título, horários)
- **Editar tarefa inline** (título)
- **Excluir** com `confirm()` — botões sempre visíveis
- `maxLength={60}` no título do bloco

**4. Calendário Semanal**
- Grid dia/hora com blocos + tarefas
- Toggle Lista / Semana
- Blocos recorrentes filtrados por `dias_semana`
- `useQueries` em vez de `useQuery` em loop (respeita Rules of Hooks)
- Cabeçalho "Semana de DD/MM a DD/MM" com `formatShort()`

**5. Pomodoro**
- Timer com duração configurável
- Cria automaticamente uma nota de resumo ao finalizar (via `services/notes.py:criar_nota_resumo`)
- Ref `resumoRef` em vez de `resumo` (corrige stale closure)
- 404 se sessão não existe
- `.catch(console.error)` em vez de `.catch(() => {})`

**6. Notas (Ideias)**
- CRUD completo com título + conteúdo Markdown (CodeMirror 6)
- Backlinks `[[wikilinks]]`: parser regex, endpoint de conexões, tabela `ConexaoNota`
- Busca full-text (`GET /notas?q=`) + filtro por data + `useDebounce(300ms)`
- Templates de nota (CRUD + 5 seeds) com substituição `{{data}}` / `{{titulo}}`
- Extrair bloco para nova nota (`/{nota_id}/extrair`)
- Seletor de pasta no modo edição (dropdown)
- Breadcrumb `📁 nome-da-pasta` no modo visualização
- Propriedades chave-valor (adicionar/remover em modo edição)
- Tooltips nos botões (`title`), `getPastas` para listar pastas
- Excluir com `confirm()`

**7. Flashcards (SM-2)**
- Algoritmo SM-2 completo no backend (`services/spaced_repetition.py`)
- Rota `/flashcards/review` para cards pendentes
- 5 botões de avaliação (Muito difícil → Muito fácil) após virar o card
- Criação com pergunta, resposta, nota_id opcional
- Listagem de todos os cards com próxima revisão e facilidade
- **Editar inline** (pergunta, resposta, nota associada)
- **Excluir com `confirm()`**

**8. Sistema de Tipos (Anytype-inspired)**
- `TipoObjeto` como entidade separada com schema JSON (`schema_campos`, `schema_relacoes`)
- CRUD de tipos com ícone (emojis) e nome
- Editar inline (ícone + nome), excluir com `confirm()`
- `ICONES` fora do componente (evita recriação a cada render)
- Tipos padrão seedados: Tarefa, Nota, Ideia, Livro, Projeto

**9. Queries Dinâmicas**
- Consultas salvas com tipo de objeto, visualização (grid/kanban), campo de agrupamento
- Kanban view: colunas por `campo_agrupamento` (status, prioridade, tipo_id, data)
- Batch edit: allowlist de campos (`TAREFA_CAMPOS_PERMITIDOS`, `NOTA_CAMPOS_PERMITIDOS`)
- Lookup de tipo por nome em vez de magic number `== 2`

**10. Grafo de Conhecimento**
- Visualização d3-force com nós (notas) e links (backlinks)
- Cores por tipo de objeto
- Legenda + hover tooltip
- Endpoint `/notas/grafo` com dados agregados

**11. Insights (Calendário Heatmap)**
- Grid mensal com cores por intensidade (vazio / ≤2 / >2 notas)
- Streak de dias seguidos com notas
- Clique no dia exibe notas daquele dia (navegável para /ideias)
- Controles de navegação entre meses
- Loading / erro / estados vazios tratados
- Chaves de dia estáveis (`${mes}-${cell.dia}`)

---

## Linha do Tempo de Commits

### Commit 1: `57f9208` — "feat: initial MindFlow release"
Estrutura inicial do projeto com:
- Backend FastAPI + SQLite + modelos iniciais
- Frontend Vite + React + Tailwind + rotas básicas
- CRUD de inbox, hábitos, rotina, notas
- Pomodoro timer, flashcards, tipos
- Tema claro/escuro

### Commit 2: `d64b47b` — "kanban view, service layer, react router, sidebar icon fix"
- Kanban view nas queries dinâmicas
- Service layer extraída (`services/`)
- React Router configurado
- Sidebar com navegação e toggle tema
- Correção de ícone na sidebar

### Commit 3: `afe0688` — "error boundary, timezone fix, calendar heatmap, seed refactor, 404, pomodoro 404"
- Error Boundary global
- Bug UTC vs local corrigido em 6 arquivos (`utils/date.ts`)
- Calendário heatmap (Insights)
- Seed refatorado para `seed.py`
- 404 real em todas as rotas
- 404 no pomodoro
- Backlinks / wikilinks implementados
- Busca full-text + `useDebounce`

### Commit 4: `98e1a4c` (atual) — Correções de bugs + UX completa
- **Bug rota `/estatisticas`**: movida antes de `/{nota_id}` para evitar 422
- **Banco recriado**: schema desatualizado (faltava `tipo_id`) → deletado e reseedado
- **Backend endpoints PATCH** adicionados:
  - `PATCH /rotina/blocos/{id}` (editar título, horários)
  - `PATCH /rotina/tarefas/{id}` (editar título, prioridade, status)
  - `PATCH /habitos/{id}` (editar nome, tipo, categoria, meta)
  - `PATCH /flashcards/{id}` (editar pergunta, resposta, nota_id)
- **Botões de deletar**: agora sempre visíveis (removido `opacity-0 hover:opacity-100`)
- **Confirmação**: `confirm()` antes de toda exclusão
- **Edição inline** adicionada em:
  - Blocos de tempo (título, hora início/fim)
  - Tarefas (título)
  - Hábitos (nome, tipo, categoria, meta)
  - Flashcards (pergunta, resposta, nota associada)
- **InboxModal**: agora lista itens pendentes com botão de excluir
- **Insights**: notas do dia agora são clicáveis → navegam para `/ideias`

---

## Correções e Melhorias (por categoria)

### 🐛 Bugs Corrigidos
- `Insights.tsx`: grid com chave de dia de índice para `${mes}-${cell.dia}` (evita re-renders)
- `Insights.tsx`: células nulas com `key={`pad-${i}`}`
- `CommandPalette.tsx`: stale closure — `filtered` e `selected` movidos para refs
- `PomodoroTimer.tsx`: stale closure — `resumoRef` em vez de `resumo`
- `EditorMarkdown.tsx`: stale closure — `onChangeRef`
- `GrafoNotas.tsx`: loading vs empty state não diferenciados
- `RotinaQuery`: `useQuery` em loop → `useQueries`
- UTC vs local: `toISOString()` → `formatDateLocal()` / `hojeLocal()` em 6+ arquivos
- `select(Nota)` sem `flush()` antes de wikilinks → commit único com `flush() + commit()`
- `extrair_bloco` não chamava `processar_wikilinks` após inserir `[[link]]`
- `batch_edit`: allowlist + lookup por nome em vez de `== 2`
- `list_blocos`: filtragem de `dias_semana` para recorrentes
- `NotaUpdate` sem campo `propriedades` → adicionado
- `Flashcard.nota_id` não opcional → tornado `Optional[int]`
- Rota `/estatisticas` depois de `/{nota_id}` → movida antes

### 🎨 UX Melhorada
- Delete sempre visível (nunca mais `opacity-0`)
- `confirm()` antes de toda exclusão
- Edição inline em blocos, tarefas, hábitos, flashcards
- Hábitos: tipos renomeados "Sim/Não" e "Contagem" com tooltips
- Hábitos: feedback animado "Feito ✓" com fade
- Hábitos: labels e layout do formulário melhorados
- Rotina: badge de status (Agora/Concluído/Previsto)
- Rotina: `maxLength={60}` no título do bloco
- Calendário Semanal: cabeçalho "Semana de DD/MM a DD/MM"
- Ideias: seletor de pasta, breadcrumb, tooltips
- InboxModal: lista de itens pendentes com delete
- Insights: notas clicáveis (navegam para /ideias)
- Insights: loading/error/empty states

### 🏗️ Arquitetura / Refatorações
- `.catch(() => {})` eliminado de 7 ocorrências → `console.error('[contexto]', e)`
- `print()` no backend substituído por `logging` (database.py, seed.py, main.py)
- `logging.basicConfig` em `main.py`
- `client.ts`: `JSON.parse` em vez de `res.json()`, timeout com `AbortController`
- `database.py`: `create_db_and_tables` com try/except + logging
- `models.py`: todas as 8 declarações `dict` tipadas como `dict[str, Any]`
- `ICONES` movido para fora do componente `Tipos`
- `useDebounce` extraído para `hooks/useDebounce.ts`
- Service layer: `services/estatisticas.py` + `services/notes.py`
- `index.html`: `lang="pt-BR"`, `# MindFlow`, scrollbar customizada
- `frontend/README.md` substituído por docs do projeto
- `backend/.env.example` criado

### 🚀 Endpoints Adicionados
| Método | Rota | Descrição |
|--------|------|-----------|
| PATCH | `/rotina/blocos/{id}` | Editar bloco de tempo |
| PATCH | `/rotina/tarefas/{id}` | Editar tarefa |
| PATCH | `/habitos/{id}` | Editar hábito |
| PATCH | `/flashcards/{id}` | Editar flashcard |

---

## Estrutura de Arquivos (relevante)

### Backend (`backend/`)
```
backend/
├── main.py              # App FastAPI, CORS, logging, inclusão dos routers
├── database.py          # Engine SQLite + SessionLocal + create_db_and_tables
├── models.py            # 14+ entidades SQLModel
├── seed.py              # Seed de templates + tipos padrão
├── .env.example         # Documentação de variáveis de ambiente
├── routers/
│   ├── inbox.py         # CRUD inbox
│   ├── habitos.py       # CRUD hábitos + registros
│   ├── rotina.py        # Blocos + tarefas
│   ├── pomodoro.py      # Sessões pomodoro
│   ├── notas.py         # Notas, pastas, tags, wikilinks, templates, grafo, estatísticas
│   ├── flashcards.py    # CRUD + review SM-2
│   ├── tipos.py         # CRUD tipos de objeto
│   └── queries.py       # CRUD queries + executar + batch edit
└── services/
    ├── __init__.py
    ├── spaced_repetition.py  # Algoritmo SM-2
    ├── notes.py              # extrair_wikilinks, processar_wikilinks, criar_nota_resumo
    └── estatisticas.py       # calcular_estatisticas (calendário heatmap)
```

### Frontend (`frontend/`)
```
frontend/src/
├── main.tsx                # Entry point
├── App.tsx                 # Router + QueryClientProvider + ErrorBoundary + atalhos
├── types.ts                # Interfaces TypeScript
├── api/
│   ├── client.ts           # HTTP client (AbortController, JSON.parse, timeout, erros)
│   ├── inbox.ts
│   ├── habitos.ts
│   ├── rotina.ts
│   ├── pomodoro.ts
│   ├── notas.ts
│   ├── flashcards.ts
│   ├── tipos.ts
│   └── queries.ts
├── hooks/
│   └── useDebounce.ts
├── utils/
│   └── date.ts             # formatDateLocal, hojeLocal
├── components/
│   ├── Sidebar.tsx         # Navegação + toggle tema
│   ├── InboxModal.tsx      # Captura rápida + lista pendentes
│   ├── CommandPalette.tsx  # Ctrl+K
│   ├── EditorMarkdown.tsx  # CodeMirror 6
│   ├── ErrorBoundary.tsx   # Class component
│   ├── CalendarioSemanal.tsx # Grid dia/hora
│   ├── GrafoNotas.tsx      # d3-force
│   └── PomodoroTimer.tsx   # Timer + resumo
├── pages/
│   ├── Dashboard.tsx       # Visão geral
│   ├── Rotina.tsx          # Blocos + tarefas + calendário
│   ├── Habitos.tsx         # Hábitos + check-in
│   ├── Ideias.tsx          # Notas + editor + pastas + wikilinks
│   ├── Flashcards.tsx      # Review + criação + edição
│   ├── Tipos.tsx           # Tipos de objeto
│   ├── Consultas.tsx       # Queries + kanban + batch edit
│   └── Insights.tsx        # Heatmap calendário
└── index.html              # lang="pt-BR", scrollbar customizada
```

---

## Decisões Técnicas Relevantes

| Decisão | Motivo |
|---------|--------|
| React Query (não Zustand) | Cache + invalidação assíncrona embutida |
| Backlinks como tabela SQL | Em vez de campo JSON — consultável e indexável |
| SM-2 no backend | Consistência do algoritmo entre requisições |
| Templates no SQLite | Em vez de arquivos .md — portável e versionável |
| `useQueries` em vez de `useQuery` loop | Respeita Rules of Hooks |
| `flush() + commit()` único | Consistência transacional |
| Allowlist de campos no batch_edit | Segurança — evita `setattr` irrestrito |
| Optimistic updates | Feedback instantâneo sem esperar rede |
| logging + console.error | Rastreabilidade — nunca mais `print()` ou `.catch(() => {})` |
| `ICONES` fora do componente | Evita recriação a cada render |
| CSS Grid manual no heatmap | Zero dependências externas |

---

## Próximos Passos (sugeridos)

1. Exportar/importar dados (JSON ou SQLite backup)
2. Busca全文 com ranking (fts5 no SQLite)
3. Tags por cores + filtro combinado
4. Arrastar blocos de tempo no calendário semanal
5. Notificações nativas (navegador) para pomodoro
6. PWA (service worker + manifest)
7. App desktop com Tauri ou Electron
