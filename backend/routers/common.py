import logging
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.exc import DataError, IntegrityError, OperationalError
from sqlmodel import Session

logger = logging.getLogger(__name__)


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
    except IntegrityError as e:
        session.rollback()
        logger.warning("[%s] IntegrityError: %s", context, e)
        err_msg = str(e.orig or "")
        if "FOREIGN KEY" in err_msg:
            detail = "Item possui vínculos ativos — exclua os registros relacionados primeiro"
        elif "UNIQUE" in err_msg:
            detail = f"Já existe um item com este {context}"
        else:
            detail = f"Conflito ao {context}"
        raise HTTPException(status_code=409, detail=detail)
    except DataError as e:
        session.rollback()
        logger.warning("[%s] DataError: %s", context, e)
        raise HTTPException(status_code=422, detail=f"Dados inválidos ao {context}")
    except OperationalError as e:
        session.rollback()
        logger.error("[%s] OperationalError: %s", context, e)
        raise HTTPException(status_code=500, detail=f"Erro de banco ao {context}")
    if db is not None:
        session.refresh(db)
