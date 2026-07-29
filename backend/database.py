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


def _schema_ok():
    with engine.connect() as conn:
        checks = [
            ("notas", "ordem"), ("notas", "cover_url"), ("notas", "favoritado"),
            ("notas", "acessos"), ("notas", "ultimo_acesso"),
            ("tarefas", "quadrante"), ("tarefas", "descricao"),
            ("tarefas", "recorrente"), ("tarefas", "recorrencia_tipo"),
            ("tarefas", "recorrencia_intervalo"), ("tarefas", "total_foco_min"),
            ("tarefas", "ordem"),
            ("habitos", "dias_semana"), ("habitos", "ordem"),
            ("flashcards", "categoria"),
            ("templates", "engine"),
        ]
        for table, column in checks:
            if not _column_exists(conn, table, column):
                return False
        tables = {r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()}
        if "versoes_nota" not in tables:
            return False
    return True


def _patch_schema():
    with engine.connect() as conn:
        patches = [
            ("notas", "ordem", "INTEGER DEFAULT 0"),
            ("notas", "cover_url", "VARCHAR"),
            ("notas", "favoritado", "BOOLEAN DEFAULT 0"),
            ("notas", "acessos", "INTEGER DEFAULT 0"),
            ("notas", "ultimo_acesso", "VARCHAR"),
            ("tarefas", "quadrante", "VARCHAR DEFAULT ''"),
            ("tarefas", "descricao", "VARCHAR DEFAULT ''"),
            ("tarefas", "recorrente", "BOOLEAN DEFAULT 0"),
            ("tarefas", "recorrencia_tipo", "VARCHAR"),
            ("tarefas", "recorrencia_intervalo", "INTEGER DEFAULT 1"),
            ("tarefas", "total_foco_min", "INTEGER DEFAULT 0"),
            ("tarefas", "ordem", "INTEGER DEFAULT 0"),
            ("habitos", "dias_semana", "VARCHAR"),
            ("habitos", "ordem", "INTEGER DEFAULT 0"),
            ("flashcards", "categoria", "VARCHAR"),
            ("templates", "engine", "VARCHAR DEFAULT 'simple'"),
        ]
        for table, col, dtype in patches:
            if not _column_exists(conn, table, col):
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))

        tables = {r[0] for r in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()}
        if "versoes_nota" not in tables:
            conn.execute(text("""
                CREATE TABLE versoes_nota (
                    id INTEGER NOT NULL PRIMARY KEY,
                    nota_id INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
                    versao INTEGER NOT NULL,
                    titulo VARCHAR NOT NULL,
                    conteudo VARCHAR NOT NULL,
                    propriedades TEXT,
                    criado_em VARCHAR NOT NULL
                )
            """))
        conn.commit()

    for stmt in [
        "CREATE INDEX IF NOT EXISTS ix_notas_atualizado_em ON notas(atualizado_em)",
        "CREATE INDEX IF NOT EXISTS ix_notas_criado_em ON notas(criado_em)",
        "CREATE INDEX IF NOT EXISTS ix_notas_pasta_id ON notas(pasta_id)",
        "CREATE INDEX IF NOT EXISTS ix_notas_tipo_id ON notas(tipo_id)",
        "CREATE INDEX IF NOT EXISTS ix_notas_ultimo_acesso ON notas(ultimo_acesso)",
        "CREATE INDEX IF NOT EXISTS ix_notas_acessos ON notas(acessos)",
        "CREATE INDEX IF NOT EXISTS ix_notas_titulo ON notas(titulo)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_proxima_revisao ON flashcards(proxima_revisao)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_nota_id ON flashcards(nota_id)",
        "CREATE INDEX IF NOT EXISTS ix_tarefas_data ON tarefas(data)",
        "CREATE INDEX IF NOT EXISTS ix_tarefas_criado_em ON tarefas(criado_em)",
        "CREATE INDEX IF NOT EXISTS ix_tarefas_data_status ON tarefas(data, status)",
        "CREATE INDEX IF NOT EXISTS ix_tarefas_bloco_id ON tarefas(bloco_id)",
        "CREATE INDEX IF NOT EXISTS ix_tarefas_tipo_id ON tarefas(tipo_id)",
        "CREATE INDEX IF NOT EXISTS ix_registros_habito_data ON registros_habito(data)",
        "CREATE INDEX IF NOT EXISTS ix_registros_habito_habito_data ON registros_habito(habito_id, data)",
        "CREATE INDEX IF NOT EXISTS ix_registros_habito_habito_id ON registros_habito(habito_id)",
        "CREATE INDEX IF NOT EXISTS ix_blocos_rotina_data_especifica ON blocos_rotina(data_especifica)",
        "CREATE INDEX IF NOT EXISTS ix_inbox_criado_em ON inbox(criado_em)",
        "CREATE INDEX IF NOT EXISTS ix_inbox_arquivado ON inbox(arquivado)",
        "CREATE INDEX IF NOT EXISTS ix_inbox_arquivado_criado_em ON inbox(arquivado, criado_em)",
        "CREATE INDEX IF NOT EXISTS ix_sessoes_pomodoro_iniciado_em ON sessoes_pomodoro(iniciado_em)",
        "CREATE INDEX IF NOT EXISTS ix_sessoes_pomodoro_finalizado_em ON sessoes_pomodoro(finalizado_em)",
        "CREATE INDEX IF NOT EXISTS ix_sessoes_pomodoro_resumo_nota_id ON sessoes_pomodoro(resumo_nota_id)",
        "CREATE INDEX IF NOT EXISTS ix_conexoes_notas_nota_origem_id ON conexoes_notas(nota_origem_id)",
        "CREATE INDEX IF NOT EXISTS ix_conexoes_notas_nota_destino_id ON conexoes_notas(nota_destino_id)",
        "CREATE INDEX IF NOT EXISTS ix_versoes_nota_nota_id ON versoes_nota(nota_id)",
        "CREATE INDEX IF NOT EXISTS ix_notas_tags_nota_id ON notas_tags(nota_id)",
        "CREATE INDEX IF NOT EXISTS ix_notas_tags_tag_id ON notas_tags(tag_id)",
        "CREATE INDEX IF NOT EXISTS ix_pastas_pai_id ON pastas(pai_id)",
        "CREATE INDEX IF NOT EXISTS ix_queries_salvas_tipo_objeto_id ON queries_salvas(tipo_objeto_id)",
        "CREATE INDEX IF NOT EXISTS ix_habitos_ativo ON habitos(ativo)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_nome ON tags(nome)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_versao_nota ON versoes_nota(nota_id, versao)",
    ]:
        with engine.connect() as conn:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass


def _repair_migrations():
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(ALEMBIC_CFG)
    base_rev = script.get_base()
    if not base_rev:
        return False

    logger.info("Reparo: drop + upgrade (1/2)")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    try:
        command.upgrade(ALEMBIC_CFG, "head")
        return True
    except Exception:
        pass

    logger.info("Reparo: stamp base=%s + upgrade (2/2)", base_rev[:8])
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    command.stamp(ALEMBIC_CFG, base_rev)
    try:
        command.upgrade(ALEMBIC_CFG, "head")
        return True
    except Exception as e:
        logger.warning("Falha upgrade a partir da base: %s", e)

    logger.info("Reparo: patch direto de colunas + stamp head")
    _patch_schema()
    head_rev = script.get_current_head()
    if head_rev:
        command.stamp(ALEMBIC_CFG, head_rev)
    return _schema_ok()


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

        if not _schema_ok():
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
