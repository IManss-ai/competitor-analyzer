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


if __name__ == "__main__":
    unittest.main()
