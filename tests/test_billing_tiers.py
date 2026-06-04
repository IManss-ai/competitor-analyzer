import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User
from app.billing import create_checkout_session


class TestBillingTiers(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
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
        self.user = User(email="tier-test@example.com", subscription_status="trialing")
        self.db.add(self.user)
        self.db.commit()

        self.auth_header = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    # ── Billing tier tests ───────────────────────────────────────────────

    @patch("app.config.STRIPE_LOCAL_PRICE_ID", "")
    @patch("app.billing.STRIPE_LOCAL_PRICE_ID", "")
    async def test_local_plan_raises_when_price_not_configured(self):
        """create_checkout_session with plan_type='local' raises ValueError when STRIPE_LOCAL_PRICE_ID is empty."""
        with self.assertRaises(ValueError) as ctx:
            await create_checkout_session("test@example.com", "user-123", plan_type="local")
        self.assertIn("local", str(ctx.exception))

    @patch("stripe.checkout.Session.create")
    @patch("app.billing.STRIPE_LOCAL_PRICE_ID", "price_local_test_123")
    async def test_local_plan_uses_local_price_id(self, mock_create):
        """create_checkout_session with plan_type='local' uses STRIPE_LOCAL_PRICE_ID."""
        mock_sess = MagicMock()
        mock_sess.url = "https://checkout.stripe.com/local"
        mock_create.return_value = mock_sess

        url = await create_checkout_session("test@example.com", "user-123", plan_type="local")
        self.assertEqual(url, "https://checkout.stripe.com/local")
        call_kwargs = mock_create.call_args
        line_items = call_kwargs.kwargs.get("line_items") or call_kwargs[1].get("line_items")
        self.assertEqual(line_items[0]["price"], "price_local_test_123")

    # ── Onboarding endpoint tests ────────────────────────────────────────

    def test_onboarding_requires_auth(self):
        """POST /api/v1/onboarding/business-type returns 401 without auth."""
        response = self.client.post(
            "/api/v1/onboarding/business-type",
            json={"business_type": "saas"}
        )
        self.assertEqual(response.status_code, 401)

    def test_onboarding_invalid_business_type(self):
        """POST with invalid business_type returns 422."""
        response = self.client.post(
            "/api/v1/onboarding/business-type",
            json={"business_type": "enterprise"},
            headers=self.auth_header
        )
        self.assertEqual(response.status_code, 422)

    def test_onboarding_set_saas(self):
        """POST with business_type='saas' updates user and returns ok."""
        response = self.client.post(
            "/api/v1/onboarding/business-type",
            json={"business_type": "saas"},
            headers=self.auth_header
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["business_type"], "saas")

    def test_onboarding_set_local(self):
        """POST with business_type='local' updates user and returns ok."""
        response = self.client.post(
            "/api/v1/onboarding/business-type",
            json={"business_type": "local"},
            headers=self.auth_header
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["business_type"], "local")


if __name__ == "__main__":
    unittest.main()
