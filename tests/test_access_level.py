"""Tests for the usage-based paywall access level.

access_level() is the single source of truth for who is locked. These cover the
full decision matrix plus the require_write_access 402 boundary.
"""
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

import app.access as access


def _user(email="u@example.com", status="trialing", free_test_used=False):
    return SimpleNamespace(
        id=uuid.uuid4(),
        email=email,
        subscription_status=status,
        free_test_used=free_test_used,
    )


class TestAccessLevel(unittest.TestCase):
    def test_flag_off_always_full(self):
        # Even a non-paying user who used their test is "full" while the flag is off.
        with patch.object(access, "PAYWALL_ENABLED", False):
            u = _user(status="trialing", free_test_used=True)
            self.assertEqual(access.access_level(u), "full")

    def test_active_subscription_is_full(self):
        with patch.object(access, "PAYWALL_ENABLED", True):
            u = _user(status="active", free_test_used=True)
            self.assertEqual(access.access_level(u), "full")

    def test_comped_email_is_full_case_insensitive(self):
        with patch.object(access, "PAYWALL_ENABLED", True), \
             patch.object(access, "COMPED_EMAILS", {"founder@example.com"}):
            u = _user(email="Founder@Example.com", status="trialing", free_test_used=True)
            self.assertEqual(access.access_level(u), "full")

    def test_free_test_not_used_is_full(self):
        with patch.object(access, "PAYWALL_ENABLED", True), \
             patch.object(access, "COMPED_EMAILS", set()):
            u = _user(status="trialing", free_test_used=False)
            self.assertEqual(access.access_level(u), "full")

    def test_free_test_used_not_paying_is_read_only(self):
        with patch.object(access, "PAYWALL_ENABLED", True), \
             patch.object(access, "COMPED_EMAILS", set()):
            u = _user(status="trialing", free_test_used=True)
            self.assertEqual(access.access_level(u), "read_only")
            self.assertTrue(access.is_read_only(u))

    def test_canceled_and_used_is_read_only(self):
        with patch.object(access, "PAYWALL_ENABLED", True), \
             patch.object(access, "COMPED_EMAILS", set()):
            u = _user(status="canceled", free_test_used=True)
            self.assertEqual(access.access_level(u), "read_only")


class TestRequireWriteAccess(unittest.TestCase):
    def _fake_db(self, user):
        return SimpleNamespace(get=lambda model, uid: user)

    def test_locked_user_gets_402(self):
        locked = _user(status="trialing", free_test_used=True)
        with patch.object(access, "PAYWALL_ENABLED", True), \
             patch.object(access, "COMPED_EMAILS", set()), \
             patch("app.routes.api_v1.require_api_user", return_value=str(locked.id)):
            with self.assertRaises(HTTPException) as ctx:
                access.require_write_access(authorization="Bearer x", db=self._fake_db(locked))
            self.assertEqual(ctx.exception.status_code, 402)

    def test_full_user_passes_through(self):
        full = _user(status="active", free_test_used=True)
        with patch.object(access, "PAYWALL_ENABLED", True), \
             patch.object(access, "COMPED_EMAILS", set()), \
             patch("app.routes.api_v1.require_api_user", return_value=str(full.id)):
            result = access.require_write_access(authorization="Bearer x", db=self._fake_db(full))
            self.assertEqual(result, str(full.id))


if __name__ == "__main__":
    unittest.main()
