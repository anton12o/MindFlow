from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import Habito, HabitoCreate, HabitoRead, RegistroHabito, RegistroHabitoCreate, RegistroHabitoRead

router = APIRouter()

@router.get("", response_model=list[HabitoRead])
def list_habitos(ativos: bool = True, session: Session = Depends(get_session)):
    stmt = select(Habito).where(Habito.ativo == ativos).order_by(Habito.criado_em.desc())
    return session.exec(stmt).all()

@router.post("", response_model=HabitoRead)
def create_habito(h: HabitoCreate, session: Session = Depends(get_session)):
    db = Habito(**h.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.get("/{habito_id}", response_model=HabitoRead)
def get_habito(habito_id: int, session: Session = Depends(get_session)):
    return session.get(Habito, habito_id)

@router.delete("/{habito_id}")
def delete_habito(habito_id: int, session: Session = Depends(get_session)):
    h = session.get(Habito, habito_id)
    if h:
        session.delete(h)
        session.commit()
    return {"ok": True}

@router.get("/{habito_id}/registros", response_model=list[RegistroHabitoRead])
def list_registros(habito_id: int, session: Session = Depends(get_session)):
    stmt = select(RegistroHabito).where(RegistroHabito.habito_id == habito_id).order_by(RegistroHabito.data.desc())
    return session.exec(stmt).all()

@router.post("/{habito_id}/registros", response_model=RegistroHabitoRead)
def create_registro(habito_id: int, r: RegistroHabitoCreate, session: Session = Depends(get_session)):
    db = RegistroHabito(**r.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db
