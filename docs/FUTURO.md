# MindFlow — Futuras Adições

> Registro centralizado de todas as features planejadas, organizadas por prioridade.
> Cada item contém descrição, arquivos envolvidos, dependências e status.
> Itens marcados como ✅ foram implementados e permanecem como registro histórico.

## Legenda
- 🔴 Alta / 🟡 Média / 🟢 Baixa
- ⏳ Planejado / 🔧 Em andamento / ✅ Implementado

---

## 🔴 Alta Prioridade — Refinados, prontos para execução

### Timer personalizado (Pomodoro)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário (Item 2)

**Descrição:** Permitir que o usuário configure os tempos do Pomodoro antes de iniciar: duração do foco (padrão 25min), pausa curta (padrão 5min) e pausa longa (padrão 15min). As configurações ficam salvas no `localStorage`.

**Arquivos envolvidos:**
- `frontend/src/store/pomodoro.tsx` — adicionar configurações de tempo + ciclo foco/pausa
- `frontend/src/components/PomodoroTimer.tsx` — UI de configuração + ciclo automático
- `frontend/src/pages/Pomodoro.tsx` — expor controles de configuração

**Dependências:** Nenhuma.

**Observações:** O timer atual não tem conceito de "pausa" — apenas foco. Será necessário adicionar ciclo foco → pausa curta → foco → pausa longa.

**Implementado:** Módulo 1 (Context + config), Módulo 2 (UI configuração), Módulo 3 (Ciclo automático)

---

### Execução simplificada (start.py + static serve)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário (Item 3)

**Descrição:** Script Python único que instala dependências, builda o frontend (se necessário), sobe o servidor e abre o navegador. Backend passa a servir o frontend buildado como static file, eliminando a necessidade de Node.js no dia a dia.

**Arquivos envolvidos:**
- `start.py` (novo, raiz) — script principal
- `backend/main.py` — adicionar `StaticFiles` + catch-all route SPA
- `start.bat` — simplificar para só chamar `python start.py`

**Dependências:** Nenhuma.

**Observações:** Depois da primeira execução (que instala tudo), Node.js só é necessário se o frontend precisar ser rebuildado.

---

### Release v1.0.0 (MindFlow.bat + distribuição)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Continuação da Execução simplificada

**Descrição:** Bootstrap para Release via `MindFlow.bat` (~2KB). Verifica Git/Python, clona repositório (se necessário), cria `venv`, instala deps, e chama `start.py`. Anexado à Release v1.0.0 do GitHub para download com um clique.

**Arquivos envolvidos:**
- `MindFlow.bat` (raiz) — entrypoint único para o usuário final
- `start.py` — motor principal (já existente)

**Dependências:** Nenhuma.

---

### Quick Switcher (Ctrl+P) — Nota Finder
**Status:** ⏳ Planejado
**Origem:** Conversa de análise DeepSeek + Gemini (Jun/2026)

**Descrição:** Modal de busca rápida de notas ativado por `Ctrl+P`, reutilizando o componente `CommandPalette.tsx` existente com `mode="nota"`. Filtra notas já carregadas no cache do React Query (`useNotas()`) usando `filter` simples por título. Mesma acessibilidade, navegação por setas e Enter do Ctrl+K, mas sem contaminar o namespace de comandos.

**Arquivos envolvidos:**
- `frontend/src/components/CommandPalette.tsx` — adicionar `mode="nota"`, injetar `useNotas()`
- `frontend/src/App.tsx` — registrar atalho `Ctrl+P` (prevenir conflito com print do navegador)

**Dependências:** Nenhuma (cache do React Query já carrega as notas para a sidebar).

**Observações:** MVP em ~10min reaproveitando o que já existe. Próximo passo (pós-MVP): buffer local de 5 notas recentes antes do campo de busca (Opção C da conversa com Gemini). Evolução futura: Omnibar com comandos `>tarefa` e `/pomodoro`.

---

## 🟡 Média Prioridade — Discutidos, precisam de refinamento

### 5 novas views nas Consultas
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário (Item 4)

**Descrição:** Adicionar 5 novos modos de visualização às Consultas além de Grid e Kanban.

**Sub-itens:**
1. **Lista** — Exibição densa em coluna, título + ícone do tipo + uma propriedade secundária. Suporte a reordenação drag-and-drop vertical.
2. **Galeria** — Grade de cards com imagem de capa extraída automaticamente (cover_url → regex markdown → fallback). Rodapé com título.
3. **Calendário** — Matriz mensal onde o usuário define qual propriedade da nota age como âncora de data. Drag-and-drop entre dias atualiza a propriedade no backend.
4. **Cronograma (Gantt)** — Barras horizontais posicionadas no tempo usando data_inicio e data_fim. Arrastar move início/fim. Redimensionar bordas altera individualmente cada data.
5. **Formulário** — Gerador dinâmico de campos baseado no `schema_campos` do Tipo de Objeto. Lê o schema JSON e instancia inputs corretos (date, number, select, etc.). Cria nota nova com as propriedades preenchidas.

**Arquivos envolvidos:**
- `frontend/src/pages/Consultas.tsx` — 5 novos renderers
- `backend/routers/queries.py` — possíveis ajustes no endpoint
- `backend/models.py` — definir estrutura do `schema_campos` (hoje é `{}` vazio)
- `backend/seed.py` — preencher `schema_campos` dos tipos padrão

**Dependências:** Definir estrutura do `schema_campos` (convenção de tipos, opções, obrigatoriedade). Preencher seed data.

**Observações:** Feature de maior porte. Recomendado implementar view por view. Formulário depende de definição do schema.

**Implementado:** Lista (Módulo 1), Galeria (Módulo 2), Formulário (Módulo 3), Calendário (Módulo 4), Gantt (Módulo 5)

---

### Tags por cores + filtro combinado
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md — Próximos Passos (Item 1)

**Descrição:** Tags já têm campo `cor` no backend, mas não é usado no frontend. Adicionar exibição colorida nas notas + filtro combinado (selecionar múltiplas tags para filtrar notas).

**Arquivos envolvidos:**
- `frontend/src/pages/Ideias.tsx` — filtro por tags na sidebar, chips coloridos, modal de criação/edição com color picker
- `frontend/src/api/notas.ts` — `getNotas` com `tagIds`, `updateTag`, `getNotaTags`
- `backend/routers/notas.py` — `GET /notas?tag_ids=` (AND), `PATCH /tags/{id}`, `GET /notas/{id}/tags`, `DELETE /notas/{id}/tags/{tag_id}`
- `backend/models.py` — `TagUpdate` model

**Implementado:** Módulo 1 (Backend), Módulo 2 (Frontend exibição + color picker), Módulo 3 (Frontend filtro combinado)

**Dependências:** Nenhuma. Campo `cor` já existe no modelo.

---

### Arrastar blocos de tempo no calendário semanal
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md — Próximos Passos (Item 2)

**Descrição:** Permitir arrastar blocos de horário no CalendarioSemanal para alterar hora_inicio/hora_fim. Drag-and-drop visual com feedback em tempo real.

**Arquivos envolvidos:**
- `frontend/src/components/CalendarioSemanal.tsx` — drag-and-drop
- `frontend/src/api/rotina.ts` — função updateBloco

**Dependências:** Nenhuma.

---

## 🟢 Baixa Prioridade — Ideias gerais, sem refinamento

### Notificações nativas (navegador) para Pomodoro
**Status:** 🟡 Movido para Média Prioridade
**Origem:** CONTEXT.md — Próximos Passos (Item 3)

**Descrição:** Usar Notification API do navegador para alertar quando o timer do Pomodoro chegar a zero, mesmo com a aba em segundo plano.

---

### PWA (Service Worker + Manifest)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** CONTEXT.md — Próximos Passos (Item 4)

**Descrição:** Adicionar service worker e manifest para permitir instalação como aplicativo no sistema operacional.

**Arquivos envolvidos:**
- `frontend/public/manifest.json` — name, icons, shortcuts, theme_color
- `frontend/public/sw.js` — cache-first assets estáticos, network-only `/api/`
- `frontend/public/icon-192.svg`, `icon-512.svg` — ícones "MF" gradiente escuro
- `frontend/vite.config.ts` — hash nos assets, `publicDir: 'public'`
- `frontend/index.html` — `<link rel="manifest">` + theme-color
- `frontend/src/main.tsx` — registro SW com error handling

**Implementado:** Manifest + Service Worker + Vite config + Ícones + Registro SW

---

### Tema "Sistema" automático (☀/🌙/💻)
**Status:** ✅ Implementado (Jun/2026) — v1.0.1
**Origem:** Revisão de performance/UX

**Descrição:** Terceira opção no toggle que segue `prefers-color-scheme` do sistema operacional, com listener `matchMedia('change')` para atualizar em tempo real.

**Arquivos:** `store/theme.tsx`, `Sidebar.tsx`

---

### PRAGMA mmap_size + CORS restrito + índice composto
**Status:** ✅ Implementado (Jun/2026) — v1.0.1
**Origem:** Revisão de performance/segurança

**Descrição:**
- `PRAGMA mmap_size=268435456` — acelera leitura em bases maiores
- CORS restrito a `localhost:5173`, `127.0.0.1:5173`, `localhost:8000`
- Índice composto `registros_habito(habito_id, data)` — acelera check-ins e streaks

**Arquivos:** `database.py`, `main.py`, migration `fac6c867ba98`

---

### Autocomplete de wikilinks no editor
**Status:** ✅ Implementado (v1.1.2, Jun/2026)
**Origem:** Revisão UX

**Descrição:** Ao digitar `[[`, o editor mostra dropdown com títulos de notas existentes via `@codemirror/autocomplete`. Filtragem por prefixo, `apply: "Título]]"`.

**Arquivos:** `EditorMarkdown.tsx`, `Ideias.tsx`

---

### Export Markdown (nota = .md + frontmatter YAML)
**Status:** ✅ Implementado (v1.1.2, Jun/2026)
**Origem:** Revisão portabilidade

**Descrição:** `GET /api/notas/{id}/export/md` com YAML frontmatter (id, titulo, criado_em, pasta, tags). Botão "↓ .md" no cabeçalho da nota.

---

### Journaling diário automático
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão produtividade

**Descrição:** Template "Diário" aplicado automaticamente ao abrir o Dashboard se não houver nota na data de hoje.

**Arquivos:** `Dashboard.tsx`, templates existentes

---

### GET /api/stats/weekly (diário de bordo)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Provocação de arquitetura

**Descrição:** Endpoint que agrega: dados da semana (notas, tarefas, pomodoros, minutos foco, taxa hábitos), comparativo com semana anterior, streak atual. Suporta `?offset=` para navegar entre semanas.

---

### Revisão Semanal
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão produtividade

**Descrição:** Página de agregação: taxa de conclusão de hábitos, tarefas concluídas, minutos de foco, notas criadas, prompt reflexivo. Navegação entre semanas via setas (‹ ›). Botão "Criar nota de revisão" gera nota com dados preenchidos. Comparativo percentual com semana anterior.

**Arquivos:** `backend/routers/stats.py`, `frontend/src/pages/RevisaoSemanal.tsx`, `frontend/src/api/stats.ts`, `App.tsx`, `Sidebar.tsx`

**Dependências:** `GET /api/stats/weekly`

---

### Histórico de versões de notas
**Status:** 🟡 Planejado
**Origem:** Revisão robustez

**Descrição:** Tabela `versoes_nota` com diff simples + botão "Restaurar". Backend é trivial (~3h). UI de navegação dobra o esforço (~5h).

---

### Contador de acessos nas notas
**Status:** 🟡 Planejado
**Origem:** Conversa de análise DeepSeek + Gemini (Jun/2026)

**Descrição:** Adicionar campo `acessos` (INTEGER, default 0) e `ultimo_acesso` (DATETIME, nullable) na tabela `notas`. Incrementar no `GET /api/notas/{id}`. Ordenar resultados do Ctrl+P por frequência de acesso.

**Arquivos:**
- `backend/models.py` — campos `acessos` e `ultimo_acesso`
- Migration Alembic
- `backend/routers/notas.py` — incrementar no GET
- `frontend/src/components/CommandPalette.tsx` — ordenar por acessos no Ctrl+P

**Dependências:** Ctrl+P implementado (para usar a ordenação).

**Observações:** Sem essa métrica, toda decisão de ordenação/relevância é chute. Com ela, Ctrl+P pode mostrar notas mais acessadas primeiro. 30min de implementação.

---

### Notas recentes no Ctrl+P (buffer local)
**Status:** 🟡 Planejado
**Origem:** Conversa de análise Gemini (Jun/2026)

**Descrição:** Mostrar 5 notas mais recentemente acessadas antes do campo de busca no Ctrl+P quando o termo estiver vazio. Buffer mantido no frontend (localStorage ou Context), sem backend novo. Regra: `if (termo.length === 0) return recentes; else return notas.filter(...)`.

**Arquivos:**
- `frontend/src/components/CommandPalette.tsx` — seção de recentes antes do campo de busca
- `frontend/src/App.tsx` ou `frontend/src/store/` — buffer de histórico de navegação

**Dependências:** Ctrl+P implementado.

**Observações:** Reduz necessidade de digitar em ~80% dos usos (você quer a nota que estava editando há 5 minutos). Zero backend, zero schema novo. 30min.

---

### App desktop (Tauri ou Electron)
**Status:** ⏳ Planejado
**Origem:** CONTEXT.md — Próximos Passos (Item 5)

**Descrição:** Empacotar MindFlow como aplicativo desktop nativo. Tauri é a escolha certa mas o backend Python complica — opções: PyO3, Python embedded, ou reescrita em Rust. **Não fazer agora** — PWA já cumpre o papel.

---

### UX de notas — 3 bugs pendentes
**Status:** ✅ Implementado (v1.1.0, Jun/2026)
**Origem:** CONTEXT.md — Bugs Pendentes

**Descrição:**
- Bug 25: Feedback visual ao criar/editar notas — estados loading/erro/sucesso nos botões
- Bug 26: Indicador de salvamento automático — auto-save com 2s debounce + status inline
- Bug 27: Confirmação ao sair com alterações não salvas — `beforeunload` quando dirty

**Arquivos:** `Ideias.tsx`

---

### 5 bugs de segurança/robustez (auditoria)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Módulo 21

**Descrição:**
- SQL injection via f-string em `queries.py:104` — `campo_agrupamento` validado com regex
- `extrair_bloco` sem `cover_url` em `notas.py:250` — adicionado `extrair_cover_url()`
- tag IDs não-numéricos silenciosos em `notas.py:82` — `logger.warning` adicionado
- `sessaoId` em deps do timer (`PomodoroTimer.tsx:134`) — removido do array
- import sem timeout em `import_data.py:98` — `asyncio.wait_for(30s)` + HTTP 408

---

### sw.js — filtro chrome-extension
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Módulo 21

**Descrição:** Service Worker tentava cachear URLs de extensões (`chrome-extension://`), gerando erro no console. Adicionado filtro `event.request.url.startsWith('http')` antes de `cache.put()`.

---

### Sistema de logs (RotatingFileHandler + endpoint)
**Status:** ✅ Implementado (v1.1.0, Jun/2026)
**Origem:** Sessão de melhoria contínua

**Descrição:** Sistema de logs com `RotatingFileHandler` (1MB × 3 backups) em `backend/data/mindflow.log`. Endpoint `GET/POST/DELETE /api/logs`. Frontend captura `window.onerror` + `unhandledrejection` + `ErrorBoundary`, envia para o backend com throttle (10/60s) e batch (5s/10 itens).

**Arquivos:** `backend/logging_config.py`, `backend/routers/logs.py`, `frontend/src/api/logs.ts`, `frontend/src/components/LogsModal.tsx`

---

### CI/CD integrado (GitHub Actions)
**Status:** ✅ Implementado (v1.1.0, Jun/2026)
**Origem:** Necessidade de qualidade contínua

**Descrição:** Workflows `ci.yml` (ruff, pytest 60, tsc, build) e `release.yml` (tag → build → zip → GitHub Release). `requirements-dev.txt` com dependências de teste.

**Arquivos:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `backend/requirements-dev.txt`

---

### Migrar on_event para lifespan (FastAPI)
**Status:** ✅ Implementado (v1.1.0, Jun/2026)
**Origem:** Depreciação FastAPI

**Descrição:** Substituir `@app.on_event("startup")` pelo context manager `lifespan` moderno. Removeu 2 warnings de depreciação. `pytest.ini` filtra `StarletteDeprecationWarning` restante (httpx2 ainda não estável).

**Arquivos:** `backend/main.py`, `backend/pytest.ini`

---

### Botão encerrar app / shutdown
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Revisão do usuário

**Descrição:** `POST /api/shutdown` encerra o servidor. Botão ⏻ na sidebar com ConfirmModal.

**Arquivos:** `backend/routers/shutdown.py`, `frontend/src/components/Sidebar.tsx`, `frontend/src/App.tsx`

---

## 🔮 Requer Refinamento — Ideias que precisam de spec antes de codar

### Criptografia local (sqlcipher / campo a campo)
**Status:** ⏳ Ideia
**Descrição:** Oferecer criptografia transparente via sqlcipher ou criptografia campo a campo com senha mestra. Trade-off real com FTS5 (busca não funciona em texto cifrado). Senha perdida = dados perdidos.

### API de plugins / extensões locais
**Status:** ⏳ Ideia
**Descrição:** Hooks para extensões Python numa pasta `extensions/` que adicionam endpoints ou automatizam tarefas. Requer definição de interface, isolamento, permissões.

### Múltiplos workspaces
**Status:** ⏳ Ideia
**Descrição:** Permitir criar/alternar workspaces (ex: "Pessoal", "Trabalho"). Cada workspace = um `.db` separado. Exige refatoração do `database.py` (engine singleton).

### Preview de nota ao hover
**Status:** ✅ Implementado (v1.1.2, Jun/2026)
**Descrição:** Tooltip com conteúdo resumido (strip markdown) ao pairar em wikilinks. Debounce 300ms, fetch via `getNota`, posicionamento CSS. Componente `RenderConteudo` em `Ideias.tsx`.

### Backup a frio automatizado (cold copy via start.py)
**Status:** ✅ Implementado (Jun/2026)
**Origem:** Conversa de análise Gemini (Jun/2026)

**Descrição:** `start.py` faz `shutil.copy2` do `.db` antes de subir o servidor. Cópia fria (arquivo fechado) — sem risco de corrupção de WAL.

**Arquivos:** `start.py`

### Sincronização multi-aba
**Status:** ✅ Implementado (Jun/2026)
**Descrição:** `useBroadcastSync` hook sincroniza tema e estado do Pomodoro entre abas via `BroadcastChannel`.

**Arquivos:** `frontend/src/hooks/useBroadcastSync.ts`, `frontend/src/store/theme.tsx`, `frontend/src/store/pomodoro.tsx`

### Bundle splitting (CodeMirror + d3-force)
**Status:** ✅ Implementado (Jun/2026)
**Descrição:** `manualChunks` no Vite separa `@codemirror/*` (582 kB) e `d3-force` (13 kB) do chunk Ideias (627 kB → 33 kB).

**Arquivos:** `frontend/vite.config.ts`

### Suporte mobile refinado
**Status:** ⏳ Ideia
**Descrição:** Gestos de swipe, navegação inferior, editor adaptado para touch. Exigiria redesign significativo.

### i18n (múltiplos idiomas)
**Status:** ⏳ Ideia
**Descrição:** Internacionalizar interface. Não urgente — fazer só se houver demanda.
  
### Rate-limit nos endpoints
**Status:** ⏳ Ideia
**Descrição:** Middleware slowapi para FastAPI. Sem autenticação, qualquer processo local pode bombardear o backend. Overengineering para o contexto atual.

### Sanitização Markdown renderizado
**Status:** ⏳ Ideia
**Descrição:** Se futuro renderizador HTML for adicionado, usar DOMPurify. Hoje o conteúdo é texto puro — não vulnerável.
