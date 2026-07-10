import logging
import sqlite3
import threading
import time
from pathlib import Path

logger = logging.getLogger(__name__)
_backup_lock = threading.Lock()


def cold_backup(db_path: Path, backup_dir: Path, src_conn: sqlite3.Connection | None = None) -> None:
    if not db_path.exists():
        return
    if not _backup_lock.acquire(blocking=False):
        logger.warning("Backup já em andamento — ignorando")
        return
    try:
        backup_dir.mkdir(parents=True, exist_ok=True)
        now = time.strftime("%Y-%m-%d_%H-%M-%S")
        dst = str(backup_dir / f"mindflow-{now}.db")

        if src_conn:
            with sqlite3.connect(dst) as dst_conn:
                src_conn.backup(dst_conn, pages=1000)
        else:
            with sqlite3.connect(str(db_path)) as src, sqlite3.connect(dst) as dst:
                src.backup(dst, pages=1000)

        logger.info("Backup salvo: %s", dst)

        backups = sorted(backup_dir.glob("mindflow-*.db"))
        while len(backups) > 6:
            backups.pop(0).unlink()
    except Exception as e:
        logger.warning("Falha ao fazer backup: %s", e)
    finally:
        _backup_lock.release()
