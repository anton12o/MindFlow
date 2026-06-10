import math
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import Flashcard, FlashcardCreate, FlashcardRead, Nota

router = APIRouter()

def sm2_calculo(qualidade: int, intervalo: float, facilidade: float, revisoes: int):
    if qualidade < 3:
        return 0.0, facilidade, 0
    facilidade = max(1.3, facilidade + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02)))
    if revisoes == 0:
        intervalo = 1.0
    elif revisoes == 1:
        intervalo = 6.0
    else:
        intervalo = round(intervalo * facilidade, 1)
    return intervalo, round(facilidade, 2), revisoes + 1

@router.get("", response_model=list[FlashcardRead])
def list_flashcards(nota_id: int | None = None, session: Session = Depends(get_session)):
    stmt = select(Flashcard)
    if nota_id:
        stmt = stmt.where(Flashcard.nota_id == nota_id)
    return session.exec(stmt.order_by(Flashcard.criado_em.desc())).all()

@router.get("/review", response_model=list[FlashcardRead])
def review_flashcards(session: Session = Depends(get_session)):
    hoje = date.today()
    stmt = select(Flashcard).where(Flashcard.proxima_revisao <= hoje)
    return session.exec(stmt.order_by(Flashcard.proxima_revisao)).all()

@router.post("", response_model=FlashcardRead)
def create_flashcard(f: FlashcardCreate, session: Session = Depends(get_session)):
    db = Flashcard(**f.model_dump())
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.post("/{flashcard_id}/review")
def review_flashcard(flashcard_id: int, qualidade: int, session: Session = Depends(get_session)):
    qualidade = max(0, min(5, qualidade))
    fc = session.get(Flashcard, flashcard_id)
    if not fc:
        return {"ok": False}
    intervalo, facilidade, revisoes = sm2_calculo(
        qualidade, fc.intervalo, fc.facilidade, fc.revisoes
    )
    fc.intervalo = intervalo
    fc.facilidade = facilidade
    fc.revisoes = revisoes
    fc.ultima_revisao = datetime.now()
    fc.proxima_revisao = date.today() + timedelta(days=intervalo) if intervalo > 0 else date.today()
    session.add(fc)
    session.commit()
    session.refresh(fc)
    return fc

@router.delete("/{flashcard_id}")
def delete_flashcard(flashcard_id: int, session: Session = Depends(get_session)):
    fc = session.get(Flashcard, flashcard_id)
    if fc:
        session.delete(fc)
        session.commit()
    return {"ok": True}
