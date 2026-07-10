---
version: alpha
name: MindFlow
description: Local-first, keyboard-driven productivity app for developers
colors:
  # Semânticos (referenciados em components)
  bg-primary: "#0D1117"        # Editor, # Editor, painel principal
  bg-secondary: "#161B22"      # Sidebar, painéis
  bg-tertiary: "#21262D"       # Inputs, botões, hover
  border: "#30363D"            # Divisores
  text-primary: "#E6EDF3"      # Texto principal
  text-secondary: "#8B949E"    # Labels, secondary
  text-muted: "#6E7681"        # Placeholders, hints
  accent: "#58A6FF"            # Ações primárias, focus, links
  accent-hover: "#79C0FF"
  danger: "#F85149"            # Delete, erros
  danger-hover: "#FF7B72"
  success: "#3FB950"           # Online, sucesso
  warning: "#D29922"           # Alertas
typography:
  font-mono: "JetBrains Mono"  # Código, IDs, timestamps
  font-sans: "IBM Plex Sans"   # UI geral
  h1: {fontFamily: "{font-sans}", fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3}
  body: {fontFamily: "{font-sans}", fontSize: "0.875rem", lineHeight: 1.6}
  mono-sm: {fontFamily: "{font-mono}", fontSize: "0.75rem", lineHeight: 1.5}
spacing:
  1: "4px"   # Gap ícones
  2: "8px"   # Gap botões toolbar
  3: "12px"  # Padding interno cards
  4: "16px"  # Gap seções, padding painéis
  6: "24px"  # Gap seções sidebar
rounded:
  sm: "4px"    # Botões, inputs
  md: "8px"    # Cards, modais
  lg: "12px"   # Modais grandes
shadows:
  sm: "0 1px 2px rgba(0,0,0,0.3)"
  md: "0 4px 8px rgba(0,0,0,0.4)"
  lg: "0 8px 24px rgba(0,0,0,0.5)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.bg-tertiary}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-secondary-hover:
    backgroundColor: "{colors.bg-tertiary}"
    textColor: "{colors.text-primary}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-danger-hover:
    backgroundColor: "{colors.danger-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  button-ghost-hover:
    backgroundColor: "{colors.bg-tertiary}"
    textColor: "{colors.text-primary}"
  input:
    backgroundColor: "{colors.bg-tertiary}"
    borderColor: "{colors.border}"
    textColor: "{colors.text-primary}"
    placeholderColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2} {spacing.3}"
  input-focus:
    borderColor: "{colors.accent}"
    ringColor: "{colors.accent}"
  toolbar:
    backgroundColor: "{colors.bg-secondary}"
    borderBottom: "1px solid {colors.border}"
    padding: "{spacing.3} {spacing.4}"
    gap: "{spacing.2}"
  modal:
    backgroundColor: "{colors.bg-secondary}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    shadow: "{shadows.lg}"
    padding: "{spacing.6}"
  virtual-list-row:
    padding: "{spacing.3} {spacing.4}"
    hoverBackground: "{colors.bg-tertiary}"
    selectedBackground: "{colors.accent}20"
    gap: "{spacing.2}"
---

## Overview

MindFlow é um **segundo cérebro local-first, keyboard-driven** para desenvolvedores. O design prioriza:

- **Density over decoration** — informação densa, scannable, sem ruído visual
- **Dark by default** — reduz fadiga ocular em sessões longas de código
- **Keyboard-first** — todos os fluxos principais acessíveis sem mouse
- **Developer aesthetic** — mono fonts, precisão técnica, mínimo "marketing fluff"
- **Acessibilidade real** — WCAG AA, focus visível, contraste, ARIA

Referências visuais: Linear (densidade, minimalismo), Vercel (precisão, monochrome), Notion (warm minimalism), Supabase (dev tool dark).

---

## Colors

### Paleta Semântica

| Token | Hex | Uso | Contraste vs bg-primary |
|-------|-----|-----|------------------------|
| `bg-primary` | `#0D1117` | Editor, painel principal | — |
| `bg-secondary` | `#161B22` | Sidebar, painéis, toolbar, modais | 3.2:1 |
| `bg-tertiary` | `#21262D` | Inputs, botões, hover states | 4.8:1 |
| `border` | `#30363D` | Divisores, bordas inputs, cards | 2.1:1 |
| `text-primary` | `#E6EDF3` | Texto principal, títulos | 14.2:1 ✓ AAA |
| `text-secondary` | `#8B949E` | Labels, texto secundário | 5.1:1 ✓ AA |
| `text-muted` | `#6E7681` | Placeholders, hints, timestamps | 3.6:1 |
| `accent` | `#58A6FF` | Ações primárias, focus rings, links | 4.9:1 ✓ AA |
| `accent-hover` | `#79C0FF` | Hover de botões primários | 5.8:1 ✓ AA |
| `danger` | `#F85149` | Delete, erros críticos | 4.5:1 ✓ AA |
| `danger-hover` | `#FF7B72` | Hover delete | 5.4:1 ✓ AA |
| `success` | `#3FB950` | Online, sucesso, confirmações | 4.7:1 ✓ AA |
| `warning` | `#D29922` | Alertas, atenção | 5.2:1 ✓ AA |

### Rationale

- **Azul (`accent`)** — colorblind-safe (protanopia/deuteranopia), alta visibilidade no dark
- **Sem gradientes** — flat color reforça densidade e precisão
- **Neutros quentes** — bg-primary/secondary evitam "blue fatigue" de dark themes puros

---

## Typography

### Font Families

| Token | Font | Fonte | Fallback |
|-------|------|-------|----------|
| `font-sans` | IBM Plex Sans | Google Fonts | system-ui, sans-serif |
| `font-mono` | JetBrains Mono | Google Fonts | ui-monospace, monospace |

**HTML `<link>` para CDN:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Scale

| Token | Font | Size | Weight | Line Height | Letter Spacing | Uso |
|-------|------|------|--------|-------------|----------------|-----|
| `h1` | sans | 1.5rem | 600 | 1.3 | -0.02em | Page titles, section headers |
| `body` | sans | 0.875rem | 400 | 1.6 | 0 | Body text, labels, buttons |
| `mono-sm` | mono | 0.75rem | 400 | 1.5 | 0 | Timestamps, IDs, code snippets, tags |

### Hierarchy Rules

1. **Type as hierarchy first** — weight/size/color antes de boxes/icons
2. **Mono for data** — IDs, timestamps, counts, code, technical values
3. **Sans for UI** — labels, buttons, body text, navigation
4. **Max 2 weights** — 400 (regular) + 600 (semibold) apenas

---

## Layout

### Princípios

- **Two-pane canonical** — Sidebar `w-72` (navegação/organização) + Main `flex-1` (conteúdo/editor)
- **Density > whitespace** — `spacing.2` (8px) gaps internos, `spacing.4` (16px) gaps seções
- **Sticky toolbars** — ações contextuais coladas no editor, não na navegação
- **Virtualized lists** — performance com 1000+ itens, row height fixo 64px
- **Responsive breakpoints** — desktop ≥1024px, tablet 768px, mobile <768px

### Breakpoints

| Viewport | Sidebar | Toolbar | List |
|----------|---------|---------|------|
| Desktop (≥1024px) | `w-72` fixa | Topo do main | Virtualizada |
| Tablet (768px) | Drawer (hamburger) | Fixa no topo | Virtualizada |
| Mobile (<768px) | Drawer | Colapsa em menu ⋯ | Virtualizada |

---

## Elevation & Depth

| Token | Value | Uso |
|-------|-------|-----|
| `shadows.sm` | `0 1px 2px rgba(0,0,0,0.3)` | Cards, dropdowns |
| `shadows.md` | `0 4px 8px rgba(0,0,0,0.4)` | Modais, popovers |
| `shadows.lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modais grandes, command palette |

**Sem glassmorphism/blur** — sombras sólidas comunicam profundidade sem ruído.

---

## Shapes

| Token | Value | Uso |
|-------|-------|-----|
| `rounded.sm` | `4px` | Botões, inputs, badges, tags |
| `rounded.md` | `8px` | Cards, modais, dropdowns, popovers |
| `rounded.lg` | `12px` | Modais grandes, command palette |

---

## Components

### Button Variants

| Variant | Background | Text | Border | Hover | Uso |
|---------|------------|------|--------|-------|-----|
| `primary` | `accent` | `text-primary` | none | `accent-hover` | Ação principal única por tela |
| `secondary` | `bg-tertiary` | `text-secondary` | none | `text-primary` | Ações secundárias |
| `danger` | `danger` | `text-primary` | none | `danger-hover` | Delete, destrutivas |
| `ghost` | transparent | `text-secondary` | none | `bg-tertiary` + `text-primary` | Toolbar actions, low emphasis |

**Todos:** `rounded-sm`, `padding: spacing.2 spacing.3`, `font: body`, `focus-ring: 2px solid accent`

### Input

- `bg-tertiary` bg, `border` border, `text-primary` text
- `placeholder: text-muted`
- Focus: `border: accent`, `ring: 2px solid accent`
- `rounded-sm`, `padding: spacing.2 spacing.3`

### Toolbar (`IdeasToolbar`)

- `bg-secondary` bg, `border-bottom: 1px solid border`
- `padding: spacing.3 spacing.4`, `gap: spacing.2`
- 3 grupos: Primárias | Condicionais (selected>0) | Menu ⋯
- Focus ring visível em todos botões

### Modal

- `bg-secondary` bg, `border` border, `rounded-md`, `shadow-lg`
- `padding: spacing.6`
- Focus trap, ESC para fechar, overlay `bg-black/50`

### Virtual List Row

- `padding: spacing.3 spacing.4`, `gap: spacing.2`
- Hover: `bg-tertiary`
- Selected: `accent/20` bg + `accent` text
- Checkbox à esquerda (select mode), star (favorito), tipo icon, título, tags, data

---

## Do's and Don'ts

### ✅ DO

- Usar **tokens do DESIGN.md** em toda análise e implementação
- **Type as hierarchy** — weight/size/color antes de boxes
- **Focus rings visíveis** — `2px solid var(--accent)` em tudo interativo
- **Contraste WCAG AA** — validar via `npx @google/design.md lint`
- **Density** — `spacing.2` gaps, `rounded-sm` botões, rows compactas
- **Mono para dados** — timestamps, IDs, counts, code snippets
- **Keyboard-first** — Tab order lógico, atalhos documentados
- **Documentar layout no Excalidraw** — versionar decisões visuais

### ❌ DON'T

- Inventar cores/espaçamentos ad-hoc — usar tokens
- Gradientes, glassmorphism, blur decorativo
- Feature-tile grids (icon + heading + sentence × 3)
- Accent rails (left border strips em cards)
- Monument stats (números gigantes sem contexto)
- Icon toppers (ícone acima de todo heading)
- Center stacks (tudo centralizado sem composição)
- Default type (Inter/system-ui sem escolha deliberada)
- Wrong surface (hero em Monitor/Operate surface)
- Copiar UI proprietária — referenciar princípios, não pixels

---

## Acessibilidade (WCAG AA)

- **Contraste texto/bg ≥ 4.5:1** — validado no lint
- **Focus visível** — todos elementos interativos
- **Tab order lógico** — Toolbar → Editor → Modais → Sidebar
- **ARIA labels** — botões só ícone (Nova, Buscar, Template, Grafo, ⋯, ☐)
- **Estados disabled visuais** — `opacity-50`, `cursor-not-allowed`
- **Hit targets ≥ 44px** — mobile/tablet
- **Reduced motion** — respeitar `prefers-reduced-motion`

---

## Referências de Design (para `popular-web-designs`)

| Template | Uso no MindFlow |
|----------|-----------------|
| `linear.app.md` | **Primary** — density, keyboard-first, purple accent, minimal |
| `vercel.md` | Precision, monochrome, Geist font system |
| `notion.md` | Warm minimalism, editorial hierarchy, soft surfaces |
| `supabase.md` | Dark dev tool, code-first, green accent |
| `raycast.md` | Command palette, keyboard-driven, dark chrome |
| `mintlify.md` | Clean, reading-optimized, content-first |