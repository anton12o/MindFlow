"""add_contador_acessos_to_nota

Revision ID: bad764f1aafc
Revises: 0703dc203e19
Create Date: 2026-06-13 01:23:55.989946

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'bad764f1aafc'
down_revision: Union[str, Sequence[str], None] = '0703dc203e19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notas', sa.Column('acessos', sa.Integer(), nullable=False, server_default=sa.text("'0'")))
    op.add_column('notas', sa.Column('ultimo_acesso', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade() -> None:
    op.drop_column('notas', 'ultimo_acesso')
    op.drop_column('notas', 'acessos')
