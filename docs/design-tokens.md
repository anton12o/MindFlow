# Design Tokens — MindFlow

Fonte única: `frontend/src/index.css` (`@theme`). Tailwind v4 gera utilities `bg-*`, `text-*`, etc. a partir destes tokens.

Os tokens abaixo **já estão no CSS**. Este documento é a referência — o CSS é o source of truth, mas toda mudança visual deve ser validada contra as regras abaixo ANTES de escrever código.

---

## Regras Universais (todo módulo)

1. **Hierarquia por peso de fonte, não cor/tamanho.** Título usa semibold, label usa normal, hint usa muted. Não usar tamanho 14px vs 16px pra hierarquia — usar `font-semibold`/`font-normal`.
2. **Paleta: 1 accent color + escala de cinza.** Cor semântica (`success`, `warning`, `danger`) só pra status (concluído, alerta, erro). Nunca usar vermelho/verde/azul como decoration.
3. **Espaçamento em escala fixa:** 4/8/12/16/24px. Os tokens `--spacing-{1,2,3,4,6}` mapeiam exatamente isso. `p-5`, `gap-5`, `p-7` etc. **não existem** — se aparecerem no código, é erro.
4. **Mesmo componente base por tipo.** Ex: 1 `TaskCard`, 1 `Badge`, 1 `ScoreRing` reusados em todas as views. Não recriar por módulo (ex: GUTCard e RICECard paralelos violam esta regra — devem ser eliminados em refactor futuro).
5. **Cor nunca é único sinal.** Todo elemento que usa cor pra significado (▲/▼, badge "Crítico", score alto) deve ter pairing com ícone, texto ou label. Usuário com daltonismo ou monitor monocromático não perde informação.

---

## Regras por Módulo

### Matriz / Consultas (dados densos)
- Collapsed-by-default: cards começam fechados, detalhe a 1 clique.
- Toolbar compacta: botões em `text-[10px]`, padding `px-2 py-0.5`.
- Grid responsivo: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- TaskCard sem altura mínima — altura definida pelo conteúdo.
- Ref: Linear, Raycast, GitHub Issues.

### Notas / Flashcards (leitura/escrita)
- Tipografia como hierarquia primária.
- UI minimizada ao redor do conteúdo (marginalia, não header).
- Ref: Obsidian, Bear.

### Pomodoro / Foco / Hábitos (estado/ação)
- 1 elemento central por tela.
- UI de apoio discreta (toolbar fina, sem sidebar dentro da view).
- Ref: apps de timer minimalista.

### Dashboard
- Overview denso mas escaneável, não collapsed.
- Quer mostrar volume de relance — evitar acordeões, usar grid.
- Ref: GitHub profile, Linear cycles.

---

## Cores (dark — padrão)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg-primary` | `#0D1117` | Editor, painel principal |
| `--color-bg-secondary` | `#161B22` | Sidebar, painéis secundários |
| `--color-bg-tertiary` | `#21262D` | Inputs, botões |
| `--color-bg-hover` | `#2A2A36` | Hover states |
| `--color-border` | `#30363D` | Divisores, bordas |
| `--color-text-primary` | `#E6EDF3` | Texto principal |
| `--color-text-secondary` | `#8B949E` | Labels, texto secundário |
| `--color-text-muted` | `#87919B` | Placeholders, hints |
| `--color-accent` | `#58A6FF` | Ações primárias, focus, links |
| `--color-accent-hover` | `#79C0FF` | Hover de ações primárias |
| `--color-accent-light` | `#3A5A8A` | Fundo sutil de destaque |
| `--color-accent-foreground` | `#000000` | Texto sobre fundo accent (contraste 12.63:1 — AAA) |
| `--color-accent-foreground-muted` | `#4B5563` | Texto secundário sobre fundo accent (contraste 4.63:1 — AA) |
| `--color-quadrant-2` | `#2DD4BF` | Teal — quadrante "Agendar/Grande Projeto" (matrizes) |
| `--color-quadrant-4` | `#F87171` | Muted red — quadrante "Eliminar/Ingrata" (matrizes) |
| `--color-danger` | `#F85149` | Delete, erros |
| `--color-danger-hover` | `#FF7B72` | Hover de ações destrutivas |
| `--color-success` | `#3FB950` | Online, sucesso |
| `--color-warning` | `#D29922` | Alertas, rascunhos |

---

## Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-sans` | `"Inter", system-ui, -apple-system, sans-serif` | UI geral, botões, labels |
| `--font-mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace` | Código, dados, timestamps |

### Hierarquia (regra universal #1)

| Elemento | Classe | Peso |
|----------|--------|------|
| Título de página | `text-xl font-bold` | Bold |
| Título de seção | `text-sm font-semibold uppercase tracking-wide` | Semibold |
| Nome do card | `text-sm font-semibold` | Semibold |
| Subtítulo / label | `text-[10px] font-normal` | Normal |
| Hint / placeholder | `text-[10px] text-muted italic` | Normal itálico |
| Métrica / score | `text-[10px] font-bold tabular-nums` | Bold + tabular |
| Badge de contagem | `text-[10px] font-bold` | Bold |

---

## Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `--spacing-1` | `4px` | Gap entre ícones, margem interna de tags |
| `--spacing-2` | `8px` | Gap toolbar, padding de botões pequenos |
| `--spacing-3` | `12px` | Padding interno de cards |
| `--spacing-4` | `16px` | Padding de painéis, gap entre seções |
| `--spacing-6` | `24px` | Gap grandes entre seções, margem inferior de títulos |

**Card padding:** `p-3` (12px — spacing-3). Nunca `p-4` ou `p-5` dentro de cards.
**Toolbar gap:** `gap-2` (8px — spacing-2).
**Toolbar button:** `px-2 py-0.5 text-[10px]` (8px horizontal, 2px vertical).
**Nav chevron:** `p-0.5` com ícone `size={14}`.
**Texto sobre accent:** usar `text-accent-foreground` (#000000). Nunca `text-white` sobre `bg-accent` (contraste insuficiente 2.53:1).

---

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `4px` | Botões, inputs |
| `--radius-md` | `8px` | Cards, modais |
| `--radius-lg` | `12px` | Modais grandes, quadrantes |

---

## Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Toggle, slider thumb |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.4)` | Hover de elementos interativos |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Cards, dropdowns, banners |
| `--shadow-xl` | `0 12px 28px rgba(0,0,0,0.5)` | Kebab menu, cards elevados |
| `--shadow-2xl` | `0 16px 48px rgba(0,0,0,0.5)` | Modais, diálogos, paletas |

### Elevação semântica (regra universal #6)

| Token | Valor | Uso |
|-------|-------|-----|
| `--elevation-0` | `none` | Elementos planos (backgrounds, barras) |
| `--elevation-1` | `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)` | Hover/focus de inputs e botões |
| `--elevation-2` | `0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)` | Cards, modais pequenos |
| `--elevation-4` | `0 8px 16px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.24)` | Modais grandes, dropdowns |
| `--elevation-6` | `0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)` | Drawers, menus, paletas |

**Uso:** `shadow-[--elevation-1]`, `hover:shadow-[--elevation-1]`.
Cards normais: sem sombra (`elevation-0`). Cards em hover: `hover:shadow-[--elevation-1]`.

---

## Estados Interativos (regra universal #7)

| Token | Valor | Uso |
|-------|-------|-----|
| `--opacity-disabled` | `0.5` | Botões e controles desativados (50%) |
| `--opacity-disabled-heavy` | `0.3` | Navegação, chevrons, ações secundárias desativadas (30%) |

**Uso:** `disabled:opacity-disabled`, `disabled:opacity-disabled-heavy`.
Estado disabled sempre usa um dos tokens acima — nunca `opacity-30`/`opacity-50` direto.

---

## Convenção de Nomes

```
--color-{grupo}-{variante}  →  classe: bg-{grupo}-{variante}
--spacing-{n}                →  classe: p-{n}, gap-{n}, m-{n}
--radius-{tamanho}           →  classe: rounded-{tamanho}
--shadow-{tamanho}           →  classe: shadow-{tamanho}
```

Exemplo: `--color-bg-secondary` → `bg-bg-secondary`, `--spacing-4` → `p-4`.

---

## Validação

Antes de toda mudança visual, validar contra:
1. **Regras universais** (1 a 5) primeiro
2. **Regra do módulo** específico depois
3. **Tabela de hierarquia tipográfica** — o elemento usa o peso certo?
4. **Escala de espaçamento** — `p-5`, `gap-5`, `m-7` no código indicam fuga da escala fixa

Scripts de verificação:
- `node scripts/validate_visual.cjs` — validação programática (tipografia, padding, shadows, badges, ticks)
- `node scripts/audit_design.cjs` — auditoria de design (gera `docs/auditoria-design-matrizes.txt`)
- `python scripts/check_contrast.py` — contraste WCAG AA se houver mudança de cor
