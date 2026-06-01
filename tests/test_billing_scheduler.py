import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta
import stripe

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.session import serializer, SESSION_COOKIE_NAME
from app.billing import create_checkout_session, create_portal_session
from app.mailer import send_weekly_brief
from app.scheduler import run_weekly_scan_and_brief

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

    @patch("stripe.checkout.Session.create")
    async def test_create_checkout_session(self, mock_create):
        mock_sess = MagicMock()
        mock_sess.url = "https://checkout.stripe.com/pay"
        mock_create.return_value = mock_sess

        url = await create_checkout_session("test@user.com", "user-id-123")
        self.assertEqual(url, "https://checkout.stripe.com/pay")
        mock_create.assert_called_once()

    @patch("stripe.billing_portal.Session.create")
    async def test_create_portal_session(self, mock_create):
        mock_sess = MagicMock()
        mock_sess.url = "https://billing.stripe.com/portal"
        mock_create.return_value = mock_sess

        url = await create_portal_session("cust_123")
        self.assertEqual(url, "https://billing.stripe.com/portal")
        mock_create.assert_called_once()

    @patch("stripe.Webhook.construct_event")
    @patch("stripe.Subscription.retrieve")
    def test_stripe_webhook_checkout_completed(self, mock_retrieve, mock_construct):
        # Mock Stripe objects
        mock_construct.return_value = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer": "cust_completed_123",
                    "subscription": "sub_completed_456",
                    "metadata": {"user_id": str(self.user.id)}
                }
            }
        }
        
        mock_sub = MagicMock()
        mock_sub.get.return_value = 1799999999 # Unix timestamp far in future
        mock_retrieve.return_value = mock_sub

        response = self.client.post(
            "/billing/webhook",
            headers={"stripe-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        # Assert database updated
        self.db.refresh(self.user)
        self.assertEqual(self.user.stripe_customer_id, "cust_completed_123")
        self.assertEqual(self.user.stripe_subscription_id, "sub_completed_456")
        self.assertEqual(self.user.subscription_status, "trialing")
        self.assertIsNotNone(self.user.trial_ends_at)

    @patch("stripe.Webhook.construct_event")
    def test_stripe_webhook_subscription_updated(self, mock_construct):
        # Setup subscription id on user
        self.user.stripe_subscription_id = "sub_updated_123"
        self.db.commit()

        mock_construct.return_value = {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_updated_123",
                    "status": "active",
                    "trial_end": None
                }
            }
        }

        response = self.client.post(
            "/billing/webhook",
            headers={"stripe-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "active")
        self.assertIsNone(self.user.trial_ends_at)

    @patch("stripe.Webhook.construct_event")
    def test_stripe_webhook_subscription_deleted(self, mock_construct):
        self.user.stripe_subscription_id = "sub_deleted_123"
        self.db.commit()

        mock_construct.return_value = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_deleted_123"
                }
            }
        }

        response = self.client.post(
            "/billing/webhook",
            headers={"stripe-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "canceled")

    @patch("stripe.Webhook.construct_event")
    def test_stripe_webhook_payment_failed(self, mock_construct):
        self.user.stripe_subscription_id = "sub_failed_123"
        self.db.commit()

        mock_construct.return_value = {
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "subscription": "sub_failed_123"
                }
            }
        }

        response = self.client.post(
            "/billing/webhook",
            headers={"stripe-signature": "valid-sig"}
        )
        self.assertEqual(response.status_code, 200)
        
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "past_due")

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

    @patch("app.routes.scan._run_scan_background")
    def test_trigger_scan_endpoint(self, mock_run_background):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.post("/scan/now")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Scan started", response.text)
        
        # Verify scan task scheduled
        mock_run_background.assert_called_once_with(str(self.user.id))

if __name__ == '__main__':
    unittest.main()
