const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial" })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Arial" })]
  });
}

function p(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", ...options })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

function sub(text) {
  return new Paragraph({
    numbering: { reference: "subbullets", level: 0 },
    spacing: { before: 30, after: 30 },
    children: [new TextRun({ text, size: 20, font: "Arial", color: "444444" })]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 1 } },
    children: [new TextRun("")]
  });
}

function infoTable(rows) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2706, 6320],
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 2706, type: WidthType.DXA },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial" })] })]
        }),
        new TableCell({
          borders,
          width: { size: 6320, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Arial" })] })]
        })
      ]
    }))
  });
}

function moduleTable(modules) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2200, 3613, 3213],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 2200, type: WidthType.DXA },
            shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Módulo", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
          }),
          new TableCell({
            borders,
            width: { size: 3613, type: WidthType.DXA },
            shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Descrição", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
          }),
          new TableCell({
            borders,
            width: { size: 3213, type: WidthType.DXA },
            shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "MVP / V2", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
          })
        ]
      }),
      ...modules.map(([mod, desc, ver], i) => new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 2200, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? "FFFFFF" : "F9F9F9", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: mod, bold: true, size: 20, font: "Arial" })] })]
          }),
          new TableCell({
            borders,
            width: { size: 3613, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? "FFFFFF" : "F9F9F9", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: desc, size: 20, font: "Arial" })] })]
          }),
          new TableCell({
            borders,
            width: { size: 3213, type: WidthType.DXA },
            shading: { fill: ver === "MVP" ? "E8F5E9" : "FFF9E6", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: ver, bold: true, size: 20, font: "Arial", color: ver === "MVP" ? "2E7D32" : "F57F17" })] })]
          })
        ]
      }))
    ]
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      },
      {
        reference: "subbullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1A1A2E" },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "16213E" },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [

      // CAPA
      spacer(), spacer(), spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "MindFlow", bold: true, size: 72, font: "Arial", color: "1A1A2E" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "Documento de Especificação Técnica \u2014 MVP", size: 26, font: "Arial", color: "555555" })]
      }),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "App de produtividade pessoal local-first para rotina, hábitos,", size: 22, font: "Arial", color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "anotações, foco e captura rápida de ideias.", size: 22, font: "Arial", color: "666666" })]
      }),
      spacer(), spacer(),
      infoTable([
        ["Projeto", "MindFlow"],
        ["Autor", "Antonio (Anton Tech)"],
        ["Stack", "Vite + React (frontend) / FastAPI + SQLite (backend)"],
        ["Versão do doc", "1.0 \u2014 MVP"],
        ["Data", new Date().toLocaleDateString('pt-BR')]
      ]),
      spacer(),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // SUMÁRIO MANUAL
      h1("Sumário"),
      p("1. Visão Geral do Projeto"),
      p("2. Stack Técnica"),
      p("3. Módulos do MVP"),
      p("4. Módulo: Captura Rápida / Inbox"),
      p("5. Módulo: Hábitos"),
      p("6. Módulo: Rotina Diária"),
      p("7. Módulo: Pomodoro + Notas"),
      p("8. Módulo: Área de Ideias e Conhecimento"),
      p("9. Interface e UX"),
      p("10. Modelo de Dados (SQLite)"),
      p("11. Estrutura de Pastas"),
      p("12. Fluxos de Integração entre Módulos"),
      p("13. Roadmap: MVP → V2"),
      p("14. Instruções para o Agente de IA"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 1. VISÃO GERAL
      h1("1. Visão Geral do Projeto"),
      p("MindFlow é um app de produtividade pessoal local-first que roda no navegador, servido localmente via backend Python. O objetivo é integrar rotina, hábitos, foco (Pomodoro), anotações e captura rápida de ideias em uma única interface coesa — sem depender de serviços na nuvem, sem fricção desnecessária, com dados controlados pelo usuário."),
      spacer(),
      p("Princípios do projeto:", { bold: true }),
      bullet("Local-first: todos os dados ficam em SQLite local, sem necessidade de conta ou internet."),
      bullet("Sem fricção: capturar uma ideia deve levar menos de 2 segundos."),
      bullet("Integração real: os módulos conversam entre si (hábito → pomodoro → nota)."),
      bullet("Keyboard-driven: tudo acessível via atalhos de teclado."),
      bullet("Minimalista: interface limpa, tema escuro nativo, sem poluição visual."),
      bullet("Exportável: dados exportáveis em JSON e Markdown a qualquer momento."),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 2. STACK
      h1("2. Stack Técnica"),
      spacer(),
      infoTable([
        ["Frontend", "Vite + React + TypeScript"],
        ["Estilização", "Tailwind CSS (tema escuro como padrão)"],
        ["Editor de notas", "CodeMirror 6 (Markdown + syntax highlight)"],
        ["Backend", "FastAPI (Python 3.11+)"],
        ["Banco de dados", "SQLite via SQLModel ou SQLAlchemy"],
        ["Comunicação", "REST API (JSON) — sem WebSocket no MVP"],
        ["Execução local", "uvicorn para o backend, Vite dev server para o frontend"],
        ["Atalho global", "Electron wrapper opcional na V2 — no MVP, atalho dentro da página"],
        ["Exportação", "Endpoint /export retorna JSON; conversão para .md no frontend"]
      ]),
      spacer(),
      p("Observação: a stack é idêntica ao projeto FavStore (React + Vite + FastAPI), facilitando a familiaridade do desenvolvedor com o ambiente."),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 3. MÓDULOS
      h1("3. Módulos do MVP"),
      spacer(),
      moduleTable([
        ["Captura / Inbox", "Campo de texto global para capturar ideias sem categorizar", "MVP"],
        ["Hábitos", "Rastreador binário e quantitativo com streak e log de falha", "MVP"],
        ["Rotina Diária", "Blocos de tempo fixos + lista de tarefas do dia", "MVP"],
        ["Pomodoro + Notas", "Timer integrado com nota vinculada ao bloco de foco", "MVP"],
        ["Área de Ideias", "Notas livres, mapas mentais textuais, resumos com Markdown", "MVP"],
        ["Dashboard", "Visão geral do dia: hábitos pendentes, tarefas, timer ativo", "MVP"],
        ["Paleta de comandos", "Ctrl+K para navegar por todo o app via teclado", "MVP"],
        ["Módulo Anton Tech", "OS de serviço, clientes, faturamento", "V2"],
        ["Sync na nuvem", "Sincronização segura com dispositivos externos", "V2"],
        ["Electron wrapper", "Atalho global do sistema operacional (Alt+Espaço)", "V2"]
      ]),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 4. CAPTURA RÁPIDA
      h1("4. Módulo: Captura Rápida / Inbox"),
      h2("4.1 Propósito"),
      p("Permitir que o usuário registre qualquer ideia, insight ou anotação em menos de 2 segundos, sem precisar categorizar no momento."),
      spacer(),
      h2("4.2 Comportamento"),
      bullet("Atalho Ctrl+I (ou botão fixo na sidebar) abre um modal com campo de texto limpo."),
      bullet("O texto é salvo na tabela inbox ao pressionar Enter ou Ctrl+Enter."),
      bullet("Itens da inbox aparecem em uma lista cronológica reversa."),
      bullet("Cada item pode ser: convertido em tarefa, movido para Área de Ideias, transformado em hábito, ou descartado."),
      bullet("Revisão da inbox: o app sugere revisar os itens pendentes no final do dia (via badge visual, não notificação push)."),
      spacer(),
      h2("4.3 Campos do item (banco)"),
      bullet("id, conteudo (texto), criado_em, tipo_destino (null / tarefa / nota / habito), destino_id (null ou FK), arquivado (bool)"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 5. HÁBITOS
      h1("5. Módulo: Hábitos"),
      h2("5.1 Tipos de hábito"),
      bullet("Binário: feito / não feito (ex: revisar flashcards)."),
      bullet("Quantitativo: registra um valor numérico com unidade (ex: estudar — 45 minutos, beber água — 2 litros)."),
      spacer(),
      h2("5.2 Funcionalidades"),
      bullet("Criação de hábito: nome, tipo, meta diária (opcional), categoria, cor/ícone."),
      bullet("Registro diário: marcar como feito ou inserir quantidade."),
      bullet("Streak: contagem de dias consecutivos, exibida no card do hábito."),
      bullet("Log de falha justificado: ao pular um hábito, o usuário pode registrar o motivo (campo de texto livre). Isso não quebra o streak se marcado como 'exceção justificada' — decisão do usuário."),
      bullet("Visão semanal: grid 7 dias × N hábitos, com cores por status (feito / parcial / faltou / justificado)."),
      bullet("Histórico: gráfico simples de consistência nos últimos 30 dias."),
      spacer(),
      h2("5.3 Campos do banco"),
      bullet("habitos: id, nome, tipo, meta, unidade, categoria, cor, ativo, criado_em"),
      bullet("registros_habito: id, habito_id, data, valor, justificativa, excecao_justificada"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 6. ROTINA
      h1("6. Módulo: Rotina Diária"),
      h2("6.1 Dois componentes"),
      spacer(),
      h3("Blocos de tempo (agenda)"),
      bullet("O usuário define blocos fixos recorrentes: ex. 08h–12h Trabalho, 13h–17h Estágio, 19h–22h Faculdade."),
      bullet("Os blocos aparecem em uma timeline visual do dia."),
      bullet("Cada bloco pode ter uma cor e uma categoria."),
      bullet("Blocos excepcionais (dia específico, não recorrente) também são suportados."),
      spacer(),
      h3("Lista de tarefas do dia"),
      bullet("Tarefas com: título, prioridade (alta / normal / baixa), tempo estimado (opcional), status (pendente / feito)."),
      bullet("Uma tarefa pode ser vinculada a um bloco de tempo."),
      bullet("Tarefas não concluídas são roladas automaticamente para o próximo dia com marcação visual."),
      bullet("Adicionar tarefa via Ctrl+T abre inline — sem modal pesado."),
      spacer(),
      h2("6.2 Campos do banco"),
      bullet("blocos_rotina: id, titulo, hora_inicio, hora_fim, cor, recorrente, dias_semana, data_especifica"),
      bullet("tarefas: id, titulo, prioridade, tempo_estimado, status, bloco_id (FK nullable), data, criado_em"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 7. POMODORO
      h1("7. Módulo: Pomodoro + Notas"),
      h2("7.1 Timer"),
      bullet("Ciclos configuráveis: padrão 25min foco / 5min pausa / 15min pausa longa."),
      bullet("O timer pode ser iniciado a partir de um hábito, de uma tarefa ou de forma livre."),
      bullet("Ao iniciar, o contexto (hábito ou tarefa vinculada) aparece no topo do timer."),
      bullet("Sons de notificação ao fim do ciclo (configurável)."),
      spacer(),
      h2("7.2 Nota vinculada"),
      bullet("Ao fim de cada sessão Pomodoro, o app exibe um botão 'Registrar resumo'."),
      bullet("Ao clicar, abre um editor de nota pré-vinculado ao contexto (ex: 'Estudo — FastAPI — 25min')."),
      bullet("A nota é salva automaticamente na Área de Ideias com a tag do contexto e a data/hora."),
      bullet("O botão é uma sugestão, não uma ação automática forçada."),
      spacer(),
      h2("7.3 Campos do banco"),
      bullet("sessoes_pomodoro: id, contexto_tipo (habito/tarefa/livre), contexto_id, duracao_min, iniciado_em, finalizado_em, nota_id (FK nullable)"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 8. ÁREA DE IDEIAS
      h1("8. Módulo: Área de Ideias e Conhecimento"),
      h2("8.1 Propósito"),
      p("Espaço livre para notas, resumos de estudo, fluxos de pensamento, mapas mentais textuais e qualquer conteúdo que precise ser organizado e recuperado depois."),
      spacer(),
      h2("8.2 Funcionalidades"),
      bullet("Editor Markdown completo com syntax highlighting (CodeMirror 6)."),
      bullet("Suporte a blocos de código com highlight por linguagem (Python, JavaScript, SQL, etc.)."),
      bullet("Organização por pastas e tags (não hierarquia rígida)."),
      bullet("Busca full-text por título e conteúdo."),
      bullet("Notas podem ser vinculadas a hábitos, tarefas ou sessões Pomodoro."),
      bullet("Exportação individual de nota como arquivo .md."),
      bullet("Modo foco: esconde sidebar, exibe só o editor."),
      spacer(),
      h2("8.3 Mapa mental textual (MVP simples)"),
      bullet("Formato de lista indentada renderizada visualmente como árvore — sem dependência de lib complexa no MVP."),
      bullet("Ex: digitar com indentação Tab cria filhos no nó atual."),
      spacer(),
      h2("8.4 Campos do banco"),
      bullet("notas: id, titulo, conteudo (Markdown), pasta_id (FK nullable), criado_em, atualizado_em"),
      bullet("tags: id, nome, cor"),
      bullet("notas_tags: nota_id, tag_id"),
      bullet("pastas: id, nome, pai_id (FK nullable para subpastas)"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 9. INTERFACE
      h1("9. Interface e UX"),
      h2("9.1 Layout geral"),
      bullet("Sidebar esquerda fixa: ícones de navegação para cada módulo + botão de captura rápida."),
      bullet("Área central: conteúdo do módulo ativo."),
      bullet("Header superior: data atual, timer Pomodoro compacto (se ativo), badge da inbox."),
      spacer(),
      h2("9.2 Estética"),
      bullet("Tema escuro como padrão (cores base: #0D0D1A, #1A1A2E, #E0E0E0)."),
      bullet("Tipografia: Inter ou JetBrains Mono para blocos de código."),
      bullet("Sem animações pesadas — transições de 150ms máximo."),
      bullet("Estética 'retrô-moderna': bordas sutis, acentos em azul/cyan, grid limpo."),
      spacer(),
      h2("9.3 Atalhos de teclado"),
      spacer(),
      infoTable([
        ["Ctrl+K", "Abre a paleta de comandos"],
        ["Ctrl+I", "Abre captura rápida / Inbox"],
        ["Ctrl+T", "Nova tarefa (no módulo de rotina)"],
        ["Ctrl+N", "Nova nota (na área de ideias)"],
        ["Ctrl+P", "Inicia / pausa Pomodoro"],
        ["Ctrl+S", "Salva nota atual"],
        ["Esc", "Fecha modal / volta para listagem"]
      ]),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 10. MODELO DE DADOS
      h1("10. Modelo de Dados (SQLite)"),
      p("Todas as tabelas usam id INTEGER PRIMARY KEY AUTOINCREMENT e timestamps criado_em TEXT (ISO 8601). Abaixo o esquema resumido:"),
      spacer(),
      h3("inbox"),
      bullet("id, conteudo TEXT, criado_em, tipo_destino TEXT, destino_id INT, arquivado BOOL DEFAULT 0"),
      spacer(),
      h3("habitos"),
      bullet("id, nome TEXT, tipo TEXT (binario|quantitativo), meta REAL, unidade TEXT, categoria TEXT, cor TEXT, ativo BOOL DEFAULT 1, criado_em"),
      spacer(),
      h3("registros_habito"),
      bullet("id, habito_id INT FK, data TEXT, valor REAL, justificativa TEXT, excecao_justificada BOOL DEFAULT 0"),
      spacer(),
      h3("blocos_rotina"),
      bullet("id, titulo TEXT, hora_inicio TEXT, hora_fim TEXT, cor TEXT, recorrente BOOL, dias_semana TEXT (JSON array), data_especifica TEXT"),
      spacer(),
      h3("tarefas"),
      bullet("id, titulo TEXT, prioridade TEXT, tempo_estimado INT, status TEXT, bloco_id INT FK, data TEXT, criado_em"),
      spacer(),
      h3("sessoes_pomodoro"),
      bullet("id, contexto_tipo TEXT, contexto_id INT, duracao_min INT, iniciado_em TEXT, finalizado_em TEXT, nota_id INT FK"),
      spacer(),
      h3("notas"),
      bullet("id, titulo TEXT, conteudo TEXT (Markdown), pasta_id INT FK, criado_em, atualizado_em"),
      spacer(),
      h3("pastas / tags / notas_tags"),
      bullet("pastas: id, nome, pai_id INT FK"),
      bullet("tags: id, nome, cor"),
      bullet("notas_tags: nota_id INT FK, tag_id INT FK"),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 11. ESTRUTURA DE PASTAS
      h1("11. Estrutura de Pastas do Projeto"),
      spacer(),
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [new TextRun({
          text:
`mindflow/
\u2502\u2500\u2500 backend/
\u2502   \u2502\u2500\u2500 main.py              # FastAPI app, rotas principais
\u2502   \u2502\u2500\u2500 database.py          # Conexão SQLite, criação de tabelas
\u2502   \u2502\u2500\u2500 models.py            # SQLModel / Pydantic models
\u2502   \u2502\u2500\u2500 routers/
\u2502   \u2502   \u2502\u2500\u2500 inbox.py
\u2502   \u2502   \u2502\u2500\u2500 habitos.py
\u2502   \u2502   \u2502\u2500\u2500 rotina.py
\u2502   \u2502   \u2502\u2500\u2500 pomodoro.py
\u2502   \u2502   \u2514\u2500\u2500 notas.py
\u2502   \u2514\u2500\u2500 mindflow.db          # Banco de dados local
\u2502
\u2502\u2500\u2500 frontend/
\u2502   \u2502\u2500\u2500 src/
\u2502   \u2502   \u2502\u2500\u2500 components/
\u2502   \u2502   \u2502   \u2502\u2500\u2500 Sidebar.tsx
\u2502   \u2502   \u2502   \u2502\u2500\u2500 CommandPalette.tsx
\u2502   \u2502   \u2502   \u2502\u2500\u2500 InboxModal.tsx
\u2502   \u2502   \u2502   \u2514\u2500\u2500 PomodoroTimer.tsx
\u2502   \u2502   \u2502\u2500\u2500 pages/
\u2502   \u2502   \u2502   \u2502\u2500\u2500 Dashboard.tsx
\u2502   \u2502   \u2502   \u2502\u2500\u2500 Habitos.tsx
\u2502   \u2502   \u2502   \u2502\u2500\u2500 Rotina.tsx
\u2502   \u2502   \u2502   \u2502\u2500\u2500 Pomodoro.tsx
\u2502   \u2502   \u2502   \u2514\u2500\u2500 Ideias.tsx
\u2502   \u2502   \u2502\u2500\u2500 hooks/
\u2502   \u2502   \u2502   \u2502\u2500\u2500 useHabitos.ts
\u2502   \u2502   \u2502   \u2502\u2500\u2500 usePomodoro.ts
\u2502   \u2502   \u2502   \u2514\u2500\u2500 useNotas.ts
\u2502   \u2502   \u2502\u2500\u2500 api/             # Funções fetch para o backend
\u2502   \u2502   \u2502\u2500\u2500 App.tsx
\u2502   \u2502   \u2514\u2500\u2500 main.tsx
\u2502   \u2502\u2500\u2500 index.html
\u2502   \u2514\u2500\u2500 vite.config.ts
\u2502
\u2502\u2500\u2500 README.md
\u2514\u2500\u2500 start.sh                 # Script para iniciar backend + frontend`,
          font: "Courier New",
          size: 18
        })]
      }),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 12. FLUXOS
      h1("12. Fluxos de Integração entre Módulos"),
      spacer(),
      h3("Fluxo 1: Inbox → Tarefa / Nota / Hábito"),
      bullet("Usuário abre Inbox via Ctrl+I e digita uma ideia."),
      bullet("Na revisão, clica em 'Converter' e escolhe o destino."),
      bullet("O item é movido, arquivado na inbox, e o destino é criado com o conteúdo pré-preenchido."),
      spacer(),
      h3("Fluxo 2: Hábito → Pomodoro → Nota"),
      bullet("Na tela de hábitos, o usuário inicia o hábito 'Estudar FastAPI'."),
      bullet("O Pomodoro abre com o contexto preenchido: 'Estudar FastAPI'."),
      bullet("Ao fim do ciclo, aparece o botão 'Registrar resumo'."),
      bullet("A nota é criada automaticamente com título 'Estudar FastAPI — [data] [hora]' e tag 'estudo'."),
      spacer(),
      h3("Fluxo 3: Tarefa → Pomodoro"),
      bullet("Na lista de tarefas do dia, o usuário clica no ícone de timer ao lado de uma tarefa."),
      bullet("O Pomodoro inicia com o contexto da tarefa."),
      bullet("Ao finalizar, o app pergunta se a tarefa foi concluída."),
      spacer(),
      h3("Fluxo 4: Rotina → Dashboard"),
      bullet("O dashboard exibe os blocos de tempo do dia atual na timeline."),
      bullet("Hábitos pendentes aparecem como cards com ação rápida (marcar como feito sem sair do dashboard)."),
      bullet("Tarefas do dia aparecem em lista compacta com checkbox."),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 13. ROADMAP
      h1("13. Roadmap: MVP → V2"),
      spacer(),
      moduleTable([
        ["Export JSON/MD", "Dump completo dos dados do usuário", "MVP"],
        ["Tema claro", "Alternativa ao tema escuro", "V2"],
        ["Atalho global OS", "Alt+Espaço via Electron para captura fora do browser", "V2"],
        ["Módulo Anton Tech", "OS de serviço, clientes, faturamento simples", "V2"],
        ["Sync na nuvem", "Backup opcional para servidor próprio ou S3", "V2"],
        ["Flashcards", "Revisão espaçada integrada à área de ideias", "V2"],
        ["Relatório semanal", "PDF/Markdown automático de hábitos e foco da semana", "V2"],
        ["PWA", "Instalar como app no Windows sem Electron", "V2"]
      ]),
      new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

      // 14. INSTRUÇÕES PARA IA
      h1("14. Instruções para o Agente de IA (OpenCode)"),
      p("Use este bloco como prompt de contexto ao iniciar o OpenCode:"),
      spacer(),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
          left: { style: BorderStyle.SINGLE, size: 12, color: "1A1A2E" },
          right: { style: BorderStyle.NONE }
        },
        children: [new TextRun({
          text: "Você vai construir o MindFlow, um app de produtividade pessoal local-first. Stack: Vite + React + TypeScript no frontend, FastAPI + SQLite no backend. Siga a estrutura de pastas do documento de spec. Comece pelo backend: crie o main.py, database.py, models.py e os routers para inbox e habitos. Use SQLModel para os modelos. O banco de dados deve ser criado automaticamente ao iniciar o servidor. Todos os endpoints retornam JSON. Use CORS habilitado para localhost:5173. Não use autenticação no MVP.",
          font: "Courier New",
          size: 20
        })]
      }),
      spacer(),
      p("Dicas de uso com o OpenCode:", { bold: true }),
      bullet("Comece sempre pelo backend de um módulo antes do frontend correspondente."),
      bullet("Peça um módulo por vez — não peça tudo de uma vez."),
      bullet("Após cada módulo, teste manualmente antes de continuar."),
      bullet("Se algo quebrar, cole o erro exato no OpenCode com o contexto de qual arquivo estava sendo gerado."),
      bullet("Para o editor Markdown, peça especificamente: 'Instale e configure o CodeMirror 6 com suporte a Markdown e syntax highlighting para Python, JavaScript e SQL.'"),
      spacer(),
      spacer(),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 0 },
        children: [new TextRun({ text: "MindFlow — Spec v1.0 — Anton Tech", size: 18, font: "Arial", color: "888888" })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, 'MindFlow-Spec.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Gerado com sucesso em:', outPath);
});
