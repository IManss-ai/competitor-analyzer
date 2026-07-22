"""Audit 2026-07-21 finding B: malformed path UUIDs must be client errors.

Unguarded ``uuid.UUID(...)`` parses inside handlers turned a malformed id into a
raw ValueError-500. The shared guard ``_parse_uuid_or_404`` (api_v1.py) now
returns 404 — the same answer a well-formed id that matches nothing gets, and
the same pattern local_business.trigger_local_scan already used.
"""
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User


class TestMalformedUuidReturns404(unittest.TestCase):
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
        # raise_server_exceptions=False so an unguarded ValueError shows up as a
        # 500 status (the regression this file pins) instead of a test error.
        self.client = TestClient(app, raise_server_exceptions=False)
        self.db = self.SessionLocal()
        self.user = User(email="uuid-guard@example.com", free_test_used=False)
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    BAD_ID = "not-a-uuid"

    def _assert_404(self, resp):
        self.assertEqual(
            resp.status_code, 404,
            f"expected 404 for malformed id, got {resp.status_code}: {resp.text[:200]}",
        )

    def test_patch_competitor_malformed_id(self):
        resp = self.client.patch(
            f"/api/v1/competitors/{self.BAD_ID}", json={"name": "x"}, headers=self.auth
        )
        self._assert_404(resp)

    def test_probe_careers_malformed_id(self):
        resp = self.client.post(
            f"/api/v1/competitors/{self.BAD_ID}/probe-careers", headers=self.auth
        )
        self._assert_404(resp)

    def test_delete_competitor_malformed_id(self):
        resp = self.client.delete(f"/api/v1/competitors/{self.BAD_ID}", headers=self.auth)
        self._assert_404(resp)

    def test_competitor_reviews_malformed_id(self):
        resp = self.client.get(
            f"/api/v1/competitors/{self.BAD_ID}/reviews", headers=self.auth
        )
        self._assert_404(resp)

    def test_queue_approve_malformed_id(self):
        resp = self.client.post(
            f"/api/v1/queue/{self.BAD_ID}/approve", json={}, headers=self.auth
        )
        self._assert_404(resp)

    def test_local_patch_competitor_malformed_id(self):
        resp = self.client.patch(
            f"/api/v1/local/competitors/{self.BAD_ID}",
            json={"business_type": "local"},
            headers=self.auth,
        )
        self._assert_404(resp)

    def test_local_social_posts_malformed_id(self):
        resp = self.client.get(
            f"/api/v1/local/competitors/{self.BAD_ID}/social-posts", headers=self.auth
        )
        self._assert_404(resp)


if __name__ == "__main__":
    unittest.main()
