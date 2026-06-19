import unittest
import uuid as _uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app as fastapi_app
from app.db import Base, get_session
from app.models import ActionPlanItem, Campaign, Competitor, User


class TestCampaignsApi(unittest.TestCase):
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

        self.user = User(email="c@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.comp = Competitor(user_id=self.user.id, url="https://acme.io", name="Acme")
        self.db.add(self.comp)
        self.db.commit()
        self.auth = {"Authorization": f"Bearer {self.user.id}"}
        self.ai_unavailable = patch("app.llm.ai_available", return_value=False)
        self.ai_unavailable.start()

    def tearDown(self):
        self.ai_unavailable.stop()
        self.db.close()
        fastapi_app.dependency_overrides.clear()

    def _create_campaign(self):
        return self.client.post(
            "/api/v1/campaigns",
            json={"competitor_id": str(self.comp.id), "user_product": "MyProduct"},
            headers=self.auth,
        )

    def test_create_requires_auth(self):
        resp = self.client.post("/api/v1/campaigns", json={"competitor_id": str(self.comp.id)})
        self.assertEqual(resp.status_code, 401)

    def test_create_campaign(self):
        resp = self._create_campaign()
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["name"], "Beat Acme")
        self.assertTrue(body["created"])

    def test_create_twice_returns_existing(self):
        first = self._create_campaign().json()
        second = self._create_campaign().json()
        self.assertEqual(first["id"], second["id"])
        self.assertFalse(second["created"])

    def test_create_rejects_foreign_competitor(self):
        other = User(email="other@example.com")
        self.db.add(other)
        self.db.commit()
        resp = self.client.post(
            "/api/v1/campaigns",
            json={"competitor_id": str(self.comp.id)},
            headers={"Authorization": f"Bearer {other.id}"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_list_campaigns(self):
        self._create_campaign()
        resp = self.client.get("/api/v1/campaigns", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["campaigns"]), 1)
        self.assertEqual(resp.json()["campaigns"][0]["competitor_name"], "Acme")

    def test_war_room_payload(self):
        cid = self._create_campaign().json()["id"]
        resp = self.client.get(f"/api/v1/campaigns/{cid}", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["name"], "Beat Acme")
        self.assertEqual(len(body["plan"]["items"]), 5)
        self.assertIn("executive_read", body["plan"])
        self.assertFalse(body["plan"]["ai_generated"])  # dummy keys -> heuristic
        self.assertIn("geo", body)
        self.assertEqual(body["geo"]["source"], "estimated")
        self.assertIn("events", body)

    def test_war_room_requires_ownership(self):
        cid = self._create_campaign().json()["id"]
        other = User(email="o2@example.com")
        self.db.add(other)
        self.db.commit()
        resp = self.client.get(f"/api/v1/campaigns/{cid}", headers={"Authorization": f"Bearer {other.id}"})
        self.assertEqual(resp.status_code, 403)

    def test_item_status_update(self):
        cid = self._create_campaign().json()["id"]
        body = self.client.get(f"/api/v1/campaigns/{cid}", headers=self.auth).json()
        item_id = body["plan"]["items"][0]["id"]
        resp = self.client.post(
            f"/api/v1/plan-items/{item_id}/status", json={"status": "done"}, headers=self.auth,
        )
        self.assertEqual(resp.status_code, 200)
        item = self.db.execute(select(ActionPlanItem).where(ActionPlanItem.id == _uuid.UUID(item_id))).scalar_one()
        self.assertEqual(item.status, "done")

    def test_item_status_rejects_invalid(self):
        cid = self._create_campaign().json()["id"]
        body = self.client.get(f"/api/v1/campaigns/{cid}", headers=self.auth).json()
        item_id = body["plan"]["items"][0]["id"]
        resp = self.client.post(
            f"/api/v1/plan-items/{item_id}/status", json={"status": "nonsense"}, headers=self.auth,
        )
        self.assertEqual(resp.status_code, 400)

    def test_regenerate(self):
        cid = self._create_campaign().json()["id"]
        first = self.client.get(f"/api/v1/campaigns/{cid}", headers=self.auth).json()
        resp = self.client.post(f"/api/v1/campaigns/{cid}/regenerate", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        second = self.client.get(f"/api/v1/campaigns/{cid}", headers=self.auth).json()
        self.assertNotEqual(first["plan"]["id"], second["plan"]["id"])


if __name__ == "__main__":
    unittest.main()
