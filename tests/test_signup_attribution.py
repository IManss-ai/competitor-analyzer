"""Server-side UTM attribution capture at signup.

Marketing attribution was blind: no server-side capture of utm_* params, so
signups could not be traced to campaigns (Wave 2 LinkedIn teardown, launch
posts). Signup endpoints now accept an optional `attribution` object
({utm_source, utm_medium, utm_campaign, referrer}) persisted on the User row
at CREATION only — first-touch, never overwritten on later logins, values
sanitized (truncated, non-strings dropped), and absent/garbage attribution
never breaks auth.
"""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User

ATTRIBUTION = {
    "utm_source": "linkedin",
    "utm_medium": "social",
    "utm_campaign": "wave2-teardown",
    "referrer": "https://www.linkedin.com/feed/",
}


class _ClientCase(unittest.TestCase):
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

    def _user(self, email):
        return self.db.execute(select(User).where(User.email == email)).scalar_one_or_none()


class TestDirectLoginAttribution(_ClientCase):
    def test_instant_signup_stores_attribution(self):
        res = self.client.post(
            "/api/v1/auth/direct-login",
            json={"email": "new@example.test", "password": "pw12345", "attribution": ATTRIBUTION},
        )
        self.assertEqual(res.status_code, 200)
        user = self._user("new@example.test")
        self.assertEqual(user.utm_source, "linkedin")
        self.assertEqual(user.utm_medium, "social")
        self.assertEqual(user.utm_campaign, "wave2-teardown")
        self.assertEqual(user.signup_referrer, "https://www.linkedin.com/feed/")

    def test_existing_user_login_never_overwrites(self):
        self.client.post(
            "/api/v1/auth/direct-login",
            json={"email": "u@example.test", "password": "pw12345", "attribution": ATTRIBUTION},
        )
        res = self.client.post(
            "/api/v1/auth/direct-login",
            json={
                "email": "u@example.test",
                "password": "pw12345",
                "attribution": {"utm_source": "twitter", "utm_campaign": "hijack"},
            },
        )
        self.assertEqual(res.status_code, 200)
        user = self._user("u@example.test")
        self.assertEqual(user.utm_source, "linkedin")
        self.assertEqual(user.utm_campaign, "wave2-teardown")

    def test_signup_without_attribution_leaves_fields_null(self):
        res = self.client.post(
            "/api/v1/auth/direct-login",
            json={"email": "bare@example.test", "password": "pw12345"},
        )
        self.assertEqual(res.status_code, 200)
        user = self._user("bare@example.test")
        self.assertIsNone(user.utm_source)
        self.assertIsNone(user.signup_referrer)

    def test_garbage_attribution_is_sanitized_not_fatal(self):
        res = self.client.post(
            "/api/v1/auth/direct-login",
            json={
                "email": "garb@example.test",
                "password": "pw12345",
                "attribution": {
                    "utm_source": "x" * 5000,          # truncated, not stored raw
                    "utm_medium": {"nested": "dict"},  # non-string -> dropped
                    "utm_campaign": 42,                # non-string -> dropped
                    "unknown_key": "ignored",
                },
            },
        )
        self.assertEqual(res.status_code, 200)
        user = self._user("garb@example.test")
        self.assertEqual(len(user.utm_source), 200)
        self.assertIsNone(user.utm_medium)
        self.assertIsNone(user.utm_campaign)

    def test_attribution_as_non_dict_is_ignored(self):
        res = self.client.post(
            "/api/v1/auth/direct-login",
            json={"email": "nd@example.test", "password": "pw12345", "attribution": "utm_source=x"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(self._user("nd@example.test").utm_source)


class TestMagicLinkAttribution(_ClientCase):
    def test_new_email_signup_stores_attribution(self):
        with patch("app.routes.api_v1.send_magic_link_email") as send:
            res = self.client.post(
                "/api/v1/auth/login",
                json={"email": "magic@example.test", "attribution": ATTRIBUTION},
            )
        self.assertEqual(res.status_code, 200)
        send.assert_called_once()
        user = self._user("magic@example.test")
        self.assertEqual(user.utm_source, "linkedin")
        self.assertEqual(user.signup_referrer, "https://www.linkedin.com/feed/")

    def test_existing_email_login_never_overwrites(self):
        with patch("app.routes.api_v1.send_magic_link_email"):
            self.client.post(
                "/api/v1/auth/login",
                json={"email": "m2@example.test", "attribution": ATTRIBUTION},
            )
            self.client.post(
                "/api/v1/auth/login",
                json={"email": "m2@example.test", "attribution": {"utm_source": "hn"}},
            )
        self.assertEqual(self._user("m2@example.test").utm_source, "linkedin")


if __name__ == "__main__":
    unittest.main()
