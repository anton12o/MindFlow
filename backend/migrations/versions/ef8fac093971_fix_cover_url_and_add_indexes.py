"""fix_cover_url_and_add_indexes

Revision ID: ef8fac093971
Revises: bad764f1aafc
Create Date: 2026-06-16 21:44:20.317975

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'ef8fac093971'
down_revision: Union[str, Sequence[str], None] = 'bad764f1aafc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("notas")]
    if "cover_url" not in columns:
        op.add_column("notas", sa.Column("cover_url", sa.String(), nullable=True))
    op.create_index("ix_notas_tipo_id", "notas", ["tipo_id"])
    op.create_index("ix_flashcards_nota_id", "flashcards", ["nota_id"])
    op.create_index("ix_tarefas_data_status", "tarefas", ["data", "status"])
    op.create_index("ix_conexoes_notas_nota_destino_id", "conexoes_notas", ["nota_destino_id"])


def downgrade() -> None:
    op.drop_index("ix_conexoes_notas_nota_destino_id")
    op.drop_index("ix_tarefas_data_status")
    op.drop_index("ix_flashcards_nota_id")
    op.drop_index("ix_notas_tipo_id")
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("notas")]
    if "cover_url" in columns:
        op.drop_column("notas", "cover_url")
