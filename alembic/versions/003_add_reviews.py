"""add reviews and review_snapshots tables

Revision ID: 003
Revises: 002
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('competitor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('review_id', sa.String(), nullable=False),
        sa.Column('author', sa.String(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('sentiment', sa.String(), nullable=True),
        sa.Column('is_complaint', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'review_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('competitor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('snapshot_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('avg_rating', sa.Float(), nullable=True),
        sa.Column('total_reviews', sa.Integer(), nullable=True),
        sa.Column('complaint_count', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('top_complaints', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('review_snapshots')
    op.drop_table('reviews')
