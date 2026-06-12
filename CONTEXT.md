# MindFlow — Contexto Completo do Projeto

## Sobre

MindFlow é um aplicativo de produtividade pessoal **local-first** (sem nuvem, sem autenticação)
que roda inteiramente na máquina do usuário. Combina elementos de Notion (notas + blocos),
Anytype (sistema de tipos de objeto), Roam Research (backlinks / wikilinks) e Anki (flashcards SM-2).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.12+ · FastAPI · SQLModel · SQLite |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 |
| Estado | @tanstack/react-query (cache + mutations + optimistic updates) |
| Editor | CodeMirror 6 (Markdown + highlight Python/JS/SQL) |
| Grafo | d3-force |
| Timer | Pomodoro nativo com criação opcional de nota resumo |

## Como Rodar

```bash
# Tudo em um comando (recomendado)
python start.py

# Ou manualmente:
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend (apenas dev)
cd frontend
npm install
npm run dev
```

- **Produção:** `http://localhost:8000` (backend serve o frontend buildado)
- **Desenvolvimento:** backend `http://localhost:8000/api` · frontend `http://localhost:5173`
- Frontend em dev chama `VITE_API_URL` (fallback `http://localhost:8000/api`).

---

## Migrations (Alembic)

Usamos Alembic 1.14+ para gerenciar mudanças de schema do SQLite.

```bash
# Criar nova migration (após alterar models.py)
cd backend
alembic revision --autogenerate -m "descricao da mudanca"

# Revisar o arquivo gerado em migrations/versions/ e remover
# qualquer menção a notas_fts (FTS5 é gerenciado manualmente)

# Aplicar migrations pendentes
alembic upgrade head

# Verificar estado atual
alembic current
```

> **⚠️ NUNCA deletar o banco para resolver problemas de schema. Sempre criar uma migration.**

### Como funciona no startup

- `database.py:run_migrations()` executa `alembic upgrade head` automaticamente
- Se o banco não existe, ele é criado do zero via migration
- Se o banco existe mas não tem `alembic_version` (transição), estampa como head
- `database.py` configura `PRAGMA foreign_keys = ON` via event listener no engine (também replicado em `migrations/env.py`)
- `setup_fts()` roda depois para configurar FTS5 (fora do Alembic)

---

## Estrutura de Arquivos

```
mindflow/
├── CONTEXT.md              ← este arquivo
├── HISTORIA_COMPLETA.md    ← Histórico completo do desenvolvimento
├── README.md               ← Documentação do projeto
├── start.py                ← Entrypoint universal (instala, builda, sobe, abre navegador)
├── start.bat               ← Atalho Windows para start.py
├── MindFlow.bat            ← Bootstrap para Release (git clone + venv + start.py)
├── .gitignore
├── docs/
│   └── FUTURO.md           ← Futuras adições planejadas
├── backend/
│   ├── main.py             # App FastAPI, CORS, logging, 10 routers + FTS5 startup
│   ├── database.py         # Engine SQLite + run_migrations + setup_fts
│   ├── models.py           # 15+ entidades SQLModel
│   ├── seed.py             # Seed templates + tipos
│   ├── alembic.ini         # Config Alembic
│   ├── migrations/
│   │   ├── env.py          # Importa models, target_metadata = SQLModel.metadata
│   │   ├── script.py.mako
│   │   └── versions/       # Migrations geradas
│   ├── routers/
│   │   ├── inbox.py        # CRUD inbox
│   │   ├── habitos.py      # CRUD hábitos + registros
│   │   ├── rotina.py       # Blocos + tarefas
│   │   ├── pomodoro.py     # Sessões pomodoro + finalizar
│   │   ├── notas.py        # Notas, pastas, tags, wikilinks, templates, grafo, estatísticas
│   │   ├── flashcards.py   # CRUD + review SM-2
│   │   ├── tipos.py        # CRUD tipos de objeto
│   │   ├── queries.py      # CRUD + executar + batch edit
│   │   ├── export.py       # GET /api/export (dump completo)
│   │   └── import_data.py  # POST /api/import (upload + upsert + validação)
│   └── services/
│       ├── __init__.py
│       ├── spaced_repetition.py  # Algoritmo SM-2
│       ├── notes.py              # extrair/processar wikilinks, criar_nota_resumo
│       └── estatisticas.py       # Calendário heatmap (streak, contagem por dia)
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx           # Router + QueryClient + ErrorBoundary + atalhos Ctrl+K/Ctrl+I
│       ├── index.css         # Variáveis CSS tema claro/escuro + @keyframes fade-in
│       ├── types/index.ts
│       ├── store/theme.ts    # Context de tema com persistência localStorage
│       ├── store/pomodoro.tsx # Context global do timer Pomodoro (minutos, segundos, ativo, sessaoId, resumo, mostrarResumo)
│       ├── api/
│   │   ├── client.ts     # fetch com AbortController, timeout 10s, merge com signal do React Query
│       │   ├── inbox.ts, habitos.ts, rotina.ts, pomodoro.ts
│       │   ├── notas.ts, flashcards.ts, tipos.ts, queries.ts
│   │   ├── conexoes.ts, grafo.ts, templates.ts
│   │   ├── export.ts     # exportAll()
│   │   └── import_export.ts  # importFile() + ImportResult type
│       ├── hooks/useDebounce.ts
│       ├── hooks/useImport.ts  # useImport() — { mutate, isLoading, resultado, erro, reset }
│       ├── utils/date.ts     # formatDateLocal, hojeLocal
│       ├── components/
│       │   ├── Sidebar.tsx         # Nav + toggle tema + export + inbox
│       │   ├── ConfirmModal.tsx    # Modal reutilizável (destructive, fade-in, Escape)
│       │   ├── CommandPalette.tsx  # Ctrl+K
│       │   ├── EditorMarkdown.tsx  # CodeMirror 6
│       │   ├── ErrorBoundary.tsx
│       │   ├── ImportModal.tsx     # 3-step: seleção, confirmação, resultado
│       │   ├── CalendarioSemanal.tsx
│       │   ├── GrafoNotas.tsx      # d3-force
│       │   ├── TemplateModal.tsx   # Aplicar templates
│       │   ├── PomodoroTimer.tsx   # Timer + resumo opcional + notificação sonora
│       │   └── InboxModal.tsx      # Captura rápida + destino + lista pendentes + delete
│       └── pages/
│           ├── Dashboard.tsx   # React Query, 5 cards (inbox/blocos/tarefas/habitos/pomodoro)
│           ├── Rotina.tsx      # Blocos + tarefas + calendário semanal
│           ├── Habitos.tsx     # CRUD + check-in + pomodoro atalho
│           ├── Ideias.tsx      # Notas + editor MD + wikilinks clicáveis + grafo
│           ├── Flashcards.tsx  # Review SM-2 + todos os cards + inline edit
│           ├── Pomodoro.tsx    # Timer + contexto (hábito/tarefa/livre) + histórico
│           ├── Tipos.tsx       # CRUD tipos de objeto
│           ├── Consultas.tsx   # Queries salvas + kanban/grid + batch edit
│           ├── Insights.tsx    # Heatmap calendário + streak + notas clicáveis (/analise, redirect de /insights)
```

---

## Modelos de Dados (15 tabelas)

| Tabela | Descrição | Campos-chave |
|--------|-----------|-------------|
| `inbox` | Captura rápida | id, conteudo, tipo_destino, destino_id, arquivado, criado_em |
| `habitos` | Hábitos | id, nome, tipo(binario/quantitativo), meta, categoria, cor, ativo |
| `registros_habito` | Check-ins diários | id, habito_id(FK), data, valor, justificativa |
| `blocos_rotina` | Blocos de tempo | id, titulo, hora_inicio, hora_fim, cor, recorrente, dias_semana, data_especifica |
| `tarefas` | Tarefas | id, titulo, prioridade, status, bloco_id(FK), data, tipo_id(FK), propriedades(JSON) |
| `sessoes_pomodoro` | Sessões pomodoro | id, contexto_tipo, contexto_id, duracao_min, finalizado_em, resumo_nota_id(FK) |
| `pastas` | Pastas de notas | id, nome, pai_id(FK self) |
| `tags` | Tags | id, nome, cor |
| `notas_tags` | M2M notas↔tags | nota_id, tag_id (composite PK) |
| `notas` | Notas | id, titulo, conteudo, pasta_id(FK), tipo_id(FK), propriedades(JSON) |
| `conexoes_notas` | Wikilinks/backlinks | id, nota_origem_id(FK), nota_destino_id(FK), tipo; UNIQUE(origem,destino,tipo) |
| `flashcards` | Flashcards SM-2 | id, nota_id(FK), pergunta, resposta, intervalo, facilidade, revisoes, proxima_revisao |
| `templates` | Templates de nota | id, nome, descricao, conteudo, propriedades(JSON) |
| `tipos_objeto` | Tipos (Anytype-like) | id, nome, icone, schema_campos(JSON), schema_relacoes(JSON). `TipoObjetoUpdate` (PATCH com campos opcionais) evita sobrescrever schema_campos com `{}` |
| `queries_salvas` | Consultas salvas | id, nome, tipo_objeto_id(FK), visualizacao, campo_agrupamento, filtros(JSON), ordem |

---

## API Endpoints

### Inbox (`/api/inbox`)
- `GET /` — listar (opcional: `?arquivado=true`)
- `POST /` — criar item
- `PATCH /{id}` — editar item (conteudo, tipo_destino, destino_id, arquivado)
- `DELETE /{id}` — remover item

### Hábitos (`/api/habitos`)
- `GET /` — listar (`?ativos=true` filtra ativos)
- `POST /` — criar
- `PATCH /{id}` — editar
- `DELETE /{id}` — remover
- `GET /{id}/registros` — listar registros
- `POST /{id}/registros` — criar registro (check-in)

### Rotina (`/api/rotina`)
- `GET /blocos` — listar (`?data=` ou `?data_inicio=&data_fim=`)
- `POST /blocos` — criar
- `PATCH /blocos/{id}` — editar
- `DELETE /blocos/{id}` — remover
- `GET /tarefas` — listar (`?data=`)
- `POST /tarefas` — criar
- `PATCH /tarefas/{id}` — editar
- `DELETE /tarefas/{id}` — remover

### Pomodoro (`/api/pomodoro`)
- `GET /sessoes` — listar
- `POST /sessoes` — criar
- `PATCH /sessoes/{id}/finalizar` — finalizar (+ resumo opcional com `contexto_nome`)
- `DELETE /sessoes` — limpar histórico (`?antes_de=` opcional)

### Notas (`/api/notas`)
- `GET /pastas` — listar pastas
- `POST /pastas` — criar pasta
- `GET /tags` — listar tags
- `POST /tags` — criar tag
- `GET /` — listar notas (`?q=` FTS5, `?data=`)
- `POST /` — criar nota (+ processar wikilinks)
- `GET /grafo` — dados do grafo (nodes + links)
- `GET /templates` — listar templates
- `POST /templates` — criar template
- `DELETE /tags/{id}` — remover tag (+ limpar NotaTag)
- `DELETE /pastas/{id}` — remover pasta (+ nulificar pasta_id nas notas)
- `POST /templates/{id}/aplicar` — aplicar (+ processar wikilinks)
- `GET /estatisticas` — heatmap (`?mes=&ano=`)
- `GET /{id}` — obter nota
- `PATCH /{id}` — atualizar (+ reprocessar wikilinks se conteudo mudou)
- `DELETE /{id}` — remover (+ limpar conexoes)
- `POST /{id}/extrair` — extrair trecho como nova nota
- `POST /{id}/tags/{tag_id}` — adicionar tag
- `GET /{id}/conexoes` — listar conexoes (entrada + saída)

### Flashcards (`/api/flashcards`)
- `GET /` — listar todos
- `GET /review` — cards pendentes para revisão
- `POST /` — criar
- `POST /{id}/review` — revisar (body: `{"qualidade": 0-5}`, SM-2)
- `PATCH /{id}` — editar
- `DELETE /{id}` — remover

### Tipos (`/api/tipos`)
- `GET /` — listar
- `POST /` — criar
- `GET /{id}` — obter
- `PATCH /{id}` — editar
- `DELETE /{id}` — remover

### Queries (`/api/queries`)
- `GET /` — listar
- `POST /` — criar
- `GET /{id}` — obter
- `DELETE /{id}` — remover
- `POST /{id}/executar` — executar (filtros: `q` FTS5, `status`, `prioridade`, `tipo_id`)
- `PATCH /{id}/batch` — edição em lote

### Export (`/api/export`)
- `GET /` — exportar até 5000 registros por tabela como JSON + metadados
  - Resposta inclui `truncated: bool` indicando se alguma tabela excedeu o limite
  - Retorna 15 tabelas + `exportado_em` + `versao`

### Import (`/api/import`)
- `POST /` — importar JSON via `UploadFile` (multipart/form-data)
  - Validação: JSON válido, pelo menos uma tabela conhecida, < 50 MB (senão 413)
  - Transação única: upsert por ID (insere ou atualiza), rollback se falhar
  - Ordens das tabelas respeita FK: tipos → pastas (topological sort) → tags → … → conexoes → tags
  - `ConexaoNota` usa `ON CONFLICT(nota_origem_id, nota_destino_id, tipo) DO UPDATE`
  - `NotaTag` usa `ON CONFLICT(nota_id, tag_id) DO NOTHING`
  - `SessaoPomodoro.resumo_nota_id` inválido → setado como null
  - FTS5 rebuild no final
  - Retorna resumo: `{ sucesso, importado_em, tabelas: { nome: { inseridos, atualizados } } }`

---

## Sessão de Refinamento — 8 Módulos

### Módulo 1: Dashboard
- **Antes:** Dashboard usava `useEffect`+`useState`, sem React Query, sem estados loading/erro/empty por card
- **Depois:** Dashboard reescrito com React Query. 5 cards independentes: Inbox (contagem + botão abrir), Blocos do dia, Tarefas (checkbox funcional), Hábitos (check-in inline + streak), PomodoroTimer. Cada card com loading (`animate-pulse`), erro (`text-danger`), vazio (`Nenhum item`). Evento `open-inbox` via `window.dispatchEvent`.

### Módulo 2: ConfirmModal
- **Antes:** `confirm()` do navegador usado em 5 lugares (Rotina, Hábitos, Flashcards, InboxModal). Sem estilo, sem tema, sem animação.
- **Depois:** Componente `<ConfirmModal>` com bg/button padronizados, suporte a `destructive` (bg-danger), animação `fade-in` (CSS puro, 150ms), fecha com Escape. Todas as 5 ocorrências substituídas.

### Módulo 3: Auditoria de Estados
- **Antes:** Apenas Dashboard e Insights tinham loading/erro/empty completos. Demais páginas falhavam silenciosamente ou mostravam dados vazios sem feedback.
- **Depois:** Loading/erro/empty adicionados em Habitos (useEffect manual), Ideias (sidebar), Tipos, Consultas (sidebar + resultados), Pomodoro (listas hábitos/tarefas), Flashcards (revisão + allCards + select notas), Rotina (blocos + tarefas).

### Módulo 4: Fluxo Hábito→Pomodoro→Nota
- **Antes:** Timer auto-finalizava em 00:00. Sem atalho pomodoro nos hábitos. Nota resumo sem nome do contexto.
- **Depois:** Timer para em 00:00 e mostra "Pular"/"Salvar resumo" — só finaliza no backend por ação do usuário. Botão "▶" em cada hábito navega para `/pomodoro?contexto_tipo=habito&...`. PomodoroPage lê `searchParams`. Nota resumo inclui nome do contexto no título. Botão "Parar" manual também não força resumo.

### Módulo 5: Wikilinks/Backlinks
- **Antes:** `[[Nota]]` renderizado como texto puro, sem clique. Busca case-sensitive. `processar_wikilinks` deletava TODAS conexões (ignorava tipo). Templates ignoravam wikilinks. Delete não invalidava cache de conexões. Sem unique constraint. Conexões misturadas na UI.
- **Depois:** `renderConteudo()` parseia `[[Título|Alias]]`, busca case-insensitive, renderiza como `text-accent hover:underline`. Links quebrados em `text-danger/70`. Backend `Nota.titulo.ilike(title)`. Filtro por `tipo="wikilink"` no delete de conexões. `processar_wikilinks` chamado em templates. Invalidação de `['conexoes']` no delete. `UniqueConstraint` em ConexaoNota. UI separa entrada (←) e saída (→).

### Módulo 6: Busca FTS5
- **Antes:** `LIKE '%termo%'` — table scan, sem ranking, sem stemming, lento.
- **Depois:** Tabela virtual `notas_fts` com `content='notas'` (external content), tokenizer `porter unicode61`. Triggers INSERT/DELETE/UPDATE para sync automático. `rebuild` no startup. Query usa `MATCH :q ORDER BY rank` (bm25). Mesmo FTS5 em consultas salvas.

### Módulo 7: Export de Dados
- **Antes:** Zero formas de exportar.
- **Depois:** `GET /api/export` retorna 15 tabelas em JSON + metadados. Botão "↓" na sidebar. Comando "Exportar dados (JSON)" na paleta Ctrl+K. Download como `mindflow-export-YYYY-MM-DD.json`.

### Módulo 8: Consistência Visual
- **Antes:** Títulos variados (`text-xl`, `text-lg`, `text-2xl`). Cards com padding inconsistente (`p-6`, `p-12`, `p-5` vs padrão `p-4`). Cor hardcoded `text-green-400`. `max-width` variado. Botão Inbox do Dashboard com tamanho diferente.
- **Depois:** Todos os títulos `text-2xl font-bold`. Cards padronizados `p-4`. `text-green-400` → `text-success`. Todos `max-w-4xl`. Botões `px-4 py-1.5 text-sm`.

### Módulo 9: Import de Dados
- **Antes:** Zero formas de importar dados de volta pro app.
- **Depois:** `POST /api/import` recebe JSON via UploadFile (multipart), valida antes de escrever (JSON válido, pelo menos uma tabela conhecida, ≤50 MB). Transação única com upsert por ID — se falha, rollback completo. Ordem das tabelas respeita FK (tipos → pastas → tags → … → conexoes). Pastas ordenadas topologicamente (pais antes de filhos). `ConexaoNota` usa `ON CONFLICT` na unique `(origem, destino, tipo)`. `NotaTag` usa `ON CONFLICT DO NOTHING`. `SessaoPomodoro.resumo_nota_id` inválido silenciosamente setado como null. FTS5 rebuild no final. Retorna `{ sucesso, importado_em, tabelas }`. Hook `useImport` no frontend com `mutate`, `isLoading`, `resultado`, `erro`, `reset`. Componente `ImportModal` com 3 passos (seleção → confirmação → resultado), drag and drop, fade-in 150ms, fecha com Escape. Sidebar ganha botão "↑ Importar" ao lado do "↓ Exportar". Comando "Importar dados (JSON)" na paleta Ctrl+K. Após sucesso, invalida todo cache React Query e navega para Dashboard.

### Módulo 10: Sessão de Correção de Bugs (26 bugs)
- **Antes:** 29 bugs reportados — crashes, stale closures, timeouts, UX inconsistencies
- **Depois:** 26 bugs corrigidos, 3 adiados (UI/UX média prioridade):
  - **Backend:** PRAGMA foreign_keys=ON (database.py+env.py), FTS5 sanitiza aspas (notas.py/queries.py), tag duplicada vira no-op (notas.py), processar_wikilinks aceita None (services/notes.py), .copy() safe p/ None (notas.py), mes inválido retorna vazio (notas.py), data inválida retorna [] (rotina.py), batch_edit 404 em IDs ausentes (queries.py), NotaTag contagem correta (import_data.py), TipoObjetoUpdate evita sobrescrever schema_campos (tipos.py)
  - **Frontend:** setTimeout cleanup (GrafoNotas.tsx), stale closure queryFn usa queryKey[1] (Ideias.tsx), Card suprime children qdo vazio (Dashboard.tsx), toggleTarefa invalida multiplos prefixes (Dashboard.tsx), timer inicia imediatamente (PomodoroTimer.tsx), Tipos usa ConfirmModal, notificacao sonora ao fim (PomodoroTimer.tsx), Ctrl+ atalhos ignoram inputs (App.tsx), inflight abort evita timeout acumulado (client.ts), form validacao blocos/habitos (Rotina.tsx/Habitos.tsx), dead code removido (rotina.ts), estado Pomodoro global via context (store/pomodoro.tsx), timer ref-based evita trava 00:59 (PomodoroTimer.tsx), Inbox exibe destino (InboxModal.tsx), labels "Tipo:"/"Pasta:" tecnicos (Ideias.tsx), filtro por pasta nas notas (Ideias.tsx), /insights redireciona para /analise (App.tsx+Sidebar.tsx)

### Módulo 11: Migração Alembic + PRAGMA
- **Antes:** Schema gerenciado manualmente, SQLite sem PRAGMA foreign_keys
- **Depois:** Alembic com autogenerate, migrations em `migrations/versions/`, `env.py` exclui `notas_fts` do autogenerate, `database.py` + `env.py` configuram `PRAGMA foreign_keys = ON`, startup executa `alembic upgrade head` automaticamente

### Módulo 12: Sessão de Correção — 55 Issues (3 lotes)
Auditoria completa do código (~50 issues) seguida de 3 lotes de correções + inflight abort + TDZ.

**🔴 Lote 1 — Bloqueantes (10):**
- `delete_nota`: limpa NotaTag, nulifica Flashcard.nota_id e SessaoPomodoro.resumo_nota_id
- `delete_tipo`: retorna 409 se dependências existem
- `delete_bloco`: nulifica Tarefa.bloco_id antes de deletar
- FTS5 MATCH com try/except em notas.py + queries.py
- Import: `.get()` em vez de `[]` nos dicts, 422 se chave faltando
- Ideias: lê `?nota_id` dos searchParams para auto-selecionar nota
- Consultas: ConfirmModal ao deletar query
- PomodoroTimer: `createSessao()` antes de `setAtivo(true)` — evita sessão órfã
- Dashboard: `calcStreak()` usa `formatDateLocal()` em vez de `toISOString()`
- App.tsx: export no Ctrl+K envolto em try/catch

**🛠️ Inflight + TDZ (2):**
- `client.ts`: mapa inflight removido — causava race conditions em múltiplas páginas
- `Ideias.tsx`: useEffect movido para depois do useQuery (TDZ: Cannot access 'notas' before initialization)

**🟡 Lote 2 — Robustez (11):**
- Rotina: weekday filter com LIKE `%,{n},%` evita substring match (ex: "1" casando "10")
- `TarefaUpdate`/`BlocoRotinaUpdate`: campos faltantes adicionados
- Export: `LIMITE_EXPORT = 5000` por tabela
- Grafo: notas limit 500, conexões 2000
- Estatísticas: streak limitada a 365 dias
- Startup: `seed_db()` com try/except
- CalendarioSemanal/TemplateModal: loading/error states
- Habitos: ignore flag no useEffect (cleanup)
- ImportModal/InboxModal: `useRef(onClose)` para evitar stale closure

**🔴 Lote 3 — Polish (10):**
- FTS5: `logger.warning()` em vez de silenciar
- Import: `except Exception: pass` → `logger.warning`
- `DELETE /tags/{id}` e `DELETE /pastas/{id}` endpoints
- `PATCH /inbox/{id}` + `InboxItemUpdate`
- `client.ts`: merge do signal do React Query (permite cancelamento no unmount)
- GrafoNotas: loading/error/empty states separados
- Consultas: stale closure no delete — `onSuccess` usa ID da mutation
- Ideias: guard `if (!id) return` nos 3 `selectedIdRef.current!`
- PomodoroTimer: `isCreating` ref previne duplo clique
- ImportModal: `onSuccessRef` evita stale closure

**🟡 Lote 4 — Polish Médio (13):**
- `HabitoUpdate`: campos `ativo` e `unidade` adicionados
- `Tag.nome`: `unique=True` (brecha de dados duplicados)
- Rotina: data inválida retorna 422 em vez de 200 `[]`
- Export: `truncated: bool` no response — usuário sabe se backup está completo
- Wikilinks: tenta match exato (`==`) primeiro, `ilike` só como fallback
- Notas: `startswith(data)` → range query `>= data AND < data~` (evita wildcard leak)
- InboxModal: loading/error/empty states no carregamento
- Consultas kanban: loading/error/empty states
- TemplateModal: suporte a Escape
- Tipos: "Novo tipo" escondido durante edição (evita criação duplicada)
- Dashboard + PomodoroTimer: `isPending` guard nos botões
- Habitos: valida nome vazio no `handleSaveEdit`
- Pomodoro: histórico com loading/error/empty states

**🟢 Lote 5 — Polish Baixo (10):**
- Flashcards: `Field(ge=0, le=5)` valida qualidade (substitui `max(0, min(5, ...))`)
- FTS5: rebuild só se tabela vazia (evita trabalho desnecessário no startup)
- Tipos: remove `or_` não usado
- Template aplicação: `propriedades=None` → `{}`
- Flashcards: `timedelta(days=intervalo)` sem branch desnecessário
- Habitos: `setTimeout` com cleanup no unmount
- Consultas: `item: any` → `CardItem` interface
- Sidebar/ImportModal: loading state no export/import
- CommandPalette: `role="listbox"`, `aria-activedescendant`
- ImportModal: `onSuccessRef` no `handleResultClose`

---

## Estado Atual (Build)

```bash
cd frontend && npm run build
# 0 erros TypeScript
# Apenas warning de chunk size > 500 kB (pré-existente, chunk Ideias CodeMirror)
```

```bash
cd backend && python -c "from main import app; print('OK')"
# OK — todos os imports, routers, e FTS5 setup funcionam
```

### Resumo das Correções

| Fase | Itens | Foco |
|------|-------|------|
| Módulo 10 🔴 | 26 bugs | Crashes, stale closures, timeouts, UX |
| Módulo 12 🔴🟡🟢 | 55 issues | Integridade FK, robustez, polish, acessibilidade |
| Módulo 20 ⚡ | 8 otimizações | PRAGMAs SQLite, índices, virtualização, memo |
| Módulo 21 🛡️ | 5 bugs + 1 | SQL injection, cover_url, timer, timeout, SW |

**Status:** Backend OK · Frontend 0 erros TypeScript · 0 bugs conhecidos · Release v1.0.0

### Módulo 13: Release v1.0.0 + Polimento

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

### Módulo 14: Tags com cores + filtro combinado

**Antes:** Tags existiam no banco com campo `cor` mas eram ignoradas no frontend. Sem filtro por tags.

**Depois:**
- Backend: `PATCH /tags/{id}` (editar nome/cor), `GET /notas?tag_ids=1,2,3` (filtro AND), `GET /notas/{id}/tags`, `DELETE /notas/{id}/tags/{tag_id}`
- Frontend: chips coloridos na sidebar e nota (bg da cor + texto auto contraste), color picker (12 presets + hex livre), filtro multi-select na sidebar com badge + limpar, `useDebounce(300ms)`

---

### Módulo 15: Timer personalizado Pomodoro

**Antes:** Timer fixo 25min, sem pausas, sem configuração.

**Depois:**
- Context: `config {focoMin, pausaCurtaMin, pausaLongaMin, ciclosAtePausaLonga}`, `cicloAtual`, `fase` — persistido em `localStorage`
- UI: Seção colapsável com 4 inputs numéricos (1-120min), "Restaurar padrão", desabilitado se timer ativo, save debounce 500ms
- Ciclo automático: Foco → Pausa curta → Foco → Pausa longa (a cada N ciclos), botões "Iniciar pausa?" / "Iniciar próximo foco?" (não automático), pausas não criam sessão backend

---

### Módulo 16: Consultas — Views Lista, Galeria, Formulário

**Antes:** Apenas Grid e Kanban.

**Depois:**
- **Lista:** Renderizador denso + drag-and-drop vertical (@dnd-kit) → `ordem` persistido
- **Galeria:** `cover_url` extraído do markdown (regex) ou propriedades, grid responsivo, hover scale
- **Formulário:** Gerador dinâmico baseado em `schema_campos` (text/number/date/url/select) → cria nota com propriedades
- **Pré-requisito:** Migration + seed `schema_campos` (Tarefa, Nota, Ideia, Livro, Projeto) + campo `ordem` em Nota

---

### Módulo 17: Consultas — Calendário e Gantt

**Antes:** Não existiam.

**Depois:**
- **Calendário:** Matriz 7×5/6, navegação mensal, `?mes=YYYY-MM` filtra por `campo_agrupamento` (date), drag-and-drop entre dias → atualiza propriedade
- **Gantt:** Barras horizontais, escala Dia/Semana/Mês, virtualização Y (@tanstack/react-virtual), limite hard 100 itens, drag barra (move ambas datas) + resize bordas (move individual), `total` no response
- Backend: `?mes=` e `?gantt=true` no `/executar`, valida `campo_agrupamento` date, limite 100 + `total`

---

### Módulo 18: CalendarioSemanal drag-and-drop (Rotina)

**Antes:** Blocos estáticos, sem interação.

**Depois:**
- @dnd-kit: arrastar bloco entre células (dia × hora 30min) → `PATCH /rotina/blocos/{id}` com nova `hora_inicio`/`hora_fim` (duração preservada)
- Validações: mínimo 30min, célula ocupada = não solta
- Recorrentes: ConfirmModal "Só este dia (data_especifica) ou todos?"
- Optimistic update + rollback se erro

---

### Módulo 19: PWA (Progressive Web App)

**Antes:** Não instalável, sem offline.

**Depois:**
- **Manifest:** `manifest.json` (name, icons, shortcuts Inbox/Pomodoro, theme_color)
- **Service Worker:** `sw.js` — cache-first assets estáticos, **network-only `/api/`**, activate limpa caches antigos
- **Vite:** Hash nos assets (`[name]-[hash]`) para cache busting, `publicDir: 'public'` copia `sw.js`
- **Main:** Registro SW com error handling
- **Ícones:** `icon-192.svg`, `icon-512.svg` (gradiente tema escuro + "MF")

---

### Módulo 20: Otimizações de Performance

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

### Módulo 21: Correção Final — 5 Bugs Restantes

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

### Módulo 22: Correções de Layout e Comportamento (4 itens)

**Antes:** Editor sem lineWrapping (texto longo ia pra lateral), Pomodoro freeze ao trocar de página (closure stale no setInterval), calendário de hábitos inexistente, tags na sidebar sem contraste e overflow escondido.

**Depois:**

1. **Editor lineWrapping + tipografia** — `EditorView.lineWrapping` ativado, fonte trocada para Inter 15px/1.7, monospace mantido só em code blocks
2. **Pomodoro freeze** — `startedAtRef` (wall-clock) adicionado no context, `setInterval` substituído por `requestAnimationFrame` com correção imediata na primeira frame
3. **Calendário mensal de hábitos** — Componente `HabitoCalendario.tsx`, grade 7×N com navegação, toggle registro via POST/DELETE, backend `DELETE /{habito_id}/registros/{data}`
4. **Tags sidebar + overflow** — Chips com `background-color: cor + 20%` + borda, `max-h-20 overflow-y-auto`, botões `px-2 shrink-0`, containers `min-w-0 overflow-hidden`

**Arquivos:** `EditorMarkdown.tsx`, `PomodoroTimer.tsx`, `store/pomodoro.tsx`, `HabitoCalendario.tsx` (novo), `habitos.py`, `habitos.ts`, `Ideias.tsx`, `sw.js`, `vite.config.ts`, `start.py`

---

## Convenções e Decisões Técnicas

- **Erros:** Nunca engolidos — `console.error('[contexto]', e)` no frontend, `logging` no backend
- **404 real:** `HTTPException(404)` em vez de `{"ok": false}` com status 200
- **Datas:** `formatDateLocal()` / `hojeLocal()` — métodos locais, NUNCA `toISOString()` (UTC)
- **Tema:** Claro/escuro com toggle via `data-theme` attribute + variáveis CSS + `localStorage` (com try/catch)
- **Keyboard:** Ctrl+K (paleta), Ctrl+I (inbox), `/` (slash commands no editor de notas)
- **Tailwind v4:** `@import "tailwindcss"` — sem `tailwind.config.*`, cores via `@theme`
- **React Query:** `staleTime: 30_000`, `retry: 1`, `onError` global no `QueryClient`
- **staleTime específico:** tipos e pastas usam `staleTime: 300_000` (5 min) para evitar recarregamentos
- **Optimistic updates:** Usados em Rotina (criação de tarefas) com rollback em `onError`
- **Botões de deletar:** Sempre visíveis (nunca `opacity-0 hover:opacity-100`)
- **`confirm()` nativo:** Completamente eliminado — substituído por `<ConfirmModal>`

---

## Próximos Passos

As futuras adições planejadas foram movidas para [`docs/FUTURO.md`](./docs/FUTURO.md), organizadas por prioridade (🔴 alta, 🟡 média, 🟢 baixa). Cada item contém descrição, arquivos envolvidos e dependências.
