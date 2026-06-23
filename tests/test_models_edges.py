import unittest
from datetime import datetime, timedelta

from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import (
    App,
    AppTech,
    BattleCardCache,
    Campaign,
    Competitor,
    GeoSnapshot,
    JobSnapshot,
    Review,
    Snapshot,
    User,
)


class TestModelEdges(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()

    def _user(self, email):
        u = User(email=email)
        self.db.add(u)
        self.db.commit()
        return u

    def _competitor(self, user, url="x.io"):
        c = Competitor(user_id=user.id, url=url)
        self.db.add(c)
        self.db.commit()
        return c

    # ---- defaults ----

    def test_user_defaults_applied_on_flush(self):
        user = self._user("defaults@example.com")
        self.db.refresh(user)
        self.assertEqual(user.subscription_status, "trialing")
        self.assertEqual(user.business_type, "saas")
        self.assertEqual(user.scan_schedule, "weekly")
        self.assertTrue(user.email_notifications)
        self.assertIsNone(user.password_hash)
        self.assertIsNone(user.digest_email)

    def test_user_trial_window_is_two_days(self):
        before = datetime.utcnow()
        user = self._user("trial@example.com")
        after = datetime.utcnow()
        self.db.refresh(user)
        self.assertIsNotNone(user.trial_ends_at)
        self.assertGreaterEqual(
            user.trial_ends_at, before + timedelta(days=2) - timedelta(seconds=5)
        )
        self.assertLessEqual(
            user.trial_ends_at, after + timedelta(days=2) + timedelta(seconds=5)
        )

    def test_battlecard_cache_ai_generated_defaults_false(self):
        user = self._user("bc@example.com")
        comp = self._competitor(user)
        card = BattleCardCache(competitor_id=comp.id, payload="{}")
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        self.assertFalse(card.ai_generated)
        self.assertIsNotNone(card.generated_at)

    def test_geo_snapshot_share_defaults_zero(self):
        user = self._user("geo@example.com")
        comp = self._competitor(user, "g.io")
        camp = Campaign(user_id=user.id, competitor_id=comp.id, name="Beat G")
        self.db.add(camp)
        self.db.commit()
        snap = GeoSnapshot(campaign_id=camp.id, engine="perplexity")
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        self.assertEqual(snap.user_share, 0)
        self.assertEqual(snap.competitor_share, 0)
        self.assertEqual(snap.source, "estimated")

    def test_job_snapshot_counts_default_zero(self):
        user = self._user("job@example.com")
        comp = self._competitor(user, "j.io")
        snap = JobSnapshot(competitor_id=comp.id)
        self.db.add(snap)
        self.db.commit()
        self.db.refresh(snap)
        self.assertEqual(snap.total_jobs, 0)
        self.assertEqual(snap.new_postings, 0)
        self.assertEqual(snap.closed_postings, 0)
        self.assertIsNone(snap.strategic_signal)

    def test_campaign_status_defaults_active(self):
        user = self._user("camp@example.com")
        comp = self._competitor(user, "c.io")
        camp = Campaign(user_id=user.id, competitor_id=comp.id, name="Beat C")
        self.db.add(camp)
        self.db.commit()
        self.db.refresh(camp)
        self.assertEqual(camp.status, "active")
        self.assertIsNone(camp.user_product)

    def test_review_is_complaint_defaults_false(self):
        user = self._user("rev@example.com")
        comp = self._competitor(user, "r.io")
        review = Review(
            competitor_id=comp.id, platform="g2", review_id="abc123", body="meh"
        )
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        self.assertFalse(review.is_complaint)
        self.assertIsNone(review.sentiment)
        self.assertIsNone(review.rating)

    # ---- NOT NULL constraints ----

    def test_user_email_required(self):
        self.db.add(User())
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_snapshot_raw_text_required(self):
        user = self._user("snap@example.com")
        comp = self._competitor(user, "s.io")
        self.db.add(Snapshot(competitor_id=comp.id, char_count=10))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_competitor_url_required(self):
        user = self._user("comp@example.com")
        self.db.add(Competitor(user_id=user.id))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    # ---- UNIQUE constraints ----

    def test_user_email_unique(self):
        self.db.add(User(email="dup@example.com"))
        self.db.commit()
        self.db.add(User(email="dup@example.com"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_app_slug_unique(self):
        self.db.add(App(slug="same", url="a.io", name="A"))
        self.db.commit()
        self.db.add(App(slug="same", url="b.io", name="B"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_app_url_unique(self):
        self.db.add(App(slug="one", url="dup.io", name="One"))
        self.db.commit()
        self.db.add(App(slug="two", url="dup.io", name="Two"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_battlecard_cache_competitor_unique(self):
        user = self._user("bcu@example.com")
        comp = self._competitor(user, "bcu.io")
        self.db.add(BattleCardCache(competitor_id=comp.id, payload="{}"))
        self.db.commit()
        self.db.add(BattleCardCache(competitor_id=comp.id, payload="{}"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_app_tech_composite_unique(self):
        app = App(slug="techy", url="techy.io", name="Techy")
        self.db.add(app)
        self.db.commit()
        self.db.add(AppTech(app_id=app.id, technology="nextjs"))
        self.db.commit()
        self.db.add(AppTech(app_id=app.id, technology="nextjs"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_app_tech_same_tech_different_app_ok(self):
        a1 = App(slug="a1", url="a1.io", name="A1")
        a2 = App(slug="a2", url="a2.io", name="A2")
        self.db.add_all([a1, a2])
        self.db.commit()
        self.db.add_all([
            AppTech(app_id=a1.id, technology="stripe"),
            AppTech(app_id=a2.id, technology="stripe"),
        ])
        self.db.commit()
        rows = self.db.execute(
            select(AppTech).where(AppTech.technology == "stripe")
        ).scalars().all()
        self.assertEqual(len(rows), 2)


if __name__ == "__main__":
    unittest.main()
