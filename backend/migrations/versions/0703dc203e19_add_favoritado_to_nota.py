"""add favoritado to nota

Revision ID: 0703dc203e19
Revises: fac6c867ba98
Create Date: 2026-06-12 22:24:28.912140

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0703dc203e19'
down_revision: str | Sequence[str] | None = 'fac6c867ba98'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('notas', sa.Column('favoritado', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('notas', 'favoritado')
