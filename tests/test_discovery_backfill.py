import unittest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, Competitor, User
from app.discovery.backfill import backfill_apps_for_competitors


class TestBackfill(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="bf@example.com")
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _add_comp(self, url, name=None):
        comp = Competitor(user_id=self.user.id, url=url, name=name)
        self.db.add(comp)
        self.db.commit()
        return comp

    def test_creates_app_and_links_competitor(self):
        comp = self._add_comp("https://www.acme.io/", name="Acme")
        created = backfill_apps_for_competitors(self.db)
        self.assertEqual(created, 1)
        self.db.refresh(comp)
        app = self.db.execute(select(App)).scalar_one()
        self.assertEqual(comp.app_id, app.id)
        self.assertEqual(app.url, "acme.io")
        self.assertEqual(app.source, "user_tracked")
        self.assertEqual(app.scan_tier, "full")

    def test_same_url_two_users_share_one_app(self):
        self._add_comp("https://acme.io")
        self._add_comp("http://www.acme.io/")
        backfill_apps_for_competitors(self.db)
        apps = self.db.execute(select(App)).scalars().all()
        self.assertEqual(len(apps), 1)

    def test_idempotent(self):
        self._add_comp("https://acme.io", name="Acme")
        backfill_apps_for_competitors(self.db)
        created_again = backfill_apps_for_competitors(self.db)
        self.assertEqual(created_again, 0)

    def test_slug_collision_gets_suffix(self):
        self._add_comp("https://acme.io", name="Acme")
        self._add_comp("https://acme.dev", name="Acme")
        backfill_apps_for_competitors(self.db)
        slugs = sorted(a.slug for a in self.db.execute(select(App)).scalars().all())
        self.assertEqual(slugs[0], "acme")
        self.assertTrue(slugs[1].startswith("acme-"))


if __name__ == "__main__":
    unittest.main()
