from fastapi import APIRouter, Depends
from sqlmodel import Session, select, or_, SQLModel
from database import get_session
from models import QuerySalva, QuerySalvaCreate, QuerySalvaRead, Nota, Tarefa

router = APIRouter()

@router.get("", response_model=list[QuerySalvaRead])
def list_queries(session: Session = Depends(get_session)):
    return session.exec(select(QuerySalva)).all()

@router.post("", response_model=QuerySalvaRead)
def create_query(q: QuerySalvaCreate, session: Session = Depends(get_session)):
    db = QuerySalva(**q.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.get("/{query_id}", response_model=QuerySalvaRead)
def get_query(query_id: int, session: Session = Depends(get_session)):
    return session.get(QuerySalva, query_id)

@router.delete("/{query_id}")
def delete_query(query_id: int, session: Session = Depends(get_session)):
    db = session.get(QuerySalva, query_id)
    if db:
        session.delete(db)
        session.commit()
    return {"ok": True}

class ExecutarResult(SQLModel):
    tipo: str
    dados: list

@router.post("/{query_id}/executar")
def executar_query(query_id: int, session: Session = Depends(get_session)):
    q = session.get(QuerySalva, query_id)
    if not q:
        return {"tipo": "nota", "dados": []}
    if q.tipo_objeto_id == 2:
        stmt = select(Tarefa)
        filtros = q.filtros or {}
        if filtros.get("status"):
            stmt = stmt.where(Tarefa.status == filtros["status"])
        if filtros.get("prioridade"):
            stmt = stmt.where(Tarefa.prioridade == filtros["prioridade"])
        dados = session.exec(stmt).all()
        return {"tipo": "tarefa", "dados": [{"id": d.id, "titulo": d.titulo, "status": d.status, "prioridade": d.prioridade, "data": d.data} for d in dados]}
    else:
        stmt = select(Nota)
        filtros = q.filtros or {}
        if filtros.get("q"):
            stmt = stmt.where(Nota.titulo.contains(filtros["q"]) | Nota.conteudo.contains(filtros["q"]))
        if filtros.get("tipo_id"):
            stmt = stmt.where(Nota.tipo_id == filtros["tipo_id"])
        dados = session.exec(stmt).all()
        return {"tipo": "nota", "dados": [{"id": d.id, "titulo": d.titulo, "conteudo": d.conteudo[:100], "tipo_id": d.tipo_id} for d in dados]}

class BatchInput(SQLModel):
    ids: list[int]
    alteracoes: dict

@router.patch("/{query_id}/batch")
def batch_edit(query_id: int, batch: BatchInput, session: Session = Depends(get_session)):
    q = session.get(QuerySalva, query_id)
    if not q:
        return {"ok": False}
    if q.tipo_objeto_id == 2:
        for item_id in batch.ids:
            db = session.get(Tarefa, item_id)
            if db:
                for k, v in batch.alteracoes.items():
                    setattr(db, k, v)
                session.add(db)
    else:
        for item_id in batch.ids:
            db = session.get(Nota, item_id)
            if db:
                for k, v in batch.alteracoes.items():
                    setattr(db, k, v)
                session.add(db)
    session.commit()
    return {"ok": True}
