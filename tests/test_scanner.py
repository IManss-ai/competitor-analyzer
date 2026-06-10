import unittest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.pipeline.scanner import scan_competitor, scan_user_competitors

class TestScanner(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Use an in-memory SQLite database for testing the scanner
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()
        
        # Create a test user
        self.user = User(email="test@example.com")
        self.db.add(self.user)
        self.db.commit()
        
        # Create a test competitor
        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://example.com/competitor",
            name="Competitor 1"
        )
        self.db.add(self.competitor)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_competitor_first_scan(self, mock_fetch, mock_profile):
        # Mock successful fetch with raw text
        long_text = "A" * 250
        mock_fetch.return_value = (long_text, None)
        mock_profile.return_value = "Now tracking Competitor 1. They sell project management software."

        result = await scan_competitor(str(self.competitor.id), self.db)

        self.assertTrue(result.get("first_scan"))

        # Check snapshot is created
        snapshots = self.db.query(Snapshot).all()
        self.assertEqual(len(snapshots), 1)
        self.assertEqual(snapshots[0].raw_text, long_text)

        # First scan must surface an "initial_scan" intel event so the dashboard
        # Intel Feed is populated immediately on first add (not empty).
        events = self.db.query(ChangeEvent).all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].change_type, "initial_scan")
        self.assertEqual(events[0].brief_text, "Now tracking Competitor 1. They sell project management software.")
        self.assertEqual(events[0].snapshot_before_id, snapshots[0].id)
        self.assertEqual(events[0].snapshot_after_id, snapshots[0].id)
        mock_profile.assert_called_once()

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.generate_actions_for_change")
    @patch("app.pipeline.scanner.synthesize_brief")
    @patch("app.pipeline.scanner.classify_change")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_competitor_subsequent_scans(self, mock_fetch, mock_classify, mock_synthesize, mock_actions, mock_profile):
        mock_profile.return_value = "Now tracking Competitor 1."
        # First scan
        mock_fetch.return_value = ("A" * 250, None)
        await scan_competitor(str(self.competitor.id), self.db)
        
        # Second scan (no meaningful change, same length)
        mock_fetch.return_value = ("A" * 250, None)
        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertFalse(res.get("change_detected"))
        
        # Third scan (meaningful change, length + 110 chars)
        mock_fetch.return_value = ("A" * 360, None)
        mock_classify.return_value = "pricing_change"
        mock_synthesize.return_value = "Competitor updated pricing terms."
        mock_actions.return_value = [
            ("retention_email", "Mock email content"),
            ("pricing_copy", "Mock copy content"),
        ]
        
        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertTrue(res.get("change_detected"))
        self.assertEqual(res.get("net_delta"), 110)
        
        # Check change event is created (excluding the first-scan initial_scan event)
        events = self.db.query(ChangeEvent).filter(ChangeEvent.change_type != "initial_scan").all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].net_char_delta, 110)
        self.assertEqual(events[0].change_type, "pricing_change")
        self.assertEqual(events[0].brief_text, "Competitor updated pricing terms.")
        
        # Check ApprovedAction rows are created
        actions = self.db.query(ApprovedAction).all()
        self.assertEqual(len(actions), 2)
        self.assertEqual(actions[0].action_type, "retention_email")
        self.assertEqual(actions[0].original_draft, "Mock email content")
        self.assertIsNone(actions[0].edited_text)
        self.assertIsNone(actions[0].approved_at)

        self.assertEqual(actions[1].action_type, "pricing_copy")
        self.assertEqual(actions[1].original_draft, "Mock copy content")
        self.assertIsNone(actions[1].edited_text)
        self.assertIsNone(actions[1].approved_at)
        
        mock_classify.assert_called_once()
        mock_synthesize.assert_called_once()
        mock_actions.assert_called_once()

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.generate_actions_for_change")
    @patch("app.pipeline.scanner.synthesize_brief")
    @patch("app.pipeline.scanner.classify_change")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_competitor_minor_copy(self, mock_fetch, mock_classify, mock_synthesize, mock_actions, mock_profile):
        mock_profile.return_value = "Now tracking Competitor 1."
        # First scan
        mock_fetch.return_value = ("A" * 250, None)
        await scan_competitor(str(self.competitor.id), self.db)

        # Second scan (meaningful change > 100 chars, but classified as minor_copy)
        mock_fetch.return_value = ("A" * 360, None)
        mock_classify.return_value = "minor_copy"

        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertTrue(res.get("change_detected"))

        # Check event (excluding the first-scan initial_scan event)
        events = self.db.query(ChangeEvent).filter(ChangeEvent.change_type != "initial_scan").all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].change_type, "minor_copy")
        self.assertIsNone(events[0].brief_text)
        
        # Check no actions were created
        actions = self.db.query(ApprovedAction).all()
        self.assertEqual(len(actions), 0)
        
        mock_synthesize.assert_not_called()
        mock_actions.assert_not_called()

    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_competitor_error(self, mock_fetch):
        mock_fetch.return_value = ("", "HTTP 404: Not Found")

        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertEqual(res.get("error"), "HTTP 404: Not Found")

        # Verify snapshot exists with error
        snapshots = self.db.query(Snapshot).all()
        self.assertEqual(len(snapshots), 1)
        self.assertEqual(snapshots[0].fetch_error, "HTTP 404: Not Found")

        # Even when the first scrape fails, the user must see *something* in the feed
        # instead of a silently empty Intel Feed after adding the competitor.
        events = self.db.query(ChangeEvent).all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].change_type, "initial_scan")
        self.assertIn("Now tracking", events[0].brief_text)

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_backfills_initial_event_for_eventless_competitor(self, mock_fetch, mock_profile):
        # Simulate a competitor added before initial profiles existed: it has a prior
        # snapshot but zero events. A re-scan with no meaningful change must backfill
        # the initial_scan profile so its Intel Feed stops being empty.
        from app.models import Snapshot as Snap
        self.db.add(Snap(competitor_id=self.competitor.id, raw_text="A" * 250, char_count=250))
        self.db.commit()
        self.assertEqual(self.db.query(ChangeEvent).count(), 0)

        mock_fetch.return_value = ("A" * 250, None)  # identical content => no diff
        mock_profile.return_value = "Now tracking Competitor 1. They do X."

        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertFalse(res.get("change_detected"))

        events = self.db.query(ChangeEvent).filter(ChangeEvent.change_type == "initial_scan").all()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].brief_text, "Now tracking Competitor 1. They do X.")
        mock_profile.assert_called_once()

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_backfill_runs_only_once(self, mock_fetch, mock_profile):
        # Once a competitor has an initial event, later unchanged scans must NOT keep
        # adding duplicate initial_scan events.
        mock_fetch.return_value = ("A" * 250, None)
        mock_profile.return_value = "Now tracking Competitor 1."
        await scan_competitor(str(self.competitor.id), self.db)  # creates initial
        await scan_competitor(str(self.competitor.id), self.db)  # unchanged => no new event
        await scan_competitor(str(self.competitor.id), self.db)  # unchanged => no new event
        self.assertEqual(
            self.db.query(ChangeEvent).filter(ChangeEvent.change_type == "initial_scan").count(), 1
        )

if __name__ == '__main__':
    unittest.main()
