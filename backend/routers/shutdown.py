import atexit
import logging
import os
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, text

from database import engine
from rate_limiter import backup_limiter, shutdown_limiter
from services.backup import cold_backup as _cold_backup

logger = logging.getLogger(__name__)
router = APIRouter()

BACKUP_DIR = Path(__file__).parent.parent / "data" / "backups"
DB_PATH = Path(__file__).parent.parent / "mindflow.db"

_pending_shutdown: dict[str, datetime] = {}
_pending_shutdown_lock = threading.Lock()
_PENDING_TIMEOUT = timedelta(seconds=30)


def cold_backup():
    """Wrapper que injeta a conexão via engine pool."""
    if not DB_PATH.exists():
        return
    with Session(engine) as session:
        src_conn = session.connection().connection
        _cold_backup(DB_PATH, BACKUP_DIR, src_conn)


def _wal_checkpoint():
    try:
        with Session(engine) as session:
            session.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
            session.execute(text("PRAGMA incremental_vacuum(100)"))
            session.commit()
    except Exception as e:
        logger.warning("WAL checkpoint / VACUUM falhou: %s", e)


def _execute_shutdown():
    _wal_checkpoint()
    cold_backup()
    import sys
    main_mod = sys.modules.get('main')
    server = getattr(main_mod, '_uvicorn_server', None) if main_mod else None
    if server:
        server.should_exit = True
    else:
        threading.Timer(0.5, lambda: os._exit(0)).start()


atexit.register(_wal_checkpoint)
atexit.register(cold_backup)


@router.post("/db/backup")
def db_backup(_rl: None = Depends(backup_limiter)):
    threading.Thread(target=_backup_async, daemon=True).start()
    return {"ok": True, "mensagem": "Backup iniciado"}


def _backup_async():
    try:
        cold_backup()
    except Exception as e:
        logger.error("[db.backup] %s", e)


@router.post("/db/restore")
def db_restore(file: bytes = File(...)):
    if len(file) < 100 or file[:16] != b'SQLite format 3\0':
        raise HTTPException(status_code=400, detail="Arquivo inválido — não é um banco SQLite")
    import tempfile
    fd, tmp_name = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        tmp.write_bytes(file)
        import sqlite3
        conn = sqlite3.connect(str(tmp))
        try:
            integrity = conn.execute("PRAGMA quick_check").fetchone()[0]
        finally:
            conn.close()
        if integrity != "ok":
            raise HTTPException(status_code=400, detail=f"Banco corrompido: {integrity}")
        if DB_PATH.exists():
            cold_backup()
            DB_PATH.unlink()
        tmp.replace(DB_PATH)
        engine.dispose()
        logger.info("Banco restaurado com sucesso de %d bytes", len(file))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[db.restore] %s", e)
        raise HTTPException(status_code=500, detail="Erro ao restaurar banco")
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
    return {"ok": True, "mensagem": "Banco restaurado com sucesso"}


@router.get("/db/backups")
def list_backups():
    if not BACKUP_DIR.exists():
        return []
    backups = sorted(BACKUP_DIR.glob("mindflow-*.db"), reverse=True)
    return [{"nome": b.name, "tamanho": b.stat().st_size, "modificado": b.stat().st_mtime} for b in backups]


@router.get("/db/backups/{filename}")
def download_backup(filename: str):
    from urllib.parse import unquote
    backup_dir = Path(BACKUP_DIR).resolve()
    safe = os.path.basename(unquote(filename))
    if safe in ("", ".", ".."):
        raise HTTPException(status_code=400, detail="Acesso negado")
    full = (backup_dir / safe).resolve()
    if backup_dir not in full.parents:
        raise HTTPException(status_code=400, detail="Acesso negado")
    if not full.is_file():
        raise HTTPException(status_code=404, detail="Backup não encontrado")
    return FileResponse(full, filename=safe, media_type="application/octet-stream")


@router.post("/db/vacuum")
def db_vacuum():
    def _vacuum():
        try:
            from database import engine
            with Session(engine) as session:
                session.execute(text("VACUUM"))
                session.commit()
            logger.info("VACUUM completo realizado com sucesso")
        except Exception as e:
            logger.error("[db.vacuum] %s", e)
    threading.Thread(target=_vacuum, daemon=True).start()
    return {"ok": True, "mensagem": "Compactação iniciada em segundo plano"}


@router.post("/shutdown")
def shutdown(_rl: None = Depends(shutdown_limiter)):
    logger.info("Recebido pedido de encerramento via API")
    _execute_shutdown()
    return {"ok": True}


@router.post("/shutdown/init")
def shutdown_init():
    token = str(uuid.uuid4())
    with _pending_shutdown_lock:
        _pending_shutdown[token] = datetime.now()
        now = datetime.now()
        expired = [k for k, v in list(_pending_shutdown.items()) if now - v > _PENDING_TIMEOUT]
        for k in expired:
            del _pending_shutdown[k]
    return {"token": token}


@router.post("/shutdown/confirm")
def shutdown_confirm(token: str):
    with _pending_shutdown_lock:
        if token not in _pending_shutdown:
            raise HTTPException(status_code=404, detail="Token não encontrado ou expirado")
        del _pending_shutdown[token]
    _execute_shutdown()
    return {"ok": True}


@router.post("/shutdown/cancel")
def shutdown_cancel(token: str):
    with _pending_shutdown_lock:
        _pending_shutdown.pop(token, None)
    return {"ok": True}
