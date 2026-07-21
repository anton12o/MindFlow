# Análise Completa — Módulo Matrizes

**Data:** 18/jul/2026
**Arquivos analisados:** 9 (6 TSX frontend, 1 CSS, 1 Python backend, 1 types/utils)
**Linhas totais:** ~1.200

---

## Sumário

| Categoria | Qtde | Crítico | Alto | Médio | Baixo |
|-----------|------|---------|------|-------|-------|
| Bugs lógica | 4 | 0 | 1 | 2 | 1 |
| UX/Design | 12 | 0 | 3 | 7 | 2 |
| Performance | 3 | 0 | 1 | 2 | 0 |
| Missing features | 6 | 0 | 2 | 3 | 1 |
| Edge cases | 4 | 0 | 1 | 2 | 1 |
| Code quality | 8 | 0 | 0 | 4 | 4 |
| **Total** | **37** | **0** | **8** | **20** | **9** |

---

## ⚠️ LENDA DAS PRIORIDADES

- **P0 — Crítico:** Perda de dados, crash, broken flow
- **P1 — Alto:** UX quebrada, funcionalidade incompleta, contraste falha
- **P2 — Médio:** Melhoria significativa, edge case, code smell
- **P3 — Baixo:** Cosmético, refactor, documentation

---

## PARTE 1 — BUGS DE LÓGICA

### B1 [P2] Eisenhower: fallback silencioso de quadrante inválido
**Arquivo:** `EisenhowerView.tsx:94`
```
const chave = grupos[t.quadrante || ''] ? t.quadrante as string : 'agendar'
```
Se `quadrante` é `null`/`undefined`, cai em `'agendar'` sem warning. Se alguém enviar `quadrante: "foo"` (ignorando validação backend), o dado some.

**Impacto:** Baixo (backend valida). Mas se o backend mudar, tarefas podem desaparecer.

**Fix:** Logar warning quando cair no fallback.

### B2 [P1] E×I: `limparScore` envia `propriedades: {}` se tarefa não está no cache
**Arquivo:** `EsforcoImpactoView.tsx:180`
```
if (!t) return updateTarefa(id, { propriedades: {} })
```
Na verdade o backend merge com `{...existing, ...{}}` = existing. Seguro. Mas se o cache estiver vazio e a tarefa tiver propriedades, o merge não perde nada.

**Impacto:** Nenhum (merge seguro). Remover o fallback ou explicitar que é seguro.

### B3 [P2] E×I: `salvarEI` lê propriedades de qualquer página do cache
**Arquivo:** `EsforcoImpactoView.tsx:139`
```
const all = queryClient.getQueriesData<TarefasMatrizResponse>({ queryKey: ['tarefas-matriz', dataInicio, dataFim] })
```
Usa partial matching — encontra TODAS as páginas. Se a tarefa está em 2 páginas (edge case raro), pega a primeira encontrada.

**Impacto:** Baixo (tarefas não duplicam entre páginas normalmente).

### B4 [P3] KebabMenu: `items!` non-null assertion
**Arquivo:** `KebabMenu.tsx:49`
Seguro porque `hasItems` garante, mas se alguém refatorar `hasItems`, o `!` quebra silenciosamente.

**Fix:** Usar `items.map` após guarda com `items &&`.

---

## PARTE 2 — UX / DESIGN

### U1 [P1] Sem DragOverlay no DnD Eisenhower
**Arquivo:** `EisenhowerView.tsx:40-51`
O `DraggableTaskCard` usa `opacity-50` quando arrastando, mas não tem `DragOverlay`. O card original fica semi-transparente no lugar original, e não há um "fantasma" seguindo o cursor.

**Impacto:** Usuário não vê visualmente o que está arrastando após o card sair do lugar.

**Fix:** Usar `DragOverlay` do `@dnd-kit/core` com um componente fantasma.

### U2 [P1] E×I: Sliders sem feedback de salvamento
**Arquivo:** `EsforcoImpactoView.tsx:84-86`
```
debounceRef.current = setTimeout(() => { onSave(tarefa.id, { esforco, impacto }) }, 300)
```
O usuário move o slider, 300ms depois salva. Zero feedback visual.

**Impacto:** Usuário não sabe se salvou. Pode fechar o card e perder a classificação.

**Fix:** Mostrar indicador "salvando..." / "salvo" ao lado do slider. Pequeno ícone de check após salvar.

### U3 [P1] E×I: Clique no card expande mesmo quando clica em texto/título
**Arquivo:** `EsforcoImpactoView.tsx:92`
```
<div className="space-y-1 group/card" onClick={handleToggle}>
```
O `handleToggle` está no div pai. O checkbox e botões têm `stopPropagation`, mas clicar no TÍTULO da tarefa ou na label "Sem classificação" expande o card. Conflito com desejar navegar ou selecionar texto.

**Impacto:** Frustrante — usuário pode expandir acidentalmente.

**Fix:** Mover o `onClick` para um botão "Expandir" explícito, ou usar um indicador de clique (só expandir se clicar na área do label de classificação, não no título).

### U4 [P2] Loading indistinguível de vazio
**Arquivo:** `EisenhowerView.tsx:229-241`
O loading mostra "Carregando tarefas..." mas o grid dos quadrantes já está renderizado com Nenhuma tarefa em cada um. O loading é FALSE depois que os dados chegam.

**Impacto:** Breve flash de "Nenhuma tarefa" → "Carregando..." → conteúdo.

**Fix:** Mostrar skeleton nos quadrantes durante loading, ou não mostrar quadrantes até ter dados.

### U5 [P2] Navegação semanal sem data atual destacada
**Arquivo:** `EisenhowerView.tsx:211-213`
O `formatDataRange` mostra o range da semana, mas não destaca se é "Esta semana", "Semana passada", etc. O `offset=0` é a semana atual, mas não fica óbvio.

**Impacto:** Usuário pode não saber se está vendo a semana certa.

**Fix:** Mostrar "Esta semana" quando `offset === 0`, ou highlight visual.

### U6 [P2] Scroll shift nos quadrantes
**Arquivo:** `EisenhowerView.tsx:73`
```
<div className="flex-1 space-y-2 overflow-y-auto max-h-96">
```
Quando o scroll aparece, a largura interna diminui pelo tamanho da scrollbar (≈16px no Windows). Cards internos podem quebrar layout.

**Fix:** `overflow-y-auto scrollbar-gutter-stable` (Tailwind v4).

### U7 [P2] Botão "Ocultar concluídas" pouco descritivo
**Arquivo:** `EisenhowerView.tsx:218-221`
Label: `○ Feitas` / `✓ Feitas`. Não descreve a ação (Ocultar/Mostrar).

**Fix:** Mudar label para "Ocultar" / "Mostrar" com tooltip.

### U8 [P2] E×I: Sem animação ao colapsar todos
**Arquivo:** `EsforcoImpactoView.tsx:242`
O KebabMenu tem opção "Colapsar todos" que incrementa `collapseVersion`. O useEffect fecha todos os cards abruptamente.

**Fix:** Adicionar transição CSS de altura.

### U9 [P2] Estados de erro sem fallback visual
**Todas as mutations usam apenas `notify()` + `console.error()`. Se o usuário perde conexão, vê um toast rápido que desaparece. Se há erro de rede no GET, o banner aparece mas o conteúdo some.

**Fix:** Adicionar `retry` nas queries, mostrar estado offline, manter último dado válido visível.

### U10 [P3] Descrições longas cortadas em mobile
**Arquivo:** `EisenhowerView.tsx` nos quadrantes
Labels como "Urgente e Importante" podem quebrar em viewport estreita.

**Fix:** `text-[10px]` em mobile ou `truncate` + tooltip.

### U11 [P3] Eisenhower: sem acesso por teclado nos quadrantes
O DnD é mouse-only. Usuário de teclado não consegue mover tarefas entre quadrantes.

**Fix:** Adicionar menu contextual com opção "Mover para..." como fallback.

### U12 [P3] E×I: Sliders perdem valor se usuário clica +/- rápido demais
O debounce de 300ms pode ignorar commits rápidos.

**Fix:** Commitar imediatamente no clique do botão ± em vez de esperar debounce.

---

## PARTE 3 — PERFORMANCE

### P1 [P1] Matriz.tsx: `allItems` gerenciado manualmente vs `useInfiniteQuery`
**Arquivo:** `Matriz.tsx:27-61`
- `useEffect` para acumular páginas
- `useState` para `allItems`
- Lógica manual de dedup com `Set`
- Perde páginas quando volta para página 0
- Dados podem ficar inconsistentes se cache mudar

**Impacto:** Dados podem mostrar mistura de páginas velhas + novas. Botão "Carregar mais" pode mostrar itens repetidos.

**Fix:** Substituir por `useInfiniteQuery` do TanStack Query.

### P2 [P2] Eisenhower: `filteredTarefas` filtrado a cada render
**Arquivo:** `EisenhowerView.tsx:120-124`
`filteredTarefas` é recalculado a cada render mesmo se filtros não mudaram. Operação O(n) barata (n < 200), mas desnecessária.

**Fix:** `useMemo` com dependências `[tarefas, filtro, ocultarConcluidas]`.

### P3 [P2] KebabMenu: listener global por instância
**Arquivo:** `KebabMenu.tsx:22-34`
Cada KebabMenu aberto registra `mousedown` + `keydown` no `document`. Com N menus abertos simultaneamente, N pares de listeners.

**Fix:** Usar delegated event listener no pai, ou singleton.

---

## PARTE 4 — MISSING FEATURES

### F1 [P1] Sem DragOverlay no DnD (mesmo U1)

### F2 [P1] Sem testes automatizados para Matrizes
**0 testes** para o módulo inteiro. Nenhum teste unitário para `getExternalScore`, `agruparPorQuadrante`, `sortEisenhower`, `formatDataRange`, `sliderGradient`, `classificar`, `getEI`.

**Impacto:** Qualquer refactor é feito no escuro.

**Fix:** Criar `utils/scoring.test.ts` e `components/matriz/types.test.ts`.

### F3 [P2] E×I sem DnD
O Eisenhower tem drag-to-move entre quadrantes. E×I não — só classificação por slider.

**Fix:** Adicionar drag-to-move entre quadrantes E×I (muda de categoria sem precisar re-slidar).

### F4 [P2] Sem contagem por quadrante no toolbar
**Arquivo:** `EisenhowerView.tsx:200`
Mostra total de tarefas mas não quantas em cada quadrante.

**Fix:** Mostrar "Fazer: 3 · Agendar: 5 · Delegar: 1 · Eliminar: 2".

### F5 [P3] Sem exportar/dashboard das métricas das matrizes
Os scores E×I e quadrantes Eisenhower não são exportáveis para relatório.

### F6 [P3] Sem hotkey para navegar entre matrizes quando dentro de uma
Ctrl+1/Ctrl+2 funciona na seleção, mas dentro da matriz não troca.

**Fix:** Adicionar hotkey no `Matriz.tsx` quando `tipo !== null`.

---

## PARTE 5 — EDGE CASES

### E1 [P1] `updateTarefa(id, { quadrante: null })` falha no backend
**Arquivo:** `backend/models.py:148-152`
`check_quadrante` espera `str`, mas `TarefaUpdate.quadrante` é `str | None`. Se o frontend enviar `null`, o validador quebra.

**Impacto:** Erro 422 se alguém tentar limpar quadrante com `null` em vez de `""`.

**Fix:** Adicionar `None` como valor permitido no validator, ou tratar no frontend.

### E2 [P2] E×I: `salvarEI` pode sobrescrever propriedades de outra aba
Se o usuário tem 2 abas abertas, uma edita no E×I e outra edita propriedades diferentes. A mutation lê `existingProps` do cache (que está desatualizado da outra aba), faz merge, e salva. A outra aba perde a edição.

**Impacto:** Race condition clássico de optimistic concurrency.

**Fix:** Sempre merge no backend (já é feito no `update_tarefa`). OK, já é seguro.

### E3 [P3] TaskCard: clique duplo no checkbox chama 2 toggles
**Arquivo:** `TaskCard.tsx:34`
`onToggleStatus?.(tarefa.id)` sem debounce. Duplo clique rápido = 2 chamadas.

**Fix:** Debounce de 200ms ou `isPending` check.

### E4 [P3] E×I: score default `{ esforco: 1, impacto: 1 }` classifica como "preenchimento"
**Arquivo:** `EsforcoImpactoView.tsx:202`
```
const score = getEI(t) || { esforco: 1, impacto: 1 }
```
Tarefas sem score caem em "preenchimento" (esforço<3 E impacto<3). Correto, mas pode confundir.

---

## PARTE 6 — CODE QUALITY

### C1 [P2] `QUADRANTES` duplicado
**Arquivos:** `EisenhowerView.tsx:16-21` e `scoring.ts:4-37`
Definição de quadrantes duplicada em 2 lugares com STRUCTURAS DIFERENTES:
- `EisenhowerView.tsx`: `{ key, titulo, desc, cor, bg, badge, badgeText, vies, destaque }`
- `scoring.ts`: `{ key, titulo, desc, cor, bg, badge, badgeText, labelCor, acao }`

**Impacto:** Mudar um não afeta o outro. Já causou divergência (Eisenhower tem `vies`/`destaque`, E×I tem `acao`/`labelCor`). Consolidação urgente.

### C2 [P2] `getExternalScore` duplicado conceitualmente
Pega o score E×I para mostrar no Eisenhower. Poderia ser extraído de `scoring.ts`.

### C3 [P3] EisenhowerView: handlers inline em vez de hook custom
`handleToggleStatus`, `handleDelete`, `handleLimparQuadrante`, `handleCriarNota`, `handleIniciarPomodoro` — 5 callbacks que poderiam ser extraídos.

### C4 [P3] Matriz.tsx: lógica de paginação misturada com lógica de view
O componente de página lida com offset, páginas, acumulação. Separar em hook `useMatrizData()`.

### C5 [P2] `--color-quadrant-2` e `--color-quadrant-4` sem foreground tokens
`index.css` define as cores dos quadrantes mas não seus foregrounds. `badgeText: 'text-accent-foreground'` é usado como fallback (#000), mas funciona por coincidência.

### C6 [P3] EsforcoImpactoView: imports não usados
`deleteTarefa as apiDelete` é importado mas pode não ser usado (já tem `excluir` mutation). Linha 7.

### C7 [P3] EISlider: hardcoded `var(--color-*)` nas cores do thumb
Correto usa CSS vars, mas se as vars mudarem, o slider pode ficar inconsistente com o tema.

### C8 [P2] EisenhowerView e EsforcoImpactoView: Props interface duplicada
Ambas declaram `Props` com mesmos campos. Extrair para `types.ts`.

---

## PLANO DE CORREÇÃO

### Fase 1 — Segurança e Dados (implementar agora)
| # | Item | Prioridade | Arquivo | Esforço |
|---|------|-----------|---------|---------|
| 1 | Consolidar `QUADRANTES` em `scoring.ts`, remover duplicata | P2 | EisenhowerView + scoring | 15min |
| 2 | Unificar Props das views em `types.ts` | P2 | EisenhowerView + EsforcoImpactoView + types | 10min |
| 3 | Corrigir fallback `limparScore` com log warning | P2 | EsforcoImpactoView:180 | 5min |
| 4 | Adicionar `None` no validator de quadrante backend | P2 | backend/models.py | 5min |

### Fase 2 — UX Core (implementar agora)
| # | Item | Prioridade | Arquivo | Esforço |
|---|------|-----------|---------|---------|
| 5 | DragOverlay no DnD Eisenhower | P1 | EisenhowerView | 30min |
| 6 | Feedback de salvamento nos sliders E×I | P1 | EsforcoImpactoView | 20min |
| 7 | Separar clique expandir do clique no título E×I | P1 | EsforcoImpactoView | 15min |
| 8 | Adicionar "Esta semana" highlight na navegação | P2 | EisenhowerView + EsforcoImpactoView | 10min |
| 9 | `scrollbar-gutter-stable` nos quadrantes | P2 | EisenhowerView + EsforcoImpactoView | 5min |
| 10 | Debounce no clique do checkbox | P3 | TaskCard | 5min |

### Fase 3 — Performance e Robustez
| # | Item | Prioridade | Arquivo | Esforço |
|---|------|-----------|---------|---------|
| 11 | Migrar paginação para `useInfiniteQuery` | P1 | Matriz.tsx | 45min |
| 12 | `useMemo` nos filtros do Eisenhower | P2 | EisenhowerView | 10min |
| 13 | Delegated event listener no KebabMenu | P2 | KebabMenu | 15min |
| 14 | `isPending` check nas mutations (evitar duplo clique) | P3 | EisenhowerView + EsforcoImpactoView | 15min |

### Fase 4 — Testes
| # | Item | Prioridade | Arquivo | Esforço |
|---|------|-----------|---------|---------|
| 15 | Testes para `scoring.ts` (getEI, classificar, QUADRANTES) | P1 | frontend/src/utils | 20min |
| 16 | Testes para `types.ts` (formatDataRange, sliderGradient) | P1 | frontend/src/components/matriz | 10min |
| 17 | Testes para `EisenhowerView` helpers (getExternalScore, agruparPorQuadrante) | P2 | frontend/src/components/matriz | 20min |
| 18 | Testes para KebabMenu (abrir/fechar/actions) | P2 | frontend/src/components/matriz | 15min |
| 19 | E2E visual para matrizes (screenshots com dados mock) | P2 | frontend/e2e | 30min |

### Fase 5 — Features
| # | Item | Prioridade | Arquivo | Esforço |
|---|------|-----------|---------|---------|
| 20 | DnD no E×I | P2 | EsforcoImpactoView | 30min |
| 21 | Hotkey Ctrl+1/Ctrl+2 dentro da matriz | P3 | Matriz.tsx | 10min |
| 22 | Contagem por quadrante no toolbar | P3 | EisenhowerView | 10min |
| 23 | Indicador de loading por quadrante (skeleton) | P2 | EisenhowerView + EsforcoImpactoView | 20min |

---

## TOTAL DE ESFORÇO ESTIMADO

| Fase | Itens | Esforço |
|------|-------|---------|
| Fase 1 — Segurança | 4 | 35min |
| Fase 2 — UX Core | 6 | 85min |
| Fase 3 — Performance | 4 | 85min |
| Fase 4 — Testes | 5 | 95min |
| Fase 5 — Features | 4 | 70min |
| **Total** | **23** | **~6h** |

---

## CONCLUSÃO

O módulo Matrizes está funcional e sem bugs críticos. Os principais problemas são:

1. **UX:** Falta feedback visual para ações do usuário (drag, salvamento E×I, loading)
2. **Duplicação:** `QUADRANTES` duplicado em 2 arquivos com estruturas divergentes
3. **Testes:** Zero cobertura de testes para o módulo inteiro
4. **Paginação manual:** `useEffect` frágil que pode mostrar dados inconsistentes
5. **Acessibilidade:** DnD mouse-only, sem fallback de teclado

**Recomendação:** Fazer Fase 1 + 2 primeiro (~2h), que resolvem os problemas mais sentidos pelo usuário, depois Fase 3 + 4 (~3h) para robustez, e Fase 5 (~1h) para features novas.
