"""Battle-card list-item coercion tests.

DeepSeek occasionally returns list items as objects ({type,text} / {title,detail})
instead of plain strings. Those objects must be coerced to display strings BEFORE
the payload is cached, or every render surface (modal, onboarding finale, detail
page, public share page) throws React error #31 for up to CACHE_MAX_AGE days.
"""
import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import (
    User, Competitor, Snapshot, ChangeEvent, Review, ReviewSnapshot, BattleCardCache,
)

# Every list the frontend renders as flat strings (what_changed is object-shaped
# by design and excluded).
STRING_LIST_KEYS = (
    "playbook", "talking_points", "actions",
    "strategic_signals", "win_conditions", "weaknesses",
)


class TestBattleCardCoercion(unittest.TestCase):
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
        self.user = User(email="coercion@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.comp = Competitor(
            user_id=self.user.id,
            url="https://saas.example.com",
            name="SaaS Rival",
            business_type="saas",
        )
        self.local_comp = Competitor(
            user_id=self.user.id,
            url="https://maps.google.com/place/coffee",
            name="Cafe Rival",
            business_type="local",
            google_maps_url="https://maps.google.com/place/coffee",
        )
        self.db.add_all([self.comp, self.local_comp])
        self.db.commit()
        self.db.refresh(self.comp)
        self.db.refresh(self.local_comp)
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

    def _seed_real_change(self, brief="SaaS Rival moved enterprise pricing behind a custom quote."):
        """A real diff between two snapshots — puts the card on the AI path."""
        before = self._add_snapshot(text="Old pricing copy")
        after = self._add_snapshot(text="New pricing copy, longer and different")
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=120,
            change_type="pricing_change",
            brief_text=brief,
            week_label="2026-W25",
        ))
        self.db.commit()

    def _seed_local_complaints(self):
        snap = ReviewSnapshot(
            competitor_id=self.local_comp.id,
            platform="google",
            avg_rating=3.2,
            total_reviews=87,
            complaint_count=12,
            top_complaints=json.dumps(["Slow service at lunch", "Cold lattes", "Dirty restroom"]),
        )
        self.db.add(snap)
        self.db.add(Review(
            competitor_id=self.local_comp.id,
            platform="google",
            review_id="r1",
            author="Aigerim",
            rating=1,
            body="Waited 25 minutes for a coffee that arrived cold. Won't be back.",
            published_at=datetime.utcnow() - timedelta(days=2),
            sentiment="negative",
            is_complaint=True,
        ))
        self.db.commit()

    def _mock_ai(self, content_dict):
        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps(content_dict)
        mock_resp = MagicMock()
        mock_resp.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_resp
        return mock_client

    def _assert_all_string_lists(self, data):
        for key in STRING_LIST_KEYS:
            for item in data[key]:
                self.assertIsInstance(
                    item, str,
                    f"{key} contains a non-string item: {item!r}",
                )

    # ── Case 1: SaaS, {type,text}-shaped items ──────────────────────────────
    def test_saas_object_items_coerced_to_strings(self):
        self._seed_real_change()
        mock_client = self._mock_ai({
            "executive_summary": "s",
            "what_changed": [{"type": "pricing_change", "text": "raised prices"}],
            "weaknesses": [{"text": "Slow support"}],
            "strategic_signals": [{"type": "signal", "text": "Moving upmarket"}],
            "playbook": [{"type": "action", "text": "Target churned users"}, "Plain string play"],
        })
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self._assert_all_string_lists(data)
        self.assertIn("Target churned users", data["playbook"])
        self.assertIn("Plain string play", data["playbook"])
        self.assertIn("Moving upmarket", data["strategic_signals"])
        self.assertIn("Slow support", data["weaknesses"])

    # ── Case 2: {title,detail}-shaped items — detail outranks title ─────────
    def test_title_detail_shape_prefers_detail(self):
        self._seed_real_change()
        mock_client = self._mock_ai({
            "executive_summary": "s",
            "what_changed": [{"type": "pricing_change", "text": "raised prices"}],
            "weaknesses": ["w1"],
            "strategic_signals": ["s1"],
            "playbook": [{"title": "Play one", "detail": "Run comparison ads"}],
        })
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Same key order as mailer._play_to_text: 'detail' outranks 'title'.
        self.assertIn("Run comparison ads", data["playbook"])
        self._assert_all_string_lists(data)

    # ── Case 3: cache integrity — the sticky-poison regression ──────────────
    def test_cached_payload_contains_only_strings(self):
        self._seed_real_change()
        mock_client = self._mock_ai({
            "executive_summary": "s",
            "what_changed": [{"type": "pricing_change", "text": "raised prices"}],
            "weaknesses": [{"text": "Slow support"}],
            "strategic_signals": [{"type": "signal", "text": "Moving upmarket"}],
            "playbook": [{"type": "action", "text": "Target churned users"}, "Plain string play"],
        })
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)

        db = self.SessionLocal()
        try:
            cached = db.execute(
                select(BattleCardCache).where(BattleCardCache.competitor_id == self.comp.id)
            ).scalar_one_or_none()
            self.assertIsNotNone(cached, "AI card must be cached")
            payload = json.loads(cached.payload)
        finally:
            db.close()
        for key in ("playbook", "strategic_signals", "weaknesses"):
            for item in payload[key]:
                self.assertIsInstance(
                    item, str,
                    f"cached {key} contains a non-string item: {item!r}",
                )

    # ── Case 4: local variant coerces identically ────────────────────────────
    def test_local_object_items_coerced_to_strings(self):
        self._seed_local_complaints()
        mock_client = self._mock_ai({
            "executive_summary": "Cafe Rival is slipping with regulars.",
            "what_changed": [{"type": "reputation_shift", "text": "Complaints spiked"}],
            "weaknesses": [{"text": "Slow lunch service"}],
            "strategic_signals": [{"type": "signal", "text": "Losing returning customers"}],
            "playbook": [{"type": "action", "text": "Run lunch flyer drop"}, "Reply to their 1-star reviews"],
        })
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["variant"], "local")
        self._assert_all_string_lists(data)
        self.assertIn("Run lunch flyer drop", data["playbook"])
        self.assertIn("Losing returning customers", data["strategic_signals"])
        self.assertIn("Slow lunch service", data["weaknesses"])

    # ── Case 5: salvage unknown-key items instead of silently dropping them ──
    def test_unknown_key_playbook_items_salvaged_not_dropped(self):
        """An all-unknown-key playbook used to coerce to [] → ai_generated False →
        a fabricated heuristic card served (burning the user's one free test with
        no provenance). Salvage keeps the model's real content instead."""
        self._seed_real_change()
        mock_client = self._mock_ai({
            "executive_summary": "s",
            "what_changed": [{"type": "pricing_change", "text": "raised prices"}],
            "weaknesses": ["w1"],
            "strategic_signals": ["s1"],
            # Non-standard keys carrying real AI content (no text/detail/title).
            "playbook": [
                {"step": "Run comparison ads targeting their churned buyers"},
                {"recommendation": "Publish a transparent pricing calculator page"},
            ],
        })
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self._assert_all_string_lists(data)
        # Salvaged the longest string from each unknown-key dict, not dropped.
        self.assertIn("Run comparison ads targeting their churned buyers", data["playbook"])
        self.assertIn("Publish a transparent pricing calculator page", data["playbook"])
        # The heuristic pricing card was NOT served (its signature phrase absent).
        self.assertNotIn("adjusting pricing structure", json.dumps(data).lower())
        # And the card is marked ai_generated — the free test wasn't wasted.
        db = self.SessionLocal()
        try:
            cached = db.execute(
                select(BattleCardCache).where(BattleCardCache.competitor_id == self.comp.id)
            ).scalar_one_or_none()
            self.assertIsNotNone(cached)
            self.assertTrue(cached.ai_generated, "salvaged AI playbook must mark the card ai_generated")
        finally:
            db.close()

    # ── Case 6: truly unsalvageable list fires a provenance signal ──────────
    def test_unrecognizable_playbook_fires_degraded_signal(self):
        """A playbook of string-less dicts can't be salvaged → coerces to []. The
        fix fires note_degraded so the fabricated fallback is never silent. Baseline
        competitor → the honesty chokepoint keeps what_changed empty (no fabrication)."""
        mock_client = self._mock_ai({
            "executive_summary": "s",
            "what_changed": [],
            "weaknesses": ["w1"],
            "strategic_signals": ["s1"],
            "playbook": [{"rank": 1}, {"weight": 2.5}, {"nested": {}}],
        })
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client), \
             patch("app.routes.battlecard.note_degraded") as spy:
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        reasons = [c.args[2] for c in spy.call_args_list if len(c.args) >= 3]
        self.assertIn(
            "playbook_coerced_empty", reasons,
            f"expected a playbook_coerced_empty degradation signal, got: {spy.call_args_list}",
        )
        data = resp.json()
        self.assertTrue(data.get("is_baseline"))
        self.assertEqual(data["what_changed"], [])

    # ── Case 7: cache reads self-heal poisoned (pre-fix) rows ───────────────
    def test_read_cached_payload_coerces_poisoned_row(self):
        from app.routes.battlecard import _read_cached_payload
        poisoned = {
            "title": "Poisoned",
            "executive_summary": "e",
            "what_changed": [
                {"type": "pricing_change", "text": "raised prices"},
                {},  # no salvageable content → dropped
                "plain string change",
            ],
            "weaknesses": [{"text": "Slow support"}, "Plain weakness"],
            "strategic_signals": [{"type": "signal", "text": "Moving upmarket"}],
            "playbook": [{"type": "action", "text": "Target churned users"}, "Plain play"],
            "talking_points": [{"text": "tp1"}],
            "win_conditions": [{"text": "wc1"}],
            "actions": [{"text": "a1"}],
            "head_to_head": {
                "verdict": "we win on price",
                "you_win": [{"point": "p", "basis": "b", "confidence": "inferred"}],
            },
        }
        cached = BattleCardCache(
            competitor_id=self.comp.id,
            payload=json.dumps(poisoned),
            ai_generated=True,
        )
        result = _read_cached_payload(cached)
        self._assert_all_string_lists(result)
        # what_changed coerced to {type,text} strings; the empty item dropped.
        self.assertEqual(len(result["what_changed"]), 2)
        for item in result["what_changed"]:
            self.assertIsInstance(item["type"], str)
            self.assertIsInstance(item["text"], str)
            self.assertTrue(item["text"])
        texts = [c["text"] for c in result["what_changed"]]
        self.assertIn("raised prices", texts)
        self.assertIn("plain string change", texts)
        # head_to_head (and everything non-list) is left completely untouched.
        self.assertEqual(result["head_to_head"], poisoned["head_to_head"])

    # ── Case 8: _has_new_intel ignores classifier-suppressed events ─────────
    def test_has_new_intel_ignores_suppressed_and_counts_real(self):
        from app.routes.battlecard import _has_new_intel
        since = datetime.utcnow() - timedelta(hours=1)
        before = self._add_snapshot(text="a")
        after = self._add_snapshot(text="bb")
        # A classifier-suppressed minor_copy event AFTER `since` must NOT count —
        # it would otherwise invalidate the cache and trigger a paid regen.
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=5,
            change_type="minor_copy",
            brief_text="tiny copy tweak",
            detected_at=datetime.utcnow(),
        ))
        self.db.commit()
        self.assertFalse(
            _has_new_intel(self.comp, since, self.db),
            "minor_copy churn must not invalidate the cache",
        )
        # A real pricing_change DOES count as new intel.
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=120,
            change_type="pricing_change",
            brief_text="real move",
            detected_at=datetime.utcnow(),
        ))
        self.db.commit()
        self.assertTrue(
            _has_new_intel(self.comp, since, self.db),
            "a real pricing_change must invalidate the cache",
        )


if __name__ == "__main__":
    unittest.main()
