import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import (
    Habito,
    HabitoCreate,
    HabitoRead,
    HabitoUpdate,
    RegistroHabito,
    RegistroHabitoCreate,
    RegistroHabitoRead,
)

from .common import commit_with_handle

logger = logging.getLogger(__name__)

router = APIRouter()

class BatchRegistrosRequest(BaseModel):
    ids: list[int]

@router.get("", response_model=list[HabitoRead])
def list_habitos(
    ativos: bool = True, sort: str | None = None,
    dir: str = Query(default='desc', pattern='^(asc|desc)$'),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
):
    stmt = select(Habito).where(Habito.ativo == ativos)
    sort_map = {'nome': Habito.nome, 'criado_em': Habito.criado_em}
    order = sort_map.get(sort, Habito.criado_em)
    stmt = stmt.order_by(order.desc() if dir == 'desc' else order.asc())
    return session.exec(stmt.offset(offset).limit(limit)).all()

@router.post("", response_model=HabitoRead)
def create_habito(h: HabitoCreate, session: Session = Depends(get_session)):
    db = Habito(**h.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar hábito")
    return db

@router.get("/{habito_id}", response_model=HabitoRead)
def get_habito(habito_id: int, session: Session = Depends(get_session)):
    h = session.get(Habito, habito_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hábito não encontrado")
    return h

@router.patch("/{habito_id}", response_model=HabitoRead)
def update_habito(habito_id: int, h: HabitoUpdate, session: Session = Depends(get_session)):
    db = session.get(Habito, habito_id)
    if not db:
        raise HTTPException(status_code=404, detail="Hábito não encontrado")
    for field, value in h.model_dump(exclude_unset=True).items():
        setattr(db, field, value)
    session.add(db)
    commit_with_handle(session, db, "atualizar hábito")
    return db

@router.delete("/{habito_id}")
def delete_habito(habito_id: int, session: Session = Depends(get_session)):
    h = session.get(Habito, habito_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hábito não encontrado")
    registros = session.exec(select(RegistroHabito).where(RegistroHabito.habito_id == habito_id)).all()
    for r in registros:
        session.delete(r)
    session.delete(h)
    commit_with_handle(session, context="excluir hábito")
    return {"ok": True}

@router.post("/registros/batch", response_model=dict[int, list[RegistroHabitoRead]])
def batch_registros(req: BatchRegistrosRequest, session: Session = Depends(get_session)):
    if not req.ids:
        return {}
    stmt = select(RegistroHabito).where(
        RegistroHabito.habito_id.in_(req.ids)
    ).order_by(RegistroHabito.data.desc())
    rows = session.exec(stmt).all()
    grouped: dict[int, list[RegistroHabitoRead]] = {}
    for r in rows:
        grouped.setdefault(r.habito_id, []).append(r)
    for hid in req.ids:
        grouped.setdefault(hid, [])
    return grouped

@router.get("/{habito_id}/registros", response_model=list[RegistroHabitoRead])
def list_registros(habito_id: int, limit: int = Query(default=365, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    if not session.get(Habito, habito_id):
        raise HTTPException(status_code=404, detail="Hábito não encontrado")
    stmt = select(RegistroHabito).where(RegistroHabito.habito_id == habito_id).order_by(RegistroHabito.data.desc())
    return session.exec(stmt.offset(offset).limit(limit)).all()

@router.post("/{habito_id}/registros", response_model=RegistroHabitoRead)
def create_registro(habito_id: int, r: RegistroHabitoCreate, session: Session = Depends(get_session)):
    h = session.get(Habito, habito_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hábito não encontrado")
    data = r.model_dump()
    data["habito_id"] = habito_id
    db = RegistroHabito(**data)
    session.add(db)
    commit_with_handle(session, db, "criar registro")
    return db

@router.delete("/{habito_id}/registros/{data}")
def delete_registro_por_data(habito_id: int, data: str, session: Session = Depends(get_session)):
    if not session.get(Habito, habito_id):
        raise HTTPException(status_code=404, detail="Hábito não encontrado")
    stmt = select(RegistroHabito).where(
        RegistroHabito.habito_id == habito_id,
        RegistroHabito.data == data
    )
    r = session.exec(stmt).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    session.delete(r)
    commit_with_handle(session, context="excluir registro")
    return {"ok": True}
