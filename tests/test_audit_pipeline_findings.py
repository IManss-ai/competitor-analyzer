"""Regression tests for the 2026-07-21 adversarial-audit pipeline findings.

Finding A — extract_main_content must not strip the sidecar's structured
            markdown (headline + '## Pricing' sections are short and were
            being deleted by the legacy >200-char paragraph filter).
Finding B — error/empty snapshots must never serve as the diff baseline
            (diffing a good page against '' fabricated a full-page change).
Finding C — a serialization flip (sidecar markdown <-> direct-HTTP prose)
            must read as a baseline reset, not a phantom full-page change.
Finding D — job extraction FAILURE (API error / dummy key) must not be
            treated as "zero open roles" (closed every posting + wrote a
            fabricated total_jobs=0 snapshot).
Finding E — a null/string "rating" from the model must not crash the
            platform scrape (TypeError rolled back the whole platform).
Finding F — review extraction FAILURE must not write a zeroed
            ReviewSnapshot that masks the last real rating.
Finding G — synthesizer/action_generator must short-circuit to their
            heuristics when AI is unavailable instead of making doomed
            live HTTPS attempts with a dummy key.
"""

import unittest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import (
    ChangeEvent,
    Competitor,
    JobPosting,
    JobSnapshot,
    Review,
    ReviewSnapshot,
    Snapshot,
    User,
)
from app.pipeline import fetcher
from app.pipeline import review_scraper as rs
from app.pipeline.scanner import scan_competitor


# A structured page exactly as scraper-service/src/schema.ts serialize() emits it:
# short '# headline' and '## Pricing' sections that the legacy >200-char
# paragraph filter would delete outright.
STRUCTURED_PAGE = (
    "# Acme, the unified workspace for modern teams\n"
    "\n"
    "## Pricing\n"
    "Starter $19/mo, Growth $49/mo, Enterprise custom\n"
    "\n"
    "## Features\n"
    "- Drag-and-drop workflow builders\n"
    "- Real-time activity feeds\n"
    "\n"
    "## CTA\n"
    "Start your free trial\n"
    "\n"
    "## Content\n"
    "Acme is the leading enterprise platform for team collaboration and "
    "project tracking. Over 10,000 businesses use our software to optimize "
    "their workflows, automate repetitive tasks, and measure productivity "
    "across every department in the organization every single day."
)

STRUCTURED_PAGE_PRICE_CHANGE = STRUCTURED_PAGE.replace("$19/mo", "$29/mo")

# serialize() with an empty headline emits a bare '#' line (no trailing space).
STRUCTURED_PAGE_EMPTY_HEADLINE = (
    "#\n"
    "\n"
    "## Pricing\n"
    "Pro $99/mo\n"
    "\n"
    "## Features\n"
    "- Boards\n"
    "\n"
    "## CTA\n"
    "Book a demo\n"
    "\n"
    "## Content\n"
    "Body copy."
)

# Direct-HTTP fallback serialization: whitespace-collapsed single-line prose.
PROSE_PAGE = (
    "Acme helps revenue teams monitor competitor pricing pages and messaging "
    "shifts in real time across their entire market every business day. "
    "This quarter the team shipped new security certifications, single sign "
    "on, detailed audit logs, and a brand new analytics workspace built for "
    "large enterprises with strict compliance requirements and global scale."
)


class TestFindingAStructuredMarkdownPassthrough(unittest.TestCase):
    def test_structured_page_passes_through_intact(self):
        out = fetcher.extract_main_content(STRUCTURED_PAGE)
        self.assertEqual(out, STRUCTURED_PAGE)

    def test_headline_and_pricing_survive(self):
        out = fetcher.extract_main_content(STRUCTURED_PAGE)
        self.assertIn("# Acme, the unified workspace", out)
        self.assertIn("## Pricing", out)
        self.assertIn("$19/mo", out)

    def test_empty_headline_structured_page_passes_through(self):
        out = fetcher.extract_main_content(STRUCTURED_PAGE_EMPTY_HEADLINE)
        self.assertEqual(out, STRUCTURED_PAGE_EMPTY_HEADLINE)

    def test_legacy_prose_still_filtered(self):
        long_p = "L" * 250
        raw = "short nav\n\n" + long_p + "\n\nmenu link"
        self.assertEqual(fetcher.extract_main_content(raw), long_p)

    def test_is_structured_markdown_predicate(self):
        self.assertTrue(fetcher.is_structured_markdown(STRUCTURED_PAGE))
        self.assertTrue(fetcher.is_structured_markdown(STRUCTURED_PAGE_EMPTY_HEADLINE))
        self.assertFalse(fetcher.is_structured_markdown(PROSE_PAGE))
        self.assertFalse(fetcher.is_structured_markdown(""))
        self.assertFalse(fetcher.is_structured_markdown(None))


class _ScannerDBHarness(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()
        self.user = User(email="audit@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://example.com/competitor",
            name="Audit Competitor",
        )
        self.db.add(self.competitor)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def _seed_snapshot(self, raw_text, fetch_error=None, minutes_ago=60):
        snap = Snapshot(
            competitor_id=self.competitor.id,
            raw_text=raw_text,
            char_count=len(raw_text),
            fetch_error=fetch_error,
            fetched_at=datetime.utcnow() - timedelta(minutes=minutes_ago),
        )
        self.db.add(snap)
        self.db.commit()
        return snap

    def _seed_event(self, snap):
        event = ChangeEvent(
            competitor_id=self.competitor.id,
            snapshot_before_id=snap.id,
            snapshot_after_id=snap.id,
            net_char_delta=0,
            change_type="initial_scan",
            brief_text="seed",
            week_label="2026-W30",
        )
        self.db.add(event)
        self.db.commit()
        return event

    def _event_count(self):
        return self.db.query(ChangeEvent).count()


class TestFindingBErrorSnapshotBaseline(_ScannerDBHarness):
    @patch("app.pipeline.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_error_snapshot_is_not_the_diff_baseline(self, mock_fetch):
        # Good baseline, then a transient fetch failure (raw_text='').
        good = self._seed_snapshot(PROSE_PAGE, minutes_ago=120)
        self._seed_event(good)
        self._seed_snapshot("", fetch_error="sidecar exploded", minutes_ago=60)
        before_events = self._event_count()

        # Next scan recovers and returns the SAME page as the good baseline:
        # nothing actually changed, so no ChangeEvent may be fabricated.
        mock_fetch.return_value = (PROSE_PAGE, None)
        result = await scan_competitor(str(self.competitor.id), self.db)

        self.assertFalse(result.get("change_detected"))
        self.assertEqual(self._event_count(), before_events)

    @patch("app.pipeline.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_empty_but_errorless_snapshot_is_not_the_baseline(self, mock_fetch):
        good = self._seed_snapshot(PROSE_PAGE, minutes_ago=120)
        self._seed_event(good)
        # Degenerate: empty raw_text with no recorded error must also be excluded.
        self._seed_snapshot("", fetch_error=None, minutes_ago=60)
        before_events = self._event_count()

        mock_fetch.return_value = (PROSE_PAGE, None)
        result = await scan_competitor(str(self.competitor.id), self.db)

        self.assertFalse(result.get("change_detected"))
        self.assertEqual(self._event_count(), before_events)


class TestFindingCSerializationFlipGuard(_ScannerDBHarness):
    @patch("app.pipeline.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_prose_to_structured_flip_is_not_a_change(self, mock_fetch):
        # Baseline stored under the direct-HTTP (prose) serialization.
        prose = self._seed_snapshot(PROSE_PAGE, minutes_ago=60)
        self._seed_event(prose)
        before_events = self._event_count()

        # Sidecar recovers: same site, structured serialization. The textual
        # delta is huge but it is a serializer flip, not a page change.
        mock_fetch.return_value = (STRUCTURED_PAGE, None)
        result = await scan_competitor(str(self.competitor.id), self.db)

        self.assertFalse(result.get("change_detected"))
        self.assertEqual(self._event_count(), before_events)

    @patch("app.pipeline.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_structured_to_prose_flip_is_not_a_change(self, mock_fetch):
        structured = self._seed_snapshot(STRUCTURED_PAGE, minutes_ago=60)
        self._seed_event(structured)
        before_events = self._event_count()

        mock_fetch.return_value = (PROSE_PAGE, None)
        result = await scan_competitor(str(self.competitor.id), self.db)

        self.assertFalse(result.get("change_detected"))
        self.assertEqual(self._event_count(), before_events)

    @patch("app.pipeline.scanner.generate_actions_for_change", new_callable=AsyncMock)
    @patch("app.pipeline.scanner.synthesize_brief", new_callable=AsyncMock)
    @patch("app.pipeline.scanner.classify_change", new_callable=AsyncMock)
    @patch("app.pipeline.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_real_change_within_same_serialization_still_fires(
        self, mock_fetch, mock_classify, mock_brief, mock_actions
    ):
        # Over-suppression guard: structured -> structured with a price change
        # must still produce a ChangeEvent (the flip guard must not eat it).
        structured = self._seed_snapshot(STRUCTURED_PAGE, minutes_ago=60)
        self._seed_event(structured)
        before_events = self._event_count()

        mock_fetch.return_value = (STRUCTURED_PAGE_PRICE_CHANGE, None)
        mock_classify.return_value = "pricing_change"
        mock_brief.return_value = "They raised Starter from $19 to $29."
        mock_actions.return_value = []
        result = await scan_competitor(str(self.competitor.id), self.db)

        self.assertTrue(result.get("change_detected"))
        self.assertEqual(self._event_count(), before_events + 1)


class TestFindingDJobExtractionFailure(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()
        self.user = User(email="jobs-audit@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://acme.com",
            name="Acme",
            careers_url="https://acme.com/careers",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    async def _run_scrape(self, extract_return):
        from app.pipeline import job_tracker
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch, \
             patch("app.pipeline.job_tracker._extract_jobs_with_claude", new_callable=AsyncMock) as mock_extract, \
             patch("app.pipeline.job_tracker._interpret_hiring_pattern", new_callable=AsyncMock) as mock_interp:
            mock_fetch.return_value = "x" * 200
            mock_extract.return_value = extract_return
            mock_interp.return_value = None
            return await job_tracker.scrape_job_postings(
                str(self.competitor.id),
                self.competitor.careers_url,
                self.db,
                competitor_name=self.competitor.name,
            )

    async def test_extraction_failure_does_not_close_postings_or_snapshot(self):
        from app.pipeline.job_tracker import ExtractionFailed

        # Seed one open posting via a genuinely-successful scrape.
        await self._run_scrape({"jobs": [{"title": "Senior AE", "location": "Remote"}]})
        snapshots_before = self.db.query(JobSnapshot).count()

        # Extraction FAILURE (API error / dummy key) must be a no-op run.
        result = await self._run_scrape(ExtractionFailed(jobs=[]))

        self.assertEqual(result, {})
        posting = self.db.query(JobPosting).filter_by(competitor_id=self.competitor.id).one()
        self.assertIsNone(posting.closed_at)  # NOT fabricated as closed
        self.assertEqual(self.db.query(JobSnapshot).count(), snapshots_before)

    async def test_genuinely_empty_jobs_still_closes_postings(self):
        # A real "no open roles" page (plain dict) keeps the close-loop working.
        await self._run_scrape({"jobs": [{"title": "Senior AE", "location": "Remote"}]})
        result = await self._run_scrape({"jobs": []})

        self.assertEqual(result["total_jobs"], 0)
        self.assertEqual(result["closed_postings"], 1)
        posting = self.db.query(JobPosting).filter_by(competitor_id=self.competitor.id).one()
        self.assertIsNotNone(posting.closed_at)

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_api_error_returns_failure_sentinel(self, _avail, mock_get_client):
        from app.pipeline.job_tracker import ExtractionFailed, _extract_jobs_with_claude

        client = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("rate limited"))
        mock_get_client.return_value = client
        result = await _extract_jobs_with_claude("careers text")
        # Value-compatible with the legacy contract, but marked as a failure.
        self.assertEqual(result, {"jobs": []})
        self.assertIsInstance(result, ExtractionFailed)

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=False)
    async def test_ai_unavailable_returns_failure_sentinel(self, _avail, mock_get_client):
        from app.pipeline.job_tracker import ExtractionFailed, _extract_jobs_with_claude

        result = await _extract_jobs_with_claude("careers text")
        self.assertEqual(result, {"jobs": []})
        self.assertIsInstance(result, ExtractionFailed)
        mock_get_client.assert_not_called()


class _ReviewDBHarness(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()
        self.user = User(email="rev-audit@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)


class TestFindingERatingNullSafe(_ReviewDBHarness):
    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_null_and_string_ratings_do_not_crash_the_platform(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "reviews": [
                {"id": "r1", "author": "A", "rating": None, "title": "meh", "body": "ok"},
                {"id": "r2", "author": "B", "rating": "5", "title": "good", "body": "great"},
                {"id": "r3", "author": "C", "rating": 2, "title": "bad", "body": "slow"},
            ],
            "avg_rating": 3.5,
            "total_reviews": 3,
        }
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        res = await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        # The whole platform must persist, not roll back on the null rating.
        self.assertIn("g2", res)
        reviews = self.db.query(Review).filter_by(competitor_id=self.competitor.id).all()
        self.assertEqual(len(reviews), 3)
        by_id = {r.review_id: r for r in reviews}
        self.assertEqual(by_id["r1"].sentiment, "neutral")   # null -> default 3
        self.assertEqual(by_id["r2"].sentiment, "positive")  # "5" -> 5
        self.assertEqual(by_id["r3"].sentiment, "neutral")

    def test_coerce_rating(self):
        self.assertEqual(rs._coerce_rating(None), 3.0)
        self.assertEqual(rs._coerce_rating("5"), 5.0)
        self.assertEqual(rs._coerce_rating("garbage"), 3.0)
        self.assertEqual(rs._coerce_rating(4), 4.0)


class TestFindingFFailedExtractionSkipsSnapshot(_ReviewDBHarness):
    @patch("app.pipeline.review_scraper._get_platform_urls",
           return_value={"g2": "https://www.g2.com/products/acme/reviews"})
    @patch("app.pipeline.review_scraper._analyze_complaints_with_claude", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper._extract_reviews_with_claude", new_callable=AsyncMock)
    @patch("app.pipeline.review_scraper.fetch_page_text", new_callable=AsyncMock)
    async def test_extraction_failure_writes_no_zeroed_snapshot(
        self, mock_fetch, mock_extract, mock_analyze, mock_urls
    ):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = rs.ExtractionFailed(
            {"reviews": [], "avg_rating": 0, "total_reviews": 0}
        )
        mock_analyze.return_value = {"complaints": [], "complaint_reviews": []}

        res = await rs.scrape_competitor_reviews(str(self.competitor.id), self.competitor.url, self.db)

        self.assertNotIn("g2", res)
        self.assertEqual(self.db.query(ReviewSnapshot).count(), 0)

    async def test_extractor_failure_paths_return_sentinel(self):
        # Dummy key.
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=False):
            res = await rs._extract_reviews_with_claude("text")
        self.assertEqual(res, {"reviews": [], "avg_rating": 0, "total_reviews": 0})
        self.assertIsInstance(res, rs.ExtractionFailed)

        # API error.
        client = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("boom"))
        with patch("app.pipeline.review_scraper.llm.ai_available", return_value=True), \
             patch("app.pipeline.review_scraper.llm.get_async_client", return_value=client):
            res = await rs._extract_reviews_with_claude("text")
        self.assertEqual(res, {"reviews": [], "avg_rating": 0, "total_reviews": 0})
        self.assertIsInstance(res, rs.ExtractionFailed)


class TestFindingGAiUnavailableShortCircuit(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.synthesizer.llm.ai_available", return_value=False)
    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_synthesize_brief_short_circuits(self, mock_create, _avail):
        from app.pipeline.synthesizer import synthesize_brief

        brief = await synthesize_brief(
            competitor_name="Acme",
            competitor_url="https://acme.com",
            text_before="before",
            text_after="after",
            change_type="pricing_change",
        )
        self.assertIn("Acme", brief)
        self.assertIn("pricing", brief.lower())
        mock_create.assert_not_called()

    @patch("app.pipeline.synthesizer.llm.ai_available", return_value=False)
    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_summarize_profile_short_circuits(self, mock_create, _avail):
        from app.pipeline.synthesizer import summarize_competitor_profile

        brief = await summarize_competitor_profile(
            competitor_name="Acme",
            competitor_url="https://acme.com",
            content="Acme sells widgets to enterprises.",
        )
        self.assertIn("Acme", brief)
        mock_create.assert_not_called()

    @patch("app.pipeline.action_generator.llm.ai_available", return_value=False)
    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_generate_action_short_circuits(self, mock_create, _avail):
        from app.pipeline.action_generator import generate_action

        draft = await generate_action(
            action_type="retention_email",
            competitor_name="Acme",
            competitor_url="https://acme.com",
            brief_text="They raised prices.",
        )
        self.assertIsNotNone(draft)
        self.assertIn("Hi [Name]", draft)
        mock_create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
