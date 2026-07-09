import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor
from app.pipeline.review_scraper import _get_platform_urls, _resolve_capterra_url


class TestGetPlatformUrls(unittest.TestCase):
    def test_derives_urls_from_homepage_when_no_overrides(self):
        urls = _get_platform_urls("https://www.notion.so")
        self.assertEqual(urls["g2"], "https://www.g2.com/products/notion/reviews")
        self.assertEqual(urls["trustpilot"], "https://www.trustpilot.com/review/notion.so")
        # capterra has no domain-derivable URL scheme (real pages are keyed by an
        # opaque numeric id, e.g. /p/19319/JIRA/) — a guessed slug always 404s,
        # so it's omitted unless resolved separately (see _resolve_capterra_url).
        self.assertNotIn("capterra", urls)

    def test_overrides_replace_derived_urls(self):
        urls = _get_platform_urls(
            "https://www.acme-corp.com",
            overrides={
                "g2": "https://www.g2.com/products/acme-platform/reviews",
                "trustpilot": "https://www.trustpilot.com/review/acme.io",
            },
        )
        self.assertEqual(urls["g2"], "https://www.g2.com/products/acme-platform/reviews")
        self.assertEqual(urls["trustpilot"], "https://www.trustpilot.com/review/acme.io")
        self.assertNotIn("capterra", urls)

    def test_capterra_override_is_included(self):
        urls = _get_platform_urls(
            "https://www.acme-corp.com",
            overrides={"capterra": "https://www.capterra.com/p/123456/Acme/"},
        )
        self.assertEqual(urls["capterra"], "https://www.capterra.com/p/123456/Acme/")

    def test_empty_override_value_does_not_replace(self):
        urls = _get_platform_urls("https://example.com", overrides={"g2": ""})
        self.assertEqual(urls["g2"], "https://www.g2.com/products/example/reviews")

    def test_none_overrides_is_safe(self):
        urls = _get_platform_urls("https://example.com", overrides=None)
        self.assertIn("g2", urls)


class TestResolveCapterraUrl(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_extracts_product_url_from_search_results(self, mock_fetch):
        mock_fetch.return_value = (
            "Search results for jira\n\n"
            "[Jira](https://www.capterra.com/p/19319/JIRA/)\n"
            "4.4 (15414) [View all reviews](https://www.capterra.com/p/19319/JIRA/reviews/)\n"
            "[Clockify](https://www.capterra.com/p/169607/Clockify/)\n"
        )
        result = await _resolve_capterra_url("atlassian.com")
        self.assertEqual(result, "https://www.capterra.com/p/19319/JIRA/")
        mock_fetch.assert_awaited_once_with("https://www.capterra.com/search/?query=atlassian")

    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_returns_none_when_no_product_link_found(self, mock_fetch):
        mock_fetch.return_value = "No results found for this query."
        result = await _resolve_capterra_url("totally-unknown-vendor.com")
        self.assertIsNone(result)

    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_returns_none_when_search_fetch_raises(self, mock_fetch):
        mock_fetch.side_effect = RuntimeError("scrape-raw failed: 502")
        result = await _resolve_capterra_url("acme.com")
        self.assertIsNone(result)


class TestScrapeReviewsResolvesCapterra(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="capterra-resolve@user.com")
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    @patch("app.pipeline.review_scraper._resolve_capterra_url", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_resolved_capterra_url_is_scraped_when_no_override(self, mock_fetch, mock_resolve):
        from app.pipeline.review_scraper import scrape_competitor_reviews

        competitor = Competitor(user_id=self.user.id, url="https://www.atlassian.com/software/jira", name="Jira")
        self.db.add(competitor)
        self.db.commit()
        self.db.refresh(competitor)

        mock_resolve.return_value = "https://www.capterra.com/p/19319/JIRA/"
        mock_fetch.return_value = ""  # short response -> loop continues, no review work needed

        await scrape_competitor_reviews(str(competitor.id), competitor.url, self.db)

        mock_resolve.assert_awaited_once_with("atlassian.com")
        called_urls = [call.args[0] for call in mock_fetch.call_args_list]
        self.assertIn("https://www.capterra.com/p/19319/JIRA/", called_urls)

    @patch("app.pipeline.review_scraper._resolve_capterra_url", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_capterra_override_skips_resolution(self, mock_fetch, mock_resolve):
        from app.pipeline.review_scraper import scrape_competitor_reviews

        competitor = Competitor(
            user_id=self.user.id,
            url="https://www.atlassian.com/software/jira",
            name="Jira",
            capterra_url="https://www.capterra.com/p/19319/JIRA/",
        )
        self.db.add(competitor)
        self.db.commit()
        self.db.refresh(competitor)

        mock_fetch.return_value = ""

        await scrape_competitor_reviews(str(competitor.id), competitor.url, self.db)

        mock_resolve.assert_not_awaited()
        called_urls = [call.args[0] for call in mock_fetch.call_args_list]
        self.assertIn("https://www.capterra.com/p/19319/JIRA/", called_urls)

    @patch("app.pipeline.review_scraper._resolve_capterra_url", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_unresolved_capterra_is_simply_omitted(self, mock_fetch, mock_resolve):
        from app.pipeline.review_scraper import scrape_competitor_reviews

        competitor = Competitor(user_id=self.user.id, url="https://www.acme.com", name="Acme")
        self.db.add(competitor)
        self.db.commit()
        self.db.refresh(competitor)

        mock_resolve.return_value = None
        mock_fetch.return_value = ""

        await scrape_competitor_reviews(str(competitor.id), competitor.url, self.db)

        called_urls = [call.args[0] for call in mock_fetch.call_args_list]
        self.assertFalse(any("capterra.com" in u for u in called_urls))


class TestCompetitorPatchAcceptsOverrides(unittest.TestCase):
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
        self.user = User(email="g2-test@example.com", subscription_status="active")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://www.acme-corp.com",
            name="Acme Corp",
            business_type="saas",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def test_patch_sets_g2_url(self):
        resp = self.client.patch(
            f"/api/v1/competitors/{self.competitor.id}",
            json={"g2_url": "https://www.g2.com/products/acme-platform/reviews"},
            headers=self.auth,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["g2_url"], "https://www.g2.com/products/acme-platform/reviews")
        self.db.refresh(self.competitor)
        self.assertEqual(self.competitor.g2_url, "https://www.g2.com/products/acme-platform/reviews")

    def test_patch_empty_string_clears_override(self):
        self.competitor.g2_url = "https://www.g2.com/products/old/reviews"
        self.db.commit()
        resp = self.client.patch(
            f"/api/v1/competitors/{self.competitor.id}",
            json={"g2_url": ""},
            headers=self.auth,
        )
        self.assertEqual(resp.status_code, 200)
        self.db.refresh(self.competitor)
        self.assertIsNone(self.competitor.g2_url)

    def test_patch_accepts_all_three_review_url_overrides(self):
        resp = self.client.patch(
            f"/api/v1/competitors/{self.competitor.id}",
            json={
                "g2_url": "https://www.g2.com/products/x/reviews",
                "trustpilot_url": "https://www.trustpilot.com/review/x.io",
                "capterra_url": "https://www.capterra.com/p/123/x/",
            },
            headers=self.auth,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["g2_url"], "https://www.g2.com/products/x/reviews")
        self.assertEqual(data["trustpilot_url"], "https://www.trustpilot.com/review/x.io")
        self.assertEqual(data["capterra_url"], "https://www.capterra.com/p/123/x/")


class TestScrapeReviewsUsesCompetitorOverrides(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        self.user = User(email="scraper-test@example.com")
        self.db.add(self.user)
        self.db.commit()

        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://www.acme-corp.com",
            name="Acme Corp",
            business_type="saas",
            g2_url="https://www.g2.com/products/acme-platform/reviews",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_scraper_calls_overridden_g2_url(self, mock_fetch):
        from app.pipeline.review_scraper import scrape_competitor_reviews
        mock_fetch.return_value = ""  # short response → loop continues, no review work

        await scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        called_urls = [call.args[0] for call in mock_fetch.call_args_list]
        self.assertIn("https://www.g2.com/products/acme-platform/reviews", called_urls)
        self.assertNotIn("https://www.g2.com/products/acme-corp/reviews", called_urls)


if __name__ == "__main__":
    unittest.main()
