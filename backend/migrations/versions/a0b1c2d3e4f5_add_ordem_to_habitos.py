"""add ordem to habitos

Revision ID: a0b1c2d3e4f5
Revises: fb94e7a2d5b1
Create Date: 2026-07-14 01:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'a0b1c2d3e4f5'
down_revision: str | None = 'fb94e7a2d5b1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('habitos', sa.Column('ordem', sa.Integer(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('habitos', 'ordem')
