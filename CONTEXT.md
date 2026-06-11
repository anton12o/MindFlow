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
# Backend (raiz do projeto)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Backend: `http://localhost:8000/api` · Frontend: `http://localhost:5173`
Frontend chama `VITE_API_URL` (fallback `http://localhost:8000/api`).

---

## Estrutura de Arquivos

```
mindflow/
├── CONTEXT.md              ← este arquivo
├── backend/
│   ├── main.py             # App FastAPI, CORS, logging, 9 routers + FTS5 startup
│   ├── database.py         # Engine SQLite + create_db_and_tables + setup_fts
│   ├── models.py           # 15+ entidades SQLModel
│   ├── seed.py             # Seed templates + tipos
│   ├── routers/
│   │   ├── inbox.py        # CRUD inbox
│   │   ├── habitos.py      # CRUD hábitos + registros
│   │   ├── rotina.py       # Blocos + tarefas
│   │   ├── pomodoro.py     # Sessões pomodoro + finalizar
│   │   ├── notas.py        # Notas, pastas, tags, wikilinks, templates, grafo, estatísticas
│   │   ├── flashcards.py   # CRUD + review SM-2
│   │   ├── tipos.py        # CRUD tipos de objeto
│   │   ├── queries.py      # CRUD + executar + batch edit
│   │   └── export.py       # GET /api/export (dump completo)
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
│       ├── api/
│       │   ├── client.ts     # fetch com AbortController, timeout 10s, JSON.parse
│       │   ├── inbox.ts, habitos.ts, rotina.ts, pomodoro.ts
│       │   ├── notas.ts, flashcards.ts, tipos.ts, queries.ts
│       │   ├── conexoes.ts, grafo.ts, templates.ts
│       │   └── export.ts     # exportAll()
│       ├── hooks/useDebounce.ts
│       ├── utils/date.ts     # formatDateLocal, hojeLocal
│       ├── components/
│       │   ├── Sidebar.tsx         # Nav + toggle tema + export + inbox
│       │   ├── InboxModal.tsx      # Captura rápida + lista pendentes + delete
│       │   ├── ConfirmModal.tsx    # Modal reutilizável (destructive, fade-in, Escape)
│       │   ├── CommandPalette.tsx  # Ctrl+K
│       │   ├── EditorMarkdown.tsx  # CodeMirror 6
│       │   ├── ErrorBoundary.tsx
│       │   ├── CalendarioSemanal.tsx
│       │   ├── GrafoNotas.tsx      # d3-force
│       │   ├── TemplateModal.tsx   # Aplicar templates
│       │   └── PomodoroTimer.tsx   # Timer + resumo opcional
│       └── pages/
│           ├── Dashboard.tsx   # React Query, 5 cards (inbox/blocos/tarefas/habitos/pomodoro)
│           ├── Rotina.tsx      # Blocos + tarefas + calendário semanal
│           ├── Habitos.tsx     # CRUD + check-in + pomodoro atalho
│           ├── Ideias.tsx      # Notas + editor MD + wikilinks clicáveis + grafo
│           ├── Flashcards.tsx  # Review SM-2 + todos os cards + inline edit
│           ├── Pomodoro.tsx    # Timer + contexto (hábito/tarefa/livre) + histórico
│           ├── Tipos.tsx       # CRUD tipos de objeto
│           ├── Consultas.tsx   # Queries salvas + kanban/grid + batch edit
│           └── Insights.tsx    # Heatmap calendário + streak + notas clicáveis
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
| `tipos_objeto` | Tipos (Anytype-like) | id, nome, icone, schema_campos(JSON), schema_relacoes(JSON) |
| `queries_salvas` | Consultas salvas | id, nome, tipo_objeto_id(FK), visualizacao, campo_agrupamento, filtros(JSON), ordem |

---

## API Endpoints

### Inbox (`/api/inbox`)
- `GET /` — listar (opcional: `?arquivado=true`)
- `POST /` — criar item
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
- `POST /{id}/review` — revisar (qualidade 1-5, SM-2)
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
- `GET /` — exportar todas as 15 tabelas como JSON + metadados

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

---

## Estado Atual (Build)

```bash
cd frontend && npm run build
# 0 erros TypeScript
# Apenas warning de chunk size > 500 kB (pré-existente, chunk único sem code-split)
```

```bash
cd backend && python -c "from main import app; print('OK')"
# OK — todos os imports, routers, e FTS5 setup funcionam
```

---

## Convenções e Decisões Técnicas

- **Erros:** Nunca engolidos — `console.error('[contexto]', e)` no frontend, `logging` no backend
- **404 real:** `HTTPException(404)` em vez de `{"ok": false}` com status 200
- **Datas:** `formatDateLocal()` / `hojeLocal()` — métodos locais, NUNCA `toISOString()` (UTC)
- **Tema:** Claro/escuro com toggle via `data-theme` attribute + variáveis CSS + `localStorage` (com try/catch)
- **Keyboard:** Ctrl+K (paleta), Ctrl+I (inbox), `/` (slash commands no editor de notas)
- **Tailwind v4:** `@import "tailwindcss"` — sem `tailwind.config.*`, cores via `@theme`
- **React Query:** `staleTime: 30_000`, `retry: 1`, `onError` global no `QueryClient`
- **Optimistic updates:** Usados em Rotina (criação de tarefas) com rollback em `onError`
- **Botões de deletar:** Sempre visíveis (nunca `opacity-0 hover:opacity-100`)
- **`confirm()` nativo:** Completamente eliminado — substituído por `<ConfirmModal>`

---

## Próximos Passos (sugeridos)

1. Tags por cores + filtro combinado
2. Arrastar blocos de tempo no calendário semanal
3. Notificações nativas (navegador) para pomodoro
4. PWA (service worker + manifest)
5. App desktop com Tauri ou Electron
