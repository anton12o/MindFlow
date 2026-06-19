from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from database import get_session
from models import Flashcard, FlashcardCreate, FlashcardUpdate, FlashcardRead, Nota
from services import sm2_calculo


class FlashcardReviewInput(BaseModel):
    qualidade: int = Field(ge=0, le=5)

router = APIRouter()

@router.get("", response_model=list[FlashcardRead])
def list_flashcards(nota_id: int | None = None, limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0), session: Session = Depends(get_session)):
    stmt = select(Flashcard)
    if nota_id:
        stmt = stmt.where(Flashcard.nota_id == nota_id)
    return session.exec(stmt.order_by(Flashcard.criado_em.desc()).offset(offset).limit(limit)).all()

@router.get("/review", response_model=list[FlashcardRead])
def review_flashcards(session: Session = Depends(get_session)):
    hoje = date.today()
    stmt = select(Flashcard).where(Flashcard.proxima_revisao <= hoje)
    return session.exec(stmt.order_by(Flashcard.proxima_revisao)).all()

@router.post("", response_model=FlashcardRead)
def create_flashcard(f: FlashcardCreate, session: Session = Depends(get_session)):
    if f.nota_id is not None and not session.get(Nota, f.nota_id):
        raise HTTPException(status_code=404, detail="Nota não encontrada")
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
    data = f.model_dump(exclude_unset=True)
    if "nota_id" in data and data["nota_id"] is not None and not session.get(Nota, data["nota_id"]):
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    for field, value in data.items():
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
