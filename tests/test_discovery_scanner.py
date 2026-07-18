import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, AppPricing, AppTech
from app.discovery.scanner import cheap_scan_app, is_garbage_tagline, select_apps_for_scan

PROFILE_JSON = json.dumps({
    "name": "Acme", "tagline": "Ship faster", "description": "A tool.",
    "category": "productivity", "tags": ["saas"],
    "pricing_tiers": [{"tier_name": "Pro", "price": 29, "period": "monthly", "features": []}],
})

# Long enough to clear the MIN_MARKDOWN_CHARS (200) gate before the LLM call.
LONG_MARKDOWN = "Acme is a productivity platform for modern teams. " * 10
STRIPE_HTML = "<html><script src='https://js.stripe.com/v3/'></script><body>hi</body></html>"


class ScannerTestBase(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.app_row = App(slug="acme", url="acme.io", name="acme", scan_status="pending")
        self.db.add(self.app_row)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _mock_llm_client(self, text):
        client = MagicMock()
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = text
        mock_response.choices = [mock_choice]
        client.chat.completions.create = AsyncMock(return_value=mock_response)
        return client


class TestCheapScanner(ScannerTestBase):
    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_successful_scan_populates_profile(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = (LONG_MARKDOWN, STRIPE_HTML, None)
        mock_get_client.return_value = self._mock_llm_client(PROFILE_JSON)
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        self.assertEqual(self.app_row.tagline, "Ship faster")
        self.assertIsNotNone(self.app_row.last_scanned_at)
        tiers = self.db.execute(select(AppPricing)).scalars().all()
        self.assertEqual(len(tiers), 1)
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertIn("stripe", techs)

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_curated_name_never_overwritten(self, mock_fetch, mock_available, mock_get_client):
        # Seeded name 'acme' is curated; the LLM's 'Acme' must not clobber it.
        mock_fetch.return_value = (LONG_MARKDOWN, STRIPE_HTML, None)
        mock_get_client.return_value = self._mock_llm_client(PROFILE_JSON)
        await cheap_scan_app(self.app_row, self.db)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.name, "acme")

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_uses_deepseek_model(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = (LONG_MARKDOWN, "", None)
        client = self._mock_llm_client(PROFILE_JSON)
        mock_get_client.return_value = client
        await cheap_scan_app(self.app_row, self.db)
        model = client.chat.completions.create.call_args.kwargs["model"]
        self.assertEqual(model, "deepseek-v4-flash")

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_tech_detected_from_html_not_markdown(self, mock_fetch, mock_available, mock_get_client):
        # Signature lives ONLY in the html half; markdown mentions nothing.
        mock_fetch.return_value = (LONG_MARKDOWN, STRIPE_HTML, None)
        mock_get_client.return_value = self._mock_llm_client(PROFILE_JSON)
        await cheap_scan_app(self.app_row, self.db)
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertEqual(techs, {"stripe"})

    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_fetch_failure_marks_scan_failed(self, mock_fetch):
        mock_fetch.return_value = ("", "", "boom")
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertFalse(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "scan_failed")

    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_fetch_failure_never_demotes_ok_app(self, mock_fetch):
        # scan_failed hides rows from /apps/search + sitemap; a transient fetch
        # failure must not shrink the public index.
        self.app_row.scan_status = "ok"
        self.app_row.tagline = "Ship faster"
        self.db.commit()
        mock_fetch.return_value = ("", "", "boom")
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertFalse(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        self.assertEqual(self.app_row.tagline, "Ship faster")

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_garbage_ai_output_still_records_tech(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = (LONG_MARKDOWN, STRIPE_HTML, None)
        mock_get_client.return_value = self._mock_llm_client("not json")
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)  # tech in hand -> still 'ok'
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertIn("stripe", techs)

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_no_profile_no_tech_marks_degraded(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = (LONG_MARKDOWN, "<html><body>plain</body></html>", None)
        mock_get_client.return_value = self._mock_llm_client("not json")
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertFalse(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "scan_degraded")
        # Degraded rows must be re-selectable for a retry run.
        batch = select_apps_for_scan(self.db)
        self.assertIn(self.app_row.id, {a.id for a in batch})

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_thin_markdown_skips_llm_call(self, mock_fetch, mock_available, mock_get_client):
        client = self._mock_llm_client(PROFILE_JSON)
        mock_get_client.return_value = client
        mock_fetch.return_value = ("tiny", "<html><body>tiny</body></html>", None)
        ok = await cheap_scan_app(self.app_row, self.db)
        client.chat.completions.create.assert_not_called()
        self.assertFalse(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "scan_degraded")

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_garbage_tagline_rejected(self, mock_fetch, mock_available, mock_get_client):
        garbage_profile = json.dumps({
            "name": "Acme", "tagline": "Please enable JavaScript and cookies to continue",
            "description": "A tool.", "category": "productivity", "tags": [],
            "pricing_tiers": [],
        })
        mock_fetch.return_value = (LONG_MARKDOWN, "", None)
        mock_get_client.return_value = self._mock_llm_client(garbage_profile)
        await cheap_scan_app(self.app_row, self.db)
        self.db.refresh(self.app_row)
        self.assertIsNone(self.app_row.tagline)
        self.assertEqual(self.app_row.description, "A tool.")

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_existing_tech_kept_when_no_replacement(self, mock_fetch, mock_available, mock_get_client):
        self.db.add(AppTech(app_id=self.app_row.id, technology="stripe", tech_category="payments"))
        self.db.commit()
        # New fetch has NO signatures — old tech rows must survive.
        mock_fetch.return_value = (LONG_MARKDOWN, "<html><body>plain</body></html>", None)
        mock_get_client.return_value = self._mock_llm_client(PROFILE_JSON)
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertEqual(techs, {"stripe"})

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_raw_page", new_callable=AsyncMock)
    async def test_existing_pricing_kept_when_parse_fails(self, mock_fetch, mock_available, mock_get_client):
        self.db.add(AppPricing(app_id=self.app_row.id, tier_name="Pro", price=29.0, period="monthly"))
        self.db.commit()
        mock_fetch.return_value = (LONG_MARKDOWN, STRIPE_HTML, None)
        mock_get_client.return_value = self._mock_llm_client("not json")
        await cheap_scan_app(self.app_row, self.db)
        tiers = self.db.execute(select(AppPricing)).scalars().all()
        self.assertEqual(len(tiers), 1)

    def test_is_garbage_tagline(self):
        self.assertTrue(is_garbage_tagline("Attention Required! | Cloudflare"))
        self.assertTrue(is_garbage_tagline("We use cookies to improve your experience"))
        self.assertTrue(is_garbage_tagline("Verify you are a human"))
        self.assertFalse(is_garbage_tagline("Ship faster with Acme"))
        self.assertFalse(is_garbage_tagline(None))


class TestSelectAppsForScan(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()

    def _enriched_app(self, slug, **overrides):
        """A fully-enriched, recently-scanned app (should NOT be selected)."""
        app = App(slug=slug, url=f"{slug}.io", name=slug, scan_status="ok",
                  tagline="Ship faster", last_scanned_at=datetime.utcnow())
        for k, v in overrides.items():
            setattr(app, k, v)
        self.db.add(app)
        self.db.commit()
        self.db.add(AppTech(app_id=app.id, technology="stripe", tech_category="payments"))
        self.db.add(AppPricing(app_id=app.id, tier_name="Pro", price=29.0, period="monthly"))
        self.db.commit()
        return app

    def _selected_slugs(self):
        return {a.slug for a in select_apps_for_scan(self.db)}

    def test_honors_daily_limit(self):
        for i in range(5):
            self.db.add(App(slug=f"a{i}", url=f"a{i}.io", name=f"a{i}", scan_status="pending"))
        self.db.commit()
        with patch.dict("os.environ", {"SEED_SCAN_DAILY_LIMIT": "3"}):
            batch = select_apps_for_scan(self.db)
        self.assertEqual(len(batch), 3)

    def test_fully_enriched_recent_app_not_selected(self):
        self._enriched_app("done")
        self.assertNotIn("done", self._selected_slugs())

    def test_selects_pending_failed_and_degraded(self):
        for slug, status in [("p", "pending"), ("f", "scan_failed"), ("d", "scan_degraded")]:
            self.db.add(App(slug=slug, url=f"{slug}.io", name=slug, scan_status=status))
        self.db.commit()
        self.assertEqual(self._selected_slugs(), {"p", "f", "d"})

    def test_selects_ok_app_with_null_tagline(self):
        self._enriched_app("hollow", tagline=None)
        self.assertIn("hollow", self._selected_slugs())

    def test_selects_ok_app_missing_tech_or_pricing(self):
        app = App(slug="notech", url="notech.io", name="notech", scan_status="ok",
                  tagline="t", last_scanned_at=datetime.utcnow())
        self.db.add(app)
        self.db.commit()
        self.db.add(AppPricing(app_id=app.id, tier_name="Pro", price=9.0, period="monthly"))
        self.db.commit()
        self.assertIn("notech", self._selected_slugs())

    def test_selects_full_tier_apps(self):
        # User-tracked ('full') apps must be enriched too.
        self.db.add(App(slug="tracked", url="tracked.io", name="tracked",
                        scan_status="pending", scan_tier="full"))
        self.db.commit()
        self.assertIn("tracked", self._selected_slugs())

    def test_selects_stale_ok_app(self):
        self._enriched_app("stale", last_scanned_at=datetime.utcnow() - timedelta(days=31))
        self._enriched_app("fresh")
        slugs = self._selected_slugs()
        self.assertIn("stale", slugs)
        self.assertNotIn("fresh", slugs)


if __name__ == "__main__":
    unittest.main()
