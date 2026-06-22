"""Timestamp serialization tests (GitHub issue #3, bug #2).

Snapshot.fetched_at / ChangeEvent.detected_at are stored via func.now() (UTC) in
tz-naive columns. Serializing them with a bare .isoformat() drops the timezone,
so the browser parses them as LOCAL time and "x ago" is skewed by the user's UTC
offset (e.g. "5h ago" right after a scan in GMT+5). The API must emit an explicit
UTC designator so new Date(...) parses them correctly.
"""
import re
import unittest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import (
    User, Competitor, Snapshot, ChangeEvent, Review, SocialPost,
    Campaign, ActionPlan, GeoSnapshot, App,
)
from app.routes.api_v1 import _iso_utc
from app.serialization import iso_utc

# Matches a full ISO-8601 datetime (has a 'T' and a time). Deliberately does NOT
# match date-only or week labels like "2026-W25".
_ISO_DT = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")


def _is_utc_marked(s: str) -> bool:
    """An ISO-8601 string a browser will read as UTC carries Z or a +00:00 offset."""
    if s is None:
        return False
    parsed = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return parsed.tzinfo is not None and parsed.utcoffset() == timedelta(0)


def _collect_iso_datetimes(obj, found=None):
    """Recursively collect every ISO-datetime-looking string in a JSON payload."""
    if found is None:
        found = []
    if isinstance(obj, dict):
        for v in obj.values():
            _collect_iso_datetimes(v, found)
    elif isinstance(obj, list):
        for v in obj:
            _collect_iso_datetimes(v, found)
    elif isinstance(obj, str) and _ISO_DT.match(obj):
        found.append(obj)
    return found


class TestIsoUtcHelper(unittest.TestCase):
    def test_naive_datetime_gets_utc_offset(self):
        naive = datetime(2026, 6, 22, 6, 0, 0)  # stored as UTC, no tzinfo
        out = _iso_utc(naive)
        self.assertTrue(_is_utc_marked(out), f"expected UTC-marked, got {out!r}")

    def test_none_passes_through(self):
        self.assertIsNone(_iso_utc(None))

    def test_aware_datetime_preserved_as_utc(self):
        aware = datetime(2026, 6, 22, 6, 0, 0, tzinfo=timezone.utc)
        self.assertTrue(_is_utc_marked(_iso_utc(aware)))


class TestDashboardTimestampsAreUtc(unittest.TestCase):
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
        self.user = User(email="ts@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.comp = Competitor(user_id=self.user.id, url="https://x.example.com", name="X", business_type="saas")
        self.db.add(self.comp)
        self.db.commit()
        self.db.refresh(self.comp)

        # Scanned "just now" in UTC (naive, like func.now()).
        self.scan_time = datetime.utcnow()
        snap = Snapshot(competitor_id=self.comp.id, raw_text="copy", char_count=4)
        snap.fetched_at = self.scan_time
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        ev = ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=snap.id,
            snapshot_after_id=snap.id,
            net_char_delta=4,
            change_type="initial_scan",
            brief_text="now tracking",
        )
        ev.detected_at = self.scan_time
        self.db.add(ev)
        self.db.commit()
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def test_last_scanned_is_utc_marked_and_recent(self):
        resp = self.client.get("/api/v1/dashboard", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        health = resp.json()["competitors_health"]
        self.assertTrue(health, "expected a competitor in the dashboard")
        last_scanned = health[0]["last_scanned"]
        self.assertTrue(_is_utc_marked(last_scanned), f"last_scanned not UTC-marked: {last_scanned!r}")
        # Parsed as UTC, the age is ~0 — not skewed by an offset.
        age = datetime.now(timezone.utc) - datetime.fromisoformat(last_scanned.replace("Z", "+00:00"))
        self.assertLess(abs(age.total_seconds()), 120, f"last_scanned skewed: age={age}")

    def test_feed_detected_at_is_utc_marked(self):
        resp = self.client.get("/api/v1/dashboard", headers=self.auth)
        events = resp.json()["events"]
        self.assertTrue(events)
        self.assertTrue(_is_utc_marked(events[0]["detected_at"]),
                        f"detected_at not UTC-marked: {events[0]['detected_at']!r}")

    def test_scan_history_fetched_at_is_utc_marked(self):
        resp = self.client.get(f"/api/v1/competitors/{self.comp.id}/detail", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        history = resp.json()["scan_history"]
        self.assertTrue(history)
        self.assertTrue(_is_utc_marked(history[0]["fetched_at"]),
                        f"fetched_at not UTC-marked: {history[0]['fetched_at']!r}")


class TestEveryEndpointTimestampIsUtc(unittest.TestCase):
    """Every ISO-datetime emitted by the campaigns/discovery/local_business
    endpoints (and the api_v1 list/detail/settings endpoints) must carry an
    explicit UTC offset — no bare naive timestamps anywhere (issue #3, bug #2)."""

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
        self.user = User(email="allts@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.comp = Competitor(user_id=self.user.id, url="https://acme.example.com", name="Acme", business_type="local")
        self.db.add(self.comp)
        self.db.commit()
        self.db.refresh(self.comp)

        now = datetime.utcnow()
        snap = Snapshot(competitor_id=self.comp.id, raw_text="copy", char_count=4)
        snap.fetched_at = now
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        ev = ChangeEvent(
            competitor_id=self.comp.id, snapshot_before_id=snap.id, snapshot_after_id=snap.id,
            net_char_delta=4, change_type="pricing_change", brief_text="moved pricing",
        )
        ev.detected_at = now
        self.db.add(ev)
        self.db.add(Review(
            competitor_id=self.comp.id, platform="g2", review_id="r1", body="slow",
            published_at=now - timedelta(days=1), is_complaint=True,
        ))
        self.db.add(SocialPost(
            competitor_id=self.comp.id, platform="instagram", post_id="p1", content="promo",
            posted_at=now - timedelta(hours=3),
        ))
        self.db.add(App(slug="acme-app", url="https://acme.example.com", name="Acme",
                        scan_status="ok", last_scanned_at=now))
        self.campaign = Campaign(user_id=self.user.id, competitor_id=self.comp.id, name="Beat Acme",
                                 user_product="MyTool")
        self.db.add(self.campaign)
        self.db.commit()
        self.db.refresh(self.campaign)
        plan = ActionPlan(campaign_id=self.campaign.id, executive_read="read", ai_generated=False)
        self.db.add(plan)
        self.db.add(GeoSnapshot(campaign_id=self.campaign.id, engine="estimated", source="estimated"))
        self.db.commit()
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _assert_endpoint_utc(self, path, expect_any=True):
        resp = self.client.get(path, headers=self.auth)
        self.assertEqual(resp.status_code, 200, f"{path} -> {resp.status_code}: {resp.text[:200]}")
        stamps = _collect_iso_datetimes(resp.json())
        if expect_any:
            self.assertTrue(stamps, f"{path} emitted no timestamps to check — fixture gap")
        for s in stamps:
            self.assertTrue(_is_utc_marked(s), f"{path} emitted a non-UTC timestamp: {s!r}")

    def test_competitors_list_created_at_utc(self):
        self._assert_endpoint_utc("/api/v1/competitors")

    def test_settings_trial_ends_at_utc(self):
        self._assert_endpoint_utc("/api/v1/settings")

    def test_reviews_published_at_utc(self):
        self._assert_endpoint_utc(f"/api/v1/competitors/{self.comp.id}/reviews")

    def test_social_posts_timestamps_utc(self):
        self._assert_endpoint_utc(f"/api/v1/local/competitors/{self.comp.id}/social-posts")

    def test_apps_sitemap_last_scanned_utc(self):
        self._assert_endpoint_utc("/api/v1/apps-sitemap")

    def test_campaigns_list_timestamps_utc(self):
        self._assert_endpoint_utc("/api/v1/campaigns")

    def test_war_room_timestamps_utc(self):
        # generated_at (plan), checked_at (geo), detected_at (events).
        self._assert_endpoint_utc(f"/api/v1/campaigns/{self.campaign.id}")


class TestBattlecardGeneratedAtUtc(unittest.TestCase):
    """The battle card's own `generated_at` must carry an explicit UTC offset so
    the card's "GENERATED AT" / "Week of" render is correct for non-UTC users —
    previously it used datetime.now() (local) (issue #3, bug #2 follow-up)."""

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
        self.user = User(email="genat@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _competitor(self, business_type="saas"):
        c = Competitor(user_id=self.user.id, url=f"https://{business_type}.example.com",
                       name=f"{business_type} Rival", business_type=business_type)
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return c

    def _snapshot(self, comp, text="copy"):
        s = Snapshot(competitor_id=comp.id, raw_text=text, char_count=len(text))
        self.db.add(s)
        self.db.commit()
        self.db.refresh(s)
        return s

    def _assert_generated_at_utc(self, comp_id):
        with patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp_id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        gen = resp.json()["generated_at"]
        self.assertTrue(_is_utc_marked(gen), f"generated_at not UTC-marked: {gen!r}")

    def test_saas_baseline_card_generated_at_utc(self):
        # initial_scan only -> _baseline_saas_payload path
        comp = self._competitor("saas")
        snap = self._snapshot(comp)
        self.db.add(ChangeEvent(
            competitor_id=comp.id, snapshot_before_id=snap.id, snapshot_after_id=snap.id,
            net_char_delta=snap.char_count, change_type="initial_scan", brief_text="now tracking",
        ))
        self.db.commit()
        self._assert_generated_at_utc(comp.id)

    def test_saas_change_card_generated_at_utc(self):
        # real change -> saas return path
        comp = self._competitor("saas")
        before = self._snapshot(comp, "old")
        after = self._snapshot(comp, "new and different")
        self.db.add(ChangeEvent(
            competitor_id=comp.id, snapshot_before_id=before.id, snapshot_after_id=after.id,
            net_char_delta=120, change_type="pricing_change", brief_text="moved pricing behind a quote",
        ))
        self.db.commit()
        self._assert_generated_at_utc(comp.id)

    def test_local_card_generated_at_utc(self):
        # local variant -> local return path
        comp = self._competitor("local")
        self._assert_generated_at_utc(comp.id)


if __name__ == "__main__":
    unittest.main()
