"""adiciona total_foco_min em tarefas

Revision ID: a9b24c88e884
Revises: 6dadd4200f88
Create Date: 2026-06-30 11:17:40.305951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a9b24c88e884'
down_revision: Union[str, Sequence[str], None] = '6dadd4200f88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tarefas', sa.Column('total_foco_min', sa.Integer(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('tarefas', 'total_foco_min')
