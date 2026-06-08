import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
import app.pipeline.fetcher as fetcher


class TestScraperFetcher(unittest.IsolatedAsyncioTestCase):
    async def test_empty_scraper_url_returns_mock(self):
        with patch.object(fetcher, "SCRAPER_URL", ""):
            text, err = await fetcher.fetch_page_text("https://acme.com", snapshot_count=0)
        self.assertIsNone(err)
        self.assertIn("Acme", text)

    async def test_sidecar_success_returns_text(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={"text": "# Hello\n\nstructured body"})
        post = AsyncMock(return_value=resp)
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", post):
            text, err = await fetcher.fetch_page_text("https://acme.com", snapshot_count=1)
        self.assertIsNone(err)
        self.assertEqual(text, "# Hello\n\nstructured body")
        post.assert_awaited()

    async def test_sidecar_failure_falls_back_to_direct_http(self):
        get_resp = MagicMock()
        get_resp.raise_for_status = MagicMock()
        get_resp.text = "<html><body><p>Direct fallback content</p></body></html>"
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("down"))), \
             patch("httpx.AsyncClient.get", AsyncMock(return_value=get_resp)):
            text, err = await fetcher.fetch_page_text("https://acme.com", snapshot_count=1)
        self.assertIsNone(err)
        self.assertIn("Direct fallback content", text)
