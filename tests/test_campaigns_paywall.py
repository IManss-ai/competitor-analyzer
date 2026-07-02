"""Paywall gating for the two campaign write endpoints.

POST /api/v1/campaigns (create) and POST /api/v1/campaigns/{id}/regenerate were
gated by require_api_user only — so a locked (free-test-used, non-paying) user
could create campaigns and, worse, trigger force plan regeneration
(cache-bypassing paid DeepSeek calls) in an unmetered cost-drain loop. Same
defect class as the scan / detail bypasses (abfb271). The fix swaps
require_api_user -> require_write_access on both write endpoints: locked users
get 402 before any paid work, full/paying users proceed, unauthenticated 401.
"""
import unittest
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Campaign


class TestCampaignsPaywall(unittest.TestCase):
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

    def _make_comp(self, user):
        comp = Competitor(
            user_id=user.id,
            url="https://rival.example.com",
            name="Rival",
            active=True,
        )
        self.db.add(comp)
        self.db.commit()
        self.db.refresh(comp)
        return comp

    def _make_campaign(self, user, comp):
        campaign = Campaign(user_id=user.id, competitor_id=comp.id, name="Beat Rival")
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        return campaign

    # ── POST /api/v1/campaigns (create) ──────────────────────────────────

    def test_create_campaign_read_only_user_gets_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post(
                "/api/v1/campaigns", headers=auth, json={"competitor_id": str(comp.id)}
            )
        self.assertEqual(resp.status_code, 402)
        self.assertIn("upgrade", resp.json()["detail"].lower())
        # create_campaign has no paid model call, so the invariant is the write
        # itself: a locked user must not persist a Campaign row.
        rows = self.db.execute(
            select(Campaign).where(Campaign.competitor_id == comp.id)
        ).scalars().all()
        self.assertEqual(len(rows), 0)

    def test_create_campaign_full_user_creates(self):
        user = self._make_user("paying@example.com", free_test_used=False)
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post(
                "/api/v1/campaigns", headers=auth, json={"competitor_id": str(comp.id)}
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["created"])
        rows = self.db.execute(
            select(Campaign).where(Campaign.competitor_id == comp.id)
        ).scalars().all()
        self.assertEqual(len(rows), 1)

    def test_create_campaign_unauthenticated_401(self):
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post("/api/v1/campaigns", json={})
        self.assertEqual(resp.status_code, 401)

    # ── POST /api/v1/campaigns/{campaign_id}/regenerate ──────────────────

    def test_regenerate_read_only_user_gets_402(self):
        user = self._make_user("locked-regen@example.com", free_test_used=True)
        comp = self._make_comp(user)
        campaign = self._make_campaign(user, comp)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.routes.campaigns.get_or_generate_plan") as gen:
            resp = self.client.post(
                f"/api/v1/campaigns/{campaign.id}/regenerate", headers=auth
            )
        self.assertEqual(resp.status_code, 402)
        self.assertIn("upgrade", resp.json()["detail"].lower())
        gen.assert_not_called()

    def test_regenerate_full_user_regenerates(self):
        user = self._make_user("paying-regen@example.com", free_test_used=False)
        comp = self._make_comp(user)
        campaign = self._make_campaign(user, comp)
        auth = {"Authorization": f"Bearer {user.id}"}
        fake_plan = MagicMock()
        fake_plan.id = uuid.uuid4()
        fake_plan.generated_at = datetime.utcnow()
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch(
                 "app.routes.campaigns.get_or_generate_plan", return_value=fake_plan
             ) as gen:
            resp = self.client.post(
                f"/api/v1/campaigns/{campaign.id}/regenerate", headers=auth
            )
        self.assertEqual(resp.status_code, 200)
        gen.assert_called_once()

    def test_regenerate_unauthenticated_401(self):
        user = self._make_user("someone-regen@example.com", free_test_used=True)
        comp = self._make_comp(user)
        campaign = self._make_campaign(user, comp)
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()):
            resp = self.client.post(f"/api/v1/campaigns/{campaign.id}/regenerate")
        self.assertEqual(resp.status_code, 401)


if __name__ == "__main__":
    unittest.main()
