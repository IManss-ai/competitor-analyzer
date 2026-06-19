import json
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Review, ReviewSnapshot, SocialPost


class TestLocalBattleCard(unittest.TestCase):
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
        self.user = User(email="local-bc@example.com", business_type="local")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.local_comp = Competitor(
            user_id=self.user.id,
            url="https://maps.google.com/place/coffee",
            name="Cafe Rival",
            business_type="local",
            google_maps_url="https://maps.google.com/place/coffee",
        )
        self.saas_comp = Competitor(
            user_id=self.user.id,
            url="https://saas.example.com",
            name="SaaS Rival",
            business_type="saas",
        )
        self.db.add_all([self.local_comp, self.saas_comp])
        self.db.commit()
        self.db.refresh(self.local_comp)
        self.db.refresh(self.saas_comp)
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _seed_complaints(self):
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

    def _seed_active_social(self):
        for i in range(4):
            self.db.add(SocialPost(
                competitor_id=self.local_comp.id,
                platform="instagram",
                post_id=f"p{i}",
                content=f"BOGO promo this weekend only! #{i}",
                posted_at=datetime.utcnow() - timedelta(days=i),
            ))
        self.db.commit()

    def test_local_business_type_returns_local_variant(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("variant"), "local")
        self.assertEqual(len(data["playbook"]), 5)

    def test_saas_business_type_returns_saas_variant(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.saas_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("variant"), "saas")

    def test_local_fallback_with_complaints_uses_reputation_playbook(self):
        self._seed_complaints()
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        joined_playbook = " ".join(data["playbook"]).lower()
        self.assertTrue(
            "review" in joined_playbook or "complaint" in joined_playbook or "google" in joined_playbook,
            f"Expected reputation-focused playbook, got: {data['playbook']}",
        )
        self.assertIn("Slow service at lunch", data["weaknesses"])

    def test_local_fallback_with_active_social_uses_counter_playbook(self):
        self._seed_active_social()
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["what_changed"][0]["type"], "social_campaign")
        self.assertEqual(len(data["playbook"]), 5)

    def test_local_fallback_quiet_competitor(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["what_changed"][0]["type"], "review_trend")
        self.assertIn("quiet", data["executive_summary"].lower())

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_local_uses_ai_when_available(self, mock_ai_available, mock_get_sync_client):
        self._seed_complaints()
        mock_client = MagicMock()
        mock_get_sync_client.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps({
            "executive_summary": "Cafe Rival is hemorrhaging regulars over slow service.",
            "what_changed": [{"type": "reputation_shift", "text": "12 complaints flagged this week"}],
            "weaknesses": ["Slow lunch service", "Cold drinks", "Restroom cleanliness"],
            "strategic_signals": ["Their staffing model is failing at lunch peak"],
            "playbook": [
                "Run lunch-rush flyer drop in their immediate block",
                "Offer free upgrade for anyone who shows a 1-star receipt",
                "Capture their disappointed reviewers via Google Local Ads",
                "Reply warmly to their 1-star Google reviews inviting visits",
                "Boost a regular-customer testimonial geo-targeted to their zip",
            ],
        })
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["variant"], "local")
        self.assertEqual(len(data["playbook"]), 5)
        self.assertIn("hemorrhaging", data["executive_summary"])
        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        self.assertEqual(call_kwargs["model"], "deepseek-v4-flash")
        system_msg = call_kwargs["messages"][0]
        self.assertEqual(system_msg["role"], "system")
        self.assertIn("local business strategist", system_msg["content"])

    def test_generate_requires_auth(self):
        resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 401)

    def test_generate_rejects_other_users_competitor(self):
        other = User(email="other@example.com")
        self.db.add(other)
        self.db.commit()
        self.db.refresh(other)
        resp = self.client.get(
            f"/api/v1/battlecards/generate/{self.local_comp.id}",
            headers={"Authorization": f"Bearer {other.id}"},
        )
        self.assertEqual(resp.status_code, 403)

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_ai_card_is_cached_and_not_regenerated(self, mock_ai_available, mock_get_sync_client):
        self._seed_complaints()
        mock_client = MagicMock()
        mock_get_sync_client.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps({
            "executive_summary": "Cached summary.",
            "what_changed": [{"type": "reputation_shift", "text": "complaints"}],
            "weaknesses": ["w1", "w2"],
            "strategic_signals": ["s1"],
            "playbook": ["Run a", "Run b", "Run c", "Run d", "Run e"],
        })
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        first = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        second = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["executive_summary"], "Cached summary.")
        # Two page views, ONE paid model call — the second is served from cache.
        mock_client.chat.completions.create.assert_called_once()

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_public_endpoint_never_calls_ai(self, mock_ai_available, mock_get_sync_client):
        mock_client = MagicMock()
        mock_get_sync_client.return_value = mock_client
        resp = self.client.get(f"/api/v1/battlecards/public/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["playbook"]), 5)  # heuristic card still complete
        mock_client.chat.completions.create.assert_not_called()

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_public_endpoint_serves_cached_ai_card(self, mock_ai_available, mock_get_sync_client):
        self._seed_complaints()
        mock_client = MagicMock()
        mock_get_sync_client.return_value = mock_client
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps({
            "executive_summary": "Owner-generated card.",
            "what_changed": [{"type": "reputation_shift", "text": "complaints"}],
            "weaknesses": ["w1", "w2"],
            "strategic_signals": ["s1"],
            "playbook": ["Run a", "Run b", "Run c", "Run d", "Run e"],
        })
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}", headers=self.auth)
        resp = self.client.get(f"/api/v1/battlecards/public/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["executive_summary"], "Owner-generated card.")
        mock_client.chat.completions.create.assert_called_once()


if __name__ == "__main__":
    unittest.main()
