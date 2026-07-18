import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app as fastapi_app
from app.db import Base, get_session
from app.models import App, AppPricing, AppTech, Competitor, User


class TestDiscoveryApi(unittest.TestCase):
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

        fastapi_app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(fastapi_app, raise_server_exceptions=False)
        self.db = self.SessionLocal()

        self.user = User(email="d@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.app_row = App(slug="acme", url="acme.io", name="Acme",
                           tagline="Ship faster", category="productivity", scan_status="ok")
        self.db.add(self.app_row)
        self.db.commit()
        self.db.add(AppPricing(app_id=self.app_row.id, tier_name="Pro", price=29.0, period="monthly"))
        self.db.commit()
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        fastapi_app.dependency_overrides.clear()

    def test_search_is_public(self):
        resp = self.client.get("/api/v1/apps/search?q=acme")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["results"][0]["slug"], "acme")

    def test_search_sort_requires_auth(self):
        resp = self.client.get("/api/v1/apps/search?sort=newest")
        self.assertEqual(resp.status_code, 401)
        resp = self.client.get("/api/v1/apps/search?sort=newest", headers=self.auth)
        self.assertEqual(resp.status_code, 200)

    def test_search_page_size_respected(self):
        self.db.add(App(slug="beta", url="beta.io", name="Beta", scan_status="ok"))
        self.db.commit()
        resp = self.client.get("/api/v1/apps/search?page_size=1")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["results"]), 1)
        self.assertEqual(body["total"], 2)
        self.assertEqual(body["page_size"], 1)

    def test_search_page_size_clamped_to_max(self):
        resp = self.client.get("/api/v1/apps/search?page_size=500")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["page_size"], 50)  # search.MAX_PAGE_SIZE

    def test_facets_public_returns_categories_and_tech(self):
        self.db.add(AppTech(app_id=self.app_row.id, technology="stripe", tech_category="payments"))
        self.db.commit()
        resp = self.client.get("/api/v1/apps/facets")  # no auth header — public
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["categories"], [{"value": "productivity", "count": 1}])
        self.assertEqual(body["tech"], [{"value": "stripe", "count": 1}])

    def test_facets_exclude_scan_failed_apps(self):
        failed = App(slug="dead", url="dead.io", name="Dead",
                     category="productivity", scan_status="scan_failed")
        self.db.add(failed)
        self.db.commit()
        self.db.add(AppTech(app_id=failed.id, technology="react", tech_category="framework"))
        self.db.commit()
        body = self.client.get("/api/v1/apps/facets").json()
        self.assertEqual(body["categories"], [{"value": "productivity", "count": 1}])
        self.assertEqual(body["tech"], [])

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_facets_make_zero_paid_model_calls(self, _mock_avail, mock_get_client):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        self.client.get("/api/v1/apps/facets")
        mock_client.chat.completions.create.assert_not_called()

    def test_profile_returns_pricing(self):
        resp = self.client.get("/api/v1/apps/acme")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["name"], "Acme")
        self.assertEqual(body["pricing"][0]["price"], 29.0)
        self.assertIn("review_summary", body)
        self.assertIn("change_velocity_90d", body)

    def test_profile_unknown_slug_404(self):
        self.assertEqual(self.client.get("/api/v1/apps/nope").status_code, 404)

    def test_track_requires_auth(self):
        self.assertEqual(self.client.post("/api/v1/apps/acme/track").status_code, 401)

    def test_track_creates_linked_competitor_and_promotes_tier(self):
        resp = self.client.post("/api/v1/apps/acme/track", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        comp = self.db.execute(select(Competitor).where(Competitor.user_id == self.user.id)).scalar_one()
        self.assertEqual(comp.app_id, self.app_row.id)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_tier, "full")

    def test_track_twice_does_not_duplicate(self):
        self.client.post("/api/v1/apps/acme/track", headers=self.auth)
        resp = self.client.post("/api/v1/apps/acme/track", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        comps = self.db.execute(select(Competitor).where(Competitor.user_id == self.user.id)).scalars().all()
        self.assertEqual(len(comps), 1)

    def test_sitemap_lists_slugs(self):
        resp = self.client.get("/api/v1/apps-sitemap")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["apps"][0]["slug"], "acme")

    @patch("app.llm.get_sync_client")
    @patch("app.llm.ai_available", return_value=True)
    def test_public_discovery_makes_zero_paid_model_calls(self, _mock_avail, mock_get_client):
        """Cost regression — same class of bug as the June 2026 credit drain."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        self.client.get("/api/v1/apps/search?q=acme")
        self.client.get("/api/v1/apps/acme")
        self.client.get("/api/v1/apps-sitemap")
        mock_client.chat.completions.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
