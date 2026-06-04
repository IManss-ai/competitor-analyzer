"""add local business fields and social_posts table

Revision ID: 004
Revises: 003
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add business_type to users
    op.add_column('users', sa.Column('business_type', sa.String(), server_default='saas', nullable=True))

    # Add local business fields to competitors
    op.add_column('competitors', sa.Column('business_type', sa.String(), server_default='saas', nullable=True))
    op.add_column('competitors', sa.Column('google_maps_url', sa.String(), nullable=True))
    op.add_column('competitors', sa.Column('instagram_handle', sa.String(), nullable=True))
    op.add_column('competitors', sa.Column('facebook_page', sa.String(), nullable=True))

    # Create social_posts table
    op.create_table(
        'social_posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('competitor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('post_id', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('sentiment', sa.String(), nullable=True),
        sa.Column('engagement_hint', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('social_posts')
    op.drop_column('competitors', 'facebook_page')
    op.drop_column('competitors', 'instagram_handle')
    op.drop_column('competitors', 'google_maps_url')
    op.drop_column('competitors', 'business_type')
    op.drop_column('users', 'business_type')
