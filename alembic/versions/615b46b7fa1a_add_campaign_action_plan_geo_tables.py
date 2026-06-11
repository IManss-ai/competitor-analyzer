"""add_campaign_action_plan_geo_tables

Revision ID: 615b46b7fa1a
Revises: 851bf9d63155
Create Date: 2026-06-11 20:09:38.138952

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '615b46b7fa1a'
down_revision: Union[str, None] = '851bf9d63155'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'campaigns',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('competitor_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_campaigns_user_id'), 'campaigns', ['user_id'], unique=False)

    op.create_table(
        'action_plans',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('executive_read', sa.Text(), nullable=True),
        sa.Column('ai_generated', sa.Boolean(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.Column('trigger_summary', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_action_plans_campaign_id'), 'action_plans', ['campaign_id'], unique=False)

    op.create_table(
        'action_plan_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('plan_id', sa.UUID(), nullable=False),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['action_plans.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_action_plan_items_plan_id'), 'action_plan_items', ['plan_id'], unique=False)

    op.create_table(
        'geo_snapshots',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('engine', sa.String(), nullable=False),
        sa.Column('user_share', sa.Integer(), nullable=True),
        sa.Column('competitor_share', sa.Integer(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('checked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_geo_snapshots_campaign_id'), 'geo_snapshots', ['campaign_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_geo_snapshots_campaign_id'), table_name='geo_snapshots')
    op.drop_table('geo_snapshots')
    op.drop_index(op.f('ix_action_plan_items_plan_id'), table_name='action_plan_items')
    op.drop_table('action_plan_items')
    op.drop_index(op.f('ix_action_plans_campaign_id'), table_name='action_plans')
    op.drop_table('action_plans')
    op.drop_index(op.f('ix_campaigns_user_id'), table_name='campaigns')
    op.drop_table('campaigns')
