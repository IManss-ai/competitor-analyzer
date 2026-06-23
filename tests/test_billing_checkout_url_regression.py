"""Regression: ISSUE-001 — /api/v1/billing/checkout-url must degrade to 503,
never surface a raw 500, when Polar is unconfigured or the Polar SDK call fails.

Found by /qa on 2026-06-23.
Report: .gstack/qa-reports/qa-report-rivalscope-dev-2026-06-23.md

Before the fix, the JSON endpoint called create_checkout_session() with no
try/except, so a ValueError (missing Polar product ID / access token) or any
Polar SDK / network error propagated as a 500 — breaking the trial->paid path.
"""
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User


class TestCheckoutUrlGracefulDegradation(unittest.TestCase):
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
        self.user = User(email="billing@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.auth = {"Authorization": f"Bearer {str(self.user.id)}"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()

    def test_value_error_degrades_to_503_not_500(self):
        """Polar not configured -> ValueError -> 503, not 500."""
        async def _raise(*a, **k):
            raise ValueError("Polar product ID not configured for plan: saas")
        with patch("app.billing.create_checkout_session", _raise):
            res = self.client.get("/api/v1/billing/checkout-url?plan=saas", headers=self.auth)
        self.assertEqual(res.status_code, 503)
        self.assertIn("detail", res.json())

    def test_unexpected_error_degrades_to_503(self):
        """Polar SDK / network failure (e.g. 401 invalid_token) -> 503, not 500."""
        async def _raise(*a, **k):
            raise RuntimeError("Polar API 401 invalid_token")
        with patch("app.billing.create_checkout_session", _raise):
            res = self.client.get("/api/v1/billing/checkout-url?plan=local", headers=self.auth)
        self.assertEqual(res.status_code, 503)

    def test_success_returns_url(self):
        """When Polar succeeds, the endpoint returns the checkout url unchanged."""
        async def _ok(*a, **k):
            return "https://polar.sh/checkout/abc123"
        with patch("app.billing.create_checkout_session", _ok):
            res = self.client.get("/api/v1/billing/checkout-url?plan=saas", headers=self.auth)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("url"), "https://polar.sh/checkout/abc123")


if __name__ == "__main__":
    unittest.main()
