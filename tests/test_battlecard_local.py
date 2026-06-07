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
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("variant"), "local")
        self.assertEqual(len(data["playbook"]), 5)

    def test_saas_business_type_returns_saas_variant(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.saas_comp.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("variant"), "saas")

    def test_local_fallback_with_complaints_uses_reputation_playbook(self):
        self._seed_complaints()
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}")
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
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["what_changed"][0]["type"], "social_campaign")
        self.assertEqual(len(data["playbook"]), 5)

    def test_local_fallback_quiet_competitor(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["what_changed"][0]["type"], "review_trend")
        self.assertIn("quiet", data["executive_summary"].lower())

    @patch("app.routes.battlecard.anthropic.Anthropic")
    def test_local_uses_anthropic_when_key_present(self, mock_anthropic_class):
        self._seed_complaints()
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_msg = MagicMock()
        mock_msg.content = [MagicMock(text=json.dumps({
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
        }))]
        mock_client.messages.create.return_value = mock_msg

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.local_comp.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["variant"], "local")
        self.assertEqual(len(data["playbook"]), 5)
        self.assertIn("hemorrhaging", data["executive_summary"])
        mock_client.messages.create.assert_called_once()
        call_kwargs = mock_client.messages.create.call_args.kwargs
        sent_text = call_kwargs["messages"][0]["content"][0]["text"]
        self.assertIn("local business strategist", sent_text)


if __name__ == "__main__":
    unittest.main()
