import pytest
from sqlmodel import SQLModel, Session, create_engine

# Import models to register them in SQLModel.metadata before create_all
from models import Nota, ConexaoNota, Tag, NotaTag, Flashcard, Tarefa, SessaoPomodoro, RegistroHabito

TEST_ENGINE = create_engine("sqlite://", connect_args={"check_same_thread": False})


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(TEST_ENGINE)
    yield
    SQLModel.metadata.drop_all(TEST_ENGINE)


@pytest.fixture
def session():
    with Session(TEST_ENGINE) as s:
        yield s
