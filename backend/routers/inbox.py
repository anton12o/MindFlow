import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import InboxItem, InboxItemCreate, InboxItemRead, InboxItemUpdate, Nota, Tag
from services.notes import extrair_wikilinks

from .common import commit_with_handle

logger = logging.getLogger(__name__)

router = APIRouter()

class BatchArchiveRequest(BaseModel):
    ids: list[int]

@router.post("/archive", response_model=dict[str, int])
def archive_batch(req: BatchArchiveRequest, session: Session = Depends(get_session)):
    if not req.ids:
        return {"archived": 0}
    stmt = select(InboxItem).where(InboxItem.id.in_(req.ids), ~InboxItem.arquivado)
    items = session.exec(stmt).all()
    for item in items:
        item.arquivado = True
        session.add(item)
    commit_with_handle(session, context="arquivar itens inbox")
    return {"archived": len(items)}

def _limpar_destinos_orfãos(session: Session):
    items = session.exec(
        select(InboxItem).where(InboxItem.destino_id.isnot(None))
    ).all()
    for item in items:
        nota = session.get(Nota, item.destino_id)
        if not nota:
            item.destino_id = None
            item.tipo_destino = None
            session.add(item)
    if any(item.destino_id is None for item in items):
        commit_with_handle(session, context="limpar destinos orfãos inbox")

@router.get("", response_model=list[InboxItemRead])
def list_inbox(arquivado: bool = False, limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    _limpar_destinos_orfãos(session)
    stmt = select(InboxItem).where(InboxItem.arquivado == arquivado).order_by(InboxItem.criado_em.desc())
    return session.exec(stmt.offset(offset).limit(limit)).all()

@router.post("", response_model=InboxItemRead)
def create_inbox(item: InboxItemCreate, session: Session = Depends(get_session)):
    db = InboxItem(**item.model_dump())
    session.add(db)
    wikilinks = extrair_wikilinks(item.conteudo)
    if wikilinks:
        nota = session.exec(select(Nota).where(Nota.titulo == wikilinks[0])).first()
        if nota:
            db.tipo_destino = 'nota'
            db.destino_id = nota.id
    tag_names = re.findall(r'#(\w+)', item.conteudo)
    for nome in tag_names:
        tag = session.exec(select(Tag).where(Tag.nome == nome)).first()
        if not tag:
            tag = Tag(nome=nome)
            session.add(tag)
    commit_with_handle(session, db, "criar item")
    return db

@router.patch("/{item_id}", response_model=InboxItemRead)
def update_inbox(item_id: int, item: InboxItemUpdate, session: Session = Depends(get_session)):
    db = session.get(InboxItem, item_id)
    if not db:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    data = item.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(db, k, v)
    session.add(db)
    commit_with_handle(session, db, "atualizar item")
    return db

@router.delete("/{item_id}")
def delete_inbox(item_id: int, session: Session = Depends(get_session)):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    session.delete(item)
    commit_with_handle(session, context="excluir item")
    return {"ok": True}
