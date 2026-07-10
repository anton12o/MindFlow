"""adiciona indices em FKs e finalizado_em

Revision ID: 1762b063ef06
Revises: e6ef7aed8b4e
Create Date: 2026-06-25 22:48:05.190213

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1762b063ef06'
down_revision: Union[str, Sequence[str], None] = 'e6ef7aed8b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_conexoes_notas_nota_origem_id'), 'conexoes_notas', ['nota_origem_id'], unique=False)
    op.create_index(op.f('ix_sessoes_pomodoro_finalizado_em'), 'sessoes_pomodoro', ['finalizado_em'], unique=False)
    op.create_index(op.f('ix_sessoes_pomodoro_resumo_nota_id'), 'sessoes_pomodoro', ['resumo_nota_id'], unique=False)
    op.create_index(op.f('ix_tarefas_bloco_id'), 'tarefas', ['bloco_id'], unique=False)
    op.create_index(op.f('ix_tarefas_tipo_id'), 'tarefas', ['tipo_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tarefas_tipo_id'), table_name='tarefas')
    op.drop_index(op.f('ix_tarefas_bloco_id'), table_name='tarefas')
    op.drop_index(op.f('ix_sessoes_pomodoro_resumo_nota_id'), table_name='sessoes_pomodoro')
    op.drop_index(op.f('ix_sessoes_pomodoro_finalizado_em'), table_name='sessoes_pomodoro')
    op.drop_index(op.f('ix_conexoes_notas_nota_origem_id'), table_name='conexoes_notas')
