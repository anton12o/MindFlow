# Design Tokens — MindFlow

Fonte única: `frontend/src/index.css` (`@theme`). Tailwind v4 gera utilities `bg-*`, `text-*`, etc. automaticamente a partir destes tokens.

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
| `--color-text-muted` | `#6E7681` | Placeholders, hints |
| `--color-accent` | `#58A6FF` | Ações primárias, focus, links |
| `--color-accent-hover` | `#79C0FF` | Hover de ações primárias |
| `--color-accent-light` | `#3A5A8A` | Fundo sutil de destaque |
| `--color-danger` | `#F85149` | Delete, erros |
| `--color-danger-hover` | `#FF7B72` | Hover de ações destrutivas |
| `--color-success` | `#3FB950` | Online, sucesso |
| `--color-warning` | `#D29922` | Alertas, rascunhos |

## Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-sans` | `IBM Plex Sans` | UI geral, botões, labels |
| `--font-mono` | `JetBrains Mono` | Código, dados, timestamps |

## Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `--spacing-1` | `4px` | Gap entre ícones |
| `--spacing-2` | `8px` | Gap entre botões toolbar |
| `--spacing-3` | `12px` | Padding interno cards |
| `--spacing-4` | `16px` | Padding painéis, gap seções |
| `--spacing-6` | `24px` | Gap grandes entre seções |

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `4px` | Botões, inputs |
| `--radius-md` | `8px` | Cards, modais |
| `--radius-lg` | `12px` | Modais grandes |

## Sombras

| Token | Valor |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` |

## Light Theme

O tema claro (`[data-theme="light"]`) sobrescreve os mesmos tokens com valores para fundo claro. As classes Tailwind (`bg-bg-primary`, `text-text-primary`, etc.) funcionam em ambos temas sem alteração.

## Convenção de Nomes

```
--color-{grupo}-{variante}  →  classe: bg-{grupo}-{variante}
--spacing-{n}                →  classe: p-{n}, gap-{n}, m-{n}
--radius-{tamanho}           →  classe: rounded-{tamanho}
--shadow-{tamanho}           →  classe: shadow-{tamanho}
```

Exemplo: `--color-bg-secondary` → `bg-bg-secondary`, `--spacing-4` → `p-4`.
