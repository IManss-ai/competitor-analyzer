import unittest
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor
from app.pipeline.job_tracker import _normalize_homepage, probe_careers_url


class TestNormalizeHomepage(unittest.TestCase):
    def test_strips_path(self):
        self.assertEqual(_normalize_homepage("https://example.com/some/path"), "https://example.com")

    def test_adds_https_when_missing(self):
        self.assertEqual(_normalize_homepage("example.com"), "https://example.com")

    def test_preserves_subdomain(self):
        self.assertEqual(_normalize_homepage("https://www.example.com/x"), "https://www.example.com")

    def test_empty_input_returns_empty(self):
        self.assertEqual(_normalize_homepage(""), "")


class TestProbeCareersUrl(unittest.IsolatedAsyncioTestCase):
    def _resp(self, status=200, body=""):
        m = MagicMock()
        m.status_code = status
        m.text = body
        m.url = ""
        return m

    @patch("app.pipeline.job_tracker.httpx.AsyncClient")
    async def test_returns_first_path_that_200s_with_keyword(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client

        def fake_get(url):
            r = self._resp(status=404, body="")
            if url.endswith("/careers"):
                r = self._resp(status=200, body="We are hiring! Open positions below.")
                r.url = url
            return r

        mock_client.get = AsyncMock(side_effect=fake_get)
        result = await probe_careers_url("https://acme.com")
        self.assertEqual(result, "https://acme.com/careers")

    @patch("app.pipeline.job_tracker.httpx.AsyncClient")
    async def test_returns_none_when_all_404(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client.get = AsyncMock(return_value=self._resp(status=404, body=""))
        result = await probe_careers_url("https://acme.com")
        self.assertIsNone(result)

    @patch("app.pipeline.job_tracker.httpx.AsyncClient")
    async def test_returns_none_when_200_but_no_keywords(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client.get = AsyncMock(return_value=self._resp(status=200, body="Welcome to our marketing landing page."))
        result = await probe_careers_url("https://acme.com")
        self.assertIsNone(result)

    @patch("app.pipeline.job_tracker.httpx.AsyncClient")
    async def test_returns_none_for_empty_homepage(self, mock_client_class):
        result = await probe_careers_url("")
        self.assertIsNone(result)
        mock_client_class.assert_not_called()

    @patch("app.pipeline.job_tracker.httpx.AsyncClient")
    async def test_prefers_earlier_paths(self, mock_client_class):
        mock_client = MagicMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client

        def fake_get(url):
            # Both /careers and /jobs would match; the first one tried (/careers) should win
            if url.endswith("/careers") or url.endswith("/jobs"):
                r = self._resp(status=200, body="Apply now to open roles")
                r.url = url
                return r
            return self._resp(status=404)

        mock_client.get = AsyncMock(side_effect=fake_get)
        result = await probe_careers_url("https://acme.com")
        self.assertEqual(result, "https://acme.com/careers")


class TestProbeCareersEndpoint(unittest.TestCase):
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
        self.user = User(email="probe@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://acme.com",
            name="Acme",
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

    @patch("app.pipeline.job_tracker.probe_careers_url", new_callable=AsyncMock)
    def test_endpoint_saves_detected_url(self, mock_probe):
        mock_probe.return_value = "https://acme.com/careers"
        resp = self.client.post(
            f"/api/v1/competitors/{self.competitor.id}/probe-careers",
            headers=self.auth,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["found"])
        self.assertEqual(data["careers_url"], "https://acme.com/careers")
        self.db.refresh(self.competitor)
        self.assertEqual(self.competitor.careers_url, "https://acme.com/careers")

    @patch("app.pipeline.job_tracker.probe_careers_url", new_callable=AsyncMock)
    def test_endpoint_returns_not_found_without_mutating(self, mock_probe):
        mock_probe.return_value = None
        resp = self.client.post(
            f"/api/v1/competitors/{self.competitor.id}/probe-careers",
            headers=self.auth,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["found"])
        self.assertIsNone(data["careers_url"])
        self.db.refresh(self.competitor)
        self.assertIsNone(self.competitor.careers_url)

    def test_endpoint_requires_auth(self):
        resp = self.client.post(f"/api/v1/competitors/{self.competitor.id}/probe-careers")
        self.assertEqual(resp.status_code, 401)

    def test_endpoint_404s_for_unknown_competitor(self):
        import uuid
        resp = self.client.post(
            f"/api/v1/competitors/{uuid.uuid4()}/probe-careers",
            headers=self.auth,
        )
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
