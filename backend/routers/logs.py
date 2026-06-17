import logging
from fastapi import APIRouter
from pydantic import BaseModel

from logging_config import LOG_FILE

logger = logging.getLogger("routers.logs")
router = APIRouter()


class FrontendLogEntry(BaseModel):
    message: str
    stack: str | None = None
    context: str | None = None
    url: str | None = None


@router.get("")
def get_logs(n: int = 50, level: str | None = None):
    if not LOG_FILE.exists():
        return {"entries": [], "total": 0}

    try:
        lines = LOG_FILE.read_text(encoding="utf-8").strip().split("\n")
    except Exception:
        return {"entries": [], "total": 0}
    entries = []
    for line in reversed(lines):
        if not line.strip():
            continue
        parts = line.split("] [", 2)
        if len(parts) < 2:
            continue
        ts = parts[0].lstrip("[")
        lvl = parts[1]
        rest = parts[2] if len(parts) > 2 else ""
        rest = rest.rstrip("]")
        if level and lvl.strip() != level:
            continue
        entries.append({
            "timestamp": ts,
            "level": lvl.strip(),
            "module": rest.split("] ")[0] if "] " in rest else "",
            "message": rest.split("] ", 1)[-1] if "] " in rest else rest,
        })
        if len(entries) >= n:
            break
    return {"entries": entries, "total": len(entries)}


@router.post("")
def post_log(entry: FrontendLogEntry):
    tag = f"[FRONTEND] [{entry.context or '?'}]"
    logger.error("%s %s\n%s", tag, entry.message, entry.stack or "")
    return {"ok": True}


@router.delete("")
def delete_logs(all: bool = False):
    if LOG_FILE.exists():
        if all:
            for p in list(LOG_FILE.parent.glob("mindflow.log*")):
                p.unlink(missing_ok=True)
        else:
            LOG_FILE.write_text("", encoding="utf-8")
    return {"ok": True}
