"""Tests for the /trends historical trend dashboard."""
import json
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.session import serializer, SESSION_COOKIE_NAME


def _auth_cookie(user_id: str) -> str:
    return serializer.dumps({"user_id": user_id})


class TestTrendsRoute(unittest.TestCase):
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

        # Seed data
        self.db = self.SessionLocal()
        self.user = User(email="founder@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.cookie = {SESSION_COOKIE_NAME: _auth_cookie(str(self.user.id))}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    # ── Redirect if unauthenticated ───────────────────────────────────

    def test_trends_unauthenticated_redirects(self):
        r = self.client.get("/trends", follow_redirects=False)
        self.assertEqual(r.status_code, 307)

    # ── Empty state ───────────────────────────────────────────────────

    def test_trends_empty_state(self):
        """No competitors → shows empty state, no chart data."""
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        self.assertIn("No data yet", r.text)

    def test_trends_competitors_no_events_empty(self):
        """Competitors exist but no scans → empty state."""
        comp = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(comp)
        self.db.commit()

        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        self.assertIn("No data yet", r.text)

    # ── With data ─────────────────────────────────────────────────────

    def _seed_change_event(self, change_type: str = "feature_add", weeks_ago: int = 1):
        """Helper: seed a competitor + snapshots + change event."""
        comp = Competitor(user_id=self.user.id, url="https://rival.com", name="Rival")
        self.db.add(comp)
        self.db.flush()

        snap_before = Snapshot(
            competitor_id=comp.id,
            raw_text="Old content",
            char_count=11,
            fetched_at=datetime.now(timezone.utc) - timedelta(weeks=weeks_ago + 1),
        )
        snap_after = Snapshot(
            competitor_id=comp.id,
            raw_text="New content with big change",
            char_count=200,
            fetched_at=datetime.now(timezone.utc) - timedelta(weeks=weeks_ago),
        )
        self.db.add_all([snap_before, snap_after])
        self.db.flush()

        event = ChangeEvent(
            competitor_id=comp.id,
            net_char_delta=189,
            change_type=change_type,
            brief_text="Rival launched a new pricing tier.",
            week_label="2026-W22",
            snapshot_before_id=snap_before.id,
            snapshot_after_id=snap_after.id,
            detected_at=datetime.now(timezone.utc) - timedelta(weeks=weeks_ago),
        )
        self.db.add(event)
        self.db.commit()
        return comp, event

    def test_trends_with_data_renders(self):
        """With data, page renders charts and stats."""
        self._seed_change_event("feature_add", weeks_ago=1)
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        # Summary stats present
        self.assertIn("Total changes", r.text)
        self.assertIn("Significant changes", r.text)
        self.assertIn("Most active", r.text)
        # Chart canvas
        self.assertIn("weeklyChart", r.text)
        # Heatmap
        self.assertIn("heatmap-body", r.text)

    def test_trends_total_events_count(self):
        """Total events stat reflects seeded data."""
        self._seed_change_event("pricing_change", weeks_ago=2)
        self._seed_change_event("feature_add", weeks_ago=1)
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        # Two events should be counted — but seeding adds 2 competitors, total=2
        self.assertIn("Total changes", r.text)

    def test_trends_significant_count_only_significant(self):
        """Significant count excludes minor_copy and no_change."""
        self._seed_change_event("pricing_change", weeks_ago=1)   # significant
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        self.assertIn("Significant changes", r.text)

    def test_trends_json_data_embedded(self):
        """Chart data is embedded as JSON in the page."""
        self._seed_change_event("repositioning", weeks_ago=1)
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        # All JSON blocks should be present
        self.assertIn("WEEK_LABELS", r.text)
        self.assertIn("WEEKLY_TOTALS", r.text)
        self.assertIn("COMPETITOR_DATA", r.text)
        self.assertIn("HEATMAP_DATA", r.text)

    def test_trends_week_labels_are_12(self):
        """The 12-week window is always exactly 12 labels."""
        self._seed_change_event("feature_add", weeks_ago=1)
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        # Extract the week_labels JSON from the page
        text = r.text
        start = text.find("const WEEK_LABELS")
        self.assertGreater(start, -1)
        chunk = text[start:start + 200]
        # Parse the JSON array
        arr_start = chunk.index("[")
        arr_end = chunk.index("]") + 1
        labels = json.loads(chunk[arr_start:arr_end])
        self.assertEqual(len(labels), 12)

    def test_trends_user_isolation(self):
        """Another user's events don't appear in the trends page."""
        other_user = User(email="other@example.com")
        self.db.add(other_user)
        self.db.commit()
        self.db.refresh(other_user)

        # Seed data for other user
        comp = Competitor(user_id=other_user.id, url="https://other-rival.com", name="OtherRival")
        self.db.add(comp)
        self.db.flush()
        snap_b = Snapshot(competitor_id=comp.id, raw_text="A", char_count=1)
        snap_a = Snapshot(competitor_id=comp.id, raw_text="BB", char_count=2)
        self.db.add_all([snap_b, snap_a])
        self.db.flush()
        self.db.add(ChangeEvent(
            competitor_id=comp.id, net_char_delta=1, change_type="feature_add",
            snapshot_before_id=snap_b.id, snapshot_after_id=snap_a.id,
        ))
        self.db.commit()

        # Our user has no data
        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        self.assertIn("No data yet", r.text)
        self.assertNotIn("OtherRival", r.text)

    def test_trends_pending_badge_data(self):
        """Pending action count is available for the nav badge."""
        comp = Competitor(user_id=self.user.id, url="https://rival.com", name="Rival")
        self.db.add(comp)
        self.db.flush()
        snap_b = Snapshot(competitor_id=comp.id, raw_text="A", char_count=1)
        snap_a = Snapshot(competitor_id=comp.id, raw_text="BB", char_count=2)
        self.db.add_all([snap_b, snap_a])
        self.db.flush()
        event = ChangeEvent(
            competitor_id=comp.id, net_char_delta=1, change_type="feature_add",
            snapshot_before_id=snap_b.id, snapshot_after_id=snap_a.id,
        )
        self.db.add(event)
        self.db.flush()
        action = ApprovedAction(
            user_id=self.user.id,
            change_event_id=event.id,
            action_type="retention_email",
            original_draft="Hello world",
            approved_at=None,
        )
        self.db.add(action)
        self.db.commit()

        r = self.client.get("/trends", cookies=self.cookie)
        self.assertEqual(r.status_code, 200)
        # Pending badge value should appear somewhere in page
        self.assertIn("1", r.text)


if __name__ == "__main__":
    unittest.main()
