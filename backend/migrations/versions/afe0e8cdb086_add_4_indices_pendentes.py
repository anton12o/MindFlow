"""add 4 indices pendentes (no-op — ja existem no banco)

Revision ID: afe0e8cdb086
Revises: ef8fac093971
Create Date: 2026-06-21 15:25:28.787142

"""
from typing import Sequence, Union


revision: str = 'afe0e8cdb086'
down_revision: Union[str, Sequence[str], None] = 'ef8fac093971'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
