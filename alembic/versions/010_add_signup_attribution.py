"""add first-touch signup attribution columns to users

Revision ID: 010
Revises: 009
Create Date: 2026-07-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('utm_source', sa.String(), nullable=True))
    op.add_column('users', sa.Column('utm_medium', sa.String(), nullable=True))
    op.add_column('users', sa.Column('utm_campaign', sa.String(), nullable=True))
    op.add_column('users', sa.Column('signup_referrer', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('signup_referrer')
        batch_op.drop_column('utm_campaign')
        batch_op.drop_column('utm_medium')
        batch_op.drop_column('utm_source')
