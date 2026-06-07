import unittest
from types import SimpleNamespace
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User
from polar_sdk.webhooks import WebhookVerificationError


def _make_event(event_type, *, user_id=None, customer_id=None, subscription_id=None, status=None):
    """Build a stand-in for a parsed Polar webhook event."""
    data = SimpleNamespace(
        metadata={"user_id": str(user_id)} if user_id else {},
        customer_id=customer_id,
        id=subscription_id,
        status=status,
    )
    return SimpleNamespace(TYPE=event_type, data=data)


class TestPolarWebhook(unittest.TestCase):
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
        self.user = User(email="webhook-test@example.com", subscription_status="trialing")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _post(self):
        return self.client.post("/billing/webhook", content=b"{}", headers={"content-type": "application/json"})

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "")
    def test_returns_503_when_secret_not_configured(self):
        response = self._post()
        self.assertEqual(response.status_code, 503)

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "whsec_test")
    @patch("app.routes.billing.validate_event")
    def test_returns_403_on_invalid_signature(self, mock_validate):
        mock_validate.side_effect = WebhookVerificationError("bad sig")
        response = self._post()
        self.assertEqual(response.status_code, 403)

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "whsec_test")
    @patch("app.routes.billing.validate_event")
    def test_subscription_created_marks_user_active(self, mock_validate):
        mock_validate.return_value = _make_event(
            "subscription.created",
            user_id=self.user.id,
            customer_id="cus_polar_123",
            subscription_id="sub_polar_abc",
        )
        response = self._post()
        self.assertEqual(response.status_code, 200)
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "active")
        self.assertEqual(self.user.polar_customer_id, "cus_polar_123")
        self.assertEqual(self.user.polar_subscription_id, "sub_polar_abc")

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "whsec_test")
    @patch("app.routes.billing.validate_event")
    def test_subscription_canceled_marks_user_canceled(self, mock_validate):
        self.user.subscription_status = "active"
        self.user.polar_customer_id = "cus_polar_123"
        self.db.commit()

        mock_validate.return_value = _make_event(
            "subscription.canceled",
            user_id=self.user.id,
            customer_id="cus_polar_123",
        )
        response = self._post()
        self.assertEqual(response.status_code, 200)
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "canceled")

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "whsec_test")
    @patch("app.routes.billing.validate_event")
    def test_user_lookup_by_customer_id_when_metadata_missing(self, mock_validate):
        self.user.polar_customer_id = "cus_polar_456"
        self.db.commit()

        mock_validate.return_value = _make_event(
            "subscription.active",
            user_id=None,
            customer_id="cus_polar_456",
            subscription_id="sub_xyz",
        )
        response = self._post()
        self.assertEqual(response.status_code, 200)
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "active")
        self.assertEqual(self.user.polar_subscription_id, "sub_xyz")

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "whsec_test")
    @patch("app.routes.billing.validate_event")
    def test_invalid_user_id_in_metadata_does_not_crash(self, mock_validate):
        mock_validate.return_value = _make_event(
            "subscription.created",
            user_id="not-a-uuid",
            customer_id=None,
        )
        response = self._post()
        self.assertEqual(response.status_code, 200)
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "trialing")

    @patch("app.routes.billing.POLAR_WEBHOOK_SECRET", "whsec_test")
    @patch("app.routes.billing.validate_event")
    def test_unmatched_event_returns_ok_without_changes(self, mock_validate):
        mock_validate.return_value = _make_event(
            "subscription.created",
            user_id=None,
            customer_id="cus_unknown_999",
        )
        response = self._post()
        self.assertEqual(response.status_code, 200)
        self.db.refresh(self.user)
        self.assertEqual(self.user.subscription_status, "trialing")


if __name__ == "__main__":
    unittest.main()
