import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock, MagicMock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, JobPosting, JobSnapshot
from app.pipeline import job_tracker
from app.pipeline.job_tracker import (
    _normalize_homepage,
    probe_careers_url,
    _extract_jobs_with_claude,
    _interpret_hiring_pattern,
    scrape_job_postings,
    get_latest_hiring_signal,
)


class TestNormalizeHomepage(unittest.TestCase):
    def test_empty_returns_empty(self):
        self.assertEqual(_normalize_homepage(""), "")
        self.assertEqual(_normalize_homepage(None), "")

    def test_bare_domain_gets_https_and_strips_path(self):
        self.assertEqual(_normalize_homepage("acme.com/pricing?x=1"), "https://acme.com")

    def test_preserves_http_scheme(self):
        self.assertEqual(_normalize_homepage("http://acme.com/foo"), "http://acme.com")

    def test_strips_whitespace(self):
        self.assertEqual(_normalize_homepage("  https://acme.com/  "), "https://acme.com")

    def test_no_host_returns_empty(self):
        self.assertEqual(_normalize_homepage("https://"), "")


class TestProbeCareersUrl(unittest.IsolatedAsyncioTestCase):
    async def test_unusable_url_returns_none_without_network(self):
        with patch("app.pipeline.job_tracker.httpx.AsyncClient") as mock_client:
            result = await probe_careers_url("")
        self.assertIsNone(result)
        mock_client.assert_not_called()

    async def test_matches_first_path_with_keyword(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.text = "We are hiring engineers! Open positions below."
        resp.url = "https://acme.com/careers"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        with patch("app.pipeline.job_tracker.httpx.AsyncClient", return_value=client):
            result = await probe_careers_url("https://acme.com")
        self.assertEqual(result, "https://acme.com/careers")
        self.assertEqual(client.get.call_count, 1)

    async def test_non_200_is_skipped_and_no_match_returns_none(self):
        resp = MagicMock()
        resp.status_code = 404
        resp.text = "we are hiring"
        resp.url = "https://acme.com/careers"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        with patch("app.pipeline.job_tracker.httpx.AsyncClient", return_value=client):
            result = await probe_careers_url("https://acme.com")
        self.assertIsNone(result)
        self.assertEqual(client.get.call_count, len(job_tracker.CAREERS_PATH_CANDIDATES))

    async def test_200_without_keyword_returns_none(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.text = "Just a normal marketing page with no relevant words."
        resp.url = "https://acme.com/careers"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        with patch("app.pipeline.job_tracker.httpx.AsyncClient", return_value=client):
            result = await probe_careers_url("https://acme.com")
        self.assertIsNone(result)

    async def test_request_exception_is_swallowed_and_continues(self):
        good = MagicMock()
        good.status_code = 200
        good.text = "current openings"
        good.url = "https://acme.com/jobs"
        client = AsyncMock()
        client.get.side_effect = [RuntimeError("boom"), good]
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        with patch("app.pipeline.job_tracker.httpx.AsyncClient", return_value=client):
            result = await probe_careers_url("https://acme.com")
        self.assertEqual(result, "https://acme.com/jobs")
        self.assertEqual(client.get.call_count, 2)

    async def test_returns_final_redirected_url_not_candidate(self):
        resp = MagicMock()
        resp.status_code = 200
        resp.text = "view jobs"
        resp.url = "https://acme.com/careers-final"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        with patch("app.pipeline.job_tracker.httpx.AsyncClient", return_value=client):
            result = await probe_careers_url("https://acme.com")
        self.assertEqual(result, "https://acme.com/careers-final")


def _llm_response(content):
    """Build an OpenAI-compatible chat completion response carrying `content`."""
    resp = MagicMock()
    choice = MagicMock()
    choice.message.content = content
    resp.choices = [choice]
    return resp


class TestExtractJobsWithClaude(unittest.IsolatedAsyncioTestCase):
    # Post-DeepSeek-migration: the extractor gates on llm.ai_available() and calls
    # llm.get_async_client().chat.completions.create (OpenAI-compatible shape).
    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=False)
    async def test_no_api_key_returns_empty_jobs(self, _avail, mock_get_client):
        result = await _extract_jobs_with_claude("some text")
        self.assertEqual(result, {"jobs": []})
        mock_get_client.assert_not_called()

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_api_error_degrades_to_empty_jobs(self, _avail, mock_get_client):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("rate limited"))
        mock_get_client.return_value = client
        with patch("app.pipeline.job_tracker.note_degraded") as mock_note:
            result = await _extract_jobs_with_claude("careers text")
        self.assertEqual(result, {"jobs": []})
        mock_note.assert_called_once()
        self.assertEqual(mock_note.call_args.args[0], "job_tracker.extract")

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_successful_extraction_parses_json(self, _avail, mock_get_client):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(
            return_value=_llm_response('{"jobs": [{"title": "SRE"}]}')
        )
        mock_get_client.return_value = client
        result = await _extract_jobs_with_claude("careers text")
        self.assertEqual(result["jobs"], [{"title": "SRE"}])


class TestInterpretHiringPattern(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_no_new_jobs_returns_none_without_call(self, _avail, mock_get_client):
        result = await _interpret_hiring_pattern("Acme", [], 5)
        self.assertIsNone(result)
        mock_get_client.assert_not_called()

    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=False)
    async def test_no_api_key_returns_none(self, _avail):
        result = await _interpret_hiring_pattern("Acme", [{"title": "AE"}], 1)
        self.assertIsNone(result)

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_strips_surrounding_quotes(self, _avail, mock_get_client):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(
            return_value=_llm_response('  "Upmarket pivot underway."  ')
        )
        mock_get_client.return_value = client
        result = await _interpret_hiring_pattern("Acme", [{"title": "AE"}], 3)
        self.assertEqual(result, "Upmarket pivot underway.")

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_api_error_degrades_to_none(self, _avail, mock_get_client):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("boom"))
        mock_get_client.return_value = client
        with patch("app.pipeline.job_tracker.note_degraded") as mock_note:
            result = await _interpret_hiring_pattern("Acme", [{"title": "AE"}], 3)
        self.assertIsNone(result)
        mock_note.assert_called_once()
        self.assertEqual(mock_note.call_args.args[0], "job_tracker.interpret")

    @patch("app.pipeline.job_tracker.llm.get_async_client")
    @patch("app.pipeline.job_tracker.llm.ai_available", return_value=True)
    async def test_handles_jobs_missing_fields_in_summary(self, _avail, mock_get_client):
        client = MagicMock()
        client.chat.completions.create = AsyncMock(return_value=_llm_response("signal"))
        mock_get_client.return_value = client
        result = await _interpret_hiring_pattern("Acme", [{}], 1)
        self.assertEqual(result, "signal")
        prompt = client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
        self.assertIn("unknown dept", prompt)
        self.assertIn("unknown loc", prompt)


class _DbTestBase(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="edge-jobs@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://acme.com",
            name="Acme",
            business_type="saas",
            careers_url="https://acme.com/careers",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)


class TestScrapeJobPostingsEdges(_DbTestBase):
    async def test_fetch_exception_returns_empty_dict_no_snapshot(self):
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = RuntimeError("network down")
            result = await scrape_job_postings(
                str(self.competitor.id), self.competitor.careers_url, self.db, "Acme"
            )
        self.assertEqual(result, {})
        self.assertEqual(self.db.query(JobSnapshot).count(), 0)
        self.assertEqual(self.db.query(JobPosting).count(), 0)

    async def test_short_page_returns_empty_dict(self):
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = "tiny"
            result = await scrape_job_postings(
                str(self.competitor.id), self.competitor.careers_url, self.db, "Acme"
            )
        self.assertEqual(result, {})
        self.assertEqual(self.db.query(JobSnapshot).count(), 0)

    async def test_empty_page_text_returns_empty_dict(self):
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = ""
            result = await scrape_job_postings(
                str(self.competitor.id), self.competitor.careers_url, self.db, "Acme"
            )
        self.assertEqual(result, {})

    async def _scrape(self, jobs):
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch, \
             patch("app.pipeline.job_tracker._extract_jobs_with_claude", new_callable=AsyncMock) as mock_extract, \
             patch("app.pipeline.job_tracker._interpret_hiring_pattern", new_callable=AsyncMock) as mock_interp:
            mock_fetch.return_value = "x" * 200
            mock_extract.return_value = {"jobs": jobs}
            mock_interp.return_value = None
            return await scrape_job_postings(
                str(self.competitor.id), self.competitor.careers_url, self.db, "Acme"
            )

    async def test_blank_titles_are_skipped(self):
        result = await self._scrape([
            {"title": "  ", "location": "Remote"},
            {"title": "", "location": "NYC"},
            {"title": "Real Job", "location": "SF"},
        ])
        self.assertEqual(result["total_jobs"], 1)
        self.assertEqual(result["new_postings"], 1)
        self.assertEqual(self.db.query(JobPosting).count(), 1)

    async def test_missing_extracted_jobs_key_treated_as_empty(self):
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch, \
             patch("app.pipeline.job_tracker._extract_jobs_with_claude", new_callable=AsyncMock) as mock_extract, \
             patch("app.pipeline.job_tracker._interpret_hiring_pattern", new_callable=AsyncMock) as mock_interp:
            mock_fetch.return_value = "x" * 200
            mock_extract.return_value = {}
            mock_interp.return_value = None
            result = await scrape_job_postings(
                str(self.competitor.id), self.competitor.careers_url, self.db, "Acme"
            )
        self.assertEqual(result["total_jobs"], 0)
        self.assertEqual(result["new_postings"], 0)
        self.assertEqual(self.db.query(JobSnapshot).count(), 1)

    async def test_duplicate_jobs_in_payload_counted_once(self):
        result = await self._scrape([
            {"title": "Senior AE", "location": "Remote"},
            {"title": "senior ae", "location": "REMOTE"},
        ])
        self.assertEqual(result["total_jobs"], 1)
        self.assertEqual(self.db.query(JobPosting).count(), 1)

    async def test_department_and_url_backfilled_on_rescan(self):
        await self._scrape([{"title": "Engineer", "location": "Remote"}])
        posting = self.db.query(JobPosting).first()
        self.assertIsNone(posting.department)
        self.assertIsNone(posting.url)
        await self._scrape([{
            "title": "Engineer", "location": "Remote",
            "department": "Platform", "url": "https://acme.com/jobs/eng",
        }])
        self.db.refresh(posting)
        self.assertEqual(posting.department, "Platform")
        self.assertEqual(posting.url, "https://acme.com/jobs/eng")

    async def test_reopened_job_clears_closed_at(self):
        await self._scrape([
            {"title": "AE", "location": "Remote"},
            {"title": "PM", "location": "SF"},
        ])
        await self._scrape([{"title": "AE", "location": "Remote"}])
        pm = self.db.query(JobPosting).filter_by(title="PM").first()
        self.assertIsNotNone(pm.closed_at)
        result = await self._scrape([
            {"title": "AE", "location": "Remote"},
            {"title": "PM", "location": "SF"},
        ])
        self.db.refresh(pm)
        self.assertIsNone(pm.closed_at)
        self.assertEqual(result["new_postings"], 0)
        self.assertEqual(result["total_jobs"], 2)


class TestGetLatestHiringSignal(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="g@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(
            user_id=self.user.id, url="https://acme.com", name="Acme", business_type="saas",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_none_when_no_snapshots(self):
        self.assertIsNone(get_latest_hiring_signal(str(self.competitor.id), self.db))

    def test_stale_snapshot_excluded_by_max_age(self):
        self.db.add(JobSnapshot(
            competitor_id=self.competitor.id,
            snapshot_at=datetime.utcnow() - timedelta(days=10),
            total_jobs=3, new_postings=1, closed_postings=0,
        ))
        self.db.commit()
        self.assertIsNone(get_latest_hiring_signal(str(self.competitor.id), self.db, max_age_days=7))

    def test_returns_most_recent_within_window(self):
        old = JobSnapshot(
            competitor_id=self.competitor.id,
            snapshot_at=datetime.utcnow() - timedelta(days=3),
            total_jobs=3, new_postings=1, closed_postings=0,
            strategic_signal="old",
        )
        new = JobSnapshot(
            competitor_id=self.competitor.id,
            snapshot_at=datetime.utcnow() - timedelta(hours=1),
            total_jobs=5, new_postings=2, closed_postings=0,
            strategic_signal="fresh",
        )
        self.db.add_all([old, new])
        self.db.commit()
        result = get_latest_hiring_signal(str(self.competitor.id), self.db)
        self.assertIsNotNone(result)
        self.assertEqual(result.strategic_signal, "fresh")


if __name__ == "__main__":
    unittest.main()
