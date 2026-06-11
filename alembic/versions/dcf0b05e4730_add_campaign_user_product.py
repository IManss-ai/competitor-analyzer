"""add_campaign_user_product

Revision ID: dcf0b05e4730
Revises: 615b46b7fa1a
Create Date: 2026-06-11 20:15:19.690488

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dcf0b05e4730'
down_revision: Union[str, None] = '615b46b7fa1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('campaigns', sa.Column('user_product', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('campaigns') as batch_op:
        batch_op.drop_column('user_product')
