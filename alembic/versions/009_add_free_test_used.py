"""add free_test_used to users

Revision ID: 009
Revises: 008
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("free_test_used", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Backfill: existing NON-active users have already used way more than one
    # test -> lock them (the founder is protected by COMPED_EMAILS in
    # access_level(), and the whole feature is inert until PAYWALL_ENABLED).
    op.execute(
        "UPDATE users SET free_test_used = true WHERE subscription_status != 'active'"
    )


def downgrade():
    op.drop_column("users", "free_test_used")
