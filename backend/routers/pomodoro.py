from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import SessaoPomodoro, SessaoPomodoroCreate, SessaoPomodoroRead
from services.notes import criar_nota_resumo
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class FinalizarSessaoBody(BaseModel):
    conteudo_resumo: Optional[str] = None

@router.get("/sessoes", response_model=list[SessaoPomodoroRead])
def list_sessoes(session: Session = Depends(get_session)):
    stmt = select(SessaoPomodoro).order_by(SessaoPomodoro.iniciado_em.desc())
    return session.exec(stmt).all()

@router.post("/sessoes", response_model=SessaoPomodoroRead)
def create_sessao(s: SessaoPomodoroCreate, session: Session = Depends(get_session)):
    db = SessaoPomodoro(**s.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.patch("/sessoes/{sessao_id}/finalizar")
def finalizar_sessao(sessao_id: int, body: FinalizarSessaoBody, session: Session = Depends(get_session)):
    s = session.get(SessaoPomodoro, sessao_id)
    if not s:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    s.finalizado_em = datetime.now().isoformat()
    if body.conteudo_resumo:
        nota = criar_nota_resumo(body.conteudo_resumo, session)
        s.resumo_nota_id = nota.id
    session.commit()
    session.refresh(s)
    return s
