"""Audit 2026-07-21 finding C: fabricated provenance in GEO visibility.

The live check calls DeepSeek (llm.MODEL) but the persisted GeoSnapshot said
engine="chatgpt" — telling users their AI-visibility share was measured on
ChatGPT when no OpenAI call ever happened. New snapshots now record the honest
engine "deepseek"; old persisted "chatgpt" rows are served unchanged.
"""
import unittest
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import Campaign, Competitor, User
from app.geo.visibility import get_or_check_visibility


class TestGeoEngineProvenance(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="geo@example.com")
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

    @patch("app.geo.visibility.llm.ai_available", return_value=True)
    @patch("app.geo.visibility.client.chat.completions.create")
    def test_live_snapshot_records_deepseek_not_chatgpt(self, mock_create, _avail):
        choice = MagicMock()
        choice.message.content = "I recommend Acme first, then MyProduct as an alternative."
        mock_create.return_value = MagicMock(choices=[choice])
        snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual(snap.source, "live")
        # The call went to DeepSeek (llm.MODEL) — the engine label must say so.
        self.assertEqual(snap.engine, "deepseek")
        self.assertNotEqual(snap.engine, "chatgpt")

    def test_estimated_snapshot_engine_unchanged(self):
        with patch("app.llm.ai_available", return_value=False):
            snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual(snap.engine, "estimated")
        self.assertEqual(snap.source, "estimated")


if __name__ == "__main__":
    unittest.main()
