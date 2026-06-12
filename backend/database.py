import logging
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect, event
from sqlalchemy.exc import OperationalError
from pathlib import Path
from alembic.config import Config
from alembic import command

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "mindflow.db"
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-40000")
    cursor.execute("PRAGMA temp_store=MEMORY")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()

ALEMBIC_CFG = Config(Path(__file__).parent / "alembic.ini")
ALEMBIC_CFG.set_main_option("sqlalchemy.url", str(engine.url))

def run_migrations():
    try:
        if not DB_PATH.exists():
            logger.info("Banco não encontrado — criando via migrations")
            command.upgrade(ALEMBIC_CFG, "head")
        else:
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            if "alembic_version" not in tables and tables:
                logger.info("Banco existente sem controle de versão — estampando como head")
                command.stamp(ALEMBIC_CFG, "head")
            command.upgrade(ALEMBIC_CFG, "head")
        logger.info("Migrations aplicadas com sucesso")
    except Exception as e:
        logger.error("Erro ao executar migrations: %s", e)
        raise

def setup_fts():
    try:
        with Session(engine) as session:
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
            logger.info("FTS5 configurado com sucesso")
    except Exception as e:
        logger.error("Erro ao configurar FTS5: %s", e)
        raise

def get_session():
    with Session(engine) as session:
        yield session
