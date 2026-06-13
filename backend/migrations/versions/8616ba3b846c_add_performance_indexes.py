"""add performance indexes

Revision ID: 8616ba3b846c
Revises: c964110adec5
Create Date: 2026-06-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = '8616ba3b846c'
down_revision: Union[str, None] = 'c964110adec5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_notas_atualizado_em', 'notas', ['atualizado_em'])
    op.create_index('ix_notas_criado_em', 'notas', ['criado_em'])
    op.create_index('ix_notas_pasta_id', 'notas', ['pasta_id'])
    op.create_index('ix_flashcards_proxima_revisao', 'flashcards', ['proxima_revisao'])
    op.create_index('ix_tarefas_data', 'tarefas', ['data'])
    op.create_index('ix_tarefas_criado_em', 'tarefas', ['criado_em'])
    op.create_index('ix_registros_habito_data', 'registros_habito', ['data'])
    op.create_index('ix_blocos_rotina_data_especifica', 'blocos_rotina', ['data_especifica'])
    op.create_index('ix_inbox_criado_em', 'inbox', ['criado_em'])
    op.create_index('ix_sessoes_pomodoro_iniciado_em', 'sessoes_pomodoro', ['iniciado_em'])


def downgrade() -> None:
    op.drop_index('ix_notas_atualizado_em')
    op.drop_index('ix_notas_criado_em')
    op.drop_index('ix_notas_pasta_id')
    op.drop_index('ix_flashcards_proxima_revisao')
    op.drop_index('ix_tarefas_data')
    op.drop_index('ix_tarefas_criado_em')
    op.drop_index('ix_registros_habito_data')
    op.drop_index('ix_blocos_rotina_data_especifica')
    op.drop_index('ix_inbox_criado_em')
    op.drop_index('ix_sessoes_pomodoro_iniciado_em')
