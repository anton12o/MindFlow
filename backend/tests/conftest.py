import pytest
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import event, text
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from fastapi.staticfiles import StaticFiles

# Import models to register them in SQLModel.metadata before create_all
from models import (  # noqa: F401
    Nota, ConexaoNota, Tag, NotaTag, Flashcard, Tarefa, SessaoPomodoro, RegistroHabito,
    TipoObjeto, Pasta, TemplateNota, InboxItem, Habito, BlocoRotina, QuerySalva,
)

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(TEST_ENGINE, "connect")
def _set_test_pragmas(dbapi_conn, _connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(TEST_ENGINE)
    yield
    SQLModel.metadata.drop_all(TEST_ENGINE)


@pytest.fixture
def session():
    with Session(TEST_ENGINE) as s:
        yield s


@pytest.fixture
def client():
    import database as db_module
    from main import app
    from seed import seed_templates, seed_tipos

    original_engine = db_module.engine
    db_module.engine = TEST_ENGINE

    def override_get_session():
        with Session(TEST_ENGINE) as s:
            yield s

    app.dependency_overrides[db_module.get_session] = override_get_session

    # Ensure tables exist (setup_db creates them but client might run in
    # a scenario where they were dropped)
    SQLModel.metadata.create_all(TEST_ENGINE)

    # Remove StaticFiles mount (interferes with API routes in TestClient)
    from starlette.routing import Mount
    app.routes[:] = [r for r in app.routes if not (isinstance(r, Mount) and isinstance(r.app, StaticFiles))]

    # FTS5 setup (setup_db drops regular triggers each teardown)
    with Session(TEST_ENGINE) as s:
        s.execute(text("""CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(titulo, conteudo, content='notas', content_rowid='id', tokenize='porter unicode61')"""))
        s.execute(text("""CREATE TRIGGER IF NOT EXISTS notas_ai AFTER INSERT ON notas BEGIN
            INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
        END"""))
        s.execute(text("""CREATE TRIGGER IF NOT EXISTS notas_ad AFTER DELETE ON notas BEGIN
            INSERT INTO notas_fts(notas_fts, rowid, titulo, conteudo) VALUES('delete', old.id, old.titulo, old.conteudo);
        END"""))
        s.execute(text("""CREATE TRIGGER IF NOT EXISTS notas_au AFTER UPDATE ON notas BEGIN
            INSERT INTO notas_fts(notas_fts, rowid, titulo, conteudo) VALUES('delete', old.id, old.titulo, old.conteudo);
            INSERT INTO notas_fts(rowid, titulo, conteudo) VALUES (new.id, new.titulo, new.conteudo);
        END"""))
        s.commit()

    # Seed base data (setup_db creates empty tables each cycle)
    with Session(TEST_ENGINE) as s:
        seed_templates(s)
        seed_tipos(s)

    c = TestClient(app)
    yield c

    app.dependency_overrides.pop(db_module.get_session, None)
    db_module.engine = original_engine
