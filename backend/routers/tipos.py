import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlmodel import Session, select

from cache import cache_clear, cache_get, cache_set
from database import get_session
from exceptions import ConflictException, NotFoundException
from models import Nota, QuerySalva, Tarefa, TipoObjeto, TipoObjetoCreate, TipoObjetoRead, TipoObjetoUpdate, TipoObjetoWithCount

from .common import commit_with_handle

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=list[TipoObjetoWithCount])
def list_tipos(limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    key = f"tipos:{limit}:{offset}"
    c = cache_get(key)
    if c is not None:
        return c
    tipos = session.exec(select(TipoObjeto).offset(offset).limit(limit)).all()
    tipo_ids = [t.id for t in tipos]
    counts: dict[int, int] = {}
    if tipo_ids:
        rows = session.execute(
            select(Nota.tipo_id, func.count(Nota.id)).where(
                Nota.tipo_id.in_(tipo_ids)
            ).group_by(Nota.tipo_id)
        ).all()
        counts = {row[0]: row[1] for row in rows}
    result = [
        TipoObjetoWithCount(**t.model_dump(), contagem=counts.get(t.id, 0))
        for t in tipos
    ]
    cache_set(key, result)
    return result

@router.post("", response_model=TipoObjetoRead)
def create_tipo(t: TipoObjetoCreate, session: Session = Depends(get_session)):
    db = TipoObjeto(**t.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar tipo")
    cache_clear("tipos:")
    return db

@router.get("/{tipo_id}", response_model=TipoObjetoRead)
def get_tipo(tipo_id: int, session: Session = Depends(get_session)):
    t = session.get(TipoObjeto, tipo_id)
    if not t:
        raise NotFoundException("Tipo", "tipos.get_tipo")
    return t

@router.patch("/{tipo_id}", response_model=TipoObjetoRead)
def update_tipo(tipo_id: int, t: TipoObjetoUpdate, session: Session = Depends(get_session)):
    db = session.get(TipoObjeto, tipo_id)
    if not db:
        raise NotFoundException("Tipo", "tipos.update_tipo")
    for k, v in t.model_dump(exclude_unset=True).items():
        setattr(db, k, v)
    session.add(db)
    commit_with_handle(session, db, "atualizar tipo")
    cache_clear("tipos:")
    return db

@router.delete("/{tipo_id}")
def delete_tipo(tipo_id: int, session: Session = Depends(get_session)):
    db = session.get(TipoObjeto, tipo_id)
    if not db:
        raise NotFoundException("Tipo", "tipos.delete_tipo")
    notas = session.exec(select(Nota).where(Nota.tipo_id == tipo_id)).all()
    tarefas = session.exec(select(Tarefa).where(Tarefa.tipo_id == tipo_id)).all()
    queries = session.exec(select(QuerySalva).where(QuerySalva.tipo_objeto_id == tipo_id)).all()
    if notas or tarefas or queries:
        raise ConflictException(
            f"Tipo em uso por {len(notas)} nota(s), {len(tarefas)} tarefa(s) e {len(queries)} consulta(s). Remova as referências antes de excluir.",
            "tipos.delete_tipo"
        )
    session.delete(db)
    commit_with_handle(session, context="excluir tipo")
    cache_clear("tipos:")
    return {"ok": True}
