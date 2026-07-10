"""add_categoria_to_flashcards

Revision ID: e6ef7aed8b4e
Revises: c3ad593deac5
Create Date: 2026-06-22 12:31:26.661790

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = 'e6ef7aed8b4e'
down_revision: str | Sequence[str] | None = 'c3ad593deac5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('flashcards', sa.Column('categoria', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade() -> None:
    op.drop_column('flashcards', 'categoria')
