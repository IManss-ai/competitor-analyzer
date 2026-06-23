import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
import app.pipeline.fetcher as fetcher


class TestGenerateMockWebpage(unittest.TestCase):
    def test_brand_name_strips_www_and_tld(self):
        page = fetcher.generate_mock_webpage("https://www.notion.so/pricing", 0)
        self.assertIn("Notion", page)
        self.assertNotIn("Www", page)

    def test_short_brand_falls_back_to_acmesaas(self):
        page = fetcher.generate_mock_webpage("https://a.com", 0)
        self.assertIn("AcmeSaaS", page)

    def test_snapshot_zero_has_original_starter_price(self):
        page = fetcher.generate_mock_webpage("https://acme.com", 0)
        self.assertIn("$19 per user per month", page)
        self.assertNotIn("AI Copilot", page)

    def test_snapshot_one_announces_price_increase(self):
        page = fetcher.generate_mock_webpage("https://acme.com", 1)
        self.assertIn("$29 per user per month", page)
        self.assertIn("Effective June 2026", page)

    def test_snapshot_two_introduces_ai_copilot(self):
        page = fetcher.generate_mock_webpage("https://acme.com", 2)
        self.assertIn("AI Copilot", page)
        self.assertIn("$59 per user per month", page)

    def test_snapshot_three_plus_is_repositioning(self):
        page = fetcher.generate_mock_webpage("https://acme.com", 3)
        self.assertIn("AI-Powered Operating System", page)
        page99 = fetcher.generate_mock_webpage("https://acme.com", 99)
        self.assertEqual(page, page99)


class TestFetchPageTextEdges(unittest.IsolatedAsyncioTestCase):
    async def test_dummy_literal_returns_mock(self):
        with patch.object(fetcher, "SCRAPER_URL", "dummy"):
            text, err = await fetcher.fetch_page_text("https://acme.com", 2)
        self.assertIsNone(err)
        self.assertIn("AI Copilot", text)

    async def test_sidecar_missing_text_key_returns_empty_string(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={})
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(return_value=resp)):
            text, err = await fetcher.fetch_page_text("https://acme.com", 0)
        self.assertIsNone(err)
        self.assertEqual(text, "")

    async def test_sidecar_text_is_stripped(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json = MagicMock(return_value={"text": "  \n  body  \n  "})
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(return_value=resp)):
            text, err = await fetcher.fetch_page_text("https://acme.com", 0)
        self.assertEqual(text, "body")

    async def test_both_sidecar_and_direct_fail_returns_error(self):
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("down"))), \
             patch("httpx.AsyncClient.get", AsyncMock(side_effect=httpx.ConnectError("nope"))):
            text, err = await fetcher.fetch_page_text("https://acme.com", 0)
        self.assertEqual(text, "")
        self.assertIsNotNone(err)
        self.assertIn("Scraper sidecar failed", err)
        self.assertIn("direct fallback failed", err)

    async def test_direct_fallback_strips_script_and_style(self):
        get_resp = MagicMock()
        get_resp.raise_for_status = MagicMock()
        get_resp.text = (
            "<html><head><style>.x{color:red}</style></head>"
            "<body><script>var a=1;</script><p>Visible text here</p></body></html>"
        )
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("down"))), \
             patch("httpx.AsyncClient.get", AsyncMock(return_value=get_resp)):
            text, err = await fetcher.fetch_page_text("https://acme.com", 0)
        self.assertIsNone(err)
        self.assertIn("Visible text here", text)
        self.assertNotIn("color:red", text)
        self.assertNotIn("var a=1", text)

    async def test_direct_fallback_truncates_to_10000_chars(self):
        get_resp = MagicMock()
        get_resp.raise_for_status = MagicMock()
        get_resp.text = "<p>" + ("word " * 5000) + "</p>"
        with patch.object(fetcher, "SCRAPER_URL", "http://localhost:3001"), \
             patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("down"))), \
             patch("httpx.AsyncClient.get", AsyncMock(return_value=get_resp)):
            text, err = await fetcher.fetch_page_text("https://acme.com", 0)
        self.assertIsNone(err)
        self.assertEqual(len(text), 10000)


class TestExtractMainContent(unittest.TestCase):
    def test_keeps_only_long_paragraphs(self):
        long_p = "L" * 250
        raw = "short nav\n\n" + long_p + "\n\nmenu link"
        out = fetcher.extract_main_content(raw)
        self.assertEqual(out, long_p)

    def test_joins_multiple_long_paragraphs(self):
        a = "A" * 250
        b = "B" * 250
        raw = a + "\n\n" + b
        out = fetcher.extract_main_content(raw)
        self.assertEqual(out, a + "\n\n" + b)

    def test_no_long_paragraph_returns_raw_unchanged(self):
        raw = "just short text\n\nmore short"
        out = fetcher.extract_main_content(raw)
        self.assertEqual(out, raw)

    def test_exactly_200_chars_is_excluded(self):
        p200 = "P" * 200
        out = fetcher.extract_main_content(p200)
        self.assertEqual(out, p200)


if __name__ == "__main__":
    unittest.main()
