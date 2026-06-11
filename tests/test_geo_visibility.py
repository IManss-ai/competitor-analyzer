import os
import unittest
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import Campaign, Competitor, GeoSnapshot, ReviewSnapshot, User
from app.geo.visibility import get_or_check_visibility


class TestGeoVisibility(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="g@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.comp = Competitor(user_id=self.user.id, url="https://acme.io", name="Acme")
        self.db.add(self.comp)
        self.db.commit()
        self.campaign = Campaign(user_id=self.user.id, competitor_id=self.comp.id, name="Beat Acme")
        self.db.add(self.campaign)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_estimated_when_no_api_key(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "dummy_openai_key"}):
            snap = get_or_check_visibility(self.campaign, "MyProduct", self.db)
        self.assertEqual(snap.source, "estimated")
        self.assertTrue(0 <= snap.user_share <= 10)
        self.assertTrue(0 <= snap.competitor_share <= 10)

    def test_estimate_is_deterministic(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "dummy_openai_key"}):
            a = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
            b = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual((a.user_share, a.competitor_share), (b.user_share, b.competitor_share))

    def test_cached_snapshot_reused(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "dummy_openai_key"}):
            first = get_or_check_visibility(self.campaign, "MyProduct", self.db)
            second = get_or_check_visibility(self.campaign, "MyProduct", self.db)
        self.assertEqual(first.id, second.id)

    @patch("app.geo.visibility.OpenAI")
    def test_live_path_when_key_present(self, mock_cls):
        client = MagicMock()
        choice = MagicMock()
        choice.message.content = (
            "For this need I would recommend: 1. Acme — strong incumbent. 2. MyProduct — rising option. "
            "3. OtherTool. Acme is the most established; MyProduct is solid too. Acme wins for most."
        )
        client.chat.completions.create.return_value = MagicMock(choices=[choice])
        mock_cls.return_value = client
        with patch.dict(os.environ, {"OPENAI_API_KEY": "real"}):
            snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual(snap.source, "live")
        self.assertGreater(snap.competitor_share, 0)
        self.assertGreater(snap.user_share, 0)
        self.assertGreater(snap.competitor_share, snap.user_share)  # Acme mentioned more

    @patch("app.geo.visibility.OpenAI")
    def test_live_failure_falls_back_to_estimate(self, mock_cls):
        client = MagicMock()
        client.chat.completions.create.side_effect = RuntimeError("down")
        mock_cls.return_value = client
        with patch.dict(os.environ, {"OPENAI_API_KEY": "real"}):
            snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual(snap.source, "estimated")


if __name__ == "__main__":
    unittest.main()
