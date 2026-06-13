import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from database import run_migrations, setup_fts
from routers import inbox, habitos, rotina, pomodoro, notas, flashcards, tipos, queries, export, import_data, logs
from seed import seed_db
from logging_config import setup_logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Iniciando MindFlow API...")
    run_migrations()
    setup_fts()
    try:
        seed_db()
    except Exception as e:
        logger.warning("Seed não executado (banco já existente?): %s", e)
    logger.info("MindFlow API pronta")
    yield


app = FastAPI(title="MindFlow API", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Exceção não tratada em %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})

@app.get("/api/health")
def health():
    return {"status": "ok"}
