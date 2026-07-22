import unittest
from unittest.mock import patch
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, Review, ReviewSnapshot
from app.pipeline.google_reviews_scraper import (
    scrape_google_reviews,
    _extract_google_reviews_with_claude,
)
from app.pipeline.review_scraper import ExtractionFailed


class TestScrapeGoogleReviews(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="g@user.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    # ---- S4: extraction FAILURE must not fabricate a zeroed snapshot ----

    @patch("app.pipeline.google_reviews_scraper._extract_google_reviews_with_claude")
    @patch("app.pipeline.google_reviews_scraper.fetch_page_text")
    async def test_extraction_failure_skips_snapshot(self, mock_fetch, mock_extract):
        """Page fetched fine but extraction FAILED (dummy key / API error):
        the zeroed ExtractionFailed payload must NOT be persisted, or the
        dashboard's latest-snapshot read shows '0.0 / 0 reviews' and masks the
        last real rating."""
        mock_fetch.return_value = "x" * 200  # passes the >100 char guard
        mock_extract.return_value = ExtractionFailed(
            {"avg_rating": 0, "total_reviews": 0, "recent_reviews": [], "top_complaints": []}
        )

        res = await scrape_google_reviews(str(self.competitor.id), "https://maps.google.com/acme", self.db)

        self.assertEqual(res, {})
        self.assertEqual(self.db.execute(select(ReviewSnapshot)).scalars().all(), [])
        self.assertEqual(self.db.execute(select(Review)).scalars().all(), [])

    @patch("app.pipeline.google_reviews_scraper.llm.ai_available", return_value=False)
    @patch("app.pipeline.google_reviews_scraper.fetch_page_text")
    async def test_dummy_key_returns_sentinel_and_skips_snapshot(self, mock_fetch, mock_avail):
        """With no usable model key the real extractor returns an ExtractionFailed
        sentinel, and the orchestrator writes nothing."""
        mock_fetch.return_value = "x" * 200

        extracted = await _extract_google_reviews_with_claude("x" * 200)
        self.assertIsInstance(extracted, ExtractionFailed)

        res = await scrape_google_reviews(str(self.competitor.id), "https://maps.google.com/acme", self.db)
        self.assertEqual(res, {})
        self.assertEqual(self.db.execute(select(ReviewSnapshot)).scalars().all(), [])
        self.assertEqual(self.db.execute(select(Review)).scalars().all(), [])

    # ---- S4: a GENUINE zero-reviews result still behaves as before ----

    @patch("app.pipeline.google_reviews_scraper._extract_google_reviews_with_claude")
    @patch("app.pipeline.google_reviews_scraper.fetch_page_text")
    async def test_genuine_zero_reviews_still_writes_snapshot(self, mock_fetch, mock_extract):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "avg_rating": 0,
            "total_reviews": 0,
            "recent_reviews": [],
            "top_complaints": [],
        }

        res = await scrape_google_reviews(str(self.competitor.id), "https://maps.google.com/acme", self.db)

        self.assertEqual(res["total_reviews"], 0)
        snaps = self.db.execute(select(ReviewSnapshot)).scalars().all()
        self.assertEqual(len(snaps), 1)

    @patch("app.pipeline.google_reviews_scraper._extract_google_reviews_with_claude")
    @patch("app.pipeline.google_reviews_scraper.fetch_page_text")
    async def test_null_review_and_complaint_lists_do_not_crash(self, mock_fetch, mock_extract):
        """Explicit "recent_reviews": null / "top_complaints": null (vs missing
        key) previously hit `for rev in None` / `len(None)` -> TypeError -> the
        outer handler rolled back the fresh snapshot carrying the real rating."""
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "avg_rating": 4.2,
            "total_reviews": 88,
            "recent_reviews": None,
            "top_complaints": None,
        }

        res = await scrape_google_reviews(str(self.competitor.id), "https://maps.google.com/acme", self.db)

        self.assertEqual(res["avg_rating"], 4.2)
        self.assertEqual(res["total_reviews"], 88)
        snaps = self.db.execute(select(ReviewSnapshot)).scalars().all()
        self.assertEqual(len(snaps), 1)
        self.assertEqual(snaps[0].avg_rating, 4.2)

    # ---- S5: string / null rating must not crash + roll back good data ----

    @patch("app.pipeline.google_reviews_scraper._extract_google_reviews_with_claude")
    @patch("app.pipeline.google_reviews_scraper.fetch_page_text")
    async def test_string_and_null_rating_do_not_crash(self, mock_fetch, mock_extract):
        """A string rating ('4', 'N/A') or explicit null previously raised
        TypeError on `rating <= 2`, rolling back the whole scrape (no snapshot,
        no reviews). Coercion keeps the good data."""
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "avg_rating": 3.5,
            "total_reviews": 3,
            "recent_reviews": [
                {"author": "A", "rating": "1", "body": "billing broke"},   # str -> complaint
                {"author": "B", "rating": "N/A", "body": "unclear"},        # unparseable -> neutral
                {"author": "C", "rating": None, "body": "no rating given"},  # null -> neutral
            ],
            "top_complaints": ["billing"],
        }

        res = await scrape_google_reviews(str(self.competitor.id), "https://maps.google.com/acme", self.db)

        # Good data survived — snapshot written, all three reviews stored.
        self.assertEqual(res["total_reviews"], 3)
        snaps = self.db.execute(select(ReviewSnapshot)).scalars().all()
        self.assertEqual(len(snaps), 1)
        reviews = {r.author: r for r in self.db.execute(select(Review)).scalars().all()}
        self.assertEqual(set(reviews), {"A", "B", "C"})
        self.assertTrue(reviews["A"].is_complaint)
        self.assertEqual(reviews["A"].sentiment, "negative")
        self.assertFalse(reviews["B"].is_complaint)
        self.assertEqual(reviews["B"].sentiment, "neutral")
        self.assertFalse(reviews["C"].is_complaint)


if __name__ == "__main__":
    unittest.main()
