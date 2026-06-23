"""Auth hardening: the API bearer must be a signed api_token, not a raw user_id.

See docs/superpowers/specs/2026-06-23-AUTH-HARDENING-SPEC.md. These tests prove
the security property: a signed token authenticates, a raw UUID is rejected once
the legacy deprecation flag is off (its production default), and forged/garbage
tokens never authenticate.
"""
import unittest
import uuid as _uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app as fastapi_app
from app.db import Base, get_session
from app.models import User
from app.auth import generate_api_token, verify_api_token, generate_session_token


class TestApiTokenAuth(unittest.TestCase):
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

        fastapi_app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(fastapi_app, raise_server_exceptions=False)
        self.db = self.SessionLocal()
        self.user = User(email="auth@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.uid = str(self.user.id)

    def tearDown(self):
        self.db.close()
        fastapi_app.dependency_overrides.clear()

    # --- unit: round-trip + rejection ---
    def test_token_roundtrip(self):
        tok = generate_api_token(self.uid)
        self.assertNotEqual(tok, self.uid)          # not the raw uuid
        self.assertEqual(verify_api_token(tok), self.uid)

    def test_verify_rejects_garbage_and_raw_uuid(self):
        self.assertIsNone(verify_api_token("not-a-token"))
        self.assertIsNone(verify_api_token(self.uid))   # raw uuid is not a signed token

    # --- endpoint behavior via require_api_user (/settings is auth-gated) ---
    def _get_settings(self, bearer):
        return self.client.get("/api/v1/settings", headers={"Authorization": f"Bearer {bearer}"})

    def test_signed_token_authenticates(self):
        self.assertEqual(self._get_settings(generate_api_token(self.uid)).status_code, 200)

    def test_raw_uuid_rejected_when_legacy_off(self):
        with patch("app.config.ALLOW_LEGACY_UUID_BEARER", False):
            self.assertEqual(self._get_settings(self.uid).status_code, 401)
            # signed token still works with legacy off
            self.assertEqual(self._get_settings(generate_api_token(self.uid)).status_code, 200)

    def test_raw_uuid_accepted_when_legacy_on(self):
        with patch("app.config.ALLOW_LEGACY_UUID_BEARER", True):
            self.assertEqual(self._get_settings(self.uid).status_code, 200)

    def test_tampered_token_rejected_even_with_legacy_on(self):
        tampered = generate_api_token(self.uid)[:-3] + "xyz"
        with patch("app.config.ALLOW_LEGACY_UUID_BEARER", True):
            self.assertEqual(self._get_settings(tampered).status_code, 401)

    def test_no_bearer_is_401(self):
        self.assertEqual(self.client.get("/api/v1/settings").status_code, 401)

    # --- the discovery sort gate uses the same resolver ---
    def test_discovery_sort_gate_requires_signed_token(self):
        with patch("app.config.ALLOW_LEGACY_UUID_BEARER", False):
            # a raw uuid no longer counts as "signed in" for paid sorting
            r = self.client.get(
                "/api/v1/apps/search?sort=newest",
                headers={"Authorization": f"Bearer {self.uid}"},
            )
            self.assertEqual(r.status_code, 401)
            # a valid signed token passes the gate
            ok = self.client.get(
                "/api/v1/apps/search?sort=newest",
                headers={"Authorization": f"Bearer {generate_api_token(self.uid)}"},
            )
            self.assertEqual(ok.status_code, 200)

    # --- exchange mints a working api_token ---
    def test_exchange_returns_usable_api_token(self):
        session_token = generate_session_token(self.uid, self.user.email)
        resp = self.client.post("/api/v1/auth/exchange", json={"session_token": session_token})
        self.assertEqual(resp.status_code, 200)
        api_token = resp.json().get("api_token")
        self.assertTrue(api_token)
        self.assertEqual(verify_api_token(api_token), self.uid)
        with patch("app.config.ALLOW_LEGACY_UUID_BEARER", False):
            self.assertEqual(self._get_settings(api_token).status_code, 200)


if __name__ == "__main__":
    unittest.main()
