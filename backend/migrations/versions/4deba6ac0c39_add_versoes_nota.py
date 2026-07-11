"""add_versoes_nota

Revision ID: 4deba6ac0c39
Revises: 7347f5633c25
Create Date: 2026-07-10 23:39:58.514478

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4deba6ac0c39'
down_revision: Union[str, Sequence[str], None] = '7347f5633c25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('versoes_nota',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nota_id', sa.Integer(), nullable=False),
        sa.Column('versao', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(), nullable=False),
        sa.Column('conteudo', sa.String(), nullable=False),
        sa.Column('propriedades', sa.JSON(), nullable=True),
        sa.Column('criado_em', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['nota_id'], ['notas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_versoes_nota_nota_id'), 'versoes_nota', ['nota_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_versoes_nota_nota_id'), table_name='versoes_nota')
    op.drop_table('versoes_nota')
