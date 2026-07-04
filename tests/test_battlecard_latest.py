"""GET /api/v1/battlecards/latest — pure cache read for the dashboard.

The returning-user dashboard shows the report the user already earned. It must
NEVER trigger a paid generation (that would be a per-page-view cost leak), so
this endpoint only ever reads battlecard_cache:

- returns the user's most-recently-generated AI card (competitor + payload incl.
  head_to_head), never calling a model, for BOTH full and read_only users;
- returns {card: null} when the user has no cached AI card;
- ignores heuristic (ai_generated=False) rows and other users' cards.
"""
import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, BattleCardCache


def _payload(summary):
    return {
        "executive_summary": summary,
        "what_changed": [],
        "weaknesses": ["w1"],
        "strategic_signals": ["s1"],
        "playbook": ["p1", "p2", "p3", "p4", "p5"],
        "head_to_head": {"you_win": ["edge"], "you_exposed": ["gap"], "plays": ["play"]},
    }


class TestBattlecardLatest(unittest.TestCase):
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

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _user(self, email="u@example.com", free_test_used=True):
        u = User(email=email, free_test_used=free_test_used)
        self.db.add(u)
        self.db.commit()
        self.db.refresh(u)
        return u

    def _comp(self, user, name):
        c = Competitor(user_id=user.id, url=f"https://{name}.com", name=name,
                       business_type="saas", active=True)
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return c

    def _cache(self, comp, summary, ai=True, age_min=0):
        self.db.add(BattleCardCache(
            competitor_id=comp.id,
            payload=json.dumps(_payload(summary)),
            ai_generated=ai,
            generated_at=datetime.utcnow() - timedelta(minutes=age_min),
        ))
        self.db.commit()

    def test_returns_latest_ai_card_no_paid_call(self):
        user = self._user()
        older = self._comp(user, "Older")
        newer = self._comp(user, "Newer")
        self._cache(older, "older summary", age_min=60)
        self._cache(newer, "newer summary", age_min=1)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.llm.get_sync_client") as get_client:
            resp = self.client.get("/api/v1/battlecards/latest", headers=auth)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIsNotNone(body["card"])
        self.assertEqual(body["card"]["competitor_name"], "Newer")
        self.assertEqual(body["card"]["executive_summary"], "newer summary")
        self.assertEqual(body["card"]["head_to_head"]["you_win"], ["edge"])
        get_client.assert_not_called()

    def test_null_when_no_ai_card(self):
        user = self._user()
        comp = self._comp(user, "Heuristic")
        self._cache(comp, "heuristic", ai=False)  # heuristic rows don't count
        auth = {"Authorization": f"Bearer {user.id}"}
        resp = self.client.get("/api/v1/battlecards/latest", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.json()["card"])

    def test_ignores_other_users_cards(self):
        me = self._user("me@example.com")
        other = self._user("other@example.com")
        other_comp = self._comp(other, "TheirRival")
        self._cache(other_comp, "not mine")
        auth = {"Authorization": f"Bearer {me.id}"}
        resp = self.client.get("/api/v1/battlecards/latest", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.json()["card"])


if __name__ == "__main__":
    unittest.main()
