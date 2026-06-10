from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import BlocoRotina, BlocoRotinaCreate, BlocoRotinaRead, Tarefa, TarefaCreate, TarefaRead

router = APIRouter()

# ─── Blocos ───
@router.get("/blocos", response_model=list[BlocoRotinaRead])
def list_blocos(data: str | None = None, session: Session = Depends(get_session)):
    stmt = select(BlocoRotina)
    if data:
        stmt = stmt.where((BlocoRotina.data_especifica == data) | (BlocoRotina.recorrente == True))
    return session.exec(stmt.order_by(BlocoRotina.hora_inicio)).all()

@router.post("/blocos", response_model=BlocoRotinaRead)
def create_bloco(b: BlocoRotinaCreate, session: Session = Depends(get_session)):
    db = BlocoRotina(**b.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/blocos/{bloco_id}")
def delete_bloco(bloco_id: int, session: Session = Depends(get_session)):
    b = session.get(BlocoRotina, bloco_id)
    if b:
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

@router.patch("/tarefas/{tarefa_id}")
def update_tarefa(tarefa_id: int, status: str, session: Session = Depends(get_session)):
    t = session.get(Tarefa, tarefa_id)
    if t:
        t.status = status
        session.add(t)
        session.commit()
        session.refresh(t)
    return t

@router.delete("/tarefas/{tarefa_id}")
def delete_tarefa(tarefa_id: int, session: Session = Depends(get_session)):
    t = session.get(Tarefa, tarefa_id)
    if t:
        session.delete(t)
        session.commit()
    return {"ok": True}
