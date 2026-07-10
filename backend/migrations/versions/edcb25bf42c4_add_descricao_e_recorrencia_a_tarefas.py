"""add descricao e recorrencia a tarefas

Revision ID: edcb25bf42c4
Revises: afe0e8cdb086
Create Date: 2026-06-22 11:50:17.527084

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'edcb25bf42c4'
down_revision: str | Sequence[str] | None = 'afe0e8cdb086'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('tarefas', sa.Column('descricao', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''))
    op.add_column('tarefas', sa.Column('recorrente', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('tarefas', sa.Column('recorrencia_tipo', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('tarefas', sa.Column('recorrencia_intervalo', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    op.drop_column('tarefas', 'recorrencia_intervalo')
    op.drop_column('tarefas', 'recorrencia_tipo')
    op.drop_column('tarefas', 'recorrente')
    op.drop_column('tarefas', 'descricao')
