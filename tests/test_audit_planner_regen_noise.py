"""Audit 2026-07-21 Finding B: noise change events must not trigger paid regens.

get_or_generate_plan regenerated whenever the newest ChangeEvent.detected_at
was newer than the cached plan — with NO change_type filter. With the
edit-magnitude differ, rotating page content emits a minor_copy event on every
scan, so every war-room view after a scan fired a fresh paid DeepSeek call.
The battlecard cache guard already filters exactly this noise
(battlecard._has_new_intel: change_type NOT IN minor_copy/no_change/initial_scan
and NOT NULL); the planner's freshness check now applies the same filter, as a
direct query so a burst of noise events can't crowd real intel out of the
signal-gathering limit(10) window.
"""
import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import Campaign, ChangeEvent, Competitor, Snapshot, User
from app.planner.engine import get_or_generate_plan

AI_PLAN = json.dumps({
    "executive_read": "Acme is moving upmarket — attack self-serve.",
    "plays": [
        {"title": f"Play {i}", "body": f"Do thing {i}", "category": "pricing"}
        for i in range(1, 6)
    ],
})


class TestPlannerRegenNoiseFilter(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="noise@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.comp = Competitor(user_id=self.user.id, url="https://acme.io", name="Acme")
        self.db.add(self.comp)
        self.db.commit()
        self.campaign = Campaign(user_id=self.user.id, competitor_id=self.comp.id, name="Beat Acme")
        self.db.add(self.campaign)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _seed_event(self, change_type, detected_at=None, brief_text=None):
        snap = Snapshot(competitor_id=self.comp.id, raw_text="x", char_count=1)
        self.db.add(snap)
        self.db.commit()
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id, snapshot_before_id=snap.id, snapshot_after_id=snap.id,
            net_char_delta=300, change_type=change_type,
            brief_text=brief_text or "some change",
            detected_at=detected_at or datetime.utcnow(),
        ))
        self.db.commit()

    def _mock_client(self):
        client = MagicMock()
        resp = MagicMock()
        resp.choices = [MagicMock(message=MagicMock(content=AI_PLAN))]
        client.chat.completions.create.return_value = resp
        return client

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_noise_events_do_not_trigger_regeneration(self, _mock_avail, mock_get_client):
        client = self._mock_client()
        mock_get_client.return_value = client
        first = get_or_generate_plan(self.campaign, self.db)
        # Every noise variant lands strictly after the plan was generated:
        # classifier-suppressed types, the baseline scan, and unclassified NULL.
        after = datetime.utcnow() + timedelta(seconds=2)
        for change_type in ("minor_copy", "no_change", "initial_scan", None):
            self._seed_event(change_type, detected_at=after)
        second = get_or_generate_plan(self.campaign, self.db)
        self.assertEqual(first.id, second.id)
        client.chat.completions.create.assert_called_once()  # no paid regen on noise

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_real_change_still_triggers_regeneration(self, _mock_avail, mock_get_client):
        client = self._mock_client()
        mock_get_client.return_value = client
        first = get_or_generate_plan(self.campaign, self.db)
        self._seed_event(
            "pricing_change",
            detected_at=datetime.utcnow() + timedelta(seconds=2),
            brief_text="Raised Pro plan from $29 to $39",
        )
        second = get_or_generate_plan(self.campaign, self.db)
        self.assertNotEqual(first.id, second.id)
        self.assertEqual(client.chat.completions.create.call_count, 2)

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_noise_burst_cannot_hide_real_intel(self, _mock_avail, mock_get_client):
        """A rotating page emits minor_copy every scan; >10 noise events must
        not crowd a real change out of the freshness check (the signal gather
        is limited to the 10 newest events)."""
        client = self._mock_client()
        mock_get_client.return_value = client
        first = get_or_generate_plan(self.campaign, self.db)
        real_at = datetime.utcnow() + timedelta(seconds=2)
        self._seed_event("feature_add", detected_at=real_at, brief_text="Shipped SSO")
        for i in range(11):  # newer noise than the real event
            self._seed_event("minor_copy", detected_at=real_at + timedelta(seconds=i + 1))
        second = get_or_generate_plan(self.campaign, self.db)
        self.assertNotEqual(first.id, second.id)  # real intel still regenerates
        self.assertEqual(client.chat.completions.create.call_count, 2)


if __name__ == "__main__":
    unittest.main()
