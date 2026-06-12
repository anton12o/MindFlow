"""add cover_url column and unique constraint on tag nome

Revision ID: a1b2c3d4e5f6
Revises: 8616ba3b846c
Create Date: 2026-06-12 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8616ba3b846c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('PRAGMA foreign_keys = OFF')
    with op.batch_alter_table('tags') as batch_op:
        batch_op.create_unique_constraint('uq_tags_nome', ['nome'])
    op.execute('PRAGMA foreign_keys = ON')


def downgrade() -> None:
    op.execute('PRAGMA foreign_keys = OFF')
    with op.batch_alter_table('tags') as batch_op:
        batch_op.drop_constraint('uq_tags_nome', type_='unique')
    op.execute('PRAGMA foreign_keys = ON')
