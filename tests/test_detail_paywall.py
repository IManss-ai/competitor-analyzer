"""Paywall consistency for GET /api/v1/competitors/{id}/detail.

The dedicated `/battlecards/generate/{id}` endpoint blocks read-only (trial-used,
non-paying) users with a 402 so they can't trigger a paid model call. But the
competitor detail page also renders a battle card, and it called
`get_or_generate_battlecard(comp, db)` with `allow_ai=True` and NO read-only
check — a side-door that let a locked user trigger paid generation on any
cache-miss.

The fix threads `allow_ai=not is_read_only(user)` into the detail path: read-only
users get the cached-or-heuristic card (page still renders, HTTP 200) and never a
paid call; full/paying users still get AI generation. Also pins scout finding #5's
spirit — a guard that asserts the paid client is *not* called.
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
from app.models import User, Competitor, Snapshot, ChangeEvent


def _valid_card_client():
    """A mock sync client whose completion returns well-formed battle-card JSON."""
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "executive_summary": "Rival shipped a pricing change.",
        "what_changed": [{"type": "pricing_change", "text": "Moved enterprise pricing behind a quote."}],
        "weaknesses": ["w1", "w2"],
        "strategic_signals": ["s1", "s2"],
        "playbook": ["Target their SMB churn", "Lead with transparent pricing", "c", "d", "e"],
    })
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_resp
    return mock_client


class TestDetailPaywall(unittest.TestCase):
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
        # A real diff so generation would proceed (no baseline short-circuit).
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

    def test_read_only_user_detail_does_not_trigger_paid_generation(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        mock_client = _valid_card_client()
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client) as get_client:
            resp = self.client.get(f"/api/v1/competitors/{comp.id}/detail", headers=auth)
        # Page still renders for a locked user — we degrade, not 402.
        self.assertEqual(resp.status_code, 200)
        # The whole point: no paid model call for a read-only user.
        get_client.assert_not_called()
        mock_client.chat.completions.create.assert_not_called()

    def test_full_user_detail_still_generates_with_ai(self):
        # Detail-page AI now requires a real subscription (audit 2026-07-21 #7/#15:
        # untested free users no longer trigger unmetered paid generation here —
        # their one free test is consumed only via the explicit /generate flow).
        user = self._make_user("paying@example.com", free_test_used=False)
        user.subscription_status = "active"
        self.db.commit()
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        mock_client = _valid_card_client()
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/competitors/{comp.id}/detail", headers=auth)
        self.assertEqual(resp.status_code, 200)
        # Full user is not blocked — AI generation runs as before.
        mock_client.chat.completions.create.assert_called()


if __name__ == "__main__":
    unittest.main()
