"""Tests for the /api/v1/* JSON endpoints (Next.js frontend API)."""
import unittest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.auth import generate_session_token


def _make_engine():
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


class TestApiV1(unittest.TestCase):
    def setUp(self):
        self.engine = _make_engine()
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

        # Seed a test user
        self.db = self.SessionLocal()
        self.user = User(email="api@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.user_id = str(self.user.id)
        self.auth_headers = {"Authorization": f"Bearer {self.user_id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    # ── 1. POST /api/v1/auth/login ────────────────────────────────────────────

    @patch("app.routes.api_v1.send_magic_link_email", new_callable=AsyncMock)
    def test_login_returns_ok(self, mock_send):
        """A valid email triggers the magic link flow and returns {"ok": true}."""
        resp = self.client.post("/api/v1/auth/login", json={"email": "new@example.com"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": True})

    def test_login_missing_email_returns_422(self):
        """An empty email payload should return 422."""
        resp = self.client.post("/api/v1/auth/login", json={"email": ""})
        self.assertEqual(resp.status_code, 422)

    # ── 2. POST /api/v1/auth/exchange ─────────────────────────────────────────

    def test_exchange_valid_token_returns_user_data(self):
        """A valid session token returns user_id and email."""
        token = generate_session_token(self.user_id, self.user.email)
        resp = self.client.post("/api/v1/auth/exchange", json={"session_token": token})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["user_id"], self.user_id)
        self.assertEqual(data["email"], self.user.email)

    def test_exchange_invalid_token_returns_401(self):
        """An invalid or expired session token returns 401."""
        resp = self.client.post("/api/v1/auth/exchange", json={"session_token": "not-a-valid-token"})
        self.assertEqual(resp.status_code, 401)

    def test_exchange_empty_token_returns_401(self):
        """An empty session_token returns 401."""
        resp = self.client.post("/api/v1/auth/exchange", json={"session_token": ""})
        self.assertEqual(resp.status_code, 401)

    # ── 3. GET /api/v1/dashboard ──────────────────────────────────────────────

    def test_dashboard_requires_auth(self):
        """No Authorization header → 401."""
        resp = self.client.get("/api/v1/dashboard")
        self.assertEqual(resp.status_code, 401)

    def test_dashboard_authenticated_returns_structure(self):
        """Authenticated dashboard returns events, pending_count, competitor_count, last_scan."""
        resp = self.client.get("/api/v1/dashboard", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("events", data)
        self.assertIn("pending_count", data)
        self.assertIn("competitor_count", data)
        self.assertIn("last_scan", data)
        self.assertIsInstance(data["events"], list)

    def test_dashboard_empty_state(self):
        """Fresh user has 0 competitors, 0 pending, null last_scan."""
        resp = self.client.get("/api/v1/dashboard", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(data["competitor_count"], 0)
        self.assertEqual(data["pending_count"], 0)
        self.assertIsNone(data["last_scan"])

    def test_dashboard_reflects_seeded_data(self):
        """Dashboard counts update when competitors and events are added."""
        comp = Competitor(user_id=self.user.id, url="https://rival.com", name="Rival")
        self.db.add(comp)
        self.db.flush()

        snap_b = Snapshot(competitor_id=comp.id, raw_text="A", char_count=1)
        snap_a = Snapshot(competitor_id=comp.id, raw_text="AB", char_count=2)
        self.db.add_all([snap_b, snap_a])
        self.db.flush()

        event = ChangeEvent(
            competitor_id=comp.id,
            net_char_delta=1,
            change_type="feature_add",
            brief_text="New feature launched.",
            week_label="2026-W22",
            snapshot_before_id=snap_b.id,
            snapshot_after_id=snap_a.id,
            detected_at=datetime.now(timezone.utc),
        )
        self.db.add(event)
        self.db.flush()

        action = ApprovedAction(
            user_id=self.user.id,
            change_event_id=event.id,
            action_type="retention_email",
            original_draft="Hello world",
        )
        self.db.add(action)
        self.db.commit()

        resp = self.client.get("/api/v1/dashboard", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(data["competitor_count"], 1)
        self.assertEqual(data["pending_count"], 1)
        self.assertEqual(len(data["events"]), 1)
        self.assertEqual(data["events"][0]["competitor_name"], "Rival")

    # ── 4. GET /api/v1/competitors ────────────────────────────────────────────

    def test_list_competitors_requires_auth(self):
        """No auth header → 401."""
        resp = self.client.get("/api/v1/competitors")
        self.assertEqual(resp.status_code, 401)

    def test_list_competitors_empty(self):
        """Fresh user has empty competitors list."""
        resp = self.client.get("/api/v1/competitors", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("competitors", data)
        self.assertEqual(data["competitors"], [])
        self.assertFalse(data["at_limit"])

    def test_list_competitors_returns_seeded(self):
        """After adding a competitor it shows up in the list."""
        comp = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(comp)
        self.db.commit()

        resp = self.client.get("/api/v1/competitors", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(len(data["competitors"]), 1)
        self.assertEqual(data["competitors"][0]["url"], "https://acme.com")
        self.assertEqual(data["competitors"][0]["name"], "Acme")

    # ── 5. POST /api/v1/competitors ───────────────────────────────────────────

    def test_add_competitor_requires_auth(self):
        """No auth header → 401."""
        resp = self.client.post("/api/v1/competitors", json={"url": "https://acme.com"})
        self.assertEqual(resp.status_code, 401)

    def test_add_competitor_creates_record(self):
        """POSTing a URL creates a competitor and returns id/url/name."""
        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "https://rival.com", "name": "Rival Co"},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("id", data)
        self.assertEqual(data["url"], "https://rival.com")
        self.assertEqual(data["name"], "Rival Co")

    def test_add_competitor_prepends_https(self):
        """URLs without scheme get https:// prepended."""
        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "rival.com"},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["url"], "https://rival.com")

    def test_add_competitor_links_public_catalog_app(self):
        """Organic catalog growth: tracking a URL creates/links a public App row
        (source=user_tracked, scan_tier=full) and sets Competitor.app_id."""
        from app.models import App
        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "https://rival.com", "name": "Rival Co"},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        comp = self.db.query(Competitor).filter(Competitor.url == "https://rival.com").one()
        self.assertIsNotNone(comp.app_id)
        app_row = self.db.get(App, comp.app_id)
        self.assertEqual(app_row.source, "user_tracked")
        self.assertEqual(app_row.scan_tier, "full")

    def test_add_competitor_reuses_existing_catalog_app(self):
        """Tracking a URL that already has a catalog App links, not duplicates."""
        from app.models import App
        existing = App(slug="rival", url="rival.com", name="Rival", source="seed", scan_tier="cheap")
        self.db.add(existing)
        self.db.commit()
        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "https://rival.com"},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.db.query(App).count(), 1)
        comp = self.db.query(Competitor).filter(Competitor.url == "https://rival.com").one()
        self.assertEqual(comp.app_id, existing.id)

    def test_add_competitor_enforces_limit(self):
        """Adding more than 7 competitors returns 400."""
        for i in range(7):
            self.db.add(Competitor(user_id=self.user.id, url=f"https://c{i}.com"))
        self.db.commit()

        resp = self.client.post(
            "/api/v1/competitors",
            json={"url": "https://toomany.com"},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 400)

    # ── 6. DELETE /api/v1/competitors/{id} ───────────────────────────────────

    def test_delete_competitor_soft_deletes(self):
        """Deleting a competitor sets active=False rather than removing the row."""
        comp = Competitor(user_id=self.user.id, url="https://gone.com")
        self.db.add(comp)
        self.db.commit()
        self.db.refresh(comp)

        resp = self.client.delete(
            f"/api/v1/competitors/{comp.id}",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": True})

        self.db.refresh(comp)
        self.assertFalse(comp.active)

    def test_delete_competitor_not_found_returns_404(self):
        """Deleting a non-existent competitor returns 404."""
        import uuid
        resp = self.client.delete(
            f"/api/v1/competitors/{uuid.uuid4()}",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 404)

    # ── 7. GET /api/v1/queue ──────────────────────────────────────────────────

    def test_queue_requires_auth(self):
        """No auth header → 401."""
        resp = self.client.get("/api/v1/queue")
        self.assertEqual(resp.status_code, 401)

    def test_queue_empty(self):
        """Fresh user has empty actions list."""
        resp = self.client.get("/api/v1/queue", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("actions", data)
        self.assertEqual(data["actions"], [])

    def test_queue_returns_pending_actions(self):
        """Pending (unapproved) actions appear in the queue."""
        comp = Competitor(user_id=self.user.id, url="https://rival.com", name="Rival")
        self.db.add(comp)
        self.db.flush()

        snap_b = Snapshot(competitor_id=comp.id, raw_text="A", char_count=1)
        snap_a = Snapshot(competitor_id=comp.id, raw_text="AB", char_count=2)
        self.db.add_all([snap_b, snap_a])
        self.db.flush()

        event = ChangeEvent(
            competitor_id=comp.id,
            net_char_delta=1,
            change_type="feature_add",
            brief_text="Launched a new feature.",
            week_label="2026-W22",
            snapshot_before_id=snap_b.id,
            snapshot_after_id=snap_a.id,
        )
        self.db.add(event)
        self.db.flush()

        action = ApprovedAction(
            user_id=self.user.id,
            change_event_id=event.id,
            action_type="retention_email",
            original_draft="Draft email content.",
        )
        self.db.add(action)
        self.db.commit()

        resp = self.client.get("/api/v1/queue", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(len(data["actions"]), 1)
        act = data["actions"][0]
        self.assertEqual(act["action_type"], "retention_email")
        self.assertEqual(act["competitor"]["name"], "Rival")
        self.assertEqual(act["change_event"]["brief_text"], "Launched a new feature.")

    # ── 8. POST /api/v1/queue/{action_id}/approve ────────────────────────────

    def test_approve_action_sets_approved_at(self):
        """Approving an action sets its approved_at timestamp."""
        comp = Competitor(user_id=self.user.id, url="https://rival.com", name="Rival")
        self.db.add(comp)
        self.db.flush()

        snap_b = Snapshot(competitor_id=comp.id, raw_text="A", char_count=1)
        snap_a = Snapshot(competitor_id=comp.id, raw_text="AB", char_count=2)
        self.db.add_all([snap_b, snap_a])
        self.db.flush()

        event = ChangeEvent(
            competitor_id=comp.id,
            net_char_delta=1,
            change_type="feature_add",
            snapshot_before_id=snap_b.id,
            snapshot_after_id=snap_a.id,
        )
        self.db.add(event)
        self.db.flush()

        action = ApprovedAction(
            user_id=self.user.id,
            change_event_id=event.id,
            action_type="retention_email",
            original_draft="Hello world",
        )
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)

        resp = self.client.post(
            f"/api/v1/queue/{action.id}/approve",
            json={},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": True})

        self.db.refresh(action)
        self.assertIsNotNone(action.approved_at)

    def test_approve_action_not_found_returns_404(self):
        """Approving a non-existent action returns 404."""
        import uuid
        resp = self.client.post(
            f"/api/v1/queue/{uuid.uuid4()}/approve",
            json={},
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 404)

    # ── 9. GET /api/v1/trends ─────────────────────────────────────────────────

    def test_trends_requires_auth(self):
        """No auth header → 401."""
        resp = self.client.get("/api/v1/trends")
        self.assertEqual(resp.status_code, 401)

    def test_trends_returns_weeks_and_competitors(self):
        """Response has 'weeks' list (12 entries) and 'competitors' list."""
        resp = self.client.get("/api/v1/trends", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("weeks", data)
        self.assertIn("competitors", data)
        self.assertEqual(len(data["weeks"]), 12)

    def test_trends_counts_per_competitor(self):
        """Each competitor entry has 'counts' list aligned to the 12-week window."""
        comp = Competitor(user_id=self.user.id, url="https://rival.com", name="Rival")
        self.db.add(comp)
        self.db.commit()

        resp = self.client.get("/api/v1/trends", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(len(data["competitors"]), 1)
        self.assertEqual(len(data["competitors"][0]["counts"]), 12)

    # ── 10. GET /api/v1/settings ──────────────────────────────────────────────

    def test_settings_requires_auth(self):
        """No auth header → 401."""
        resp = self.client.get("/api/v1/settings")
        self.assertEqual(resp.status_code, 401)

    def test_settings_returns_user_info(self):
        """Authenticated settings returns id, email, subscription_status, trial_ends_at."""
        resp = self.client.get("/api/v1/settings", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], self.user_id)
        self.assertEqual(data["email"], "api@example.com")
        self.assertIn("subscription_status", data)
        self.assertIn("trial_ends_at", data)

    def test_settings_invalid_bearer_returns_401(self):
        """A non-UUID bearer token returns 401."""
        resp = self.client.get("/api/v1/settings", headers={"Authorization": "Bearer not-a-uuid"})
        self.assertEqual(resp.status_code, 401)

    # ── 11. User isolation ────────────────────────────────────────────────────

    def test_competitors_user_isolation(self):
        """A competitor belonging to another user is not returned."""
        other = User(email="other@example.com")
        self.db.add(other)
        self.db.flush()
        self.db.add(Competitor(user_id=other.id, url="https://other.com", name="Other"))
        self.db.commit()

        resp = self.client.get("/api/v1/competitors", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(data["competitors"], [])

    def test_dashboard_user_isolation(self):
        """Another user's events do not appear in our dashboard."""
        other = User(email="other2@example.com")
        self.db.add(other)
        self.db.flush()

        comp = Competitor(user_id=other.id, url="https://other2.com", name="OtherComp")
        self.db.add(comp)
        self.db.flush()

        snap_b = Snapshot(competitor_id=comp.id, raw_text="A", char_count=1)
        snap_a = Snapshot(competitor_id=comp.id, raw_text="AB", char_count=2)
        self.db.add_all([snap_b, snap_a])
        self.db.flush()

        self.db.add(ChangeEvent(
            competitor_id=comp.id,
            net_char_delta=1,
            change_type="feature_add",
            snapshot_before_id=snap_b.id,
            snapshot_after_id=snap_a.id,
        ))
        self.db.commit()

        resp = self.client.get("/api/v1/dashboard", headers=self.auth_headers)
        data = resp.json()
        self.assertEqual(data["events"], [])
        self.assertEqual(data["competitor_count"], 0)


if __name__ == "__main__":
    unittest.main()
