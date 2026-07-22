"""Audit 2026-07-21 S10: malformed-UUID path params on legacy HTML routes must
return 404 (client error), never a raw ValueError-500.

Covers queue.py (approve/dismiss) and competitors.py (remove), extending the
Jul-21 #17 fix that already guards the api_v1 routes. These legacy routes sit
behind a session cookie, so each test authenticates the same way the app does
(a signed `serializer.dumps({"user_id": ...})` cookie) before hitting the
handler with a truncated/`undefined` id.
"""
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User
from app.session import require_current_user
from app.access import require_write_access_session


MALFORMED_IDS = ["undefined", "not-a-uuid", "123", "null", ""]


class TestAudit2RouteUuidGuards(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        self.db = self.SessionLocal()
        self.user = User(email="founder@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        user_id = str(self.user.id)

        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        # Override the auth dependencies directly so the test isolates the UUID
        # guard under test (the write-gate / session-cookie path is exercised
        # elsewhere and its global state must not make this test order-sensitive).
        app.dependency_overrides[get_session] = override_get_session
        app.dependency_overrides[require_current_user] = lambda: user_id
        app.dependency_overrides[require_write_access_session] = lambda: user_id

        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def test_queue_approve_malformed_id_returns_404_not_500(self):
        for bad in MALFORMED_IDS:
            if bad == "":
                continue  # empty path segment does not match the route
            with self.subTest(id=bad):
                resp = self.client.post(f"/queue/{bad}/approve")
                self.assertNotEqual(resp.status_code, 500, resp.text)
                self.assertEqual(resp.status_code, 404, resp.text)

    def test_queue_dismiss_malformed_id_returns_404_not_500(self):
        for bad in MALFORMED_IDS:
            if bad == "":
                continue
            with self.subTest(id=bad):
                resp = self.client.post(f"/queue/{bad}/dismiss")
                self.assertNotEqual(resp.status_code, 500, resp.text)
                self.assertEqual(resp.status_code, 404, resp.text)

    def test_competitors_remove_malformed_id_returns_404_not_500(self):
        for bad in MALFORMED_IDS:
            if bad == "":
                continue
            with self.subTest(id=bad):
                resp = self.client.post(f"/competitors/{bad}/remove")
                self.assertNotEqual(resp.status_code, 500, resp.text)
                self.assertEqual(resp.status_code, 404, resp.text)

    def test_well_formed_but_unknown_id_still_404_or_empty(self):
        # A valid-but-unknown UUID must NOT 500 either. queue/dismiss returns an
        # empty 200 (idempotent), approve/remove return 404 — none is a 500.
        import uuid as _uuid
        unknown = str(_uuid.uuid4())
        self.assertNotEqual(
            self.client.post(f"/queue/{unknown}/approve").status_code, 500
        )
        self.assertNotEqual(
            self.client.post(f"/queue/{unknown}/dismiss").status_code, 500
        )
        self.assertNotEqual(
            self.client.post(f"/competitors/{unknown}/remove").status_code, 500
        )


if __name__ == "__main__":
    unittest.main()
