# MindFlow — Changelog

> Histórico de versões resumido. Para a narrativa completa, veja [HISTORICO.md](./HISTORICO.md).

## v1.2.12 (2026-06-19)

- WAL → DELETE se cloud sync (OneDrive/Dropbox/iCloud/Syncthing/Google Drive/Box)
- `min_length=1` em 5 Update models (Tarefa, Nota, Habito, BlocoRotina, Flashcard)
- `console.error` nos 7 catch blocks silenciosos (pomodoro, heartbeat, timer, tooltip)
- Enum validators: `HabitoBase.tipo`, `TarefaBase.prioridade+status`, `QuerySalva.visualizacao`
- Cache invalidation: `removeTagFromNotaMut`, `batchMut`, `checkHabitoMut`
- Paginação limit/offset em 6 routers (notas, habitos, flashcards, pomodoro, rotina, inbox)
- Docs: CHANGELOG.md novo, FUTURO.md atualizado, architecture/development/manual/security sincronizados

## v1.2.11 (2026-06-19)

- Notificação global (toast) para erros — 13 catch blocks com `useNotify()`
- Pomodoro: modo livre, badge global `⚡ MM:SS`, som em background
- Pastas: collapse/expand + botão excluir em cada item
- `--port` + fallback automático (8000→8001→8002...)
- Sidebar: ícones lucide-react, w-11, navegação colapsável "Mais..."
- N+1 query corrigida em batch_edit (`select().where(id.in_())`)
- Diário duplicado no Dashboard — race condition com `useRef`
- Export nota 500 — `n.titulo or '(sem titulo)'`
- Query 422 — guard `if mes and q.campo_agrupamento`
- Setas Revisão Semanal — encoding UTF-8 corrigido
- Normalização CRLF em 19 arquivos
- `start.py` resiliente sem Git — `ensure_pre_commit()` com try/except
- Criação nota Ideias — correção mapeamento favoritas
- Dashboard emojis (`→` → `➕`) + `useFocusTrap`
- README: Git prereq, `node node_modules/typescript/bin/tsc`, `--port`, MindFlow.bat, `python3` Linux, URL fallback
- Docs: FUTURO.md, HISTORICO.md, manual.md, development.md, deployment.md, troubleshooting.md sincronizados
- Arquitetura: `store/notification.tsx` (NotificationProvider + useNotify + toast)

## v1.2.10 (2026-06-17)

- `logs.py`: `read_text()` com try/catch — log corrompido não quebra modal
- `pomodoro.py`: validação de data em `DELETE /sessoes` — data inválida vira 422
- `shutdown.py`: `except pass` → `logger.warning()` no WAL checkpoint

## v1.2.9 (2026-06-15)

- EditorMarkdown: placeholder "Escreva sua nota aqui…"
- InboxModal: placeholder "O que você quer capturar?", botão "Salvar" → "Capturar"
- ErrorBoundary: mensagem amigável "Não foi possível carregar esta seção"
- CommandPalette: mensagem vazia com dica "Tente outro termo."
- Ideias: busca "Buscar por conteúdo…", labels "Categoria"/"Grupo", placeholders
- Hábitos: placeholder "Meta diária (ex: 8 copos)"
- HabitoCalendario: legenda "✅ Check-in / ⬜ Sem registro"
- Dashboard: tooltip "Dias consecutivos com check-in" no streak
- `start.py`: dica de atalhos na inicialização + finally com despedida

## v1.2.8 (2026-06-12)

- Terminal banner: `print_banner()` com slogan, UTF-8 reconfigure
- Fases com separadores, ícones ✓/↻/✗/⚠

## v1.2.7 (2026-06-10)

- Heartbeat localStorage + restore no mount
- Quick Catch: interrupções do Pomodoro → Inbox

## v1.2.6 (2026-06-08)

- PAUSADO: pause/resumo com `remainingMs`
- Bloqueio de contexto (não pausa se não estiver rodando)
- Lista de interrupções

## v1.2.5 (2026-06-05)

- Áudio Pomodoro em background: AudioContext persistente, alarme 3-beep
- Máquina de estados `PomodoroScreen` + `canTransition()`

## v1.0.0 — v1.2.4 (2026-05 — 2026-06)

- Release inicial com setup do projeto (FastAPI + React + SQLite)
- CRUD completo: Inbox, Hábitos, Rotina, Notas, Flashcards, Tipos
- Pomodoro timer com criação automática de nota resumo
- Sistema de wikilinks/backlinks com tabela `ConexaoNota`
- Busca full-text (FTS5) com `useDebounce(300ms)`
- Kanban view + Queries Dinâmicas + Batch Edit
- Grafo de conhecimento (d3-force)
- Calendário heatmap (Insights)
- Service layer (`spaced_repetition.py`, `notes.py`, `estatisticas.py`)
- ErrorBoundary global + logging com RotatingFileHandler
- Tema claro/escuro com toggle + persistência
- PWA: Service Worker, manifest, cache offline, atalho Inbox/Pomodoro
- Editor CodeMirror 6 com syntax highlight
- Templates de nota com substituição `{{data}}`/`{{titulo}}`
- Export/import JSON com upsert e rollback
- CI/CD: GitHub Actions (lint, testes, build, release automático)
