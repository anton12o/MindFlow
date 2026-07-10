"""remove_engine_from_templates

Revision ID: 7347f5633c25
Revises: 80fdd0e9c507
Create Date: 2026-07-10 07:12:28.026272

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7347f5633c25'
down_revision: Union[str, Sequence[str], None] = '80fdd0e9c507'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('templates', 'engine')


def downgrade() -> None:
    op.add_column('templates', sa.Column('engine', sa.VARCHAR(), server_default=sa.text("'simple'"), nullable=False))
