# MindFlow — Manual do Usuário

> Guia completo para dominar o MindFlow e maximizar sua produtividade.

## 🎯 Visão Geral

O MindFlow é um aplicativo de produtividade pessoal local-first que combina notas, tarefas, hábitos, flashcards e tempo de foco em uma única ferramenta integrada. Tudo permanece no seu computador — sem nuvem, sem cadastro, sem dependência de terceiros.

---

## 📚 Índice

1. [Introdução ao MindFlow](#1-introdução-ao-mindflow)
2. [Primeiros Passos](#2-primeiros-passos)
3. [Captura Rápida (Inbox)](#3-captura-rápida-inbox)
4. [Hábitos](#4-hábitos)
5. [Rotina Diária](#5-rotina-diária)
6. [Pomodoro](#6-pomodoro)
7. [Notas e Ideias](#7-notas-e-ideias)
8. [Flashcards](#8-flashcards)
9. [Sistema de Tipos](#9-sistema-de-tipos)
10. [Consultas Dinâmicas](#10-consultas-dinâmicas)
11. [Análise (Insights)](#11-análise-insights)
12. [Wikilinks e Backlinks](#12-wikilinks-e-backlinks)
13. [Revisão Semanal](#13-revisão-semanal)
14. [Personalização](#14-personalização)
15. [Produtividade](#15-produtividade)
16. [Solução de Problemas](#16-solução-de-problemas)
17. [Referência Rápida](#17-referência-rápida)

---

## 1. Introdução ao MindFlow

### O que é MindFlow?

O MindFlow é um segundo cérebro local-first que centraliza todas as suas tarefas de produtividade. Ele combina elementos de Notion (notas + blocos), Roam Research (wikilinks/backlinks), Anytype (sistema de tipos) e Anki (flashcards SM-2).

**Principais características:**
- **Local-first**: Tudo no seu computador — SQL with WAL mode
- **Keyboard-driven**: Produtividade máxima sem tirar as mãos do teclado
- **Integração profunda**: Módulos conversam entre si
- **Sistema de tipos**: Personalize como seus dados são estruturados
- **Totalmente offline**: Funciona sem conexão com a internet

### Princípios Fundamentais

1. **Privacidade é central**: Nenhum dado sai do seu computador
2. **Simplicidade vence complexidade**: Interface limpa, funcionalidades poderosas
3. **Velocidade é essencial**: Obras completas em segundos
4. **Integridade de dados**: Banco SQLite robusto com migrations

---

## 2. Primeiros Passos

### Instalação

**Windows:**
```cmd
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow
python start.py
```

**macOS/Linux:**
```bash
git clone https://github.com/anton12o/MindFlow.git
cd MindFlow
python start.py
```

O app abrirá automaticamente em `http://localhost:8000` (ou porta disponível). Use `python start.py --port 3000` para porta personalizada.

### Primeira Execução

1. **Dashboard**: Visão geral com seus hábitos, tarefas e insights
2. **Sidebar**: Navegação rápida entre módulos (use "Mais..." para páginas secundárias)
3. **Tema**: Clique no ícone de sol/lua no canto inferior esquerdo
4. **Badge Pomodoro**: Quando o timer estiver ativo, um badge `⚡ MM:SS` aparece no canto superior direito visível em todas as páginas

### Menu Inicial

```
┌─────────────────────────────────────┐
│  🧠 MindFlow v1.2.3                  │
├─────────────────────────────────────┤
│  📥 Inbox (Ctrl+I)                   │
│  ○ Rotina                            │
│  ☰ Hábitos                           │
│  ◷ Pomodoro                          │
│  ◇ Ideias                            │
│  ⚡ Flashcards                       │
│  ◇ Análise                          │
│  📊 Revisão Semanal                  │
│  ⚙ Tipos                             │
│  ⊞ Consultas                         │
├─────────────────────────────────────┤
│  ☀ 🌙                                │
│  📦 Manual do Usuário              │
└─────────────────────────────────────┘
```

---

## 3. Captura Rápida (Inbox)

O Inbox é onde você captura ideias rapidamente, sem interromper seu fluxo de trabalho.

### Atalhos

- **Ctrl+I** (Windows/Linux) / **Cmd+I** (macOS): Abrir Inbox
- **Esc**: Fechar modal
- **Enter**: Criar nota/captura

### Como Usar

1. Pressione **Ctrl+I**
2. Digite sua ideia
3. Pressione **Enter**

**Exemplos de uso:**
- "Ligar com Maria sobre o projeto"
- "Ler 20 páginas do livro hoje"
- "Jogar xadrez 30 minutos"
- "Sair para caminhada"

### Organização

Após capturar, seu item aparece no Inbox. Você pode:

1. **Criar tarefa**: Selecione e aperte **t**
2. **Criar nota**: Selecione e aperte **n**
3. **Arquivar**: Selecionados aperte **a**
4. **Deletar**: Selecionados aperte **d**

### Dicas de Produtividade

- Use inbox imediatamente — não adie
- Use cópia rasa para capturar rapidamente
- Revise inbox pelo menos uma vez por dia

---

## 4. Hábitos

O sistema de hábitos ajuda a manter práticas consistentes com streaks (consecutivos) e visualizações.

### Tipos de Hábitos

#### Binário (Sim/Não)
- Hábitos com duas opções: feitas ou não feitas
- Exemplo: "Correr", "Meditar", "Beber água"

**Duração máxima**: 5 dias por semana

#### Quantitativo
- Hábitos com valor numérico
- Exemplo: "Ler", "Escutar música", "Exercício"

**Meta**: Defina sua meta diária

### Criar Hábito

1. Vá na página **Hábitos**
2. Clique no botão **+ Hábito**
3. Preencha:
   - **Nome**: Ex: "Ler livros"
   - **Tipo**: "Binário" ou "Quantitativo"
   - **Meta**: Ex: "30 minutos" (apenas para quantitativo)
   - **Unidade**: Ex: "páginas", "minutos", "km"
   - **Categoria**: Ex: "Desenvolvimento Pessoal"
   - **Cor**: Escolha uma cor

### Check-in

**Binário**:
1. Clique no botão **Feito ✓**
2. Feedback visual aparece por 1.5 segundos

**Quantitativo**:
1. Digite o valor alcançado
2. Clique em **Confirmar**

### Visualização

**Calendário Mensal**:
- Blocos coloridos indicam realização
- Streaks são exibidos automaticamente

**Dias sem concluir**:
- Marcados como ⚪
- Pode ser exceção (dias fora da rotina)

---

## 5. Rotina Diária

A Rotina organiza seu tempo em blocos de atividade com tarefas associadas.

### Blocos de Tempo

#### Criar Bloco
1. Vá na página **Rotina**
2. Clique em **+ Bloco**
3. Preencha:
   - **Título**: Ex: "Desenvolvimento"
   - **Hora início**: Ex: "09:00"
   - **Hora fim**: Ex: "10:30"
   - **Cor**: Escolha uma cor
   - **Recorrente**: ☑ para repetir diária
   - **Dias da semana**: Para blocos semanais

#### Duração Minima
- **Mínima**: 30 minutos
- **Máxima**: 12 horas
- **Recorrentes**: Padrão diário

### Tarefas

#### Criar Tarefa
Clique em **+ Tarefa** dentro de um bloco:

**Campos obrigatórios:**
- **Título**: Descrição da tarefa
- **Prioridade**: Baixa / Normal / Alta / Urgente
- **Tempo estimado**: Em minutos (opcional)

#### Manipular Tarefas

**Editar**: Clique no título da tarefa
**Concluir**: Clique no checkbox (✓)
**Excluir**: Clique no ícone de lixeira

**Edição Inline**:
- Clique no título para editar
- Clique na prioridade para alterar
- Clique no tempo para ajustar

#### Visualização

**Lista**:
- Exibe todos os blocos com tarefas
- Badge de status (Agora, Concluído, Previsto)

**Calendário Semanal**:
- View por hora do dia
- **Drag-and-drop** para mover blocos (já implementado)

### Streak de Atividade

- Linha colorida mostra dias consecutivos de bloco concluído
- Calculada automaticamente

---

## 6. Pomodoro

O Pomodoro ajuda você a focar em tarefas com tempo limitado.

### Ciclo Básico

1. **Iniciar timer**
2. **Focar** na tarefa
3. **Timer concluído**
4. **Pausa curta** ou **longa**

### Configurar Timer

1. Vá na página **Pomodoro**
2. Defina tempos:
   - **Foco**: 25 minutos (padrão)
   - **Pausa curta**: 5 minutos
   - **Pausa longa**: 15 minutos

### Usar Timer

1. Clique em **Iniciar** para ciclo foco/pausa
2. Acompanhe o timer visualmente (badge `⚡ MM:SS` no canto superior direito)
3. Timer soa quando concluído (3 beeps)
4. Clique em **Parar** manualmente

### Modo Livre

Cronômetro crescente sem alarme ou fases — ideal para tarefas abertas:

1. Clique em **Livre**
2. O tempo conta para cima
3. Badge `⚡ MM:SS` aparece globalmente
4. Clique em **Parar** para encerrar

### Badge Global

Quando o timer estiver ativo (foco, pausa ou livre), um badge `⚡ MM:SS` aparece no canto superior direito do app, visível em todas as páginas — você nunca perde o tempo de vista mesmo navegando.

### Notificações

O Pomodoro solicita permissão para notificações nativas do navegador. Se concedida, você recebe um alerta quando o timer chegar a zero mesmo com a aba em segundo plano. Caso contrário, o som de 3 beeps é usado como fallback.

### Gerar Nota de Resumo

Quando terminar um ciclo:

1. Clique em **Gerar Resumo**
2. Uma nota é criada automaticamente com:
   - Horário do ciclo
   - Título gerado
   - Conteúdo com estatísticas

### Intervalo Automático

- Pausa curta: Continua ciclo
- Pausa longa: Pausa de 15 minutos

---

## 7. Notas e Ideias

O sistema de notas é o coração do MindFlow — sua base de conhecimento.

### Criar Nota

1. Vá na página **Ideias**
2. Clique em **+ Nota**
3. Preencha:
   - **Título**: Ex: "Reunião com João"
   - **Conteúdo**: Markdown
   - **Pasta**: Opcional
   - **Tipo**: Opcional

### Editor Markdown

#### Estrutura Básica
```markdown
# Título Principal

## Seção Secundária

- Item 1
- Item 2
- Item 3

**Texto em negrito**
*Texto em itálico*
`Código inline`

> Citação

![Imagem](url)

[Link](url)
```

#### Sintaxe Supportada
- **Cabeçalhos**: `#`, `##`, `###`
- **Listas**: `-` ou `1.` com recuo
- **Negrito**: `**texto**`
- **Itálico**: `*texto*`
- **Código**: `` `texto` ``
- **Links**: `[texto](url)`
- **Imagens**: `![alt](url)`
- **Citações**: `>`
- **Tabelas**:

```markdown
| Coluna 1 | Coluna 2 |
|----------|----------|
| Valor 1  | Valor 2  |
```

### Estrutura de Pastas

O painel de pastas na página Ideias fica à esquerda da lista de notas.

**Colapsar/expandir**:
- Clique no cabeçalho **Pastas** com o ícone de pasta para recolher ou expandir a seção
- Quando recolhido, mostra a contagem total de pastas

**Criar pasta**:
1. Passe o mouse sobre o cabeçalho **Pastas**
2. Clique no botão **+ Nova**
3. Digite o nome e pressione Enter

**Subpastas**:
- Passe o mouse sobre uma pasta e clique no botão **+** para criar subpasta
- Use ▶/▼ para expandir/recolher subpastas
- Indentação visual mostra a hierarquia

**Excluir pasta**:
- Passe o mouse sobre uma pasta
- Clique no botão **X** que aparece no canto direito
- Confirme a exclusão
- Notas na pasta não são excluídas — apenas removidas da pasta

**Filtrar por pasta**:
- Clique em uma pasta para filtrar as notas
- Clique novamente para limpar o filtro

### Títulos e Conteúdo

**Títulos:**
- Máximo: 500 caracteres
- Primeira linha é o título
- Facilita busca

**Conteúdo:**
- Markdown
- Máximo: 50.000 caracteres

### Templates

Templates aceleram sua criação de notas.

#### Criar Template
1. Crie uma nota e preencha o formato
2. Vá em **Configurações** > **Templates**
3. Adicione à lista

#### Templates Pré-definidos
- **Revisão Semanal**: Estrutura para revisar sua semana
- **Nota de Reunião**: Para documentar reuniões
- **Idea Capture**: Para capturar ideias

#### Usar Template
1. Vá na página **Ideias**
2. Clique no ícone de template
3. Selecione o template

---

## 8. Flashcards

O sistema de flashcards usando o algoritmo SM-2 da SuperMemo.

### Conceito SM-2

**SuperMemo 2** calcula quando você deve revisar cada flashcard baseado em 5 níveis:

- **Muito fácil**: Repetir em intervalo longo (21+ dias)
- **Fácil**: Repetir em intervalo médio (10+ dias)
- **Médio**: Repetir em intervalo curto (3+ dias)
- **Difícil**: Repetir em 1 dia
- **Muito difícil**: Repetir no mesmo dia

### Criar Flashcard

**Método Manual**:
1. Vá na página **Flashcards**
2. Clique em **+ Flashcard**
3. Preencha:
   - **Pergunta**: O que você quer memorizar
   - **Resposta**: A resposta correta
   - **Nota associada**: Opcional

**Método Automático**:
1. Crie uma nota markdown com formato:
   ```
   Pergunta

   --- Resposta ---

   **Explicação**
   ```

2. Clique em **Criar Flashcard** no editor

### Visualizar Flashcard

1. Clique no card para virar e ver a resposta
2. Avalie com 5 níveis: **Muito difícil**, **Difícil**, **Médio**, **Fácil**, **Muito fácil**
3. O algoritmo SM-2 agenda automaticamente a próxima revisão

**Notas de revisão**:
- **Difícil**: Marque "Muito difícil" ou "Difícil"
- **Fácil**: Marque "Fácil" ou "Muito fácil"

### Próxima Revisão

Flashcards pendentes aparecem no topo da lista.

- Streaks são calculados automaticamente
- Algoritmo ajusta schedule baseado em respostas

---

## 9. Sistema de Tipos

O MindFlow permite criar tipos customizados de objetos, inspirado no Anytype.

### Conceito

Tipos definem a estrutura dos seus dados:

**Tarefa**: titulo, prioridade, tempo_estimado, status

**Nota**: titulo, conteudo, pasta_id, tags

**Projeto**: titulo, descricao, datas, propriedades

### Tipos Padrão

O app vem com tipos pré-definidos:

- **Tarefa**: para tarefas simples
- **Nota**: para ideias e documentos
- **Ideia**: para brainstorming
- **Livro**: para documentar leituras
- **Projeto**: para grandes objetivos

### Criar Tipo

1. Vá na página **Tipos**
2. Clique em **+ Tipo**
3. Preencha:
   - **Nome**: Ex: "Cliente"
   - **Ícone**: Ex: 👥
   - **Schema de Campos**: Defina os campos

#### Schema de Campos

**Tipos de Campos**:
- **Texto**: Campo de texto curto
- **Texto Longo**: Campo de texto longo
- **Número**: Campo numérico
- **Data**: Campo de data
- **Booleano**: Campo de verdadeiro/falso
- **Seleção**: Lista de opções
- **Multiple**: Seleção múltipla

**Exemplo de Schema**:
```json
{
  "nome": {
    "tipo": "texto",
    "obrigatorio": true
  },
  "email": {
    "tipo": "texto",
    "obrigatorio": false,
    "formato": "email"
  },
  "status": {
    "tipo": "selecao",
    "opcoes": ["ativo", "inativo"]
  }
}
```

### Campos Especiais

**Sistema de Campos**:
- `titulo`: Título automático do tipo
- `conteudo`: Conteúdo Markdown (padrão para Nota)
- `status`: Status geral do tipo
- `pasta_id`: Opcional (para categorização)

---

## 10. Consultas Dinâmicas

Consultas salvas permitem criar visualizações customizadas dos seus dados.

### Tipos de Visualização

**Grid**: Tabela com colunas
**Kanban**: Colunas organizadas por campo
**Lista**: Lista simples
**Galeria**: Cards visuais
**Formulário**: Formulários interativos
**Calendário**: Calendário mensal
**Gantt**: Timeline de projetos

### Criar Consulta

1. Vá na página **Consultas**
2. Clique em **+ Consulta**
3. Preencha:
   - **Nome**: Ex: "Tarefas da Semana"
   - **Tipo de Objeto**: Tarefa / Nota
   - **Visualização**: Grid, Kanban, etc.
   - **Campo de Agrupamento**: Para visualização Kanban
   - **Filtros**: Opcional
   - **Ordem**: Ex: "criado_em DESC"

### Filtros

**Operadores**:
- **Igual**: campo == valor
- **Diferente**: campo != valor
- **Contém**: campo "conteúdo valor"
- **Maior que**: campo > valor
- **Menor que**: campo < valor

**Combinando Filtros**:
- Todos os filtros aplicados (AND)
- Selecione múltiplos valores

### Usar Consulta

Consultas aparecem na página de **Tipos** com um ícone de lupa.

### Batch Editing

Altere múltiplos itens de uma vez:

1. Selecione itens (checkboxes)
2. Clique no botão "Ação em lote"
3. Edite o campo desejado
4. Confirme as alterações

---

## 11. Análise (Insights)

O Análise analisa sua produtividade com heatmap visual.

### Calendário Mensal

**Heatmap**:
- 🔴 = 1 nota
- 🟠 = 2-4 notas
- 🟢 = 5+ notas
- ⚪ = Sem atividades

**Interagir**:
- Clique em um dia para ver as notas
- Navegue entre meses

### Streak de Atividade

- Linha azul indica dias seguidos
- Calculado baseado em notas criadas
- Visualiza consistência

### Métricas

**Dados exibidos**:
- Total de notas criadas
- Streak atual
- Primeira atividade
- Melhor período (melhor mês ou semana)

---

## 12. Wikilinks e Backlinks

**Wikilinks**: `[[nome da nota]]` — cria conexão entre notas

### Criar Wikilink

Na nota markdown:
```
Veja também [[Reunião com João]]
```

**Resultado**:
- Conexão criada automaticamente
- Exibe no grafo de conhecimento
- Link clicável

### Ver Backlinks

1. Abra uma nota
2. Clique no ícone "🔗" no topo
3. Lista todas as conexões

### Grafo de Conhecimento

Visualização interativa das conexões:

- **Nós**: Notas
- **Links**: Wikilinks
- **Cores**: Por tipo de nota
- **Interagir**:
  - Zoom in/out com scroll
  - Clique para abrir nota
  - Clique e arraste para mover

### Busca Full-Text

**FTS5**: Busca texto completo em notas

- Digite no search bar
- Inclui título e conteúdo
- Case-insensitive
- Padronização de caracteres

---

## 13. Revisão Semanal

A Revisão Semanal ajuda você a analisar sua produtividade semanal com score composto, gráficos e reflexão textual.

### Score Composto

- **Score 0-100**: Combina hábitos, tarefas, pomodoro e notas
- **4 sub-scores**: Produtividade, Consistência, Volume, Conectividade
- **Comparativo**: Compara com semana anterior

### Celebrações

- Score ≥ 70 → Banner 🎉 automático
- Destaque para conquistas da semana

### Lacunas

- Áreas com score < 60% do máximo são destacadas
- Botões de ação direta para melhorar

### Reflexão Textual

- 4 textareas: Conquistas, Aprendizados, Desafios, Próxima Semana
- Salvo como nota automaticamente

---

## 14. Personalização

### Tema Claro/Escuro

1. Clique no ícone ☀ / 🌙 na sidebar
2. Alterna entre temas

### Cores

- Hábitos: Escolha cor por hábito
- Blocos de Rotina: Escolha cor por bloco
- Tags: Escolha cor por tag

---

## 15. Produtividade

### Keyboard Shortcuts

| Atalho | Ação |
|--------|------|
| **Ctrl+K** | Abrir Command Palette |
| **Ctrl+I** | Abrir Inbox |
| **/** | Focar search bar |
| **Ctrl+Z** | Desfazer (revisão) |
| **Ctrl+Shift+Z** | Refazer (revisão) |
| **Ctrl+P** | Buscar nota (Ctrl+P) |

### Workflow de GTD

1. **Capture**: Use Inbox (Ctrl+I)
2. **Clarify**: Revise inbox diária
3. **Organize**: Crie tarefas/notas
4. **Reflect**: Revisão semanal
5. **Engage**: Execute tarefas

### Método Zettelkasten

1. **Nota primária**: Ideia principal
2. **Nota secundária**: Notas úteis conectadas
3. **Wikilinks**: Conecte notas
4. **Revisão**: Flashcards para importantes

---

## 16. Solução de Problemas

### Comuns

**App não abre?**
- Verifique se a porta 8000 está livre
- Se estiver ocupada, o app tenta 8001, 8002... automaticamente
- Para porta específica: `python start.py --port 3000`
- Teste: `curl http://localhost:[porta]/health`

**Nota não salva?**
- Verifique editor de texto
- Selecione "Salvar automaticamente"

**Flashcards não aparecem?**
- Reúna flashcards:
  - Algoritmo espera 10-20 cards
  - Se necessário, recalculue
- Clique em "Reúna flashcards"

---

## 17. Referência Rápida

### Status Icons
- ✓ Concluído
- 🔄 Em andamento
- ⏳ Pendente
- 📂 Pasta
- 📋 Tarefa
- 💾 Nota
- ⏱️ Pomodoro

### Prioridades
- ⚪ Baixa
- 🟢 Normal
- 🟡 Alta
- 🔴 Urgente

---

*Documentação atualizada em 19 de junho de 2026*
*Versão: v1.2.11*