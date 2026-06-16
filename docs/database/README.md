# MindFlow — Documentação do Banco de Dados

> Documentação completa do esquema do banco de dados SQLite, incluindo ERD, índices, constraints e procedures.

## 📊 Visão Geral

O MindFlow utiliza SQLite com SQLModel como ORM. O banco segue padrões de integridade referencial com suporte a dados estruturados (JSON) e busca full-text (FTS5).

**Chave Técnica:**
- **Engine**: SQLite com WAL mode
- **ORM**: SQLModel (tipagem forte)
- **Versionamento**: Alembic migrations
- **Busca**: FTS5 para conteúdo de notas
- **Integridade**: Foreign keys ON, constraints UNIQUE

---

## 🗄️ ERD Completo

```mermaid
erDiagram
    %% Tabelas Principais
    INBOX ||--o{ TAREFAS : "destino_id"
    INBOX ||--o{ NOTAS : "destino_id"
    
    PASTAS ||--o{ PASTAS : "pai_id"
    PASTAS ||--o{ NOTAS : "pasta_id"
    
    TIPOS_OBJETO ||--o{ NOTAS : "tipo_id"
    TIPOS_OBJETO ||--o{ TAREFAS : "tipo_id"
    TIPOS_OBJETO ||--o{ FLASHCARDS : "nota_id" (indireto)
    
    NOTAS ||--o{ NOTAS_TAGS : "nota_id"
    NOTAS ||--o{ CONEXOES_NOTAS : "nota_origem_id"
    NOTAS ||--o{ CONEXOES_NOTAS : "nota_destino_id"
    NOTAS ||--o{ FLASHCARDS : "nota_id"
    NOTAS ||--o{ SESSOES_POMODORO : "resumo_nota_id"
    
    BLOCOS_ROTINA ||--o{ TAREFAS : "bloco_id"
    
    HABITOS ||--o{ REGISTROS_HABITO : "habito_id"
    
    %% Tabelas Associativas
    NOTAS_TAGS }|--|| TAGS : "tag_id"
    
    %% Tabelas de Sistema
    TEMPLATES ||--o{ NOTAS : "template_id" (via seed)
    QUERYS_SALVAS ||--o{ TIPOS_OBJETO : "tipo_objeto_id"

    %% Detalhamento das tabelas
    INBOX {
        int id PK
        str conteudo
        str tipo_destino
        int destino_id
        bool arquivado
        str criado_em
    }
    
    NOTAS {
        int id PK
        str titulo
        str conteudo
        int pasta_id FK
        int tipo_id FK
        json propriedades
        str criado_em
        str atualizado_em
        int ordem
        str cover_url
        bool favoritado
        int acessos
        str ultimo_acesso
    }
    
    TAREFAS {
        int id PK
        str titulo
        str prioridade
        int tempo_estimado
        str status
        int bloco_id FK
        str data
        int tipo_id FK
        json propriedades
        str criado_em
    }
    
    HABITOS {
        int id PK
        str nome
        str tipo
        float meta
        str unidade
        str categoria
        str cor
        bool ativo
        str criado_em
    }
    
    REGISTROS_HABITO {
        int id PK
        int habito_id FK
        str data
        float valor
        str justificativa
        bool excecao_justificada
    }
    
    BLOCOS_ROTINA {
        int id PK
        str titulo
        str hora_inicio
        str hora_fim
        str cor
        bool recorrente
        str dias_semana
        str data_especifica
    }
    
    SESSOES_POMODORO {
        int id PK
        str contexto_tipo
        int contexto_id
        int duracao_min
        str finalizado_em
        int resumo_nota_id FK
        str iniciado_em
    }
    
    PASTAS {
        int id PK
        str nome
        int pai_id FK
    }
    
    TAGS {
        int id PK
        str nome UK
        str cor
    }
    
    NOTAS_TAGS {
        int nota_id PK FK
        int tag_id PK FK
    }
    
    CONEXOES_NOTAS {
        int id PK
        int nota_origem_id FK
        int nota_destino_id FK
        str tipo
    }
    
    FLASHCARDS {
        int id PK
        int nota_id FK
        str pergunta
        str resposta
        float intervalo
        float facilidade
        int revisoes
        datetime ultima_revisao
        date proxima_revisao
        datetime criado_em
    }
    
    TEMPLATES {
        int id PK
        str nome
        str descricao
        str conteudo
        json propriedades
        str criado_em
    }
    
    TIPOS_OBJETO {
        int id PK
        str nome
        str icone
        json schema_campos
        json schema_relacoes
        str criado_em
    }
    
    QUERYS_SALVAS {
        int id PK
        str nome
        int tipo_objeto_id FK
        str visualizacao
        str campo_agrupamento
        json filtros
        str ordem
        str criado_em
    }
```

---

## 📋 Tabelas Detalhadas

### 1. **Inbox** - Captura Rápida
| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| `id` | INTEGER | PK, Auto-increment | PRIMARY KEY |
| `conteudo` | TEXT | Conteúdo capturado | NOT NULL, MIN_LENGTH=1 |
| `tipo_destino` | TEXT | Tipo do destino (tarefas/notas) | Nullable |
| `destino_id` | INTEGER | ID do destino | Nullable, FK |
| `arquivado` | BOOLEAN | Status de arquivamento | DEFAULT FALSE |
| `criado_em` | TEXT | Data criação | DEFAULT NOW() |

### 2. **Notas** - Sistema de Conhecimento
| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| `id` | INTEGER | PK, Auto-increment | PRIMARY KEY |
| `titulo` | TEXT | Título da nota | NOT NULL, MAX_LENGTH=500 |
| `conteudo` | TEXT | Conteúdo Markdown | DEFAULT "" |
| `pasta_id` | INTEGER | FK para pastas | Nullable, FK |
| `tipo_id` | INTEGER | FK para tipos | Nullable, FK |
| `propriedades` | JSON | Dados estruturados | DEFAULT {} |
| `criado_em` | TEXT | Data criação | DEFAULT NOW() |
| `atualizado_em` | TEXT | Atualização | DEFAULT NOW() |
| `ordem` | INTEGER | Ordem exibição | DEFAULT 0 |
| `cover_url` | TEXT | URL capa | Nullable |
| `favoritado` | BOOLEAN | Favorito | DEFAULT FALSE |
| `acessos` | INTEGER | Contagem acessos | DEFAULT 0 |
| `ultimo_acesso` | TEXT | Último acesso | Nullable |

### 3. **Tarefas** - Sistema de Tarefas
| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| `id` | INTEGER | PK, Auto-increment | PRIMARY KEY |
| `titulo` | TEXT | Título da tarefa | NOT NULL, MIN_LENGTH=1 |
| `prioridade` | TEXT | Prioridade (baixa/normal/alta/urgente) | DEFAULT "normal" |
| `tempo_estimado` | INTEGER | Minutos estimados | Nullable |
| `status` | TEXT | Status (pendente/em_andamento/feito) | DEFAULT "pendente" |
| `bloco_id` | INTEGER | FK para blocos rotina | Nullable, FK |
| `data` | TEXT | Data da tarefa | NOT NULL |
| `tipo_id` | INTEGER | FK para tipos | Nullable, FK |
| `propriedades` | JSON | Dados estruturados | DEFAULT {} |
| `criado_em` | TEXT | Data criação | DEFAULT NOW() |

### 4. **Hábitos & Registros** - Sistema de Hábitos
**Tabela `habitos`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nome` | TEXT | Nome do hábito |
| `tipo` | TEXT | binario/quantitativo |
| `meta` | FLOAT | Meta (para quantitativo) |
| `unidade` | TEXT | Unidade de medida |
| `categoria` | TEXT | Categoria |
| `cor` | TEXT | Cor visual |
| `ativo` | BOOLEAN | Ativo |
| `criado_em` | TEXT | Criação |

**Tabela `registros_habito`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `habito_id` | INTEGER | FK |
| `data` | TEXT | Data registro |
| `valor` | FLOAT | Valor (para quantitativo) |
| `justificativa` | TEXT | Justificativa |
| `excecao_justificada` | BOOLEAN | Exceção justificada |

### 5. **Rotina** - Sistema de Blocos
**Tabela `blocos_rotina`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `titulo` | TEXT | Título do bloco |
| `hora_inicio` | TEXT | HH:MM |
| `hora_fim` | TEXT | HH:MM |
| `cor` | TEXT | Cor visual |
| `recorrente` | BOOLEAN | Recorrente |
| `dias_semana` | TEXT | Dias (ex: "1,2,3,4,5") |
| `data_especifica` | TEXT | Data específica |

**Tabela `tarefas`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `titulo` | TEXT | Título |
| `bloco_id` | INTEGER | FK (opcional) |

### 6. **Pomodoro** - Sistema de Foco
**Tabela `sessoes_pomodoro`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `contexto_tipo` | TEXT | Nota, Tarefa, etc. |
| `contexto_id` | INTEGER | ID do contexto |
| `duracao_min` | INTEGER | Duração em minutos |
| `iniciado_em` | TEXT | Início |
| `finalizado_em` | TEXT | Fim (opcional) |
| `resumo_nota_id` | INTEGER | FK (nota de resumo) |

### 7. **Tags & Conexões** - Sistema de Relacionamentos
**Tabela `tags`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nome` | TEXT | Nome único |
| `cor` | TEXT | Cor visual |

**Tabela `notas_tags` (muitos-para-muitos):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nota_id` | INTEGER | PK, FK |
| `tag_id` | INTEGER | PK, FK |

**Tabela `conexoes_notas` (backlinks):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nota_origem_id` | INTEGER | FK |
| `nota_destino_id` | INTEGER | FK |
| `tipo` | TEXT | Tipo (ex: "wikilink") |

### 8. **Flashcards** - Sistema de Memória
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nota_id` | INTEGER | FK (opcional) |
| `pergunta` | TEXT | Pergunta |
| `resposta` | TEXT | Resposta |
| `intervalo` | FLOAT | Intervalo SM-2 |
| `facilidade` | FLOAT | Facilidade SM-2 |
| `revisoes` | INTEGER | Nº revisões |
| `ultima_revisao` | DATETIME | Última revisão |
| `proxima_revisao` | DATE | Próxima revisão |
| `criado_em` | DATETIME | Criação |

### 9. **Templates & Tipos** - Sistema de Modelos
**Tabela `templates`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nome` | TEXT | Nome do template |
| `descricao` | TEXT | Descrição |
| `conteudo` | TEXT | Conteúdo Markdown |
| `propriedades` | JSON | Dados estruturados |

**Tabela `tipos_objeto`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nome` | TEXT | Nome do tipo |
| `icone` | TEXT | Ícone emoji |
| `schema_campos` | JSON | Schema de campos |
| `schema_relacoes` | JSON | Schema de relações |

### 10. **Queries Salvas** - Visualizações Dinâmicas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | PK |
| `nome` | TEXT | Nome da query |
| `tipo_objeto_id` | INTEGER | FK |
| `visualizacao` | TEXT | grid/kanban |
| `campo_agrupamento` | TEXT | Campo para agrupar |
| `filtros` | JSON | Filtros aplicados |
| `ordem` | TEXT | Ordem padrão |

---

## 🔍 Índices e Performance

### Índices Primários
- Todas as tabelas têm `id` como PRIMARY KEY
- `tags.nome` tem UNIQUE constraint

### Índices Secundários (Performance)

#### FTS5 Full-Text Search
```sql
-- Tabela virtual FTS5 para busca em notas
CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(
    titulo, conteudo,
    content='notas',
    content_rowid='id',
    tokenize='porter unicode61'
);

-- Triggers para manter FTS5 sincronizado
CREATE TRIGGER IF NOT EXISTS notas_ai AFTER INSERT ON notas BEGIN
    INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
END;

CREATE TRIGGER IF NOT EXISTS notas_ad AFTER DELETE ON notas BEGIN
    INSERT INTO notas_fts(notas_fts, rowid, titulo, conteudo) VALUES('delete', old.id, old.titulo, old.conteudo);
END;

CREATE TRIGGER IF NOT EXISTS notas_au AFTER UPDATE ON notas BEGIN
    INSERT INTO notas_fts(notas_fts, rowid, titulo, conteudo) VALUES('delete', old.id, old.titulo, old.conteudo);
    INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
END;
```

#### Índices para Relacionamentos
```sql
-- Foreign keys já criam índices automaticamente
-- Exemplos de queries otimizadas:
SELECT n.* FROM notas n WHERE n.pasta_id = ?;
SELECT t.* FROM tarefas t WHERE t.bloco_id = ?;
SELECT h.* FROM habitos h WHERE h.ativo = 1;
```

### Unique Constraints
```sql
-- Garante integridade de dados
UNIQUE(nota_id, tag_id) -- notas_tags
UNIQUE(nota_origem_id, nota_destino_id, tipo) -- conexoes_notas
UNIQUE(nome) -- tags
```

---

## ⚙️ Configuração do SQLite

### PRAGMA Settings (em `database.py`)
```python
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")           # FKs ativas
    cursor.execute("PRAGMA journal_mode=WAL")          # Write-Ahead Logging
    cursor.execute("PRAGMA synchronous=NORMAL")       # Performance vs segurança
    cursor.execute("PRAGMA cache_size=-40000")        # 40MB cache
    cursor.execute("PRAGMA temp_store=MEMORY")        # Temp tables na memória
    cursor.execute("PRAGMA busy_timeout=5000")        # Timeout para locks
    cursor.execute("PRAGMA mmap_size=268435456")      # 256MB memory-mapped
    cursor.close()
```

### Benefícios das Configurações
- **WAL mode**: Leitura concorrente, melhor performance
- **Foreign keys**: Integridade referencial
- **Memory-mapped**: Acesso mais rápido a dados grandes
- **Cache size**: Reduz I/O operations

---

## 🔄 Migrations com Alembic

### Sistema de Versionamento
- **Arquivo de config**: `backend/alembic.ini`
- **Migrations**: `backend/alembic/versions/`
- **Comando para criar migration**:
  ```bash
  cd backend && alembic revision --autogenerate -m "descricao"
  ```

### Estrutura de Migration
```python
# Exemplo de migration gerada
def upgrade():
    op.add_column('notas', sa.Column('acessos', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('notas', sa.Column('ultimo_acesso', sa.String(), nullable=True))

def downgrade():
    op.drop_column('notas', 'ultimo_acesso')
    op.drop_column('notas', 'acessos')
```

### Workflow de Migrations
1. **Desenvolvimento**: `alembic revision --autogenerate -m "feature"`
2. **Testes**: Aplicar migration em ambiente de teste
3. **Produção**: `alembic upgrade head`

---

## 📊 Dados Seed (Iniciais)

### Tipos Padrão
```python
# Tipos básicos criados no seed
TIPOS_SEED = [
    {"nome": "Tarefa", "icone": "✅"},
    {"nome": "Nota", "icone": "📄"},
    {"nome": "Ideia", "icone": "💡"},
    {"nome": "Livro", "icone": "📚"},
    {"nome": "Projeto", "icone": "🎯"},
]
```

### Templates Iniciais
```python
# Templates para criação rápida
TEMPLATES_SEED = [
    {
        "nome": "Revisão Semanal",
        "conteudo": "# Revisão Semanal\n\n## Achievements\n\n## Learnings\n\n## Next Week",
        "propriedades": {"tipo": "revisao"}
    },
    {
        "nome": "Nota de Reunião",
        "conteudo": "# Reunião: {{titulo}}\n\n**Data:** {{data}}\n\n**Participantes:**\n\n## Pauta\n\n## Decisões\n\n## Próximos Passos",
        "propriedades": {"tipo": "reuniao"}
    }
]
```

---

## 🛡️ Segurança e Integridade

### Validações de Dados
- **Campos obrigatórios**: `NOT NULL` em colunas críticas
- **Comprimento mínimo**: `MIN_LENGTH=1` em títulos
- **Tipagem forte**: SQLModel evita injeção SQL
- **JSON validation**: Estrutura validada pelo Pydantic

### Proteção contra Perda
- **Foreign keys**: Evita registros órfãos
- **Unique constraints**: Evita duplicatas
- **WAL mode**: Recuperação de crashes
- **Backup strategy**: Cold copy via script

---

## 📈 Estatísticas do Banco

### Tamanho Estimado
- **Notas**: ~1000 notas = 5-10MB
- **Tarefas**: ~500 tarefas = 1-2MB
- **Hábitos**: ~50 hábitos = 0.5MB
- **Total estimado**: 10-20MB para uso intensivo

### Performance Considerações
- **FTS5**: Busca full-text em ~100ms para 1000 notas
- **Cache**: 40MB cache reduz I/O
- **Conexões**: `pool_pre_ping=True` evita deadlocks

---

## 🔧 Manutenção e Otimização

### Verificação de Integridade
```python
# Executar periodicamente
def check_db_integrity():
    with Session(engine) as session:
        result = session.execute(text("PRAGMA quick_check")).scalar()
        if result != "ok":
            logger.warning("Integrity issue: %s", result)
```

### Rebuild FTS5 (se necessário)
```sql
-- Rebuild index FTS5 corrompido
INSERT INTO notas_fts(notas_fts) VALUES('rebuild');
```

### Limpeza de Dados
- **Registros órfãos**: Deletados via FKs
- **Sessões pomodoro finalizadas**: Podem ser archivadas
- **Inbox arquivado**: Pode ser limpo periodicamente

---

## 🚨 Recovery Procedures

### Banco Corrompido
1. **Verificar integridade**: `PRAGMA quick_check`
2. **Rebuild FTS5**: `INSERT INTO notas_fts VALUES('rebuild')`
3. **Restaurar backup**: Usar arquivo `.db` mais recente
4. **Reaplicar migrations**: `alembic upgrade head`

### Dados Perdidos
- **Exportação**: Use endpoint `/api/export` para JSON completo
- **Backup**: Manter cópias regulares do arquivo `mindflow.db`
- **Seed**: Dados iniciais sempre reaplicados

---

## 📚 Referências

- [SQLite Documentation](https://sqlite.org/docs.html)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [FTS5 Extension](https://www.sqlite.org/fts5.html)

---

*Última atualização: 16 de junho de 2026*
*Versão: v1.2.3*