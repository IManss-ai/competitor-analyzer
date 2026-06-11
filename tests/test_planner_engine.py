import json
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import (
    ActionPlan, ActionPlanItem, Campaign, ChangeEvent, Competitor,
    Review, ReviewSnapshot, Snapshot, User,
)
from app.planner.engine import get_or_generate_plan

AI_PLAN = json.dumps({
    "executive_read": "Acme is moving upmarket — attack self-serve.",
    "plays": [
        {"title": f"Play {i}", "body": f"Do thing {i}", "category": "pricing"}
        for i in range(1, 6)
    ],
})


class TestPlannerEngine(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="p@example.com")
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

    def _seed_pricing_event(self, detected_at=None):
        snap = Snapshot(competitor_id=self.comp.id, raw_text="x", char_count=1)
        self.db.add(snap)
        self.db.commit()
        self.db.add(ChangeEvent(
            competitor_id=self.comp.id, snapshot_before_id=snap.id, snapshot_after_id=snap.id,
            net_char_delta=300, change_type="pricing_change",
            brief_text="Raised Pro plan from $29 to $39",
            detected_at=detected_at or datetime.utcnow(),
        ))
        self.db.commit()

    def test_heuristic_plan_when_no_api_key(self):
        self._seed_pricing_event()
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "dummy_anthropic_key"}):
            plan = get_or_generate_plan(self.campaign, self.db)
        self.assertFalse(plan.ai_generated)
        self.assertTrue(plan.executive_read)
        items = self.db.execute(
            select(ActionPlanItem).where(ActionPlanItem.plan_id == plan.id).order_by(ActionPlanItem.rank)
        ).scalars().all()
        self.assertEqual(len(items), 5)
        self.assertEqual([i.rank for i in items], [1, 2, 3, 4, 5])
        joined = " ".join(i.title + " " + (i.body or "") for i in items).lower()
        self.assertIn("pric", joined)  # pricing event must shape the heuristic plan

    @patch("app.planner.engine.anthropic.Anthropic")
    def test_ai_plan_when_key_present(self, mock_cls):
        client = MagicMock()
        msg = MagicMock()
        msg.content = [MagicMock(text=AI_PLAN)]
        client.messages.create.return_value = msg
        mock_cls.return_value = client
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real"}):
            plan = get_or_generate_plan(self.campaign, self.db)
        self.assertTrue(plan.ai_generated)
        self.assertIn("upmarket", plan.executive_read)
        client.messages.create.assert_called_once()

    @patch("app.planner.engine.anthropic.Anthropic")
    def test_plan_is_cached_not_regenerated(self, mock_cls):
        client = MagicMock()
        msg = MagicMock()
        msg.content = [MagicMock(text=AI_PLAN)]
        client.messages.create.return_value = msg
        mock_cls.return_value = client
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real"}):
            first = get_or_generate_plan(self.campaign, self.db)
            second = get_or_generate_plan(self.campaign, self.db)
        self.assertEqual(first.id, second.id)
        client.messages.create.assert_called_once()  # one paid call for two views

    @patch("app.planner.engine.anthropic.Anthropic")
    def test_new_intel_triggers_regeneration(self, mock_cls):
        client = MagicMock()
        msg = MagicMock()
        msg.content = [MagicMock(text=AI_PLAN)]
        client.messages.create.return_value = msg
        mock_cls.return_value = client
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real"}):
            first = get_or_generate_plan(self.campaign, self.db)
            # new intel arrives strictly after the plan was generated
            self._seed_pricing_event(detected_at=datetime.utcnow() + timedelta(seconds=2))
            second = get_or_generate_plan(self.campaign, self.db)
        self.assertNotEqual(first.id, second.id)
        self.assertEqual(client.messages.create.call_count, 2)

    @patch("app.planner.engine.anthropic.Anthropic")
    def test_ai_failure_falls_back_to_heuristic(self, mock_cls):
        client = MagicMock()
        client.messages.create.side_effect = RuntimeError("api down")
        mock_cls.return_value = client
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real"}):
            plan = get_or_generate_plan(self.campaign, self.db)
        self.assertFalse(plan.ai_generated)
        items = self.db.execute(select(ActionPlanItem).where(ActionPlanItem.plan_id == plan.id)).scalars().all()
        self.assertEqual(len(items), 5)


if __name__ == "__main__":
    unittest.main()
