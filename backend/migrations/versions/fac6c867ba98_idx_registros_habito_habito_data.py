"""idx_registros_habito_habito_data

Revision ID: fac6c867ba98
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12 18:29:11.934987

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'fac6c867ba98'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_registros_habito_habito_data', 'registros_habito', ['habito_id', 'data'])


def downgrade() -> None:
    op.drop_index('ix_registros_habito_habito_data')
