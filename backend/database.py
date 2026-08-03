import logging
import os
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import event, inspect, text
from sqlmodel import Session, SQLModel, create_engine

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
        except Exception as e:
            logger.warning("PRAGMA falhou: %s — %s", p, e)
    try:
        cursor.execute("PRAGMA auto_vacuum=INCREMENTAL")
        cursor.execute("PRAGMA incremental_vacuum(100)")
    except Exception as e:
        logger.warning("auto_vacuum falhou: %s", e)
    try:
        cursor.execute("PRAGMA mmap_size=268435456")
    except Exception as e:
        logger.warning("mmap_size falhou: %s", e)
    JOURNAL_MODES = frozenset({"WAL", "DELETE", "TRUNCATE", "PERSIST", "MEMORY", "OFF"})
    journal = os.environ.get("MFLOW_JOURNAL_MODE", "WAL")
    if journal not in JOURNAL_MODES:
        logger.warning("MFLOW_JOURNAL_MODE inválido: '%s', usando WAL", journal)
        journal = "WAL"
    if journal != "WAL":
        try:
            cursor.execute(f"PRAGMA journal_mode={journal}")
        except Exception as e:
            logger.warning("journal_mode=%s falhou: %s", journal, e)
    cursor.close()

ALEMBIC_CFG = Config(Path(__file__).parent / "alembic.ini")
ALEMBIC_CFG.set_main_option("sqlalchemy.url", str(engine.url))


def run_migrations():
    try:
        import models  # noqa: F401  — registra todas as tabelas no SQLModel.metadata

        if not DB_PATH.exists():
            logger.info("Banco novo — criando via metadata")
            SQLModel.metadata.create_all(engine)
            _stamp_head()
            logger.info("Banco criado com sucesso")
            return

        with engine.connect() as conn:
            inspector = inspect(conn)
            existing_tables = set(inspector.get_table_names())

            for table in SQLModel.metadata.sorted_tables:
                if table.name not in existing_tables:
                    table.create(conn)
                    logger.info("Tabela criada: %s", table.name)
                    existing_tables.add(table.name)
                else:
                    existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
                    for col in table.columns:
                        if col.name not in existing_cols:
                            col_type = col.type.compile(conn.dialect)
                            nullable = "" if col.nullable else "NOT NULL"
                            default_clause = ""
                            if col.server_default is not None:
                                raw = col.server_default.arg
                                if hasattr(raw, "text"):
                                    default_clause = f"DEFAULT {raw.text}"
                                elif isinstance(raw, str) and raw.startswith("'"):
                                    default_clause = f"DEFAULT {raw}"
                                else:
                                    default_clause = f"DEFAULT '{raw}'" if isinstance(raw, str) else f"DEFAULT {raw}"
                            sql = " ".join(p for p in [f"ALTER TABLE {table.name} ADD COLUMN {col.name} {col_type}", nullable, default_clause] if p)
                            conn.execute(text(sql))
                            logger.info("Coluna adicionada: %s.%s (%s)", table.name, col.name, col_type)
            conn.commit()

        _ensure_indexes()
        _stamp_head()
        logger.info("Schema verificado e completo")
    except Exception as e:
        logger.error("Erro ao executar migrations: %s", e)
        raise


def _ensure_indexes():
    for table in SQLModel.metadata.sorted_tables:
        for index in table.indexes:
            try:
                index.create(engine, checkfirst=True)
            except Exception as e:
                logger.warning("Indice %s.%s nao pode ser criado: %s", table.name, index.name, e)


def _stamp_head():
    try:
        from alembic.script import ScriptDirectory
        script = ScriptDirectory.from_config(ALEMBIC_CFG)
        head = script.get_current_head()
        if head:
            command.stamp(ALEMBIC_CFG, head)
    except Exception as e:
        logger.warning("Alembic stamp falhou: %s", e)

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
