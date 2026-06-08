"""Coverage for the previously-untested /api/v1/* read endpoints and direct-login."""
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ReviewSnapshot
from app.auth import hash_password


class TestApiV1Endpoints(unittest.TestCase):
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
        self.user = User(email="api@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.user_id = str(self.user.id)
        self.auth = {"Authorization": f"Bearer {self.user_id}"}

        self.comp = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(self.comp)
        self.db.commit()
        self.db.refresh(self.comp)
        self.comp_id = str(self.comp.id)

        now = datetime.now(timezone.utc)
        snap_before = Snapshot(competitor_id=self.comp.id, fetched_at=now - timedelta(days=7), raw_text="old", char_count=3)
        snap_after = Snapshot(competitor_id=self.comp.id, fetched_at=now, raw_text="new text here", char_count=13)
        self.db.add_all([snap_before, snap_after])
        self.db.commit()
        self.db.refresh(snap_before)
        self.db.refresh(snap_after)
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id, detected_at=now, change_type="pricing_change",
            brief_text="Raised prices", week_label=now.strftime("%Y-W%V"), net_char_delta=150,
            snapshot_before_id=snap_before.id, snapshot_after_id=snap_after.id,
        ))
        self.db.add(ReviewSnapshot(
            competitor_id=self.comp.id, platform="g2", snapshot_at=now,
            avg_rating=4.2, total_reviews=10, complaint_count=2, top_complaints=None,
        ))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    # ── direct-login (instant signup) ─────────────────────────────────────────
    def test_direct_login_creates_user_on_first_use(self):
        resp = self.client.post(
            "/api/v1/auth/direct-login",
            json={"email": "fresh@example.com", "password": "hunter2pass"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["ok"])
        self.assertTrue(body["session_token"])
        self.assertIsNotNone(
            self.db.query(User).filter(User.email == "fresh@example.com").first()
        )

    def test_direct_login_wrong_password_401(self):
        existing = User(email="known@example.com", password_hash=hash_password("rightpass"))
        self.db.add(existing)
        self.db.commit()
        resp = self.client.post(
            "/api/v1/auth/direct-login",
            json={"email": "known@example.com", "password": "wrongpass"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_direct_login_missing_fields_422(self):
        resp = self.client.post("/api/v1/auth/direct-login", json={"email": "x@y.com"})
        self.assertEqual(resp.status_code, 422)

    # ── dashboard feed / activity ─────────────────────────────────────────────
    def test_dashboard_feed_returns_change_events(self):
        resp = self.client.get("/api/v1/dashboard/feed", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        events = resp.json()["events"]
        self.assertTrue(any(e["change_type"] == "pricing_change" for e in events))

    def test_dashboard_activity_returns_days(self):
        resp = self.client.get("/api/v1/dashboard/activity", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("days", resp.json())

    def test_dashboard_feed_requires_auth(self):
        self.assertEqual(self.client.get("/api/v1/dashboard/feed").status_code, 401)

    # ── competitor detail ─────────────────────────────────────────────────────
    def test_competitor_detail_full_structure(self):
        resp = self.client.get(f"/api/v1/competitors/{self.comp_id}/detail", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        for key in ("competitor", "change_events", "review_snapshots", "scan_history"):
            self.assertIn(key, body)
        self.assertEqual(body["competitor"]["id"], self.comp_id)

    def test_competitor_detail_invalid_uuid_400(self):
        resp = self.client.get("/api/v1/competitors/not-a-uuid/detail", headers=self.auth)
        self.assertEqual(resp.status_code, 400)

    def test_competitor_detail_unknown_404(self):
        import uuid
        resp = self.client.get(f"/api/v1/competitors/{uuid.uuid4()}/detail", headers=self.auth)
        self.assertEqual(resp.status_code, 404)

    # ── trends metrics ────────────────────────────────────────────────────────
    def test_trends_metrics_structure(self):
        resp = self.client.get("/api/v1/trends/metrics", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        for key in ("weeks", "weekly_changes", "type_breakdown", "review_trends"):
            self.assertIn(key, body)

    # ── settings get / patch ──────────────────────────────────────────────────
    def test_settings_get_returns_user(self):
        resp = self.client.get("/api/v1/settings", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["email"], "api@example.com")

    def test_settings_patch_updates_scan_schedule(self):
        resp = self.client.patch(
            "/api/v1/settings", headers=self.auth, json={"scan_schedule": "biweekly"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["scan_schedule"], "biweekly")


if __name__ == "__main__":
    unittest.main()
