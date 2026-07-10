# Workflow MindFlow — Kanban + XP Lite + Lean

Fluxo de desenvolvimento com 5 colunas, WIP limitado, verificação contínua e eliminação de desperdício.

## Colunas

```
📋 Backlog → 🤔 Pensando → 🛠 Aplicando → 🔍 Revisando → 🔬 Verificado → ✅ Done
```

## WIP Limits

| Coluna | Limite | Motivo |
|--------|--------|--------|
| 🤔 Pensando | **5 min, depois perguntar** | Evita paralisia por análise |
| 🛠 Aplicando | **max 1** | Foco total, zero troca de contexto |
| 🔍 Revisando | **max 1** | Revisão exige atenção plena |
| 🔬 Verificado | ilimitado | Testes rodam em <10s |

## Regras de Gate

### 🤔 Pensando → 🛠 Aplicando
- [ ] Filtro 0→6 aplicado (AGENTS.md)
- [ ] ≤5 arquivos? Se não, dividir
- [ ] Tempo de exploração ≤5 min (ou permissão obtida para continuar)
- [ ] Risco 🟢 ou permissão obtida para 🟡/🔴
- [ ] OUTPUT: `task explore` com relatório de arquivos + riscos

**Skip 🤔 quando:** Risco 🟢 + ≤2 arquivos + já sei exatamente o que fazer

### 🛠 Aplicando → 🔍 Revisando
- [ ] Edições concluídas
- [ ] Nenhum TODO/FIXME deixado
- [ ] `todowrite` status = `in_progress` durante a execução

### 🔍 Revisando → 🔬 Verificado
- [ ] `task explore` com prompt de revisão executada
- [ ] Todas as críticas resolvidas ou documentadas
- [ ] Nenhum `console.log` / `print()` introduzido
- [ ] Log com ciclo registrado (início + fim no título)

**Skip 🔍 quando:** Mudança de 1 linha + risco 🟢 (ex: asyncio_mode) — use bom senso.

### 🔬 Verificado → ✅ Done
- [ ] Definition of Done completo (ver seção abaixo)

**Se falhar → 🔄 volta pra 🛠 Aplicando.** Não declare ✅ sem passar pelo 🔬.

## Templates de Prompt

### 🤔 Pensando (via `task explore`)

```
Analise o seguinte item: [descrição]
Responda:
1. Arquivos envolvidos (liste todos, com caminho)
2. Risco (🔴/🟡/🟢)
3. Já existe implementação similar no código?
4. YAGNI — realmente precisa existir?
5. ≤5 arquivos? Se não, como dividir em sub-tarefas?
```

### 🔍 Revisando (via `task explore`)

```
Revise criticamente o código implementado em: [arquivos]
Aponte PROBLEMAS especificamente:
- Segurança: XSS, SQL injection, path traversal?
- Datas: usando formatDateLocal/hojeLocal() em vez de toISOString?
- Erros: console.error('[ctx]', e) em vez de catch silencioso?
- SQL: parametrizado, sem f-string?
- Imports não usados?
- Nomes confusos ou código não documentado?
- Inconsistências com o padrão do restante do código?
```

## Ciclo de Vida de Um Item

### Caso normal
```
📋 → 🤔 (explore) → 🛠 (edits) → 🔍 (explore) → 🔬 (testes) → ✅
```

### Já existe (Quick Switcher foi exemplo real)
```
📋 → 🤔 (descobriu que já existe) → 🔬 (só verificar) → ✅
```

### YAGNI
```
📋 → 🤔 (filtro 0→6 disse "não precisa") → ✅ (cancelado)
```

### Falha no 🔬
```
📋 → 🤔 → 🛠 → 🔍 → 🔬 (falhou) → 🔄 🛠 (corrigir) → 🔍 → 🔬 → ✅
```

### Skip de gate (risco 🟢 + trivial)
```
📋 → 🛠 (skip 🤔) → 🔬 (skip 🔍) → ✅
```

## Como Usar `todowrite`

Cada item em 🤔 ou 🛠 deve ter uma entrada no `todowrite`:

```markdown
- "🤔 Analisar: [descrição curta]" — status: in_progress
- "🛠 Implementar: [descrição]" — status: pending
- "🔍 Revisar: [descrição]" — status: pending
- "🔬 Verificar: [descrição]" — status: pending
```

Não mantenha mais que 1 item em 🛠 ou 🔍 simultaneamente.

## ✅ Definition of Done (DoD)

Antes de mover de 🔬 Verificado para ✅ Done, **todos** abaixo devem estar marcados:

- [ ] `pytest -q` — todos passando
- [ ] `ruff check .` — zero erros
- [ ] `vitest run` — todos passando
- [ ] `tsc --noEmit` — zero erros
- [ ] `tsc -b && vite build` — build OK
- [ ] SESSION.md atualizado (Current + Log + retro)
- [ ] Log com ciclo registrado (início + fim da tarefa)

Se **qualquer item** falhar → não declare ✅. Corrija e repasse o 🔬.
