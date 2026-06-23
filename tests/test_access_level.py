"""Coverage for trial / subscription access enforcement (app/access.py).

Trial expiry used to be display-only — an expired trial kept full write access,
so paying was pointless. These tests pin the access_level truth table (including
the naive-vs-aware datetime comparison that would otherwise raise TypeError), the
402 on a guarded write endpoint for a read-only user, and the scheduler skipping
trial-expired users while still scanning active ones.
"""
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor
from app.access import access_level, is_read_only


def _make_user(status, trial_ends_at):
    """Build a transient User with explicit subscription fields (no DB)."""
    return User(email="t@example.com", subscription_status=status, trial_ends_at=trial_ends_at)


class TestAccessLevelTruthTable(unittest.TestCase):
    """access_level pure-function truth table. trial_ends_at is built NAIVE here
    (mirroring the column default datetime.utcnow()) to prove the normalization
    holds — a naive-vs-aware compare would raise TypeError otherwise."""

    def test_active_is_full(self):
        # active ignores trial_ends_at entirely.
        self.assertEqual(access_level(_make_user("active", None)), "full")

    def test_trialing_future_is_full(self):
        future_naive = datetime.utcnow() + timedelta(days=1)
        self.assertEqual(access_level(_make_user("trialing", future_naive)), "full")
        self.assertFalse(is_read_only(_make_user("trialing", future_naive)))

    def test_trialing_past_is_read_only(self):
        past_naive = datetime.utcnow() - timedelta(days=1)
        # This is the comparison that would raise TypeError without normalization.
        self.assertEqual(access_level(_make_user("trialing", past_naive)), "read_only")
        self.assertTrue(is_read_only(_make_user("trialing", past_naive)))

    def test_trialing_aware_future_is_full(self):
        # Aware timestamps must also work (don't double-tag tzinfo).
        future_aware = datetime.now(timezone.utc) + timedelta(days=1)
        self.assertEqual(access_level(_make_user("trialing", future_aware)), "full")

    def test_canceled_is_read_only(self):
        self.assertEqual(access_level(_make_user("canceled", None)), "read_only")

    def test_past_due_is_read_only(self):
        future_naive = datetime.utcnow() + timedelta(days=1)
        # past_due is read-only even if a trial window is still nominally open.
        self.assertEqual(access_level(_make_user("past_due", future_naive)), "read_only")

    def test_trialing_with_no_trial_ends_at_is_read_only(self):
        self.assertEqual(access_level(_make_user("trialing", None)), "read_only")


class TestRequireWriteAccessEndpoint(unittest.TestCase):
    """POST /competitors is gated by require_write_access: 402 for a read-only
    user, 200 for a full user."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app, raise_server_exceptions=False)
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _add_user(self, status, trial_ends_at):
        user = User(email=f"{status}@example.com", subscription_status=status, trial_ends_at=trial_ends_at)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def test_read_only_user_gets_402_on_add_competitor(self):
        user = self._add_user("trialing", datetime.utcnow() - timedelta(days=1))
        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "https://rival.com", "name": "Rival"},
            headers={"Authorization": f"Bearer {user.id}"},
        )
        self.assertEqual(resp.status_code, 402)
        self.assertEqual(resp.json()["detail"], "Your trial has ended — upgrade to continue.")
        # Nothing was created.
        self.assertEqual(self.db.query(Competitor).count(), 0)

    def test_full_user_can_add_competitor(self):
        user = self._add_user("active", None)
        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "https://rival.com", "name": "Rival"},
            headers={"Authorization": f"Bearer {user.id}"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://rival.com")

    def test_unauthenticated_still_401_not_402(self):
        # require_write_access delegates to require_api_user first, so missing
        # auth is 401 (not 402) — order matters for the UI.
        resp = self.client.post("/api/v1/competitors", json={"url": "https://x.com"})
        self.assertEqual(resp.status_code, 401)


class TestSchedulerExcludesExpiredTrial(unittest.IsolatedAsyncioTestCase):
    """The scheduler's SQL prefilter keeps trial-expired ("trialing") users; the
    access_level guard must skip them while still scanning active users."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def tearDown(self):
        Base.metadata.drop_all(self.engine)

    @patch("app.scheduler.SessionLocal")
    @patch("app.scheduler.send_weekly_brief")
    @patch("app.scheduler.scan_user_competitors")
    async def test_expired_trial_skipped_active_scanned(self, mock_scan, mock_send, mock_session_factory):
        from app.scheduler import run_weekly_scan_and_brief

        db = self.SessionLocal()
        mock_session_factory.return_value = db

        expired = User(email="expired@example.com", subscription_status="trialing",
                       trial_ends_at=datetime.utcnow() - timedelta(days=1))
        active = User(email="active@example.com", subscription_status="active", trial_ends_at=None)
        db.add_all([expired, active])
        db.commit()
        db.refresh(active)

        await run_weekly_scan_and_brief()

        # Only the active user is scanned + briefed; the expired-trial user is skipped.
        mock_scan.assert_called_once()
        self.assertEqual(mock_scan.call_args[0][0], str(active.id))
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]["user_email"], "active@example.com")


if __name__ == "__main__":
    unittest.main()
