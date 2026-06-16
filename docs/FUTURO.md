# MindFlow — Futuras Adições

> Registro centralizado de todas as features planejadas, organizadas por prioridade.
> Cada item contém descrição, arquivos envolvidos, dependências e status.
> Itens marcados como ✅ foram implementados e permanecem como registro histórico.

## Legenda
- 🔴 Alta / 🟡 Média / 🟢 Baixa
- ⏳ Planejado / 🔧 Em andamento / ✅ Implementado

---

## 🔴 Alta Prioridade — Refinados, prontos para execução

### Header injection via título de nota no export MD
**Status:** ✅ Implementado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Em `notas.py:277`, o header `Content-Disposition` é montado com `filename="{n.titulo}.md"`. Se o título contiver `"` ou `\n`, o header é quebrado. Corrigir escapando aspas e removendo caracteres perigosos do filename.

**Arquivos envolvidos:**
- `backend/routers/notas.py:277` — sanitizar `n.titulo` antes de usar no header

**Dependências:** Nenhuma.

**Observações:** ~15min. Patch simples: `urllib.parse.quote` ou strip de caracteres especiais.

---

### Race condition no Pomodoro start/stop (sessões órfãs)
**Status:** ✅ Implementado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Em `PomodoroTimer.tsx:81-108`, `createSessao()` é assíncrono. Se o usuário clicar rapidamente "Iniciar" → "Parar", o handler de stop checa `if (sessaoId)` que ainda pode ser `null` — a sessão é criada no backend mas nunca finalizada. Solução: usar ref para rastrear ID da sessão ou desabilitar "Parar" até `sessaoId` estar definido.

**Arquivos envolvidos:**
- `frontend/src/components/PomodoroTimer.tsx` — ref para sessão pendente + disable condicional

**Dependências:** Nenhuma.

**Observações:** ~2h. `DELETE /sessoes?antes_de` limpa órfãs parcialmente, mas UX é confusa.

---

### N+1 queries no Dashboard (HabitItem)
**Status:** ✅ Implementado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Cada `HabitItem` faz sua própria chamada `getRegistros(h.id)`. Com 6 hábitos, são 6 requests API na carga da página. Solução: criar endpoint `GET /api/habitos/registros?data=` que retorna todos os registros em uma única query.

**Arquivos envolvidos:**
- `backend/routers/habitos.py` — novo endpoint batch de registros
- `frontend/src/api/habitos.ts` — função `getAllRegistros(data)`
- `frontend/src/pages/Dashboard.tsx` — uma query em vez de N

**Dependências:** Nenhuma.

**Observações:** ~3h. O mesmo padrão N+1 existe em `estatisticas.py` e no import — corrigir Dashboard primeiro.

---

### UI global "backend offline" (detecção + banner)
**Status:** ✅ Implementado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Quando o backend cai, cada página mostra "Erro ao carregar" sem distinguir backend-down de erro 500. Criar interceptor no `client.ts` + banner global não-bloqueante. Usar `GET /api/health` com `refetchInterval: 10000`.

**Arquivos envolvidos:**
- `frontend/src/api/client.ts` — detectar erros de conexão vs erros de API
- `frontend/src/App.tsx` — banner global de offline
- `frontend/src/components/PomodoroTimer.tsx` — não iniciar timer se backend offline

**Dependências:** Nenhuma.

**Observações:** ~4h. Pomodoro é o pior caso: timer visual roda sem sessão real.

---

### Validadores Pydantic para campos enum-like
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `HabitoBase.tipo` aceita qualquer string (deveria ser `"binario" | "quantitativo"`), `TarefaBase.prioridade` (deveria ser `"baixa" | "normal" | "alta" | "urgente"`), `TarefaBase.status` (deveria ser `"pendente" | "em_andamento" | "feito"`). Adicionar `@field_validator` do Pydantic — `Literal` não funciona com SQLModel 0.0.38.

**Arquivos envolvidos:**
- `backend/models.py` — adicionar `@field_validator` em `TarefaBase` e `HabitoBase`
- `backend/tests/test_api.py` — testar rejeição de valores inválidos

**Dependências:** Nenhuma.

**Observações:** ~2h. `field_validator` roda na camada Pydantic (que o SQLModel usa por baixo), então funciona sem quebrar o schema SQL. Teria prevenido o bug do `"concluida"` vs `"feito"` em stats.py — qualquer valor inválido daria 422 na origem.

---

### Validação de comprimento em campos de texto
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `InboxItemBase.conteudo`, `NotaBase.titulo`, `FlashcardBase.pergunta/resposta` não têm `min_length`. Strings vazias passam na validação. Adicionar `min_length=1` em campos obrigatórios e `max_length` razoável (títulos 500 chars, conteúdo 10MB).

**Arquivos envolvidos:**
- `backend/models.py` — adicionar `min_length`/`max_length`
- `backend/routers/queries.py` — `BatchInput.ids` com `max_length=100`

**Dependências:** Nenhuma.

**Observações:** ~1h. Mudança backward-compatible.

---

### Missing 404 checks em operações com FK
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `add_tag_to_nota` não verifica se `nota_id` ou `tag_id` existem. SQLite lança `IntegrityError` que vira 500 genérico. Mesmo padrão em outras associações. Adicionar verificação de existência.

**Arquivos envolvidos:**
- `backend/routers/notas.py:377-386` — verificar nota e tag existem
- `backend/routers/pomodoro.py:29-40` — validar `resumo_nota_id`

**Dependências:** Nenhuma.

**Observações:** ~1h. Padrão: `session.get(Model, id); if not: raise HTTPException(404)`.

---

### Sanitização de filename no export MD
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Header injection em `notas.py:277` — `n.titulo` inserido diretamente no header `Content-Disposition`. Um título como `test"; filename="evil.txt` quebra o header. Corrigir com sanitização.

**Arquivos envolvidos:**
- `backend/routers/notas.py` — sanitizar `n.titulo` antes de usar em `Content-Disposition`

**Dependências:** Nenhuma.

**Observações:** ~5min. Fix de segurança trivial.

---

### Quick Switcher (Ctrl+P) — Nota Finder
**Status:** ⏳ Planejado
**Origem:** Conversa de análise DeepSeek + Gemini (Jun/2026)

**Descrição:** Modal de busca rápida de notas ativado por `Ctrl+P`, reutilizando `CommandPalette.tsx` com `mode="nota"`. Filtra notas do cache React Query por título. Mesma acessibilidade e navegação por setas do Ctrl+K.

**Arquivos envolvidos:**
- `frontend/src/components/CommandPalette.tsx` — adicionar `mode="nota"`
- `frontend/src/App.tsx` — registrar atalho `Ctrl+P`

**Dependências:** Nenhuma.

**Observações:** MVP em ~10min reaproveitando o que já existe.

---

### Pré-carregamento do InboxModal
**Status:** 🟡 Média Prioridade
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** InboxModal leva ~3s para abrir. Renderizar modal oculto ou usar `queryClient.prefetchQuery` para abertura instantânea.

**Arquivos:**
- `frontend/src/pages/Dashboard.tsx` — renderizar InboxModal oculto ou prefetch
- `frontend/src/pages/Ideias.tsx` — mesma abordagem

**Dependências:** Nenhuma.

**Observações:** ~30min. Melhoria de percepção de performance.

---

### Processar #tag e [[link]] no Inbox
**Status:** 🟡 Planejado
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** Ao criar ou arquivar item do inbox, extrair `#tags` e `[[wikilinks]]` do conteúdo. Tags associadas ao destino, wikilinks viram conexões.

**Arquivos:**
- `backend/routers/inbox.py` — extrair tags/wikilinks
- `backend/services/notes.py` — funções de extração reutilizáveis
- `frontend/src/components/InboxModal.tsx` — UI de confirmação (opcional)

**Dependências:** Nenhuma.

**Observações:** ~6h.

---

### Normalização de diacríticos na busca
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** O tokenizer `unicode61` do FTS5 já normaliza acentos (é = e, à = a, ã = a, ç = c). Nenhuma ação necessária — a busca já é accent-insensitive.

**Observações:** A estimativa original era 15min, depois corrigida para 1h, mas após verificação o FTS5 com `unicode61` já faz isso nativamente. Zero código necessário.

---

### Shutdown fix — response antes do kill
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `os.kill` em `shutdown.py` matava o processo antes do response chegar ao frontend. Corrigido com `threading.Timer(0.5, ...)` para agendar o kill depois da resposta. `PRAGMA wal_checkpoint(TRUNCATE)` executado antes do kill.

**Arquivos:** `backend/routers/shutdown.py`

---

### Timer personalizado (Pomodoro)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário

**Descrição:** Configuração de tempos do Pomodoro: foco (padrão 25min), pausa curta (5min), pausa longa (15min). Ciclo foco → pausa curta → foco → pausa longa. Config salva no `localStorage`.

**Arquivos:** `store/pomodoro.tsx`, `PomodoroTimer.tsx`, `Pomodoro.tsx`

---

### Execução simplificada (start.py + static serve)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário

**Descrição:** Script único que instala deps, builda frontend, sobe uvicorn e abre navegador. Backend serve frontend buildado como static file.

**Arquivos:** `start.py`, `backend/main.py`, `start.bat`

---

### Release v1.0.0 (MindFlow.bat + distribuição)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Continuação da Execução simplificada

**Descrição:** Bootstrap para Release via `MindFlow.bat`. Verifica Git/Python, clona, cria venv, instala deps, chama `start.py`.

**Arquivos:** `MindFlow.bat`, `start.py`

---

### Spellcheck nativo no editor
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** `EditorView.contentAttributes.of({ spellcheck: 'true' })` no CodeMirror. Cobre ~80% dos erros de digitação.

**Arquivos:** `frontend/src/components/EditorMarkdown.tsx`

---

### Detecção de WAL + cloud sync no startup
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** `start.py` verifica se o caminho do `.db` contém "onedrive", "dropbox", "icloud" ou "syncthing" e exibe alerta. WAL mode + nuvem corrompe o banco.

**Arquivos:** `start.py`

---

### PRAGMA wal_checkpoint(TRUNCATE) no shutdown
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** `PRAGMA wal_checkpoint(TRUNCATE)` executado antes do `os.kill` no shutdown via API.

**Arquivos:** `backend/routers/shutdown.py`

---

### Árvore de pastas (hierarquia com pai_id)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário (Jun/2026)

**Descrição:** Substituição da lista plana de pastas por visualização em árvore com indentação por nível, ▶/▼ toggle, ícone de pasta, contagem de notas. Suporte a criação de subpastas inline ao hover. Toda a lógica no frontend (flat API → tree via `pai_id`).

**Arquivos:** `frontend/src/pages/Ideias.tsx`

---

## 🟡 Média Prioridade — Discutidos, precisam de refinamento

### try/catch em DB writes do backend (erros 500 genéricos)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Quase todos os endpoints de criação/atualização/exclusão não têm try/catch. Se o DB write falha, o erro SQLAlchemy propaga como 500 com stack trace. Adicionar handler global FastAPI para `IntegrityError` → 400/409.

**Arquivos envolvidos:**
- `backend/main.py` — exception handler global para `IntegrityError`
- `backend/routers/notas.py:127-136` — rollback em `processar_wikilinks`
- Todos os routers — try/catch em operações de escrita

**Dependências:** Nenhuma.

**Observações:** ~4h.

---

### Índices de banco ausentes (8 índices faltando)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Migration `8616ba3b846c` adicionou 10 índices mas deixou de cobrir: `notas.pasta_id`, `notas.tipo_id`, `notas.atualizado_em`, `flashcards.nota_id`, `flashcards.proxima_revisao`, `sessoes_pomodoro.iniciado_em`, `tarefas.(data, status)`, `conexoes_notas.nota_destino_id`.

**Arquivos envolvidos:**
- Migration Alembic (8 novos índices)

**Dependências:** Nenhuma.

**Observações:** ~2h.

---

### Invalidação de cache React Query entre páginas
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Várias mutations invalidam cache de uma página mas não de páginas relacionadas. `checkHabitoMut` no Dashboard não invalida `['registros']`. Criar nota com wikilinks não invalida `['grafo']`. Adicionar/remover tags não invalida `['notas']`.

**Arquivos envolvidos:**
- `frontend/src/pages/Dashboard.tsx` — invalidar registros + hábitos
- `frontend/src/pages/Habitos.tsx` — invalidar chaves do Dashboard
- `frontend/src/pages/Ideias.tsx` — invalidar grafo + notas após tags

**Dependências:** Nenhuma.

**Observações:** ~3h.

---

### Erros silenciosos no frontend (swallowed errors)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Export falha e usuário não sabe, `createSessao` falha silenciosamente, `getLogs` falha e mostra lista vazia, arquivos não-.json ignorados sem aviso. Corrigir todos para exibir feedback visível.

**Arquivos envolvidos:**
- `frontend/src/components/Sidebar.tsx:64-66` — toast de erro no export
- `frontend/src/components/PomodoroTimer.tsx:103-106` — feedback de erro
- `frontend/src/components/LogsModal.tsx:18` — mensagem de erro
- `frontend/src/components/ImportModal.tsx:34` — "tipo não suportado"

**Dependências:** Componente Toast.

**Observações:** ~2h.

---

### onError com toast/notificação em todas as mutations
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Quase todas as mutations têm `onSuccess` mas não `onError`. Criar componente Toast e adicionar `onError` com feedback visível em todas as mutations.

**Arquivos envolvidos:**
- `frontend/src/components/Toast.tsx` (novo)
- `frontend/src/App.tsx` — toast global no mutations.onError
- Demais páginas com mutations

**Dependências:** Nenhuma.

**Observações:** ~3h.

---

### Type safety no frontend (any types + Partial incorreto)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** 8 usos de `Record<string, any>`, `executarQuery` retorna `dados: any[]`, funções de API usam `Partial<T>` para criação. Adicionar tipos específicos para create/update.

**Arquivos envolvidos:**
- `frontend/src/types/index.ts` — substituir `any` por tipos específicos
- `frontend/src/api/` — usar tipos dedicados em vez de `Partial<T>`

**Dependências:** Nenhuma.

**Observações:** ~4h.

---

### DRY: CRUD genérico no backend
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Routers repetem 3 padrões idênticos (create, update, delete). Extrair funções genéricas `create_entity()`, `update_entity()`, `delete_entity()` para reduzir ~120 linhas duplicadas.

**Arquivos envolvidos:**
- `backend/services/crud.py` (novo) — funções genéricas
- Todos os routers — refatorar

**Dependências:** Nenhuma.

**Observações:** ~3h. Refatoração pura.

---

### DRY: Hooks e componentes repetidos no frontend
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Handler de Escape repetido em 4 modais, `onCloseRef` pattern repetido, loading/error/empty repetido 20+ vezes, lógica de export duplicada. Extrair hooks `useEscapeKey`, `useLatestRef`, `useExport`, componente `<QueryState>`.

**Arquivos envolvidos:**
- `frontend/src/hooks/useEscapeKey.ts` (novo)
- `frontend/src/hooks/useLatestRef.ts` (novo)
- `frontend/src/hooks/useExport.ts` (novo)
- `frontend/src/components/QueryState.tsx` (novo)
- 4 modais + Sidebar + App.tsx

**Dependências:** Nenhuma.

**Observações:** ~3h.

---

### useMemo em filtros de lista (re-renders desnecessários)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `Habitos.tsx` filtra `habitos.filter(h => h.ativo)` duas vezes sem memo, `Dashboard.tsx` filtra tarefas e hábitos, `Flashcards.tsx` prop `notas` muda referência a cada render.

**Arquivos envolvidos:**
- `frontend/src/pages/Habitos.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Flashcards.tsx`

**Dependências:** Nenhuma.

**Observações:** ~2h.

---

### Endpoint batch de registros de hábitos
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `GET /api/habitos/registros?data=YYYY-MM-DD` que retorna todos os registros de todos os hábitos ativos em uma query. Resolve N+1 do Dashboard.

**Arquivos envolvidos:**
- `backend/routers/habitos.py` — novo endpoint batch
- `frontend/src/api/habitos.ts` — nova função `getAllRegistros`
- `frontend/src/pages/Dashboard.tsx` — usar endpoint batch

**Dependências:** Nenhuma.

**Observações:** ~2h.

---

### No pagination em endpoints de listagem
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Além de `GET /notas`, endpoints sem paginação: `GET /registros`, `GET /flashcards/review`, `GET /sessoes`, `GET /tarefas`. Adicionar `limit/offset`.

**Arquivos envolvidos:**
- `backend/routers/habitos.py`
- `backend/routers/flashcards.py`
- `backend/routers/pomodoro.py`
- `backend/routers/rotina.py`

**Dependências:** Nenhuma.

**Observações:** ~4h.

---

### Pomodoro associado a hábito
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Associar sessão Pomodoro a um hábito. Ao completar, check-in automático. É a primeira conexão fixa entre módulos.

**Arquivos envolvidos:**
- `backend/models.py` — campo `habito_id` em `SessaoPomodoro`
- Migration Alembic
- `frontend/src/components/PomodoroTimer.tsx` — dropdown de hábitos

**Dependências:** Nenhuma.

**Observações:** ~6h.

---

### Proteção contra loop em importação (pastas circulares)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `_topological_sort_pastas` em `import_data.py` não detecta ciclos. Adicionar detecção com visited set + recursion stack.

**Arquivos envolvidos:**
- `backend/routers/import_data.py` — detecção de ciclo

**Dependências:** Nenhuma.

**Observações:** ~1h.

---

### Pin de dependências Python + lockfile
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `requirements.txt` usa `>=` sem upper bound. Usar `pip-compile` para gerar `requirements.lock` com versões exatas.

**Arquivos envolvidos:**
- `backend/requirements.txt` — adicionar upper bounds
- `backend/requirements-dev.txt` — mesmo tratamento
- `start.py` — instalar a partir do lockfile

**Dependências:** Nenhuma.

**Observações:** ~2h.

---

### CI: eslint + vitest + coverage
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** CI pula eslint, vitest e coverage. Adicionar steps e threshold mínimo de cobertura.

**Arquivos envolvidos:**
- `.github/workflows/ci.yml` — adicionar `npm run lint`, `npm run test`, `pytest --cov`

**Dependências:** Nenhuma.

**Observações:** ~3h.

---

### Release ZIP com sujeira (exclusões insuficientes)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `release.yml` inclui `frontend/src/`, `backend/data/`, `__pycache__`, `.venv/` no ZIP. Expandir lista de exclusões.

**Arquivos envolvidos:**
- `.github/workflows/release.yml` — expandir exclusões

**Dependências:** Nenhuma.

**Observações:** ~15min.

---

### timeout-minutes nos jobs do CI
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Nenhum job tem `timeout-minutes`. Adicionar `timeout-minutes: 10` em cada job.

**Arquivos envolvidos:**
- `.github/workflows/ci.yml` — `timeout-minutes: 10`
- `.github/workflows/release.yml` — `timeout-minutes: 15`

**Dependências:** Nenhuma.

**Observações:** ~5min.

---

### Backend check no release workflow
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `release.yml` não roda testes backend antes de empacotar. Adicionar `pytest` ou usar `workflow_call`.

**Arquivos envolvidos:**
- `.github/workflows/release.yml` — dependência do CI ou steps de teste

**Dependências:** Nenhuma.

**Observações:** ~30min.

---

### Release notes automáticas no GitHub Release
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `release.yml` usa `generate_release_notes: false`. Ativar para `true`.

**Arquivos envolvidos:**
- `.github/workflows/release.yml`

**Dependências:** Nenhuma.

**Observações:** ~5min.

---

### Tabela redirects para wikilinks por ID/slug
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Wikilinks `[[título]]` resolvem por título. Quando o usuário renomeia uma nota, links quebram silenciosamente. Criar tabela `redirects(titulo_antigo, nota_id)`.

**Arquivos envolvidos:**
- `backend/models.py` — novo modelo `Redirect`
- Migration Alembic
- `backend/services/notes.py` — consultar redirects

**Dependências:** Nenhuma.

**Observações:** ~6h.

---

### Paginação server-side em GET /notas
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `GET /notas` retorna tudo sem limite. Adicionar `?limit=50&offset=0` no backend e `useInfiniteQuery` no frontend.

**Arquivos envolvidos:**
- `backend/routers/notas.py` — parâmetros `limit`/`offset`
- `frontend/src/api/notas.ts` — suportar paginação
- `frontend/src/pages/Ideias.tsx` — `useInfiniteQuery`

**Dependências:** Nenhuma.

**Observações:** ~4h. Preparação para escala.

---

### Histórico de versões de notas
**Status:** ⏳ Planejado
**Origem:** Revisão robustez

**Descrição:** Tabela `versoes_nota` com diff simples + botão "Restaurar".

**Observações:** Backend ~3h, UI ~5h. Considerar se o valor justifica o esforço em uso pessoal.

---

### Contador de acessos nas notas
**Status:** ⏳ Planejado
**Origem:** Conversa de análise DeepSeek + Gemini (Jun/2026)

**Descrição:** Campo `acessos` e `ultimo_acesso` na tabela `notas`. Incrementar no GET. Ordenar Ctrl+P por frequência.

**Arquivos:**
- `backend/models.py` — campos novos
- Migration Alembic
- `backend/routers/notas.py` — incrementar no GET
- `frontend/src/components/CommandPalette.tsx` — ordenar por acessos

**Dependências:** Ctrl+P implementado.

**Observações:** ~45min.

---

### Notas recentes no Ctrl+P (buffer local)
**Status:** ⏳ Planejado
**Origem:** Conversa de análise Gemini (Jun/2026)

**Descrição:** Mostrar 5 notas mais recentemente acessadas antes do campo de busca no Ctrl+P. Buffer no frontend (localStorage), sem backend.

**Arquivos:**
- `frontend/src/components/CommandPalette.tsx` — seção de recentes
- `frontend/src/store/` ou `App.tsx` — buffer de histórico

**Dependências:** Ctrl+P implementado.

**Observações:** ~30min. Reduz necessidade de digitar em ~80% dos usos.

---

### useMemo no PomodoroProvider + consolidar estado
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `PomodoroProvider` expõe estado num único objeto criado a cada render. Cada tick causa double re-render. `resetTimer` captura `fase` stale. Usar `useMemo` ou `useReducer`.

**Arquivos envolvidos:**
- `frontend/src/store/pomodoro.tsx` — `useMemo` no contexto ou `useReducer`

**Dependências:** Nenhuma.

**Observações:** ~1h.

---

### venv no start.py
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `start.py` instala deps no Python global. `MindFlow.bat` cria venv. Consistir os dois — adicionar detecção/criação de venv no `start.py`.

**Arquivos envolvidos:**
- `start.py` — adicionar lógica de venv

**Dependências:** Nenhuma.

**Observações:** ~2h.

---

### Ícones PNG no manifest.json (PWA Android)
**Status:** ✅ Implementado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `manifest.json` declara apenas SVGs. Chrome no Android requer PNG 192x192 para instalabilidade. Gerar PNGs e adicionar ao manifest.

**Arquivos envolvidos:**
- `frontend/public/icon-192.png` (novo)
- `frontend/public/icon-512.png` (novo)
- `frontend/public/manifest.json` — adicionar entradas PNG

**Dependências:** Nenhuma.

**Observações:** ~1h. Sem PNG, PWA não instala no Android Chrome.

---

### SW update notification (nova versão disponível)
**Status:** ✅ Implementado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Service Worker faz cache e atualiza automaticamente mas usuário não sabe. Adicionar listener para `controllerchange` e exibir toast/banner.

**Arquivos envolvidos:**
- `frontend/public/sw.js` — postMessage ao instalar nova versão
- `frontend/src/main.tsx` — listener para notificação

**Dependências:** Nenhuma.

**Observações:** ~3h.

---

### asyncio_mode no pytest
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Verificar se `pytest.ini` tem `asyncio_mode = auto`. Testes atuais são síncronos, mas quando assíncronos forem adicionados já estará configurado.

**Arquivos:**
- `backend/pytest.ini`

**Dependências:** Nenhuma.

**Observações:** ~5min. Preparatório.

---

## 🟢 Baixa Prioridade — Ideias gerais, sem refinamento

### Notificações nativas (navegador) para Pomodoro
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md

**Descrição:** Notification API para alertar quando o timer chegar a zero, mesmo com aba em segundo plano. Fallback para Web Audio se sem permissão.

---

### PWA (Service Worker + Manifest)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md

**Descrição:** Service worker e manifest para instalação como aplicativo.

**Arquivos:** `manifest.json`, `sw.js`, `icon-192.svg`, `icon-512.svg`, `vite.config.ts`

---

### Tema "Sistema" automático (☀/🌙/💻)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão de performance/UX

**Descrição:** Terceira opção no toggle que segue `prefers-color-scheme` do SO.

**Arquivos:** `store/theme.tsx`, `Sidebar.tsx`

---

### PRAGMA mmap_size + CORS restrito + índice composto
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão de performance/segurança

**Descrição:** `mmap_size=256MB`, CORS restrito, índice composto `registros_habito(habito_id, data)`.

**Arquivos:** `database.py`, `main.py`, migration `fac6c867ba98`

---

### Autocomplete de wikilinks no editor
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão UX

**Descrição:** Ao digitar `[[`, dropdown com títulos de notas via `@codemirror/autocomplete`.

**Arquivos:** `EditorMarkdown.tsx`, `Ideias.tsx`

---

### Export Markdown (nota = .md + frontmatter YAML)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão portabilidade

**Descrição:** `GET /api/notas/{id}/export/md` com YAML frontmatter. Botão "↓ .md" no cabeçalho da nota.

---

### Journaling diário automático
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão produtividade

**Descrição:** Template "Diário" aplicado automaticamente ao abrir o Dashboard se não houver nota na data.

**Arquivos:** `Dashboard.tsx`

---

### GET /api/stats/weekly
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Provocação de arquitetura

**Descrição:** Endpoint que agrega notas, tarefas, pomodoros, minutos foco, taxa hábitos, streak. Suporta `?offset=`.

---

### Revisão Semanal
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão produtividade

**Descrição:** Página de agregação semanal com comparativo, gráficos, reflexão, navegação entre semanas.

**Arquivos:** `backend/routers/stats.py`, `frontend/src/pages/RevisaoSemanal.tsx`

---

### 5 novas views nas Consultas
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário

**Descrição:** Lista, Galeria, Formulário, Calendário, Gantt — 7 visualizações no total.

---

### Tags por cores + filtro combinado
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md

**Descrição:** Chips coloridos, filtro AND por tags, color picker, PATCH tags.

---

### Arrastar blocos de tempo no calendário semanal
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md

**Descrição:** Drag-and-drop no CalendarioSemanal com @dnd-kit.

---

### UX de notas — 3 bugs pendentes
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md

**Descrição:** Loading/erro/sucesso nos botões, auto-save com debounce, `beforeunload` quando dirty.

---

### 5 bugs de segurança/robustez (auditoria)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Módulo 21

**Descrição:** SQL injection, cover_url, tag IDs não-numéricos, sessaoId deps, import timeout.

---

### sw.js — filtro chrome-extension
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Módulo 21

**Descrição:** Filtro `event.request.url.startsWith('http')` no SW.

---

### Sistema de logs (RotatingFileHandler + endpoint)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Sessão de melhoria contínua

**Descrição:** RotatingFileHandler 1MB × 3 backups, endpoint GET/POST/DELETE, frontend captura `window.onerror` + batch.

**Arquivos:** `backend/logging_config.py`, `backend/routers/logs.py`, `frontend/src/api/logs.ts`, `LogsModal.tsx`

---

### CI/CD integrado (GitHub Actions)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Necessidade de qualidade contínua

**Descrição:** `ci.yml` (ruff, pytest, tsc, build), `release.yml` (tag → zip → release).

---

### Migrar on_event para lifespan (FastAPI)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Depreciação FastAPI

**Descrição:** Substituir `@app.on_event("startup")` pelo context manager `lifespan`.

---

### Botão encerrar app / shutdown
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário

**Descrição:** `POST /api/shutdown` + botão ⏻ na sidebar com ConfirmModal.

---

### Preview de nota ao hover
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão UX

**Descrição:** Tooltip com conteúdo resumido ao pairar em wikilinks. Debounce 300ms.

---

### Backup a frio automatizado (cold copy via start.py)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Conversa de análise Gemini (Jun/2026)

**Descrição:** `shutil.copy2` do `.db` antes de subir o servidor.

---

### Sincronização multi-aba
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário

**Descrição:** `useBroadcastSync` via BroadcastChannel para tema + pomodoro.

---

### Bundle splitting (CodeMirror + d3-force)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão performance

**Descrição:** `manualChunks` separa `@codemirror/*` (582 kB) e `d3-force` (13 kB) do chunk Ideias (627 kB → 33 kB).

---

### App desktop (Tauri ou Electron)
**Status:** ⏳ Ideia
**Origem:** CONTEXT.md

**Descrição:** Empacotar como desktop nativo. Tauri escolha certa mas backend Python complica. **Não fazer agora** — PWA já cumpre o papel.

---

### Codecov (cobertura de testes)
**Status:** ⏳ Ideia
**Origem:** Análise DeepSeek (Jun/2026)

**Descrição:** Integrar Codecov no CI para rastrear cobertura. `pytest --cov` + upload.

---

### Suporte mobile refinado
**Status:** ⏳ Ideia
**Descrição:** Gestos de swipe, navegação inferior, editor adaptado para touch.

---

### i18n (múltiplos idiomas)
**Status:** ⏳ Ideia
**Descrição:** Internacionalizar interface. Só se houver demanda.

---

### Rate-limit nos endpoints
**Status:** ⏳ Ideia
**Descrição:** Middleware slowapi. Overengineering para contexto atual.

---

### Sanitização Markdown renderizado
**Status:** ⏳ Ideia
**Descrição:** Se futuro renderizador HTML for adicionado, usar DOMPurify.

---

### Acessibilidade — ARIA labels em botões de ícone
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Botões de ícone sem `aria-label`, checkboxes sem `aria-checked`, cards de flashcard sem `role="button"`. Adicionar atributos semânticos.

**Arquivos envolvidos:** Sidebar, Habitos, Rotina, Dashboard, Flashcards, ConfirmModal, ImportModal

**Observações:** ~3h.

---

### Acessibilidade — Navegação por teclado
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Flip de flashcard é click-only, nós do grafo não têm `tabIndex`, células do calendário são `<div>` com `onClick`. Adicionar suporte a teclado.

**Arquivos envolvidos:** Flashcards, GrafoNotas, HabitoCalendario

**Observações:** ~2h.

---

### Cobertura de testes — Backend (routers sem testes)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Routers sem testes dedicados: habitos, pomodoro, export, import_data. Edge cases não testados: estatísticas com mês inválido, FTS5 cleanup, wikilinks com aspas.

**Arquivos:**
- `backend/tests/test_habitos.py` (novo)
- `backend/tests/test_pomodoro.py` (novo)
- `backend/tests/test_import.py` (novo)

**Observações:** ~6h.

---

### Cobertura de testes — Frontend (1 arquivo de teste)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Frontend tem apenas 7 testes num arquivo. Sem testes para API client, hooks, stores, ou componentes. Usar MSW para mocks.

**Observações:** ~8h. Prioridade baixa — UI muda frequentemente.

---

### Export DELETE sem autenticação
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `DELETE /api/logs`, `POST /api/import`, `GET /api/export` expõem dados/destruição sem auth. App é local-first por design, mas documentar trade-off.

**Observações:** ~2h (documentação). Implementar token opcional apenas se houver demanda.

---

### Grafo d3-force: inicialização como blob com 500 nós
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Simulação d3-force cria todos os nós no centro. Adicionar `forceX`/`forceY` com spread ou `d3.forceCollide` com raio adequado.

**Arquivos envolvidos:**
- `frontend/src/components/GrafoNotas.tsx`

**Observações:** ~1h. Melhoria visual.

---

### Timestamp migration (str → datetime nativo)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Campos de datahora usam strings ISO em vez de datetime nativo do SQLite. Correção eliminaria hacks de string. **Risco alto, recompensa baixa — fazer apenas se houver bug real.**

**Observações:** ~8h. Não urgente — o schema atual funciona.

---

### CASCADE deletes via migration
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** FKs sem `ON DELETE CASCADE`. Cleanup é procedural em Python, mas mais explícito. **Manter procedural — CASCADE esconde bugs e dificulta debug.**

**Observações:** ~4h. Não recomendado sem motivo concreto.

---

### Split notas.py em múltiplos routers
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** `notas.py` tem 395 linhas e 5 domínios. Separar em routers: pastas, tags, templates.

**Observações:** ~4h. Melhoria de manutenção, zero impacto funcional.

---

### Módulo de Contexto Ambiental (Open-Meteo + Nager.Date + IP Geolocation)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Clima no Dashboard, feriados para streak justo, localização automática. APIs gratuitas sem key.

**Arquivos envolvidos:**
- `backend/routers/contexto.py` (novo)
- `backend/services/contexto.py` (novo)
- `frontend/src/api/contexto.ts` (novo)
- `frontend/src/pages/Dashboard.tsx` — widget de clima

**Sub-itens:** IP Geolocation (1h) → Open-Meteo (4h) → Nager.Date (3h)

**Observações:** ~8h. Puramente incremental — app funciona 100% sem.

---

### Resiliência de APIs externas (offline-first com graceful fallback)
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Timeout 5s, try/catch com fallback, validação de schema, log de warning, frontend renderiza condicionalmente.

**Arquivos envolvidos:**
- `backend/services/contexto.py` — `fetch_with_fallback()`
- `frontend/src/api/contexto.ts` — tratamento de resposta vazia

**Dependências:** Módulo de Contexto Ambiental.

**Observações:** ~2h.

---

### #13 Compactar cards do Dashboard
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Os 5 cards do Dashboard ocupam muito espaço vertical. Cada card tem padding fixo e títulos grandes. Reduzir padding de `p-4` para `p-3`, reduzir tamanho de fonte dos títulos de `text-sm` para `text-xs`, e usar layout mais denso. Meta: mostrar todos os cards sem scroll em 768px de altura.

**Arquivos envolvidos:** `frontend/src/pages/Dashboard.tsx` — Card component props

**Dependências:** Nenhuma.

**Observações:** ~30min. Apenas Tailwind classes.

---

### #14 Agrupar ações no Habitos page
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** Na página de Hábitos, cada hábito tem botões de editar/deletar ao lado. Com muitos hábitos, fica poluído. Agrupar ações em um menu "..." (kebab) no canto direito de cada linha, com ações: Editar, Pomodoro, Deletar.

**Arquivos envolvidos:** `frontend/src/pages/Habitos.tsx` — botões de ação por hábito

**Dependências:** Nenhuma.

**Observações:** ~1h. Requer componente de menu dropdown simples.

---

### #17 Aumentar densidade do calendário mensal de hábitos
**Status:** ⏳ Planejado
**Origem:** Análise técnica (Jun/2026)

**Descrição:** O `HabitoCalendario` renderiza uma grade 7×N com células grandes. Em monitores menores, o calendário ocupa muito espaço. Reduzir cell-height, diminuir font-size dos números do dia, e compactar o header do mês.

**Arquivos envolvidos:** `frontend/src/components/HabitoCalendario.tsx` — classes Tailwind

**Dependências:** Nenhuma.

**Observações:** ~30min. Apenas CSS/Tailwind.

---

## 🔮 Requer Refinamento — Ideias que precisam de spec antes de codar

### Estratégia de resiliência de dados (auto-save + conflitos)
**Status:** ⏳ Ideia

**Descrição:** Auto-save com debounce de 2s + `updateNota`. Se usuário navega durante save, mutation tenta atualizar state desmontado. Duas abas editando mesma nota = perda silenciosa. Definir: last-write-wins é aceitável? Adicionar versioning otimista? Auto-save deve usar `mutateAsync`?

---

### Estratégia de lazy loading e code splitting avançado
**Status:** ⏳ Ideia

**Descrição:** CodeMirror e d3-force já separados. Próximo nível: lazy load do CodeMirror só quando Ideias for visitada, preloading de páginas prováveis. Medir bundle e decidir se ganho justifica complexidade.

---

### Sistema de undo/redo global
**Status:** ⏳ Ideia

**Descrição:** Deletar nota/hábito/flashcard é irreversível (ConfirmModal não é undo). Opções: soft-delete com `deleted_at` + purge 30d, trash bin com restauração, event sourcing. Definir escopo — todas entidades ou só notas?

---

### Estratégia de busca unificada (Ctrl+P expandido)
**Status:** ⏳ Ideia

**Descrição:** CommandPalette busca só notas por título. Expandir para hábitos, tarefas, flashcards, templates, e conteúdo de notas (FTS5). Definir: entidades buscáveis, ranking, UI heterogênea, busca client-side vs server-side.

---

### Criptografia local (sqlcipher / campo a campo)
**Status:** ⏳ Ideia

**Descrição:** Criptografia transparente via sqlcipher ou campo a campo com senha mestra. Trade-off real com FTS5 (busca não funciona em texto cifrado). Senha perdida = dados perdidos.

---

### API de plugins / extensões locais
**Status:** ⏳ Ideia

**Descrição:** Hooks para extensões Python em `extensions/` que adicionam endpoints ou automatizam tarefas. Requer definição de interface, isolamento, permissões.

---

### Sistema de perfis (evolução de "Múltiplos workspaces")
**Status:** ⏳ Ideia

**Descrição:** Múltiplas pessoas num computador, cada uma com `.db` separado. Tela de seleção de perfil sem senha. Engine dinâmica, troca via API sem restart. **~16h. Mudança arquitetural que toca no coração do app. Aguardar estabilidade.**

**Abordagem recomendada:** Bancos separados (1 `.db` por perfil). Engine singleton → engine dinâmica. Models e migrations iguais pra todos.

**Decisões pendentes:** Perfil tem senha? Avatar? Máximo de perfis? Troca exige restart?

---

### Workflows / Automações declarativas (Nível 2)
**Status:** ⏳ Ideia

**Descrição:** Tabela `automacoes` com regras `quando(X) → fazer(Y)`. Ex: `quando(pomodoro_completado, habito_id=5) → fazer(habito_checkin)`. Observar Nível 1 (conexões fixas) antes de construir.

---

### Dicionário integrado (Dicionário Aberto + Free Dictionary API)
**Status:** ⏳ Ideia

**Descrição:** Selecionar palavra no editor → ação contextual "Buscar definição". APIs gratuitas sem key. Criar flashcard de vocabulário com 1 clique.

**Arquivos:** `backend/routers/dicionario.py` (novo), `EditorMarkdown.tsx` — ação contextual

**Observações:** ~3h. Nicho — fazer depois do Contexto Ambiental se houver demanda.

---

### Capas automáticas via Unsplash Source
**Status:** ⏳ Ideia

**Descrição:** Botão "Gerar capa" que busca imagem do Unsplash Source por tag/pasta. Sem API key. Fallback se offline.

**Observações:** ~2h. Puramente estético.

---

### Revisão Semanal — Redesign "Ritual de Fechamento"
**Status:** 🔧 Parcialmente implementado (Módulo 1 ✅, Módulo 2 ✅, Módulo 3 ⏳)

**Descrição:** Redesign completo da Revisão Semanal em 4 momentos: Score (78/100), Celebrações automáticas, Lacunas com botões de ação, Planejamento com metas. Duas dimensões: produtividade (hábitos/tarefas/pomodoro) e conhecimento (notas/wikilinks/grafo). Métrica exclusiva de conectividade.

**Sub-itens:**
1. **Módulo 1 (~6h)** — Score composto + breakdown + comparativo visual ✅
2. **Módulo 2 (~6h)** — Celebrações automáticas + Lacunas com botões de ação ✅
3. **Módulo 3 (~8h)** — Planejamento (tabela `metas_semana` + migração tarefas + "Iniciar próxima semana") ⏳

**Arquivos:** `frontend/src/pages/RevisaoSemanal.tsx` (redesign), `backend/routers/stats.py` (expandido), `backend/services/score.py` (novo), `backend/models.py` (MetaSemana), Migration Alembic

**Observações:** Feature de maior porte. Módulos 1 e 2 implementados na v1.2.0. Módulo 3 pendente — requer modelo de dados novo (`metas_semana`).

