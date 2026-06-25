"""Head-to-Head comparative block tests (spec 2026-06-25).

The SaaS battle card ALSO emits a top-level `head_to_head` block when the
requesting user has an onboarded `business_profile`. One DeepSeek call produces
both the card and the comparison. Rules under test:
  - profile present + AI → valid head_to_head with observed/inferred tagging
  - no profile → no head_to_head (byte-compatible with existing cards)
  - thin competitor data → fewer points (model-driven passthrough, not padded)
  - heuristic/no-AI path → no head_to_head (never fabricate without the model)
  - public/share path → head_to_head stripped even if the cache carries it
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

PROFILE = {
    "name": "Acme Analytics",
    "one_liner": "Self-serve product analytics for small SaaS teams.",
    "category": "product analytics SaaS",
    "target_customer": "early-stage SaaS founders",
    "positioning": "Simpler and flat-priced vs enterprise analytics suites.",
    "key_features": ["flat pricing", "1-click setup", "no seat limits"],
    "is_saas": True,
}


def _mock_client(card_extra: dict):
    """A mocked sync LLM client whose JSON response merges base card fields with
    `card_extra` (used to inject a head_to_head payload)."""
    base = {
        "executive_summary": "Rival is repositioning upmarket.",
        "what_changed": [{"type": "pricing_change", "text": "Moved pricing behind a quote."}],
        "weaknesses": ["Opaque enterprise pricing", "Slow support"],
        "strategic_signals": ["Going upmarket"],
        "playbook": ["a", "b", "c", "d", "e"],
    }
    base.update(card_extra)
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(base)
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    client = MagicMock()
    client.chat.completions.create.return_value = mock_resp
    return client


class TestHeadToHead(unittest.TestCase):
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
        self.user = User(email="h2h@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.comp = Competitor(
            user_id=self.user.id,
            url="https://rival.example.com",
            name="Rival Corp",
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

    def _set_profile(self, profile):
        self.user.business_profile = json.dumps(profile) if profile is not None else None
        self.db.add(self.user)
        self.db.commit()

    def _seed_change(self, brief="Rival moved enterprise pricing behind a custom quote."):
        before = Snapshot(competitor_id=self.comp.id, raw_text="old", char_count=3)
        after = Snapshot(competitor_id=self.comp.id, raw_text="new pricing copy longer", char_count=22)
        self.db.add_all([before, after])
        self.db.commit()
        self.db.refresh(before)
        self.db.refresh(after)
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=120,
            change_type="pricing_change",
            brief_text=brief,
            week_label="2026-W26",
        ))
        self.db.commit()

    # ── profile present → valid head_to_head with observed/inferred tags ──────
    def test_profile_present_emits_head_to_head_with_confidence_tags(self):
        self._set_profile(PROFILE)
        self._seed_change()
        h2h = {
            "verdict": "You're cheaper but they have more enterprise features.",
            "you_win": [
                {"point": "Flat pricing", "basis": "Their pricing moved behind a quote", "confidence": "observed"},
                {"point": "Faster setup", "basis": "general positioning", "confidence": "inferred"},
            ],
            "you_exposed": [
                {"point": "Fewer integrations", "basis": "inferred from category", "confidence": "inferred"},
            ],
            "plays": [
                {"rank": 1, "title": "Lead with transparent pricing", "detail": "Show your flat price next to their quote wall."},
            ],
        }
        client = _mock_client({"head_to_head": h2h})
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("head_to_head", data)
        block = data["head_to_head"]
        self.assertTrue(block["verdict"])
        self.assertEqual(len(block["you_win"]), 2)
        self.assertEqual(len(block["you_exposed"]), 1)
        self.assertEqual(block["you_win"][0]["confidence"], "observed")
        self.assertEqual(block["you_win"][1]["confidence"], "inferred")
        # Every point carries a basis.
        for col in ("you_win", "you_exposed"):
            for pt in block[col]:
                self.assertIn("basis", pt)
        self.assertEqual(block["plays"][0]["rank"], 1)

    # ── no profile → head_to_head omitted (byte-compatible) ───────────────────
    def test_no_profile_omits_head_to_head(self):
        self._set_profile(None)
        self._seed_change()
        client = _mock_client({})  # model returns no head_to_head
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertNotIn("head_to_head", data)

    def test_empty_profile_dict_omits_head_to_head(self):
        self._set_profile({})  # onboarding produced nothing usable
        self._seed_change()
        client = _mock_client({"head_to_head": {"verdict": "should be ignored"}})
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        # Empty profile is treated as no profile: the block isn't requested/parsed.
        self.assertNotIn("head_to_head", resp.json())

    # ── thin data → fewer points (model-driven passthrough) ───────────────────
    def test_thin_data_yields_fewer_points(self):
        self._set_profile(PROFILE)
        # No change events seeded → thin competitor data.
        thin = {
            "verdict": "Hard to compare yet — enriching as we scan.",
            "you_win": [{"point": "You're live and priced", "basis": "your profile", "confidence": "inferred"}],
            "you_exposed": [],
            "plays": [],
        }
        client = _mock_client({"head_to_head": thin})
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        block = resp.json()["head_to_head"]
        self.assertEqual(len(block["you_win"]), 1)
        self.assertEqual(block["you_exposed"], [])
        self.assertEqual(block["plays"], [])

    # ── heuristic / no-AI path → no head_to_head ──────────────────────────────
    def test_heuristic_path_omits_head_to_head(self):
        self._set_profile(PROFILE)
        self._seed_change()
        with patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("head_to_head", resp.json())

    # ── public/share path → head_to_head stripped even when cached ────────────
    def test_public_path_strips_head_to_head(self):
        self._set_profile(PROFILE)
        self._seed_change()
        h2h = {
            "verdict": "private self-assessment",
            "you_win": [{"point": "p", "basis": "b", "confidence": "observed"}],
            "you_exposed": [{"point": "e", "basis": "b", "confidence": "inferred"}],
            "plays": [{"rank": 1, "title": "t", "detail": "d"}],
        }
        client = _mock_client({"head_to_head": h2h})
        with patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=client):
            owner = self.client.get(f"/api/v1/battlecards/generate/{self.comp.id}", headers=self.auth)
        self.assertIn("head_to_head", owner.json())  # owner sees it (now cached)

        # Public endpoint must NOT call a paid model and must NOT leak the block.
        with patch("app.llm.get_sync_client", side_effect=AssertionError("no paid call on public path")):
            pub = self.client.get(f"/api/v1/battlecards/public/{self.comp.id}")
        self.assertEqual(pub.status_code, 200)
        self.assertNotIn("head_to_head", pub.json())


if __name__ == "__main__":
    unittest.main()
