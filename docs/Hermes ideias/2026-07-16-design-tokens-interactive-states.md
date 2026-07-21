# Ideia: Tokens de Estado Interativo (Hover, Active, Disabled)
**Data:** 16/07/2026  
**Problema:** O design tokens não define valores padronizados para estados interativos (hover, active, disabled), resultando em uso de valores hardcodeados e inconsistentes em todo o código. Isso dificulta a manutenção e a consistência visual, especialmente ao implementar temas ou atualizar a paleta de cores.

**Exemplos de inconsistência encontrada:**
- `EisenhowerView.tsx:l183`: `hover:text-text-primary`
- `GUTView.tsx:l266`: `hover:text-text-primary` (consistente aqui, mas não garantido em outros componentes)
- `EisenhowerView.tsx:l194`: `disabled:opacity-30` (valor hardcodeado que deveria ser um token)

**Solução Proposta:** Adicionar tokens específicos em `design-tokens.md` na seção de estados:
- `--state-hover: opacity-80;` ou `--state-hover-color: rgba(0,0,0,0.08);`
- `--state-active: opacity-60;` ou `--state-active-color: rgba(0,0,0,0.12);`
- `--state-disabled: opacity-30;` (já usado como "opacity-30" - tornar token explícito)
- `--state-focus-ring: ring-2 ring-accent;` (para consistência em foco)
- `--state-focus-outline: outline-none;` (opcional, para remover outline padrão quando necessário)

**Diretrizes de uso sugeridas:**
- Botões e elementos interativos: usar `hover:bg-[--state-hover-color]` ou equivalente
- Estado disabled: aplicar `opacity-[--state-disabled]` + `cursor-not-allowed`
- Estado focus: usar o token de ring para consistência com foco de teclado
- Estado active (pressionado): usar `active:bg-[--state-active-color]` quando relevante

**Impacto Esperado:**
1. **Consistência:** Todos os componentes usarão os mesmos valores para estados interativos
2. **Manutenção:** Alteração global de aparência de estados através de um único token
3. **Acessibilidade:** Garante que estados disabled tenham contraste adequado (se o token for definido com valor seguro)
4. **Tema:** Facilita implementação de temas claros/escuros com estados adaptados

**Arquivos Relacionados:** `docs/design-tokens.md`, todos os componentes interativos em `/frontend/src/` (botões, inputs, cards, menus, etc.)