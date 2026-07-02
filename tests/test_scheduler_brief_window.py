"""Weekly-brief windowing and noise filtering (review findings 9 and 10).

- Classifier-suppressed events (minor_copy / no_change) and initial_scan
  baselines must not appear in the brief email.
- Biweekly-schedule users get BOTH the Monday and Thursday briefs; a fixed
  now-7d lookback on each mailed every event twice. The window must be
  since-the-previous-brief: Mon covers Thu->Mon (4d), Thu covers Mon->Thu (3d).
"""
import unittest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, Snapshot, ChangeEvent
from app.scheduler import _scan_and_brief_user, _brief_window_days


def _utc_naive(days_ago: float) -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days_ago)


class TestBriefWindowDays(unittest.TestCase):
    def test_weekly_user_monday_gets_7(self):
        user = User(email="w@x.com", scan_schedule="weekly")
        self.assertEqual(_brief_window_days("weekly", user), 7)

    def test_biweekly_user_monday_gets_4(self):
        user = User(email="b@x.com", scan_schedule="biweekly")
        self.assertEqual(_brief_window_days("weekly", user), 4)

    def test_midweek_run_gets_3(self):
        user = User(email="b@x.com", scan_schedule="biweekly")
        self.assertEqual(_brief_window_days("midweek", user), 3)


class TestBriefEventSelection(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.user = User(email="brief@test.com", subscription_status="active")
        self.db.add(self.user)
        self.db.commit()
        self.comp = Competitor(user_id=self.user.id, name="Rival", url="https://rival.com", active=False)
        self.db.add(self.comp)
        self.db.commit()
        snap = Snapshot(competitor_id=self.comp.id, raw_text="x", char_count=1)
        self.db.add(snap)
        self.db.commit()
        self.snap_id = snap.id

    def tearDown(self):
        self.db.close()

    def _event(self, change_type: str, days_ago: float, brief: str):
        ev = ChangeEvent(
            competitor_id=self.comp.id,
            net_char_delta=200,
            change_type=change_type,
            brief_text=brief,
            snapshot_before_id=self.snap_id,
            snapshot_after_id=self.snap_id,
            detected_at=_utc_naive(days_ago),
        )
        self.db.add(ev)
        self.db.commit()

    async def _run(self, lookback_days):
        with patch("app.scheduler.scan_user_competitors", new=AsyncMock()), \
             patch("app.scheduler.send_weekly_brief", new=AsyncMock()) as mock_send:
            await _scan_and_brief_user(self.user, self.db, lookback_days=lookback_days)
        _, kwargs = mock_send.call_args
        return kwargs["change_summaries"]

    async def test_noise_events_excluded_from_brief(self):
        self._event("pricing_change", 2, "raised prices")
        self._event("minor_copy", 1, "reworded hero")
        self._event("no_change", 1, "nothing")
        self._event("initial_scan", 1, "baseline")
        summaries = await self._run(7)
        briefs = [s["brief_text"] for s in summaries]
        self.assertEqual(briefs, ["raised prices"])

    async def test_lookback_window_bounds_events(self):
        self._event("pricing_change", 2, "recent")
        self._event("feature_add", 6, "older")
        self._event("repositioning", 8, "ancient")
        self.assertEqual(
            sorted(s["brief_text"] for s in await self._run(7)),
            ["older", "recent"],
        )
        self.assertEqual(
            [s["brief_text"] for s in await self._run(4)],
            ["recent"],
        )


if __name__ == "__main__":
    unittest.main()
