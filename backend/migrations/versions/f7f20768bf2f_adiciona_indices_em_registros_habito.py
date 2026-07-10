"""adiciona indice FK em registros_habito.habito_id

Revision ID: f7f20768bf2f
Revises: 1762b063ef06
Create Date: 2026-06-29 07:53:21.926252

"""
from collections.abc import Sequence

from alembic import op

revision: str = 'f7f20768bf2f'
down_revision: str | Sequence[str] | None = '1762b063ef06'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(op.f('ix_registros_habito_habito_id'), 'registros_habito', ['habito_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_registros_habito_habito_id'), table_name='registros_habito')
