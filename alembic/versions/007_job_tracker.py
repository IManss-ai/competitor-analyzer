"""add careers_url and job tracker tables

Revision ID: 007
Revises: 006
Create Date: 2026-06-08 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('competitors', sa.Column('careers_url', sa.String(), nullable=True))

    op.create_table(
        'job_postings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('competitor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('posting_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'job_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('competitor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('snapshot_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('total_jobs', sa.Integer(), server_default='0', nullable=True),
        sa.Column('new_postings', sa.Integer(), server_default='0', nullable=True),
        sa.Column('closed_postings', sa.Integer(), server_default='0', nullable=True),
        sa.Column('strategic_signal', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['competitor_id'], ['competitors.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('job_snapshots')
    op.drop_table('job_postings')
    op.drop_column('competitors', 'careers_url')
