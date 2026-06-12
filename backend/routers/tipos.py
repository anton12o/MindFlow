from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import TipoObjeto, TipoObjetoCreate, TipoObjetoRead, TipoObjetoUpdate, Nota, Tarefa, QuerySalva

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
    notas = session.exec(select(Nota).where(Nota.tipo_id == tipo_id)).all()
    tarefas = session.exec(select(Tarefa).where(Tarefa.tipo_id == tipo_id)).all()
    queries = session.exec(select(QuerySalva).where(QuerySalva.tipo_objeto_id == tipo_id)).all()
    if notas or tarefas or queries:
        raise HTTPException(
            status_code=409,
            detail=f"Tipo em uso por {len(notas)} nota(s), {len(tarefas)} tarefa(s) e {len(queries)} consulta(s). Remova as referências antes de excluir."
        )
    session.delete(db)
    session.commit()
    return {"ok": True}
