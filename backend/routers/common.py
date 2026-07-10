import logging
from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session

logger = logging.getLogger(__name__)


def require_found(item, context: str = ""):
    if item is None:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    return item


def require_found_with(session, model, id: int, detail: str = ""):
    item = session.get(model, id)
    if item is None:
        msg = detail or f"{model.__name__} não encontrado(a)"
        raise HTTPException(status_code=404, detail=msg)
    return item


def validate_date(data: str, fmt: str = "%Y-%m-%d") -> str:
    try:
        datetime.strptime(data, fmt)
    except ValueError:
        label = fmt.replace("%Y-%m-%d", "YYYY-MM-DD")
        raise HTTPException(status_code=422, detail=f"Data inválida: {data}. Use {label}.")
    return data


def commit_with_handle(session: Session, db=None, context: str = "operação"):
    try:
        session.commit()
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error("[%s] %s", context, e)
        raise HTTPException(status_code=500, detail=f"Erro ao {context}")
    if db is not None:
        session.refresh(db)
