import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Habito, Nota, RegistroHabito, SessaoPomodoro, SessaoPomodoroCreate, SessaoPomodoroRead, Tarefa
from services.notes import criar_nota_resumo

from .common import commit_with_handle, validate_date

logger = logging.getLogger(__name__)

router = APIRouter()

class FinalizarSessaoBody(BaseModel):
    conteudo_resumo: str | None = None
    contexto_nome: str | None = None

@router.get("/sessoes", response_model=list[SessaoPomodoroRead])
def list_sessoes(limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    stmt = select(SessaoPomodoro).order_by(SessaoPomodoro.iniciado_em.desc())
    return session.exec(stmt.offset(offset).limit(limit)).all()

@router.post("/sessoes", response_model=SessaoPomodoroRead)
def create_sessao(s: SessaoPomodoroCreate, session: Session = Depends(get_session)):
    if s.resumo_nota_id is not None and not session.get(Nota, s.resumo_nota_id):
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    db = SessaoPomodoro(**s.model_dump())
    session.add(db)
    commit_with_handle(session, db, "criar sessão")
    return db

@router.patch("/sessoes/{sessao_id}/finalizar", response_model=SessaoPomodoroRead)
def finalizar_sessao(sessao_id: int, body: FinalizarSessaoBody, session: Session = Depends(get_session)):
    s = session.get(SessaoPomodoro, sessao_id)
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    s.finalizado_em = datetime.now().isoformat()
    if body.conteudo_resumo:
        nota = criar_nota_resumo(body.conteudo_resumo, session, body.contexto_nome)
        s.resumo_nota_id = nota.id
    if s.contexto_tipo == 'tarefa' and s.contexto_id:
        tarefa = session.get(Tarefa, s.contexto_id)
        if tarefa:
            tarefa.total_foco_min = (tarefa.total_foco_min or 0) + s.duracao_min
            session.add(tarefa)
    habito = session.exec(select(Habito).where(Habito.nome == "Foco")).first()
    if not habito:
        habito = Habito(nome="Foco", tipo="binario", cor="#7C3AED")
        session.add(habito)
        session.flush()
    registro = RegistroHabito(habito_id=habito.id, data=datetime.now().strftime("%Y-%m-%d"), valor=float(s.duracao_min))
    session.add(registro)
    if s.contexto_tipo == 'habito' and s.contexto_id:
        habito_especifico = session.get(Habito, s.contexto_id)
        if habito_especifico:
            session.add(RegistroHabito(habito_id=habito_especifico.id, data=datetime.now().strftime("%Y-%m-%d"), valor=float(s.duracao_min)))
    commit_with_handle(session, s, "finalizar sessão")
    return s

@router.delete("/sessoes")
def delete_sessoes(antes_de: str, session: Session = Depends(get_session)):
    validate_date(antes_de)
    stmt = select(SessaoPomodoro).where(SessaoPomodoro.iniciado_em < antes_de + "~")
    sessoes = session.exec(stmt).all()
    for s in sessoes:
        session.delete(s)
    commit_with_handle(session, context="excluir sessões")
    return {"deletadas": len(sessoes)}
