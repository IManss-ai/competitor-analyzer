"""Battle-card data-honesty tests (GitHub issue #3, bug #1).

A first scan has no prior snapshot to diff against, so the card must NOT invent a
"detected change". It must flag the baseline state and leave the changes quadrant
empty. A later scan with a real ChangeEvent diffs normally.
"""
import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent

# Phrases the heuristic used to fabricate when there was nothing to diff —
# invented changes AND invented "weaknesses" presented as fact.
FABRICATED_PHRASES = [
    "Refined hero copy",
    "adjusting pricing structure",
    "updated homepage copy",
    "custom quote pricing instead of transparent flat rates",
    "launched a major feature",
    "Pricing transparency issues on their homepage",
    "Customer support delays reported in forums",
    "Mobile user experience lags behind the desktop site",
]


class TestBattleCardHonesty(unittest.TestCase):
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
        self.user = User(email="honesty@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.comp = Competitor(
            user_id=self.user.id,
            url="https://saas.example.com",
            name="SaaS Rival",
            business_type="saas",
        )
        self.db.add(self.comp)
        self.db.commit()
        self.db.refresh(self.comp)
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _add_snapshot(self, text="Homepage copy v1", error=None):
        snap = Snapshot(
            competitor_id=self.comp.id,
            raw_text=text,
            char_count=len(text),
            fetch_error=error,
        )
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        return snap

    def _seed_initial_scan(self):
        """First scan: one snapshot, an initial_scan event (before == after)."""
        snap = self._add_snapshot()
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=snap.id,
            snapshot_after_id=snap.id,
            net_char_delta=snap.char_count,
            change_type="initial_scan",
            brief_text="SaaS Rival is a developer-first API platform with usage-based pricing.",
            week_label="2026-W25",
        ))
        self.db.commit()

    def _seed_real_change(self, detected_at=None, brief="SaaS Rival moved enterprise pricing behind a custom quote."):
        """A real diff between two snapshots."""
        before = self._add_snapshot(text="Old pricing copy")
        after = self._add_snapshot(text="New pricing copy, longer and different")
        ev = ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=120,
            change_type="pricing_change",
            brief_text=brief,
            week_label="2026-W25",
        )
        if detected_at is not None:
            ev.detected_at = detected_at
        self.db.add(ev)
        self.db.commit()

    # ── Bug #1 ───────────────────────────────────────────────────────────────
    def test_first_scan_is_baseline_with_no_fabricated_changes(self):
        self._seed_initial_scan()
        with patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("is_baseline"), f"expected is_baseline true, got: {data.get('is_baseline')}")
        self.assertEqual(data["what_changed"], [], f"baseline card must have no changes, got: {data['what_changed']}")
        blob = json.dumps(data).lower()
        for phrase in FABRICATED_PHRASES:
            self.assertNotIn(phrase.lower(), blob, f"fabricated phrase leaked into baseline card: {phrase!r}")

    def test_competitor_with_no_events_at_all_is_baseline(self):
        # No snapshots, no events — a brand-new competitor (pre-first-scan).
        with patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("is_baseline"))
        self.assertEqual(data["what_changed"], [])

    def test_second_scan_with_real_change_diffs_normally(self):
        self._seed_real_change()
        with patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data.get("is_baseline"), "a real change means not baseline")
        self.assertGreaterEqual(len(data["what_changed"]), 1)
        # The change text must reflect the REAL brief, not a hardcoded fabrication.
        changed_blob = json.dumps(data["what_changed"]).lower()
        self.assertIn("custom quote", changed_blob)

    def test_quiet_competitor_with_past_change_is_not_baseline_but_empty(self):
        # A real change 30 days ago, nothing in the last 7 days.
        self._seed_real_change(detected_at=datetime.utcnow() - timedelta(days=30))
        with patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data.get("is_baseline"), "history of a real change => not baseline")
        self.assertEqual(data["what_changed"], [], "no changes in the last 7 days => empty quadrant")

    def test_ai_fabricated_change_is_stripped_on_baseline(self):
        # The model can invent a change even when told there are none. On a
        # baseline (nothing real to diff), the honesty chokepoint must strip it.
        self._seed_initial_scan()
        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps({
            "executive_summary": "SaaS Rival shipped a big pricing change.",
            "what_changed": [{"type": "pricing_change", "text": "Invented a change that never happened."}],
            "weaknesses": ["w1", "w2"],
            "strategic_signals": ["s1"],
            "playbook": ["a", "b", "c", "d", "e"],
        })
        mock_resp = MagicMock()
        mock_resp.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_resp
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("is_baseline"))
        self.assertEqual(data["what_changed"], [], "fabricated AI change must be stripped on a baseline card")


if __name__ == "__main__":
    unittest.main()
