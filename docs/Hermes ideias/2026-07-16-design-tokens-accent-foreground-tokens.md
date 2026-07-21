# Ideia: Tokens de Cor para Texto em Fundos de Accent
**Data:** 16/07/2026  
**Problema:** O design tokens define `--color-acent` (#58A6FF), mas não há token correspondente para texto sobre esse fundo. Isso resulta em contraste insuficiente (2.53:1) ao usar texto branco direto sobre o accent, violando WCAG AA (mínimo 4.5:1). Afeta 100% dos elementos de destaque (títulos de seção, badges, ícones nas matrizes).

**Solução Proposta:** Adicionar tokens específicos em `design-tokens.md`:
- `--color-accent-foreground: #FFFFFF;` (requer ajuste do accent para tom mais escuro, ex: #0A58C0)
- `--color-accent-foreground-muted: #E6EDF3;`
Alternativamente, redefinir `--color-acent` para um tom mais escuro (ex: #0A58C0) e usar o branco como foreground padrão.

**Impacto Esperado:** Corrigiria as falhas de contraste críticas em todos os componentes que usam texto sobre fondos de accent (títulos "Eisenhower"/"GUT"/"E×I"/"RICE", badges de contagem, ícones de navegação), elevando a conformidade para WCAG AA mínimo.

**Arquivos Relacionados:** `docs/design-tokens.md`, todos os componentes em `/frontend/src/` que utilizam combinações de texto sobre fondos de accent (ex: badges em matrizes, títulos de seção).