"""add unique constraint versao_nota

Revision ID: 9baed551c9f9
Revises: 5b283523ab1f
Create Date: 2026-07-14 03:10:27.537897

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9baed551c9f9'
down_revision: Union[str, Sequence[str], None] = '5b283523ab1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS uq_versao_nota ON versoes_nota (nota_id, versao)')


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS uq_versao_nota')
