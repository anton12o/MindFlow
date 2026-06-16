import threading
import logging
import shutil
import sys
import time
from pathlib import Path
from sqlmodel import Session, text
from fastapi import APIRouter
from database import engine

logger = logging.getLogger(__name__)
router = APIRouter()

BACKUP_DIR = Path(__file__).parent.parent / "data" / "backups"
DB_PATH = Path(__file__).parent.parent / "data" / "mindflow.db"


def cold_backup():
    """Salva uma copia do banco antes de encerrar."""
    if not DB_PATH.exists():
        return
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        shutil.copy2(str(DB_PATH), str(BACKUP_DIR / f"mindflow-{now}.db"))
        logger.info("Backup salvo: data/backups/mindflow-%s.db", now)

        backups = sorted(BACKUP_DIR.glob("mindflow-*.db"))
        while len(backups) > 6:
            backups.pop(0).unlink()
    except Exception as e:
        logger.warning("Falha ao fazer backup antes de encerrar: %s", e)


@router.post("/shutdown")
def shutdown():
    logger.info("Recebido pedido de encerramento via API")
    cold_backup()
    try:
        with Session(engine) as session:
            session.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
            session.commit()
        logger.info("WAL checkpoint realizado com sucesso")
    except Exception as e:
        logger.warning("Falha ao fazer WAL checkpoint: %s", e)
    threading.Timer(0.5, lambda: sys.exit(0)).start()
    return {"ok": True}
