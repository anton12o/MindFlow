# Plano de 9 Melhorias — MindFlow

**Status:** 6/9 implementadas (2026-07-10)
**Próximas:** B4 (Histórico), B3 (Fórmulas)

---

## Implementadas ✅

### Editor (frontend-only, independentes)

| # | Ideia | Arquivos | Verificação |
|---|---|---|---|
| **A1** | **Barra de formatação** — ~14 botões na toolbar do EditorMarkdown (B/I/S/Code/Math/H1-H6/listas/quote/link/hr/limpar) | `EditorMarkdown.tsx` | tsc 0 ✅, vitest 356/356 ✅ |
| **A2** | **Realce `==texto==` + Comentário `%%texto%%`** — `==` → `<mark>`, `%%` → oculto | `RenderConteudo.tsx` | ✅ |
| **A3** | **Tabela markdown padrão** — parse `\|...\|` blocks + botão insere template | `RenderConteudo.tsx`, `EditorMarkdown.tsx` | ✅ |

### Produto (backend + frontend)

| # | Ideia | Endpoints/Arquivos | Verificação |
|---|---|---|---|
| **B1** | **Importação .md/CSV** — parse frontmatter + filename → título, CSV colunas → propriedades | `POST /api/import/markdown`, `POST /api/import/csv` | tsc 0 ✅, ruff 0 ✅, pytest ✅ |
| **B2** | **Salvar filtros → consulta** — 1 botão no ⋯ menu chama `createQuery()` | `IdeasToolbar.tsx` → ⋯ "Salvar como consulta" | ✅ |
| **B5** | **Grafo Global** — Tarefas, Flashcards, Hábitos como nós + arestas por FK | `GET /notas/grafo`, `GrafoNotas.tsx`, `grafo.ts` | ✅ |
| **B6** | **Sets Dinâmicos** — queries fixadas no Dashboard (grid de cards) | `Dashboard.tsx` → `QueriesSection` | ✅ |

---

## Pendentes 📋

| # | Ideia | Esforço | Prioridade |
|---|---|---|---|
| **B4** | **Histórico de versões** — tabela `versoes_nota`, snapshot no PATCH, GET + restore | Médio | Baixa |
| **B3** | **Fórmulas** — campo `"tipo":"formula"` em schema_campos + parser expressões | Médio-Alto | Baixa |

---

## Detalhamento

### Barra de formatação (A1)

Toolbar no topo do `EditorMarkdown.tsx` com grupos separados por `w-px h-4 bg-border`:

- **Undo/Redo** — `Undo2` / `Redo2`
- **Estilo inline** — Bold, Italic, Strikethrough, Code (`\``), Math (`$`)
- **Heading** — Dropdown H (Texto/H1-H6) com `animate-fade-in`
- **Bloco** — Bullet list (`- `), Numbered list (`1. `), Task list (`- [ ] `), Blockquote (`> `)
- **Inserir** — Link, Table (`\| col1 \| col2 \|\n\|\---\|---\|\| \| \|`), Horizontal rule (`---`)
- **Ação** — Clear formatting (strip markdown da seleção)

Cada botão: `p-1 rounded hover:bg-bg-tertiary hover:text-text-primary`, Lucide 14px.

### Realce + Comentário (A2)

- `==texto==` → `<mark class="bg-accent-light/40 text-text-primary rounded-sm px-0.5">texto</mark>`
- `%%texto%%` → `<!-- texto -->` (comentário HTML, invisível)
- `<mark>` adicionado ao `DOMPurify ALLOWED_TAGS`

### Tabela markdown (A3)

Parse de blocos iniciando com `|` seguido de linha `|---|`:
- Detecta align: `:---` (left), `:---:` (center), `---:` (right)
- Gera `<table class="w-full border-collapse border border-border my-2">`
- Botão na toolbar insere template vazio no cursor

### Importação .md (B1)

**`POST /api/import/markdown`** — multipart com file + tipo_id + pasta_id:
1. Lê arquivo, decode UTF-8
2. `extract_frontmatter()` extrai title/tags/propriedades do YAML `---`
3. Fallback: filename sem .md como título
4. Cria tags se não existirem
5. Cria Nota com conteúdo + propriedades + tags

### Importação CSV (B1)

**`POST /api/import/csv`** — multipart com file + tipo_id + pasta_id:
1. Lê CSV com `csv.DictReader` (supports BOM)
2. Primeira coluna = título (ou coluna "titulo" se existir)
3. Demais colunas → propriedades
4. Cria uma Nota por linha

### Grafo Global (B5)

**Backend** (`GET /notas/grafo` expandido):
- Nós: Notas (500), Tarefas (200), Flashcards (200), Hábitos (50)
- IDs prefixados: `n{id}` (Nota), `t{id}` (Tarefa), `f{id}` (Flashcard), `h{id}` (Habito)
- Arestas: ConexaoNota (wikilinks) + flashcard.nota_id → Nota + sessao.resumo_nota_id

**Frontend** (`GrafoNotas.tsx`):
- 7 tipos de cores/ícones: Nota, Tarefa, Projeto, Pessoa, Recurso, Flashcard, Habito
- `nodeIdToNum()` extrai ID numérico do prefixo para `onSelectNota`
- Legenda automática com cores e ícones

### Sets Dinâmicos — Consultas Fixadas (B6)

- `QueriesSection` no Dashboard (fim da página)
- Busca `GET /api/queries`, exibe as 4 primeiras como cards
- Cada card: nome + visualizacao, clica → navega `/consultas?id=N`
- Só aparece se houver queries salvas
