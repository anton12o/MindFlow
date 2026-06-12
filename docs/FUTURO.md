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
**Status:** ⏳ Planejado
**Origem:** Revisão do usuário (Item 2)

**Descrição:** Permitir que o usuário configure os tempos do Pomodoro antes de iniciar: duração do foco (padrão 25min), pausa curta (padrão 5min) e pausa longa (padrão 15min). As configurações ficam salvas no `localStorage`.

**Arquivos envolvidos:**
- `frontend/src/store/pomodoro.tsx` — adicionar configurações de tempo + ciclo foco/pausa
- `frontend/src/components/PomodoroTimer.tsx` — UI de configuração + ciclo automático
- `frontend/src/pages/Pomodoro.tsx` — expor controles de configuração

**Dependências:** Nenhuma.

**Observações:** O timer atual não tem conceito de "pausa" — apenas foco. Será necessário adicionar ciclo foco → pausa curta → foco → pausa longa.

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

## 🟡 Média Prioridade — Discutidos, precisam de refinamento

### 5 novas views nas Consultas
**Status:** ⏳ Planejado
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
**Status:** ⏳ Planejado
**Origem:** CONTEXT.md — Próximos Passos (Item 2)

**Descrição:** Permitir arrastar blocos de horário no CalendarioSemanal para alterar hora_inicio/hora_fim. Drag-and-drop visual com feedback em tempo real.

**Arquivos envolvidos:**
- `frontend/src/components/CalendarioSemanal.tsx` — drag-and-drop
- `frontend/src/api/rotina.ts` — função updateBloco

**Dependências:** Nenhuma.

---

## 🟢 Baixa Prioridade — Ideias gerais, sem refinamento

### Notificações nativas (navegador) para Pomodoro
**Status:** ⏳ Planejado
**Origem:** CONTEXT.md — Próximos Passos (Item 3)

**Descrição:** Usar Notification API do navegador para alertar quando o timer do Pomodoro chegar a zero, mesmo com a aba em segundo plano.

---

### PWA (Service Worker + Manifest)
**Status:** ⏳ Planejado
**Origem:** CONTEXT.md — Próximos Passos (Item 4)

**Descrição:** Adicionar service worker e manifest para permitir instalação como aplicativo no sistema operacional.

---

### App desktop (Tauri ou Electron)
**Status:** ⏳ Planejado
**Origem:** CONTEXT.md — Próximos Passos (Item 5)

**Descrição:** Empacotar MindFlow como aplicativo desktop nativo com Tauri (recomendado) ou Electron.

---

### UX de notas — 3 bugs pendentes
**Status:** ⏳ Planejado
**Origem:** CONTEXT.md — Bugs Pendentes

**Descrição:**
- Bug 25: Feedback visual ao criar/editar notas
- Bug 26: Indicador de salvamento automático
- Bug 27: Confirmação ao sair com alterações não salvas
