import logging
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import DataError, IntegrityError, OperationalError
from sqlalchemy.orm.exc import StaleDataError
from sqlmodel import Session, and_, select

from database import get_session
from models import (
    BlocoRotina,
    BlocoRotinaCreate,
    BlocoRotinaRead,
    BlocoRotinaUpdate,
    Tarefa,
    TarefaCreate,
    TarefaRead,
    TarefaUpdate,
    TipoObjeto,
)

from .common import commit_with_handle, validate_date

logger = logging.getLogger(__name__)

router = APIRouter()


def _proxima_data(data_atual: str, tipo: str, intervalo: int) -> str:
    d = datetime.strptime(data_atual, "%Y-%m-%d").date()
    if tipo == "daily":
        d += timedelta(days=intervalo)
    elif tipo == "weekly":
        d += timedelta(weeks=intervalo)
    elif tipo == "monthly":
        mes = d.month + intervalo
        ano = d.year + (mes - 1) // 12
        mes = ((mes - 1) % 12) + 1
        dia = min(d.day, [31, 29 if ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0) else 28,
                          31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1])
        d = date(ano, mes, dia)
    elif tipo == "weekday":
        d += timedelta(days=1)
        while d.weekday() >= 5:
            d += timedelta(days=1)
        for _ in range(intervalo - 1):
            d += timedelta(days=7)
    return d.isoformat()

# ─── Blocos ───
@router.get("/blocos", response_model=list[BlocoRotinaRead])
def list_blocos(
    data: str | None = None, sort: str | None = None,
    dir: str = Query(default='asc', pattern='^(asc|desc)$'),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
):
    stmt = select(BlocoRotina)
    if data:
        validate_date(data)
        dia_semana = str(datetime.strptime(data, "%Y-%m-%d").weekday())
        condicao_data = BlocoRotina.data_especifica == data
        condicao_recorrente = and_(
            BlocoRotina.recorrente,
            BlocoRotina.dias_semana.isnot(None),
            func.instr(BlocoRotina.dias_semana, dia_semana) > 0,
        )
        stmt = stmt.where(condicao_data | condicao_recorrente)
    sort_map = {'hora_inicio': BlocoRotina.hora_inicio, 'titulo': BlocoRotina.titulo}
    order = sort_map.get(sort, BlocoRotina.hora_inicio)
    stmt = stmt.order_by(order.asc() if dir == 'asc' else order.desc())
    return session.exec(stmt.offset(offset).limit(limit)).all()

def _check_conflito_bloco(
    session: Session, data_especifica: str,
    hora_inicio: str, hora_fim: str, bloco_id: int | None = None,
) -> None:
    stmt = select(BlocoRotina).where(BlocoRotina.data_especifica == data_especifica)
    if bloco_id is not None:
        stmt = stmt.where(BlocoRotina.id != bloco_id)
    for existente in session.exec(stmt).all():
        if hora_inicio < existente.hora_fim and hora_fim > existente.hora_inicio:
            raise HTTPException(
                status_code=409,
                detail=f"Conflito com bloco '{existente.titulo}' ({existente.hora_inicio}-{existente.hora_fim})",
            )

@router.post("/blocos", response_model=BlocoRotinaRead)
def create_bloco(b: BlocoRotinaCreate, session: Session = Depends(get_session)):
    if b.data_especifica:
        _check_conflito_bloco(session, b.data_especifica, b.hora_inicio, b.hora_fim)
    db = BlocoRotina(**b.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar bloco")
    return db

@router.patch("/blocos/{bloco_id}", response_model=BlocoRotinaRead)
def update_bloco(bloco_id: int, b: BlocoRotinaUpdate, session: Session = Depends(get_session)):
    db = session.get(BlocoRotina, bloco_id)
    if not db:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    for field, value in b.model_dump(exclude_unset=True).items():
        setattr(db, field, value)
    if db.data_especifica:
        _check_conflito_bloco(session, db.data_especifica, db.hora_inicio, db.hora_fim, bloco_id=db.id)
    session.add(db)
    commit_with_handle(session, db, "atualizar bloco")
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
    commit_with_handle(session, context="excluir bloco")
    return {"ok": True}


class ReorderItem(BaseModel):
    id: int
    ordem: int


@router.patch("/tarefas/reorder")
def reorder_tarefas(items: list[ReorderItem], session: Session = Depends(get_session)):
    for item in items:
        t = session.get(Tarefa, item.id)
        if t:
            t.ordem = item.ordem
            session.add(t)
    commit_with_handle(session, context="reordenar tarefas")
    return {"ok": True}

# ─── Tarefas ───
@router.get("/tarefas", response_model=list[TarefaRead])
def list_tarefas(
    data: str | None = None, sort: str | None = None,
    dir: str = Query(default='desc', pattern='^(asc|desc)$'),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    quadrante: str | None = None,
    session: Session = Depends(get_session),
):
    stmt = select(Tarefa)
    if data:
        stmt = stmt.where(Tarefa.data == data)
    if quadrante:
        stmt = stmt.where(Tarefa.quadrante == quadrante)
    sort_map = {'criado_em': Tarefa.criado_em, 'titulo': Tarefa.titulo, 'data': Tarefa.data, 'status': Tarefa.status, 'ordem': Tarefa.ordem}
    order = sort_map.get(sort, Tarefa.ordem)
    stmt = stmt.order_by(order.desc() if dir == 'desc' else order.asc())
    return session.exec(stmt.offset(offset).limit(limit)).all()

@router.get("/tarefas/eisenhower")
def list_tarefas_eisenhower(
    data_inicio: str, data_fim: str,
    session: Session = Depends(get_session),
) -> dict[str, list[TarefaRead]]:
    stmt = select(Tarefa).where(
        Tarefa.data >= data_inicio,
        Tarefa.data <= data_fim,
    ).order_by(Tarefa.ordem)
    tarefas = session.exec(stmt).all()
    grouped: dict[str, list[TarefaRead]] = {"fazer": [], "agendar": [], "delegar": [], "eliminar": []}
    for t in tarefas:
        grouped.setdefault(t.quadrante, []).append(t)
    return grouped

@router.post("/tarefas", response_model=TarefaRead)
def create_tarefa(t: TarefaCreate, session: Session = Depends(get_session)):
    if t.bloco_id is not None and not session.get(BlocoRotina, t.bloco_id):
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    if t.tipo_id is not None and not session.get(TipoObjeto, t.tipo_id):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    db = Tarefa(**t.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar tarefa")
    return db

@router.patch("/tarefas/{tarefa_id}", response_model=TarefaRead)
def update_tarefa(tarefa_id: int, t: TarefaUpdate, session: Session = Depends(get_session)):
    db = session.get(Tarefa, tarefa_id)
    if not db:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    data = t.model_dump(exclude_unset=True)
    if "bloco_id" in data and data["bloco_id"] is not None and not session.get(BlocoRotina, data["bloco_id"]):
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    if "tipo_id" in data and data["tipo_id"] is not None and not session.get(TipoObjeto, data["tipo_id"]):
        raise HTTPException(status_code=404, detail="Tipo não encontrado")
    for field, value in data.items():
        setattr(db, field, value)
    session.add(db)
    try:
        if data.get("status") == "feito" and db.recorrente and db.recorrencia_tipo:
            nova_data = _proxima_data(db.data, db.recorrencia_tipo, db.recorrencia_intervalo)
            nova = Tarefa(
                titulo=db.titulo,
                prioridade=db.prioridade,
                status="pendente",
                data=nova_data,
                descricao=db.descricao,
                recorrente=True,
                recorrencia_tipo=db.recorrencia_tipo,
                recorrencia_intervalo=db.recorrencia_intervalo,
            )
            session.add(nova)

        session.commit()
        session.refresh(db)
    except (DataError, IntegrityError, OperationalError, StaleDataError) as e:
        session.rollback()
        logger.error("[rotina.update_tarefa] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar tarefa")
    return db

@router.post("/tarefas/gerar-recorrentes")
def gerar_tarefas_recorrentes(session: Session = Depends(get_session)):
    hoje = date.today().isoformat()
    tasks = session.exec(
        select(Tarefa).where(
            Tarefa.recorrente,
            Tarefa.data < hoje,
            Tarefa.status != "feito",
        )
    ).all()
    count = 0
    for t in tasks:
        nova_data = t.data
        for _ in range(10):
            prox = _proxima_data(nova_data, t.recorrencia_tipo, t.recorrencia_intervalo)
            if prox >= hoje:
                nova_data = prox
                break
            nova_data = prox
        if nova_data >= hoje:
            nova = Tarefa(
                titulo=t.titulo,
                prioridade=t.prioridade,
                quadrante=t.quadrante,
                data=nova_data,
                descricao=t.descricao,
                bloco_id=t.bloco_id,
                tipo_id=t.tipo_id,
                ordem=t.ordem,
                recorrente=True,
                recorrencia_tipo=t.recorrencia_tipo,
                recorrencia_intervalo=t.recorrencia_intervalo,
            )
            session.add(nova)
            count += 1
    if count:
        commit_with_handle(session, context="gerar recorrentes")
    return {"ok": True, "geradas": count}

@router.delete("/tarefas/{tarefa_id}")
def delete_tarefa(tarefa_id: int, session: Session = Depends(get_session)):
    t = session.get(Tarefa, tarefa_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    session.delete(t)
    commit_with_handle(session, context="excluir tarefa")
    return {"ok": True}
