# Documentação do MindFlow

## Estrutura

```
docs/
├── README.md                          ← Este arquivo (índice)
│
├── OpencodeXFreebuff/                 ← FLUXO ATIVO (Cérebro ↔ Máquina)
│   ├── 00_README.md                   ← Fluxo de trabalho Cérebro&Máquina
│   ├── 01_MFLOW_CONCEITO.md           ← Modelo conceitual do projeto
│   ├── 02_REGRAS.md                   ← Regras do projeto (hard rules)
│   ├── analises/                      ← Relatórios de análise [FEITO]
│   ├── pensamentos/                   ← Rascunhos em andamento [FAZENDO]
│   ├── ideias/                        ← Ideias + lições aprendidas
│   └── sessoes/                       ← Logs de sessões unificados
│
├── memoria/                           ← Memória persistente da Máquina
│   ├── hot.md                         ← Estado atual (objetivo, branch, próximo passo)
│   ├── erros.md                       ← Catálogo de bugs já resolvidos
│   └── comandos.md                    ← Comandos úteis (referência rápida)
│
├── adr/                               ← Architecture Decision Records
│   ├── README.md
│   ├── 001-sqlmodel-vs-sqlalchemy.md
│   ├── 002-local-first-vs-cloud.md
│   └── 003-startpy-monolito.md
│
├── api/                               ← Exemplos de requisições HTTP
│   └── mindflow.http
│
├── Skills/                            ← Skills de consulta (apenas do MindFlow)
│   ├── tailwind-mindflow/
│   ├── tanstack-query-mindflow/
│   ├── alembic-mindflow/
│   └── pytest-mindflow/
│
├── workflow/                          ← Kanban (referenciado pelo AGENTS.md)
│   └── WORKFLOW.md
│
└── .doc-legado/                       ← ARQUIVO MORTO (não referenciar)
    ├── doc-list/                      ← Ex-DocsList/ (17 arquivos legados)
    ├── feedback/                      ← Ex-Feedback/ (8 arquivos legados)
    ├── skills-externas/               ← Skills de outros projetos (Hermes)
    └── sessoes-antigas/               ← Sessões antigas (opcional)
```

---

## Como Navegar

| Se procura... | Vá para |
|---------------|---------|
| **Como funciona o fluxo Cérebro&Máquina** | `OpencodeXFreebuff/00_README.md` |
| **Regras do projeto (obrigatórias)** | `OpencodeXFreebuff/02_REGRAS.md` |
| **Estado atual da Máquina** | `memoria/hot.md` |
| **Bugs já resolvidos (evita rediagnóstico)** | `memoria/erros.md` |
| **Decisões arquiteturais (ADRs)** | `adr/` |
| **Exemplos de API (curl/http)** | `api/mindflow.http` |
| **Skills para consultar (Tailwind, TanStack, etc.)** | `Skills/` |
| **Kanban / Workflow** | `workflow/WORKFLOW.md` |
| **Análises concluídas** | `OpencodeXFreebuff/analises/` |
| **Ideias / lições aprendidas** | `OpencodeXFreebuff/ideias/` |

---

## Princípios

1. **OpencodeXFreebuff/** = núcleo vivo (fluxo ativo)
2. **memoria/** = estado persistente da Máquina (atualizado a cada sessão)
3. **adr/** = decisões arquiteturais imutáveis
4. **.doc-legado/** = arquivo morto — **não referenciar, não editar**
5. **Skills/** = apenas as 4 do MindFlow (outras foram movidas para .doc-legado)

---

## Atualização

- `memoria/hot.md` + `memoria/SESSION.md`: atualizados pela **Máquina** ao final de cada tarefa
- `OpencodeXFreebuff/analises/`: escritos pelo **Cérebro**, lidos pela **Máquina**
- `OpencodeXFreebuff/sessoes/`: logs consolidados de sessões passadas

> **Regra:** Nunca edite `.doc-legado/`. Nunca mova arquivos de `OpencodeXFreebuff/` sem análise do Cérebro.