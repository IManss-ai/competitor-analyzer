import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.session import serializer, SESSION_COOKIE_NAME
from app.billing import create_checkout_session, create_portal_session
from app.mailer import send_weekly_brief
from app.scheduler import run_weekly_scan_and_brief, run_midweek_scan_and_brief

class TestBillingScheduler(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Database setup
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Override dependency
        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()
                
        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app, raise_server_exceptions=False)
        # Ensure webhook secret guard doesn't block tests
        self._webhook_secret_patch = patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "test-secret")
        self._webhook_secret_patch.start()
        
        # Database records
        self.db = self.SessionLocal()
        self.user = User(email="test@user.com", subscription_status="trialing")
        self.db.add(self.user)
        self.db.commit()
        
        # Set auth session cookie helper
        self.session_cookie = serializer.dumps({"user_id": str(self.user.id)})

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()
        self._webhook_secret_patch.stop()

    @patch("app.billing._get_polar")
    async def test_create_checkout_session(self, mock_get_polar):
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/pay"
        mock_polar.checkouts.create.return_value = mock_checkout
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        with patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123"), \
             patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123"):
            url = await create_checkout_session("test@user.com", "user-id-123")
            self.assertEqual(url, "https://checkout.polar.sh/pay")

    @patch("app.billing._get_polar")
    async def test_create_portal_session(self, mock_get_polar):
        mock_polar = MagicMock()
        mock_session = MagicMock()
        mock_session.customer_portal_url = "https://billing.polar.sh/portal"
        mock_polar.customer_sessions.create.return_value = mock_session
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        url = await create_portal_session("cust_123")
        self.assertEqual(url, "https://billing.polar.sh/portal")

    @patch("app.routes.billing.validate_event")
    def test_polar_webhook_subscription_created(self, mock_validate):
        mock_event = MagicMock()
        mock_event.TYPE = "subscription.created"
        mock_event.data.customer_id = "cust_completed_123"
        mock_event.data.id = "sub_completed_456"
        mock_event.data.metadata = {"user_id": str(self.user.id)}
        mock_validate.return_value = mock_event

        response = self.client.post(
            "/billing/webhook",
            headers={"webhook-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.polar_customer_id, "cust_completed_123")
        self.assertEqual(self.user.polar_subscription_id, "sub_completed_456")
        self.assertEqual(self.user.subscription_status, "active")

    @patch("app.routes.billing.validate_event")
    def test_polar_webhook_subscription_updated(self, mock_validate):
        self.user.polar_subscription_id = "sub_updated_123"
        self.db.commit()

        mock_event = MagicMock()
        mock_event.TYPE = "subscription.updated"
        mock_event.data.customer_id = "cust_completed_123"
        mock_event.data.id = "sub_updated_123"
        mock_event.data.status.value = "active"
        mock_event.data.metadata = {"user_id": str(self.user.id)}
        mock_validate.return_value = mock_event

        response = self.client.post(
            "/billing/webhook",
            headers={"webhook-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "active")

    @patch("app.routes.billing.validate_event")
    def test_polar_webhook_subscription_canceled(self, mock_validate):
        self.user.polar_subscription_id = "sub_deleted_123"
        self.db.commit()

        mock_event = MagicMock()
        mock_event.TYPE = "subscription.canceled"
        mock_event.data.customer_id = "cust_completed_123"
        mock_event.data.id = "sub_deleted_123"
        mock_event.data.metadata = {"user_id": str(self.user.id)}
        mock_validate.return_value = mock_event

        response = self.client.post(
            "/billing/webhook",
            headers={"webhook-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "canceled")

    @patch("app.routes.billing.validate_event")
    def test_polar_webhook_subscription_revoked(self, mock_validate):
        self.user.polar_subscription_id = "sub_failed_123"
        self.db.commit()

        mock_event = MagicMock()
        mock_event.TYPE = "subscription.revoked"
        mock_event.data.customer_id = "cust_completed_123"
        mock_event.data.id = "sub_failed_123"
        mock_event.data.metadata = {"user_id": str(self.user.id)}
        mock_validate.return_value = mock_event

        response = self.client.post(
            "/billing/webhook",
            headers={"webhook-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "canceled")

    async def test_mailer_builder_and_fallback(self):
        # Simply checks that send_weekly_brief completes successfully with fallbacks
        change_summaries = [
            {"competitor_name": "Co 1", "url": "https://c1.com", "change_type": "pricing_change", "brief_text": "Brief content"}
        ]
        res = await send_weekly_brief("test@user.com", "user-id-123", change_summaries, 2)
        self.assertTrue(res)

        # Empty change summaries brief
        res_empty = await send_weekly_brief("test@user.com", "user-id-123", [], 0)
        self.assertTrue(res_empty)

    @patch("app.scheduler.SessionLocal")
    @patch("app.scheduler.send_weekly_brief")
    @patch("app.scheduler.scan_user_competitors")
    async def test_scheduler_excludes_inactive_subscriptions(self, mock_scan, mock_send, mock_session_factory):
        # Create an in-memory session specifically for the scheduler call
        mock_db = self.SessionLocal()
        mock_session_factory.return_value = mock_db
        
        # Add another user that is canceled
        canceled_user = User(email="canceled@user.com", subscription_status="canceled")
        mock_db.add(canceled_user)
        mock_db.commit()

        await run_weekly_scan_and_brief()
        
        # Should scan and send brief only for the active 'trialing' user, not canceled
        mock_scan.assert_called_once()
        self.assertEqual(mock_scan.call_args[0][0], str(self.user.id))
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]["user_email"], "test@user.com")

    @patch("app.scheduler.SessionLocal")
    @patch("app.scheduler.send_weekly_brief")
    @patch("app.scheduler.scan_user_competitors")
    async def test_midweek_only_runs_for_biweekly_users(self, mock_scan, mock_send, mock_session_factory):
        mock_db = self.SessionLocal()
        mock_session_factory.return_value = mock_db

        # self.user defaults to "weekly" — should be excluded from the midweek run.
        biweekly_user = User(email="biweekly@user.com", subscription_status="active", scan_schedule="biweekly")
        mock_db.add(biweekly_user)
        mock_db.commit()

        await run_midweek_scan_and_brief()

        # Only the biweekly user is scanned and briefed.
        mock_scan.assert_called_once()
        self.assertEqual(mock_scan.call_args[0][0], str(biweekly_user.id))
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]["user_email"], "biweekly@user.com")

    @patch("app.scheduler.SessionLocal")
    @patch("app.scheduler.send_weekly_brief")
    @patch("app.scheduler.scan_user_competitors")
    async def test_per_user_failure_is_isolated_and_logged(self, mock_scan, mock_send, mock_session_factory):
        mock_db = self.SessionLocal()
        mock_session_factory.return_value = mock_db

        other_user = User(email="other@user.com", subscription_status="active")
        mock_db.add(other_user)
        mock_db.commit()

        # Scan blows up for self.user only; the other user must still be processed.
        def scan_side_effect(uid, db):
            if uid == str(self.user.id):
                raise RuntimeError("boom")
        mock_scan.side_effect = scan_side_effect

        with self.assertLogs("app.scheduler", level="WARNING") as cm:
            await run_weekly_scan_and_brief()

        # The failure is logged (not silently swallowed)...
        self.assertTrue(any("run failed for user" in line and "boom" in line for line in cm.output))
        # ...and the healthy user still got their brief.
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]["user_email"], "other@user.com")

    def _seed_change_event(self, db, detected_at, week_label):
        """One competitor + one snapshot reused for both NOT NULL snapshot FKs
        (same trick as scanner._make_initial_event) + one change event."""
        comp = Competitor(user_id=self.user.id, url="https://rival.example.com", name="Rival", active=True)
        db.add(comp)
        db.commit()
        snap = Snapshot(competitor_id=comp.id, raw_text="x", char_count=1)
        db.add(snap)
        db.commit()
        db.add(ChangeEvent(
            competitor_id=comp.id,
            snapshot_before_id=snap.id,
            snapshot_after_id=snap.id,
            detected_at=detected_at,
            week_label=week_label,
            change_type="pricing_change",
            brief_text="Rival cut prices",
            net_char_delta=150,
        ))
        db.commit()

    @patch("app.scheduler.SessionLocal")
    @patch("app.scheduler.send_weekly_brief")
    @patch("app.scheduler.scan_user_competitors")
    @patch("app.scheduler.scrape_competitor_reviews")
    async def test_weekly_brief_includes_midweek_events_with_stale_week_label(
        self, mock_reviews, mock_scan, mock_send, mock_session_factory
    ):
        mock_db = self.SessionLocal()
        mock_session_factory.return_value = mock_db

        # An on-demand scan detected this mid-week: by the Monday 8am send the
        # event carries the PREVIOUS ISO week's label, but it is inside the
        # 7-day window the email claims and must appear in the brief.
        now = datetime.utcnow()  # naive UTC, matching func.now() storage
        stale_iso = (now - timedelta(days=7)).isocalendar()
        self._seed_change_event(
            mock_db,
            detected_at=now - timedelta(days=3),
            week_label=f"{stale_iso.year}-W{stale_iso.week:02d}",
        )

        await run_weekly_scan_and_brief()

        mock_send.assert_called_once()
        summaries = mock_send.call_args[1]["change_summaries"]
        self.assertTrue(
            any(s["brief_text"] == "Rival cut prices" for s in summaries),
            f"mid-week event missing from brief: {summaries}",
        )

    @patch("app.scheduler.SessionLocal")
    @patch("app.scheduler.send_weekly_brief")
    @patch("app.scheduler.scan_user_competitors")
    @patch("app.scheduler.scrape_competitor_reviews")
    async def test_weekly_brief_excludes_events_older_than_seven_days(
        self, mock_reviews, mock_scan, mock_send, mock_session_factory
    ):
        mock_db = self.SessionLocal()
        mock_session_factory.return_value = mock_db

        now = datetime.utcnow()
        old_iso = (now - timedelta(days=10)).isocalendar()
        self._seed_change_event(
            mock_db,
            detected_at=now - timedelta(days=10),
            week_label=f"{old_iso.year}-W{old_iso.week:02d}",
        )

        await run_weekly_scan_and_brief()

        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[1]["change_summaries"], [])

    @patch("app.routes.scan.SessionLocal")
    @patch("app.routes.scan.scan_user_competitors")
    async def test_run_scan_background_invokes_scanner(self, mock_scan, mock_session_factory):
        from app.routes.scan import _run_scan_background
        mock_session_factory.return_value = self.SessionLocal()
        await _run_scan_background(str(self.user.id))
        mock_scan.assert_called_once()
        self.assertEqual(str(mock_scan.call_args[0][0]), str(self.user.id))

    @patch("app.routes.scan.SessionLocal")
    @patch("app.routes.scan.scan_user_competitors")
    async def test_run_scan_background_swallows_errors(self, mock_scan, mock_session_factory):
        from app.routes.scan import _run_scan_background
        mock_session_factory.return_value = self.SessionLocal()
        mock_scan.side_effect = RuntimeError("scan boom")
        # Must not raise — a background scan failure should not crash the worker.
        await _run_scan_background(str(self.user.id))

    @patch("app.routes.scan._run_scan_background")
    def test_trigger_scan_endpoint(self, mock_run_background):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.post("/scan/now")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Scanning", response.text)
        
        # Verify scan task scheduled
        mock_run_background.assert_called_once_with(str(self.user.id))

if __name__ == '__main__':
    unittest.main()
