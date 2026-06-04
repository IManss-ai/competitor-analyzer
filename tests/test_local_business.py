import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from app.db import Base, get_session
from app.models import User, Competitor, SocialPost
from datetime import datetime, timezone
import uuid


class TestLocalBusiness(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # In-memory database setup
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        # Override get_session dependency
        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app, raise_server_exceptions=False)

        # Create test user and competitor
        self.db = self.SessionLocal()
        self.user = User(email="local-biz@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://example.com",
            name="Test Competitor",
            business_type="local",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

        # Create another user for ownership tests
        self.other_user = User(email="other@example.com")
        self.db.add(self.other_user)
        self.db.commit()
        self.db.refresh(self.other_user)

        self.auth_headers = {"Authorization": f"Bearer {self.user.id}"}
        self.other_auth_headers = {"Authorization": f"Bearer {self.other_user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    # ── PATCH /api/v1/local/competitors/{id} ─────────────────────────────

    def test_patch_competitor_requires_auth(self):
        """PATCH without auth returns 401."""
        resp = self.client.patch(
            f"/api/v1/local/competitors/{self.competitor.id}",
            json={"google_maps_url": "https://maps.google.com/place/test"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_patch_competitor_wrong_user_returns_404(self):
        """PATCH with a different user's auth returns 404."""
        resp = self.client.patch(
            f"/api/v1/local/competitors/{self.competitor.id}",
            json={"google_maps_url": "https://maps.google.com/place/test"},
            headers=self.other_auth_headers,
        )
        self.assertEqual(resp.status_code, 404)

    def test_patch_competitor_updates_fields(self):
        """PATCH with valid data updates and returns fields."""
        resp = self.client.patch(
            f"/api/v1/local/competitors/{self.competitor.id}",
            json={
                "google_maps_url": "https://maps.google.com/place/Starbucks",
                "instagram_handle": "starbucks",
                "facebook_page": "starbucks",
                "business_type": "local",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["google_maps_url"], "https://maps.google.com/place/Starbucks")
        self.assertEqual(data["instagram_handle"], "starbucks")
        self.assertEqual(data["facebook_page"], "starbucks")
        self.assertEqual(data["business_type"], "local")
        self.assertEqual(data["id"], str(self.competitor.id))

        # Verify persisted in DB
        self.db.refresh(self.competitor)
        self.assertEqual(self.competitor.google_maps_url, "https://maps.google.com/place/Starbucks")
        self.assertEqual(self.competitor.instagram_handle, "starbucks")

    # ── GET /api/v1/local/competitors/{id}/social-posts ──────────────────

    def test_get_social_posts_empty(self):
        """GET social posts with no data returns empty list."""
        resp = self.client.get(
            f"/api/v1/local/competitors/{self.competitor.id}/social-posts",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["posts"], [])

    def test_get_social_posts_returns_correct_shape(self):
        """GET social posts with seeded data returns correct shape."""
        # Seed two social posts
        post1 = SocialPost(
            competitor_id=self.competitor.id,
            platform="instagram",
            post_id="abc123",
            content="Check out our new latte!",
            posted_at=datetime(2026, 6, 1, 12, 0, 0),
            sentiment="positive",
            engagement_hint="42 likes",
        )
        post2 = SocialPost(
            competitor_id=self.competitor.id,
            platform="facebook",
            post_id="def456",
            content="Grand opening this weekend!",
            posted_at=datetime(2026, 6, 2, 15, 30, 0),
            sentiment="neutral",
            engagement_hint="10 comments",
        )
        self.db.add_all([post1, post2])
        self.db.commit()

        resp = self.client.get(
            f"/api/v1/local/competitors/{self.competitor.id}/social-posts",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["posts"]), 2)

        # Check shape of each post
        for post in data["posts"]:
            self.assertIn("id", post)
            self.assertIn("platform", post)
            self.assertIn("post_id", post)
            self.assertIn("content", post)
            self.assertIn("posted_at", post)
            self.assertIn("fetched_at", post)
            self.assertIn("sentiment", post)
            self.assertIn("engagement_hint", post)

        # Posts should be ordered by posted_at desc (newest first)
        self.assertIn("Grand opening", data["posts"][0]["content"])


if __name__ == "__main__":
    unittest.main()
