"""add favoritado to nota

Revision ID: 0703dc203e19
Revises: fac6c867ba98
Create Date: 2026-06-12 22:24:28.912140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0703dc203e19'
down_revision: Union[str, Sequence[str], None] = 'fac6c867ba98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notas', sa.Column('favoritado', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('notas', 'favoritado')
