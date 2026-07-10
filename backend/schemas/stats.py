
from pydantic import BaseModel


class BlocoItem(BaseModel):
    id: int
    titulo: str
    hora_inicio: str | None = None
    hora_fim: str | None = None
    cor: str | None = None


class TarefaItem(BaseModel):
    id: int
    titulo: str
    status: str
    prioridade: str


class HabitoItem(BaseModel):
    id: int
    nome: str
    cor: str | None = None
    ativo: bool
    feito_hoje: bool
    streak: int


class NotaResumida(BaseModel):
    id: int
    titulo: str


class DashboardStats(BaseModel):
    inbox_count: int
    blocos: list[BlocoItem]
    tarefas: list[TarefaItem]
    habitos: list[HabitoItem]
    notas_hoje: list[NotaResumida]
    data: str
    total_notas: int
    total_tarefas: int
    total_flashcards: int
    total_sessoes: int
    db_size_mb: float


class PomodoroStats(BaseModel):
    total_min_hoje: int
    total_sessoes_hoje: int
    streak_dias: int


class DiaSemana(BaseModel):
    data: str
    notas: int
    tarefas: int
    pomodoros: int
    minutos_foco: int


class PeriodoStats(BaseModel):
    inicio: str
    fim: str
    total_notas: int
    total_tarefas: int
    total_pomodoros: int
    total_minutos_foco: int
    taxa_habitos: float
    dias: list[DiaSemana]


class Score(BaseModel):
    total: int
    foco: int
    tarefas: int
    habitos: int
    notas: int


class WeeklyStats(BaseModel):
    offset: int
    semana: PeriodoStats
    semana_passada: PeriodoStats
    streak_atual: int
    total_habitos_ativos: int
    score: Score
    gerado_em: str


class FlashcardsStats(BaseModel):
    total_cards: int
    cards_hoje: int
    cards_revisados_hoje: int
    taxa_acerto_7d: float | None = None


class TopNotaItem(BaseModel):
    id: int
    titulo: str
    acessos: int


class LeituraStats(BaseModel):
    total_acessos: int
    notas_lidas: int
    top_notas: list[TopNotaItem]
    streak_leitura: int
