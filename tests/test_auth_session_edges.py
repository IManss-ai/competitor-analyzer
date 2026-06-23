import unittest
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, MagicLinkToken
from app import auth


class AuthTokenEdgeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="edge@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()

    def test_verify_unknown_token_returns_none(self):
        self.assertIsNone(auth.verify_magic_link_token("never-issued-token", self.db))

    def test_verify_expired_token_returns_none_and_deletes_row(self):
        token = auth.generate_magic_link_token(str(self.user.id), self.db, expires_minutes=10)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        row = self.db.query(MagicLinkToken).filter_by(token_hash=token_hash).first()
        # force expiry in the past
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.db.commit()

        self.assertIsNone(auth.verify_magic_link_token(token, self.db))
        # expired token must be consumed/deleted
        self.assertIsNone(
            self.db.query(MagicLinkToken).filter_by(token_hash=token_hash).first()
        )

    def test_generate_accepts_uuid_object(self):
        token = auth.generate_magic_link_token(self.user.id, self.db)
        returned = auth.verify_magic_link_token(token, self.db)
        self.assertEqual(returned, str(self.user.id))

    def test_distinct_calls_produce_distinct_tokens(self):
        t1 = auth.generate_magic_link_token(str(self.user.id), self.db)
        t2 = auth.generate_magic_link_token(str(self.user.id), self.db)
        self.assertNotEqual(t1, t2)
        # both stored as separate rows
        self.assertEqual(self.db.query(MagicLinkToken).count(), 2)

    def test_wrong_token_does_not_consume_valid_one(self):
        token = auth.generate_magic_link_token(str(self.user.id), self.db)
        self.assertIsNone(auth.verify_magic_link_token("bogus", self.db))
        # the real token still works afterwards
        self.assertEqual(auth.verify_magic_link_token(token, self.db), str(self.user.id))


class GetOrCreateUserTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_creates_user_when_absent(self):
        user = auth.get_or_create_user("fresh@example.com", self.db)
        self.assertEqual(user.email, "fresh@example.com")
        self.assertIsNotNone(user.id)
        self.assertEqual(self.db.query(User).filter_by(email="fresh@example.com").count(), 1)

    def test_idempotent_returns_existing_user(self):
        first = auth.get_or_create_user("dup@example.com", self.db)
        first_id = first.id
        second = auth.get_or_create_user("dup@example.com", self.db)
        self.assertEqual(second.id, first_id)
        self.assertEqual(self.db.query(User).filter_by(email="dup@example.com").count(), 1)


class SendMagicLinkEmailTests(unittest.IsolatedAsyncioTestCase):
    async def test_dummy_key_short_circuits_no_network(self):
        with patch.object(auth.httpx, "AsyncClient") as client_cls:
            await auth.send_magic_link_email(
                "user@example.com", "https://x/y", "DUMMY-key", "no-reply@x.com"
            )
            client_cls.assert_not_called()

    async def test_empty_key_short_circuits_no_network(self):
        with patch.object(auth.httpx, "AsyncClient") as client_cls:
            await auth.send_magic_link_email(
                "user@example.com", "https://x/y", "", "no-reply@x.com"
            )
            client_cls.assert_not_called()

    async def test_real_key_posts_to_resend_and_raises_for_status(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=resp)
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=mock_client)
        cm.__aexit__ = AsyncMock(return_value=False)

        with patch.object(auth.httpx, "AsyncClient", return_value=cm):
            await auth.send_magic_link_email(
                "user@example.com", "https://app/magic?t=1", "re_realkey", "no-reply@x.com"
            )

        mock_client.post.assert_awaited_once()
        args, kwargs = mock_client.post.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer re_realkey")
        self.assertEqual(kwargs["json"]["to"], ["user@example.com"])
        self.assertIn("https://app/magic?t=1", kwargs["json"]["text"])
        resp.raise_for_status.assert_called_once()


class SessionTokenTests(unittest.TestCase):
    def test_roundtrip_valid(self):
        token = auth.generate_session_token("uid-123", "a@b.com")
        data = auth.verify_session_token(token)
        self.assertEqual(data, {"user_id": "uid-123", "email": "a@b.com"})

    def test_garbage_token_returns_none(self):
        self.assertIsNone(auth.verify_session_token("not-a-real-token"))

    def test_expired_token_returns_none(self):
        token = auth.generate_session_token("uid-123", "a@b.com")
        # max_age is 300s; patch loads to raise to simulate expiry path
        with patch.object(auth._session_serializer, "loads", side_effect=Exception("expired")):
            self.assertIsNone(auth.verify_session_token(token))


class PasswordHashTests(unittest.TestCase):
    def test_hash_is_deterministic_and_salted(self):
        h1 = auth.hash_password("hunter2")
        h2 = auth.hash_password("hunter2")
        self.assertEqual(h1, h2)
        # salted: not a bare sha256 of the password
        self.assertNotEqual(h1, hashlib.sha256(b"hunter2").hexdigest())

    def test_different_passwords_differ(self):
        self.assertNotEqual(auth.hash_password("a"), auth.hash_password("b"))

    def test_check_password_correct(self):
        self.assertTrue(auth.check_password("hunter2", auth.hash_password("hunter2")))

    def test_check_password_wrong(self):
        self.assertFalse(auth.check_password("nope", auth.hash_password("hunter2")))

    def test_check_password_none_hash_returns_false(self):
        self.assertFalse(auth.check_password("anything", None))

    def test_check_password_empty_hash_returns_false(self):
        self.assertFalse(auth.check_password("anything", ""))


if __name__ == "__main__":
    unittest.main()
