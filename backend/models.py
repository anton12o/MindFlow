from sqlmodel import SQLModel, Field, Relationship, Column, JSON
from sqlalchemy import UniqueConstraint
from typing import Optional, Any
from datetime import datetime, date

def now():
    return datetime.now().isoformat()

# ─── Inbox ───
class InboxItemBase(SQLModel):
    conteudo: str = Field(min_length=1)
    tipo_destino: Optional[str] = None
    destino_id: Optional[int] = None
    arquivado: bool = False

class InboxItem(InboxItemBase, table=True):
    __tablename__ = "inbox"
    id: Optional[int] = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)

class InboxItemCreate(InboxItemBase):
    pass

class InboxItemUpdate(SQLModel):
    conteudo: Optional[str] = None
    tipo_destino: Optional[str] = None
    destino_id: Optional[int] = None
    arquivado: Optional[bool] = None

class InboxItemRead(InboxItemBase):
    id: int
    criado_em: str

# ─── Hábitos ───
class HabitoBase(SQLModel):
    nome: str = Field(min_length=1)
    tipo: str = "binario"  # binario | quantitativo
    meta: Optional[float] = None
    unidade: Optional[str] = None
    categoria: Optional[str] = None
    cor: Optional[str] = None
    ativo: bool = True

class Habito(HabitoBase, table=True):
    __tablename__ = "habitos"
    id: Optional[int] = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)
    registros: list["RegistroHabito"] = Relationship(back_populates="habito")

class HabitoCreate(HabitoBase):
    pass

class HabitoUpdate(SQLModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    meta: Optional[float] = None
    categoria: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = None
    unidade: Optional[str] = None

class HabitoRead(HabitoBase):
    id: int
    criado_em: str

class RegistroHabitoBase(SQLModel):
    habito_id: int = Field(foreign_key="habitos.id")
    data: str
    valor: Optional[float] = None
    justificativa: Optional[str] = None
    excecao_justificada: bool = False

class RegistroHabito(RegistroHabitoBase, table=True):
    __tablename__ = "registros_habito"
    id: Optional[int] = Field(default=None, primary_key=True)
    habito: Habito = Relationship(back_populates="registros")

class RegistroHabitoCreate(RegistroHabitoBase):
    pass

class RegistroHabitoRead(RegistroHabitoBase):
    id: int

# ─── Rotina ───
class BlocoRotinaBase(SQLModel):
    titulo: str = Field(min_length=1)
    hora_inicio: str
    hora_fim: str
    cor: Optional[str] = None
    recorrente: bool = False
    dias_semana: Optional[str] = None
    data_especifica: Optional[str] = None

class BlocoRotina(BlocoRotinaBase, table=True):
    __tablename__ = "blocos_rotina"
    id: Optional[int] = Field(default=None, primary_key=True)

class BlocoRotinaCreate(BlocoRotinaBase):
    pass

class BlocoRotinaUpdate(SQLModel):
    titulo: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    cor: Optional[str] = None
    recorrente: Optional[bool] = None
    dias_semana: Optional[str] = None
    data_especifica: Optional[str] = None

class BlocoRotinaRead(BlocoRotinaBase):
    id: int

class TarefaBase(SQLModel):
    titulo: str = Field(min_length=1)
    prioridade: str = "normal"  # baixa | normal | alta | urgente
    tempo_estimado: Optional[int] = None
    status: str = "pendente"  # pendente | em_andamento | feito
    bloco_id: Optional[int] = Field(default=None, foreign_key="blocos_rotina.id")
    data: str
    tipo_id: Optional[int] = Field(default=None, foreign_key="tipos_objeto.id")
    criado_em: str = Field(default_factory=now)
    propriedades: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class Tarefa(TarefaBase, table=True):
    __tablename__ = "tarefas"
    id: Optional[int] = Field(default=None, primary_key=True)

class TarefaCreate(SQLModel):
    titulo: str = Field(min_length=1)
    prioridade: str = "normal"
    tempo_estimado: Optional[int] = None
    bloco_id: Optional[int] = None
    data: str
    tipo_id: Optional[int] = None
    propriedades: dict[str, Any] = {}

class TarefaUpdate(SQLModel):
    titulo: Optional[str] = None
    prioridade: Optional[str] = None
    status: Optional[str] = None
    tempo_estimado: Optional[int] = None
    data: Optional[str] = None
    bloco_id: Optional[int] = None
    tipo_id: Optional[int] = None
    propriedades: Optional[dict[str, Any]] = None

class TarefaRead(TarefaBase):
    id: int

# ─── Pomodoro ───
class SessaoPomodoroBase(SQLModel):
    contexto_tipo: Optional[str] = None
    contexto_id: Optional[int] = None
    duracao_min: int = 25
    finalizado_em: Optional[str] = None
    resumo_nota_id: Optional[int] = Field(default=None, foreign_key="notas.id")

class SessaoPomodoro(SessaoPomodoroBase, table=True):
    __tablename__ = "sessoes_pomodoro"
    id: Optional[int] = Field(default=None, primary_key=True)
    iniciado_em: str = Field(default_factory=now)

class SessaoPomodoroCreate(SessaoPomodoroBase):
    pass

class SessaoPomodoroRead(SessaoPomodoroBase):
    id: int
    iniciado_em: str

# ─── Notas ───
class PastaBase(SQLModel):
    nome: str
    pai_id: Optional[int] = Field(default=None, foreign_key="pastas.id")

class Pasta(PastaBase, table=True):
    __tablename__ = "pastas"
    id: Optional[int] = Field(default=None, primary_key=True)

class PastaCreate(PastaBase):
    pass

class PastaRead(PastaBase):
    id: int

class TagBase(SQLModel):
    nome: str
    cor: Optional[str] = None

class Tag(TagBase, table=True):
    __tablename__ = "tags"
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(unique=True)

class TagCreate(TagBase):
    pass

class TagRead(TagBase):
    id: int

class TagUpdate(SQLModel):
    nome: Optional[str] = None
    cor: Optional[str] = None

class NotaBase(SQLModel):
    titulo: str = Field(min_length=1, max_length=500)
    conteudo: str = ""
    pasta_id: Optional[int] = Field(default=None, foreign_key="pastas.id")
    tipo_id: Optional[int] = Field(default=None, foreign_key="tipos_objeto.id")
    propriedades: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class Nota(NotaBase, table=True):
    __tablename__ = "notas"
    id: Optional[int] = Field(default=None, primary_key=True)
    criado_em: str = Field(default_factory=now)
    atualizado_em: str = Field(default_factory=now)
    ordem: int = Field(default=0)
    cover_url: Optional[str] = None
    favoritado: bool = False
    acessos: int = Field(default=0)
    ultimo_acesso: Optional[str] = None

class NotaCreate(NotaBase):
    pass

class NotaRead(NotaBase):
    id: int
    criado_em: str
    atualizado_em: str
    cover_url: Optional[str] = None
    favoritado: bool = False
    acessos: int = 0
    ultimo_acesso: Optional[str] = None

class NotaUpdate(SQLModel):
    titulo: Optional[str] = None
    conteudo: Optional[str] = None
    pasta_id: Optional[int] = None
    tipo_id: Optional[int] = None
    propriedades: Optional[dict[str, object]] = None

class NotaTag(SQLModel, table=True):
    __tablename__ = "notas_tags"
    nota_id: int = Field(foreign_key="notas.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)

# ─── Conexões entre Notas (Backlinks) ───
class ConexaoNota(SQLModel, table=True):
    __tablename__ = "conexoes_notas"
    id: Optional[int] = Field(default=None, primary_key=True)
    nota_origem_id: int = Field(foreign_key="notas.id")
    nota_destino_id: int = Field(foreign_key="notas.id")
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
    nota_id: Optional[int] = Field(default=None, foreign_key="notas.id")
    pergunta: str = Field(min_length=1)
    resposta: str = Field(min_length=1)
    intervalo: float = 0.0
    facilidade: float = 2.5
    revisoes: int = 0
    ultima_revisao: Optional[datetime] = None
    proxima_revisao: date = Field(default_factory=date.today)

class Flashcard(FlashcardBase, table=True):
    __tablename__ = "flashcards"
    id: Optional[int] = Field(default=None, primary_key=True)
    criado_em: datetime = Field(default_factory=datetime.now)

class FlashcardCreate(SQLModel):
    nota_id: Optional[int] = None
    pergunta: str = Field(min_length=1)
    resposta: str = Field(min_length=1)

class FlashcardUpdate(SQLModel):
    pergunta: Optional[str] = None
    resposta: Optional[str] = None
    nota_id: Optional[int] = None

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
    nome: str
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

# ─── Queries Salvas (Visualizações Dinâmicas) ───
class QuerySalva(SQLModel, table=True):
    __tablename__ = "queries_salvas"
    id: int | None = Field(default=None, primary_key=True)
    nome: str
    tipo_objeto_id: int = Field(foreign_key="tipos_objeto.id")
    visualizacao: str = "grid"  # grid | kanban
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
