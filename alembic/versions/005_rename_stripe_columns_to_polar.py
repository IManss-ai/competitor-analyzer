"""rename stripe_ columns to polar_ on users table

Revision ID: 005
Revises: 004
Create Date: 2026-06-07 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('stripe_customer_id', new_column_name='polar_customer_id')
        batch_op.alter_column('stripe_subscription_id', new_column_name='polar_subscription_id')


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('polar_customer_id', new_column_name='stripe_customer_id')
        batch_op.alter_column('polar_subscription_id', new_column_name='stripe_subscription_id')
