"""Audit 2026-07-21 schema fixes — regression tests.

Finding A: users.password_hash / scan_schedule / email_notifications /
digest_email existed only via main.py's _apply_column_guards() startup hack,
never in a migration. Revision 011 makes them real; these tests prove a
migrations-driven database ends up with the columns.

Finding B: every FK was a bare ForeignKey with no ondelete. Revision 012
recreates the constraints on Postgres; app/models.py now declares the same
ondelete so create_all-built databases match. The Postgres recreation itself
cannot run under SQLite (dialect-guarded), so completeness is asserted against
Base.metadata and against the migration's own FK_RULES table — this is the
"miss none" gate.

Finding C: hot FK columns get indexes (models.py + revision 012).
"""
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import sqlalchemy as sa

from app.db import Base
import app.models  # noqa: F401 — ensure every model is registered on Base

REPO_ROOT = Path(__file__).resolve().parent.parent

# Every FK in app/models.py and its required ON DELETE behavior.
# (table, column) -> (referred_table, ondelete)
EXPECTED_FKS = {
    ("competitors", "user_id"): ("users", "CASCADE"),
    ("competitors", "app_id"): ("apps", "SET NULL"),
    ("campaigns", "user_id"): ("users", "CASCADE"),
    ("campaigns", "competitor_id"): ("competitors", "CASCADE"),
    ("approved_actions", "user_id"): ("users", "CASCADE"),
    ("approved_actions", "change_event_id"): ("change_events", "CASCADE"),
    ("magic_link_tokens", "user_id"): ("users", "CASCADE"),
    ("snapshots", "competitor_id"): ("competitors", "CASCADE"),
    ("change_events", "competitor_id"): ("competitors", "CASCADE"),
    ("change_events", "snapshot_before_id"): ("snapshots", "CASCADE"),
    ("change_events", "snapshot_after_id"): ("snapshots", "CASCADE"),
    ("reviews", "competitor_id"): ("competitors", "CASCADE"),
    ("review_snapshots", "competitor_id"): ("competitors", "CASCADE"),
    ("social_posts", "competitor_id"): ("competitors", "CASCADE"),
    ("job_postings", "competitor_id"): ("competitors", "CASCADE"),
    ("job_snapshots", "competitor_id"): ("competitors", "CASCADE"),
    ("battlecard_cache", "competitor_id"): ("competitors", "CASCADE"),
    ("action_plans", "campaign_id"): ("campaigns", "CASCADE"),
    ("action_plan_items", "plan_id"): ("action_plans", "CASCADE"),
    ("geo_snapshots", "campaign_id"): ("campaigns", "CASCADE"),
    ("app_pricing", "app_id"): ("apps", "CASCADE"),
    ("app_tech", "app_id"): ("apps", "CASCADE"),
}

USERS_AUDIT_COLUMNS = {"password_hash", "scan_schedule", "email_notifications", "digest_email"}

HOT_INDEXES = {
    "competitors": {("user_id",)},
    "snapshots": {("competitor_id", "fetched_at")},
    "change_events": {("competitor_id", "detected_at")},
    "reviews": {("competitor_id",)},
    "review_snapshots": {("competitor_id", "platform", "snapshot_at")},
    "social_posts": {("competitor_id",)},
    "job_postings": {("competitor_id",)},
    "job_snapshots": {("competitor_id",)},
    "magic_link_tokens": {("user_id",)},
    "approved_actions": {("user_id",), ("change_event_id",)},
    "campaigns": {("user_id",), ("competitor_id",)},
}


def _load_migration_012():
    path = REPO_ROOT / "alembic" / "versions" / "012_fk_ondelete_and_fk_indexes.py"
    spec = importlib.util.spec_from_file_location("migration_012", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestFkOndeleteDeclarations(unittest.TestCase):
    """Finding B — models.py must declare ON DELETE on every FK, none missed."""

    def _metadata_fks(self):
        found = {}
        for table in Base.metadata.tables.values():
            for fk in table.foreign_keys:
                key = (table.name, fk.parent.name)
                found[key] = (fk.column.table.name, fk.ondelete)
        return found

    def test_every_model_fk_has_expected_ondelete(self):
        found = self._metadata_fks()
        for key, (ref_table, ondelete) in EXPECTED_FKS.items():
            self.assertIn(key, found, f"FK {key} missing from models.py")
            self.assertEqual(found[key][0], ref_table, f"FK {key} points at wrong table")
            self.assertEqual(
                (found[key][1] or "").upper(), ondelete,
                f"FK {key} must declare ondelete={ondelete!r}, got {found[key][1]!r}",
            )

    def test_no_model_fk_is_unaccounted_for(self):
        """A newly added FK must be added to EXPECTED_FKS *and* to migration
        012's successor with an explicit ondelete decision — never silently bare."""
        found = self._metadata_fks()
        unaccounted = set(found) - set(EXPECTED_FKS)
        self.assertEqual(
            unaccounted, set(),
            f"FKs in models.py not covered by the ondelete audit map: {unaccounted}. "
            "Add ondelete= to the column and extend EXPECTED_FKS.",
        )

    def test_migration_012_rules_match_models(self):
        """The Postgres constraint-recreation table in revision 012 must cover
        exactly the FKs that exist in models.py, with the same ondelete."""
        mig = _load_migration_012()
        mig_rules = {(t, c): (r, od) for t, c, r, od in mig.FK_RULES}
        self.assertEqual(mig_rules, EXPECTED_FKS)


class TestHotIndexDeclarations(unittest.TestCase):
    """Finding C — hot FK columns must be indexed in models.py metadata."""

    def test_hot_fk_indexes_declared(self):
        for table_name, wanted in HOT_INDEXES.items():
            table = Base.metadata.tables[table_name]
            declared = {tuple(c.name for c in ix.columns) for ix in table.indexes}
            for cols in wanted:
                self.assertIn(
                    cols, declared,
                    f"missing index on {table_name}{cols} (declared: {declared})",
                )


class TestMigrationsProduceUsersColumns(unittest.TestCase):
    """Finding A — after running Alembic against a scratch SQLite DB, the four
    guard-created users columns exist as real migrated schema.

    The pre-011 chain cannot build a fresh SQLite DB (revision 002's
    ``DEFAULT now()`` is Postgres-only, a pre-existing issue — dev SQLite DBs
    have always come from create_all). So this reproduces the real dev path:
    create_all the current schema, strip the four audit columns and one hot
    index, stamp at 010, then run ``alembic upgrade head`` and assert 011/012
    put them back.
    """

    def _alembic(self, args, url):
        env = {**os.environ, "DATABASE_URL": url}
        proc = subprocess.run(
            [sys.executable, "-m", "alembic", *args],
            cwd=REPO_ROOT, env=env, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(
            proc.returncode, 0,
            f"alembic {' '.join(args)} failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_upgrade_head_adds_users_columns_and_indexes(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = os.path.join(tmp, "audit_schema.db")
            url = f"sqlite:///{db_path}"
            engine = sa.create_engine(url)
            try:
                Base.metadata.create_all(engine)
                with engine.begin() as conn:
                    for col in sorted(USERS_AUDIT_COLUMNS):
                        conn.execute(sa.text(f"ALTER TABLE users DROP COLUMN {col}"))
                    conn.execute(sa.text("DROP INDEX ix_snapshots_competitor_id_fetched_at"))

                self._alembic(["stamp", "010"], url)
                self._alembic(["upgrade", "head"], url)

                inspector = sa.inspect(engine)
                users_cols = {c["name"] for c in inspector.get_columns("users")}
                missing = USERS_AUDIT_COLUMNS - users_cols
                self.assertEqual(missing, set(), f"users columns missing after migrations: {missing}")

                snap_indexes = {ix["name"] for ix in inspector.get_indexes("snapshots")}
                self.assertIn("ix_snapshots_competitor_id_fetched_at", snap_indexes)
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
