"""Audit 2026-07-21 finding A: /trends/metrics type_breakdown queried change
types the classifier never writes ("new_feature"/"positioning_shift"), so the
feature and positioning series were permanently zero. The endpoint now counts
the real classifier values ("feature_add"/"repositioning" — see
app/pipeline/classifier.py VALID_CATEGORIES) while keeping the RESPONSE keys
"new_feature"/"positioning_shift" that the frontend chart
(trends-type-breakdown.tsx) consumes as dataKeys.
"""
import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent


def _current_week_label() -> str:
    iso = datetime.now(timezone.utc).isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


class TestTrendsTypeBreakdown(unittest.TestCase):
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

    def _seed(self):
        user = User(email="trends@example.com", free_test_used=False)
        self.db.add(user)
        self.db.commit()
        comp = Competitor(user_id=user.id, url="https://rival.example.com", name="Rival", active=True)
        self.db.add(comp)
        self.db.commit()
        before = Snapshot(competitor_id=comp.id, raw_text="old", char_count=3)
        after = Snapshot(competitor_id=comp.id, raw_text="new copy", char_count=8)
        self.db.add_all([before, after])
        self.db.commit()
        week = _current_week_label()
        for change_type in ("pricing_change", "feature_add", "repositioning", "minor_copy"):
            self.db.add(ChangeEvent(
                competitor_id=comp.id,
                snapshot_before_id=before.id,
                snapshot_after_id=after.id,
                net_char_delta=120,
                change_type=change_type,
                brief_text=f"{change_type} happened",
                week_label=week,
            ))
        self.db.commit()
        return user, week

    def test_classifier_categories_populate_breakdown(self):
        user, week = self._seed()
        resp = self.client.get(
            "/api/v1/trends/metrics", headers={"Authorization": f"Bearer {user.id}"}
        )
        self.assertEqual(resp.status_code, 200)
        breakdown = resp.json()["type_breakdown"]
        this_week = next(row for row in breakdown if row["week"] == week)
        # Response keys are the frontend contract — unchanged.
        self.assertEqual(this_week["pricing_change"], 1)
        self.assertEqual(this_week["new_feature"], 1)        # counts "feature_add"
        self.assertEqual(this_week["positioning_shift"], 1)  # counts "repositioning"
        self.assertEqual(this_week["minor_copy"], 1)


if __name__ == "__main__":
    unittest.main()
