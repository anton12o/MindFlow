import logging
import re

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlmodel import Session, select, text

from database import get_session
from models import Flashcard, Habito, Nota, Tarefa
from rate_limiter import search_limiter
from schemas.search import SearchResult

logger = logging.getLogger(__name__)
router = APIRouter()


def _sanitize_fts(q: str) -> str:
    cleaned = re.sub(r'[+\-~\^"*()]', '', q)
    termos = [t for t in cleaned.split() if t]
    return " AND ".join(f'"{t}"' for t in termos) if termos else ""


@router.get("/search", response_model=SearchResult)
def search(
    q: str = Query(min_length=1),
    limit: int = Query(default=25, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
    _rl: None = Depends(search_limiter),
):
    pattern = f"%{q}%"

    try:
        fts_q = _sanitize_fts(q)
        if fts_q:
            notas = session.exec(
                select(Nota.id, Nota.titulo).where(
                    Nota.id.in_(
                        select(text("rowid")).select_from(text("notas_fts")).where(
                            text("notas_fts MATCH :q")
                        )
                    )
                ).offset(offset).limit(limit),
                params={"q": fts_q}
            ).all()
        else:
            notas = []
    except Exception:
        logger.warning("[search] FTS5 fallback para LIKE")
        notas = session.exec(
            select(Nota.id, Nota.titulo).where(
                or_(Nota.titulo.ilike(pattern), Nota.conteudo.ilike(pattern))
            ).offset(offset).limit(limit)
        ).all()

    tarefas = session.exec(
        select(Tarefa.id, Tarefa.titulo).where(
            Tarefa.titulo.ilike(pattern)
        ).offset(offset).limit(limit)
    ).all()

    flashcards = session.exec(
        select(Flashcard.id, Flashcard.pergunta, Flashcard.resposta).where(
            Flashcard.pergunta.ilike(pattern)
        ).offset(offset).limit(limit)
    ).all()

    habitos = session.exec(
        select(Habito.id, Habito.nome).where(
            Habito.nome.ilike(pattern)
        ).offset(offset).limit(limit)
    ).all()

    return {
        "notas": [{"id": n.id, "titulo": n.titulo} for n in notas],
        "tarefas": [{"id": t.id, "titulo": t.titulo} for t in tarefas],
        "flashcards": [{"id": f.id, "pergunta": f.pergunta, "resposta": f.resposta} for f in flashcards],
        "habitos": [{"id": h.id, "nome": h.nome} for h in habitos],
    }
