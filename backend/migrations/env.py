import sys
from pathlib import Path

from alembic import context

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import SQLModel

import models  # noqa: F401
from database import engine

config = context.config

config.set_main_option("sqlalchemy.url", str(engine.url))

target_metadata = SQLModel.metadata


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and name.startswith("notas_fts"):
        return False
    if type_ == "table" and name == "notas_fts":
        return False
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
