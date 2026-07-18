"""Guard tests for scripts/enrich_apps.py — the catalog enrichment CLI must
hard-abort rather than write mock/heuristic junk into the public /apps catalog."""
import importlib.util
import io
import os
import unittest
from contextlib import redirect_stdout
from unittest.mock import AsyncMock, patch

_SCRIPT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "scripts", "enrich_apps.py")


def _load_module():
    spec = importlib.util.spec_from_file_location("enrich_apps_under_test", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestEnrichAppsGuards(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_module()

    def test_aborts_when_scraper_url_unset(self):
        with patch.object(self.mod, "SCRAPER_URL", "dummy"), \
             patch("app.llm.ai_available", return_value=True), \
             redirect_stdout(io.StringIO()) as out:
            with self.assertRaises(SystemExit) as ctx:
                self.mod._abort_if_unsafe()
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn("SCRAPER_URL", out.getvalue())

    def test_aborts_when_ai_unavailable(self):
        with patch.object(self.mod, "SCRAPER_URL", "http://localhost:3001"), \
             patch("app.llm.ai_available", return_value=False), \
             redirect_stdout(io.StringIO()) as out:
            with self.assertRaises(SystemExit) as ctx:
                self.mod._abort_if_unsafe()
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn("DEEPSEEK_API_KEY", out.getvalue())

    def test_passes_when_safe(self):
        with patch.object(self.mod, "SCRAPER_URL", "http://localhost:3001"), \
             patch("app.llm.ai_available", return_value=True):
            self.mod._abort_if_unsafe()  # no SystemExit


class TestEnrichAppsDryRun(unittest.IsolatedAsyncioTestCase):
    async def test_dry_run_fetch_failure_prints_and_writes_nothing(self):
        mod = _load_module()

        class FakeApp:
            slug = "acme"
            url = "acme.io"

        with patch.object(mod, "fetch_raw_page", new_callable=AsyncMock) as mock_fetch, \
             redirect_stdout(io.StringIO()) as out:
            mock_fetch.return_value = ("", "", "boom")
            await mod._dry_run_app(FakeApp())
        self.assertIn("FETCH FAILED", out.getvalue())

    async def test_dry_run_prints_profile_without_db(self):
        mod = _load_module()

        class FakeApp:
            slug = "acme"
            url = "acme.io"

        markdown = "Acme is a productivity platform for modern teams. " * 10
        html = "<script src='https://js.stripe.com/v3/'></script>"
        with patch.object(mod, "fetch_raw_page", new_callable=AsyncMock) as mock_fetch, \
             patch.object(mod, "extract_profile", new_callable=AsyncMock) as mock_extract, \
             redirect_stdout(io.StringIO()) as out:
            mock_fetch.return_value = (markdown, html, None)
            mock_extract.return_value = {"name": "Acme", "tagline": "Ship faster"}
            await mod._dry_run_app(FakeApp())
        printed = out.getvalue()
        self.assertIn("stripe", printed)
        self.assertIn("Ship faster", printed)


if __name__ == "__main__":
    unittest.main()
