import logging
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "mindflow.db"
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

def create_db_and_tables():
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Tabelas criadas/verificadas com sucesso")
    except Exception as e:
        logger.error("Erro ao criar tabelas: %s", e)
        raise

def get_session():
    with Session(engine) as session:
        yield session
