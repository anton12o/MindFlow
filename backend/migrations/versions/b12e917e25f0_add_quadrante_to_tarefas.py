"""add_quadrante_to_tarefas

Revision ID: b12e917e25f0
Revises: 9baed551c9f9
Create Date: 2026-07-14 03:52:17.907965

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision: str = 'b12e917e25f0'
down_revision: Union[str, Sequence[str], None] = '9baed551c9f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tarefas', sa.Column('quadrante', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='agendar'))


def downgrade() -> None:
    op.drop_column('tarefas', 'quadrante')
