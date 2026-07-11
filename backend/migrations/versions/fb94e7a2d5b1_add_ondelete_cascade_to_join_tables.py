"""add_ondelete_cascade_to_join_tables

Revision ID: fb94e7a2d5b1
Revises: 4deba6ac0c39
Create Date: 2026-07-11 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'fb94e7a2d5b1'
down_revision: str | Sequence[str] | None = '4deba6ac0c39'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Recreate notas_tags with ON DELETE CASCADE
    op.execute("""
        CREATE TABLE notas_tags_new (
            nota_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (nota_id, tag_id),
            FOREIGN KEY (nota_id) REFERENCES notas(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    """)
    op.execute("INSERT INTO notas_tags_new SELECT nota_id, tag_id FROM notas_tags")
    op.execute("DROP TABLE notas_tags")
    op.execute("ALTER TABLE notas_tags_new RENAME TO notas_tags")
    op.create_index(op.f('ix_notas_tags_nota_id'), 'notas_tags', ['nota_id'], unique=False)
    op.create_index(op.f('ix_notas_tags_tag_id'), 'notas_tags', ['tag_id'], unique=False)

    # Recreate conexoes_notas with ON DELETE CASCADE
    op.execute("""
        CREATE TABLE conexoes_notas_new (
            id INTEGER NOT NULL,
            nota_origem_id INTEGER NOT NULL,
            nota_destino_id INTEGER NOT NULL,
            tipo VARCHAR NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY (nota_origem_id) REFERENCES notas(id) ON DELETE CASCADE,
            FOREIGN KEY (nota_destino_id) REFERENCES notas(id) ON DELETE CASCADE,
            UNIQUE (nota_origem_id, nota_destino_id, tipo)
        )
    """)
    op.execute("INSERT INTO conexoes_notas_new SELECT id, nota_origem_id, nota_destino_id, tipo FROM conexoes_notas")
    op.execute("DROP TABLE conexoes_notas")
    op.execute("ALTER TABLE conexoes_notas_new RENAME TO conexoes_notas")
    op.create_index(op.f('ix_conexoes_notas_nota_origem_id'), 'conexoes_notas', ['nota_origem_id'], unique=False)
    op.create_index(op.f('ix_conexoes_notas_nota_destino_id'), 'conexoes_notas', ['nota_destino_id'], unique=False)


def downgrade() -> None:
    # Restore notas_tags without ON DELETE CASCADE
    op.execute("""
        CREATE TABLE notas_tags_old (
            nota_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (nota_id, tag_id),
            FOREIGN KEY (nota_id) REFERENCES notas(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        )
    """)
    op.execute("INSERT INTO notas_tags_old SELECT nota_id, tag_id FROM notas_tags")
    op.execute("DROP TABLE notas_tags")
    op.execute("ALTER TABLE notas_tags_old RENAME TO notas_tags")
    op.create_index(op.f('ix_notas_tags_nota_id'), 'notas_tags', ['nota_id'], unique=False)
    op.create_index(op.f('ix_notas_tags_tag_id'), 'notas_tags', ['tag_id'], unique=False)

    # Restore conexoes_notas without ON DELETE CASCADE
    op.execute("""
        CREATE TABLE conexoes_notas_old (
            id INTEGER NOT NULL,
            nota_origem_id INTEGER NOT NULL,
            nota_destino_id INTEGER NOT NULL,
            tipo VARCHAR NOT NULL,
            PRIMARY KEY (id),
            FOREIGN KEY (nota_origem_id) REFERENCES notas(id),
            FOREIGN KEY (nota_destino_id) REFERENCES notas(id),
            UNIQUE (nota_origem_id, nota_destino_id, tipo)
        )
    """)
    op.execute("INSERT INTO conexoes_notas_old SELECT id, nota_origem_id, nota_destino_id, tipo FROM conexoes_notas")
    op.execute("DROP TABLE conexoes_notas")
    op.execute("ALTER TABLE conexoes_notas_old RENAME TO conexoes_notas")
    op.create_index(op.f('ix_conexoes_notas_nota_origem_id'), 'conexoes_notas', ['nota_origem_id'], unique=False)
    op.create_index(op.f('ix_conexoes_notas_nota_destino_id'), 'conexoes_notas', ['nota_destino_id'], unique=False)
