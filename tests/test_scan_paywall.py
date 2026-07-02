"""Paywall gating for the two scan endpoints that bypassed it.

POST /api/v1/local/scan/{competitor_id} authenticated with require_api_user but
never checked access_level, and the legacy POST /scan/now (HTMX dashboard) was
gated by the session cookie only — so a locked (free-test-used, non-paying)
user could trigger Chromium scrapes and paid DeepSeek calls directly. Same
defect class as the /competitors/{id}/detail bypass fixed in abfb271.

The fix: local scan swaps require_api_user -> require_write_access (drop-in);
legacy /scan/now adds an in-handler is_read_only check. Both return 402 with
the standard upgrade message for locked users; full/paying users scan as
before; unauthenticated requests still 401.
"""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor
from app.session import serializer, SESSION_COOKIE_NAME


class TestScanPaywall(unittest.TestCase):
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

    def _make_user(self, email, free_test_used):
        user = User(email=email, free_test_used=free_test_used)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _make_local_comp(self, user):
        comp = Competitor(
            user_id=user.id,
            url="https://cafe-rival.example.com",
            name="Cafe Rival",
            business_type="local",
            active=True,
        )
        self.db.add(comp)
        self.db.commit()
        self.db.refresh(comp)
        return comp

    def _set_session_cookie(self, user):
        # Build the signed session cookie exactly as app/session.py does.
        self.client.cookies.set(
            SESSION_COOKIE_NAME, serializer.dumps({"user_id": str(user.id)})
        )

    # ── POST /api/v1/local/scan/{competitor_id} ──────────────────────────

    def test_local_scan_read_only_user_gets_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_local_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        # patch() auto-uses AsyncMock for async defs.
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.local_business._run_local_scan_background") as bg:
            resp = self.client.post(f"/api/v1/local/scan/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 402)
        self.assertIn("upgrade", resp.json()["detail"].lower())
        bg.assert_not_called()

    def test_local_scan_full_user_still_scans(self):
        # free_test_used=False → access_level "full" even with the paywall on.
        user = self._make_user("paying@example.com", free_test_used=False)
        comp = self._make_local_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.local_business._run_local_scan_background") as bg:
            resp = self.client.post(f"/api/v1/local/scan/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.json(), {"ok": True, "message": "Local business scan started"}
        )
        bg.assert_called_once()

    def test_local_scan_unauthenticated_401(self):
        user = self._make_user("someone@example.com", free_test_used=True)
        comp = self._make_local_comp(user)
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post(f"/api/v1/local/scan/{comp.id}")
        self.assertEqual(resp.status_code, 401)

    # ── POST /scan/now (legacy HTMX dashboard) ───────────────────────────

    def test_legacy_scan_now_read_only_402(self):
        user = self._make_user("locked-legacy@example.com", free_test_used=True)
        self._set_session_cookie(user)
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.scan._run_scan_background") as bg:
            resp = self.client.post("/scan/now")
        self.assertEqual(resp.status_code, 402)
        bg.assert_not_called()

    def test_legacy_scan_now_full_user_still_scans(self):
        user = self._make_user("paying-legacy@example.com", free_test_used=False)
        self._set_session_cookie(user)
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.scan._run_scan_background") as bg:
            resp = self.client.post("/scan/now")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Scanning", resp.text)
        bg.assert_called_once()


if __name__ == "__main__":
    unittest.main()
