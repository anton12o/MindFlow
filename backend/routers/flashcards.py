from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from database import get_session
from models import Flashcard, FlashcardCreate, FlashcardUpdate, FlashcardRead
from services import sm2_calculo


class FlashcardReviewInput(BaseModel):
    qualidade: int = Field(ge=0, le=5)

router = APIRouter()

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
def review_flashcard(flashcard_id: int, body: FlashcardReviewInput, session: Session = Depends(get_session)):
    fc = session.get(Flashcard, flashcard_id)
    if not fc:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    intervalo, facilidade, revisoes = sm2_calculo(
        body.qualidade, fc.intervalo, fc.facilidade, fc.revisoes
    )
    fc.intervalo = intervalo
    fc.facilidade = facilidade
    fc.revisoes = revisoes
    fc.ultima_revisao = datetime.now()
    fc.proxima_revisao = date.today() + timedelta(days=intervalo)
    session.add(fc)
    session.commit()
    session.refresh(fc)
    return fc

@router.patch("/{flashcard_id}", response_model=FlashcardRead)
def update_flashcard(flashcard_id: int, f: FlashcardUpdate, session: Session = Depends(get_session)):
    db = session.get(Flashcard, flashcard_id)
    if not db:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    for field, value in f.model_dump(exclude_unset=True).items():
        setattr(db, field, value)
    session.add(db)
    session.commit()
    session.refresh(db)
    return db

@router.delete("/{flashcard_id}")
def delete_flashcard(flashcard_id: int, session: Session = Depends(get_session)):
    fc = session.get(Flashcard, flashcard_id)
    if not fc:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    session.delete(fc)
    session.commit()
    return {"ok": True}
