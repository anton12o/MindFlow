# Ideia: Tokens de Elevação/Sombra (Elevation)
**Data:** 16/07/2026  
**Problema:** O design tokens não define valores padronizados para elevação (sombra), resultando em uso inconsistente de valores como `shadow-sm`, `shadow-md`, `shadow-lg` diretamente nos componentes. Isso leva a falta de coerência na percepção de profundidade e dificulta atualizações globais de estilo.

**Exemplos de inconsistência encontrada:**
- `EisenhowerView.tsx:l52`: `hover:shadow-md` (no container draggable)
- `GUTView.tsx:l63`: `shadow-lg` (em estado de arraste)
- Outros componentes podem usar diferentes níveis sem padrão documentado

**Solução Proposta:** Adicionar tokens de elevação em `design-tokens.md` seguindo um sistema de níveis (similar ao Material Design ou Shadow CSS):
- `--elevation-0: 0px 0px 0px rgba(0,0,0,0);` (nenhuma sombra)
- `--elevation-1: 0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24);` (sutil - inputs, botões)
- `--elevation-2: 0px 3px 6px rgba(0,0,0,0.16), 0px 3px 6px rgba(0,0,0,0.23);` (padrão - cards, modais pequenos)
- `--elevation-4: 0px 8px 16px rgba(0,0,0,0.12), 0px 8px 16px rgba(0,0,0,0.24);` (elevado - modais grandes, dropdowns)
- `--elevation-6: 0px 10px 20px rgba(0,0,0,0.19), 0px 6px 6px rgba(0,0,0,0.23);` (mais elevado - drawers, menus)

**Diretrizes de uso sugeridas:**
- `--elevation-0`: elementos planos (backgrounds, barras)
- `--elevation-1`: estados hover/focus de inputs e botões
- `--elevation-2`: padrão para cards, modais pequenos, tooltips
- `--elevation-4`: modais grandes, sidebars, dropdowns elevados
- `--elevation-6`: elementos que precisam se destacar significativamente (ex: floating action button)

**Impacto Esperado:**
1. **Consistência Visual:** Padroniza a profundidade em toda a interface, evitando "soups of shadows"
2. **Manutenção:** Permite ajustar a elevação globalmente alterando apenas os tokens
3. **Escalabilidade:** Facilita adicionar novos níveis de elevação conforme necessário
4. **Claridade:** Fornece diretrizes claras para desenvolvedores sobre quando usar cada nível

**Arquivos Relacionados:** `docs/design-tokens.md`, todos os componentes que utilizam sombras em `/frontend/src/` (cards, modais, botões, dropdowns, etc.)