import atexit
import os
import threading
import logging
import sqlite3
import time
from pathlib import Path
from sqlmodel import Session, text
from fastapi import APIRouter
from database import engine

logger = logging.getLogger(__name__)
router = APIRouter()

BACKUP_DIR = Path(__file__).parent.parent / "data" / "backups"
DB_PATH = Path(__file__).parent.parent / "mindflow.db"


def cold_backup():
    """Salva uma copia do banco antes de encerrar."""
    if not DB_PATH.exists():
        return
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        dst = str(BACKUP_DIR / f"mindflow-{now}.db")
        with sqlite3.connect(str(DB_PATH)) as src_conn:
            with sqlite3.connect(dst) as dst_conn:
                src_conn.backup(dst_conn, pages=1000)
        logger.info("Backup salvo: data/backups/mindflow-%s.db", now)

        backups = sorted(BACKUP_DIR.glob("mindflow-*.db"))
        while len(backups) > 6:
            backups.pop(0).unlink()
    except Exception as e:
        logger.warning("Falha ao fazer backup antes de encerrar: %s", e)


def _wal_checkpoint():
    try:
        with Session(engine) as session:
            session.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
            session.commit()
    except Exception as e:
        logger.warning("WAL checkpoint falhou: %s", e)

atexit.register(_wal_checkpoint)


@router.post("/shutdown")
def shutdown():
    logger.info("Recebido pedido de encerramento via API")
    _wal_checkpoint()
    cold_backup()
    threading.Timer(0.5, lambda: os._exit(0)).start()
    return {"ok": True}
