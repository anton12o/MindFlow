from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import TipoObjeto, TipoObjetoCreate, TipoObjetoRead, TipoObjetoUpdate

router = APIRouter()

@router.get("", response_model=list[TipoObjetoRead])
def list_tipos(session: Session = Depends(get_session)):
    return session.exec(select(TipoObjeto)).all()

@router.post("", response_model=TipoObjetoRead)
def create_tipo(t: TipoObjetoCreate, session: Session = Depends(get_session)):
    db = TipoObjeto(**t.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.get("/{tipo_id}", response_model=TipoObjetoRead)
def get_tipo(tipo_id: int, session: Session = Depends(get_session)):
    t = session.get(TipoObjeto, tipo_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    return t

@router.patch("/{tipo_id}", response_model=TipoObjetoRead)
def update_tipo(tipo_id: int, t: TipoObjetoUpdate, session: Session = Depends(get_session)):
    db = session.get(TipoObjeto, tipo_id)
    if not db:
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    for k, v in t.model_dump(exclude_unset=True).items():
        setattr(db, k, v)
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/{tipo_id}")
def delete_tipo(tipo_id: int, session: Session = Depends(get_session)):
    db = session.get(TipoObjeto, tipo_id)
    if not db:
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    session.delete(db)
    session.commit()
    return {"ok": True}
