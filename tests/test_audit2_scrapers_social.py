import unittest
from unittest.mock import patch
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, SocialPost
from app.pipeline.social_tracker import scrape_social_posts


class TestScrapeSocialPosts(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.user = User(email="s@user.com")
        self.db.add(self.user)
        self.db.commit()
        self.competitor = Competitor(user_id=self.user.id, url="https://acme.com", name="Acme")
        self.db.add(self.competitor)
        self.db.commit()
        self.db.refresh(self.competitor)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    # ---- S7: an explicit null content must not crash + roll back good posts ----

    @patch("app.pipeline.social_tracker._summarize_sentiment_with_claude")
    @patch("app.pipeline.social_tracker._extract_posts_with_claude")
    @patch("app.pipeline.social_tracker.fetch_page_text")
    async def test_null_content_does_not_crash_or_rollback_good_posts(
        self, mock_fetch, mock_extract, mock_sentiment
    ):
        """`post.get("content", "").strip()` only defaults a MISSING key; an
        explicit "content": null previously raised AttributeError on
        None.strip(), which the outer handler caught and rolled back ALL posts
        for the platform. The null post must be skipped and the good ones kept."""
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "posts": [
                {"content": None, "posted_at": None},           # explicit null -> skip, no crash
                {"content": "real launch update", "posted_at": None},
                {"content": "second real post", "posted_at": None},
            ]
        }
        mock_sentiment.return_value = {"sentiment_summary": "", "notable_posts": []}

        res = await scrape_social_posts(str(self.competitor.id), "acme", None, self.db)

        self.assertEqual(res["instagram_posts"], 2)  # null one skipped, two survived
        posts = {p.content for p in self.db.execute(select(SocialPost)).scalars().all()}
        self.assertEqual(posts, {"real launch update", "second real post"})

    @patch("app.pipeline.social_tracker._summarize_sentiment_with_claude")
    @patch("app.pipeline.social_tracker._extract_posts_with_claude")
    @patch("app.pipeline.social_tracker.fetch_page_text")
    async def test_missing_content_key_still_skipped(
        self, mock_fetch, mock_extract, mock_sentiment
    ):
        mock_fetch.return_value = "x" * 200
        mock_extract.return_value = {
            "posts": [
                {"posted_at": None},                         # key missing -> skip
                {"content": "kept", "posted_at": None},
            ]
        }
        mock_sentiment.return_value = {"sentiment_summary": "", "notable_posts": []}

        res = await scrape_social_posts(str(self.competitor.id), "acme", None, self.db)

        self.assertEqual(res["instagram_posts"], 1)
        posts = [p.content for p in self.db.execute(select(SocialPost)).scalars().all()]
        self.assertEqual(posts, ["kept"])


if __name__ == "__main__":
    unittest.main()
