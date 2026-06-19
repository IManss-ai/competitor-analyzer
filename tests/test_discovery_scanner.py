import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, AppPricing, AppTech
from app.discovery.scanner import cheap_scan_app, select_apps_for_scan

PROFILE_JSON = json.dumps({
    "name": "Acme", "tagline": "Ship faster", "description": "A tool.",
    "category": "productivity", "tags": ["saas"],
    "pricing_tiers": [{"tier_name": "Pro", "price": 29, "period": "monthly", "features": []}],
})


class TestCheapScanner(unittest.IsolatedAsyncioTestCase):
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

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_successful_scan_populates_profile(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = ("<html>js.stripe.com page text</html>", None)
        mock_get_client.return_value = self._mock_llm_client(PROFILE_JSON)
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        self.assertEqual(self.app_row.name, "Acme")
        self.assertEqual(self.app_row.tagline, "Ship faster")
        self.assertIsNotNone(self.app_row.last_scanned_at)
        tiers = self.db.execute(select(AppPricing)).scalars().all()
        self.assertEqual(len(tiers), 1)
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertIn("stripe", techs)

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_uses_deepseek_model(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = ("page", None)
        client = self._mock_llm_client(PROFILE_JSON)
        mock_get_client.return_value = client
        await cheap_scan_app(self.app_row, self.db)
        model = client.chat.completions.create.call_args.kwargs["model"]
        self.assertEqual(model, "deepseek-v4-flash")

    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_fetch_failure_marks_scan_failed(self, mock_fetch):
        mock_fetch.return_value = ("", "boom")
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertFalse(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "scan_failed")

    @patch("app.discovery.scanner.llm.get_async_client")
    @patch("app.discovery.scanner.llm.ai_available", return_value=True)
    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_garbage_ai_output_still_records_tech(self, mock_fetch, mock_available, mock_get_client):
        mock_fetch.return_value = ("<script src='https://js.stripe.com/v3/'></script>", None)
        mock_get_client.return_value = self._mock_llm_client("not json")
        ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)  # degraded but not failed
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertIn("stripe", techs)

    def test_select_apps_for_scan_honors_daily_limit(self):
        for i in range(5):
            self.db.add(App(slug=f"a{i}", url=f"a{i}.io", name=f"a{i}", scan_status="pending"))
        self.db.commit()
        with patch.dict("os.environ", {"SEED_SCAN_DAILY_LIMIT": "3"}):
            batch = select_apps_for_scan(self.db)
        self.assertEqual(len(batch), 3)


if __name__ == "__main__":
    unittest.main()
