import unittest
from unittest.mock import patch
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, Review, ReviewSnapshot
from app.pipeline.review_scraper import scrape_competitor_reviews


class TestScrapeCompetitorReviews(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="rev@user.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_persists_reviews_snapshot_and_flags_complaints(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200  # passes the >100 char guard
        mock_extract.return_value = {
            "reviews": [
                {"id": "r1", "author": "A", "rating": 2, "title": "bad", "body": "slow", "published_at": "2026-06-01"},
                {"id": "r2", "author": "B", "rating": 5, "title": "good", "body": "great", "published_at": "2026-06-02"},
            ],
            "avg_rating": 3.5,
            "total_reviews": 2,
        }
        mock_analyze.return_value = {"complaints": ["slow performance"], "complaint_reviews": ["r1"]}

        res = await scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        # Returned summary
        self.assertIn("g2", res)
        self.assertEqual(res["g2"]["total_reviews"], 2)
        self.assertEqual(res["g2"]["complaint_count"], 1)
        self.assertEqual(res["g2"]["top_complaints"], ["slow performance"])

        # Persisted reviews with correct sentiment / complaint flags
        reviews = {r.review_id: r for r in self.db.execute(select(Review)).scalars().all()}
        self.assertEqual(set(reviews), {"r1", "r2"})
        self.assertTrue(reviews["r1"].is_complaint)
        self.assertEqual(reviews["r1"].sentiment, "negative")
        self.assertFalse(reviews["r2"].is_complaint)
        self.assertEqual(reviews["r2"].sentiment, "positive")

        # One snapshot row
        snaps = self.db.execute(select(ReviewSnapshot)).scalars().all()
        self.assertEqual(len(snaps), 1)
        self.assertEqual(snaps[0].complaint_count, 1)

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_reviews_without_id_are_skipped(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "reviews": [
                {"author": "NoId", "rating": 3, "body": "meh"},   # missing id -> skip
                {"id": "ok1", "author": "C", "rating": 4, "body": "fine"},
            ],
            "avg_rating": 3.5,
            "total_reviews": 2,
        }
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        await scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        reviews = self.db.execute(select(Review)).scalars().all()
        self.assertEqual([r.review_id for r in reviews], ["ok1"])  # the id-less one is not stored

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_int_complaint_ids_still_flag_complaints(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        """The model can return review ids AND complaint_reviews as ints. review_id
        is stored/compared as a string, so without coercion `is_complaint` is
        silently always-False whenever the ids come back numeric — every complaint
        is dropped and the card shows 'No complaints found'."""
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "reviews": [
                {"id": 1, "author": "A", "rating": 5, "body": "great"},
                {"id": 2, "author": "B", "rating": 1, "body": "billing was broken"},
            ],
            "avg_rating": 3.0,
            "total_reviews": 2,
        }
        # complaint_reviews returned as INTS, not strings.
        mock_analyze.return_value = {"complaints": ["billing"], "complaint_reviews": [2]}

        await scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        reviews = {r.review_id: r for r in self.db.execute(select(Review)).scalars().all()}
        self.assertEqual(set(reviews), {"1", "2"})
        self.assertTrue(reviews["2"].is_complaint, "int complaint id must still flag is_complaint")
        self.assertFalse(reviews["1"].is_complaint)

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_empty_page_yields_no_rows(self, mock_fetch, mock_urls):
        mock_fetch.return_value = ""  # below the 100-char guard -> platform skipped

        res = await scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        self.assertEqual(res, {})
        self.assertEqual(self.db.execute(select(Review)).scalars().all(), [])
        self.assertEqual(self.db.execute(select(ReviewSnapshot)).scalars().all(), [])


if __name__ == "__main__":
    unittest.main()
