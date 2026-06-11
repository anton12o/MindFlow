from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import InboxItem, InboxItemCreate, InboxItemRead

router = APIRouter()

@router.get("", response_model=list[InboxItemRead])
def list_inbox(arquivado: bool = False, session: Session = Depends(get_session)):
    stmt = select(InboxItem).where(InboxItem.arquivado == arquivado).order_by(InboxItem.criado_em.desc())
    return session.exec(stmt).all()

@router.post("", response_model=InboxItemRead)
def create_inbox(item: InboxItemCreate, session: Session = Depends(get_session)):
    db = InboxItem(**item.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/{item_id}")
def delete_inbox(item_id: int, session: Session = Depends(get_session)):
    item = session.get(InboxItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    session.delete(item)
    session.commit()
    return {"ok": True}
