"""Audit 2026-07-21 finding D (HIGH): free-test metering bypass via detail page.

GET /competitors/{id}/detail gated paid battlecard generation on
`not is_read_only(viewer)` — but a not-yet-tested free user has access_level
"full", so every detail view triggered a paid generation WITHOUT ever setting
free_test_used (only /battlecards/generate meters it). Net: unlimited paid
battlecards without consuming the one free test.

Fixed: paid generation on the detail path is reserved for paying subscribers
(active sub / comped / Polar-trialing with a billing relationship — see
_is_paying_subscriber in api_v1.py). Untested free users get cache-or-heuristic;
cache is served to every viewer; the page always renders 200.

NOTE: this intentionally supersedes the behavior pinned by
tests/test_detail_paywall.py::test_full_user_detail_still_generates_with_ai
(owned by another lane) — that test asserts the removed bypass.
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
from app.models import User, Competitor, Snapshot, ChangeEvent, BattleCardCache


def _valid_card_client():
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "executive_summary": "Rival shipped a pricing change.",
        "what_changed": [{"type": "pricing_change", "text": "Moved enterprise pricing behind a quote."}],
        "weaknesses": ["w1", "w2"],
        "strategic_signals": ["s1", "s2"],
        "playbook": ["a", "b", "c", "d", "e"],
    })
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_resp
    return mock_client


class TestDetailFreeTestMetering(unittest.TestCase):
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

    def _make_user(self, email, free_test_used=False, subscription_status=None):
        user = User(email=email, free_test_used=free_test_used)
        if subscription_status is not None:
            user.subscription_status = subscription_status
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _make_comp(self, user):
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
        before = Snapshot(competitor_id=comp.id, raw_text="Old copy", char_count=8)
        after = Snapshot(competitor_id=comp.id, raw_text="New longer copy here", char_count=20)
        self.db.add_all([before, after])
        self.db.commit()
        self.db.refresh(before)
        self.db.refresh(after)
        self.db.add(ChangeEvent(
            competitor_id=comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=120,
            change_type="pricing_change",
            brief_text="SaaS Rival moved enterprise pricing behind a custom quote.",
            week_label="2026-W27",
        ))
        self.db.commit()
        return comp

    def _get_detail(self, user, comp, mock_client):
        auth = {"Authorization": f"Bearer {user.id}"}
        # _is_paying_subscriber reads the flag/comps via the app.access module,
        # so patching app.access.* governs the whole paywall in one place.
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            return self.client.get(f"/api/v1/competitors/{comp.id}/detail", headers=auth)

    def test_untested_free_user_detail_does_not_burn_paid_generation(self):
        """The core of finding D: free_test_used=False + no subscription must
        NOT trigger a paid model call from a passive detail view."""
        user = self._make_user("fresh@example.com", free_test_used=False)
        comp = self._make_comp(user)
        mock_client = _valid_card_client()
        resp = self._get_detail(user, comp, mock_client)
        self.assertEqual(resp.status_code, 200)  # page renders (degrade, not 402)
        mock_client.chat.completions.create.assert_not_called()

    def test_read_only_user_detail_still_no_paid_generation(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_comp(user)
        mock_client = _valid_card_client()
        resp = self._get_detail(user, comp, mock_client)
        self.assertEqual(resp.status_code, 200)
        mock_client.chat.completions.create.assert_not_called()

    def test_active_subscriber_detail_still_generates_with_ai(self):
        user = self._make_user("payer@example.com", free_test_used=True, subscription_status="active")
        comp = self._make_comp(user)
        mock_client = _valid_card_client()
        resp = self._get_detail(user, comp, mock_client)
        self.assertEqual(resp.status_code, 200)
        mock_client.chat.completions.create.assert_called()

    def test_cached_card_served_to_untested_free_user_without_paid_call(self):
        user = self._make_user("cached@example.com", free_test_used=False)
        comp = self._make_comp(user)
        payload = {
            "executive_summary": "Cached summary.",
            "what_changed": [],
            "weaknesses": [],
            "strategic_signals": [],
            "playbook": [],
        }
        self.db.add(BattleCardCache(
            competitor_id=comp.id,
            payload=json.dumps(payload),
            ai_generated=True,
        ))
        self.db.commit()
        mock_client = _valid_card_client()
        resp = self._get_detail(user, comp, mock_client)
        self.assertEqual(resp.status_code, 200)
        card = resp.json()["battlecard"]
        self.assertIsNotNone(card)
        self.assertEqual(card.get("executive_summary"), "Cached summary.")
        mock_client.chat.completions.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
