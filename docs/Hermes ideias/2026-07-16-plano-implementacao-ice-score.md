# Plano de Implementação: Substituição da Matriz RICE por ICE Score
**Data:** 16/07/2026  
**Objetivo:** Adicionar a matriz ICE (Impact, Confidence, Ease) como quarta opção de priorização no MindFlow, substituindo conceptualmente a matriz RICE (que é inadequada para uso individual devido à métrica de Reach) mantendo a arquitetura de múltiplas metodologias existentes.

## 📁 ARQUIVOS AFETADOS
| Arquivo | Risco | O que mudar | Justificativa do risco |
|---------|-------|-------------|------------------------|
| `frontend/src/utils/scoring.ts` | **Baixo** | Adicionar função `getIceScore(impact: number, confidence: number, ease: number): number` que retorna `impact * confidence * ease` | Apenas acréscimo de função pura — não altera lógica existente, não remove código, não afeta estado ou chamadas externas. Testes unitários permanecem válidos. |
| `frontend/src/components/matriz/IceView.tsx` | **Baixo** | Criar novo componente seguindo o padrão de `GUTView.tsx` e `EsforcoImpactoView.tsx` (toolbar com `px-2 py-0.5`, badges com texto sobre accent, cards reutilizáveis) | Novo arquivo — zero impacto em funcionalidades existentes. Estrutura baseada em componentes já aprovados no código (evita inconsistências de design). |
| `frontend/src/pages/Matriz.tsx` | **Muito baixo** | Adicionar `"ICE"` ao array de opções de matriz (ex: `["Eisenhower", "GUT", "E×I", "ICE"]`) e atualizar lógica de renderização condicional para incluir `<IceView />` | Alteração mínima e isolada — apenas inclusão em array estático e um `case` adicional em switch/if-else. Não toca em lógica de estado, chamadas de API ou efeitos colaterais. |

## ⚙️ PLANO DE IMPLEMENTAÇÃO
*Execute cada passo seguido por verificação: `cd frontend && npm run typecheck` (zero erros) + `cd frontend && npm run test:unit` (testes existentes passam)*

### Passo 1: Adicionar cálculo ICE em `scoring.ts`
1. Abrir `frontend/src/utils/scoring.ts`
2. Após a última função de export (ex: `export const getGutScore = ...`), adicionar:
   ```typescript
   export const getIceScore = (
     impact: number,    // Escala 1-10 (impacto nos objetivos pessoais)
     confidence: number,// Escala 1-10 (confiança na estimativa)
     ease: number       // Escala 1-10 (facilidade de execução; inverso de effort)
   ): number => {
     // Fórmula ICE: Impact × Confidence × Ease
     // Evita divisão por zero (diferente do RICE) e é intuitiva para uso individual
     return impact * confidence * ease;
   };
   ```
3. Salvar arquivo
4. **Verificação**: `grep -n "getIceScore" frontend/src/utils/scoring.ts` deve retornar a função adicionada

### Passo 2: Criar novo componente `IceView.tsx`
1. Copiar `frontend/src/components/matriz/GUTView.tsx` como base (estrutura consolidada)
2. Renomear para `IceView.tsx` e modificar:
   - Alterar título da página de "GUT" para "ICE"
   - Substituir chamadas a `getGutScore` por `getIceScore` (importando de `../utils/scoring`)
   - Ajustar labels dos sliders para: "Impacto", "Confiança", "Facilidade" (mantendo min=1, max=10, step=1)
   - Manter exatamente a mesma estrutura de toolbar, badges de score, e cards reutilizáveis (ex: `ScoreCard`, `DraggableTaskCard`) para consistência de design
3. Salvar em `frontend/src/components/matriz/IceView.tsx`
4. **Verificação**: `npm run lint -- --fix` no frontend não deve gerar novos erros relacionados ao novo componente

### Passo 3: Registrar ICE na página principal de matrizes
1. Abrir `frontend/src/pages/Matriz.tsx`
2. Localizar o array que define as opções de matriz (ex: `const MATRIX_TYPES = [...]` ou similar em `useState`)
3. Adicionar `"ICE"` ao final do array
4. Localizar o bloco condicional que renderiza a view baseado no tipo selecionado (ex: `switch (matrixType)` ou `if/else if`)
5. Adicionar novo caso:
   ```typescript
   case "ICE":
     return <IceView />;
   ```
6. Salvar arquivo
7. **Verificação**: Ao iniciar o app localmente (`npm run dev`), a opção "ICE" deve aparecer no seletor de matrizes e renderizar corretamente ao ser selecionada

### Passo 4 (Opcional): Adicionar teste unitário para `getIceScore`
1. Criar `frontend/src/utils/scoring.test.ts` (se não existir) ou adicionar ao arquivo de teste existente
2. Incluir cenários:
   ```typescript
   describe("getIceScore", () => {
     test("calcula I×C×E corretamente", () => {
       expect(getIceScore(5, 8, 2)).toBe(80);
       expect(getIceScore(10, 10, 10)).toBe(1000);
     });
     test("retorna zero se qualquer fator for zero", () => {
       expect(getIceScore(0, 5, 5)).toBe(0);
       expect(getIceScore(5, 0, 5)).toBe(0);
       expect(getIceScore(5, 5, 0)).toBe(0);
     });
   });
   ```
3. Executar: `cd frontend && npx vitest run src/utils/scoring.test.ts`

## 🧪 CENÁRIOS DE TESTE OBRIGATÓRIOS
*Todos devem ser implementados e validados antes de considerar a tarefa concluída.*

| Tipo de teste | Cenário | Expected Result | Onde validar |
|---------------|---------|-----------------|--------------|
| **Unitário** | `getIceScore(impact, confidence, ease)` retorna `impact * confidence * ease` | Valores numéricos corretos (ex: 3×4×5=60) | `frontend/src/utils/scoring.test.ts` |
| **Unitário** | Nenhum fator causa divisão por zero (ICE não usa divisão) | Sempre retorna número finito, mesmo com inputs extremos (0, 10, 10 → 0) | Mesmo teste acima |
| **Renderização** | `IceView.tsx` renderiza sem erros quando montado | Nenhum erro no console; estrutura visual semelhante às outras matrizes (toolbar, 4 quadrantes, badges de score) | Teste de renderização com `@testing-library/react` |
| **Integração** | Ao selecionar "ICE" no seletor de matrizes da página `Matriz.tsx`, o componente `IceView` é montado | URL não muda (estado local); elemento com `data-testid="ice-view"` aparece no DOM | Teste end-to-end com Cypress ou teste de integração com React Testing Library |
| **Regrave** | Alternar entre matrizes (ex: Eisenhower → ICE → GUT) não causa vazamento de estado ou re-renders desnecessários | Uso de `React.memo` e `useCallback` preservado; performance consistente com outras matrizes | Profiler do React DevTools (verificar se componentes filhos não re-renderizam desnecessariamente ao mudar apenas o score de uma tarefa) |

> ✅ **Critério de aprovação**: Todos os testes acima devem passar com **zero falhas** antes de considerar a implementação pronta para revisão.

## 📌 PRÓXIMOS PASSOS
1. Aguardar aguardar autorização para prosseguir com a implementação (conforme acordo inicial).
2. Após autorização, executar o plano de implementação passo a autorização explícita com justificativa para prosseguir com a implementação (conforme acordo inicial).
2. Após autorização, executar o plano de implementação passo a passo, validando cada etapa com os comandos de verificação especificados.
3. Fornecer relatório de conclusão contendo:
   - Saída dos comandos de verificação (typecheck, testes, lint)
   - Screenshots antes/depois (se houver mudança visual)
   - Confirmação de que todos os cenários de teste passam

Este plano é executável, reversível e de baixo risco — foca exclusivamente em adições não intrusivas que expandem as funcionalidades existentes sem alterar o núcleo do app.