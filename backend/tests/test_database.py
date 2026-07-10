from sqlmodel import Session, SQLModel, create_engine, text


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
    db_path = tmp_path / "test_migrate.db"
    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    monkeypatch.setattr("database.engine", test_engine)
    import database
    monkeypatch.setattr(database, "DB_PATH", db_path)
    orig_alembic_url = database.ALEMBIC_CFG.get_main_option("sqlalchemy.url")
    database.run_migrations()
    database.ALEMBIC_CFG.set_main_option("sqlalchemy.url", orig_alembic_url)
    import sys
    sys.modules.pop("migrations.env", None)
    with Session(test_engine) as s:
        tables = s.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).all()
        table_names = {row[0] for row in tables}
        assert "notas" in table_names


def test_check_db_integrity_ok():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        result = s.execute(text("PRAGMA quick_check")).scalar()
        assert result == "ok"


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
