import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from app.db import Base, get_session
from app.models import User, Competitor, ReviewSnapshot, Review
import uuid

class TestReviewsAndBattlecards(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
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
        self.user = User(email="test@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        
        self.competitor = Competitor(user_id=self.user.id, url="https://example.com", name="Example")
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

        self.auth_headers = {"Authorization": f"Bearer {str(self.user.id)}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    # 1. Test Reviews Endpoint
    def test_reviews_requires_auth(self):
        resp = self.client.get(f"/api/v1/competitors/{str(self.competitor.id)}/reviews")
        self.assertEqual(resp.status_code, 401)

    def test_reviews_not_belonging_to_user(self):
        other_user = User(email="other@example.com")
        self.db.add(other_user)
        self.db.commit()
        self.db.refresh(other_user)
        
        other_comp = Competitor(user_id=other_user.id, url="https://other.com")
        self.db.add(other_comp)
        self.db.commit()
        self.db.refresh(other_comp)
        
        resp = self.client.get(f"/api/v1/competitors/{str(other_comp.id)}/reviews", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 404)

    def test_reviews_empty_state(self):
        resp = self.client.get(f"/api/v1/competitors/{str(self.competitor.id)}/reviews", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["snapshots"], [])
        self.assertEqual(data["recent_complaints"], [])

    def test_reviews_with_data(self):
        import json
        snap = ReviewSnapshot(
            competitor_id=self.competitor.id,
            platform="g2",
            avg_rating=4.2,
            total_reviews=100,
            complaint_count=5,
            top_complaints=json.dumps(["slow", "expensive"])
        )
        self.db.add(snap)
        
        review = Review(
            competitor_id=self.competitor.id,
            platform="g2",
            review_id="rev1",
            rating=2,
            title="Terrible",
            body="So slow",
            sentiment="negative",
            is_complaint=True
        )
        self.db.add(review)
        self.db.commit()
        
        resp = self.client.get(f"/api/v1/competitors/{str(self.competitor.id)}/reviews", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["snapshots"]), 1)
        self.assertEqual(data["snapshots"][0]["platform"], "g2")
        self.assertEqual(data["snapshots"][0]["top_complaints"], ["slow", "expensive"])
        
        self.assertEqual(len(data["recent_complaints"]), 1)
        self.assertEqual(data["recent_complaints"][0]["title"], "Terrible")

    # 2. Test Battlecard Endpoint
    def test_battlecard_heuristic_fallback(self):
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{str(self.competitor.id)}", headers=self.auth_headers)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("actions", data)
            self.assertTrue(isinstance(data["actions"], list))

    def test_battlecard_unknown_competitor(self):
        fake_id = str(uuid.uuid4())
        resp = self.client.get(f"/api/v1/battlecards/generate/{fake_id}", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 404)

if __name__ == '__main__':
    unittest.main()
