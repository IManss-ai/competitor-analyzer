import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import app.pipeline.review_scraper as rs


class TestReviewScraperSidecar(unittest.IsolatedAsyncioTestCase):
    async def test_fetch_page_text_posts_to_scrape_raw(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={"text": "rendered review markdown"})
        post = AsyncMock(return_value=resp)
        with patch.object(rs, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            text = await rs.fetch_page_text("https://www.g2.com/products/acme/reviews")
        self.assertEqual(text, "rendered review markdown")
        post.assert_awaited()
        args, kwargs = post.call_args
        self.assertIn("/scrape-raw", args[0])

    async def test_empty_scraper_url_returns_empty(self):
        with patch.object(rs, "SCRAPER_URL", ""):
            text = await rs.fetch_page_text("https://www.g2.com/products/acme/reviews")
        self.assertEqual(text, "")
