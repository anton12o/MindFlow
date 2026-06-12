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

LIMITE_EXPORT = 5000

def _dump(model, session: Session) -> tuple[list[dict], bool]:
    rows = session.exec(select(model).limit(LIMITE_EXPORT + 1)).all()
    truncated = len(rows) > LIMITE_EXPORT
    return [r.model_dump() for r in rows[:LIMITE_EXPORT]], truncated

@router.get("")
def export_all(session: Session = Depends(get_session)):
    inbox, t1 = _dump(InboxItem, session)
    habitos, t2 = _dump(Habito, session)
    registros_habito, t3 = _dump(RegistroHabito, session)
    blocos_rotina, t4 = _dump(BlocoRotina, session)
    tarefas, t5 = _dump(Tarefa, session)
    sessoes_pomodoro, t6 = _dump(SessaoPomodoro, session)
    notas, t7 = _dump(Nota, session)
    conexoes_notas, t8 = _dump(ConexaoNota, session)
    pastas, t9 = _dump(Pasta, session)
    tags, t10 = _dump(Tag, session)
    notas_tags, t11 = _dump(NotaTag, session)
    flashcards, t12 = _dump(Flashcard, session)
    templates, t13 = _dump(TemplateNota, session)
    tipos_objeto, t14 = _dump(TipoObjeto, session)
    queries_salvas, t15 = _dump(QuerySalva, session)
    return {
        "inbox": inbox,
        "habitos": habitos,
        "registros_habito": registros_habito,
        "blocos_rotina": blocos_rotina,
        "tarefas": tarefas,
        "sessoes_pomodoro": sessoes_pomodoro,
        "notas": notas,
        "conexoes_notas": conexoes_notas,
        "pastas": pastas,
        "tags": tags,
        "notas_tags": notas_tags,
        "flashcards": flashcards,
        "templates": templates,
        "tipos_objeto": tipos_objeto,
        "queries_salvas": queries_salvas,
        "truncated": t1 or t2 or t3 or t4 or t5 or t6 or t7 or t8 or t9 or t10 or t11 or t12 or t13 or t14 or t15,
        "exportado_em": datetime.now().isoformat(),
        "versao": "1.0",
    }
