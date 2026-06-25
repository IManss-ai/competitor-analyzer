"""add business profile fields to users (magic onboarding)

Revision ID: 008
Revises: dcf0b05e4730
Create Date: 2026-06-25 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '008'
down_revision: Union[str, None] = 'dcf0b05e4730'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('business_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('business_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('business_profile', sa.Text(), nullable=True))  # JSON string
    op.add_column('users', sa.Column('onboarded_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'onboarded_at')
    op.drop_column('users', 'business_profile')
    op.drop_column('users', 'business_name')
    op.drop_column('users', 'business_url')
