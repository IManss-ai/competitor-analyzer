"""Paywall gating for the two magic-onboarding write endpoints.

POST /api/v1/onboarding/profile and POST /api/v1/onboarding/discover each make
paid DeepSeek calls (profile_business / discover_competitors) but were gated by
require_api_user only — so a locked (free-test-used, non-paying) user could
trigger them freely. Same defect class as the scan / detail bypasses. The fix
swaps require_api_user -> require_write_access: locked users get 402 before the
paid call, full/paying users proceed, unauthenticated 401.
"""
import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User


class TestOnboardingPaywall(unittest.TestCase):
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

    def _make_user(self, email, free_test_used, business_profile=None):
        user = User(
            email=email,
            free_test_used=free_test_used,
            business_profile=business_profile,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    # ── POST /api/v1/onboarding/profile ──────────────────────────────────

    def test_profile_read_only_user_gets_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.onboarding.profile_business") as prof:
            resp = self.client.post(
                "/api/v1/onboarding/profile", headers=auth, json={"url": "acme.com"}
            )
        self.assertEqual(resp.status_code, 402)
        self.assertIn("upgrade", resp.json()["detail"].lower())
        prof.assert_not_called()

    def test_profile_full_user_runs(self):
        user = self._make_user("paying@example.com", free_test_used=False)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch(
                 "app.routes.onboarding.profile_business",
                 return_value={"name": "Acme", "is_saas": True},
             ) as prof:
            resp = self.client.post(
                "/api/v1/onboarding/profile", headers=auth, json={"url": "acme.com"}
            )
        self.assertEqual(resp.status_code, 200)
        prof.assert_called_once()

    def test_profile_unauthenticated_401(self):
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post(
                "/api/v1/onboarding/profile", json={"url": "acme.com"}
            )
        self.assertEqual(resp.status_code, 401)

    # ── POST /api/v1/onboarding/discover ─────────────────────────────────

    def test_discover_read_only_user_gets_402(self):
        profile = json.dumps({"name": "Acme", "is_saas": True})
        user = self._make_user(
            "locked-disc@example.com", free_test_used=True, business_profile=profile
        )
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.onboarding.discover_competitors") as disc:
            resp = self.client.post("/api/v1/onboarding/discover", headers=auth)
        self.assertEqual(resp.status_code, 402)
        self.assertIn("upgrade", resp.json()["detail"].lower())
        disc.assert_not_called()

    def test_discover_full_user_runs(self):
        profile = json.dumps({"name": "Acme", "is_saas": True})
        user = self._make_user(
            "paying-disc@example.com", free_test_used=False, business_profile=profile
        )
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch(
                 "app.routes.onboarding.discover_competitors",
                 return_value={"competitors": []},
             ) as disc:
            resp = self.client.post("/api/v1/onboarding/discover", headers=auth)
        self.assertEqual(resp.status_code, 200)
        disc.assert_called_once()

    def test_discover_unauthenticated_401(self):
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post("/api/v1/onboarding/discover")
        self.assertEqual(resp.status_code, 401)


if __name__ == "__main__":
    unittest.main()
