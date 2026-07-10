"""adiciona indices em 4 FKs sem index

Revision ID: 6dadd4200f88
Revises: f7f20768bf2f
Create Date: 2026-06-30 11:17:40.305951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6dadd4200f88'
down_revision: Union[str, Sequence[str], None] = 'f7f20768bf2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(op.f('ix_notas_tags_nota_id'), 'notas_tags', ['nota_id'], unique=False)
    op.create_index(op.f('ix_notas_tags_tag_id'), 'notas_tags', ['tag_id'], unique=False)
    op.create_index(op.f('ix_pastas_pai_id'), 'pastas', ['pai_id'], unique=False)
    op.create_index(op.f('ix_queries_salvas_tipo_objeto_id'), 'queries_salvas', ['tipo_objeto_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_queries_salvas_tipo_objeto_id'), table_name='queries_salvas')
    op.drop_index(op.f('ix_pastas_pai_id'), table_name='pastas')
    op.drop_index(op.f('ix_notas_tags_tag_id'), table_name='notas_tags')
    op.drop_index(op.f('ix_notas_tags_nota_id'), table_name='notas_tags')
