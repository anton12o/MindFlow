import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel
from sqlalchemy import text
from database import get_session
from models import QuerySalva, QuerySalvaCreate, QuerySalvaRead, Nota, Tarefa, TipoObjeto

logger = logging.getLogger(__name__)

router = APIRouter()

CAMPOS_AGRUPAMENTO = frozenset({
    "status", "prioridade", "titulo", "data", "criado_em", "atualizado_em",
    "autor", "fonte", "lido_em", "avaliacao", "paginas",
    "vencimento", "estimativa", "data_inicio", "data_fim", "cover_url",
})

COLUNAS_DATA_NOTA = frozenset({"criado_em", "atualizado_em", "ultimo_acesso"})

DATA_FILTER_MAP = {
    "criado_em": "notas.criado_em LIKE :mes",
    "atualizado_em": "notas.atualizado_em LIKE :mes",
    "ultimo_acesso": "notas.ultimo_acesso LIKE :mes",
    "data_inicio": "propriedades->>'data_inicio' LIKE :mes",
    "data_fim": "propriedades->>'data_fim' LIKE :mes",
}

@router.get("", response_model=list[QuerySalvaRead])
def list_queries(session: Session = Depends(get_session)):
    return session.exec(select(QuerySalva)).all()

@router.post("", response_model=QuerySalvaRead)
def create_query(q: QuerySalvaCreate, session: Session = Depends(get_session)):
    if not session.get(TipoObjeto, q.tipo_objeto_id):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
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
    dados: list[Any]
@router.post("/{query_id}/executar")
def executar_query(query_id: int, mes: str | None = None, gantt: bool = False, session: Session = Depends(get_session)):
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
            search_term = filtros["q"].strip()
            if not search_term:
                stmt = stmt.where(1 == 0)
            else:
                tokens = [w.replace('"', '') for w in search_term.split() if w.strip()]
                if not tokens:
                    stmt = stmt.where(1 == 0)
                else:
                    fts_query = " AND ".join(f'"{t}"' for t in tokens)
                    try:
                        ids = [
                            r[0] for r in session.execute(
                                text("SELECT rowid FROM notas_fts WHERE notas_fts MATCH :q ORDER BY rank"),
                                {"q": fts_query},
                            ).all()
                        ]
                    except Exception as e:
                        logger.warning("FTS5 query falhou (fallback para vazio): %s", e)
                        ids = []
                    if ids:
                        stmt = stmt.where(Nota.id.in_(ids))
                    else:
                        stmt = stmt.where(1 == 0)
        if filtros.get("tipo_id"):
            stmt = stmt.where(Nota.tipo_id == filtros["tipo_id"])
        # Calendar view: filter by month on campo_agrupamento
        if mes and q.campo_agrupamento:
            campo = q.campo_agrupamento
            if campo not in CAMPOS_AGRUPAMENTO:
                raise HTTPException(status_code=422, detail="campo_agrupamento inválido")
            sql_clause = DATA_FILTER_MAP.get(campo)
            if sql_clause is None:
                raise HTTPException(status_code=422, detail=f"Campo '{campo}' não suportado para filtro por mês")
            stmt = stmt.where(text(sql_clause)).params(mes=f"{mes}%")
        # Gantt view: filter only notes with both data_inicio and data_fim
        if gantt:
            if not q.campo_agrupamento:
                raise HTTPException(status_code=422, detail="Query precisa de campo_agrupamento. Clique em Editar para configurar.")
            campo_inicio = "data_inicio"
            campo_fim = "data_fim"
            stmt = stmt.where(
                text(f"propriedades->>'{campo_inicio}' IS NOT NULL AND propriedades->>'{campo_fim}' IS NOT NULL")
            )
        dados = session.exec(stmt).all()
        total = len(dados)
        if gantt:
            dados = dados[:100]  # hard limit 100
        return {"tipo": "nota", "dados": [{"id": d.id, "titulo": d.titulo, "conteudo": d.conteudo[:100], "tipo_id": d.tipo_id, "cover_url": d.cover_url} for d in dados], "total": total}
class BatchInput(SQLModel):
    ids: list[int]
    alteracoes: dict[str, Any]
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
    items = session.exec(select(model_class).where(model_class.id.in_(batch.ids))).all()
    found = {item.id for item in items}
    missing = [str(i) for i in batch.ids if i not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"{model_class.__name__}(s) não encontrado(s): {', '.join(missing)}")
    for db in items:
        for k, v in alteracoes_validas.items():
            setattr(db, k, v)
        session.add(db)
    session.commit()
    return {"ok": True}
