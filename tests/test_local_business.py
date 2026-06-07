import unittest
from unittest.mock import patch, AsyncMock, MagicMock
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

    # ── Scraper and Scan background integrations ──────────────────────────

    @patch("app.pipeline.google_reviews_scraper.fetch_page_text")
    @patch("app.pipeline.google_reviews_scraper.anthropic.AsyncAnthropic")
    async def test_scrape_google_reviews(self, mock_anthropic_class, mock_fetch_page_text):
        """Test Google Reviews scraping logic and DB upsert."""
        from app.pipeline.google_reviews_scraper import scrape_google_reviews
        from app.models import Review, ReviewSnapshot
        import json
        import os

        # Setup mock fetch_page_text response (must be >= 100 chars)
        mock_fetch_page_text.return_value = "Mock Google Maps page content containing reviews" * 10

        # Setup mock Anthropic client
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client

        mock_response = MagicMock()
        mock_content = MagicMock()
        mock_content.text = """
        {
          "avg_rating": 4.5,
          "total_reviews": 2,
          "recent_reviews": [
            {"author": "Alice", "rating": 5, "body": "Love this place!", "published_at": "2026-06-01T12:00:00Z"},
            {"author": "Bob", "rating": 1, "body": "Terrible customer service.", "published_at": "2026-06-02T13:00:00Z"}
          ],
          "top_complaints": ["Customer service"]
        }
        """
        mock_response.content = [mock_content]
        mock_client.messages.create = AsyncMock(return_value=mock_response)

        # Set env variable to pass the guard
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test_api_key"}):
            result = await scrape_google_reviews(str(self.competitor.id), "https://maps.google.com/place/test", self.db)

        self.assertEqual(result["avg_rating"], 4.5)
        self.assertEqual(result["total_reviews"], 2)
        self.assertEqual(result["complaint_count"], 1)

        # Verify Review Snapshot created
        snapshot = self.db.query(ReviewSnapshot).filter_by(competitor_id=self.competitor.id, platform="google").first()
        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot.avg_rating, 4.5)
        self.assertEqual(snapshot.total_reviews, 2)
        self.assertEqual(snapshot.complaint_count, 1)
        self.assertIn("Customer service", snapshot.top_complaints)

        # Verify reviews created in DB
        reviews = self.db.query(Review).filter_by(competitor_id=self.competitor.id, platform="google").all()
        self.assertEqual(len(reviews), 2)

        # Alice review check
        alice_rev = [r for r in reviews if r.author == "Alice"][0]
        self.assertEqual(alice_rev.rating, 5)
        self.assertEqual(alice_rev.sentiment, "positive")
        self.assertEqual(alice_rev.is_complaint, False)

        # Bob review check
        bob_rev = [r for r in reviews if r.author == "Bob"][0]
        self.assertEqual(bob_rev.rating, 1)
        self.assertEqual(bob_rev.sentiment, "negative")
        self.assertEqual(bob_rev.is_complaint, True)

    @patch("app.pipeline.social_tracker.fetch_page_text")
    @patch("app.pipeline.social_tracker.anthropic.AsyncAnthropic")
    async def test_scrape_social_posts(self, mock_anthropic_class, mock_fetch_page_text):
        """Test Social Post scraping logic and DB upsert with sentiment."""
        from app.pipeline.social_tracker import scrape_social_posts
        from app.models import SocialPost
        import json
        import os

        # Setup mock fetch_page_text response (must be >= 100 chars)
        mock_fetch_page_text.return_value = "Mock social page content containing posts" * 10

        # Setup mock Anthropic client
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client

        # Setup responses for extract and sentiment calls
        instagram_extract_resp = MagicMock()
        instagram_extract_resp.content = [MagicMock(text=json.dumps({
            "posts": [
                {"content": "Insta post 1", "posted_at": "2026-06-05T10:00:00Z", "engagement_hint": "10 likes"}
            ]
        }))]

        instagram_sentiment_resp = MagicMock()
        instagram_sentiment_resp.content = [MagicMock(text=json.dumps({
            "sentiment_summary": "Upbeat and positive vibes",
            "notable_posts": ["Insta post 1"]
        }))]

        facebook_extract_resp = MagicMock()
        facebook_extract_resp.content = [MagicMock(text=json.dumps({
            "posts": [
                {"content": "FB post 1", "posted_at": "2026-06-06T12:00:00Z", "engagement_hint": "5 shares"}
            ]
        }))]

        facebook_sentiment_resp = MagicMock()
        facebook_sentiment_resp.content = [MagicMock(text=json.dumps({
            "sentiment_summary": "Neutral updates",
            "notable_posts": ["FB post 1"]
        }))]

        mock_client.messages.create = AsyncMock()
        mock_client.messages.create.side_effect = [
            instagram_extract_resp,
            instagram_sentiment_resp,
            facebook_extract_resp,
            facebook_sentiment_resp
        ]

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test_api_key"}):
            result = await scrape_social_posts(
                str(self.competitor.id),
                instagram_handle="test_insta",
                facebook_page="test_fb",
                db=self.db
            )

        self.assertEqual(result["instagram_posts"], 1)
        self.assertEqual(result["facebook_posts"], 1)

        # Verify posts persisted
        insta_post = self.db.query(SocialPost).filter_by(competitor_id=self.competitor.id, platform="instagram").first()
        self.assertIsNotNone(insta_post)
        self.assertEqual(insta_post.content, "Insta post 1")
        self.assertEqual(insta_post.sentiment, "positive") # inferred from positive/upbeat summary

        fb_post = self.db.query(SocialPost).filter_by(competitor_id=self.competitor.id, platform="facebook").first()
        self.assertIsNotNone(fb_post)
        self.assertEqual(fb_post.content, "FB post 1")
        self.assertEqual(fb_post.sentiment, "neutral")

    @patch("app.routes.local_business._run_local_scan_background")
    def test_trigger_local_scan_endpoint(self, mock_run_background):
        """POST /scan/{id} starts scan in background and handles ownership checks."""
        # 1. Non-existent competitor returns 404
        bad_id = str(uuid.uuid4())
        resp = self.client.post(f"/api/v1/local/scan/{bad_id}", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 404)

        # 2. Wrong user competitor returns 404
        resp = self.client.post(f"/api/v1/local/scan/{self.competitor.id}", headers=self.other_auth_headers)
        self.assertEqual(resp.status_code, 404)

        # 3. Successful trigger returns 200 and calls background task
        resp = self.client.post(f"/api/v1/local/scan/{self.competitor.id}", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": True, "message": "Local business scan started"})
        mock_run_background.assert_called_once_with(str(self.competitor.id))

    @patch("app.pipeline.google_reviews_scraper.scrape_google_reviews")
    @patch("app.pipeline.social_tracker.scrape_social_posts")
    @patch("app.routes.local_business.SessionLocal")
    async def test_run_local_scan_background(self, mock_session_local, mock_scrape_social, mock_scrape_reviews):
        """Background scan runs correct pipelines based on competitor fields."""
        from app.routes.local_business import _run_local_scan_background

        # Set up mock session
        mock_session_local.return_value = self.db

        # Competitor has maps URL and instagram/facebook handles
        self.competitor.google_maps_url = "https://maps.google.com/place/123"
        self.competitor.instagram_handle = "my_insta"
        self.competitor.facebook_page = "my_fb"
        self.db.commit()

        await _run_local_scan_background(str(self.competitor.id))

        mock_scrape_reviews.assert_called_once_with(str(self.competitor.id), "https://maps.google.com/place/123", self.db)
        mock_scrape_social.assert_called_once_with(str(self.competitor.id), "my_insta", "my_fb", self.db)


if __name__ == "__main__":
    unittest.main()
