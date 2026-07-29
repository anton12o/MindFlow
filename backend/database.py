import logging
import os
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import event, inspect, text
from sqlmodel import Session, create_engine

logger = logging.getLogger(__name__)

DB_PATH = Path(os.environ.get("MFLOW_DB_PATH", str(Path(__file__).parent / "mindflow.db")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    pragmas = [
        "PRAGMA foreign_keys=ON",
        "PRAGMA journal_mode=WAL",
        "PRAGMA synchronous=NORMAL",
        "PRAGMA cache_size=-40000",
        "PRAGMA temp_store=MEMORY",
        "PRAGMA busy_timeout=5000",
    ]
    for p in pragmas:
        try:
            cursor.execute(p)
        except Exception:
            pass
    try:
        cursor.execute("PRAGMA auto_vacuum=INCREMENTAL")
        cursor.execute("PRAGMA incremental_vacuum(100)")
    except Exception:
        pass
    try:
        cursor.execute("PRAGMA mmap_size=268435456")
    except Exception:
        pass
    JOURNAL_MODES = frozenset({"WAL", "DELETE", "TRUNCATE", "PERSIST", "MEMORY", "OFF"})
    journal = os.environ.get("MFLOW_JOURNAL_MODE", "WAL")
    if journal not in JOURNAL_MODES:
        logger.warning("MFLOW_JOURNAL_MODE inválido: '%s', usando WAL", journal)
        journal = "WAL"
    if journal != "WAL":
        try:
            cursor.execute(f"PRAGMA journal_mode={journal}")
        except Exception:
            pass
    cursor.close()

ALEMBIC_CFG = Config(Path(__file__).parent / "alembic.ini")
ALEMBIC_CFG.set_main_option("sqlalchemy.url", str(engine.url))


def _column_exists(conn, table, column):
    try:
        conn.execute(text(f"SELECT {column} FROM {table} LIMIT 0"))
        return True
    except Exception:
        return False


def _critical_columns_exist():
    cols = [
        ("notas", "ordem"),
        ("tarefas", "quadrante"),
        ("notas", "acessos"),
    ]
    try:
        with engine.connect() as conn:
            for table, column in cols:
                if not _column_exists(conn, table, column):
                    return False
        return True
    except Exception:
        return False


def _repair_migrations():
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(ALEMBIC_CFG)
    base_rev = script.get_base()
    if not base_rev:
        return False

    # Tentativa 1: drop + upgrade (banco novo ou sem tabelas existentes)
    logger.info("Reparo: drop + upgrade (1/3)")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    try:
        command.upgrade(ALEMBIC_CFG, "head")
        return True
    except Exception:
        pass

    # Tentativa 2: stamp base + upgrade (alem_bic sabe que tabelas existem)
    logger.info("Reparo: stamp base + upgrade (2/3)")
    command.stamp(ALEMBIC_CFG, base_rev)
    try:
        command.upgrade(ALEMBIC_CFG, "head")
        return True
    except Exception:
        pass

    # Tentativa 3: adiciona colunas faltantes via SQL direto + stamp head
    logger.info("Reparo: colunas direto + stamp head (3/3)")
    with engine.connect() as conn:
        if not _column_exists(conn, "notas", "ordem"):
            conn.execute(text("ALTER TABLE notas ADD COLUMN ordem INTEGER DEFAULT 0"))
        if not _column_exists(conn, "tarefas", "quadrante"):
            conn.execute(text("ALTER TABLE tarefas ADD COLUMN quadrante VARCHAR DEFAULT ''"))
        if not _column_exists(conn, "notas", "acessos"):
            conn.execute(text("ALTER TABLE notas ADD COLUMN acessos INTEGER DEFAULT 0"))
        conn.commit()

    head_rev = script.get_current_head()
    if head_rev:
        command.stamp(ALEMBIC_CFG, head_rev)
    return _critical_columns_exist()


def run_migrations():
    try:
        if not DB_PATH.exists():
            logger.info("Banco não encontrado — criando via migrations")
            command.upgrade(ALEMBIC_CFG, "head")
            logger.info("Migrations aplicadas com sucesso")
            return

        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if not tables:
            command.upgrade(ALEMBIC_CFG, "head")
            logger.info("Migrations aplicadas com sucesso")
            return

        if "alembic_version" not in tables:
            logger.info("Banco existente sem versionamento — reparando")
            if not _repair_migrations():
                raise RuntimeError("Falha ao reparar migrations")
            logger.info("Migrations aplicadas com sucesso")
            return

        try:
            command.upgrade(ALEMBIC_CFG, "head")
        except Exception as e:
            logger.warning("Upgrade normal falhou: %s — reparando", e)
            if not _repair_migrations():
                raise
            logger.info("Migrations aplicadas com sucesso (reparo pós-falha)")
            return

        if not _critical_columns_exist():
            logger.warning("Schema inconsistente com versionamento — reparando")
            if not _repair_migrations():
                raise RuntimeError("Falha ao reparar schema inconsistente")
            logger.info("Migrations aplicadas com sucesso (reparo schema)")
            return

        logger.info("Migrations aplicadas com sucesso")
    except Exception as e:
        logger.error("Erro ao executar migrations: %s", e)
        raise

def check_db_integrity():
    try:
        with Session(engine) as session:
            result = session.execute(text("PRAGMA quick_check")).scalar()
            if result and result != "ok":
                logger.error("Banco de dados corrompido: %s", result)
                sys.exit(1)
            logger.info("Integrity check: OK")
    except Exception as e:
        logger.error("Não foi possível verificar integridade do banco: %s", e)
        sys.exit(1)

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
            fts_count = session.execute(text("SELECT COUNT(*) FROM notas_fts")).scalar()
            nota_count = session.execute(text("SELECT COUNT(*) FROM notas")).scalar()
            if fts_count != nota_count:
                session.execute(text("INSERT INTO notas_fts(notas_fts) VALUES('rebuild')"))
            session.commit()
            logger.info("FTS5 configurado com sucesso")
    except Exception as e:
        logger.error("Erro ao configurar FTS5: %s", e)
        raise

def get_session():
    with Session(engine) as session:
        yield session
