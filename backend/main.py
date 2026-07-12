import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from _version import VERSION
from database import check_db_integrity, get_session, run_migrations, setup_fts
from exceptions import AppException, BadRequestException, ConflictException, NotFoundException
from logging_config import setup_logging
from rate_limiter import attachments_limiter, crud_limiter
from routers import (
    export,
    flashcards,
    habitos,
    import_data,
    inbox,
    logs,
    notas,
    pomodoro,
    queries,
    rotina,
    search,
    shutdown,
    stats,
    tipos,
)
from seed import seed_db
from services.metadata_index import metadata_index

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)
_uvicorn_server = None

dotenv_path = Path(__file__).resolve().parent.parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)


ATTACHMENTS_DIR = Path.home() / '.mindflow' / 'attachments'
MAX_ATTACHMENT_SIZE = int(os.getenv('MAX_ATTACHMENT_SIZE_MB', '5')) * 1024 * 1024
ALLOWED_MIME_PREFIXES = ('image/', 'application/pdf')

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("MindFlow v%s iniciando", VERSION)
    run_migrations()
    check_db_integrity()
    setup_fts()
    try:
        seed_db()
    except Exception as e:
        logger.warning("Seed não executado (banco já existente?): %s", e)
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        db = next(get_session())
        metadata_index.build(db)
        db.close()
    except Exception as e:
        logger.warning("metadata_index não carregado (fallback para cache): %s", e)
    logger.info("MindFlow API pronta")
    yield


app = FastAPI(title="MindFlow API", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)
cors_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000")
allow_origins = [o.strip() for o in cors_str.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'"  # noqa: E501
        return response

app.add_middleware(SecurityHeadersMiddleware)

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method in ("POST", "PATCH", "DELETE") and request.url.path.startswith("/api/"):
            path = request.url.path
            skip_prefixes = ("/api/search", "/api/import", "/api/shutdown", "/api/export", "/api/attachments", "/api/auth", "/api/db/backup")
            if not any(path.startswith(p) for p in skip_prefixes):
                client_key = request.client.host if request.client else "unknown"
                crud_limiter.check(client_key)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)

app.include_router(inbox.router, prefix="/api/inbox", tags=["Inbox"])
app.include_router(habitos.router, prefix="/api/habitos", tags=["Hábitos"])
app.include_router(rotina.router, prefix="/api/rotina", tags=["Rotina"])
app.include_router(pomodoro.router, prefix="/api/pomodoro", tags=["Pomodoro"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(tipos.router, prefix="/api/tipos", tags=["Tipos"])
app.include_router(queries.router, prefix="/api/queries", tags=["Queries"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(import_data.router, prefix="/api/import", tags=["Import"])
app.include_router(logs.router, prefix="/api/logs", tags=["Logs"])
app.include_router(shutdown.router, prefix="/api", tags=["Shutdown"])
app.include_router(stats.router, prefix="/api", tags=["Stats"])
app.include_router(search.router, prefix="/api", tags=["Search"])

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    err_msg = str(exc.orig or "")
    if "FOREIGN KEY" in err_msg:
        status, detail = 409, "Item possui vínculos ativos. Remova-os antes de excluir."
    elif "UNIQUE" in err_msg:
        status, detail = 409, "Já existe um item com este nome."
    else:
        status, detail = 500, "Erro interno do servidor"
    logger.warning("[IntegrityError] %s %s: %s", request.method, request.url.path, err_msg)
    return JSONResponse(status_code=status, content={"detail": detail})

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    return JSONResponse(status_code=404, content={"detail": exc.detail})

@app.exception_handler(ConflictException)
async def conflict_handler(request: Request, exc: ConflictException):
    return JSONResponse(status_code=409, content={"detail": exc.detail})

@app.exception_handler(BadRequestException)
async def bad_request_handler(request: Request, exc: BadRequestException):
    return JSONResponse(status_code=400, content={"detail": exc.detail})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Exceção não tratada em %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})

@app.get("/api/health")
def health():
    return {"status": "ok"}

ALLOWED_EXTENSIONS = frozenset({'png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf'})

@app.post("/api/attachments/upload")
async def upload_attachment(file: UploadFile = File(...), _rl: None = Depends(attachments_limiter)):
    ext = (file.filename or '').rsplit('.', 1)[-1].lower() if file.filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Tipo de arquivo não permitido. Permitidos: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    contents = await file.read()
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(status_code=400, detail=f"Arquivo excede limite de {MAX_ATTACHMENT_SIZE // (1024*1024)}MB")
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    dest = ATTACHMENTS_DIR / unique_name
    dest.write_bytes(contents)
    return {"url": f"/api/attachments/{unique_name}", "nome_original": file.filename, "tamanho": len(contents)}

@app.get("/api/attachments/{filepath:path}")
def get_attachment(filepath: str):
    full = (ATTACHMENTS_DIR / filepath).resolve()
    if not str(full).startswith(str(ATTACHMENTS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Acesso negado")
    if not full.exists() or not full.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(str(full), media_type=None, headers={"Cache-Control": "public, max-age=31536000"})

@app.delete("/api/attachments/{filepath:path}")
def delete_attachment(filepath: str):
    full = (ATTACHMENTS_DIR / filepath).resolve()
    if not str(full).startswith(str(ATTACHMENTS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Acesso negado")
    if not full.exists() or not full.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    full.unlink()
    return {"ok": True}

@app.get("/api/backup/mobility")
def mobility_backup(r: Request):
    from routers.export import _generate_portability_pack
    zip_path = _generate_portability_pack()
    filename = f"mindflow-backup-{Path(zip_path).stem}.mindflow"
    return FileResponse(str(zip_path), media_type="application/zip", filename=filename, headers={"Content-Disposition": f"attachment; filename={filename}"})

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as e:
            if e.status_code == 404:
                if Path(path).suffix:
                    raise
                index = Path(self.directory) / "index.html"
                if index.exists():
                    return FileResponse(str(index), media_type="text/html")
            raise

if FRONTEND_DIST.exists():
    app.mount("/", SPAStaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
