"""add dias_semana a habitos

Revision ID: c3ad593deac5
Revises: edcb25bf42c4
Create Date: 2026-06-22 11:55:56.024222

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3ad593deac5'
down_revision: str | Sequence[str] | None = 'edcb25bf42c4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('habitos', sa.Column('dias_semana', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade() -> None:
    op.drop_column('habitos', 'dias_semana')
