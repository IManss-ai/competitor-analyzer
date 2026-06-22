"""Timestamp serialization tests (GitHub issue #3, bug #2).

Snapshot.fetched_at / ChangeEvent.detected_at are stored via func.now() (UTC) in
tz-naive columns. Serializing them with a bare .isoformat() drops the timezone,
so the browser parses them as LOCAL time and "x ago" is skewed by the user's UTC
offset (e.g. "5h ago" right after a scan in GMT+5). The API must emit an explicit
UTC designator so new Date(...) parses them correctly.
"""
import unittest
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent
from app.routes.api_v1 import _iso_utc


def _is_utc_marked(s: str) -> bool:
    """An ISO-8601 string a browser will read as UTC carries Z or a +00:00 offset."""
    if s is None:
        return False
    parsed = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return parsed.tzinfo is not None and parsed.utcoffset() == timedelta(0)


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


if __name__ == "__main__":
    unittest.main()
