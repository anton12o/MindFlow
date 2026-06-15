# MindFlow — História Completa

---

## 1. Origem e Motivação

MindFlow nasceu de uma insatisfação pessoal: as ferramentas de produtividade modernas são poderosas, mas caras, fechadas e dependentes de nuvem. Notion, Roam Research, Anytype e TickTick resolvem problemas reais, mas cada uma exige uma conta, armazena seus dados em servidores alheios, e cobre apenas uma fatia do que uma pessoa precisa para organizar a vida.

A ideia central do MindFlow é simples: **um segundo cérebro que é realmente seu**. Tudo roda local. Nenhum dado sai da máquina. Sem assinatura, sem cadastro, sem servidor externo. Um banco SQLite na sua pasta `backend/` contém toda a sua vida digital — notas, hábitos, tarefas, flashcards, sessões de foco, consultas salvas.

MindFlow combina o melhor de várias ferramentas num ecossistema integrado:

| Inspiração | Funcionalidade |
|-----------|---------------|
| **Notion** | Notas com blocos, templates, propriedades dinâmicas (JSON) |
| **Anytype** | Sistema de tipos de objeto customizáveis com schema |
| **Roam Research** | Wikilinks `[[Nota]]`, backlinks, grafo de conhecimento |
| **Anki** | Flashcards com repetição espaçada (SM-2) |
| **TickTick / Forest** | Pomodoro timer com contexto e nota resumo |

O fio condutor é a **integração**. Um hábito pode virar um pomodoro, que gera uma nota resumo com wikilinks automáticos. Uma nota pode gerar flashcards. Uma consulta salva pode virar um kanban. Tudo conversa com tudo.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime Backend | Python | 3.12+ |
| Framework HTTP | FastAPI | 0.115 |
| ORM / Schema | SQLModel (SQLAlchemy + Pydantic) | 0.0.22 |
| Migration | Alembic | 1.14+ |
| Banco | SQLite + FTS5 | nativo |
| Runtime Frontend | Node.js (Vite) | 8.x |
| Framework UI | React | 19.2 |
| Linguagem | TypeScript | 6.0 |
| Estilo | Tailwind CSS | v4 |
| Estado Assíncrono | @tanstack/react-query | 5.101 |
| Editor | CodeMirror | 6.x |
| Grafo | d3-force | 3.0 |
| Roteamento | react-router-dom | 7.17 |

### Arquitetura em duas camadas

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Vite)                                    │
│  React 19 · TypeScript · Tailwind v4 · React Query  │
│  Porta 5173 (dev)                                   │
├─────────────────────────────────────────────────────┤
│  chamadas HTTP → VITE_API_URL (localhost:8000/api)  │
├─────────────────────────────────────────────────────┤
│  Backend (FastAPI)                                  │
│  Python 3.12 · SQLModel · Alembic · FTS5            │
│  Porta 8000 (dev)                                   │
├─────────────────────────────────────────────────────┤
│  SQLite (arquivo local)                             │
│  15 tabelas · FTS5 · sem nuvem · sem autenticação  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Estrutura de Arquivos

```
mindflow/
├── CONTEXT.md                    ← Guia de referência rápida
├── HISTORIA_COMPLETA.md         ← ← Este arquivo (história completa)
├── backend/
│   ├── main.py                  # FastAPI app + CORS + startup lifecycle
│   ├── database.py              # Engine, run_migrations(), setup_fts()
│   ├── models.py                # 15 entidades SQLModel
│   ├── seed.py                  # Seeds (5 templates + 5 tipos)
│   ├── alembic.ini              # Config migrações
│   ├── migrations/
│   │   ├── env.py               # Autogenerate + PRAGMA foreign_keys
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 1781f6b77855_initial_schema.py  # Migration inicial
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── inbox.py             # CRUD inbox
│   │   ├── habitos.py           # CRUD hábitos + registros
│   │   ├── rotina.py            # Blocos + tarefas
│   │   ├── pomodoro.py          # Sessões pomodoro
│   │   ├── notas.py             # Notas, pastas, tags, wikilinks, templates, grafo, estatísticas
│   │   ├── flashcards.py        # CRUD + SM-2 review
│   │   ├── tipos.py             # CRUD tipos de objeto
│   │   ├── queries.py           # CRUD + executar + batch edit
│   │   ├── export.py            # Export dump completo
│   │   └── import_data.py       # Import com upsert
│   └── services/
│       ├── __init__.py
│       ├── spaced_repetition.py # Algoritmo SM-2
│       ├── notes.py             # extrair/processar wikilinks
│       └── estatisticas.py      # Heatmap + streak
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # Router + QueryClient + ErrorBoundary + atalhos
│       ├── index.css            # Tema claro/escuro + animações
│       ├── types/index.ts       # Interfaces compartilhadas
│       ├── store/
│       │   ├── theme.tsx        # Tema (localStorage)
│       │   └── pomodoro.tsx     # Estado global do timer
│       ├── api/
│       │   ├── client.ts        # HTTP client (AbortController, timeout)
│       │   ├── inbox.ts, habitos.ts, rotina.ts, pomodoro.ts
│       │   ├── notas.ts, flashcards.ts, tipos.ts, queries.ts
│       │   ├── conexoes.ts, grafo.ts, templates.ts
│       │   └── export.ts, import_export.ts
│       ├── hooks/
│       │   ├── useDebounce.ts
│       │   └── useImport.ts
│       ├── utils/
│       │   ├── date.ts          # formatDateLocal, hojeLocal
│       ├── components/
│       │   ├── Sidebar.tsx, InboxModal.tsx, CommandPalette.tsx
│       │   ├── ConfirmModal.tsx, ErrorBoundary.tsx
│       │   ├── EditorMarkdown.tsx, CalendarioSemanal.tsx
│       │   ├── GrafoNotas.tsx, PomodoroTimer.tsx
│       │   ├── TemplateModal.tsx, ImportModal.tsx
│       └── pages/
│           ├── Dashboard.tsx, Rotina.tsx, Habitos.tsx
│           ├── Ideias.tsx, Pomodoro.tsx, Flashcards.tsx
│           ├── Tipos.tsx, Consultas.tsx, Insights.tsx
└── README.md
```

---

## 4. Modelos de Dados (15 Tabelas)

### `inbox` — Captura Rápida
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| conteudo | text | Texto livre capturado |
| tipo_destino | text? | Nota / Tarefa / Habito |
| destino_id | int? | FK para o objeto de destino |
| arquivado | bool | Se já foi processado |
| criado_em | datetime | Timestamp de criação |

### `habitos` — Hábitos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nome | text | Nome do hábito |
| tipo | text | binario / quantitativo |
| meta | int? | Meta diária (para quantitativo) |
| categoria | text? | Categoria (saude, trabalho, etc) |
| cor | text? | Cor de exibição |
| ativo | bool | Se está ativo |
| unidade | text? | Unidade de medida (min, págs, etc) |

### `registros_habito` — Check-ins Diários
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| habito_id | int (FK) | → habitos.id, ON DELETE CASCADE |
| data | date | Data do registro |
| valor | int | Valor (1 para binário, contagem para quantitativo) |
| justificativa | text? | Nota opcional |

### `blocos_rotina` — Blocos de Tempo
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| titulo | text | Nome do bloco |
| hora_inicio | text | HH:MM |
| hora_fim | text | HH:MM |
| cor | text? | Cor de exibição |
| recorrente | bool | Se repete semanalmente |
| dias_semana | text? | CSV de dias (0=domingo, ..., 6=sábado) |
| data_especifica | date? | Data fixa (usada se não recorrente) |

### `tarefas` — Tarefas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| titulo | text | Descrição |
| prioridade | text | alta / normal / baixa |
| status | text | pendente / feito |
| bloco_id | int (FK?) | → blocos_rotina.id (nulificado ao deletar) |
| data | date? | Data alvo |
| tipo_id | int (FK?) | → tipos_objeto.id |
| propriedades | JSON | Propriedades extras chave-valor |

### `sessoes_pomodoro` — Sessões de Foco
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| contexto_tipo | text? | habito / tarefa / null (livre) |
| contexto_id | int? | ID do contexto |
| duracao_min | int | Minutos da sessão |
| finalizado_em | datetime? | Quando foi finalizado |
| resumo_nota_id | int (FK?) | → notas.id (nulo se pulou resumo) |

### `pastas` — Pastas de Notas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nome | text | Nome da pasta |
| pai_id | int (FK self?) | → pastas.id (hierarquia) |

### `tags` — Tags
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nome | text | Nome (UNIQUE) |
| cor | text? | Cor opcional |

### `notas_tags` — Relação M2M Notas ↔ Tags
| Campo | Tipo | Descrição |
|-------|------|-----------|
| nota_id | int (FK) | → notas.id (ON DELETE CASCADE) |
| tag_id | int (FK) | → tags.id (ON DELETE CASCADE) |
| PK composta | (nota_id, tag_id) | Unique |

### `notas` — Notas / Ideias
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| titulo | text | Título |
| conteudo | text | Markdown |
| pasta_id | int (FK?) | → pastas.id (nulo = raiz) |
| tipo_id | int (FK?) | → tipos_objeto.id |
| propriedades | JSON | Chave-valor customizável |
| criado_em | datetime | Timestamp |
| atualizado_em | datetime | Timestamp |

### `conexoes_notas` — Wikilinks / Backlinks
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nota_origem_id | int (FK) | → notas.id |
| nota_destino_id | int (FK) | → notas.id |
| tipo | text | wikilink / relacao |
| UNIQUE | (origem, destino, tipo) | Impede duplicatas |

### `flashcards` — Flashcards SM-2
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nota_id | int (FK?) | → notas.id (opcional) |
| pergunta | text | Frente do card |
| resposta | text | Verso do card |
| intervalo | int | Dias até próxima revisão |
| facilidade | float | Fator de facilidade (SM-2) |
| revisoes | int | Quantas vezes foi revisado |
| proxima_revisao | date | Próxima data de revisão |

### `templates` — Templates de Nota
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nome | text | Nome do template |
| descricao | text? | Descrição |
| conteudo | text | Markdown com placeholders |
| propriedades | JSON? | Propriedades padrão |

### `tipos_objeto` — Tipos (Anytype-like)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nome | text | Nome do tipo |
| icone | text? | Emoji |
| schema_campos | JSON | Definição dos campos |
| schema_relacoes | JSON | Definição das relações |

### `queries_salvas` — Consultas Salvas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | int (PK) | Auto-increment |
| nome | text | Nome da consulta |
| tipo_objeto_id | int (FK) | → tipos_objeto.id |
| visualizacao | text | grid / kanban |
| campo_agrupamento | text? | Campo para agrupar no kanban |
| filtros | JSON | Condições de filtro |
| ordem | JSON | Ordenação |

---

## 5. API — 57 Endpoints

### Inbox (4)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/inbox | Listar (opcional `?arquivado=true`) |
| POST | /api/inbox | Criar item |
| PATCH | /api/inbox/{id} | Editar (conteudo, destino, arquivado) |
| DELETE | /api/inbox/{id} | Remover |

### Hábitos (7)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/habitos | Listar (`?ativos=true`) |
| POST | /api/habitos | Criar |
| PATCH | /api/habitos/{id} | Editar |
| DELETE | /api/habitos/{id} | Remover |
| GET | /api/habitos/{id}/registros | Listar check-ins |
| POST | /api/habitos/{id}/registros | Fazer check-in |

### Rotina (8)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/rotina/blocos | Listar blocos (`?data=` ou `?data_inicio=&data_fim=`) |
| POST | /api/rotina/blocos | Criar bloco |
| PATCH | /api/rotina/blocos/{id} | Editar bloco |
| DELETE | /api/rotina/blocos/{id} | Remover bloco |
| GET | /api/rotina/tarefas | Listar tarefas (`?data=`) |
| POST | /api/rotina/tarefas | Criar tarefa |
| PATCH | /api/rotina/tarefas/{id} | Editar tarefa |
| DELETE | /api/rotina/tarefas/{id} | Remover tarefa |

### Pomodoro (3)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/pomodoro/sessoes | Listar sessões |
| POST | /api/pomodoro/sessoes | Criar sessão |
| PATCH | /api/pomodoro/sessoes/{id}/finalizar | Finalizar (+ resumo opcional) |

### Notas (19)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/notas/pastas | Listar pastas |
| POST | /api/notas/pastas | Criar pasta |
| DELETE | /api/notas/pastas/{id} | Remover pasta |
| GET | /api/notas/tags | Listar tags |
| POST | /api/notas/tags | Criar tag |
| DELETE | /api/notas/tags/{id} | Remover tag |
| GET | /api/notas | Listar notas (`?q=` FTS5, `?data=`) |
| POST | /api/notas | Criar nota (+ wikilinks) |
| GET | /api/notas/{id} | Obter nota |
| PATCH | /api/notas/{id} | Atualizar (+ re-processar wikilinks) |
| DELETE | /api/notas/{id} | Remover (+ limpar conexões) |
| POST | /api/notas/{id}/extrair | Extrair trecho como nova nota |
| POST | /api/notas/{id}/tags/{tag_id} | Adicionar tag |
| GET | /api/notas/{id}/conexoes | Listar conexões (entrada + saída) |
| GET | /api/notas/grafo | Dados do grafo (nodes + links) |
| GET | /api/notas/templates | Listar templates |
| POST | /api/notas/templates | Criar template |
| POST | /api/notas/templates/{id}/aplicar | Aplicar template |
| GET | /api/notas/estatisticas | Heatmap (`?mes=&ano=`) |

### Flashcards (6)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/flashcards | Listar todos |
| GET | /api/flashcards/review | Cards pendentes |
| POST | /api/flashcards | Criar |
| POST | /api/flashcards/{id}/review | Revisar (qualidade 0-5, SM-2) |
| PATCH | /api/flashcards/{id} | Editar |
| DELETE | /api/flashcards/{id} | Remover |

### Tipos (5)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/tipos | Listar |
| POST | /api/tipos | Criar |
| GET | /api/tipos/{id} | Obter |
| PATCH | /api/tipos/{id} | Editar |
| DELETE | /api/tipos/{id} | Remover (409 se dependências) |

### Queries (6)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/queries | Listar |
| POST | /api/queries | Criar |
| GET | /api/queries/{id} | Obter |
| DELETE | /api/queries/{id} | Remover |
| POST | /api/queries/{id}/executar | Executar com filtros |
| PATCH | /api/queries/{id}/batch | Edição em lote |

### Export (1)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/export | Dump JSON (máx 5000/tabela) |

### Import (1)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/import | Upload + upsert |

---

## 6. Funcionalidades Detalhadas

### 📥 Inbox — Captura Rápida
- Atalho `Ctrl+I` de qualquer página
- Modal flutuante com campo de texto e botão "Salvar"
- Opção de destino futuro (nota, tarefa, hábito) com lista de IDs
- Lista de itens pendentes com exclusão via ConfirmModal
- Itens arquivados (não mostrados por padrão)
- Feedback visual "Salvo!" após criação

### 🎯 Hábitos
- Dois tipos: binário (Sim/Não) e quantitativo (contagem)
- Categorias e cores personalizáveis
- Meta diária configurável (ex: "beber 8 copos d'água")
- Check-in inline no Dashboard com feedback "Feito ✓" (fade-out 1.5s)
- Streak tracking (dias consecutivos) com ícone de fogo
- Atalho "▶" para iniciar pomodoro focado no hábito
- Edição inline de nome, tipo, categoria e meta
- Exclusão com ConfirmModal

### ○ Rotina Diária
- Blocos de tempo com hora início/fim, cor e título
- Recorrência semanal (dias da semana) ou data específica
- Badges de status: **Agora** (verde), **Concluído** (cinza), **Previsto** (azul)
- Tarefas com checkbox, prioridade (alta/normal/baixa), status
- Edição inline de blocos e tarefas
- Visualização em lista ou calendário semanal (grid dia/hora)
- Optimistic updates na criação de tarefas (rollback automático em erro)

### ◷ Pomodoro — Timer de Foco
- Duração configurável (padrão 25 min)
- Estado global compartilhado entre Dashboard e PomodoroPage
- Timer baseado em ref (não em state) para evitar bugs de travamento
- Cria sessão no backend **antes** de ativar — nunca gera sessão órfã
- Ao fim: "Pular" (finaliza sem nota) ou "Salvar resumo" (cria nota com wikilinks)
- Nota resumo inclui nome do contexto no título
- Notificação sonora (Web Audio API beep) ao terminar
- Botão "Parar" manual não força resumo
- "isCreating" ref previne duplo clique no início

### ◇ Notas / Ideias
- Editor Markdown completo com CodeMirror 6
- Syntax highlight para Python, JavaScript e SQL
- **Wikilinks**: `[[Título da Nota|Alias]]` — parser no backend, clique no frontend
  - Busca case-insensitive (`ILIKE`)
  - Match exato primeiro, fallback para ILIKE
  - Links válidos em `text-accent hover:underline`
  - Links quebrados em `text-danger/70`
  - `UniqueConstraint(origem, destino, tipo)` — sem duplicatas
- **Backlinks**: UI separa saída (→ "Aponta para") e entrada (← "Apontam para esta")
- **Busca Full-Text (FTS5)**: SQLite FTS5 com tokenizer `porter unicode61`
  - Ranking BM25 para relevância
  - Triggers automáticas INSERT/DELETE/UPDATE
  - Rebuild no startup (só se tabela vazia)
  - Aspas sanitizadas nos match queries
  - Fallback para `LIKE` se FTS5 falhar
- **Templates**: 5 seeds incluídos:
  - Resumo de Aula (estrutura tópicos)
  - Reunião (pauta, decisões, ações)
  - Diário Rápido (data, reflexão)
  - Flashcard (pergunta/resposta)
  - Projeto (objetivo, tarefas, recursos)
  - Placeholders: `{{data}}`, `{{titulo}}`
- **Extrair trecho**: seleciona conteúdo, cria nova nota com wikilink automático
- **Tipos de objeto**: associa tipo a cada nota (ícone + nome)
- **Pastas**: hierarquia com breadcrumb, filtro na sidebar
- **Propriedades chave-valor**: adiciona/remove em modo edição
- **Slash commands** no editor: `/` → template, data, wikilink, checklist, blockquote
- Delay de digitação para salvar (debounce 300ms na busca)

### 🔗 Grafo de Conhecimento
- Visualização d3-force com nós (notas) e arestas (backlinks)
- Cores por tipo de objeto (Nota=azul, Tarefa=verde, Projeto=laranja, etc)
- Legenda interativa com hover tooltip
- Clique no nó → seleciona nota na sidebar
- Loading/erro/empty states separados
- Limites: 500 notas e 2000 conexões

### ⚡ Flashcards (SM-2)
- Algoritmo SM-2 puro no backend (`services/spaced_repetition.py`)
- 5 botões de avaliação: Muito difícil (1) → Muito fácil (5)
- Fator de facilidade, intervalo, contagem de revisões
- Data da próxima revisão calculada automaticamente
- Pydantic `Field(ge=0, le=5)` valida qualidade (substitui `max(0, min(5, ...))`)
- Edição inline de pergunta, resposta e nota associada
- Lista de todos os cards com data de revisão e facilidade
- Associação opcional com nota via `nota_id`

### ⚙ Tipos de Objeto (Anytype-inspired)
- Schema customizável via JSON (`schema_campos`, `schema_relacoes`)
- 5 tipos seedados: Nota, Tarefa, Projeto, Pessoa, Recurso
- `TipoObjetoUpdate` usa `exclude_unset=True` — não sobrescreve campos com `{}`
- Botão "Novo tipo" escondido durante edição (evita duplicata)
- Exclusão com proteção 409 se há notas, tarefas ou consultas vinculadas

### ⊞ Consultas Dinâmicas
- Visualização grid (tabela) ou kanban (colunas)
- Kanban: agrupa por campo (status, prioridade, tipo_id, data)
- Contagem de itens por coluna no kanban
- Filtros FTS5 em consultas de notas
- Batch edit: seleção múltipla, altera campos em lote
  - Allowlist de segurança (apenas campos permitidos)
  - 404 se algum ID não existe

### ◎ Insights / Análise
- Calendário heatmap mensal:
  - Vazio (sem notas)
  - ≤2 notas
  - >2 notas
- Streak de dias consecutivos (limitado a 365)
- Navegação entre meses
- Clique no dia → navega para a nota daquele dia
- Loading/erro/empty states

### 📊 Dashboard
- 5 cards independentes com React Query:
  1. **Inbox**: contagem de pendentes + botão "Abrir"
  2. **Blocos do dia**: lista com horários e cores
  3. **Tarefas de hoje**: checkbox com optimistic update
  4. **Hábitos**: check-in inline + streak
  5. **Foco**: PomodoroTimer embutido
- Cada card com estados: loading (`animate-pulse`), erro (`text-danger`), empty (`Nenhum item`)

### 📦 Export / Import
- **Export**: todas as 15 tabelas em JSON, até 5000 registros cada
  - Flag `truncated: bool` no response
  - Metadados: `exportado_em`, `versao`
  - Botão "↓" na sidebar + comando Ctrl+K
- **Import**: upload de JSON via multipart
  - Validação: JSON válido, tabelas conhecidas, ≤50 MB
  - Transação única com upsert por ID — rollback se falhar
  - Ordem topológica (pastas pais antes de filhos)
  - `ConexaoNota`: `ON CONFLICT(origem, destino, tipo) DO UPDATE`
  - `NotaTag`: `ON CONFLICT DO NOTHING`
  - `SessaoPomodoro.resumo_nota_id` inválido → null
  - FTS5 rebuild no final
  - Modal 3 passos: seleção → confirmação → resultado
  - Drag and drop na seleção
  - Após sucesso: invalida todo cache React Query + navega para Dashboard

### ⌨️ Atalhos de Teclado
- `Ctrl+K`: Paleta de comandos com filtro e navegação por setas
- `Ctrl+I`: Inbox (captura rápida)
- `/`: Slash commands no editor Markdown
- `[[Título]]`: Wikilink no editor
- `Escape`: Fecha qualquer modal
- Atalhos ignoram inputs de texto (não interceptam digitação)

### 🎨 Tema Claro/Escuro
- Toggle na sidebar (☀ / ☾)
- `data-theme` attribute + variáveis CSS no `:root`
- Persistência via `localStorage` com try/catch
- Tailwind v4 com `@theme` (sem `tailwind.config.*`)

---

## 7. Ciclo de Desenvolvimento — 12 Módulos

### Módulo 1: Dashboard
**Problema:** Dashboard usava `useEffect`+`useState` manual, sem React Query, sem estados de loading/erro/empty.
**Solução:** Reescrevemos com React Query. 5 cards independentes com `useQuery` cada. Cada um carrega, erra ou fica vazio de forma independente. Evento `open-inbox` via `window.dispatchEvent` para comunicação entre componentes.

### Módulo 2: ConfirmModal
**Problema:** `confirm()` do navegador usado em 5 lugares — feio, sem tema, sem animação.
**Solução:** Componente `<ConfirmModal>` com bg/button padronizados, suporte `destructive` (bg-danger), animação CSS `fade-in` (150ms), fecha com Escape. Substituído em: Rotina, Hábitos, Flashcards, InboxModal, Consultas.

### Módulo 3: Auditoria de Estados
**Problema:** Só Dashboard e Insights tinham loading/erro/empty. Outras páginas falhavam em silêncio ou mostravam dados vazios sem feedback.
**Solução:** Loading/erro/empty adicionados em: Hábitos, Ideias (sidebar), Tipos, Consultas (sidebar + resultados), Pomodoro (listas), Flashcards (revisão + allCards + select notas), Rotina (blocos + tarefas).

### Módulo 4: Fluxo Hábito → Pomodoro → Nota
**Problema:** Timer auto-finalizava ao chegar em 00:00. Sem atalho pomodoro nos hábitos. Nota resumo sem nome do contexto.
**Solução:** Timer para em 00:00 e aguarda ação "Pular"/"Salvar resumo". Botão "▶" em cada hábito navega para `/pomodoro?contexto_tipo=habito&contexto_id=X&contexto_nome=Y`. Nota resumo inclui nome do contexto no título.

### Módulo 5: Wikilinks / Backlinks
**Problema:** `[[Nota]]` era texto puro. Busca case-sensitive. `processar_wikilinks` deletava TODAS conexões. Templates ignoravam wikilinks. Sem unique constraint. Conexões misturadas na UI.
**Solução:** `renderConteudo()` parseia `[[Título|Alias]]`, busca case-insensitive, renderiza links em `text-accent hover:underline`. Quebrados em `text-danger/70`. Filtro por `tipo="wikilink"` no delete. `processar_wikilinks` chamado em templates. `UniqueConstraint(origem, destino, tipo)`. UI separa entrada (←) e saída (→). Invalidação de cache `['conexoes']` no delete.

### Módulo 6: Busca FTS5
**Problema:** `LIKE '%termo%'` — table scan, sem ranking, sem stemming, lento.
**Solução:** Tabela virtual `notas_fts` (FTS5) com `content='notas'`, tokenizer `porter unicode61`. Triggers INSERT/DELETE/UPDATE. `rebuild` no startup. Query `MATCH :q ORDER BY rank` (BM25). Mesmo FTS5 em consultas salvas.

### Módulo 7: Export de Dados
**Problema:** Zero formas de exportar dados.
**Solução:** `GET /api/export` retorna 15 tabelas + metadados. Botão "↓" na sidebar. Comando "Exportar dados (JSON)" no Ctrl+K. Download como `mindflow-export-YYYY-MM-DD.json`.

### Módulo 8: Consistência Visual
**Problema:** Títulos variados (`text-xl`, `text-lg`, `text-2xl`). Padding inconsistente (`p-6`, `p-12`, `p-5`, `p-4`). Cor hardcoded `text-green-400`. `max-width` variado.
**Solução:** Todos os títulos `text-2xl font-bold`. Cards `p-4`. `text-green-400` → `text-success`. Todos `max-w-4xl`. Botões `px-4 py-1.5 text-sm`.

### Módulo 9: Import de Dados
**Problema:** Zero formas de importar dados de volta.
**Solução:** `POST /api/import`: upload multipart, validação (JSON, tabelas, ≤50 MB), transação única upsert, rollback em falha. Ordem topológica das pastas. `ConexaoNota` com `ON CONFLICT DO UPDATE`. `NotaTag` com `ON CONFLICT DO NOTHING`. FTS5 rebuild. Hook `useImport`. Modal 3 passos.

### Módulo 10: Sessão de Correção (26 bugs)
**Problema:** 29 bugs reportados — crashes, stale closures, timeouts, UX.
**Solução:** 26 corrigidos, 3 adiados. Backend: PRAGMA foreign_keys, FTS5 sanitiza aspas, tag duplicada vira no-op, `.copy()` safe p/ None, mes/ data inválida, batch_edit 404. Frontend: setTimeout cleanup, stale closure queryFn, timer inicia imediatamente, Tipos usa ConfirmModal, notificação sonora, Ctrl+ ignora inputs, inflight abort removido, estado Pomodoro global, timer ref-based, Inbox exibe destino, filtro por pasta, redirect /insights → /analise.

### Módulo 11: Migração Alembic + PRAGMA
**Problema:** Schema manual, SQLite sem PRAGMA foreign_keys.
**Solução:** Alembic com autogenerate. `env.py` exclui `notas_fts` (FTS5 manual). `database.py` + `env.py` configuram `PRAGMA foreign_keys = ON`. Startup executa `alembic upgrade head` automaticamente.

### Módulo 12: Sessão de Correção — 55 Issues

#### 🔴 Lote 1 — Bloqueantes (10 itens)
| # | Problema | Correção |
|---|----------|----------|
| 1 | `delete_nota` deixava NotaTag, Flashcard, SessaoPomodoro órfãos | Limpa NotaTag, nulifica Flashcard.nota_id e SessaoPomodoro.resumo_nota_id |
| 2 | `delete_tipo` quebrava se havia dependências | Retorna 409 com contagem de dependências |
| 3 | `delete_bloco` quebrava Tarefas vinculadas | Nulifica Tarefa.bloco_id antes de deletar |
| 4 | FTS5 crashava com aspas no termo de busca | Try/except com fallback para LIKE |
| 5 | Import crashava com `KeyError` em dicts aninhados | `.get()` em vez de `[]`, 422 se chave faltando |
| 6 | Ideias não abria nota específica via URL | Lê `?nota_id` dos searchParams |
| 7 | Consultas deletava sem confirmação | ConfirmModal ao deletar query |
| 8 | Sessão órfã se usuário fechava o timer | `createSessao()` antes de `setAtivo(true)` |
| 9 | Streak quebrava com datas UTC | `formatDateLocal()` em vez de `toISOString()` |
| 10 | Ctrl+K export crashava silenciosamente | try/catch + console.error |

#### 🛠️ Inflight + TDZ (2 itens)
| # | Problema | Correção |
|---|----------|----------|
| 11 | Mapa inflight causava race conditions em múltiplas páginas | Removido completamente |
| 12 | `Cannot access 'notas' before initialization` (TDZ) | useEffect movido para depois do useQuery |

#### 🟡 Lote 2 — Robustez (11 itens)
| # | Problema | Correção |
|---|----------|----------|
| 13 | Weekday filter "1" casava "10" (substring) | LIKE `%,{n},%` |
| 14 | `TarefaUpdate`/`BlocoRotinaUpdate` sem campos opcionais | Campos faltantes adicionados |
| 15 | Export sem limite | `LIMITE_EXPORT = 5000` por tabela |
| 16 | Grafo sem limite de dados | Notas limit 500, conexões 2000 |
| 17 | Streak podia crescer infinitamente | Limitada a 365 dias |
| 18 | Seed crashava em banco novo | `seed_db()` com try/except |
| 19 | CalendarioSemanal/TemplateModal sem loading | Loading/error states adicionados |
| 20 | Habitos useEffect sem cleanup | ignore flag adicionada |
| 21 | Modais com stale closure no Escape | `useRef(onClose)` |

#### 🔴 Lote 3 — Polish (10 itens)
| # | Problema | Correção |
|---|----------|----------|
| 22 | FTS5 erros silenciosos | `logger.warning()` |
| 23 | Import erros silenciosos (bare except) | `logger.warning` |
| 24 | Faltavam endpoints DELETE /tags e /pastas | Endpoints criados |
| 25 | Inbox sem PATCH | Endpoint + `InboxItemUpdate` |
| 26 | client.ts ignorava signal do React Query | Signal merge (cancela no unmount) |
| 27 | GrafoNotas sem loading/erro/empty | Estados separados |
| 28 | Consultas stale closure no delete | `onSuccess` usa ID da mutation |
| 29 | Ideias com `selectedIdRef.current!` sem guard | `if (!id) return` |
| 30 | Duplo clique no iniciar timer | `isCreating` ref |
| 31 | ImportModal stale closure no close | `onSuccessRef` |

#### 🟡 Lote 4 — Polish Médio (13 itens)
| # | Problema | Correção |
|---|----------|----------|
| 32 | `HabitoUpdate` sem `ativo`/`unidade` | Campos adicionados |
| 33 | Tags podiam ter nomes duplicados | `unique=True` |
| 34 | Data inválida retornava 200 `[]` | Retorna 422 |
| 35 | Export sem indicar truncatura | `truncated: bool` no response |
| 36 | Wikilinks buscavam só ILIKE | Match exato primeiro, ILIKE fallback |
| 37 | Notas: `startswith(data)` wildcard leak | Range query `>= data AND < data~` |
| 38 | InboxModal sem loading/erro/empty | Estados adicionados |
| 39 | Consultas kanban sem loading/erro/empty | Estados adicionados |
| 40 | TemplateModal sem suporte a Escape | Tratamento de tecla Escape |
| 41 | "Novo tipo" visível durante edição | Escondido durante edição |
| 42 | Botões sem `isPending` guard | Guards adicionados |
| 43 | Hábitos: nome vazio no save | Validação no `handleSaveEdit` |
| 44 | Pomodoro histórico sem estados | Loading/erro/empty adicionados |

#### 🟢 Lote 5 — Polish Baixo (10 itens)
| # | Problema | Correção |
|---|----------|----------|
| 45 | Qualidade validação manual | `Field(ge=0, le=5)` |
| 46 | FTS5 rebuild todo startup | Só se tabela vazia |
| 47 | `or_` não usado em Tipos | Removido |
| 48 | Template `propriedades=None` crash | `{}` |
| 49 | Flashcards branch desnecessário | `timedelta(days=intervalo)` direto |
| 50 | Hábitos setTimeout sem cleanup | Cleanup no unmount |
| 51 | `item: any` em Consultas | `CardItem` interface |
| 52 | Export/Import sem loading state | Loading states adicionados |
| 53 | CommandPalette sem acessibilidade | `role="listbox"`, `aria-activedescendant` |
| 54 | ImportModal stale closure no result | `onSuccessRef` no `handleResultClose` |

### Total: 55 correções

---

## 7.5 Módulo 13: Release v1.0.0 + Polimento

**Antes:** App exigia 2 terminais (backend + frontend). Sem entrypoint único. Sem distribuição. Tipos e pastas recarregavam a cada navegação (staleTime padrão 30s). Histórico do Pomodoro sem limpeza.

**Depois:**
- `start.py` — script único que instala deps Python, builda frontend (se necessário), sobe uvicorn e abre navegador
- `MindFlow.bat` — bootstrap para Release: verifica Git/Python, clona repositório, cria venv, chama `start.py`. Entrypoint único
- **Backend serve frontend estático** — `StaticFiles` em `/`. CORS `allow_origins=["*"]`
- **staleTime 300s** para `['tipos']` e `['pastas']` — evita recarregamentos desnecessários
- **Limpeza de histórico Pomodoro** — `DELETE /api/pomodoro/sessoes` + UI com ConfirmModal
- **`docs/FUTURO.md` criado** — 9 itens catalogados por prioridade
- **CONTEXT.md limpo** — seção "Próximos Passos" substituída por link para `FUTURO.md`
- **Resíduos removidos** — `generate-spec.js`, `package.json`, `package-lock.json` da raiz
- **Release v1.0.0 publicada** no GitHub com `MindFlow.bat` anexado

---

## 8. Decisões Técnicas e Convenções

### Backend
- **Import relativo**: `from routers import notas` (mesmo pacote)
- **404 real**: `HTTPException(404)` — nunca `{"ok": false}` com status 200
- **Datas locais**: `formatDateLocal()` / `hojeLocal()` — NUNCA `toISOString()` (UTC)
- **Migrations automáticas** no startup via `database.py:run_migrations()`
- **FTS5 fora do Alembic**: gerenciado manualmente com `setup_fts()`
- **PRAGMA foreign_keys = ON** configurado em dois lugares: event listener no engine + `env.py` do Alembic
- **Cascade manual**: deletes complexos tratados explicitamente (não confia em ON DELETE CASCADE do SQLite)
- **`TipoObjetoUpdate`**: `exclude_unset=True` para não sobrescrever schemas
- **Tag duplicada**: vira no-op (não crasha)
- **`.copy()` seguro**: tratado para None
- **Data inválida**: retorna 422
- **Batch edit**: allowlist de campos + 404 se IDs ausentes

### Frontend
- **React Query** como única fonte de estado (sem Redux/Zustand)
- **`staleTime: 30_000`** global, `retry: 1`
- **Optimistic updates** em tarefas com rollback em `onError`
- **Erros nunca engolidos**: `console.error('[contexto]', e)` em todo lugar
- **Debounce de 300ms** na busca
- **`useRef` para callbacks**: evita stale closures
- **`useRef(onClose)`** nos modais: evita stale no Escape
- **`renderConteudo()`** parseia `[[Título|Alias]]` no frontend
- **Timer ref-based**: evita bug 00:59 travado
- **Cria sessão antes de ativar timer**: nunca sessão órfã
- **Botões de deletar sempre visíveis**: sem `opacity-0 hover:opacity-100`
- **`confirm()` completamente eliminado**: substituído por `<ConfirmModal>`
- **Tailwind v4**: `@import "tailwindcss"` — sem `tailwind.config.*`
- **Tema**: `data-theme` + variáveis CSS + `localStorage`
- **Padronização**: títulos `text-2xl font-bold`, cards `p-4`, `max-w-4xl`, botões `px-4 py-1.5 text-sm`

---

## 9. Build e Testes

### Frontend
```bash
cd frontend && npm run build
# 0 erros TypeScript
# Warning: chunk size > 500 kB (pré-existente, chunk único sem code-split)
```

### Backend
```bash
cd backend && python -c "from main import app; print('OK')"
# OK — todos os imports, routers, FTS5 setup funcionam
```

---

## 10. Bugs Pendentes (UX de Notas — Baixa Prioridade)

Os bugs 25, 26 e 27 foram adiados por serem de melhoria UX, não funcionais:

| Bug | Descrição |
|-----|-----------|
| 25 | Feedback visual ao criar/editar notas — atualmente a transição é abrupta |
| 26 | Indicador de salvamento automático — usuário não sabe se já salvou |
| 27 | Confirmação ao sair com alterações não salvas — risco de perder edição |

---

## 11. Módulos 14-19: Features Implementadas

### Módulo 14: Tags com cores + filtro combinado

**Antes:** Tags existiam no banco com campo `cor` mas eram ignoradas no frontend. Sem filtro por tags.

**Depois:**
- Backend: `PATCH /tags/{id}` (editar nome/cor), `GET /notas?tag_ids=1,2,3` (filtro AND), `GET /notas/{id}/tags`, `DELETE /notas/{id}/tags/{tag_id}`
- Frontend: chips coloridos na sidebar e nota (bg da cor + texto auto contraste), color picker (12 presets + hex livre), filtro multi-select na sidebar com badge + limpar, `useDebounce(300ms)`

### Módulo 15: Timer personalizado Pomodoro

**Antes:** Timer fixo 25min, sem pausas, sem configuração.

**Depois:**
- Context: `config {focoMin, pausaCurtaMin, pausaLongaMin, ciclosAtePausaLonga}`, `cicloAtual`, `fase` — persistido em `localStorage`
- UI: Seção colapsável com 4 inputs numéricos (1-120min), "Restaurar padrão", desabilitado se timer ativo, save debounce 500ms
- Ciclo automático: Foco → Pausa curta → Foco → Pausa longa (a cada N ciclos), botões "Iniciar pausa?" / "Iniciar próximo foco?" (não automático), pausas não criam sessão backend

### Módulo 16: Consultas — Views Lista, Galeria, Formulário

**Antes:** Apenas Grid e Kanban.

**Depois:**
- **Lista:** Renderizador denso + drag-and-drop vertical (@dnd-kit) → `ordem` persistido
- **Galeria:** `cover_url` extraído do markdown (regex) ou propriedades, grid responsivo, hover scale
- **Formulário:** Gerador dinâmico baseado em `schema_campos` (text/number/date/url/select) → cria nota com propriedades
- **Pré-requisito:** Migration + seed `schema_campos` (Tarefa, Nota, Ideia, Livro, Projeto) + campo `ordem` em Nota

### Módulo 17: Consultas — Calendário e Gantt

**Antes:** Não existiam.

**Depois:**
- **Calendário:** Matriz 7×5/6, navegação mensal, `?mes=YYYY-MM` filtra por `campo_agrupamento` (date), drag-and-drop entre dias → atualiza propriedade
- **Gantt:** Barras horizontais, escala Dia/Semana/Mês, virtualização Y (@tanstack/react-virtual), limite hard 100 itens, drag barra (move ambas datas) + resize bordas (move individual), `total` no response
- Backend: `?mes=` e `?gantt=true` no `/executar`, valida `campo_agrupamento` date, limite 100 + `total`

### Módulo 18: CalendarioSemanal drag-and-drop (Rotina)

**Antes:** Blocos estáticos, sem interação.

**Depois:**
- @dnd-kit: arrastar bloco entre células (dia × hora 30min) → `PATCH /rotina/blocos/{id}` com nova `hora_inicio`/`hora_fim` (duração preservada)
- Validações: mínimo 30min, célula ocupada = não solta
- Recorrentes: ConfirmModal "Só este dia (data_especifica) ou todos?"
- Optimistic update + rollback se erro

### Módulo 19: PWA (Progressive Web App)

**Antes:** Não instalável, sem offline.

**Depois:**
- **Manifest:** `manifest.json` (name, icons, shortcuts Inbox/Pomodoro, theme_color)
- **Service Worker:** `sw.js` — cache-first assets estáticos, **network-only `/api/`**, activate limpa caches antigos
- **Vite:** Hash nos assets (`[name]-[hash]`) para cache busting, `publicDir: 'public'` copia `sw.js`
- **Main:** Registro SW com error handling
- **Ícones:** `icon-192.svg`, `icon-512.svg` (gradiente tema escuro + "MF")

---

## 12. Módulo 20: Otimizações de Performance

**Antes:** Buscas sem índices, chunks grandes, staleTime genérico, sidebar sem virtualização, componentes sem memo.

**Depois:**
- **PRAGMAs SQLite:** WAL, synchronous=NORMAL, cache_size=-40000, temp_store=MEMORY, busy_timeout=5000 (`backend/database.py`)
- **GZipMiddleware:** compressão de responses ≥500 bytes (`backend/main.py`)
- **10 índices SQLite:** Migration `8616ba3b846c` — FTS5 rowid, tags.nome, notas tags/pasta/tipo/data, tarefas data/status/bloco, sessoes_pomodoro finalizado_em, conexoes_notas origem/destino
- **Eager loading staleTime:** grafo/templates/tags → 5min, conexoes → 2min, notas/flashcards → 1min
- **Virtualização:** Sidebar de notas (Ideias.tsx) + lista de flashcards (Flashcards.tsx) com `@tanstack/react-virtual`
- **`React.memo`:** EditorMarkdown, FlashcardItem, SortableItem
- **`useCallback([])`:** handlers estáveis em FlashcardItem e SortableItem (evita recriação)
- **`codemirror` removido:** pacote umbrella não utilizado (economiza ~200kB no bundle)

---

## 13. Módulo 21: Correção Final — 5 Bugs Restantes + sw.js

**Antes:** 5 bugs de baixo risco identificados na auditoria mas não corrigidos — SQL injection potencial, cover_url ausente em extração, tag IDs não-numéricos silenciosos, dependência extra no timer, upload sem timeout.

**Depois:**

| # | Bug | Arquivo | Correção |
|---|-----|---------|----------|
| 1 | **SQL injection via f-string** | `queries.py:104` | `campo_agrupamento` validado com regex `^[a-zA-Z_][a-zA-Z0-9_]*$` — 422 se inválido |
| 2 | **`extrair_bloco` sem `cover_url`** | `notas.py:250` | `nova.cover_url = extrair_cover_url(...)` adicionado antes do flush |
| 3 | **tag IDs não-numéricos silenciosos** | `notas.py:82` | `logger.warning` para cada valor descartado |
| 4 | **`sessaoId` em deps do timer** | `PomodoroTimer.tsx:134` | `sessaoId` removido do array de dependências do `useEffect` |
| 5 | **import sem timeout** | `import_data.py:98` | `asyncio.wait_for(file.read(), timeout=30)` + HTTP 408 |

**Extra:** `sw.js` corrigido para filtrar apenas URLs `http://` antes de `cache.put()`, eliminando erro `chrome-extension` no console.

---

## 14. Módulo 22: Correções de Layout e Comportamento (4 itens)

**Antes:** Editor sem lineWrapping (texto longo ia pra lateral), Pomodoro freeze ao trocar de página (closure stale no setInterval), calendário de hábitos inexistente, tags na sidebar sem contraste e overflow escondido.

**Depois:**

| # | Problema | Correção | Arquivos |
|---|----------|----------|----------|
| 1 | Editor sem quebra de linha | `EditorView.lineWrapping` ativado, Inter 15px/1.7 | `EditorMarkdown.tsx` |
| 2 | Pomodoro freeze ao trocar de página | `startedAtRef` (wall-clock) + `requestAnimationFrame` em vez de `setInterval` | `store/pomodoro.tsx`, `PomodoroTimer.tsx` |
| 3 | Sem calendário de hábitos | Novo componente `HabitoCalendario.tsx` + backend `DELETE /{habito_id}/registros/{data}` | `HabitoCalendario.tsx` (novo), `habitos.py`, `habitos.ts` |
| 4 | Tags sem cor + overflow | Chips com cor translúcida + borda, `max-h-20 overflow-y-auto`, containers `min-w-0 overflow-hidden` | `Ideias.tsx` |

**Bônus:** `sw.js` com cache bust automático (`__VERSION__` → timestamp no build), `start.py` com rebuild inteligente (compara timestamps).

---

## 15. Módulo 23: Logging + CI/CD + v1.1.0

**Antes:** Sem sistema de logs (erros silenciosos no frontend, sem rastreamento no backend). Sem CI/CD (zero automação). 3 warnings de depreciação nos testes.

**Depois:**

1. **Sistema de logs** — `RotatingFileHandler` (1MB × 3 backups) em `backend/data/mindflow.log`. Endpoint `GET/POST/DELETE /api/logs`. Frontend: `logError()` com throttle (10/60s) e batch (5s/10 itens), `window.onerror` + `unhandledrejection` capturados, `ErrorBoundary` integrado. `LogsModal.tsx` com filtro de nível e comando Ctrl+K "Ver logs de erro".
2. **CI/CD** — `.github/workflows/ci.yml` (ruff, pytest 60, tsc, build), `.github/workflows/release.yml` (tag → zip → release). `requirements-dev.txt` com dependências de teste.
3. **0 warnings** — `pytest.ini` filtra `StarletteDeprecationWarning`. `main.py` migrado de `@app.on_event("startup")` para `lifespan` async context manager.
4. **MindFlow.bat seguro** — Detecção de repositório existente: se `start.py` está presente, pula clone + venv e executa `python start.py` direto (evita duplicata aninhada).
5. **Bug fixes** — `start.py`: `npm.cmd` no Windows (execution policy). `queries.py`: `Any` import ausente. Testes: tipos corrigidos para React 19 e `vi.stubEnv`.

**Arquivos:** `backend/logging_config.py`, `backend/routers/logs.py`, `backend/pytest.ini`, `backend/requirements-dev.txt`, `frontend/src/api/logs.ts`, `frontend/src/components/LogsModal.tsx`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `main.py`, `start.py`, `MindFlow.bat`, `conftest.py`

---

## 16. Módulo 24: Quick Wins + Polimento Visual + v1.1.2

**Antes:** Sem favoritos, sem export individual de nota, sem tooltip preview, sem autocomplete `[[` no editor, CI TypeScript quebrava, import/export perdia datetime, design inconsistente (fonte monospace no modo leitura, logo `~`, badges `text-[10px]`, ações escondidas).

**Depois:**

1. **Favoritos** — Migration `0703dc203e19` adiciona `favoritado BOOLEAN` em `notas`. Endpoint `PATCH /{id}/favoritar`. Seção ⭐ na sidebar, estrela no card e no cabeçalho da nota.
2. **Export Markdown individual** — `GET /{id}/export/md` com YAML frontmatter (id, titulo, criado_em, pasta, tags). Botão `↓ .md` no cabeçalho da nota.
3. **Tooltip preview** — Componente `RenderConteudo` substitui `renderConteudo`, debounce 300ms no hover de wikilinks, busca `getNota`, strip markdown, tooltip posicionado via CSS.
4. **Autocomplete `[[`** — Extensão `@codemirror/autocomplete` com `CompletionSource` trigger em `[[`, filtragem por prefixo, `apply: "Título]]"`.
5. **Propriedades fixas no cabeçalho** — Tipo, pasta, datas, tags sempre visíveis acima do editor.
6. **8 itens de design:** hover nos cards do Dashboard, botão Excluir padronizado `bg-danger hover:bg-danger/80 text-white`, modo leitura sans-serif, fade-in nas páginas, logo `~` → `MF`, badges `text-[10px]` → `text-xs`, `focus:ring` no input de bloco, ações agrupadas na barra da nota.
7. **CI fix** — `useRef<T | undefined>(undefined)` em vez de `null` (React 19). `getTextColor`/`getLuminance` removidos (não usados). `window.setTimeout` para tipagem DOM.
8. **Import/Export round-trip** — `_convert_datetimes()` normaliza ISO strings com espaço para `T` antes de `fromisoformat`.
9. **pre-commit Windows** — `start.py` usa `[sys.executable, "-m", "pre_commit"]` em vez de `["pre-commit"]`. `.pre-commit-config.yaml` usa `python -m pytest` em vez de `bash -c`.

**Arquivos:** `backend/migrations/versions/0703dc203e19_add_favoritado_to_nota.py`, `backend/routers/notas.py`, `backend/routers/import_data.py`, `frontend/src/pages/Ideias.tsx`, `frontend/src/components/EditorMarkdown.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Rotina.tsx`, `frontend/src/api/notas.ts`, `frontend/src/types/index.ts`, `start.py`, `.pre-commit-config.yaml`, `README.md`

---

## 17. Módulo 25: 6 Quick Wins (Jun/2026)

**Antes:** Sem notificação nativa, sem botão encerrar, sem backup automático, sem journaling, sem sync multi-aba, CodeMirror/d3 no bundle principal.

**Depois:**

1. **Notificação nativa Pomodoro** — `Notification API` ao fim do timer, fallback para som se sem permissão
2. **Botão encerrar app** — `POST /api/shutdown` + sidebar + ConfirmModal
3. **Backup automático** — `start.py` faz cold copy do `.db` antes de subir o servidor
4. **Journaling diário** — Dashboard aplica template "Diário" se não há nota hoje
5. **Sincronização multi-aba** — `useBroadcastSync` hook via `BroadcastChannel` (tema + pomodoro)
6. **Bundle splitting** — `manualChunks` separa `@codemirror/*` (581 kB) e `d3-force` (12 kB) do chunk principal Ideias (627 kB → 33 kB)

**Arquivos:** `frontend/src/components/PomodoroTimer.tsx`, `frontend/src/store/pomodoro.tsx`, `backend/routers/shutdown.py`, `frontend/src/components/Sidebar.tsx`, `frontend/src/App.tsx`, `start.py`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/hooks/useBroadcastSync.ts`, `frontend/src/store/theme.tsx`, `frontend/vite.config.ts`

---

## 18. Módulo 26: Revisão Semanal + Polimentos (Jun/2026)

**Antes:** Sem página de revisão, sem agregados semanais.

**Depois:**

- **Endpoint** `GET /api/stats/weekly` — agrega notas, tarefas, pomodoros, minutos foco, taxa hábitos, streak. Suporta `?offset=` para navegar entre semanas.
- **Página** `/revisao` — 4 cards comparativos (vs semana passada) com percentual + barras visuais + detalhamento diário com mini-barras + gráfico de barras CSS empilhado
- **Navegação** entre semanas via setas ‹ › com futuro travado em `offset ≥ 0`
- **Ações** — "Criar nota de revisão" (gera nota template preenchida) + "Exportar MD" (download relatório `.md`)
- **Tooltips** nos cards com fonte dos dados (`criado_em`, `data`, `finalizado_em`)
- **Hábitos** — se não há hábitos ativos, mostra "— (sem hábitos ativos)" em vez de 0%
- **Divisão por zero** — `+∞` → `(novo)`, `0/0` → `—`
- **Bug fixes:** streak sempre 0 (scalar vs Row em `session.exec()`), crash no filtro por tags (`notas.py:117`)
- **Reflexão** — 4 prompts reflexivos ao final da página

**Arquivos:** `backend/routers/stats.py`, `frontend/src/api/stats.ts`, `frontend/src/pages/RevisaoSemanal.tsx`, `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`, `backend/routers/notas.py`

---

## 19. Próximos Passos

As futuras adições planejadas foram movidas para [`docs/FUTURO.md`](./docs/FUTURO.md), organizadas por prioridade (🔴 alta, 🟡 média, 🟢 baixa). Cada item contém descrição, arquivos envolvidos e dependências.

---

## 20. Filosofia do Projeto

MindFlow segue alguns princípios fundamentais:

1. **Local-first por design**: seus dados são seus. Sem nuvem, sem lock-in.
2. **Keyboard-driven**: produtividade máxima sem tirar as mãos do teclado.
3. **Integração profunda**: cada funcionalidade conversa com as outras.
4. **Sem framework opinionado**: React + React Query + Tailwind = flexibilidade máxima.
5. **Erros são visíveis**: nada é escondido. `console.error` em todo lugar.
6. **Evolução segura**: migrations gerenciadas, nunca deletar o banco.
7. **Código limpo > código esperto**: preferimos verboso e claro a enxuto e obscuro.

---

*Documento gerado em 11 de junho de 2026.*
*Última atualização: 15 de junho de 2026. Módulo 12 (55 correções) + Módulo 13 (Release v1.0.0) + Módulos 14-19 (Tags, Pomodoro custom, Consultas views, CalendarioSemanal DnD, PWA) + Módulo 20 (Performance: índices, virtualização, memo) + Módulo 21 (5 bugs finais + sw.js) + Módulo 22 (Editor lineWrapping, Pomodoro freeze, Calendário hábitos, Tags sidebar + overflow) + Módulo 23 (Logging + CI/CD) + Módulo 24 (Quick Wins: favoritos, export MD, tooltip, autocomplete, design, CI fix, pre-commit Windows) + Módulo 25 (6 Quick Wins: notificação, shutdown, backup, journaling, BroadcastChannel, bundle split) + Módulo 26 (Revisão Semanal: endpoint weekly, página revisão, gráfico CSS, export MD, bug fixes streak/tags).*
