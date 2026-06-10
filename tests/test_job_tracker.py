import json
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, JobPosting, JobSnapshot
from app.pipeline.job_tracker import _posting_id


class TestPostingIdStability(unittest.TestCase):
    def test_same_title_and_location_yield_same_id(self):
        self.assertEqual(_posting_id("Senior Engineer", "Remote"), _posting_id("Senior Engineer", "Remote"))

    def test_different_location_yields_different_id(self):
        self.assertNotEqual(_posting_id("Senior Engineer", "Remote"), _posting_id("Senior Engineer", "NYC"))

    def test_case_and_whitespace_normalized(self):
        self.assertEqual(_posting_id("Senior Engineer", "Remote"), _posting_id("  senior engineer  ", "REMOTE"))


class TestScrapeJobPostings(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        self.user = User(email="jobs-test@example.com")
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

    async def _run_scrape(self, jobs_payload, signal_text=None):
        from app.pipeline import job_tracker
        with patch("app.pipeline.job_tracker.fetch_page_text", new_callable=AsyncMock) as mock_fetch, \
             patch("app.pipeline.job_tracker._extract_jobs_with_claude", new_callable=AsyncMock) as mock_extract, \
             patch("app.pipeline.job_tracker._interpret_hiring_pattern", new_callable=AsyncMock) as mock_interp:
            mock_fetch.return_value = "x" * 200
            mock_extract.return_value = {"jobs": jobs_payload}
            mock_interp.return_value = signal_text
            return await job_tracker.scrape_job_postings(
                str(self.competitor.id),
                self.competitor.careers_url,
                self.db,
                competitor_name=self.competitor.name,
            )

    async def test_initial_scan_creates_postings_and_snapshot(self):
        result = await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
            {"title": "Staff ML Engineer", "location": "SF", "department": "Engineering"},
        ], signal_text="Aggressive sales + ML hiring signals an upmarket AI push.")

        self.assertEqual(result["total_jobs"], 2)
        self.assertEqual(result["new_postings"], 2)
        self.assertEqual(result["closed_postings"], 0)

        postings = self.db.query(JobPosting).filter_by(competitor_id=self.competitor.id).all()
        self.assertEqual(len(postings), 2)
        self.assertTrue(all(p.first_seen_at is not None for p in postings))
        self.assertTrue(all(p.closed_at is None for p in postings))

        snap = self.db.query(JobSnapshot).filter_by(competitor_id=self.competitor.id).first()
        self.assertEqual(snap.total_jobs, 2)
        self.assertEqual(snap.new_postings, 2)
        self.assertIn("AI push", snap.strategic_signal)

    async def test_rescan_with_same_jobs_bumps_last_seen_no_new(self):
        await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
        ])
        first_posting = self.db.query(JobPosting).filter_by(competitor_id=self.competitor.id).first()
        first_seen = first_posting.first_seen_at
        original_last_seen = first_posting.last_seen_at

        result = await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
        ])
        self.assertEqual(result["total_jobs"], 1)
        self.assertEqual(result["new_postings"], 0)
        self.assertEqual(result["closed_postings"], 0)

        self.db.refresh(first_posting)
        self.assertEqual(first_posting.first_seen_at, first_seen)
        self.assertGreaterEqual(first_posting.last_seen_at, original_last_seen)
        self.assertIsNone(first_posting.closed_at)

    async def test_rescan_with_missing_job_marks_it_closed(self):
        await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
            {"title": "Staff ML Engineer", "location": "SF", "department": "Engineering"},
        ])

        result = await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
        ])
        self.assertEqual(result["total_jobs"], 1)
        self.assertEqual(result["closed_postings"], 1)

        closed = self.db.query(JobPosting).filter_by(
            competitor_id=self.competitor.id,
            title="Staff ML Engineer",
        ).first()
        self.assertIsNotNone(closed.closed_at)

    async def test_rescan_with_new_job_marks_only_that_as_new(self):
        await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
        ])
        result = await self._run_scrape([
            {"title": "Senior AE", "location": "Remote", "department": "Sales"},
            {"title": "VP Marketing", "location": "NYC", "department": "Marketing"},
        ], signal_text="Hiring a VP Marketing signals a brand investment push.")
        self.assertEqual(result["new_postings"], 1)
        self.assertEqual(result["total_jobs"], 2)


class TestBattleCardIncludesHiringSignal(unittest.TestCase):
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
        self.user = User(email="bc-jobs@example.com")
        self.db.add(self.user)
        self.db.commit()

        self.competitor = Competitor(
            user_id=self.user.id,
            url="https://saas.example.com",
            name="SaaS Rival",
            business_type="saas",
        )
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

        self.db.add(JobSnapshot(
            competitor_id=self.competitor.id,
            snapshot_at=datetime.utcnow() - timedelta(hours=2),
            total_jobs=12,
            new_postings=4,
            closed_postings=1,
            strategic_signal="Hiring 4 enterprise AEs in one week signals an upmarket pivot.",
        ))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    @patch("app.routes.battlecard.anthropic.Anthropic")
    def test_hiring_signal_passed_into_prompt(self, mock_anthropic_class):
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_msg = MagicMock()
        mock_msg.content = [MagicMock(text=json.dumps({
            "executive_summary": "ok",
            "what_changed": [],
            "weaknesses": ["x"],
            "strategic_signals": ["upmarket pivot"],
            "playbook": ["a", "b", "c", "d", "e"],
        }))]
        mock_client.messages.create.return_value = mock_msg

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real_key"}):
            resp = self.client.get(f"/api/v1/battlecards/generate/{self.competitor.id}", headers={"Authorization": f"Bearer {self.user.id}"})
        self.assertEqual(resp.status_code, 200)

        user_text = mock_client.messages.create.call_args.kwargs["messages"][0]["content"][1]["text"]
        self.assertIn("Hiring signals", user_text)
        self.assertIn("12 open roles", user_text)
        self.assertIn("4 new this week", user_text)
        self.assertIn("upmarket pivot", user_text)

    def test_no_hiring_signal_means_no_hiring_block_in_prompt(self):
        self.db.query(JobSnapshot).delete()
        self.db.commit()

        with patch("app.routes.battlecard.anthropic.Anthropic") as mock_anthropic_class:
            mock_client = MagicMock()
            mock_anthropic_class.return_value = mock_client
            mock_msg = MagicMock()
            mock_msg.content = [MagicMock(text=json.dumps({
                "executive_summary": "ok",
                "what_changed": [],
                "weaknesses": ["x"],
                "strategic_signals": ["y"],
                "playbook": ["a", "b", "c", "d", "e"],
            }))]
            mock_client.messages.create.return_value = mock_msg

            with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "real_key"}):
                self.client.get(f"/api/v1/battlecards/generate/{self.competitor.id}", headers={"Authorization": f"Bearer {self.user.id}"})

            user_text = mock_client.messages.create.call_args.kwargs["messages"][0]["content"][1]["text"]
            self.assertNotIn("Hiring signals", user_text)


if __name__ == "__main__":
    unittest.main()
