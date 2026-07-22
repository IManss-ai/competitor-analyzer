"""Audit 2026-07-21 scheduler findings: per-user isolation, email prefs, delivery.

S1  A commit failure in one user's scan must not poison the shared session for
    every subsequent user — the per-user except handler rolls back so the loop
    stays isolated (the docstring already promises this).
S6  Users who turned email_notifications OFF must be skipped; the brief is sent
    to digest_email when set, otherwise the login email.
S8  send_weekly_brief returning False (Resend outage / non-2xx) must be logged,
    not silently discarded.
S11 The zero-change brief still ships (intentional "all quiet" email) but its
    subject must not claim changes exist, and must stay em-dash-free.
"""
import contextlib
import io
import unittest
from unittest.mock import AsyncMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.mailer import send_weekly_brief
from app.models import User
from app.scheduler import _run_scan_and_brief, _scan_and_brief_user


def _make_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


class TestPerUserIsolation(unittest.IsolatedAsyncioTestCase):
    """S1: one user's failure is rolled back and never blocks the others."""

    async def test_failure_rolls_back_and_next_user_still_processed(self):
        db = _make_session()
        try:
            a = User(email="a@x.com", subscription_status="active")
            b = User(email="b@x.com", subscription_status="active")
            db.add_all([a, b])
            db.commit()

            # First user raises (simulating a poisoned session), second succeeds.
            per_user = AsyncMock(side_effect=[RuntimeError("scan boom"), None])

            with patch("app.scheduler.SessionLocal", return_value=db), \
                 patch("app.access.access_level", return_value="full"), \
                 patch("app.scheduler._scan_and_brief_user", per_user), \
                 patch.object(db, "rollback", wraps=db.rollback) as spy_rollback, \
                 patch.object(db, "close"):
                await _run_scan_and_brief("weekly")

            # Both users were attempted — the first failure did not abort the loop.
            self.assertEqual(per_user.await_count, 2)
            # And the shared session was rolled back after the failure.
            self.assertGreaterEqual(spy_rollback.call_count, 1)
        finally:
            db.close()


class TestEmailNotificationPref(unittest.IsolatedAsyncioTestCase):
    """S6: respect the email_notifications opt-out."""

    async def test_opted_out_user_skipped_opted_in_processed(self):
        db = _make_session()
        try:
            on = User(email="on@x.com", subscription_status="active", email_notifications=True)
            off = User(email="off@x.com", subscription_status="active", email_notifications=False)
            db.add_all([on, off])
            db.commit()

            per_user = AsyncMock()
            with patch("app.scheduler.SessionLocal", return_value=db), \
                 patch("app.access.access_level", return_value="full"), \
                 patch("app.scheduler._scan_and_brief_user", per_user), \
                 patch.object(db, "close"):
                await _run_scan_and_brief("weekly")

            briefed = {call.args[0].email for call in per_user.await_args_list}
            self.assertEqual(briefed, {"on@x.com"})

        finally:
            db.close()

    async def test_null_email_notifications_stays_opted_in(self):
        db = _make_session()
        try:
            # Simulate a pre-column / unset row: NULL must NOT be treated as off.
            u = User(email="null@x.com", subscription_status="active", email_notifications=None)
            db.add(u)
            db.commit()

            per_user = AsyncMock()
            with patch("app.scheduler.SessionLocal", return_value=db), \
                 patch("app.access.access_level", return_value="full"), \
                 patch("app.scheduler._scan_and_brief_user", per_user), \
                 patch.object(db, "close"):
                await _run_scan_and_brief("weekly")

            self.assertEqual(per_user.await_count, 1)
        finally:
            db.close()


class TestBriefRecipientAndDelivery(unittest.IsolatedAsyncioTestCase):
    """S6 (digest_email routing) and S8 (failed-send logging)."""

    def setUp(self):
        self.db = _make_session()

    def tearDown(self):
        self.db.close()

    async def _run_user(self, user, send_return=True):
        self.db.add(user)
        self.db.commit()
        mock_send = AsyncMock(return_value=send_return)
        with patch("app.scheduler.scan_user_competitors", new=AsyncMock()), \
             patch("app.scheduler.send_weekly_brief", new=mock_send):
            await _scan_and_brief_user(user, self.db, lookback_days=7)
        return mock_send

    async def test_digest_email_preferred_when_set(self):
        user = User(
            email="login@x.com",
            subscription_status="active",
            digest_email="digest@x.com",
        )
        mock_send = await self._run_user(user)
        self.assertEqual(mock_send.await_args.kwargs["user_email"], "digest@x.com")

    async def test_falls_back_to_login_email_when_no_digest(self):
        user = User(email="login@x.com", subscription_status="active", digest_email=None)
        mock_send = await self._run_user(user)
        self.assertEqual(mock_send.await_args.kwargs["user_email"], "login@x.com")

    async def test_failed_send_is_logged(self):
        user = User(email="login@x.com", subscription_status="active")
        with self.assertLogs("app.scheduler", level="WARNING") as cm:
            await self._run_user(user, send_return=False)
        self.assertTrue(
            any("send failed" in m for m in cm.output),
            f"expected a failed-send warning, got: {cm.output}",
        )


class TestZeroChangeSubject(unittest.IsolatedAsyncioTestCase):
    """S11: the zero-change subject must be accurate and em-dash-free."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        db = self.SessionLocal()
        user = User(email="quiet@x.com")
        db.add(user)
        db.commit()
        self.user_id = str(user.id)
        db.close()

    def tearDown(self):
        Base.metadata.drop_all(self.engine)

    async def _subject_for(self, change_summaries):
        buf = io.StringIO()
        # RESEND_API_KEY="" -> local-dev branch prints "Subject: ..." and returns True.
        with patch("app.db.SessionLocal", self.SessionLocal), \
             patch("app.mailer.RESEND_API_KEY", ""), \
             contextlib.redirect_stdout(buf):
            await send_weekly_brief(
                user_email="quiet@x.com",
                user_id=self.user_id,
                change_summaries=change_summaries,
                pending_action_count=0,
            )
        line = next(l for l in buf.getvalue().splitlines() if l.startswith("Subject:"))
        return line.split("Subject:", 1)[1].strip()

    async def test_zero_change_subject_does_not_claim_changes(self):
        subject = await self._subject_for([])
        self.assertIn("All quiet this week", subject)
        self.assertNotIn("0 competitor", subject)
        # Em-dash house rule: no em/en dash in user-facing copy.
        self.assertNotIn("—", subject)
        self.assertNotIn("–", subject)

    async def test_single_change_subject_is_singular(self):
        subject = await self._subject_for([{"competitor_name": "Rival", "brief_text": "x"}])
        self.assertIn("1 competitor change this week", subject)


if __name__ == "__main__":
    unittest.main()
