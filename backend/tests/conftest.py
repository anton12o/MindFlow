import os, sys
from pathlib import Path

os.environ["CORS_ORIGINS"] = "*"
sys.path.insert(0, str(Path(__file__).parent.parent))

import tempfile
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event, text

TEST_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
TEST_DB.close()
TEST_DB_PATH = Path(TEST_DB.name)

import database
database.DB_PATH = TEST_DB_PATH
database.engine = create_engine(
    f"sqlite:///{TEST_DB_PATH}",
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

@event.listens_for(database.engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

import seed
seed.engine = database.engine

from routers import inbox, habitos, rotina, pomodoro, notas, flashcards, tipos, queries, export, import_data

app = FastAPI(title="MindFlow API Test")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/api/health")
def health():
    return {"status": "ok"}


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(database.engine)

    with Session(database.engine) as session:
        session.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(
                titulo, conteudo,
                content='notas',
                content_rowid='id',
                tokenize='porter unicode61'
            )
        """))
        session.execute(text("""
            CREATE TRIGGER IF NOT EXISTS notas_ai AFTER INSERT ON notas BEGIN
                INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
            END
        """))
        session.execute(text("""
            CREATE TRIGGER IF NOT EXISTS notas_ad AFTER DELETE ON notas BEGIN
                INSERT INTO notas_fts(notas_fts, rowid, titulo, conteudo) VALUES('delete', old.id, old.titulo, old.conteudo);
            END
        """))
        session.execute(text("""
            CREATE TRIGGER IF NOT EXISTS notas_au AFTER UPDATE ON notas BEGIN
                INSERT INTO notas_fts(notas_fts, rowid, titulo, conteudo) VALUES('delete', old.id, old.titulo, old.conteudo);
                INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
            END
        """))
        count = session.execute(text("SELECT COUNT(*) FROM notas_fts")).scalar()
        if count == 0:
            session.execute(text("INSERT INTO notas_fts(notas_fts) VALUES('rebuild')"))
        session.commit()

    from seed import seed_db
    seed_db()

    yield

    with Session(database.engine) as session:
        session.execute(text("PRAGMA foreign_keys=OFF"))
        for table in reversed(SQLModel.metadata.sorted_tables):
            session.execute(text(f"DELETE FROM {table.name}"))
        session.execute(text("PRAGMA foreign_keys=ON"))
        session.commit()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def pytest_unconfigure():
    try:
        TEST_DB_PATH.unlink(missing_ok=True)
    except PermissionError:
        import time
        time.sleep(0.5)
        try:
            TEST_DB_PATH.unlink(missing_ok=True)
        except PermissionError:
            pass
