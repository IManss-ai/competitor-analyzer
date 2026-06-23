import unittest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.pipeline.scanner import scan_competitor, scan_user_competitors


class TestScannerEdges(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()

        self.user = User(email="edge@example.com")
        self.db.add(self.user)
        self.db.commit()

        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://example.com/competitor",
            name="Competitor 1",
        )
        self.db.add(self.competitor)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    # --- guard clause: missing / inactive competitor ---

    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_inactive_competitor_is_skipped(self, mock_fetch):
        self.competitor.active = False
        self.db.commit()

        res = await scan_competitor(str(self.competitor.id), self.db)

        self.assertTrue(res.get("skipped"))
        # No fetch, snapshot, or event should be produced for an inactive competitor.
        mock_fetch.assert_not_called()
        self.assertEqual(self.db.query(Snapshot).count(), 0)
        self.assertEqual(self.db.query(ChangeEvent).count(), 0)

    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_nonexistent_competitor_is_skipped(self, mock_fetch):
        import uuid
        missing = str(uuid.uuid4())

        res = await scan_competitor(missing, self.db)

        self.assertTrue(res.get("skipped"))
        self.assertEqual(res.get("competitor_id"), missing)
        mock_fetch.assert_not_called()

    # --- competitor_id may be passed as a UUID object, not just a str ---

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_accepts_uuid_object_identifier(self, mock_fetch, mock_profile):
        mock_fetch.return_value = ("A" * 250, None)
        mock_profile.return_value = "Now tracking Competitor 1."

        # Pass the actual UUID object (the cron path may pass non-strings).
        res = await scan_competitor(self.competitor.id, self.db)

        self.assertTrue(res.get("first_scan"))
        self.assertEqual(res.get("competitor_id"), str(self.competitor.id))
        self.assertEqual(self.db.query(Snapshot).count(), 1)

    # --- error path when competitor ALREADY has events ---

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_error_with_existing_events_does_not_backfill(self, mock_fetch, mock_profile):
        # First successful scan creates the initial_scan event.
        mock_fetch.return_value = ("A" * 250, None)
        mock_profile.return_value = "Now tracking Competitor 1."
        await scan_competitor(str(self.competitor.id), self.db)
        self.assertEqual(self.db.query(ChangeEvent).count(), 1)

        # Now a fetch failure: since events already exist, no new initial event,
        # and first_scan must be False.
        mock_fetch.return_value = ("", "HTTP 503: Service Unavailable")
        res = await scan_competitor(str(self.competitor.id), self.db)

        self.assertEqual(res.get("error"), "HTTP 503: Service Unavailable")
        self.assertFalse(res.get("first_scan"))
        # Still exactly one event (no duplicate initial_scan).
        self.assertEqual(self.db.query(ChangeEvent).count(), 1)
        # A snapshot with the error is recorded even on failure.
        errored = self.db.query(Snapshot).filter(
            Snapshot.fetch_error == "HTTP 503: Service Unavailable"
        ).all()
        self.assertEqual(len(errored), 1)
        self.assertEqual(errored[0].raw_text, "")
        self.assertEqual(errored[0].char_count, 0)

    # --- change classified as no_change: no brief, no actions ---

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.generate_actions_for_change")
    @patch("app.pipeline.scanner.synthesize_brief")
    @patch("app.pipeline.scanner.classify_change")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_no_change_classification_skips_brief_and_actions(
        self, mock_fetch, mock_classify, mock_synth, mock_actions, mock_profile
    ):
        mock_profile.return_value = "Now tracking Competitor 1."
        mock_fetch.return_value = ("A" * 250, None)
        await scan_competitor(str(self.competitor.id), self.db)

        # Meaningful char diff, but classifier says no_change.
        mock_fetch.return_value = ("A" * 400, None)
        mock_classify.return_value = "no_change"

        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertTrue(res.get("change_detected"))

        evt = self.db.query(ChangeEvent).filter(
            ChangeEvent.change_type == "no_change"
        ).one()
        self.assertIsNone(evt.brief_text)
        mock_synth.assert_not_called()
        mock_actions.assert_not_called()
        self.assertEqual(self.db.query(ApprovedAction).count(), 0)

    # --- empty brief from synthesizer: event written, no actions ---

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.generate_actions_for_change")
    @patch("app.pipeline.scanner.synthesize_brief")
    @patch("app.pipeline.scanner.classify_change")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_empty_brief_skips_action_generation(
        self, mock_fetch, mock_classify, mock_synth, mock_actions, mock_profile
    ):
        mock_profile.return_value = "Now tracking Competitor 1."
        mock_fetch.return_value = ("A" * 250, None)
        await scan_competitor(str(self.competitor.id), self.db)

        mock_fetch.return_value = ("A" * 400, None)
        mock_classify.return_value = "feature_add"
        mock_synth.return_value = ""  # synthesizer produced nothing

        res = await scan_competitor(str(self.competitor.id), self.db)
        self.assertTrue(res.get("change_detected"))

        evt = self.db.query(ChangeEvent).filter(
            ChangeEvent.change_type == "feature_add"
        ).one()
        self.assertEqual(evt.brief_text, "")
        mock_synth.assert_called_once()
        # Falsy brief must short-circuit before generating actions.
        mock_actions.assert_not_called()
        self.assertEqual(self.db.query(ApprovedAction).count(), 0)

    # --- sub-threshold change: no event created on a competitor that already has one ---

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.classify_change")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_subthreshold_change_creates_no_new_event(
        self, mock_fetch, mock_classify, mock_profile
    ):
        mock_profile.return_value = "Now tracking Competitor 1."
        mock_fetch.return_value = ("A" * 250, None)
        await scan_competitor(str(self.competitor.id), self.db)

        # +50 chars is under the 100-char threshold -> not meaningful.
        mock_fetch.return_value = ("A" * 300, None)
        res = await scan_competitor(str(self.competitor.id), self.db)

        self.assertFalse(res.get("change_detected"))
        self.assertEqual(res.get("net_delta"), 50)
        mock_classify.assert_not_called()
        # Only the original initial_scan event remains.
        self.assertEqual(self.db.query(ChangeEvent).count(), 1)

    # --- scan_user_competitors orchestration ---

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_user_competitors_runs_only_active(self, mock_fetch, mock_profile):
        mock_fetch.return_value = ("A" * 250, None)
        mock_profile.return_value = "Now tracking."

        active2 = Competitor(user_id=self.user.id, url="https://b.com", name="B")
        inactive = Competitor(
            user_id=self.user.id, url="https://c.com", name="C", active=False
        )
        self.db.add_all([active2, inactive])
        self.db.commit()

        results = await scan_user_competitors(str(self.user.id), self.db)

        # Two active competitors scanned; the inactive one excluded entirely.
        self.assertEqual(len(results), 2)
        scanned_ids = {r["competitor_id"] for r in results}
        self.assertNotIn(str(inactive.id), scanned_ids)
        self.assertEqual(self.db.query(Snapshot).count(), 2)

    async def test_scan_user_competitors_empty_for_unknown_user(self):
        import uuid
        results = await scan_user_competitors(str(uuid.uuid4()), self.db)
        self.assertEqual(results, [])

    @patch("app.pipeline.scanner.summarize_competitor_profile")
    @patch("app.pipeline.scanner.fetch_page_text")
    async def test_scan_user_competitors_accepts_uuid_object(self, mock_fetch, mock_profile):
        mock_fetch.return_value = ("A" * 250, None)
        mock_profile.return_value = "Now tracking."

        results = await scan_user_competitors(self.user.id, self.db)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["competitor_id"], str(self.competitor.id))


if __name__ == "__main__":
    unittest.main()
