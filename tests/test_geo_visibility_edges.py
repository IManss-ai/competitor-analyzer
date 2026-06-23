import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import Campaign, Competitor, GeoSnapshot, ReviewSnapshot, User
from app.geo.visibility import (
    get_or_check_visibility,
    _count_mentions,
    _stable_int,
    _estimate,
)


class TestPureHelpers(unittest.TestCase):
    def test_count_mentions_empty_name_returns_zero(self):
        self.assertEqual(_count_mentions("Acme Acme Acme", ""), 0)

    def test_count_mentions_case_insensitive(self):
        self.assertEqual(_count_mentions("acme ACME Acme", "Acme"), 3)

    def test_count_mentions_escapes_regex_metacharacters(self):
        # A name with regex specials must be matched literally, not as a pattern.
        self.assertEqual(_count_mentions("we love C++ and C++", "C++"), 2)
        self.assertEqual(_count_mentions("a.b a.b axb", "a.b"), 2)

    def test_count_mentions_no_match(self):
        self.assertEqual(_count_mentions("nothing here", "Acme"), 0)

    def test_stable_int_within_bounds_and_deterministic(self):
        for seed in ["1", "abc", "long-seed-value", ""]:
            v1 = _stable_int(seed, 4, 7)
            v2 = _stable_int(seed, 4, 7)
            self.assertEqual(v1, v2)
            self.assertTrue(4 <= v1 <= 7)

    def test_stable_int_single_value_range(self):
        # lo == hi -> only one possible value, no modulo-by-zero.
        self.assertEqual(_stable_int("anything", 5, 5), 5)


class TestGeoVisibilityEdges(unittest.TestCase):
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

    def test_estimate_scales_with_review_footprint(self):
        # 100 reviews -> 4 + 100//50 = 6 competitor share.
        self.db.add(ReviewSnapshot(
            competitor_id=self.comp.id,
            platform="g2",
            total_reviews=100,
            snapshot_at=datetime.utcnow(),
        ))
        self.db.commit()
        user_share, competitor_share = _estimate(self.campaign, "MyProduct", self.db)
        self.assertEqual(competitor_share, 6)
        self.assertTrue(0 <= user_share <= 2)

    def test_estimate_caps_competitor_share_at_nine(self):
        # 5000 reviews would give 4+100=104; must cap at 9.
        self.db.add(ReviewSnapshot(
            competitor_id=self.comp.id,
            platform="g2",
            total_reviews=5000,
            snapshot_at=datetime.utcnow(),
        ))
        self.db.commit()
        _, competitor_share = _estimate(self.campaign, "MyProduct", self.db)
        self.assertEqual(competitor_share, 9)

    def test_estimate_uses_latest_review_snapshot(self):
        # Older snapshot with big footprint, newer with small footprint -> newer wins.
        self.db.add(ReviewSnapshot(
            competitor_id=self.comp.id,
            platform="g2",
            total_reviews=5000,
            snapshot_at=datetime.utcnow() - timedelta(days=2),
        ))
        self.db.add(ReviewSnapshot(
            competitor_id=self.comp.id,
            platform="g2",
            total_reviews=100,
            snapshot_at=datetime.utcnow(),
        ))
        self.db.commit()
        _, competitor_share = _estimate(self.campaign, "MyProduct", self.db)
        self.assertEqual(competitor_share, 6)

    def test_estimate_zero_total_reviews_falls_to_stable_int(self):
        # total_reviews falsy (0) -> deterministic stable fallback 4..7.
        self.db.add(ReviewSnapshot(
            competitor_id=self.comp.id,
            platform="g2",
            total_reviews=0,
            snapshot_at=datetime.utcnow(),
        ))
        self.db.commit()
        _, competitor_share = _estimate(self.campaign, "MyProduct", self.db)
        self.assertTrue(4 <= competitor_share <= 7)

    @patch("app.geo.visibility.llm.ai_available", return_value=True)
    @patch("app.geo.visibility.client.chat.completions.create")
    def test_live_zero_mentions_returns_zero_zero_live(self, mock_create, _avail):
        choice = MagicMock()
        choice.message.content = "I cannot recommend any specific tools right now."
        mock_create.return_value = MagicMock(choices=[choice])
        snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        # total==0 path: still a live source, both shares zero.
        self.assertEqual(snap.source, "live")
        self.assertEqual(snap.user_share, 0)
        self.assertEqual(snap.competitor_share, 0)

    @patch("app.geo.visibility.llm.ai_available", return_value=True)
    @patch("app.geo.visibility.client.chat.completions.create")
    def test_live_none_content_treated_as_empty(self, mock_create, _avail):
        choice = MagicMock()
        choice.message.content = None
        mock_create.return_value = MagicMock(choices=[choice])
        snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual(snap.source, "live")
        self.assertEqual(snap.user_share, 0)
        self.assertEqual(snap.competitor_share, 0)

    @patch("app.geo.visibility.llm.ai_available", return_value=True)
    @patch("app.geo.visibility.client.chat.completions.create")
    def test_live_shares_sum_to_ten_when_both_mentioned(self, mock_create, _avail):
        choice = MagicMock()
        # 3 Acme, 1 MyProduct -> round(10*1/4)=2 (user), round(10*3/4)=8 (comp).
        choice.message.content = "Acme Acme Acme and also MyProduct once."
        mock_create.return_value = MagicMock(choices=[choice])
        snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertEqual(snap.user_share, 2)
        self.assertEqual(snap.competitor_share, 8)

    @patch("app.geo.visibility._live_check")
    def test_competitor_name_falls_back_to_url(self, mock_live):
        # When name is None, competitor_name passed to _live_check must be the URL.
        nameless = Competitor(user_id=self.user.id, url="https://noname.io", name=None)
        self.db.add(nameless)
        self.db.commit()
        camp = Campaign(user_id=self.user.id, competitor_id=nameless.id, name="C2")
        self.db.add(camp)
        self.db.commit()
        mock_live.return_value = (1, 5)
        snap = get_or_check_visibility(camp, "MyProduct", self.db, force=True)
        self.assertEqual(snap.source, "live")
        # Second positional arg is competitor_name.
        called_name = mock_live.call_args.args[1]
        self.assertEqual(called_name, "https://noname.io")

    @patch("app.geo.visibility._live_check")
    def test_expired_cache_triggers_recheck(self, mock_live):
        mock_live.return_value = None  # force estimate path, no network
        stale = GeoSnapshot(
            campaign_id=self.campaign.id,
            engine="estimated",
            user_share=1,
            competitor_share=5,
            source="estimated",
            checked_at=datetime.utcnow() - (timedelta(days=7) + timedelta(seconds=1)),
        )
        self.db.add(stale)
        self.db.commit()
        snap = get_or_check_visibility(self.campaign, "MyProduct", self.db)
        # A new snapshot was created, not the stale one reused.
        self.assertNotEqual(snap.id, stale.id)
        mock_live.assert_called_once()

    @patch("app.geo.visibility._live_check")
    def test_force_bypasses_fresh_cache(self, mock_live):
        mock_live.return_value = None
        fresh = GeoSnapshot(
            campaign_id=self.campaign.id,
            engine="estimated",
            user_share=1,
            competitor_share=5,
            source="estimated",
            checked_at=datetime.utcnow(),
        )
        self.db.add(fresh)
        self.db.commit()
        snap = get_or_check_visibility(self.campaign, "MyProduct", self.db, force=True)
        self.assertNotEqual(snap.id, fresh.id)
        mock_live.assert_called_once()

if __name__ == "__main__":
    unittest.main()
