"""add users columns previously created only by main.py column guards

users.password_hash, users.scan_schedule, users.email_notifications and
users.digest_email were declared in app/models.py but existed in NO Alembic
migration — they were created at startup by _apply_column_guards() in main.py
(raw SQL, failures swallowed). Any migrations-only environment (CI, restored
DB, one-off scripts) got UndefinedColumn on users queries — login broken.

This migration is IDEMPOTENT: existing production databases already have these
columns (added by the column guards), so every ADD COLUMN is conditional.
Types/defaults match exactly what the guards used:
    password_hash        VARCHAR                 (nullable)
    scan_schedule        VARCHAR DEFAULT 'weekly'
    email_notifications  BOOLEAN DEFAULT TRUE
    digest_email         VARCHAR                 (nullable)

Revision ID: 011
Revises: 010
Create Date: 2026-07-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (name, type SQL fragment for Postgres, sa.Column for non-Postgres)
_COLUMNS = [
    ("password_hash", "VARCHAR",
     sa.Column("password_hash", sa.String(), nullable=True)),
    ("scan_schedule", "VARCHAR DEFAULT 'weekly'",
     sa.Column("scan_schedule", sa.String(), server_default="weekly", nullable=True)),
    ("email_notifications", "BOOLEAN DEFAULT TRUE",
     sa.Column("email_notifications", sa.Boolean(), server_default=sa.text("TRUE"), nullable=True)),
    ("digest_email", "VARCHAR",
     sa.Column("digest_email", sa.String(), nullable=True)),
]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Native idempotency: prod DBs already have these columns from the
        # startup column guards.
        for name, pg_type, _ in _COLUMNS:
            op.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {name} {pg_type}")
    else:
        # SQLite (dev): no ADD COLUMN IF NOT EXISTS — inspect and add conditionally.
        existing = {c["name"] for c in sa.inspect(bind).get_columns("users")}
        for name, _, column in _COLUMNS:
            if name not in existing:
                op.add_column("users", column)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for name, _, _ in reversed(_COLUMNS):
            op.execute(f"ALTER TABLE users DROP COLUMN IF EXISTS {name}")
    else:
        existing = {c["name"] for c in sa.inspect(bind).get_columns("users")}
        with op.batch_alter_table("users") as batch_op:
            for name, _, _ in reversed(_COLUMNS):
                if name in existing:
                    batch_op.drop_column(name)
