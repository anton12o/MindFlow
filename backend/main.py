import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import run_migrations, setup_fts
from routers import inbox, habitos, rotina, pomodoro, notas, flashcards, tipos, queries, export, import_data
from seed import seed_db

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="MindFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGINS", "http://localhost:5173")],
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

@app.on_event("startup")
def on_startup():
    logger.info("Iniciando MindFlow API...")
    run_migrations()
    setup_fts()
    try:
        seed_db()
    except Exception as e:
        logger.warning("Seed não executado (banco já existente?): %s", e)
    logger.info("MindFlow API pronta")

@app.get("/api/health")
def health():
    return {"status": "ok"}
