from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import BlocoRotina, BlocoRotinaCreate, BlocoRotinaUpdate, BlocoRotinaRead, Tarefa, TarefaCreate, TarefaUpdate, TarefaRead
from datetime import datetime

router = APIRouter()

# ─── Blocos ───
@router.get("/blocos", response_model=list[BlocoRotinaRead])
def list_blocos(data: str | None = None, session: Session = Depends(get_session)):
    stmt = select(BlocoRotina)
    if data:
        try:
            datetime.strptime(data, "%Y-%m-%d")
        except ValueError:
            return []
        dia_semana = str(datetime.strptime(data, "%Y-%m-%d").weekday())
        condicao_data = BlocoRotina.data_especifica == data
        condicao_recorrente = BlocoRotina.recorrente == True
        if dia_semana is not None:
            condicao_recorrente = condicao_recorrente & BlocoRotina.dias_semana.contains(dia_semana)
        stmt = stmt.where(condicao_data | condicao_recorrente)
    return session.exec(stmt.order_by(BlocoRotina.hora_inicio)).all()

@router.post("/blocos", response_model=BlocoRotinaRead)
def create_bloco(b: BlocoRotinaCreate, session: Session = Depends(get_session)):
    db = BlocoRotina(**b.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.patch("/blocos/{bloco_id}", response_model=BlocoRotinaRead)
def update_bloco(bloco_id: int, b: BlocoRotinaUpdate, session: Session = Depends(get_session)):
    db = session.get(BlocoRotina, bloco_id)
    if not db:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    for field, value in b.model_dump(exclude_unset=True).items():
        setattr(db, field, value)
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/blocos/{bloco_id}")
def delete_bloco(bloco_id: int, session: Session = Depends(get_session)):
    b = session.get(BlocoRotina, bloco_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    for t in session.exec(select(Tarefa).where(Tarefa.bloco_id == bloco_id)).all():
        t.bloco_id = None
        session.add(t)
    session.delete(b)
    session.commit()
    return {"ok": True}

# ─── Tarefas ───
@router.get("/tarefas", response_model=list[TarefaRead])
def list_tarefas(data: str | None = None, session: Session = Depends(get_session)):
    stmt = select(Tarefa)
    if data:
        stmt = stmt.where(Tarefa.data == data)
    return session.exec(stmt.order_by(Tarefa.criado_em.desc())).all()

@router.post("/tarefas", response_model=TarefaRead)
def create_tarefa(t: TarefaCreate, session: Session = Depends(get_session)):
    db = Tarefa(**t.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.patch("/tarefas/{tarefa_id}", response_model=TarefaRead)
def update_tarefa(tarefa_id: int, t: TarefaUpdate, session: Session = Depends(get_session)):
    db = session.get(Tarefa, tarefa_id)
    if not db:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    for field, value in t.model_dump(exclude_unset=True).items():
        setattr(db, field, value)
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/tarefas/{tarefa_id}")
def delete_tarefa(tarefa_id: int, session: Session = Depends(get_session)):
    t = session.get(Tarefa, tarefa_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    session.delete(t)
    session.commit()
    return {"ok": True}
