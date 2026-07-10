from typing import Any

from pydantic import BaseModel


class ExportResult(BaseModel):
    inbox: list[dict[str, Any]]
    habitos: list[dict[str, Any]]
    registros_habito: list[dict[str, Any]]
    blocos_rotina: list[dict[str, Any]]
    tarefas: list[dict[str, Any]]
    sessoes_pomodoro: list[dict[str, Any]]
    notas: list[dict[str, Any]]
    conexoes_notas: list[dict[str, Any]]
    pastas: list[dict[str, Any]]
    tags: list[dict[str, Any]]
    notas_tags: list[dict[str, Any]]
    flashcards: list[dict[str, Any]]
    templates: list[dict[str, Any]]
    tipos_objeto: list[dict[str, Any]]
    queries_salvas: list[dict[str, Any]]
    truncated: bool
    exportado_em: str
    versao: str
