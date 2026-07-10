"""adiciona campo ordem em tarefas

Revision ID: 028031cf4f6a
Revises: a9b24c88e884
Create Date: 2026-06-30 11:58:58.125883

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '028031cf4f6a'
down_revision: Union[str, Sequence[str], None] = 'a9b24c88e884'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tarefas', sa.Column('ordem', sa.Integer(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('tarefas', 'ordem')
