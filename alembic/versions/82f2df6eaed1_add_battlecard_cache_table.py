"""add_battlecard_cache_table

Revision ID: 82f2df6eaed1
Revises: 007
Create Date: 2026-06-10 20:45:45.242045

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82f2df6eaed1'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'battlecard_cache',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('competitor_id', sa.UUID(), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('ai_generated', sa.Boolean(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_battlecard_cache_competitor_id'), 'battlecard_cache', ['competitor_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_battlecard_cache_competitor_id'), table_name='battlecard_cache')
    op.drop_table('battlecard_cache')
