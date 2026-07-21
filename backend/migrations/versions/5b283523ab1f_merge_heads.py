"""merge heads

Revision ID: 5b283523ab1f
Revises: 2cff00bbf798, a0b1c2d3e4f5
Create Date: 2026-07-14 02:18:55.607263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b283523ab1f'
down_revision: Union[str, Sequence[str], None] = ('2cff00bbf798', 'a0b1c2d3e4f5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
