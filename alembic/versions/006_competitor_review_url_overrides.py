"""add g2_url, trustpilot_url, capterra_url overrides to competitors

Revision ID: 006
Revises: 005
Create Date: 2026-06-08 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('competitors', sa.Column('g2_url', sa.String(), nullable=True))
    op.add_column('competitors', sa.Column('trustpilot_url', sa.String(), nullable=True))
    op.add_column('competitors', sa.Column('capterra_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('competitors', 'capterra_url')
    op.drop_column('competitors', 'trustpilot_url')
    op.drop_column('competitors', 'g2_url')
