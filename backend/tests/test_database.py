import sqlalchemy
from sqlmodel import Session, SQLModel, create_engine, text

from models import Nota


def _engine_and_path(tmp_path):
    db_path = tmp_path / "test_migrate.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    @sqlalchemy.event.listens_for(engine, "connect")
    def _set_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    SQLModel.metadata.create_all(engine)
    return engine, db_path


def test_setup_fts_cria_tabela_e_triggers():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(
                titulo, conteudo, content='notas', content_rowid='id',
                tokenize='porter unicode61'
            )
        """))
        s.execute(text("""
            CREATE TRIGGER IF NOT EXISTS notas_ai AFTER INSERT ON notas BEGIN
                INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
            END
        """))
        s.commit()
        tables = [row[0] for row in s.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).all()]
        assert "notas_fts" in tables
        triggers = [row[0] for row in s.execute(text("SELECT name FROM sqlite_master WHERE type='trigger'")).all()]
        assert "notas_ai" in triggers


def test_run_migrations_cria_tabelas(tmp_path, monkeypatch):
    engine, db_path = _engine_and_path(tmp_path)
    monkeypatch.setattr("database.engine", engine)
    import database
    monkeypatch.setattr(database, "DB_PATH", db_path)
    orig_alembic_url = database.ALEMBIC_CFG.get_main_option("sqlalchemy.url")
    database.run_migrations()
    database.ALEMBIC_CFG.set_main_option("sqlalchemy.url", orig_alembic_url)
    import sys
    sys.modules.pop("migrations.env", None)
    with Session(engine) as s:
        tables = s.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).all()
        table_names = {row[0] for row in tables}
        assert "notas" in table_names


def test_run_migrations_adiciona_colunas_ausentes(tmp_path, monkeypatch):
    db_path = tmp_path / "test_add_columns.db"
    old_cols = ["id", "titulo", "conteudo", "criado_em", "atualizado_em"]
    import sqlite3
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys=ON")
    col_defs = ", ".join(f"{c} TEXT" for c in old_cols)
    conn.execute(f"CREATE TABLE notas ({col_defs})")
    conn.commit()
    conn.close()
    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    @sqlalchemy.event.listens_for(test_engine, "connect")
    def _set_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    monkeypatch.setattr("database.engine", test_engine)
    import database
    monkeypatch.setattr(database, "DB_PATH", db_path)
    orig_alembic_url = database.ALEMBIC_CFG.get_main_option("sqlalchemy.url")
    database.run_migrations()
    database.ALEMBIC_CFG.set_main_option("sqlalchemy.url", orig_alembic_url)
    import sys
    sys.modules.pop("migrations.env", None)
    with Session(test_engine):
        inspector = sqlalchemy.inspect(test_engine)
        cols = {c["name"] for c in inspector.get_columns("notas")}
        assert "cover_url" in cols, "run_migrations() deveria adicionar cover_url"
        assert "ultimo_acesso" in cols, "run_migrations() deveria adicionar ultimo_acesso"


def test_ensure_indexes_cria_indices(monkeypatch):
    import database as db
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)
    db._ensure_indexes()
    with Session(engine) as s:
        indexes = [row[0] for row in s.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND name IS NOT NULL")).all()]
        assert len(indexes) > 0


def test_check_db_integrity_ok(monkeypatch):
    import database as db
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)
    db.check_db_integrity()


def test_setup_fts_function(monkeypatch):
    import database as db
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)
    db.setup_fts()
    with Session(engine) as s:
        tables = [row[0] for row in s.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).all()]
        assert "notas_fts" in tables
        triggers = [row[0] for row in s.execute(text("SELECT name FROM sqlite_master WHERE type='trigger'")).all()]
        assert "notas_ai" in triggers
        assert "notas_ad" in triggers
        assert "notas_au" in triggers


def test_setup_fts_rebuild_em_conta_desigual(monkeypatch):
    import database as db
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)
    with Session(engine) as s:
        s.execute(text("""CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(titulo, conteudo, content='notas', content_rowid='id', tokenize='porter unicode61')"""))
        s.add(Nota(titulo='teste', conteudo='conteudo'))
        s.commit()
    db.setup_fts()
    with Session(engine) as s:
        fts_count = s.execute(text("SELECT COUNT(*) FROM notas_fts")).scalar()
        nota_count = s.execute(text("SELECT COUNT(*) FROM notas")).scalar()
        assert fts_count == nota_count


def test_pragma_foreign_keys_on():
    import sqlalchemy.event
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    @sqlalchemy.event.listens_for(engine, "connect")
    def set_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        result = s.execute(text("PRAGMA foreign_keys")).scalar()
        assert result == 1


def test_mobility_backup_endpoint(client):
    resp = client.get("/api/backup/mobility")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert "mindflow-backup-" in resp.headers.get("content-disposition", "")
    assert len(resp.content) > 0


def test_get_session_yields_working_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    def _get_session():
        with Session(engine) as s:
            yield s
    gen = _get_session()
    session = next(gen)
    assert session is not None
    result = session.execute(text("SELECT 1")).scalar()
    assert result == 1
    try:
        next(gen)
    except StopIteration:
        pass
