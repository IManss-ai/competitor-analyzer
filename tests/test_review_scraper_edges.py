import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, Review, ReviewSnapshot
import app.pipeline.review_scraper as rs


class TestExtractJsonFromResponse(unittest.TestCase):
    def test_parses_fenced_json_block(self):
        content = 'prefix\n```json\n{"a": 1}\n```\nsuffix'
        self.assertEqual(rs._extract_json_from_response(content), {"a": 1})

    def test_parses_plain_fenced_block(self):
        content = 'note\n```\n{"b": 2}\n```'
        self.assertEqual(rs._extract_json_from_response(content), {"b": 2})

    def test_parses_bare_json_without_fence(self):
        self.assertEqual(rs._extract_json_from_response('{"c": 3}'), {"c": 3})

    def test_invalid_json_raises(self):
        with self.assertRaises(ValueError):
            rs._extract_json_from_response("not json at all")


class TestParseDate(unittest.TestCase):
    def test_none_returns_none(self):
        self.assertIsNone(rs._parse_date(None))

    def test_empty_string_returns_none(self):
        self.assertIsNone(rs._parse_date(""))

    def test_z_suffix_is_converted_to_utc_offset(self):
        dt = rs._parse_date("2026-06-01T12:00:00Z")
        self.assertIsNotNone(dt)
        self.assertEqual(dt.year, 2026)
        self.assertIsNotNone(dt.utcoffset())
        self.assertEqual(dt.utcoffset().total_seconds(), 0)

    def test_plain_iso_date(self):
        dt = rs._parse_date("2026-06-15")
        self.assertEqual((dt.year, dt.month, dt.day), (2026, 6, 15))

    def test_invalid_date_returns_none(self):
        self.assertIsNone(rs._parse_date("not-a-date"))


def _llm_response(content):
    """OpenAI-compatible chat completion response carrying `content`."""
    resp = MagicMock()
    choice = MagicMock()
    choice.message.content = content
    resp.choices = [choice]
    return resp


class TestExtractReviewsWithClaude(unittest.IsolatedAsyncioTestCase):
    # Post-DeepSeek-migration: gates on llm.ai_available(), calls
    # llm.get_async_client().chat.completions.create (OpenAI-compatible shape).
    async def test_no_ai_returns_empty_without_call(self):
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=False), \
             patch("app.pipeline.review_scraper.llm.get_async_client") as mock_get_client:
            res = await rs._extract_reviews_with_claude("some review text")
        self.assertEqual(res, {"reviews": [], "avg_rating": 0, "total_reviews": 0})
        mock_get_client.assert_not_called()

    async def test_api_error_degrades_to_empty(self):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("boom"))
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=True), \
             patch("app.pipeline.review_scraper.llm.get_async_client", return_value=client):
            res = await rs._extract_reviews_with_claude("text")
        self.assertEqual(res, {"reviews": [], "avg_rating": 0, "total_reviews": 0})

    async def test_successful_extraction_parses_model_json(self):
        content = '```json\n{"reviews": [{"id": "z1"}], "avg_rating": 4.2, "total_reviews": 7}\n```'
        client = MagicMock()
        client.chat.completions.create = AsyncMock(return_value=_llm_response(content))
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=True), \
             patch("app.pipeline.review_scraper.llm.get_async_client", return_value=client):
            res = await rs._extract_reviews_with_claude("text")
        self.assertEqual(res["avg_rating"], 4.2)
        self.assertEqual(res["reviews"], [{"id": "z1"}])


class TestAnalyzeComplaintsWithClaude(unittest.IsolatedAsyncioTestCase):
    async def test_empty_reviews_short_circuits(self):
        with patch("app.pipeline.review_scraper.llm.get_async_client") as mock_get_client:
            res = await rs._analyze_complaints_with_claude([])
        self.assertEqual(res, {"complaints": [], "complaint_reviews": []})
        mock_get_client.assert_not_called()

    async def test_no_ai_with_reviews_returns_empty(self):
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=False), \
             patch("app.pipeline.review_scraper.llm.get_async_client") as mock_get_client:
            res = await rs._analyze_complaints_with_claude([{"id": "r1"}])
        self.assertEqual(res, {"complaints": [], "complaint_reviews": []})
        mock_get_client.assert_not_called()

    async def test_api_error_degrades(self):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("kaboom"))
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=True), \
             patch("app.pipeline.review_scraper.llm.get_async_client", return_value=client):
            res = await rs._analyze_complaints_with_claude([{"id": "r1"}])
        self.assertEqual(res, {"complaints": [], "complaint_reviews": []})

    async def test_successful_analysis(self):
        content = '{"complaints": ["slow"], "complaint_reviews": ["r1"]}'
        client = MagicMock()
        client.chat.completions.create = AsyncMock(return_value=_llm_response(content))
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=True), \
             patch("app.pipeline.review_scraper.llm.get_async_client", return_value=client):
            res = await rs._analyze_complaints_with_claude([{"id": "r1"}])
        self.assertEqual(res["complaint_reviews"], ["r1"])


class TestFetchPageTextEdges(unittest.IsolatedAsyncioTestCase):
    async def test_dummy_scraper_url_returns_empty(self):
        with patch.object(rs, "SCRAPER_URL", "dummy"):
            text = await rs.fetch_page_text("https://x.com")
        self.assertEqual(text, "")

    async def test_raise_for_status_propagates(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError("500", request=MagicMock(), response=MagicMock())
        )
        post = AsyncMock(return_value=resp)
        with patch.object(rs, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            with self.assertRaises(httpx.HTTPStatusError):
                await rs.fetch_page_text("https://x.com")

    async def test_missing_text_key_returns_empty_string(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={})
        post = AsyncMock(return_value=resp)
        with patch.object(rs, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            text = await rs.fetch_page_text("https://x.com")
        self.assertEqual(text, "")

    async def test_text_is_stripped(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={"text": "  padded  "})
        post = AsyncMock(return_value=resp)
        with patch.object(rs, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            text = await rs.fetch_page_text("https://x.com")
        self.assertEqual(text, "padded")


class TestScrapeCompetitorReviewsEdges(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="edge@user.com")
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
    async def test_neutral_sentiment_for_mid_rating_non_complaint(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "reviews": [{"id": "m1", "rating": 3, "body": "ok"}],
            "avg_rating": 3.0,
            "total_reviews": 1,
        }
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        rev = self.db.execute(select(Review)).scalars().one()
        self.assertEqual(rev.sentiment, "neutral")
        self.assertFalse(rev.is_complaint)

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_existing_review_is_updated_not_duplicated(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        existing = Review(
            competitor_id=self.competitor.id,
            platform="g2",
            review_id="dup1",
            author="orig",
            rating=1,
            title="old title",
            body="old body",
            sentiment="negative",
            is_complaint=True,
        )
        self.db.add(existing)
        self.db.commit()

        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "reviews": [{"id": "dup1", "rating": 5, "title": "new title", "body": "new body"}],
            "avg_rating": 5.0,
            "total_reviews": 1,
        }
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        rows = self.db.execute(select(Review).where(Review.review_id == "dup1")).scalars().all()
        self.assertEqual(len(rows), 1)  # not duplicated
        updated = rows[0]
        self.assertEqual(updated.rating, 5)
        self.assertEqual(updated.title, "new title")
        self.assertEqual(updated.sentiment, "positive")
        self.assertFalse(updated.is_complaint)  # re-flagged from True to False

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_no_complaints_snapshot_has_null_top_complaints(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "reviews": [{"id": "p1", "rating": 5, "body": "great"}],
            "avg_rating": 5.0,
            "total_reviews": 1,
        }
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        res = await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        snap = self.db.execute(select(ReviewSnapshot)).scalars().one()
        self.assertIsNone(snap.top_complaints)
        self.assertEqual(snap.complaint_count, 0)
        self.assertEqual(res["g2"]["complaint_count"], 0)

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://g2/x", "trustpilot": "https://tp/x"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_exception_on_one_platform_rolls_back_and_continues(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200
        # g2 extraction raises; trustpilot succeeds
        mock_extract.side_effect = [
            RuntimeError("g2 boom"),
            {"reviews": [{"id": "t1", "rating": 4, "body": "fine"}], "avg_rating": 4.0, "total_reviews": 1},
        ]
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        res = await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        self.assertNotIn("g2", res)
        self.assertIn("trustpilot", res)
        reviews = self.db.execute(select(Review)).scalars().all()
        self.assertEqual([r.review_id for r in reviews], ["t1"])

    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude")
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude")
    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_short_page_below_100_chars_skips_extraction(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 50  # >0 but <100 -> skip

        res = await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        self.assertEqual(res, {})
        mock_extract.assert_not_called()
        mock_analyze.assert_not_called()

    @patch("app.pipeline.review_scraper.fetch_page_text")
    async def test_unknown_competitor_id_still_derives_urls(self, mock_fetch):
        import uuid
        mock_fetch.return_value = ""  # short -> no work, exercises the no-comp branch
        unknown_id = str(uuid.uuid4())

        res = await rs.scrape_competitor_reviews(unknown_id, "https://acme.com", self.db)

        self.assertEqual(res, {})
        called = [c.args[0] for c in mock_fetch.call_args_list]
        self.assertTrue(any("g2.com" in u for u in called))
        self.assertTrue(any("trustpilot.com" in u for u in called))


if __name__ == "__main__":
    unittest.main()
