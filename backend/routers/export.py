from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import (
    InboxItem, Habito, RegistroHabito, BlocoRotina, Tarefa,
    SessaoPomodoro, Nota, ConexaoNota, Pasta, Tag, NotaTag,
    Flashcard, TemplateNota, TipoObjeto, QuerySalva,
)
from datetime import datetime

router = APIRouter()

@router.get("")
def export_all(session: Session = Depends(get_session)):
    return {
        "inbox": [i.model_dump() for i in session.exec(select(InboxItem)).all()],
        "habitos": [h.model_dump() for h in session.exec(select(Habito)).all()],
        "registros_habito": [r.model_dump() for r in session.exec(select(RegistroHabito)).all()],
        "blocos_rotina": [b.model_dump() for b in session.exec(select(BlocoRotina)).all()],
        "tarefas": [t.model_dump() for t in session.exec(select(Tarefa)).all()],
        "sessoes_pomodoro": [s.model_dump() for s in session.exec(select(SessaoPomodoro)).all()],
        "notas": [n.model_dump() for n in session.exec(select(Nota)).all()],
        "conexoes_notas": [c.model_dump() for c in session.exec(select(ConexaoNota)).all()],
        "pastas": [p.model_dump() for p in session.exec(select(Pasta)).all()],
        "tags": [t.model_dump() for t in session.exec(select(Tag)).all()],
        "notas_tags": [n.model_dump() for n in session.exec(select(NotaTag)).all()],
        "flashcards": [f.model_dump() for f in session.exec(select(Flashcard)).all()],
        "templates": [t.model_dump() for t in session.exec(select(TemplateNota)).all()],
        "tipos_objeto": [t.model_dump() for t in session.exec(select(TipoObjeto)).all()],
        "queries_salvas": [q.model_dump() for q in session.exec(select(QuerySalva)).all()],
        "exportado_em": datetime.now().isoformat(),
        "versao": "1.0",
    }
