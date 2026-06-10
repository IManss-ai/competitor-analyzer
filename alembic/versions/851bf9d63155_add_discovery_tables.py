"""add_discovery_tables

Revision ID: 851bf9d63155
Revises: 82f2df6eaed1
Create Date: 2026-06-10 21:27:37.968430

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '851bf9d63155'
down_revision: Union[str, None] = '82f2df6eaed1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'apps',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('tagline', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('screenshot_url', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('scan_tier', sa.String(), nullable=True),
        sa.Column('scan_status', sa.String(), nullable=True),
        sa.Column('first_scanned_at', sa.DateTime(), nullable=True),
        sa.Column('last_scanned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_apps_slug'), 'apps', ['slug'], unique=True)
    op.create_index(op.f('ix_apps_url'), 'apps', ['url'], unique=True)
    op.create_index(op.f('ix_apps_category'), 'apps', ['category'], unique=False)

    op.create_table(
        'app_pricing',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('app_id', sa.UUID(), nullable=False),
        sa.Column('tier_name', sa.String(), nullable=False),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('period', sa.String(), nullable=True),
        sa.Column('features', sa.Text(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_app_pricing_app_id'), 'app_pricing', ['app_id'], unique=False)

    op.create_table(
        'app_tech',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('app_id', sa.UUID(), nullable=False),
        sa.Column('technology', sa.String(), nullable=False),
        sa.Column('tech_category', sa.String(), nullable=True),
        sa.Column('detected_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_app_tech_app_id'), 'app_tech', ['app_id'], unique=False)
    op.create_index('ix_app_tech_unique', 'app_tech', ['app_id', 'technology'], unique=True)

    with op.batch_alter_table('competitors') as batch_op:
        batch_op.add_column(sa.Column('app_id', sa.UUID(), nullable=True))
        batch_op.create_index(op.f('ix_competitors_app_id'), ['app_id'], unique=False)
        batch_op.create_foreign_key('fk_competitors_app_id', 'apps', ['app_id'], ['id'])

    # Postgres-only full-text search column + GIN index (production).
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            "ALTER TABLE apps ADD COLUMN search_vector tsvector GENERATED ALWAYS AS "
            "(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(tagline,'') || ' ' "
            "|| coalesce(description,'') || ' ' || coalesce(tags,''))) STORED"
        )
        op.execute("CREATE INDEX ix_apps_search_vector ON apps USING GIN (search_vector)")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_apps_search_vector")
        op.execute("ALTER TABLE apps DROP COLUMN IF EXISTS search_vector")
    with op.batch_alter_table('competitors') as batch_op:
        batch_op.drop_constraint('fk_competitors_app_id', type_='foreignkey')
        batch_op.drop_index(op.f('ix_competitors_app_id'))
        batch_op.drop_column('app_id')
    op.drop_index('ix_app_tech_unique', table_name='app_tech')
    op.drop_index(op.f('ix_app_tech_app_id'), table_name='app_tech')
    op.drop_table('app_tech')
    op.drop_index(op.f('ix_app_pricing_app_id'), table_name='app_pricing')
    op.drop_table('app_pricing')
    op.drop_index(op.f('ix_apps_category'), table_name='apps')
    op.drop_index(op.f('ix_apps_url'), table_name='apps')
    op.drop_index(op.f('ix_apps_slug'), table_name='apps')
    op.drop_table('apps')
