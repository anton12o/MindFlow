from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_, SQLModel
from sqlalchemy import text
from database import get_session
from models import QuerySalva, QuerySalvaCreate, QuerySalvaRead, Nota, Tarefa, TipoObjeto

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
    q = session.get(QuerySalva, query_id)
    if not q:
        raise HTTPException(status_code=404, detail="Consulta não encontrada")
    return q

TAREFA_NOME = "Tarefa"
TAREFA_CAMPOS_PERMITIDOS = {"status", "prioridade", "titulo", "data", "tempo_estimado", "bloco_id", "tipo_id", "propriedades"}
NOTA_CAMPOS_PERMITIDOS = {"titulo", "conteudo", "pasta_id", "tipo_id", "propriedades"}


def _tipo_eh_tarefa(tipo_objeto_id: int, session: Session) -> bool:
    tipo = session.get(TipoObjeto, tipo_objeto_id)
    return tipo is not None and tipo.nome == TAREFA_NOME


@router.delete("/{query_id}")
def delete_query(query_id: int, session: Session = Depends(get_session)):
    db = session.get(QuerySalva, query_id)
    if not db:
        raise HTTPException(status_code=404, detail="Consulta não encontrada")
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
        raise HTTPException(status_code=404, detail="Consulta não encontrada")
    if _tipo_eh_tarefa(q.tipo_objeto_id, session):
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
            q = filtros["q"].strip()
            if not q:
                stmt = stmt.where(1 == 0)
            else:
                tokens = [w.replace('"', '') for w in q.split() if w.strip()]
                if not tokens:
                    stmt = stmt.where(1 == 0)
                else:
                    fts_query = " AND ".join(f'"{t}"' for t in tokens)
                    ids = [
                        r[0] for r in session.execute(
                            text("SELECT rowid FROM notas_fts WHERE notas_fts MATCH :q ORDER BY rank"),
                            {"q": fts_query},
                        ).all()
                    ]
                    if ids:
                        stmt = stmt.where(Nota.id.in_(ids))
                    else:
                        stmt = stmt.where(1 == 0)
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
        raise HTTPException(status_code=404, detail="Consulta não encontrada")
    if _tipo_eh_tarefa(q.tipo_objeto_id, session):
        campos = TAREFA_CAMPOS_PERMITIDOS
        model_class = Tarefa
    else:
        campos = NOTA_CAMPOS_PERMITIDOS
        model_class = Nota
    alteracoes_validas = {k: v for k, v in batch.alteracoes.items() if k in campos}
    for item_id in batch.ids:
        db = session.get(model_class, item_id)
        if not db:
            raise HTTPException(status_code=404, detail=f"{model_class.__name__} {item_id} não encontrado")
        for k, v in alteracoes_validas.items():
            setattr(db, k, v)
        session.add(db)
    session.commit()
    return {"ok": True}
