from datetime import date, datetime
from typing import Any

from pydantic import field_validator
from sqlalchemy import Index, UniqueConstraint
from sqlmodel import JSON, Column, Field, Relationship, SQLModel


def now():
    return datetime.now().isoformat()

# ─── Inbox ───
class InboxItemBase(SQLModel):
    conteudo: str = Field(min_length=1)
    tipo_destino: str | None = None
    destino_id: int | None = Field(default=None, foreign_key="notas.id", ondelete="SET NULL", index=True)
    arquivado: bool = False

class InboxItem(InboxItemBase, table=True):
    __tablename__ = "inbox"
    id: int | None = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)

class InboxItemCreate(InboxItemBase):
    pass

class InboxItemUpdate(SQLModel):
    conteudo: str | None = None
    tipo_destino: str | None = None
    destino_id: int | None = None
    arquivado: bool | None = None

class InboxItemRead(InboxItemBase):
    id: int
    criado_em: str

# ─── Hábitos ───
class HabitoBase(SQLModel):
    nome: str = Field(min_length=1)
    tipo: str = "binario"

    @field_validator('tipo')
    @classmethod
    def check_tipo(cls, v: str) -> str:
        if v not in ("binario", "quantitativo"):
            raise ValueError(f'tipo inválido: "{v}". Deve ser "binario" ou "quantitativo"')
        return v
    meta: float | None = None
    unidade: str | None = None
    categoria: str | None = None
    cor: str | None = None
    ativo: bool = True
    dias_semana: str | None = None

class Habito(HabitoBase, table=True):
    __tablename__ = "habitos"
    id: int | None = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)
    registros: list["RegistroHabito"] = Relationship(back_populates="habito")

class HabitoCreate(HabitoBase):
    pass

class HabitoUpdate(SQLModel):
    nome: str | None = Field(default=None, min_length=1)
    tipo: str | None = None
    meta: float | None = None
    categoria: str | None = None
    dias_semana: str | None = None
    cor: str | None = None
    ativo: bool | None = None
    unidade: str | None = None

class HabitoRead(HabitoBase):
    id: int
    criado_em: str

class RegistroHabitoBase(SQLModel):
    habito_id: int = Field(foreign_key="habitos.id", ondelete="CASCADE", index=True)
    data: str
    valor: float | None = None
    justificativa: str | None = None
    excecao_justificada: bool = False

class RegistroHabito(RegistroHabitoBase, table=True):
    __tablename__ = "registros_habito"
    id: int | None = Field(default=None, primary_key=True)
    habito: Habito = Relationship(back_populates="registros")
    __table_args__ = (
        Index('ix_registros_habito_habito_data', 'habito_id', 'data'),
    )

class RegistroHabitoCreate(RegistroHabitoBase):
    pass

class RegistroHabitoRead(RegistroHabitoBase):
    id: int

# ─── Rotina ───
class BlocoRotinaBase(SQLModel):
    titulo: str = Field(min_length=1)
    hora_inicio: str
    hora_fim: str
    cor: str | None = None
    recorrente: bool = False
    dias_semana: str | None = None
    data_especifica: str | None = None

class BlocoRotina(BlocoRotinaBase, table=True):
    __tablename__ = "blocos_rotina"
    id: int | None = Field(default=None, primary_key=True)

class BlocoRotinaCreate(BlocoRotinaBase):
    pass

class BlocoRotinaUpdate(SQLModel):
    titulo: str | None = Field(default=None, min_length=1)
    hora_inicio: str | None = None
    hora_fim: str | None = None
    cor: str | None = None
    recorrente: bool | None = None
    dias_semana: str | None = None
    data_especifica: str | None = None

class BlocoRotinaRead(BlocoRotinaBase):
    id: int

class TarefaBase(SQLModel):
    titulo: str = Field(min_length=1)
    prioridade: str = "normal"
    tempo_estimado: int | None = None
    status: str = "pendente"

    @field_validator('prioridade')
    @classmethod
    def check_prioridade(cls, v: str) -> str:
        if v not in ("baixa", "normal", "alta", "urgente"):
            raise ValueError(f'prioridade inválida: "{v}". Deve ser "baixa", "normal", "alta" ou "urgente"')
        return v

    @field_validator('status')
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in ("pendente", "em_andamento", "feito"):
            raise ValueError(f'status inválido: "{v}". Deve ser "pendente", "em_andamento" ou "feito"')
        return v
    bloco_id: int | None = Field(default=None, foreign_key="blocos_rotina.id", ondelete="SET NULL", index=True)
    data: str
    tipo_id: int | None = Field(default=None, foreign_key="tipos_objeto.id", ondelete="SET NULL", index=True)
    criado_em: str = Field(default_factory=now)
    propriedades: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    descricao: str = ""
    recorrente: bool = False
    total_foco_min: int = 0
    ordem: int = 0
    recorrencia_tipo: str | None = None
    recorrencia_intervalo: int = 1

class Tarefa(TarefaBase, table=True):
    __tablename__ = "tarefas"
    id: int | None = Field(default=None, primary_key=True)
    __table_args__ = (
        Index('ix_tarefas_data_status', 'data', 'status'),
    )

class TarefaCreate(SQLModel):
    titulo: str = Field(min_length=1)
    prioridade: str = "normal"
    tempo_estimado: int | None = None
    bloco_id: int | None = None
    data: str
    tipo_id: int | None = None
    propriedades: dict[str, Any] = {}
    descricao: str = ""
    recorrente: bool = False
    ordem: int = 0
    recorrencia_tipo: str | None = None
    recorrencia_intervalo: int = 1

class TarefaUpdate(SQLModel):
    titulo: str | None = Field(default=None, min_length=1)
    prioridade: str | None = None
    status: str | None = None
    tempo_estimado: int | None = None
    data: str | None = None
    bloco_id: int | None = None
    tipo_id: int | None = None
    propriedades: dict[str, Any] | None = None
    descricao: str | None = None
    recorrente: bool | None = None
    recorrencia_tipo: str | None = None
    recorrencia_intervalo: int | None = None
    ordem: int | None = None

class TarefaRead(TarefaBase):
    id: int

# ─── Pomodoro ───
class SessaoPomodoroBase(SQLModel):
    contexto_tipo: str | None = None
    contexto_id: int | None = None
    duracao_min: int = 25
    finalizado_em: str | None = Field(default=None, index=True)
    resumo_nota_id: int | None = Field(default=None, foreign_key="notas.id", ondelete="SET NULL", index=True)

class SessaoPomodoro(SessaoPomodoroBase, table=True):
    __tablename__ = "sessoes_pomodoro"
    id: int | None = Field(default=None, primary_key=True)
    iniciado_em: str = Field(default_factory=now)

class SessaoPomodoroCreate(SessaoPomodoroBase):
    pass

class SessaoPomodoroRead(SessaoPomodoroBase):
    id: int
    iniciado_em: str

# ─── Notas ───
class PastaBase(SQLModel):
    nome: str
    pai_id: int | None = Field(default=None, foreign_key="pastas.id", ondelete="CASCADE", index=True)

class Pasta(PastaBase, table=True):
    __tablename__ = "pastas"
    id: int | None = Field(default=None, primary_key=True)

class PastaCreate(PastaBase):
    pass

class PastaRead(PastaBase):
    id: int

class TagBase(SQLModel):
    nome: str
    cor: str | None = None

class Tag(TagBase, table=True):
    __tablename__ = "tags"
    id: int | None = Field(default=None, primary_key=True)
    nome: str = Field(unique=True)

class TagCreate(TagBase):
    pass

class TagRead(TagBase):
    id: int

class TagWithCount(TagRead):
    contagem: int = 0

class TagUpdate(SQLModel):
    nome: str | None = None
    cor: str | None = None

class NotaBase(SQLModel):
    titulo: str = Field(min_length=1, max_length=500)
    conteudo: str = ""
    pasta_id: int | None = Field(default=None, foreign_key="pastas.id", ondelete="SET NULL", index=True)
    tipo_id: int | None = Field(default=None, foreign_key="tipos_objeto.id", ondelete="SET NULL", index=True)
    propriedades: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class Nota(NotaBase, table=True):
    __tablename__ = "notas"
    id: int | None = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)
    atualizado_em: str = Field(default_factory=now)
    ordem: int = Field(default=0)
    cover_url: str | None = None
    favoritado: bool = False
    acessos: int = Field(default=0)
    ultimo_acesso: str | None = None

class NotaCreate(NotaBase):
    pass

class NotaRead(NotaBase):
    id: int
    criado_em: str
    atualizado_em: str
    ordem: int = 0
    cover_url: str | None = None
    favoritado: bool = False
    acessos: int = 0
    ultimo_acesso: str | None = None

class NotaUpdate(SQLModel):
    titulo: str | None = Field(default=None, min_length=1)
    conteudo: str | None = None
    pasta_id: int | None = None
    tipo_id: int | None = None
    propriedades: dict[str, object] | None = None

class NotaTag(SQLModel, table=True):
    __tablename__ = "notas_tags"
    nota_id: int = Field(foreign_key="notas.id", ondelete="CASCADE", primary_key=True, index=True)
    tag_id: int = Field(foreign_key="tags.id", ondelete="CASCADE", primary_key=True, index=True)

# ─── Conexões entre Notas (Backlinks) ───
class ConexaoNota(SQLModel, table=True):
    __tablename__ = "conexoes_notas"
    id: int | None = Field(default=None, primary_key=True)
    nota_origem_id: int = Field(foreign_key="notas.id", ondelete="CASCADE", index=True)
    nota_destino_id: int = Field(foreign_key="notas.id", ondelete="CASCADE", index=True)
    tipo: str = "wikilink"

    __table_args__ = (
        UniqueConstraint("nota_origem_id", "nota_destino_id", "tipo", name="uq_conexao"),
    )

class ConexaoNotaRead(SQLModel):
    id: int
    nota_origem_id: int
    nota_destino_id: int
    tipo: str

# ─── Flashcards ───
class FlashcardBase(SQLModel):
    nota_id: int | None = Field(default=None, foreign_key="notas.id", ondelete="SET NULL", index=True)
    pergunta: str = Field(min_length=1)
    resposta: str = Field(min_length=1)
    categoria: str | None = None
    intervalo: float = 0.0
    facilidade: float = 2.5
    revisoes: int = 0
    ultima_revisao: datetime | None = None
    proxima_revisao: date = Field(default_factory=date.today)

class Flashcard(FlashcardBase, table=True):
    __tablename__ = "flashcards"
    id: int | None = Field(default=None, primary_key=True)
    criado_em: datetime = Field(default_factory=datetime.now)

class FlashcardCreate(SQLModel):
    nota_id: int | None = None
    pergunta: str = Field(min_length=1)
    resposta: str = Field(min_length=1)
    categoria: str | None = None

class FlashcardUpdate(SQLModel):
    pergunta: str | None = Field(default=None, min_length=1)
    resposta: str | None = Field(default=None, min_length=1)
    nota_id: int | None = None
    categoria: str | None = None

class FlashcardRead(FlashcardBase):
    id: int
    criado_em: datetime

# ─── Templates de Nota ───
class TemplateBase(SQLModel):
    nome: str
    descricao: str | None = None
    conteudo: str
    propriedades: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class TemplateNota(TemplateBase, table=True):
    __tablename__ = "templates"
    id: int | None = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)

class TemplateRead(TemplateBase):
    id: int
    criado_em: str

# ─── Tipos de Objeto (Anytype-inspired) ───
class TipoObjetoBase(SQLModel):
    nome: str = Field(max_length=100)
    icone: str = "📄"
    schema_campos: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    schema_relacoes: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class TipoObjeto(TipoObjetoBase, table=True):
    __tablename__ = "tipos_objeto"
    id: int | None = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)

class TipoObjetoCreate(TipoObjetoBase):
    pass

class TipoObjetoRead(TipoObjetoBase):
    id: int
    criado_em: str

class TipoObjetoUpdate(SQLModel):
    nome: str | None = None
    icone: str | None = None
    schema_campos: dict[str, Any] | None = None
    schema_relacoes: dict[str, Any] | None = None

class TipoObjetoWithCount(TipoObjetoRead):
    contagem: int = 0

# ─── Queries Salvas (Visualizações Dinâmicas) ───
class QuerySalva(SQLModel, table=True):
    __tablename__ = "queries_salvas"
    id: int | None = Field(default=None, primary_key=True)
    nome: str
    tipo_objeto_id: int = Field(foreign_key="tipos_objeto.id", ondelete="CASCADE", index=True)
    visualizacao: str = "grid"

    @field_validator('visualizacao')
    @classmethod
    def check_visualizacao(cls, v: str) -> str:
        if v not in ("grid", "kanban", "lista", "galeria", "formulario", "calendario", "gantt"):
            raise ValueError(f'visualizacao inválida: "{v}". Deve ser grid/kanban/lista/galeria/formulario/calendario/gantt')
        return v
    campo_agrupamento: str | None = None  # usado no kanban: ex: "status", "prioridade"
    filtros: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    ordem: str = "criado_em DESC"
    criado_em: str = Field(default_factory=now)

class QuerySalvaCreate(SQLModel):
    nome: str
    tipo_objeto_id: int
    visualizacao: str = "grid"
    campo_agrupamento: str | None = None
    filtros: dict[str, Any] = {}
    ordem: str = "criado_em DESC"

class QuerySalvaRead(SQLModel):
    id: int
    nome: str
    tipo_objeto_id: int
    visualizacao: str
    campo_agrupamento: str | None
    filtros: dict
    ordem: str
    criado_em: str
