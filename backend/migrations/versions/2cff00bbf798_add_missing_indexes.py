"""add_missing_indexes

Revision ID: 2cff00bbf798
Revises: fb94e7a2d5b1
Create Date: 2026-07-11 16:23:19.567518

"""
from typing import Sequence, Union

from alembic import op

revision: str = '2cff00bbf798'
down_revision: Union[str, Sequence[str], None] = 'fb94e7a2d5b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_notas_ultimo_acesso'), 'notas', ['ultimo_acesso'], unique=False)
    op.create_index(op.f('ix_notas_acessos'), 'notas', ['acessos'], unique=False)
    op.create_index(op.f('ix_notas_titulo'), 'notas', ['titulo'], unique=False)
    op.create_index(op.f('ix_inbox_arquivado'), 'inbox', ['arquivado'], unique=False)
    op.create_index(op.f('ix_habitos_ativo'), 'habitos', ['ativo'], unique=False)
    op.create_index('ix_inbox_arquivado_criado_em', 'inbox', ['arquivado', 'criado_em'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_inbox_arquivado_criado_em', table_name='inbox')
    op.drop_index(op.f('ix_habitos_ativo'), table_name='habitos')
    op.drop_index(op.f('ix_inbox_arquivado'), table_name='inbox')
    op.drop_index(op.f('ix_notas_titulo'), table_name='notas')
    op.drop_index(op.f('ix_notas_acessos'), table_name='notas')
    op.drop_index(op.f('ix_notas_ultimo_acesso'), table_name='notas')
