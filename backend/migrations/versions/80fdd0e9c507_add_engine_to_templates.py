"""add_engine_to_templates

Revision ID: 80fdd0e9c507
Revises: 028031cf4f6a
"""
from alembic import op
import sqlalchemy as sa

revision = '80fdd0e9c507'
down_revision = '028031cf4f6a'

def upgrade():
    op.add_column('templates', sa.Column('engine', sa.String(), nullable=False, server_default='simple'))

def downgrade():
    op.drop_column('templates', 'engine')
