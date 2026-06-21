import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from database import run_migrations, setup_fts, check_db_integrity
from routers import inbox, habitos, rotina, pomodoro, notas, flashcards, tipos, queries, export, import_data, logs, shutdown, stats
from seed import seed_db
from logging_config import setup_logging
from _version import VERSION

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

dotenv_path = Path(__file__).resolve().parent.parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)


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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Exceção não tratada em %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})

@app.get("/api/health")
def health():
    return {"status": "ok"}

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
