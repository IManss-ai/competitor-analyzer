"""Read-only users keep their already-generated battle card.

Decision (2026-07-05, founder): after the one free test is consumed, the user's
already-generated card stays viewable — the paywall gates NEW generation, not
reads of what they already earned. GET /battlecards/generate/{id} therefore:

- read-only + cached card  → 200 with the cached payload, NEVER a paid call,
  and `force=true` must NOT bust the cache for them;
- read-only + no cache     → 402 (nothing earned for this competitor);
- full users               → unchanged (fresh generation allowed).
"""
import json
import unittest
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, BattleCardCache


CACHED_PAYLOAD = {
    "executive_summary": "Cached summary from the free test.",
    "what_changed": [{"type": "pricing_change", "text": "Raised Starter to $29."}],
    "weaknesses": ["w1"],
    "strategic_signals": ["s1"],
    "playbook": ["p1", "p2", "p3", "p4", "p5"],
}


class TestGenerateReadOnlyCache(unittest.TestCase):
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

    def _make_user(self, email, free_test_used):
        user = User(email=email, free_test_used=free_test_used)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _make_comp(self, user, cached=False):
        comp = Competitor(
            user_id=user.id,
            url="https://rival.example.com",
            name="SaaS Rival",
            business_type="saas",
            active=True,
        )
        self.db.add(comp)
        self.db.commit()
        self.db.refresh(comp)
        if cached:
            self.db.add(BattleCardCache(
                competitor_id=comp.id,
                payload=json.dumps(CACHED_PAYLOAD),
                ai_generated=True,
            ))
            self.db.commit()
        return comp

    def _paywall_patches(self):
        return [
            patch("app.access.PAYWALL_ENABLED", True),
            patch("app.access.COMPED_EMAILS", set()),
            patch("app.llm.ai_available", return_value=True),
        ]

    def test_read_only_with_cache_gets_cached_card(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_comp(user, cached=True)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client") as get_client:
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["executive_summary"], CACHED_PAYLOAD["executive_summary"])
        get_client.assert_not_called()

    def test_read_only_force_true_still_serves_cache_no_paid_call(self):
        user = self._make_user("locked2@example.com", free_test_used=True)
        comp = self._make_comp(user, cached=True)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client") as get_client:
            resp = self.client.get(
                f"/api/v1/battlecards/generate/{comp.id}?force=true", headers=auth
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["executive_summary"], CACHED_PAYLOAD["executive_summary"])
        get_client.assert_not_called()

    def test_read_only_without_cache_still_402(self):
        user = self._make_user("locked3@example.com", free_test_used=True)
        comp = self._make_comp(user, cached=False)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client") as get_client:
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 402)
        get_client.assert_not_called()


if __name__ == "__main__":
    unittest.main()
