from pydantic import BaseModel


class NotaResult(BaseModel):
    id: int
    titulo: str


class TarefaResult(BaseModel):
    id: int
    titulo: str


class FlashcardResult(BaseModel):
    id: int
    pergunta: str
    resposta: str


class HabitoResult(BaseModel):
    id: int
    nome: str


class SearchResult(BaseModel):
    notas: list[NotaResult]
    tarefas: list[TarefaResult]
    flashcards: list[FlashcardResult]
    habitos: list[HabitoResult]
