"""Audit 2026-07-21 Finding A: war-room GET must not fire paid calls for locked users.

GET /api/v1/campaigns/{id} (get_war_room) authenticated with require_api_user
only and unconditionally called get_or_generate_plan + get_or_check_visibility —
both make paid DeepSeek calls when caches are stale/missing. A locked
(free-test-used, non-paying) read_only user loading the war-room page therefore
fired paid model calls, bypassing the paywall that gates the sibling write
endpoints (create/regenerate, 402). The fix mirrors the battlecard detail-page
contract (api_v1 competitor detail, allow_ai = not is_read_only): read_only
viewers get cache-or-nothing — the GET still returns 200 (possibly with
plan=None / geo=None) but NEVER triggers paid generation or persists rows.
"""
import unittest
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import (
    ActionPlan, ActionPlanItem, Campaign, ChangeEvent, Competitor,
    GeoSnapshot, Snapshot, User,
)


class TestWarRoomReadOnlyCostGuard(unittest.TestCase):
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

    def _make_campaign(self, user):
        comp = Competitor(
            user_id=user.id,
            url="https://rival.example.com",
            name="Rival",
            active=True,
        )
        self.db.add(comp)
        self.db.commit()
        campaign = Campaign(user_id=user.id, competitor_id=comp.id, name="Beat Rival")
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        return comp, campaign

    def _seed_new_intel(self, comp, detected_at=None):
        """A real (non-noise) change event — makes any cached plan look stale."""
        snap = Snapshot(competitor_id=comp.id, raw_text="x", char_count=1)
        self.db.add(snap)
        self.db.commit()
        self.db.add(ChangeEvent(
            competitor_id=comp.id, snapshot_before_id=snap.id, snapshot_after_id=snap.id,
            net_char_delta=300, change_type="pricing_change",
            brief_text="Raised Pro plan from $29 to $39",
            detected_at=detected_at or datetime.utcnow(),
        ))
        self.db.commit()

    def _plan_count(self, campaign):
        return len(self.db.execute(
            select(ActionPlan).where(ActionPlan.campaign_id == campaign.id)
        ).scalars().all())

    # ── read_only viewer, empty caches ───────────────────────────────────

    def test_read_only_no_cache_returns_200_without_paid_calls(self):
        user = self._make_user("locked-warroom@example.com", free_test_used=True)
        comp, campaign = self._make_campaign(user)
        self._seed_new_intel(comp)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.planner.engine._ai_plan") as ai_plan, \
             patch("app.routes.campaigns.get_or_check_visibility") as geo_check:
            resp = self.client.get(f"/api/v1/campaigns/{campaign.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)  # a GET must never 402
        body = resp.json()
        self.assertIsNone(body["plan"])
        self.assertIsNone(body["geo"])
        ai_plan.assert_not_called()
        geo_check.assert_not_called()
        # No heuristic generation either: a locked user must not persist rows.
        self.assertEqual(self._plan_count(campaign), 0)

    # ── read_only viewer, stale caches with new intel ────────────────────

    def test_read_only_serves_stale_cache_without_regenerating(self):
        user = self._make_user("locked-cached@example.com", free_test_used=True)
        comp, campaign = self._make_campaign(user)
        cached = ActionPlan(
            campaign_id=campaign.id,
            executive_read="Cached read from the free test.",
            ai_generated=True,
            trigger_summary="1 change event(s) in the last 30 days",
            generated_at=datetime.utcnow() - timedelta(days=10),
        )
        self.db.add(cached)
        self.db.commit()
        self.db.add(ActionPlanItem(
            plan_id=cached.id, rank=1, title="Cached play", body="Do it", category="pricing",
        ))
        geo = GeoSnapshot(
            campaign_id=campaign.id, engine="chatgpt", user_share=3,
            competitor_share=7, source="live",
            checked_at=datetime.utcnow() - timedelta(days=30),  # past CACHE_MAX_AGE
        )
        self.db.add(geo)
        self.db.commit()
        # New real intel AFTER the cached plan — a full-access view would regen.
        self._seed_new_intel(comp)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.planner.engine._ai_plan") as ai_plan, \
             patch("app.routes.campaigns.get_or_check_visibility") as geo_check:
            resp = self.client.get(f"/api/v1/campaigns/{campaign.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["plan"]["id"], str(cached.id))
        self.assertEqual(body["plan"]["executive_read"], "Cached read from the free test.")
        self.assertEqual(len(body["plan"]["items"]), 1)
        self.assertEqual(body["geo"]["source"], "live")
        ai_plan.assert_not_called()
        geo_check.assert_not_called()
        self.assertEqual(self._plan_count(campaign), 1)  # no regen row

    # ── full-access viewer still generates ───────────────────────────────

    def test_full_user_still_generates(self):
        user = self._make_user("paying-warroom@example.com", free_test_used=False)
        comp, campaign = self._make_campaign(user)
        self._seed_new_intel(comp)
        auth = {"Authorization": f"Bearer {user.id}"}
        fake_geo = MagicMock(
            engine="chatgpt", user_share=2, competitor_share=8,
            source="live", checked_at=datetime.utcnow(),
        )
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=False), \
             patch(
                 "app.routes.campaigns.get_or_check_visibility", return_value=fake_geo
             ) as geo_check:
            resp = self.client.get(f"/api/v1/campaigns/{campaign.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIsNotNone(body["plan"])
        self.assertEqual(len(body["plan"]["items"]), 5)
        geo_check.assert_called_once()
        self.assertEqual(self._plan_count(campaign), 1)  # generated for full user


if __name__ == "__main__":
    unittest.main()
